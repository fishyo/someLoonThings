// 跨平台适配
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

// BoxJS Config
const boxjsConfig = {
  icon: "🖥️",
  title: "RackNerd Status",
  desc: "RackNerd VPS 状态查询",
  settings: [
    {
      id: "racknerd.apiKey",
      name: "API Key",
      val: "",
      type: "text",
      desc: "RackNerd API Key",
      placeholder: "输入 API Key",
    },
    {
      id: "racknerd.apiHash",
      name: "API Hash",
      val: "",
      type: "text",
      desc: "RackNerd API Hash",
      placeholder: "输入 API Hash",
    },
  ],
};

// 获取配置
function getConfig() {
  let apiKey = "";
  let apiHash = "";

  if (typeof $persistentStore !== "undefined") {
    apiKey = $persistentStore.read("racknerd.apiKey") || "";
    apiHash = $persistentStore.read("racknerd.apiHash") || "";
  } else if (typeof $prefs !== "undefined") {
    apiKey = $prefs.valueForKey("racknerd.apiKey") || "";
    apiHash = $prefs.valueForKey("racknerd.apiHash") || "";
  }

  console.log(`Config Read - Key Len: ${apiKey.length}, Hash Len: ${apiHash.length}`);
  return { apiKey, apiHash };
}

// 保存配置
function saveConfig(apiKey, apiHash) {
  if (typeof $persistentStore !== "undefined") {
    $persistentStore.write(apiKey, "racknerd.apiKey");
    $persistentStore.write(apiHash, "racknerd.apiHash");
  } else if (typeof $prefs !== "undefined") {
    $prefs.setValueForKey(apiKey, "racknerd.apiKey");
    $prefs.setValueForKey(apiHash, "racknerd.apiHash");
  }
}

// 解析 XML
function parseXML(xmlString) {
  const result = {};
  const regex = /<(\w+)>(.*?)<\/\1>/gs;
  let match;
  while ((match = regex.exec(xmlString)) !== null) {
    result[match[1]] = match[2].trim();
  }
  return result;
}

function getServiceInfo() {
  const config = getConfig();

  // 验证配置
  if (!config.apiKey || !config.apiHash) {
    $notification.post(
      "⚠️ 配置缺失",
      "",
      "请在 BoxJS 中配置 RackNerd API Key 和 Hash"
    );
    $done();
    return;
  }

  // SolusVM API
  const apiUrl = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${config.apiKey}&hash=${config.apiHash}&ipaddr=true&hdd=true&mem=true&bw=true&status=true`;
  const request = {
    url: apiUrl,
    method: "GET",
    headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    }
  };

  console.log("Request API:", apiUrl);

  $httpClient.get(request, function (error, response, data) {
    if (error) {
      console.error("Request Error:", error);
      $notification.post("❌ 查询失败", "", error.message);
      $done();
      return;
    }

    try {
      const xmlData = parseXML(data);
      console.log("Parsed Data:", JSON.stringify(xmlData));

      if (xmlData.status === "error") {
        $notification.post("❌ API Error", "", xmlData.statusmsg);
        $done();
        return;
      }

      // 资源计算
      const parseResource = (str) => {
          if (!str) return { total: 0, used: 0, free: 0, percent: "0.00" };
          const parts = str.split(",").map(s => s.trim());
          let total = 0, used = 0;
          if (parts.length >= 2) {
              total = parseFloat(parts[0]);
              used = parseFloat(parts[1]);
          } else {
              used = parseFloat(str) || 0;
          }
          let percent = total > 0 ? (used / total) * 100 : 0;
          return { total: total, used: used, percent: percent.toFixed(2) };
      };

      // 格式化
      const formatBytes = (bytes, decimals = 2) => {
          if (bytes === 0 || isNaN(bytes)) return '0 B';
          const k = 1024;
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
          return parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals))) + ' ' + sizes[i];
      };

      const bwInfo = parseResource(xmlData.bw);
      const ipAddress = (xmlData.ipaddress || xmlData.ip_address || "").split(',')[0];
      const vmStatus = xmlData.vmstat || "Unknown";
      const vmStatusIcon = vmStatus.toLowerCase() === "online" ? "🟢" : "🔴";

      // 进度条
      const getProgressBar = (percent) => {
        const len = 10;
        const p = parseFloat(percent) || 0;
        const filled = Math.round(len * (p / 100));
        const valid = Math.min(Math.max(filled, 0), len);
        return "█".repeat(valid) + "░".repeat(len - valid);
      };

      // 发送通知
      const sendNotify = (location) => {
          let msg = ``;
          if (ipAddress) msg += `IP 地址: ${ipAddress}\n`; 
          if (bwInfo.total > 0) {
              msg += `当前使用: ${formatBytes(bwInfo.used)} / ${formatBytes(bwInfo.total)}\n`;
              msg += `使用进度: ${getProgressBar(bwInfo.percent)} ${bwInfo.percent}%\n`;
          }
          if (location) {
              msg += `节点位置: ${location}\n`;
          } else if (xmlData.node && xmlData.node !== "N/A" && xmlData.node !== "") {
              msg += `节点位置: ${xmlData.node}\n`;
          }
          msg += `运行状态: ${vmStatusIcon} ${vmStatus}\n`;
          if (xmlData.hostname && xmlData.hostname !== "N/A") {
             msg += `主机名称: ${xmlData.hostname}\n`;
          }
          $notification.post("🖥️ RackNerd Status", "", msg);
          $done();
      };

      // IP 位置查询
      if (ipAddress) {
          const ipApiUrl = `http://ip-api.com/json/${ipAddress}?lang=en`;
          $httpClient.get({ url: ipApiUrl }, (err, resp, body) => {
              let location = null;
              if (!err && body) {
                  try {
                      const ipData = JSON.parse(body);
                      if (ipData && ipData.status === 'success') {
                          location = `${ipData.countryCode} ${ipData.regionName}`; 
                      }
                  } catch (e) {
                      console.warn("Location Parse Error:", e);
                  }
              }
              sendNotify(location);
          });
      } else {
          sendNotify(null);
      }

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
        val: item.id === "racknerd.apiKey" ? config.apiKey : config.apiHash,
        })),
    });
  } else {
    getServiceInfo();
  }
}

main();
