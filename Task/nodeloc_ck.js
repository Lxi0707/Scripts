/**
 * NodeLoc自动获取签到



名称:NodeLoc
描述:NodeLoc签到
作者:@Lxi0707
支持:Quantumult-X surge loon

网站入口：
脚本说明:获取ck

BoxJs订阅地址:

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

quantumultx
[rewrite_local]
^https:\/\/www\.nodeloc\.com\/api\/checkin\/history$ url script-request-body https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Task/nodeloc_ck.js
http-request ^https:\/\/www\.nodeloc\.com\/api\/checkin\/history$ script-path=https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Task/nodeloc_ck.js

[MITM]
hostname = www.nodeloc.com


/**
 * NodeLoc 获取 ck 并弹窗提示
 */

const url = `https://www.nodeloc.com/api/checkin/history`;
const method = `GET`;
const headers = {
    'Sec-Fetch-Dest': 'empty',
    'Connection': 'keep-alive',
    'Accept-Encoding': 'gzip, deflate, br',
    'X-CSRF-Token': 'C75exMFv1MX55GQNMkFDAmyuu4SUTpTcE4I5WSNm',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Sec-Fetch-Mode': 'cors',
    'Cookie': 'flarum_lscache_vary=C75exMFv1MX55GQNMkFDAmyuu4SUTpTcE4I5WSNm; flarum_session=iAOH5bax1mhNmvhZhiWKdqXNTdVMAt81mNcBGi4k; _clck=1p7n8q4%7C2%7Cfr2%7C0%7C1751; flarum_remember=1nvskbVvzHbaTlKHo3vTnL6RwwZS6MvsEsaypDXh',
    'Referer': 'https://www.nodeloc.com/u/Lxi/checkin/history',
    'Host': 'www.nodeloc.com',
    'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
    'Accept': '*/*'
};
const body = ``;

const myRequest = {
    url: url,
    method: method,
    headers: headers,
    body: body
};

$task.fetch(myRequest).then(response => {
    // 打印 HTTP 请求日志
    console.log(response.statusCode + "\n\n" + response.body);
    
    // 判断响应状态码
    if (response.statusCode === 200) {
        try {
            const responseBody = JSON.parse(response.body); // 假设返回的内容是 JSON 格式
            
            // 根据实际的返回内容判断是否成功
            if (responseBody.success) {
                // 获取成功的提示
                $notify("NodeLoc 获取 ck", "成功", "ck 获取成功！");
                $log("ck 获取成功！");
            } else {
                // 获取失败的提示
                $notify("NodeLoc 获取 ck", "失败", "ck 获取失败！");
                $log("ck 获取失败！");
            }
        } catch (error) {
            // 如果解析 JSON 失败，弹出解析失败的提示
            $notify("NodeLoc 获取 ck", "失败", "返回数据格式错误！");
            $log("返回数据格式错误：" + error);
        }
    } else {
        // 请求失败时的提示
        $notify("NodeLoc 获取 ck", "请求失败", "请求未能成功，状态码：" + response.statusCode);
        $log("请求失败，状态码：" + response.statusCode);
    }
    $done();
}, reason => {
    // 请求错误时的提示
    $notify("NodeLoc 获取 ck", "错误", "请求发生错误：" + reason.error);
    $log("请求错误：" + reason.error);
    $done();
});