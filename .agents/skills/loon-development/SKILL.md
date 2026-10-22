---
name: loon-development
description: >-
  Comprehensive guide and cheatsheet for developing Loon plugins (.plugin, .lpx),
  scripts (http-request, http-response, cron, generic), rule sets (.lsr), and rewrite
  configurations according to the official Loon documentation (https://nsloon.app/LoonManual/).
  Use this skill whenever creating or editing Loon plugins, writing Loon script APIs,
  or debugging Loon network rules.
---

# Loon 官方规范与开发手册

本项目专注于 Loon 工具链生态开发。所有插件与脚本开发均需遵循官方手册标准。

## 1. 插件结构规范 (`.plugin` / `.lpx`)

### 1.1 插件元信息头部 (Metadata)
- `#!name= 插件名称`
- `#!desc= 插件描述`
- `#!author= 作者名称`
- `#!homepage= 项目首页链接`
- `#!icon= 图标URL 或 SF Symbol (如 location.fill.viewfinder.system)`
- `#!input = keyName`：在 Loon UI 中提供文本输入框，脚本中通过 `$persistentStore.read("keyName")` 读取。
- `#!select = keyName,opt1,opt2,...`：第一项为配置键名，后续为下拉单选项。

### 1.2 插件可包含模块
插件是子配置集合，支持以下区块（不区分大小写，规范推荐首字母大写）：
```ini
[General]
bypass-tun = ...
skip-proxy = ...
real-ip = ...
dns-server = ...

[Rule]
# 插件内规则策略仅限：DIRECT、REJECT类（REJECT/REJECT-200/REJECT-IMG/REJECT-DICT/REJECT-ARRAY/REJECT-DROP）、PROXY（用户手动选择的策略组）

[Rewrite]
# URL重定向、状态码直接响应、Header修改

[Host]
# 本地域名映射解析

[Script]
# http-request, http-response, cron, network-changed, generic

[Mitm]
hostname = *.example.com
skip-server-cert-verify = true
```

---

## 2. 脚本类型与声明语法 (`[Script]`)

### 2.1 `http-request` (请求修改/拦截)
```ini
http-request <url-regex> script-path=<path>,tag=<tag>,requires-body=true,timeout=10,binary-body-mode=false,argument="params",enable=true
```
- `$request`: `{ url, method, headers, body }`（仅 `requires-body=true` 时有 body）。
- `$done()` 返回模式：
  - `$done()`：终止请求，断开连接。
  - `$done({})`：放行请求，不作改动。
  - `$done({ url, headers, node })`：重写请求 URL/Header 或指定出站策略节点。
  - `$done({ response: { status, headers, body } })`：直接伪造 Mock 响应。

### 2.2 `http-response` (响应修改/数据解构)
```ini
http-response <url-regex> script-path=<path>,tag=<tag>,requires-body=true,timeout=10,binary-body-mode=false,argument="params",enable=true
```
- `$response`: `{ status, headers, body }`。
- `$done()` 返回模式：
  - `$done()`：中断连接。
  - `$done({})`：原始响应返回。
  - `$done({ status, headers, body })`：改写响应状态码、响应头或响应体。

### 2.3 `cron` (定时任务)
```ini
cron "0 8 * * *" script-path=<path>,tag=<tag>,timeout=200,argument="params",enable=true
```
- 支持 5 位（分 时 日 月 周）或 6 位（秒 分 时 日 月 周）Cron 表达式。

### 2.4 `generic` (节点/策略交互脚本)
```ini
generic script-path=<path>,tag=<tag>,img-url=sf.symbol,timeout=300,argument="params",enable=true
```
- 可通过 `$environment.params.nodeInfo` 或 `$environment.params.node` 获取当前操作节点信息。

### 2.5 `network-changed` (网络切换触发)
```ini
network-changed script-path=<path>,tag=<tag>,timeout=200,argument="params",enable=true
```

---

## 3. 核心 Script API 速查

### 3.1 本地存储与持久化 (`$persistentStore`)
```javascript
// 读取
const val = $persistentStore.read("key"); // 未传参则取当前脚本名 hash

// 写入（成功返回 true，失败返回 false）
$persistentStore.write("value", "key");

// 清除所有脚本持久化数据
$persistentStore.remove();
```

### 3.2 桌面通知 (`$notification`)
```javascript
// 基础通知：$notification.post(title, subtitle, body, attach)
// 1. 带打开跳转 Scheme/URL
$notification.post("Title", "Subtitle", "Body", "loon://switch");

// 2. 同时带富媒体与跳转 URL
$notification.post("Title", "Subtitle", "Body", {
  openUrl: "https://example.com",
  mediaUrl: "https://example.com/banner.png"
});
```

### 3.3 网络请求 (`$httpClient`)
支持方法：`get`, `post`, `head`, `delete`, `put`, `options`, `patch`
```javascript
$httpClient.post({
  url: "https://api.example.com/data",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "val" }),
  node: "DIRECT",       // 可指定策略组、节点名称或 Loon 节点描述
  "auto-redirect": true, // 自动跟随重定向
  "auto-cookie": true    // 自动管理并携带 Cookie
}, function(errormsg, response, data) {
  if (errormsg) {
    console.error("Request failed:", errormsg);
  } else {
    console.log("Status:", response.status);
    console.log("Body:", data);
  }
  $done({}); // 务必在回调结束后调用 $done()
});
```

### 3.4 配置与策略控制 (`$config`)
```javascript
const cfg = JSON.parse($config.getConfig()); // 获取当前配置 JSON
$config.getSelectedPolicy("节点选择");         // 获取某策略组当前选中的策略
$config.setRunningModel(1);                  // 0: 全局直连, 1: 分流模式, 2: 全局代理
```

### 3.5 脚本终止与资源释放 (`$done`)
- 任何脚本在执行完毕或捕获未捕获异常时，必须保证调用 `$done()` 释放 Loon 的 JavaScriptCore 资源。

---

## 4. 规则匹配优先算法（Loon 3.0.3+ 规则）

1. **域名规则优先**：请求目标为域名时，优先按配置文件顺序匹配域名类规则（`DOMAIN`, `DOMAIN-SUFFIX`, `DOMAIN-KEYWORD`, `USER-AGENT` 等）。匹配成功则不再触发 DNS 查询。
2. **IP 规则次之**：若域名未命中任何规则，Loon 本地发起 DNS 解析，再根据返回的 IP 匹配 IP 类规则（`IP-CIDR`, `GEOIP` 等）。
3. **加载层级权重**：`本地规则 (Local) > 插件规则 (Plugin) > 订阅规则 (Subscription)`。
4. **兜底策略**：未命中任何规则时使用 `FINAL` 指定的策略。
