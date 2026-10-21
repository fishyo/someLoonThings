# 9bot

9bot 每日自动签到与 Cookie 抓取脚本。

## ✨ 功能

- 🛵 自动签到：获取每日积分、签到卡及盲盒奖励
- 📊 状态通知：推送签到天数、盲盒奖励提示及剩余签到卡
- ⚙️ 双模块协同：支持通过 HTTP 请求拦截自动抓取更新 Authorization，并持久化存储

---

## 🚀 使用方式

### 方式一：Loon 插件（强烈推荐）

直接导入配套的 Loon 插件，支持在手机设置页通过开关控制 Cookie 捕获，并自定义签到时间：

- **一键导入**: [点击导入 Loon](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.plugin)
- **插件地址**:
  ```text
  https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/ninebot.plugin
  ```

---

### 方式二：传统定时脚本配置 (Surge / Quantumult X 等)

1. **抓取 Cookie 脚本**:
   - 匹配路径: `^https:\/\/cn-cbu-gateway\.ninebot\.com\/portal\/api\/user-sign\/v(1|2)\/sign`
   - 需要 MitM: `cn-cbu-gateway.ninebot.com`
   - 脚本地址:
     ```text
     https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/9bot/9bot_cookie.js
     ```

2. **每日签到脚本**:
   - 触发方式: Cron 定时任务（建议每天早晨执行，如 `20 6 * * *`）
   - 脚本地址:
     ```text
     https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/9bot/9botsign.js
     ```
