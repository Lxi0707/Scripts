/**
 * NodeLoc自动获取签到



名称:NodeLoc
描述:NodeLoc签到
作者:@Lxi0707
支持:Quantumult-X surge loon

网站入口：https://www.nodeloc.com
脚本说明:获取ck

BoxJs订阅地址:https://raw.githubusercontent.com/Lxi0707/boxjs/refs/heads/main/Lxi.json

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
 * 获取 nodeloc 的 ck 并上传至 BoxJS
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
  if (response.statusCode === 200) {
    try {
      const data = JSON.parse(response.body); // 解析为 JSON 对象
      if (data.auth) {
        console.log("成功获取ck: " + data.auth); // 打印 ck 到日志
        $notify("nodeloc CK 获取", "获取成功", data.auth); // 弹窗提示获取成功

        // 上传 CK 到 BoxJS
        const boxjsUrl = `http://boxjs.com/proxy/data/save`; // 确保是 BoxJS 的数据保存 API
        const boxjsBody = {
          key: "nodeloc_ck_cookie",
          val: data.auth
        };
        const boxjsHeaders = {
          'Content-Type': 'application/json'
        };

        const boxjsRequest = {
          url: boxjsUrl,
          method: 'POST',
          headers: boxjsHeaders,
          body: JSON.stringify(boxjsBody)
        };

        $task.fetch(boxjsRequest).then(boxjsResponse => {
          if (boxjsResponse.statusCode === 200) {
            console.log("CK 成功上传到 BoxJS");
          } else {
            console.log("CK 上传到 BoxJS 失败，状态码：" + boxjsResponse.statusCode);
          }
          $done();
        });
      } else {
        console.log("未找到auth字段，返回数据: ", data);
      }
    } catch (e) {
      console.log("解析 JSON 失败: ", e);
    }
  } else {
    console.log("请求失败，状态码：" + response.statusCode);
  }
  $done();
}, reason => {
  console.log("请求失败，原因：" + reason.error);
  $done();
});
