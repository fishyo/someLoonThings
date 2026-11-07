# 更新日志 (Changelog)

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范，记录所有重大版本迭代与规则库变更。

---

## [2026-11-06] - 规则分流体系重构与次级文件夹原子架构升级

### 🧹 平台目录结构完全同构化与孤立文件自动同步清理 (Structural Homomorphism & Auto-Pruning)
- **编译引擎支持父文件就地维护通用规则 (In-Place Master Local/General Rules)**：
  - 彻底打破“父文件只能只读覆盖”的机械限制：允许人类或 Bot 直接在 `rules/game.txt`、`rules/streaming.txt` 等父文件底部手写通用规则（如 `# General`）。
  - 编译器自动进行双向智能合并：提取非子文件来源的本地规则，原样保留在父文件底部，并自动三端编译装配及全量同步至 `proxy.lsr`。
  - 支持就地对称删除：在父文件里直接删除某条手写规则，下游全端与代理黑名单秒级同步剔除。
- **编译引擎自动垃圾回收 (Auto-Pruning Engine)**：
  - `build-rules.js` 增加 `pruneOrphans` 机制，在 `rules/` 源文件被删除时，全自动物理同步删除 Loon (`.lsr`)、Quantumult X (`.list`)、Mihomo (`.yaml`) 对应的废弃客户端规则，并自动递归清理各端空目录。
  - 彻底移除过度防御性吸收逻辑，确保用户的删除操作具备最高优先级权威，杜绝已删规则被逆向复活到其他文件。
- **绝对 1:1 镜像对齐**：三大平台（Loon, Quantumult X, Mihomo）的规则输出目录结构与源目录 `rules/` 达到绝对 100% 结构同构（现存各 43 个规则文件，0 缺失，0 冗余）。
- **废弃历史旧兼容别名 (Legacy Aliases Removed)**：
  - 彻底清理从根目录迁移入子文件夹后遗留的兼容别名：`twitter.*`、`telegram.*`、`wechat.*`、`supercell.*` 以及 `streaming/twitch.*` 共 15 个历史文件。
  - 编译引擎 `build-rules.js` 移除别名生成逻辑，全面转向子目录标准路径（如 `social/twitter.lsr`, `game/supercell.lsr` 等）。
  - 同步更新 README.md 与相关文档订阅链接至最新标准子路径。
- **游戏分流精简 (`rules/game/`)**：
  - 按需移除 `nintendo`、`playstation`、`xbox`、`twitch` 等独立规则，三端平台对应规则文件自动同步清理并从全量代理池中移除。
- **十轮深度检索落地：第 1~3 轮重点增补与海淘转运域名剔除 (10-Pass Audit: Rounds 1-3 & Shopping Pruning)**：
  - **增补第 1 轮（国际新闻、战略智库与学术顶刊）**：新增《外交政策》杂志（`foreignpolicy.com`）、美国外交关系协会 CFR（`cfr.org`）、《科学》杂志（`science.org`, `sciencemag.org`）、IEEE 电子电气工程师学会（`ieee.org`）、美国生物技术信息中心/PubMed（`ncbi.nlm.nih.gov`）。
  - **增补第 2 轮（前沿 AI 与大模型开发工具链）**：在 [`rules/ai/tools.txt`](file:///D:/Documents/code/someLoonThings/rules/ai/tools.txt) 中新增 LangChain 官方及调试平台（`langchain.com`）、Weights & Biases 资源（`weights.bi`）。
  - **增补第 3 轮（现代开发者生态与包管理）**：在 [`rules/proxy.txt`](file:///D:/Documents/code/someLoonThings/rules/proxy.txt) 中新增 PHP Composer 官方依赖仓与主站（`packagist.org`, `getcomposer.org`）。
  - **全面剔除海淘转运与国际物流域名**：彻底移除之前添加的日淘代购、中古店、同人店、国际转运与跨国物流查询域名共 14 条（`buyee.jp`, `tenso.com`, `mandarake.co.jp`, `toranoana.jp`, `melonbooks.co.jp`, `animate.co.jp`, `17track.net`, `post.japanpost.jp`, `kuronekoyamato.co.jp`, `usps.com`, `amazon.co.jp`, `ssl-images-amazon.com`, `amiami.com`, `suruga-ya.jp`）。
- **全量通用代理与分流规则 5 轮深度检索与体检升级 (5-Pass Deep Audit & Clean-up)**：
  - **盲区补全 (Coverage Additions)**：
    - **前沿 AI 与模型生态**：新增 Hugging Face 官方模型短链（`hf.co`）、Ollama 官方网站（`ollama.com`）与 Weights & Biases 实验记录平台（`wandb.ai`）。
    - **微软与海外网盘**：补齐 OneDrive 官方主域名（`onedrive.com`）、TeraBox 海外网盘（`terabox.com`）与 Fantia 日本创作者赞助平台（`fantia.jp`）。
    - **Google 亚太跳转**：新增台湾与新加坡节点常用跳转分支（`google.com.tw`, `google.com.sg`）。
    - **全球公共 CDN 与前端组件**：新增 BunnyCDN 全球网络（`bunny.net`, `b-cdn.net`）、CDN77（`cdn77.com`, `cdn77.net`）、Statically 静态源（`statically.io`）、PostHog 遥测（`posthog.com`）、Sentry JS SDK（`sentry-cdn.com`）及 Intercom / Crisp 在线客服（`intercom.io`, `intercomcdn.com`, `crisp.chat`）。
    - **海淘转运、国际物流与出行**：新增 Buyee（`buyee.jp`）、Tenso 转运（`tenso.com`）、Mandarake 中古店（`mandarake.co.jp`）、虎之穴（`toranoana.jp`）、Melonbooks（`melonbooks.co.jp`）、Animate（`animate.co.jp`）；新增 17TRACK 跨国快递追踪（`17track.net`）、日本邮政（`post.japanpost.jp`）、黑猫宅急便（`kuronekoyamato.co.jp`）、美国邮政（`usps.com`）；新增 Airalo 境外旅游 eSIM（`airalo.com`, `airalo.net`）、RedotPay 加密卡（`redotpay.com`）与天巡（`skyscanner.com`, `skyscanner.net`）、猫途鹰（`tripadvisor.com`）。
    - **开源隐私与代理工具**：新增 Ente 端到端加密相册与 2FA（`ente.io`）、Clash Verge Rev 官方发布页（`clashverge.dev`）、sing-box 官方主站（`sing-box.net`）与 KeePassXC（`keepassxc.org`）。
    - **二次元与阅读**：新增 Gelbooru（`gelbooru.com`）、Konachan（`konachan.com`, `konachan.net`）、Hitomi（`hitomi.la`）、nHentai（`nhentai.net`）、JavLibrary（`javlibrary.com`）；新增大西洋月刊（`theatlantic.com`）、外交事务杂志（`foreignaffairs.com`）、泰晤士报（`thetimes.co.uk`）。
  - **冗余消减与健康度体检 (Subdomain Subsumption & Clean-up)**：
    - **`proxy.txt` 清理 14 处冗余**：剔除 12 处被父域名完全包含的子域名（如 `aur.archlinux.org`, `raw.githubusercontent.com`, `api.ip.sb`, `play.google.com`, `checkout.stripe.com` 等）；移除 2 处已在子规则中专项收录的跨文件重复（`onorca.dev`, `ggpht.com`）。
    - **子规则集深层精简**：精简 `rules/ai/midjourney.txt` 中的 `cdn.midjourney.com`；精简 `rules/streaming/hulu.txt` 中的 `play.hulu.com`；精简 `rules/appstore.txt` 中已被 `itunes.apple.com` 与 `cdn-apple.com` 覆盖的 4 个子域名。

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
- **游戏专区体系升级 (`rules/game/`)**：
  - 新增 5 大游戏平台原子规则：`steam.txt`（Steam 商店/社区/聊天/广播）、`nintendo.txt`（Switch / eShop 全球各区服务）、`playstation.txt`（PSN 登录与商店）、`xbox.txt`（Xbox Live、Game Pass 服务）与 `twitch.txt`（游戏直播流）。
  - 从通用代理 `rules/proxy.txt` 中完全解耦剥离，源文件保持单一真理来源（SSOT），自动在编译层汇聚进 Master 全量代理 `proxy.lsr`。
  - 自动合成游戏代理 Master 规则 `rules/game.txt` / `loon/game.lsr`（覆盖 5 大主流平台），且与白名单 `game/supercell.txt` 严格隔离，互不干扰。
  - 流媒体 Master 规则 `streaming.lsr` 跨体系装配 Twitch，向后兼容别名 `loon/streaming/twitch.lsr` 永久有效。
  - 保留并扩充 Supercell 旗下全系游戏直连支持（Clash of Clans, Squad Busters, Hay Day, Boom Beach）。

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
