const recordUserTx = require('../proxy/record-user-tx');
const logger = require('../logger').getLogger('record_user_tx_task');
const ethersObj = require('../eth/ethers_obj');
const commonEnum = require('../common/common_enum');
const schedule = require('node-schedule');
const FixedConfigJSON = require('../../../conf/fixed_config.json');

/**
 * 校验用户认筹交易有效性
 * @param obj
 * @returns {boolean}
 */
const checkUserPayTxValidity = async function () {
    logger.info('*********************** checkUserPayTxValidity() START *********************');
    const start = Date.now();
    //获取未校验的用户认购记录
    let recordList = await recordUserTx.findByUserTxStatus(commonEnum.UserTxStatus.INIT);
    if (recordList && recordList.length > 0) {
        let updatedItem = {};
        for (let record of recordList) {
            updatedItem.id = record.id;
            let payTx = record.payTx;
            //检查交易有效性
            let receipt = await ethersObj.provider.getTransactionReceipt(payTx);
            if (receipt) {
                updatedItem.userTxStatus = receipt.status == 1 ? commonEnum.UserTxStatus.SUCCESS : commonEnum.UserTxStatus.FAIL_TX_FAILED;
                updatedItem.actualPayAmount = ethersObj.utils.formatEther(receipt.value);
            } else {
                let transaction = await ethersObj.provider.getTransaction(payTx);
                if (!transaction) {
                    logger.info("checkUserPayTxValidity() payTx not exist");
                    updatedItem.userTxStatus = commonEnum.UserTxStatus.FAIL_TX_NOT_EXIST;
                } else {
                    logger.info("checkUserPayTxValidity() payTx not mined");
                }
            }
            await recordUserTx.updateRecordById(updatedItem);
        }
    } else {
        logger.info("checkUserPayTxValidity() no data");
    }
    logger.info('*********************** checkUserPayTxValidity() END *********************** ==> ' +
        'total used time=%sms;', Date.now() - start);
};


const scheduleCheckUserPayTxValidity = async function () {
    schedule.scheduleJob(FixedConfigJSON.normal_config.task_cron_check_user_pay_tx_validity, function () {
        checkUserPayTxValidity();
    })
};


module.exports = {
    checkUserPayTxValidity: checkUserPayTxValidity,
};

