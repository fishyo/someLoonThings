/**
 * Loon Generic Script - 节点IP信息查询 (Debug 版)
 * 
 * update: 移除剪贴板功能，增加详细调试日志
 */

const SETTINGS = {
    timeout: 5000, // 超时 (ms)
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
    // 多地区延迟测试点
    latency_urls: [
        "http://www.gstatic.com/generate_204", 
        "https://cp.cloudflare.com/generate_204",
        "http://captive.apple.com/hotspot-detect.html"
    ],
    // 随机 UA 池
    user_agents: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
};

async function queryNodeIP() {
    log("脚本开始执行");
    const nodeName = $environment.params.node;
    
    if (!nodeName) {
        log("错误：未找到节点名称");
        showNotification("❌ 错误", "未选择节点", "请在节点列表中选择一个节点运行");
        return $done({});
    }

    log(`准备检测节点: ${nodeName}`);

    try {
        log("开始并行任务：IPv4, IPv6, Latency");
        
        // 1. 并行执行
        const startTime = Date.now();
        const [ipv4, ipv6, latencyInfo] = await Promise.all([
            raceIPFetch(SETTINGS.ipv4_apis, nodeName, "IPv4"),
            raceIPFetch(SETTINGS.ipv6_apis, nodeName, "IPv6"),
            getBestLatency(SETTINGS.latency_urls, nodeName)
        ]);
        log(`并行任务完成，耗时: ${Date.now() - startTime}ms`);
        log(`获取结果 - IPv4: ${ipv4}, IPv6: ${ipv6}, Latency: ${JSON.stringify(latencyInfo)}`);

        if (!ipv4 && !ipv6) {
            log("错误：IPv4 和 IPv6 均未获取到");
            throw new Error("无法连接网络或获取 IP，请检查节点状态");
        }

        // 2. 提取地理位置与运营商信息
        log("开始查询 GeoIP 信息");
        const primaryIP = ipv4 || ipv6;
        const geo = $utils.geoip(primaryIP) || "未知";
        const asn = $utils.ipasn(primaryIP) || "";
        const aso = $utils.ipaso(primaryIP) || "";
        log(`GeoIP 结果: ${geo}, ASN: ${asn}, ASO: ${aso}`);
        
        const ispInfo = aso ? (asn ? `${aso} (${asn})` : aso) : (asn || "未知 ISP");

        // 3. 综合评分计算
        const quality = calculateQuality(ipv4, ipv6, latencyInfo);
        log(`质量评分: ${quality.score}, 等级: ${quality.grade}`);

        // 4. 构建输出
        const message = [
            `📡 IP:  ${ipv4 || "❌"} ${ipv4 && ipv6 ? "|" : ""} ${ipv6 || ""}`,
            `🌍 归属: ${getFlagEmoji(geo)} ${getCountryName(geo)}`,
            `🏢 运营商: ${ispInfo}`,
            `⚡ 延迟: ${latencyInfo.ms > 1 ? latencyInfo.ms + "ms" : "超时"} ${getLatencyEmoji(latencyInfo.ms)}`,
            `⭐ 综合评分: ${quality.score} [${quality.grade}]`,
            `━━━━━━━━━━━━━━`,
            `${quality.details}`
        ].join('\n');

        // 5. 输出结果
        log("发送通知...");
        showNotification(nodeName, quality.grade + "级节点", message);
        log("通知已发送");

    } catch (error) {
        log(`捕获到异常: ${error.message || error}`);
        log(`异常堆栈: ${error.stack}`);
        showNotification("查询失败", nodeName, error.message || String(error));
    } finally {
        log("脚本执行完毕，调用 $done({})");
        $done({});
    }
}

/**
 * 包装日志函数，方便调试
 */
function log(msg) {
    console.log(`[NodeIP_Debug] ${msg}`);
}

/**
 * API竞速
 */
function raceIPFetch(urls, nodeName, type) {
    log(`开始 ${type} 竞速查询，使用 ${urls.length} 个 API`);
    const fetchPromises = urls.map(url => {
        return new Promise((resolve, reject) => {
            const ua = SETTINGS.user_agents[Math.floor(Math.random() * SETTINGS.user_agents.length)];
            
            $httpClient.get({ 
                url, 
                timeout: SETTINGS.timeout, 
                node: nodeName,
                headers: { "User-Agent": ua }
            }, (err, resp, data) => {
                if (err) {
                    // log(`[${type}] API 失败: ${url}, Err: ${err}`);
                    return reject(err);
                }
                if (resp.status !== 200) {
                    // log(`[${type}] API 状态码非200: ${url}, Status: ${resp.status}`);
                    return reject("Status " + resp.status);
                }
                try {
                    const ip = data.includes('{') ? JSON.parse(data).ip : data.trim();
                    if (isValidIP(ip)) {
                        log(`[${type}] API 成功: ${url}, IP: ${ip}`);
                        resolve(ip);
                    } else {
                        // log(`[${type}] IP 格式校验失败: ${url}, Data: ${data}`);
                        reject("Invalid IP");
                    }
                } catch (e) { 
                    reject(e); 
                }
            });
        });
    });

    return promiseAny(fetchPromises).catch((e) => {
        log(`[${type}] 所有 API 均失败: ${e}`);
        return null;
    });
}

/**
 * Hand-written Promise.any
 */
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

/**
 * Best Latency
 */
async function getBestLatency(urls, nodeName) {
    log("开始延迟测试...");
    const results = await Promise.allSettled(urls.map(url => {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            $httpClient.head({ url, timeout: SETTINGS.timeout, node: nodeName }, (err, resp) => {
                if (!err && (resp.status === 200 || resp.status === 204)) {
                    resolve(Date.now() - start);
                } else {
                    reject(err || "Status " + resp.status);
                }
            });
        });
    }));

    const successfulTests = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
    
    log(`延迟测试完成，成功数量: ${successfulTests.length}/${urls.length}`);
    if (successfulTests.length > 0) {
        const minConfig = Math.min(...successfulTests);
        log(`最优延迟: ${minConfig}ms`);
        return { success: true, ms: minConfig };
    } else {
        log("所有延迟测试均失败");
        return { success: false, ms: -1 };
    }
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
    } catch (e) {
        return '🌍';
    }
}

queryNodeIP();
