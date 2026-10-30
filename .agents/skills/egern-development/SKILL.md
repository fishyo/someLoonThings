---
name: egern-development
description: >-
  Comprehensive guide and cheatsheet for developing Egern configurations (Profile.yaml),
  modules (.yaml), rule sets (.yaml), rewrites, and modern JavaScript scripts (ESM export default async function(ctx),
  ctx.request/response, ctx.http, ctx.storage, ctx.notify, ctx.lookupIP, ctx.compress, ctx.ssh, ctx.widgetFamily,
  ctx.respond, ctx.abort) and TestFlight features according to official documentation (https://egernapp.com/docs/intro/)
  and official community releases. Use this skill whenever creating or editing Egern modules, rulesets, scripts,
  or migrating between Loon, Quantumult X, and Egern.
---

# Egern 官方规范与开发手册（含 TestFlight 最新特性）

本手册基于 [Egern 官方文档](https://egernapp.com/docs/intro/) 与 TestFlight Beta 特性系统性整理，涵盖配置结构、模块规范、分流规则集、高级改写与原生现代 JavaScript 脚本开发规范。

---

## 1. 体系架构与配置分层

Egern 采用模块化、基于标准 YAML 的声明式配置架构。主要分为三层：
1. **主配置文件 (`Profile.yaml`)**：顶层完整环境配置，包含全局参数、DNS、代理节点、策略组、分流规则以及引用的外部模块。
2. **配置模块 (`Modules`, `.yaml`)**：独立可分发的预设配置片段，用于便捷启闭特定功能的规则、改写与脚本，启用时自动与主配置合并。
3. **分流规则集 (`Rule Sets`, `.yaml`)**：可独立订阅的分流条件集合，内部条件为逻辑或（OR）关系。

---

## 2. 模块规范 (`Modules`)

模块是 Egern 生态中最主要的分发单元。文件采用纯 YAML 格式。

### 2.1 模块元数据 (Metadata)
```yaml
name: "Ad Blocking & Enhancer"          # 模块名称
description: "去除广告与功能增强"       # 模块描述
author: "AuthorName"                    # 作者
homepage: "https://github.com/..."       # 项目主页
manual: "https://wiki.example.com"      # 使用文档
icon: "shield.checkerboard"             # SF Symbol 名称或网络图片 URL
open_url: "https://config.example.com"  # 点击模块设置时跳转的页面
```

### 2.2 参数化替换机制 (`compat_arguments`)
模块支持声明默认参数，并在配置内部使用 `{{{ARGUMENT_NAME}}}` 占位符引用。主配置引用模块时可传入参数进行覆盖：
- **占位符语法**：`{{{ARG_NAME}}}`。
- **字符串与类型规则**：
  - 若目标字段为字符串，**必须为占位符加引号**：`match: "{{{REGION}}}.example.com"`。
  - 若目标字段为数字或布尔值，**占位符保持未加引号**：`timeout: {{{TIMEOUT}}}`。
```yaml
compat_arguments:
  REGION: "cn"
  BLOCK_POLICY: "REJECT"
  TIMEOUT: 30
compat_arguments_desc: "REGION: 区域代码; BLOCK_POLICY: 拦截策略; TIMEOUT: 超时秒数"

rules:
  - domain_suffix:
      match: "{{{REGION}}}.example.com"
      policy: "{{{BLOCK_POLICY}}}"
scriptings:
  - http_request:
      name: "API Request"
      match: "^https://example\\.com"
      script_url: "https://example.com/api.js"
      timeout: {{{TIMEOUT}}}
```

### 2.3 UI 动态表单元数据 (`env_schema`)
Egern 支持通过 `env_schema` 在 App 设置界面中自动生成图形化配置控件，值将作为环境变量通过 `ctx.env` 传递给脚本：
- **文本输入框 (TextField)**：不指定 `options`。
- **开关切换器 (Toggle)**：`options: ["true", "false"]`。
- **下拉单选器 (Picker)**：`options: [选项列表]`。
```yaml
env_schema:
  API_KEY:
    name: "API Key"
    description: "请输入服务访问密钥"
    default_value: ""
  AUTO_SIGN:
    name: "自动签到"
    description: "是否开启后台自动签到"
    options:
      - "true"
      - "false"
  RUN_MODE:
    name: "运行模式"
    options:
      - light
      - standard
      - full
```

### 2.4 模块支持的配置块
模块内可声明并合并以下字段：
- `dns`: 自定义 DNS 转发规则与 hosts。
- `rules`: 插入分流规则列表。
- `url_rewrites`: URL 重定向与 Mock 拒绝。
- `header_rewrites`: 请求/响应头增删改。
- `body_rewrites`: 正则替换或 jq 过滤器。
- `map_locals`: 本地静态响应 Mock。
- `scriptings`: JavaScript 脚本任务。
- `mitm`: 解密域名声明（`hostnames: - "*.example.com"`）。
- `http_captures`: 抓包域名声明。
- `widgets`: 桌面/锁屏组件配置。
- `bypass_tunnel_proxy`: 绕过隧道代理的域名列表。
- `real_ip_domains`: 强制直连解析真实 IP 的域名列表。

---

## 3. 分流规则系统 (`Rules`) 与规则集 (`Rule Sets`)

### 3.1 规则类型速查
| 规则类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| `domain` | 域名全匹配 | `match: "api.example.com"` |
| `domain_suffix` | 域名后缀匹配（自动处理子域边界） | `match: "example.com"` |
| `domain_keyword` | 域名关键字匹配 | `match: "google"` |
| `domain_regex` | 域名正则匹配 | `match: "^ads?\\."` |
| `domain_wildcard` | 通配符匹配（不区分大小写） | `match: "*.google.*"` |
| `geoip` | 国家代码匹配（ISO 3166-1 alpha-2） | `match: "CN", no_resolve: true` |
| `ip_cidr` | IPv4 地址块 | `match: "192.168.0.0/16"` |
| `ip_cidr6` | IPv6 地址块 | `match: "2001:db8::/32"` |
| `asn` | ASN 号码或组织名称 | `match: "AS13335"` / `match: "15169"` |
| `url_regex` | 完整 URL 正则（仅 HTTP/HTTPS） | `match: "^https://.*\\.example\\.com/"` |
| `user_agent` | UA 通配符匹配（不区分大小写） | `match: "*Chrome*"` |
| `dest_port` | 目标端口/范围 | `match: "80,443,8000-9000"` |
| `protocol` | 协议类型 | `match: tcp` / `udp` / `http` / `https` / `quic` / `stun` |
| `ssid` | 当前连接 Wi-Fi 名称通配符 | `match: "Home*"` |
| `bssid` | Wi-Fi AP MAC 地址通配符 | `match: "00:11:22:*"` |
| `cellular` | 蜂窝网络制式匹配 | `match: "NR"` / `match: "LTE"` |
| `and` / `or` / `not` | 逻辑组合规则 | 嵌套子条件 |
| `rule_set` | 引用外部规则集文件 | `match: "https://example.com/rules.yaml"` |
| `default` | 兜底最终策略 | `policy: DIRECT` |

### 3.2 独立规则集文件规范 (`Rule Set`)
独立规则集文件（`.yaml`）包含各类匹配条件的列表，内部所有条件按 **逻辑或** 执行：
```yaml
no_resolve: true
domain_suffix_set:
  - openai.com
  - chatgpt.com
  - oaistatic.com
domain_keyword_set:
  - openaicom
domain_regex_set:
  - "openai|chatgpt"
domain_wildcard_set:
  - "*openai*"
ip_cidr_set:
  - 24.199.123.0/24
asn_set:
  - "AS13335"
```

---

## 4. HTTP 改写系统 (Rewrites)

Egern 提供了多维度的流量改写能力，支持无需启动 JavaScript 运行时的轻量高性能改写：

### 4.1 URL 改写 (`url_rewrites`)
```yaml
url_rewrites:
  # 状态码重定向 (302/307)
  - match: "^https?://(.*)google\\.cn(.*)"
    location: "https://$1google.com$2"
    status_code: 307

  # 模拟拒绝响应（Mock Reject，无需走远程连接）
  # 支持: http://reject-200/, http://reject-dict/, http://reject-array/, http://reject-img/, http://reject-video/
  - match: "^https?://api\\.example\\.com/ads"
    location: "http://reject-dict/"
```

### 4.2 HTTP 头部改写 (`header_rewrites`)
支持 `add`、`replace`、`delete`，通过 `type: request` 或 `type: response` 区分方向：
```yaml
header_rewrites:
  - add:
      match: "^https://api\\.example\\.com"
      name: X-Custom-Header
      value: custom-value
      type: request
  - replace:
      match: "^https://example\\.com"
      name: Cache-Control
      value: "no-cache, no-store"
      type: response
  - delete:
      match: "^https://api\\.example\\.com"
      name: User-Agent
      type: request
```

### 4.3 HTTP 消息体改写 (`body_rewrites`)
```yaml
body_rewrites:
  # 1. 正则替换 (无需 JS 引擎)
  - response_regex:
      match: "^https://example\\.com/page"
      find: "original_text"
      replace: "modified_text"

  # 2. 原生 jq 过滤器 (超高性能流式处理 JSON，极低内存消耗)
  - response_jq:
      match: "^https://api\\.example\\.com/v1/feed"
      filter: '.data.items[] |= select(.is_ad != true)'
  - request_jq:
      match: "^https://api\\.example\\.com/submit"
      filter: '.data.version = "2.0"'
```

### 4.4 本地 Mock (`map_locals`)
```yaml
map_locals:
  - match: "^https://api\\.example\\.com/mock$"
    status_code: 200
    headers:
      Content-Type: application/json
    body: '{"code": 0, "message": "success"}'
```

---

## 5. 原生 JavaScript 脚本开发规范 (`ctx`)

Egern 采用现代 ES Module 标准，原生脚本通过 `export default async function(ctx)` 导出异步入口函数。

### 5.1 脚本在模块中的声明 (`scriptings`)
```yaml
scriptings:
  # HTTP 请求阶段
  - http_request:
      name: "Request Modifier"
      match: "^https://api\\.example\\.com"
      script_url: "https://example.com/req.js"
      body_required: true      # 是否拉取并修改 body
      timeout: 10
      max_size: 131072         # 最大字节数限制

  # HTTP 响应阶段
  - http_response:
      name: "Response Modifier"
      match: "^https://api\\.example\\.com"
      script_url: "https://example.com/res.js"
      body_required: true
      timeout: 10

  # 定时任务 (Cron)
  - schedule:
      name: "Daily Sign"
      cron: "0 8 * * *"
      script_url: "https://example.com/sign.js"
      timeout: 60

  # 通用脚本（桌面组件/手动执行）
  - generic:
      name: "Server Status Widget"
      script_url: "https://example.com/widget.js"

  # 网络切换事件触发
  - network:
      name: "Network Change Watcher"
      script_url: "https://example.com/net.js"
```

### 5.2 核心 `ctx` 对象 API 速查

#### (1) `ctx.request` & `ctx.response`
- `ctx.request`: `{ method, url, headers, body }`（仅 request/response 脚本）。
- `ctx.response`: `{ status, headers, body }`（仅 response 脚本）。
- **Body 解析方法**：`.json()`、`.text()`、`.arrayBuffer()`、`.blob()`、`.formData()`。
  > ⚠️ **注意**：Body 与 Web 标准 Fetch API 一致，**只能消费一次**。

#### (2) Headers 对象操作
大小写不敏感，支持属性直接访问与方法调用：
```javascript
// 读取
const ct = ctx.request.headers['content-type']; // 大小写不敏感
const cookie = ctx.request.headers.get('cookie');
const allCookies = ctx.request.headers.getAll('set-cookie'); // 返回数组

// 修改
ctx.request.headers.set('X-Custom', 'Value');
ctx.request.headers.append('X-Custom', 'Value2');
ctx.request.headers.delete('User-Agent');
```

#### (3) 返回值行为与流程控制
- **Request 脚本**：
  - 返回对象改写：`return { url, headers, body };`
  - 直接伪造响应（不向上游发请求）：`return ctx.respond({ status: 200, headers: {}, body: 'blocked' });`
  - 终止连接：`return ctx.abort();`
  - 放行不改动：直接 `return;`。
- **Response 脚本**：
  - 返回对象改写：`return { status: 200, headers, body };`
  - 终止连接：`return ctx.abort();`
  - 放行不改动：直接 `return;`。

#### (4) 子网络请求 (`ctx.http`)
全异步 Promise 接口，支持：`ctx.http.get`, `post`, `put`, `delete`, `patch`, `head`, `options`：
```javascript
const resp = await ctx.http.post('https://api.example.com/checkin', {
  headers: { 'Content-Type': 'application/json' },
  body: { token: 'xyz' },  // 对象自动序列化为 JSON
  timeout: 5000,
  policy: 'DIRECT',        # 指定走哪条策略
});
const data = await resp.json();
```

#### (5) 持久化存储 (`ctx.storage`)
```javascript
// 字符串存取
ctx.storage.set('token', 'abc');
const token = ctx.storage.get('token');
ctx.storage.delete('token');

// 原生 JSON 便捷存取
ctx.storage.setJSON('user_data', { id: 123, name: 'Alice' });
const user = ctx.storage.getJSON('user_data');
```

#### (6) 系统通知 (`ctx.notify`)
支持富媒体通知、自动附件下载与点击跳转/复制动作：
```javascript
ctx.notify({
  title: '签到成功',
  subtitle: '获得 50 积分',
  body: '当前总积分: 1200',
  sound: true,
  duration: 5,
  attachment: {
    url: 'https://example.com/badge.png', // 自动下载附件图片
  },
  action: {
    type: 'openUrl', // 或 'clipboard'
    url: 'https://example.com/dashboard',
  },
});
```

#### (7) SSH 远程运维与 SFTP 客户端 (`ctx.ssh`)
Egern 内置了强大的 SSH & SFTP 支持，可在定时任务或 Widget 中直接管理远程服务器：
```javascript
const session = await ctx.ssh.connect({
  host: ctx.env.VPS_HOST,
  username: ctx.env.VPS_USER,
  privateKey: ctx.env.VPS_KEY,
});
// 远程执行命令
const { stdout } = await session.exec('uptime -p');
ctx.notify({ title: 'VPS Uptime', body: stdout.trim() });

// SFTP 文件读写
const sftp = await session.sftp();
await sftp.writeFile('/var/log/status.json', { ok: true });
await session.close();
```

#### (8) 辅助工具库
- **数据压缩/解压 (`ctx.compress`)**：`gzip`, `gunzip`, `deflate`, `inflate`, `brotli`, `unbrotli`。
- **IP 查询 (`ctx.lookupIP`)**：`const info = ctx.lookupIP('1.1.1.1');` 返回 `{ country, asn, organization }`。
- **设备与网络信息 (`ctx.device`)**：获取 Wi-Fi SSID、BSSID、蜂窝网络制式、IPv4/IPv6、DNS 服务器等。

---

## 6. TestFlight 最新版本特性沉淀 (Beta Specifications)

在最新 TestFlight 测试版（覆盖 Build 与社区更新）中，Egern 进行了重大的协议升级、内存优化与底层机制重构：

### 6.1 新一代高性能协议支持
- **Hysteria 2 (`hysteria2`)**：针对弱网环境优化，原生支持高丢包场景下的满速传输。
- **TUIC (`tuic`)**：基于 QUIC 的现代低延迟代理协议。
- **VLESS with XTLS-Vision (`vless`)**：
  - 修复了 `tcp-in-tun` 模式下连接服务端优先协议（如 SSH 或数据库直连）连接被挂起的问题。
- **Shadowsocks 2022**：完整支持 BLAKE3 派生密钥与 AEAD-2022 系列加密算法（`2022-blake3-aes-128-gcm`, `2022-blake3-aes-256-gcm`, `2022-blake3-chacha20-poly1305`）。

### 6.2 现代化 DNS 体系
- **DNS 协议矩阵**：全面支持 **DoH3 (HTTP/3)**、**DoQ (QUIC DNS)**、**DoH**、**DoT** 与传统 UDP。
- **双解析路径隔离与避免死锁**：
  - **Default DNS**：用户流量解析，走 Forward 转发规则。
  - **Proxy DNS**：代理服务器自身解析目标域名，强制直连，杜绝“DNS 需要代理，代理又需要 DNS”的递归死锁。
- **DNS 规则并发堆叠**：支持同域名多个 DoH/DoQ 并发查询，大幅缩短首包响应时间。

### 6.3 策略组与连接状态平滑控制
- **`block_quic` 级联优先级**：
  - 优先级顺序：**`Proxy (节点设置)` > `Policy Group (策略组设置)` > `Global (全局设置)`**。
  - 默认行为：TCP 基础协议默认屏蔽 QUIC 促使其回退 TCP；UDP 基础协议默认放行。
- **`close_connections_on_policy_change: true`**：
  - 当策略组切换节点时（手动切换、自动测速换路、订阅更新回退），立即断开仍在使用旧节点的持久连接，强制流量瞬间通过新节点建立连接，防止流量“偷跑”或延迟感知迟钝。

### 6.4 资源同步与网络扩展 (NE) 内存守护
- **HTTP 条件请求 (ETag)**：订阅与规则更新时携带 `If-None-Match: ETag`，若远端无变动则返回 304 并跳过冗余写入。
- **内存优化与防 NE 崩溃**：iOS Network Extension 存在严格的物理内存上限（通常为 15MB 或 50MB）。Egern 对 JavaScriptCore 虚拟机进行了严格的对象生命周期管控，避免异步挂起造成的内存泄露。
- **zstd HTTP 响应解压**：修复了管道流中 zstd 压缩流解压失败导致脚本异常的问题。

---

## 7. 多端通用开发准则 (Loon, Quantumult X & Egern)

当编写兼顾三端的通用脚本或进行规则转换时，遵循以下规范：

### 7.1 运行时环境检测
```javascript
const isLoon = typeof $httpClient !== "undefined" && typeof $loon !== "undefined";
const isQuanX = typeof $task !== "undefined";
const isEgern = typeof ctx !== "undefined" || (typeof globalThis !== "undefined" && globalThis.Egern);
```

### 7.2 API 映射与兼容层表
| 功能 | Loon | Quantumult X | Egern (原生) |
| :--- | :--- | :--- | :--- |
| **持久存储读** | `$persistentStore.read(k)` | `$prefs.valueForKey(k)` | `ctx.storage.get(k)` / `ctx.storage.getJSON(k)` |
| **持久存储写** | `$persistentStore.write(v, k)` | `$prefs.setValueForKey(v, k)` | `ctx.storage.set(k, v)` / `ctx.storage.setJSON(k, v)` |
| **HTTP 请求** | `$httpClient.get/post` (回调) | `$task.fetch` (Promise) | `ctx.http.get/post` (Promise) |
| **系统通知** | `$notification.post(t, s, b)` | `$notify(t, s, b)` | `ctx.notify({ title, subtitle, body })` |
| **结束脚本** | `$done(obj)` | `$done(obj)` | `return obj` / `ctx.respond(obj)` / `ctx.abort()` |
| **参数输入** | `#!input=key` / `[Argument]` | BoxJS 集中配置 / URL Hash | `compat_arguments` / `env_schema` / `ctx.env` |

---

## 8. Egern URL Schemes 速查

支持一键导入与快捷调用（均支持 `x-success` 回调参数）：
- **启动代理**：`egern:/start`
- **停止代理**：`egern:/stop`
- **导入模块**：`egern:/modules/new?name=ModuleName&url=ModuleURL`
- **导入配置 Profile**：`egern:/profiles/new?name=ProfileName&url=ProfileURL`
- **导入规则集**：`egern:/rules/new?type=rule_set&match=RuleSetURL&policy=PROXY`
- **导入订阅节点**：`egern:/subscriptions/new?url=SubURL`
