/**
 * Multi-Platform Rule Compiler & Synchronizer
 * Compiles and synchronizes routing rules for Loon, Quantumult X, and Mihomo.
 *
 * Core Architecture:
 *   - Source lists are maintained in rules/*.txt as plain domains, keywords, or CIDRs.
 *   - Subordinate proxy rulesets (ai, twitter, telegram) automatically synchronize into
 *     the master proxy ruleset (rules/proxy.txt) to guarantee complete proxy coverage.
 *   - Whitelist / direct rulesets (appstore, wechat, supercell) remain independent.
 *   - The compiler infers rule directives, eliminates duplicates, and formats outputs
 *     specifically for Loon (.lsr), Quantumult X (.list), and Mihomo (.yaml).
 *
 * Usage:
 *   node .github/scripts/build-rules.js
 *   node .github/scripts/build-rules.js --sync
 *   node .github/scripts/build-rules.js --add example.com sub.org
 *   node .github/scripts/build-rules.js --add claude.ai --target ai
 *   node .github/scripts/build-rules.js --add-keyword twitter telegram
 *   node .github/scripts/build-rules.js --validate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');
const RULES_DIR = path.join(ROOT_DIR, 'rules');

const RULE_CONFIGS = {
  proxy: {
    src: path.join(RULES_DIR, 'proxy.txt'),
    loon: path.join(ROOT_DIR, 'loon/proxy.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/proxy.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/proxy.yaml'),
    policy: 'proxy',
    title: 'Custom Proxy Ruleset',
    isMaster: true
  },
  ai: {
    src: path.join(RULES_DIR, 'ai.txt'),
    loon: path.join(ROOT_DIR, 'loon/ai.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/ai.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/ai.yaml'),
    policy: 'proxy',
    title: 'AI Services Ruleset',
    subordinateTo: 'proxy'
  },
  twitter: {
    src: path.join(RULES_DIR, 'twitter.txt'),
    loon: path.join(ROOT_DIR, 'loon/twitter.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/twitter.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/twitter.yaml'),
    policy: 'proxy',
    title: 'Twitter Ruleset',
    subordinateTo: 'proxy'
  },
  telegram: {
    src: path.join(RULES_DIR, 'telegram.txt'),
    loon: path.join(ROOT_DIR, 'loon/telegram.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/telegram.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/telegram.yaml'),
    policy: 'proxy',
    title: 'Telegram Ruleset',
    subordinateTo: 'proxy'
  },
  appstore: {
    src: path.join(RULES_DIR, 'appstore.txt'),
    loon: path.join(ROOT_DIR, 'loon/appstore.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/appstore.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/appstore.yaml'),
    policy: 'direct',
    title: 'App Store Direct Ruleset'
  },
  wechat: {
    src: path.join(RULES_DIR, 'wechat.txt'),
    loon: path.join(ROOT_DIR, 'loon/wechat.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/wechat.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/wechat.yaml'),
    policy: 'direct',
    title: 'WeChat Direct Ruleset'
  },
  supercell: {
    src: path.join(RULES_DIR, 'supercell.txt'),
    loon: path.join(ROOT_DIR, 'loon/supercell.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/supercell.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/direct.yaml'),
    policy: 'direct',
    title: 'Supercell Direct Ruleset'
  }
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Synchronize all subordinate rulesets into the master ruleset
function syncSubordinatesToMaster(masterKey = 'proxy') {
  const masterConf = RULE_CONFIGS[masterKey];
  if (!masterConf || !fs.existsSync(masterConf.src)) return false;

  let masterContent = fs.readFileSync(masterConf.src, 'utf8').replace(/\r\n/g, '\n');
  let changed = false;

  const subordinateKeys = Object.keys(RULE_CONFIGS).filter(
    k => RULE_CONFIGS[k].subordinateTo === masterKey
  );

  for (const subKey of subordinateKeys) {
    const subConf = RULE_CONFIGS[subKey];
    if (!fs.existsSync(subConf.src)) continue;

    const subContent = fs.readFileSync(subConf.src, 'utf8').trim().replace(/\r\n/g, '\n');
    const beginMarker = `# >>> BEGIN SUBORDINATE: ${subKey} (rules/${path.basename(subConf.src)})`;
    const endMarker = `# <<< END SUBORDINATE: ${subKey}`;

    const blockRegex = new RegExp(`${escapeRegExp(beginMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`, 'm');
    const replacementBlock = `${beginMarker}\n${subContent}\n${endMarker}`;

    if (blockRegex.test(masterContent)) {
      const currentMatch = masterContent.match(blockRegex)[0];
      if (currentMatch !== replacementBlock) {
        masterContent = masterContent.replace(blockRegex, replacementBlock);
        changed = true;
      }
    } else {
      masterContent = masterContent.trimEnd() + `\n\n${replacementBlock}\n`;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(masterConf.src, masterContent.trimEnd() + '\n', 'utf8');
    console.log(`[sync] Synchronized subordinate rulesets (${subordinateKeys.join(', ')}) into rules/${path.basename(masterConf.src)}`);
    return true;
  }
  return false;
}

// Intelligent single-line rule parser
function parseRuleLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return { type: 'EMPTY', raw: rawLine };
  if (line.startsWith('#') || line.startsWith(';')) return { type: 'COMMENT', raw: rawLine };

  // 1. Keyword inference
  if (/^(keyword:|kw:|\bDOMAIN-KEYWORD,|\bhost-keyword,)/i.test(line)) {
    const val = line.replace(/^(keyword:|kw:|\bDOMAIN-KEYWORD,|\bhost-keyword,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'KEYWORD', val };
  }

  // 2. Exact domain inference
  if (/^(exact:|full:|\bDOMAIN,|\bhost,)/i.test(line)) {
    const val = line.replace(/^(exact:|full:|\bDOMAIN,|\bhost,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'DOMAIN', val };
  }

  // 3. IPv4 CIDR
  if (/^(cidr:|\bIP-CIDR,|\bip-cidr,)/i.test(line) || (/^\d{1,3}(\.\d{1,3}){3}\/\d+$/.test(line))) {
    const val = line.replace(/^(cidr:|\bIP-CIDR,|\bip-cidr,)/i, '')
      .replace(/,\s*no-resolve/i, '')
      .replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'IP-CIDR', val };
  }

  // 4. IPv6 CIDR
  if (/^(IP-CIDR6,|ip-cidr6,)/i.test(line) || (/^([0-9a-fA-F:]+)\/\d+$/.test(line) && line.includes(':'))) {
    const val = line.replace(/^(IP-CIDR6,|ip-cidr6,)/i, '')
      .replace(/,\s*no-resolve/i, '')
      .replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'IP-CIDR6', val };
  }

  // 5. Default domain suffix or standalone keyword
  let val = line.replace(/^(\*\.|\bDOMAIN-SUFFIX,|\bhost-suffix,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();

  // If no dot and alphanumeric, treat as keyword
  if (!val.includes('.') && /^[a-z0-9_-]+$/i.test(val)) {
    return { type: 'KEYWORD', val };
  }

  // Standard domain suffix
  return { type: 'DOMAIN-SUFFIX', val };
}

// Compile a single source file to Loon, Quantumult X, and Mihomo
function compileSourceFile(confKey) {
  const conf = RULE_CONFIGS[confKey];
  if (!fs.existsSync(conf.src)) return;

  const rawLines = fs.readFileSync(conf.src, 'utf8').split(/\r?\n/);

  const loonLines = [
    '# ==============================================================================',
    `# ${conf.title} (Loon Format)`,
    '# Maintainer: fishyo',
    '# Homepage: https://github.com/fishyo/someLoonThings',
    '# ==============================================================================\n'
  ];
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

  const seenRules = new Set();
  let prevWasEmpty = false;

  for (const rawLine of rawLines) {
    const item = parseRuleLine(rawLine);

    if (item.type === 'EMPTY') {
      if (!prevWasEmpty) {
        loonLines.push('');
        qxLines.push('');
        mihomoLines.push('');
        prevWasEmpty = true;
      }
      continue;
    }

    if (item.type === 'COMMENT') {
      loonLines.push(item.raw);
      qxLines.push(item.raw);
      mihomoLines.push(`  ${item.raw}`);
      prevWasEmpty = false;
      continue;
    }

    // Deduplicate identical rule directives
    const ruleKey = `${item.type}:${item.val.toLowerCase()}`;
    if (seenRules.has(ruleKey)) {
      continue;
    }
    seenRules.add(ruleKey);
    prevWasEmpty = false;

    switch (item.type) {
      case 'DOMAIN-SUFFIX':
        loonLines.push(`DOMAIN-SUFFIX,${item.val}`);
        qxLines.push(`host-suffix, ${item.val}, ${conf.policy}`);
        mihomoLines.push(`  - DOMAIN-SUFFIX,${item.val}`);
        break;
      case 'KEYWORD':
        loonLines.push(`DOMAIN-KEYWORD,${item.val}`);
        qxLines.push(`host-keyword, ${item.val}, ${conf.policy}`);
        mihomoLines.push(`  - DOMAIN-KEYWORD,${item.val}`);
        break;
      case 'DOMAIN':
        loonLines.push(`DOMAIN,${item.val}`);
        qxLines.push(`host, ${item.val}, ${conf.policy}`);
        mihomoLines.push(`  - DOMAIN,${item.val}`);
        break;
      case 'IP-CIDR':
        loonLines.push(`IP-CIDR,${item.val},no-resolve`);
        qxLines.push(`ip-cidr, ${item.val}, ${conf.policy}`);
        mihomoLines.push(`  - IP-CIDR,${item.val}`);
        break;
      case 'IP-CIDR6':
        loonLines.push(`IP-CIDR6,${item.val},no-resolve`);
        qxLines.push(`ip-cidr6, ${item.val}, ${conf.policy}`);
        mihomoLines.push(`  - IP-CIDR6,${item.val}`);
        break;
    }
  }

  // Ensure output directories exist and write files
  fs.mkdirSync(path.dirname(conf.loon), { recursive: true });
  fs.mkdirSync(path.dirname(conf.qx), { recursive: true });
  fs.mkdirSync(path.dirname(conf.mihomo), { recursive: true });

  fs.writeFileSync(conf.loon, loonLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(conf.qx, qxLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(conf.mihomo, mihomoLines.join('\n').trimEnd() + '\n', 'utf8');

  console.log(`✔ [${confKey}] Compiled successfully: Loon (${loonLines.length} lines), QX (${qxLines.length} lines), Mihomo (${mihomoLines.length} lines)`);
}

// Run compilation for all rulesets
function compileAll() {
  console.log('Synchronizing and compiling rulesets across all platforms...\n');
  syncSubordinatesToMaster('proxy');
  for (const key of Object.keys(RULE_CONFIGS)) {
    compileSourceFile(key);
  }
  runValidation();
}

// Run platform validation
function runValidation() {
  console.log('\n--- Running Platform Specification & Sandbox Validation (validate.js) ---');
  try {
    const valOutput = execSync(`node ${path.join(ROOT_DIR, '.github/scripts/validate.js')}`, { encoding: 'utf8' });
    console.log(valOutput);
    console.log('All targets validated successfully.');
  } catch (err) {
    console.error('Validation failed. Please inspect rule syntax:', err.stdout || err.message);
    process.exit(1);
  }
}

// Add new rules to a source file
function addToSource(items, targetKey = 'proxy') {
  const conf = RULE_CONFIGS[targetKey] || RULE_CONFIGS.proxy;
  if (!fs.existsSync(conf.src)) {
    console.error(`Source file does not exist: ${conf.src}`);
    return;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  let srcContent = fs.readFileSync(conf.src, 'utf8').trimEnd();
  const existingSet = new Set(
    srcContent
      .split(/\r?\n/)
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#'))
  );

  const toAdd = items.filter(it => it && !existingSet.has(it.toLowerCase()));
  if (toAdd.length === 0) {
    console.log(`[info] Target entries already exist in ${path.basename(conf.src)}`);
    return;
  }

  srcContent += `\n\n# --- Manual Addition (${dateStr}) ---\n` + toAdd.join('\n') + '\n';
  fs.writeFileSync(conf.src, srcContent + '\n', 'utf8');
  console.log(`✔ Added ${toAdd.length} entries to rules/${path.basename(conf.src)}`);

  // If the target is subordinate to a master ruleset, sync and compile both
  if (conf.subordinateTo) {
    syncSubordinatesToMaster(conf.subordinateTo);
    compileSourceFile(targetKey);
    compileSourceFile(conf.subordinateTo);
  } else {
    compileSourceFile(targetKey);
  }
  runValidation();
}

// CLI entry point
function main() {
  const args = process.argv.slice(2);
  const action = args[0] || '--compile';

  // Parse --target flag
  let targetKey = 'proxy';
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    targetKey = args[targetIdx + 1].toLowerCase();
    args.splice(targetIdx, 2);
  }

  if (action === '--compile' || action === '--sync') {
    compileAll();

  } else if (action === '--add') {
    const items = args.slice(1).filter(a => !a.startsWith('--'));
    if (items.length === 0) {
      console.error('Usage: node build-rules.js --add <domain1> [domain2...] [--target <proxy|ai|telegram|twitter>]');
      process.exit(1);
    }
    addToSource(items, targetKey);

  } else if (action === '--add-keyword') {
    const keywords = args.slice(1).filter(a => !a.startsWith('--')).map(k => `keyword: ${k}`);
    if (keywords.length === 0) {
      console.error('Usage: node build-rules.js --add-keyword <keyword1> [keyword2...] [--target <proxy|ai|telegram|twitter>]');
      process.exit(1);
    }
    addToSource(keywords, targetKey);

  } else if (action === '--validate') {
    runValidation();

  } else {
    compileAll();
  }
}

main();
