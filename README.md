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

## ⚡ Quantumult X 片段一键导入 (QuanX Snippets)

在 iOS 设备 Safari 浏览器中点击“导入 QuanX”按钮，即可直接调起 Quantumult X 添加远程片段引用（Rewrite / Task / MitM 一站式导入）：

| 功能模块 | 说明 | 一键导入 | 原始文件 |
| :--- | :--- | :---: | :---: |
| **9bot** | 自动签到任务与 Cookie 捕获，Token 自动存入本地 `$prefs` | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fninebot.snippet%2C%20tag%3D9bot%20%E7%AD%BE%E5%88%B0%22%5D%7D) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/ninebot.snippet) |
| **搬瓦工状态** | 每天 06:02 查询 Bandwagon VPS 流量与状态（由 BoxJS 配置） | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fbandwagon.snippet%2C%20tag%3DBandwagon%20VPS%20%E7%8A%B6%E6%80%81%22%5D%7D) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/bandwagon.snippet) |
| **RackNerd状态** | 每天 06:01 查询 RackNerd VPS 流量与运行状态（由 BoxJS 配置） | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fracknerd.snippet%2C%20tag%3DRackNerd%20VPS%20%E7%8A%B6%E6%80%81%22%5D%7D) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/racknerd.snippet) |
| **自用拦截** | 少数派 RSS 防盗链、华尔街见闻、京东开屏、同花顺等去广告 | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fad-block.snippet%2C%20tag%3D%E8%87%AA%E7%94%A8%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%22%5D%7D) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/ad-block.snippet) |

---

## 🌐 分流规则集 (Rule-Sets)

| 规则名称 | 适用平台 | 说明 | 一键导入 / 订阅直链 |
| :--- | :---: | :--- | :---: |
| **AI 服务分流** | Loon | 聚合全网主流 AI 服务（Gemini, OpenAI, Claude, Grok 等） | [导入 Loon](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) |
| **AI 服务分流** | QuanX | 聚合全网主流 AI 服务（适配 QX `host-suffix` 规范） | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fai.list%2C%20tag%3DAI%20%E6%9C%8D%E5%8A%A1%E5%88%86%E6%B5%81%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/rules/ai.list) |
| **AI 服务分流** | Mihomo | Clash / Mihomo 兼容规则集 (`rule-providers`) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/ai.yaml) |
| **自用代理域名** | Loon | 常用国外网站与代理补充（Cloudflare, Bitwarden 等） | [导入 Loon](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) |
| **自用代理域名** | QuanX | 常用国外网站与代理补充（适配 QX 规范） | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fproxy.list%2C%20tag%3D%E8%87%AA%E7%94%A8%E4%BB%A3%E7%90%86%E5%9F%9F%E5%90%8D%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/rules/proxy.list) |
| **自用代理域名** | Mihomo | Clash / Mihomo 兼容规则集 (`rule-providers`) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/proxy.yaml) |
| **Supercell 直连** | Loon | 皇室战争、荒野乱斗等官方直连域名列表 | [导入 Loon](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) |
| **Supercell 直连** | QuanX | 皇室战争、荒野乱斗等官方直连域名列表 | [导入 QuanX](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsupercell.list%2C%20tag%3DSupercell%20%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) / [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/quanX/rules/supercell.list) |
| **Supercell 直连** | Mihomo | Clash / Mihomo 兼容规则集 (`rule-providers`) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/direct.yaml) |

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
* **Loon 插件** (`plugin/ninebot.plugin`)：支持通过 Argument UI 开启/关闭任务与设置签到时间。
* **QuanX 片段** (`quanX/ninebot.snippet`)：导入后打开 9bot App 进入签到页自动捕获 Cookie，Token 自动写入 `$prefs` 持久化，每天 06:20 定时签到。

### 2. 🖲️ 搬瓦工 VPS 状态
* **Loon 插件** (`plugin/bandwagon.plugin`)：支持直接在 Loon 插件配置中填写 VEID 和 API Key，也可留空自动读取 BoxJS。
* **QuanX 片段** (`quanX/bandwagon.snippet`)：每天 06:02 执行，自动读取 BoxJS / `$prefs` 配置。
* **通知风格**：极简灰度进度条展示月度流量与重置日，IPv4 与 IPv6 独立分行排版。

### 3. 🖥️ RackNerd VPS 状态
* **Loon 插件** (`plugin/racknerd.plugin`)：支持在插件设置中填写 API Key 和 Hash，或通过 BoxJS 配置。
* **QuanX 片段** (`quanX/racknerd.snippet`)：每天 06:01 执行，自动读取 BoxJS / `$prefs` 配置。
* **通知风格**：极简灰度进度条，展示总流量使用率、RAM 及磁盘占用。

### 4. 🛡️ 自用拦截
* **Loon 扩展** (`plugin/ad-block.lpx`) & **QuanX 片段** (`quanX/ad-block.snippet`)：
  * 少数派 RSS 全文图片防盗链 Header 注入；
  * 拦截华尔街见闻、京东开屏 CMS、同花顺等应用广告。

---

## 🎨 节点与插件图标 (Icons)

精配 512x512 高清 iOS 风格 Squircle 节点与插件图标，支持在节点、策略组 (`img-url`) 或插件 (`#!icon`) 中直接引用：

| 预览 | 名称 | 直链引用地址 |
| :---: | :--- | :--- |
| <img src="icons/bandwagon.png" width="40" height="40" /> | **BandwagonHost (搬瓦工)** | `https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/bandwagon.png` |
| <img src="icons/racknerd.png" width="40" height="40" /> | **RackNerd** | `https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/racknerd.png` |
| <img src="icons/ninebot.png" width="40" height="40" /> | **9bot** | `https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/ninebot.png` |

---

## 📄 License

MIT
