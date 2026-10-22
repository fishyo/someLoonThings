---
name: quantumult-x-development
description: >-
  Comprehensive guide and cheatsheet for developing Quantumult X configurations (.conf),
  snippets (.snippet), scripts ($task.fetch, $prefs, $notify, $configuration, $iCloud),
  and resource parsers according to official Quantumult X repository (https://github.com/crossutility/Quantumult-X)
  and official Telegram TestFlight release notes (@QuanXNews).
  Use this skill whenever creating or editing Quantumult X scripts, snippets, or migrating
  scripts between Loon and Quantumult X.
---

# Quantumult X 规范与开发手册（含 TestFlight 最新特性）

本手册基于 [crossutility/Quantumult-X](https://github.com/crossutility/Quantumult-X) 官方仓库与 Telegram 官方频道 `@QuanXNews`（涵盖 Build 819 至 953+ 最新变动）系统性整理。

---

## 1. 核心模块与现代语法规范

### 1.1 配置文件分块 (`.conf`)
- `[general]`：全局网络核心行为
  - `dns_exclusion_list`：绕过 Fake-IP（198.18.0.0/15）映射。
  - `udp_whitelist` / `udp_drop_list`：UDP 端口白名单与丢包控制。
    - **[Build 846+]** `udp_drop_list` 原生支持直接填入协议名阻断，如：`udp_drop_list = 80, STUN, QUIC`（有效防止 WebRTC 泄露与强推 HTTP3）。
  - `excluded_routes` / `included_routes` / `reflected_routes`：
    - **[Build 952+]** `reflected_routes`：流量原路反弹回设备（交换源/目的 IP），如 `reflected_routes = 10.10.10.1/32`。
  - `running_mode_trigger`：SSID 触发运行模式切换（`filter`, `all_proxy`, `all_direct`）。
- `[dns]`：高级域名解析
  - **[Build 950+] 规则域名 DNS 堆叠并发**：同域名的 DoH/DoQ 会被并发查询（而非仅首行生效）：
    ```ini
    doh-server = /*.example.com/https://dns.alidns.com/dns-query
    doh-server = /*.example.com/https://doh.pub/dns-query
    doq-server = /*.example.com/quic://dns.adguard.com
    ```
  - **[Build 953+] 静态地址并发与 IPv4/IPv6 双栈映射**：
    ```ini
    address = /nas.example.com/192.168.1.10
    address = /nas.example.com/192.168.1.11
    address = /nas.example.com/[fd00::10]
    ```
- `[policy]`：策略组（`static`, `available`, `round-robin`, `dest-hash`, `url-latency-benchmark`, `ssid`）。
- `[filter_local]` / `[filter_remote]`：分流规则。
- `[rewrite_local]` / `[rewrite_remote]`：HTTP/HTTPS 复写、Mock、JQLang 与脚本。
- `[task_local]`：定时与事件任务。
- `[http_backend]`：本地轻量级 JavaScript HTTP 接口服务（运行于 `127.0.0.1:9999`）。
- `[mitm]`：HTTPS 解密证书（`p12` / `passphrase`）与 `hostname`。

### 1.2 规则前置标注语法 (Leading Note) **[Build 950+]**
Filter 与 Rewrite 规则均支持行首 `{# 备注内容 #}`，在 UI 列表中直观呈现并支持搜索：
```ini
[filter_local]
{# 内部办公 #} host-suffix, work.internal, proxy

[rewrite_local]
{# 广告拦截 #} ^https?://ads\.example\.com url reject
```

### 1.3 Snippet 片段混合规则 **[Build 844+]**
复写片段（`rewrite.snippet`）中可直接嵌入分流规则，提高模块分发灵活性：
```ini
^http://example\.com/resource/ url 302 http://example.com/new/
host, example.com, proxy
```

---

## 2. 复写（Rewrite）与任务（Task）

### 2.1 高级复写类型
```ini
[rewrite_local]
# 1. 状态重定向: url 302, url 307
# 2. 内置动作: url reject, url reject-200, url reject-img, url reject-dict, url reject-array

# 3. jq 原生高性能 JSON 改写 [Build 845+]（无需 JS 虚拟机，内存极低）
^https?://api\.example\.com/data url jsonjq-response-body .data.items[] |= select(.is_ad != true)
^https?://api\.example\.com/req  url jsonjq-request-body .auth.version = "2.0"

# 4. 正则替换 Header / Body
^https?://example\.com/api url request-header (\r\n)User-Agent:.+(\r\n) request-header $1User-Agent: CustomAgent$2
^https?://example\.com/api url response-body "code":1 response-body "code":0

# 5. JavaScript 脚本改写
^https?://example\.com/req url script-request-header script-req-header.js
^https?://example\.com/req url script-request-body script-req-body.js
^https?://example\.com/res url script-response-header script-res-header.js
^https?://example\.com/res url script-response-body script-res-body.js
^https?://example\.com/mock url script-echo-response script-mock.js
```

### 2.2 定时任务与事件驱动 (`[task_local]`)
```ini
[task_local]
# 标准 Cron (5/6位)
0 8 * * * https://example.com/task.js, tag=每日签到, img-url=https://example.com/icon.png, enabled=true

# URL Hash 传递环境变量（本地/iCloud 路径自 Build 951+ 同样完整支持 # 参数）
0 9 * * * /local/path/task.js#timeout=5000&action=sync, tag=带参任务, enabled=true

# 事件驱动
event-network sample-net-task.js, tag=网络切换感知
event-interaction sample-ui-task.js, tag=UI手动点击触发
```

---

## 3. 核心 Script API 速查与 TestFlight 演进

### 3.1 网络请求：`$task.fetch`（Promise 模型）
```javascript
const myRequest = {
  url: "https://api.example.com/endpoint",
  method: "POST", // 默认 GET
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "val" }),
  opts: {
    'redirection': true,      // 自动跟随重定向（默认 true）
    'skip-cert-verify': false, // 跳过 TLS 证书检查（默认 false）
    'auto-cookie': false       // [Build 934+] 默认已调整为 false！若需自动 cookie jar 必须显式置为 true
  }
};

$task.fetch(myRequest).then(
  response => {
    // response.statusCode (数字)
    // response.headers (对象)
    // response.body (字符串)
    // response.bodyBytes (ArrayBuffer)
    console.log("Status:", response.statusCode);
    $done();
  },
  reason => {
    console.error("Error:", reason.error);
    $done();
  }
);
```

### 3.2 持久化存储：`$prefs`
```javascript
const val = $prefs.valueForKey("my_key");        // 读取字符串
$prefs.setValueForKey("string_val", "my_key");   // 写入字符串 (返回 bool)
$prefs.removeValueForKey("my_key");              // 移除单键
$prefs.removeAllValues();                         // 清空全部
```

### 3.3 系统通知：`$notify`
```javascript
$notify("Title", "Subtitle", "Body Message", {
  "open-url": "https://example.com",
  "media-url": "https://example.com/image.png"
});
```

### 3.4 脚本返回值规范 (`$done`)
- **[Build 824+] 请求脚本直接 Mock 响应**：在 `script-request-header` 或 `script-request-body` 中，若 `$done` 携带 `status` 键（如 `$done({ status: "HTTP/1.1 200 OK", body: "{}" })`），QX 会将其直接视为 Mock 响应拦截并返回，无需再额外配 `script-echo-response`。
- **改写响应**：`$done({ body: modifiedBody, headers: modifiedHeaders, status: "HTTP/1.1 200 OK" })`。
- **修改二进制**：`$done({ bodyBytes: arrayBuffer })`。
- **任务脚本**：`$done()` 释放内存。

### 3.5 运行时配置与底层交互：`$configuration.sendMessage`
- `url_latency_benchmark`：传入节点 Tag 数组，主动进行真实网络延迟基准测试。
- `get_policy_state` / `set_policy_state`：动态读取或切换策略组选中节点。
- `get_running_mode` / `set_running_mode`：动态切换分流模式（`filter`, `all_proxy`, `all_direct`）。

### 3.6 iCloud 数据同步：`$iCloud`
工作于 `iCloud Drive/Quantumult X/Data/` 目录：
- 写入：`$iCloud.writeFile(new TextEncoder().encode("content"), "dir/file.txt")`
- 读取：`$iCloud.readFile("dir/file.txt")`（返回 `Uint8Array`）
- 删除：`$iCloud.removeFile("dir/file.txt")`

### 3.7 参数化 UI 协议（`$parser`）
资源解析器可通过挂载全局 `$parser` 函数实现 UI 原生渲染：
- `$parser.hashSchema()`：返回 UI 控件架构（`switch`, `select`, `text`, `tags`）。
- `$parser.hashToUI(hash)`：将 `#` 后文本转为带值的 UI 结构。
- `$parser.uiToHash(values)`：将用户在 UI 调整后的字典重新拼接为 Hash 字符串。

---

## 4. Loon 与 Quantumult X 核心机制对照表

| 维度 | Loon | Quantumult X |
| :--- | :--- | :--- |
| **生态封装单元** | **插件（`.plugin` / `.lpx`）**：单文件整合 General/Rule/Rewrite/Script/UI | **片段（`.snippet`）**：按功能分类独立引用；[844+] 支持复写中混入 Filter |
| **HTTP 请求** | `$httpClient.get/post(params, callback)` | `$task.fetch(params).then(resolve, reject)` |
| **Cookie Jar** | 默认开启（可配 `auto-cookie: false`） | **[934+] 默认关闭（需配 `opts: {'auto-cookie': true}`）** |
| **持久化存储** | `$persistentStore.read()` / `.write()` | `$prefs.valueForKey()` / `.setValueForKey()` |
| **系统通知** | `$notification.post(title, sub, body, attach)` | `$notify(title, sub, body, opts)` |
| **规则注释/标注**| 标准 `#` / `;` 注释 | 原生行首备注 `{# 标注 #}`，UI 可见并可搜索 |
| **JSON 高性能处理**| JS 处理 | 支持原生底层 `jsonjq-*` 零虚拟机改写 |
| **静态 DNS 映射** | `[Host]` 域名 -> IP | `address = /domain/ip`，[953+] 支持同域名并发与 IPv4/IPv6 双栈 |
| **资源释放** | `$done()` 或 `$done({})` | `$done()` 或 `$done({})` |
