/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=IP纯净度检测脚本, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本 v2.2
// 改进内容：
// 1. 修复纯净度评分算法，避免固定67分的问题
// 2. 增加更多检测指标和验证步骤
// 3. 优化通知显示格式，突出纯净度百分比

**/
const $ = new Env('IP纯净度检测');

(async () => {
    try {
        // 获取当前网络信息
        const networkInfo = await getNetworkInfo();
        
        // 检测IP类型(家宽/IDC)
        const ipType = await detectIPType(networkInfo);
        networkInfo.ipType = ipType;
        
        // 检测流媒体解锁情况（增加严格验证）
        const streamingResults = await checkStreamingServicesStrict();
        
        // 检测DNS污染情况
        const dnsResults = await checkDNSContamination();
        
        // 检测IP纯净度（改进算法）
        const ipPurityResults = await checkIPPurityStrict(networkInfo.ip);
        
        // 生成检测报告
        await generatePanel(networkInfo, streamingResults, dnsResults, ipPurityResults);
        
    } catch (e) {
        $.logErr(e);
        $.notify("IP检测失败", "检测过程中出现错误", e.message || "未知错误");
    } finally {
        $.done();
    }
})();

// 获取当前网络信息（增加备用API）
async function getNetworkInfo() {
    try {
        // 尝试使用ip-api.com
        const resp = await $.http.get({
            url: "http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query,mobile,proxy,hosting",
            timeout: 5000
        });
        
        const data = JSON.parse(resp.body);
        if (data.status === "success") {
            return {
                ip: data.query,
                isp: data.isp,
                org: data.org,
                asn: data.as,
                asname: data.asname,
                location: `${data.city}, ${data.regionName}, ${data.country}`,
                coordinates: `${data.lat}, ${data.lon}`,
                isMobile: data.mobile,
                isProxy: data.proxy,
                isHosting: data.hosting,
                source: "ip-api"
            };
        }
    } catch (e) {
        $.log("ip-api.com请求失败，尝试备用API");
    }

    // 备用API：ipinfo.io
    try {
        const resp = await $.http.get({
            url: "https://ipinfo.io/json",
            timeout: 5000
        });
        
        const data = JSON.parse(resp.body);
        return {
            ip: data.ip,
            isp: data.org || "未知",
            org: data.org || "未知",
            asn: data.asn || "未知",
            asname: data.asn ? data.asn.split(' ').slice(1).join(' ') : "未知",
            location: `${data.city}, ${data.region}, ${data.country}`,
            coordinates: data.loc || "未知",
            isMobile: false,
            isProxy: data.privacy ? (data.privacy.vpn || data.privacy.proxy || data.privacy.tor) : false,
            isHosting: data.hosting || false,
            source: "ipinfo.io"
        };
    } catch (e) {
        $.log("ipinfo.io请求失败");
        return {
            ip: "未知",
            isp: "未知",
            org: "未知",
            asn: "未知",
            asname: "未知",
            location: "未知",
            coordinates: "未知",
            isMobile: false,
            isProxy: false,
            isHosting: false,
            source: "未知"
        };
    }
}

// 更严格的IP类型检测
async function detectIPType(networkInfo) {
    // 如果API直接提供了信息，优先使用
    if (networkInfo.isHosting) return "IDC机房IP";
    if (networkInfo.isMobile) return "移动网络IP";
    if (networkInfo.isProxy) return "代理/VPN IP";

    // 通过ASN和ISP信息判断
    const hostingKeywords = ["hosting", "data center", "server", "cloud", "idc", "colo", 
                           "digitalocean", "linode", "vultr", "aws", "google cloud", 
                           "azure", "alibaba", "tencent cloud", "oracle cloud", "hetzner"];
    
    const residentialKeywords = ["communications", "telecom", "broadband", "cable", 
                               "dsl", "fiber", "residential", "home", "isp", "联通", 
                               "电信", "移动", "广电", "中国"];

    const ispLower = (networkInfo.isp || "").toLowerCase();
    const orgLower = (networkInfo.org || "").toLowerCase();
    const asnameLower = (networkInfo.asname || "").toLowerCase();

    // 检查IDC特征
    for (const keyword of hostingKeywords) {
        if (ispLower.includes(keyword) || orgLower.includes(keyword) || asnameLower.includes(keyword)) {
            return "IDC机房IP";
        }
    }

    // 检查家宽特征
    for (const keyword of residentialKeywords) {
        if (ispLower.includes(keyword) || orgLower.includes(keyword) || asnameLower.includes(keyword)) {
            return "家庭宽带IP";
        }
    }

    // 默认判断为IDC
    return "IDC机房IP(可能)";
}

// 更严格的流媒体解锁检测
async function checkStreamingServicesStrict() {
    const services = [
        {
            name: "Netflix", 
            url: "https://www.netflix.com/title/81215567", 
            testUrl: "https://www.netflix.com/title/80018499", // 非自制剧
            keyword: "NETFLIX",
            checkFull: true
        },
        { 
            name: "Disney+", 
            url: "https://www.disneyplus.com", 
            keyword: "disneyplus",
            blockedKeyword: "not available"
        },
        { 
            name: "YouTube Premium", 
            url: "https://www.youtube.com/premium", 
            keyword: "Premium",
            blockedKeyword: "not available"
        },
        { 
            name: "Dazn", 
            url: "https://www.dazn.com", 
            keyword: "DAZN",
            blockedKeyword: "not available in your region"
        },
        { 
            name: "Paramount+", 
            url: "https://www.paramountplus.com", 
            keyword: "Paramount",
            blockedKeyword: "not available"
        },
        { 
            name: "Discovery+", 
            url: "https://www.discoveryplus.com", 
            keyword: "discoveryplus",
            blockedKeyword: "not available"
        },
        { 
            name: "ChatGPT", 
            url: "https://chat.openai.com", 
            keyword: "ChatGPT",
            blockedKeyword: "not available"
        }
    ];
    
    const results = [];
    
    for (const service of services) {
        try {
            // 先检测基本可访问性
            const resp = await $.http.get({ 
                url: service.url,
                timeout: 8000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });
            
            let status = "❌ 未支持";
            let details = "";
            
            // 检查是否明确被阻止
            if (service.blockedKeyword && resp.body.includes(service.blockedKeyword)) {
                status = "❌ 地区限制";
                details = "明确返回地区限制信息";
            } 
            // 对于Netflix需要特殊检测
            else if (service.name === "Netflix") {
                // 检测自制剧
                const isOriginal = resp.body.includes(service.keyword);
                
                // 检测非自制剧
                let isFullUnlock = false;
                try {
                    const fullResp = await $.http.get({
                        url: service.testUrl,
                        timeout: 8000,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                        }
                    });
                    isFullUnlock = fullResp.body.includes(service.keyword);
                } catch (e) {
                    isFullUnlock = false;
                }
                
                if (isFullUnlock) {
                    status = "✅ 完全解锁";
                    details = "可观看非自制剧";
                } else if (isOriginal) {
                    status = "🟡 仅自制剧";
                    details = "只能观看Netflix自制内容";
                } else {
                    status = "❌ 未解锁";
                    details = "无法访问Netflix";
                }
            } 
            // 其他服务
            else {
                const isUnlocked = resp.body.includes(service.keyword);
                status = isUnlocked ? "✅ 支持" : "❌ 未支持";
                details = isUnlocked ? "可正常访问" : "无法访问或地区限制";
            }
            
            results.push({
                name: service.name,
                status: status,
                details: details
            });
        } catch (error) {
            results.push({
                name: service.name,
                status: "❌ 检测失败",
                details: error.message || "请求失败"
            });
        }
    }
    
    return results;
}

// 更严格的DNS污染检测
async function checkDNSContamination() {
    const testDomains = [
        { 
            domain: "www.google.com", 
            expected: ["Google", "google.com"],
            blocked: ["not available", "blocked", "restricted"]
        },
        { 
            domain: "www.facebook.com", 
            expected: ["Facebook", "facebook.com"],
            blocked: ["not available", "blocked", "restricted"]
        },
        { 
            domain: "twitter.com", 
            expected: ["Twitter", "twitter.com"],
            blocked: ["not available", "blocked", "restricted"]
        },
        { 
            domain: "www.youtube.com", 
            expected: ["YouTube", "youtube.com"],
            blocked: ["not available", "blocked", "restricted"]
        }
    ];
    
    const results = [];
    
    for (const test of testDomains) {
        try {
            const resp = await $.http.get({ 
                url: `http://${test.domain}`,
                timeout: 8000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });
            
            let status = "✅ 正常";
            let details = "";
            
            // 检查是否包含预期关键词
            const hasExpected = test.expected.some(keyword => resp.body.includes(keyword));
            
            // 检查是否包含阻止关键词
            const isBlocked = test.blocked.some(keyword => resp.body.includes(keyword));
            
            if (!hasExpected || isBlocked) {
                status = "❌ 可能污染";
                details = isBlocked ? "明确返回阻止信息" : "缺少预期内容";
            } else {
                details = "返回内容正常";
            }
            
            results.push({
                domain: test.domain,
                status: status,
                details: details
            });
        } catch (error) {
            results.push({
                domain: test.domain,
                status: "🟡 检测失败",
                details: error.message || "请求失败"
            });
        }
    }
    
    return results;
}

// 更严格的IP纯净度检测
async function checkIPPurityStrict(ip) {
    // 检测代理/VPN特征
    const proxyCheck = await checkProxyFeaturesStrict(ip);
    
    // 检测黑名单
    const blacklistResults = await checkBlacklists(ip);
    
    // 检测IP历史记录
    const historyCheck = await checkIPHistory(ip);
    
    // 计算风险评分
    let riskScore = 0;
    let totalChecks = 0;
    
    // 代理/VPN检测
    if (proxyCheck.isProxy) riskScore += 40;
    totalChecks += 40;
    
    // 黑名单检测
    const blacklistCount = blacklistResults.filter(r => r.listed).length;
    riskScore += blacklistCount * 10;
    totalChecks += blacklistResults.length * 10;
    
    // 历史记录检测
    if (historyCheck.abuseScore > 50) riskScore += 20;
    if (historyCheck.abuseScore > 80) riskScore += 10;
    totalChecks += 30;
    
    // 确保总分不超过100
    riskScore = Math.min(riskScore, 100);
    
    // 计算纯净度评分
    const purityScore = 100 - riskScore;
    
    // 合并所有结果
    const allResults = [
        ...blacklistResults,
        {
            service: "代理/VPN检测",
            status: proxyCheck.isProxy ? "❌ 检测到代理特征" : "✅ 无代理特征",
            listed: proxyCheck.isProxy,
            details: proxyCheck.details
        },
        {
            service: "滥用历史",
            status: historyCheck.abuseScore > 50 ? 
                   (historyCheck.abuseScore > 80 ? "❌ 高风险" : "⚠️ 中等风险") : "✅ 低风险",
            listed: historyCheck.abuseScore > 50,
            details: `评分: ${historyCheck.abuseScore}/100 (${historyCheck.reports}次报告)`
        }
    ];
    
    return {
        results: allResults,
        purityScore: purityScore,
        riskScore: riskScore
    };
}

// 更严格的代理/VPN检测
async function checkProxyFeaturesStrict(ip) {
    try {
        // 使用多个API交叉验证
        const [ipinfo, ipapi, ipdata] = await Promise.allSettled([
            $.http.get({ 
                url: `https://ipinfo.io/${ip}/json`,
                timeout: 6000
            }),
            $.http.get({
                url: `http://ip-api.com/json/${ip}?fields=proxy,hosting,mobile`,
                timeout: 6000
            }),
            $.http.get({
                url: `https://proxycheck.io/v2/${ip}?vpn=1&asn=1`,
                timeout: 6000
            })
        ]);
        
        let isProxy = false;
        const details = {};
        
        // 检查ipinfo.io结果
        if (ipinfo.status === "fulfilled") {
            const data = JSON.parse(ipinfo.value.body);
            details.ipinfo = data.privacy || {};
            if (data.privacy && (data.privacy.vpn || data.privacy.proxy || data.privacy.tor)) {
                isProxy = true;
            }
        }
        
        // 检查ip-api.com结果
        if (ipapi.status === "fulfilled") {
            const data = JSON.parse(ipapi.value.body);
            details.ipapi = data;
            if (data.proxy === true) {
                isProxy = true;
            }
        }
        
        // 检查proxycheck.io结果
        if (ipdata.status === "fulfilled") {
            const data = JSON.parse(ipdata.value.body);
            details.proxycheck = data[ip] || {};
            if (data[ip] && (data[ip].proxy === "yes" || data[ip].type === "VPN")) {
                isProxy = true;
            }
        }
        
        return {
            isProxy: isProxy,
            details: details
        };
    } catch (error) {
        return {
            isProxy: false,
            details: { error: error.message }
        };
    }
}

// 检测IP黑名单
async function checkBlacklists(ip) {
    const blacklistChecks = [
        {
            name: "Spamhaus", 
            url: `https://check.spamhaus.org/check/?ip=${ip}`,
            positive: ["listed", "found in"]
        },
        {
            name: "AbuseIPDB", 
            url: `https://www.abuseipdb.com/check/${ip}`,
            positive: ["reported", "abuse"]
        },
        {
            name: "IP2Proxy", 
            url: `https://www.ip2proxy.com/demo/${ip}`,
            positive: ["proxy", "vpn"]
        },
        {
            name: "IPQS", 
            url: `https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${ip}`,
            positive: ["proxy", "vpn", "risk"]
        }
    ];
    
    const results = [];
    
    for (const check of blacklistChecks) {
        try {
            const resp = await $.http.get({
                url: check.url,
                timeout: 8000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });
            
            const body = resp.body.toLowerCase();
            const isListed = check.positive.some(keyword => body.includes(keyword));
            
            results.push({
                service: check.name,
                status: isListed ? "❌ 列入黑名单" : "✅ 未列入",
                listed: isListed,
                details: isListed ? "检测到黑名单记录" : "未检测到黑名单记录"
            });
        } catch (error) {
            results.push({
                service: check.name,
                status: "🟡 检测失败",
                listed: false,
                details: error.message || "请求失败"
            });
        }
    }
    
    return results;
}

// 检测IP历史记录
async function checkIPHistory(ip) {
    try {
        const resp = await $.http.get({
            url: `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`,
            headers: {
                "Key": "YOUR_API_KEY", // 需要替换为实际的API key
                "Accept": "application/json"
            },
            timeout: 8000
        });
        
        const data = JSON.parse(resp.body).data || {};
        return {
            abuseScore: data.abuseConfidenceScore || 0,
            reports: data.totalReports || 0,
            details: data
        };
    } catch (error) {
        return {
            abuseScore: 0,
            reports: 0,
            details: { error: error.message }
        };
    }
}

// 生成面板信息（优化纯净度百分比显示）
async function generatePanel(networkInfo, streamingResults, dnsResults, ipPurityResults) {
    // 构造纯净度评分显示（带颜色和表情）
    const purityScore = ipPurityResults.purityScore;
    let purityDisplay;
    if (purityScore >= 85) {
        purityDisplay = `✨ IP纯净度: ${purityScore}% (优秀)`;
    } else if (purityScore >= 70) {
        purityDisplay = `👍 IP纯净度: ${purityScore}% (良好)`;
    } else if (purityScore >= 50) {
        purityDisplay = `⚠️ IP纯净度: ${purityScore}% (一般)`;
    } else {
        purityDisplay = `❌ IP纯净度: ${purityScore}% (较差)`;
    }

    // 构造通知标题（直接显示百分比）
    const title = `IP检测 | 纯净度: ${purityScore}%`;
    const subtitle = `IP: ${networkInfo.ip} | 类型: ${networkInfo.ipType}`;
    
    // 构造通知内容
    let content = `ISP: ${networkInfo.isp}\n位置: ${networkInfo.location}\n`;
    content += `ASN: ${networkInfo.asn} (${networkInfo.asname})\n\n`;
    content += `${purityDisplay}\n`;
    content += `⚠️ 风险评分: ${ipPurityResults.riskScore}/100\n\n`;
    
    // 流媒体解锁结果
    content += "📺 流媒体解锁:\n";
    streamingResults.forEach(s => content += `${s.name}: ${s.status}${s.details ? ` (${s.details})` : ''}\n`);
    
    // DNS检测结果
    content += "\n🔍 DNS检测:\n";
    dnsResults.forEach(d => content += `${d.domain}: ${d.status}${d.details ? ` (${d.details})` : ''}\n`);
    
    // IP纯净度详细结果
    content += "\n🛡️ IP纯净度检测:\n";
    ipPurityResults.results.forEach(r => content += `${r.service}: ${r.status}${r.details ? ` (${r.details})` : ''}\n`);
    
    // 根据评分给出建议
    if (purityScore >= 85) {
        content += "\n🌟 IP非常纯净，适合高级用途";
    } else if (purityScore >= 70) {
        content += "\n👍 IP较为纯净，一般使用无问题";
    } else if (purityScore >= 50) {
        content += "\n⚠️ IP纯净度一般，可能存在限制";
    } else {
        content += "\n❌ IP纯净度较差，不推荐重要用途";
    }

    // 构造面板对象
    const panel = {
        title: title,
        content: content,
        subtitle: subtitle,
        icon: purityScore >= 85 ? "checkmark.shield.fill" : 
              purityScore >= 70 ? "exclamationmark.shield.fill" : "xmark.shield.fill",
        "icon-color": purityScore >= 85 ? "#00FF00" : 
                     purityScore >= 70 ? "#FFFF00" : "#FF0000"
    };
    
    $.log(JSON.stringify(panel));
    $.notify(panel.title, panel.subtitle, panel.content);
    $.done(panel);
}

// 环境兼容封装
function Env(name) {
    this.name = name;
    this.isLoon = () => typeof $loon !== "undefined";
    this.isQuanX = () => typeof $task !== "undefined";
    this.isSurge = () => typeof $httpClient !== "undefined" && !this.isLoon();
    this.isStash = () => typeof $environment !== "undefined" && $environment['stash'];
    
    this.http = {
        get: (options) => {
            return new Promise((resolve, reject) => {
                if (this.isQuanX()) {
                    $task.fetch(options).then(resp => resolve(resp), reject);
                } else if (this.isLoon() || this.isSurge() || this.isStash()) {
                    $httpClient.get(options, (err, resp, body) => {
                        if (err) reject(err);
                        else resolve({ status: resp.status || 200, body });
                    });
                }
            });
        }
    };
    
    this.log = (msg) => console.log(`${this.name}: ${msg}`);
    this.logErr = (err) => console.error(`${this.name}: 错误: ${err}`);
    this.notify = (title, subtitle, message) => {
        if (this.isQuanX()) $notify(title, subtitle, message);
        if (this.isLoon() || this.isSurge() || this.isStash()) $notification.post(title, subtitle, message);
    };
    this.done = (value = {}) => {
        if (this.isQuanX()) $done(value);
        if (this.isLoon() || this.isSurge() || this.isStash()) $done(value);
    };
}
