# 九号出行签到脚本使用指南

## 📋 准备工作

### 1. 获取 Cookie 信息

您需要从九号出行 APP 的网络请求中获取 `authorization` 值。

#### 方法一: 使用抓包工具 (推荐)

1. 安装抓包工具 (如 Charles、Thor、Stream 等)
2. 打开九号出行 APP,进入签到页面
3. 在抓包工具中找到请求: `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v1/sign`
4. 查看请求头 (Request Headers),复制 `authorization` 的值

**示例:**

```
authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 方法二: 浏览器开发者工具

1. 在电脑浏览器打开九号出行网页版 (如果有)
2. 按 F12 打开开发者工具
3. 切换到 Network (网络) 标签
4. 进行签到操作
5. 找到签到请求,查看 Request Headers 中的 `authorization`

### 2. (可选) 获取设备 ID

在同一个请求的 Request Body 中可以找到 `deviceId`,如果不填写,脚本会使用默认值。

## 🚀 使用步骤

### 步骤 1: 设置 Cookie

1. 打开 `file/9bot-set-cookie.js` 文件
2. 修改以下内容:

```javascript
const cookieData = {
  // 必填: 替换为您的 authorization
  authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",

  // 可选: 替换为您的设备ID (不填会使用默认值)
  deviceId: "20174E14-7801-4075-A3DD-E56A470D6A43",
};
```

3. 运行设置脚本:

```bash
node test-runner.js file/9bot-set-cookie.js
```

**成功输出示例:**

```
✅ Cookie数据已保存
保存的数据: {
  "authorization": "Bearer ...",
  "deviceId": "..."
}

━━━━━━━━━━ 通知 ━━━━━━━━━━
标题: 九号出行
副标题: ✅ Cookie设置成功
内容: 现在可以运行签到脚本了
```

### 步骤 2: 运行签到脚本

```bash
node test-runner.js file/9bot.js
```

**成功输出示例:**

```
========== 九号出行签到脚本启动 ==========
读取到的Cookie数据: {...}
请求URL: https://cn-cbu-gateway.ninebot.com/...
状态码：200

━━━━━━━━━━ 通知 ━━━━━━━━━━
标题: 九号出行
副标题: 🎉 签到成功
内容:
✅ 签到成功
连续签到: 5天
本次奖励: 10积分
更新时间: 2025/12/3 15:30:00
```

### 步骤 3: 查看保存的数据 (可选)

```bash
cat persistent-store.json
```

您会看到类似这样的内容:

```json
{
  "ninebot_cookie_data": "{\"authorization\":\"Bearer ...\",\"deviceId\":\"...\"}"
}
```

## 🔧 调试模式

如果遇到问题,可以使用详细模式查看完整日志:

```bash
node test-runner.js file/9bot.js --verbose
```

这会输出详细的执行过程,包括:

- Cookie 读取过程
- HTTP 请求详情
- 响应数据解析
- 错误堆栈信息

## ❓ 常见问题

### Q1: 提示"未找到保存的 Cookie 数据"

**原因:** 未运行设置 Cookie 的脚本  
**解决:** 先运行 `node test-runner.js file/9bot-set-cookie.js`

### Q2: 提示"缺少授权信息"

**原因:** Cookie 数据中没有 authorization 字段  
**解决:** 检查 `9bot-set-cookie.js` 中是否正确填写了 authorization

### Q3: 签到失败,返回错误码

**可能原因:**

- Cookie 已过期 (重新获取)
- authorization 格式不正确 (检查是否完整复制)
- 网络问题 (检查网络连接)

**解决方法:**

```bash
# 1. 使用详细模式查看错误信息
node test-runner.js file/9bot.js --verbose

# 2. 重新获取并设置Cookie
# 编辑 9bot-set-cookie.js 填入新的 authorization
node test-runner.js file/9bot-set-cookie.js

# 3. 再次尝试签到
node test-runner.js file/9bot.js
```

### Q4: 想要清除保存的 Cookie

编辑或创建一个清除脚本:

```javascript
$persistentStore.write("", "ninebot_cookie_data");
console.log("Cookie已清除");
$done();
```

或者直接删除 `persistent-store.json` 文件中对应的数据。

## 📅 定时签到

如果您想实现自动定时签到,可以:

1. **在 Loon 中设置定时任务:**

   ```
   cron "0 8 * * *" script-path=9bot.js, tag=九号出行签到
   ```

2. **在 Windows 中使用任务计划程序:**

   - 创建基本任务
   - 触发器: 每天 8:00
   - 操作: 运行程序 `node`
   - 参数: `test-runner.js file/9bot.js`
   - 起始于: 项目目录

3. **在 Linux/macOS 中使用 crontab:**

   ```bash
   # 编辑 crontab
   crontab -e

   # 添加定时任务 (每天8点执行)
   0 8 * * * cd /path/to/loon-script-mock && node test-runner.js file/9bot.js
   ```

## 🔐 安全提示

1. ⚠️ **不要分享您的 authorization** - 这相当于您的账号密码
2. 🔒 **定期更换** - Cookie 可能会过期,需要重新获取
3. 📁 **注意文件权限** - `persistent-store.json` 包含敏感信息
4. 🚫 **不要上传到公开仓库** - 确保 `.gitignore` 包含 `persistent-store.json`

## 📝 返回码说明

| 代码  | 说明       | 处理方式                                |
| ----- | ---------- | --------------------------------------- |
| 0     | 签到成功   | ✅ 正常                                 |
| 10014 | 今日已签到 | ℹ️ 正常,无需重复签到                    |
| 其他  | 错误       | ❌ 查看错误信息,可能需要重新获取 Cookie |

---

**祝您使用愉快! 🎉**
