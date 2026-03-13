/**
 * Egern Node Info Widget
 * 显示当前网络的 IPv4/IPv6 以及归属地信息
 */

export default async function(ctx) {
    const timeout = 5000;
    
    // 获取数据的异步函数
    const fetchData = async (url) => {
        try {
            const resp = await ctx.http.get({ url, timeout });
            return await resp.json();
        } catch (e) {
            return null;
        }
    };

    // 并行获取 IPv4 和 IPv6
    const [ip4Data, ip6Data] = await Promise.all([
        fetchData("https://api.ipify.org?format=json"),
        fetchData("https://api64.ipify.org?format=json")
    ]);

    const ipv4 = ip4Data?.ip || "N/A";
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
