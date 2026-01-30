/**
 * Loon Generic Script - 节点IP信息查询
 * 
 * 功能：
 * - IPv4/IPv6 双栈竞速查询
 * - 多点延迟测试
 * - 结果展示优化 (通知 + 弹窗)
 * - 随机 UA 防屏蔽
 */

const SETTINGS = {
    timeout: 5000,
    ipv4_apis: [
        "https://api.ipify.org?format=json", 
        "https://api.ip.sb/ip", 
        "https://v4.ident.me",
        "https://ipv4.icanhazip.com"
      ],
    ipv6_apis: [
        "https://api64.ipify.org?format=json", 
        "https://v6.ident.me",
        "https://ipv6.icanhazip.com"
    ],
    latency_urls: [
        "http://www.gstatic.com/generate_204", 
        "https://cp.cloudflare.com/generate_204",
        "http://captive.apple.com/hotspot-detect.html"
    ],
    user_agents: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
};

async function queryNodeIP() {
    const nodeName = $environment.params.node;
    
    if (!nodeName) {
        const msg = "请在节点列表中选择一个节点运行";
        showNotification("❌ 错误", "未选择节点", msg);
        return $done({ title: "❌ 错误", content: msg });
    }

    // console.log(`🚀 开始检测节点: ${nodeName}`);

    try {
        // 1. 并行执行：IPv4竞速、IPv6竞速、多点延迟测试
        const [ipv4, ipv6, latencyInfo] = await Promise.all([
            raceIPFetch(SETTINGS.ipv4_apis, nodeName, "IPv4"),
            raceIPFetch(SETTINGS.ipv6_apis, nodeName, "IPv6"),
            getBestLatency(SETTINGS.latency_urls, nodeName)
        ]);

        if (!ipv4 && !ipv6) {
            throw new Error("无法连接网络或获取 IP，请检查节点状态");
        }

        // 2. 提取地理位置与运营商信息
        const primaryIP = ipv4 || ipv6;
        const geo = $utils.geoip(primaryIP) || "未知";
        const asn = $utils.ipasn(primaryIP) || "";
        const aso = $utils.ipaso(primaryIP) || "";
        
        const ispInfo = aso ? (asn ? `${aso} (${asn})` : aso) : (asn || "未知 ISP");

        // 3. 综合评分计算
        const quality = calculateQuality(ipv4, ipv6, latencyInfo);

        // 4. 构建精美输出
        const message = [
            `📡 IP:  ${ipv4 || "❌"} ${ipv4 && ipv6 ? "|" : ""} ${ipv6 || ""}`,
            `🌍 归属: ${getFlagEmoji(geo)} ${getCountryName(geo)}`,
            `🏢 运营商: ${ispInfo}`,
            `⚡ 延迟: ${latencyInfo.ms > 1 ? latencyInfo.ms + "ms" : "超时"} ${getLatencyEmoji(latencyInfo.ms)}`,
            `⭐ 综合评分: ${quality.score} [${quality.grade}]`,
            `━━━━━━━━━━━━━━`,
            `${quality.details}`
        ].join('\n');

        // 5. 输出结果 (通知)
        showNotification(nodeName, quality.grade + "级节点", message);

        // 6. 结束脚本并返回 UI 内容 (修复弹窗空内容问题)
        $done({
            title: nodeName,
            content: message
        });

    } catch (error) {
        const errMsg = error.message || String(error);
        showNotification("查询失败", nodeName, errMsg);
        $done({
            title: "查询失败",
            content: errMsg
        });
    }
}

/**
 * API竞速
 */
function raceIPFetch(urls, nodeName, type) {
    const fetchPromises = urls.map(url => {
        return new Promise((resolve, reject) => {
            const ua = SETTINGS.user_agents[Math.floor(Math.random() * SETTINGS.user_agents.length)];
            
            $httpClient.get({ 
                url, 
                timeout: SETTINGS.timeout, 
                node: nodeName,
                headers: { "User-Agent": ua }
            }, (err, resp, data) => {
                if (err || resp.status !== 200) return reject(err);
                try {
                    const ip = data.includes('{') ? JSON.parse(data).ip : data.trim();
                    if (isValidIP(ip)) resolve(ip);
                    else reject("Invalid IP");
                } catch (e) { reject(e); }
            });
        });
    });

    return promiseAny(fetchPromises).catch(() => null);
}

// Promise.any compatible polyfill
function promiseAny(promises) {
    return new Promise((resolve, reject) => {
        let errors = [];
        let count = promises.length;
        if (count === 0) return reject(new Error("Empty promises"));

        promises.forEach(p => {
            Promise.resolve(p).then(resolve, err => {
                errors.push(err);
                count--;
                if (count === 0) reject(new Error("All promises failed"));
            });
        });
    });
}

// Best Latency
async function getBestLatency(urls, nodeName) {
    const results = await Promise.allSettled(urls.map(url => {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            $httpClient.head({ url, timeout: SETTINGS.timeout, node: nodeName }, (err, resp) => {
                if (!err && (resp.status === 200 || resp.status === 204)) {
                    resolve(Date.now() - start);
                } else {
                    reject(err);
                }
            });
        });
    }));

    const successfulTests = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
    
    return successfulTests.length > 0 
        ? { success: true, ms: Math.min(...successfulTests) } 
        : { success: false, ms: -1 };
}

function calculateQuality(v4, v6, latency) {
    let score = 0;
    let tags = [];

    if (v4) { score += 30; tags.push("IPv4"); }
    else tags.push("NoIPv4");
    
    if (v6) { score += 20; tags.push("IPv6"); }

    if (latency.success) {
        if (latency.ms < 80) { score += 50; tags.push("🚀极速"); }
        else if (latency.ms < 150) { score += 40; tags.push("⚡高速"); }
        else if (latency.ms < 300) { score += 25; tags.push("🐢普通"); }
        else { score += 10; tags.push("🐌缓慢"); }
    } else {
        tags.push("❌超时");
    }

    const grade = score >= 90 ? "SSS" : score >= 80 ? "IP+" : score >= 70 ? "A" : score >= 50 ? "B" : "C";
    return { score, grade, details: tags.join(" | ") };
}

function getLatencyEmoji(ms) {
    if (ms < 0) return "❌";
    if (ms < 80) return "🟢";
    if (ms < 150) return "🟡";
    if (ms < 300) return "🟠";
    return "🔴";
}

function isValidIP(ip) {
    if (!ip) return false;
    return (ip.includes(".") && ip.length > 6) || (ip.includes(":") && ip.length > 2);
}

function showNotification(title, subtitle, message) {
    $notification.post(title, subtitle, message);
}

function getCountryName(code) {
    const map = { CN: "中国", HK: "香港", TW: "台湾", US: "美国", JP: "日本", SG: "新加坡", KR: "韩国", GB: "英国", DE: "德国", FR: "法国" };
    return map[code] || code;
}

function getFlagEmoji(code) {
    if (!code || code === '未知') return '🌍';
    try {
        return code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    } catch (e) { return '🌍'; }
}

queryNodeIP();
