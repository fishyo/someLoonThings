export default async function (ctx) {
  try {
    const headers = ctx.request.headers;
    const authorization = headers.get("authorization");
    if (!authorization) return;
    let deviceId = "";
    try {
      const body = await ctx.request.json();
      deviceId = body.deviceId || body.device_id || "";
    } catch (_) {}
    const value = {
      authorization,
      deviceId,
      userAgent: headers.get("user-agent") || "",
      updateTime: new Date().toISOString(),
    };
    const oldValue = ctx.storage.getJSON("ninebot_cookie_data");
    if (JSON.stringify(value) !== JSON.stringify(oldValue)) {
      ctx.storage.setJSON("ninebot_cookie_data", value);
      ctx.notify({ title: "九号出行", subtitle: "凭据获取成功", body: "授权信息已更新" });
    }
  } catch (error) {
    console.log(`九号凭据获取失败: ${error.message || error}`);
  }
}
