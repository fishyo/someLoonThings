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
- 规则与复写采用模块化 `.snippet` 或 `.conf`，支持前置备注语法 `{# 备注 #}`（Build 950+）。
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
  1. **持久化存储**：
     - 读取：优先映射 Loon 的 `$persistentStore.read(key)` 与 QX 的 `$prefs.valueForKey(key)`。
     - 写入：统一映射 Loon 的 `$persistentStore.write(val, key)` 与 QX 的 `$prefs.setValueForKey(val, key)`。
  2. **网络请求**：
     - 将 Loon 的 `$httpClient` 回调模型与 QX 的 `$task.fetch` Promise 模型统一抽象为统一 Promise 或 Callback 接口，并确保正确传递 headers、body 及 cookie 参数。
  3. **通知交互**：
     - 统一封装 `$notification.post` 与 `$notify`，确保副标题、正文及跳转链接在两端正常展示。

---

## 3. 脚本资源与稳定性管理（全端通用）

- **必须可靠释放**：无论是 Loon 还是 Quantumult X，所有异步网络请求分支、业务流程终点以及 `catch` 异常分支，必须最终调用 `$done({})` 或 `$done()`，防止 JavaScriptCore 脚本引擎挂起导致内存与资源泄漏。
- **状态平滑兼容**：键值存储应具备向前兼容能力（如新旧 Key 回退机制），避免用户升级后丢失既有 Token 或配置。

---

## 4. 通知与排版规范（极简灰度风）

无论运行于 Loon 还是 Quantumult X，通知展示均需严格统一格式：
- **Title**：服务或任务名称（如 `BandwagonHost Status`, `RackNerd Status`）。
- **Subtitle**：精简机房节点位置或核心状态（避免堆叠 IP）。
- **Body**：
  - 进度条统一使用方形符号 `[████░░░░░░]`；
  - **IPv4 与 IPv6 必须独立分行展示**，杜绝单行横向拥挤截断；
  - 风格保持极简原生的单色灰度符号（如 `•`、`·`），不堆叠花哨 emoji。
