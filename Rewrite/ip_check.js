/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=ip, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本
// 功能：检测当前IP的流媒体解锁情况、DNS污染情况和IP纯净度
// 使用方法：在支持JavaScript的代理工具(如Quantumult X, Surge等)中运行


**/
const $ = new compatibility();

// 主函数
async function main() {
    // 显示开始检测提示
    $.notify("IP纯净度检测", "开始检测当前网络环境...", "");
    
    try {
        // 获取当前网络信息
        const networkInfo = await getNetworkInfo();
        
        // 检测流媒体解锁情况
        const streamingResults = await checkStreamingServices();
        
        // 检测DNS污染情况
        const dnsResults = await checkDNSContamination();
        
        // 检测IP纯净度
        const ipPurityResults = await checkIPPurity();
        
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
            url: "http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query"
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
                    coordinates: `${data.lat}, ${data.lon}`
                });
            } else {
                resolve({
                    ip: "未知",
                    isp: "未知",
                    org: "未知",
                    asn: "未知",
                    asname: "未知",
                    location: "未知",
                    coordinates: "未知"
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
                coordinates: "未知"
            });
        });
    });
}

// 检测流媒体解锁情况
async function checkStreamingServices() {
    const services = [
        { name: "Netflix", url: "https://www.netflix.com/title/81215567", keyword: "NETFLIX" },
        { name: "Disney+", url: "https://www.disneyplus.com", keyword: "disneyplus" },
        { name: "YouTube Premium", url: "https://www.youtube.com/premium", keyword: "Premium" },
        { name: "Amazon Prime Video", url: "https://www.primevideo.com", keyword: "primevideo" },
        { name: "HBO Max", url: "https://www.hbomax.com", keyword: "HBOMAX" },
        { name: "BBC iPlayer", url: "https://www.bbc.co.uk/iplayer", keyword: "iPlayer" },
        { name: "Hulu", url: "https://www.hulu.com", keyword: "hulu" }
    ];
    
    const results = [];
    
    for (const service of services) {
        try {
            const resp = await $.http.get({ url: service.url });
            const isUnlocked = resp.body.includes(service.keyword) || resp.status === 200;
            results.push({
                name: service.name,
                unlocked: isUnlocked,
                responseCode: resp.status
            });
        } catch (error) {
            results.push({
                name: service.name,
                unlocked: false,
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
        { domain: "www.youtube.com", expected: "YouTube" }
    ];
    
    const results = [];
    
    for (const test of testDomains) {
        try {
            const resp = await $.http.get({ url: `http://${test.domain}` });
            const isContaminated = !resp.body.includes(test.expected);
            results.push({
                domain: test.domain,
                contaminated: isContaminated,
                status: isContaminated ? "可能污染" : "正常"
            });
        } catch (error) {
            results.push({
                domain: test.domain,
                contaminated: true,
                status: "检测失败"
            });
        }
    }
    
    return results;
}

// 检测IP纯净度
async function checkIPPurity() {
    // 检查IP是否在黑名单中
    const blacklistChecks = [
        { name: "Spamhaus", url: "https://check.spamhaus.org/listed/" },
        { name: "Barracuda", url: "https://www.barracudacentral.org/lookups" },
        { name: "AbuseIPDB", url: "https://www.abuseipdb.com/check/" }
    ];
    
    const results = [];
    
    for (const check of blacklistChecks) {
        try {
            const resp = await $.http.get({ url: check.url });
            const isListed = resp.body.includes("listed") || resp.body.includes("found");
            results.push({
                service: check.name,
                listed: isListed,
                status: isListed ? "列入黑名单" : "未列入"
            });
        } catch (error) {
            results.push({
                service: check.name,
                listed: false,
                status: "检测失败"
            });
        }
    }
    
    // 检查代理/VPN特征
    const proxyCheck = await checkProxyFeatures();
    results.push({
        service: "代理/VPN检测",
        listed: proxyCheck.isProxy,
        status: proxyCheck.isProxy ? "可能为代理/VPN" : "未检测到代理特征"
    });
    
    return results;
}

// 检查代理/VPN特征
async function checkProxyFeatures() {
    try {
        const resp = await $.http.get({
            url: "https://ipinfo.io/json",
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
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

// 生成检测报告
function generateReport(networkInfo, streamingResults, dnsResults, ipPurityResults) {
    let report = `🌐 IP信息\nIP: ${networkInfo.ip}\nISP: ${networkInfo.isp}\n位置: ${networkInfo.location}\nASN: ${networkInfo.asn} (${networkInfo.asname})\n\n`;
    
    report += "📺 流媒体解锁情况\n";
    streamingResults.forEach(service => {
        report += `${service.name}: ${service.unlocked ? "✅ 解锁" : "❌ 未解锁"} (${service.responseCode})\n`;
    });
    
    report += "\n🔍 DNS污染检测\n";
    dnsResults.forEach(dns => {
        report += `${dns.domain}: ${dns.contaminated ? "❌ 可能污染" : "✅ 正常"} (${dns.status})\n`;
    });
    
    report += "\n🛡️ IP纯净度检测\n";
    ipPurityResults.forEach(check => {
        report += `${check.service}: ${check.listed ? "⚠️ " + check.status : "✅ " + check.status}\n`;
    });
    
    // 计算总体纯净度评分
    const streamingScore = streamingResults.filter(s => s.unlocked).length / streamingResults.length;
    const dnsScore = dnsResults.filter(d => !d.contaminated).length / dnsResults.length;
    const purityScore = ipPurityResults.filter(i => !i.listed).length / ipPurityResults.length;
    const overallScore = Math.round((streamingScore * 0.4 + dnsScore * 0.3 + purityScore * 0.3) * 100);
    
    report += `\n✨ 总体纯净度评分: ${overallScore}/100\n`;
    
    if (overallScore > 80) {
        report += "👍 IP非常纯净，适合高级用途";
    } else if (overallScore > 60) {
        report += "🆗 IP较为纯净，一般使用无问题";
    } else if (overallScore > 40) {
        report += "⚠️ IP纯净度一般，可能存在限制";
    } else {
        report += "❌ IP纯净度较差，可能存在严重限制或污染";
    }
    
    $.notify("IP纯净度检测完成", `IP: ${networkInfo.ip}`, report);
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
