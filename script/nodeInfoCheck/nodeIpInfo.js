/**
 * Loon Generic Script - 节点IP信息查询 
 * 
 * 功能：
 * - IPv4/IPv6 双栈竞速查询
 * - 多点延迟测试
 * - 结果展示优化 (通知 + 弹窗)
 * - 随机 UA 防屏蔽
 * - 增强的错误处理和验证
 */

// ============ 配置常量 ============
const SETTINGS = {
    ipQueryTimeout: 5000,      // IP查询超时时间(毫秒)
    latencyTimeout: 3000,      // 延迟测试超时时间(毫秒)
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
    // TCP 建连速度测试目标（使用 204 No Content 端点，最快响应）
    latency_targets: [
        // Google 全球 CDN - 204 响应，无内容
        "http://www.gstatic.com/generate_204",
        // Cloudflare CDN - 204 响应
        "http://cp.cloudflare.com/generate_204",
        // Apple 连通性检测 - 快速响应
        "http://captive.apple.com"
    ],
    user_agents: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
};

// 延迟等级配置
const LATENCY_LEVELS = {
    EXCELLENT: { threshold: 80, emoji: "🟢", label: "🚀极速", score: 50 },
    GOOD: { threshold: 150, emoji: "🟡", label: "⚡高速", score: 40 },
    FAIR: { threshold: 300, emoji: "🟠", label: "🐢普通", score: 25 },
    POOR: { threshold: Infinity, emoji: "🔴", label: "🐌缓慢", score: 10 },
    TIMEOUT: { emoji: "❌", label: "❌超时", score: 0 }
};

// 评分配置
const SCORE_CONFIG = {
    IPV4: 30,
    IPV6: 20,
    GRADES: [
        { min: 90, grade: "SSS" },
        { min: 80, grade: "S+" },
        { min: 70, grade: "A" },
        { min: 50, grade: "B" },
        { min: 0, grade: "C" }
    ]
};

// 国家名称映射 (扩展版)
const COUNTRY_NAMES = {
    CN: "中国", HK: "香港", TW: "台湾", MO: "澳门",
    US: "美国", JP: "日本", SG: "新加坡", KR: "韩国",
    GB: "英国", DE: "德国", FR: "法国", CA: "加拿大",
    AU: "澳大利亚", NZ: "新西兰", RU: "俄罗斯", IN: "印度",
    TH: "泰国", MY: "马来西亚", PH: "菲律宾", ID: "印度尼西亚",
    VN: "越南", NL: "荷兰", IT: "意大利", ES: "西班牙",
    BR: "巴西", AR: "阿根廷", MX: "墨西哥", TR: "土耳其"
};

// ============ 主函数 ============
async function queryNodeIP() {
    const nodeName = $environment.params.node;
    
    if (!nodeName) {
        const msg = "请在节点列表中选择一个节点运行";
        showNotification("❌ 错误", "未选择节点", msg);
        return $done({ title: "❌ 错误", content: msg });
    }

    try {
        // 1. 并行执行：IPv4竞速、IPv6竞速、TCP建连速度测试
        const [ipv4Result, ipv6Result, latencyInfo] = await Promise.all([
            raceIPFetch(SETTINGS.ipv4_apis, nodeName, "IPv4"),
            raceIPFetch(SETTINGS.ipv6_apis, nodeName, "IPv6"),
            getTCPLatency(SETTINGS.latency_targets, nodeName)
        ]);

        const ipv4 = ipv4Result.success ? ipv4Result.ip : null;
        const ipv6 = ipv6Result.success ? ipv6Result.ip : null;

        if (!ipv4 && !ipv6) {
            const errorDetails = [
                ipv4Result.error ? `IPv4: ${ipv4Result.error}` : null,
                ipv6Result.error ? `IPv6: ${ipv6Result.error}` : null
            ].filter(Boolean).join("; ");
            
            throw new Error(`无法获取 IP 地址\n${errorDetails || "请检查节点状态"}`);
        }

        // 2. 提取地理位置与运营商信息
        const primaryIP = ipv4 || ipv6;
        const geo = $utils.geoip(primaryIP) || "未知";
        const asn = $utils.ipasn(primaryIP) || "";
        const aso = $utils.ipaso(primaryIP) || "";
        
        const ispInfo = formatISPInfo(aso, asn);

        // 3. 综合评分计算
        const quality = calculateQuality(ipv4, ipv6, latencyInfo);

        // 4. 构建精美输出
        const message = buildMessage(ipv4, ipv6, geo, ispInfo, latencyInfo, quality);

        // 5. 输出结果
        showNotification(nodeName, `${quality.grade} 级节点`, message);

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

// ============ IP 获取相关 ============
/**
 * API竞速 - 返回结果对象包含成功状态、IP和错误信息
 */
function raceIPFetch(urls, nodeName, type) {
    const fetchPromises = urls.map(url => {
        return new Promise((resolve, reject) => {
            const ua = getRandomUA();
            
            $httpClient.get({ 
                url, 
                timeout: SETTINGS.ipQueryTimeout, 
                node: nodeName,
                headers: { "User-Agent": ua }
            }, (err, resp, data) => {
                if (err) {
                    return reject({ type: 'network', message: err.message || String(err) });
                }
                
                if (resp.status !== 200) {
                    return reject({ type: 'http', message: `HTTP ${resp.status}` });
                }
                
                try {
                    const ip = data.includes('{') ? JSON.parse(data).ip : data.trim();
                    
                    if (!isValidIP(ip, type)) {
                        return reject({ type: 'validation', message: `Invalid ${type}` });
                    }
                    
                    resolve(ip);
                } catch (e) {
                    reject({ type: 'parse', message: e.message });
                }
            });
        });
    });

    return promiseAny(fetchPromises)
        .then(ip => ({ success: true, ip, error: null }))
        .catch(errors => {
            // 提取最有意义的错误信息
            const errorMsg = errors && errors.length > 0 
                ? (errors[0].message || "所有 API 请求失败")
                : "未知错误";
            return { success: false, ip: null, error: errorMsg };
        });
}

/**
 * Promise.any polyfill - 改进版,返回所有错误
 */
function promiseAny(promises) {
    return new Promise((resolve, reject) => {
        let errors = [];
        let count = promises.length;
        
        if (count === 0) {
            return reject([new Error("Empty promises")]);
        }

        promises.forEach((p, index) => {
            Promise.resolve(p).then(resolve, err => {
                errors[index] = err;
                count--;
                if (count === 0) {
                    reject(errors);
                }
            });
        });
    });
}

/**
 * TCP 建连速度测试 - 优化版
 * 使用 HEAD 请求到 204 端点,只测 TCP 握手 + HTTP 头,不下载内容
 * 返回详细的延迟统计信息
 */
async function getTCPLatency(targets, nodeName) {
    const results = await Promise.allSettled(targets.map(url => {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            // 使用 HEAD 请求,不下载响应体,只测建连速度
            $httpClient.head({ 
                url, 
                timeout: SETTINGS.latencyTimeout, 
                node: nodeName
            }, (err, resp) => {
                const latency = Date.now() - start;
                
                // 接受 200, 204 等正常响应
                if (!err && resp && (resp.status === 200 || resp.status === 204)) {
                    resolve(latency);
                } else {
                    reject(err || `HTTP ${resp?.status || 'unknown'}`);
                }
            });
        });
    }));

    const successfulTests = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
    
    if (successfulTests.length === 0) {
        return { 
            success: false, 
            ms: -1,
            min: -1,
            avg: -1,
            max: -1,
            successRate: 0,
            count: 0
        };
    }

    // 计算延迟统计
    const minLatency = Math.min(...successfulTests);
    const maxLatency = Math.max(...successfulTests);
    const avgLatency = Math.round(successfulTests.reduce((a, b) => a + b, 0) / successfulTests.length);
    const successRate = Math.round((successfulTests.length / targets.length) * 100);

    return { 
        success: true, 
        ms: minLatency,        // 主要显示最小延迟
        min: minLatency,
        avg: avgLatency,
        max: maxLatency,
        successRate,
        count: successfulTests.length,
        total: targets.length
    };
}

// ============ 验证与工具函数 ============
/**
 * IP 地址验证 - 增强版
 */
function isValidIP(ip, type) {
    if (!ip || typeof ip !== 'string') return false;
    
    const trimmedIP = ip.trim();
    
    if (type === "IPv4") {
        // IPv4 格式: xxx.xxx.xxx.xxx
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(trimmedIP)) return false;
        
        // 验证每个数字段在 0-255 之间
        const parts = trimmedIP.split('.');
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    } else if (type === "IPv6") {
        // IPv6 基本验证: 包含冒号且长度合理
        return trimmedIP.includes(':') && trimmedIP.length >= 3 && trimmedIP.length <= 45;
    } else {
        // 通用验证
        return (trimmedIP.includes('.') && trimmedIP.length > 6) || 
               (trimmedIP.includes(':') && trimmedIP.length > 2);
    }
}

/**
 * 获取随机 User-Agent
 */
function getRandomUA() {
    return SETTINGS.user_agents[Math.floor(Math.random() * SETTINGS.user_agents.length)];
}

/**
 * 获取延迟等级
 */
function getLatencyLevel(ms) {
    if (ms < 0) return LATENCY_LEVELS.TIMEOUT;
    if (ms < LATENCY_LEVELS.EXCELLENT.threshold) return LATENCY_LEVELS.EXCELLENT;
    if (ms < LATENCY_LEVELS.GOOD.threshold) return LATENCY_LEVELS.GOOD;
    if (ms < LATENCY_LEVELS.FAIR.threshold) return LATENCY_LEVELS.FAIR;
    return LATENCY_LEVELS.POOR;
}

/**
 * 计算节点质量评分
 */
function calculateQuality(v4, v6, latency) {
    let score = 0;
    let tags = [];

    // IPv4 评分
    if (v4) {
        score += SCORE_CONFIG.IPV4;
        tags.push("IPv4");
    } else {
        tags.push("NoIPv4");
    }
    
    // IPv6 评分
    if (v6) {
        score += SCORE_CONFIG.IPV6;
        tags.push("IPv6");
    }

    // 延迟评分
    const latencyLevel = getLatencyLevel(latency.ms);
    if (latency.success) {
        score += latencyLevel.score;
        tags.push(latencyLevel.label);
    } else {
        tags.push(LATENCY_LEVELS.TIMEOUT.label);
    }

    // 计算等级
    const grade = SCORE_CONFIG.GRADES.find(g => score >= g.min)?.grade || "C";
    
    return { score, grade, details: tags.join(" | ") };
}

/**
 * 格式化 ISP 信息
 */
function formatISPInfo(aso, asn) {
    if (aso && asn) {
        return `${aso} (${asn})`;
    } else if (aso) {
        return aso;
    } else if (asn) {
        return asn;
    }
    return "未知 ISP";
}

/**
 * 构建输出消息
 */
function buildMessage(ipv4, ipv6, geo, ispInfo, latencyInfo, quality) {
    const ipDisplay = [
        ipv4 || "❌",
        ipv4 && ipv6 ? "|" : "",
        ipv6 || ""
    ].filter(Boolean).join(" ");

    const latencyLevel = getLatencyLevel(latencyInfo.ms);
    
    // 构建延迟显示 - 包含详细统计
    let latencyDisplay;
    if (latencyInfo.ms > 0) {
        const detailParts = [];
        
        // 主延迟显示
        detailParts.push(`${latencyInfo.ms}ms ${latencyLevel.emoji}`);
        
        // 如果有平均和最大延迟,显示范围
        if (latencyInfo.avg && latencyInfo.max && 
            (latencyInfo.avg !== latencyInfo.ms || latencyInfo.max !== latencyInfo.ms)) {
            detailParts.push(`(平均${latencyInfo.avg}ms, 最大${latencyInfo.max}ms)`);
        }
        
        latencyDisplay = detailParts.join(" ");
    } else {
        latencyDisplay = `超时 ${LATENCY_LEVELS.TIMEOUT.emoji}`;
    }

    return [
        `📡 IP:  ${ipDisplay}`,
        `🌍 归属: ${getFlagEmoji(geo)} ${getCountryName(geo)}`,
        `🏢 运营商: ${ispInfo}`,
        `⚡ 建连: ${latencyDisplay}`,
        `⭐ 综合评分: ${quality.score} [${quality.grade}]`,
        `━━━━━━━━━━━━━━`,
        `${quality.details}`
    ].join('\n');
}

// ============ 显示相关 ============
/**
 * 发送通知
 */
function showNotification(title, subtitle, message) {
    $notification.post(title, subtitle, message);
}

/**
 * 获取国家名称
 */
function getCountryName(code) {
    return COUNTRY_NAMES[code] || code;
}

/**
 * 获取国旗 Emoji
 */
function getFlagEmoji(code) {
    if (!code || code === '未知') return '🌍';
    
    try {
        const upperCode = code.toUpperCase();
        // 验证是否为有效的两字母国家代码
        if (!/^[A-Z]{2}$/.test(upperCode)) return '🌍';
        
        return upperCode.replace(/./g, char => 
            String.fromCodePoint(char.charCodeAt(0) + 127397)
        );
    } catch (e) {
        return '🌍';
    }
}

// ============ 执行 ============
queryNodeIP();
