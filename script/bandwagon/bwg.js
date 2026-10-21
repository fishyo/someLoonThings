/**
 * 搬瓦工 (BandwagonHost) VPS 状态与流量查询
 * 
 * 配置优先级:
 * 1. Loon 插件参数 ($argument: veid & apiKey)
 * 2. BoxJS / 持久化存储 (bandwagon.veid & bandwagon.apiKey)
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

// 获取配置信息
function getConfig() {
  let apiKey = "";
  let veid = "";

  // 1. Loon 插件参数
  const arg = parseArgument();
  if (arg.apiKey && String(arg.apiKey).trim()) apiKey = String(arg.apiKey).trim();
  if (arg.veid && String(arg.veid).trim()) veid = String(arg.veid).trim();

  // 2. BoxJS / 持久化存储 (回退机制)
  if (!apiKey || !veid) {
    if (typeof $persistentStore !== "undefined") {
      apiKey = apiKey || $persistentStore.read("bandwagon.apiKey") || "";
      veid = veid || $persistentStore.read("bandwagon.veid") || "";
    } else if (typeof $prefs !== "undefined") {
      apiKey = apiKey || $prefs.valueForKey("bandwagon.apiKey") || "";
      veid = veid || $prefs.valueForKey("bandwagon.veid") || "";
    }
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
      "请在 Loon 插件设置或 BoxJS 中配置 API Key 和 VEID"
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
      const ipAddresses = (jsonData.ip_addresses || []).join(", ");
      const location = jsonData.node_location || "";

      // 带宽与进度条计算
      const usedBandwidthGB = ((dataCounter * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const totalBandwidthGB = ((planMonthlyData * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const usedPercentage = ((dataCounter / planMonthlyData) * 100).toFixed(2);

      const barLen = 10;
      const filled = Math.min(Math.max(Math.round(barLen * (dataCounter / planMonthlyData)), 0), barLen);
      const progressBar = "█".repeat(filled) + "░".repeat(barLen - filled);

      const subTitle = [ipAddresses, location].filter(Boolean).join(" · ");
      let body = `[${progressBar}] ${usedPercentage}%\n`;
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
