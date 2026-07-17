/**
 * Bandwagon VPS status — Loon / Quantumult X.
 * Credentials: bandwagon.apiKey, bandwagon.veid (BoxJS compatible).
 */
const Runtime = (() => {
  const qx = typeof $task !== "undefined";
  return {
    platform: qx ? "Quantumult X" : "Loon",
    read: (key) => qx ? $prefs.valueForKey(key) : $persistentStore.read(key),
    request: (options) => qx
      ? $task.fetch(options).then((r) => ({ status: r.statusCode, body: r.body }))
      : new Promise((resolve, reject) => $httpClient.get(options, (e, r, body) =>
          e ? reject(new Error(String(e))) : resolve({ status: r.status, body }))),
    notify: (title, subtitle, body) => qx
      ? $notify(title, subtitle, body)
      : $notification.post(title, subtitle, body),
    done: () => $done(),
  };
})();

const bytesToGB = (bytes) => (Number(bytes || 0) / 1073741824).toFixed(2);
const progress = (ratio) => {
  const safe = Math.min(Math.max(Number(ratio) || 0, 0), 1);
  const filled = Math.round(safe * 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${(safe * 100).toFixed(1)}%`;
};

async function main() {
  const apiKey = Runtime.read("bandwagon.apiKey") || "";
  const veid = Runtime.read("bandwagon.veid") || "";
  if (!apiKey || !veid) throw new Error("请先在 BoxJS 中配置 Bandwagon API Key 和 VEID");

  const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${encodeURIComponent(veid)}&api_key=${encodeURIComponent(apiKey)}`;
  const response = await Runtime.request({ url, method: "GET", timeout: 15000 });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

  const data = JSON.parse(response.body);
  if (data.error) throw new Error(String(data.error));
  const multiplier = Number(data.monthly_data_multiplier || 1);
  const used = Number(data.data_counter || 0) * multiplier;
  const total = Number(data.plan_monthly_data || 0) * multiplier;
  const ratio = total > 0 ? used / total : 0;
  const reset = data.data_next_reset
    ? new Date(data.data_next_reset * 1000).toLocaleDateString("zh-CN")
    : "未知";
  const ips = Array.isArray(data.ip_addresses) ? data.ip_addresses.join(", ") : "未知";
  const message = [
    "🟢 状态: Online",
    `🌐 IP: ${ips}`,
    `📊 流量: ${bytesToGB(used)} / ${bytesToGB(total)} GB`,
    `📈 使用率: ${progress(ratio)}`,
    `📍 节点: ${data.node_location || "未知"}`,
    `🗓 重置: ${reset}`,
  ].join("\n");
  Runtime.notify("🖥️ VPS 状态", `Bandwagon · ${Runtime.platform}`, message);
}

main()
  .catch((error) => Runtime.notify("🖥️ VPS 状态", `Bandwagon · ${Runtime.platform}`, `🔴 查询失败\n${error.message || String(error)}`))
  .finally(Runtime.done);
