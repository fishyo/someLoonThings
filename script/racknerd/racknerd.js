/**
 * RackNerd VPS status — Loon / Quantumult X.
 * Credentials: racknerd.apiKey, racknerd.apiHash (BoxJS compatible).
 */
const Runtime = (() => {
  const qx = typeof $task !== "undefined";
  const fetch = (options) => qx
    ? $task.fetch(options).then((r) => ({ status: r.statusCode, body: r.body }))
    : new Promise((resolve, reject) => $httpClient.get(options, (e, r, body) =>
        e ? reject(new Error(String(e))) : resolve({ status: r.status, body })));
  return {
    platform: qx ? "Quantumult X" : "Loon",
    read: (key) => qx ? $prefs.valueForKey(key) : $persistentStore.read(key),
    fetch,
    notify: (title, subtitle, body) => qx
      ? $notify(title, subtitle, body)
      : $notification.post(title, subtitle, body),
    done: () => $done(),
  };
})();

const xmlValue = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
};
const formatBytes = (bytes) => `${(Number(bytes || 0) / 1073741824).toFixed(2)} GB`;
const progress = (ratio) => {
  const safe = Math.min(Math.max(Number(ratio) || 0, 0), 1);
  const filled = Math.round(safe * 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${(safe * 100).toFixed(1)}%`;
};

async function main() {
  const key = Runtime.read("racknerd.apiKey") || "";
  const hash = Runtime.read("racknerd.apiHash") || "";
  if (!key || !hash) throw new Error("请先在 BoxJS 中配置 RackNerd API Key 和 Hash");

  const url = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${encodeURIComponent(key)}&hash=${encodeURIComponent(hash)}&ipaddr=true&bw=true&status=true`;
  const response = await Runtime.fetch({ url, method: "GET", timeout: 15000 });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  if (xmlValue(response.body, "status") === "error") {
    throw new Error(xmlValue(response.body, "statusmsg") || "API 返回错误");
  }

  const [total, used] = (xmlValue(response.body, "bw") || "0,0").split(",").map(Number);
  const ratio = total > 0 ? used / total : 0;
  const ip = (xmlValue(response.body, "ipaddress") || xmlValue(response.body, "ip_address")).split(",")[0];
  const status = xmlValue(response.body, "vmstat") || "未知";
  const online = status.toLowerCase() === "online";
  const message = [
    `${online ? "🟢" : "🔴"} 状态: ${status}`,
    `🌐 IP: ${ip || "未知"}`,
    `📊 流量: ${formatBytes(used)} / ${formatBytes(total)}`,
    `📈 使用率: ${progress(ratio)}`,
    `📍 节点: ${xmlValue(response.body, "node") || "未知"}`,
    "🗓 重置: 未提供",
  ].join("\n");
  Runtime.notify("🖥️ VPS 状态", `RackNerd · ${Runtime.platform}`, message);
}

main()
  .catch((error) => Runtime.notify("🖥️ VPS 状态", `RackNerd · ${Runtime.platform}`, `🔴 查询失败\n${error.message || String(error)}`))
  .finally(Runtime.done);
