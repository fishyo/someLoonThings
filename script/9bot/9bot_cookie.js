/*
九号出行 - 获取Cookie
使用说明：
1. 在Loon配置文件中添加以下内容到 [Script] 部分：
   http-request ^https:\/\/cn-cbu-gateway\.ninebot\.com\/portal\/api\/ script-path=ninebot_cookie.js, requires-body=true, tag=九号出行获取Cookie

2. 在Loon配置文件中添加以下内容到 [MITM] 部分：
   hostname = cn-cbu-gateway.ninebot.com

3. 打开九号出行APP，进入签到页面
4. 查看Loon通知和日志，确认是否捕获到请求
*/

const cookieName = "九号出行";
const cookieKey = "ninebot_cookie_data";

// 打印调试信息
console.log("========== 九号出行Cookie获取脚本启动 ==========");
console.log("请求URL: " + $request.url);
console.log("请求方法: " + $request.method);

// 打印所有请求头（调试用）
console.log("请求头信息:");
for (let key in $request.headers) {
  console.log(`  ${key}: ${$request.headers[key]}`);
}

// 打印请求体
if ($request.body) {
  console.log("请求体: " + $request.body);
}

// 获取authorization（尝试多种可能的key）
const authorization =
  $request.headers["authorization"] ||
  $request.headers["Authorization"] ||
  $request.headers["AUTHORIZATION"] ||
  "";

console.log("提取到的authorization: " + (authorization || "未找到"));

// 提取deviceId
function extractDeviceId(body) {
  try {
    if (body) {
      const bodyObj = JSON.parse(body);
      console.log("解析后的body对象: " + JSON.stringify(bodyObj));
      return bodyObj.deviceId || bodyObj.device_id || "";
    }
  } catch (e) {
    console.log("解析body失败：" + e);
  }
  return "";
}

const deviceId = extractDeviceId($request.body);
console.log("提取到的deviceId: " + (deviceId || "未找到"));

// 只有在包含签到相关请求时才保存
const isSignRequest =
  $request.url.includes("user-sign") || $request.url.includes("sign");

if (authorization && isSignRequest) {
  const cookieData = JSON.stringify({
    authorization: authorization,
    deviceId: deviceId,
    updateTime: new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    }),
    url: $request.url,
  });

  console.log("准备保存的Cookie数据: " + cookieData);

  const oldData = $persistentStore.read(cookieKey);

  if (oldData !== cookieData) {
    const saveResult = $persistentStore.write(cookieData, cookieKey);

    if (saveResult) {
      const notifyMsg = [
        "授权信息已更新",
        `Authorization: ${authorization.substring(0, 20)}...`,
        deviceId ? `DeviceId: ${deviceId.substring(0, 20)}...` : "",
        `时间: ${new Date().toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
        })}`,
      ]
        .filter(Boolean)
        .join("\n");

      $notification.post(cookieName, "🎉 Cookie获取成功", notifyMsg);
      console.log(`${cookieName} Cookie保存成功`);
    } else {
      $notification.post(
        cookieName,
        "❌ Cookie保存失败",
        "请检查Loon持久化存储权限"
      );
      console.log(`${cookieName} Cookie保存失败`);
    }
  } else {
    console.log(`${cookieName} Cookie未变化，无需更新`);
    $notification.post(
      cookieName,
      "ℹ️ Cookie未变化",
      "当前Cookie与已保存的相同"
    );
  }
} else {
  let reason = "";
  if (!authorization) {
    reason = "未找到authorization信息";
  } else if (!isSignRequest) {
    reason = "非签到相关请求，已忽略";
  }

  console.log(`跳过保存: ${reason}`);

  if (!authorization && isSignRequest) {
    $notification.post(
      cookieName,
      "⚠️ Cookie获取失败",
      "未找到authorization\n请查看Loon日志获取详细信息"
    );
  }
}

console.log("========== 脚本执行完成 ==========\n");
$done({});
