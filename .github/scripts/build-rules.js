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
    'ai/openai': 'OpenAI Ruleset',
    'ai/claude': 'Claude Ruleset',
    'ai/gemini': 'Google Gemini Ruleset',
    'ai/copilot': 'Microsoft Copilot Ruleset',
    'ai/grok': 'Grok xAI Ruleset',
    'ai/perplexity': 'Perplexity Ruleset',
    'ai/midjourney': 'Midjourney Ruleset',
    'ai/tools': 'AI Tools Ruleset',
    'ai/models': 'AI Models Ruleset',
    'ai/media': 'AI Media Generation Ruleset',
    direct: 'Direct Whitelist Ruleset',
    appstore: 'App Store Direct Ruleset',
    game: 'Game Services Ruleset',
    'game/steam': 'Steam Ruleset',
    'game/nintendo': 'Nintendo Ruleset',
    'game/playstation': 'PlayStation Ruleset',
    'game/xbox': 'Xbox Ruleset',
    'game/twitch': 'Twitch Ruleset',
    'game/supercell': 'Supercell Direct Ruleset',
    streaming: 'Streaming Media Ruleset',
    'streaming/youtube': 'YouTube Ruleset',
    'streaming/netflix': 'Netflix Ruleset',
    'streaming/disney': 'Disney+ Ruleset',
    'streaming/spotify': 'Spotify Ruleset',
    'streaming/bilibili': 'Bilibili TV Ruleset',
    'streaming/bahamut': 'Bahamut Ruleset',
    'streaming/hbo': 'HBO Max Ruleset',
    'streaming/primevideo': 'Prime Video Ruleset',
    'streaming/hulu': 'Hulu Ruleset',
    'streaming/abema': 'AbemaTV Ruleset',
    'streaming/dazn': 'DAZN Ruleset',
    'streaming/paramount': 'Paramount+ Ruleset',
    'streaming/peacock': 'Peacock Ruleset',
    'streaming/crunchyroll': 'Crunchyroll Ruleset',
    'streaming/music': 'Streaming Music Ruleset',
    'streaming/japan': 'Japan TV Ruleset',
    'streaming/podcast': 'Podcast Ruleset',
    social: 'Social Media Ruleset',
    'social/meta': 'Meta Services Ruleset',
    'social/twitter': 'Twitter Ruleset',
    'social/telegram': 'Telegram Ruleset',
    'social/discord': 'Discord Ruleset',
    'social/reddit': 'Reddit Ruleset',
    'social/tiktok': 'TikTok Ruleset',
    'social/wechat': 'WeChat Direct Ruleset',
    microsoft: 'Microsoft Services Ruleset',
    'microsoft/microsoft': 'Microsoft Core Ruleset',
    'microsoft/services': 'Microsoft Services Ruleset',
    'microsoft/onedrive': 'OneDrive Ruleset',
    'microsoft/github': 'GitHub Ruleset'
  };
  if (titleMap[key]) return titleMap[key];

  if (content) {
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.startsWith('#')) {
      const clean = firstLine.replace(/^#\s*/, '').replace(/^(policy:\s*direct|direct)\s*/i, '').trim();
      if (clean) return `${clean} Ruleset`;
    }
  }

  const base = path.basename(key);
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
  return `${capitalized} ${policy === 'direct' ? 'Direct ' : ''}Ruleset`;
}

// Helper to recursively find all .txt files in a directory
function findRuleFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findRuleFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.txt')) {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push(rel);
    }
  }
  return results.sort();
}

// Automatically discover targets from rules/ (supporting subfolders like rules/streaming/)
function getTargets() {
  if (!fs.existsSync(RULES_DIR)) return {};

  const allFiles = findRuleFiles(RULES_DIR);
  const targets = {};
  const proxySources = [];
  const subfolderMap = {};

  // 1. Identify subfolders first
  for (const file of allFiles) {
    if (file.includes('/')) {
      const folder = file.split('/')[0].toLowerCase();
      if (!subfolderMap[folder]) subfolderMap[folder] = [];
      subfolderMap[folder].push(file);
    }
  }

  // 2. Discover targets
  for (const file of allFiles) {
    const isSub = file.includes('/');
    const subfolder = isSub ? file.split('/')[0].toLowerCase() : null;
    const baseName = path.basename(file, '.txt').toLowerCase();
    const key = isSub ? `${subfolder}/${baseName}` : baseName;

    // Skip top-level file if it is an auto-aggregated master file (e.g. rules/streaming.txt)
    if (!isSub && subfolderMap[baseName]) {
      continue;
    }

    const filePath = path.join(RULES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Any snippet with "# policy: direct" or "# direct" (or known direct lists) is direct
    const isDirect = /^\s*#\s*(policy:\s*direct|direct)\b/im.test(content) ||
                     ['appstore', 'wechat', 'supercell', 'direct'].includes(baseName);

    const policy = isDirect ? 'direct' : 'proxy';
    const title = formatTitle(key, content, policy);

    // Collect subordinate proxy sources to automatically roll into master proxy
    if (policy === 'proxy' && key !== 'proxy') {
      proxySources.push(file);
    }

    const mihomoPath = path.join(ROOT_DIR, `mihomo/${key}.yaml`);

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

  // Synthesize Subfolder Master Rules (e.g. streaming master rule aggregating all streaming/*.txt)
  for (const [folder, sources] of Object.entries(subfolderMap)) {
    const masterKey = folder;
    // Only aggregate sources whose policy is 'proxy' for the proxy master rule
    const proxySubSources = sources.filter(srcFile => {
      const srcKey = srcFile.replace(/\.txt$/, '');
      const srcTarget = targets[srcKey];
      return srcTarget && srcTarget.policy === 'proxy';
    });

    if (proxySubSources.length === 0) continue;

    const title = formatTitle(masterKey, '', 'proxy');
    targets[masterKey] = {
      key: masterKey,
      title,
      policy: 'proxy',
      sources: proxySubSources,
      outputs: {
        loon: path.join(ROOT_DIR, `loon/${masterKey}.lsr`),
        qx: path.join(ROOT_DIR, `quanX/rules/${masterKey}.list`),
        mihomo: path.join(ROOT_DIR, `mihomo/${masterKey}.yaml`),
        txt: path.join(RULES_DIR, `${masterKey}.txt`)
      }
    };
  }

  // Ensure streaming master rule also aggregates Twitch from game/ (if twitch rule exists)
  if (targets.streaming && fs.existsSync(path.join(RULES_DIR, 'game/twitch.txt')) && !targets.streaming.sources.includes('game/twitch.txt')) {
    targets.streaming.sources.push('game/twitch.txt');
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
  const txtLines = target.outputs.txt ? [] : null;


  const seenRules = new Set();
  const seenComments = new Set();
  let prevWasEmpty = false;

  for (let sIdx = 0; sIdx < target.sources.length; sIdx++) {
    const srcFileName = target.sources[sIdx];
    const srcPath = path.join(RULES_DIR, srcFileName);
    if (!fs.existsSync(srcPath)) continue;

    if (sIdx > 0 && !prevWasEmpty) {
      loonLines.push('');
      qxLines.push('');
      mihomoLines.push('');
      if (txtLines) txtLines.push('');
      prevWasEmpty = true;
    }

    const rawLines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
    for (const rawLine of rawLines) {
      const item = parseRuleLine(rawLine);

      if (item.type === 'EMPTY') {
        if (!prevWasEmpty) {
          loonLines.push('');
          qxLines.push('');
          mihomoLines.push('');
          if (txtLines) txtLines.push('');
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
        if (txtLines) txtLines.push(item.raw);
        prevWasEmpty = false;
        continue;
      }

      const ruleKey = `${item.type}:${item.val.toLowerCase()}`;
      if (seenRules.has(ruleKey)) continue;
      seenRules.add(ruleKey);
      prevWasEmpty = false;

      let txtVal = item.val;
      switch (item.type) {
        case 'DOMAIN-SUFFIX':
          loonLines.push(`DOMAIN-SUFFIX,${item.val}`);
          qxLines.push(`host-suffix, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - DOMAIN-SUFFIX,${item.val}`);
          txtVal = item.val;
          break;
        case 'KEYWORD':
          loonLines.push(`DOMAIN-KEYWORD,${item.val}`);
          qxLines.push(`host-keyword, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - DOMAIN-KEYWORD,${item.val}`);
          txtVal = item.val.includes('.') ? `keyword: ${item.val}` : item.val;
          break;
        case 'DOMAIN':
          loonLines.push(`DOMAIN,${item.val}`);
          qxLines.push(`host, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - DOMAIN,${item.val}`);
          txtVal = `exact: ${item.val}`;
          break;
        case 'IP-CIDR':
          loonLines.push(`IP-CIDR,${item.val},no-resolve`);
          qxLines.push(`ip-cidr, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - IP-CIDR,${item.val}`);
          txtVal = `cidr: ${item.val}`;
          break;
        case 'IP-CIDR6':
          loonLines.push(`IP-CIDR6,${item.val},no-resolve`);
          qxLines.push(`ip-cidr6, ${item.val}, ${target.policy}`);
          mihomoLines.push(`  - IP-CIDR6,${item.val}`);
          txtVal = `IP-CIDR6,${item.val}`;
          break;
      }
      if (txtLines) txtLines.push(txtVal);
    }
  }

  // Handle Master Local / General rules written directly into the Master .txt file
  if (target.outputs.txt && fs.existsSync(target.outputs.txt)) {
    const childRuleKeys = new Set();
    for (const src of target.sources) {
      const p = path.join(RULES_DIR, src);
      if (fs.existsSync(p)) {
        for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
          const item = parseRuleLine(l);
          if (item.type !== 'EMPTY' && item.type !== 'COMMENT') {
            childRuleKeys.add(`${item.type}:${item.val.toLowerCase()}`);
          }
        }
      }
    }

    const masterRawLines = fs.readFileSync(target.outputs.txt, 'utf8').split(/\r?\n/);
    const localLines = [];
    let currentComment = null;

    for (const rawLine of masterRawLines) {
      const item = parseRuleLine(rawLine);
      if (item.type === 'EMPTY') continue;
      if (item.type === 'COMMENT') {
        currentComment = item.raw.trim();
        continue;
      }

      const k = `${item.type}:${item.val.toLowerCase()}`;
      if (!childRuleKeys.has(k)) {
        if (currentComment) {
          localLines.push({ type: 'COMMENT', raw: currentComment });
          currentComment = null;
        }
        localLines.push(item);
      } else {
        currentComment = null;
      }
    }

    if (localLines.length > 0) {
      target.localRules = [];
      if (!prevWasEmpty) {
        loonLines.push('');
        qxLines.push('');
        mihomoLines.push('');
        if (txtLines) txtLines.push('');
        prevWasEmpty = true;
      }

      let hasHeader = false;
      for (const item of localLines) {
        if (item.type === 'COMMENT') {
          const commentText = item.raw.trim();
          if (seenComments.has(commentText.toLowerCase())) continue;
          seenComments.add(commentText.toLowerCase());

          loonLines.push(item.raw);
          qxLines.push(item.raw);
          mihomoLines.push(`  ${item.raw}`);
          if (txtLines) txtLines.push(item.raw);
          hasHeader = true;
          prevWasEmpty = false;
          continue;
        }

        if (!hasHeader) {
          const defaultComment = '# General';
          if (!seenComments.has(defaultComment.toLowerCase())) {
            seenComments.add(defaultComment.toLowerCase());
            loonLines.push(defaultComment);
            qxLines.push(defaultComment);
            mihomoLines.push(`  ${defaultComment}`);
            if (txtLines) txtLines.push(defaultComment);
          }
          hasHeader = true;
        }

        const ruleKey = `${item.type}:${item.val.toLowerCase()}`;
        if (seenRules.has(ruleKey)) continue;
        seenRules.add(ruleKey);
        prevWasEmpty = false;

        target.localRules.push(item);

        let txtVal = item.val;
        switch (item.type) {
          case 'DOMAIN-SUFFIX':
            loonLines.push(`DOMAIN-SUFFIX,${item.val}`);
            qxLines.push(`host-suffix, ${item.val}, ${target.policy}`);
            mihomoLines.push(`  - DOMAIN-SUFFIX,${item.val}`);
            txtVal = item.val;
            break;
          case 'KEYWORD':
            loonLines.push(`DOMAIN-KEYWORD,${item.val}`);
            qxLines.push(`host-keyword, ${item.val}, ${target.policy}`);
            mihomoLines.push(`  - DOMAIN-KEYWORD,${item.val}`);
            txtVal = item.val.includes('.') ? `keyword: ${item.val}` : item.val;
            break;
          case 'DOMAIN':
            loonLines.push(`DOMAIN,${item.val}`);
            qxLines.push(`host, ${item.val}, ${target.policy}`);
            mihomoLines.push(`  - DOMAIN,${item.val}`);
            txtVal = `exact: ${item.val}`;
            break;
          case 'IP-CIDR':
            loonLines.push(`IP-CIDR,${item.val},no-resolve`);
            qxLines.push(`ip-cidr, ${item.val}, ${target.policy}`);
            mihomoLines.push(`  - IP-CIDR,${item.val}`);
            txtVal = `cidr: ${item.val}`;
            break;
          case 'IP-CIDR6':
            loonLines.push(`IP-CIDR6,${item.val},no-resolve`);
            qxLines.push(`ip-cidr6, ${item.val}, ${target.policy}`);
            mihomoLines.push(`  - IP-CIDR6,${item.val}`);
            txtVal = `IP-CIDR6,${item.val}`;
            break;
        }
        if (txtLines) txtLines.push(txtVal);
      }
    }
  }

  // Absorb all Master local/general rules into proxy target
  if (targetKey === 'proxy') {
    for (const [k, t] of Object.entries(targets)) {
      if (t.localRules && t.localRules.length > 0 && t.policy === 'proxy') {
        const catName = k.charAt(0).toUpperCase() + k.slice(1);
        loonLines.push('');
        loonLines.push(`# ${catName} - General`);
        qxLines.push('');
        qxLines.push(`# ${catName} - General`);
        mihomoLines.push('');
        mihomoLines.push(`  # ${catName} - General`);

        for (const item of t.localRules) {
          const ruleKey = `${item.type}:${item.val.toLowerCase()}`;
          if (seenRules.has(ruleKey)) continue;
          seenRules.add(ruleKey);

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
    }
  }

  fs.mkdirSync(path.dirname(target.outputs.loon), { recursive: true });
  fs.mkdirSync(path.dirname(target.outputs.qx), { recursive: true });
  fs.mkdirSync(path.dirname(target.outputs.mihomo), { recursive: true });

  fs.writeFileSync(target.outputs.loon, loonLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(target.outputs.qx, qxLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(target.outputs.mihomo, mihomoLines.join('\n').trimEnd() + '\n', 'utf8');


  if (target.outputs.txt) {
    fs.mkdirSync(path.dirname(target.outputs.txt), { recursive: true });
    fs.writeFileSync(target.outputs.txt, txtLines.join('\n').trimEnd() + '\n', 'utf8');
  }

  console.log(`✔ [${targetKey}] Generated: Loon (${loonLines.length}), QX (${qxLines.length}), Mihomo (${mihomoLines.length})${target.outputs.txt ? `, TXT (${txtLines.length})` : ''}`);
}

// Helper to recursively find files with specific extension
function findFilesRecursive(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFilesRecursive(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Automatically prune orphan platform files and empty subdirectories
function pruneOrphans(targets) {
  const validFiles = {
    loon: new Set(),
    qx: new Set(),
    mihomo: new Set(),
    txt: new Set()
  };

  for (const t of Object.values(targets)) {
    if (t.outputs.loon) validFiles.loon.add(path.resolve(t.outputs.loon));
    if (t.outputs.qx) validFiles.qx.add(path.resolve(t.outputs.qx));
    if (t.outputs.mihomo) validFiles.mihomo.add(path.resolve(t.outputs.mihomo));
    if (t.outputs.txt) validFiles.txt.add(path.resolve(t.outputs.txt));
  }

  // Retain existing atomic source txt files in rules/
  for (const src of findRuleFiles(RULES_DIR)) {
    validFiles.txt.add(path.resolve(RULES_DIR, src));
  }

  const checkDirs = [
    { name: 'Loon', dir: path.join(ROOT_DIR, 'loon'), ext: '.lsr', set: validFiles.loon },
    { name: 'Quantumult X', dir: path.join(ROOT_DIR, 'quanX/rules'), ext: '.list', set: validFiles.qx },
    { name: 'Mihomo', dir: path.join(ROOT_DIR, 'mihomo'), ext: '.yaml', set: validFiles.mihomo }
  ];

  let prunedCount = 0;
  for (const item of checkDirs) {
    if (!fs.existsSync(item.dir)) continue;
    const files = findFilesRecursive(item.dir, item.ext);
    for (const f of files) {
      const resolved = path.resolve(f);
      if (!item.set.has(resolved)) {
        fs.unlinkSync(resolved);
        const rel = path.relative(ROOT_DIR, resolved).replace(/\\/g, '/');
        console.log(`🗑  [PRUNED] Removed orphan ${item.name} rule: ${rel}`);
        prunedCount++;
      }
    }
  }

  // Clean empty subdirectories in platform output directories
  const cleanupDirs = [
    path.join(ROOT_DIR, 'loon'),
    path.join(ROOT_DIR, 'quanX/rules'),
    path.join(ROOT_DIR, 'mihomo'),
    RULES_DIR
  ];

  function cleanEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) {
        const sub = path.join(dir, ent.name);
        cleanEmptyDirs(sub);
        if (fs.readdirSync(sub).length === 0) {
          fs.rmdirSync(sub);
          const rel = path.relative(ROOT_DIR, sub).replace(/\\/g, '/');
          console.log(`📁 [PRUNED] Cleaned empty directory: ${rel}`);
        }
      }
    }
  }

  for (const dir of cleanupDirs) {
    cleanEmptyDirs(dir);
  }

  if (prunedCount > 0) {
    console.log(`✔ Pruned ${prunedCount} orphan output files across platforms.\n`);
  }
}

// Compile all targets
function compileAll() {
  console.log('Discovering and compiling rulesets across all platforms...\n');
  const targets = getTargets();
  const keys = Object.keys(targets).sort((a, b) => {
    if (a === 'proxy') return 1;
    if (b === 'proxy') return -1;
    return a.localeCompare(b);
  });
  for (const key of keys) {
    compileTarget(key, targets);
  }
  pruneOrphans(targets);
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
  let primarySource;
  if (targets[targetKey] && targets[targetKey].outputs.txt) {
    primarySource = `${targetKey}.txt`;
  } else if (targets[targetKey]) {
    primarySource = targets[targetKey].sources[0];
  } else {
    primarySource = `${targetKey}.txt`;
  }
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

  const defaultHeader = (targets[targetKey] && targets[targetKey].outputs.txt) ? '# General' : '# Additions';
  srcContent += (srcContent ? '\n\n' : '') + `${defaultHeader}\n` + toAdd.join('\n') + '\n';
  fs.writeFileSync(srcPath, srcContent, 'utf8');
  console.log(`✔ Added ${toAdd.length} entries to rules/${primarySource}`);

  compileAll();
}

// Watch mode for instant hot reload
function watchRules() {
  console.log('Watching rules/ for changes... (Press Ctrl+C to stop)');
  compileAll();

  let debounceTimer = null;
  fs.watch(RULES_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && !filename.endsWith('.txt')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\n[watch] Detected change in rules/${filename || ''}, compiling all targets...`);
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
