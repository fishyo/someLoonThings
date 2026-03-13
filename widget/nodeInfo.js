/**
 * Egern Node Info Widget
 * 显示当前网络的 IPv4/IPv6 以及归属地信息
 * 优化增强版：增加了对不同响应格式的兼容和超时处理
 */

export default async function(ctx) {
    const timeout = 10000; // 增加到 10 秒超时
    
    // 获取数据的异步函数
    const fetchData = async (url) => {
        try {
            const resp = await ctx.http.get({ url, timeout });
            // 兼容性解决：如果返回的是字符串，尝试解析；如果已经是对象，直接返回
            let data = resp.body;
            if (typeof data === 'string') {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    return data; // 返回原始文本以供解析
                }
            }
            return data;
        } catch (e) {
            return null;
        }
    };

    // 并行获取 IPv4 和 IPv6
    // IPv4 使用更稳定的 Cloudflare Trace，IPv6 使用 ipify
    const [ip4Data, ip6Data] = await Promise.all([
        fetchData("https://1.1.1.1/cdn-cgi/trace"),
        fetchData("https://api64.ipify.org?format=json")
    ]);

    // 解析 IPv4 (Cloudflare 格式为键值对文本)
    let ipv4 = "N/A";
    if (typeof ip4Data === 'string') {
        const match = ip4Data.match(/ip=(.*)\n/);
        ipv4 = match ? match[1] : "N/A";
    } else if (ip4Data?.ip) {
        ipv4 = ip4Data.ip;
    }

    const ipv6 = ip6Data?.ip || "N/A";
    
    // 查询详细地理位置 (使用 ip-api.com)
    let geoInfo = "Unknown Location";
    let ispInfo = "Unknown ISP";
    const primaryIp = ipv4 !== "N/A" ? ipv4 : (ipv6 !== "N/A" ? ipv6 : null);

    if (primaryIp) {
        const geoData = await fetchData(`http://ip-api.com/json/${primaryIp}?fields=status,country,city,isp`);
        if (geoData && geoData.status === "success") {
            geoInfo = `${geoData.city}, ${geoData.country}`;
            ispInfo = geoData.isp;
        }
    }

    // 返回布局 DSL
    return {
        type: 'widget',
        backgroundGradient: {
            type: 'linear',
            colors: ['#0f0c29', '#302b63', '#24243e'],
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 1, y: 1 }
        },
        padding: 12,
        children: [
            {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 6,
                children: [
                    { type: 'image', src: 'sf-symbol:network', color: '#00ccff', width: 16, height: 16 },
                    { type: 'text', text: 'Network Status', font: { size: 14, weight: 'bold' }, textColor: '#ffffff' }
                ]
            },
            { type: 'spacer' },
            {
                type: 'stack',
                direction: 'column',
                gap: 4,
                children: [
                    {
                        type: 'stack',
                        direction: 'row',
                        children: [
                            { type: 'text', text: 'IPv4: ', font: { size: 11 }, textColor: '#aaaaaa' },
                            { type: 'text', text: ipv4, font: { size: 11, weight: 'medium' }, textColor: '#00ff88' }
                        ]
                    },
                    {
                        type: 'stack',
                        direction: 'row',
                        children: [
                            { type: 'text', text: 'IPv6: ', font: { size: 11 }, textColor: '#aaaaaa' },
                            { type: 'text', text: ipv6 === "N/A" ? "Not Supported" : (ipv6.length > 20 ? ipv6.substring(0, 18) + '...' : ipv6), font: { size: 11, weight: 'medium' }, textColor: ipv6 === "N/A" ? '#ff4444' : '#00ff88' }
                        ]
                    },
                    { type: 'text', text: geoInfo, font: { size: 12 }, textColor: '#ffffff', lineLimit: 1 },
                    { type: 'text', text: ispInfo, font: { size: 10 }, textColor: '#cccccc', lineLimit: 1 }
                ]
            },
            { type: 'spacer' },
            {
                type: 'stack',
                direction: 'row',
                justifyContent: 'spaceBetween',
                children: [
                    { type: 'text', text: 'Egern Stats', font: { size: 9 }, textColor: '#888888' },
                    { type: 'date', date: new Date().toISOString(), format: 'relative', font: { size: 9 }, textColor: '#888888' }
                ]
            }
        ]
    };
}
