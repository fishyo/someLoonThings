# 更新日志 (Changelog)

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范，记录所有重大版本迭代与规则库变更。

---

## [2026-11-06] - 规则分流体系重构与次级文件夹原子架构升级

### 🚀 架构革新 (Architecture)
- **主规则与次级原子文件夹装配架构 (Declarative Target Assembly Architecture)**：
  - 将庞杂的平铺规则源彻底分层，创建结构化子目录：`rules/streaming/`（18 个流媒体平台）、`rules/social/`（7 个社交平台）、`rules/ai/`（10 个 AI 模块）及 `rules/game/`。
  - **单一真实来源 (SSOT)**：所有源文件均为纯粹原子文件，绝无跨文件物理重复，亦无任何机器标记。
  - **声明式自动合成**：编译引擎（`build-rules.js`）自动探测子目录，分别在内存和根目录合成各体系的 Master 规则（`rules/streaming.txt`、`rules/social.txt`、`rules/ai.txt`、`rules/game.txt`）。
  - **主从覆盖汇聚**：全量代理黑名单（`proxy.lsr`, `proxy.list`, `proxy.yaml`）自动汇聚 `streaming/* + social/* + ai/* + proxy`，保证通用翻墙黑名单绝对完备无遗漏。
  - **孤立规则防御性吸收机制 (Defensive Orphan Absorption)**：编译引擎新增自愈逻辑，若检测到外部工具或人工向合成分流文件直接写入规则，自动将孤立规则吸收到对应的默认原子子规则（如 `ai/tools.txt`, `social/meta.txt`），实现双保险零丢漏。

### 🌐 规则集完善与扩充 (Rulesets)
- **Meta / Threads 深度完善与 IP-CIDR 补全 (`rules/social/meta.txt`)**：
  - 全面补充 Threads 核心域名：`threads.com`, `threads.net`。
  - 补充 Instagram、Facebook、WhatsApp、Messenger、Oculus 官方 CDN 与边缘节点域名。
  - 检索并收录 Meta 官方自治系统 **AS32934** 核心网段：**14 个 IPv4 CIDR** 与 **3 个 IPv6 CIDR**，彻底解决移动端 App 图片加载转圈与流媒体握手超时问题。
- **社交网络体系 (`rules/social/`)**：
  - 新增 `discord.txt`、`reddit.txt`、`tiktok.txt` 独立原子片段。
  - 迁移并重构 `twitter.txt`、`telegram.txt`（补充 Fragment 域名及 IPv6 CIDR）与 `wechat.txt`。
  - **三端无缝兼容别名**：旧版订阅链接（`loon/twitter.lsr`, `quanX/rules/twitter.list`, `mihomo/twitter.yaml`, `telegram.*`）由编译引擎自动映射产出，历史用户订阅零破坏。
- **流媒体平台体系 (`rules/streaming/`)**：
  - 拆分收录 18 个独立平台：`youtube`, `netflix`, `disney`, `spotify`, `bilibili`, `bahamut`, `hbo`, `primevideo`, `hulu`, `twitch`, `abema`, `dazn`, `paramount`, `peacock`, `crunchyroll`, `music`, `japan`, `podcast`。
  - 补全各大主流平台的关键 CDN、Live API 及周边域名（如 `ggpht.com`, `dssedge.com`, `h264.io`, `crunchyrollsvc.com`, `live-video.net` 等）。
- **AI 智能服务体系 (`rules/ai/`)**：
  - 细化拆分为 10 个独立平台/模块：`openai`, `claude`, `gemini`, `copilot`, `grok`, `perplexity`, `midjourney`, `tools`, `models`, `media`。
  - 紧跟 2026 年最新生态，补充 Cursor, Windsurf, Bolt, Lovable, Manus, Poe, Dify 等 AI 开发工具，以及 FLUX, Ideogram, Runway, Luma 等媒体生成平台。
- **游戏专区 (`rules/game/supercell.txt`)**：
  - 扩充 Supercell 旗下全系游戏支持（Clash of Clans, Squad Busters, Hay Day, Boom Beach）。

### 🤖 管理机器人协同升级 (`someLoonBot`)
- **方案 B 协同重构**：
  - **两级分层点选交互 (Two-Tiered UX)**：用户发送域名时，首屏展现分类概览卡片，点击分类就地切换展示该分类下所有专属子平台，告别平铺 39 个按钮的臃肿排版。
  - **智能别名与简写解析**：全面支持 `/add <domain> tools`、`/add <domain> meta`、`/add <domain> youtube` 等自然语义缩写。
  - **合成 Master 文件防篡改**：自动屏蔽合成文件写入，杜绝编译被覆盖丢漏。
  - **Telegram 64 字节回调硬防护**：对深层子路径精准计算 callback_data 长度，彻底杜绝 `BUTTON_DATA_INVALID` 异常。

### 🛡️ 质量与规范 (Quality & Validation)
- 所有规则源文件及编译生成文件中的注释严格执行**纯英文极简标准 (Strictly English Only)**，杜绝任何中文。
- 各模块内部规则严格维持 **A-Z 字典升序** 排列。
- Quantumult X 规则集强制合规三元组结构。
- 自动化校验脚本（`validate.js`）递归升级，**41 个全端规则集与沙盒仿真测试 100% 全部通过**。
