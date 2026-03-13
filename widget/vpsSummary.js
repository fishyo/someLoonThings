/**
 * VPS 流量监控 Widget
 * 读取 BoxJS ($persistentStore) 中由以下脚本存储的 API Key：
 *   bwg.js      → bandwagon.apiKey / bandwagon.veid
 *   racknerd.js → racknerd.apiKey  / racknerd.apiHash
 */

export default async function (ctx) {

  // ── 读取 BoxJS 存储的凭据 ──────────────────────────────────────────────────
  const bwgKey  = $persistentStore.read("bandwagon.apiKey") || "";
  const bwgVeid = $persistentStore.read("bandwagon.veid")   || "";
  const rnKey   = $persistentStore.read("racknerd.apiKey")  || "";
  const rnHash  = $persistentStore.read("racknerd.apiHash") || "";

  // ── 1. 搬瓦工流量查询 ─────────────────────────────────────────────────────
  const getBWG = async () => {
    if (!bwgKey || !bwgVeid) return { label: "Bandwagon", err: "未配置凭据" };
    try {
      const resp = await ctx.http.get(
        `https://api.64clouds.com/v1/getServiceInfo?veid=${bwgVeid}&api_key=${bwgKey}`
      );
      const d = await resp.json();
      if (d.error) return { label: "Bandwagon", err: String(d.error) };

      const used  = (d.data_counter     || 0) * (d.monthly_data_multiplier || 1);
      const total = (d.plan_monthly_data || 1) * (d.monthly_data_multiplier || 1);
      const pct   = Math.min((used / total) * 100, 100);
      const reset = d.data_next_reset
        ? new Date(d.data_next_reset * 1000).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
        : null;

      return {
        label:   "Bandwagon",
        pct:     pct.toFixed(1),
        usedGB:  (used  / 1073741824).toFixed(1),
        totalGB: (total / 1073741824).toFixed(1),
        reset,
      };
    } catch (e) {
      return { label: "Bandwagon", err: String(e.message || e) };
    }
  };

  // ── 2. RackNerd 流量查询 ──────────────────────────────────────────────────
  const getRN = async () => {
    if (!rnKey || !rnHash) return { label: "RackNerd", err: "未配置凭据" };
    try {
      const resp = await ctx.http.get(
        `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${rnKey}&hash=${rnHash}&bw=true`
      );
      const xml = await resp.text();

      const tag = (t) => { const m = xml.match(new RegExp(`<${t}>(.*?)</${t}>`, "s")); return m ? m[1].trim() : null; };

      if (tag("status") === "error") return { label: "RackNerd", err: tag("statusmsg") || "API 错误" };

      const bwRaw = tag("bw");
      if (!bwRaw) return { label: "RackNerd", err: "无流量数据" };

      const parts = bwRaw.split(",");
      const total = parseFloat(parts[0]) || 0;
      const used  = parseFloat(parts[1]) || 0;
      const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0;

      return {
        label:   "RackNerd",
        pct:     pct.toFixed(1),
        usedGB:  (used  / 1073741824).toFixed(1),
        totalGB: (total / 1073741824).toFixed(1),
        reset:   null,
      };
    } catch (e) {
      return { label: "RackNerd", err: String(e.message || e) };
    }
  };

  // ── 并行拉取 ──────────────────────────────────────────────────────────────
  const [bwg, rn] = await Promise.all([getBWG(), getRN()]);

  // ── 工具 ──────────────────────────────────────────────────────────────────
  const barColor = (p) => {
    const v = parseFloat(p);
    if (v >= 90) return "#FF3B30";
    if (v >= 70) return "#FF9500";
    return "#30D158";
  };

  const block = (p) => {
    const n = 12;
    const f = Math.round((parseFloat(p) / 100) * n);
    return "▰".repeat(Math.min(f, n)) + "▱".repeat(Math.max(0, n - f));
  };

  // ── 卡片组件 ──────────────────────────────────────────────────────────────
  const card = (item) => {
    if (item.err) {
      return {
        type: "stack", direction: "column", gap: 3,
        padding: [6, 8, 6, 8], backgroundColor: "#ffffff18", borderRadius: 8,
        children: [
          {
            type: "stack", direction: "row", alignItems: "center", gap: 5,
            children: [
              { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", color: "#FF9500", width: 11, height: 11 },
              { type: "text", text: item.label, font: { size: 11, weight: "semibold" }, textColor: "#ffffff" },
            ],
          },
          { type: "text", text: item.err, font: { size: 10 }, textColor: "#FF9500" },
        ],
      };
    }

    const color = barColor(item.pct);
    return {
      type: "stack", direction: "column", gap: 4,
      padding: [6, 8, 6, 8], backgroundColor: "#ffffff12", borderRadius: 8,
      children: [
        {
          type: "stack", direction: "row", alignItems: "center", gap: 5,
          children: [
            { type: "image", src: "sf-symbol:server.rack.fill", color, width: 11, height: 11 },
            { type: "text", text: item.label, font: { size: 11, weight: "semibold" }, textColor: "#ffffff" },
            { type: "spacer" },
            { type: "text", text: `${item.pct}%`, font: { size: 11, weight: "bold" }, textColor: color },
          ],
        },
        { type: "text", text: block(item.pct), font: { size: 9, family: "Menlo" }, textColor: color },
        {
          type: "stack", direction: "row", alignItems: "center", gap: 4,
          children: [
            { type: "text", text: `${item.usedGB} / ${item.totalGB} GB`, font: { size: 9, weight: "medium" }, textColor: "#ffffffbb" },
            { type: "spacer" },
            { type: "text", text: item.reset ? `重置 ${item.reset}` : "月度流量", font: { size: 8 }, textColor: "#ffffff66" },
          ],
        },
      ],
    };
  };

  // ── 锁屏矩形 ──────────────────────────────────────────────────────────────
  if (ctx.widgetFamily === "accessoryRectangular") {
    return {
      type: "widget",
      children: [
        { type: "text", text: "VPS 流量", font: { size: "headline", weight: "semibold" }, textColor: "#ffffff" },
        { type: "spacer", length: 2 },
        { type: "text", text: bwg.err ? `BWG: ${bwg.err}` : `BWG ${bwg.pct}%  ${bwg.usedGB}/${bwg.totalGB} G`, font: { size: "caption1" }, textColor: bwg.err ? "#FF9500" : "#CCE5FF" },
        { type: "text", text: rn.err  ? `RN:  ${rn.err}`  : `RN  ${rn.pct}%  ${rn.usedGB}/${rn.totalGB} G`,  font: { size: "caption1" }, textColor: rn.err  ? "#FF9500" : "#CCE5FF" },
      ],
    };
  }

  // ── 主屏幕组件 ────────────────────────────────────────────────────────────
  return {
    type: "widget",
    backgroundGradient: {
      type: "linear",
      colors: ["#0f0c29", "#1a1a2e", "#16213e"],
      stops: [0, 0.5, 1.0],
      startPoint: { x: 0, y: 0 },
      endPoint:   { x: 1, y: 1 },
    },
    padding: 12,
    gap: 6,
    children: [
      {
        type: "stack", direction: "row", alignItems: "center", gap: 6,
        children: [
          { type: "image", src: "sf-symbol:server.rack.fill", color: "#0A84FF", width: 14, height: 14 },
          { type: "text", text: "VPS 流量监控", font: { size: 13, weight: "bold" }, textColor: "#ffffff" },
          { type: "spacer" },
        ],
      },
      { type: "spacer" },
      card(bwg),
      { type: "spacer", length: 4 },
      card(rn),
      { type: "spacer" },
      {
        type: "stack", direction: "row", alignItems: "center", gap: 4,
        children: [
          { type: "image", src: "sf-symbol:clock.fill", color: "#ffffff44", width: 9, height: 9 },
          { type: "date", date: new Date().toISOString(), format: "relative", font: { size: 8 }, textColor: "#ffffff44" },
        ],
      },
    ],
  };
}
