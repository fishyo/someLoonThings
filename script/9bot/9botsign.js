/**
 * 9bot - 每日自动签到
 * 
 * 依赖 9bot_cookie.js 获取的持久化 Cookie 数据。
 * 兼容支持 Loon 与 Quantumult X。
 */

;(function () {
  // 跨平台环境适配层 (Loon & Quantumult X)
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
    post: (opts, cb) => {
      if (typeof $httpClient !== "undefined") {
        $httpClient.post(opts, cb);
        return;
      }
      if (typeof $task !== "undefined") {
        if (typeof opts === "string") opts = { url: opts };
        opts.method = "POST";
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
    }
  };

  const APP = {
    name: "9bot",
    cookieKey: "9bot_cookie_data",
    legacyCookieKey: "ninebot_cookie_data",
    signApi: "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign",
    statusApi: "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status",
  };

  const CONFIG = {
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 15000,
  };

  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Mobile/15E148 Safari/604.1";

  console.log(`========== ${APP.name} 签到任务启动 ==========`);

  const cookieDataStr = $.read(APP.cookieKey) || $.read(APP.legacyCookieKey);
  if (!cookieDataStr) {
    console.log("未找到保存的 Cookie 数据");
    $.notify(APP.name, "配置缺失", "未找到 Cookie 数据 · 请先进入 App 签到页面捕获");
    $.done({});
    return;
  }

  let cookieData;
  try {
    cookieData = JSON.parse(cookieDataStr);
    console.log("✓ Cookie 数据读取成功");
  } catch (e) {
    console.log("解析 Cookie 失败: " + e);
    $.notify(APP.name, "解析错误", "Cookie 数据格式异常 · 请重新捕获");
    $.done({});
    return;
  }

  if (!cookieData || !cookieData.authorization) {
    console.log("缺少 authorization 授权字段");
    $.notify(APP.name, "授权缺失", "缺少 Authorization · 请重新打开 App 签到页面");
    $.done({});
    return;
  }

  // 通用请求头构建
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

    $.get(options, (error, response, data) => {
      if (error || !response || response.status !== 200) {
        console.log("查询签到状态失败");
        callback(null);
        return;
      }

      try {
        const result = JSON.parse(data);
        console.log("📊 [状态查询] 响应:", JSON.stringify(result, null, 2));
        if (result.code === 0 && result.data) {
          callback(result.data);
          return;
        }
      } catch (e) {
        console.log("解析状态数据失败: " + e);
      }
      callback(null);
    });
  }

  // 构建通知内容（遵循单色极简灰度风格）
  function buildNotifyBody(statusData) {
    const parts = [];
    const days = statusData?.consecutiveDays || 0;
    parts.push(`• 连续签到: ${days} 天`);

    if (statusData) {
      if (statusData.blindBoxStatus === 1) {
        parts.push("• 盲盒奖励: 有新的盲盒奖励可领取");
      }
      if (statusData.signCardsNum > 0) {
        parts.push(`• 补签卡: 剩余 ${statusData.signCardsNum} 张`);
      }
    }

    const timeStr = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    parts.push(`• 状态更新: ${timeStr}`);
    return parts.join("\n");
  }

  // 执行签到
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

    $.post(options, (error, response, data) => {
      if (error) {
        console.log(`请求失败 (${retryCount + 1}/${CONFIG.maxRetries}): ${error}`);
        if (retryCount < CONFIG.maxRetries) {
          setTimeout(() => sign(retryCount + 1), CONFIG.retryDelay);
          return;
        }
        $.notify(APP.name, "签到失败", `网络请求错误 · 已重试 ${CONFIG.maxRetries} 次`);
        $.done({});
        return;
      }

      if (!response || response.status !== 200) {
        const status = response ? response.status : "Unknown";
        if ((status >= 500 || status === 429) && retryCount < CONFIG.maxRetries) {
          setTimeout(() => sign(retryCount + 1), CONFIG.retryDelay);
          return;
        }
        $.notify(APP.name, "签到失败", `服务器响应异常: HTTP ${status}`);
        $.done({});
        return;
      }

      try {
        const result = JSON.parse(data);
        console.log(`✓ 响应码: ${result.code}`);

        if (result.code === 0) {
          // 签到成功
          querySignStatus((statusData) => {
            const days = statusData?.consecutiveDays || 0;
            const subtitle = `签到成功 · 连续 ${days} 天`;
            $.notify(APP.name, subtitle, buildNotifyBody(statusData));
            $.done({});
          });
        } else if (result.code === 10014 || result.code === 540004) {
          // 今日已签到
          querySignStatus((statusData) => {
            const days = statusData?.consecutiveDays || 0;
            const subtitle = `今日已签到 · 连续 ${days} 天`;
            $.notify(APP.name, subtitle, buildNotifyBody(statusData));
            $.done({});
          });
        } else if (result.code === 401 || result.code === 403) {
          $.notify(APP.name, "授权失效", `Cookie 已过期 (错误码: ${result.code}) · 请重新打开 App`);
          $.done({});
        } else {
          const errorMsg = result.msg || "未知业务错误";
          if (retryCount < CONFIG.maxRetries && [500, 502, 503].includes(result.code)) {
            setTimeout(() => sign(retryCount + 1), CONFIG.retryDelay);
            return;
          }
          $.notify(APP.name, "签到未成功", `返回提示: ${errorMsg}`);
          $.done({});
        }
      } catch (e) {
        console.log("数据解析错误: " + e);
        $.notify(APP.name, "解析错误", "返回数据无法按 JSON 解析");
        $.done({});
      }
    });
  }

  // 启动
  sign();
})();
