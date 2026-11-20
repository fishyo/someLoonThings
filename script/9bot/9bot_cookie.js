/**
 * 9bot token / cookie capture script.
 * 
 * Works with ninebot.plugin: capture cookie on check-in page.
 * Compatible with Loon and Quantumult X.
 */

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
  done: (obj = {}) => {
    if (typeof $done !== "undefined") $done(obj);
  }
};

const cookieKey = "9bot_cookie_data";
const legacyCookieKey = "ninebot_cookie_data";

// Capture only on user-sign request
if (typeof $request !== "undefined" && $request.url && /\/user-sign\/v\d+\/sign/.test($request.url)) {
  const headers = $request.headers || {};
  const authorization = headers["authorization"] || headers["Authorization"];
  
  if (authorization) {
    let deviceId = "";
    try {
      if ($request.body) {
        const bodyObj = typeof $request.body === "string" ? JSON.parse($request.body) : $request.body;
        deviceId = bodyObj.deviceId || bodyObj.device_id || "";
      }
    } catch (e) {
      console.log("解析请求体获取 deviceId 失败: " + e);
    }

    const cookieData = JSON.stringify({
      authorization: authorization,
      deviceId: deviceId,
      userAgent: headers["user-agent"] || headers["User-Agent"] || "",
      updateTime: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    });

    const oldData = $.read(cookieKey) || $.read(legacyCookieKey);

    if (oldData !== cookieData) {
      $.write(cookieData, cookieKey);
      $.notify("9bot", "Cookie 获取成功", "授权信息已更新，可在配置中关闭获取开关");
      console.log("9bot Cookie 已更新并保存");
    } else {
      console.log("9bot Cookie 未变化，静默跳过");
    }
  }
}

$.done({});
