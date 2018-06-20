var exchange_rate_url = "https://finance.google.cn/finance/converter?a=1&from=USD&to=CNY&meta=ei%3Dl8-wWvGhLoWf0wSO4ongCw";
var logger = require("../logger.js").getLogger('common_util');
var superagent = require("superagent"),
    cheerio = require("cheerio"),
    request = require('request'),
    fs = require('fs');
var redisTokenUtil = require("./redis_token_util.js")
var https = require("https");

var configJson = require(ConfigPath + 'config.json');
// etherscan
var EtherScanUrl = configJson.eth.etherscan_url_prefix;
var ApiEtherScanUrl = configJson.eth.api_etherscan_url_prefix;
var imgDirPath = configJson.qingstor.img_dir_path;
var qingStorUtil = require("../util/qingstor_util.js");
//https://pek3a.qingstor.com:443/rmbdembucket/0x0.png
var imgPathPrefix = "https://pek3a." + configJson.qingstor.host + ":" + configJson.qingstor.port + "/" +
    configJson.qingstor.bucket + "/";

// get Usd to rmb rate TODO to delete
var refreshExchangeRate = function (funcName) {
    var userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
    superagent.get(exchange_rate_url)
        .set({'User-Agent':userAgent})
        .timeout({ response: 1000, deadline: 10000 })
        .end(function (err, pres) {
        // 常规的错误处理
        if (err) {
            logger.error("refreshExchangeRate error : ", err);
            return;
        }
        var $ = cheerio.load(pres.text);
        var val = $('#currency_converter_result').find(".bld").html();
        var val = val.split(' ')[0];
        logger.info("refreshExchangeRate result is : ", val);
        funcName(val);
    });
};

var getTokensByAddress = function (address, funcName) {
    logger.info("getTokensByAddress : {address:%s}", address);
    var url = EtherScanUrl + "/address/" + address + "#comments";
    logger.debug("token url : %s", url);
    var userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
    superagent.get(url)
        .set({'User-Agent':userAgent})
        // .timeout({ response: 10000, deadline: 10000 })
        .end(function(err, pres) {
        // 常规的错误处理
        if (err) {
            logger.error("getTokensByAddress : { address : %s, err : %s}.", address, JSON.stringify(err));
            return;
        }
        var $ = cheerio.load(pres.text);
        var list = [];
        if ($('#balancelist').children().length > 0) {
            $('#balancelist').children().each(function (index, element) {
                var tokenUrl = $(this).children().first().attr("href");
                if (typeof(tokenUrl) != 'undefined') {
                    var constractAddress = tokenUrl.split(/\/token\/|\?/)[1];
                    logger.debug(address + " constractAddress : " + constractAddress);
                    list.push(constractAddress);
                }
            });
        }
        else {
            list.push("0x0");
        }
        console.debug("list size : ", list.length);
        funcName(list);
    });
};

const userAgents = [
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.71 Safari/537.1 LBBROWSER',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0) ,Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:2.0b13pre) Gecko/20110307 Firefox/4.0b13pre',
    'Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; LBBROWSER)',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6',
    'Mozilla/5.0 (X11; U; Linux; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
]

var refreshTokenPrice = function (address, funcName) {
    var UsdPrice = 0;
    var userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
    superagent.get(EtherScanUrl + "token/" + address + "#tokenInfo")
        .set({'User-Agent':userAgent})
        .timeout({ response: 80000, deadline: 60000 }).end(function (err, pres) {
        // 常规的错误处理
        if (err) {
            logger.error("refreshTokenPrice : {address:%s, err:%s}.", address, JSON.stringify(err));
            return;
        }
        logger.debug("get refreshTokenPrice success.");
        var $ = cheerio.load(pres.text);
        UsdPrice = $("#ContentPlaceHolder1_tr_valuepertoken").children().next().text().split(/\$|@/)[1];
        logger.info("refreshTokenPrice : {address:%s, usdPrice:%s}.", address, UsdPrice);
        funcName("usdPrice", UsdPrice);
    });
    return UsdPrice;
};

var initTokenUsdPrice = async function (address, funcName) {
    var usdCny = await redisTokenUtil.getTokenUsdCny(address);
    logger.debug(usdCny);
    if (funcName) {
        funcName({UsdPrice: usdCny.usdPrice, CnyPrice: usdCny.cnyPrice, logo: imgPathPrefix + address + ".png"});
    }
    var userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
    refreshTokenImg(address);
};

var refreshTokensImg = async function () {
    qingStorUtil.uploadImgsByPath(imgDirPath);
};

var refreshTokenImg = async function (tokenAddress) {
    var userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
    var url = EtherScanUrl + "/token/" + tokenAddress + "#tokenInfo";
    superagent.get(url)
        .set({'User-Agent':userAgent})
        // .timeout({ response: 1000, deadline: 10000 })
        .end(function (err, pres) {
            // 常规的错误处理
            if (err) {
                logger.error("initToken img : {tokenAddress:%s, err:%s}", tokenAddress, JSON.stringify(err))
                return;
            }
            var $ = cheerio.load(pres.text);
            var imgContent = cheerio.load($("h1.pull-left").html());
            var imgUrl = imgContent('img').attr("src");
            if (imgUrl) {
                var path = imgDirPath + "/" + tokenAddress + '.png';
                // var path = imgDirPath + "/" + tokenAddress;
                // request(EtherScanUrl + imgUrl).pipe(fs.createWriteStream(path));
                var myP = new Promise(function (resolve, reject) {
                    var stream = request(EtherScanUrl + imgUrl).pipe(
                        fs.createWriteStream(path)
                    );
                    stream.on('finish', function () {
                        logger.info("download token img : {tokenAddress:%s, img:%s}", tokenAddress, path);
                        qingStorUtil.uploadImgByPath(tokenAddress + '.png', path);
                        resolve();
                    });
                    stream.on('error', function (err) {
                        logger.error(err);
                    });
                });
                try {
                    myP.then();
                }
                catch (err) {
                    logger.error("download token img error tokenAddress:" + tokenAddress + ", error:", err);
                }
            }
        });
}

// TODO to delete
var refreshEtherPrice = function (funcName) {
    https.get(ApiEtherScanUrl + "api?module=stats&action=ethprice&apikey=YourApiKeyToken", function (res) {
        var datas = [];
        res.on('data', function (d) {
            datas.push(d);
        });
        res.on('end', function (data) {
            logger.debug("refreshEtherPrice : ", datas);
            var json = JSON.parse(datas.toString());
            logger.info("refreshEtherPrice result : ", json.result);
            if (json.status == "1") {
                funcName(json.result.ethusd);
            }
        });
    }).on('error', function (e) {
        logger.error("refreshEtherPrice error : ", e);
    });
};

/**
 * 判断是否null
 * @param data
 */
var isNull = function isNull(data) {
    return (data == "" || typeof data == "undefined" || data == null) ? true : false;
}

/**
 * parse real address receiver and transfer token/ether value in transaction, using token and transaction.
 * @param token : token in the db or redis
 * @param data : transaction input data
 * @param value : transaction value(ether)
 * @param to : transaction receiver
 */
var parseFromTxByToken = function (decimal, data, value, to) {
    var _value = value;
    var _to = to;
    logger.debug("parseFromTxByToken data >> ", data);
    var dataArray = data.split("0xa9059cbb").length;
    if (dataArray.length > 1 && value == 0) {
        _to = dataArray[1].substr(11, 65);
        _value = parseFloat(parseInt(dataArray[1].substr(65), 16));
    }
    var decimal = Math.pow(10, decimal);
    _value = _value / decimal;
    return {
      to:_to,
      value:_value,
    };
};

var parseToAdressByTx = function (to, data, tokenAddress) {
    var _to = to;
    logger.info("parseToAdressByTx data >> ", data);
    var dataArray = data.split("0xa9059cbb");
    if (dataArray.length > 1) {
        _to = "0x" + dataArray[1].substr(24,40);
    }
    if (tokenAddress == _to) {
        return undefined;
    }
    return _to;
};


var parseValueByTx = function (decimal, data, value) {
    var _value = value.toString();
    logger.debug("parseValueByTx data >> ", data);
    var dataArray = data.split("0xa9059cbb");
    if (dataArray.length > 1 && _value == 0) {
        _value = parseFloat(parseInt(dataArray[1].substr(65), 16));
    }
    var decimal = Math.pow(10, decimal);
    _value = _value / decimal;
    return _value;
};

function httpsGet(url, funcName) {
    https.get(url, function (res) {
        var datas = [];
        var size = 0;
        res.on('data', function (data) {
            datas.push(data);
            size += data.length;
        });
        res.on('end', function (err) {
            var result = datas.toString();
            funcName(err, result);
        });
    }).on('error', function (e) {
        logger.error("httpsGet error : ", e);
    });
}

function superAgentGet(url, usd, cny, funcName) {
    var userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
    superagent.get(url)
    .set({'User-Agent':userAgent})
    // .timeout({ response: 10000, deadline: 10000 })
    .end(function(err, pres) {
        // 常规的错误处理
        if (err) {
            logger.error("superAgentGet : { url : %s, err : %s}.", url, JSON.stringify(err));
            return;
        }
        var $ = cheerio.load(pres.text);
        funcName($, usd, cny);
    });
}

function superAgentGetToFeixiaoHao(href, usdPrice, cnyPrice) {
    if (href.indexOf("/currencies/ethereum/") > -1) {
        logger.info("refreshTokenUsdCny : {address:0x0, usdPrice:%s, cnyPrice:%s}.", usdPrice, cnyPrice);
        redisTokenUtil.refreshTokenUsdCny("0x0", usdPrice, cnyPrice);
    }
    superAgentGet(href, usdPrice, cnyPrice, function ($, _usdPrice, _cnyPrice) {
        if (href.indexOf("binance-coin") > -1) {
            logger.debug("superAgentGet : {href:%s}", href);
        }
        var hrefArray = $(".tabBox").children().eq(2).find(".tableinfo").children().eq(5).find(".val").children();
        hrefArray.each(function (i, ele){
            var address = "";
            var hrefTmp = $(this).attr("href");
            logger.info(hrefTmp)
            if (hrefTmp.indexOf("address") > 0) {
                address = hrefTmp.split("/address/")[1];
                logger.info(hrefTmp);
                logger.info("refreshTokenUsdCny : {address:%s, usdPrice:%s, cnyPrice:%s}.", address, usdPrice, cnyPrice);
                redisTokenUtil.refreshTokenUsdCny(address, _usdPrice, _cnyPrice);
                tokenCount++;
            }
            else if (hrefTmp.indexOf("/token/") > 0) {
                address = hrefTmp.split("/token/")[1];
                if (address.indexOf("0x") > -1) {
                    logger.info(hrefTmp);
                    tokenCount++;
                    logger.info("refreshTokenUsdCny : {address:%s, usdPrice:%s, cnyPrice:%s}.", address, usdPrice, cnyPrice);
                    redisTokenUtil.refreshTokenUsdCny(address, _usdPrice, _cnyPrice);
                }
            }
        });
    });
}

function listEachDeal(list) {
    if (!INTERNAL_REFRESH) {
        if (list.length > 0) {
            count = 0;
            tokenCount = 0;
            time = Date.now();
            INTERNAL_REFRESH = setInterval(function () {
                if (list.length > 0) {
                    var tmp = list.pop();
                    superAgentGetToFeixiaoHao(tmp.href, tmp.usdPrice, tmp.cnyPrice);
                    count++;
                }
                else if (list.length == 0 && INTERNAL_REFRESH) {
                    logger.info("tokenCount >>> ", tokenCount);
                    logger.info("time is : " + (Date.now()-time));
                    clearInterval(INTERNAL_REFRESH);
                    list = null;
                    INTERNAL_REFRESH = null;
                }
            }, 800);
        }
    }
}
var time = 0;
var count = 0;
var tokenCount = 0;
var INTERNAL_REFRESH;

/**
 * https://m.feixiaohao.com/
 * syn usd and cny priceRate by feixiaohao net
 * @param pageIndex : page index
 */
var refreshTokenPriceByfxhao = function(pageIndex, list) {
    logger.info("refreshTokenPriceByfxhao page ", pageIndex);
    var url = "https://mapi.feixiaohao.com/v2/morecoin/?coinType=0&sortType=0&page=" + pageIndex;
    if (!list) {
        list = [];
    }
    httpsGet(url, function (err, result) {
        if (err) {
            logger.error("refreshTokenPriceByfxhao error : ", err);
            if (list.size() > 0) {
                listEachDeal(list);
            }
            return;
        }
        var cheerio = require("cheerio");
        try {
            result = result.split(",").join("");
            var array = result.split('\"result2\":\"');
            if (array && array.length > 1) {
                result = array[1].split(/\"}/)[0];
            }
            if (result) {
                result = "<table>" + result + "</table>";
                var $ = cheerio.load(result);
                $("tr").each(function (i, ele) {
                    var td2 = $(this).children().eq(2).html();
                    var href = $(this).children().eq(2).children().first().attr("href");
                    if (href.indexOf("/currencies/ethereum/") > -1) {
                        logger.info(list.length);
                    }
                    href = href.toString();
                    href = href.replace(/\\"/g, "");
                    href = "https://m.feixiaohao.com"+href;
                    var priceArray = td2.split("data-usd");
                    var priceReg = /[0-9]+/;
                    var floatPriceReg = /([1-9]+|0)\.[0-9]+/;
                    var cnyPrice = 0;
                    var usdPrice = 0;
                    if (priceArray.length > 1) {
                        priceArray = priceArray[1].split("data-cny");
                        if (priceArray.length > 1) {
                            var array = floatPriceReg.exec(priceArray[0]);
                            if (array) {
                                usdPrice = array[0];
                            }
                            else {
                                array = priceReg.exec(priceArray[0]);
                                if (array) {
                                    usdPrice = array[0];
                                }
                            }
                            priceArray[1] = priceArray[1].split("data-btc")[0];
                            array = floatPriceReg.exec(priceArray[1]);
                            if (array) {
                                cnyPrice = array[0];
                            }
                            else {
                                array = priceReg.exec(priceArray[1]);
                                if (array) {
                                    cnyPrice = array[0];
                                }
                            }
                        }
                        list.push({href:href, usdPrice:usdPrice, cnyPrice:cnyPrice});
                    }
                });
                refreshTokenPriceByfxhao(pageIndex + 1, list);
            }
            else {
                listEachDeal(list);
            }
        }
        catch (err) {
            logger.error("refreshTokenPriceByfxhao error : ", err);
            refreshTokenPriceByfxhao(pageIndex + 1, list);
        }
    });
};

/*var httpsGet = function (url, rollback) {
    https.get(url, (res) => {
        var datas = [];
        res.on('data', (d) => {
            datas.push(d);
        });
        res.on('end', function (err) {
            if (err) {
                logger.error("httpsGet error : %s", err);
            }
            console.info(datas.toString())
            datas = datas.toString();
            datas = datas.replace("nul,l", "null");
            // var json = JSON.parse(datas);
            logger.debug("httpsGet result : ", datas.toString());
            // rollback(json);
        });
    }).on('error', (e) => {
        logger.error("httpsGet error : ", e);
    });
};*/

module.exports = {
    initTokenUsdPrice: initTokenUsdPrice,
    refreshTokenPrice: refreshTokenPrice,
    refreshExchangeRate: refreshExchangeRate,
    getTokensByAddress: getTokensByAddress,
    refreshEtherPrice: refreshEtherPrice,
    isNull: isNull,
    parseFromTxByToken : parseFromTxByToken,
    refreshTokenPriceByfxhao : refreshTokenPriceByfxhao,
    parseToAdressByTx : parseToAdressByTx,
    parseValueByTx : parseValueByTx,
    imgPathPrefix : imgPathPrefix,
    refreshTokenImg : refreshTokenImg,
    refreshTokensImg : refreshTokensImg
};
