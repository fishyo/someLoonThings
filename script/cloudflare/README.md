# Cloudflare Workers 免费额度与用量监控

> 专为 **Loon** 与 **Quantumult X** 打造的 Cloudflare Workers 每日免费配额监控脚本。  
> 每天定时向 iOS 发送清晰明了的请求用量与进度条通知，防止免费额度（10 万次/天）突发耗尽。

---

## 📊 监控指标与免费限额

- **免费配额**：**100,000 次 / 天**（每日 UTC 00:00 重置，即北京时间早晨 08:00）
- **核心数据**：今日累计请求量、剩余可用次数、已用百分比进度条、子请求数 (Sub-requests)、运行时异常数
- **额度告警**：达到设定阈值（默认 80%）自动标红预警

---

## 📱 通知样式预览

```text
☁️ Cloudflare Workers 额度
✅ 今日用量: 1.2% (运行正常)

▪️ 今日请求: 1,234 / 100,000 [■·······] 1.2%
▪️ 剩余可用: 98,766 次
▪️ 子请求数: 3,456 次
▪️ 异常报错: 0 次
🕒 额度周期: 每日 UTC 00:00 重置 (北京时间 08:00)
```

---

## 🔑 凭据获取指引 (安全只读)

1. **Account ID**：
   - 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，在首页任意域名的右下角或 Workers & Pages 概览页面即可找到 **Account ID**（一串 32 位的十六进制字符，如 `748d5f23acf67...`）。
2. **API Token**：
   - 登录控制台，点击右上角头像 ➔ **My Profile (我的个人资料)** ➔ **API Tokens (API 令牌)**；
   - 点击 **Create Token (创建令牌)** ➔ 滚动到底部选择 **Create Custom Token (创建自定义令牌)**；
   - 填写 Token 名称（如 `Loon-CF-Monitor`）；
   - **Permissions (权限)** 设置为：
     - `Account` ➔ `Analytics` ➔ `Read`
     （或增加 `Account` ➔ `Workers Scripts` ➔ `Read`）
   - 点击 **Continue to summary** 并创建，复制生成的 API 令牌。

---

## ⚙️ 配置与使用方式

### 途径一：Loon 插件直接配置 (推荐)
1. 在 Loon 中添加插件：
   ```text
   https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/cloudflare.plugin
   ```
2. 在插件配置表单中直接填写 `Account ID` 与 `API Token`；
3. 自由修改每天推送时间（默认每天早晨 08:00）与告警阈值（默认 80%）即可。

### 途径二：BoxJS 订阅配置
在 BoxJS 中订阅 `someLoonThings`，在 **Cloudflare Workers 状态** 下填入对应凭据保存即可。

---

## 📄 License
[MIT](../../LICENSE)
