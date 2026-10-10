# RackNerd Status

RackNerd VPS 状态查询脚本 (基于 SolusVM API)。

## ✨ 功能

- 实时监控：流量、内存、硬盘使用率
- � 状态检测：在线/离线状态
- ⚙️ BoxJS 管理：支持多账号/多配置

## ⚙️ 配置指南

1. **获取凭证**  
   登录 [RackNerd Control Panel](https://ctrl.racknerd.com/)，在对应的 VPS 实例中进入 `API`：
   - 确保启用 API（**Enable API**，未启用的 Key 会被服务器拒绝）
   - 获取或生成 `API Key` & `API Hash`。

2. **BoxJS 订阅**  
   添加订阅 URL:

   ```text
   https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json
   ```

3. **填写配置**  
   在 BoxJS 应用列表中选择 `RackNerd 服务器状态`，填入 `API Key` 和 `API Hash`。

## 🚀 安装链接

**脚本地址**:

```text
https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/racknerd/racknerd.js
```

**Loon 示例**:

```ini
[Script]
cron "0 9 * * *" script-path=https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/racknerd/racknerd.js, timeout=10, tag=RackNerd
```
