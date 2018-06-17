const logger = require('../logger').getLogger('wallet_service');
const walletDao = require('../proxy/wallet_dao');
const ConfigJSON = require(ConfigPath + 'config.json');
const globalConfig = require('../common/global_config');
const cryptoUtil = require('../util/crypto_util');
const walletUtil = require('../util/wallet_util');


/**
 * 检查walletAddress和userPhone是否匹配,并返回wallet
 * @param walletAddress
 * @param userPhone
 * @returns {Promise<*>}
 */
const checkWalletAddressAndUserPhoneIsMatch = async function (walletAddress, userPhone) {
    const wallet = await walletDao.findByAddressAndUserPhone(walletAddress, userPhone);
    return wallet;
};



module.exports = {
    checkUserWalletCountIsUpToUpperLimit: checkUserWalletCountIsUpToUpperLimit,
    checkWalletAddressAndUserPhoneIsMatch: checkWalletAddressAndUserPhoneIsMatch,
    checkWalletNameIsRepeatedUnderSameUserPhone: checkWalletNameIsRepeatedUnderSameUserPhone,
    decryptWalletAddress: decryptWalletAddress,
};

