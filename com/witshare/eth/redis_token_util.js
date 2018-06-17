const ConfigJSON = require(ConfigPath + 'config.json');
var logger = require("../logger").getLogger('redis_token_util');
var tokenDao = require("../proxy/token_dao");
const redisUtil = require('../util/redis_util');

var addressSetKey = ConfigJSON.redis_key.address_set_key;

function getTokenKey(tokenAddress) {
    if (tokenAddress) {
        tokenAddress = tokenAddress.toLowerCase();
    }
    return ConfigJSON.redis_key.token_key + tokenAddress;
}

function getTokenDecimalKey(tokenAddress) {
    if (tokenAddress) {
        tokenAddress = tokenAddress.toLowerCase();
    }
    return ConfigJSON.redis_key.token_decimal_key + tokenAddress;
}


function getTokenPriceKey(tokenType) {
    // ether need deel special
    if (tokenType == "0x0") {
        tokenType = "0x08cc736e4abd44c3d689eb1599a27edb";
    }

    if (tokenType) {
        tokenType = tokenType.toLowerCase();
    }
    return ConfigJSON.redis_key.token_price_key + tokenType;
}

var refreshToken = function (token) {
    if (token && token.address) {
        token.address = token.address.toLowerCase();
    }
    redisUtil.set(getTokenKey(token.address), JSON.stringify(token));
};

function generatePriceJson(usdPrice, cnyPrice) {
    return {
        usdPrice: usdPrice,
        cnyPrice: cnyPrice
    }
}

var refreshTokenUsdCny = function (tokenType, usdPrice, cnyPrice) {
    if (tokenType) {
        tokenType = tokenType.toLowerCase();
    }
    redisUtil.set(getTokenPriceKey(tokenType), JSON.stringify(generatePriceJson(usdPrice, cnyPrice)));
};

// TODO to delete, feixiaohao is better than etherscan, this function is for etherscan.
var refreshTokenPrice = function (tokenType, val) {
    if (tokenType) {
        tokenType = tokenType.toLowerCase();
    }
    redisUtil.set(getTokenPriceKey(tokenType), val);
};

var refreshTokenByPrice = function (tokenId, cnyPrice, usdPrice) {
    redisUtil.get(getTokenKey(tokenId)).then(function onErr(val) {
        var token = JSON.parse(val);
        token.price_usd = usdPrice;
        token.price_cny = cnyPrice;
        var json = JSON.stringify(token);
        redisUtil.set(getTokenKey(token.id), json);
    });
};

// getTokenDecimalKey
var refreshTokenDecimal = function (address, decimal) {
    if (address) {
        address = address.toLowerCase();
    }
    if (!decimal) {
        decimal = 0;
    }
    redisUtil.set(getTokenDecimalKey(address), decimal);
};

var getTokenDecimal = async function (address) {
    if (address) {
        address = address.toLowerCase();
    }
    var val = await redisUtil.get(getTokenDecimalKey(address));
    if (val) {
        val = parseInt(val);
    }
    return val;
};

var getTokenByAddress = async function (address) {
    if (address) {
        address = address.toLowerCase();
    }
    var token = await redisUtil.get(getTokenKey(address));
    if (token) {
        return JSON.parse(token);
    }
    token = await tokenDao.findByAddress(address);
    if (token) {
        refreshToken(token);
    }
    return token;
};

var getUsdToCnyVal = function (funcName) {
    logger.debug("getTokenPriceKey(\"usdToCny\") : ", getTokenPriceKey("usdToCny"));
    return redisUtil.get(getTokenPriceKey("usdToCny"));
};

var getTokenUsdCny = async function (tokenType) {
    if (tokenType) {
        tokenType = tokenType.toLowerCase();
    }
    var usdCnyPrice = await redisUtil.get(getTokenPriceKey(tokenType));
    if (usdCnyPrice) {
        return JSON.parse(usdCnyPrice);
    }
    return generatePriceJson(0, 0);
};


var addAddressToHash = function (address, val) {
    if (address) {
        address = address.toLowerCase();
    }
    val = val ? val : 1;
    redisUtil.hset(addressSetKey, address, val);
}

var existAddressInHash = async function (address) {
    if (address) {
        address = address.toLowerCase();
    }
    return await redisUtil.hget(addressSetKey, address) ? true : false;
};
module.exports = {
    refreshToken: refreshToken,
    refreshTokenPrice: refreshTokenPrice,
    getTokenByAddress: getTokenByAddress,
    refreshTokenByPrice: refreshTokenByPrice,
    getUsdToCnyVal: getUsdToCnyVal,
    refreshTokenUsdCny: refreshTokenUsdCny,
    getTokenUsdCny: getTokenUsdCny,
    refreshTokenDecimal: refreshTokenDecimal,
    getTokenDecimal: getTokenDecimal,
    addAddressToHash: addAddressToHash,
    existAddressInHash: existAddressInHash
};