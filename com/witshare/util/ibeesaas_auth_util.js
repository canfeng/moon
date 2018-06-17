const cryptoUtil = require('./crypto_util');
const logger = require('../logger').getLogger('ibeesaas_auth_util');

const METHOD = {
    GET: "GET",
    POST: "POST",
};
const SmsMsgType = {
    verify: 'verify',
    notify: 'notify',
};
/**
 * 生成签名token
 * @param urlPath
 * @param method
 * @param queryParam
 * @param bodyJson
 * @param expireTime
 * @param verison
 * @param ak
 * @param sk
 * @returns {string}
 */
const generateToken = function (urlPath, method, queryParam, bodyJson, expireTime, verison, ak, sk) {
    const signArr = [];
    // |v2-{AK}-{ExpireTime}|{SK}|
    signArr.push("|", verison, "-", ak, "-", expireTime, "|", sk, "|");
    // {UrlPath}|
    signArr.push(urlPath, "|");
    // {Method}|
    signArr.push(method, "|");
    // {QueryParam}|
    if (queryParam) {
        const paramArr = queryParam.split("&");
        paramArr.sort();
        for (let i = 0; i < paramArr.length; i++) {
            if (i != 0) {
                signArr.push("&");
            }
            signArr.push(paramArr[i]);
        }
    }
    signArr.push("|");
    // {bodyJson}|
    if (bodyJson != null && bodyJson != undefined && bodyJson != "") {
        signArr.push(bodyJson);
    }
    signArr.push("|");

    const signStr = signArr.join("");
    logger.debug('generateToken()|the string before final authToken==>', signStr);
    const signature = cryptoUtil.MD5(signStr);

    // v2-{AK}-{ExpireTime}-{Signature}
    const tokenArr = [];
    tokenArr.push(verison, "-", ak, "-", expireTime, "-", signature);
    const token = tokenArr.join("");
    return token;
};

/**
 * 验证authToken
 * @param authToken
 * @param urlPath
 * @param method
 * @param queryParam
 * @param bodyJson
 * @param configInfo 配置信息
 */
const verifyToken = function (authToken, urlPath, method, queryParam, bodyJson, configInfo) {
    if (!authToken) {
        logger.warn('verifyToken()|authToken error');
        return false;
    }
    const arr = authToken.split('-');
    if (arr.length != 4) {
        logger.warn("checkSignAuthToken()|invalid token format==>authToken:", authToken);
        return false;
    }
    //check version
    const version = arr[0];
    if (!version || configInfo.version != version) {
        logger.warn("checkSignAuthToken()|invalid version==>authToken:", authToken);
        return false;
    }
    //check ak
    const ak = arr[1];
    const sk = configInfo.ak_sk[ak];
    if (!ak || !sk) {
        logger.warn("checkSignAuthToken()|invalid ak==>authToken:", authToken);
        return false;
    }
    //check expireTime
    const expireTime = parseInt(arr[2]);
    if (!expireTime || expireTime < Date.now() / 1000) {
        logger.warn("checkSignAuthToken()|expired token==>authToken:", authToken);
        return false;
    }
    //check sk
    const correctToken = generateToken(urlPath, method, queryParam, bodyJson, expireTime, configInfo.version, ak, sk);
    if (correctToken != authToken) {
        logger.warn('checkSignAuthToken()|invalid sk==>authToken:%s ; correntToken:%s', authToken, correctToken);
        return false;
    }
    logger.info('checkSignAuthToken()|authToken validate success');
    return true;
};

module.exports = {
    generateToken: generateToken,
    verifyToken: verifyToken,
    METHOD: METHOD,
    SmsMsgType: SmsMsgType,
};
