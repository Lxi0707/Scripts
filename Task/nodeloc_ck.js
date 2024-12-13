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

// 定义请求信息
const myRequest = {
  url: "https://www.nodeloc.com/api/websocket/auth", // 替换为实际接口地址
  method: "GET", // 根据实际需求调整为 POST/GET
  headers: {
    "Content-Type": "application/json", // 根据接口要求调整
    "Authorization": "Bearer YOUR_TOKEN" // 如果需要认证，请替换为实际的 token
  }
};

// 发送请求
$task.fetch(myRequest).then(
  (response) => {
    console.log("HTTP 状态码: " + response.statusCode); // 打印状态码
    console.log("响应头: " + JSON.stringify(response.headers)); // 打印响应头
    console.log("响应体内容: " + response.body); // 打印响应体内容

    // 检查状态码
    if (response.statusCode === 200) {
      try {
        // 解析 JSON 响应体
        const data = JSON.parse(response.body);
        console.log("解析成功，返回数据: ", data);

        // 检查是否包含 auth 字段
        if (data && data.auth) {
          const currentCK = data.auth; // 提取 auth 字段
          const savedCK = $persistentStore.read("nodeloc_ck"); // 读取之前存储的 CK

          // 比较新旧 CK 是否一致
          if (currentCK !== savedCK) {
            $persistentStore.write(currentCK, "nodeloc_ck"); // 保存新的 CK
            $notify("nodeloc CK 获取", "获取成功", currentCK); // 通知成功
          } else {
            console.log("CK 未变化，无需更新"); // CK 无变化
          }
        } else {
          console.error("返回数据缺少 auth 字段"); // 缺少 auth
        }
      } catch (e) {
        console.error("解析 JSON 失败: " + e); // 捕获 JSON 解析错误
      }
    } else {
      console.error("HTTP 请求失败，状态码：" + response.statusCode); // 状态码非 200
    }
    $done(); // 完成任务
  },
  (reason) => {
    console.error("请求失败，原因：" + JSON.stringify(reason)); // 请求失败原因
    $done(); // 完成任务
  }
);
