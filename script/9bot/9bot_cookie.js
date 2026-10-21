/**
 * 九号出行 - Token / Cookie 捕获脚本
 * 
 * 配合 ninebot.plugin 插件使用：开启【获取Cookie】开关后，打开九号出行 App 签到页即可自动捕获。
 */

const cookieKey = "ninebot_cookie_data";

// 仅在签到接口请求时进行捕获
if ($request.url.indexOf("user-sign") > -1 && $request.url.indexOf("sign") > -1) {
  const authorization = $request.headers["authorization"] || $request.headers["Authorization"];
  
  if (authorization) {
    let deviceId = "";
    try {
      if ($request.body) {
        const bodyObj = JSON.parse($request.body);
        deviceId = bodyObj.deviceId || bodyObj.device_id || "";
      }
    } catch (e) {
      console.log("解析请求体获取 deviceId 失败: " + e);
    }

    const cookieData = JSON.stringify({
      authorization: authorization,
      deviceId: deviceId,
      userAgent: $request.headers["user-agent"] || $request.headers["User-Agent"],
      updateTime: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      url: $request.url,
    });

    const oldData = $persistentStore.read(cookieKey);

    if (oldData !== cookieData) {
      if ($persistentStore.write(cookieData, cookieKey)) {
        $notification.post("九号出行", "🎉 Cookie 获取成功", "授权信息已更新，可在插件配置中关闭获取开关");
        console.log("九号出行 Cookie 已更新并保存");
      }
    } else {
      console.log("九号出行 Cookie 未变化，静默跳过");
    }
  }
}

$done({});
