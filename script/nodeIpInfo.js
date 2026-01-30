/*
 * Loon Generic Script - 节点IP信息查询
 *
 * 功能说明：
 * - 查询指定节点的出口IP地址
 * - 获取IP的地理位置信息（国家/地区）
 * - 获取IP的ASN（自治系统编号）
 * - 获取IP的ASO（自治系统组织）
 *
 * 使用方法：
 * 在Loon配置文件的[Script]部分添加：
 * generic script-path=node_ip_info.js, tag=节点IP查询, timeout=10, img-url=network.badge.shield.half.filled.system
 *
 * 然后在Loon应用中选择任意节点，点击运行此脚本即可查询该节点的IP信息
 */

// IP查询API列表（可以根据需要选择不同的API）
const IP_APIS = [
  "https://api.ipify.org?format=json", // 返回 {"ip":"x.x.x.x"}
  "https://api64.ipify.org?format=json", // IPv6优先
  "https://api.ip.sb/ip", // 纯文本返回IP
  "https://ifconfig.me/ip", // 纯文本返回IP
  "https://icanhazip.com", // 纯文本返回IP
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
      $done();
      return;
    }

    // 查询IP地址
    const ipAddress = await getNodeIP(nodeName);

    if (!ipAddress) {
      showNotification(
        "查询失败",
        nodeName,
        "无法获取节点IP地址，请检查节点是否正常",
      );
      $done();
      return;
    }

    console.log(`节点IP地址: ${ipAddress}`);

    // 查询IP的地理位置和ASN信息
    const geoInfo = $utils.geoip(ipAddress);
    const asnInfo = $utils.ipasn(ipAddress);
    const asoInfo = $utils.ipaso(ipAddress);

    // 构建结果信息
    let resultMessage = `IP: ${ipAddress}\n`;

    if (geoInfo) {
      resultMessage += `地区: ${getCountryName(geoInfo)} (${geoInfo})\n`;
    }

    if (asnInfo) {
      resultMessage += `ASN: ${asnInfo}\n`;
    }

    if (asoInfo) {
      resultMessage += `运营商: ${asoInfo}`;
    }

    // 显示结果
    showNotification("节点IP信息", nodeName, resultMessage);

    console.log("查询完成");
    console.log(resultMessage);
  } catch (error) {
    console.log(`查询出错: ${error}`);
    showNotification("查询出错", "错误", String(error));
  }

  $done();
}

// 获取节点的出口IP地址
function getNodeIP(nodeName) {
  return new Promise((resolve, reject) => {
    // 使用第一个API进行查询
    const apiUrl = IP_APIS[0];

    $httpClient.get(
      {
        url: apiUrl,
        timeout: 5000,
        node: nodeName, // 指定通过该节点发送请求
      },
      function (error, response, data) {
        if (error) {
          console.log(`API请求失败: ${error}`);
          // 如果第一个API失败，尝试使用备用API
          tryBackupAPI(nodeName, 1, resolve, reject);
          return;
        }

        if (response.status !== 200) {
          console.log(`API返回状态码: ${response.status}`);
          tryBackupAPI(nodeName, 1, resolve, reject);
          return;
        }

        // 解析IP地址
        let ip = null;
        try {
          // 尝试解析JSON格式
          const jsonData = JSON.parse(data);
          ip = jsonData.ip;
        } catch (e) {
          // 如果不是JSON，当作纯文本处理
          ip = data.trim();
        }

        if (ip && isValidIP(ip)) {
          resolve(ip);
        } else {
          console.log(`无效的IP地址: ${ip}`);
          tryBackupAPI(nodeName, 1, resolve, reject);
        }
      },
    );
  });
}

// 尝试备用API
function tryBackupAPI(nodeName, apiIndex, resolve, reject) {
  if (apiIndex >= IP_APIS.length) {
    reject("所有API都查询失败");
    return;
  }

  const apiUrl = IP_APIS[apiIndex];
  console.log(`尝试备用API[${apiIndex}]: ${apiUrl}`);

  $httpClient.get(
    {
      url: apiUrl,
      timeout: 5000,
      node: nodeName,
    },
    function (error, response, data) {
      if (error || response.status !== 200) {
        tryBackupAPI(nodeName, apiIndex + 1, resolve, reject);
        return;
      }

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
        tryBackupAPI(nodeName, apiIndex + 1, resolve, reject);
      }
    },
  );
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
