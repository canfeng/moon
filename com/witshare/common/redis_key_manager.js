/**
 * Created by shizhiguo on 2018/4/18
 */
const FixedConfigJSON = require('../../../conf/fixed_config.json');
const timeUtil = require('../util/time_util');
const globalConfig = require('../common/global_config');

/**
 *
 * @param userPhone
 * @param transferToken
 * @param withExpire 是否获取过期时间
 * @returns {Promise<{key: string}>}
 */
const getTransferTokenKey = async function (userPhone, transferToken, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.transfer_token_key + userPhone + '_' + transferToken,
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_transfer_token');
    }
    return keyInfo;
};

const getSmsValidCodeKey = async function (userPhone, scene, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.sms_valid_code_key + userPhone + ":" + scene,
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_sms_valid_code');
    }
    return keyInfo;
};

const getUserPwdContinuousErrorTimesKey = async function (userPhone, withExpire, dateStr) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.user_pwd_continuous_error_times_key + userPhone + ':' + (dateStr ? dateStr : timeUtil.formatCurrentDateTime('yyyyMMdd')),
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_user_pwd_continuous_error_times');
    }
    return keyInfo;
};

const getUserTransferTimesKey = async function (userPhone, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.user_transfer_times_key + userPhone + ':' + timeUtil.formatCurrentDateTime('yyyyMMdd'),
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_user_transfer_times');
    }
    return keyInfo;
};

const getUserFrequentRequestTimesKey = async function (userPhone, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.user_frequent_request_times_key + userPhone,
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('upper_limit_user_frequent_request_times');
    }
    return keyInfo;
};

const getUserDeviceNumberKey = function (userToken) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.user_device_number_key + userToken,
    };
    return keyInfo;
};

const getTransferTokenUsedTimesKey = async function (transferToken, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.transfer_token_used_times_key + transferToken,
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_transfer_token_used_times');
    }
    return keyInfo;
};

const getWalletTotalAssetsStatKey = async function () {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.wallet_total_assets_stat_key,
    };
    return keyInfo;
};

const getTokenTotalHoldStatKey = async function () {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.token_total_hold_stat_key,
    };
    return keyInfo;
};

const getWalletAddressLastTxNonceKey = async function (address) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.wallet_address_last_tx_nonce + address,
    };
    return keyInfo;
}
const getLockedUserListKey = async function (dateStr) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.locked_user_list_key + (dateStr ? dateStr : timeUtil.formatCurrentDateTime('yyyyMMdd')),
    };
    return keyInfo;
};

const getWalletAddressAndUserPhoneMismatchNumKey = async function (withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.wallet_address_and_user_phone_mismatch_num_key + timeUtil.formatCurrentDateTime('yyyyMMdd'),
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_wallet_address_and_user_phone_mismatch_num_key');
    }
    return keyInfo;
};


const getUserTransferCallTimesKey = async function (userPhone, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.user_transfer_call_times_key + userPhone + ':' + timeUtil.formatCurrentDateTime('yyyyMMddhh'),
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_user_transfer_call_times_key');
    }
    return keyInfo;
};

const getUserTransferCallFailedTimesKey = async function (userPhone, withExpire) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.user_transfer_call_failed_times_key + userPhone + ':' + timeUtil.formatCurrentDateTime('yyyyMMddhh'),
    };
    if (withExpire) {
        keyInfo.expire = await globalConfig.getIntValueByKey('expire_user_transfer_call_failed_times_key');
    }
    return keyInfo;
};

module.exports = {
    getTransferTokenKey: getTransferTokenKey,
    getSmsValidCodeKey: getSmsValidCodeKey,
    getUserPwdContinuousErrorTimesKey: getUserPwdContinuousErrorTimesKey,
    getUserTransferTimesKey: getUserTransferTimesKey,
    getUserFrequentRequestTimesKey: getUserFrequentRequestTimesKey,
    getUserDeviceNumberKey: getUserDeviceNumberKey,
    getTransferTokenUsedTimesKey: getTransferTokenUsedTimesKey,
    getLockedUserListKey: getLockedUserListKey,
    getWalletTotalAssetsStatKey: getWalletTotalAssetsStatKey,
    getTokenTotalHoldStatKey: getTokenTotalHoldStatKey,
    getWalletAddressLastTxNonceKey: getWalletAddressLastTxNonceKey,
    getWalletAddressAndUserPhoneMismatchNumKey: getWalletAddressAndUserPhoneMismatchNumKey,
    getUserTransferCallTimesKey: getUserTransferCallTimesKey,
    getUserTransferCallFailedTimesKey: getUserTransferCallFailedTimesKey
}
