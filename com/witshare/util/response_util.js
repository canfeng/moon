const logger = require('../logger').getLogger('response_util');

const build = function (RES_CODE, result) {
    if (RES_CODE == RES_CODE.SUCCESS) {
        success(result);
    } else {
        error(RES_CODE);
    }
};

const success = function (result) {
    if (result == undefined) {
        result = null;
    }
    const response = {
        code: RES_CODE.SUCCESS[0],
        message: RES_CODE.SUCCESS[1],
        result: result
    };
    return response;
};

/**
 *
 * @param RES_CODE
 * @param message
 * @returns {{code: *|string, message: *, result: null}}
 */
const error = function (RES_CODE, message) {
    let resCode = RES_CODE || this.RES_CODE.SYSTEM_EXCEPTION;
    const result = {
        code: resCode[0],
        message: message ? resCode[1] + ':' + message : resCode[1],
        result: null
    };
    logger.info('response error result==>' + JSON.stringify(result));
    return result;
};

const RES_CODE = {
    SYSTEM_EXCEPTION: ['-1', '网络请求异常'],
    SUCCESS: ['0', '成功'],
    FAILED: ['1', '失败'],
    BUSY_ERROR: ['-2', '服务器正在维护，请稍后再试。'],
    PARAMS_ERROR: ['1020', '参数有误'],
    PARAMS_ADDRESS_ERROR: ['1021', '地址参数格式有误'],
    KEYSTORE_OR_PASSWORD_ERROR: ['1050', 'KeyStore和密码不匹配'],
    TOKEN_NOT_FOUND: ['1070', 'Token未找到'],
    WALLET_COUNT_TO_UPPER_LIMIT: ['1100', '您的钱包数量已达上限'],
    SIGNATURE_AUTH_TOKEN_ERROR: ['1110', '接口签名验证错误'],

    TRANSACTION_NOT_FOUND: ['1200', '交易未找到'],
    TRANSACTION_ALREADY_UPDATE_STATUS: ['1210', '该交易已经更新状态，无需重发'],
    TRANSACTION_ALREADY_EXECUTE: ['1220', '该交易已经执行，无需重发'],
    TRANSACTION_DISCARD: ['1230', '交易已作废，无法重发'],
    TRANSACTION_FROM_NOT_MISMATCH: ['1240', '交易的发送方不匹配'],
    TRANSACTION_UNDER_PRICED: ['1240', '重发的交易gasPrice需要大于原先的'],
};

module.exports = {
    build: build,
    success: success,
    error: error,
    RES_CODE: RES_CODE
};