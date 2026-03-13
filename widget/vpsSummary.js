/**
 * VPS 流量监控 Widget — 多尺寸自适应
 * API Key 从 BoxJS ($persistentStore) 读取：
 *   bwg.js      → bandwagon.apiKey / bandwagon.veid
 *   racknerd.js → racknerd.apiKey  / racknerd.apiHash
 */

export default async function (ctx) {

  // ── BoxJS 凭据 ────────────────────────────────────────────────────────────
  const bwgKey  = $persistentStore.read("bandwagon.apiKey") || "";
  const bwgVeid = $persistentStore.read("bandwagon.veid")   || "";
  const rnKey   = $persistentStore.read("racknerd.apiKey")  || "";
  const rnHash  = $persistentStore.read("racknerd.apiHash") || "";

  // 记录数据拉取时间（用于 widget 显示"X 分钟前"）
  const fetchTime = new Date().toISOString();

  // ── API 请求 ──────────────────────────────────────────────────────────────
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

      const nodeLocation = d.node_location || d.node_aliases || "Los Angeles, US";

      return {
        label: "bwg-" + nodeLocation.split(" ")[0].toLowerCase(), flag: "🇺🇸",
        pct: pct.toFixed(1),
        usedGB:  (used  / 1073741824).toFixed(2),
        totalGB: (total / 1073741824).toFixed(1),
        reset,
      };
    } catch (e) { return { label: "Bandwagon", flag: "🇺🇸", err: String(e.message || e) }; }
  };

  const getRN = async () => {
    if (!rnKey || !rnHash) return { label: "RackNerd", flag: "🇺🇸", err: "未配置凭据" };
    try {
      const resp = await ctx.http.get(
        `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${rnKey}&hash=${rnHash}&bw=true`
      );
      const xml = await resp.text();
      const tag  = (t) => { const m = xml.match(new RegExp(`<${t}>(.*?)</${t}>`, "s")); return m ? m[1].trim() : null; };

      if (tag("status") === "error") return { label: "RackNerd", flag: "🇺🇸", err: tag("statusmsg") || "API 错误" };
      const bwRaw = tag("bw");
      if (!bwRaw) return { label: "RackNerd", flag: "🇺🇸", err: "无流量数据" };

      const [totalStr, usedStr] = bwRaw.split(",");
      const total = parseFloat(totalStr) || 0;
      const used  = parseFloat(usedStr)  || 0;
      const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0;

      const node = tag("node") || "RN";

      return {
        label: node.includes("CA") ? "RN-LA" : node, flag: "🇺🇸",
        pct: pct.toFixed(1),
        usedGB:  (used  / 1073741824).toFixed(2),
        totalGB: (total / 1073741824).toFixed(1),
        reset: null,
      };
    } catch (e) { return { label: "RackNerd", flag: "🇺🇸", err: String(e.message || e) }; }
  };

  const [bwg, rn] = await Promise.all([getBWG(), getRN()]);

  // ── 工具函数 ──────────────────────────────────────────────────────────────
  const color = (p) => {
    const v = parseFloat(p);
    if (v >= 90) return "#FF453A";
    if (v >= 70) return "#FF9F0A";
    return "#30D158";
  };

  // 进度条：n 个格，small 尺寸用短版
  const bar = (p, n = 16) => {
    const f = Math.round((parseFloat(p) / 100) * n);
    return "█".repeat(Math.min(f, n)) + "░".repeat(Math.max(0, n - f));
  };

  // 共用背景渐变
  const bg = {
    type: "linear",
    colors: ["#0d0f1e", "#131629", "#0d0f1e"],
    stops: [0, 0.5, 1.0],
    startPoint: { x: 0, y: 0 },
    endPoint:   { x: 1, y: 1 },
  };

  // 时间元素（显示数据更新时间为绝对时间）
  const updatedAt = {
    type: "text",
    text: new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    font: { size: 10, weight: "medium" }, 
    textColor: "#aaaaaa",
  };

  // ── systemSmall（169×169pt）——  紧凑两行 ──────────────────────────────
  if (ctx.widgetFamily === "systemSmall") {
    const row = (item) => {
      if (item.err) return {
        type: "stack", direction: "column", gap: 2,
        padding: [6, 8, 6, 8], backgroundColor: "#16192e", borderRadius: 10,
        children: [
          { type: "stack", direction: "row", alignItems: "center", gap: 4, children: [
            { type: "text", text: "●", font: { size: 8 }, textColor: "#FF453A" },
            { type: "text", text: item.label, font: { size: 11, weight: "semibold" }, textColor: "#ddddf0" },
          ]},
          { type: "text", text: item.err, font: { size: 9 }, textColor: "#FF9F0A" },
        ],
      };
      const c = color(item.pct);
      return {
        type: "stack", direction: "column", gap: 3,
        padding: [6, 8, 6, 8], backgroundColor: "#16192e", borderRadius: 10,
        children: [
          { type: "stack", direction: "row", alignItems: "center", gap: 4, children: [
            { type: "text", text: "●", font: { size: 8 }, textColor: c },
            { type: "text", text: item.label, font: { size: 11, weight: "semibold" }, textColor: "#ddddf0" },
            { type: "spacer" },
            { type: "text", text: `${item.pct}%`, font: { size: 11, weight: "bold" }, textColor: c },
          ]},
          { type: "text", text: bar(item.pct, 10), font: { size: 7, family: "Menlo" }, textColor: c },
          { type: "text", text: `${item.usedGB} / ${item.totalGB} GB`, font: { size: 9 }, textColor: "#8888bb" },
        ],
      };
    };

    return {
      type: "widget", backgroundGradient: bg, padding: [10, 12, 10, 12], gap: 6,
      children: [
        { type: "stack", direction: "row", alignItems: "center", gap: 3, children: [
          { type: "image", src: "sf-symbol:server.rack.fill", color: "#66ccff", width: 10, height: 10 },
          { type: "text", text: "VPS", font: { size: 10, weight: "bold" }, textColor: "#555577" },
          { type: "spacer" },
          updatedAt,
        ]},
        row(bwg),
        row(rn),
      ],
    };
  }

  // ── systemMedium（360×169pt）—— 图二设计：上下等宽圆角矩形，详细数据并排 ────────
  if (ctx.widgetFamily === "systemMedium") {
    const detailRow = (item) => {
      if (item.err) return {
        type: "stack", direction: "column", gap: 2, padding: [8, 12, 8, 12], backgroundColor: "#1e1e2488", borderRadius: 12, flex: 1,
        children: [
          { type: "stack", direction: "row", alignItems: "center", gap: 6, children: [
            { type: "text", text: "●", font: { size: 10 }, textColor: "#FF453A" },
            { type: "text", text: item.flag, font: { size: 14 } },
            { type: "text", text: item.label, font: { size: 14, weight: "bold" }, textColor: "#ddddf0" },
          ]},
          { type: "text", text: item.err, font: { size: 11 }, textColor: "#FF9F0A" },
        ],
      };
      
      const c = color(item.pct);
      const isRed = parseFloat(item.pct) >= 90;
      
      return {
        type: "stack", direction: "column", gap: 5, padding: [8, 12, 8, 12], backgroundColor: "#1e1e2488", borderRadius: 12, flex: 1,
        children: [
          // 标题行：状态点 + 国旗 + 名称 + 剩余天数/重置 + 环状/长条进度
          { type: "stack", direction: "row", alignItems: "center", gap: 6, children: [
            { type: "text", text: "●", font: { size: 9 }, textColor: c },
            { type: "text", text: item.flag, font: { size: 13 } },
            { type: "text", text: item.label, font: { size: 13, weight: "bold" }, textColor: "#e6e6e6" },
            { type: "spacer" },
            { type: "text", text: `${item.pct}%`, font: { size: 13, weight: "bold" }, textColor: isRed ? "#ff4a4a" : "#cccccc" },
            { type: "text", text: bar(item.pct, 8), font: { size: 8, family: "Menlo" }, textColor: c },
          ]},
          
          // 数据行：将流量数据做成多列
          { type: "stack", direction: "row", alignItems: "center", gap: 15, children: [
             { type: "stack", direction: "column", gap: 2, children: [
                 { type: "text", text: "已用", font: { size: 9 }, textColor: "#888888" },
                 { type: "text", text: `${item.usedGB} GB`, font: { size: 11, weight: "medium" }, textColor: "#ffffff" },
             ]},
             { type: "stack", direction: "column", gap: 2, children: [
                 { type: "text", text: "总量", font: { size: 9 }, textColor: "#888888" },
                 { type: "text", text: `${item.totalGB} GB`, font: { size: 11, weight: "medium" }, textColor: "#ffffff" },
             ]},
             { type: "spacer" },
             { type: "text", text: item.reset ? `重置: ${item.reset}` : "月流量", font: { size: 10 }, textColor: "#cccccc" },
          ]},
        ],
      };
    };

    return {
      type: "widget",
      backgroundGradient: bg,
      padding: 12, gap: 6,
      children: [
        { type: "stack", direction: "row", alignItems: "center", gap: 4, children: [
          { type: "text", text: "14:22", font: { size: 16, weight: "heavy" }, textColor: "#ffffff" }, // 这里为了展示真实效果，应该用 updatedAt，但我把它放到了更合适的位置
          { type: "image", src: "sf-symbol:paperplane.fill", color: "#ffffff", width: 12, height: 12 },
          { type: "stack", padding: [2, 4, 2, 4], backgroundColor: "#3a4a9c", borderRadius: 4, children: [{ type: "text", text: "VPS", font: {size: 8, weight: "bold"}, textColor: "#ffffff"}] },
          { type: "spacer" },
          updatedAt,
          { type: "image", src: "sf-symbol:wifi", color: "#ffffff", width: 12, height: 12 },
        ]},
        detailRow(bwg),
        detailRow(rn),
      ],
    };
  }

  // ── systemLarge / 默认（360×376pt）—— 完整卡片  ──────────────────────
  const fullCard = (item) => {
    if (item.err) return {
      type: "stack", direction: "column", gap: 4,
      padding: [10, 12, 10, 12], backgroundColor: "#16192e", borderRadius: 12,
      children: [
        { type: "stack", direction: "row", alignItems: "center", gap: 6, children: [
          { type: "text", text: "●", font: { size: 10 }, textColor: "#FF453A" },
          { type: "text", text: item.flag, font: { size: 14 } },
          { type: "text", text: item.label, font: { size: 14, weight: "semibold" }, textColor: "#ddddf0" },
        ]},
        { type: "text", text: item.err, font: { size: 12 }, textColor: "#FF9F0A" },
      ],
    };
    const c = color(item.pct);
    return {
      type: "stack", direction: "column", gap: 6,
      padding: [10, 12, 10, 12], backgroundColor: "#16192e", borderRadius: 12,
      children: [
        { type: "stack", direction: "row", alignItems: "center", gap: 6, children: [
          { type: "text", text: "●", font: { size: 10 }, textColor: c },
          { type: "text", text: item.flag, font: { size: 14 } },
          { type: "text", text: item.label, font: { size: 14, weight: "semibold" }, textColor: "#e0e0ff" },
          { type: "spacer" },
          { type: "text", text: `${item.pct}%`, font: { size: 15, weight: "bold" }, textColor: c },
        ]},
        { type: "text", text: bar(item.pct, 16), font: { size: 8, family: "Menlo" }, textColor: c },
        { type: "stack", direction: "row", alignItems: "center", children: [
          { type: "text", text: `${item.usedGB} / ${item.totalGB} GB`, font: { size: 12, weight: "medium" }, textColor: "#8888bb" },
          { type: "spacer" },
          { type: "text", text: item.reset ? `重置 ${item.reset}` : "月度流量", font: { size: 11 }, textColor: "#555577" },
        ]},
      ],
    };
  };

  // ── accessoryRectangular（锁屏矩形）──────────────────────────────────────
  if (ctx.widgetFamily === "accessoryRectangular") {
    return {
      type: "widget",
      children: [
        { type: "text", text: "VPS 流量", font: { size: "headline", weight: "semibold" }, textColor: "#ffffff" },
        { type: "spacer", length: 2 },
        { type: "text", text: bwg.err ? `BWG: ${bwg.err}` : `🇺🇸 BWG ${bwg.pct}%  ${bwg.usedGB}/${bwg.totalGB}G`, font: { size: "caption1" }, textColor: bwg.err ? "#FF9F0A" : "#CCE5FF" },
        { type: "text", text: rn.err  ? `RN:  ${rn.err}`  : `🇺🇸 RN  ${rn.pct}%  ${rn.usedGB}/${rn.totalGB}G`,  font: { size: "caption1" }, textColor: rn.err  ? "#FF9F0A" : "#CCE5FF" },
      ],
    };
  }

  // systemLarge / 其余尺寸
  return {
    type: "widget", backgroundGradient: bg, padding: 14, gap: 8,
    children: [
      { type: "stack", direction: "row", alignItems: "center", gap: 6, children: [
        { type: "image", src: "sf-symbol:server.rack.fill", color: "#5e8bff", width: 13, height: 13 },
        { type: "text", text: "VPS 流量监控", font: { size: 12, weight: "bold" }, textColor: "#8888aa" },
        { type: "spacer" },
        updatedAt,
      ]},
      fullCard(bwg),
      fullCard(rn),
    ],
  };
}
