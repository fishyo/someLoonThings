# Bandwagon Status

BandwagonHost VPS 状态查询脚本 (基于 Kiwivm API)。

## ✨ 功能

- 📊 流量监控：已用流量/剩余流量/进度条
- ℹ️ 基本信息：IP、节点位置、流量重置日期
- ⚙️ BoxJS 管理：支持配置 API Key & VEID

## ⚙️ 配置指南

1. **获取凭证**  
   登录 [KiwiVM Control Panel](https://kiwivm.64clouds.com/) -> `API` -> `Generate New API Key`.
   (VEID 可在 URL 或面板首页查看)

2. **BoxJS 订阅**  
   添加订阅 URL:

   ```text
   https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json
   ```

3. **填写配置**  
   在 BoxJS 应用列表中选择 `Bandwagon 服务器状态`，填入 `API Key` 和 `VEID`。

## 🚀 安装链接

**脚本地址**:

```text
https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/bandwagon/bwg.js
```

**Loon 示例**:

```ini
[Script]
cron "0 9 * * *" script-path=https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/bandwagon/bwg.js, timeout=10, tag=Bandwagon
```
