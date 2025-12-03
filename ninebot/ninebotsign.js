/*
九号出行 - 签到脚本
*/

const cookieName = "九号出行";
const cookieKey = "ninebot_cookie_data";

// 配置参数
const CONFIG = {
  maxRetries: 5, // 最大重试次数
  retryDelay: 2000, // 重试延迟(毫秒)
  timeout: 15000, // 请求超时时间(毫秒)
};

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
  console.log("✓ Cookie数据读取成功");
  // 调试用: console.log("读取到的Cookie数据: " + JSON.stringify(cookieData));
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
const url = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign";
const headers = {
  "content-type": "application/json",
  from_platform_1: "1",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    cookieData.userAgent ||
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
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
const deviceId = cookieData.deviceId || "";
const body = JSON.stringify({
  deviceId: deviceId,
});

console.log("请求URL: " + url);
console.log("设备ID: " + deviceId);

// 重试函数
function makeRequest(retryCount = 0) {
  const requestOptions = {
    url: url,
    headers: headers,
    body: body,
    timeout: CONFIG.timeout,
  };

  $httpClient.post(requestOptions, (error, response, data) => {
    if (error) {
      console.log(`请求失败(第${retryCount + 1}次)：${error}`);

      // 如果还有重试次数,则延迟后重试
      if (retryCount < CONFIG.maxRetries) {
        console.log(`将在${CONFIG.retryDelay / 1000}秒后重试...`);
        setTimeout(() => {
          makeRequest(retryCount + 1);
        }, CONFIG.retryDelay);
        return;
      }

      // 重试次数用完,报告失败
      $notification.post(
        cookieName,
        "❌ 签到失败",
        `网络请求失败，已重试${CONFIG.maxRetries}次\n${error}`
      );
      $done();
    } else {
      console.log("状态码：" + response.status);

      // 检查HTTP状态码
      if (response.status !== 200) {
        console.log(`HTTP状态码异常: ${response.status}`);

        // 如果是5xx服务器错误或429限流,可以重试
        if (
          (response.status >= 500 || response.status === 429) &&
          retryCount < CONFIG.maxRetries
        ) {
          console.log(
            `服务器暂时不可用,将在${CONFIG.retryDelay / 1000}秒后重试...`
          );
          setTimeout(() => {
            makeRequest(retryCount + 1);
          }, CONFIG.retryDelay);
          return;
        }

        $notification.post(
          cookieName,
          "❌ 签到失败",
          `服务器返回错误: HTTP ${response.status}`
        );
        $done();
        return;
      }

      console.log("返回数据：" + data);

      // 解析返回的数据
      try {
        const result = JSON.parse(data);
        console.log("✓ 数据解析成功, 响应码: " + result.code);
        // 调试用: console.log("解析后的数据:" + JSON.stringify(result));

        // 检查是否成功或已经签到
        if (result.code === 0) {
          // 签到成功
          const successInfo = [
            `✅ 签到成功`,
            `连续签到: ${result.data?.consecutiveDays || 0}天`,
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
        } else if (result.code === 401 || result.code === 403) {
          // 授权失败,需要重新获取Cookie
          console.log("授权失败，需要重新获取Cookie");
          $notification.post(
            cookieName,
            "❌ 授权失败",
            `Cookie已失效，请重新获取\n错误码: ${result.code}`
          );
        } else {
          // 其他错误
          const errorMsg = result.msg || "未知错误";
          console.log(
            "签到失败，错误码: " + result.code + ", 错误信息: " + errorMsg
          );

          // 某些错误码可以重试
          if (
            retryCount < CONFIG.maxRetries &&
            [500, 502, 503].includes(result.code)
          ) {
            console.log(
              `服务器错误,将在${CONFIG.retryDelay / 1000}秒后重试...`
            );
            setTimeout(() => {
              makeRequest(retryCount + 1);
            }, CONFIG.retryDelay);
            return;
          }

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
  });
}

// 启动签到请求
makeRequest();
