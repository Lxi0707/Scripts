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

const $ = new Env("nodeloc CK 获取"); // 初始化环境
const CK_KEY = "nodeloc_ck_cookie"; // BoxJS 存储 CK 的键名

// 请求配置
const url = `https://www.nodeloc.com/api/websocket/auth`;
const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  "Origin": "https://www.nodeloc.com",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "Referer": "https://www.nodeloc.com/",
  "Cookie": $request ? $request.headers.Cookie : "", // 动态提取抓包 Cookie
};
const body = "socket_id=26292995.636612541&channel_name=private-user%3D2540";
const requestConfig = { url, method: "POST", headers, body };

// 主逻辑
!(async () => {
  if (!$request) {
    $.msg($.name, "❌ 请通过抓包获取 Cookie", "未捕获到请求内容！");
    return $.done();
  }

  try {
    // 发起请求获取 CK
    const response = await httpRequest(requestConfig);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      if (data.auth) {
        console.log(`🎉 成功获取 CK: ${data.auth}`);
        $.msg("nodeloc CK 获取", "获取成功", data.auth);

        // 存储 CK 到 BoxJS
        const saved = saveCK(data.auth);
        if (saved) {
          console.log("🎉 CK 已上传到 BoxJS");
        } else {
          console.error("❌ CK 存储到 BoxJS 失败，请检查 BoxJS 配置或环境支持情况！");
        }
      } else {
        console.log(`❌ 未找到 auth 字段，返回数据: ${JSON.stringify(data)}`);
      }
    } else {
      console.log(`❌ 请求失败，状态码: ${response.statusCode}`);
    }
  } catch (error) {
    console.error(`❌ 获取 CK 出现异常: ${error.message}`);
  }
  $.done();
})();

// 保存 CK 到 BoxJS
function saveCK(ck) {
  const savedCK = $.getdata(CK_KEY) || ""; // 获取已存储的 CK
  const ckArr = savedCK.split("@").filter(Boolean); // 解析为数组
  if (!ckArr.includes(ck)) ckArr.push(ck); // 避免重复
  const result = $.setdata(ckArr.join("@"), CK_KEY); // 持久化保存
  return result; // 返回是否存储成功
}

// 异步请求封装
function httpRequest(config) {
  return new Promise((resolve, reject) => {
    $task.fetch(config).then(resolve, reject);
  });
}

// 环境初始化函数
function Env(name) {
  const isNode = typeof module !== "undefined" && !!module.exports;
  const isQuanX = typeof $task !== "undefined";
  const isSurge = typeof $httpClient !== "undefined" && typeof $persistentStore !== "undefined";
  const isLoon = typeof $loon !== "undefined";
  const msg = (title, subt, desc) => {
    console.log(`${title}\n${subt}\n${desc}`);
    if (isQuanX) $notify(title, subt, desc);
    if (isSurge || isLoon) $notification.post(title, subt, desc);
  };
  const getdata = (key) => {
    if (isQuanX) return $prefs.valueForKey(key);
    if (isSurge || isLoon) return $persistentStore.read(key);
  };
  const setdata = (val, key) => {
    if (isQuanX) return $prefs.setValueForKey(val, key);
    if (isSurge || isLoon) return $persistentStore.write(val, key);
  };
  const done = (val = {}) => (isQuanX || isSurge || isLoon) && $done(val);
  return { name, isNode, isQuanX, isSurge, isLoon, msg, getdata, setdata, done };
}
