/**
 * 搬瓦工 (BandwagonHost) VPS 状态与流量查询
 * 
 * 配置优先级:
 * 1. BoxJS / 本地持久化存储 (bandwagon.veid & bandwagon.apiKey)
 * 2. Loon 插件参数 ($argument)
 */

// 跨平台环境适配
const $ = {
  read: (key) => {
    if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
  },
  write: (val, key) => {
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
  },
  notify: (title, sub, msg) => {
    if (typeof $notification !== "undefined") $notification.post(title, sub, msg);
    else if (typeof $notify !== "undefined") $notify(title, sub, msg);
    else console.log(`${title}\n${sub}\n${msg}`);
  },
  get: (opts, cb) => {
    if (typeof $httpClient !== "undefined") {
      $httpClient.get(opts, cb);
      return;
    }
    if (typeof $task !== "undefined") {
      if (typeof opts === "string") opts = { url: opts };
      opts.method = "GET";
      $task.fetch(opts).then(
        (resp) => cb(null, { ...resp, status: resp.statusCode || 200 }, resp.body || ""),
        (err) => cb(err, null, null)
      );
      return;
    }
    cb(new Error("No supported HTTP client found"), null, null);
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
  let apiKey = "";
  let veid = "";

  // 1. 优先读取 BoxJS / 本地持久化存储 ($persistentStore / $prefs)
  apiKey = $.read("bandwagon.apiKey") || "";
  veid = $.read("bandwagon.veid") || "";

  // 2. 回退读取 Loon 插件参数 ($argument)
  if (!apiKey || !veid) {
    const arg = parseArgument();
    if (!apiKey && arg.apiKey && String(arg.apiKey).trim()) apiKey = String(arg.apiKey).trim();
    if (!veid && arg.veid && String(arg.veid).trim()) veid = String(arg.veid).trim();
  }

  const maskedVeid = veid ? veid.replace(/^(.{2})(.*)(.{1})$/, "$1****$3") : "N/A";
  console.log(`Config Read - Key Len: ${apiKey.length}, VEID: ${maskedVeid}`);
  return { apiKey, veid };
}

// 查询 VPS 服务状态
function getServiceInfo() {
  console.log("▶️ Starting Bandwagon Service Info Query...");
  const config = getConfig();

  if (!config.apiKey || !config.veid) {
    console.log("❌ Configuration missing");
    $.notify(
      "BandwagonHost Status",
      "⚠️ 配置缺失",
      "请在 BoxJS 中配置 API Key 和 VEID"
    );
    $.done({});
    return;
  }

  const apiUrl = `https://api.64clouds.com/v1/getServiceInfo?veid=${encodeURIComponent(config.veid)}&api_key=${encodeURIComponent(config.apiKey)}`;
  const request = { url: apiUrl, method: "GET", timeout: 15000 };

  const maskedUrl = apiUrl.replace(/veid=([^&]+)/, "veid=****").replace(/api_key=([^&]+)/, "api_key=****");
  console.log(`Request API: ${maskedUrl}`);

  $.get(request, function (error, response, data) {
    if (error) {
      console.error("❌ Request Error:", error.message || String(error));
      $.notify("BandwagonHost Status", "❌ 查询失败", error.message || String(error));
      $.done({});
      return;
    }

    console.log(`✅ Response Status: ${response ? response.status : "OK"}`);

    let notifySub = "";
    let notifyMsg = "";
    let isSuccess = false;

    try {
      const jsonData = JSON.parse(data);
      console.log(`Parsed Data Status - Location: ${jsonData.node_location || "N/A"}`);

      if (jsonData.error) {
        console.warn("⚠️ API Returned Error:", jsonData.error);
        $.notify("BandwagonHost Status", "❌ API 错误", jsonData.error);
        $.done({});
        return;
      }

      // 提取用量与状态
      const dataCounter = Number(jsonData.data_counter) || 0;
      const planMonthlyData = Number(jsonData.plan_monthly_data) || 0;
      const monthlyDataMultiplier = Number(jsonData.monthly_data_multiplier) || 1;
      const dataNextReset = jsonData.data_next_reset
        ? new Date(jsonData.data_next_reset * 1000).toLocaleDateString()
        : "未知";
      const location = jsonData.node_location || "";

      // 提取并分类 IPv4 / IPv6
      const rawIps = Array.isArray(jsonData.ip_addresses)
        ? jsonData.ip_addresses
        : (jsonData.ip_addresses ? String(jsonData.ip_addresses).split(",") : []);
      const ipv4List = [];
      const ipv6List = [];
      rawIps.forEach((ip) => {
        const trimmed = String(ip).trim();
        if (!trimmed) return;
        if (trimmed.includes(":")) ipv6List.push(trimmed);
        else if (trimmed.includes(".")) ipv4List.push(trimmed);
      });

      // 带宽与进度条计算 (防御除零与 NaN 隐患)
      const usedBandwidthGB = ((dataCounter * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const totalBandwidthGB = ((planMonthlyData * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const usageRatio = planMonthlyData > 0 ? (dataCounter / planMonthlyData) : 0;
      const usedPercentage = (usageRatio * 100).toFixed(2);

      const barLen = 10;
      const filled = Math.min(Math.max(Math.round(barLen * usageRatio), 0), barLen);
      const progressBar = "█".repeat(filled) + "░".repeat(barLen - filled);

      const subTitle = location || (ipv4List[0] ? `IP: ${ipv4List[0]}` : "正常运行");
      let body = `[${progressBar}] ${usedPercentage}%\n`;
      if (ipv4List.length > 0) body += `• IPv4: ${ipv4List.join(", ")}\n`;
      if (ipv6List.length > 0) body += `• IPv6: ${ipv6List.join(", ")}\n`;
      else if (ipv4List.length === 0 && rawIps.length > 0) body += `• IP: ${rawIps.join(", ")}\n`;
      body += `• 流量: ${usedBandwidthGB} GB / ${totalBandwidthGB} GB (${monthlyDataMultiplier}x)\n`;
      body += `• 状态: 正常运行 · 重置日 ${dataNextReset}`;

      notifySub = subTitle;
      notifyMsg = body;
      isSuccess = true;
    } catch (e) {
      console.error("❌ Parse Error:", e);
      $.notify("BandwagonHost Status", "❌ 解析错误", e.message || String(e));
      $.done({});
      return;
    }

    if (isSuccess) {
      console.log("🔔 Sending Notification...");
      $.notify("BandwagonHost Status", notifySub, notifyMsg);
      $.done({});
    }
  });
}

function main() {
  getServiceInfo();
}

main();
