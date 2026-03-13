/**
 * VPS 流量监控 Widget
 * 读取 BoxJS ($persistentStore) 中由以下脚本存储的 API Key：
 *   bwg.js      → bandwagon.apiKey / bandwagon.veid
 *   racknerd.js → racknerd.apiKey  / racknerd.apiHash
 */

export default async function (ctx) {

  // ── 读取 BoxJS 存储的凭据 ─────────────────────────────────────────────────
  const bwgKey  = $persistentStore.read("bandwagon.apiKey") || "";
  const bwgVeid = $persistentStore.read("bandwagon.veid")   || "";
  const rnKey   = $persistentStore.read("racknerd.apiKey")  || "";
  const rnHash  = $persistentStore.read("racknerd.apiHash") || "";

  // ── 1. 搬瓦工流量查询 ─────────────────────────────────────────────────────
  const getBWG = async () => {
    if (!bwgKey || !bwgVeid) return { label: "Bandwagon", flag: "🇺🇸", err: "未配置凭据" };
    try {
      const resp = await ctx.http.get(
        `https://api.64clouds.com/v1/getServiceInfo?veid=${bwgVeid}&api_key=${bwgKey}`
      );
      const d = await resp.json();
      if (d.error) return { label: "Bandwagon", flag: "🇺🇸", err: String(d.error) };

      const mult  = d.monthly_data_multiplier || 1;
      const used  = (d.data_counter     || 0) * mult;
      const total = (d.plan_monthly_data || 1) * mult;
      const pct   = Math.min((used / total) * 100, 100);
      const reset = d.data_next_reset
        ? new Date(d.data_next_reset * 1000).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
        : null;

      return {
        label:   "Bandwagon",
        flag:    "🇺🇸",
        pct:     pct.toFixed(1),
        usedGB:  (used  / 1073741824).toFixed(2),
        totalGB: (total / 1073741824).toFixed(1),
        reset,
      };
    } catch (e) {
      return { label: "Bandwagon", flag: "🇺🇸", err: String(e.message || e) };
    }
  };

  // ── 2. RackNerd 流量查询 ──────────────────────────────────────────────────
  const getRN = async () => {
    if (!rnKey || !rnHash) return { label: "RackNerd", flag: "🇺🇸", err: "未配置凭据" };
    try {
      const resp = await ctx.http.get(
        `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${rnKey}&hash=${rnHash}&bw=true`
      );
      const xml = await resp.text();
      const tag = (t) => { const m = xml.match(new RegExp(`<${t}>(.*?)</${t}>`, "s")); return m ? m[1].trim() : null; };

      if (tag("status") === "error") return { label: "RackNerd", flag: "🇺🇸", err: tag("statusmsg") || "API 错误" };

      const bwRaw = tag("bw");
      if (!bwRaw) return { label: "RackNerd", flag: "🇺🇸", err: "无流量数据" };

      const parts = bwRaw.split(",");
      const total = parseFloat(parts[0]) || 0;
      const used  = parseFloat(parts[1]) || 0;
      const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0;

      return {
        label:   "RackNerd",
        flag:    "🇺🇸",
        pct:     pct.toFixed(1),
        usedGB:  (used  / 1073741824).toFixed(2),
        totalGB: (total / 1073741824).toFixed(1),
        reset:   null,
      };
    } catch (e) {
      return { label: "RackNerd", flag: "🇺🇸", err: String(e.message || e) };
    }
  };

  // ── 并行拉取 ──────────────────────────────────────────────────────────────
  const [bwg, rn] = await Promise.all([getBWG(), getRN()]);

  // ── 工具函数 ──────────────────────────────────────────────────────────────
  // 根据使用率返回颜色
  const statusColor = (p) => {
    const v = parseFloat(p);
    if (v >= 90) return "#FF453A";   // 红
    if (v >= 70) return "#FF9F0A";   // 橙
    return "#30D158";                 // 绿
  };

  // Unicode 进度块（16 格）
  const progressBar = (p) => {
    const n = 16, f = Math.round((parseFloat(p) / 100) * n);
    return "█".repeat(Math.min(f, n)) + "░".repeat(Math.max(0, n - f));
  };

  // ── 卡片组件（参考图二样式）─────────────────────────────────────────────
  const card = (item) => {
    // 错误状态
    if (item.err) {
      return {
        type: "stack", direction: "column", gap: 4,
        padding: [10, 12, 10, 12],
        backgroundColor: "#16192e",
        borderRadius: 12,
        children: [
          {
            type: "stack", direction: "row", alignItems: "center", gap: 6,
            children: [
              { type: "text", text: "●", font: { size: 10 }, textColor: "#FF453A" },
              { type: "text", text: item.flag, font: { size: 13 } },
              { type: "text", text: item.label, font: { size: 13, weight: "semibold" }, textColor: "#ffffff" },
            ],
          },
          { type: "text", text: item.err, font: { size: 11 }, textColor: "#FF9F0A" },
        ],
      };
    }

    const color = statusColor(item.pct);
    const pctNum = parseFloat(item.pct);

    return {
      type: "stack", direction: "column", gap: 6,
      padding: [10, 12, 10, 12],
      backgroundColor: "#16192e",
      borderRadius: 12,
      children: [
        // 第一行：状态点 + 国旗 + 名称 + 百分比
        {
          type: "stack", direction: "row", alignItems: "center", gap: 6,
          children: [
            { type: "text", text: "●", font: { size: 10 }, textColor: color },
            { type: "text", text: item.flag, font: { size: 13 } },
            { type: "text", text: item.label, font: { size: 13, weight: "semibold" }, textColor: "#e0e0ff" },
            { type: "spacer" },
            { type: "text", text: `${item.pct}%`, font: { size: 14, weight: "bold" }, textColor: color },
          ],
        },
        // 第二行：进度条
        {
          type: "text",
          text: progressBar(item.pct),
          font: { size: 7, family: "Menlo" },
          textColor: pctNum >= 90 ? "#FF453A" : pctNum >= 70 ? "#FF9F0A" : "#34C759",
        },
        // 第三行：用量 + 重置日期
        {
          type: "stack", direction: "row", alignItems: "center",
          children: [
            {
              type: "text",
              text: `${item.usedGB} / ${item.totalGB} GB`,
              font: { size: 11, weight: "medium" },
              textColor: "#8888bb",
            },
            { type: "spacer" },
            {
              type: "text",
              text: item.reset ? `重置 ${item.reset}` : "月度流量",
              font: { size: 10 },
              textColor: "#555577",
            },
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
        {
          type: "text",
          text: bwg.err ? `BWG: ${bwg.err}` : `🇺🇸 BWG  ${bwg.pct}%  ${bwg.usedGB}/${bwg.totalGB} G`,
          font: { size: "caption1" },
          textColor: bwg.err ? "#FF9F0A" : "#CCE5FF",
        },
        {
          type: "text",
          text: rn.err  ? `RN:  ${rn.err}`  : `🇺🇸 RN   ${rn.pct}%  ${rn.usedGB}/${rn.totalGB} G`,
          font: { size: "caption1" },
          textColor: rn.err  ? "#FF9F0A" : "#CCE5FF",
        },
      ],
    };
  }

  // ── 主屏幕组件 ────────────────────────────────────────────────────────────
  return {
    type: "widget",
    backgroundGradient: {
      type: "linear",
      colors: ["#0d0f1e", "#131629", "#0d0f1e"],
      stops: [0, 0.5, 1.0],
      startPoint: { x: 0, y: 0 },
      endPoint:   { x: 1, y: 1 },
    },
    padding: 12,
    gap: 8,
    children: [
      // 顶部标题栏
      {
        type: "stack", direction: "row", alignItems: "center", gap: 6,
        children: [
          { type: "image", src: "sf-symbol:server.rack.fill", color: "#5e8bff", width: 13, height: 13 },
          { type: "text", text: "VPS 流量监控", font: { size: 12, weight: "bold" }, textColor: "#aaaacc" },
          { type: "spacer" },
          { type: "date", date: new Date().toISOString(), format: "time", font: { size: 10 }, textColor: "#44445a" },
        ],
      },
      // Bandwagon 卡片
      card(bwg),
      // RackNerd 卡片
      card(rn),
    ],
  };
}
