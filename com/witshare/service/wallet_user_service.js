const log4js = require('../logger');
const logger = log4js.getLogger('wallet_user_service');
const Promise = require('bluebird');
const redisUtil = require('../util/redis_util');
const walletUserDao = require('../proxy/wallet_user_dao');
const ConfigJSON = require(ConfigPath + 'config.json');
const cryptoUtil = require('../util/crypto_util');
const ibeesaasAuthUtil = require('../util/ibeesaas_auth_util');
const httpUtil = require('../util/http_util');
const timeUtil = require('../util/time_util');
const commonUtil = require('../util/common_util');
const responseUtil = require('../util/response_util');
const globalConfig = require('../common/global_config');
const redisKeyManager = require('../common/redis_key_manager');
const alarmService = require('./alarm_service');


/**
 * 获取当前用户的userToken
 * @param request
 */
const getCurrentUserToken = function (request) {
    return request.header(ConfigJSON.request_header.user_token);
};

/**
 * 根据userToken获取userInfo
 * @param userToken
 * @returns {Promise<any>}
 */
const getUserInfoByUserToken = async function (userToken) {
    const redisKey = ConfigJSON.redis_key.user_token_prefix_key + userToken;
    logger.info('find current login user from redis==>userToken:', userToken);
    const data = await redisUtil.get(redisKey);
    return data ? JSON.parse(data) : null;
}


/**
 * 获取当前用户的手机号
 * @param request
 * @returns {*}
 */
const getCurrentUserPhone = async function (request) {
    const userToken = getCurrentUserToken(request);
    const userInfo = await getUserInfoByUserToken(userToken);
    if (!userInfo) {
        return null;
    }
    return userInfo.decryptPhone;
};

/**
 * 获取用户交易密码
 * @returns {Promise<*>}
 */
const getPasswordByUserPhone = async function (userPhone) {
    const walletUser = await walletUserDao.findByUserPhone(userPhone);
    return walletUser ? walletUser.password : null;
};

/**
 * 检查密码是否符合规则
 * @param password
 * @returns {boolean}
 */
const checkPasswordRegular = function (password) {
    return /^(?=[\x21-\x7E]*\d)(?=[\x21-\x7E]*[a-z])(?=[\x21-\x7E]*[A-Z])[\x21-\x7E]{8,30}$/.test(password);
};

/**
 * 检查交易密码的正确性
 * @param userPhone
 * @param password
 * @param needDecrypt 密码是否需要解密
 * @returns {Promise<void>}
 */
const validatePassword = async function (userPhone, password, needDecrypt) {
    if (await validatePwdErrorTimesIsUpToUpperLimit(userPhone)) {
        return {
            validity: false,
            errorCode: responseUtil.RES_CODE.PWD_CONTINUOUS_ERROR_TIMES_UPPER_LIMIT_ERROR
        }
    }
    const savedPassword = await getPasswordByUserPhone(userPhone);
    if (!savedPassword) {
        return {
            validity: false,
            errorCode: responseUtil.RES_CODE.PASSWORD_NOT_SET
        };
    }
    if (needDecrypt) {
        // AES解密收到的密码
        password = cryptoUtil.AES.decryptNoPadding(password, ConfigJSON.aes_cipher_key.password_cipher);
    }
    if (!cryptoUtil.verifySaltMD5(password, savedPassword)) {
        //增加错误次数
        incrUserPwdErrorTimes(userPhone);
        return {
            validity: false,
            errorCode: responseUtil.RES_CODE.PASSWORD_ERROR
        };
    }
    //清空错误次数缓存
    cleanUserPwdErrorTimes(userPhone);
    return {
        validity: true,
    };
};

/**
 * 检测用户密码错误次数是否已达当前自然日上限
 * @param userPhone
 * @returns {Promise<void>}
 */
const validatePwdErrorTimesIsUpToUpperLimit = async function (userPhone) {
    const redisKeyInfo = await redisKeyManager.getUserPwdContinuousErrorTimesKey(userPhone);
    const errorTimes = await redisUtil.get(redisKeyInfo.key);
    if (!errorTimes) {
        return false;
    }
    return errorTimes >= await globalConfig.getIntValueByKey('upper_limit_user_pwd_continuous_error_times');
};

/**
 * 用户密码验证错误的情况下调用，增加用户当前自然日密码错误次数
 * @param userPhone
 */
const incrUserPwdErrorTimes = async function (userPhone) {
    const redisKeyInfo = await redisKeyManager.getUserPwdContinuousErrorTimesKey(userPhone, true);
    const times = await redisUtil.incr(redisKeyInfo.key);
    if (times == 1) {
        redisUtil.expire(redisKeyInfo.key, redisKeyInfo.expire);
    } else if (times >= await globalConfig.getIntValueByKey('upper_limit_user_pwd_continuous_error_times')) {
        logger.info('incrUserPwdErrorTimes()|current locked user==>', userPhone);
        //记录当天已锁定用户
        const lockedUserNumKeyInfo = await redisKeyManager.getLockedUserListKey(true);
        let currentLockedUserNum = await redisUtil.hlen(lockedUserNumKeyInfo.key);
        await redisUtil.hset(lockedUserNumKeyInfo.key, userPhone, times);
        if (currentLockedUserNum == 0) {
            redisUtil.expire(lockedUserNumKeyInfo.key, lockedUserNumKeyInfo.expire);
        }
        currentLockedUserNum = await redisUtil.hlen(lockedUserNumKeyInfo.key);
        //检查是否触发预警
        alarmService.checkIsTouchAlarmCondition(alarmService.ALARM_TYPE.LOCKED_USER_NUM, currentLockedUserNum);
        return true;
    }
};

/**
 * 清空密码输入错误次数redis缓存
 * @param userPhone
 * @returns {Promise<void>}
 */
const cleanUserPwdErrorTimes = async function (userPhone) {
    const redisKeyInfo = await redisKeyManager.getUserPwdContinuousErrorTimesKey(userPhone);
    redisUtil.del(redisKeyInfo.key);
}


/**
 * 设置交易密码和密码提示信息
 * @param userToken
 * @param password
 * @param passwordHint 密码提示信息
 * @param tx transaction 事务
 * @returns {Promise<*>}
 */
const updatePasswordAndHint = async function (userPhone, password, passwordHint, tx) {
    const encodePassword = cryptoUtil.MD5WithSalt(password);
    return await walletUserDao.setPasswordByUserPhone(userPhone, encodePassword, passwordHint, tx);
};

/**
 * 检查短信验证码
 * @returns {Promise<void>}
 */
const validatePhoneValidCode = async function (userPhone, scene, phoneValidCode) {
    const redisKeyInfo = await redisKeyManager.getSmsValidCodeKey(userPhone, scene);
    const localValidCode = await redisUtil.get(redisKeyInfo.key);
    if (localValidCode == phoneValidCode) {
        redisUtil.del(redisKeyInfo.key);
        return true;
    }
    return false;
};

/**
 * 生成验证码并发送短信
 * @param userPhone
 * @returns {Promise<void>}
 */
const generateValidCodeAndSendSms = async function (userPhone, scene) {
    if (!userPhone || !scene) {
        logger.warn('generateValidCodeAndSendSms() need args : userPhone and scene');
        return;
    }
    const smsConfig = ConfigJSON.ibeesaas.sms;
    let validCode;
    const redisKeyInfo = await redisKeyManager.getSmsValidCodeKey(userPhone, scene, true);
    validCode = await redisUtil.get(redisKeyInfo.key);
    if (!validCode) {
        validCode = commonUtil.randomNumStr(4);
    }
    logger.info('generate valid code ==>phone:%s;code:%s', userPhone, validCode);
    //保存到redis
    redisUtil.set(redisKeyInfo.key, validCode, redisKeyInfo.expire);
    const body = {
        appId: smsConfig.biz_type,
        msgType: ibeesaasAuthUtil.SmsMsgType.verify,
        body: smsConfig.template.verify.replace('{0}', validCode),
        phoneNo: userPhone
    };
    const expireTime = parseInt(Date.now() / 1000 + 3600);
    const authToken = ibeesaasAuthUtil.generateToken(smsConfig.url, ibeesaasAuthUtil.METHOD.POST, "", JSON.stringify(body), expireTime, smsConfig.version, smsConfig.ak, smsConfig.sk);
    const urlPath = smsConfig.host + smsConfig.url;
    const header = {};
    header[smsConfig.header] = authToken;
    try {
        const res = await httpUtil.post(urlPath, body, header);
        return res && res.retCode == 1000;
    } catch (err) {
        logger.info('generateValidCodeAndSendSms()|send sms failed==>userPhone=%s |exception detail==>', userPhone, err);
        return null;
    }
};

/**
 * 增加用户当日转账次数
 * @param userPhone
 * @returns {Promise<void>}
 */
const incrUserTransferTimes = async function (userPhone) {
    const keyInfo = await redisKeyManager.getUserTransferTimesKey(userPhone, true);
    const times = await redisUtil.incr(keyInfo.key);
    if (times == 1) {
        redisUtil.expire(keyInfo.key, keyInfo.expire);
    }
};


/**
 * 检查用户当日转账次数是否达到上限
 * @returns {Promise<boolean>}
 */
const checkUserTransferTimesIsUpToUpperLimit = async function (userPhone) {
    const keyInfo = await redisKeyManager.getUserTransferTimesKey(userPhone);
    const value = await redisUtil.get(keyInfo.key);
    if (!value) {
        return false;
    }
    return value >= await globalConfig.getIntValueByKey('upper_limit_user_transfer_times');
};

/**
 * 首次创建或者导入奖励用户蜂蜜(Turin)
 * @param userPhone
 * @param operation 操作类型 、firstCreate，
 * @returns {Promise<void>}
 */
const notifyTurinRewardAssets = async function (userPhone, operation) {
    const msg = {phone: userPhone, taskId: 9, timestamp: Date.now()};
    const jsonMsg = JSON.stringify(msg);
    logger.info('notifyTurinRewardHoney()|notify turin reward userPhone:[%s];operation:[%s];msg:[%s]', userPhone, operation, jsonMsg);
    await redisUtil.lpush(ConfigJSON.redis_key.turin_add_assets_queue, jsonMsg);
    redisUtil.publish(ConfigJSON.redis_key.turin_add_assets_pubsub, operation);
};


/**
 * 增加用户1小时内转账调用次数
 * @param userPhone
 * @returns {Promise<void>}
 */
const incrUserTransferCallTimes = async function (userPhone) {
    const keyInfo = await redisKeyManager.getUserTransferCallTimesKey(userPhone, true);
    const totalTimes = await redisUtil.incr(keyInfo.key);
    if (totalTimes == 1) {
        redisUtil.expire(keyInfo.key, keyInfo.expire);
    }
    let callFailedTimesKey = await redisKeyManager.getUserTransferCallFailedTimesKey(userPhone);
    let failedTimes = await redisUtil.get(callFailedTimesKey.key);
    alarmService.checkIsTouchAlarmCondition(alarmService.ALARM_TYPE.TRANSFER_FAIL_RATE, failedTimes, totalTimes, userPhone);
};

/**
 * 增加用户1小时内转账调用失败次数
 * @param userPhone
 * @returns {Promise<void>}
 */
const incrUserTransferCallFailedTimes = async function (userPhone) {
    const keyInfo = await redisKeyManager.getUserTransferCallFailedTimesKey(userPhone, true);
    const failedTimes = await redisUtil.incr(keyInfo.key);
    if (failedTimes == 1) {
        redisUtil.expire(keyInfo.key, keyInfo.expire);
    }
    let callTimesKey = await redisKeyManager.getUserTransferCallTimesKey(userPhone);
    let totalTimes = await redisUtil.get(callTimesKey.key);
    alarmService.checkIsTouchAlarmCondition(alarmService.ALARM_TYPE.TRANSFER_FAIL_RATE, failedTimes, totalTimes, userPhone);
};
/**
 * 密码解密
 * @param userPhone
 * @returns {Promise<void>}
 */
const decryptPassword = function (password) {
    return cryptoUtil.AES.decryptNoPadding(password, ConfigJSON.aes_cipher_key.password_cipher);
};


module.exports = {
    getCurrentUserPhone: getCurrentUserPhone,
    getCurrentUserToken: getCurrentUserToken,
    getPasswordByUserPhone: getPasswordByUserPhone,
    validatePassword: validatePassword,
    updatePasswordAndHint: updatePasswordAndHint,
    validatePhoneValidCode: validatePhoneValidCode,
    generateValidCodeAndSendSms: generateValidCodeAndSendSms,
    incrUserTransferTimes: incrUserTransferTimes,
    checkUserTransferTimesIsUpToUpperLimit: checkUserTransferTimesIsUpToUpperLimit,
    notifyTurinRewardAssets: notifyTurinRewardAssets,
    incrUserTransferCallTimes: incrUserTransferCallTimes,
    incrUserTransferCallFailedTimes: incrUserTransferCallFailedTimes,
    checkPasswordRegular: checkPasswordRegular,
    decryptPassword: decryptPassword
};

