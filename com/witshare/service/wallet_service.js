const logger = require('../logger').getLogger('wallet_service');
const walletDao = require('../proxy/wallet_dao');
const ConfigJSON = require(ConfigPath + 'config.json');
const globalConfig = require('../common/global_config');
const redisKeyManager = require('../common/redis_key_manager');
const cryptoUtil = require('../util/crypto_util');
const redisUtil = require('../util/redis_util');
const walletUtil = require('../util/wallet_util');
const alarmService = require('../service/alarm_service');


/**
 * 检查walletAddress和userPhone是否匹配,并返回wallet
 * @param walletAddress
 * @param userPhone
 * @returns {Promise<*>}
 */
const checkWalletAddressAndUserPhoneIsMatch = async function (walletAddress, userPhone) {
    const wallet = await walletDao.findByAddressAndUserPhone(walletAddress, userPhone);
    if (!wallet) {
        incrWalletAddressAndUserPhoneMisMatchNum();
    }
    return wallet;
};

/**
 * 增加当日钱包地址和手机号不匹配次数
 * @returns {Promise<void>}
 */
const incrWalletAddressAndUserPhoneMisMatchNum = async function () {
    let keyInfo = await redisKeyManager.getWalletAddressAndUserPhoneMismatchNumKey(true);
    let num = await redisUtil.incr(keyInfo.key);
    if (num == 1) {
        redisUtil.expire(keyInfo.key, keyInfo.expire);
    }
    alarmService.checkIsTouchAlarmCondition(alarmService.ALARM_TYPE.WALLETADDRESS_USERPHONE_MISMATCH_NUM, num);
};

/**
 * 检查用户已有钱包数是否已达上限
 * @returns {Promise<void>}
 */
const checkUserWalletCountIsUpToUpperLimit = async function (userPhone) {
    const walletCount = await walletDao.countByUserPhone(userPhone);
    if (walletCount >= await globalConfig.getIntValueByKey('upper_limit_user_wallet_count')) {
        return true;
    }
    return false;
};

/**
 * 检查钱包名称是否重复，在同一手机号下
 * @param walletName
 * @param userPhone
 * @returns {Promise<void>}
 */
const checkWalletNameIsRepeatedUnderSameUserPhone = async function (walletName, userPhone) {
    const count = await walletDao.countByUserPhoneAndName(userPhone, walletName);
    return count > 0;
};

/**
 * 解密walletAddress
 * @param walletAddress
 * @param compatibleUnencrypted 是否兼容为加密的地址
 * @returns {Promise<void>}
 */
const decryptWalletAddress = function (walletAddress, compatibleUnencrypted) {
    if (compatibleUnencrypted) {
        if (walletUtil.validateEthAddress(walletAddress)) {
            return walletAddress;
        }
    }
    return cryptoUtil.AES.decryptNoPadding(walletAddress, ConfigJSON.aes_cipher_key.wallet_address_cipher);
}

module.exports = {
    checkUserWalletCountIsUpToUpperLimit: checkUserWalletCountIsUpToUpperLimit,
    checkWalletAddressAndUserPhoneIsMatch: checkWalletAddressAndUserPhoneIsMatch,
    checkWalletNameIsRepeatedUnderSameUserPhone: checkWalletNameIsRepeatedUnderSameUserPhone,
    decryptWalletAddress: decryptWalletAddress,
};

