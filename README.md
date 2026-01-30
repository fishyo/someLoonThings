# Some Loon Things

自用 Loon 脚本、规则和插件仓库，支持一键导入。

## 🚀 一键导入

### 插件

| 插件     | 描述                              | 一键导入                                                                                                                                 |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 自用拦截 | 广告拦截与 Rewrite 规则           | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx)   |
| 节点信息 | 查询节点外网 IP、地理位置及运营商 | [导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/nodeIpInfo.lpx) |

### 规则

| 规则     | 描述                     | 一键导入                                                                                                                          |
| -------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 直连规则 | Supercell 游戏等直连域名 | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/direct.lsr) |
| 代理规则 | 需要代理的域名集合       | [导入](https://www.nsloon.com/openloon/import?rules=https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr)  |

## 📋 插件详情

### 自用拦截

广告拦截、Rewrite 规则。

### 节点信息

查询节点 IP、地理位置、运营商信息。支持 IPv4/IPv6 双栈查询。

**使用方法**: 节点列表长按 → 脚本 → 节点信息

## 📜 脚本说明

| 脚本            | 说明                               |
| --------------- | ---------------------------------- |
| `bwg.js`        | Bandwagon VPS 状态查询，支持 BoxJS |
| `nodeIpInfo.js` | 节点 IP 信息查询                   |
| `9bot`          | 9号出行自动签到                    |

## 📝 手动导入

```
# 插件
https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ad-block.lpx
https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/nodeIpInfo.lpx

# 规则
https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/direct.lsr
https://raw.githubusercontent.com/fishyo/someLoonThings/main/loon/proxy.lsr
```

## 📄 License

MIT
