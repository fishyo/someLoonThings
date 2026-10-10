/*
 * RackNerd VPS 状态查询
 * 
 * [Egern 配置示例]
 * 1. 作为通用脚本 (小组件关联):
 * scriptings:
 *  - generic:
 *      name: "RackNerd Status"
 *      script_url: "https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/racknerd/racknerd.js"
 *      env:
 *        RACKNERD_API_KEY: "your_api_key"
 *        RACKNERD_API_HASH: "your_api_hash"
 */
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

  if (typeof ctx !== "undefined" && ctx.env) {
    if (ctx.env.RACKNERD_API_KEY) apiKey = ctx.env.RACKNERD_API_KEY;
    if (ctx.env.RACKNERD_API_HASH) apiHash = ctx.env.RACKNERD_API_HASH;
  }

  if (!apiKey || !apiHash) {
    if (typeof $persistentStore !== "undefined") {
      apiKey = apiKey || $persistentStore.read("racknerd.apiKey") || "";
      apiHash = apiHash || $persistentStore.read("racknerd.apiHash") || "";
    } else if (typeof $prefs !== "undefined") {
      apiKey = apiKey || $prefs.valueForKey("racknerd.apiKey") || "";
      apiHash = apiHash || $prefs.valueForKey("racknerd.apiHash") || "";
    }
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
  console.log("▶️ Starting RackNerd Service Info Query...");
  const config = getConfig();

  // 验证配置
  if (!config.apiKey || !config.apiHash) {
    console.log("❌ Configuration missing");
    $.notify(
      "⚠️ 配置缺失",
      "",
      "请在 BoxJS 中配置 RackNerd API Key 和 Hash"
    );
    $.done();
    return;
  }

  // RackNerd Client API (New Endpoint)
  const apiUrl = `https://ctrl.racknerd.com/api/client/command.php?action=info&key=${encodeURIComponent(config.apiKey)}&hash=${encodeURIComponent(config.apiHash)}&ipaddr=1&hdd=1&mem=1&bw=1&status=1&rdtype=json`;
  const request = {
    url: apiUrl,
    method: "GET",
    headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    }
  };

  // Log masked URL
  const maskedUrl = apiUrl.replace(/key=([^&]+)/, "key=****").replace(/hash=([^&]+)/, "hash=****");
  console.log(`Request API: ${maskedUrl}`);

  $.get(request, function (error, response, data) {
    if (error) {
      console.error("❌ Request Error:", error);
      $.notify("❌ 查询失败", "", error.message || String(error));
      $.done();
      return;
    }

    console.log(`✅ Response Status: ${response.status}`);
    // console.log("Response Body:", data); // Uncomment for debugging

    try {
      let resData;
      try {
        resData = typeof data === "object" ? data : JSON.parse(data);
      } catch (_) {
        resData = parseXML(data);
      }
      console.log("Parsed Data:", JSON.stringify(resData, null, 2));

      if (resData.status === "error") {
        console.warn("⚠️ API Returned Error:", resData.statusmsg);
        $.notify("❌ API Error", "", resData.statusmsg || "未知错误");
        $.done();
        return;
      }

      // 资源计算: total_bytes,used_bytes,free_bytes,percent_used
      const parseResource = (str) => {
          if (!str) return { total: 0, used: 0, free: 0, percent: "0.00" };
          const parts = str.split(",").map(s => s.trim());
          let total = 0, used = 0, free = 0;
          let percent = "0.00";
          if (parts.length >= 4) {
              total = parseFloat(parts[0]) || 0;
              used = parseFloat(parts[1]) || 0;
              free = parseFloat(parts[2]) || 0;
              percent = parseFloat(parts[3]).toFixed(2);
          } else if (parts.length >= 2) {
              total = parseFloat(parts[0]) || 0;
              used = parseFloat(parts[1]) || 0;
              percent = total > 0 ? ((used / total) * 100).toFixed(2) : "0.00";
          } else {
              used = parseFloat(str) || 0;
          }
          return { total, used, free, percent };
      };

      // 格式化
      const formatBytes = (bytes, decimals = 2) => {
          if (bytes === 0 || isNaN(bytes)) return '0 B';
          const k = 1024;
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
          return parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals))) + ' ' + sizes[i];
      };

      const bwInfo = parseResource(resData.bw);
      const memInfo = parseResource(resData.mem);
      const hddInfo = parseResource(resData.hdd);
      const ipAddress = (resData.ipaddress || resData.ipaddr || resData.ip_address || "").split(',')[0].trim();
      const vmStatus = resData.vmstat || resData.statusmsg || "Unknown";
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
              msg += `流量使用: ${formatBytes(bwInfo.used)} / ${formatBytes(bwInfo.total)}\n`;
              msg += `流量进度: ${getProgressBar(bwInfo.percent)} ${bwInfo.percent}%\n`;
          }
          if (memInfo.total > 0) {
              msg += `内存使用: ${formatBytes(memInfo.used)} / ${formatBytes(memInfo.total)} (${memInfo.percent}%)\n`;
          }
          if (hddInfo.total > 0) {
              msg += `硬盘使用: ${formatBytes(hddInfo.used)} / ${formatBytes(hddInfo.total)} (${hddInfo.percent}%)\n`;
          }
          if (location) {
              msg += `节点位置: ${location}\n`;
          } else if (resData.node && resData.node !== "N/A" && resData.node !== "") {
              msg += `节点位置: ${resData.node}\n`;
          }
          msg += `运行状态: ${vmStatusIcon} ${vmStatus}\n`;
          if (resData.hostname && resData.hostname !== "N/A") {
             msg += `主机名称: ${resData.hostname}\n`;
          }
          
          console.log("🔔 Sending Notification...");
          $.notify("🖥️ RackNerd Status", "", msg);
          $.done();
      };

      // IP 位置查询
      if (ipAddress) {
          const ipApiUrl = `http://ip-api.com/json/${ipAddress}?lang=en`;
          console.log(`Querying IP Location for: ${ipAddress}`);
          $.get({ url: ipApiUrl }, (err, resp, body) => {
              let location = null;
              if (!err && body) {
                  try {
                      const ipData = typeof body === "object" ? body : JSON.parse(body);
                      if (ipData && ipData.status === 'success') {
                          location = `${ipData.countryCode} ${ipData.regionName}`; 
                          console.log(`IP Location Found: ${location}`);
                      } else {
                        console.warn("IP Location Query Failed:", ipData);
                      }
                  } catch (e) {
                      console.warn("Location Parse Error:", e);
                  }
              } else {
                 console.error("IP Location Request Error:", err);
              }
              sendNotify(location);
          });
      } else {
          sendNotify(null);
      }

    } catch (e) {
      console.error("❌ Parse Error:", e);
      $.notify("❌ 解析错误", "", e.message || String(e));
      $.done();
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
        val: item.id === "racknerd.apiKey" ? config.apiKey : config.apiHash,
        })),
    });
  } else {
    getServiceInfo();
  }
}

main();
