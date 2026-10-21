# RackNerd Status

RackNerd VPS 状态查询脚本 (基于 SolusVM API)。

## ✨ 功能

- 📊 实时监控：流量、内存、硬盘使用率及进度条
- ℹ️ 基本信息：IP 地址、地理位置（IP-API 查询）、节点、主机名
- 🟢 状态检测：在线 / 离线状态
- ⚙️ 双配置支持：支持 Loon 插件原生 UI 参数填写，亦兼容 BoxJS 存储配置

---

## 🚀 使用方式

### 方式一：Loon 插件（推荐，最简便）

直接导入 Loon 插件，支持在手机设置页原生输入 API Key、API Hash 及自定义查询时间，无需借助 BoxJS：

- **一键导入**: [点击导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/racknerd.plugin)
- **插件地址**:
  ```text
  https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/racknerd.plugin
  ```

---

### 方式二：传统定时脚本 + BoxJS

1. **获取 API 凭证**  
   登录 [RackNerd Control Panel](https://ctrl.racknerd.com/)，在对应的 VPS 实例中进入 `API`：
   - 确保启用 API（**Enable API**，未启用的 Key 会被服务器拒绝）；
   - 获取或生成 `API Key` & `API Hash`。

2. **配置方式**  
   - **BoxJS 订阅**:
     ```text
     https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/boxjs.json
     ```
     在 BoxJS 应用列表选择 `RackNerd 服务器状态`，填入 `API Key` 和 `API Hash`。

3. **脚本地址**:
   ```text
   https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/racknerd/racknerd.js
   ```
