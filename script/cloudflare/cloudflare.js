/**
 * Cloudflare Workers 免费额度与用量定时监控
 * 
 * 适用于 Loon 与 Quantumult X 双端
 * 
 * 配置优先级:
 * 1. BoxJS / 本地持久化存储 (cloudflare.accountTag & cloudflare.apiToken)
 * 2. Loon 插件参数 ($argument)
 * 
 * 监控指标:
 * - 每日请求总数 (免费额度 100,000 次/天，UTC 00:00 重置)
 * - 剩余可用请求数、已用百分比进度条
 * - 子请求数 (Sub-requests)
 * - 运行时异常数 (Errors)
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
  post: (options, callback) => {
    if (typeof $httpClient !== "undefined") {
      $httpClient.post(options, callback);
    } else if (typeof $task !== "undefined") {
      const opts = typeof options === "string" ? { url: options } : { ...options };
      opts.method = "POST";
      $task.fetch(opts).then(
        (resp) => callback(null, { ...resp, status: resp.statusCode }, resp.body),
        (err) => callback(err, null, null)
      );
    }
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

  const accountTag = (
    $.read("cloudflare.accountTag") ||
    arg.accountTag ||
    ""
  ).trim();

  const apiToken = (
    $.read("cloudflare.apiToken") ||
    arg.apiToken ||
    ""
  ).trim();

  const alertThreshold = parseInt(
    $.read("cloudflare.alertThreshold") || arg.alertThreshold || "80",
    10
  );

  return {
    accountTag,
    apiToken,
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

async function main() {
  console.log("========== [Cloudflare Workers 额度监控] ==========");
  const config = getConfig();

  if (!config.accountTag || !config.apiToken) {
    console.error("❌ [配置缺失] 请在 Loon 插件配置或 BoxJS 中填写 Account ID 与 API Token。");
    $.notify(
      "☁️ Cloudflare 额度监控",
      "⚠️ 缺少配置凭据",
      "请在 Loon 插件配置或 BoxJS 中填写 Account ID 与 API Token。"
    );
    console.log("==================================================");
    $.done({});
    return;
  }

  const maskedTag = maskToken(config.accountTag);
  const maskedToken = maskToken(config.apiToken);
  console.log(`[配置] Account ID: ${maskedTag}`);
  console.log(`[配置] API Token: ${maskedToken} (长度: ${config.apiToken.length})`);
  console.log(`[配置] 告警阈值: ${config.alertThreshold}%`);

  const now = new Date();
  // UTC 当天 00:00:00 开始
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  console.log(`[统计区间] UTC ${startUtc.toISOString()} ~ ${now.toISOString()}`);
  console.log(`[请求] 正在查询 Cloudflare Workers GraphQL API...`);

  const graphqlQuery = {
    query: `query GetWorkersAnalytics($accountTag: String!, $datetimeStart: String!, $datetimeEnd: String!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            limit: 1000
            filter: { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
          ) {
            sum {
              requests
              errors
              subrequests
            }
          }
        }
      }
    }`,
    variables: {
      accountTag: config.accountTag,
      datetimeStart: startUtc.toISOString(),
      datetimeEnd: now.toISOString()
    }
  };

  const options = {
    url: "https://api.cloudflare.com/client/v4/graphql",
    headers: {
      "Authorization": `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Loon-CF-Monitor/1.0"
    },
    body: JSON.stringify(graphqlQuery),
    timeout: 15000
  };

  $.post(options, (err, resp, body) => {
    if (err) {
      console.error("❌ [网络错误] 请求失败:", err.message || String(err));
      $.notify("☁️ Cloudflare 额度监控", "❌ 网络请求失败", err.message || String(err));
      console.log("==================================================");
      $.done({});
      return;
    }

    const statusCode = resp ? (resp.status || resp.statusCode) : "200";
    console.log(`[响应] HTTP 状态码: ${statusCode}`);

    try {
      const json = JSON.parse(body);

      if (json.errors && json.errors.length > 0) {
        const errMsg = json.errors.map(e => e.message).join("; ") || "GraphQL Error";
        console.error("❌ [API 报错]:", errMsg);
        $.notify("☁️ Cloudflare 额度监控", "❌ API 报错", errMsg);
        console.log("==================================================");
        $.done({});
        return;
      }

      const accounts = json.data?.viewer?.accounts || [];
      if (accounts.length === 0) {
        console.warn("⚠️ [未找到账户] 请核对配置的 Account ID 是否正确。");
        $.notify("☁️ Cloudflare 额度监控", "❌ 未找到对应账户", "请核对配置的 Account ID 是否正确。");
        console.log("==================================================");
        $.done({});
        return;
      }

      const items = accounts[0].workersInvocationsAdaptive || [];
      let requests = 0;
      let errors = 0;
      let subrequests = 0;

      for (const item of items) {
        if (item.sum) {
          requests += item.sum.requests || 0;
          errors += item.sum.errors || 0;
          subrequests += item.sum.subrequests || 0;
        }
      }

      const dailyLimit = 100000;
      const percentNum = (requests / dailyLimit) * 100;
      const percentStr = percentNum.toFixed(1);
      const remaining = Math.max(0, dailyLimit - requests);
      const isAlert = percentNum >= config.alertThreshold;

      const subTitle = isAlert
        ? `⚠️ 今日用量预警: ${percentStr}% (超 ${config.alertThreshold}%)`
        : `✅ 今日用量: ${percentStr}% (运行正常)`;

      const bar = makeProgressBar(percentNum);

      console.log(`[结果] 今日请求总量: ${formatNumber(requests)} / ${formatNumber(dailyLimit)} ${bar} (${percentStr}%)`);
      console.log(`[结果] 今日剩余可用: ${formatNumber(remaining)} 次`);
      console.log(`[结果] 子请求调用量: ${formatNumber(subrequests)} 次`);
      console.log(`[结果] 运行时异常数: ${formatNumber(errors)} 次`);
      console.log(`[状态] 阈值状态: ${isAlert ? "⚠️ 超出告警阈值 (" + config.alertThreshold + "%)" : "正常"}`);
      console.log(`[通知] 发送通知: ☁️ Cloudflare Workers 额度 | ${subTitle}`);

      const content = [
        `▪️ 今日请求: ${formatNumber(requests)} / ${formatNumber(dailyLimit)} ${bar} ${percentStr}%`,
        `▪️ 剩余可用: ${formatNumber(remaining)} 次`,
        `▪️ 子请求数: ${formatNumber(subrequests)} 次`,
        `▪️ 异常报错: ${formatNumber(errors)} 次`,
        `🕒 额度周期: 每日 UTC 00:00 重置 (北京时间 08:00)`
      ].join("\n");

      $.notify("☁️ Cloudflare Workers 额度", subTitle, content, {
        "open-url": "https://dash.cloudflare.com/"
      });
    } catch (parseErr) {
      console.error("❌ [解析错误] 数据解析失败:", parseErr.message);
      $.notify("☁️ Cloudflare 额度监控", "❌ 数据解析失败", parseErr.message);
    } finally {
      console.log("==================================================");
      $.done({});
    }
  });
}

main();
