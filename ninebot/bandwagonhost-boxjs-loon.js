/**
 * Bandwagon 服务器状态查询脚本 - BoxJS 版本
 * 支持在 Loon 中通过 BoxJS 配置 API Key 和 VEID
 * 
 * Loon 脚本配置示例:
 * [Script]
 * # Bandwagon 定时查询
 * bandwagon = script-path=https://raw.githubusercontent.com/your/repo/bandwagonhost-boxjs.js, timeout=10, tag=Bandwagon
 * 
 * 定时执行 (每小时查询一次):
 * bandwagon_cron = cron "0 * * * *" script-path=https://raw.githubusercontent.com/your/repo/bandwagonhost-boxjs.js, timeout=10, tag=Bandwagon_Cron
 */

// ======================== BoxJS 配置开始 ========================
// 通过 BoxJS 读取配置，无需修改脚本即可更换 API Key 和 VEID
const CONFIG = {
  apiKey: $prefs.valueForKey("bandwagon.apiKey") || "", // 从 BoxJS 读取
  veid: $prefs.valueForKey("bandwagon.veid") || "" // 从 BoxJS 读取
};

// ======================== 工具函数 ========================

/**
 * 获取通知图标显示
 */
function getIcon(type = "info") {
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    server: "🖲️"
  };
  return icons[type] || "ℹ️";
}

/**
 * 生成带宽使用进度条
 */
function generateProgressBar(used, total, length = 10) {
  const percentage = (used / total) * 100;
  const filled = Math.round((length * used) / total);
  const bar = "█".repeat(filled) + "░".repeat(length - filled);
  return {
    bar: bar,
    percentage: percentage.toFixed(2)
  };
}

/**
 * 字节转 GB
 */
function bytesToGB(bytes, multiplier = 1) {
  return ((bytes * multiplier) / (1024 * 1024 * 1024)).toFixed(2);
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString("zh-CN");
}

// ======================== 主要功能函数 ========================

/**
 * 获取 Bandwagon 服务器信息
 */
function getServiceInfo() {
  // 验证配置
  if (!CONFIG.apiKey || !CONFIG.veid) {
    showConfigError();
    return;
  }

  const apiUrl = `https://api.64clouds.com/v1/getServiceInfo?veid=${CONFIG.veid}&api_key=${CONFIG.apiKey}`;

  console.log("🔍 发送 API 请求...");
  console.log("API URL:", apiUrl);

  const request = {
    url: apiUrl,
    method: "GET",
    timeout: 10
  };

  $httpClient.get(request, function (error, response, data) {
    if (error) {
      console.error("❌ 网络请求失败:", error);
      $notification.post(
        `${getIcon("error")} Bandwagon 查询失败`,
        "网络错误",
        error.message
      );
      $done();
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      
      // 检查 API 是否返回错误
      if (jsonData.error || !jsonData.data_counter !== undefined) {
        showAPIError(jsonData.error || "未知错误");
        return;
      }

      displayServiceInfo(jsonData);
    } catch (error) {
      console.error("❌ JSON 解析失败:", error);
      $notification.post(
        `${getIcon("error")} 数据解析失败`,
        "",
        error.message
      );
      $done();
    }
  });
}

/**
 * 显示服务器信息
 */
function displayServiceInfo(data) {
  try {
    // 提取数据
    const dataCounter = data.data_counter || 0;
    const planMonthlyData = data.plan_monthly_data || 0;
    const monthlyDataMultiplier = data.monthly_data_multiplier || 1;
    const dataNextReset = formatDate(data.data_next_reset);
    const ipAddresses = (data.ip_addresses || []).join(", ");
    const nodeLocation = data.node_location || "未知";
    const vpsName = data.hostname || "未命名";

    // 计算带宽
    const usedBandwidthGB = bytesToGB(dataCounter, monthlyDataMultiplier);
    const totalBandwidthGB = bytesToGB(planMonthlyData, monthlyDataMultiplier);
    
    // 生成进度条
    const progress = generateProgressBar(dataCounter, planMonthlyData, 10);

    // 构建消息
    let message = ``;
    message += `VPS: ${vpsName}\n`;
    message += `IP: ${ipAddresses}\n`;
    message += `位置: ${nodeLocation}\n\n`;
    message += `带宽: ${usedBandwidthGB} / ${totalBandwidthGB} GB\n`;
    message += `进度: ${progress.bar} ${progress.percentage}%\n`;
    message += `倍数: ${monthlyDataMultiplier}x\n`;
    message += `重置: ${dataNextReset}`;

    console.log("✅ 获取成功");
    console.log(message);

    // 发送通知
    $notification.post(
      `${getIcon("server")} Bandwagon 服务器状态`,
      `${nodeLocation} | ${progress.percentage}% 已用`,
      message
    );

    $done();
  } catch (error) {
    console.error("❌ 显示信息时出错:", error);
    $notification.post(
      `${getIcon("error")} 显示失败`,
      "",
      error.message
    );
    $done();
  }
}

/**
 * 显示 API 错误
 */
function showAPIError(error) {
  console.error("❌ API 返回错误:", error);
  $notification.post(
    `${getIcon("error")} API 错误`,
    "请检查配置",
    `API Key 或 VEID 可能不正确\n错误: ${error}`
  );
  $done();
}

/**
 * 显示配置错误
 */
function showConfigError() {
  console.warn("⚠️ 配置不完整");
  $notification.post(
    `${getIcon("warning")} 配置不完整`,
    "点击跳转到 BoxJS 配置",
    "请先在 BoxJS 中配置 API Key 和 VEID\n访问: http://boxjs.com",
    {
      "open-url": "http://boxjs.com"
    }
  );
  $done();
}

// ======================== 执行 ========================
console.log("🚀 Bandwagon 服务器状态查询脚本启动");
getServiceInfo();
