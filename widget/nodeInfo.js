/**
 * Egern 节点详细信息小组件
 * 功能：显示当前出口 IP 地址、物理地理位置、机房/运营商信息
 */

export default async function(ctx) {
    const timeout = 15000; // 15秒超时，确保在弱网下也有机会返回
    
    // 使用 ip.sb 的 GeoIP 服务，返回数据非常详尽
    const fetchNodeInfo = async () => {
        try {
            const resp = await ctx.http.get({
                url: "https://api.ip.sb/geoip",
                timeout: timeout,
                headers: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                }
            });
            // 兼容性处理不同的返回格式
            let body = resp.body;
            if (typeof body === 'string') {
                return JSON.parse(body);
            }
            return body;
        } catch (e) {
            console.log("Fetch Node Info Error: " + e);
            return null;
        }
    };

    const data = await fetchNodeInfo();

    // 如果获取失败的显示布局
    if (!data || !data.ip) {
        return {
            type: 'widget',
            padding: 16,
            background: '#1c1c1e',
            children: [
                { type: 'text', text: '⚠️ 获取节点信息失败', font: { size: 14, weight: 'bold' }, textColor: '#FF453A' },
                { type: 'spacer', length: 10 },
                { type: 'text', text: '请检查当前网络或代理设置是否通畅', font: { size: 12 }, textColor: '#8E8E93' }
            ]
        };
    }

    // 处理数据展示
    const ip = data.ip;
    const location = `${data.city || ''} ${data.region || ''} ${data.country || ''}`.trim();
    const ispDesc = data.organization || data.isp || "未知机房/运营商";

    // 渲染 UI (使用深蓝色渐变，符合 Egern 高端调性)
    return {
        type: 'widget',
        backgroundGradient: {
            type: 'linear',
            colors: ['#1e3c72', '#2a5298'],
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 1, y: 1 }
        },
        padding: 16,
        children: [
            {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 8,
                children: [
                    { type: 'image', src: 'sf-symbol:safari.fill', color: '#40E0D0', width: 20, height: 20 },
                    { type: 'text', text: '出口节点状态', font: { size: 16, weight: 'bold' }, textColor: '#ffffff' }
                ]
            },
            { type: 'spacer' },
            {
                type: 'stack',
                direction: 'column',
                gap: 8,
                children: [
                    // IP 地址行
                    {
                        type: 'stack',
                        direction: 'column',
                        gap: 2,
                        children: [
                            { type: 'text', text: '出口地址 (IP)', font: { size: 10 }, textColor: '#B0C4DE' },
                            { type: 'text', text: ip, font: { size: 14, weight: 'semibold' }, textColor: '#00F5FF' }
                        ]
                    },
                    // 物理位置行
                    {
                        type: 'stack',
                        direction: 'column',
                        gap: 2,
                        children: [
                            { type: 'text', text: '物理位置 (LOCATION)', font: { size: 10 }, textColor: '#B0C4DE' },
                            { type: 'text', text: location, font: { size: 13, weight: 'medium' }, textColor: '#FFFFFF' }
                        ]
                    },
                    // 机房运营商行
                    {
                        type: 'stack',
                        direction: 'column',
                        gap: 2,
                        children: [
                            { type: 'text', text: '机房/运营商 (ISP)', font: { size: 10 }, textColor: '#B0C4DE' },
                            { type: 'text', text: ispDesc, font: { size: 12 }, textColor: '#FFD700', lineLimit: 1 }
                        ]
                    }
                ]
            },
            { type: 'spacer' },
            {
                type: 'stack',
                direction: 'row',
                justifyContent: 'spaceBetween',
                children: [
                    { type: 'text', text: 'Egern Verified', font: { size: 9 }, textColor: '#FFFFFF', opacity: 0.5 },
                    { type: 'date', date: new Date().toISOString(), format: 'relative', font: { size: 9 }, textColor: '#FFFFFF', opacity: 0.5 }
                ]
            }
        ]
    };
}
