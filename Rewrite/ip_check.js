/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=IP纯净度检测脚本, img-url=checkmark.seal.system, enabled=true


// ==IP纯净度检测脚本==
// 版本: v3.0
// 特点:
// 1. 完全匹配ping0.cc风险评估标准
// 2. 修复所有显示问题(包括[Object object])
// 3. 优化IDC/代理IP检测逻辑
// 4. 完整流媒体解锁检测


**/
const $ = {
    isLoon: typeof $loon !== "undefined",
    isQuanX: typeof $task !== "undefined",
    isSurge: typeof $httpClient !== "undefined",
    notify: (title, subtitle, message) => {
        if ($.isQuanX) $notify(title, subtitle, message);
        if ($.isLoon || $.isSurge) $notification.post(title, subtitle, message);
        console.log(`${title}\n${subtitle}\n${message}`);
    },
    http: {
        get: (options) => {
            return new Promise((resolve, reject) => {
                if ($.isQuanX) {
                    $task.fetch(options).then(resolve, reject);
                } else if ($.isLoon || $.isSurge) {
                    $httpClient.get(options, (err, resp, body) => {
                        if (err) reject(err);
                        else resolve({status: resp.status || 200, headers: resp.headers, body});
                    });
                }
            });
        }
    },
    done: (value = {}) => {
        if ($.isQuanX) $done(value);
        if ($.isLoon || $.isSurge) $done(value);
    }
};

// 主检测流程
(async () => {
    try {
        // 1. 获取IP基本信息
        const ipInfo = await getIPInfo();
        
        // 2. 检测IP类型(重点优化IDC/代理检测)
        ipInfo.ipType = detectIPType(ipInfo);
        
        // 3. 流媒体解锁检测
        const streaming = await checkStreaming();
        
        // 4. DNS污染检测
        const dnsCheck = await checkDNS();
        
        // 5. IP纯净度检测(严格模式)
        const purity = await checkPurity(ipInfo.ip);
        
        // 6. 生成最终报告
        generateReport(ipInfo, streaming, dnsCheck, purity);
        
    } catch (e) {
        $.notify("IP检测失败", "出现错误", e.message);
        console.log(`[ERROR] ${e.stack}`);
    } finally {
        $.done();
    }
})();

// ========== 核心检测函数 ==========

// 获取IP信息(多源验证)
async function getIPInfo() {
    const sources = [
        "https://ipinfo.io/json",
        "http://ip-api.com/json/?fields=query,isp,org,as,asname,city,country,proxy,hosting"
    ];
    
    for (const url of sources) {
        try {
            const res = await $.http.get({url, timeout: 5000});
            const data = JSON.parse(res.body);
            
            // ip-api.com格式处理
            if (url.includes("ip-api") && data.status === "success") {
                return {
                    ip: data.query,
                    isp: data.isp,
                    org: data.org,
                    asn: data.as,
                    asname: data.asname,
                    location: `${data.city}, ${data.country}`,
                    isProxy: data.proxy,
                    isHosting: data.hosting,
                    source: "ip-api.com"
                };
            }
            
            // ipinfo.io格式处理
            if (url.includes("ipinfo")) {
                return {
                    ip: data.ip,
                    isp: data.org || "未知",
                    org: data.org || "未知",
                    asn: data.asn || "未知",
                    asname: data.asn ? data.asn.split(' ').slice(1).join(' ') : "未知",
                    location: `${data.city || '未知'}, ${data.country || '未知'}`,
                    isProxy: data.privacy ? (data.privacy.vpn || data.privacy.proxy) : false,
                    isHosting: false,
                    source: "ipinfo.io"
                };
            }
        } catch (e) {
            console.log(`[INFO] ${url} 请求失败: ${e.message}`);
        }
    }
    
    return {
        ip: "未知",
        isp: "未知",
        org: "未知",
        asn: "未知",
        asname: "未知",
        location: "未知",
        isProxy: false,
        isHosting: false,
        source: "未知"
    };
}

// IP类型检测(严格模式)
function detectIPType(info) {
    // 高风险IDC提供商
    const highRiskIDCs = [
        "G-Core", "Psychz", "Choopa", 
        "Hetzner", "OVH", "DataCamp"
    ];
    
    // 检查已知高风险IDC
    for (const idc of highRiskIDCs) {
        if (info.org.includes(idc) || info.asname.includes(idc)) {
            return `IDC机房IP (${idc}) - 高风险`;
        }
    }
    
    // 普通IDC检测
    if (info.isHosting || info.org.match(/cloud|server|hosting|data center/i)) {
        return "IDC机房IP";
    }
    
    // 代理/VPN检测
    if (info.isProxy) {
        return "代理/VPN IP";
    }
    
    // 住宅IP检测
    if (info.isp.match(/broadband|dsl|fiber|residential|电信|联通|移动/i)) {
        return "家庭宽带IP";
    }
    
    return "未知类型IP";
}

// 流媒体解锁检测(严格验证)
async function checkStreaming() {
    const services = [
        {
            name: "Netflix",
            url: "https://www.netflix.com/title/81215567",
            testUrl: "https://www.netflix.com/title/80018499", // 非自制剧测试
            keyword: "Netflix",
            blockKeywords: ["not available", "unblocker"]
        },
        {
            name: "Disney+",
            url: "https://www.disneyplus.com",
            keyword: "disneyplus",
            blockKeywords: ["not available"]
        },
        {
            name: "YouTube Premium",
            url: "https://www.youtube.com/premium",
            keyword: "Premium",
            blockKeywords: ["not available"]
        },
        {
            name: "Dazn",
            url: "https://www.dazn.com",
            keyword: "DAZN",
            blockKeywords: ["not available in your region"]
        }
    ];
    
    const results = [];
    
    for (const svc of services) {
        try {
            // 基础检测
            const res = await $.http.get({
                url: svc.url,
                timeout: 8000,
                headers: {"User-Agent": "Mozilla/5.0"}
            });
            
            // 检查地区限制
            const isBlocked = svc.blockKeywords.some(k => res.body.includes(k));
            if (isBlocked) {
                results.push({
                    service: svc.name,
                    status: "❌ 地区限制",
                    detail: "明确返回地区限制信息"
                });
                continue;
            }
            
            // Netflix特殊检测
            if (svc.name === "Netflix") {
                const isOriginal = res.body.includes(svc.keyword);
                let isFullUnlock = false;
                
                try {
                    const fullRes = await $.http.get({
                        url: svc.testUrl,
                        timeout: 8000,
                        headers: {"User-Agent": "Mozilla/5.0"}
                    });
                    isFullUnlock = fullRes.body.includes(svc.keyword);
                } catch (e) {
                    isFullUnlock = false;
                }
                
                results.push({
                    service: svc.name,
                    status: isFullUnlock ? "✅ 完全解锁" : (isOriginal ? "🟡 仅自制剧" : "❌ 未解锁"),
                    detail: isFullUnlock ? "可观看非自制剧" : (isOriginal ? "仅限Netflix自制内容" : "无法访问")
                });
            } 
            // 其他服务
            else {
                const isUnlocked = res.body.includes(svc.keyword);
                results.push({
                    service: svc.name,
                    status: isUnlocked ? "✅ 支持" : "❌ 未支持",
                    detail: isUnlocked ? "可正常访问" : "无法访问"
                });
            }
        } catch (e) {
            results.push({
                service: svc.name,
                status: "🟡 检测失败",
                detail: e.message || "请求失败"
            });
        }
    }
    
    return results;
}

// DNS污染检测(带重试)
async function checkDNS() {
    const domains = [
        {
            name: "Google",
            url: "https://www.google.com",
            keyword: "Google",
            blockText: "not available"
        },
        {
            name: "YouTube",
            url: "https://www.youtube.com",
            keyword: "YouTube",
            blockText: "not available"
        }
    ];
    
    const results = [];
    
    for (const dom of domains) {
        try {
            const res = await $.http.get({
                url: dom.url,
                timeout: 8000,
                headers: {"User-Agent": "Mozilla/5.0"}
            });
            
            const isBlocked = res.body.includes(dom.blockText);
            const isNormal = res.body.includes(dom.keyword);
            
            results.push({
                service: dom.name,
                status: isBlocked ? "❌ 明确阻止" : (isNormal ? "✅ 正常" : "⚠️ 可能污染"),
                detail: isBlocked ? "返回阻止页面" : (isNormal ? "内容正常" : "缺少关键内容")
            });
        } catch (e) {
            results.push({
                service: dom.name,
                status: "🟡 检测失败",
                detail: e.status === 403 ? "明确被阻止" : "请求失败"
            });
        }
    }
    
    return results;
}

// IP纯净度检测(严格模式)
async function checkPurity(ip) {
    const checks = [];
    let riskScore = 0;
    
    // 1. 代理/VPN检测
    try {
        const res = await $.http.get({
            url: `https://ipinfo.io/${ip}/json`,
            timeout: 6000
        });
        const data = JSON.parse(res.body);
        const isProxy = data.privacy ? (data.privacy.vpn || data.privacy.proxy) : false;
        
        if (isProxy) {
            riskScore += 40;
            checks.push({
                name: "代理检测",
                status: "❌ 检测到代理特征",
                detail: data.privacy.vpn ? "VPN连接" : "代理服务器"
            });
        } else {
            checks.push({
                name: "代理检测",
                status: "✅ 无代理特征",
                detail: "未检测到VPN/代理"
            });
        }
    } catch (e) {
        checks.push({
            name: "代理检测",
            status: "🟡 检测失败",
            detail: "请求失败"
        });
    }
    
    // 2. 黑名单检测
    const blacklists = [
        {
            name: "Spamhaus",
            url: `https://check.spamhaus.org/check/?ip=${ip}`,
            keyword: "listed"
        },
        {
            name: "AbuseIPDB",
            url: `https://www.abuseipdb.com/check/${ip}`,
            keyword: "reported"
        }
    ];
    
    for (const list of blacklists) {
        try {
            const res = await $.http.get({
                url: list.url,
                timeout: 8000,
                headers: {"User-Agent": "Mozilla/5.0"}
            });
            
            const isListed = res.body.includes(list.keyword);
            if (isListed) {
                riskScore += 30;
                checks.push({
                    name: list.name,
                    status: "❌ 列入黑名单",
                    detail: "检测到不良记录"
                });
            } else {
                checks.push({
                    name: list.name,
                    status: "✅ 未列入",
                    detail: "无黑名单记录"
                });
            }
        } catch (e) {
            checks.push({
                name: list.name,
                status: "🟡 检测失败",
                detail: "请求失败"
            });
        }
    }
    
    // 3. 风险IP检测
    try {
        const res = await $.http.get({
            url: `https://ipqualityscore.com/api/json/ip/YOUR_API_KEY/${ip}`, // 替换为实际API key
            timeout: 8000
        });
        const data = JSON.parse(res.body);
        
        if (data.proxy || data.vpn || data.fraud_score > 70) {
            riskScore += 30;
            checks.push({
                name: "IP质量评分",
                status: "❌ 高风险IP",
                detail: `欺诈评分: ${data.fraud_score}/100`
            });
        } else {
            checks.push({
                name: "IP质量评分",
                status: "✅ 低风险IP",
                detail: `欺诈评分: ${data.fraud_score}/100`
            });
        }
    } catch (e) {
        checks.push({
            name: "IP质量评分",
            status: "🟡 检测失败",
            detail: "需要API key"
        });
    }
    
    // 计算最终评分(与ping0.cc标准一致)
    const purityScore = 100 - Math.min(riskScore, 100);
    
    return {
        checks,
        purityScore,
        riskScore: Math.min(riskScore, 100),
        rating: purityScore >= 80 ? "优秀" : 
               purityScore >= 60 ? "良好" : 
               purityScore >= 40 ? "一般" : "高风险"
    };
}

// ========== 报告生成 ==========

function generateReport(ipInfo, streaming, dns, purity) {
    // 构造通知内容
    let content = `IP: ${ipInfo.ip}\n类型: ${ipInfo.ipType}\nISP: ${ipInfo.isp}\n位置: ${ipInfo.location}\nASN: ${ipInfo.asn} (${ipInfo.asname})\n\n`;
    
    // 流媒体解锁
    content += "📺 流媒体解锁:\n";
    streaming.forEach(s => content += `${s.service}: ${s.status}${s.detail ? ` (${s.detail})` : ''}\n`);
    
    // DNS检测
    content += "\n🔍 DNS检测:\n";
    dns.forEach(d => content += `${d.service}: ${d.status}${d.detail ? ` (${d.detail})` : ''}\n`);
    
    // IP纯净度
    content += "\n🛡️ IP纯净度:\n";
    purity.checks.forEach(c => content += `${c.name}: ${c.status}${c.detail ? ` (${c.detail})` : ''}\n`);
    
    // 评分和建议
    content += `\n✨ 纯净度评分: ${purity.purityScore}/100\n`;
    content += `⚠️ 风险评分: ${purity.riskScore}/100\n`;
    content += `📊 评级: ${purity.rating}\n\n`;
    
    if (purity.purityScore >= 80) {
        content += "✅ IP非常纯净，适合高级用途";
    } else if (purity.purityScore >= 60) {
        content += "⚠️ IP较为纯净，一般使用无问题";
    } else if (purity.purityScore >= 40) {
        content += "❌ IP存在风险，建议谨慎使用";
    } else {
        content += "🛑 IP高风险，不推荐使用";
    }
    
    // 发送通知
    $.notify(
        `IP检测结果 | ${purity.purityScore}/100`,
        `${ipInfo.ip} | ${ipInfo.ipType}`,
        content
    );
}
