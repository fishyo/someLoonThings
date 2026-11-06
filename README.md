# someLoonThings

自用 **Loon**、**Quantumult X** 与 **Mihomo** 插件、片段、分流规则及脚本合集。

> ⚠️ **测试说明**：Loon 相关配置均已长期实测；Quantumult X 规则与脚本已按规范适配，**当前未严格测试**。

---

## 插件与任务 (Plugins & Tasks)

### 1. Loon 插件
| 插件 | 说明 | 一键导入 |
| :--- | :--- | :---: |
| **9bot** | 每日签到与 Cookie 抓取 | [导入插件](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.plugin) |
| **搬瓦工** | VPS 流量与运行状态查询 | [导入插件](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/bandwagon.plugin) |
| **RackNerd** | VPS 流量、内存与状态查询 | [导入插件](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/racknerd.plugin) |
| **Cloudflare** | Workers 每日免费请求配额 (10万次/天) 与用量监控 | [导入插件](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/cloudflare.plugin) |
| **自用拦截** | 少数派防盗链、开屏去广告 | [导入插件](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) |

### 2. Quantumult X *(⚠️ 未严格测试)*
* **任务仓库 (Task Gallery)**：包含 9bot（自动联动 Cookie 抓取）、搬瓦工、RackNerd 与 Cloudflare 全部定时任务
  * 🚀 **[一键导入任务仓库](https://quantumult.app/x/open-app/ui?module=gallery&type=task&action=add&content=%5B%22https%3A%2F%2Ffastly.jsdelivr.net%2Fgh%2Ffishyo%2FsomeLoonThings%40main%2FquanX%2Fgallery.json%22%5D)**
  * 仓库直链：`https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/quanX/gallery.json`
* **自用拦截 (Rewrite)**：少数派防盗链与开屏去广告 -> **[一键导入复写](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fad-block.snippet%2C%20tag%3D%E8%87%AA%E7%94%A8%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%22%5D%7D)**

---

## 3. 分流规则集 (Rule-Sets)

本项目采用**主集合规则 + 次级独立子规则**架构。Master 集合规则适合策略组整体绑定，各平台的原子子规则（如 YouTube、OpenAI、Meta 等）可独立订阅精细化分流。详见 [分流架构与使用指南](rules/README.md)。

| 规则 | 说明 | Loon | Quantumult X | Mihomo |
| :--- | :--- | :---: | :---: | :---: |
| **流媒体全量 (Streaming)** | YouTube / Netflix / Disney+ / Spotify / HBO / Bilibili 等 18 个流媒体平台集合 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/streaming.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fstreaming.list%2C%20tag%3D%E6%B5%81%E5%AA%92%E4%BD%93%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/streaming.yaml) |
| **社交网络全量 (Social)** | Meta (Threads/IG/FB) / X / Telegram / Discord / Reddit / TikTok 等社交网络集合 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial.list%2C%20tag%3D%E7%A4%BE%E4%BA%A4%E7%BD%91%E7%BB%9C%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social.yaml) |
| **游戏全量 (Game)** | Steam 商店、社区与客户端游戏服务集合 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/game.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fgame.list%2C%20tag%3D%E6%B8%B8%E6%88%8F%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/game.yaml) |
| **AI 服务全量 (AI)** | ChatGPT / Claude / Gemini / Copilot / Grok / Cursor 等主流 AI 及开发工具 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fai.list%2C%20tag%3DAI%20%E6%9C%8D%E5%8A%A1%E5%88%86%E6%B5%81%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/ai.yaml) |
| **代理黑名单 (Proxy)** | 全量代理兜底（自动在编译层聚合所有 AI、社交网络、流媒体及通用代理规则） | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fproxy.list%2C%20tag%3D%E8%87%AA%E7%94%A8%E4%BB%A3%E7%90%86%E5%9F%9F%E5%90%8D%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/proxy.yaml) |
| **X （Twitter）** | 官方域名、图片 CDN 与客户端 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social/twitter.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial%2Ftwitter.list%2C%20tag%3DTwitter%E4%BB%A3%E7%90%86%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social/twitter.yaml) |
| **Telegram** | 官方域名、短链、媒体流及官方 DC IP-CIDR | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social/telegram.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial%2Ftelegram.list%2C%20tag%3DTelegram%E4%BB%A3%E7%90%86%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social/telegram.yaml) |
| **WeChat (直连)** | WeChat 文字/语音通话/朋友圈/支付等 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social/wechat.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial%2Fwechat.list%2C%20tag%3D%E5%BE%AE%E4%BF%A1%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social/wechat.yaml) |
| **App Store (直连)** | 商店下载相关域名 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/appstore.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fappstore.list%2C%20tag%3DAppStore%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/appstore.yaml) |
| **游戏直连 (Supercell)** | 荒野乱斗 / 皇室战争 / 部落冲突等全系 Supercell 游戏 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/game/supercell.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fgame%2Fsupercell.list%2C%20tag%3DSupercell%20%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/game/supercell.yaml) |

> 💡 **次级平台专属订阅**：各平台均独立生成单端规则，如 YouTube (`loon/streaming/youtube.lsr`)、Meta / Threads (`loon/social/meta.lsr`)、OpenAI (`loon/ai/openai.lsr`) 等，完整清单与路径请参阅 [rules/README.md](rules/README.md)。

---

## 4. 中间层规则源与一键全端编译 (Rule Compiler)

本项目采用**“中间层免语法书写 + 智能推断编译”**模式，集中人工维护自身刚需规则：

### 4.1 中间层书写规范 (`rules/*.txt`)
日常仅需在 [`rules/`](rules/) 中编辑对应文本，无需记忆各客户端语法：
* **纯域名**（自动识别为域名后缀）：直接写 `google.com` 或 `bitwarden.com`；
* **关键词**：写 `keyword: telegram` 或直接写纯英文单词 `telegram`；
* **精准全域名**：写 `exact: waa-pa.clients6.google.com`；
* **IP 网段**：直接写 `149.154.160.0/20`。

### 4.2 本地极速编译命令
```bash
# 1. 一键全量编译 (将 rules/*.txt 智能分发编译至 Loon、QX 三元组与 Mihomo)
node .github/scripts/build-rules.js

# 2. 命令行快速追加新域名至中间层并自动三端同步
node .github/scripts/build-rules.js --add example.com sub.org
node .github/scripts/build-rules.js --add claude.ai --target ai

# 3. 命令行快速追加关键词
node .github/scripts/build-rules.js --add-keyword twitter telegram
```

---

## 5. 配置、工具与更新日志 (Configs & Assets)

- **更新日志 (Changelog)**：[CHANGELOG.md](CHANGELOG.md)（记录各版本架构与规则集迭代）
- **Telegram 管理机器人 (someLoonBot)**：与本项目实时联动的分流规则管理控制中心，支持手机端交互式点选加规则与全库检索
- **BoxJS 订阅**：`https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json`（支持双端 VPS 凭据可视化配置）

