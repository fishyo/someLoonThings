/**
 * Multi-Platform Rule Compiler & Synchronizer
 * 智能规则解析与多平台编译分发引擎
 *
 * 核心设计:
 *   在 rules/*.txt 中只需写纯域名、关键词 (keyword:xxx) 或精准域名 (exact:xxx)，
 *   引擎会自动推断规则类型，并标准化分发编译至 Loon、Quantumult X 与 Mihomo。
 *
 * 用法:
 *   1. 编译全部分流规则 (将 rules/*.txt 编译分发至三端):
 *      node .github/scripts/build-rules.js
 *
 *   2. 向源文件添加域名并自动全端编译:
 *      node .github/scripts/build-rules.js --add example.com sub.org
 *      node .github/scripts/build-rules.js --add claude.ai --target ai
 *
 *   3. 向源文件添加关键词:
 *      node .github/scripts/build-rules.js --add-keyword twitter telegram
 *
 *   4. 校验格式与沙盒:
 *      node .github/scripts/build-rules.js --validate
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
    title: 'Custom Proxy Ruleset'
  },
  ai: {
    src: path.join(RULES_DIR, 'ai.txt'),
    loon: path.join(ROOT_DIR, 'loon/ai.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/ai.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/ai.yaml'),
    policy: 'proxy',
    title: 'AI Services Ruleset'
  },
  twitter: {
    src: path.join(RULES_DIR, 'twitter.txt'),
    loon: path.join(ROOT_DIR, 'loon/twitter.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/twitter.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/twitter.yaml'),
    policy: 'proxy',
    title: 'Twitter Ruleset'
  },
  telegram: {
    src: path.join(RULES_DIR, 'telegram.txt'),
    loon: path.join(ROOT_DIR, 'loon/telegram.lsr'),
    qx: path.join(ROOT_DIR, 'quanX/rules/telegram.list'),
    mihomo: path.join(ROOT_DIR, 'mihomo/telegram.yaml'),
    policy: 'proxy',
    title: 'Telegram Ruleset'
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

// 智能单行规则解析器
function parseRuleLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return { type: 'EMPTY', raw: rawLine };
  if (line.startsWith('#') || line.startsWith(';')) return { type: 'COMMENT', raw: rawLine };

  // 1. 关键词推断 (前缀 keyword:, kw:, 或包含常见关键词指令)
  if (/^(keyword:|kw:|\bDOMAIN-KEYWORD,|\bhost-keyword,)/i.test(line)) {
    const val = line.replace(/^(keyword:|kw:|\bDOMAIN-KEYWORD,|\bhost-keyword,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'KEYWORD', val };
  }

  // 2. 精准域名推断 (前缀 exact:, full:, 或包含 DOMAIN/host 精确指令)
  if (/^(exact:|full:|\bDOMAIN,|\bhost,)/i.test(line)) {
    const val = line.replace(/^(exact:|full:|\bDOMAIN,|\bhost,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'DOMAIN', val };
  }

  // 3. IPv4 网段 (CIDR)
  if (/^(cidr:|\bIP-CIDR,|\bip-cidr,)/i.test(line) || (/^\d{1,3}(\.\d{1,3}){3}\/\d+$/.test(line))) {
    const val = line.replace(/^(cidr:|\bIP-CIDR,|\bip-cidr,)/i, '')
      .replace(/,\s*no-resolve/i, '')
      .replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'IP-CIDR', val };
  }

  // 4. IPv6 网段 (CIDR6)
  if (/^(IP-CIDR6,|ip-cidr6,)/i.test(line) || (/^([0-9a-fA-F:]+)\/\d+$/.test(line) && line.includes(':'))) {
    const val = line.replace(/^(IP-CIDR6,|ip-cidr6,)/i, '')
      .replace(/,\s*no-resolve/i, '')
      .replace(/,\s*(proxy|direct)$/i, '').trim();
    return { type: 'IP-CIDR6', val };
  }

  // 5. 默认提取值 (去除常见前缀后缀)
  let val = line.replace(/^(\*\.|\bDOMAIN-SUFFIX,|\bhost-suffix,)/i, '').replace(/,\s*(proxy|direct)$/i, '').trim();

  // 若不含点号且为纯字母数字短语，自动推断为关键词 (例如直接写 telegram)
  if (!val.includes('.') && /^[a-z0-9_-]+$/i.test(val)) {
    return { type: 'KEYWORD', val };
  }

  // 其余标准带点域名默认为域名后缀 (DOMAIN-SUFFIX)
  return { type: 'DOMAIN-SUFFIX', val };
}

// 编译单一源文件至 Loon, QX, Mihomo
function compileSourceFile(confKey) {
  const conf = RULE_CONFIGS[confKey];
  if (!fs.existsSync(conf.src)) return;

  const rawLines = fs.readFileSync(conf.src, 'utf8').split(/\r?\n/);

  const loonLines = [];
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

  for (const rawLine of rawLines) {
    const item = parseRuleLine(rawLine);

    if (item.type === 'EMPTY') {
      loonLines.push('');
      qxLines.push('');
      mihomoLines.push('');
      continue;
    }
    if (item.type === 'COMMENT') {
      loonLines.push(item.raw);
      qxLines.push(item.raw);
      mihomoLines.push(`  ${item.raw}`);
      continue;
    }

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

  // 确保目录存在并写入三端文件
  fs.mkdirSync(path.dirname(conf.loon), { recursive: true });
  fs.mkdirSync(path.dirname(conf.qx), { recursive: true });
  fs.mkdirSync(path.dirname(conf.mihomo), { recursive: true });

  fs.writeFileSync(conf.loon, loonLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(conf.qx, qxLines.join('\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(conf.mihomo, mihomoLines.join('\n').trimEnd() + '\n', 'utf8');

  console.log(`✔ [${confKey}] 编译成功: Loon (${loonLines.length} 行), QX (${qxLines.length} 行), Mihomo (${mihomoLines.length} 行)`);
}

// 运行全量编译
function compileAll() {
  console.log('🚀 开始将 rules/*.txt 中间层规则智能分发编译至三端平台...\n');
  for (const key of Object.keys(RULE_CONFIGS)) {
    compileSourceFile(key);
  }
  runValidation();
}

// 运行官方 validate.js 规范合规校验
function runValidation() {
  console.log('\n--- 运行平台规范与沙盒合规校验 (validate.js) ---');
  try {
    const valOutput = execSync(`node ${path.join(ROOT_DIR, '.github/scripts/validate.js')}`, { encoding: 'utf8' });
    console.log(valOutput);
    console.log('🎉 全部目标校验通过！Loon 与 Quantumult X 规则与沙盒均正常！');
  } catch (err) {
    console.error('✖ 未通过 validate.js 校验，请检查格式:', err.stdout || err.message);
    process.exit(1);
  }
}

// 向源文件写入新规则
function addToSource(items, targetKey = 'proxy') {
  const conf = RULE_CONFIGS[targetKey] || RULE_CONFIGS.proxy;
  if (!fs.existsSync(conf.src)) {
    console.error(`源文件不存在: ${conf.src}`);
    return;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  let srcContent = fs.readFileSync(conf.src, 'utf8').trimEnd();
  const existingSet = new Set(srcContent.split(/\r?\n/).map(l => l.trim().toLowerCase()));

  const toAdd = items.filter(it => it && !existingSet.has(it.toLowerCase()));
  if (toAdd.length === 0) {
    console.log(`ℹ 待添加条目已在 ${path.basename(conf.src)} 中存在`);
    return;
  }

  srcContent += `\n\n# --- 手动添加 (${dateStr}) ---\n` + toAdd.join('\n') + '\n';
  fs.writeFileSync(conf.src, srcContent, 'utf8');
  console.log(`✔ 已将 ${toAdd.length} 条新规则追加到 rules/${path.basename(conf.src)}`);

  // 触发编译
  compileSourceFile(targetKey);
  runValidation();
}

// 主入口
function main() {
  const args = process.argv.slice(2);
  const action = args[0] || '--compile';

  // 解析 --target
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
      console.error('用法: node build-rules.js --add <domain1> [domain2...] [--target <proxy|ai|supercell>]');
      process.exit(1);
    }
    addToSource(items, targetKey);

  } else if (action === '--add-keyword') {
    const keywords = args.slice(1).filter(a => !a.startsWith('--')).map(k => `keyword: ${k}`);
    if (keywords.length === 0) {
      console.error('用法: node build-rules.js --add-keyword <keyword1> [keyword2...] [--target <proxy|ai|supercell>]');
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
