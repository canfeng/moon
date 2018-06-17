const walletDao = require('../proxy/wallet_dao');
const tokenDao = require('../proxy/token_dao');
const logger = require('../logger').getLogger('statistics_task');
const tokenService = require('../service/token_service');
const redisUtil = require('../util/redis_util');
const redisKeyManager = require('../common/redis_key_manager');
const schedule = require('node-schedule');
const bigDecimal = require('js-big-decimal');
const FixedConfigJSON = require('../../../conf/fixed_config.json');

/**
 * 统计钱包总资产
 * @param obj
 * @returns {boolean}
 */
const statWalletTotalAssets = async function () {
    logger.info('*********************** statWalletTotalAssets() START *********************');
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
    logger.info('*********************** statWalletTotalAssets() END *********************** ==> ' +
        'total used time=%sms; total wallet count=%s; total token count=%s;', Date.now() - start, totalWalletCount, tokenList.length);
};

/**
 * 定时统计钱包总资产
 * @returns {Promise<void>}
 */
const scheduleStatWalletTotalAssets = async function () {
    schedule.scheduleJob(FixedConfigJSON.normal_config.task_cron_stat_wallet_total_assets, function () {
        statWalletTotalAssets();
    })
};

/**
 * 统计平台支持的各个token的总持有量
 * @returns {Promise<void>}
 */
const statTokenTotalHold = async function () {
    logger.info('*********************** statTokenTotalHold() START *********************');
    const start = Date.now();
    let totalWalletCount = 0;
    let pageIndex = 1;
    let pageSize = 100;

    const tokenList = await tokenDao.findAll();
    let walletList = await walletDao.pageDistinctAddress(pageIndex, pageSize);
    while (walletList && walletList.length > 0) {
        totalWalletCount += walletList.length;
        for (let token of tokenList) {
            logger.info('tatTokenTotalHold() pageIndex=%s; current token[%s：%s]', pageIndex, token.symbol, token.address);
            for (let wallet of walletList) {
                try {
                    let walletBalance = await tokenService.tokenBalance(token.address, wallet.ethAddress, token.decimalVal);
                    token.totalHold = bigDecimal.add(token.totalHold, walletBalance);
                    logger.info('statTokenTotalHold() current stat wallet address=%s; token symbol=%s; token address=%s; balance=%s; tokenTotalHold=%s',
                        wallet.ethAddress, token.symbol, token.address, walletBalance, token.totalHold);
                } catch (err) {
                    logger.error('statTokenTotalHold() error: wallet address=%s; token symbol=%s; token address=%s; error detail==>', wallet.ethAddress, token.symbol, token.address, err);
                    continue;
                }
            }
            //save to redis hash
            const statTokenHoldKey = await redisKeyManager.getTokenTotalHoldStatKey();
            redisUtil.hset(statTokenHoldKey.key, token.symbol + '##' + token.address, token.totalHold);
        }
        walletList = await walletDao.pageDistinctAddress(++pageIndex, pageSize);
    }
    logger.info('*********************** statTokenTotalHold() END **********************==> ' +
        'total used time=%sms;total wallet count=%s;total token count=%s;', Date.now() - start, totalWalletCount, tokenList.length);
};

/**
 * 定时统计平台支持的各个token的总持有量
 * @returns {Promise<void>}
 */
const scheduleStatTokenTotalHold = async function () {
    schedule.scheduleJob(FixedConfigJSON.normal_config.task_cron_stat_token_total_hold, function () {
        statTokenTotalHold();
    })
};


module.exports = {
    statWalletTotalAssets: statWalletTotalAssets,
    scheduleStatWalletTotalAssets: scheduleStatWalletTotalAssets,
    statTokenTotalHold: statTokenTotalHold,
    scheduleStatTokenTotalHold: scheduleStatTokenTotalHold,
};

