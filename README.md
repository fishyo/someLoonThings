# Some Loon Things

自用 **Loon**、**Quantumult X** 与 **Mihomo** 的插件、片段、分流规则及跨平台脚本合集，全面支持一键导入与 BoxJS 可视化配置。

---

## 🚀 Loon 插件一键导入 (Loon Plugins)

| 插件名称 | 说明 | 一键导入 | 直链 / 源码 |
| :--- | :--- | :---: | :---: |
| **9bot** | 9bot 自动签到与 Cookie 捕获，支持自定义时间与独立开关 | [导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.plugin) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.plugin) |
| **搬瓦工状态** | BandwagonHost VPS 流量与运行状态定时查询，支持 UI / BoxJS 配置 | [导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/bandwagon.plugin) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/bandwagon.plugin) |
| **RackNerd状态** | RackNerd VPS 流量、内存与运行状态定时查询，支持 UI / BoxJS 配置 | [导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/racknerd.plugin) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/racknerd.plugin) |
| **自用拦截** | 广告拦截与 Header 重写（少数派、华尔街见闻、京东开屏等） | [导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) |

---

## ⚡ Quantumult X 片段与任务 (QuanX Snippets & Tasks)

> [!WARNING]
> **⚠️ 状态提示（待真机实测）**
> 本项目对 Quantumult X 的配置、分流规则（`.list`）、复写片段（`.snippet`）、任务画廊（`gallery.json`）及双端通用脚本适配层均基于官方规范编写，并通过了本地自动化语法与沙盒仿真校验，**但尚未在真实 iOS 设备环境中经过充分实测**。如在导入、解析或运行中遇到任何问题，欢迎提交 Issue 反馈！

### 1. 🎨 任务画廊 / 任务仓库 (Task Gallery) - 推荐使用方式
> **为什么使用任务画廊？**
> Quantumult X 的远程复写（`[rewrite_remote]`）**不支持**直接解析定时任务（`cron`）。官方推荐的批量添加与管理定时脚本的标准方式是**任务画廊 (Task Gallery)**。通过画廊可一键添加带高清图标的定时任务，并自动联动提示导入配套的 Cookie 抓取复写片段（`addons`）。

#### 📱 方式一：一键唤醒导入（推荐）
在 iOS 设备的 **Safari 浏览器** 中点击下方链接，即可直接唤醒 Quantumult X 导入任务画廊：
* 🚀 [一键导入任务画廊 (jsDelivr CDN 全球加速)](https://quantumult.app/x/open-app/ui?module=gallery&type=task&action=add&content=%5B%22https%3A%2F%2Ffastly.jsdelivr.net%2Fgh%2Ffishyo%2FsomeLoonThings%40main%2FquanX%2Fgallery.json%22%5D)
* 🌐 [一键导入任务画廊 (GitHub 直链备用)](https://quantumult.app/x/open-app/ui?module=gallery&type=task&action=add&content=%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fgallery.json%22%5D)
* 🔗 [URL Scheme 协议直接跳转](quantumult-x:///ui?module=gallery&type=task&action=add&content=%5B%22https%3A%2F%2Ffastly.jsdelivr.net%2Fgh%2Ffishyo%2FsomeLoonThings%40main%2FquanX%2Fgallery.json%22%5D)

#### ⚙️ 方式二：Quantumult X 客户端内手动添加
1. 打开 **Quantumult X** 客户端；
2. 点击底部导航栏右二的「**构造请求**」按钮（闪电图标）；
3. 点击页面右上角顶部的「**任务画廊**」图标（画框图标）；
4. 点击右上角「**+**」号，在弹出的输入框中粘贴任务库地址并保存：
   * **CDN 加速地址（推荐免翻）**：
     ```text
     https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/quanX/gallery.json
     ```
   * **GitHub 直链**：
     ```text
     https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/gallery.json
     ```
5. 保存后在画廊列表中点击进入 **someLoonThings 任务画廊**；
6. 勾选你需要启用的任务并开启（如 9bot 签到、搬瓦工 VPS 状态、RackNerd VPS 状态）；
7. **联动授权确认**：若添加 9bot 等带有 Cookie 捕获的任务时，系统会弹出「*是否添加关联的复写配置 (addons)*」，请务必选择**添加**，以自动导入凭据捕获片段。

* **画廊当前包含的任务列表**：
  * **9bot 每日签到**（每天 06:20，自动联动 Cookie 捕获 Rewrite）
  * **搬瓦工 VPS 状态**（每天 06:02，流量与运行状态监控）
  * **RackNerd VPS 状态**（每天 06:01，流量、内存与状态监控）

### 2. 远程复写与 MitM 片段 (Rewrite Remote)
在 iOS 设备 Safari 浏览器中点击“导入 QuanX”，直接调起 Quantumult X 添加远程复写引用：

| 模块名称 | 说明 | 一键导入 | 原始文件 | 状态 |
| :--- | :--- | :---: | :---: | :---: |
| **9bot Cookie 捕获** | 抓取 9bot 登录凭据，捕获后自动保存至本地 `$prefs` | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fninebot.snippet%2C%20tag%3D9bot%20Cookie%20%E6%8D%95%E8%8E%B7%22%5D%7D) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/ninebot.snippet) | ⚠️ 待实测 |
| **自用拦截** | 少数派 RSS 防盗链、华尔街见闻、京东开屏、同花顺等广告拦截 | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fad-block.snippet%2C%20tag%3D%E8%87%AA%E7%94%A8%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%22%5D%7D) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/ad-block.snippet) | ⚠️ 待实测 |

### 3. 本地单行配置 (Task Local)
如果你更倾向直接在 Quantumult X 配置文件中的 `[task_local]` 区块手动粘贴，也可直接复制以下内容：

```ini
[task_local]
# 9bot 每日签到（每天 06:20 执行）
20 6 * * * https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/9bot/9botsign.js, tag=9bot 签到, img-url=https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/ninebot.png, enabled=true

# 搬瓦工 VPS 状态查询（每天 06:02 执行，由 BoxJS 配置参数）
2 6 * * * https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/bandwagon/bwg.js, tag=Bandwagon VPS 状态, img-url=https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/bandwagon.png, enabled=true

# RackNerd VPS 状态查询（每天 06:01 执行，由 BoxJS 配置参数）
1 6 * * * https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/racknerd/racknerd.js, tag=RackNerd VPS 状态, img-url=https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/racknerd.png, enabled=true
```

---

## 🌐 分流规则集 (Rule-Sets)

> [!NOTE]
> **提示**：Quantumult X 的分流规则（`.list`）均已按官方标准适配三元结构（`<类型>, <目标>, <策略>`），由于规则刚刚完成迁移适配，当前处于**待真机充分测试**状态。

| 规则名称 | 适用平台 | 说明 | 一键导入 / 订阅直链 | 状态 |
| :--- | :---: | :--- | :---: | :---: |
| **AI 服务分流** | Loon | 聚合全网主流 AI 服务（Gemini, OpenAI, Claude, Grok 等） | [导入 Loon](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) | ✅ 已实测 |
| **AI 服务分流** | QuanX | 聚合全网主流 AI 服务（适配 QX `host-suffix` 规范） | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fai.list%2C%20tag%3DAI%20%E6%9C%8D%E5%8A%A1%E5%88%86%E6%B5%81%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/rules/ai.list) | ⚠️ 待实测 |
| **AI 服务分流** | Mihomo | Clash / Mihomo 兼容规则集 (`rule-providers`) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/ai.yaml) | ✅ 已实测 |
| **自用代理域名** | Loon | 常用国外网站与代理补充（Cloudflare, Bitwarden 等） | [导入 Loon](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) | ✅ 已实测 |
| **自用代理域名** | QuanX | 常用国外网站与代理补充（适配 QX 规范） | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fproxy.list%2C%20tag%3D%E8%87%AA%E7%94%A8%E4%BB%A3%E7%90%86%E5%9F%9F%E5%90%8D%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/rules/proxy.list) | ⚠️ 待实测 |
| **自用代理域名** | Mihomo | Clash / Mihomo 兼容规则集 (`rule-providers`) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/proxy.yaml) | ✅ 已实测 |
| **Supercell 直连** | Loon | 皇室战争、荒野乱斗等官方直连域名列表 | [导入 Loon](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) | ✅ 已实测 |
| **Supercell 直连** | QuanX | 皇室战争、荒野乱斗等官方直连域名列表 | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsupercell.list%2C%20tag%3DSupercell%20%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/rules/supercell.list) | ⚠️ 待实测 |
| **Supercell 直连** | Mihomo | Clash / Mihomo 兼容规则集 (`rule-providers`) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/direct.yaml) | ✅ 已实测 |

---

## 📦 BoxJS 订阅与参数配置

所有脚本均已集成 BoxJS 支持，Loon 与 Quantumult X 用户均可通过 BoxJS 可视化统一配置管理 VPS 凭据与偏好设置。

### BoxJS 订阅直链：
```text
https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json
```

### 支持的应用与配置项：
1. **Bandwagon 状态** (`bandwagon`)：
   * `bandwagon.veid`: KiwiVM 机器 VEID
   * `bandwagon.apiKey`: KiwiVM API Key
2. **RackNerd 状态** (`racknerd`)：
   * `racknerd.apiKey`: 控制面板 API Key
   * `racknerd.apiHash`: 控制面板 API Hash

---

## 📋 模块详细特性

### 1. 🛵 9bot
* **Loon 插件** (`plugin/ninebot.plugin`)：支持通过 Argument UI 开启/关闭任务与设置签到时间（✅ 已实测）。
* **QuanX 片段与任务** (`quanX/ninebot.snippet` & `quanX/gallery.json`)：导入后打开 9bot App 进入签到页自动捕获 Cookie，Token 自动写入 `$prefs` 持久化，每天 06:20 定时签到（⚠️ 待真机实测）。

### 2. 🖲️ 搬瓦工 VPS 状态
* **Loon 插件** (`plugin/bandwagon.plugin`)：支持直接在 Loon 插件配置中填写 VEID 和 API Key，也可留空自动读取 BoxJS（✅ 已实测）。
* **QuanX 片段与任务** (`quanX/bandwagon.snippet` & `quanX/gallery.json`)：每天 06:02 执行，自动读取 BoxJS / `$prefs` 配置，极简灰度进度条展示月度流量与重置日，IPv4 与 IPv6 独立分行排版（⚠️ 待真机实测）。

### 3. 🖥️ RackNerd VPS 状态
* **Loon 插件** (`plugin/racknerd.plugin`)：支持在插件设置中填写 API Key 和 Hash，或通过 BoxJS 配置（✅ 已实测）。
* **QuanX 片段与任务** (`quanX/racknerd.snippet` & `quanX/gallery.json`)：每天 06:01 执行，自动读取 BoxJS / `$prefs` 配置，极简灰度进度条展示总流量使用率、RAM 及磁盘占用（⚠️ 待真机实测）。

### 4. 🛡️ 自用拦截
* **Loon 扩展** (`plugin/ad-block.lpx`)：少数派 RSS 防盗链注入与应用去广告（✅ 已实测）。
* **QuanX 片段** (`quanX/ad-block.snippet`)：少数派 RSS 全文图片防盗链 Header 注入与应用开屏去广告（⚠️ 待真机实测）。

---

## 🎨 节点与插件图标 (Icons)

精配 512x512 高清 iOS 风格 Squircle 节点与插件图标，支持在节点、策略组 (`img-url`) 或插件 (`#!icon`) 中直接引用：

| 预览 | 名称 | CDN 直链 (推荐免翻) | GitHub 直链 (备用) |
| :---: | :--- | :--- | :--- |
| <img src="icons/bandwagon.png" width="40" height="40" /> | **BandwagonHost (搬瓦工)** | `https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/bandwagon.png` | `https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/bandwagon.png` |
| <img src="icons/racknerd.png" width="40" height="40" /> | **RackNerd** | `https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/racknerd.png` | `https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/racknerd.png` |
| <img src="icons/ninebot.png" width="40" height="40" /> | **9bot** | `https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/ninebot.png` | `https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/ninebot.png` |

---

## 📄 License

MIT
