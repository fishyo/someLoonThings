export default async function (ctx) {
  const key = ctx.env.RACKNERD_API_KEY || ctx.storage.get("racknerd.apiKey") || "";
  const hash = ctx.env.RACKNERD_API_HASH || ctx.storage.get("racknerd.apiHash") || "";
  if (!key || !hash) return ctx.notify({ title: "🖥️ VPS 状态", subtitle: "RackNerd · Egern", body: "🔴 查询失败\n请在模块 Env 中配置 RACKNERD_API_KEY 和 RACKNERD_API_HASH" });
  const value = (xml, tag) => xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() || "";
  try {
    const url = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${encodeURIComponent(key)}&hash=${encodeURIComponent(hash)}&ipaddr=true&bw=true&status=true`;
    const response = await ctx.http.get(url, { timeout: 15000 });
    const xml = await response.text();
    if (value(xml, "status") === "error") throw new Error(value(xml, "statusmsg") || "API 返回错误");
    const [total, used] = (value(xml, "bw") || "0,0").split(",").map(Number);
    const pct = total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";
    const status = value(xml, "vmstat") || "未知";
    const online = status.toLowerCase() === "online";
    const ip = (value(xml, "ipaddress") || value(xml, "ip_address")).split(",")[0] || "未知";
    ctx.notify({
      title: "🖥️ VPS 状态",
      subtitle: "RackNerd · Egern",
      body: `${online ? "🟢" : "🔴"} 状态: ${status}\n🌐 IP: ${ip}\n📊 流量: ${(used / 1073741824).toFixed(2)} / ${(total / 1073741824).toFixed(2)} GB\n📈 使用率: ${pct}%\n📍 节点: ${value(xml, "node") || "未知"}\n🗓 重置: 未提供`,
    });
  } catch (error) {
    ctx.notify({ title: "🖥️ VPS 状态", subtitle: "RackNerd · Egern", body: `🔴 查询失败\n${error.message || String(error)}` });
  }
}
