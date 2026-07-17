# Some Loon Things

自用的 Loon、Mihomo 与 Egern 规则、插件及脚本合集。

## 快速导入

### Loon

| 名称 | 说明 | 一键导入 | 原始文件 |
| --- | --- | --- | --- |
| 自用拦截 | 广告拦截与 Rewrite 规则 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) |
| VPS 查询 | Bandwagon 与 RackNerd 状态通知 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/vps-tools.lpx) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/vps-tools.lpx) |
| 九号签到 | 获取凭据并每日自动签到 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.lpx) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.lpx) |
| Supercell 直连 | Supercell 游戏相关直连域名 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/supercell.lsr) |
| 代理规则 | 需要代理的域名集合 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr) |

### 其他客户端

| 客户端 | 配置 | 原始文件 |
| --- | --- | --- |
| Mihomo | 直连规则 | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/direct.yaml) |
| Mihomo | 代理规则 | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/mihomo/proxy.yaml) |
| Egern | 局域网规则 | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/egern/ruleset/lan.yaml) |

## 插件与小组件

| 文件 | 平台 | 说明 |
| --- | --- | --- |
| [`plugin/ad-block.lpx`](plugin/ad-block.lpx) | Loon | 广告拦截与 Rewrite 规则 |
| [`plugin/ad-block.yaml`](plugin/ad-block.yaml) | Egern | 广告拦截规则 |
| [`plugin/vps-tools.lpx`](plugin/vps-tools.lpx) | Loon | Bandwagon 与 RackNerd 定时查询 |
| [`plugin/ninebot.lpx`](plugin/ninebot.lpx) | Loon | 九号出行凭据获取与签到 |

## 平台兼容性

以下按钮加载当前测试分支，Bandwagon 与 RackNerd 共用同一个 VPS 工具模块。测试完成并合并到 `main` 前，请勿将这些地址当作稳定订阅。

| 功能 | Loon 一键添加 | Quantumult X 一键添加 | Egern 一键添加 |
| --- | --- | --- | --- |
| Bandwagon 查询 | [添加 VPS 工具](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/refactor/cross-platform-scripts/plugin/vps-tools.lpx) | [添加 VPS 工具](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Frefs%2Fheads%2Frefactor%2Fcross-platform-scripts%2Fquantumultx%2Fvps-tools.snippet%2C%20tag%3DVPS%20%E6%9F%A5%E8%AF%A2%E5%B7%A5%E5%85%B7%22%5D%7D) | [添加 VPS 工具](egern:/modules/new?name=VPS%20%E6%9F%A5%E8%AF%A2%E5%B7%A5%E5%85%B7&url=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Frefs%2Fheads%2Frefactor%2Fcross-platform-scripts%2Fegern%2Fvps-tools.yaml) |
| RackNerd 查询 | [添加 VPS 工具](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/refactor/cross-platform-scripts/plugin/vps-tools.lpx) | [添加 VPS 工具](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Frefs%2Fheads%2Frefactor%2Fcross-platform-scripts%2Fquantumultx%2Fvps-tools.snippet%2C%20tag%3DVPS%20%E6%9F%A5%E8%AF%A2%E5%B7%A5%E5%85%B7%22%5D%7D) | [添加 VPS 工具](egern:/modules/new?name=VPS%20%E6%9F%A5%E8%AF%A2%E5%B7%A5%E5%85%B7&url=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Frefs%2Fheads%2Frefactor%2Fcross-platform-scripts%2Fegern%2Fvps-tools.yaml) |
| 九号凭据与签到 | [添加九号签到](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/refactor/cross-platform-scripts/plugin/ninebot.lpx) | [添加九号签到](https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Frefs%2Fheads%2Frefactor%2Fcross-platform-scripts%2Fquantumultx%2Fninebot.snippet%2C%20tag%3D%E4%B9%9D%E5%8F%B7%E5%87%BA%E8%A1%8C%E7%AD%BE%E5%88%B0%22%5D%7D) | [添加九号签到](egern:/modules/new?name=%E4%B9%9D%E5%8F%B7%E5%87%BA%E8%A1%8C%E7%AD%BE%E5%88%B0&url=https%3A%2F%2Fraw.githubusercontent.com%2Ffishyo%2FsomeLoonThings%2Frefs%2Fheads%2Frefactor%2Fcross-platform-scripts%2Fegern%2Fninebot.yaml) |

如果 App 没有响应一键链接，可使用对应源文件手动添加：[Loon VPS](plugin/vps-tools.lpx)、[Loon 九号](plugin/ninebot.lpx)、[Quantumult X VPS](quantumultx/vps-tools.snippet)、[Quantumult X 九号](quantumultx/ninebot.snippet)、[Egern VPS](egern/vps-tools.yaml)、[Egern 九号](egern/ninebot.yaml)。

Loon 与 Quantumult X 共用经典脚本入口；Egern 使用 `script/egern/` 下的 ES Module 入口。Mihomo 目录只维护规则，不包含脚本。

## 脚本

BoxJS 订阅地址：

```text
https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json
```

| 脚本 | 说明 | 文档 |
| --- | --- | --- |
| [`script/bandwagon/bwg.js`](script/bandwagon/bwg.js) | Bandwagon VPS 状态查询，支持 BoxJS | [使用说明](script/bandwagon/README.md) |
| [`script/racknerd/racknerd.js`](script/racknerd/racknerd.js) | RackNerd VPS 状态查询，支持 BoxJS | [使用说明](script/racknerd/README.md) |
| [`script/9bot/9bot_cookie.js`](script/9bot/9bot_cookie.js) | 获取九号出行签到所需凭据 | — |
| [`script/9bot/9botsign.js`](script/9bot/9botsign.js) | 九号出行自动签到 | — |

## 目录结构

```text
.
├─ egern/       # Egern 规则与模块
├─ icons/       # 插件图标
├─ loon/        # Loon 规则集
├─ mihomo/      # Mihomo rule-provider
├─ plugin/      # Loon 与 Egern 插件配置
├─ quantumultx/ # Quantumult X 配置片段
└─ script/      # 定时任务、BoxJS 配置和工具脚本
```

## 安全说明

- API Key、API Hash、VEID 和登录凭据只应保存在客户端本地持久化存储中，不要提交到仓库。
- 仓库通过 pre-commit 的 gitleaks hook 检查潜在密钥泄露。
- 使用远程脚本前建议先查看源代码，并按需限制脚本的网络访问权限。

## License

MIT
