/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=IP纯净度检测脚本, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本 v2.2
// 改进内容：
// 1. 纯净度评分仅显示具体百分比数值（去掉区间评级文字）
// 2. 保留完整检测功能（IP信息、流媒体、DNS、黑名单等）

*/
const $ = new Env('IP纯净度检测');

(async () => {
    try {
        // 获取网络信息
        const networkInfo = await getNetworkInfo();
        networkInfo.ipType = await detectIPType(networkInfo);
        
        // 执行检测
        const streamingResults = await checkStreamingServicesStrict();
        const dnsResults = await checkDNSContamination();
        const ipPurityResults = await checkIPPurityStrict(networkInfo.ip);
        
        // 生成报告
        await generatePanel(networkInfo, streamingResults, dnsResults, ipPurityResults);
    } catch (e) {
        $.logErr(e);
        $.notify("IP检测失败", "", e.message || "未知错误");
    } finally {
        $.done();
    }
})();

// ================= 核心函数 =================
async function getNetworkInfo() {
    try {
        const resp = await $.http.get({ url: "http://ip-api.com/json/?fields=query,isp,org,as,asname,city,regionName,country,proxy,hosting", timeout: 5000 });
        const data = JSON.parse(resp.body);
        return data.status === "success" ? {
            ip: data.query,
            isp: data.isp,
            org: data.org,
            asn: data.as,
            asname: data.asname,
            location: `${data.city}, ${data.regionName}, ${data.country}`,
            isProxy: data.proxy,
            isHosting: data.hosting,
            source: "ip-api"
        } : await getFallbackInfo();
    } catch (e) {
        return await getFallbackInfo();
    }
}

async function detectIPType(networkInfo) {
    if (networkInfo.isHosting) return "IDC机房IP";
    if (networkInfo.isProxy) return "代理/VPN IP";
    const ispLower = networkInfo.isp.toLowerCase();
    return /(telecom|broadband|dsl|fiber|联通|电信|移动)/.test(ispLower) ? "家庭宽带IP" : "IDC机房IP";
}

async function checkStreamingServicesStrict() {
    const services = [
        { name: "Netflix", url: "https://www.netflix.com/title/81215567", keyword: "NETFLIX" },
        { name: "Disney+", url: "https://www.disneyplus.com", keyword: "disneyplus" }
    ];
    const results = [];
    for (const service of services) {
        try {
            const resp = await $.http.get({ url: service.url, timeout: 8000 });
            results.push({
                name: service.name,
                status: resp.body.includes(service.keyword) ? "✅ 支持" : "❌ 未支持"
            });
        } catch {
            results.push({ name: service.name, status: "❌ 检测失败" });
        }
    }
    return results;
}

async function checkDNSContamination() {
    const testDomains = [
        { domain: "www.google.com", keyword: "Google" },
        { domain: "www.facebook.com", keyword: "Facebook" }
    ];
    const results = [];
    for (const test of testDomains) {
        try {
            const resp = await $.http.get({ url: `http://${test.domain}`, timeout: 8000 });
            results.push({
                domain: test.domain,
                status: resp.body.includes(test.keyword) ? "✅ 正常" : "❌ 可能污染"
            });
        } catch {
            results.push({ domain: test.domain, status: "🟡 检测失败" });
        }
    }
    return results;
}

async function checkIPPurityStrict(ip) {
    const [proxyCheck, blacklistResults] = await Promise.all([
        checkProxyFeatures(ip),
        checkBlacklists(ip)
    ]);
    
    // 计算纯净度评分（0-100）
    let riskScore = proxyCheck.isProxy ? 40 : 0;
    riskScore += blacklistResults.filter(r => r.listed).length * 15;
    const purityScore = Math.max(0, 100 - riskScore);

    return {
        results: [
            ...blacklistResults,
            { service: "代理检测", status: proxyCheck.isProxy ? "❌ 代理/VPN" : "✅ 无代理" }
        ],
        purityScore: purityScore
    };
}

// ================= 辅助函数 =================
async function getFallbackInfo() {
    try {
        const resp = await $.http.get({ url: "https://ipinfo.io/json", timeout: 5000 });
        const data = JSON.parse(resp.body);
        return {
            ip: data.ip,
            isp: data.org || "未知",
            org: data.org || "未知",
            asn: data.asn || "未知",
            asname: data.asn ? data.asn.split(' ').slice(1).join(' ') : "未知",
            location: `${data.city}, ${data.region}, ${data.country}`,
            isProxy: data.privacy?.proxy || false,
            isHosting: data.hosting || false,
            source: "ipinfo.io"
        };
    } catch {
        return { ip: "未知", isp: "未知", location: "未知", isProxy: false, isHosting: false };
    }
}

async function checkProxyFeatures(ip) {
    try {
        const resp = await $.http.get({ url: `https://ipinfo.io/${ip}/json`, timeout: 6000 });
        const data = JSON.parse(resp.body);
        return { isProxy: data.privacy?.proxy || false };
    } catch {
        return { isProxy: false };
    }
}

async function checkBlacklists(ip) {
    const lists = [
        { name: "Spamhaus", url: `https://check.spamhaus.org/check/?ip=${ip}`, keyword: "listed" }
    ];
    const results = [];
    for (const list of lists) {
        try {
            const resp = await $.http.get({ url: list.url, timeout: 8000 });
            results.push({
                service: list.name,
                status: resp.body.includes(list.keyword) ? "❌ 黑名单" : "✅ 未列入",
                listed: resp.body.includes(list.keyword)
            });
        } catch {
            results.push({ service: list.name, status: "🟡 检测失败", listed: false });
        }
    }
    return results;
}

// ================= 显示函数 =================
async function generatePanel(networkInfo, streamingResults, dnsResults, ipPurityResults) {
    const purityScore = ipPurityResults.purityScore;
    const content = `
IP: ${networkInfo.ip}
ISP: ${networkInfo.isp}
位置: ${networkInfo.location}
ASN: ${networkInfo.asn}

📺 流媒体解锁:
${streamingResults.map(s => `${s.name}: ${s.status}`).join("\n")}

🔍 DNS检测:
${dnsResults.map(d => `${d.domain}: ${d.status}`).join("\n")}

🛡️ IP纯净度: ${purityScore}%
${ipPurityResults.results.map(r => `${r.service}: ${r.status}`).join("\n")}
`;
    $.notify(`IP纯净度: ${purityScore}%`, `IP: ${networkInfo.ip}`, content.trim());
    $.done();
}

// ================= 环境封装 =================
function Env(name) {
    return {
        name: name,
        http: {
            get: (opts) => new Promise((resolve, reject) => {
                typeof $task != "undefined" ? $task.fetch(opts).then(resolve, reject) :
                $httpClient.get(opts, (err, resp, body) => err ? reject(err) : resolve({ status: resp.status || 200, body }));
            })
        },
        log: (msg) => console.log(`${name}: ${msg}`),
        logErr: (err) => console.error(`${name}: 错误: ${err}`),
        notify: (title, subtitle, message) => {
            typeof $task != "undefined" ? $notify(title, subtitle, message) :
            $notification.post(title, subtitle, message);
        },
        done: (value = {}) => {
            typeof $task != "undefined" ? $done(value) : $done();
        }
    };
}
