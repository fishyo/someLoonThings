/*
九号出行 - 签到脚本

[Egern 配置]
在 Egern 配置文件中添加：
scriptings:
  - schedule:
      name: "九号出行签到"
      cron: "0 8 * * *"
      script_url: "https://raw.githubusercontent.com/fishyo/someLoonThings/main/script/9bot/9botsign.js"
*/

const APP = {
  name: "九号出行",
  cookieKey: "ninebot_cookie_data",
  signApi: "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign",
  statusApi:
    "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status",
};

const CONFIG = {
  maxRetries: 5,
  retryDelay: 2000,
  timeout: 15000,
};

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Mobile/15E148 Safari/604.1";

console.log(`========== ${APP.name}签到脚本启动 ==========`);

// 构建通用请求头
function getHeaders(withAuth = true) {
  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh-Hans;q=0.9",
    language: "zh",
    "user-agent": cookieData.userAgent || UA,
  };

  if (withAuth) {
    headers.authorization = cookieData.authorization;
  }

  return headers;
}

// 查询签到状态
function querySignStatus(callback) {
  const finalUrl = `${APP.statusApi}?t=${Date.now()}`;
  const options = {
    url: finalUrl,
    headers: getHeaders(),
    timeout: CONFIG.timeout,
  };

  $httpClient.get(options, (error, response, data) => {
    if (error || response.status !== 200) {
      console.log("查询签到状态失败");
      callback(null);
      return;
    }

    try {
      const result = JSON.parse(data);
      console.log("📊 [状态查询] 响应体:");
      console.log(JSON.stringify(result, null, 2));

      if (result.code === 0 && result.data) {
        callback(result.data);
        return;
      }
    } catch (e) {
      console.log("解析状态数据失败: " + e);
    }
    callback(null);
  });
} // 添加额外信息
function addExtraInfo(parts, data) {
  if (data) {
    if (data.blindBoxStatus === 1) {
      parts.push("🎁 有新的盲盒奖励可领取");
    }
    if (data.signCardsNum > 0) {
      parts.push(`💳 剩余签到卡: ${data.signCardsNum}张`);
    }
  }

  parts.push(
    `更新时间: ${new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    })}`
  );
  return parts.join("\n");
}

// 读取Cookie
const cookieDataStr = $persistentStore.read(APP.cookieKey);
if (!cookieDataStr) {
  console.log("未找到保存的Cookie数据");
  $notification.post(
    APP.name,
    "❌ 签到失败",
    "未找到Cookie数据\n请先打开APP进入签到页面"
  );
  $done();
  return;
}

let cookieData;
try {
  cookieData = JSON.parse(cookieDataStr);
  console.log("✓ Cookie数据读取成功");
} catch (e) {
  console.log("解析Cookie失败: " + e);
  $notification.post(APP.name, "❌ 签到失败", "Cookie数据解析失败");
  $done();
  return;
}

if (!cookieData.authorization) {
  console.log("缺少authorization");
  $notification.post(APP.name, "❌ 签到失败", "缺少授权信息\n请重新获取Cookie");
  $done();
  return;
}

// 签到请求
function sign(retryCount = 0) {
  const deviceId = cookieData.deviceId || "";
  const options = {
    url: APP.signApi,
    headers: {
      "content-type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ deviceId }),
    timeout: CONFIG.timeout,
  };

  $httpClient.post(options, (error, response, data) => {
    if (error) {
      console.log(`请求失败(${retryCount + 1}): ${error}`);
      if (retryCount < CONFIG.maxRetries) {
        setTimeout(() => sign(retryCount + 1), CONFIG.retryDelay);
        return;
      }
      $notification.post(
        APP.name,
        "❌ 签到失败",
        `网络请求失败，已重试${CONFIG.maxRetries}次`
      );
      $done();
      return;
    }

    if (response.status !== 200) {
      if (
        (response.status >= 500 || response.status === 429) &&
        retryCount < CONFIG.maxRetries
      ) {
        setTimeout(() => sign(retryCount + 1), CONFIG.retryDelay);
        return;
      }
      $notification.post(
        APP.name,
        "❌ 签到失败",
        `服务器错误: HTTP ${response.status}`
      );
      $done();
      return;
    }

    try {
      const result = JSON.parse(data);
      console.log("✓ 数据解析成功, 响应码: " + result.code);
      console.log("📤 [签到请求] 响应体:");
      console.log(JSON.stringify(result, null, 2));

      if (result.code === 0) {
        // 签到成功,查询完整信息
        querySignStatus((statusData) => {
          const signDays = statusData?.consecutiveDays || 0;
          const info = [`♻️ 连续签到: ${signDays}天`];
          const body = addExtraInfo([...info], statusData);
          $notification.post(APP.name, "🎉 签到成功", body);
          $done();
        });
      } else if (result.code === 10014 || result.code === 540004) {
        // 已签到,查询状态获取天数
        querySignStatus((statusData) => {
          const days = statusData?.consecutiveDays || 0;
          const info = [`♻️ 连续签到: ${days}天`];
          const body = addExtraInfo([...info], statusData);
          $notification.post(APP.name, "📅 已签到", body);
          $done();
        });
      } else if (result.code === 401 || result.code === 403) {
        $notification.post(
          APP.name,
          "❌ 授权失败",
          `Cookie已失效\n错误码: ${result.code}`
        );
        $done();
      } else {
        const errorMsg = result.msg || "未知错误";
        if (
          retryCount < CONFIG.maxRetries &&
          [500, 502, 503].includes(result.code)
        ) {
          setTimeout(() => sign(retryCount + 1), CONFIG.retryDelay);
          return;
        }
        $notification.post(APP.name, "❌ 签到失败", errorMsg);
        $done();
      }
    } catch (e) {
      console.log("数据解析错误: " + e);
      $notification.post(APP.name, "❌ 签到失败", "数据解析错误");
      $done();
    }
  });
}

// 启动签到
sign();
