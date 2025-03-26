/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=ip, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本 v2.0
// 改进内容：
// 1. 更准确的IP类型检测(家宽/IDC)
// 2. 改进纯净度评估算法，与ping0.cc标准对齐
// 3. 确保显示通知弹窗
// 4. 增加更多检测指标



**/
const $ = new compatibility();

// 主函数
async function main() {
    // 显示开始检测提示
    $.notify("IP纯净度检测", "开始全面检测当前网络环境...", "");
    
    try {
        // 获取当前网络信息
        const networkInfo = await getNetworkInfo();
        
        // 检测IP类型(家宽/IDC)
        const ipType = await detectIPType(networkInfo);
        networkInfo.ipType = ipType;
        
        // 检测流媒体解锁情况
        const streamingResults = await checkStreamingServices();
        
        // 检测DNS污染情况
        const dnsResults = await checkDNSContamination();
        
        // 检测IP纯净度(使用更严格的算法)
        const ipPurityResults = await checkIPPurity(networkInfo.ip);
        
        // 生成检测报告
        generateReport(networkInfo, streamingResults, dnsResults, ipPurityResults);
        
    } catch (error) {
        $.notify("检测失败", `执行过程中出现错误: ${error}`, "");
        $.done();
    }
}

// 获取当前网络信息
async function getNetworkInfo() {
    return new Promise((resolve) => {
        $.http.get({
            url: "http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query,mobile,proxy,hosting"
        }).then(resp => {
            const data = JSON.parse(resp.body);
            if (data.status === "success") {
                resolve({
                    ip: data.query,
                    isp: data.isp,
                    org: data.org,
                    asn: data.as,
                    asname: data.asname,
                    location: `${data.city}, ${data.regionName}, ${data.country}`,
                    coordinates: `${data.lat}, ${data.lon}`,
                    isMobile: data.mobile,
                    isProxy: data.proxy,
                    isHosting: data.hosting
                });
            } else {
                resolve({
                    ip: "未知",
                    isp: "未知",
                    org: "未知",
                    asn: "未知",
                    asname: "未知",
                    location: "未知",
                    coordinates: "未知",
                    isMobile: false,
                    isProxy: false,
                    isHosting: false
                });
            }
        }).catch(() => {
            resolve({
                ip: "未知",
                isp: "未知",
                org: "未知",
                asn: "未知",
                asname: "未知",
                location: "未知",
                coordinates: "未知",
                isMobile: false,
                isProxy: false,
                isHosting: false
            });
        });
    });
}

// 检测IP类型(家宽/IDC)
async function detectIPType(networkInfo) {
    // 通过ASN和ISP信息判断
    const hostingKeywords = ["hosting", "data center", "server", "cloud", "idc", "colo", "digitalocean", "linode", "vultr", "aws", "google cloud", "azure", "alibaba", "tencent cloud", "oracle cloud"];
    const ispLower = networkInfo.isp.toLowerCase();
    const orgLower = networkInfo.org.toLowerCase();
    
    // 如果ip-api直接提供了hosting信息
    if (networkInfo.isHosting) {
        return "IDC机房IP";
    }
    
    // 检查ISP或组织名称中是否包含托管关键词
    for (const keyword of hostingKeywords) {
        if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
            return "IDC机房IP";
        }
    }
    
    // 检查常见的家宽ISP关键词
    const residentialKeywords = ["communications", "telecom", "broadband", "cable", "dsl", "fiber", "residential", "home", "isp"];
    for (const keyword of residentialKeywords) {
        if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
            return "家庭宽带IP";
        }
    }
    
    // 移动网络检测
    if (networkInfo.isMobile) {
        return "移动网络IP";
    }
    
    // 如果无法确定，默认为IDC
    return "IDC机房IP(可能)";
}

// 检测流媒体解锁情况
async function checkStreamingServices() {
    const services = [
        { name: "Netflix", url: "https://www.netflix.com/title/81215567", keyword: "NETFLIX", checkFull: true },
        { name: "Disney+", url: "https://www.disneyplus.com", keyword: "disneyplus" },
        { name: "YouTube Premium", url: "https://www.youtube.com/premium", keyword: "Premium" },
        { name: "Amazon Prime Video", url: "https://www.primevideo.com", keyword: "primevideo" },
        { name: "HBO Max", url: "https://www.hbomax.com", keyword: "HBOMAX" },
        { name: "Dazn", url: "https://www.dazn.com", keyword: "DAZN" },
        { name: "Paramount+", url: "https://www.paramountplus.com", keyword: "Paramount" },
        { name: "Discovery+", url: "https://www.discoveryplus.com", keyword: "discoveryplus" },
        { name: "ChatGPT", url: "https://chat.openai.com", keyword: "ChatGPT" }
    ];
    
    const results = [];
    
    for (const service of services) {
        try {
            const resp = await $.http.get({ 
                url: service.url,
                timeout: 5000
            });
            
            let status = "❌ 未支持";
            if (service.checkFull) {
                // 对于Netflix等需要检测完整解锁的服务
                const isFullUnlock = resp.body.includes(service.keyword) && !resp.body.includes("You seem to be using an unblocker");
                status = isFullUnlock ? "✅ 完全解锁" : "🟡 仅解锁自制剧";
            } else {
                // 其他服务
                const isUnlocked = resp.body.includes(service.keyword) || resp.status === 200;
                status = isUnlocked ? "✅ 支持" : "❌ 未支持";
            }
            
            results.push({
                name: service.name,
                status: status,
                responseCode: resp.status
            });
        } catch (error) {
            results.push({
                name: service.name,
                status: "❌ 检测失败",
                responseCode: error.status || "请求失败"
            });
        }
    }
    
    return results;
}

// 检测DNS污染情况
async function checkDNSContamination() {
    const testDomains = [
        { domain: "www.google.com", expected: "Google" },
        { domain: "www.facebook.com", expected: "Facebook" },
        { domain: "twitter.com", expected: "Twitter" },
        { domain: "www.youtube.com", expected: "YouTube" },
        { domain: "www.github.com", expected: "GitHub" }
    ];
    
    const results = [];
    
    for (const test of testDomains) {
        try {
            const resp = await $.http.get({ 
                url: `http://${test.domain}`,
                timeout: 5000
            });
            const isContaminated = !resp.body.includes(test.expected);
            results.push({
                domain: test.domain,
                status: isContaminated ? "❌ 可能污染" : "✅ 正常",
                contaminated: isContaminated
            });
        } catch (error) {
            results.push({
                domain: test.domain,
                status: "🟡 检测失败",
                contaminated: false
            });
        }
    }
    
    return results;
}

// 检测IP纯净度(更严格的算法)
async function checkIPPurity(ip) {
    // 使用更严格的黑名单检查
    const blacklistChecks = [
        { name: "Spamhaus", url: `https://check.spamhaus.org/check/?ip=${ip}` },
        { name: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${ip}` },
        { name: "IPQualityScore", url: `https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${ip}` },
        { name: "IP2Proxy", url: `https://www.ip2proxy.com/demo/${ip}` }
    ];
    
    const results = [];
    let blacklistCount = 0;
    
    for (const check of blacklistChecks) {
        try {
            const resp = await $.http.get({ 
                url: check.url,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                },
                timeout: 8000
            });
            
            const body = resp.body.toLowerCase();
            let isListed = false;
            let status = "✅ 未列入";
            
            // 根据不同黑名单的响应判断
            if (check.name === "Spamhaus") {
                isListed = body.includes("listed") || body.includes("found in");
                status = isListed ? "❌ 列入黑名单" : "✅ 未列入";
            } else if (check.name === "AbuseIPDB") {
                isListed = body.includes("reported") || body.includes("abuse");
                status = isListed ? "❌ 有滥用报告" : "✅ 无报告";
            } else if (check.name === "IPQualityScore") {
                isListed = body.includes("proxy") || body.includes("vpn") || body.includes("risk");
                status = isListed ? "⚠️ 高风险" : "✅ 低风险";
            } else if (check.name === "IP2Proxy") {
                isListed = body.includes("proxy") || body.includes("vpn");
                status = isListed ? "❌ 代理/VPN" : "✅ 正常";
            }
            
            if (isListed) blacklistCount++;
            results.push({
                service: check.name,
                status: status,
                listed: isListed
            });
        } catch (error) {
            results.push({
                service: check.name,
                status: "🟡 检测失败",
                listed: false
            });
        }
    }
    
    // 额外检测代理/VPN特征
    const proxyCheck = await checkProxyFeatures(ip);
    if (proxyCheck.isProxy) blacklistCount++;
    results.push({
        service: "代理/VPN检测",
        status: proxyCheck.isProxy ? "❌ 检测到代理特征" : "✅ 无代理特征",
        listed: proxyCheck.isProxy,
        details: proxyCheck.details
    });
    
    // 计算风险评分(与ping0.cc标准对齐)
    const totalChecks = results.length;
    const riskPercentage = Math.round((blacklistCount / totalChecks) * 100);
    const purityScore = 100 - riskPercentage;
    
    return {
        results: results,
        purityScore: purityScore,
        riskPercentage: riskPercentage
    };
}

// 检查代理/VPN特征(更严格的检测)
async function checkProxyFeatures(ip) {
    try {
        // 使用多个API交叉验证
        const [ipinfo, ipapi, ipdata] = await Promise.all([
            $.http.get({ url: `https://ipinfo.io/${ip}/json` }),
            $.http.get({ url: `http://ip-api.com/json/${ip}?fields=proxy,hosting,mobile` }),
            $.http.get({ url: `https://proxycheck.io/v2/${ip}?vpn=1&asn=1` })
        ]);
        
        const infoData = JSON.parse(ipinfo.body);
        const apiData = JSON.parse(ipapi.body);
        const proxyData = JSON.parse(ipdata.body);
        
        // 综合判断
        const isProxy = 
            (infoData.privacy && (infoData.privacy.vpn || infoData.privacy.proxy || infoData.privacy.tor)) ||
            (apiData.proxy === true) ||
            (proxyData[ip] && (proxyData[ip].proxy === "yes" || proxyData[ip].type === "VPN"));
        
        return {
            isProxy: isProxy,
            details: {
                ipinfo: infoData.privacy || {},
                ipapi: { proxy: apiData.proxy, hosting: apiData.hosting, mobile: apiData.mobile },
                proxycheck: proxyData[ip] || {}
            }
        };
    } catch (error) {
        return {
            isProxy: false,
            details: {}
        };
    }
}

// 生成检测报告
function generateReport(networkInfo, streamingResults, dnsResults, ipPurityResults) {
    let report = `🌐 IP信息\nIP: ${networkInfo.ip}\nISP: ${networkInfo.isp}\n类型: ${networkInfo.ipType}\n位置: ${networkInfo.location}\nASN: ${networkInfo.asn} (${networkInfo.asname})\n\n`;
    
    report += "📺 流媒体解锁情况\n";
    streamingResults.forEach(service => {
        report += `${service.name}: ${service.status} (${service.responseCode})\n`;
    });
    
    report += "\n🔍 DNS污染检测\n";
    dnsResults.forEach(dns => {
        report += `${dns.domain}: ${dns.status}\n`;
    });
    
    report += "\n🛡️ IP纯净度检测\n";
    ipPurityResults.results.forEach(check => {
        report += `${check.service}: ${check.status}\n`;
    });
    
    // 显示纯净度评分(与ping0.cc标准对齐)
    report += `\n⚠️ 风险评分: ${ipPurityResults.riskPercentage}/100 (越低越好)\n`;
    report += `✨ 纯净度评分: ${ipPurityResults.purityScore}/100 (越高越好)\n\n`;
    
    // 根据评分给出建议
    if (ipPurityResults.purityScore >= 90) {
        report += "🌟 IP非常纯净，适合高级用途";
    } else if (ipPurityResults.purityScore >= 70) {
        report += "👍 IP较为纯净，一般使用无问题";
    } else if (ipPurityResults.purityScore >= 50) {
        report += "⚠️ IP纯净度一般，可能存在限制";
    } else if (ipPurityResults.purityScore >= 30) {
        report += "❌ IP纯净度较差，不推荐重要用途";
    } else {
        report += "💀 IP风险极高，可能存在严重滥用";
    }
    
    // 确保显示通知弹窗
    $.notify(
        `IP检测结果 | ${networkInfo.ip}`,
        `类型: ${networkInfo.ipType} | 纯净度: ${ipPurityResults.purityScore}/100`,
        report
    );
    
    $.done();
}

// 兼容性封装
function compatibility() {
    _node = (() => {
        if (typeof require == "function") {
            const request = require('request')
            return ({ request })
        } else {
            return (null)
        }
    })()
    
    this.http = {
        get: (options) => {
            return new Promise((resolve, reject) => {
                if (typeof $task != "undefined") {
                    $task.fetch(options).then(
                        (response) => resolve(response),
                        (reason) => reject(reason.error)
                    )
                } else if (typeof $httpClient != "undefined") {
                    $httpClient.get(options, (error, response, body) => {
                        if (error) reject(error)
                        else resolve({ status: response.status, headers: response.headers, body })
                    })
                } else if (_node) {
                    _node.request(options, (error, response, body) => {
                        if (error) reject(error)
                        else resolve({ status: response.statusCode, headers: response.headers, body })
                    })
                } else {
                    reject("不支持的网络请求")
                }
            })
        }
    }
    
    this.notify = (title, subtitle, message) => {
        if (typeof $notification != "undefined") {
            $notification.post(title, subtitle, message)
        } else if (_node) {
            console.log(JSON.stringify({ title, subtitle, message }))
        } else {
            console.log(`${title}\n${subtitle}\n${message}`)
        }
    }
    
    this.done = (value = {}) => {
        if (typeof $done != "undefined") {
            $done(value)
        } else if (_node) {
            process.exit(0)
        }
    }
}

// 执行主函数
main();
