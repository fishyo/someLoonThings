# someLoonThings 项目开发规范 (Loon, Quantumult X & Egern)

本项目专注于 iOS 代理工具生态（**Loon**、**Quantumult X** 与 **Egern**）的高质量规则、插件、片段、模块与脚本维护。Agent 在此工作区中开发时，必须全面胜任三款 App 的**独立专属开发**与**多端通用兼容适配**。

---

## 1. 独立开发模式规范 (Independent Mode)

当为特定客户端编写独立配置或专属脚本时，必须严格遵守各自官方标准与最佳实践，严禁非标或无关客户端 API 混杂污染：

### 1.1 Loon 专属开发
- 严格遵循 [Loon 官方规范](https://nsloon.app/LoonManual/)。
- 插件文件头使用 Loon 原生元指令：`#!name=`, `#!desc=`, `#!author=`, `#!icon=`, `#!input=`, `#!select=`。
- 脚本使用 Loon 原生 API：`$httpClient.get/post`（回调模式）、`$persistentStore.read/write`、`$notification.post`、`$config`。
- 扩展格式统一使用 `.plugin`、`.lpx` 或 `.lsr`（规则集）。

### 1.2 Quantumult X 专属开发
- 严格遵循 [Quantumult X 官方仓库规范与 TestFlight 最新特性](https://github.com/crossutility/Quantumult-X)。
- **远程复写片段规范 (`.snippet`)**：
  - 供 `[rewrite_remote]` 订阅的 `.snippet` 文件**绝对严禁包含 `[rewrite_local]`、`[task_local]` 或 `[mitm]` 等分节标签**，否则 QX 解析器会因识别为非法规则直接抛出 `invalid line [rewrite_local]`。
  - 片段内部直接声明 `hostname = ...` 与复写规则（支持 Build 844+ 混入 filter 规则与 Build 950+ 前置备注 `{# 备注 #}`）。
- **远程分流规则集规范 (`.list`)**：
  - 每行规则必须具备完整的**三元结构**：`<规则类型>, <匹配目标>, <策略名称>`（如 `host-suffix, domain.com, proxy`）。
  - 即便通过 `force-policy` 覆盖策略，规则本体亦**不得省略第三个策略字段**，否则 QX 解析器直接抛出 `Invalid Line <type>, <target>`。
- **任务与画廊规范 (Task Gallery)**：
  - QX 原生 `rewrite_remote` 不支持定时任务；定时任务必须独立归入 `[task_local]`，或通过官方标准 **Task Gallery (`gallery.json`)** 提供一键批量导入。
  - `gallery.json` 支持 `addons` 字段自动联动 Cookie 捕获等配套复写片段。
- **图标与静态资源规范 (`img-url`)**：
  - `img-url` 严禁使用国内不可达的 `raw.githubusercontent.com`，必须统一使用全球加速 CDN（如 `https://fastly.jsdelivr.net/gh/...`）。
  - 图标必须是合规标准的真彩 PNG 格式（Magic Header: `89 50 4E 47`），严禁使用被直接重命名为 `.png` 的 JPEG（JFIF）图片。
- **脚本 API 规范**：
  - 脚本使用 QX 原生 API：`$task.fetch`（Promise 模式，注意 Build 934+ 默认关闭 cookie，需传 `opts: { 'auto-cookie': true }`）、`$prefs.valueForKey/setValueForKey`、`$notify`、`$configuration`、`$iCloud`。
  - 严禁在 QX 片段或脚本中出现 Loon 的 `#!name` 插件指令或 `$persistentStore` 等 API。

### 1.3 Egern 专属开发（含 TestFlight 最新特性）
- 严格遵循 [Egern 官方规范](https://egernapp.com/docs/intro/) 与最新 TestFlight 特性。
- **模块规范 (`.yaml`)**：
  - 文件结构必须为标准 YAML。元数据包含：`name`, `description`, `author`, `homepage`, `manual`, `icon` (SF Symbol 或 URL), `open_url`。
  - **参数化占位符替换 (`compat_arguments`)**：通过 `{{{ARGUMENT_NAME}}}` 提供默认值，并在主配置引用时可按需覆盖。字符串字段占位符必须加引号（如 `match: "{{{REGION}}}.example.com"`），数字/布尔字段保持不加引号（如 `timeout: {{{TIMEOUT}}}`）。
  - **图形化 UI 表单 (`env_schema`)**：声明表单控件。无 `options` 生成文本框；`options: ["true", "false"]` 自动生成开关 Toggle；其它选项列表生成选择器 Picker。值直接注入 `ctx.env`。
- **规则集规范 (`.yaml`)**：
  - 规则集文件使用顶层 YAML 集合声明：`no_resolve: true`、`domain_suffix_set:`、`domain_keyword_set:`、`ip_cidr_set:`、`asn_set:`、`dest_port_set:` 等。文件内所有规则为逻辑 OR 关系。
- **改写与零脚本优化**：
  - URL 重定向使用 `url_rewrites`（支持 `location: "http://reject-dict/"`、`reject-200` 等原生 mock 拒绝端点）。
  - 静态响应使用 `map_locals`。
  - JSON 数据改写优先使用 `response_jq` / `request_jq`，避免无谓启动 JavaScript 引擎以极度节省内存。
- **原生现代脚本开发 (`export default async function(ctx)`)**：
  - 原生脚本采用 ES Module 标准，导出异步主函数。
  - 上下文对象 `ctx` 提供强大的现代 API：
    - 请求与响应：`ctx.request` / `ctx.response`（提供 `.json()`、`.text()` 等流式解析，**单次消费**；Headers 支持大小写不敏感读写与 `getAll`）。
    - 流程干预：`return { headers, body }`、伪造响应 `ctx.respond({ status, headers, body })` 或中断连接 `ctx.abort()`。
    - 异步网络：`ctx.http.get/post/put/delete` 全 Promise 接口。
    - 持久存储：`ctx.storage.get/set` 及便捷方法 `ctx.storage.getJSON/setJSON`。
    - 富媒体通知：`ctx.notify({ title, subtitle, body, sound, attachment, action })`。
    - 进阶能力：`ctx.lookupIP`（查 ASN/归属国）、`ctx.compress`（gzip/brotli 解压缩）、`ctx.ssh`（远程命令执行与 SFTP 文件系统管理）。
- **TestFlight 特性适配注意事项**：
  - **新协议原生支持**：Hysteria 2、TUIC、VLESS (XTLS-Vision)、Shadowsocks 2022 (BLAKE3)。
  - **新一代 DNS**：优先利用 DoH3、DoQ 进行并发无死锁域名解析。
  - **级联 QUIC 阻断**：`block_quic` 具有节点 > 策略组 > 全局的层级优先级。
  - **平滑重连**：启用 `close_connections_on_policy_change: true` 确保策略组切换节点时旧连接瞬断并立即重连新节点。
  - **ETag 条件拉取**：外部资源拉取严格支持 304 缓存跳过，减少冗余写入。

---

## 2. 多端通用兼容开发模式规范 (Multi-Platform Compatible Mode)

当需要编写“一套代码、多端通用”的脚本（Universal Script）时，必须通过轻量可靠的环境适配层进行语法抹平：

- **环境检测准则**：
  - 严禁使用未声明变量直接调用私有 API。
  - 通过 `typeof $task !== "undefined"` 检测 Quantumult X；
  - 通过 `typeof $httpClient !== "undefined" && typeof $loon !== "undefined"` 检测 Loon；
  - 通过 `typeof ctx !== "undefined" || (typeof globalThis !== "undefined" && globalThis.Egern)` 检测 Egern。
- **核心 API 抹平规范**：
  1. **持久化存储与参数配置**：
     - 读取：映射 Loon 的 `$persistentStore.read(key)`、QX 的 `$prefs.valueForKey(key)` 与 Egern 的 `ctx.storage.get(key)`。
     - 写入：统一映射 Loon 的 `$persistentStore.write(val, key)`、QX 的 `$prefs.setValueForKey(val, key)` 与 Egern 的 `ctx.storage.set(key, val)`。
     - **参数管理**：通用脚本优先支持 **BoxJS** 变量集中管理；在 Egern 中通过 `ctx.env` 注入；若从 Task URL Hash (`#key=val`) 读取到参数，自动调用 `$.write()` 回写到本地持久存储。
  2. **网络请求**：
     - 将 Loon 的 `$httpClient` 回调模型、QX 的 `$task.fetch` Promise 模型与 Egern 的 `ctx.http` Promise 模型统一抽象为标准 Promise 接口。
  3. **通知交互**：
     - 统一封装 `$notification.post`、`$notify` 与 `ctx.notify`，确保标题、副标题、正文及跳转链接在各端正常展示。
  4. **脚本退出与资源释放**：
     - 各平台结束机制不同：Loon/QX 调用 `$done({})`，Egern 调用 `return {}` 或 `ctx.respond()`。通用适配层必须确保在所有分支与 `catch` 异常中安全结束，防止 JavaScriptCore 脚本引擎挂起导致内存泄露与 iOS Network Extension 崩溃。

---

## 3. 脚本资源与稳定性管理（全端通用）

- **必须可靠释放**：无论是 Loon、Quantumult X 还是 Egern，所有异步网络请求分支、业务流程终点以及 `catch` 异常分支，必须最终触发脚本退出，防止 JavaScriptCore 引擎挂起。
- **Network Extension 内存警戒线**：iOS 系统对网络扩展进程有极严格的物理内存上限（通常为 15MB 或 50MB）。通用脚本避免在内存中缓存海量响应文本，优先流式或 jq 处理，定时脚本及时解引重大对象以便垃圾回收。
- **状态平滑兼容**：键值存储应具备向前兼容能力（如新旧 Key 回退机制），避免用户升级后丢失既有 Token 或配置。

---
