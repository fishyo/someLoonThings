/** 九号出行签到 — Loon / Quantumult X scheduled script. */
const Runtime = (() => {
  const qx = typeof $task !== "undefined";
  return {
    platform: qx ? "Quantumult X" : "Loon",
    read: (key) => qx ? $prefs.valueForKey(key) : $persistentStore.read(key),
    fetch: (options) => qx
      ? $task.fetch(options).then((r) => ({ status: r.statusCode, body: r.body }))
      : new Promise((resolve, reject) => $httpClient[options.method === "POST" ? "post" : "get"](
          options, (e, r, body) => e ? reject(new Error(String(e))) : resolve({ status: r.status, body })
        )),
    notify: (subtitle, body) => qx
      ? $notify("九号出行", subtitle, body)
      : $notification.post("九号出行", subtitle, body),
    done: () => $done(),
  };
})();

const KEY = "ninebot_cookie_data";
const SIGN_URL = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign";
const STATUS_URL = "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(options, retries = 2) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await Runtime.fetch(options);
      if (response.status < 500 && response.status !== 429) return response;
      if (attempt >= retries) return response;
    } catch (error) {
      if (attempt >= retries) throw error;
    }
    await sleep(1500 * (attempt + 1));
  }
}

async function main() {
  const stored = Runtime.read(KEY);
  if (!stored) throw new Error("未找到授权信息，请先打开九号出行签到页面获取凭据");
  const credential = JSON.parse(stored);
  if (!credential.authorization) throw new Error("授权信息无效，请重新获取");
  const headers = {
    accept: "application/json, text/plain, */*",
    authorization: credential.authorization,
    language: "zh",
    "user-agent": credential.userAgent || "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15",
  };

  const signResponse = await request({
    url: SIGN_URL,
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ deviceId: credential.deviceId || "" }),
    timeout: 15000,
  });
  if (signResponse.status !== 200) throw new Error(`签到请求 HTTP ${signResponse.status}`);
  const signData = JSON.parse(signResponse.body);
  const alreadySigned = signData.code === 10014 || signData.code === 540004;
  if (signData.code !== 0 && !alreadySigned) throw new Error(signData.msg || `错误码 ${signData.code}`);

  const statusResponse = await request({
    url: `${STATUS_URL}?t=${Date.now()}`,
    method: "GET",
    headers,
    timeout: 15000,
  }, 1);
  let days = 0;
  if (statusResponse.status === 200) {
    const status = JSON.parse(statusResponse.body);
    days = status.data?.consecutiveDays || 0;
  }
  Runtime.notify(alreadySigned ? "今日已签到" : "签到成功", `连续签到: ${days} 天\n运行平台: ${Runtime.platform}`);
}

main()
  .catch((error) => Runtime.notify("签到失败", error.message || String(error)))
  .finally(Runtime.done);
