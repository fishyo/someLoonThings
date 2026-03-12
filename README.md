# Some Loon Things

自用 Loon 脚本、规则和插件仓库，支持一键导入。

## 🚀 快速导入

| 名称     | 描述                              | 一键导入                                                                                                                                 | 链接                                                                                       |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 自用拦截 | 广告拦截与 Rewrite 规则           | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx)   | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx)   |
| 节点信息 | 查询节点外网 IP、地理位置及运营商 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/nodeIpInfo.lpx) | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/nodeIpInfo.lpx) |
| 直连规则 | Supercell 游戏等直连域名          | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/direct.lsr)        | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/direct.lsr)       |
| 代理规则 | 需要代理的域名集合                | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr)         | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr)        |
| AI 检测  | 检测 ChatGPT/Claude/Gemini 等可用性 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/AI_Check.plugin) | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/AI_Check.plugin) |


## 📋 插件详情

### 自用拦截

广告拦截、Rewrite 规则。

### 节点信息

查询节点 IP、地理位置、运营商信息。支持 IPv4/IPv6 双栈查询。

**使用方法**: 节点列表长按 → 脚本 → 节点信息

### AI 检测

一键检测当前节点对主流 AI 服务 (ChatGPT, Claude, Gemini, Copilot) 的连通性。

**功能特点**:
- 支持深度检测 Gemini 地区限制（不再仅依赖状态码）。
- 支持检测 Claude 地区封锁。
- 通过 BoxJS 可自定义检测超时时间。
- 结果通过系统通知即时弹出。

**使用方法**: 点击插件列表或脚本列表中的“运行”按钮。

## 📜 脚本说明

**BoxJS 订阅**: `https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json`

| 脚本            | 说明                               | 链接                                                                                                    |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `bwg.js`        | Bandwagon VPS 状态查询，支持 BoxJS | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/bandwagon/bwg.js)            |
| `racknerd.js`   | RackNerd VPS 状态查询，支持 BoxJS  | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/racknerd/racknerd.js)        |
| `nodeIpInfo.js` | 节点 IP 信息查询                   | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/nodeInfoCheck/nodeIpInfo.js) |
| `ai_check.js`   | AI 服务可用性检测，支持深度 Gemini 检测 | [复制](https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/aiCheck/ai_check.js)         |


## 📄 License

MIT
