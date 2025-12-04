# Bandwagon 服务器状态查询脚本 - BoxJS 版本

这是一个支持 BoxJS 配置的 Bandwagon 服务器状态查询脚本，可以在 Loon、Surge、QuantumultX 等代理软件中使用。

## 功能特性

✅ 通过 BoxJS 动态配置 API Key 和 VEID，无需修改脚本  
✅ 实时查询 Bandwagon 服务器带宽使用情况  
✅ 可视化进度条显示带宽使用百分比  
✅ 支持定时任务，可定期自动查询  
✅ 完善的错误处理和提示信息

## 安装步骤

### 第一步：在 Loon 中安装 BoxJS

Loon 配置方法：

```
配置 > 插件 > 插件

插件地址: https://raw.githubusercontent.com/chavyleung/scripts/master/box/rewrite/boxjs.rewrite.loon.plugin
```

或使用一键安装链接（Loon 2.1.19 及以上）:  
https://api.boxjs.app/loon-install

### 第二步：添加脚本到 Loon

在 Loon 配置文件中添加以下内容：

```ini
[Script]
# Bandwagon 服务器状态查询
bandwagon = type=http-request, pattern=^https?://api\.boxjs\.app/query, script-path=bandwagonhost-boxjs-loon.js, timeout=10, tag=Bandwagon

# 可选：定时任务 - 每小时查询一次
bandwagon-cron = type=cron, cronexp="0 * * * *", script-path=bandwagonhost-boxjs-loon.js, timeout=10, tag=Bandwagon_Cron
```

**脚本文件放置位置:**  
将 `bandwagonhost-boxjs-loon.js` 文件放在 Loon 的脚本目录中。

### 第三步：在 BoxJS 中配置 API Key 和 VEID

1. 打开 BoxJS: http://boxjs.com
2. 搜索或找到 "Bandwagon"
3. 填入以下配置项：
   - **API Key**: 你的 Bandwagon API 密钥
   - **VEID**: 你的 VPS 编号

#### 如何获取 API Key 和 VEID？

**获取 API Key:**

1. 登录 Bandwagon Panel: https://bwh2.net/
2. 访问 API: https://bwh2.net/clientapi/index/getsysconfig?api_key=YOUR_API_KEY
3. 或在 Account > API > Generate New Key

**获取 VEID:**

1. 登录 Bandwagon Panel
2. 在 Services 或 Active Products 中查看
3. 单个 VPS 页面 URL 中的 `veid` 参数

或者调用 API:

```
https://api.64clouds.com/v1/listAllProducts?api_key=YOUR_API_KEY
```

## 使用方法

### 手动查询

在 Loon 中手动执行脚本：

1. Loon 主界面 > 脚本 > 点击相应的脚本名称执行

### 定时查询

如果配置了 cron 任务，脚本将按照设定时间自动执行：

- `0 * * * *` - 每小时执行一次
- `0 9 * * *` - 每天早上 9 点执行
- `*/30 * * * *` - 每 30 分钟执行一次

## 脚本输出

脚本执行后会显示通知，包含以下信息：

```
🖲️ Bandwagon 服务器状态
45.76% 已用

VPS: vps.example.com
IP: 1.2.3.4
位置: Los Angeles Premium

带宽: 4.50 / 10.00 GB
进度: ████████░░ 45.00%
倍数: 1x
重置: 2024/12/31
```

## 配置项说明

| 项目    | 说明               | 获取方式                        |
| ------- | ------------------ | ------------------------------- |
| API Key | Bandwagon API 密钥 | Bandwagon Panel > Account > API |
| VEID    | VPS 产品编号       | 登录面板查看产品列表            |

## 故障排除

### 显示"配置不完整"

**原因**: 未在 BoxJS 中配置 API Key 或 VEID

**解决**:

1. 打开 http://boxjs.com
2. 搜索 "Bandwagon"
3. 填入 API Key 和 VEID

### 显示 "API 错误"

**原因**: API Key 或 VEID 不正确

**解决**:

1. 检查 API Key 和 VEID 是否正确
2. 登录 Bandwagon Panel 重新获取
3. 确认 API Key 仍然有效（可能已过期）

### 无法连接到 API

**原因**: 网络问题或被 ISP 阻止

**解决**:

1. 确保代理配置正确
2. 尝试使用 VPN
3. 检查是否在中国大陆（可能需要梯子）

## 进阶配置

### 自定义通知

修改脚本中的通知相关代码来自定义显示内容。

### 添加多个 VPS

可以创建多个脚本实例，分别配置不同的 VEID。

### 集成到其他工具

这个脚本也可以用于 Surge、QuantumultX 等，只需修改相应的脚本头和放置位置。

## 相关链接

- BoxJS 官网: https://docs.boxjs.app/
- Bandwagon 官网: https://bwh2.net/
- Loon 官网: https://nsloon.app/

## 许可证

MIT

## 更新日志

### v1.0 (2025-12-04)

- 初始版本
- 支持 BoxJS 配置
- 完善的错误处理
- 美观的通知界面
