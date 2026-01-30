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
        console.log("[节点IP查询] 错误: " + msg);
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
        let geo = $utils.geoip(primaryIP) || "未知";
        let asn = $utils.ipasn(primaryIP) || "";
        let aso = $utils.ipaso(primaryIP) || "";
        
        console.log(`[节点IP查询] 本地查询结果 - 国家: ${geo}, ISP: ${aso || '无'}, ASN: ${asn || '无'}`);
        
        // 如果本地查询不到 ISP 信息，尝试在线查询
        if (!aso && !asn) {
            console.log("[节点IP查询] 本地ISP信息未知，尝试在线查询...");
            const onlineInfo = await fetchIPInfo(primaryIP, nodeName);
            if (onlineInfo) {
                geo = onlineInfo.countryCode || geo;
                aso = onlineInfo.isp || "";
                asn = onlineInfo.as || "";
                console.log(`[节点IP查询] 在线查询结果 - 国家: ${geo}, ISP: ${aso}, ASN: ${asn}`);
            }
        }
        
        const ispInfo = formatISPInfo(aso, asn);

        // 构建输出
        const message = buildMessage(ipv4, ipv6, geo, ispInfo);
        const title = `${getFlagEmoji(geo)} ${nodeName}`;

        // 打印到控制台
        console.log("[节点IP查询] " + title);
        console.log(message);

        // 弹窗显示
        $done({
            title: title,
            content: message
        });

    } catch (error) {
        const errMsg = error.message || String(error);
        console.log("[节点IP查询] 查询失败: " + errMsg);
        $done({
            title: "❌ 查询失败",
            content: errMsg
        });
    }
}

/**
 * 在线查询 IP 详细信息
 * 使用 ip-api.com 免费 API
 */
async function fetchIPInfo(ip, nodeName) {
    return new Promise((resolve) => {
        const url = `http://ip-api.com/json/${ip}?fields=status,countryCode,isp,as`;
        
        $httpClient.get({
            url,
            timeout: 3000,
            node: nodeName
        }, (err, resp, data) => {
            if (err || !resp || resp.status !== 200) {
                console.log("[节点IP查询] 在线查询失败: " + (err || `HTTP ${resp?.status}`));
                return resolve(null);
            }
            
            try {
                const info = JSON.parse(data);
                if (info.status === 'success') {
                    console.log("[节点IP查询] 在线查询成功");
                    return resolve(info);
                }
                resolve(null);
            } catch (e) {
                console.log("[节点IP查询] 解析在线查询结果失败: " + e.message);
                resolve(null);
            }
        });
    });
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

    // 主 API 失败或不支持，尝试备用 API 竞速
    const fallbackPromises = fallbackAPIs.map(url => fetchSingleIP(url, nodeName, type));
    
    try {
        const ip = await promiseAny(fallbackPromises);
        return { success: true, ip, error: null };
    } catch (errors) {
        // 所有 API 都失败，返回不支持
        const errorMsg = primaryResult.error || `不支持 ${type}`;
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
                
                // 如果 IP 无效，可能是节点不支持该协议（如 IPv6）
                // 返回 success: false 而不是 reject
                if (!ip || !isValidIP(ip, type)) {
                    return resolve({ success: false, ip: null, error: `不支持 ${type}` });
                }
                
                resolve({ success: true, ip, error: null });
            } catch (e) {
                // 解析错误也当作不支持
                resolve({ success: false, ip: null, error: e.message });
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
    // 清理空白字符
    const cleanAso = aso ? aso.trim() : "";
    const cleanAsn = asn ? asn.trim() : "";
    
    if (cleanAso && cleanAsn) {
        return `${cleanAso} (${cleanAsn})`;
    } else if (cleanAso) {
        return cleanAso;
    } else if (cleanAsn) {
        return cleanAsn;
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
