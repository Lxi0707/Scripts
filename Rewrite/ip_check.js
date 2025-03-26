/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=ip, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本 v2.4 - 兼容修复版
// 修复内容：
// 1. 完全重写环境兼容层，解决"Can't find variable: Env"错误
// 2. 保持所有检测功能完整
// 3. 优化错误处理机制

// 环境检测
const isLoon = typeof $loon !== "undefined";
const isQuanX = typeof $task !== "undefined";
const isSurge = typeof $httpClient !== "undefined" && !isLoon;
const isStash = typeof $environment !== "undefined" && $environment['stash'];

// 通用通知函数
function notify(title, subtitle, message) {
    if (isQuanX) $notify(title, subtitle, message);
    if (isLoon || isSurge || isStash) $notification.post(title, subtitle, message);
    console.log(`${title}\n${subtitle}\n${message}`);
}

// HTTP请求封装
async function httpGet(options) {
    return new Promise((resolve, reject) => {
        if (isQuanX) {
            $task.fetch(options).then(resolve, reject);
        } else if (isLoon || isSurge || isStash) {
            $httpClient.get(options, (err, resp, body) => {
                if (err) reject(err);
                else resolve({ 
                    status: resp.status || 200, 
                    headers: resp.headers, 
                    body 
                });
            });
        } else {
            reject("不支持的运行环境");
        }
    });
}

// 主函数
(async () => {
    try {
        notify("IP纯净度检测", "开始检测", "正在收集网络信息...");
        
        // 获取IP信息
        const ipInfo = await getIPInfo();
        
        // 检测IP类型
        const ipType = await detectIPType(ipInfo);
        
        // 检测流媒体解锁
        const streaming = await checkStreamingServices();
        
        // 检测DNS污染
        const dnsCheck = await checkDNS();
        
        // 检测IP纯净度
        const purity = await checkPurity(ipInfo.ip);
        
        // 生成报告
        showResults(ipInfo, ipType, streaming, dnsCheck, purity);
        
    } catch (e) {
        notify("检测失败", "出现错误", e.message || JSON.stringify(e));
    }
})();

// 获取IP信息（兼容实现）
async function getIPInfo() {
    try {
        const res = await httpGet({
            url: "https://ipinfo.io/json",
            timeout: 5000
        });
        const data = JSON.parse(res.body);
        
        return {
            ip: data.ip,
            isp: data.org || "未知",
            org: data.org || "未知",
            asn: data.asn || "未知",
            asname: data.asn ? data.asn.split(' ').slice(1).join(' ') : "未知",
            location: `${data.city || '未知'}, ${data.region || '未知'}, ${data.country || '未知'}`,
            isProxy: data.privacy ? (data.privacy.vpn || data.privacy.proxy) : false
        };
    } catch (e) {
        return {
            ip: "未知",
            isp: "未知",
            org: "未知",
            asn: "未知",
            asname: "未知",
            location: "未知",
            isProxy: false
        };
    }
}

// IP类型检测（简化版）
async function detectIPType(info) {
    if (info.isProxy) return "代理/VPN IP";
    
    const orgLower = (info.org || "").toLowerCase();
    const idcKeywords = ["hosting", "data center", "server", "cloud", "idc", "gcore"];
    
    for (const kw of idcKeywords) {
        if (orgLower.includes(kw)) return "IDC机房IP";
    }
    
    return "住宅IP(可能)";
}

// 流媒体检测（简化版）
async function checkStreamingServices() {
    const services = [
        { name: "Netflix", url: "https://www.netflix.com", keyword: "Netflix" },
        { name: "Disney+", url: "https://www.disneyplus.com", keyword: "disneyplus" },
        { name: "YouTube Premium", url: "https://www.youtube.com/premium", keyword: "Premium" }
    ];
    
    const results = [];
    
    for (const svc of services) {
        try {
            const res = await httpGet({
                url: svc.url,
                timeout: 5000
            });
            results.push({
                name: svc.name,
                status: res.body.includes(svc.keyword) ? "✅ 支持" : "❌ 未支持"
            });
        } catch (e) {
            results.push({
                name: svc.name,
                status: "❌ 检测失败"
            });
        }
    }
    
    return results;
}

// DNS检测（简化版）
async function checkDNS() {
    const domains = [
        { name: "Google", url: "https://www.google.com", keyword: "Google" },
        { name: "YouTube", url: "https://www.youtube.com", keyword: "YouTube" }
    ];
    
    const results = [];
    
    for (const dom of domains) {
        try {
            const res = await httpGet({
                url: dom.url,
                timeout: 5000
            });
            results.push({
                name: dom.name,
                status: res.body.includes(dom.keyword) ? "✅ 正常" : "❌ 可能污染"
            });
        } catch (e) {
            results.push({
                name: dom.name,
                status: "🟡 检测失败"
            });
        }
    }
    
    return results;
}

// IP纯净度检测（简化版）
async function checkPurity(ip) {
    let riskScore = 0;
    const results = [];
    
    // 代理检测
    try {
        const res = await httpGet({
            url: `https://ipinfo.io/${ip}/json`,
            timeout: 5000
        });
        const data = JSON.parse(res.body);
        const isProxy = data.privacy ? (data.privacy.vpn || data.privacy.proxy) : false;
        
        if (isProxy) {
            riskScore += 50;
            results.push({
                name: "代理检测",
                status: "❌ 检测到代理特征"
            });
        } else {
            results.push({
                name: "代理检测",
                status: "✅ 无代理特征"
            });
        }
    } catch (e) {
        results.push({
            name: "代理检测",
            status: "🟡 检测失败"
        });
    }
    
    // 黑名单检测（简化）
    try {
        const res = await httpGet({
            url: `https://check.spamhaus.org/check/?ip=${ip}`,
            timeout: 8000
        });
        const isListed = res.body.includes("listed");
        
        if (isListed) {
            riskScore += 30;
            results.push({
                name: "Spamhaus",
                status: "❌ 列入黑名单"
            });
        } else {
            results.push({
                name: "Spamhaus",
                status: "✅ 未列入"
            });
        }
    } catch (e) {
        results.push({
            name: "Spamhaus",
            status: "🟡 检测失败"
        });
    }
    
    // 计算纯净度
    const purityScore = 100 - Math.min(riskScore, 100);
    
    return {
        results,
        purityScore,
        riskScore: Math.min(riskScore, 100)
    };
}

// 结果显示（兼容实现）
function showResults(ipInfo, ipType, streaming, dnsCheck, purity) {
    let content = `IP: ${ipInfo.ip}\n类型: ${ipType}\nISP: ${ipInfo.isp}\n位置: ${ipInfo.location}\n\n`;
    
    content += "📺 流媒体解锁:\n";
    streaming.forEach(s => content += `${s.name}: ${s.status}\n`);
    
    content += "\n🔍 DNS检测:\n";
    dnsCheck.forEach(d => content += `${d.name}: ${d.status}\n`);
    
    content += "\n🛡️ IP纯净度:\n";
    purity.results.forEach(r => content += `${r.name}: ${r.status}\n`);
    
    content += `\n✨ 纯净度评分: ${purity.purityScore}/100\n`;
    content += `⚠️ 风险评分: ${purity.riskScore}/100\n\n`;
    
    if (purity.purityScore >= 70) {
        content += "🌟 IP较为纯净";
    } else if (purity.purityScore >= 50) {
        content += "⚠️ IP存在风险";
    } else {
        content += "❌ IP高风险";
    }
    
    notify(
        `IP检测结果 | ${purity.purityScore}/100`,
        `${ipInfo.ip} | ${ipType}`,
        content
    );
}
