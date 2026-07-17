/** 九号出行凭据获取 — Loon / Quantumult X request script. */
const qx = typeof $prefs !== "undefined";
const KEY = "ninebot_cookie_data";

try {
  const headers = $request.headers || {};
  const authorization = headers.authorization || headers.Authorization;
  if (authorization) {
    let deviceId = "";
    try {
      const body = JSON.parse($request.body || "{}");
      deviceId = body.deviceId || body.device_id || "";
    } catch (_) {}

    const value = JSON.stringify({
      authorization,
      deviceId,
      userAgent: headers["user-agent"] || headers["User-Agent"] || "",
      updateTime: new Date().toISOString(),
    });
    const oldValue = qx ? $prefs.valueForKey(KEY) : $persistentStore.read(KEY);
    if (value !== oldValue) {
      const saved = qx ? $prefs.setValueForKey(value, KEY) : $persistentStore.write(value, KEY);
      if (saved) {
        if (qx) $notify("九号出行", "凭据获取成功", "授权信息已更新");
        else $notification.post("九号出行", "凭据获取成功", "授权信息已更新");
      }
    }
  }
} catch (error) {
  console.log(`九号凭据获取失败: ${error.message || error}`);
}
$done({});
