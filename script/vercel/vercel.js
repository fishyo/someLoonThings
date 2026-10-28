/**
 * Vercel Serverless 免费额度与用量定时监控
 * 
 * 适用于 Loon 与 Quantumult X 双端
 * 
 * 配置优先级:
 * 1. BoxJS / 本地持久化存储 (vercel.token & vercel.teamId)
 * 2. Loon 插件参数 ($argument)
 * 
 * 监控指标 (Hobby 免费计划 30天周期):
 * - 函数调用次数 (Invocations, 1,000,000 次)
 * - 边缘出站流量 (Fast Data Transfer, 100 GB)
 * - 构建时长 (Build Minutes, 6,000 分钟 / 100小时)
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

async function main() {
  const config = getConfig();

  if (!config.token) {
    console.log("❌ Vercel configuration missing");
    $.notify(
      "▲ Vercel 额度监控",
      "⚠️ 缺少配置凭据",
      "请在 Loon 插件配置或 BoxJS 中填写 Vercel Access Token。"
    );
    $.done({});
    return;
  }

  let url = "https://api.vercel.com/v2/usage";
  if (config.teamId) {
    url += `?teamId=${encodeURIComponent(config.teamId)}`;
  }

  const options = {
    url,
    headers: {
      "Authorization": `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "Loon-Vercel-Monitor/1.0"
    },
    timeout: 15
  };

  $.get(options, (err, resp, body) => {
    if (err) {
      console.error("❌ Request Error:", err);
      $.notify("▲ Vercel 额度监控", "❌ 网络请求失败", err.message || String(err));
      $.done({});
      return;
    }

    try {
      const json = JSON.parse(body);

      if (json.error) {
        const errMsg = json.error.message || json.error.code || "API Error";
        console.warn("⚠️ API Error:", errMsg);
        $.notify("▲ Vercel 额度监控", "❌ API 报错", errMsg);
        $.done({});
        return;
      }

      const metrics = json.metrics || json;

      // 1. 函数调用数 (Hobby 计划 1,000,000 次 / 30天)
      const invocations = metrics.functionInvocations?.value ??
                          metrics.serverlessExecutionTime?.value ??
                          json.functionInvocations ?? 0;
      const invocationsLimit = metrics.functionInvocations?.limit ?? 1000000;
      const invocationsPercentNum = (invocations / invocationsLimit) * 100;
      const invocationsPercent = invocationsPercentNum.toFixed(1);
      const remainingInvocations = Math.max(0, invocationsLimit - invocations);

      // 2. 出站流量 (Hobby 计划 100 GB / 30天)
      const bandwidth = metrics.bandwidth?.value ?? json.bandwidth ?? 0;
      const bandwidthLimit = metrics.bandwidth?.limit ?? (100 * 1024 * 1024 * 1024);
      const bandwidthPercentNum = (bandwidth / bandwidthLimit) * 100;
      const bandwidthPercent = bandwidthPercentNum.toFixed(1);

      // 3. 构建时长 (Hobby 计划 6,000 分钟 / 30天)
      const buildMinutes = metrics.buildMinutes?.value ??
                           (json.buildTime ? Math.round(json.buildTime / 60) : 0);
      const buildLimit = 6000;
      const buildPercent = ((buildMinutes / buildLimit) * 100).toFixed(1);

      // 判断预警状态
      const isAlert = invocationsPercentNum >= config.alertThreshold || bandwidthPercentNum >= config.alertThreshold;

      const subTitle = isAlert
        ? `⚠️ 周期用量预警: 调用 ${invocationsPercent}% | 流量 ${bandwidthPercent}%`
        : `✅ 周期用量: 调用 ${invocationsPercent}% | 流量 ${bandwidthPercent}% (正常)`;

      const bar = makeProgressBar(invocationsPercentNum);

      const content = [
        `▪️ 函数调用: ${formatNumber(invocations)} / ${formatNumber(invocationsLimit)} ${bar} ${invocationsPercent}%`,
        `▪️ 剩余调用: ${formatNumber(remainingInvocations)} 次`,
        `▪️ 边缘流量: ${formatBytes(bandwidth)} / 100 GB (${bandwidthPercent}%)`,
        `▪️ 构建时长: ${formatNumber(buildMinutes)} / 6,000 分钟 (${buildPercent}%)`,
        `🕒 统计周期: 30 天滑动周期 (Hobby Plan)`
      ].join("\n");

      $.notify("▲ Vercel 免费额度监控", subTitle, content, {
        "open-url": "https://vercel.com/dashboard/usage"
      });
    } catch (parseErr) {
      console.error("Parse Error:", parseErr);
      $.notify("▲ Vercel 额度监控", "❌ 数据解析失败", parseErr.message);
    } finally {
      $.done({});
    }
  });
}

main();
