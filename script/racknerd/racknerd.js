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
  isEgern: typeof ctx !== "undefined",
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
    const url = typeof opts === "string" ? opts : (opts.url || opts);
    // 优先支持 Egern ctx.http 原生请求，避免兼容层中访问 e.body 报错
    if (typeof ctx !== "undefined" && ctx.http) {
      const httpOpts = typeof opts === "object" ? opts : {};
      ctx.http.get(url, httpOpts).then(
        async (resp) => {
          if (!resp) {
            cb(new Error("Empty response"), null, null);
            return;
          }
          let data = "";
          try {
            data = await resp.text();
          } catch (_) {
            data = (resp && resp.body) || "";
          }
          cb(null, { status: resp.status || 200, statusCode: resp.status || 200 }, data);
        },
        (err) => cb(err, null, null)
      ).catch((err) => cb(err, null, null));
      return;
    }
    if (typeof $httpClient !== "undefined") {
      $httpClient.get(opts, (err, resp, data) => {
        let body = data;
        if (body === undefined && resp && resp.body !== undefined) {
          body = resp.body;
        }
        cb(err, resp, body);
      });
      return;
    }
    if (typeof $task !== "undefined") {
      if (typeof opts === "string") opts = { url: opts };
      opts.method = "GET";
      $task.fetch(opts).then(
        (resp) => {
          if (!resp) {
            cb(new Error("Empty response"), null, null);
            return;
          }
          cb(null, { ...resp, status: resp.statusCode || 200 }, resp.body || "");
        },
        (err) => cb(err, null, null)
      ).catch((err) => cb(err, null, null));
      return;
    }
    cb(new Error("No supported HTTP client found"), null, null);
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

// 解析 $argument 插件参数
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

// 获取配置
function getConfig() {
  let apiKey = "";
  let apiHash = "";

  // 0. 支持 Loon 插件参数 ($argument)
  const arg = parseArgument();
  if (arg.apiKey && String(arg.apiKey).trim()) apiKey = String(arg.apiKey).trim();
  if (arg.apiHash && String(arg.apiHash).trim()) apiHash = String(arg.apiHash).trim();

  // 1. Egern 环境变量
  if (typeof ctx !== "undefined" && ctx.env) {
    if (ctx.env.RACKNERD_API_KEY) apiKey = apiKey || ctx.env.RACKNERD_API_KEY;
    if (ctx.env.RACKNERD_API_HASH) apiHash = apiHash || ctx.env.RACKNERD_API_HASH;
  }

  // 2. BoxJS / 持久化存储 (回退机制)
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
  if (!xmlString || typeof xmlString !== "string") return result;
  // 匹配所有标签及其内部值，兼容 <ctrl> 根节点及包含错误信息的 XML
  const regex = /<([a-zA-Z0-9_]+)>([^<]+)<\/\1>/g;
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
      "请在 Loon 插件设置或 BoxJS 中配置 RackNerd API Key 和 Hash"
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

    if (!data) {
      console.error("❌ Empty Response Data");
      $.notify("❌ 查询失败", "", "服务器未返回数据");
      $.done();
      return;
    }

    console.log(`✅ Response Status: ${response ? (response.status || response.statusCode) : "OK"}`);
    // console.log("Response Body:", data); // Uncomment for debugging

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
          if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
          const k = 1024;
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
          if (i < 0 || i >= sizes.length) return '0 B';
          return parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals))) + ' ' + sizes[i];
      };

      const bwInfo = parseResource(resData.bw);
      const memInfo = parseResource(resData.mem);
      const hddInfo = parseResource(resData.hdd);
      const ipAddress = (resData.ipaddress || resData.ipaddr || resData.ip_address || "").split(',')[0].trim();
      const vmStatus = resData.vmstat || resData.statusmsg || "Unknown";
      const vmStatusIcon = String(vmStatus).toLowerCase() === "online" ? "🟢" : "🔴";

      // 进度条
      const getProgressBar = (percent) => {
        const len = 10;
        const p = parseFloat(percent) || 0;
        const filled = Math.round(len * (p / 100));
        const valid = Math.min(Math.max(filled, 0), len);
        return "█".repeat(valid) + "░".repeat(len - valid);
      };

      // 发送通知
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
      const nodeLocation = resData.node || resData.nodename || "";
      if (nodeLocation && nodeLocation !== "N/A") {
          msg += `节点位置: ${nodeLocation}\n`;
      }
      msg += `运行状态: ${vmStatusIcon} ${vmStatus}\n`;
      if (resData.hostname && resData.hostname !== "N/A") {
         msg += `主机名称: ${resData.hostname}\n`;
      }
      
      console.log("🔔 Sending Notification...");
      $.notify("🖥️ RackNerd Status", "", msg);
      $.done();

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
