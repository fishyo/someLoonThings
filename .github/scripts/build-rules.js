/**
 * Multi-Platform Rule Builder & Synchronizer
 * 跨平台分流规则构建、同步与手动添加工具
 *
 * 支持方式:
 *   1. 批量/单条命令行添加:
 *      node .github/scripts/build-rules.js --add domain1.com domain2.com
 *      node .github/scripts/build-rules.js --add-keyword keyword1
 *      node .github/scripts/build-rules.js --add domain.com --target ai   # 指定添加到 ai 规则
 *
 *   2. 文本暂存区批量合并 (从剪贴板粘贴一批域名到 candidates.txt 后运行):
 *      node .github/scripts/build-rules.js --apply-staging
 *
 *   3. 终极一键全端同步 (在 loon/*.lsr 手写规则后，一键生成 QX 三元组与 Mihomo YAML):
 *      node .github/scripts/build-rules.js --sync
 *
 *   4. 语法合规性校验:
 *      node .github/scripts/build-rules.js --validate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');
const STAGING_DIR = path.join(ROOT_DIR, 'staging');

const RULE_MAP = {
  proxy: {
    loon: path.join(ROOT_DIR, 'loon/proxy.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/proxy.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/proxy.yaml'),
    policy: 'proxy',
    title: 'Custom Proxy Ruleset'
  },
  ai: {
    loon: path.join(ROOT_DIR, 'loon/ai.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/ai.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/ai.yaml'),
    policy: 'proxy',
    title: 'AI Services Ruleset'
  },
  supercell: {
    loon: path.join(ROOT_DIR, 'loon/supercell.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/supercell.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/direct.yaml'),
    policy: 'direct',
    title: 'Supercell Direct Ruleset'
  }
};

// 运行 validate.js 校验
function runValidation() {
  console.log('\n--- 运行平台规范与沙盒合规校验 (validate.js) ---');
  try {
    const valOutput = execSync(`node ${path.join(ROOT_DIR, '.github/scripts/validate.js')}`, { encoding: 'utf8' });
    console.log(valOutput);
    console.log('🎉 全部多端语法校验通过！');
  } catch (err) {
    console.error('✖ 未通过 validate.js 校验，请检查格式:', err.stdout || err.message);
    process.exit(1);
  }
}

// 手动追加单条或多条规则 (域名或关键词)
function appendRules(items, type = 'DOMAIN-SUFFIX', targetKey = 'proxy') {
  const target = RULE_MAP[targetKey] || RULE_MAP.proxy;
  const dateStr = new Date().toISOString().split('T')[0];

  const cleanItems = Array.from(new Set(
    items.map(it => it.trim().toLowerCase().replace(/^DOMAIN(-SUFFIX)?,/i, '').replace(/^host(-suffix)?,/i, '').replace(/,\s*(proxy|direct)$/i, ''))
      .filter(Boolean)
  ));

  if (cleanItems.length === 0) {
    console.log('未检测到有效规则条目。');
    return;
  }

  console.log(`准备添加 ${cleanItems.length} 条 [${type}] 规则至 [${targetKey}] ...`);

  // 1. Loon
  if (fs.existsSync(target.loon)) {
    let content = fs.readFileSync(target.loon, 'utf8').trimEnd();
    const existing = new Set(content.split(/\r?\n/).map(l => l.trim().toLowerCase()));
    const toAdd = cleanItems.filter(it => !existing.has(`${type.toLowerCase()},${it}`));
    if (toAdd.length > 0) {
      content += `\n# --- 手动添加 (${dateStr}) ---\n` + toAdd.map(it => `${type},${it}`).join('\n') + '\n';
      fs.writeFileSync(target.loon, content, 'utf8');
      console.log(`✔ [Loon] 已追加 ${toAdd.length} 条规则`);
    } else {
      console.log(`ℹ [Loon] 条目已全部存在`);
    }
  }

  // 2. Quantumult X (严格三元组)
  if (fs.existsSync(target.qx)) {
    let content = fs.readFileSync(target.qx, 'utf8').trimEnd();
    const qxType = type === 'DOMAIN-KEYWORD' ? 'host-keyword' : (type === 'DOMAIN' ? 'host' : 'host-suffix');
    const existing = new Set(content.split(/\r?\n/).map(l => l.trim().toLowerCase()));
    const toAdd = cleanItems.filter(it => !existing.has(`${qxType}, ${it}, ${target.policy}`));
    if (toAdd.length > 0) {
      content += `\n# --- 手动添加 (${dateStr}) ---\n` + toAdd.map(it => `${qxType}, ${it}, ${target.policy}`).join('\n') + '\n';
      fs.writeFileSync(target.qx, content, 'utf8');
      console.log(`✔ [Quantumult X] 已追加 ${toAdd.length} 条三元组规则`);
    } else {
      console.log(`ℹ [Quantumult X] 条目已全部存在`);
    }
  }

  // 3. Mihomo (YAML payload)
  if (fs.existsSync(target.mihomo)) {
    let content = fs.readFileSync(target.mihomo, 'utf8').trimEnd();
    const existing = new Set(content.split(/\r?\n/).map(l => l.trim().toLowerCase()));
    const toAdd = cleanItems.filter(it => !existing.has(`- ${type.toLowerCase()},${it}`));
    if (toAdd.length > 0) {
      content += `\n  # --- 手动添加 (${dateStr}) ---\n` + toAdd.map(it => `  - ${type},${it}`).join('\n') + '\n';
      fs.writeFileSync(target.mihomo, content, 'utf8');
      console.log(`✔ [Mihomo] 已追加 ${toAdd.length} 条 YAML 规则`);
    } else {
      console.log(`ℹ [Mihomo] 条目已全部存在`);
    }
  }

  runValidation();
}

// 以 Loon .lsr 为单一真理源 (Single Source of Truth)，自动同步编译生成 QX 与 Mihomo 规则
function syncAllFromLoon() {
  console.log('🔄 开始从 Loon 规则基准一键同步全端 (Loon -> Quantumult X & Mihomo) ...\n');

  for (const [key, conf] of Object.entries(RULE_MAP)) {
    if (!fs.existsSync(conf.loon)) continue;

    console.log(`正在同步 [${key}] ...`);
    const loonLines = fs.readFileSync(conf.loon, 'utf8').split(/\r?\n/);

    const qxLines = [
      '# ==============================================================================',
      `# ${conf.title} (Quantumult X Format)`,
      '# Maintainer: fishyo',
      '# Homepage: https://github.com/fishyo/someLoonThings',
      '# ==============================================================================\n'
    ];

    const mihomoLines = [
      '# ==============================================================================',
      `# ${conf.title} (Mihomo Format)`,
      '# Maintainer: fishyo',
      '# Homepage: https://github.com/fishyo/someLoonThings',
      '# ==============================================================================\n',
      'payload:'
    ];

    for (const rawLine of loonLines) {
      const line = rawLine.trim();

      // 空行或注释，原汁原味保留
      if (!line) {
        qxLines.push('');
        mihomoLines.push('');
        continue;
      }
      if (line.startsWith('#') || line.startsWith(';')) {
        qxLines.push(rawLine);
        mihomoLines.push(`  ${rawLine}`);
        continue;
      }

      const parts = line.split(',').map(s => s.trim());
      const type = parts[0].toUpperCase();
      const target = parts[1];
      if (!target) continue;

      // 转换为 QX 三元组语法
      let qxType = 'host-suffix';
      if (type === 'DOMAIN-KEYWORD') qxType = 'host-keyword';
      else if (type === 'DOMAIN') qxType = 'host';
      else if (type === 'IP-CIDR') qxType = 'ip-cidr';
      else if (type === 'IP-CIDR6') qxType = 'ip-cidr6';
      else if (type === 'USER-AGENT') qxType = 'user-agent';

      qxLines.push(`${qxType}, ${target}, ${conf.policy}`);

      // 转换为 Mihomo 语法
      const mihomoRule = parts.length > 2 && parts[2] ? `${type},${target},${parts[2]}` : `${type},${target}`;
      mihomoLines.push(`  - ${mihomoRule}`);
    }

    fs.writeFileSync(conf.qx, qxLines.join('\n') + '\n', 'utf8');
    fs.writeFileSync(conf.mihomo, mihomoLines.join('\n') + '\n', 'utf8');
    console.log(`✔ [${key}] 同步完成:`);
    console.log(`   ↳ Quantumult X: ${conf.qx}`);
    console.log(`   ↳ Mihomo:       ${conf.mihomo}`);
  }

  runValidation();
}

// 主入口
function main() {
  const args = process.argv.slice(2);
  const action = args[0] || '--help';

  // 解析 --target 参数
  let targetKey = 'proxy';
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    targetKey = args[targetIdx + 1].toLowerCase();
    args.splice(targetIdx, 2);
  }

  if (action === '--add') {
    const domains = args.slice(1).filter(a => !a.startsWith('--'));
    if (domains.length === 0) {
      console.error('用法: node build-rules.js --add <domain1> [domain2...] [--target <proxy|ai|supercell>]');
      process.exit(1);
    }
    appendRules(domains, 'DOMAIN-SUFFIX', targetKey);

  } else if (action === '--add-keyword') {
    const keywords = args.slice(1).filter(a => !a.startsWith('--'));
    if (keywords.length === 0) {
      console.error('用法: node build-rules.js --add-keyword <keyword1> [keyword2...] [--target <proxy|ai|supercell>]');
      process.exit(1);
    }
    appendRules(keywords, 'DOMAIN-KEYWORD', targetKey);

  } else if (action === '--apply-staging') {
    const candidatesPath = path.join(STAGING_DIR, 'candidates.txt');
    if (!fs.existsSync(candidatesPath)) {
      console.log(`未找到待合并的 staging 文件: ${candidatesPath}`);
      return;
    }
    const lines = fs.readFileSync(candidatesPath, 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    appendRules(lines, 'DOMAIN-SUFFIX', targetKey);

    // 归档
    const historyPath = path.join(STAGING_DIR, 'history.log');
    const timestamp = new Date().toISOString();
    const historyLog = `\n# --- Applied at ${timestamp} (${lines.length} domains) ---\n` + lines.join('\n') + '\n';
    fs.appendFileSync(historyPath, historyLog, 'utf8');
    fs.writeFileSync(candidatesPath, '', 'utf8');
    console.log(`✔ 已归档历史记录至 ${historyPath}，并清空 candidates.txt`);

  } else if (action === '--sync') {
    syncAllFromLoon();

  } else if (action === '--validate') {
    runValidation();

  } else {
    console.log(`
分流规则管理工具使用帮助:
  1. 添加单个或多个域名:
     node .github/scripts/build-rules.js --add example.com sub.org
     node .github/scripts/build-rules.js --add claude.ai --target ai

  2. 添加关键字:
     node .github/scripts/build-rules.js --add-keyword twitter telegram

  3. 批量合并暂存区 (staging/candidates.txt):
     node .github/scripts/build-rules.js --apply-staging

  4. 以 Loon 为准一键全端同步 (Loon -> QX & Mihomo):
     node .github/scripts/build-rules.js --sync

  5. 校验全部格式与沙盒:
     node .github/scripts/build-rules.js --validate
`);
  }
}

main();
