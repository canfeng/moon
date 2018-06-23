const logger = require('../logger').getLogger('record_user_tx_task');
const schedule = require('node-schedule');
const FixedConfigJSON = require('../../../conf/fixed_config.json');
const tokenDistributeService = require('../service/token-distribute-service');

/**
 * 定时检查用户认购交易的有效性
 * @returns {Promise<void>}
 */
const scheduleCheckUserPayTxValidity = async function () {
    schedule.scheduleJob(FixedConfigJSON.normal_config.task_cron_check_user_pay_tx_validity, function () {
        tokenDistributeService.checkUserPayTxValidity();
    })
};

/**
 * 定时轮询平台打币交易的状态
 * @returns {Promise<void>}
 */
const schedulePollindPlatformTxStatus = async function () {
    schedule.scheduleJob(FixedConfigJSON.normal_config.task_cron_polling_platform_tx_status, function () {
        tokenDistributeService.pollingPlatformTxStatus();
    })
};


module.exports = {
    scheduleCheckUserPayTxValidity: scheduleCheckUserPayTxValidity,
    schedulePollingPlatformTxStatus: schedulePollindPlatformTxStatus
};

