/*
 * Loon Generic Script - 节点IP信息查询
 *
 * 功能说明：
 * - 查询节点的 IPv4 和 IPv6 地址（双栈检测）
 * - 获取IP的地理位置信息（国家/地区）
 * - 获取IP的ASN（自治系统编号）和运营商信息
 * - 测试节点延迟和网络质量
 * - 综合评分（延迟、协议支持等）
 *
 * 使用方法：
 * 在Loon配置文件的[Script]部分添加：
 * generic script-path=nodeIpInfo.js, tag=节点IP查询, timeout=15, img-url=network.badge.shield.half.filled.system
 *
 * 然后在Loon应用中选择任意节点，点击运行此脚本即可查询该节点的详细信息
 */

// IPv4 查询API列表
const IPV4_APIS = [
  "https://api.ipify.org?format=json",
  "https://api.ip.sb/ip",
  "https://ipv4.icanhazip.com",
  "https://v4.ident.me",
];

// IPv6 查询API列表
const IPV6_APIS = [
  "https://api64.ipify.org?format=json",
  "https://api6.ipify.org?format=json",
  "https://ipv6.icanhazip.com",
  "https://v6.ident.me",
];

// 延迟测试URL列表
const LATENCY_TEST_URLS = [
  "http://www.gstatic.com/generate_204",
  "http://captive.apple.com/hotspot-detect.html",
  "http://connectivitycheck.platform.hicloud.com/generate_204",
];

// 主函数
async function queryNodeIP() {
  try {
    // 获取节点信息
    const nodeInfo = $environment.params.nodeInfo;
    const nodeName = $environment.params.node;

    console.log(`开始查询节点: ${nodeName}`);

    if (!nodeName) {
      showNotification(
        "错误",
        "未选择节点",
        "请在节点列表中选择一个节点后运行此脚本",
      );
      $done({});
      return;
    }

    // 并行查询 IPv4、IPv6 和延迟
    const [ipv4Result, ipv6Result, latencyResult] = await Promise.all([
      getNodeIP(nodeName, "ipv4"),
      getNodeIP(nodeName, "ipv6"),
      testLatency(nodeName),
    ]);

    console.log(`IPv4: ${ipv4Result || "不支持"}`);
    console.log(`IPv6: ${ipv6Result || "不支持"}`);
    console.log(`延迟: ${latencyResult.latency}ms`);

    // 检查是否至少有一个IP地址
    if (!ipv4Result && !ipv6Result) {
      showNotification(
        "查询失败",
        nodeName,
        "无法获取节点IP地址，请检查节点是否正常",
      );
      $done({});
      return;
    }

    // 获取地理位置和ASN信息（优先使用IPv4）
    const primaryIP = ipv4Result || ipv6Result;
    const geoInfo = $utils.geoip(primaryIP);
    const asnInfo = $utils.ipasn(primaryIP);
    const asoInfo = $utils.ipaso(primaryIP);

    // 计算网络质量评分
    const qualityScore = calculateQualityScore({
      hasIPv4: !!ipv4Result,
      hasIPv6: !!ipv6Result,
      latency: latencyResult.latency,
      latencySuccess: latencyResult.success,
    });

    // 构建结果信息
    let resultMessage = buildResultMessage({
      ipv4: ipv4Result,
      ipv6: ipv6Result,
      geo: geoInfo,
      asn: asnInfo,
      aso: asoInfo,
      latency: latencyResult,
      quality: qualityScore,
    });

    // 显示结果
    showNotification("节点信息", nodeName, resultMessage);

    console.log("查询完成");
    console.log(resultMessage);
  } catch (error) {
    console.log(`查询出错: ${error}`);
    showNotification("查询出错", "错误", String(error));
  }

  $done({});
}

// 获取节点的IP地址（支持IPv4/IPv6）
function getNodeIP(nodeName, ipVersion = "ipv4") {
  return new Promise((resolve) => {
    const apis = ipVersion === "ipv6" ? IPV6_APIS : IPV4_APIS;
    tryIPAPI(nodeName, apis, 0, resolve);
  });
}

// 尝试IP查询API
function tryIPAPI(nodeName, apis, apiIndex, resolve) {
  if (apiIndex >= apis.length) {
    resolve(null); // 所有API都失败，返回null
    return;
  }

  const apiUrl = apis[apiIndex];
  console.log(
    `尝试API[${apiIndex}]: ${apiUrl.substring(0, 30)}...`,
  );

  $httpClient.get(
    {
      url: apiUrl,
      timeout: 5000,
      node: nodeName,
    },
    function (error, response, data) {
      if (error || response.status !== 200) {
        tryIPAPI(nodeName, apis, apiIndex + 1, resolve);
        return;
      }

      // 解析IP地址
      let ip = null;
      try {
        const jsonData = JSON.parse(data);
        ip = jsonData.ip;
      } catch (e) {
        ip = data.trim();
      }

      if (ip && isValidIP(ip)) {
        resolve(ip);
      } else {
        tryIPAPI(nodeName, apis, apiIndex + 1, resolve);
      }
    },
  );
}

// 测试节点延迟
function testLatency(nodeName) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testUrl = LATENCY_TEST_URLS[0];

    $httpClient.head(
      {
        url: testUrl,
        timeout: 5000,
        node: nodeName,
      },
      function (error, response) {
        const latency = Date.now() - startTime;

        if (error) {
          console.log(`延迟测试失败: ${error}`);
          resolve({ success: false, latency: -1 });
        } else {
          resolve({ success: true, latency });
        }
      },
    );
  });
}

// 计算网络质量评分（满分100分）
function calculateQualityScore(params) {
  const { hasIPv4, hasIPv6, latency, latencySuccess } = params;

  let score = 0;
  let details = [];

  // IPv4 支持（30分）
  if (hasIPv4) {
    score += 30;
    details.push("✓ IPv4");
  } else {
    details.push("✗ IPv4");
  }

  // IPv6 支持（20分，加分项）
  if (hasIPv6) {
    score += 20;
    details.push("✓ IPv6");
  } else {
    details.push("✗ IPv6");
  }

  // 延迟评分（50分）
  if (latencySuccess) {
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

  return {
    score,
    grade,
    details,
  };
}

// 构建结果消息
function buildResultMessage(data) {
  const { ipv4, ipv6, geo, asn, aso, latency, quality } = data;

  let message = "";

  // IP地址信息
  message += "📡 IP地址\n";
  if (ipv4) {
    message += `IPv4: ${ipv4}\n`;
  }
  if (ipv6) {
    message += `IPv6: ${ipv6}\n`;
  }
  if (!ipv4 && !ipv6) {
    message += "无法获取IP\n";
  }

  // 地理位置
  if (geo) {
    message += `\n🌍 地理位置\n`;
    message += `${getCountryName(geo)} (${geo})\n`;
  }

  // ASN信息
  if (asn || aso) {
    message += `\n🏢 网络信息\n`;
    if (asn) {
      message += `ASN: ${asn}\n`;
    }
    if (aso) {
      message += `运营商: ${aso}\n`;
    }
  }

  // 延迟信息
  message += `\n⚡ 性能测试\n`;
  if (latency.success) {
    const latencyLevel = getLatencyLevel(latency.latency);
    message += `延迟: ${latency.latency}ms ${latencyLevel}\n`;
  } else {
    message += `延迟: 测试失败\n`;
  }

  // 网络质量评分
  message += `\n⭐ 质量评分\n`;
  message += `评分: ${quality.score}/100 (${quality.grade}级)\n`;
  message += quality.details.join(" | ");

  return message;
}

// 获取延迟等级
function getLatencyLevel(latency) {
  if (latency < 50) return "🟢";
  if (latency < 100) return "🟡";
  if (latency < 200) return "🟠";
  return "🔴";
}

// 验证IP地址格式
function isValidIP(ip) {
  // IPv4正则
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6正则（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// 显示通知
function showNotification(title, subtitle, message) {
  $notification.post(title, subtitle, message);
}

// 将国家代码转换为中文名称（部分常用国家/地区）
function getCountryName(code) {
  const countryMap = {
    CN: "中国",
    HK: "香港",
    TW: "台湾",
    MO: "澳门",
    US: "美国",
    JP: "日本",
    KR: "韩国",
    SG: "新加坡",
    GB: "英国",
    DE: "德国",
    FR: "法国",
    CA: "加拿大",
    AU: "澳大利亚",
    RU: "俄罗斯",
    IN: "印度",
    BR: "巴西",
    NL: "荷兰",
    IT: "意大利",
    ES: "西班牙",
    SE: "瑞典",
    CH: "瑞士",
    NO: "挪威",
    FI: "芬兰",
    DK: "丹麦",
    PL: "波兰",
    TR: "土耳其",
    ID: "印度尼西亚",
    TH: "泰国",
    MY: "马来西亚",
    VN: "越南",
    PH: "菲律宾",
    NZ: "新西兰",
    AR: "阿根廷",
    MX: "墨西哥",
    ZA: "南非",
    AE: "阿联酋",
    SA: "沙特阿拉伯",
    IL: "以色列",
    UA: "乌克兰",
    IE: "爱尔兰",
    AT: "奥地利",
    BE: "比利时",
    PT: "葡萄牙",
    GR: "希腊",
    CZ: "捷克",
    RO: "罗马尼亚",
    HU: "匈牙利",
    BG: "保加利亚",
  };

  return countryMap[code] || code;
}

// 执行主函数
queryNodeIP();
