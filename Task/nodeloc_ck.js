/**
 * NodeLoc自动获取签到



名称:NodeLoc
描述:NodeLoc签到
作者:@Lxi0707
支持:Quantumult-X surge loon

网站入口：https://www.nodeloc.com
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
^https:\/\/www\.nodeloc\.com\/api\/.*$ url script-response-body https://raw.githubusercontent.com/Lxi0707/Scripts/refs/heads/main/Task/nodeloc_ck.js
[MITM]
hostname = www.nodeloc.com


/**
 * 获取 nodeloc 的 ck
 */

const url = `https://www.nodeloc.com/api/websocket/auth`;
const method = `POST`;
const headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Origin': 'https://www.nodeloc.com',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Referer': 'https://www.nodeloc.com/',
  'Cookie': 'flarum_lscache_vary=C75exMFv1MX55GQNMkFDAmyuu4SUTpTcE4I5WSNm; flarum_session=iAOH5bax1mhNmvhZhiWKdqXNTdVMAt81mNcBGi4k; _clck=1p7n8q4%7C2%7Cfr2%7C0%7C1751; flarum_remember=1nvskbVvzHbaTlKHo3vTnL6RwwZS6MvsEsaypDXh',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
  'Accept': '*/*',
  'Connection': 'keep-alive'
};

const body = 'socket_id=26292995.636612541&channel_name=private-user%3D2540';

const myRequest = {
  url: url,
  method: method,
  headers: headers,
  body: body
};

$task.fetch(myRequest).then(response => {
  console.log("HTTP 状态码: " + response.statusCode);
  if (response.statusCode === 200) {
    try {
      // 确认响应头是否为 JSON 类型
      const contentType = response.headers['Content-Type'] || '';
      if (contentType.includes('application/json')) {
        const data = JSON.parse(response.body); // 解析响应体为 JSON
        console.log("返回数据：", data);  // 打印返回的数据

        if (data.auth) {
          // 成功获取到ck，打印并提示
          const authToken = data.auth;
          console.log("成功获取ck: " + authToken);
          // 弹出通知提示
          $notification.post('成功获取ck', 'ck已获取', authToken);
        } else {
          console.log("获取ck失败，返回数据: ", data);
          // 弹出通知提示获取失败
          $notification.post('获取ck失败', '未能获取到ck', '');
        }
      } else {
        console.log("响应不是JSON格式");
        $notification.post('获取ck失败', '响应数据不是有效的JSON', '');
      }
    } catch (e) {
      console.log("解析 JSON 失败: ", e);
      // 弹出通知提示解析失败
      $notification.post('解析失败', '无法解析响应数据', '');
    }
  } else {
    console.log("请求失败，状态码：" + response.statusCode);
    // 弹出通知提示请求失败
    $notification.post('请求失败', '状态码: ' + response.statusCode, '');
  }
  $done();
}, reason => {
  console.log("请求失败，原因：" + reason.error);
  // 弹出通知提示请求失败
  $notification.post('请求失败', reason.error, '');
  $done();
});
