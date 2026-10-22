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

### 1.4 远程复写片段规范 (`.snippet`) 与解析陷阱
用于 `[rewrite_remote]` 订阅的 `.snippet` 文件是直接交由 Quantumult X 远程复写模块解析的文本。
- **绝对严禁包含分节符**：**片段文件内绝对不可包含 `[rewrite_local]`、`[task_local]`、`[mitm]` 等任何中括号节标识符**。
  - *常见报错*：若包含 `[rewrite_local]`，QX 会在订阅更新时弹出 `invalid line [rewrite_local]` 报错。这是因为 QX 的远程复写解析器会将每一行视为规则表达式，中括号被当成了非法的正则/动作语法。
- **标准片段结构**：
  直接在文件顶部声明 `hostname = ...`，然后直接写复写规则与分流规则：
  ```ini
  # 片段描述
  hostname = api.example.com, passport.example.com
  
  # 复写规则
  ^https?:\/\/api\.example\.com\/v1\/auth url script-response-body https://fastly.jsdelivr.net/.../auth.js
  
  # [Build 844+] 亦可嵌入配套分流规则
  host, api.example.com, proxy
  ```

### 1.5 远程分流规则集规范 (`.list`) 与强制三元语法
用于 `[filter_remote]` 订阅的分流规则文件（`.list`）与 Loon/Surge/Clash 规则有本质区别：
- **强制三元结构**：QX 要求每行规则必须包含 3 个字段：`<规则类型>, <匹配目标>, <策略名称>`。
  - 格式：`host-suffix, domain.com, proxy`
- **常见报错**：若像 Loon 一样写二元形式 `host-suffix, domain.com`，QX 解析器会直接弹出 `Invalid Line host-suffix, domain.com` 报错并中断加载。
- **策略字段说明**：即使在 `[filter_remote]` 订阅参数中声明了 `force-policy=MyPolicy`，规则本体的第三个字段依然**必须存在**（可填写 `proxy` 或 `direct` 作为占位），QX 不允许省略第三字段。
  ```ini
  # 正确的 QX 分流规则
  host-suffix, ninebot.com, direct
  host, api.ninebot.com, proxy
  ip-cidr, 192.168.1.0/24, direct
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

### 2.3 任务画廊与批量任务订阅 (Task Gallery `gallery.json`)
在 Quantumult X 中，`[rewrite_remote]` 无法订阅定时任务。为了实现类似 Loon 插件一键安装 Task 的顺畅体验，官方设计了 **Task Gallery** 机制。
- **规范定义**：通过托管一个符合规范的 JSON 文件（如 `gallery.json`），用户可一键将多个定时任务以及它们依赖的 Cookie 抓取复写片段批量导入到 QX。
- **Schema 结构**：
  ```json
  {
    "name": "My Service Task Gallery",
    "description": "定时签到与状态监控合集",
    "task": [
      {
        "config": "0 8 * * * https://fastly.jsdelivr.net/.../task.js, tag=每日签到, img-url=https://fastly.jsdelivr.net/.../icon.png, enabled=true",
        "addons": "https://fastly.jsdelivr.net/.../cookie.snippet"
      }
    ]
  }
  ```
- **`addons` 联动机制**：
  - `addons` 声明了该 Task 配套的前置复写片段（如自动抓取 Cookie / Token 的 rewrite）。
  - 当用户在 Task 画廊 UI 中勾选添加该任务时，QX 会**主动弹窗提示用户同步导入对应的 `addons` 复写片段**，完美实现从“抓取凭据”到“定时运行”的闭环。
- **一键导入 URL Scheme**：
  支持直接通过网页超链接或 Markdown 链接唤醒 iOS Quantumult X 导入任务画廊：
  ```text
  quantumult-x:///ui?module=gallery&type=task&action=add&content=["ENCODED_OR_RAW_GALLERY_JSON_URL"]
  ```

### 2.4 Task 静态图标规范与排错指南 (`img-url`)
Task 配置中的 `img-url` 是在 QX 任务列表、通知及交互界面展示的图标。在真机部署中极易发生“图标空白或无法显示”的问题，需严格遵守以下排错与设计准则：
1. **必须使用全球加速 CDN（杜绝 GitHub Raw）**：
   - `raw.githubusercontent.com` 在中国大陆普遍遭到 SNI 干扰与 DNS 污染。
   - **QX 缓存死锁行为**：QX 拉取 `img-url` 失败时，会永久建立空缓存文件，后续即使网络通畅也不会自动重新拉取。
   - **解决**：统一使用 Fastly jsDelivr 等免翻全球 CDN，例如：`https://fastly.jsdelivr.net/gh/<user>/<repo>@<branch>/icons/<name>.png`。
2. **必须为真彩 PNG（杜绝 JPEG 伪装）**：
   - 很多素材网站下载的图片尽管扩展名为 `.png`，但实际文件头为 `FF D8 FF E0`（JFIF/JPEG 格式）。
   - iOS 系统的 CoreGraphics 图标渲染器遇到假标 PNG 会静默解码失败，导致 QX UI 呈现空白方块。
   - **检验方法**：必须确保文件头部魔数为 `89 50 4E 47 0D 0A 1A 0A`。
3. **客户端缓存清理操作（当遇到图标已白块时）**：
   - 在 iOS 设备上打开系统自带的「**文件**」App；
   - 导航至：`我的 iPhone -> Quantumult X -> Images`；
   - 清除其中的损坏或空白缓存图片；
   - 在 QX 中重新保存或重新导入 Task，触发重新下载。

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

### 3.8 跨端参数配置与持久化实践 (BoxJS + Hash Fallback)
由于 Quantumult X 没有 Loon 的 `[Argument]` 插件可视化表单系统，在编写通用或 QX 专属脚本时，推荐采用 **BoxJS 数据读取 + URL Hash 首次参数回写** 的双轨架构：

1. **BoxJS 集中配置中心**：
   提供 `boxjs.json` 应用订阅，在 BoxJS Web 界面中向用户提供直观的配置表单（如 API Token、Cookie、PushKey 等），数据通过 `$prefs.setValueForKey` 直接存入客户端持久化。
2. **URL Hash 传参与自动回写持久化**：
   用户可在 `[task_local]` 引用路径后附加 `#key1=val1&key2=val2` 传入参数（QX Build 951+ 完整支持）。脚本执行时优先检测 Hash 参数，并主动调用 `$.write(val, key)`（底层调用 `$prefs.setValueForKey`）回写到本地持久化存储。
   > **效果**：实现“首次运行自动保存”，后续即使从 Task 路径中移除 Hash，或用户在 UI 中手动点击执行，脚本依然能从 `$prefs` 稳定读取配置。
3. **实现模式范式**：
   ```javascript
   // 1. 优先读取持久化数据 (BoxJS / 既有 $prefs)
   let token = $.read("service_token");

   // 2. 解析 Task URL Hash 参数（兼容 QX Build 951+）
   if (typeof $environment !== "undefined" && $environment.params) {
     const hashParams = parseHash($environment.params);
     if (hashParams.token) {
       token = hashParams.token;
       // 自动回写持久化存储
       $.write(token, "service_token");
     }
   }
   ```

---

## 4. Loon 与 Quantumult X 核心机制对照表

| 维度 | Loon | Quantumult X |
| :--- | :--- | :--- |
| **生态封装单元** | **插件（`.plugin` / `.lpx`）**：单文件整合 General/Rule/Rewrite/Script/UI | **片段（`.snippet`）**：按功能分类独立引用；[844+] 支持复写中混入 Filter |
| **定时任务分发** | 插件内直接声明 `cron = ...` 随插件一键启用 | 原生 `rewrite_remote` 不支持 cron；采用 **Task Gallery (`gallery.json`)** 一键批量订阅 + `addons` 联动 |
| **远程分流规则语法** | 二元语法（`DOMAIN-SUFFIX, example.com`），策略在引用或插件中指定 | **强制三元语法**（`host-suffix, example.com, proxy`），不可省略第三参数 |
| **远程复写片段结构** | 内部允许或由 Loon 管理分节 | **严禁包含 `[rewrite_local]` 等节头**，否则报 `invalid line` |
| **参数表单交互** | 原生 `[Argument]` 插件表单，UI 交互修改 | 采用 **BoxJS 订阅配置** 或 **URL Hash 传参并回写 `$prefs`** |
| **静态图标资源** | 支持 GitHub Raw / Web / 本地 | 需使用**全球加速 CDN**（避免 GFW 阻断导致死锁空缓存）+ **真彩 PNG**（Magic Header `89 50 4E 47`） |
| **HTTP 请求** | `$httpClient.get/post(params, callback)` | `$task.fetch(params).then(resolve, reject)` |
| **Cookie Jar** | 默认开启（可配 `auto-cookie: false`） | **[934+] 默认关闭（需配 `opts: {'auto-cookie': true}`）** |
| **持久化存储** | `$persistentStore.read()` / `.write()` | `$prefs.valueForKey()` / `.setValueForKey()` |
| **系统通知** | `$notification.post(title, sub, body, attach)` | `$notify(title, sub, body, opts)` |
| **规则注释/标注**| 标准 `#` / `;` 注释 | 原生行首备注 `{# 标注 #}`，UI 可见并可搜索 |
| **JSON 高性能处理**| JS 处理 | 支持原生底层 `jsonjq-*` 零虚拟机改写 |
| **静态 DNS 映射** | `[Host]` 域名 -> IP | `address = /domain/ip`，[953+] 支持同域名并发与 IPv4/IPv6 双栈 |
| **资源释放** | `$done()` 或 `$done({})` | `$done()` 或 `$done({})` |

---

## 5. 常见错误与排错清单 (Troubleshooting FAQ)

| 现象 / 报错信息 | 触发原因 | 根治解决方案 |
| :--- | :--- | :--- |
| `invalid line [rewrite_local]` | 远程复写 `.snippet` 文件中包含了 `[rewrite_local]` 等节头标识 | 删除 `.snippet` 内所有 `[...]` 分节符，直接在顶层编写 `hostname =` 和复写规则行 |
| `Invalid Line host-suffix, domain.com` | 远程分流 `.list` 规则缺少第三个策略字段（写成了二元形式） | 补全为标准三元结构：`host-suffix, domain.com, proxy` |
| 无法通过 `rewrite_remote` 导入定时任务 | QX 原生复写解析器不识别 Task 指令 | 改用 Task Gallery (`gallery.json`) 一键导入，或手动写入 `[task_local]` |
| Task 图标在 QX 中空白或无法显示 | 1. 使用了 GitHub Raw 导致网络阻断，QX 缓存了空白占位符<br>2. 图片为 JPEG/JFIF 伪装的 `.png`，iOS CoreGraphics 解码失败 | 1. 切换至 jsDelivr 全球加速 CDN<br>2. 转为合规真彩 PNG（魔数 `89 50 4E 47`）<br>3. 在 iOS 文件 App 清空 `我的 iPhone -> Quantumult X -> Images` 缓存 |
| 脚本请求接口报 403 或 Cookie 丢失 | QX Build 934+ 默认关闭了 `auto-cookie` | 在 `$task.fetch` 请求中显式传入 `opts: { 'auto-cookie': true }` |
| 脚本在 QX 中运行超时或后台挂起 | 异步 Promise 或 `catch` 分支未执行 `$done()` | 确保每一个 resolve、reject 和异常分支终点均调用 `$done({})` 或 `$done()` |

