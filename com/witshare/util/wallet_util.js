const WalletImagesJSON = require('../../../conf/wallet_images');

/**
 * 随机获取一张图片
 */
const randomAnImage = function () {
    const i = parseInt(Math.random() * WalletImagesJSON.length);
    return WalletImagesJSON[i];
};

/**
 * 校验以太坊地址的格式是否正确
 * @param address
 * @returns {boolean}
 */
const validateEthAddress = function (address) {
    return /^0x0$|^0x[A-F0-9a-f]{40}$/.test(address);
}

module.exports = {
    randomAnImage: randomAnImage,
    validateEthAddress: validateEthAddress
};