/*
 * Loon Generic Script - 节点IP信息查询（现代化增强版）
 *
 * 功能说明：
 * - IPv4/IPv6 双栈检测（竞速机制）
 * - 地理位置、ASN、运营商信息查询
 * - 多点延迟测试（取最优结果）
 * - 网络质量综合评分
 *
 * 特性：
 * - 竞速查询：多个 API 并行请求，谁快用谁
 * - 多点测速：避免单一服务器波动
 * - 现代化代码：async/await 风格，无递归
 * - 健壮性：完善的错误处理和空值检查
 *
 * 使用方法：
 * generic script-path=nodeIpInfo.js, tag=节点IP查询, timeout=15, img-url=network.badge.shield.half.filled.system
 */

// ==================== 配置区 ====================

// IPv4 查询 API（竞速）
const IPV4_APIS = [
  "https://api.ipify.org?format=json",
  "https://api.ip.sb/ip",
  "https://ipv4.icanhazip.com",
  "https://v4.ident.me",
];

// IPv6 查询 API（竞速）
const IPV6_APIS = [
  "https://api64.ipify.org?format=json",
  "https://api6.ipify.org?format=json",
  "https://ipv6.icanhazip.com",
  "https://v6.ident.me",
];

// 延迟测试 URL（多点测试）
const LATENCY_TEST_URLS = [
  "http://www.gstatic.com/generate_204",
  "http://captive.apple.com/hotspot-detect.html",
  "http://connectivitycheck.platform.hicloud.com/generate_204",
];

// 超时设置
const TIMEOUT = {
  IP_QUERY: 5000,    // IP 查询超时（毫秒）
  LATENCY_TEST: 5000 // 延迟测试超时（毫秒）
};

// ==================== 主函数 ====================

async function main() {
  try {
    const nodeName = $environment?.params?.node;
    
    if (!nodeName) {
      showNotification("错误", "未选择节点", "请选择一个节点后运行此脚本");
      $done({});
      return;
    }

    console.log(`[开始] 查询节点: ${nodeName}`);

    // 并行执行所有查询（竞速 + 多点测试）
    const [ipv4, ipv6, latency] = await Promise.all([
      raceIPQuery(nodeName, IPV4_APIS, "IPv4"),
      raceIPQuery(nodeName, IPV6_APIS, "IPv6"),
      raceLatencyTest(nodeName),
    ]);

    console.log(`[结果] IPv4: ${ipv4 || "不支持"}`);
    console.log(`[结果] IPv6: ${ipv6 || "不支持"}`);
    console.log(`[结果] 延迟: ${latency.success ? latency.latency + "ms" : "失败"}`);

    // 验证至少有一个 IP
    if (!ipv4 && !ipv6) {
      showNotification("查询失败", nodeName, "无法获取节点 IP 地址\n请检查节点是否正常");
      $done({});
      return;
    }

    // 获取地理位置和网络信息
    const primaryIP = ipv4 || ipv6;
    const geoInfo = safeGetGeoInfo(primaryIP);

    // 计算质量评分
    const quality = calculateQuality({
      hasIPv4: !!ipv4,
      hasIPv6: !!ipv6,
      latency: latency.latency,
      latencySuccess: latency.success,
    });

    // 构建并显示结果
    const message = buildMessage({
      ipv4,
      ipv6,
      geo: geoInfo,
      latency,
      quality,
    });

    showNotification("节点信息", nodeName, message);
    console.log(`[完成] 查询成功\n${message}`);

  } catch (error) {
    console.log(`[错误] ${error}`);
    showNotification("查询出错", "系统错误", String(error));
  }

  $done({});
}

// ==================== IP 查询（竞速机制）====================

/**
 * 竞速查询 IP 地址
 * 所有 API 并行请求，谁先返回有效结果用谁
 */
async function raceIPQuery(nodeName, apis, ipVersion) {
  console.log(`[竞速] 开始 ${ipVersion} 查询，共 ${apis.length} 个 API`);

  const promises = apis.map((url, index) => 
    queryIP(nodeName, url, ipVersion, index)
  );

  try {
    // Promise.race：谁先完成用谁
    const result = await Promise.race(promises);
    console.log(`[竞速] ${ipVersion} 查询成功: ${result}`);
    return result;
  } catch (error) {
    console.log(`[竞速] ${ipVersion} 所有 API 均失败`);
    return null;
  }
}

/**
 * 单个 IP 查询请求
 */
function queryIP(nodeName, url, ipVersion, index) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    $httpClient.get(
      {
        url,
        timeout: TIMEOUT.IP_QUERY,
        node: nodeName,
      },
      (error, response, data) => {
        const elapsed = Date.now() - startTime;

        if (error) {
          console.log(`[API${index}] ${ipVersion} 失败 (${elapsed}ms): ${error}`);
          reject(error);
          return;
        }

        if (response.status !== 200) {
          console.log(`[API${index}] ${ipVersion} 状态码 ${response.status}`);
          reject(new Error(`HTTP ${response.status}`));
          return;
        }

        // 解析 IP
        let ip = null;
        try {
          const json = JSON.parse(data);
          ip = json.ip;
        } catch {
          ip = data?.trim();
        }

        if (ip && isValidIP(ip)) {
          console.log(`[API${index}] ${ipVersion} 成功 (${elapsed}ms): ${ip}`);
          resolve(ip);
        } else {
          console.log(`[API${index}] ${ipVersion} 无效 IP: ${ip}`);
          reject(new Error("Invalid IP"));
        }
      }
    );
  });
}

// ==================== 延迟测试（多点竞速）====================

/**
 * 多点延迟测试
 * 测试多个服务器，取最快的响应
 */
async function raceLatencyTest(nodeName) {
  console.log(`[延迟] 开始多点测试，共 ${LATENCY_TEST_URLS.length} 个测试点`);

  const promises = LATENCY_TEST_URLS.map((url, index) =>
    testSingleLatency(nodeName, url, index)
  );

  try {
    // 取最快的成功响应
    const result = await Promise.race(promises);
    console.log(`[延迟] 测试成功: ${result.latency}ms`);
    return result;
  } catch (error) {
    console.log(`[延迟] 所有测试点均失败`);
    return { success: false, latency: -1 };
  }
}

/**
 * 单点延迟测试
 */
function testSingleLatency(nodeName, url, index) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    $httpClient.head(
      {
        url,
        timeout: TIMEOUT.LATENCY_TEST,
        node: nodeName,
      },
      (error, response) => {
        const latency = Date.now() - startTime;

        if (error) {
          console.log(`[测试点${index}] 失败 (${latency}ms): ${error}`);
          reject(error);
          return;
        }

        console.log(`[测试点${index}] 成功 (${latency}ms)`);
        resolve({ success: true, latency });
      }
    );
  });
}

// ==================== 地理信息查询（健壮性）====================

/**
 * 安全获取地理信息
 * 增加空值检查，避免 $utils 返回 undefined
 */
function safeGetGeoInfo(ip) {
  try {
    const geo = $utils?.geoip?.(ip);
    const asn = $utils?.ipasn?.(ip);
    const aso = $utils?.ipaso?.(ip);

    return {
      country: geo || null,
      countryName: geo ? getCountryName(geo) : null,
      asn: asn || null,
      aso: aso || null,
    };
  } catch (error) {
    console.log(`[地理] 查询失败: ${error}`);
    return {
      country: null,
      countryName: null,
      asn: null,
      aso: null,
    };
  }
}

// ==================== 质量评分 ====================

/**
 * 计算网络质量评分（满分 100）
 */
function calculateQuality(params) {
  const { hasIPv4, hasIPv6, latency, latencySuccess } = params;

  let score = 0;
  const details = [];

  // IPv4 支持（30分）
  if (hasIPv4) {
    score += 30;
    details.push("✓ IPv4");
  } else {
    details.push("✗ IPv4");
  }

  // IPv6 支持（20分）
  if (hasIPv6) {
    score += 20;
    details.push("✓ IPv6");
  } else {
    details.push("✗ IPv6");
  }

  // 延迟评分（50分）
  if (latencySuccess && latency >= 0) {
    if (latency < 50) {
      score += 50;
      details.push("✓ 延迟优秀");
    } else if (latency < 100) {
      score += 40;
      details.push("✓ 延迟良好");
    } else if (latency < 200) {
      score += 30;
      details.push("⚠ 延迟一般");
    } else if (latency < 500) {
      score += 20;
      details.push("⚠ 延迟较慢");
    } else {
      score += 10;
      details.push("✗ 延迟很慢");
    }
  } else {
    details.push("✗ 延迟测试失败");
  }

  // 计算等级
  let grade = "F";
  if (score >= 90) grade = "S";
  else if (score >= 80) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 50) grade = "D";

  return { score, grade, details };
}

// ==================== 消息构建（视觉优化）====================

/**
 * 构建通知消息
 * 优化排版，适配手机通知中心
 */
function buildMessage(data) {
  const { ipv4, ipv6, geo, latency, quality } = data;
  const lines = [];

  // IP 地址（紧凑显示）
  lines.push("📡 IP 地址");
  if (ipv4) lines.push(`  IPv4: ${ipv4}`);
  if (ipv6) lines.push(`  IPv6: ${ipv6}`);

  // 地理位置
  if (geo.countryName || geo.country) {
    lines.push("");
    lines.push("🌍 地理位置");
    const location = geo.countryName 
      ? `  ${geo.countryName} (${geo.country})`
      : `  ${geo.country}`;
    lines.push(location);
  }

  // 网络信息
  if (geo.asn || geo.aso) {
    lines.push("");
    lines.push("🏢 网络信息");
    if (geo.asn) lines.push(`  ASN: ${geo.asn}`);
    if (geo.aso) lines.push(`  运营商: ${geo.aso}`);
  }

  // 性能测试
  lines.push("");
  lines.push("⚡ 性能测试");
  if (latency.success) {
    const emoji = getLatencyEmoji(latency.latency);
    lines.push(`  延迟: ${latency.latency}ms ${emoji}`);
  } else {
    lines.push(`  延迟: 测试失败`);
  }

  // 质量评分
  lines.push("");
  lines.push("⭐ 质量评分");
  lines.push(`  ${quality.score}/100 (${quality.grade}级)`);
  lines.push(`  ${quality.details.join(" | ")}`);

  return lines.join("\n");
}

// ==================== 工具函数 ====================

/**
 * 验证 IP 地址格式
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== "string") return false;

  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * 获取延迟等级 emoji
 */
function getLatencyEmoji(latency) {
  if (latency < 50) return "🟢";
  if (latency < 100) return "🟡";
  if (latency < 200) return "🟠";
  return "🔴";
}

/**
 * 显示通知
 */
function showNotification(title, subtitle, message) {
  $notification.post(title, subtitle, message);
}

/**
 * 国家代码转中文名称
 */
function getCountryName(code) {
  const countryMap = {
    CN: "中国", HK: "香港", TW: "台湾", MO: "澳门",
    US: "美国", JP: "日本", KR: "韩国", SG: "新加坡",
    GB: "英国", DE: "德国", FR: "法国", CA: "加拿大",
    AU: "澳大利亚", RU: "俄罗斯", IN: "印度", BR: "巴西",
    NL: "荷兰", IT: "意大利", ES: "西班牙", SE: "瑞典",
    CH: "瑞士", NO: "挪威", FI: "芬兰", DK: "丹麦",
    PL: "波兰", TR: "土耳其", ID: "印度尼西亚", TH: "泰国",
    MY: "马来西亚", VN: "越南", PH: "菲律宾", NZ: "新西兰",
    AR: "阿根廷", MX: "墨西哥", ZA: "南非", AE: "阿联酋",
    SA: "沙特阿拉伯", IL: "以色列", UA: "乌克兰", IE: "爱尔兰",
    AT: "奥地利", BE: "比利时", PT: "葡萄牙", GR: "希腊",
    CZ: "捷克", RO: "罗马尼亚", HU: "匈牙利", BG: "保加利亚",
  };

  return countryMap[code] || code;
}

// ==================== 执行入口 ====================

main();
