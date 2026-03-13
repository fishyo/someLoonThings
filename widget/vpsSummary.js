/**
 * Egern VPS 流量监控小组件
 * 功能：合并展示搬瓦工 (Bandwagon) 和 RackNerd 的流量使用进度
 * 适配：支持优先从 ctx.env 读取，若无则从 BoxJS ($persistentStore) 读取配置
 */

export default async function(ctx) {
    const timeout = 10000;

    // 统一配置获取函数
    const readStore = (key) => {
        if (typeof $persistentStore !== "undefined") {
            return $persistentStore.read(key);
        }
        return null;
    };

    // --- 1. 获取搬瓦工数据 ---
    const getBWGData = async () => {
        const apiKey = ctx.env.BWG_API_KEY || readStore("bandwagon.apiKey");
        const veid = ctx.env.BWG_VEID || readStore("bandwagon.veid");
        if (!apiKey || !veid) return { name: "Bandwagon", error: "Missing Config" };

        try {
            const url = `https://api.64clouds.com/v1/getServiceInfo?veid=${veid.trim()}&api_key=${apiKey.trim()}`;
            const resp = await ctx.http.get({ url, timeout });
            const data = (typeof resp.body === 'string') ? JSON.parse(resp.body) : resp.body;
            
            if (data.error) return { name: "Bandwagon", error: data.error };
            
            const used = data.data_counter || 0;
            const total = data.plan_monthly_data || 1;
            return {
                name: "Bandwagon",
                percent: Math.min((used / total) * 100, 100).toFixed(1),
                usedGB: (used / (1024 ** 3)).toFixed(1),
                totalGB: (total / (1024 ** 3)).toFixed(1)
            };
        } catch (e) {
            return { name: "Bandwagon", error: "Fetch Failed" };
        }
    };

    // --- 2. 获取 RackNerd 数据 ---
    const getRNData = async () => {
        const apiKey = ctx.env.RACKNERD_API_KEY || readStore("racknerd.apiKey");
        const apiHash = ctx.env.RACKNERD_API_HASH || readStore("racknerd.apiHash");
        if (!apiKey || !apiHash) return { name: "RackNerd", error: "Missing Config" };

        try {
            const url = `https://nerdvm.racknerd.com/api/client/command.php?action=info&key=${apiKey.trim()}&hash=${apiHash.trim()}&bw=true`;
            const resp = await ctx.http.get({ url, timeout });
            const xml = resp.body;
            
            const parse = (tag) => {
                const reg = new RegExp(`<${tag}>(.*?)<\/${tag}>`);
                const match = xml.match(reg);
                return match ? match[1] : null;
            };

            const status = parse("status");
            if (status === "error") return { name: "RackNerd", error: parse("statusmsg") };

            const bwStr = parse("bw");
            if (!bwStr) return { name: "RackNerd", error: "No Data" };
            
            const parts = bwStr.split(",");
            const total = parseFloat(parts[0]) || 0;
            const used = parseFloat(parts[1]) || 0;
            const percent = parts[3] || ((used / total) * 100).toFixed(1);

            return {
                name: "RackNerd",
                percent: parseFloat(percent).toFixed(1),
                usedGB: (used / (1024 ** 3)).toFixed(1),
                totalGB: (total / (1024 ** 3)).toFixed(1)
            };
        } catch (e) {
            return { name: "RackNerd", error: "Fetch Failed" };
        }
    };

    // 并行请求
    const [bwg, rn] = await Promise.all([getBWGData(), getRNData()]);

    // 进度条渲染组件
    const ProgressBar = (item) => {
        if (item.error) {
            return {
                type: 'stack',
                direction: 'column',
                gap: 2,
                children: [
                    { type: 'text', text: item.name, font: { size: 12, weight: 'bold' }, textColor: '#ffffff' },
                    { type: 'text', text: `${item.error}`, font: { size: 10 }, textColor: '#ff4444' }
                ]
            };
        }

        const p = parseFloat(item.percent);
        let barColor = '#34C759';
        if (p > 70) barColor = '#FF9500';
        if (p > 90) barColor = '#FF3B30';

        return {
            type: 'stack',
            direction: 'column',
            gap: 4,
            children: [
                {
                    type: 'stack',
                    direction: 'row',
                    justifyContent: 'spaceBetween',
                    children: [
                        { type: 'text', text: item.name, font: { size: 12, weight: 'bold' }, textColor: '#ffffff' },
                        { type: 'text', text: `${item.usedGB} / ${item.totalGB} GB`, font: { size: 10 }, textColor: '#888888' }
                    ]
                },
                {
                    type: 'stack',
                    direction: 'row',
                    alignItems: 'center',
                    gap: 8,
                    children: [
                        {
                            type: 'stack',
                            direction: 'row',
                            width: '100%',
                            flex: 1,
                            height: 6,
                            background: '#333333',
                            cornerRadius: 3,
                            children: [
                                {
                                    type: 'stack',
                                    width: `${item.percent}%`,
                                    height: 6,
                                    background: barColor,
                                    cornerRadius: 3
                                }
                            ]
                        },
                        { type: 'text', text: `${item.percent}%`, font: { size: 10, weight: 'medium' }, textColor: barColor, width: 35 }
                    ]
                }
            ]
        };
    };

    return {
        type: 'widget',
        backgroundGradient: {
            type: 'linear',
            colors: ['#1c1c1e', '#2c2c2e'],
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 0, y: 1 }
        },
        padding: 12,
        children: [
            {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 6,
                children: [
                    { type: 'image', src: 'sf-symbol:server.rack.fill', color: '#0A84FF', width: 14, height: 14 },
                    { type: 'text', text: 'VPS Bandwidth', font: { size: 13, weight: 'bold' }, textColor: '#ffffff' }
                ]
            },
            { type: 'spacer' },
            ProgressBar(bwg),
            { type: 'spacer', length: 12 },
            ProgressBar(rn),
            { type: 'spacer' },
            {
                type: 'stack',
                direction: 'row',
                justifyContent: 'spaceBetween',
                children: [
                    { type: 'text', text: 'Auto Refreshed', font: { size: 8 }, textColor: '#555555' },
                    { type: 'date', date: new Date().toISOString(), format: 'relative', font: { size: 8 }, textColor: '#555555' }
                ]
            }
        ]
    };
}
