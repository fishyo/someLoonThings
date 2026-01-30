# 节点IP信息查询脚本（现代化增强版）

## ✨ 核心特性

### 🏎️ 竞速机制 (Racing)

- **并行请求**：所有 IP 查询 API 同时发起请求
- **谁快用谁**：哪个 API 先返回有效结果就用哪个
- **大幅提速**：相比传统的依次尝试，速度提升 3-5 倍

### 🎯 多点延迟测试

- **多服务器测试**：同时测试 Google、Apple、Huawei 等多个测试点
- **取最优结果**：避免单一服务器波动导致评分偏差
- **更准确**：真实反映节点的最佳性能

### 💎 代码现代化

- **async/await 风格**：彻底告别 callback 地狱
- **无递归调用**：逻辑清晰，易于维护
- **Promise.race**：充分利用 JavaScript 现代特性

### 🛡️ 健壮性增强

- **空值安全**：对 `$utils` 返回值进行完善的空值检查
- **错误处理**：每个环节都有详细的错误日志
- **降级策略**：即使部分功能失败，仍能显示可用信息

### 📱 视觉优化

- **紧凑排版**：适配手机通知中心的显示
- **层次分明**：使用缩进和空行，信息一目了然
- **Emoji 指示**：直观的视觉反馈

## 功能说明

这是一个用于 Loon 的 generic 类型脚本，可以查询指定节点的详细IP信息，包括：

- 🌐 **IPv4/IPv6 双栈检测**：竞速查询节点的 IPv4 和 IPv6 地址
- 🗺️ **地理位置**：IP所属的国家/地区
- 🔢 **ASN信息**：自治系统编号（Autonomous System Number）
- 🏢 **运营商信息**：IP所属的运营商/组织（ASO）
- ⚡ **延迟测试**：多点测试节点的响应速度
- ⭐ **网络质量评分**：综合评估节点质量（满分100分）

## 使用方法

### 1. 添加脚本到Loon配置

在 Loon 的配置文件中的 `[Script]` 部分添加以下内容：

```ini
[Script]
generic script-path=https://raw.githubusercontent.com/你的用户名/someLoonThings/main/script/nodeIpInfo.js, tag=节点IP查询, timeout=15, img-url=network.badge.shield.half.filled.system
```

或者使用本地路径（如果你已经下载了脚本）：

```ini
[Script]
generic script-path=nodeIpInfo.js, tag=节点IP查询, timeout=15, img-url=network.badge.shield.half.filled.system
```

> ⚠️ **注意**：由于增加了双栈检测和延迟测试，建议将 `timeout` 设置为 **15秒** 或更长。

### 2. 运行脚本

1. 打开 Loon 应用
2. 进入「配置」→「脚本」
3. 找到「节点IP查询」脚本
4. 点击脚本，选择你想查询的节点
5. 点击「运行」按钮

### 3. 查看结果

脚本会通过系统通知显示查询结果，包含：

- IPv4 和 IPv6 地址（如果支持）
- 地理位置（国家/地区代码和中文名称）
- ASN编号和运营商信息
- 节点延迟（毫秒）
- 网络质量评分和等级

## 配置参数说明

| 参数          | 说明                      | 推荐值                                    |
| ------------- | ------------------------- | ----------------------------------------- |
| `script-path` | 脚本路径（URL或本地路径） | `nodeIpInfo.js`                           |
| `tag`         | 脚本显示名称              | `节点IP查询`                              |
| `timeout`     | 超时时间（秒）            | `15`（增强版需要更长时间）                |
| `img-url`     | 图标（SF Symbols）        | `network.badge.shield.half.filled.system` |

## 新功能详解

### 📡 IPv4/IPv6 双栈检测

脚本会**并行**查询节点的 IPv4 和 IPv6 地址：

- ✅ **同时支持**：显示两个地址
- ✅ **仅 IPv4**：仅显示 IPv4 地址
- ✅ **仅 IPv6**：仅显示 IPv6 地址（少见）
- ❌ **都不支持**：显示错误信息

**为什么重要？**

- IPv6 支持是现代网络的趋势
- 某些服务可能需要 IPv6 才能访问
- 双栈节点通常质量更好

### ⚡ 延迟测试

脚本会测试节点的实际响应延迟：

| 延迟范围  | 等级 | 图标 | 说明         |
| --------- | ---- | ---- | ------------ |
| < 50ms    | 优秀 | 🟢   | 非常流畅     |
| 50-100ms  | 良好 | 🟡   | 正常使用     |
| 100-200ms | 一般 | 🟠   | 可能有卡顿   |
| 200-500ms | 较慢 | 🔴   | 明显延迟     |
| > 500ms   | 很慢 | 🔴   | 体验较差     |
| 测试失败  | -    | -    | 节点可能异常 |

**测试方法：**

- 使用 Google、Apple 等可靠的连通性检测服务
- 测量完整的请求-响应时间
- 包含 DNS 解析和网络传输时间

### ⭐ 网络质量评分

综合评估节点质量，满分 **100分**：

#### 评分标准

1. **IPv4 支持**（30分）
   - 支持 IPv4：+30分
   - 不支持：0分

2. **IPv6 支持**（20分，加分项）
   - 支持 IPv6：+20分
   - 不支持：0分

3. **延迟评分**（50分）
   - < 50ms：+50分（优秀）
   - 50-100ms：+40分（良好）
   - 100-200ms：+30分（一般）
   - 200-500ms：+20分（较慢）
   - > 500ms：+10分（很慢）
   - 测试失败：0分

#### 等级划分

| 总分     | 等级 | 说明               |
| -------- | ---- | ------------------ |
| 90-100分 | S    | 优秀节点，推荐使用 |
| 80-89分  | A    | 良好节点           |
| 70-79分  | B    | 合格节点           |
| 60-69分  | C    | 一般节点           |
| 50-59分  | D    | 较差节点           |
| < 50分   | F    | 不推荐使用         |

## 示例输出

### 示例 1：优质双栈节点

```
节点信息
HK - Premium

📡 IP地址
IPv4: 103.152.220.123
IPv6: 2406:da18:880:3801::1

🌍 地理位置
香港 (HK)

🏢 网络信息
ASN: AS9381
运营商: Hong Kong Broadband Network Ltd.

⚡ 性能测试
延迟: 45ms 🟢

⭐ 质量评分
评分: 100/100 (S级)
✓ IPv4 | ✓ IPv6 | ✓ 延迟优秀
```

### 示例 2：仅 IPv4 节点

```
节点信息
US - Standard

📡 IP地址
IPv4: 192.0.2.1

🌍 地理位置
美国 (US)

🏢 网络信息
ASN: AS15169
运营商: Google LLC

⚡ 性能测试
延迟: 180ms 🟠

⭐ 质量评分
评分: 60/100 (C级)
✓ IPv4 | ✗ IPv6 | ⚠ 延迟一般
```

### 示例 3：高延迟节点

```
节点信息
AU - Basic

📡 IP地址
IPv4: 203.0.113.1

🌍 地理位置
澳大利亚 (AU)

🏢 网络信息
ASN: AS13335
运营商: Cloudflare, Inc.

⚡ 性能测试
延迟: 350ms 🔴

⭐ 质量评分
评分: 50/100 (D级)
✓ IPv4 | ✗ IPv6 | ⚠ 延迟较慢
```

## 技术细节

### IP查询API

#### IPv4 查询API

1. `https://api.ipify.org?format=json` - 主要API
2. `https://api.ip.sb/ip` - 备用API
3. `https://ipv4.icanhazip.com` - 备用API
4. `https://v4.ident.me` - 备用API

#### IPv6 查询API

1. `https://api64.ipify.org?format=json` - 主要API
2. `https://api6.ipify.org?format=json` - 备用API
3. `https://ipv6.icanhazip.com` - 备用API
4. `https://v6.ident.me` - 备用API

#### 延迟测试URL

1. `http://www.gstatic.com/generate_204` - Google
2. `http://captive.apple.com/hotspot-detect.html` - Apple
3. `http://connectivitycheck.platform.hicloud.com/generate_204` - Huawei

### 性能优化

- **并行查询**：IPv4、IPv6 和延迟测试同时进行，节省时间
- **智能降级**：如果主API失败，自动尝试备用API
- **超时控制**：每个请求都有独立的超时设置，避免长时间等待

### Loon API使用

脚本使用了以下 Loon Script API：

- `$environment.params.node` - 获取节点名称
- `$environment.params.nodeInfo` - 获取节点详细信息
- `$httpClient.get()` - 发送 GET 请求
- `$httpClient.head()` - 发送 HEAD 请求（延迟测试）
- `$utils.geoip()` - 查询IP的地理位置
- `$utils.ipasn()` - 查询IP的ASN
- `$utils.ipaso()` - 查询IP的ASO
- `$notification.post()` - 显示系统通知
- `Promise.all()` - 并行执行多个异步任务

## 故障排除

### 问题：无法获取 IPv6 地址

**可能原因：**

- 节点不支持 IPv6
- 本地网络不支持 IPv6
- IPv6 查询API不可用

**解决方法：**

- 这是正常现象，大部分节点只支持 IPv4
- 脚本会继续显示 IPv4 信息

### 问题：延迟测试失败

**可能原因：**

- 节点连接不稳定
- 测试URL被屏蔽
- 网络超时

**解决方法：**

1. 增加脚本的 `timeout` 参数（如改为20秒）
2. 检查节点是否正常工作
3. 查看 Loon 日志获取详细错误信息

### 问题：质量评分偏低

**可能原因：**

- 节点延迟较高
- 不支持 IPv6
- 节点距离较远

**说明：**

- 评分仅供参考，实际使用体验可能因应用而异
- 某些场景下，高延迟节点可能仍然可用

### 问题：查询时间较长

**原因：** 增强版需要查询更多信息

**解决方法：**

- 确保 `timeout` 设置为 15秒 或更长
- 这是正常现象，通常在 5-10秒 内完成

## 注意事项

1. ⚠️ 此脚本需要节点能够正常连接互联网
2. ⚠️ 查询结果的准确性取决于IP数据库的质量
3. ⚠️ 某些节点可能会屏蔽IP查询API，导致查询失败
4. ⚠️ 脚本需要 Loon 版本支持 generic 脚本类型
5. ⚠️ 延迟测试结果可能因网络波动而有所变化
6. ⚠️ IPv6 支持取决于节点和本地网络环境

## 更新日志

### v2.0.0 (2026-01-30)

- ✨ 新增 IPv4/IPv6 双栈检测
- ✨ 新增延迟测试功能
- ✨ 新增网络质量评分系统
- ✨ 优化查询性能（并行请求）
- ✨ 改进结果展示格式
- 🐛 修复 "empty content" 提示问题

### v1.0.0 (2026-01-30)

- ✨ 初始版本
- ✨ 支持IP地址查询
- ✨ 支持地理位置、ASN、ASO信息查询
- ✨ 多个备用API确保查询成功率

## 许可证

MIT License

## 相关链接

- [Loon 官方文档](https://nsloon.app/docs/intro)
- [Loon 脚本类型说明](https://nsloon.app/docs/Script/)
- [Loon Script API](https://nsloon.app/docs/Script/script_api)
