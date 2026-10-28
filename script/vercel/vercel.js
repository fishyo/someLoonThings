/**
 * Vercel 免费额度与账号状态定时监控
 * 
 * 适用于 Loon 与 Quantumult X 双端
 * 
 * 配置优先级:
 * 1. BoxJS / 本地持久化存储 (vercel.token & vercel.teamId)
 * 2. Loon 插件参数 ($argument)
 * 
 * 功能特性:
 * - 智能检测账号计划类型 (Hobby 个人免费版 vs Pro/Enterprise 团队版)
 * - Pro 团队版: 自动监控 30 天周期 Serverless 函数调用量 (100万次)、出站流量 (100GB)、构建时长与告警阈值
 * - Hobby 个人版: 兼容 Vercel 官方 API 权限规则 (官方用量 API 仅对 Pro/Enterprise 团队开放)，
 *   自动展示账号运行状态、30 天重置周期倒计时、活跃项目与部署健康度，并提供直达网页仪表盘快捷入口
 */

// 跨平台环境适配层 (遵循 someLoonThings 规范)
const $ = {
  read: (key) => {
    if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
    return null;
  },
  write: (val, key) => {
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
    return false;
  },
  notify: (title, sub, msg, opts = {}) => {
    if (typeof $notification !== "undefined") {
      $notification.post(title, sub, msg, opts);
    } else if (typeof $notify !== "undefined") {
      $notify(title, sub, msg, opts);
    } else {
      console.log(`[Notification]\n${title}\n${sub}\n${msg}`);
    }
  },
  get: (options, callback) => {
    if (typeof $httpClient !== "undefined") {
      $httpClient.get(options, callback);
    } else if (typeof $task !== "undefined") {
      const opts = typeof options === "string" ? { url: options } : { ...options };
      opts.method = "GET";
      $task.fetch(opts).then(
        (resp) => callback(null, { ...resp, status: resp.statusCode }, resp.body),
        (err) => callback(err, null, null)
      );
    }
  },
  httpGet: (options) => {
    return new Promise((resolve, reject) => {
      $.get(options, (err, resp, body) => {
        if (err) return reject(err);
        resolve({ resp, body });
      });
    });
  },
  done: (obj = {}) => {
    if (typeof $done !== "undefined") $done(obj);
  }
};

// 解析插件参数 ($argument)
function parseArgument() {
  if (typeof $argument === "undefined" || !$argument) return {};
  if (typeof $argument === "object") return $argument;
  if (typeof $argument === "string") {
    try {
      return JSON.parse($argument);
    } catch (e) {
      const res = {};
      $argument.split("&").forEach((pair) => {
        const idx = pair.indexOf("=");
        if (idx > -1) {
          res[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
        }
      });
      return res;
    }
  }
  return {};
}

// 获取配置信息 (优先 BoxJS)
function getConfig() {
  const arg = parseArgument();

  const token = (
    $.read("vercel.token") ||
    arg.token ||
    ""
  ).trim();

  const teamId = (
    $.read("vercel.teamId") ||
    arg.teamId ||
    ""
  ).trim();

  const alertThreshold = parseInt(
    $.read("vercel.alertThreshold") || arg.alertThreshold || "80",
    10
  );

  return {
    token,
    teamId,
    alertThreshold: isNaN(alertThreshold) ? 80 : alertThreshold
  };
}

// 敏感凭据掩码
function maskToken(str) {
  if (!str) return "";
  if (str.length <= 8) return "****";
  return str.substring(0, 4) + "...." + str.substring(str.length - 4);
}

// 进度条渲染
function makeProgressBar(percent, length = 8) {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * length);
  const empty = length - filled;
  return "[" + "■".repeat(filled) + "·".repeat(empty) + "]";
}

// 数字千分位格式化
function formatNumber(num) {
  return Number(num || 0).toLocaleString("en-US");
}

// 流量单位格式化
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// 日期格式化 MM/DD
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}`;
}

async function main() {
  console.log("========== [Vercel 额度与账号状态监控] ==========");
  const config = getConfig();

  if (!config.token) {
    console.error("❌ [配置缺失] 请在 Loon 插件配置或 BoxJS 中填写 Vercel Access Token。");
    $.notify(
      "▲ Vercel 监控",
      "⚠️ 缺少配置凭据",
      "请在 Loon 插件配置或 BoxJS 中填写 Vercel Access Token。"
    );
    console.log("==================================================");
    $.done({});
    return;
  }

  const maskedToken = maskToken(config.token);
  console.log(`[配置] Token: ${maskedToken} (长度: ${config.token.length})`);
  console.log(`[配置] Team ID: ${config.teamId ? config.teamId : "未指定 (个人账号)"}`);
  console.log(`[配置] 告警阈值: ${config.alertThreshold}%`);

  const defaultHeaders = {
    "Authorization": `Bearer ${config.token}`,
    "Content-Type": "application/json",
    "User-Agent": "Loon-Vercel-Monitor/1.0"
  };

  try {
    // 1. 验证凭据并获取用户信息 (GET /v2/user)
    console.log("[请求] 正在获取用户信息与账号计划 (GET /v2/user)...");
    const userRes = await $.httpGet({
      url: "https://api.vercel.com/v2/user",
      headers: defaultHeaders,
      timeout: 10000
    });

    let userJson;
    try {
      userJson = JSON.parse(userRes.body);
    } catch (e) {
      throw new Error(`解析用户信息失败: ${e.message}`);
    }

    if (userJson.error) {
      const errMsg = userJson.error.message || userJson.error.code || "鉴权失败";
      console.error("❌ [鉴权失败] Vercel Auth Error:", errMsg);
      $.notify("▲ Vercel 监控", "❌ 鉴权失败", `Token 鉴权失败: ${errMsg}`);
      console.log("==================================================");
      $.done({});
      return;
    }

    const user = userJson.user || {};
    const username = user.username || "未知用户";
    const displayName = user.name || username;
    const plan = (user.billing?.plan || "hobby").toLowerCase();
    const periodStart = user.billing?.period?.start;
    const periodEnd = user.billing?.period?.end;

    console.log(`[账号] 用户: ${displayName} (@${username}), 邮箱: ${user.email || "未提供"}`);
    console.log(`[账号] 订阅计划: ${plan.toUpperCase()}`);

    // 计算周期与重置倒计时
    let cycleInfo = "近 30 天滑动周期";
    if (periodStart && periodEnd) {
      const daysLeft = Math.max(0, Math.ceil((periodEnd - Date.now()) / (1000 * 60 * 60 * 24)));
      cycleInfo = `${formatDate(periodStart)} ~ ${formatDate(periodEnd)} (剩余 ${daysLeft} 天重置)`;
    }
    console.log(`[计费周期] ${cycleInfo}`);

    // 2. 检查是否可查询详细用量 (仅 Pro/Enterprise 团队开放 /v1/usage)
    let usageJson = null;
    const isProOrHasTeam = Boolean(config.teamId) || plan !== "hobby";

    if (isProOrHasTeam) {
      console.log(`[模式] 账号属于 ${plan.toUpperCase()} 计划或指定了 Team ID，尝试查询用量 API (/v1/usage)...`);
      try {
        const now = new Date();
        const to = periodEnd ? new Date(periodEnd).toISOString() : now.toISOString();
        const from = periodStart
          ? new Date(periodStart).toISOString()
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        let usageUrl = `https://api.vercel.com/v1/usage?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        if (config.teamId) {
          usageUrl += `&teamId=${encodeURIComponent(config.teamId)}`;
        }

        const usageRes = await $.httpGet({
          url: usageUrl,
          headers: defaultHeaders,
          timeout: 15000
        });

        const parsed = JSON.parse(usageRes.body);
        if (parsed && !parsed.error) {
          usageJson = parsed;
          console.log(`[响应] 成功获取 Pro/Enterprise 团队用量指标`);
        } else if (parsed?.error) {
          console.warn("[说明] 用量 API 提示:", parsed.error.message);
          console.log("[降级] 官方限制用量 API 仅对 Pro/Enterprise 团队开放，自动切换至 Hobby 状态展示");
        }
      } catch (e) {
        console.warn("[说明] 用量接口请求未完成:", e.message);
      }
    } else {
      console.log(`[模式] 账号为 Hobby 个人免费版 (Vercel 官方限制用量 API 仅限 Pro/Enterprise 团队)`);
      console.log(`[模式] 自动启用 Hobby 账号与活跃项目健康度监控`);
    }

    // 3. 情况 A: 成功获取 Pro/Enterprise 用量指标
    if (usageJson) {
      let invocations = 0;
      let invocationsLimit = 1000000;
      let bandwidth = 0;
      let bandwidthLimit = 100 * 1024 * 1024 * 1024;
      let buildMinutes = 0;
      let buildLimit = 6000;

      if (Array.isArray(usageJson) || Array.isArray(usageJson.data) || Array.isArray(usageJson.records)) {
        const list = Array.isArray(usageJson) ? usageJson : (usageJson.data || usageJson.records);
        for (const item of list) {
          const cat = (item.ChargeSubcategory || item.ServiceName || item.name || item.type || item.metric || "").toLowerCase();
          const qty = Number(item.ConsumedQuantity ?? item.value ?? item.usage ?? 0);
          if (cat.includes("function") || cat.includes("invocation") || cat.includes("serverless") || cat.includes("request")) {
            invocations += qty;
          } else if (cat.includes("bandwidth") || cat.includes("transfer") || cat.includes("edge") || cat.includes("data")) {
            bandwidth += qty;
          } else if (cat.includes("build")) {
            buildMinutes += qty;
          }
        }
      }

      const metrics = usageJson.metrics || usageJson;
      if (invocations === 0) {
        invocations = Number(
          metrics.functionInvocations?.value ??
          metrics.functionInvocations?.usage ??
          metrics.serverlessFunctionExecutions?.value ??
          metrics.serverlessFunctionExecutions?.usage ??
          metrics.serverlessExecutionTime?.value ??
          usageJson.functionInvocations ??
          usageJson.serverlessFunctionExecutions ??
          usageJson.invocations ??
          usageJson.requests ?? 0
        );
      }
      invocationsLimit = Number(
        metrics.functionInvocations?.limit ??
        metrics.serverlessFunctionExecutions?.limit ??
        invocationsLimit
      );

      if (bandwidth === 0) {
        bandwidth = Number(
          metrics.bandwidth?.value ??
          metrics.bandwidth?.usage ??
          usageJson.bandwidth ??
          usageJson.fastDataTransfer ??
          usageJson.dataTransfer ?? 0
        );
      }
      bandwidthLimit = Number(metrics.bandwidth?.limit ?? bandwidthLimit);

      if (buildMinutes === 0) {
        buildMinutes = Number(
          metrics.buildMinutes?.value ??
          metrics.buildMinutes?.usage ??
          metrics.builds?.usage ??
          (usageJson.buildTime ? Math.round(usageJson.buildTime / 60) : 0) ??
          usageJson.buildMinutes ??
          usageJson.builds ?? 0
        );
      }
      buildLimit = Number(metrics.buildMinutes?.limit ?? metrics.builds?.limit ?? buildLimit);

      const invocationsPercentNum = (invocations / invocationsLimit) * 100;
      const invocationsPercent = invocationsPercentNum.toFixed(1);
      const remainingInvocations = Math.max(0, invocationsLimit - invocations);

      const bandwidthPercentNum = (bandwidth / bandwidthLimit) * 100;
      const bandwidthPercent = bandwidthPercentNum.toFixed(1);

      const buildPercent = ((buildMinutes / buildLimit) * 100).toFixed(1);

      const isAlert = invocationsPercentNum >= config.alertThreshold || bandwidthPercentNum >= config.alertThreshold;
      const subTitle = isAlert
        ? `⚠️ 周期用量预警: 调用 ${invocationsPercent}% | 流量 ${bandwidthPercent}%`
        : `✅ 周期用量: 调用 ${invocationsPercent}% | 流量 ${bandwidthPercent}% (正常)`;

      const bar = makeProgressBar(invocationsPercentNum);

      console.log(`[结果] 函数调用次数: ${formatNumber(invocations)} / ${formatNumber(invocationsLimit)} ${bar} (${invocationsPercent}%)`);
      console.log(`[结果] 剩余可用调用: ${formatNumber(remainingInvocations)} 次`);
      console.log(`[结果] 边缘出站流量: ${formatBytes(bandwidth)} / ${formatBytes(bandwidthLimit)} (${bandwidthPercent}%)`);
      console.log(`[结果] 累计构建时长: ${formatNumber(buildMinutes)} / ${formatNumber(buildLimit)} 分钟 (${buildPercent}%)`);
      console.log(`[状态] 预警状态: ${isAlert ? "⚠️ 超出告警阈值 (" + config.alertThreshold + "%)" : "正常"}`);
      console.log(`[通知] 发送通知: ▲ Vercel 用量监控 | ${subTitle}`);

      const content = [
        `▪️ 函数调用: ${formatNumber(invocations)} / ${formatNumber(invocationsLimit)} ${bar} ${invocationsPercent}%`,
        `▪️ 剩余调用: ${formatNumber(remainingInvocations)} 次`,
        `▪️ 边缘流量: ${formatBytes(bandwidth)} / ${formatBytes(bandwidthLimit)} (${bandwidthPercent}%)`,
        `▪️ 构建时长: ${formatNumber(buildMinutes)} / ${formatNumber(buildLimit)} 分钟 (${buildPercent}%)`,
        `🕒 统计周期: ${periodStart && periodEnd ? `${formatDate(periodStart)} ~ ${formatDate(periodEnd)}` : "近30天"}`
      ].join("\n");

      $.notify("▲ Vercel 用量监控", subTitle, content, {
        "open-url": "https://vercel.com/dashboard/usage",
        "media-url": "https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/vercel.png"
      });
      console.log("==================================================");
      $.done({});
      return;
    }

    // 4. 情况 B: Hobby 计划或降级展示 (查询项目列表与运行状态)
    console.log("[请求] 正在读取项目列表与部署健康度 (GET /v9/projects)...");
    let projects = [];
    try {
      let prjUrl = "https://api.vercel.com/v9/projects?limit=10";
      if (config.teamId) {
        prjUrl += `&teamId=${encodeURIComponent(config.teamId)}`;
      }
      const prjRes = await $.httpGet({
        url: prjUrl,
        headers: defaultHeaders,
        timeout: 10000
      });
      const prjJson = JSON.parse(prjRes.body);
      if (Array.isArray(prjJson.projects)) {
        projects = prjJson.projects;
      }
      console.log(`[响应] 成功获取 ${projects.length} 个活跃项目`);
    } catch (e) {
      console.warn("[警告] 获取项目列表失败:", e.message);
    }

    // 统计部署异常
    let hasDeployError = false;
    const projectSummaryList = [];

    for (const p of projects) {
      const latest = p.latestDeployments?.[0];
      const state = (latest?.readyState || latest?.state || "READY").toUpperCase();
      if (state === "ERROR" || state === "CANCELED") {
        hasDeployError = true;
      }
      const stateIcon = state === "READY" ? "🟢" : (state === "ERROR" ? "🔴" : "🟡");
      projectSummaryList.push(`${stateIcon} ${p.name}`);
      console.log(`   - 项目: ${p.name} [${state}] (${p.framework || "other"})`);
    }

    const planName = plan === "hobby" ? "Hobby (个人免费版)" : `${plan.toUpperCase()} 团队版`;
    const subTitle = hasDeployError
      ? `⚠️ ${planName} · 存在部署异常`
      : `✅ ${planName} · 运行正常 (${projects.length} 个项目)`;

    const recentProjectsText = projectSummaryList.length > 0
      ? projectSummaryList.slice(0, 4).join(", ")
      : "暂无活跃项目";

    console.log(`[结果] 部署状态: ${hasDeployError ? "⚠️ 存在异常部署" : "🟢 全部项目正常"}`);
    console.log(`[通知] 发送通知: ▲ Vercel 账号监控 | ${subTitle}`);

    const content = [
      `▪️ 用户信息: ${displayName} (@${username})`,
      `▪️ 订阅计划: ${planName}`,
      `▪️ 活跃项目: ${projects.length} 个 (${recentProjectsText})`,
      `▪️ 计费周期: ${cycleInfo}`,
      `▪️ 包含额度: 流量 100GB | 调用 100万次 | 构建 100h`,
      `ℹ️ 说明: Vercel 官方限制用量 API 仅对 Pro 团队开放，个人免费额度请点击直达网页仪表盘查看`
    ].join("\n");

    $.notify("▲ Vercel 账号监控", subTitle, content, {
      "open-url": "https://vercel.com/dashboard/usage",
      "media-url": "https://fastly.jsdelivr.net/gh/fishyo/someLoonThings@main/icons/vercel.png"
    });

  } catch (err) {
    console.error("❌ [运行异常] Vercel Monitor Error:", err);
    $.notify("▲ Vercel 监控", "❌ 运行异常", err.message || String(err));
  } finally {
    console.log("==================================================");
    $.done({});
  }
}

main();
