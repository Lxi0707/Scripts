/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=ip, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本 v2.1
// 改进内容：
// 1. 完全重写通知系统，确保显示弹窗
// 2. 保持原有的IP类型和纯净度检测功能
// 3. 优化显示格式


**/
const $ = new Env('IP纯净度检测');

(async () => {
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
        
        // 检测IP纯净度
        const ipPurityResults = await checkIPPurity(networkInfo.ip);
        
        // 生成检测报告
        await generatePanel(networkInfo, streamingResults, dnsResults, ipPurityResults);
        
    } catch (e) {
        $.logErr(e);
    } finally {
        $.done();
    }
})();

// 获取当前网络信息
async function getNetworkInfo() {
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
            isHosting: data.hosting
        };
    }
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
        isHosting: false
    };
}

// 检测IP类型(家宽/IDC)
async function detectIPType(networkInfo) {
    const hostingKeywords = ["hosting", "data center", "server", "cloud", "idc", "colo", "digitalocean", "linode", "vultr", "aws", "google cloud", "azure", "alibaba", "tencent cloud", "oracle cloud"];
    const ispLower = networkInfo.isp.toLowerCase();
    const orgLower = networkInfo.org.toLowerCase();
    
    if (networkInfo.isHosting) return "IDC机房IP";
    
    for (const keyword of hostingKeywords) {
        if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
            return "IDC机房IP";
        }
    }
    
    const residentialKeywords = ["communications", "telecom", "broadband", "cable", "dsl", "fiber", "residential", "home", "isp"];
    for (const keyword of residentialKeywords) {
        if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
            return "家庭宽带IP";
        }
    }
    
    if (networkInfo.isMobile) return "移动网络IP";
    
    return "IDC机房IP(可能)";
}

// 检测流媒体解锁情况
async function checkStreamingServices() {
    const services = [
        { name: "Netflix", url: "https://www.netflix.com/title/81215567", keyword: "NETFLIX", checkFull: true },
        { name: "Disney+", url: "https://www.disneyplus.com", keyword: "disneyplus" },
        { name: "YouTube Premium", url: "https://www.youtube.com/premium", keyword: "Premium" },
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
                const isFullUnlock = resp.body.includes(service.keyword) && !resp.body.includes("You seem to be using an unblocker");
                status = isFullUnlock ? "✅ 完全解锁" : "🟡 仅自制剧";
            } else {
                const isUnlocked = resp.body.includes(service.keyword) || resp.status === 200;
                status = isUnlocked ? "✅ 支持" : "❌ 未支持";
            }
            
            results.push({
                name: service.name,
                status: status
            });
        } catch (error) {
            results.push({
                name: service.name,
                status: "❌ 检测失败"
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
        { domain: "www.youtube.com", expected: "YouTube" }
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
                status: isContaminated ? "❌ 可能污染" : "✅ 正常"
            });
        } catch (error) {
            results.push({
                domain: test.domain,
                status: "🟡 检测失败"
            });
        }
    }
    
    return results;
}

// 检测IP纯净度
async function checkIPPurity(ip) {
    const blacklistChecks = [
        { name: "Spamhaus", url: `https://check.spamhaus.org/check/?ip=${ip}` },
        { name: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${ip}` }
    ];
    
    const results = [];
    let blacklistCount = 0;
    
    for (const check of blacklistChecks) {
        try {
            const resp = await $.http.get({ 
                url: check.url,
                timeout: 8000
            });
            
            const body = resp.body.toLowerCase();
            let isListed = false;
            
            if (check.name === "Spamhaus") {
                isListed = body.includes("listed") || body.includes("found in");
            } else if (check.name === "AbuseIPDB") {
                isListed = body.includes("reported") || body.includes("abuse");
            }
            
            if (isListed) blacklistCount++;
            results.push({
                service: check.name,
                status: isListed ? "❌ 列入黑名单" : "✅ 未列入"
            });
        } catch (error) {
            results.push({
                service: check.name,
                status: "🟡 检测失败"
            });
        }
    }
    
    const proxyCheck = await checkProxyFeatures(ip);
    if (proxyCheck.isProxy) blacklistCount++;
    results.push({
        service: "代理检测",
        status: proxyCheck.isProxy ? "❌ 代理/VPN" : "✅ 无代理特征"
    });
    
    const totalChecks = results.length;
    const riskPercentage = Math.round((blacklistCount / totalChecks) * 100);
    const purityScore = 100 - riskPercentage;
    
    return {
        results: results,
        purityScore: purityScore,
        riskPercentage: riskPercentage
    };
}

// 检查代理/VPN特征
async function checkProxyFeatures(ip) {
    try {
        const resp = await $.http.get({
            url: `https://ipinfo.io/${ip}/json`,
            timeout: 5000
        });
        
        const data = JSON.parse(resp.body);
        const isProxy = data.privacy && (data.privacy.vpn || data.privacy.proxy || data.privacy.tor);
        
        return {
            isProxy: isProxy,
            details: data.privacy || {}
        };
    } catch (error) {
        return {
            isProxy: false,
            details: {}
        };
    }
}

// 生成面板信息
async function generatePanel(networkInfo, streamingResults, dnsResults, ipPurityResults) {
    // 构造通知内容
    let content = "";
    
    // 不同客户端显示不同格式
    if ($.isLoon() || $.isQuanX()) {
        content = `IP: ${networkInfo.ip}\n类型: ${networkInfo.ipType}\nISP: ${networkInfo.isp}\n位置: ${networkInfo.location}\n\n`;
        content += "📺 流媒体解锁:\n";
        streamingResults.forEach(s => content += `${s.name}: ${s.status}\n`);
        content += "\n🔍 DNS检测:\n";
        dnsResults.forEach(d => content += `${d.domain}: ${d.status}\n`);
        content += "\n🛡️ 纯净度:\n";
        ipPurityResults.results.forEach(r => content += `${r.service}: ${r.status}\n`);
        content += `\n✨ 纯净度评分: ${ipPurityResults.purityScore}/100\n`;
    } else if ($.isSurge() || $.isStash()) {
        content = `IP: ${networkInfo.ip} (${networkInfo.ipType})\n`;
        content += `ISP: ${networkInfo.isp}\n位置: ${networkInfo.location}\n\n`;
        content += "流媒体解锁:\n";
        streamingResults.forEach(s => content += `${s.name}: ${s.status}\n`);
        content += "\nDNS检测:\n";
        dnsResults.forEach(d => content += `${d.domain}: ${d.status}\n`);
        content += "\n纯净度检测:\n";
        ipPurityResults.results.forEach(r => content += `${r.service}: ${r.status}\n`);
        content += `\n纯净度评分: ${ipPurityResults.purityScore}/100`;
    }
    
    // 构造面板对象
    const panel = {
        title: `IP检测 | ${ipPurityResults.purityScore}/100`,
        content: content,
        icon: ipPurityResults.purityScore >= 70 ? "checkmark.seal.fill" : "exclamationmark.triangle.fill",
        "icon-color": ipPurityResults.purityScore >= 70 ? "#00FF00" : "#FF0000"
    };
    
    // 如果是Loon或Quantumult X，使用message字段
    if ($.isLoon() || $.isQuanX()) {
        panel.message = content;
    }
    
    $.log(JSON.stringify(panel));
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
    this.done = (value = {}) => {
        if (this.isQuanX()) $done(value);
        if (this.isLoon() || this.isSurge() || this.isStash()) $done(value);
    };
}
