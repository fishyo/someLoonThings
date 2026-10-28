/**
 * CI Validation Script for Loon & Quantumult X
 * 针对 Loon 与 Quantumult X 规则、插件、脚本与配置的自动化验证
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../../');
let hasError = false;

function logPass(msg) {
  console.log(`\x1b[32m✔ [PASS]\x1b[0m ${msg}`);
}

function logFail(msg, detail = '') {
  hasError = true;
  console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${msg}`);
  if (detail) console.error(`    ↳ ${detail}`);
}

function logWarn(msg) {
  console.warn(`\x1b[33m▲ [WARN]\x1b[0m ${msg}`);
}

// ==========================================
// 1. Loon 插件与扩展校验 (.plugin / .lpx)
// ==========================================
console.log('\n--- 1. 验证 Loon 插件与扩展 (.plugin / .lpx) ---');
const pluginDir = path.join(root, 'plugin');
if (fs.existsSync(pluginDir)) {
  const pluginFiles = fs.readdirSync(pluginDir).filter(f => f.endsWith('.plugin') || f.endsWith('.lpx'));
  for (const file of pluginFiles) {
    const fullPath = path.join(pluginDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    // 检查元数据指令
    const hasName = /^#!name\s*=/m.test(content);
    const hasDesc = /^#!desc\s*=/m.test(content);
    if (!hasName) logFail(`${file}: 缺少 #!name 元数据指令`);
    if (!hasDesc) logFail(`${file}: 缺少 #!desc 元数据指令`);

    // 检查 MITM 与 Rewrite 闭环
    const rewriteSection = content.match(/\[Rewrite\]([\s\S]*?)(?=\n\[|$)/i);
    const mitmSection = content.match(/\[Mitm\][\s\S]*?hostname\s*=\s*([^\r\n]+)/i);
    const mitmHosts = mitmSection ? mitmSection[1].split(',').map(s => s.trim()) : [];

    if (rewriteSection) {
      const rewriteLines = rewriteSection[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith(';'));

      for (const line of rewriteLines) {
        if (line.includes('://')) {
          const rawPart = line.slice(line.indexOf('://') + 3);
          const rawDomain = rawPart.split(/[\/\s]/)[0].replace(/\\/g, '');
          if (rawDomain && !rawDomain.includes('*') && !rawDomain.includes('(') && !rawDomain.includes('[')) {
            const covered = mitmHosts.some(h => {
              if (h.startsWith('*.')) return rawDomain.endsWith(h.slice(2));
              return h === rawDomain;
            });
            if (!covered) {
              logWarn(`${file}: Rewrite 域名 [${rawDomain}] 未在 [Mitm] hostname 中显式声明`);
            }
          }
        }
      }
    }

    if (hasName && hasDesc) {
      logPass(`${file}: Loon 插件元数据与结构规范校验通过`);
    }
  }
}

// ==========================================
// 2. Loon 规则集校验 (.lsr)
// ==========================================
console.log('\n--- 2. 验证 Loon 规则集 (.lsr) ---');
const loonDir = path.join(root, 'loon');
const validRuleTypesLoon = new Set([
  'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-REGEX',
  'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'USER-AGENT', 'URL-REGEX',
  'PROCESS-NAME', 'AND', 'OR', 'NOT', 'FINAL'
]);

if (fs.existsSync(loonDir)) {
  const lsrFiles = fs.readdirSync(loonDir).filter(f => f.endsWith('.lsr'));
  for (const file of lsrFiles) {
    const fullPath = path.join(loonDir, file);
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    let lineIdx = 0;
    let fileValid = true;

    for (let rawLine of lines) {
      lineIdx++;
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;
      const parts = line.split(',');
      const type = parts[0].trim().toUpperCase();
      if (!validRuleTypesLoon.has(type)) {
        logFail(`${file} (第 ${lineIdx} 行): 未知或非法的 Loon 规则类型 [${type}]`);
        fileValid = false;
      }
    }
    if (fileValid) {
      logPass(`${file}: Loon 规则集语法校验通过 (${lines.length} 行)`);
    }
  }
}

// ==========================================
// 3. Quantumult X 片段与规则校验 (quanX/)
// ==========================================
console.log('\n--- 3. 验证 Quantumult X 片段与规则 (quanX/) ---');
const qxDir = path.join(root, 'quanX');
const validRuleTypesQX = new Set([
  'HOST', 'HOST-SUFFIX', 'HOST-KEYWORD', 'IP-CIDR', 'IP-CIDR6',
  'GEOIP', 'USER-AGENT', 'FINAL'
]);

if (fs.existsSync(qxDir)) {
  // 3.1 验证 .snippet（Quantumult X 原生远程复写片段规范）
  const snippetFiles = fs.readdirSync(qxDir).filter(f => f.endsWith('.snippet'));
  for (const file of snippetFiles) {
    const lines = fs.readFileSync(path.join(qxDir, file), 'utf8').split('\n');
    let hasInvalidSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;
      // QX rewrite_remote 片段不能包含 [rewrite_local] 或 [mitm]，否则 QX 会报 invalid line
      if (/^\[(rewrite_local|mitm)\]/i.test(line)) {
        logFail(`quanX/${file} (第 ${i + 1} 行): 包含违规的分节符 [${line}]，QX 远程片段中不能包含此标签，必须直接编写规则或 hostname`);
        hasInvalidSection = true;
      }
    }
    if (!hasInvalidSection) {
      logPass(`quanX/${file}: Quantumult X 原生片段结构规范校验通过 (无违规分节符)`);
    }
  }

  // 3.2 验证 rules/*.list
  const qxRulesDir = path.join(qxDir, 'rules');
  if (fs.existsSync(qxRulesDir)) {
    const listFiles = fs.readdirSync(qxRulesDir).filter(f => f.endsWith('.list'));
    for (const file of listFiles) {
      const lines = fs.readFileSync(path.join(qxRulesDir, file), 'utf8').split('\n');
      let lineIdx = 0;
      let fileValid = true;

      for (let rawLine of lines) {
        lineIdx++;
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) continue;
        const cleanLine = line.replace(/^\{#[^#]+#\}\s*/, ''); // 兼容 QX Build 950+ 前置备注
        const parts = cleanLine.split(',').map(s => s.trim());
        const type = parts[0].toUpperCase();
        if (!validRuleTypesQX.has(type)) {
          logFail(`quanX/rules/${file} (第 ${lineIdx} 行): 非法或不支持的 QX 分流规则类型 [${type}]`);
          fileValid = false;
        } else if (type !== 'FINAL' && parts.length < 3) {
          logFail(`quanX/rules/${file} (第 ${lineIdx} 行): QX 分流规则缺少策略字段，必须形如 [${type}, target, policy]`);
          fileValid = false;
        }
      }
      if (fileValid) {
        logPass(`quanX/rules/${file}: Quantumult X 规则集语法校验通过 (${lines.length} 行)`);
      }
    }
  }

  // 3.3 验证 gallery.json (Quantumult X 任务画廊)
  const galleryPath = path.join(qxDir, 'gallery.json');
  if (fs.existsSync(galleryPath)) {
    try {
      const gallery = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
      if (!gallery.name || !Array.isArray(gallery.task)) {
        logFail('quanX/gallery.json: 缺少必需字段 (name 或 task 数组)');
      } else {
        for (const t of gallery.task) {
          if (!t.config || typeof t.config !== 'string') {
            logFail('quanX/gallery.json: task 列表中的项目缺少有效的 config 字段');
          }
        }
        logPass(`quanX/gallery.json: Quantumult X 任务画廊规范校验通过 (${gallery.task.length} 个任务)`);
      }
    } catch (err) {
      logFail('quanX/gallery.json: JSON 语法错误', err.message);
    }
  }
}

// ==========================================
// 4. Mihomo 规则与 BoxJS 订阅校验
// ==========================================
console.log('\n--- 4. 验证 Mihomo / Clash 规则集与 BoxJS ---');
const mihomoDir = path.join(root, 'mihomo');
if (fs.existsSync(mihomoDir)) {
  const yamlFiles = fs.readdirSync(mihomoDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  for (const file of yamlFiles) {
    const content = fs.readFileSync(path.join(mihomoDir, file), 'utf8');
    if (!content.includes('payload:')) {
      logFail(`${file}: 缺少 payload 根字段`);
    } else {
      logPass(`${file}: Mihomo 规则集格式规范校验通过`);
    }
  }
}

const boxjsPath = path.join(root, 'script/boxjs.json');
if (fs.existsSync(boxjsPath)) {
  try {
    const boxjs = JSON.parse(fs.readFileSync(boxjsPath, 'utf8'));
    if (!boxjs.id || !boxjs.name || !Array.isArray(boxjs.apps)) {
      logFail('boxjs.json: 缺少必需的根字段 (id, name, apps)');
    } else {
      logPass(`boxjs.json: 校验通过 (${boxjs.apps.length} 个应用配置)`);
    }
  } catch (err) {
    logFail('boxjs.json: JSON 语法错误', err.message);
  }
}

// ==========================================
// 5. 跨端契约沙盒仿真 (Loon vs Quantumult X)
// ==========================================
console.log('\n--- 5. 跨端沙盒契约仿真与本地 $prefs 持久化验证 ---');

function createLoonContext(customReq = {}) {
  const store = {
    'bandwagon.veid': '123456',
    'bandwagon.apiKey': 'test_api_key',
    'racknerd.apiKey': 'test_api_key',
    'racknerd.apiHash': 'test_api_hash',
    '9bot_cookie_data': '{"authorization":"test_token","deviceId":"dev_123"}',
    'cloudflare.accountTag': 'cf_acc_123',
    'cloudflare.apiToken': 'cf_token_123',
  };
  return vm.createContext({
    $httpClient: {
      get: (opts, cb) => setTimeout(() => cb(null, { status: 200 }, '{"code":0,"data":{}}'), 5),
      post: (opts, cb) => setTimeout(() => cb(null, { status: 200 }, '{"code":0,"data":{}}'), 5),
    },
    $persistentStore: {
      read: (k) => store[k] || null,
      write: (v, k) => { store[k] = v; return true; },
    },
    $notification: { post: () => {} },
    $done: () => {},
    $argument: '',
    $request: customReq,
    console: { log: () => {}, error: () => {}, warn: () => {} },
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 5)),
    clearTimeout: clearTimeout,
    Date, JSON, Math, String, Number, Boolean, Array, Object, RegExp,
    encodeURIComponent, decodeURIComponent,
  });
}

function createQXContext(customReq = {}, initialPrefs = {}) {
  const prefs = {
    'bandwagon.veid': '99999',
    'bandwagon.apiKey': 'test_api_key',
    'racknerd.apiKey': 'test_api_key',
    'racknerd.apiHash': 'test_api_hash',
    '9bot_cookie_data': '{"authorization":"test_token","deviceId":"dev_123"}',
    'cloudflare.accountTag': 'cf_acc_123',
    'cloudflare.apiToken': 'cf_token_123',
    ...initialPrefs
  };
  return {
    ctx: vm.createContext({
      $task: {
        fetch: (opts) => Promise.resolve({ statusCode: 200, body: '{"code":0,"data":{}}' }),
      },
      $prefs: {
        valueForKey: (k) => prefs[k] || null,
        setValueForKey: (v, k) => {
          prefs[k] = v;
          return true;
        },
      },
      $notify: () => {},
      $done: () => {},
      $argument: '',
      $request: customReq,
      console: { log: () => {}, error: () => {}, warn: () => {} },
      setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 5)),
      clearTimeout: clearTimeout,
      Date, JSON, Math, String, Number, Boolean, Array, Object, RegExp,
      encodeURIComponent, decodeURIComponent,
    }),
    prefs,
  };
}

const scriptsToVerify = [
  'script/bandwagon/bwg.js',
  'script/racknerd/racknerd.js',
  'script/9bot/9botsign.js',
  'script/9bot/9bot_cookie.js',
  'script/cloudflare/cloudflare.js',
];

const mockReq = {
  url: 'https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign',
  headers: { authorization: 'Bearer token_123' },
  body: '{"deviceId":"test_device"}',
};

for (const rel of scriptsToVerify) {
  const scriptPath = path.join(root, rel);
  if (!fs.existsSync(scriptPath)) {
    logFail(`${rel}: 文件不存在`);
    continue;
  }
  const code = fs.readFileSync(scriptPath, 'utf8');

  // 1. 语法检查
  try {
    new vm.Script(code, { filename: rel });
  } catch (err) {
    logFail(`${rel}: JS 语法编译失败`, err.message);
    continue;
  }

  // 2. Loon 纯净环境沙盒验证
  try {
    const loonCtx = createLoonContext(mockReq);
    vm.runInContext(code, loonCtx, { filename: rel, timeout: 1000 });
    logPass(`${rel}: Loon 沙盒环境运行通过`);
  } catch (err) {
    logFail(`${rel}: Loon 沙盒异常`, err.message);
  }

  // 3. Quantumult X 纯净环境沙盒 (验证优先读取 BoxJS $prefs 配置)
  try {
    const { ctx, prefs } = createQXContext(mockReq);
    vm.runInContext(code, ctx, { filename: rel, timeout: 1000 });
    logPass(`${rel}: Quantumult X 沙盒运行通过 (基于 BoxJS $prefs 配置读取)`);
  } catch (err) {
    logFail(`${rel}: Quantumult X 沙盒异常`, err.message);
  }
}

console.log('\n----------------------------------------');
if (hasError) {
  console.error('\x1b[31m❌ CI 检查失败，请修复上述错误后重新提交！\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✅ 全部目标校验通过！Loon 与 Quantumult X 规则与沙盒均正常！\x1b[0m\n');
  process.exit(0);
}
