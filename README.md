# someLoonThings

自用 Loon、Quantumult X 与 Mihomo 的插件、复写片段、分流规则及脚本合集。

> 说明：Loon 配置经长期实测；Quantumult X 规则与脚本已按官方规范适配，尚未严格测试。

---

## 插件与任务

### Loon 插件

| 插件 | 说明 | 导入 |
| :--- | :--- | :--- |
| 9bot | 九号签到与 Cookie 抓取 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.plugin) |
| 搬瓦工 | VPS 流量与运行状态查询 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/bandwagon.plugin) |
| RackNerd | VPS 流量、内存与状态查询 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/racknerd.plugin) |
| Cloudflare | Workers 每日免费请求配额（10 万次/天）与用量监控 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/cloudflare.plugin) |
| 自用拦截 | 少数派防盗链、开屏去广告等 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) |

### Quantumult X（尚未严格测试）

- **任务仓库（Task Gallery）**：包含 9bot（自动联动 Cookie 抓取）、搬瓦工、RackNerd 与 Cloudflare 的定时任务
  - [一键导入任务仓库](https://quantumult.app/x/open-app/ui?module=gallery&type=task&action=add&content=%5B%22https%3A%2F%2Ffastly.jsdelivr.net%2Fgh%2Ffishyo%2FsomeLoonThings%40main%2FquanX%2Fgallery.json%22%5D)
  - 仓库直链：`https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/quanX/gallery.json`
- **自用拦截（Rewrite）**：[一键导入复写](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Fad-block.snippet%2C%20tag%3D%E8%87%AA%E7%94%A8%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%22%5D%7D)

---

## 分流规则集

项目采用「主集合规则 + 独立子规则」架构：主集合适合策略组整体绑定，子规则（如 YouTube、OpenAI、Meta 等）可独立订阅进行精细分流。详见 [分流架构与使用指南](rules/README.md)。

| 规则 | 说明 | Loon | Quantumult X | Mihomo |
| :--- | :--- | :--- | :--- | :--- |
| 流媒体全量 | YouTube / Netflix / Disney+ / Spotify / HBO / Bilibili 等 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/streaming.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fstreaming.list%2C%20tag%3D%E6%B5%81%E5%AA%92%E4%BD%93%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/streaming.yaml) |
| 社交网络全量 | Meta（Threads/IG/FB）、X、Telegram、Discord、Reddit、TikTok 等 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial.list%2C%20tag%3D%E7%A4%BE%E4%BA%A4%E7%BD%91%E7%BB%9C%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social.yaml) |
| 游戏全量 | Steam 商店、社区与客户端游戏服务 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/game.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fgame.list%2C%20tag%3D%E6%B8%B8%E6%88%8F%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/game.yaml) |
| Microsoft 全量 | Microsoft 官方服务、Azure、Office、OneDrive 与 GitHub | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/microsoft.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fmicrosoft.list%2C%20tag%3DMicrosoft%E5%85%A8%E9%87%8F%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/microsoft.yaml) |
| AI 服务全量 | ChatGPT / Claude / Gemini / Copilot / Grok / Cursor 等 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fai.list%2C%20tag%3DAI%20%E6%9C%8D%E5%8A%A1%E5%88%86%E6%B5%81%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/ai.yaml) |
| 代理黑名单 | 全量代理兜底（编译时自动聚合 AI、社交、流媒体及通用代理规则） | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fproxy.list%2C%20tag%3D%E8%87%AA%E7%94%A8%E4%BB%A3%E7%90%86%E5%9F%9F%E5%90%8D%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/proxy.yaml) |
| X（Twitter） | 官方域名、图片 CDN 与客户端 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social/twitter.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial%2Ftwitter.list%2C%20tag%3DTwitter%E4%BB%A3%E7%90%86%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social/twitter.yaml) |
| Telegram | 官方域名、短链、媒体流及官方 DC IP-CIDR | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social/telegram.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial%2Ftelegram.list%2C%20tag%3DTelegram%E4%BB%A3%E7%90%86%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social/telegram.yaml) |
| WeChat（直连） | 文字/语音通话、朋友圈、支付等 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/social/wechat.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsocial%2Fwechat.list%2C%20tag%3D%E5%BE%AE%E4%BF%A1%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/social/wechat.yaml) |
| App Store（直连） | 商店下载相关域名 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/appstore.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fappstore.list%2C%20tag%3DAppStore%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/appstore.yaml) |
| 游戏直连（Supercell） | 荒野乱斗、皇室战争、部落冲突等 Supercell 游戏 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/game/supercell.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fgame%2Fsupercell.list%2C%20tag%3DSupercell%20%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/game/supercell.yaml) |

> 各平台独立子规则（如 YouTube、Meta、OpenAI、GitHub、OneDrive 等）也单独生成订阅，完整清单见 [rules/README.md](rules/README.md)。

---

## 规则编译引擎

`rules/*.txt` 是唯一的规则源文件，只需维护纯文本，编译器会自动推断语法并同步编译到三端。日常编辑对应 `.txt` 文件即可，无需记忆各客户端语法：

- 域名后缀：直接写 `google.com`
- 关键词：写 `keyword: telegram` 或直接写 `telegram`
- 精准域名：写 `exact: waa-pa.clients6.google.com`
- IP 网段：直接写 `149.154.160.0/20`

```bash
# 全量编译（rules/*.txt 分发至 Loon、Quantumult X、Mihomo）
node .github/scripts/build-rules.js

# 快速追加域名，并自动同步三端
node .github/scripts/build-rules.js --add example.com sub.org
node .github/scripts/build-rules.js --add claude.ai --target ai

# 快速追加关键词
node .github/scripts/build-rules.js --add-keyword twitter telegram
```

---

## 其他

- **更新日志**：[CHANGELOG.md](CHANGELOG.md)
- **Telegram 管理机器人（someLoonBot）**：与项目联动，可在手机端交互式添加规则与检索全库
- **BoxJS 订阅**：`https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json`（支持双端 VPS 凭据可视化配置）
