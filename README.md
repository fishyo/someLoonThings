# Some Loon Things

自用的 Loon、Mihomo 与 Egern 规则、插件及脚本合集。

## 快速导入

### Loon

| 名称 | 说明 | 一键导入 | 原始文件 |
| --- | --- | --- | --- |
| 自用拦截 | 广告拦截与 Rewrite 规则 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) | [查看](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx) |
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
├─ egern/       # Egern 规则集
├─ icons/       # 插件图标
├─ loon/        # Loon 规则集
├─ mihomo/      # Mihomo rule-provider
├─ plugin/      # Loon 与 Egern 插件配置
├─ script/      # 定时任务、BoxJS 配置和工具脚本
└─ script/      # 定时任务、BoxJS 配置和工具脚本
```

## 安全说明

- API Key、API Hash、VEID 和登录凭据只应保存在客户端本地持久化存储中，不要提交到仓库。
- 仓库通过 pre-commit 的 gitleaks hook 检查潜在密钥泄露。
- 使用远程脚本前建议先查看源代码，并按需限制脚本的网络访问权限。

## License

MIT
