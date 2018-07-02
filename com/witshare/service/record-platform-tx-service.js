const log = require('../log').getlog('record-platform-tx-service');


/**
 * 获取平台和项目之间的交易流水详情和状态
 * @param obj
 * @returns {boolean}
 */
const getPlatformTxDetail = async () => {
    log.info('*********************** checkUserPayTxValidity() START *********************');
    const start = Date.now();
    //获取未校验的用户认购记录
    let pageIndex = 1;
    let recordList;
    do {
        let result = await RecordUserTx.pageByUserTxStatus([USER_TX_STATUS.INIT, USER_TX_STATUS.TX_NOT_EXIST]);//暂不分页处理
        log.info("checkUserPayTxValidity() total count=%s; current pageIndex=%s", result.count, pageIndex);
        recordList = result.rows;
        let updatedItem = {};
        for (let record of recordList) {
            log.info('current validate payTx==>', record.payTx);
            try {
                updatedItem = {
                    payTx: record.payTx,
                    txVerificationTime: new Date()
                };
                let payTx = record.payTx;
                //检查交易hash的格式
                if (/^0x[a-fA-F0-9]{64}$/.test(payTx)) {
                    //检查交易有效性
                    let receipt = await ethersObj.provider.getTransactionReceipt(payTx);
                    let transaction = await ethersObj.provider.getTransaction(payTx);
                    if (receipt) {
                        updatedItem.actualPayAmount = ethersObj.utils.formatEther(transaction.value);
                        updatedItem.actualSendingAddress = transaction.from;
                        updatedItem.actualReceivingAddress = transaction.to;
                        //get block for timestamp
                        let block = await ethersObj.provider.getBlock(transaction.blockNumber);
                        updatedItem.actualTxTime = new Date(block.timestamp * 1000);
                        if (receipt.status == 1) {
                            //检查to和平台的收币地址是否一致
                            let sysProject = await SysProject.findByProjectGid(record.projectGid);
                            if (transaction.to.toLocaleLowerCase() === sysProject.platformAddress.toLocaleLowerCase()) {
                                //检查from和用户的打币地址是否一致
                                let sysUserAddress = await SysUserAddress.findByUserGidAndProjectGid(record.userGid, record.projectGid);
                                if (transaction.from.toLocaleLowerCase() === sysUserAddress.payEthAddress.toLocaleLowerCase()) {
                                    //比较实际支付的金额和提交申请的金额是否一致，比较至小数点后两位数
                                    if (bigDecimal.compareTo(bigDecimal.round(updatedItem.actualPayAmount, 2), bigDecimal.round(record.payAmount, 2)) === 0) {
                                        updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_SUCCESS;//2
                                    } else {
                                        updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH;//23
                                    }
                                } else {
                                    updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH;//22
                                }
                                //计算应该获得的token数量
                                updatedItem.shouldGetAmount = bigDecimal.multiply(updatedItem.actualPayAmount, record.priceRate);
                            } else {
                                updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_TO_NOT_PLATFORM;//21
                            }
                        } else {
                            updatedItem.userTxStatus = USER_TX_STATUS.TX_FAILED;//3
                        }
                    } else {
                        if (!transaction) {
                            log.info("checkUserPayTxValidity() payTx not exist==>payTx=%s", payTx);
                            updatedItem.userTxStatus = USER_TX_STATUS.TX_NOT_EXIST;//4
                        } else {
                            log.info("checkUserPayTxValidity() payTx not mined==>payTx=%s", payTx);
                            updatedItem.userTxStatus = USER_TX_STATUS.TX_PENDING;//1
                        }
                    }
                } else {
                    log.info("checkUserPayTxValidity() payTx is invalid==>payTx=%s", payTx);
                    updatedItem.userTxStatus = USER_TX_STATUS.TX_INVALID;//5
                }
                await RecordUserTx.updateUserTxStatusByPayTx(updatedItem);
            } catch (err) {
                log.error("checkUserPayTxValidity() exception==>payTx=%s", record.payTx, err);
                continue;
            }
        }
    } while (recordList && recordList.length > 0 && false);//暂时只查询一次
    log.info('*********************** checkUserPayTxValidity() END *********************** ==> ' +
        'total used time=%sms;', Date.now() - start);
};

module.exports = {
    getPlatformTxDetail: getPlatformTxDetail
};