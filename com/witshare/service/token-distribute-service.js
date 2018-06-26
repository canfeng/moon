/**
 * Created by shizhiguo on 2018/6/18
 */
const redisKeyManager = require('../common/redis_key_manager');
const commonEnum = require('../common/common_enum');
const USER_TX_STATUS = commonEnum.USER_TX_STATUS;
const TX_STATUS = commonEnum.TX_STATUS;
const redisUtil = require('../util/redis_util');
const commonUtil = require('../util/common_util');
const logger = require('../logger').getLogger('token-distribute-service');
const bigDecimal = require('js-big-decimal');
const dbManager = require('../proxy/db-manager');
const SysProject = require('../proxy/sys-project');
const SysUserAddress = require('../proxy/sys-user-address');
const RecordUserTx = require('../proxy/record-user-tx');
const ethersObj = require('../eth/ethers_obj');
const Config = require(ConfigPath + 'config.json');

/**
 * 校验用户认筹交易有效性
 * @param obj
 * @returns {boolean}
 */
const checkUserPayTxValidity = async function () {
    logger.info('*********************** checkUserPayTxValidity() START *********************');
    const start = Date.now();
    //获取未校验的用户认购记录
    let recordList = await RecordUserTx.findByUserTxStatus(USER_TX_STATUS.INIT);
    if (recordList && recordList.length > 0) {
        let updatedItem = {};
        for (let record of recordList) {
            try {
                updatedItem.id = record.id;
                let payTx = record.payTx;
                //检查交易有效性
                let receipt = await ethersObj.provider.getTransactionReceipt(payTx);
                if (receipt) {
                    updatedItem.actualPayAmount = ethersObj.utils.formatEther(receipt.value);
                    if (receipt.status == 1) {
                        //检查to和平台的收币地址是否一致
                        let sysProject = await SysProject.findByProjectGid(record.projectGid);
                        if (receipt.to.toLocaleLowerCase() === sysProject.platformAddress.toLocaleLowerCase()) {
                            //检查from和用户的打币地址是否一致
                            let sysUserAddress = await SysUserAddress.findByUserGidAndProjectGid(record.userGid, record.projectGid);
                            if (receipt.from.toLocaleLowerCase() === sysUserAddress.payEthAddress.toLocaleLowerCase()) {
                                //比较实际支付的金额和提交申请的金额是否一致，比较至小数点后两位数
                                if (bigDecimal.compareTo(bigDecimal.round(updatedItem.actualPayAmount, 2), bigDecimal.round(record.payAmount, 2)) === 0) {
                                    updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_SUCCESS;//1
                                } else {
                                    updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH;//13
                                }
                            } else {
                                updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH;//12
                            }
                        } else {
                            updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_TO_NOT_PLATFORM;//11
                        }
                        //计算应该获得的token数量
                        updatedItem.shouldGetAmount = bigDecimal.multiply(updatedItem.actualPayAmount, record.priceRate);
                    } else {
                        updatedItem.userTxStatus = USER_TX_STATUS.TX_FAILED;//2
                    }
                } else {
                    let transaction = await ethersObj.provider.getTransaction(payTx);
                    if (!transaction) {
                        logger.info("checkUserPayTxValidity() payTx not exist==>payTx=%s", payTx);
                        updatedItem.userTxStatus = USER_TX_STATUS.TX_NOT_EXIST;//3
                    } else {
                        logger.info("checkUserPayTxValidity() payTx not mined==>payTx=%s", payTx);
                    }
                }
                await RecordUserTx.updateUserTxStatusByPayTx(updatedItem);
            } catch (err) {
                logger.error("checkUserPayTxValidity() exception==>payTx=%s", record.payTx, err);
            }
        }
    } else {
        logger.info("checkUserPayTxValidity() no data");
    }
    logger.info('*********************** checkUserPayTxValidity() END *********************** ==> ' +
        'total used time=%sms;', Date.now() - start);
};

/**
 * token分发
 * @param projectGid
 * @param password
 * @param recordUserList
 * @returns {Promise<void>}
 */
const tokenDistribute = async function (project, wallet, recordUserList) {
    if (project) {
        let tokenAddress = project.tokenAddress;
        let projectPlatFormAddress = project.platformAddress;

        if (recordUserList && wallet) {
            for (let userRecord of recordUserList) {
                try {
                    let userGid = userRecord.userGid;
                    let totalPayCount = userRecord.count;
                    let totalPayAmount = userRecord.totalPayAmount;
                    let totalShouldGetAmount = userRecord.totalShouldGetAmount;
                    logger.info('tokenDistribute() current userRecord==>userGid=%; totalPayCount=%s; totalPayAmount=%s', userGid, totalPayCount, totalPayAmount);

                    //获取用户的收币地址
                    let sysUserAddress = await SysUserAddress.findByUserGidAndProjectGid(userGid, projectGid);
                    let userReceiveAddress = sysUserAddress.getTokenAddress;

                    let value = totalShouldGetAmount;
                    let defaultTokenTransferGasLimit = Config.eth.default_token_transfer_gas_used;
                    let defaultGasPrice = parseFloat(await ethersObj.provider.getGasPrice());
                    let nonce = getNonce(projectPlatFormAddress);
                    //token转账
                    let result = await ethersObj.transferWithWallet(tokenAddress, wallet, projectPlatFormAddress, userReceiveAddress, value, defaultTokenTransferGasLimit, defaultGasPrice, nonce);
                    if (!result) {
                        logger.error("tokenDistribute() transfer error,result is null==>userGid=%s", userGid);
                        continue;
                    }
                    let txHash = result.hash;
                    if (!txHash) {
                        logger.error("tokenDistribute() transfer error==>userGid=%s; result=%s", userGid, JSON.stringify(result));
                        continue;
                    }
                    let updateRecord = {
                        userGid: userGid,
                        platformTx: txHash,
                    };
                    //更新txhash
                    await RecordUserTx.updatePlatformTxDataByUserGid(updateRecord);

                    //更新nonce
                    await updateNonce(projectPlatFormAddress, nonce);

                    //等待交易结果
                    ethersObj.refreshTxStatus(txHash).then(async function (transaction) {
                        //get receipt for gasUsed
                        const txReceipt = await ethersObj.provider.getTransactionReceipt(transaction.hash);
                        const gasFee = ethersObj.utils.formatEther(bigDecimal.multiply(transaction.gasPrice, txReceipt.gasUsed));
                        //get block for timestamp
                        const block = await ethersObj.provider.getBlock(transaction.blockNumber);
                        updateRecord = {
                            platformTx: txHash,
                            distributionTime: block.timestamp,
                            platformTxStatus: txReceipt.status == 1 ? 1 : 2,
                            ethFee: gasFee
                        };
                        //update tx status
                        await RecordUserTx.updatePlatformTxStatusByPlatformTx(updateRecord);
                    }).catch(function (err) {
                        logger.error("tokenDistribute() refreshTxStatus error==>txHash=%s; ", txHash, err);
                    });

                } catch (err) {
                    logger.error("tokenDistribute() transfer error==>userGid=%s; ", userRecord.userGid, err);
                    continue;
                }
            }
        } else {
            logger.warn('tokenDistribute() no record_user_tx for this project==>projectGid=%s', project.projectGid);
        }
    } else {
        logger.error("tokenDistribute() project not found==>projectGid=%s", project.projectGid);
    }
};

/**
 * 过滤传入的userTxStatus和plateformTxStatus是否有效
 * @param userTxStatusArr
 * @param platformTxStatusArr
 */
const filterStatusArr = function (userTxStatusArr, platformTxStatusArr) {
    let OptionalUserTxStatus = [USER_TX_STATUS.CONFIRM_SUCCESS, USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH, USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH];
    let OptionalPlatformTxStatus = [TX_STATUS.INIT, TX_STATUS.FAIL, TX_STATUS.DISCARD];
    if (userTxStatusArr && userTxStatusArr.length > 0) {
        for (let index of userTxStatusArr) {
            if (OptionalUserTxStatus.indexOf(userTxStatusArr[index]) === -1) {
                userTxStatusArr.splice(index, 1);
            }
        }
    }
    if (platformTxStatusArr && platformTxStatusArr.length > 0) {
        for (let index of platformTxStatusArr) {
            if (OptionalPlatformTxStatus.indexOf(platformTxStatusArr[index]) === -1) {
                platformTxStatusArr.splice(index, 1);
            }
        }
    }
};

/**
 * 根据条件检索列表
 * @param projectGid
 * @param userTxStatusArr
 * @param platformTxStatusArr
 * @param payTxId
 * @returns {Promise<Array<Model>>}
 */
const getRecordUserListByCondition = async function (projectGid, userTxStatusArr, platformTxStatusArr, payTxId) {
    let userList;
    if (payTxId) {
        userList = await dbManager.query(`select user_gid userGid,count(1) count,sum(actual_pay_amount) totalPayAmount,sum(should_get_amount) totalShouldGetAmount from record_user_tx 
                               where pay_tx_id =? and user_tx_status in (?,?,?) and platform_tx_status in (?,?,?) group by user_gid`, {
            replacements: [payTxId, USER_TX_STATUS.CONFIRM_SUCCESS, USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH, USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH, TX_STATUS.INIT, TX_STATUS.FAIL, TX_STATUS.DISCARD],
            type: dbManager.QueryTypes.SELECT
        });

    } else if (platformTxStatusArr && platformTxStatusArr.length > 0) {
        userList = await dbManager.query(`select user_gid userGid,count(1) count,sum(actual_pay_amount) totalPayAmount,sum(should_get_amount) totalShouldGetAmount from record_user_tx 
                               where platform_tx_status in (?) group by user_gid`, {
            replacements: [platformTxStatusArr.join(',')],
            type: dbManager.QueryTypes.SELECT
        });

    } else if (userTxStatusArr && userTxStatusArr.length > 0) {
        userList = await dbManager.query(`select user_gid userGid,count(1) count,sum(actual_pay_amount) totalPayAmount,sum(should_get_amount) totalShouldGetAmount from record_user_tx 
                               where user_tx_status in (?) group by user_gid`, {
            replacements: [userTxStatusArr.join(',')],
            type: dbManager.QueryTypes.SELECT
        });
    }
    return userList;
}


/**
 * 获取nonce值
 * @param address
 * @returns {Promise<number>}
 */
async function getNonce(address) {
    let nonce = 0;
    let transactionCount = await ethersObj.getNonceByAddress(address);
    let keyInfo = await redisKeyManager.getKeyWalletAddressLastTxNonce(address);
    let saveLastNonce = await redisUtil.get(keyInfo.key);
    if (saveLastNonce && saveLastNonce >= transactionCount) {
        nonce = parseInt(saveLastNonce) + 1;
    } else {
        nonce = transactionCount;
    }
    return nonce;
}


/**
 * 更新nonce
 * @param address
 * @param nonce
 * @returns {Promise<void>}
 */
async function updateNonce(address, nonce) {
    let keyInfo = await redisKeyManager.getKeyWalletAddressLastTxNonce(address);
    redisUtil.set(keyInfo.key, nonce);
}

/**
 * 拉取平台token分发的交易状态
 * @returns {Promise<{confirmedTxNum: number, unConfirmedTxNum: number}>}
 */
const pollingPlatformTxStatus = async function () {
    let start = Date.now();
    logger.info("***************^ pollingPlatformTxStatus() run start..");
    let sql = "select distinct platform_tx platformTx from record_user_tx where platform_tx_status = ? and platform_tx <> ''";
    let platformTxHashList = await dbManager.query(sql, {
        replacements: [TX_STATUS.INIT],
        type: dbManager.QueryTypes.SELECT
    });
    let unConfirmedTxNum = 0;
    let confirmedTxNum = 0;
    if (platformTxHashList && platformTxHashList.length > 0) {
        for (let item of platformTxHashList) {
            try {
                let txHash = item.platformTx;
                let receipt = await ethersObj.provider.getTransactionReceipt(txHash);
                logger.info("pollingPlatformTxStatus() platformTx receipt==>platformTx=%s; receipt=%s", txHash, JSON.stringify(receipt));
                let updateRecord = {
                    platformTx: txHash,
                };
                if (receipt) {
                    logger.info("pollingPlatformTxStatus() receipt status==>txHash=%s; status=%s", txHash, receipt.status);
                    let transaction = await ethersObj.provider.getTransaction(txHash);
                    const gasFee = ethersObj.utils.formatEther(bigDecimal.multiply(transaction.gasPrice, receipt.gasUsed));
                    //get block for timestamp
                    const block = await ethersObj.provider.getBlock(receipt.blockNumber);
                    updateRecord.distributionTime = block.timestamp;
                    updateRecord.platformTxStatus = receipt.status == 1 ? TX_STATUS.CONFIRMED : TX_STATUS.FAIL;
                    updateRecord.ethFee = gasFee;
                    await RecordUserTx.updatePlatformTxStatusByPlatformTx(updateRecord);
                } else {
                    let transaction = await ethersObj.provider.getTransaction(txHash);
                    logger.info("pollingPlatformTxStatus() platformTx transaction==>platformTx=%s; transaction=%s", txHash, JSON.stringify(transaction));
                    if (!transaction) {
                        //废弃
                        logger.info("pollingPlatformTxStatus() transaction not exist==>platformTx=%s", txHash);
                        updateRecord.platformTxStatus = TX_STATUS.DISCARD;
                        await RecordUserTx.updatePlatformTxStatusByPlatformTx(updateRecord);
                    }
                }

            } catch (err) {
                logger.error('pollingPlatformTxStatus() exception==>txHash', err);
            }
        }
    }
    logger.info("***************^ pollingPlatformTxStatus() run end..|total used %s ms", Date.now() - start);
    return {
        confirmedTxNum: confirmedTxNum,
        unConfirmedTxNum: unConfirmedTxNum
    };
}

/**
 * 获取打币进度报告
 * @returns {Promise<void>}
 */
const distributeProgress = async function (projectGid) {
    // 认购用户总数,验证通过的用户数,已完成用户,打币中用户,打币失败用户数,未开始打币的用户数
    let result = await dbManager.query(`
        select 
        (select count(user_gid) from record_user_tx where project_gid = ?) allCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and user_tx_status in (1,2)) validateSuccessCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and platform_tx <> '' and platform_tx_status = 1) distributeSuccessCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and platform_tx <> '' and platform_tx_status in (2,3)) distributeFailedCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and platform_tx <> '' and platform_tx_status = 0) distributingCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and platform_tx = '' and platform_tx_status = 0) notStartCount`,
        {
            replacements: [projectGid, projectGid, projectGid, projectGid, projectGid, projectGid],
            type: dbManager.QueryTypes.SELECT
        });
    return result;
};

const getWalletByV3JsonAndPwd = async function (project, password) {
    if (project) {
        let redisKeyV3Json = await redisKeyManager.getKeyPlatformProjectV3Json(project.platformAddress);
        let v3Json = await redisUtil.get(redisKeyV3Json.key);
        if (v3Json) {
            let wallet = await ethersObj.getWalletFromV3Json(v3Json, password);
            return wallet;
        }
    }
    return null;
}


module.exports = {
    checkUserPayTxValidity: checkUserPayTxValidity,
    tokenDistribute: tokenDistribute,
    distributeProgress: distributeProgress,
    pollingPlatformTxStatus: pollingPlatformTxStatus,
    filterStatusArr: filterStatusArr,
    getRecordUserListByCondition: getRecordUserListByCondition,
    getWalletByV3JsonAndPwd: getWalletByV3JsonAndPwd
}