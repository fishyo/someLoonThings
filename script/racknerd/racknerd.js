/**
 * RackNerd VPS 运行状态与流量查询
 * 
 * 配置优先级:
 * 1. BoxJS / 本地持久化存储 (racknerd.apiKey & racknerd.apiHash)
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
      ).catch((err) => cb(err, null, null));
      return;
    }
    cb(new Error("No supported HTTP client found"), null, null);
  },
  done: (obj = {}) => {
    if (typeof $done !== "undefined") $done(obj);
  },
};

// BoxJS 应用配置
const boxjsConfig = {
  icon: "https://raw.githubusercontent.com/fishyo/someLoonThings/main/icons/racknerd.png",
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
  let apiHash = "";

  // 1. 优先读取 BoxJS / 本地持久化存储 ($persistentStore / $prefs)
  apiKey = $.read("racknerd.apiKey") || "";
  apiHash = $.read("racknerd.apiHash") || "";

  // 2. 回退读取 Loon 插件参数 ($argument)
  if (!apiKey || !apiHash) {
    const arg = parseArgument();
    if (!apiKey && arg.apiKey && String(arg.apiKey).trim()) apiKey = String(arg.apiKey).trim();
    if (!apiHash && arg.apiHash && String(arg.apiHash).trim()) apiHash = String(arg.apiHash).trim();
  }

  console.log(`Config Read - Key Len: ${apiKey.length}, Hash Len: ${apiHash.length}`);
  return { apiKey, apiHash };
}

// 解析 XML 备用解析器
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

// 查询 VPS 服务状态
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
    }
  };

  const maskedUrl = apiUrl.replace(/key=([^&]+)/, "key=****").replace(/hash=([^&]+)/, "hash=****");
  console.log(`Request API: ${maskedUrl}`);

  const httpGet = typeof $httpClient !== "undefined" ? $httpClient.get.bind($httpClient) : $.get;

  httpGet(request, function (error, response, data) {
    if (error) {
      console.error("❌ Request Error:", error);
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
      console.log("Parsed Data:", JSON.stringify(resData, null, 2));

      if (resData.status === "error" || (resData.statusmsg && resData.status !== "success")) {
        console.warn("⚠️ API Returned Error:", resData.statusmsg);
        $.notify("RackNerd Status", "❌ API 错误", resData.statusmsg || "未知错误");
        $.done({});
        return;
      }

      // 资源指标解析 (total, used, free, percent)
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

      // 字节单位格式化
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

      // 提取并分类 IPv4 / IPv6
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

      // 进度条渲染
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
