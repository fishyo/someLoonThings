# Bandwagon Status

BandwagonHost VPS 状态查询脚本 (基于 KiwiVM API)。

## ✨ 功能

- 📊 流量监控：已用流量 / 剩余流量 / 进度条
- ℹ️ 基本信息：IP 地址、节点位置、流量重置日期、带宽倍数
- ⚙️ 双配置支持：支持 Loon 插件原生 UI 参数填写，亦兼容 BoxJS 存储配置

---

## 🚀 使用方式

### 方式一：Loon 插件（推荐，最简便）

直接导入 Loon 插件，支持在手机设置页原生输入 API Key、VEID 及自定义查询时间，无需借助 BoxJS：

- **一键导入**: [点击导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/bandwagon.plugin)
- **插件地址**:
  ```text
  https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/bandwagon.plugin
  ```

---

### 方式二：传统定时脚本 + BoxJS

1. **获取 API 凭证**  
   登录 [KiwiVM Control Panel](https://kiwivm.64clouds.com/) -> `API` -> `Generate New API Key`。  
   (VEID 可在面板顶部 URL 或首页概览中查看)。

2. **配置方式**  
   - **BoxJS 订阅**:
     ```text
     https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json
     ```
     在 BoxJS 应用列表选择 `Bandwagon 服务器状态`，填入 `API Key` 和 `VEID`。

3. **脚本地址**:
   ```text
   https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/bandwagon/bwg.js
   ```
