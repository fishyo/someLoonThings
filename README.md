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

| 规则 | 说明 | Loon | Quantumult X | Mihomo |
| :--- | :--- | :---: | :---: | :---: |
| **AI 服务** | ChatGPT / Claude / Gemini / Grok 等主流大模型 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/ai.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fai.list%2C%20tag%3DAI%20%E6%9C%8D%E5%8A%A1%E5%88%86%E6%B5%81%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/ai.yaml) |
| **自用代理** | Cloudflare / Bitwarden 等常用代理补充 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fproxy.list%2C%20tag%3D%E8%87%AA%E7%94%A8%E4%BB%A3%E7%90%86%E5%9F%9F%E5%90%8D%2C%20force-policy%3Dproxy%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/proxy.yaml) |
| **游戏直连** | 荒野乱斗 / 皇室战争等 Supercell 直连 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) | [导入](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22filter_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Fmain%2FquanX%2Frules%2Fsupercell.list%2C%20tag%3DSupercell%20%E7%9B%B4%E8%BF%9E%2C%20force-policy%3Ddirect%2C%20enabled%3Dtrue%22%5D%7D) | [查看](mihomo/direct.yaml) |

---

## 配置与资源 (Configs & Assets)

- **BoxJS 订阅**：`https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json`（支持双端 VPS 凭据可视化配置）

