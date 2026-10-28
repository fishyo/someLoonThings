# Vercel 免费额度与用量监控

> 专为 **Loon** 与 **Quantumult X** 打造的 Vercel Hobby 免费计划 30 天周期配额监控脚本。  
> 每天定时向 iOS 发送清晰明了的 Serverless 函数调用量与边缘流量进度条通知，防止免费额度（100 万次调用、100 GB 流量）超额或停机。

---

## 📊 监控指标与免费限额 (Hobby Plan)

- **函数调用 (Function Invocations)**：**1,000,000 次 / 30天**
- **边缘出站流量 (Fast Data Transfer)**：**100 GB / 30天**
- **构建时长 (Build Minutes)**：**6,000 分钟 (100小时) / 30天**
- **额度告警**：调用量或流量使用百分比达到设定阈值（默认 80%）自动标红预警

---

## 📱 通知样式预览

```text
▲ Vercel 免费额度监控
✅ 周期用量: 调用 0.8% | 流量 1.5% (正常)

▪️ 函数调用: 8,420 / 1,000,000 [■·······] 0.8%
▪️ 剩余调用: 991,580 次
▪️ 边缘流量: 1.45 GB / 100 GB (1.5%)
▪️ 构建时长: 15 / 6,000 分钟 (0.3%)
🕒 统计周期: 30 天滑动周期 (Hobby Plan)
```

---

## 🔑 凭据获取指引

1. 登录 [Vercel 控制台](https://vercel.com/)；
2. 点击右上角头像 ➔ **Settings (设置)** ➔ 左侧菜单 **Tokens**；
3. 点击 **Create Token**，输入名称（如 `Loon-Monitor`），选择长期或不过期，Scope 选择个人账号；
4. 复制生成的 Access Token 即可。
5. （可选）**Team ID**：如果是个人 Hobby 免费账号，**Team ID 留空即可**。

---

## ⚙️ 配置与使用方式

### 途径一：Loon 插件直接配置 (推荐)
1. 在 Loon 中添加插件：
   ```text
   https://raw.githubusercontent.com/fishyo/someLoonThings/main/plugin/vercel.plugin
   ```
2. 在插件配置表单中直接填写 `Access Token`；
3. 自由修改每天推送时间（默认每天早晨 09:00）与告警阈值（默认 80%）即可。

### 途径二：BoxJS 订阅配置
在 BoxJS 中订阅 `someLoonThings`，在 **Vercel 状态** 下填入对应凭据保存即可。

---

## 📄 License
[MIT](../../LICENSE)
