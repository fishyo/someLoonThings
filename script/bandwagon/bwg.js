
// 跨平台兼容适配
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

// BoxJS 配置模板
const boxjsConfig = {
  // 应用图标
  icon: "🖲️",
  // 应用名称
  title: "Bandwagon 服务器状态",
  // 应用描述
  desc: "Bandwagon 面板服务器状态查询",
  // 应用操作
  settings: [
    {
      id: "bandwagon.apiKey",
      name: "API Key",
      val: "",
      type: "text",
      desc: "Bandwagon API Key",
      placeholder: "输入你的 API Key",
    },
    {
      id: "bandwagon.veid",
      name: "VEID",
      val: "",
      type: "text",
      desc: "Bandwagon VEID",
      placeholder: "输入你的 VEID",
    },
  ],
};

// 获取存储的配置
function getConfig() {
  // 支持多种存储方式：$persistentStore (Loon/Surge), $prefs (QuanX)
  let apiKey = "";
  let veid = "";

  if (typeof $persistentStore !== "undefined") {
    // Loon/Surge
    apiKey = $persistentStore.read("bandwagon.apiKey") || "";
    veid = $persistentStore.read("bandwagon.veid") || "";
  } else if (typeof $prefs !== "undefined") {
    // QuantumultX
    apiKey = $prefs.valueForKey("bandwagon.apiKey") || "";
    veid = $prefs.valueForKey("bandwagon.veid") || "";
  }

  console.log("读取配置 - API Key 长度:", apiKey.length, "VEID:", veid);

  return {
    apiKey: apiKey,
    veid: veid,
  };
}

// 保存配置到 BoxJS
function saveConfig(apiKey, veid) {
  if (typeof $persistentStore !== "undefined") {
    // Loon/Surge
    $persistentStore.write(apiKey, "bandwagon.apiKey");
    $persistentStore.write(veid, "bandwagon.veid");
  } else if (typeof $prefs !== "undefined") {
    // QuantumultX
    $prefs.setValueForKey(apiKey, "bandwagon.apiKey");
    $prefs.setValueForKey(veid, "bandwagon.veid");
  }
  console.log("配置已保存到 BoxJS");
}

function getServiceInfo() {
  const config = getConfig();

  // 验证配置
  if (!config.apiKey || !config.veid) {
    $notification.post(
      "⚠️ 配置不完整",
      "",
      "请在 BoxJS 中配置 API Key 和 VEID\n访问: http://boxjs.com"
    );
    $done();
    return;
  }

  const apiUrl = `https://api.64clouds.com/v1/getServiceInfo?veid=${config.veid}&api_key=${config.apiKey}`;

  const request = {
    url: apiUrl,
    method: "GET",
  };

  console.log("发送请求到 API:", apiUrl);

  $httpClient.get(request, function (error, response, data) {
    if (error) {
      console.error("获取服务信息时出错:", error);
      $notification.post("❌ 服务信息查询失败", "", error.message);
      $done();
      return;
    }

    try {
      console.log("收到 API 响应数据");
      const jsonData = JSON.parse(data);
      console.log("解析后的服务信息:", jsonData);

      // 检查 API 响应是否有错误
      if (jsonData.error) {
        $notification.post(
          "❌ API 错误",
          "",
          jsonData.error + "\n请检查 API Key 和 VEID 是否正确"
        );
        $done();
        return;
      }

      // 提取带宽使用情况和重置时间
      const dataCounter = jsonData.data_counter; // 当前使用的带宽字节数
      const planMonthlyData = jsonData.plan_monthly_data; // 每月计划带宽字节数
      const monthlyDataMultiplier = jsonData.monthly_data_multiplier; // 带宽乘数
      const dataNextReset = new Date(
        jsonData.data_next_reset * 1000
      ).toLocaleDateString(); // 重置时间，转换为可读格式
      const ipAddresses = jsonData.ip_addresses.join(", "); // 提取 IP 地址

      // 计算带宽使用情况
      const usedBandwidthGB = (
        (dataCounter * monthlyDataMultiplier) /
        (1024 * 1024 * 1024)
      ).toFixed(2); // 当前使用的带宽（GB）
      const totalBandwidthGB = (
        (planMonthlyData * monthlyDataMultiplier) /
        (1024 * 1024 * 1024)
      ).toFixed(2); // 每月总带宽（GB）

      console.log(
        "当前带宽使用:",
        usedBandwidthGB,
        "GB /",
        totalBandwidthGB,
        "GB"
      );

      // 计算进度条
      const usedPercentage = ((dataCounter / planMonthlyData) * 100).toFixed(2);
      const progressBarLength = 10; // 进度条长度
      const filledLength = Math.round(
        progressBarLength * (dataCounter / planMonthlyData)
      );
      const progressBar =
        "█".repeat(filledLength) + "░".repeat(progressBarLength - filledLength);

      // 处理并显示带宽使用情况和重置时间
      let statusMessage = ``;
      statusMessage += `IP 地址: ${ipAddresses}\n`;
      statusMessage += `当前使用: ${usedBandwidthGB} / ${totalBandwidthGB} GB\n`;
      statusMessage += `使用进度: ${progressBar} ${usedPercentage}%\n`;
      statusMessage += `重置时间: ${dataNextReset}\n`;
      statusMessage += `节点位置: ${jsonData.node_location}\n`;
      statusMessage += `带宽倍数: ${monthlyDataMultiplier}x\n`;

      $notification.post("🖲️ 服务器状态", "", statusMessage);
      console.log("发送通知:", statusMessage);
      $done();
    } catch (e) {
      console.error("解析 JSON 时出错:", e);
      $notification.post("❌ 解析错误", "", e.message);
      $done();
    }
  });
}

// 主函数
function main() {
  // 如果是在配置界面，显示配置选项
  if (
    typeof $environment !== "undefined" &&
    $environment.platform === "boxjs"
  ) {
    // 在 BoxJS 中显示配置界面
    showBoxJSConfig();
  } else {
    // 运行脚本
    getServiceInfo();
  }
}

function showBoxJSConfig() {
  const config = getConfig();
  const configUI = {
    title: boxjsConfig.title,
    icon: boxjsConfig.icon,
    items: boxjsConfig.settings.map((item) => ({
      ...item,
      val: item.id === "bandwagon.apiKey" ? config.apiKey : config.veid,
    })),
  };

  console.log("显示 BoxJS 配置界面:", JSON.stringify(configUI));
  $done();
}

// 执行主函数
main();
