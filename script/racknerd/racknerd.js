/**
 * RackNerd VPS status and traffic query script.
 * 
 * Configuration priority:
 * 1. BoxJS / local persistent storage (racknerd.apiKey & racknerd.apiHash)
 * 2. Loon plugin argument ($argument)
 */

// Cross-platform environment adapter
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
  },
};

// Parse plugin arguments ($argument)
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

// Retrieve configuration (BoxJS first)
function getConfig() {
  let apiKey = "";
  let apiHash = "";

  // 1. Read BoxJS / local persistent store ($persistentStore / $prefs) first
  apiKey = $.read("racknerd.apiKey") || "";
  apiHash = $.read("racknerd.apiHash") || "";

  // 2. Fallback to Loon plugin argument ($argument)
  if (!apiKey || !apiHash) {
    const arg = parseArgument();
    if (!apiKey && arg.apiKey && String(arg.apiKey).trim()) apiKey = String(arg.apiKey).trim();
    if (!apiHash && arg.apiHash && String(arg.apiHash).trim()) apiHash = String(arg.apiHash).trim();
  }

  console.log(`Config Read - Key Len: ${apiKey.length}, Hash Len: ${apiHash.length}`);
  return { apiKey, apiHash };
}

// Fallback XML parser
function parseXML(xmlString) {
  const result = {};
  if (!xmlString || typeof xmlString !== "string") return result;
  const regex = /<([a-zA-Z0-9_]+)>([^<]+)<\/\1>/g;
  let match;
  while ((match = regex.exec(xmlString)) !== null) {
    result[match[1]] = match[2].trim();
  }
  return result;
}

// Query VPS service info
function getServiceInfo() {
  console.log("▶️ Starting RackNerd Service Info Query...");
  const config = getConfig();

  if (!config.apiKey || !config.apiHash) {
    console.log("❌ Configuration missing");
    $.notify(
      "RackNerd Status",
      "⚠️ 配置缺失",
      "请在 BoxJS 中配置 API Key 和 Hash"
    );
    $.done({});
    return;
  }

  const apiUrl = `https://ctrl.racknerd.com/api/client/command.php?action=info&key=${encodeURIComponent(config.apiKey)}&hash=${encodeURIComponent(config.apiHash)}&ipaddr=1&hdd=1&mem=1&bw=1&status=1&rdtype=json`;
  const request = {
    url: apiUrl,
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    },
    timeout: 15000
  };

  const maskedUrl = apiUrl.replace(/key=([^&]+)/, "key=****").replace(/hash=([^&]+)/, "hash=****");
  console.log(`Request API: ${maskedUrl}`);

  $.get(request, function (error, response, data) {
    if (error) {
      console.error("❌ Request Error:", error.message || String(error));
      $.notify("RackNerd Status", "❌ 查询失败", error.message || String(error));
      $.done({});
      return;
    }

    if (!data) {
      console.error("❌ Empty Response Data");
      $.notify("RackNerd Status", "❌ 查询失败", "服务器未返回数据");
      $.done({});
      return;
    }

    console.log(`✅ Response Status: ${response ? (response.status || response.statusCode) : "OK"}`);

    let notifySub = "";
    let notifyMsg = "";
    let isSuccess = false;

    try {
      let resData = null;
      if (typeof data === "object" && data !== null) {
        resData = data;
      } else {
        try {
          resData = JSON.parse(data);
        } catch (_) {
          resData = parseXML(data);
        }
      }
      if (!resData) resData = {};
      console.log(`Parsed Data Status: ${resData.status || resData.vmstat || "OK"}`);

      if (resData.status === "error" || (resData.statusmsg && resData.status !== "success") || (!resData.status && !resData.vmstat && !resData.bw && !resData.ipaddr && !resData.ipaddress)) {
        const errorMsg = resData.statusmsg || "API 返回数据异常或服务不可用";
        console.warn("⚠️ API Returned Error:", errorMsg);
        $.notify("RackNerd Status", "❌ API 错误", errorMsg);
        $.done({});
        return;
      }

      // Parse resource metrics (total, used, free, percent)
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

      // Format byte units
      const formatBytes = (bytes, decimals = 2) => {
        if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 B";
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
        if (i < 0 || i >= sizes.length) return "0 B";
        return parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals))) + " " + sizes[i];
      };

      const bwInfo = parseResource(resData.bw);
      const memInfo = parseResource(resData.mem);
      const hddInfo = parseResource(resData.hdd);

      // Extract and classify IPv4 / IPv6 addresses
      const rawIpStr = resData.ipaddress || resData.ipaddr || resData.ip_address || "";
      const rawIps = String(rawIpStr).split(",").map((s) => s.trim()).filter(Boolean);
      const ipv4List = [];
      const ipv6List = [];
      rawIps.forEach((ip) => {
        if (ip.includes(":")) ipv6List.push(ip);
        else if (ip.includes(".")) ipv4List.push(ip);
      });

      const nodeLocation = resData.node || resData.nodename || "";
      const vmStatus = resData.vmstat || resData.statusmsg || "Unknown";
      const statusText = String(vmStatus).toLowerCase() === "online" ? "正常运行" : vmStatus;

      // Render progress bar
      const getProgressBar = (percent) => {
        const len = 10;
        const p = parseFloat(percent) || 0;
        const filled = Math.min(Math.max(Math.round(len * (p / 100)), 0), len);
        return "█".repeat(filled) + "░".repeat(len - filled);
      };

      const location = (nodeLocation && nodeLocation !== "N/A") ? nodeLocation : "";
      const subTitle = location || (ipv4List[0] ? `IP: ${ipv4List[0]}` : "正常运行");

      let body = "";
      if (bwInfo.total > 0) {
        body += `[${getProgressBar(bwInfo.percent)}] ${bwInfo.percent}%\n`;
      }
      if (ipv4List.length > 0) body += `• IPv4: ${ipv4List.join(", ")}\n`;
      if (ipv6List.length > 0) body += `• IPv6: ${ipv6List.join(", ")}\n`;
      else if (ipv4List.length === 0 && rawIps.length > 0) body += `• IP: ${rawIps.join(", ")}\n`;
      if (bwInfo.total > 0) {
        body += `• 流量: ${formatBytes(bwInfo.used)} / ${formatBytes(bwInfo.total)}\n`;
      }
      let statusLine = `• 状态: ${statusText}`;
      if (memInfo.total > 0) statusLine += ` · RAM ${memInfo.percent}%`;
      if (hddInfo.total > 0) statusLine += ` · Disk ${hddInfo.percent}%`;
      body += statusLine;

      notifySub = subTitle;
      notifyMsg = body;
      isSuccess = true;
    } catch (e) {
      console.error("❌ Parse Error:", e);
      $.notify("RackNerd Status", "❌ 解析错误", e.message || String(e));
      $.done({});
      return;
    }

    if (isSuccess) {
      console.log("🔔 Sending Notification...");
      $.notify("RackNerd Status", notifySub, notifyMsg);
      $.done({});
    }
  });
}

function main() {
  getServiceInfo();
}

main();
