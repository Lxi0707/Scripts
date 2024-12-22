/*
# 2024-12-22
# 京东比价
# 仅适用于京东App版本
# 脚本修改来源 https://raw.githubusercontent.com/wf021325/qx/master/js/jd_price.js


[rewrite_local]
^https?:\/\/api\.m\.jd\.com/client\.action\?functionId=(wareBusiness|serverConfig|basicConfig) url script-response-body https://raw.githubusercontent.com/wf021325/qx/master/js/jd_price.js


[mitm]
hostname = api.m.jd.com
*/


const path1 = "serverConfig";
const path2 = "wareBusiness";
const path3 = "basicConfig";
const consolelog = false; // 调试开关
const url = $request.url;
const body = $response.body;
const $ = new Env("京东比价");

if (url.includes(path1)) {
    handleServerConfig(body);
}

if (url.includes(path3)) {
    handleBasicConfig(body);
}

if (url.includes(path2)) {
    handleWareBusiness(body);
}

function handleServerConfig(body) {
    try {
        let obj = JSON.parse(body);
        delete obj.serverConfig.httpdns;
        delete obj.serverConfig.dnsvip;
        delete obj.serverConfig.dnsvip_v6;
        $done({ body: JSON.stringify(obj) });
    } catch (error) {
        logError("handleServerConfig", error, body);
        $done({ body });
    }
}

function handleBasicConfig(body) {
    try {
        let obj = JSON.parse(body);
        let JDHttpToolKit = obj.data?.JDHttpToolKit;
        if (JDHttpToolKit) {
            delete JDHttpToolKit.httpdns;
            delete JDHttpToolKit.dnsvipV6;
        }
        $done({ body: JSON.stringify(obj) });
    } catch (error) {
        logError("handleBasicConfig", error, body);
        $done({ body });
    }
}

function handleWareBusiness(body) {
    try {
        let obj = JSON.parse(body);
        if (Number(obj?.code) > 0 && Number(obj?.wait) > 0) {
            $.msg("灰灰提示，可能被风控，请勿频繁操作", "", obj?.tips);
            $done({ body });
            return;
        }

        const floors = obj?.floors;
        if (!Array.isArray(floors)) {
            logError("handleWareBusiness", "floors is not an array", floors);
            $done({ body });
            return;
        }

        const commodityInfo = floors[floors.length - 1];
        const shareUrl = commodityInfo?.data?.property?.shareUrl;

        if (!shareUrl) {
            logError("handleWareBusiness", "shareUrl not found", commodityInfo);
            $done({ body });
            return;
        }

        requestHistoryPrice(shareUrl)
            .then(data => {
                if (data) {
                    const lowerWord = createAdWord();
                    const bestIndex = findInsertIndex(floors, lowerWord);

                    if (data.ok === 1 && data.single) {
                        const lowerMsg = createLowerMsg(data.single);
                        const detail = createPriceSummary(data);
                        const tip = data.PriceRemark?.Tip + " (仅供参考)";
                        lowerWord.data.ad.adword = `${lowerMsg} ${tip}\n${detail}`;
                    } else if (data.ok === 0 && data.msg) {
                        lowerWord.data.ad.adword = "慢慢买提示您：" + data.msg;
                    }

                    floors.splice(bestIndex, 0, lowerWord);
                }
                $done({ body: JSON.stringify(obj) });
            })
            .catch(error => {
                logError("requestHistoryPrice", error, null);
                $done({ body });
            });
    } catch (error) {
        logError("handleWareBusiness", error, body);
        $done({ body });
    }
}

async function requestHistoryPrice(url) {
    try {
        const response = await $.http.get({ url });
        return JSON.parse(response.body);
    } catch (error) {
        logError("requestHistoryPrice", error, url);
        return null;
    }
}

function createLowerMsg(single) {
    const lower = single.lowerPriceyh;
    const timestamp = parseInt(single.lowerDateyh.match(/\d+/), 10);
    const lowerDate = $.time("yyyy-MM-dd", timestamp);
    return `历史最低:¥${lower} (${lowerDate})`;
}

function createPriceSummary(data) {
    let summary = "";
    const listPriceDetail = data.PriceRemark?.ListPriceDetail?.slice(0, 4) || [];
    const historyList = createHistorySummary(data.single);

    [...listPriceDetail, ...historyList].forEach(item => {
        const nameMap = {
            "双11价格": "双十一价格",
            "618价格": "六一八价格"
        };
        item.Name = nameMap[item.Name] || item.Name;
        summary += `\n${item.Name}        ${item.Price}        ${item.Date}        ${item.Difference}`;
    });
    return summary;
}

function createHistorySummary(single) {
    const singleArray = JSON.parse(`[${single.jiagequshiyh}]`);
    const reversedList = singleArray.map(item => ({
        Date: $.time("yyyy-MM-dd", item[0]),
        Price: `¥${item[1]}`,
        Name: item[2]
    })).reverse().slice(0, 360);

    let currentPrice = reversedList[0]?.Price || 0;
    const lowestList = ["三十天最低", "九十天最低", "一百八最低", "三百六最低"].map((name, i) => ({
        Name: name,
        Price: `¥${currentPrice}`,
        Date: reversedList[0]?.Date,
        Difference: "0"
    }));

    reversedList.forEach((item, index) => {
        if (index < 30 && item.Price < lowestList[0].Price) updateLowest(lowestList[0], item);
        if (index < 90 && item.Price < lowestList[1].Price) updateLowest(lowestList[1], item);
        if (index < 180 && item.Price < lowestList[2].Price) updateLowest(lowestList[2], item);
        if (index < 360 && item.Price < lowestList[3].Price) updateLowest(lowestList[3], item);
    });

    return lowestList;
}

function updateLowest(lowest, item) {
    lowest.Price = `¥${item.Price}`;
    lowest.Date = item.Date;
    lowest.Difference = difference(lowest.Price, item.Price);
}

function findInsertIndex(floors, lowerWord) {
    return floors.findIndex(element => element.mId === lowerWord.mId || element.sortId > lowerWord.sortId) || floors.length;
}

function logError(context, error, data) {
    if (consolelog) {
        console.log(`[${context}] Error:`, error);
        if (data) console.log(`[${context}] Data:`, JSON.stringify(data, null, 2));
    }
}