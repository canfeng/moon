/**
 * Created by shizhiguo on 2018/6/18
 */
const redisKeyManager = require('../common/redis_key_manager');
const commonEnum = require('../common/common_enum');
const USER_TX_STATUS = commonEnum.USER_TX_STATUS;
const PLATFORM_TX_STATUS = commonEnum.PLATFORM_TX_STATUS;
const redisUtil = require('../util/redis_util');
const commonUtil = require('../util/common_util');
const responseUtil = require('../util/response_util');
const RES_CODE = responseUtil.RES_CODE;
const logger = require('../logger').getLogger('token-distribute-service');
const bigDecimal = require('js-big-decimal');
const dbManager = require('../proxy/db-manager');
const SysProject = require('../proxy/sys-project');
const SysUserAddress = require('../proxy/sys-user-address');
const RecordUserTx = require('../proxy/record-user-tx');
const ethersObj = require('../eth/ethers_obj');
const Config = require(ConfigPath + 'config.json');
const timeUtil = require('../util/time_util');
const FixedConfig = require('../../../conf/fixed_config.json');

/**
 * 校验用户认筹交易有效性
 * @param obj
 * @returns {boolean}
 */
const checkUserPayTxValidity = async () => {
    logger.info('*********************** checkUserPayTxValidity() START *********************');
    const start = Date.now();
    //获取未校验的用户认购记录
    let pageIndex = 1;
    let pageSize = 1000;
    let recordList;
    do {
        let result = await RecordUserTx.pageByUserTxStatus([USER_TX_STATUS.INIT, USER_TX_STATUS.TX_NOT_EXIST]);//暂不分页处理
        logger.info("checkUserPayTxValidity() total count=%s; current pageIndex=%s", result.count, pageIndex);
        recordList = result.rows;
        let updatedItem = {};
        for (let record of recordList) {
            logger.info('current validate payTx==>', record.payTx);
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
                        //get last blockNumber
                        let lastBlockNumber = await ethersObj.provider.getBlockNumber();
                        if (transaction.blockNumber + 6 <= lastBlockNumber) {
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
                                        //比较实际支付的金额和提交申请的金额是否一致，保留9位小数再比较
                                        if (bigDecimal.compareTo(bigDecimal.round(updatedItem.actualPayAmount, 9), bigDecimal.round(record.payAmount, 9)) === 0) {
                                            updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_SUCCESS;//2
                                        } else {
                                            updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH;//23
                                        }
                                    } else {
                                        updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH;//22
                                    }
                                    //计算应该获得的token数量
                                    updatedItem.shouldGetAmount = bigDecimal.round(updatedItem.actualPayAmount * parseFloat(record.priceRate) * (1 + parseFloat(record.freeGiveRate)), 9);

                                } else {
                                    updatedItem.userTxStatus = USER_TX_STATUS.CONFIRM_FAIL_TO_NOT_PLATFORM;//21
                                }
                            } else {
                                updatedItem.userTxStatus = USER_TX_STATUS.TX_FAILED;//3
                            }
                        } else {
                            logger.info(`checkUserPayTxValidity() payTx already mined, but confirmed block number not enough to 6==>payTx=${payTx}; minedBlock=${transaction.blockNumber}; lastBlock=${lastBlockNumber}`);
                            updatedItem.userTxStatus = USER_TX_STATUS.TX_PENDING;//1
                        }
                    } else {
                        if (!transaction) {
                            logger.info("checkUserPayTxValidity() payTx not exist==>payTx=%s", payTx);
                            updatedItem.userTxStatus = USER_TX_STATUS.TX_NOT_EXIST;//4
                        } else {
                            logger.info("checkUserPayTxValidity() payTx not mined==>payTx=%s", payTx);
                            updatedItem.userTxStatus = USER_TX_STATUS.TX_PENDING;//1
                        }
                    }
                } else {
                    logger.info("checkUserPayTxValidity() payTx is invalid==>payTx=%s", payTx);
                    updatedItem.userTxStatus = USER_TX_STATUS.TX_INVALID;//5
                }
                await RecordUserTx.updateUserTxStatusByPayTx(updatedItem);
            } catch (err) {
                logger.error("checkUserPayTxValidity() exception==>payTx=%s", record.payTx, err);
                continue;
            }
        }
    } while (recordList && recordList.length > 0 && false);//暂时只查询一次
    logger.info('*********************** checkUserPayTxValidity() END *********************** ==> ' +
        'total used time=%sms;', Date.now() - start);
};

/**
 * 验证打币条件并执行
 * @returns {Promise<void>}
 */
async function startTokenDistribute(params) {
    let password = params.password;
    let projectGid = params.projectGid;
    let userTxStatusArr = params.userTxStatusArr;
    let platformTxStatusArr = params.platformTxStatusArr;
    let response;
    if (projectGid && password) {
        let project = await SysProject.findByProjectGid(projectGid);
        if (project) {
            //check password
            let wallet = await getWalletByV3JsonAndPwd(project, password);
            if (wallet) {
                if (wallet.address.toLowerCase() === project.platformAddress.toLowerCase()) {
                    //check decimal
                    let tokenDecimal = await ethersObj.getDecimals(project.tokenAddress);
                    if (tokenDecimal == project.tokenDecimal) {
                        filterStatusArr(userTxStatusArr, platformTxStatusArr);
                        let result = await getRecordUserListByConditionAndUpdateBatchId(params);
                        if (result && result.userList && result.userList.length > 0) {
                            let totalCount = 0;
                            for (let item of result.userList) {
                                totalCount += item.count;
                            }
                            let distributionBatchId = timeUtil.formatCurrentDateTime('yyyyMMddhhmmssS');
                            //更新打币批次id
                            let changeCount = await updateDistributionBatchId(distributionBatchId, result.whereSql, result.replacements);
                            if (changeCount && changeCount == totalCount) {
                                //当更新的打币批次影响行数和查询出来的结果集的行数一致时，才执行打币
                                execTokenDistribute(distributionBatchId, project, wallet, params, result.userList);
                                response = responseUtil.success({
                                    totalUserCount: result.userList.length,
                                    distributionBatchId: distributionBatchId
                                });
                            } else {
                                response = responseUtil.error(RES_CODE.FAILED, '更新打币批次ID有误，请重试');
                            }
                        } else {
                            response = responseUtil.error(RES_CODE.FAILED, '没有符合条件的记录');
                        }
                    } else {
                        logger.warn('tokenDistribute() projectToken saved tokenDecimal mismatch with real tokenDecimal==>projectToken=%s; tokenAddress=%s; tokenDecimal=%s; realTokenDecimal=%s',
                            project.projectToken, project.tokenAddress, project.tokenDecimal, tokenDecimal);
                        response = responseUtil.error(RES_CODE.FAILED, 'token的decimal和实际的不一致==>实际的decimal=' + tokenDecimal);
                    }
                } else {
                    response = responseUtil.error(RES_CODE.AIRDROP_ADDRESS_AND_PLATFORM_ADDRESS_NOT_MATCH);
                }
            } else {
                response = responseUtil.error(RES_CODE.KEYSTORE_OR_PASSWORD_ERROR);
            }
        } else {
            response = responseUtil.error(RES_CODE.PARAMS_ERROR, '未找到该项目');
        }
    } else {
        response = responseUtil.error(RES_CODE.PARAMS_ERROR, '项目ID和密码是必需的参数');
    }
    return response;
};

/**
 * 执行打币操作
 * @param projectGid
 * @param password
 * @param recordUserList
 * @returns {Promise<void>}
 */
const execTokenDistribute = async (distributionBatchId, project, wallet, params, recordUserList) => {
    if (project) {
        let tokenAddress = project.tokenAddress;
        let projectPlatFormAddress = project.platformAddress;
        let tokenDecimal = project.tokenDecimal;
        if (recordUserList && wallet) {
            for (let userRecord of recordUserList) {
                try {
                    let userGid = userRecord.userGid;
                    let totalPayCount = userRecord.count;
                    let totalPayAmount = userRecord.totalPayAmount;
                    let totalShouldGetAmount = bigDecimal.round(userRecord.totalShouldGetAmount, tokenDecimal);
                    logger.info('execTokenDistribute() current userRecord==>userGid=%s; totalPayCount=%s; totalPayAmount=%s; totalShouldGetAmount=%s', userGid, totalPayCount, totalPayAmount, totalShouldGetAmount);

                    //获取用户的收币地址
                    let sysUserAddress = await SysUserAddress.findByUserGidAndProjectGid(userGid, project.projectGid);
                    let userReceiveAddress = sysUserAddress.getTokenAddress;
                    let value = bigDecimal.multiply(totalShouldGetAmount, Math.pow(10, tokenDecimal));
                    let defaultTokenTransferGasLimit = FixedConfig.eth.default_token_transfer_gas_used;
                    let defaultGasPrice = parseFloat(await ethersObj.provider.getGasPrice());
                    if (FixedConfig.eth.max_gas_price && defaultGasPrice > FixedConfig.eth.max_gas_price) {
                        //如果设置的最高gasPrice
                        defaultGasPrice = FixedConfig.eth.max_gas_price;
                    }
                    let nonce = await getNonce(projectPlatFormAddress);
                    //token转账
                    let result = await ethersObj.transferWithWallet(tokenAddress, wallet, userReceiveAddress, value, defaultTokenTransferGasLimit, defaultGasPrice, nonce);
                    if (!result) {
                        logger.error("execTokenDistribute() transfer error,result is null==>userGid=%s", userGid);
                        continue;
                    }
                    let txHash = result.hash;
                    logger.info('execTokenDistribute() current send txHash==>', txHash);
                    if (!txHash) {
                        logger.error("execTokenDistribute() transfer error==>userGid=%s; result=%s", userGid, JSON.stringify(result));
                        continue;
                    }
                    let updateRecord = {
                        distributionBatchId: distributionBatchId,
                        userGid: userGid,
                        platformTx: txHash,
                        platformTxStatus: PLATFORM_TX_STATUS.PENDING,
                        actualGetAmount: totalShouldGetAmount
                    };
                    //更新txhash
                    await RecordUserTx.updatePlatformTxDataByCondition(updateRecord, params);
                    //更新nonce
                    await updateNonce(projectPlatFormAddress, nonce);

                    /*//等待交易结果
                    ethersObj.refreshTxStatus(txHash).then(async transaction => {
                        if (transaction) {
                            logger.info('execTokenDistribute() refreshTxStatus Transaction Minded : {transaction:%s, hash:%s}l', JSON.stringify(transaction),
                                transaction.hash);

                            //get receipt for gasUsed
                            const txReceipt = await ethersObj.provider.getTransactionReceipt(transaction.hash);
                            const gasFee = ethersObj.utils.formatEther(bigDecimal.multiply(transaction.gasPrice, txReceipt.gasUsed));
                            //get block for timestamp
                            const block = await ethersObj.provider.getBlock(transaction.blockNumber);
                            updateRecord = {
                                platformTx: txHash,
                                distributionTime: new Date(block.timestamp * 1000),
                                platformTxStatus: txReceipt.status == 1 ? PLATFORM_TX_STATUS.SUCCESS : PLATFORM_TX_STATUS.FAILED,
                                ethFee: gasFee
                            };
                            //update tx status
                            await RecordUserTx.updatePlatformTxStatusByPlatformTx(updateRecord);
                        }
                    }).catch(function (err) {
                        logger.error("execTokenDistribute() refreshTxStatus error==>txHash=%s; ", txHash, err);
                    });*/
                } catch (err) {
                    logger.error("execTokenDistribute() transfer error==>userGid=%s; ", userRecord.userGid, err);
                    continue;
                }
            }
        } else {
            logger.warn('execTokenDistribute() no record_user_tx for this project==>projectGid=%s', project.projectGid);
        }
    } else {
        logger.error("execTokenDistribute() project not found==>projectGid=%s", project.projectGid);
    }
};

/**
 * 过滤传入的userTxStatus和plateformTxStatus是否有效
 * @param userTxStatusArr
 * @param platformTxStatusArr
 */
async function filterStatusArr(userTxStatusArr, platformTxStatusArr) {
    if (userTxStatusArr && userTxStatusArr.length > 0) {
        let OptionalUserTxStatus = [USER_TX_STATUS.CONFIRM_SUCCESS, USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH, USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH];
        for (let index in userTxStatusArr) {
            if (!OptionalUserTxStatus.includes(userTxStatusArr[index])) {
                userTxStatusArr.splice(index, 1);
            }
        }
    }
    if (platformTxStatusArr && platformTxStatusArr.length > 0) {
        let OptionalPlatformTxStatus = [PLATFORM_TX_STATUS.INIT, PLATFORM_TX_STATUS.FAILED, PLATFORM_TX_STATUS.DISCARD];
        for (let index in platformTxStatusArr) {
            if (!OptionalPlatformTxStatus.includes(platformTxStatusArr[index])) {
                platformTxStatusArr.splice(index, 1);
            }
        }
    }
};

/**
 * 根据条件检索列表
 * @returns {Promise<Array<Model>>}
 */
async function getRecordUserListByConditionAndUpdateBatchId(params) {
    let userList;
    let whereSql = '';
    let querySql = `select user_gid userGid,count(1) count,sum(actual_pay_amount) totalPayAmount,sum(should_get_amount) totalShouldGetAmount from record_user_tx `;
    let replacements = [];
    if (params.id) {
        whereSql = ` where project_gid=? and id =? and user_tx_status in (?,?,?) and platform_tx_status in (?,?,?) `;
        replacements = [params.projectGid, params.id,
            USER_TX_STATUS.CONFIRM_SUCCESS, USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH, USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH,
            PLATFORM_TX_STATUS.INIT, PLATFORM_TX_STATUS.FAILED, PLATFORM_TX_STATUS.DISCARD];

    } else if (params.platformTxStatusArr && params.platformTxStatusArr.length > 0) {
        whereSql = ` where project_gid=? and platform_tx_status in (?) and user_tx_status in (?,?,?) `;
        replacements = [params.projectGid, params.platformTxStatusArr,
            USER_TX_STATUS.CONFIRM_SUCCESS, USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH, USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH];

    } else if (params.userTxStatusArr && params.userTxStatusArr.length > 0) {
        whereSql = ` where project_gid=? and user_tx_status in (?) and platform_tx_status in (?,?,?) `;
        replacements = [params.projectGid, params.userTxStatusArr,
            PLATFORM_TX_STATUS.INIT, PLATFORM_TX_STATUS.FAILED, PLATFORM_TX_STATUS.DISCARD];

    } else {
        return null;
    }
    userList = await dbManager.query(querySql + whereSql + ' group by user_gid', {
        replacements: replacements,
        type: dbManager.QueryTypes.SELECT
    });

    return {
        userList: userList,
        whereSql: whereSql,
        replacements: replacements
    };
};

/**
 * 更新打币的批次id
 * @param distributionBatchId
 * @param whereSql
 * @param replacements
 * @returns {Promise<number>}
 */
async function updateDistributionBatchId(distributionBatchId, whereSql, replacements) {
    //更新批次id
    let updated = await dbManager.query('update record_user_tx set update_time=NOW(),distribution_batch_id=' + distributionBatchId + whereSql, {
        replacements: replacements,
    });
    return updated ? updated[0].changedRows : 0;
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
    let sql = "select distinct platform_tx platformTx from record_user_tx where platform_tx_status in (?,?) and platform_tx <> ''";
    let platformTxHashList = await dbManager.query(sql, {
        replacements: [PLATFORM_TX_STATUS.PENDING, PLATFORM_TX_STATUS.DISCARD],
        type: dbManager.QueryTypes.SELECT
    });
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
                    updateRecord.distributionTime = new Date(block.timestamp * 1000);
                    updateRecord.platformTxStatus = receipt.status == 1 ? PLATFORM_TX_STATUS.SUCCESS : PLATFORM_TX_STATUS.FAILED;
                    updateRecord.ethFee = gasFee;
                    await RecordUserTx.updatePlatformTxStatusByPlatformTx(updateRecord);
                } else {
                    let transaction = await ethersObj.provider.getTransaction(txHash);
                    logger.info("pollingPlatformTxStatus() platformTx transaction==>platformTx=%s; transaction=%s", txHash, JSON.stringify(transaction));
                    if (!transaction) {
                        //废弃
                        logger.info("pollingPlatformTxStatus() transaction not exist==>platformTx=%s", txHash);
                        updateRecord.platformTxStatus = PLATFORM_TX_STATUS.DISCARD;
                        await RecordUserTx.updatePlatformTxStatusByPlatformTx(updateRecord);
                    }
                }

            } catch (err) {
                logger.error('pollingPlatformTxStatus() exception==>txHash', err);
            }
        }
    }
    logger.info("***************^ pollingPlatformTxStatus() run end..|total used %s ms", Date.now() - start);
};

/**
 * 获取打币进度报告
 * @returns {Promise<void>}
 */
const distributeProgress = async function (projectGid, distributionBatchId) {
    if (!distributionBatchId) {
        distributionBatchId = '%';
    }
    // 认购用户总数,已完成用户,打币中用户,打币失败用户数,未开始打币的用户数
    let result = await dbManager.query(`
        select 
        (select count(user_gid) from record_user_tx where project_gid = ? and distribution_batch_id like ? ) totalCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and distribution_batch_id like ? and platform_tx <> '' and platform_tx_status = ?) txSuccessCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and distribution_batch_id like ? and platform_tx <> '' and platform_tx_status in (?,?)) txFailedCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and distribution_batch_id like ? and platform_tx <> '' and platform_tx_status = ?) txPendingCount,
        (select count(user_gid) from record_user_tx where project_gid = ? and distribution_batch_id like ? and platform_tx  = '' and platform_tx_status = ?) notStartCount`,
        {
            replacements: [
                projectGid, distributionBatchId,
                projectGid, distributionBatchId, PLATFORM_TX_STATUS.SUCCESS,
                projectGid, distributionBatchId, PLATFORM_TX_STATUS.FAILED, PLATFORM_TX_STATUS.DISCARD,
                projectGid, distributionBatchId, PLATFORM_TX_STATUS.PENDING,
                projectGid, distributionBatchId, PLATFORM_TX_STATUS.INIT,
            ],
            type: dbManager.QueryTypes.SELECT
        });
    return result ? result[0] : null;
};

async function getWalletByV3JsonAndPwd(project, password) {
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
    startTokenDistribute: startTokenDistribute,
    distributeProgress: distributeProgress,
    pollingPlatformTxStatus: pollingPlatformTxStatus,
};