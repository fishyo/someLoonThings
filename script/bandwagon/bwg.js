// 跨平台适配
const $ = {
  isLoon: typeof $loon !== "undefined",
  isQuanX: typeof $task !== "undefined",
  isSurge: typeof $httpClient !== "undefined" && typeof $loon === "undefined",
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
  done: (obj) => {
    if (typeof $done !== "undefined") $done(obj);
  }
};

// BoxJS Config
const boxjsConfig = {
  icon: "🖲️",
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

// 获取配置
function getConfig() {
  let apiKey = "";
  let veid = "";

  if (typeof $persistentStore !== "undefined") {
    apiKey = $persistentStore.read("bandwagon.apiKey") || "";
    veid = $persistentStore.read("bandwagon.veid") || "";
  } else if (typeof $prefs !== "undefined") {
    apiKey = $prefs.valueForKey("bandwagon.apiKey") || "";
    veid = $prefs.valueForKey("bandwagon.veid") || "";
  }
  console.log(`Config Read - Key Len: ${apiKey.length}, VEID: ${veid}`);
  return { apiKey, veid };
}

// 保存配置
function saveConfig(apiKey, veid) {
  if (typeof $persistentStore !== "undefined") {
    $persistentStore.write(apiKey, "bandwagon.apiKey");
    $persistentStore.write(veid, "bandwagon.veid");
  } else if (typeof $prefs !== "undefined") {
    $prefs.setValueForKey(apiKey, "bandwagon.apiKey");
    $prefs.setValueForKey(veid, "bandwagon.veid");
  }
}

function getServiceInfo() {
  const config = getConfig();

  // 验证配置
  if (!config.apiKey || !config.veid) {
    $notification.post(
      "⚠️ 配置缺失",
      "",
      "请在 BoxJS 中配置 API Key 和 VEID"
    );
    $done();
    return;
  }

  const apiUrl = `https://api.64clouds.com/v1/getServiceInfo?veid=${config.veid}&api_key=${config.apiKey}`;
  const request = { url: apiUrl, method: "GET" };

  console.log("Request API:", apiUrl);

  $httpClient.get(request, function (error, response, data) {
    if (error) {
      console.error("Request Error:", error);
      $notification.post("❌ 查询失败", "", error.message);
      $done();
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      console.log("Parsed Data:", jsonData);

      if (jsonData.error) {
        $notification.post("❌ API Error", "", jsonData.error);
        $done();
        return;
      }

      // 数据提取
      const dataCounter = jsonData.data_counter;
      const planMonthlyData = jsonData.plan_monthly_data;
      const monthlyDataMultiplier = jsonData.monthly_data_multiplier;
      const dataNextReset = new Date(jsonData.data_next_reset * 1000).toLocaleDateString();
      const ipAddresses = jsonData.ip_addresses.join(", "); 

      // 带宽计算 (GB)
      const usedBandwidthGB = ((dataCounter * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);
      const totalBandwidthGB = ((planMonthlyData * monthlyDataMultiplier) / (1024 * 1024 * 1024)).toFixed(2);

      // 进度条
      const usedPercentage = ((dataCounter / planMonthlyData) * 100).toFixed(2);
      const progressBarLength = 10;
      const filledLength = Math.round(progressBarLength * (dataCounter / planMonthlyData));
      const progressBar = "█".repeat(Math.min(filledLength, progressBarLength)) + "░".repeat(Math.max(0, progressBarLength - filledLength));

      let msg = ``;
      msg += `IP 地址: ${ipAddresses}\n`;
      msg += `当前使用: ${usedBandwidthGB} / ${totalBandwidthGB} GB\n`;
      msg += `使用进度: ${progressBar} ${usedPercentage}%\n`;
      msg += `重置时间: ${dataNextReset}\n`;
      msg += `节点位置: ${jsonData.node_location}\n`;
      msg += `带宽倍数: ${monthlyDataMultiplier}x\n`;

      $notification.post("🖲️ Bandwagon Status", "", msg);
      $done();
    } catch (e) {
      console.error("Parse Error:", e);
      $notification.post("❌ 解析错误", "", e.message);
      $done();
    }
  });
}

function main() {
  if (typeof $environment !== "undefined" && $environment.platform === "boxjs") {
    const config = getConfig();
    $done({
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
