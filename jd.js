/**
 * 自动获取jdcookie

名称:pt_key
描述:获取京东ck多账号
作者:Lxi666
支持:仅测试Quantumult-X,  surge loon自测
更新日志:
2024.10.29修改脚本一直处于运行状态，添加多账号获取
2024.10.30添加ck在日志显示,surge,loon适配

脚本说明:获取新ck切换账号后，退后台重进秒通知，通知内包含cookie,cookie信息自行复制使用。

TG频道:https://t.me/LXi_Collection_hall
TG群聊:https://t.me/LxiCollectionhallChat

脚本声明:：
 1. 本脚本仅用于学习研究，禁止用于商业用途。
 2. 本脚本不保证准确性、可靠性、完整性和及时性。
 3. 任何人或组织可自由使用，无需通知。
 4. 作者不对使用本脚本产生的任何损失或问题负责。
 5. 如认为脚本侵犯权益，请提供身份证明与所有权证明，我将在确认后删除相关内容。
 6. 请勿将本脚本用于商业用途，后果自负。
 7. 本脚本版权归作者所有。

===================|调试区|====================

#quantumultx

[rewrite_local]
^https?:\/\/api\.m\.jd\.com\/client\.action\?functionId=(wareBusiness|serverConfig|basicConfig) url script-request-header jd.js


#Surge
#!name=JD-Cookie
#!desc=更新cookie

[Script]
JD-Cookie = type=http-request, pattern=^https?:\/\/api\.m\.jd\.com\/client\.action\?functionId=(wareBusiness|serverConfig|basicConfig), script-path=jd.js, requires-body=false

#Loon

http-request ^https?:\/\/api\.m\.jd\.com\/client\.action\?functionId=(wareBusiness|serverConfig|basicConfig) script-path=jd.js


[MITM]
hostname = %APPEND% api.m.jd.com
*/

// 获取请求头中的Cookie
let cookie = $request.headers['Cookie'] || $request.headers['cookie'];
// 匹配并提取 pt_pin 和 pt_key
let ptPinMatch = cookie.match(/pt_pin=(.*?);/);
let ptKeyMatch = cookie.match(/pt_key=(.*?);/);

// 检查是否找到了 pt_pin 和 pt_key
if (ptPinMatch && ptKeyMatch) {
    let pt_pin = ptPinMatch[1];
    let pt_key = ptKeyMatch[1];
    // 构建新的 Cookie 字符串
    let newCookie = `pt_pin=${pt_pin};pt_key=${pt_key};`;
    // 检索先前存储的 Cookie
    let savedCookie;
    // Quantumult X
    if (typeof $prefs !== 'undefined') {
        savedCookie = $prefs.valueForKey(`Cookie_${pt_pin}`);
    }
    // Loon
    else if (typeof $persistentStore !== 'undefined') {
        savedCookie = $persistentStore.read(`Cookie_${pt_pin}`);
    }
    // 比较新旧 Cookie
    if (savedCookie !== newCookie) {
        // 发送通知
        let title = "Cookie 更新";
        let subtitle = `账号: ${pt_pin}`;
        let message = `新的Cookie: ${newCookie}`;
        if (typeof $notify !== 'undefined') {
            $notify(title, subtitle, message);
        }
        if (typeof $notification !== 'undefined') {
            $notification.post(title, subtitle, message);
        }
        // 存储新的 Cookie
        if (typeof $prefs !== 'undefined') {
            $prefs.setValueForKey(newCookie, `Cookie_${pt_pin}`);
        }
        // Loon
        else if (typeof $persistentStore !== 'undefined') {
            $persistentStore.write(newCookie, `Cookie_${pt_pin}`);
        }
    }
    // 打印获取的Cookie到日志
    console.log(`获取的Cookie: ${newCookie}`);
} else {
    // 如果没有找到，发送错误通知
    if (typeof $notify !== 'undefined' || typeof $notification !== 'undefined') {
        let errorTitle = "Cookie 错误";
        let errorMessage = "无法提取 pt_pin 或 pt_key。";
        $notify ? $notify(errorTitle, "", errorMessage) : $notification.post(errorTitle, "", errorMessage);
    }
    // 打印错误到日志
    console.log("无法提取 pt_pin 或 pt_key。");
}
// 结束请求或响应处理
if (typeof $done !== 'undefined') {
    $done({});
}