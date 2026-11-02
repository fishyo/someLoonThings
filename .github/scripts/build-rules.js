/**
 * Multi-Platform Rule Compiler & Synchronizer
 * Automatically discovers rules/*.txt and compiles routing rules for Loon, Quantumult X, and Mihomo.
 *
 * Usage:
 *   node .github/scripts/build-rules.js
 *   node .github/scripts/build-rules.js --watch
 *   node .github/scripts/build-rules.js --add example.com [--target ai|twitter|proxy]
 *   node .github/scripts/build-rules.js --add-keyword twitter [--target twitter]
 *   node .github/scripts/build-rules.js --validate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');
const RULES_DIR = path.join(ROOT_DIR, 'rules');

// Title formatting helper
function formatTitle(key, content, policy) {
  const titleMap = {
    proxy: 'Custom Proxy Ruleset',
    ai: 'AI Services Ruleset',
    twitter: 'Twitter Ruleset',
    telegram: 'Telegram Ruleset',
    appstore: 'App Store Direct Ruleset',
    wechat: 'WeChat Direct Ruleset',
    supercell: 'Supercell Direct Ruleset'
  };
  if (titleMap[key]) return titleMap[key];

  const firstLine = content.split('\n')[0].trim();
  if (firstLine.startsWith('#')) {
    const clean = firstLine.replace(/^#\s*/, '').replace(/^(policy:\s*direct|direct)\s*/i, '').trim();
    if (clean) return `${clean} Ruleset`;
  }

  const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return `${capitalized} ${policy === 'direct' ? 'Direct ' : ''}Ruleset`;
}

// Automatically discover targets from rules/*.txt (Convention over Configuration)
function getTargets() {
  if (!fs.existsSync(RULES_DIR)) return {};

  const files = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.txt')).sort();
  const targets = {};
  const proxySources = [];

  for (const file of files) {
    const key = path.basename(file, '.txt').toLowerCase();
    const filePath = path.join(RULES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Any snippet with "# policy: direct" or "# direct" (or known direct lists) is direct
    const isDirect = /^\s*#\s*(policy:\s*direct|direct)\b/im.test(content) ||
                     ['appstore', 'wechat', 'supercell'].includes(key);

    const policy = isDirect ? 'direct' : 'proxy';
    const title = formatTitle(key, content, policy);

    // Collect subordinate proxy sources to automatically roll into master proxy
    if (policy === 'proxy' && key !== 'proxy') {
      proxySources.push(file);
    }

    const mihomoPath = (key === 'supercell')
      ? path.join(ROOT_DIR, 'mihomo/direct.yaml')
      : path.join(ROOT_DIR, `mihomo/${key}.yaml`);

    targets[key] = {
      key,
      title,
      policy,
      sources: [file],
      outputs: {
        loon: path.join(ROOT_DIR, `loon/${key}.lsr`),
        qx: path.join(ROOT_DIR, `quanX/rules/${key}.list`),
        mihomo: mihomoPath
      }
    };
  }

  // Master proxy aggregates all discovered proxy snippets + proxy.txt
  if (targets.proxy) {
    targets.proxy.sources = [...proxySources, 'proxy.txt'];
    targets.proxy.title = 'Custom Proxy Ruleset';
  }

  return targets;
}

// Parse single line rule
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

  // 5. Default domain suffix or keyword
  let val = line.replace(/^(\*\.|\bDOMAIN-SUFFIX,|\bhost-suffix,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();

  // If no dot and alphanumeric, treat as keyword
  if (!val.includes('.') && /^[a-z0-9_-]+$/i.test(val)) {
    return { type: 'KEYWORD', val };
  }

  return { type: 'DOMAIN-SUFFIX', val };
}

// Compile a single target
function compileTarget(targetKey, targets) {
  const target = targets[targetKey];
  if (!target) return;

  const loonLines = [
    `# Title: ${target.title}`,
    '# Maintainer: fishyo (https://github.com/fishyo/someLoonThings)',
    ''
  ];
  const qxLines = [
    `# Title: ${target.title}`,
    '# Maintainer: fishyo (https://github.com/fishyo/someLoonThings)',
    ''
  ];
  const mihomoLines = [
    `# Title: ${target.title}`,
    '# Maintainer: fishyo (https://github.com/fishyo/someLoonThings)',
    '',
    'payload:'
  ];

  const seenRules = new Set();
  const seenComments = new Set();
  let prevWasEmpty = false;

  for (const srcFileName of target.sources) {
    const srcPath = path.join(RULES_DIR, srcFileName);
    if (!fs.existsSync(srcPath)) continue;

    const rawLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
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
        const commentText = item.raw.trim();
        if (seenComments.has(commentText.toLowerCase())) continue;
        seenComments.add(commentText.toLowerCase());

        loonLines.push(item.raw);
        qxLines.push(item.raw);
        mihomoLines.push(`  ${item.raw}`);
        prevWasEmpty = false;
        continue;
      }

      const ruleKey = `${item.type}:${item.val.toLowerCase()}`;
      if (seenRules.has(ruleKey)) continue;
      seenRules.add(ruleKey);
      prevWasEmpty = false;

      switch (item.type) {
        case 'DOMAIN-SUFFIX':
          loonLines.push(`DOMAIN-SUFFIX,${item.val}`);
          qxLines.push(`host-suffix, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - DOMAIN-SUFFIX,${item.val}`);
          break;
        case 'KEYWORD':
          loonLines.push(`DOMAIN-KEYWORD,${item.val}`);
          qxLines.push(`host-keyword, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - DOMAIN-KEYWORD,${item.val}`);
          break;
        case 'DOMAIN':
          loonLines.push(`DOMAIN,${item.val}`);
          qxLines.push(`host, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - DOMAIN,${item.val}`);
          break;
        case 'IP-CIDR':
          loonLines.push(`IP-CIDR,${item.val},no-resolve`);
          qxLines.push(`ip-cidr, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - IP-CIDR,${item.val}`);
          break;
        case 'IP-CIDR6':
          loonLines.push(`IP-CIDR6,${item.val},no-resolve`);
          qxLines.push(`ip-cidr6, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - IP-CIDR6,${item.val}`);
          break;
      }
    }
  }

  fs.mkdirSync(path.dirname(target.outputs.loon), { recursive: true });
  fs.mkdirSync(path.dirname(target.outputs.qx), { recursive: true });
  fs.mkdirSync(path.dirname(target.outputs.mihomo), { recursive: true });

  fs.writeFileSync(target.outputs.loon, loonLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(target.outputs.qx, qxLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(target.outputs.mihomo, mihomoLines.join('\n').trimEnd() + '\n', 'utf8');

  console.log(`✔ [${targetKey}] Generated: Loon (${loonLines.length}), QX (${qxLines.length}), Mihomo (${mihomoLines.length})`);
}

// Compile all targets
function compileAll() {
  console.log('Discovering and compiling rulesets across all platforms...\n');
  const targets = getTargets();
  for (const key of Object.keys(targets)) {
    compileTarget(key, targets);
  }
  runValidation();
}

// Run validation script
function runValidation() {
  console.log('\n--- Running Platform Specification & Sandbox Validation (validate.js) ---');
  try {
    const valOutput = execSync(`node ${path.join(ROOT_DIR, '.github/scripts/validate.js')}`, { encoding: 'utf8' });
    console.log(valOutput);
    console.log('All targets validated successfully.');
  } catch (err) {
    console.error('Validation failed:', err.stdout || err.message);
    process.exit(1);
  }
}

// Add entries to a source file
function addToSource(items, targetKey = 'proxy') {
  const targets = getTargets();
  const primarySource = targets[targetKey] ? targets[targetKey].sources[0] : `${targetKey}.txt`;
  const srcPath = path.join(RULES_DIR, primarySource);

  let srcContent = fs.existsSync(srcPath) ? fs.readFileSync(srcPath, 'utf8').trimEnd() : '';
  const existingSet = new Set(
    srcContent
      .split(/\r?\n/)
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#'))
  );

  const toAdd = items.filter(it => it && !existingSet.has(it.toLowerCase()));
  if (toAdd.length === 0) {
    console.log(`[info] Entries already exist in rules/${primarySource}`);
    return;
  }

  srcContent += (srcContent ? '\n\n' : '') + `# Additions\n` + toAdd.join('\n') + '\n';
  fs.writeFileSync(srcPath, srcContent, 'utf8');
  console.log(`✔ Added ${toAdd.length} entries to rules/${primarySource}`);

  compileAll();
}

// Watch mode for instant hot reload
function watchRules() {
  console.log('Watching rules/*.txt for changes... (Press Ctrl+C to stop)');
  compileAll();

  let debounceTimer = null;
  fs.watch(RULES_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.txt')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\n[watch] Detected change or new file in rules/${filename}, compiling all targets...`);
      compileAll();
    }, 150);
  });
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

  } else if (action === '--watch') {
    watchRules();

  } else if (action === '--add') {
    const items = args.slice(1).filter(a => !a.startsWith('--'));
    if (items.length === 0) {
      console.error('Usage: node build-rules.js --add <domain1> [domain2...] [--target <name>]');
      process.exit(1);
    }
    addToSource(items, targetKey);

  } else if (action === '--add-keyword') {
    const keywords = args.slice(1).filter(a => !a.startsWith('--')).map(k => `keyword: ${k}`);
    if (keywords.length === 0) {
      console.error('Usage: node build-rules.js --add-keyword <keyword1> [keyword2...] [--target <name>]');
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
