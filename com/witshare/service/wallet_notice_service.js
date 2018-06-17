var logger = require("../logger.js").getLogger('wallet_notice_service');
var walletNoticeDao = require("../proxy/wallet_notice_dao.js");
var walletDao = require("../proxy/wallet_dao.js");
var jpushUtil = require("../util/jpush_util.js");
var walletUserDao = require('../proxy/wallet_user_dao.js');
var behaveNmaes = {
    "from": "转出",
    "to": "转入"
};

function generateTile(behavior, status) {
    return behaveNmaes[behavior] + generateStatus(status) + "通知";
}

function generateStatus(status) {
    return status == 1 ? "成功" : "失败";
}

function generateContent(userName, walletName, val, symbol, behavior, status) {
    return userName + "的" + walletName + "钱包" + val + symbol + behaveNmaes[behavior] + generateStatus(status);
}

async function oneWalletNoticeDeal(item, val, symbol, behavior, status, addressFrom, addressTo, txhash) {
    await walletUserDao.findByUserPhone(item.userPhone).then(function (walletUser) {
        if (walletUser) {
            var deviceId = walletUser.jPushRegId;
            var title = generateTile(behavior, status);
            var type = behavior == "from" ? 1 : 0;
            var content = generateContent(walletUser.userPhone, item.name, val, symbol, behavior, status);
            var walletNotice = {
                userPhone: walletUser.userPhone,
                walletName: item.name,
                value: val,
                symbol: symbol,
                status: status,
                addressFrom: addressFrom,
                addressTo: addressTo,
                txhash: txhash,
                type: type
            };

            var extraContent = {
                "msgType": "1", // transaction notice type (default)
                "txhash": txhash,
                "walletAddress": item.ethAddress
            };
            walletNoticeDao.addWalletNotice(walletNotice).then(function (res) {
                logger.info("oneWalletNoticeDeal extraContent : ", JSON.stringify(extraContent));
                if (res.id && walletUser.loginStatus) {
                    jpushUtil.sendMessage(deviceId, title, content, extraContent, function (_status) {
                        if (_status == 0) {
                            logger.error("sendWalletNotice error : ", JSON.stringify(walletNotice));
                        }
                    });
                }
            }).catch(function (err) {
                logger.info("has exist this record.");
            });
        }
    });
}

var sendWalletNotice = function (txhash, val, symbol, status, addressFrom, addressTo) {
    walletNoticeDao.findByTxhash(txhash).then(function (notices) {
        if (notices.count == 2) {
            logger.info("sendWalletNotice exist this txhash ", txhash);
            return;
        }
        // from address
        walletDao.findByAddress(addressFrom).then(function (list) {
            if (list && list.length > 0) {
                list.forEach(function (item) {
                    oneWalletNoticeDeal(item, val, symbol, "from", status, addressFrom, addressTo, txhash);
                });
            }
        });
        if (status == 1) {//交易成功才推送给接收者
            // to address
            walletDao.findByAddress(addressTo).then(function (list) {
                if (list && list.length > 0) {
                    list.forEach(function (item) {
                        oneWalletNoticeDeal(item, val, symbol, "to", status, addressFrom, addressTo, txhash)
                    });
                }
            });
        }
    });
};

module.exports = {
    sendWalletNotice: sendWalletNotice
}