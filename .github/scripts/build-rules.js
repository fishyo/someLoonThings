/**
 * Multi-Platform Rule Builder & Synchronizer
 * 将审批通过的代理域名，自动规范化更新至 Loon (.lsr)、Quantumult X (.list) 与 Mihomo (.yaml)
 * 并运行 CI 自动化语法校验确保 100% 格式合规。
 *
 * 用法:
 *   node .github/scripts/build-rules.js --apply-staging   # 读取并应用 staging/candidates.txt 中的批准域名
 *   node .github/scripts/build-rules.js --add domain.com  # 手动添加单个域名并三端同步
 *   node .github/scripts/build-rules.js --validate        # 仅运行格式校验
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');
const STAGING_DIR = path.join(ROOT_DIR, 'staging');

const LOON_PROXY = path.join(ROOT_DIR, 'loon/proxy.lsr');
const QX_PROXY = path.join(ROOT_DIR, 'quanX/rules/proxy.list');
const MIHOMO_PROXY = path.join(ROOT_DIR, 'mihomo/proxy.yaml');

// 规范化添加新域名到三端
function applyApprovedDomains(newDomains) {
  if (!newDomains || newDomains.length === 0) {
    console.log('未检测到需要合并的新域名。');
    return;
  }

  // 清洗并排重待添加域名
  const cleanList = Array.from(new Set(
    newDomains
      .map(d => d.trim().toLowerCase().replace(/^DOMAIN(-SUFFIX)?,/i, '').replace(/^host(-suffix)?,/i, '').replace(/,\s*proxy$/i, ''))
      .filter(d => d && d.includes('.') && !d.startsWith('#'))
  )).sort();

  console.log(`准备合并 ${cleanList.length} 个新域名至 Loon, Quantumult X 与 Mihomo 规则库...`);

  const dateStr = new Date().toISOString().split('T')[0];
  const sectionHeaderLoon = `\n# --- 经审批上游合并 (${dateStr}) ---`;
  const sectionHeaderQX = `\n# --- 经审批上游合并 (${dateStr}) ---`;
  const sectionHeaderMihomo = `  # --- 经审批上游合并 (${dateStr}) ---`;

  // 1. 更新 Loon (DOMAIN-SUFFIX,domain)
  if (fs.existsSync(LOON_PROXY)) {
    let content = fs.readFileSync(LOON_PROXY, 'utf8').trimEnd();
    const existing = new Set(content.split(/\r?\n/).map(l => l.trim().toLowerCase()));
    const toAdd = cleanList.filter(d => !existing.has(`domain-suffix,${d}`) && !existing.has(`domain,${d}`));

    if (toAdd.length > 0) {
      content += `${sectionHeaderLoon}\n` + toAdd.map(d => `DOMAIN-SUFFIX,${d}`).join('\n') + '\n';
      fs.writeFileSync(LOON_PROXY, content, 'utf8');
      console.log(`✔ [Loon] 成功追加 ${toAdd.length} 条规则至 loon/proxy.lsr`);
    } else {
      console.log(`ℹ [Loon] 所有条目已存在，无需追加`);
    }
  }

  // 2. 更新 Quantumult X (严格三元组: host-suffix, domain, proxy)
  if (fs.existsSync(QX_PROXY)) {
    let content = fs.readFileSync(QX_PROXY, 'utf8').trimEnd();
    const existing = new Set(content.split(/\r?\n/).map(l => l.trim().toLowerCase()));
    const toAdd = cleanList.filter(d => !existing.has(`host-suffix, ${d}, proxy`));

    if (toAdd.length > 0) {
      content += `${sectionHeaderQX}\n` + toAdd.map(d => `host-suffix, ${d}, proxy`).join('\n') + '\n';
      fs.writeFileSync(QX_PROXY, content, 'utf8');
      console.log(`✔ [Quantumult X] 成功追加 ${toAdd.length} 条三元组规则至 quanX/rules/proxy.list`);
    } else {
      console.log(`ℹ [Quantumult X] 所有条目已存在，无需追加`);
    }
  }

  // 3. 更新 Mihomo (- DOMAIN-SUFFIX,domain)
  if (fs.existsSync(MIHOMO_PROXY)) {
    let content = fs.readFileSync(MIHOMO_PROXY, 'utf8').trimEnd();
    const existing = new Set(content.split(/\r?\n/).map(l => l.trim().toLowerCase()));
    const toAdd = cleanList.filter(d => !existing.has(`- domain-suffix,${d}`));

    if (toAdd.length > 0) {
      content += `\n${sectionHeaderMihomo}\n` + toAdd.map(d => `  - DOMAIN-SUFFIX,${d}`).join('\n') + '\n';
      fs.writeFileSync(MIHOMO_PROXY, content, 'utf8');
      console.log(`✔ [Mihomo] 成功追加 ${toAdd.length} 条规则至 mihomo/proxy.yaml`);
    } else {
      console.log(`ℹ [Mihomo] 所有条目已存在，无需追加`);
    }
  }

  // 4. 自动运行官方 CI 校验脚本
  console.log('\n--- 运行平台规范合规性校验 ---');
  try {
    const valOutput = execSync(`node ${path.join(ROOT_DIR, '.github/scripts/validate.js')}`, { encoding: 'utf8' });
    console.log(valOutput);
    console.log('🎉 规则更新成功且通过全部多端语法校验！');
  } catch (err) {
    console.error('✖ 规则更新后未通过 validate.js 校验，请检查格式:', err.stdout || err.message);
    process.exit(1);
  }
}

// 主入口
function main() {
  const args = process.argv.slice(2);
  const action = args[0] || '--apply-staging';

  if (action === '--apply-staging') {
    const candidatesPath = path.join(STAGING_DIR, 'candidates.txt');
    if (!fs.existsSync(candidatesPath)) {
      console.log(`未找到待合并的 staging 文件: ${candidatesPath}`);
      return;
    }
    const lines = fs.readFileSync(candidatesPath, 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    applyApprovedDomains(lines);

    // 记录到历史归档并清空 staging
    const historyPath = path.join(STAGING_DIR, 'history.log');
    const timestamp = new Date().toISOString();
    const historyLog = `\n# --- Applied at ${timestamp} (${lines.length} domains) ---\n` + lines.join('\n') + '\n';
    fs.appendFileSync(historyPath, historyLog, 'utf8');
    fs.writeFileSync(candidatesPath, '', 'utf8');
    console.log(`✔ 已归档历史记录至 ${historyPath}，并清空 candidates.txt`);
  } else if (action === '--add') {
    const domain = args[1];
    if (!domain) {
      console.error('用法: node build-rules.js --add <domain>');
      process.exit(1);
    }
    applyApprovedDomains([domain]);
  } else if (action === '--validate') {
    const valOutput = execSync(`node ${path.join(ROOT_DIR, '.github/scripts/validate.js')}`, { encoding: 'utf8' });
    console.log(valOutput);
  } else {
    console.log(`未知操作: ${action}`);
  }
}

main();
