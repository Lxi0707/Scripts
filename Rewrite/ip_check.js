/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=ip, img-url=checkmark.seal.system, enabled=true


/**
 * IP纯净度检测脚本 - 完整版
 * 功能：检测IP类型、流媒体解锁、DNS污染和IP纯净度
 * 兼容：Quantumult X, Loon, Surge
 * 版本：v2.5
 **/

// ==============================================
// 环境检测和基础函数
// ==============================================

// 检测运行环境
const isLoon = typeof $loon !== "undefined";
const isQuanX = typeof $task !== "undefined";
const isSurge = typeof $httpClient !== "undefined" && !isLoon;
const isStash = typeof $environment !== "undefined" && $environment['stash'];

// 通知函数
function notify(title, subtitle, content) {
    if (isQuanX) $notify(title, subtitle, content);
    if (isLoon || isSurge || isStash) $notification.post(title, subtitle, content);
    console.log(`[通知] ${title} - ${subtitle}\n${content}`);
}

// HTTP请求函数
async function httpRequest(options) {
    return new Promise((resolve, reject) => {
        if (isQuanX) {
            options.method = options.method || "GET";
            $task.fetch(options).then(resolve, reject);
        } else if (isLoon || isSurge || isStash) {
            $httpClient[options.method.toLowerCase() || "get"](options, (err, resp, body) => {
                if (err) reject(err);
                else resolve({
                    status: resp.status || 200,
                    headers: resp.headers,
                    body
                });
            });
        } else {
            reject(new Error("不支持的运行环境"));
        }
    });
}

// 休眠函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==============================================
// 主要检测功能
// ==============================================

/**
 * 获取IP基本信息
 */
async function getIPInfo() {
    const endpoints = [
        "https://ipinfo.io/json",
        "http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query,mobile,proxy,hosting",
        "https://api.ip.sb/geoip"
    ];

    for (const url of endpoints) {
        try {
            const res = await httpRequest({
                url,
                timeout: 5000
            });
            const data = JSON.parse(res.body);

            // ip-api.com格式处理
            if (url.includes("ip-api.com") && data.status === "success") {
                return {
                    ip: data.query,
                    isp: data.isp,
                    org: data.org,
                    asn: data.as,
                    asname: data.asname,
                    location: `${data.city}, ${data.regionName}, ${data.country}`,
                    coordinates: data.lat && data.lon ? `${data.lat}, ${data.lon}` : "未知",
                    isMobile: data.mobile,
                    isProxy: data.proxy,
                    isHosting: data.hosting,
                    source: "ip-api.com"
                };
            }

            // ipinfo.io格式处理
            if (url.includes("ipinfo.io")) {
                return {
                    ip: data.ip,
                    isp: data.org || "未知",
                    org: data.org || "未知",
                    asn: data.asn || "未知",
                    asname: data.asn ? data.asn.split(' ').slice(1).join(' ') : "未知",
                    location: `${data.city || '未知'}, ${data.region || '未知'}, ${data.country || '未知'}`,
                    coordinates: data.loc || "未知",
                    isProxy: data.privacy ? (data.privacy.vpn || data.privacy.proxy) : false,
                    isHosting: data.hosting || false,
                    source: "ipinfo.io"
                };
            }

            // ip.sb格式处理
            if (url.includes("ip.sb")) {
                return {
                    ip: data.ip || "未知",
                    isp: data.isp || "未知",
                    org: data.organization || "未知",
                    asn: data.asn || "未知",
                    asname: data.asn ? data.asn.split(' ').slice(1).join(' ') : "未知",
                    location: `${data.city || '未知'}, ${data.region || '未知'}, ${data.country || '未知'}`,
                    coordinates: data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : "未知",
                    isProxy: data.is_proxy || false,
                    isHosting: data.is_hosting || false,
                    source: "ip.sb"
                };
            }
        } catch (e) {
            console.log(`[IP信息] ${url} 请求失败: ${e.message}`);
            await sleep(1000); // 请求间隔
        }
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
        isHosting: false,
        source: "未知"
    };
}

/**
 * 检测IP类型（增强版）
 */
async function detectIPType(ipInfo) {
    // 已知IDC提供商列表
    const idcProviders = [
        "G-Core", "DigitalOcean", "Linode", "Vultr", 
        "AWS", "Google Cloud", "Azure", "Alibaba",
        "Tencent Cloud", "Oracle Cloud", "Hetzner",
        "OVH", "Psychz", "Choopa", "ReliableSite"
    ];

    // 已知住宅ISP关键词
    const residentialKeywords = [
        "Communications", "Telecom", "Broadband", 
        "Cable", "DSL", "Fiber", "Residential",
        "Home", "ISP", "联通", "电信", "移动", "广电"
    ];

    // 检查是否已知IDC
    for (const provider of idcProviders) {
        if (ipInfo.org.includes(provider) || ipInfo.asname.includes(provider)) {
            return `IDC机房IP (${provider})`;
        }
    }

    // 检查是否住宅IP
    const orgLower = ipInfo.org.toLowerCase();
    for (const keyword of residentialKeywords.map(k => k.toLowerCase())) {
        if (orgLower.includes(keyword)) {
            return "家庭宽带IP";
        }
    }

    // 根据其他特征判断
    if (ipInfo.isProxy) return "代理/VPN IP";
    if (ipInfo.isMobile) return "移动网络IP";
    if (ipInfo.isHosting) return "IDC机房IP";

    return "未知类型IP";
}

/**
 * 流媒体解锁检测（严格模式）
 */
async function checkStreamingServices() {
    const services = [
        {
            name: "Netflix",
            url: "https://www.netflix.com/title/81215567",
            testUrl: "https://www.netflix.com/title/80018499",
            keyword: "Netflix",
            blockedKeywords: ["not available", "unavailable in your region"]
        },
        {
            name: "Disney+",
            url: "https://www.disneyplus.com",
            keyword: "disneyplus",
            blockedKeywords: ["not available", "unavailable in your region"]
        },
        {
            name: "YouTube Premium",
            url: "https://www.youtube.com/premium",
            keyword: "Premium",
            blockedKeywords: ["not available", "unavailable in your region"]
        },
        {
            name: "Dazn",
            url: "https://www.dazn.com",
            keyword: "DAZN",
            blockedKeywords: ["not available in your region"]
        },
        {
            name: "ChatGPT",
            url: "https://chat.openai.com",
            keyword: "ChatGPT",
            blockedKeywords: ["not available"]
        }
    ];

    const results = [];
    
    for (const service of services) {
        try {
            // 基础检测
            const res = await httpRequest({
                url: service.url,
                timeout: 8000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });

            // 检查是否被明确阻止
            const isBlocked = service.blockedKeywords.some(k => res.body.includes(k));
            if (isBlocked) {
                results.push({
                    name: service.name,
                    status: "❌ 地区限制",
                    details: "服务在此地区不可用"
                });
                continue;
            }

            // Netflix特殊检测
            if (service.name === "Netflix") {
                const isOriginal = res.body.includes(service.keyword);
                
                // 检测非自制剧
                let isFullUnlock = false;
                try {
                    const fullRes = await httpRequest({
                        url: service.testUrl,
                        timeout: 8000,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                        }
                    });
                    isFullUnlock = fullRes.body.includes(service.keyword);
                } catch (e) {
                    isFullUnlock = false;
                }

                results.push({
                    name: service.name,
                    status: isFullUnlock ? "✅ 完全解锁" : (isOriginal ? "🟡 仅自制剧" : "❌ 未解锁"),
                    details: isFullUnlock ? "可观看非自制剧" : (isOriginal ? "只能观看Netflix自制内容" : "无法访问Netflix")
                });
            } 
            // 其他服务
            else {
                const isUnlocked = res.body.includes(service.keyword);
                results.push({
                    name: service.name,
                    status: isUnlocked ? "✅ 支持" : "❌ 未支持",
                    details: isUnlocked ? "可正常访问" : "无法访问或地区限制"
                });
            }
        } catch (error) {
            results.push({
                name: service.name,
                status: "❌ 检测失败",
                details: error.message || "请求失败"
            });
        }
        
        await sleep(500); // 请求间隔
    }
    
    return results;
}

/**
 * DNS污染检测（带重试）
 */
async function checkDNS() {
    const testDomains = [
        {
            name: "Google",
            url: "https://www.google.com",
            keywords: ["Google", "google.com"],
            blockedKeywords: ["not available", "blocked", "restricted"]
        },
        {
            name: "YouTube",
            url: "https://www.youtube.com",
            keywords: ["YouTube", "youtube.com"],
            blockedKeywords: ["not available", "blocked", "restricted"]
        },
        {
            name: "Facebook",
            url: "https://www.facebook.com",
            keywords: ["Facebook", "facebook.com"],
            blockedKeywords: ["not available", "blocked", "restricted"]
        }
    ];

    const results = [];
    
    for (const domain of testDomains) {
        let retry = 0;
        let success = false;
        
        while (retry < 2 && !success) {
            try {
                const res = await httpRequest({
                    url: domain.url,
                    timeout: 8000,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }
                });

                // 检查是否被明确阻止
                const isBlocked = domain.blockedKeywords.some(k => res.body.includes(k));
                if (isBlocked) {
                    results.push({
                        name: domain.name,
                        status: "❌ 明确阻止",
                        details: "返回了阻止页面"
                    });
                    success = true;
                    continue;
                }

                // 检查是否包含预期关键词
                const hasKeyword = domain.keywords.some(k => res.body.includes(k));
                results.push({
                    name: domain.name,
                    status: hasKeyword ? "✅ 正常" : "❌ 可能污染",
                    details: hasKeyword ? "返回内容正常" : "缺少预期内容"
                });
                success = true;
            } catch (error) {
                if (retry === 1) {
                    results.push({
                        name: domain.name,
                        status: "🟡 检测失败",
                        details: error.status === 403 ? "明确被阻止" : "请求失败"
                    });
                }
                retry++;
                await sleep(500); // 重试间隔
            }
        }
    }
    
    return results;
}

/**
 * IP纯净度检测（完整版）
 */
async function checkIPQuality(ip) {
    const results = [];
    let riskScore = 0;
    
    // 1. 代理/VPN检测
    try {
        const proxyRes = await httpRequest({
            url: `https://ipinfo.io/${ip}/json`,
            timeout: 6000
        });
        const proxyData = JSON.parse(proxyRes.body);
        const isProxy = proxyData.privacy ? (proxyData.privacy.vpn || proxyData.privacy.proxy) : false;
        
        if (isProxy) {
            riskScore += 40;
            results.push({
                name: "代理检测",
                status: "❌ 检测到代理特征",
                details: proxyData.privacy.vpn ? "VPN" : proxyData.privacy.proxy ? "代理" : "未知代理类型"
            });
        } else {
            results.push({
                name: "代理检测",
                status: "✅ 无代理特征",
                details: "未检测到VPN/代理特征"
            });
        }
    } catch (e) {
        results.push({
            name: "代理检测",
            status: "🟡 检测失败",
            details: e.message || "请求失败"
        });
    }
    
    // 2. 黑名单检测
    const blacklists = [
        {
            name: "Spamhaus",
            url: `https://check.spamhaus.org/check/?ip=${ip}`,
            positiveKeywords: ["listed", "found in"]
        },
        {
            name: "AbuseIPDB",
            url: `https://www.abuseipdb.com/check/${ip}`,
            positiveKeywords: ["reported", "abuse"]
        }
    ];
    
    for (const list of blacklists) {
        try {
            const res = await httpRequest({
                url: list.url,
                timeout: 8000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });
            
            const isListed = list.positiveKeywords.some(k => res.body.includes(k));
            if (isListed) {
                riskScore += 20;
                results.push({
                    name: list.name,
                    status: "❌ 列入黑名单",
                    details: "检测到黑名单记录"
                });
            } else {
                results.push({
                    name: list.name,
                    status: "✅ 未列入",
                    details: "未检测到黑名单记录"
                });
            }
        } catch (e) {
            results.push({
                name: list.name,
                status: "🟡 检测失败",
                details: e.message || "请求失败"
            });
        }
        
        await sleep(500); // 请求间隔
    }
    
    // 3. 风险IP检测
    try {
        const riskRes = await httpRequest({
            url: `https://ipqualityscore.com/api/json/ip/YOUR_API_KEY/${ip}`, // 需要替换为实际API key
            timeout: 8000
        });
        const riskData = JSON.parse(riskRes.body);
        
        if (riskData.proxy || riskData.vpn) {
            riskScore += 20;
            results.push({
                name: "IP质量评分",
                status: "❌ 高风险IP",
                details: `欺诈评分: ${riskData.fraud_score}/100`
            });
        } else {
            results.push({
                name: "IP质量评分",
                status: "✅ 低风险IP",
                details: `欺诈评分: ${riskData.fraud_score}/100`
            });
        }
    } catch (e) {
        results.push({
            name: "IP质量评分",
            status: "🟡 检测失败",
            details: e.message || "请求失败"
        });
    }
    
    // 计算最终评分
    const purityScore = 100 - Math.min(riskScore, 100);
    
    return {
        results,
        purityScore,
        riskScore: Math.min(riskScore, 100)
    };
}

// ==============================================
// 主流程和结果展示
// ==============================================

async function main() {
    try {
        notify("IP纯净度检测", "开始检测", "正在收集网络信息...");
        
        // 1. 获取IP基本信息
        const ipInfo = await getIPInfo();
        
        // 2. 检测IP类型
        const ipType = await detectIPType(ipInfo);
        
        // 3. 检测流媒体解锁
        notify("IP纯净度检测", "检测中", "正在检测流媒体解锁情况...");
        const streamingResults = await checkStreamingServices();
        
        // 4. 检测DNS污染
        notify("IP纯净度检测", "检测中", "正在检测DNS污染情况...");
        const dnsResults = await checkDNS();
        
        // 5. 检测IP纯净度
        notify("IP纯净度检测", "检测中", "正在检测IP纯净度...");
        const purityResults = await checkIPQuality(ipInfo.ip);
        
        // 6. 显示结果
        showFinalResults(ipInfo, ipType, streamingResults, dnsResults, purityResults);
        
    } catch (e) {
        notify("IP检测失败", "出现错误", e.message || JSON.stringify(e));
        console.log(`[错误] ${e.stack}`);
    }
}

function showFinalResults(ipInfo, ipType, streaming, dns, purity) {
    // 构造通知内容
    let content = `IP: ${ipInfo.ip}\n类型: ${ipType}\nISP: ${ipInfo.isp}\n位置: ${ipInfo.location}\nASN: ${ipInfo.asn} (${ipInfo.asname})\n\n`;
    
    // 流媒体解锁部分
    content += "📺 流媒体解锁:\n";
    streaming.forEach(s => content += `${s.name}: ${s.status}${s.details ? ` (${s.details})` : ''}\n`);
    
    // DNS检测部分
    content += "\n🔍 DNS检测:\n";
    dns.forEach(d => content += `${d.name}: ${d.status}${d.details ? ` (${d.details})` : ''}\n`);
    
    // IP纯净度部分
    content += "\n🛡️ IP纯净度:\n";
    purity.results.forEach(r => content += `${r.name}: ${r.status}${r.details ? ` (${r.details})` : ''}\n`);
    
    // 评分和建议
    content += `\n✨ 纯净度评分: ${purity.purityScore}/100\n`;
    content += `⚠️ 风险评分: ${purity.riskScore}/100\n\n`;
    
    if (purity.purityScore >= 80) {
        content += "🌟 IP非常纯净，适合高级用途";
    } else if (purity.purityScore >= 60) {
        content += "👍 IP较为纯净，一般使用无问题";
    } else if (purity.purityScore >= 40) {
        content += "⚠️ IP存在风险，建议谨慎使用";
    } else {
        content += "❌ IP高风险，不推荐使用";
    }
    
    // 发送通知
    notify(
        `IP检测结果 | ${purity.purityScore}/100`,
        `${ipInfo.ip} | ${ipType}`,
        content
    );
    
    // 在日志中输出完整结果
    console.log(`[完整检测结果]
IP信息: ${JSON.stringify(ipInfo, null, 2)}
IP类型: ${ipType}
流媒体检测: ${JSON.stringify(streaming, null, 2)}
DNS检测: ${JSON.stringify(dns, null, 2)}
纯净度检测: ${JSON.stringify(purity, null, 2)}`);
}

// ==============================================
// 脚本入口
// ==============================================

// 执行主函数
main().catch(e => {
    notify("IP检测错误", "脚本执行失败", e.message);
    console.log(`[全局错误] ${e.stack}`);
});
