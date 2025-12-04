/*
九号出行 - 签到脚本 (优化版)
基于ninebot_cookie.js获取的Cookie数据进行签到
*/

const cookieName = "九号出行";
const cookieKey = "ninebot_cookie_data";

console.log("========== 九号出行签到脚本启动 ==========");

// 从持久化存储中读取Cookie数据
const cookieDataStr = $persistentStore.read(cookieKey);

if (!cookieDataStr) {
  console.log("未找到保存的Cookie数据，请先运行获取Cookie脚本");
  $notification.post(
    cookieName,
    "❌ 签到失败",
    "未找到Cookie数据\n请先打开九号出行APP进入签到页面"
  );
  $done();
  return;
}

let cookieData;
try {
  cookieData = JSON.parse(cookieDataStr);
  console.log("读取到的Cookie数据: " + JSON.stringify(cookieData));
} catch (e) {
  console.log("解析Cookie数据失败: " + e);
  $notification.post(cookieName, "❌ 签到失败", "Cookie数据解析失败");
  $done();
  return;
}

// 检查必要的数据
if (!cookieData.authorization) {
  console.log("Cookie数据中缺少authorization");
  $notification.post(
    cookieName,
    "❌ 签到失败",
    "缺少授权信息\n请重新获取Cookie"
  );
  $done();
  return;
}

// 构建请求参数
const url = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v1/sign";
const headers = {
  "content-type": "application/json",
  from_platform_1: "1",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Segway v6 C 607003342",
  language: "zh",
  referer: "https://api5-h5-app-bj.ninebot.com/",
  origin: "https://api5-h5-app-bj.ninebot.com",
  "sec-fetch-dest": "empty",
  "accept-language": "zh-CN,zh-Hans;q=0.9",
  accept: "application/json, text/plain, */*",
  authorization: cookieData.authorization,
  "accept-encoding": "gzip, deflate, br",
};

// 使用保存的deviceId，如果没有则使用默认值
const deviceId = cookieData.deviceId || "20174E14-7801-4075-A3DD-E56A470D6A43";
const body = JSON.stringify({
  deviceId: deviceId,
});

console.log("请求URL: " + url);
console.log("设备ID: " + deviceId);

// 发送签到请求
$httpClient.post(
  {
    url: url,
    headers: headers,
    body: body,
  },
  (error, response, data) => {
    if (error) {
      console.log("请求失败：" + error);
      $notification.post(cookieName, "❌ 签到失败", "请求失败：" + error);
      $done();
    } else {
      console.log("状态码：" + response.status);
      console.log("返回数据：" + data);

      // 解析返回的数据
      try {
        const result = JSON.parse(data);
        console.log("解析后的数据：" + JSON.stringify(result));

        // 检查是否成功或已经签到
        if (result.code === 0) {
          // 签到成功
          const successInfo = [
            `✅ 签到成功`,
            `连续签到: ${result.data?.consecutiveDays || 0}天`,
            `本次奖励: ${result.data?.point || 0}积分`,
            `更新时间: ${new Date().toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}`,
          ]
            .filter(Boolean)
            .join("\n");

          $notification.post(cookieName, "🎉 签到成功", successInfo);
        } else if (result.code === 10014) {
          // 已经签到
          const alreadyInfo = [
            `ℹ️ 今日已签到`,
            `连续签到: ${result.data?.consecutiveDays || 0}天`,
            `更新时间: ${new Date().toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}`,
          ]
            .filter(Boolean)
            .join("\n");

          $notification.post(cookieName, "📅 已签到", alreadyInfo);
        } else {
          // 其他错误
          const errorMsg = result.msg || "未知错误";
          console.log(
            "签到失败，错误码: " + result.code + ", 错误信息: " + errorMsg
          );
          $notification.post(cookieName, "❌ 签到失败", errorMsg);
        }
      } catch (e) {
        console.log("数据解析错误: " + e);
        $notification.post(
          cookieName,
          "❌ 签到失败",
          "数据解析错误\n" + e.toString()
        );
      }

      $done();
    }
  }
);
