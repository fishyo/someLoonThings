# someLoonThings 项目开发规范 (Loon & Quantumult X)

本项目专注于 iOS 代理工具生态（**Loon** 与 **Quantumult X**）的高质量规则、插件、片段与脚本维护。Agent 在此工作区中开发时，必须全面胜任两款 App 的**独立专属开发**与**双端通用兼容适配**。

---

## 1. 独立开发模式规范 (Independent Mode)

当为特定客户端编写独立配置或专属脚本时，必须严格遵守各自官方标准，严禁非标或无关客户端 API 混杂污染：

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

---

## 2. 双端兼容开发模式规范 (Dual-Platform Compatible Mode)

当需要编写“一套代码、双端通用”的脚本（Universal Script）时，必须通过轻量可靠的环境适配层进行语法抹平：

- **环境检测准则**：
  - 严禁使用未声明变量直接调用私有 API。
  - 通过 `typeof $task !== "undefined"` 检测 Quantumult X；
  - 通过 `typeof $httpClient !== "undefined"` 检测 Loon；
  - 避免引入体积庞大的冗余框架，优先内嵌轻量封装函数。
- **核心 API 抹平规范**：
  1. **持久化存储与参数配置**：
     - 读取：优先映射 Loon 的 `$persistentStore.read(key)` 与 QX 的 `$prefs.valueForKey(key)`。
     - 写入：统一映射 Loon 的 `$persistentStore.write(val, key)` 与 QX 的 `$prefs.setValueForKey(val, key)`。
     - **参数管理**：由于 QX 不具备 Loon 的 `[Argument]` 文本表单，通用脚本必须优先支持 **BoxJS** 变量集中管理；若从 Task URL Hash (`#key=val`) 读取到参数，应自动调用 `$.write()` 持久化回写到本地 `$prefs`，实现一次配置永久生效。
  2. **网络请求**：
     - 将 Loon 的 `$httpClient` 回调模型与 QX 的 `$task.fetch` Promise 模型统一抽象为统一 Promise 或 Callback 接口，并确保正确传递 headers、body 及 cookie 参数。
  3. **通知交互**：
     - 统一封装 `$notification.post` 与 `$notify`，确保副标题、正文及跳转链接在两端正常展示。

---

## 3. 脚本资源与稳定性管理（全端通用）

- **必须可靠释放**：无论是 Loon 还是 Quantumult X，所有异步网络请求分支、业务流程终点以及 `catch` 异常分支，必须最终调用 `$done({})` 或 `$done()`，防止 JavaScriptCore 脚本引擎挂起导致内存与资源泄漏。
- **状态平滑兼容**：键值存储应具备向前兼容能力（如新旧 Key 回退机制），避免用户升级后丢失既有 Token 或配置。

---

