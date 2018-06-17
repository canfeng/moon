var walletCache = require('memory-cache');
var logger = require("../logger.js").getLogger("wallet_cache");
var putWallet = async function(key, wallet, expire) {
    if (!expire) {
        expire = 100000;
    }
    logger.info("putWallet : {key:%s, wallet:%s, expire:%s}.", key.substr(0,key.lastIndexOf("#")), wallet.address, expire);
    walletCache.put(key, wallet, expire, function () {
        logger.info("walletCache key %s overdue.", key);
    });
    var wallet = walletCache.get(key);
}

var getWalletByKey = function (phone, walletId, password) {
    var key = phone + "#" + walletId + "#" + password;
    return walletCache.get(key);
}

var getWalletByGenerateKey = function (key) {
    return walletCache.get(key);
}

module.exports = {
    getWalletByKey:getWalletByKey,
    putWallet:putWallet,
    getWalletByGenerateKey:getWalletByGenerateKey
};