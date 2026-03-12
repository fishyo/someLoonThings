/*
 * Generic AI Service Check for Loon
 * Checks capability for: ChatGPT, Claude, Gemini, Copilot
 * Author: Antigravity
 */

const $ = new Float();
const timeout = $.getdata('aiCheck.timeout') * 1 || 5000;

function Float() {
    this.getdata = (key) => $persistentStore.read(key);
}

async function checkOpenAI() {
    return new Promise((resolve) => {
        const options = {
            url: "https://chatgpt.com/",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            },
            timeout: timeout
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                resolve({ name: "ChatGPT", status: "❌ Error", color: "#FF3B30" });
            } else if (response.status === 403) {
                resolve({ name: "ChatGPT", status: "🚫 Blocked", color: "#FF9500" });
            } else if (response.status === 200) {
                resolve({ name: "ChatGPT", status: "✅ Available", color: "#34C759" });
            } else {
                resolve({ name: "ChatGPT", status: `⚠️ ${response.status}`, color: "#FFCC00" });
            }
        });
    });
}

async function checkClaude() {
    return new Promise((resolve) => {
        const options = {
            url: "https://claude.ai/login",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            },
            timeout: timeout
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                resolve({ name: "Claude", status: "❌ Error", color: "#FF3B30" });
            } else if (data && data.includes("not yet available")) {
                resolve({ name: "Claude", status: "🚫 Region Block", color: "#FF9500" });
            } else if (response.status === 200) {
                resolve({ name: "Claude", status: "✅ Available", color: "#34C759" });
            } else {
                resolve({ name: "Claude", status: `⚠️ ${response.status}`, color: "#FFCC00" });
            }
        });
    });
}

async function checkGemini() {
    return new Promise((resolve) => {
        const options = {
            url: "https://gemini.google.com/app",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            },
            timeout: timeout
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                resolve({ name: "Gemini", status: "❌ Error", color: "#FF3B30" });
            } else if (data && (data.includes("isn't available") || data.includes("unsupported_country_blocked"))) {
                resolve({ name: "Gemini", status: "🚫 Region Block", color: "#FF9500" });
            } else if (response.status === 200) {
                resolve({ name: "Gemini", status: "✅ Available", color: "#34C759" });
            } else {
                resolve({ name: "Gemini", status: "🚫 Unavailable", color: "#FF9500" });
            }
        });
    });
}

async function checkCopilot() {
    return new Promise((resolve) => {
        const options = {
            url: "https://copilot.microsoft.com/",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            },
            timeout: timeout
        };
        $httpClient.get(options, (error, response, data) => {
            if (error) {
                resolve({ name: "Copilot", status: "❌ Error", color: "#FF3B30" });
            } else if (response.status === 200) {
                resolve({ name: "Copilot", status: "✅ Available", color: "#34C759" });
            } else {
                resolve({ name: "Copilot", status: "🚫 Unavailable", color: "#FF9500" });
            }
        });
    });
}

async function getIPInfo() {
    return new Promise((resolve) => {
        $httpClient.get({ url: "https://chatgpt.com/cdn-cgi/trace", timeout: timeout }, (error, response, data) => {
            if (!error && data) {
                const lines = data.split('\n');
                let loc = "Unknown";
                let ip = "Unknown";
                lines.forEach(line => {
                    if (line.startsWith('loc=')) loc = line.split('=')[1];
                    if (line.startsWith('ip=')) ip = line.split('=')[1];
                });
                resolve({ loc, ip });
            } else {
                resolve({ loc: "N/A", ip: "N/A" });
            }
        });
    });
}

async function main() {
    const [ipInfo, openai, claude, gemini, copilot] = await Promise.all([
        getIPInfo(),
        checkOpenAI(),
        checkClaude(),
        checkGemini(),
        checkCopilot()
    ]);

    const title = `AI 服务连通性检测`;
    const subtitle = `节点地区: ${ipInfo.loc} (${ipInfo.ip})`;
    const content = [
        `🤖 ${openai.name}: ${openai.status}`,
        `🎭 ${claude.name}: ${claude.status}`,
        `✨ ${gemini.name}: ${gemini.status}`,
        `💻 ${copilot.name}: ${copilot.status}`
    ].join('\n');

    // 使用 Loon 标准通知输出结果
    $notification.post(title, subtitle, content);
    
    $done();
}

main();
