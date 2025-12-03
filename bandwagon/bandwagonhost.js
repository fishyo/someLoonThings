const apiKey = "private_zHjvZ6xQLGuj2CXUyFfBBdbn"; // 替换为您的实际 API 密钥
const veid = "1063564"; // 替换为您的实际 VEID
const apiUrl = `https://api.64clouds.com/v1/getServiceInfo?veid=${veid}&api_key=${apiKey}`;

function getServiceInfo() {
  const request = {
    url: apiUrl,
    method: "GET",
  };

  console.log("发送请求到 API:", apiUrl); // 打印请求的 URL

  $httpClient.get(request, function (error, response, data) {
    if (error) {
      console.error("获取服务信息时出错:", error);
      $notification.post("服务信息查询失败", "", error.message);
      $done(); // 结束脚本
      return;
    }

    console.log("收到 API 响应数据"); // 打印收到响应的提示
    const jsonData = JSON.parse(data);
    console.log("解析后的服务信息:", jsonData); // 打印解析后的 JSON 数据

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
    ); // 打印当前带宽使用情况

    // 计算进度条
    const usedPercentage = (
      (dataCounter / planMonthlyData) *
      100
    ).toFixed(2);
    const progressBarLength = 10; // 进度条长度
    const filledLength = Math.round(
      progressBarLength *
        (dataCounter / planMonthlyData)
    );
    const progressBar =
      "%".repeat(filledLength) + "#".repeat(progressBarLength - filledLength);

    // 处理并显示带宽使用情况和重置时间
    let statusMessage = ``;
    statusMessage += `IP 地址: ${ipAddresses}\n`;
    statusMessage += `当前使用: ${usedBandwidthGB} / ${totalBandwidthGB} GB\n`;
    statusMessage += `使用进度: ${progressBar} ${usedPercentage}%\n`;
    statusMessage += `重置时间: ${dataNextReset}\n`;
    statusMessage += `节点位置: ${jsonData.node_location} Premium Bandwidth Multiplier: ${monthlyDataMultiplier}x\n`;

    $notification.post("🖲️服务器状态", "", statusMessage); // 使用新的通知格式
    console.log("发送通知:", statusMessage); // 打印发送的通知内容
    $done(); // 结束脚本
  });
}

getServiceInfo();
