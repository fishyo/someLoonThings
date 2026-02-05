// 跨平台兼容适配
const $ = {
  isLoon: typeof $loon !== "undefined",
  isQuanX: typeof $task !== "undefined",
  isSurge: typeof $httpClient !== "undefined" && typeof $loon === "undefined",
  read: (key) => {
    if (typeof $persistentStore !== "undefined")
      return $persistentStore.read(key);
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
  },
  write: (val, key) => {
    if (typeof $persistentStore !== "undefined")
      return $persistentStore.write(val, key);
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
  },
  notify: (title, sub, msg) => {
    if (typeof $notification !== "undefined")
      $notification.post(title, sub, msg);
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
        (err) => cb(err, null, null),
      );
    }
  },
  done: (obj) => {
    if (typeof $done !== "undefined") $done(obj);
  },
};

// BoxJS 配置模板
const boxjsConfig = {
  // 应用图标
  icon: "🖥️",
  // 应用名称
  title: "RackNerd 服务器状态",
  // 应用描述
  desc: "RackNerd VPS 服务器状态查询",
  // 应用操作
  settings: [
    {
      id: "racknerd.apiKey",
      name: "API Key",
      val: "",
      type: "text",
      desc: "RackNerd API Key",
      placeholder: "输入你的 API Key",
    },
    {
      id: "racknerd.apiHash",
      name: "API Hash",
      val: "",
      type: "text",
      desc: "RackNerd API Hash",
      placeholder: "输入你的 API Hash",
    },
  ],
};

// 获取存储的配置
function getConfig() {
  // 支持多种存储方式：$persistentStore (Loon/Surge), $prefs (QuanX)
  let apiKey = "";
  let apiHash = "";

  if (typeof $persistentStore !== "undefined") {
    // Loon/Surge
    apiKey = $persistentStore.read("racknerd.apiKey") || "";
    apiHash = $persistentStore.read("racknerd.apiHash") || "";
  } else if (typeof $prefs !== "undefined") {
    // QuantumultX
    apiKey = $prefs.valueForKey("racknerd.apiKey") || "";
    apiHash = $prefs.valueForKey("racknerd.apiHash") || "";
  }

  console.log(
    "读取配置 - API Key 长度:",
    apiKey.length,
    "API Hash 长度:",
    apiHash.length,
  );

  return {
    apiKey: apiKey,
    apiHash: apiHash,
  };
}

// 保存配置到 BoxJS
function saveConfig(apiKey, apiHash) {
  if (typeof $persistentStore !== "undefined") {
    // Loon/Surge
    $persistentStore.write(apiKey, "racknerd.apiKey");
    $persistentStore.write(apiHash, "racknerd.apiHash");
  } else if (typeof $prefs !== "undefined") {
    // QuantumultX
    $prefs.setValueForKey(apiKey, "racknerd.apiKey");
    $prefs.setValueForKey(apiHash, "racknerd.apiHash");
  }
  console.log("配置已保存到 BoxJS");
}

// 解析 XML 响应
function parseXML(xmlString) {
  const result = {};
  
  // 匹配所有标签 (支持跨行和奇怪的格式)
  const regex = /<(\w+)>(.*?)<\/\1>/gs;
  let match;
  while ((match = regex.exec(xmlString)) !== null) {
      // 去除首尾空白
    result[match[1]] = match[2].trim();
  }

  return result;
}

function getServiceInfo() {
  const config = getConfig();

  // 验证配置
  if (!config.apiKey || !config.apiHash) {
    $notification.post(
      "⚠️ 配置不完整",
      "",
      "请在 BoxJS 中配置 API Key 和 API Hash\n访问: http://boxjs.com",
    );
    $done();
    return;
  }

  // 构建 SolusVM API URL
  const apiUrl = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${config.apiKey}&hash=${config.apiHash}&ipaddr=true&hdd=true&mem=true&bw=true&status=true`;

  const request = {
    url: apiUrl,
    method: "GET",
    headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    }
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
      // console.log("收到 API 响应数据(Raw):", data); 
      const xmlData = parseXML(data);
      console.log("解析后的服务信息:", JSON.stringify(xmlData));

      // 检查 API 响应是否有错误
      if (xmlData.status === "error") {
        $notification.post(
          "❌ API 错误",
          "",
          xmlData.statusmsg + "\n请检查 API Key 和 Hash 是否正确",
        );
        $done();
        return;
      }

      // 辅助函数：解析 CSV 数据 (Total,Used,Free,Percent)
      const parseResource = (str) => {
          if (!str) return { total: 0, used: 0, free: 0, percent: 0 };
          
          // 处理 SolusVM 可能返回的奇怪格式，确保 split 后每一项都去空格
          const parts = str.split(",").map(s => s.trim());
          
          // 如果是 4段: total, used, free, percent
          if (parts.length >= 4) {
              return {
                  total: parseFloat(parts[0]),
                  used: parseFloat(parts[1]),
                  free: parseFloat(parts[2]),
                  percent: parseFloat(parts[3])
              };
          }
           // 如果是 3段
           if (parts.length === 3) {
               const total = parseFloat(parts[0]);
               const used = parseFloat(parts[1]);
               return {
                   total: total,
                   used: used,
                   free: parseFloat(parts[2]),
                   percent: total > 0 ? ((used / total) * 100).toFixed(2) : 0
               };
           }

           // Fallback/Legacy
           return { total: 0, used: parseFloat(str) || 0, free: 0, percent: 0 };
      };

      // 格式化字节
      const formatBytes = (bytes, decimals = 2) => {
          if (bytes === 0 || isNaN(bytes)) return '0 B';
          const k = 1024;
          const dm = decimals < 0 ? 0 : decimals;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      };

      // 提取带宽信息 (仅带宽是有效的)
      const bwInfo = parseResource(xmlData.bw);

      // 处理 ipaddress (可能是 CSV)
      const ipAddress = (xmlData.ipaddress || xmlData.ip_address || "").split(',')[0];

      // 状态
      const vmStatus = xmlData.vmstat || "Unknown";
      const vmStatusIcon = vmStatus.toLowerCase() === "online" ? "🟢" : "🔴";

      // 计算进度条
      const getProgressBar = (percent) => {
        const progressBarLength = 10;
        const p = parseFloat(percent) || 0;
        const filledLength = Math.round(progressBarLength * (p / 100));
        const validFilled = Math.min(Math.max(filledLength, 0), progressBarLength);
         return "█".repeat(validFilled) + "░".repeat(progressBarLength - validFilled);
      };

      // 准备发送通知函数
      const sendNotify = (location) => {
          let statusMessage = `Host: ${xmlData.hostname || "N/A"}\n`;
          
          if (ipAddress) {
              statusMessage += `IP: ${ipAddress}\n`; 
          }
          
          statusMessage += `Status: ${vmStatusIcon} ${vmStatus}\n`;
          
          // 如果有 External Location 则显示
          if (location) {
              statusMessage += `Location: ${location}\n`;
          } else if (xmlData.node && xmlData.node !== "N/A" && xmlData.node !== "") {
              statusMessage += `Location: ${xmlData.node}\n`;
          }

          // Bandwidth
          if (bwInfo.total > 0) {
              statusMessage += `\n带宽: ${formatBytes(bwInfo.used)} / ${formatBytes(bwInfo.total)}\n`;
              statusMessage += `${getProgressBar(bwInfo.percent)} ${bwInfo.percent}%\n`;
          }

          $notification.post("🖥️ RackNerd 服务器状态", "", statusMessage);
          console.log("发送通知内容:\n" + statusMessage); 
          $done();
      };

      // 如果有 IP，尝试查询位置
      if (ipAddress) {
          console.log("正在查询 IP 位置:", ipAddress);
          const ipApiUrl = `http://ip-api.com/json/${ipAddress}?lang=en`;
          $httpClient.get({ url: ipApiUrl }, (err, resp, body) => {
              let location = null;
              if (!err && body) {
                  try {
                      const ipData = JSON.parse(body);
                      if (ipData && ipData.status === 'success') {
                          // 显示国家代码和州/大区 (例如: US California)
                          location = `${ipData.countryCode} ${ipData.regionName}`; 
                          console.log("IP 位置查询成功:", location);
                      }
                  } catch (e) {
                      console.warn("IP 位置解析失败:", e);
                  }
              }
              sendNotify(location);
          });
      } else {
          sendNotify(null);
      }

    } catch (e) {
      console.error("解析响应时出错:", e);
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
      val: item.id === "racknerd.apiKey" ? config.apiKey : config.apiHash,
    })),
  };

  console.log("显示 BoxJS 配置界面:", JSON.stringify(configUI));
  $done();
}

// 执行主函数
main();
