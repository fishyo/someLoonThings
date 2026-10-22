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
    if (typeof $httpClient !== "undefined") $httpClient.get(opts, cb);
    else if (typeof $task !== "undefined") {
      if (typeof opts === "string") opts = { url: opts };
      opts.method = "GET";
      $task.fetch(opts).then(
        (resp) => cb(null, { ...resp, status: resp.statusCode }, resp.body),
        (err) => cb(err, null, null)
      );
    }
  },
  done: (obj = {}) => {
    if (typeof $done !== "undefined") $done(obj);
  }
};

// BoxJS 应用配置
const boxjsConfig = {
  icon: "https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/bandwagon.png",
  title: "Bandwagon Status",
  desc: "Bandwagon VPS 状态查询",
  settings: [
    {
      id: "bandwagon.apiKey",
      name: "API Key",
      val: "",
      type: "text",
      desc: "Bandwagon API Key",
      placeholder: "输入 API Key",
    },
    {
      id: "bandwagon.veid",
      name: "VEID",
      val: "",
      type: "text",
      desc: "Bandwagon VEID",
      placeholder: "输入 VEID",
    },
  ],
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

  const apiUrl = `https://api.64clouds.com/v1/getServiceInfo?veid=${config.veid}&api_key=${config.apiKey}`;
  const request = { url: apiUrl, method: "GET" };

  const maskedUrl = apiUrl.replace(/veid=([^&]+)/, "veid=****").replace(/api_key=([^&]+)/, "api_key=****");
  console.log(`Request API: ${maskedUrl}`);

  $.get(request, function (error, response, data) {
    if (error) {
      console.error("❌ Request Error:", error);
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
      console.log("Parsed Data:", JSON.stringify(jsonData, null, 2));

      if (jsonData.error) {
        console.warn("⚠️ API Returned Error:", jsonData.error);
        $.notify("BandwagonHost Status", "❌ API 错误", jsonData.error);
        $.done({});
        return;
      }

      // 提取用量与状态
      const dataCounter = jsonData.data_counter;
      const planMonthlyData = jsonData.plan_monthly_data;
      const monthlyDataMultiplier = jsonData.monthly_data_multiplier;
      const dataNextReset = new Date(jsonData.data_next_reset * 1000).toLocaleDateString();
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

      // 带宽与进度条计算
      const usedBandwidthGB = ((dataCounter * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const totalBandwidthGB = ((planMonthlyData * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const usedPercentage = ((dataCounter / planMonthlyData) * 100).toFixed(2);

      const barLen = 10;
      const filled = Math.min(Math.max(Math.round(barLen * (dataCounter / planMonthlyData)), 0), barLen);
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
  if (typeof $environment !== "undefined" && $environment.platform === "boxjs") {
    const config = getConfig();
    $.done({
      title: boxjsConfig.title,
      icon: boxjsConfig.icon,
      items: boxjsConfig.settings.map((item) => ({
        ...item,
        val: item.id === "bandwagon.apiKey" ? config.apiKey : config.veid,
      })),
    });
  } else {
    getServiceInfo();
  }
}

main();
