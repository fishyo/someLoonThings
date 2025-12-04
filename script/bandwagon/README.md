# Bandwagon 服务器状态查询

## 快速开始

### 1️⃣ 安装 BoxJS

在 Loon 中安装 BoxJS 插件：

**方法一：一键安装**（推荐）

- 打开链接：https://api.boxjs.app/loon-install

**方法二：手动安装**

```
配置 > 插件 > 添加插件

插件地址:
https://raw.githubusercontent.com/chavyleung/scripts/master/box/rewrite/boxjs.rewrite.loon.plugin
```

### 2️⃣ 添加 BoxJS 订阅

1. 打开 BoxJS：http://boxjs.com
2. 点击底部 **「订阅」** 标签
3. 点击右上角 **「+」** 添加订阅
4. 输入订阅地址：

```
https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/main/script/bandwagon/bandwagon.boxjs.json
```

5. 点击保存

### 3️⃣ 配置 API Key 和 VEID

1. 在 BoxJS 首页找到 **「Bandwagon 服务器状态」**
2. 点击进入配置页面
3. 填写以下信息：
   - **API Key**: 你的 Bandwagon API 密钥
   - **VEID**: 你的 VPS 编号
4. 点击保存

#### 如何获取 API Key 和 VEID？

**API Key:**

1. 登录 [Bandwagon 面板](https://bwh2.net/)
2. 进入 Account > API
3. 点击 Generate New Key

**VEID:**

1. 登录面板后查看 Services
2. 点击你的 VPS 产品
3. URL 中的 `veid=` 后面的数字就是 VEID
4. 或者在产品详情页直接查看

### 4️⃣ 配置 Loon 脚本

在 Loon 配置文件中添加：

```ini
[Script]
# 手动查询
bandwagon = type=generic, script-path=https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/main/script/bandwagon/bandwagonhost.js, timeout=10, tag=Bandwagon status

# 定时查询（每小时）
bandwagon-cron = type=cron, cronexp="0 * * * *", script-path=https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/main/script/bandwagon/bandwagonhost.js, timeout=10, tag=Bandwagon status
```

### 5️⃣ 运行脚本

- **手动运行**: Loon 主界面 > 脚本 > 点击「Bandwagon 状态」
- **自动运行**: 按 cron 表达式定时执行

## 显示效果

通知将显示：

```
🖲️ 服务器状态

IP 地址: 1.2.3.4
当前使用: 4.50 / 10.00 GB
使用进度: ████░░░░░░ 45.00%
重置时间: 2025/12/31
节点位置: Los Angeles Premium
带宽倍数: 1x
```

## 常见问题

### ❓ 显示"配置不完整"

没有在 BoxJS 中配置 API Key 或 VEID。请按步骤 3 配置。

### ❓ 显示"API 错误"

API Key 或 VEID 不正确。请检查：

- API Key 是否正确复制
- VEID 是否对应当前 VPS
- API Key 是否已过期

### ❓ BoxJS 找不到订阅

- 检查订阅地址是否正确
- 确认网络连接正常
- 尝试刷新 BoxJS 页面

## 订阅地址

```
https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/main/script/bandwagon/bandwagon.boxjs.json
```

## 脚本地址

```
https://raw.githubusercontent.com/fishyo/someLoonThings/refs/heads/main/script/bandwagon/bandwagonhost.js
```

## 相关链接

- [BoxJS 文档](https://docs.boxjs.app/)
- [Bandwagon 官网](https://bwh2.net/)
- [Loon 官网](https://nsloon.app/)
