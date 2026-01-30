/**
 * Loon Generic Script - 节点IP信息查询
 * 
 * 功能：
 * - IPv4/IPv6 双栈竞速查询
 * - 地理位置与运营商信息
 * - 简洁清晰的结果展示
 */

// ============ 配置常量 ============
const SETTINGS = {
    timeout: 5000,
    // 使用最稳定快速的 IP 查询 API
    ipv4_api: "https://api.ipify.org?format=json",  // Cloudflare 支持，全球最快最稳定
    ipv6_api: "https://api64.ipify.org?format=json", // 同上，IPv6 版本
    // 备用 API（如果主 API 失败）
    fallback_apis: {
        ipv4: [
            "https://api.ip.sb/ip",
            "https://v4.ident.me",
            "https://ipv4.icanhazip.com"
        ],
        ipv6: [
            "https://v6.ident.me",
            "https://ipv6.icanhazip.com"
        ]
    },
    user_agents: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
};

// 国家名称映射
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
        // 并行查询 IPv4 和 IPv6
        const [ipv4Result, ipv6Result] = await Promise.all([
            fetchIP(SETTINGS.ipv4_api, SETTINGS.fallback_apis.ipv4, nodeName, "IPv4"),
            fetchIP(SETTINGS.ipv6_api, SETTINGS.fallback_apis.ipv6, nodeName, "IPv6")
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

        // 提取地理位置与运营商信息
        const primaryIP = ipv4 || ipv6;
        const geo = $utils.geoip(primaryIP) || "未知";
        const asn = $utils.ipasn(primaryIP) || "";
        const aso = $utils.ipaso(primaryIP) || "";
        
        const ispInfo = formatISPInfo(aso, asn);

        // 构建输出
        const message = buildMessage(ipv4, ipv6, geo, ispInfo);

        // 输出结果
        const title = `${getFlagEmoji(geo)} ${nodeName}`;
        showNotification(title, getCountryName(geo), message);

        $done({
            title: title,
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
 * 获取 IP 地址 - 主 API + 备用 API 策略
 */
async function fetchIP(primaryAPI, fallbackAPIs, nodeName, type) {
    // 先尝试主 API
    const primaryResult = await fetchSingleIP(primaryAPI, nodeName, type);
    if (primaryResult.success) {
        return primaryResult;
    }

    // 主 API 失败，尝试备用 API 竞速
    const fallbackPromises = fallbackAPIs.map(url => fetchSingleIP(url, nodeName, type));
    
    try {
        const ip = await promiseAny(fallbackPromises);
        return { success: true, ip, error: null };
    } catch (errors) {
        const errorMsg = primaryResult.error || "所有 API 请求失败";
        return { success: false, ip: null, error: errorMsg };
    }
}

/**
 * 从单个 API 获取 IP
 */
function fetchSingleIP(url, nodeName, type) {
    return new Promise((resolve, reject) => {
        const ua = getRandomUA();
        
        $httpClient.get({ 
            url, 
            timeout: SETTINGS.timeout, 
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
                
                resolve({ success: true, ip, error: null });
            } catch (e) {
                reject({ type: 'parse', message: e.message });
            }
        });
    });
}

/**
 * Promise.any polyfill
 */
function promiseAny(promises) {
    return new Promise((resolve, reject) => {
        let errors = [];
        let count = promises.length;
        
        if (count === 0) {
            return reject([new Error("Empty promises")]);
        }

        promises.forEach((p, index) => {
            Promise.resolve(p).then(result => {
                if (result.success) {
                    resolve(result.ip);
                } else {
                    errors[index] = result.error;
                    count--;
                    if (count === 0) {
                        reject(errors);
                    }
                }
            }, err => {
                errors[index] = err;
                count--;
                if (count === 0) {
                    reject(errors);
                }
            });
        });
    });
}

// ============ 验证与工具函数 ============
/**
 * IP 地址验证
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
function buildMessage(ipv4, ipv6, geo, ispInfo) {
    const parts = [];
    
    // IP 信息
    if (ipv4 && ipv6) {
        parts.push(`📡 IPv4: ${ipv4}`);
        parts.push(`📡 IPv6: ${ipv6}`);
    } else if (ipv4) {
        parts.push(`📡 IP: ${ipv4}`);
        parts.push(`⚠️ 不支持 IPv6`);
    } else if (ipv6) {
        parts.push(`📡 IP: ${ipv6}`);
        parts.push(`⚠️ 不支持 IPv4`);
    }
    
    // 地理位置
    parts.push(`🌍 归属: ${getFlagEmoji(geo)} ${getCountryName(geo)}`);
    
    // 运营商
    parts.push(`🏢 运营商: ${ispInfo}`);
    
    return parts.join('\n');
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
