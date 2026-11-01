/**
 * Upstream Sync & Diff Engine
 * 定期/手动嗅探上游可靠 GFW 规则源，并与现有规则库进行差分与父子域覆盖剪枝
 *
 * 用法:
 *   node .github/scripts/sync-upstream.js --check        # 仅检查并输出统计报告
 *   node .github/scripts/sync-upstream.js --ci           # CI 模式: 生成 staging/candidates.json 与 staging/candidates.md
 *   node .github/scripts/sync-upstream.js --interactive  # 本地交互式终端审批模式
 *   node .github/scripts/sync-upstream.js --apply <file> # 批量应用已审批的域名文件
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '../../');
const STAGING_DIR = path.join(ROOT_DIR, 'staging');

// 可靠上游数据源配置 (支持多源聚合)
const UPSTREAM_SOURCES = [
  {
    name: 'LoyalSoldier-GFW',
    url: 'https://raw.githubusercontent.com/Loyalsoldier/v2ray-rules-dat/release/gfw.txt',
    type: 'plain-domain'
  }
];

// 内置过滤黑名单 (坚决过滤国家顶级域名通配与国内测速/测试误伤)
const FILTER_DENY_LIST = new Set([
  // 国家与地区泛后缀 (严防像 ACL4SSR 那样误伤整个地区)
  'hk', 'tw', 'jp', 'kr', 'sg', 'eu', 'cn', 'us', 'uk', 'mo', 'ru', 'de', 'fr', 'ca', 'au',
  // 国内知名 IP 查询与测速平台
  'ip138.com', 'ipip.net', 'speedtest.cn', 'chinaz.com', 'tool.lu',
  // 国内大厂域名
  'baidu.com', 'qq.com', 'taobao.com', 'jd.com', 'alipay.com', 'alicdn.com', 'bilibili.com'
]);

// 辅助分类关键词映射 (帮助用户审批时快速了解域名属性)
const CATEGORY_RULES = [
  { cat: 'AI 大模型', keywords: ['ai', 'gpt', 'openai', 'claude', 'anthropic', 'cohere', 'midjourney', 'cursor', 'sora', 'replicate', 'together'] },
  { cat: '开发者/云平台', keywords: ['github', 'gitlab', 'vercel', 'supabase', 'netlify', 'docker', 'npm', 'pypi', 'crate', 'rust', 'golang', 'dev', 'cloud'] },
  { cat: '社交通讯', keywords: ['telegram', 'twitter', 'discord', 'reddit', 'facebook', 'instagram', 'threads', 'whatsapp', 'signal', 'line'] },
  { cat: '流媒体/多媒体', keywords: ['youtube', 'video', 'stream', 'spotify', 'netflix', 'hulu', 'disney', 'podcast', 'audio', 'sound'] },
  { cat: '知识与新闻', keywords: ['wiki', 'news', 'times', 'medium', 'press', 'post', 'daily', 'paper'] }
];

function guessCategory(domain) {
  const lower = domain.toLowerCase();
  for (const { cat, keywords } of CATEGORY_RULES) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return '通用代理 (General)';
}

// 获取上游文本内容 (Promise)
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

// 读取本地已存在的所有规则 (以 Loon .lsr 为基础，提取现有所有域名、后缀、关键词)
function loadExistingRules() {
  const loonDir = path.join(ROOT_DIR, 'loon');
  const suffixes = new Set();
  const keywords = new Set();
  const fullDomains = new Set();

  if (fs.existsSync(loonDir)) {
    const files = fs.readdirSync(loonDir).filter(f => f.endsWith('.lsr'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(loonDir, f), 'utf8');
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith(';'));
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        const type = parts[0].toUpperCase();
        const val = (parts[1] || '').toLowerCase();
        if (!val) continue;

        if (type === 'DOMAIN-SUFFIX') {
          suffixes.add(val);
        } else if (type === 'DOMAIN-KEYWORD') {
          keywords.add(val);
        } else if (type === 'DOMAIN') {
          fullDomains.add(val);
        }
      }
    }
  }

  // 同时读取已在 staging 目录中被拒绝/忽略的域名 (避免重复提示)
  const ignoredFile = path.join(STAGING_DIR, 'ignored-domains.txt');
  const ignoredDomains = new Set();
  if (fs.existsSync(ignoredFile)) {
    const lines = fs.readFileSync(ignoredFile, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const l of lines) ignoredDomains.add(l.toLowerCase());
  }

  return { suffixes, keywords, fullDomains, ignoredDomains };
}

// 判断候选域名是否已被现有规则覆盖 (父子域剪枝与关键词覆盖判定)
function isDomainCovered(domain, { suffixes, keywords, fullDomains, ignoredDomains }) {
  const lower = domain.toLowerCase();

  // 1. 是否在忽略名单中
  if (ignoredDomains.has(lower)) return { covered: true, reason: '已在用户忽略名单中' };

  // 2. 是否精确匹配全域名
  if (fullDomains.has(lower)) return { covered: true, reason: `精确命中 DOMAIN [${lower}]` };

  // 3. 是否直接等于某个已收录的后缀
  if (suffixes.has(lower)) return { covered: true, reason: `直接命中 DOMAIN-SUFFIX [${lower}]` };

  // 4. 父子域覆盖检测 (例如已有 google.com，则 docs.google.com 自动判定为覆盖)
  const parts = lower.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(i).join('.');
    if (suffixes.has(parent)) {
      return { covered: true, reason: `已被父域名 [${parent}] 覆盖` };
    }
  }

  // 5. 关键词命中检测 (例如已有 DOMAIN-KEYWORD,twitter，则 mobile.twitter.com 判定为覆盖)
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      return { covered: true, reason: `命中关键词 [${kw}]` };
    }
  }

  return { covered: false };
}

// 候选域名集合的“自剪枝” (如果上游同时包含了 foo.com 与 sub.foo.com，只保留 foo.com)
function pruneCandidateSet(domainList) {
  const sorted = Array.from(new Set(domainList)).sort((a, b) => a.length - b.length);
  const kept = new Set();

  for (const d of sorted) {
    let parentFound = false;
    const parts = d.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join('.');
      if (kept.has(parent)) {
        parentFound = true;
        break;
      }
    }
    if (!parentFound) {
      kept.add(d);
    }
  }

  return Array.from(kept);
}

// 核心比对任务
async function runSyncAnalysis() {
  console.log('--- 1. 读取本地现有规则基准 ---');
  const existing = loadExistingRules();
  console.log(`本地已收录: ${existing.suffixes.size} 个域名后缀, ${existing.keywords.size} 个关键词, ${existing.fullDomains.size} 个精准域名`);
  console.log(`忽略名单库: ${existing.ignoredDomains.size} 个历史忽略域名`);

  console.log('\n--- 2. 拉取上游可靠规则数据源 ---');
  const rawUpstreamDomains = [];
  for (const src of UPSTREAM_SOURCES) {
    try {
      console.log(`正在拉取 [${src.name}]: ${src.url} ...`);
      const text = await fetchText(src.url);
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith(';'));
      console.log(`✔ [${src.name}] 成功获取 ${lines.length} 条原始条目`);
      for (const line of lines) {
        // 提取纯域名
        const clean = line.replace(/^DOMAIN(-SUFFIX)?,/i, '').trim().toLowerCase();
        if (clean && clean.includes('.')) {
          rawUpstreamDomains.push(clean);
        }
      }
    } catch (err) {
      console.error(`✖ 拉取上游 [${src.name}] 失败:`, err.message);
    }
  }

  console.log(`\n--- 3. 过滤清洗与覆盖度剪枝比对 (共 ${rawUpstreamDomains.length} 条) ---`);
  const uniqueUpstream = Array.from(new Set(rawUpstreamDomains));
  const newCandidates = [];
  let filteredDenyCount = 0;
  let coveredCount = 0;

  for (const domain of uniqueUpstream) {
    // 检查是否在过滤黑名单中 (或属于单字母/双字母国家泛后缀)
    if (FILTER_DENY_LIST.has(domain) || !domain.includes('.')) {
      filteredDenyCount++;
      continue;
    }
    // 检查是否包含非法字符
    if (/[^a-z0-9.-]/i.test(domain)) {
      filteredDenyCount++;
      continue;
    }

    const { covered } = isDomainCovered(domain, existing);
    if (covered) {
      coveredCount++;
    } else {
      newCandidates.push(domain);
    }
  }

  // 对待审候选域名执行子域自剪枝
  const prunedCandidates = pruneCandidateSet(newCandidates);
  console.log(`比对结果:`);
  console.log(`  - 命中过滤名单/非法条目剔除: ${filteredDenyCount}`);
  console.log(`  - 已被本地规则覆盖 (无需重复审批): ${coveredCount}`);
  console.log(`  - 发现潜在新增待审域名: ${prunedCandidates.length} 个 (自剪枝前 ${newCandidates.length} 个)`);

  return { existing, candidates: prunedCandidates };
}

// 格式化输出为 GitHub PR Markdown
function generateMarkdownReport(candidates) {
  const dateStr = new Date().toISOString().split('T')[0];
  const grouped = {};

  for (const c of candidates) {
    const cat = guessCategory(c);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  }

  let md = `## 🛰️ 上游新增代理域名待审批清单 (${dateStr})\n\n`;
  md += `本次巡检共从上游嗅探到 **${candidates.length}** 个您当前规则库尚未覆盖的新增域名。\n\n`;
  md += `> [!IMPORTANT]\n`;
  md += `> **审批说明**：请在此 PR 中审查以下清单。若某些域名您不需要走代理，直接在 \`staging/candidates.txt\` 中删除该行即可；确认无误后点击 **Merge PR**，系统将自动把批准的域名合并入 Loon / QuanX / Mihomo 规则库。\n\n`;

  for (const [cat, list] of Object.entries(grouped)) {
    md += `### ${cat} (${list.length})\n`;
    for (const d of list) {
      md += `- [ ] \`${d}\`\n`;
    }
    md += `\n`;
  }

  return md;
}

// 本地交互式审批命令行
async function runInteractiveApproval(candidates) {
  if (candidates.length === 0) {
    console.log('\n🎉 太棒了！上游所有规则均已被您的本地规则完全覆盖，无需任何审批！');
    return;
  }

  console.log(`\n========== 开始交互式审批 (共 ${candidates.length} 个待审域名) ==========`);
  console.log('操作指令: [y] 批准加入代理 | [n] 永久忽略/拒绝 | [s] 暂缓跳过 | [q] 退出保存\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = q => new Promise(res => rl.question(q, res));
  const approved = [];
  const ignored = [];

  for (let i = 0; i < candidates.length; i++) {
    const d = candidates[i];
    const cat = guessCategory(d);
    const ans = (await question(`[${i + 1}/${candidates.length}] [${cat}] ${d} -> 批准入库? (y/n/s/q) [y]: `)).trim().toLowerCase() || 'y';

    if (ans === 'q') break;
    if (ans === 'y') approved.push(d);
    if (ans === 'n') ignored.push(d);
  }

  rl.close();

  if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });

  if (ignored.length > 0) {
    const ignoredPath = path.join(STAGING_DIR, 'ignored-domains.txt');
    fs.appendFileSync(ignoredPath, ignored.join('\n') + '\n', 'utf8');
    console.log(`✔ 已将 ${ignored.length} 个域名加入永久忽略名单: ${ignoredPath}`);
  }

  if (approved.length > 0) {
    const approvedPath = path.join(STAGING_DIR, 'candidates.txt');
    fs.writeFileSync(approvedPath, approved.join('\n') + '\n', 'utf8');
    console.log(`✔ 已将 ${approved.length} 个批准域名写入待合并文件: ${approvedPath}`);
    console.log(`👉 接下来可运行: node .github/scripts/build-rules.js --apply-staging 自动同步三端！`);
  }
}

// 主入口
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--check';

  try {
    const { candidates } = await runSyncAnalysis();

    if (mode === '--ci') {
      if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });
      const jsonPath = path.join(STAGING_DIR, 'candidates.json');
      const mdPath = path.join(STAGING_DIR, 'candidates.md');
      const txtPath = path.join(STAGING_DIR, 'candidates.txt');

      fs.writeFileSync(jsonPath, JSON.stringify(candidates, null, 2), 'utf8');
      fs.writeFileSync(mdPath, generateMarkdownReport(candidates), 'utf8');
      fs.writeFileSync(txtPath, candidates.join('\n') + '\n', 'utf8');

      console.log(`\n✔ CI 产物已生成:`);
      console.log(`  - 候选清单文件: ${txtPath}`);
      console.log(`  - PR Markdown: ${mdPath}`);
      console.log(`  - JSON 结构: ${jsonPath}`);
    } else if (mode === '--interactive') {
      await runInteractiveApproval(candidates);
    } else {
      console.log(`\n提示: 运行 'node .github/scripts/sync-upstream.js --interactive' 可在本地终端逐条交互审批！`);
    }
  } catch (err) {
    console.error('✖ 同步分析过程发生异常:', err);
    process.exit(1);
  }
}

main();
