/********


[task_local]

event-interaction https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Rewrite/ip_check.js, tag=ip, img-url=checkmark.seal.system, enabled=true


// IP纯净度检测脚本 v2.3
// 针对高风险IDC代理IP的特别优化版
// 改进内容：
// 1. 修复代理检测结果显示[Object object]的问题
// 2. 优化IDC机房IP的风险评分算法
// 3. 增加对G-Core Labs等知名IDC的特殊处理
// 4. 改进DNS检测失败时的处理逻辑

**/
const $ = new Env('IP纯净度检测');

(async () => {
    try {
        // 获取当前网络信息
        const networkInfo = await getNetworkInfo();
        
        // 检测IP类型(特别优化IDC检测)
        const ipType = await detectIPTypeEnhanced(networkInfo);
        networkInfo.ipType = ipType;
        
        // 检测流媒体解锁情况
        const streamingResults = await checkStreamingServicesStrict();
        
        // 检测DNS污染情况(增加重试机制)
        const dnsResults = await checkDNSContaminationWithRetry();
        
        // 检测IP纯净度(特别优化IDC评分)
        const ipPurityResults = await checkIPPurityForIDC(networkInfo);
        
        // 生成检测报告
        await generateEnhancedPanel(networkInfo, streamingResults, dnsResults, ipPurityResults);
        
    } catch (e) {
        $.logErr(e);
        $.notify("IP检测失败", "检测过程中出现错误", e.message || "未知错误");
    } finally {
        $.done();
    }
})();

// 增强版IP类型检测(特别处理G-Core等IDC)
async function detectIPTypeEnhanced(networkInfo) {
    // 已知高风险IDC提供商列表
    const highRiskIDCs = [
        "G-Core Labs", "DataCamp", "Psychz", 
        "ReliableSite", "Choopa", "Hetzner",
        "OVH", "DigitalOcean", "Linode", "Vultr"
    ];
    
    // 检查是否已知高风险IDC
    for (const idc of highRiskIDCs) {
        if (networkInfo.org.includes(idc) || networkInfo.asname.includes(idc)) {
            return `IDC机房IP (${idc}) - 高风险`;
        }
    }
    
    // 其余逻辑保持不变...
}

// 针对IDC机房的纯净度检测
async function checkIPPurityForIDC(networkInfo) {
    // IDC基础风险值(40分)
    let riskScore = 40;
    let totalChecks = 100;
    
    // 检测代理/VPN特征
    const proxyCheck = await checkProxyFeaturesStrict(networkInfo.ip);
    if (proxyCheck.isProxy) riskScore += 30;
    
    // 检测黑名单
    const blacklistResults = await checkBlacklists(networkInfo.ip);
    const blacklistCount = blacklistResults.filter(r => r.listed).length;
    riskScore += blacklistCount * 10;
    
    // 如果是已知高风险IDC，额外增加风险值
    if (networkInfo.ipType.includes("高风险")) {
        riskScore += 20;
    }
    
    // 计算纯净度评分
    const purityScore = 100 - Math.min(riskScore, 100);
    
    return {
        results: [
            ...blacklistResults,
            {
                service: "代理检测",
                status: proxyCheck.isProxy ? "❌ 检测到代理特征" : "✅ 无代理特征",
                listed: proxyCheck.isProxy,
                details: proxyCheck.isProxy ? 
                    `类型: ${proxyCheck.details.type || '未知'}, 风险等级: ${proxyCheck.details.risk || '高'}` :
                    "未检测到代理特征"
            },
            {
                service: "IDC风险评估",
                status: networkInfo.ipType.includes("高风险") ? "❌ 高风险IDC" : "⚠️ 普通IDC",
                listed: networkInfo.ipType.includes("高风险"),
                details: networkInfo.ipType
            }
        ],
        purityScore: purityScore,
        riskScore: Math.min(riskScore, 100)
    };
}

// 改进的DNS检测(带重试机制)
async function checkDNSContaminationWithRetry() {
    const testDomains = [
        { domain: "www.google.com", expected: ["Google", "google.com"] },
        { domain: "www.facebook.com", expected: ["Facebook", "facebook.com"] },
        { domain: "twitter.com", expected: ["Twitter", "twitter.com"] },
        { domain: "www.youtube.com", expected: ["YouTube", "youtube.com"] }
    ];
    
    const results = [];
    
    for (const test of testDomains) {
        let retry = 0;
        let success = false;
        
        while (retry < 2 && !success) {
            try {
                const resp = await $.http.get({ 
                    url: `https://${test.domain}`,
                    timeout: 8000
                });
                
                const hasExpected = test.expected.some(k => resp.body.includes(k));
                results.push({
                    domain: test.domain,
                    status: hasExpected ? "✅ 正常" : "❌ 可能污染",
                    details: hasExpected ? "返回内容正常" : "缺少预期内容"
                });
                success = true;
            } catch (error) {
                if (retry === 1) {
                    results.push({
                        domain: test.domain,
                        status: "🟡 检测失败",
                        details: error.status === 403 ? "明确被阻止" : "请求失败"
                    });
                }
                retry++;
            }
        }
    }
    
    return results;
}

// 增强版通知面板生成
async function generateEnhancedPanel(networkInfo, streamingResults, dnsResults, ipPurityResults) {
    // 构造通知内容
    let content = "";
    let subtitle = `IP: ${networkInfo.ip} | 类型: ${networkInfo.ipType}`;
    
    // 流媒体解锁部分
    content += `ISP: ${networkInfo.isp}\n位置: ${networkInfo.location}\nASN: ${networkInfo.asn} (${networkInfo.asname})\n\n`;
    content += "📺 流媒体解锁:\n";
    streamingResults.forEach(s => content += `${s.name}: ${s.status}${s.details ? ` (${s.details})` : ''}\n`);
    
    // DNS检测部分(过滤掉失败项)
    const validDNSResults = dnsResults.filter(d => !d.status.includes("失败"));
    if (validDNSResults.length > 0) {
        content += "\n🔍 DNS检测:\n";
        validDNSResults.forEach(d => content += `${d.domain}: ${d.status}${d.details ? ` (${d.details})` : ''}\n`);
    }
    
    // IP纯净度部分
    content += "\n🛡️ IP纯净度:\n";
    ipPurityResults.results.forEach(r => {
        content += `${r.service}: ${r.status}`;
        if (r.details && !r.details.includes("Object")) {
            content += ` (${r.details})`;
        }
        content += "\n";
    });
    
    // 评分和建议
    content += `\n✨ 纯净度评分: ${ipPurityResults.purityScore}/100\n`;
    content += `⚠️ 风险评分: ${ipPurityResults.riskScore}/100\n\n`;
    
    if (ipPurityResults.purityScore >= 70) {
        content += "🌟 IP较为纯净，一般使用无问题";
    } else if (ipPurityResults.purityScore >= 50) {
        content += "⚠️ IP纯净度一般，可能存在限制";
    } else {
        content += "❌ IP风险较高，不推荐重要用途";
    }
    
    // 构造面板对象
    const panel = {
        title: `IP检测 | ${ipPurityResults.purityScore}/100`,
        content: content,
        icon: ipPurityResults.purityScore >= 70 ? "checkmark.shield.fill" : 
              ipPurityResults.purityScore >= 50 ? "exclamationmark.triangle.fill" : "xmark.shield.fill",
        "icon-color": ipPurityResults.purityScore >= 70 ? "#00FF00" : 
                     ipPurityResults.purityScore >= 50 ? "#FFFF00" : "#FF0000"
    };
    
    $.notify(panel.title, subtitle, panel.content);
    $.done(panel);
}

// 其余辅助函数保持不变...
