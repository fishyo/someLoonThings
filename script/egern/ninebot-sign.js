export default async function (ctx) {
  const credential = ctx.storage.getJSON("ninebot_cookie_data");
  if (!credential?.authorization) {
    return ctx.notify({ title: "九号出行", subtitle: "签到失败", body: "未找到授权信息，请先打开签到页面" });
  }
  const headers = {
    accept: "application/json, text/plain, */*",
    authorization: credential.authorization,
    language: "zh",
    "user-agent": credential.userAgent || "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15",
  };
  try {
    const response = await ctx.http.post(
      "https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/sign",
      { headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ deviceId: credential.deviceId || "" }), timeout: 15000 },
    );
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const alreadySigned = result.code === 10014 || result.code === 540004;
    if (result.code !== 0 && !alreadySigned) throw new Error(result.msg || `错误码 ${result.code}`);

    let days = 0;
    try {
      const statusResponse = await ctx.http.get(
        `https://cn-cbu-gateway.ninebot.com/portal/api/user-sign/v2/status?t=${Date.now()}`,
        { headers, timeout: 15000 },
      );
      const status = await statusResponse.json();
      days = status.data?.consecutiveDays || 0;
    } catch (_) {}
    ctx.notify({ title: "九号出行", subtitle: alreadySigned ? "今日已签到" : "签到成功", body: `连续签到: ${days} 天` });
  } catch (error) {
    ctx.notify({ title: "九号出行", subtitle: "签到失败", body: error.message || String(error) });
  }
}
