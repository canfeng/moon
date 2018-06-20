/**
 * Created by shizhiguo on 2018/4/18
 */
const FixedConfigJSON = require('../../../conf/fixed_config.json');
const timeUtil = require('../util/time_util');
const globalConfig = require('../common/global_config');

/**
 * 获取项目地址对应的v3json的redis key
 * @param transferToken
 * @param withExpire 是否获取过期时间
 * @returns {Promise<{key: string}>}
 */
const getKeyPlatformProjectV3Json = async function (projectAddress) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.wallet_v3_json + projectAddress,
    };
    return keyInfo;
};

const getKeyWalletAddressLastTxNonce = async function (address) {
    const keyInfo = {
        key: FixedConfigJSON.redis_key.wallet_address_last_nonce + address,
    };
    return keyInfo;
};


module.exports = {
    getKeyPlatformProjectV3Json: getKeyPlatformProjectV3Json,
    getKeyWalletAddressLastTxNonce: getKeyWalletAddressLastTxNonce
}
