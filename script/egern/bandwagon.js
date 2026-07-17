export default async function (ctx) {
  const key = ctx.env.BWG_API_KEY || ctx.storage.get("bandwagon.apiKey") || "";
  const veid = ctx.env.BWG_VEID || ctx.storage.get("bandwagon.veid") || "";
  if (!key || !veid) return ctx.notify({ title: "🖥️ VPS 状态", subtitle: "Bandwagon · Egern", body: "🔴 查询失败\n请在模块 Env 中配置 BWG_API_KEY 和 BWG_VEID" });
  try {
    const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${encodeURIComponent(veid)}&api_key=${encodeURIComponent(key)}`;
    const response = await ctx.http.get(url, { timeout: 15000 });
    const data = await response.json();
    if (data.error) throw new Error(String(data.error));
    const mult = Number(data.monthly_data_multiplier || 1);
    const used = Number(data.data_counter || 0) * mult;
    const total = Number(data.plan_monthly_data || 0) * mult;
    const pct = total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";
    const reset = data.data_next_reset ? new Date(data.data_next_reset * 1000).toLocaleDateString("zh-CN") : "未知";
    const ips = Array.isArray(data.ip_addresses) ? data.ip_addresses.join(", ") : "未知";
    ctx.notify({
      title: "🖥️ VPS 状态",
      subtitle: "Bandwagon · Egern",
      body: `🟢 状态: Online\n🌐 IP: ${ips}\n📊 流量: ${(used / 1073741824).toFixed(2)} / ${(total / 1073741824).toFixed(2)} GB\n📈 使用率: ${pct}%\n📍 节点: ${data.node_location || "未知"}\n🗓 重置: ${reset}`,
    });
  } catch (error) {
    ctx.notify({ title: "🖥️ VPS 状态", subtitle: "Bandwagon · Egern", body: `🔴 查询失败\n${error.message || String(error)}` });
  }
}
