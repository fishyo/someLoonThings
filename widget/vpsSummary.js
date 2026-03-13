/**
 * Egern VPS 流量监控小组件
 * 功能：合并展示搬瓦工 (Bandwagon/BWG) 和 RackNerd 的月度流量使用情况
 *
 * 凭据读取优先级：ctx.env (Egern 模块/主配置 env 设置) > BoxJS ($persistentStore)
 *   BWG:      BWG_API_KEY, BWG_VEID             / boxjs: bandwagon.apiKey, bandwagon.veid
 *   RackNerd: RACKNERD_API_KEY, RACKNERD_API_HASH / boxjs: racknerd.apiKey, racknerd.apiHash
 */

export default async function (ctx) {
  // 入口日志：确认脚本被成功调用
  console.log("[VPS Widget] started, widgetFamily:", ctx.widgetFamily);

  // 凭据读取：优先 ctx.env，其次降级读取 BoxJS $persistentStore
  const store = (key) => {
    try {
      if (typeof $persistentStore !== "undefined") return $persistentStore.read(key) || "";
    } catch (_) {}
    return "";
  };

  // ── 1. 拉取搬瓦工数据 ──────────────────────────────────────────────────────
  const getBWG = async () => {
    const apiKey = (ctx.env.BWG_API_KEY || store("bandwagon.apiKey")).trim();
    const veid   = (ctx.env.BWG_VEID    || store("bandwagon.veid")).trim();
    console.log("[BWG] apiKey len:", apiKey.length, "veid len:", veid.length);
    if (!apiKey || !veid) return { label: "Bandwagon", err: "未配置凭据" };

    try {
      const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${veid}&api_key=${apiKey}`;
      // 按 Egern 文档示例：只传 URL 字符串，用 resp.json() 解析
      const resp = await ctx.http.get(url);
      const d = await resp.json();

      if (d.error) return { label: "Bandwagon", err: String(d.error) };

      const counter = d.data_counter || 0;
      const plan = d.plan_monthly_data || 1;
      const mult = d.monthly_data_multiplier || 1;
      const usedBytes = counter * mult;
      const totalBytes = plan * mult;
      const pct = Math.min((usedBytes / totalBytes) * 100, 100);
      const resetDate = d.data_next_reset
        ? new Date(d.data_next_reset * 1000).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
        : "--";

      return {
        label: "Bandwagon",
        pct: pct.toFixed(1),
        usedGB: (usedBytes / 1073741824).toFixed(1),
        totalGB: (totalBytes / 1073741824).toFixed(1),
        reset: resetDate,
      };
    } catch (e) {
      // 透传真实错误，方便排查
      return { label: "Bandwagon", err: String(e.message || e) };
    }
  };

  // ── 2. 拉取 RackNerd 数据 ──────────────────────────────────────────────────
  const getRN = async () => {
    const apiKey  = (ctx.env.RACKNERD_API_KEY  || store("racknerd.apiKey")).trim();
    const apiHash = (ctx.env.RACKNERD_API_HASH || store("racknerd.apiHash")).trim();
    console.log("[RN] apiKey len:", apiKey.length, "apiHash len:", apiHash.length);
    if (!apiKey || !apiHash) return { label: "RackNerd", err: "未配置凭据" };

    try {
      const url = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${apiKey}&hash=${apiHash}&bw=true`;
      // 只传 URL 字符串，用 resp.text() 读取 XML 响应
      const resp = await ctx.http.get(url);
      const xml = await resp.text();

      const tag = (t) => {
        const m = xml.match(new RegExp(`<${t}>(.*?)</${t}>`, "s"));
        return m ? m[1].trim() : null;
      };

      if (tag("status") === "error") return { label: "RackNerd", err: tag("statusmsg") || "API Error" };

      // SolusVM bw 格式："total,used,free,percent"（以字节为单位）
      const bwRaw = tag("bw");
      if (!bwRaw) return { label: "RackNerd", err: "无流量数据" };

      const parts = bwRaw.split(",").map((s) => s.trim());
      const total = parseFloat(parts[0]) || 0;
      const used = parseFloat(parts[1]) || 0;
      const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

      return {
        label: "RackNerd",
        pct: pct.toFixed(1),
        usedGB: (used / 1073741824).toFixed(1),
        totalGB: (total / 1073741824).toFixed(1),
        reset: null,
      };
    } catch (e) {
      return { label: "RackNerd", err: String(e.message || e) };
    }
  };

  // 并行请求两个 API
  const [bwg, rn] = await Promise.all([getBWG(), getRN()]);

  // ── 工具函数 ────────────────────────────────────────────────────────────────
  // 根据百分比返回颜色
  const pctColor = (p) => {
    const v = parseFloat(p);
    if (v >= 90) return "#FF3B30";
    if (v >= 70) return "#FF9500";
    return "#30D158";
  };

  // 构建一个 VPS 卡片（单列垂直排列）
  const vpsCard = (item) => {
    if (item.err) {
      return {
        type: "stack",
        direction: "column",
        gap: 3,
        padding: [6, 8, 6, 8],
        backgroundColor: "#ffffff18",
        borderRadius: 8,
        children: [
          {
            type: "stack",
            direction: "row",
            alignItems: "center",
            gap: 5,
            children: [
              { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", color: "#FF9500", width: 12, height: 12 },
              { type: "text", text: item.label, font: { size: 11, weight: "semibold" }, textColor: "#ffffff" },
            ],
          },
          { type: "text", text: item.err, font: { size: 10 }, textColor: "#FF9500" },
        ],
      };
    }

    const color = pctColor(item.pct);
    // 用 Unicode 块字符模拟进度条（共 12 格，完全避免宽度百分比问题）
    const BARS = 12;
    const filled = Math.round((parseFloat(item.pct) / 100) * BARS);
    const bar = "▰".repeat(Math.min(filled, BARS)) + "▱".repeat(Math.max(0, BARS - filled));

    const resetLabel = item.reset ? `重置 ${item.reset}` : "月度流量";

    return {
      type: "stack",
      direction: "column",
      gap: 4,
      padding: [6, 8, 6, 8],
      backgroundColor: "#ffffff12",
      borderRadius: 8,
      children: [
        // 标题行
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 5,
          children: [
            { type: "image", src: "sf-symbol:server.rack.fill", color: color, width: 11, height: 11 },
            { type: "text", text: item.label, font: { size: 11, weight: "semibold" }, textColor: "#ffffff" },
            { type: "spacer" },
            { type: "text", text: `${item.pct}%`, font: { size: 11, weight: "bold" }, textColor: color },
          ],
        },
        // 进度条（Unicode 块）
        { type: "text", text: bar, font: { size: 9, family: "Menlo" }, textColor: color },
        // 用量 & 重置日期
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 4,
          children: [
            {
              type: "text",
              text: `${item.usedGB} / ${item.totalGB} GB`,
              font: { size: 9, weight: "medium" },
              textColor: "#ffffffbb",
            },
            { type: "spacer" },
            { type: "text", text: resetLabel, font: { size: 8 }, textColor: "#ffffff66" },
          ],
        },
      ],
    };
  };

  // ── accessoryRectangular（锁定屏幕矩形小组件）─────────────────────────────
  if (ctx.widgetFamily === "accessoryRectangular") {
    const bwgLine = bwg.err
      ? `BWG: ${bwg.err}`
      : `BWG ${bwg.pct}%  ${bwg.usedGB}/${bwg.totalGB}G`;
    const rnLine = rn.err
      ? `RN: ${rn.err}`
      : `RN  ${rn.pct}%  ${rn.usedGB}/${rn.totalGB}G`;

    return {
      type: "widget",
      children: [
        { type: "text", text: "VPS 流量", font: { size: "headline", weight: "semibold" }, textColor: "#FFFFFF" },
        { type: "spacer", length: 2 },
        { type: "text", text: bwgLine, font: { size: "caption1" }, textColor: bwg.err ? "#FF9500" : "#CCE5FF" },
        { type: "text", text: rnLine, font: { size: "caption1" }, textColor: rn.err ? "#FF9500" : "#CCE5FF" },
      ],
    };
  }

  // ── accessoryCircular（锁定屏幕圆形小组件）────────────────────────────────
  if (ctx.widgetFamily === "accessoryCircular") {
    const avgPct = (bwg.pct && rn.pct)
      ? ((parseFloat(bwg.pct) + parseFloat(rn.pct)) / 2).toFixed(0)
      : "--";
    return {
      type: "widget",
      children: [
        { type: "text", text: "VPS", font: { size: "caption2", weight: "semibold" }, textColor: "#FFFFFF", textAlign: "center" },
        { type: "text", text: `${avgPct}%`, font: { size: "title3", weight: "bold" }, textColor: pctColor(avgPct), textAlign: "center" },
        { type: "text", text: "avg", font: { size: "caption2" }, textColor: "#FFFFFF88", textAlign: "center" },
      ],
    };
  }

  // ── systemSmall / systemMedium / systemLarge（主屏幕主体布局）─────────────
  return {
    type: "widget",
    backgroundGradient: {
      type: "linear",
      colors: ["#0f0c29", "#1a1a2e", "#16213e"],
      stops: [0, 0.5, 1.0],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    padding: 12,
    gap: 6,
    children: [
      // 顶部标题
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 6,
        children: [
          { type: "image", src: "sf-symbol:network.badge.shield.half.filled", color: "#0A84FF", width: 15, height: 15 },
          { type: "text", text: "VPS 流量监控", font: { size: 13, weight: "bold" }, textColor: "#ffffff" },
          { type: "spacer" },
        ],
      },
      { type: "spacer" },
      // 搬瓦工卡片
      vpsCard(bwg),
      { type: "spacer", length: 4 },
      // RackNerd 卡片
      vpsCard(rn),
      { type: "spacer" },
      // 底部刷新时间
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 4,
        children: [
          { type: "image", src: "sf-symbol:clock.fill", color: "#ffffff44", width: 9, height: 9 },
          {
            type: "date",
            date: new Date().toISOString(),
            format: "relative",
            font: { size: 8 },
            textColor: "#ffffff44",
          },
        ],
      },
    ],
  };
}
