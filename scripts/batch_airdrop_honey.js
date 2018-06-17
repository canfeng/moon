/**
 * Created by shizhiguo on 2018/5/21
 */
global.ConfigPath = process.cwd() + '/../conf/';
const honeyConfig = require('./honeyConfig');
const CONFIG = require('./config.json');
const HoneyABI = require('./honey-abi.json');
const redisKeyManager = require('../com/witshare/common/redis_key_manager');
const redisUtil = require('../com/witshare/util/redis_util');
const STATUS = require('./status');
const logger = require('./logger').getLogger('batch_airdrop_honey');
const bigDecimal = require('js-big-decimal');

/**
 * 0. 过滤大量重复地址提交申请
 * @returns {Promise<void>}
 */
async function step0_filterRepeatEthAddress() {
    let start = Date.now();
    logger.info("step0_filterRepeatEthAddress() run start..");
    let sql = "select count(1) count,eth_address from user_pickup_honey GROUP BY eth_address HAVING count(1)>10";
    let list = await honeyConfig.turinMysql.query(sql, {
        replacements: [],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    logger.info("step0_filterRepeatEthAddress() total repeat address count==>", list.length);
    if (list && list.length > 0) {
        for (let item of list) {
            let ethAddress = item.eth_address;
            logger.info('step0_filterRepeatEthAddress() current repeat address=%s, repeat count=%s', ethAddress, item.count);
            //name, phone, address, idCardNo, sourceId
            await honeyConfig.UserPickupHoney.update({
                utime: new Date(),
                status: STATUS.QUALIFY_VALIDATE_FAIL_MANY_REPEAT_ETH_ADDRESS
            }, {
                where: {
                    ethAddress: ethAddress,
                    status: 0
                }
            });
        }
    }
    logger.info("step0_filterRepeatEthAddress() run end..|total used %s ms", Date.now() - start);
}

/**
 * 1. 检查用户提币条件，对符合提币条件的用户地址更新honey_count和user_id
 */
async function step1_updateUserHoneyCount() {
    let start = Date.now();
    logger.info("step1_updateUserHoneyCount() run start..");
    let sql = "select * from user_pickup_honey where status=? and tx_hash='' and user_id = '' order by id";
    let pickHoneyList = await honeyConfig.turinMysql.query(sql, {
        replacements: [STATUS.INIT],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    logger.info("step1_updateUserHoneyCount() total user_pickup_honey count==>", pickHoneyList.length);
    if (pickHoneyList && pickHoneyList.length > 0) {
        for (let item of pickHoneyList) {
            //name, phone, address, idCardNo, sourceId
            let res = await honeyConfig.checkAddressAndValue(item.name, item.phone, item.eth_address, item.id);
            await honeyConfig.updateUserPickupHoneyById(item.id, res.status, null, res.honeyCount, res.userId);
        }
    }
    logger.info("step1_updateUserHoneyCount() run end..|total used %s ms", Date.now() - start);
};

/**
 * 2. 分批执行打币操作，更新user_pick_honey的tx_hash、status
 */
async function step2_execAirdrop() {
    let start = Date.now();
    logger.info("step2_execAirdrop() run start..");
    let batchCount = CONFIG.common.airdropBatchCount;
    let pageIndex = 1;
    let sql = "select * from user_pickup_honey where status=? and tx_hash='' and honey_count <> '' and user_id <> '' order by id limit ?,?";
    let pickHoneyList;
    do {
        pickHoneyList = await honeyConfig.turinMysql.query(sql, {
            replacements: [STATUS.QUALIFY_VALIDATE_SUCCESS, (pageIndex - 1) * batchCount, batchCount],
            type: honeyConfig.turinMysql.QueryTypes.SELECT
        });
        if (pickHoneyList && pickHoneyList.length > 0) {
            logger.info("step2_prepareAirdropParams() current batch user_pickup_honey count==>", pickHoneyList.length);
            //准备values[]
            //准备address[]
            let valueArr = [];
            let addressArr = [];
            for (let item of pickHoneyList) {
                valueArr.push(bigDecimal.multiply(item.honey_count, Math.pow(10, CONFIG.honey.decimal)));
                addressArr.push(item.eth_address.toLowerCase());
            }
            logger.info('step2_prepareAirdropParams() valueArr[] and addressArr[]==>', '[' + valueArr.join(',') + '],["' + addressArr.join('","') + '"]');
            let txHash = await batchAirdropHoneyDiff(addressArr, valueArr);
            if (txHash) {
                //更新txhash和status
                for (let item of pickHoneyList) {
                    await honeyConfig.updateUserPickupHoneyById(item.id, STATUS.EXTRACTING, txHash);
                }
            } else {
                pageIndex++;
            }
        }
    } while (pickHoneyList && pickHoneyList.length > 0) ;
    logger.info("step2_execAirdrop() run end..|total used %s ms", Date.now() - start);
};

/**
 * 3. 轮询未确认的交易,获取最新交易结果，更新status
 * @returns {Promise<{confirmedTxNum: number, unConfirmedTxNum: number}>}
 */
async function step3_pollingTxHash() {
    let start = Date.now();
    logger.info("step3_pollingTxHash() run start..");
    let sql = "select distinct tx_hash from user_pickup_honey where status = ? and tx_hash <> '' and honey_count <> '' and user_id <> ''";
    let txHashList = await honeyConfig.turinMysql.query(sql, {
        replacements: [STATUS.EXTRACTING],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    let unConfirmedTxNum = 0;
    let confirmedTxNum = 0;
    if (txHashList && txHashList.length > 0) {
        for (let item of txHashList) {
            let txHash = item.tx_hash;
            logger.info("step3_pollingTxHash() current tx_hash==>%s", txHash);
            let receipt = await honeyConfig.provider.getTransactionReceipt(txHash);
            logger.info("step3_pollingTxHash() receipt==>%s", receipt);
            if (receipt) {
                status = receipt.status == 0 ? STATUS.EXTRACT_FAIL_TX_FAILED : STATUS.EXTRACT_SUCCESS;
                logger.info("step3_pollingTxHash() receipt status==>%s", receipt.status);
                await honeyConfig.updateStatusByTxHash(txHash, status);
                confirmedTxNum++;
            } else {
                logger.info("step3_pollingTxHash() before getTransaction");
                let tx = await honeyConfig.provider.getTransaction(txHash);
                logger.info("step3_pollingTxHash() tx==>%s", tx);
                if (tx) {
                    unConfirmedTxNum++;
                } else {
                    //废弃
                    await honeyConfig.updateStatusByTxHash(txHash, STATUS.EXTRACT_FAIL_TX_DISCARD);
                }
            }
        }
    }
    logger.info("step3_pollingTxHash() run end..|total used %s ms", Date.now() - start);
    return {
        confirmedTxNum: confirmedTxNum,
        unConfirmedTxNum: unConfirmedTxNum
    };
}


/**
 * 4. 扣除用户honey，添加减蜜记录
 * @returns {Promise<void>}
 */
async function step4_updateAssetsAndStatus() {
    let start = Date.now();
    logger.info("step4_updateAssetsAndStatus() run start..");
    //查询出提取成功的记录
    let sql = "select * from user_pickup_honey where status=? and tx_hash <> '' and honey_count <> '' and user_id <> '' order by id";
    let pickHoneyList = await honeyConfig.turinMysql.query(sql, {
        replacements: [STATUS.EXTRACT_SUCCESS],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    logger.info("step4_updateAssetsAndStatus() total user_pickup_honey count==>", pickHoneyList.length);
    if (pickHoneyList && pickHoneyList.length > 0) {
        for (let item of pickHoneyList) {
            //更新 user asset
            try {
                let tx = await honeyConfig.turinMysql.transaction();
                try {
                    let cutHoney = parseFloat(item.honey_count) + CONFIG.honey.gasHoneyCount;
                    let res1 = await honeyConfig.updateUserAssetsHoney(cutHoney, item.user_id, tx);
                    let res2 = await honeyConfig.insertTask(item.user_id, cutHoney, tx);
                    if (res1 && res2) {
                        await tx.commit();
                        await honeyConfig.updateUserPickupHoneyById(item.id, STATUS.DEDUCT_SUCCESS);
                    } else {
                        await tx.rollback();
                        await honeyConfig.updateUserPickupHoneyById(item.id, STATUS.DEDUCT_FAIL);
                    }
                } catch (err) {
                    logger.error("error==>item==>%s", item, err);
                    await tx.rollback();
                    await honeyConfig.updateUserPickupHoneyById(item.id, STATUS.DEDUCT_FAIL);
                }

            } catch (err) {
                logger.error("step4_updateAssetsAndStatus() error==>", err);
                continue;
            }
        }
    }
    logger.info("step4_updateAssetsAndStatus() run end..|total used %s ms", Date.now() - start);
};

/**
 * 5. 最终验证资产是否正确
 * @returns {Promise<void>}
 */
async function step5_finalValidate() {
    let start = Date.now();
    logger.info("step5_finalValidate() run start..");
    let sql = "select * from user_pickup_honey where status=? and tx_hash <> '' and honey_count <> '' and user_id <> '' order by id";
    let pickHoneyList = await honeyConfig.turinMysql.query(sql, {
        replacements: [STATUS.DEDUCT_SUCCESS],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    logger.info("step5_finalValidate() total user_pickup_honey count==>", pickHoneyList.length);
    if (pickHoneyList && pickHoneyList.length > 0) {
        for (let item of pickHoneyList) {
            await honeyConfig.getUserHoney(item.user_id, async function (val) {
                if (parseFloat(item.honey_count) > parseFloat(val)) {
                    await honeyConfig.updateUserPickupHoneyById(item.id, STATUS.FINAL_VALIDATE_SUCCESS);
                } else {
                    logger.warn('step5_finalValidate() validate failed; user user_id=%s; eth_address=%s; honey_count=%s; honey_asset=%s;', item.user_id, item.eth_address, item.honey_count, val);
                    await honeyConfig.updateUserPickupHoneyById(item.id, STATUS.FINAL_VALIDATE_FAIL);
                }
            });
        }
    }
    logger.info("step5_finalValidate() run end..|total used %s ms", Date.now() - start);
};

/**
 * 批量空投token
 * @param addressList
 * @param valueList
 * @returns {Promise<*>}
 */
async function batchAirdropHoneyDiff(addressList, valueList) {
    try {
        let fromWallet = await honeyConfig.Wallet.fromEncryptedWallet(CONFIG.owner.v3Json, CONFIG.owner.password);
        fromWallet.provider = honeyConfig.provider;
        if (valueList.length != addressList.length) {
            logger.warn("batchAirdropHoneyDiff() valueList.length != addressList.length");
            return;
        }
        let contract = await new honeyConfig.ethers.Contract(CONFIG.honey.contractAddress, HoneyABI, fromWallet);
        let transaction = {};
        transaction.nonce = await getNonce(fromWallet.address);
        transaction.gasLimit = CONFIG.eth.gasLimit;//await honeyConfig.provider.estimateGas(transaction);
        transaction.gasPrice = CONFIG.eth.gasPrice;
        transaction = await contract.airdropDiff(valueList, addressList, transaction);

        // transaction.gasLimit = CONFIG.eth.gasLimit;//await ethersObj.provider.estimateGas(transaction);
        // transaction.gasLimit = await contract.estimate.airdropDiff(valueList, addressList);

        logger.info('batchAirdropHoneyDiff() transaction==>', transaction);
        await updateNonce(fromWallet.address, transaction.nonce);
        return transaction.hash;
    } catch (err) {
        logger.error("batchAirdropHoneyDiff() error==>", err);
        return null;
    }

};

/**
 * 获取nonce值
 * @param address
 * @returns {Promise<number>}
 */
async function getNonce(address) {
    let nonce = 0;
    let transactionCount = await honeyConfig.provider.getTransactionCount(address, "pending");
    let keyInfo = await redisKeyManager.getWalletAddressLastTxNonceKey(address);
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
    let keyInfo = await redisKeyManager.getWalletAddressLastTxNonceKey(address);
    redisUtil.set(keyInfo.key, nonce);
}

/**
 * 重发交易
 * @param txHash
 * @param gasPrice
 * @returns {Promise<void>}
 */
async function resendTransaction(txHash, gasPrice) {
    if (!txHash || !gasPrice) {
        logger.warn("resendTransaction()| params txHash and gasPrice not empty");
        return;
    }
    let start = Date.now();
    logger.info("resendTransaction() run start..");
    let sql = "select * from user_pickup_honey where status=? and tx_hash =?";
    let pickHoneyList = await honeyConfig.turinMysql.query(sql, {
        replacements: [STATUS.EXTRACTING, txHash],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    if (pickHoneyList && pickHoneyList.length > 0) {
        let receipt = await honeyConfig.provider.getTransactionReceipt(txHash);
        if (!receipt) {
            let transaction = await honeyConfig.provider.getTransaction(txHash);
            if (transaction) {
                //重发
                logger.info("resendTransaction()| previous transaction==>", transaction);
                let newTransaction = {
                    gasPrice: gasPrice,
                    nonce: transaction.nonce,
                    data: transaction.data,
                    value: transaction.value,
                    gasLimit: transaction.gasLimit,
                    to: transaction.to,
                    chainId: transaction.networkId
                };
                let fromWallet = await honeyConfig.Wallet.fromEncryptedWallet(CONFIG.owner.v3Json, CONFIG.owner.password);
                let currentTxHash = await honeyConfig.provider.sendTransaction(fromWallet.sign(newTransaction));
                newTransaction.hash = currentTxHash;
                logger.info("resendTransaction()| current transaction==>", newTransaction);
                await honeyConfig.updateTxHashByTxHash(txHash, currentTxHash);
            } else {
                //废弃
                logger.info("resendTransaction()| transaction already discard==>txHash=%s", txHash);
            }
        } else {
            //有结果了
            logger.info("resendTransaction()| transaction already have receipt==>txHash=%s;receipt status=%s", txHash, receipt.status);
        }
    } else {
        //已更新结果
        logger.info("resendTransaction()| transaction already update status to db==>txHash=%s", txHash);
    }
    logger.info("resendTransaction() run end...|total used %s ms", Date.now() - start);
}

//取消交易
async function cancelTransaction(nonce, gasPrice) {
    let fromWallet = await honeyConfig.Wallet.fromEncryptedWallet(CONFIG.owner.v3Json, CONFIG.owner.password);
    let transaction = {
        nonce: nonce,
        gasLimit: CONFIG.eth.gasLimit,//await honeyConfig.provider.estimateGas(transaction);
        gasPrice: gasPrice,
        from: fromWallet.address,
        to: fromWallet.address,
        value: honeyConfig.utils.parseEther('0.0'),
    };
    let txhash = await honeyConfig.provider.sendTransaction(fromWallet.sign(transaction));
    logger.info('txhash==>', txhash);
};

/**
 * 计算交易的gas消耗
 * @returns {Promise<void>}
 */
async function calcTxGasCost() {
    let sql = "select distinct tx_hash from user_pickup_honey where status=? and utime > ?";
    let pickHoneyList = await honeyConfig.turinMysql.query(sql, {
        replacements: [STATUS.DEDUCT_SUCCESS, '2018-06-15'],
        type: honeyConfig.turinMysql.QueryTypes.SELECT
    });
    if (pickHoneyList && pickHoneyList.length > 0) {
        let totalEther = 0;
        for (let item of pickHoneyList) {
            let txHash = item.tx_hash;
            let receipt = await honeyConfig.providers.getDefaultProvider().getTransactionReceipt(txHash);
            let transaction = await honeyConfig.providers.getDefaultProvider().getTransaction(txHash);
            if (receipt && transaction) {
                let gasCost = bigDecimal.multiply(honeyConfig.utils.formatEther(transaction.gasPrice), receipt.gasUsed);
                logger.info("calcTxGasCost()| txHash=%s;  gasUsed=%s;  gasPrice=%s;  useEther=%s", txHash, receipt.gasUsed, transaction.gasPrice, gasCost);
                totalEther = bigDecimal.add(totalEther, gasCost);
            }
        }
        logger.info("calcTxGasCost()| totalEther==>", totalEther);
    }
}

module.exports = {
    step0_filterRepeatEthAddress: step0_filterRepeatEthAddress,
    step1_updateUserHoneyCount: step1_updateUserHoneyCount,
    step2_execAirdrop: step2_execAirdrop,
    step3_pollingTxHash: step3_pollingTxHash,
    step4_updateAssetsAndStatus: step4_updateAssetsAndStatus,
    step5_finalValidate: step5_finalValidate,
    cancelTransaction: cancelTransaction,
    resendTransaction: resendTransaction,
    calcTxGasCost: calcTxGasCost
}


/**************** run *******************/

async function test() {
    let transaction = await honeyConfig.provider.getTransaction("0xc4949ddf8e3524a8e05108fcdef495fb68a8a9b54a6fdf432601b12aee81ed5e");
    logger.info("resendTransaction()| previous transaction==>", transaction);
    let newTransaction = {
        gasPrice: 0.0001,
        nonce: 9738,
        data: transaction.data,
        value: transaction.value,
        gasLimit: transaction.gasLimit,
        to: transaction.to,
        chainId: transaction.networkId
    };
    let fromWallet = await honeyConfig.Wallet.fromEncryptedWallet(CONFIG.owner.v3Json, CONFIG.owner.password);
    let currentTxHash = await honeyConfig.provider.sendTransaction(fromWallet.sign(newTransaction));
    newTransaction.hash = currentTxHash;
    logger.info("resendTransaction()| current transaction==>", newTransaction);
}
