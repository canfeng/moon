const logger = require('../logger').getLogger('record_user_tx_task');
const schedule = require('node-schedule');
const FixedConfigJSON = require('../../../conf/fixed_config.json');
const platformTxService = require('../service/record-platform-tx-service');

/**
 * 定时查询平台交易的具体信息和状态
 * @returns {Promise<void>}
 */
const scheduleGetPlatformTxDetails = async function () {
    schedule.scheduleJob(FixedConfigJSON.normal_config.task_cron_get_record_platform_tx_details, function () {
        platformTxService.getPlatformTxDetails();
    })
};


module.exports = {
    scheduleGetPlatformTxDetails: scheduleGetPlatformTxDetails,
};

