const transactionDao = require('../proxy/transactions_dao');
const logger = require('../logger').getLogger('transaction_service');
const redisUtil = require('../util/redis_util');
const ethersObj = require('../eth/ethers_obj');
const redisKeyManager = require('../common/redis_key_manager');
const responseUtil = require('../util/response_util');
const walletDao = require('../proxy/wallet_dao');
const bigDecimal = require('js-big-decimal');
const commonEnum = require('../common/common_enum');
const RES_CODE = responseUtil.RES_CODE;


/**
 * 获取地址的最新nonce值
 * @param address
 * @returns {Promise<number>}
 */
const getAddressTxNonce = async function (address) {
    let nonce = 0;
    //从链上获取的地址交易数量
    let transactionCount = await ethersObj.getNonceByAddress(address);
    let keyInfo = await redisKeyManager.getWalletAddressLastTxNonceKey(address);
    //获取redis中缓存的上次使用的nonce值
    let saveLastNonce = await redisUtil.get(keyInfo.key);
    if (!saveLastNonce) {
        //从数据库查最后一次使用的nonce值
        let txLog = await transactionDao.findLastRecordByFromAddress(address);
        if (txLog) {
            saveLastNonce = txLog.nonce;
        }
    }
    if (saveLastNonce && saveLastNonce >= transactionCount) {
        nonce = parseInt(saveLastNonce) + 1;
    } else {
        nonce = transactionCount;
    }
    return nonce;
};

/**
 * 更新地址的最后使用的nonce值
 * @param address
 * @param nonce
 * @returns {Promise<void>}
 */
const updateAddressTxNonce = async function (address, nonce) {
    let keyInfo = await redisKeyManager.getWalletAddressLastTxNonceKey(address);
    redisUtil.set(keyInfo.key, nonce);
};

/**
 * 重发交易
 * @param userPhone
 * @param password 交易的from keystore密码
 * @param txHash 需要重发的交易hash
 * @param gasPrice 单位：gwei
 * @returns {Promise<string[]>}
 */
const resendTransaction = async function (userPhone, password, txHash, gasPrice) {
    let transactionLog = await transactionDao.findByTxHash(txHash);
    if (transactionLog) {
        if (transactionLog.status() == 0) {
            //get wallet v3json
            let wallet = await walletDao.findByAddressAndUserPhone(transactionLog.from, userPhone, true);
            if (wallet) {
                let receipt = await ethersObj.provider.getTransactionReceipt(txHash);
                if (!receipt) {
                    //获取原交易
                    let oldTransaction = await ethersObj.provider.getTransaction(txHash);
                    if (oldTransaction) {
                        logger.info("resendTransaction()| previous oldTransaction==>", oldTransaction);
                        let gasPriceWei = ethersObj.utils.parseEther(gasPrice);
                        if (gasPriceWei > oldTransaction.gasPrice) {
                            let newTransaction = {
                                gasPrice: gasPrice,
                                nonce: oldTransaction.nonce,
                                data: oldTransaction.data,
                                value: oldTransaction.value,
                                gasLimit: oldTransaction.gasLimit,
                                to: oldTransaction.to,
                                chainId: oldTransaction.networkId
                            };
                            let fromWallet = await ethersObj.Wallet.fromEncryptedWallet(wallet.v3Json, password);
                            let currentTxHash = await ethersObj.provider.sendTransaction(fromWallet.sign(newTransaction));
                            newTransaction.hash = currentTxHash;
                            logger.info("resendTransaction()| new oldTransaction==>", newTransaction);
                            transactionLog.lastTxHash = txHash;
                            transactionLog.txhash = currentTxHash;
                            transactionLog.gasPrice = gasPrice;
                            transactionLog.gasLimit = oldTransaction.gasLimit;
                            transactionLog.status = 0;
                            transactionLog.gasFee = bigDecimal.multiply(oldTransaction.gasLimit, gasPrice);
                            await transactionDao.add(transactionLog);
                            return RES_CODE.SUCCESS;
                        } else {
                            //gasPrice太低
                            return RES_CODE.TRANSACTION_UNDER_PRICED;
                        }
                    } else {
                        //已废弃
                        transactionDao.updateByTxHash({
                            txhash: txHash,
                            status: commonEnum.TX_STATUS.DISCARD
                        });
                        return RES_CODE.TRANSACTION_DISCARD;
                    }
                } else {
                    //已执行
                    transactionDao.updateByTxHash({
                        txhash: txHash,
                        status: receipt.status() == 1 ? commonEnum.TX_STATUS.SUCCESS : commonEnum.TX_STATUS.FAIL
                    });
                    return RES_CODE.TRANSACTION_ALREADY_EXECUTE;
                }
            } else {
                //钱包未找到
                return RES_CODE.WALLET_NOT_FOUND;
            }
        } else {
            //数据库已更新状态
            return RES_CODE.TRANSACTION_ALREADY_UPDATE_STATUS;
        }
    } else {
        //交易为找到
        return RES_CODE.TRANSACTION_NOT_FOUND;
    }
}

module.exports = {
    getAddressTxNonce: getAddressTxNonce,
    updateAddressTxNonce: updateAddressTxNonce,
    resendTransaction: resendTransaction
};