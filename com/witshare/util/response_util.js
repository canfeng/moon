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
    SUCCESS: ['0', '成功'],
    SYSTEM_EXCEPTION: ['-1', '网络请求异常'],
    BUSY_ERROR: ['-2', '服务器正在维护，请稍后再试。'],
    LOGIN_ERROR: ['1000', '未登录或登录失败'],
    LOGIN_FROM_OTHER_DEVICE_ERROR: ['-602', '您的帐号已在其它设备登录'],
    PASSWORD_NOT_SET: ['1010', '钱包密码未设置，请先设置'],
    PARAMS_ERROR: ['1020', '参数有误'],
    PARAMS_ADDRESS_ERROR: ['1021', '地址参数格式有误'],
    PASSWORD_ERROR: ['1030', '钱包密码不正确'],
    PASSWORD_REGULAR_ERROR: ['1031', '钱包密码不符合规则'],
    WALLET_NOT_FOUND: ['1040', '该钱包不属于您'],
    KEYSTORE_OR_PASSWORD_ERROR: ['1050', 'KeyStore和密码不匹配'],
    PRIVATE_KEY_ERROR: ['1051', '私钥格式有误'],
    WALLET_ALREADY_ADDED: ['1060', '该钱包已经在您的钱包列表中，不能重复导入'],
    TOKEN_NOT_FOUND: ['1070', 'Token未找到'],
    PHONE_VALID_CODE_ERROR: ['1080', '短信验证码不正确'],
    DEVICE_NUMBER_ERROR: ['1090', '缺少设备号'],
    WALLET_COUNT_TO_UPPER_LIMIT: ['1100', '您的钱包数量已达上限'],
    SIGNATURE_AUTH_TOKEN_ERROR: ['1110', '接口签名验证错误'],
    TOKEN_TRANSFER_ERROR: ['1120', '转账失败'],
    TOKEN_TRANSFER_TO_INVALID_ERROR: ['1121', '不能转账给自己'],
    TRANSFER_TOKEN_ERROR: ['1130', 'TransferToken不正确或已过期'],
    TRANSFER_TOKEN_IN_DEAL_ERROR: ['1131', '该笔交易正在处理，请稍等...'],
    PWD_CONTINUOUS_ERROR_TIMES_UPPER_LIMIT_ERROR: ['1140', '您在当日密码连续错误次数已达上限，请明天再试'],
    USER_TRANSFER_TIMES_UPPER_LIMIT_ERROR: ['1150', '您在当日转账次数已达上限，请明天再试'],
    JPUSH_REG_ID_ERROR: ['1160', '缺少极光推送ID'],
    WALLET_NAME_REPEATED_ERROR: ['1170', '钱包名称不能重复'],
    WALLET_CREATE_FAILED_ERROR: ['1180', '钱包创建失败，请稍候再试'],
    USERNAME_OR_PWD_ERROR: ['2000', '用户名或密码错误'],
    TOKEN_ALREADY_EXIST_ERROR: ['2010', 'Token已经存在，请勿重复添加'],

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