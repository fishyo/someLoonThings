export default async function (ctx) {
  const key = ctx.env.RACKNERD_API_KEY || ctx.storage.get("racknerd.apiKey") || "";
  const hash = ctx.env.RACKNERD_API_HASH || ctx.storage.get("racknerd.apiHash") || "";
  if (!key || !hash) return ctx.notify({ title: "RackNerd 查询失败", body: "请在模块 Env 中配置 RACKNERD_API_KEY 和 RACKNERD_API_HASH" });
  const value = (xml, tag) => xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() || "";
  try {
    const url = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${encodeURIComponent(key)}&hash=${encodeURIComponent(hash)}&ipaddr=true&bw=true&status=true`;
    const response = await ctx.http.get(url, { timeout: 15000 });
    const xml = await response.text();
    if (value(xml, "status") === "error") throw new Error(value(xml, "statusmsg") || "API 返回错误");
    const [total, used] = (value(xml, "bw") || "0,0").split(",").map(Number);
    const pct = total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";
    ctx.notify({
      title: "RackNerd Status",
      body: `流量: ${(used / 1073741824).toFixed(2)} / ${(total / 1073741824).toFixed(2)} GB\n使用率: ${pct}%\n状态: ${value(xml, "vmstat") || "未知"}`,
    });
  } catch (error) {
    ctx.notify({ title: "RackNerd 查询失败", body: error.message || String(error) });
  }
}
