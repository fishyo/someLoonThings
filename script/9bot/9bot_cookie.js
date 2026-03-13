/*
九号出行 - 获取Cookie
使用说明：

[Loon 配置]
1. 在Loon配置文件中添加以下内容到 [Script] 部分：
   http-request ^https:\/\/cn-cbu-gateway\.ninebot\.com\/portal\/api\/user-sign\/v(1|2)\/sign script-path=ninebot_cookie.js, requires-body=true, tag=九号出行获取Cookie
2. 在Loon配置文件中添加以下内容到 [MITM] 部分：
   hostname = cn-cbu-gateway.ninebot.com

[Egern 配置]
1. 在 Egern 配置文件中添加：
scriptings:
  - http_request:
      name: "九号出行获取Cookie"
      match: "^https:\\/\\/cn-cbu-gateway\\.ninebot\\.com\\/portal\\/api\\/user-sign\\/v(1|2)\\/sign"
      script_url: "https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/9bot/9bot_cookie.js"
      body_required: true
mitm:
  hostnames:
    - "cn-cbu-gateway.ninebot.com"

[操作步骤]
打开九号出行APP，进入签到页面即可自动捕获
*/

const cookieKey = "ninebot_cookie_data";

// 只有在包含签到请求时才处理
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
            console.log("解析请求体获取deviceId失败: " + e);
        }

        const cookieData = JSON.stringify({
            authorization: authorization,
            deviceId: deviceId,
            userAgent: $request.headers["user-agent"] || $request.headers["User-Agent"],
            updateTime: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
            url: $request.url
        });

        const oldData = $persistentStore.read(cookieKey);

        if (oldData !== cookieData) {
            if ($persistentStore.write(cookieData, cookieKey)) {
                $notification.post("九号出行", "🎉 Cookie 获取成功", "授权信息已更新，可以关闭该脚本");
                console.log("九号出行 Cookie 已更新并保存");
            }
        } else {
            console.log("九号出行 Cookie 未变化，静默跳过");
        }
    }
}

$done({});
