const walletDao = require('../proxy/');
const tokenDao = require('../proxy/token_dao');
const logger = require('../logger').getLogger('statistics_task');
const tokenService = require('../service/token_service');
const redisUtil = require('../util/redis_util');
const redisKeyManager = require('../common/redis_key_manager');
const schedule = require('node-schedule');
const bigDecimal = require('js-big-decimal');
const FixedConfigJSON = require('../../../conf/fixed_config.json');

/**
 * 校验用户认筹交易有效性
 * @param obj
 * @returns {boolean}
 */
const checkUserPayTxValidity = async function () {
    logger.info('*********************** checkUserPayTxValidity() START *********************');
    const start = Date.now();
    let totalWalletCount = 0;
    let pageIndex = 1;
    let pageSize = 100;
    const tokenList = await tokenDao.findAll();
    let walletList = await walletDao.pageDistinctAddress(pageIndex, pageSize);
    while (walletList && walletList.length > 0) {
        totalWalletCount += walletList.length;
        for (let wallet of walletList) {
            try {
                logger.info('statWalletTotalAssets() current stat wallet address[%s] start', wallet.ethAddress);
                let totalAssets = 0;
                //get balance
                for (let token of tokenList) {
                    logger.info('statWalletTotalAssets() current token[%s：%s]', token.symbol, token.address);
                    await
                        tokenService.getTokenPriceAndWalletAsset(token, wallet.ethAddress);
                    totalAssets += parseFloat(token.assets);
                }
                //save to redis sorted set
                const statAssetsKey = await redisKeyManager.getWalletTotalAssetsStatKey();
                redisUtil.zAdd(statAssetsKey.key, wallet.ethAddress, totalAssets);
                logger.info('statWalletTotalAssets() current stat wallet address[%s]->totalAssets[%s] end==>', wallet.ethAddress, totalAssets);
            } catch (err) {
                logger.error('statWalletTotalAssets() error: wallet[%s] ; error detail==>', wallet.ethAddress, err);
                continue;
            }
        }
        walletList = await walletDao.pageDistinctAddress(pageIndex, pageSize);
    }
    logger.info('*********************** checkUserPayTxValidity() END *********************** ==> ' +
        'total used time=%sms;', Date.now() - start);
};


module.exports = {
    checkUserPayTxValidity: checkUserPayTxValidity,
};

