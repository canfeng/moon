const tokenDao = require('../proxy/token_dao');
const walletDao = require('../proxy/wallet_dao');
const logger = require('../logger').getLogger('token_service');
const ethersObj = require('../eth/ethers_obj');
var redisTokenUtil = require('../eth/redis_token_util.js');
var ethCommonUtil = require('../eth/common_util.js');
var Threads = require('../util/threads_util.js');
var Worker = Threads.Threads.Worker;
const transactionsDao = require('../proxy/transactions_dao.js');
const walletTokenDao = require('../proxy/wallet_token_dao');
const ConfigJSON = require(ConfigPath + 'config.json');
const redisUtil = require('../util/redis_util');
const commonUtil = require('../util/common_util');
const cryptoUtil = require('../util/crypto_util');
const responseUtil = require('../util/response_util');
const RES_CODE = responseUtil.RES_CODE;
const redisKeyManager = require('../common/redis_key_manager');
const commonEnum = require('../common/common_enum');
const walletUserService = require('./wallet_user_service');
const walletNoticeService = require('./wallet_notice_service');
const transactionService = require('./transaction_service');
const alarmService = require('./alarm_service');
const bigDecimal = require('js-big-decimal');

/**
 * 添加新的token
 * 1. 补全token信息
 * 2. symbol不能重名，需要顺序编号存储
 * @param token
 * @returns {Promise<void>}
 */
const addNewToken = async function (token) {
    try {
        if (token.symbol.startsWith(ConfigJSON.eth.default_token_symbol)) {
            token.type = 3;
        }
        var res = await tokenDao.addToken(token);
        logger.info('addNewToken()|add new token==>symbol:', token.symbol);
        return res;
    } catch (err) {
        if (err.name == 'SequelizeUniqueConstraintError') {
            if (err.fields['uk_address']) {
                logger.error('addNewToken()|token is already exist==>address:', token.address);
                return;
            }
            if (err.fields['uk_symbol']) {
                const count = await tokenDao.findCountBySymbol(token.symbol);
                token.symbol = token.symbol + '' + (count + 1);
                return await addNewToken(token);
            }
        }
        logger.error('addNewToken()|exception==>', err);
    }
};

const deleteToken = async function (address) {
    return await tokenDao.updateStatusByAddress(address, 0);
};

/**
 * 获取指定账户地址的token余额，除去decimal,保留4为小数返回
 * @param tokenAddress
 * @param accountAddress
 * @param tokenDecimal
 * @returns {Promise<*>}
 */
const tokenBalance = async function (tokenAddress, accountAddress, tokenDecimal) {
    const balance = await ethersObj.getBalance(tokenAddress, accountAddress);
    if (!tokenDecimal) {
        tokenDecimal = await getOrSetDecimal(tokenAddress);
    }
    return bigDecimal.divide(balance, Math.pow(10, tokenDecimal), 4);
};

async function getOrSetDecimal(address) {
    var val = await redisTokenUtil.getTokenDecimal(address);
    if (!val) {
        val = await ethersObj.getDecimals(address);
        redisTokenUtil.refreshTokenDecimal(address, val);
    }
    return val;
}

async function synTxData(params, funcname) {
    ethersObj.listTxpage(params.pageIndex, params.pageSize, params.address, true, function (data) {
        data.forEach(async function (item) {
            var fee = ethersObj.utils.formatEther(ethersObj.utils.bigNumberify(item.gasPrice).mul(item.gasUsed));
            var tokenAddress;
            if (item.input == "0x" || ethersObj.utils.bigNumberify(item.value).gt(0)) {
                tokenAddress = "0x0";
            }
            else {
                tokenAddress = item.to;
            }

            var status = item.status == 0 ? 2 : item.status;
            var _data = item.input;
            var to = item.to;
            var value = item.value;
            if (item.input == "0x") {
                value = ethersObj.utils.formatEther(value);
            }
            logger.debug("tokenAddress : ", tokenAddress);
            const decimal = await getOrSetDecimal(tokenAddress);
            var toAndValue = ethCommonUtil.parseFromTxByToken(decimal, _data, value, to);
            to = toAndValue.to;
            value = toAndValue.value;
            var transaction = {
                tokenAddress: tokenAddress,
                from: item.from,
                to: to,
                value: value,
                gasFee: fee,
                message: '',
                timeStamp: item.timeStamp,
                blockNum: item.blockNumber,
                txhash: item.hash,
                status: status
            };
            transactionsDao.add(transaction);

        });
    });
    funcname();
}

async function addWalletToken(token, walletId) {

    logger.info("addWalletToken token : ", token);
    var _token = await redisTokenUtil.getTokenByAddress(token.address);
    if (!_token) {
        _token = await addNewToken(token);
        if (_token.id && _token.type != 0) {
            await walletTokenDao.addWalletToken(walletId, _token.id);
            redisTokenUtil.refreshToken(_token);
        }
    } else {
        var walletToken = await walletTokenDao.findOneByWalletIdTokenId(walletId, _token.id);
        if (!walletToken && _token.type != 0) {
            walletTokenDao.addWalletToken(walletId, _token.id);
        }
    }
}

/**
 * syn data for old wallet, first syn tokens to table token, second, syn history transaction data.
 * @param walletId
 * @param address
 * @param pageIndex
 * @param pageSize
 */
async function synDataForOldWallet(walletId, address, pageIndex, pageSize) {
    logger.info("synDataForOldWallet : {walletId:%s, addrees:%s, pageIndex:%s, pageSize:%s}",
        walletId, address, pageIndex, pageSize);
    pageIndex = pageIndex == 0 ? 1 : pageIndex;
    var worker = new Worker(function () {
        this.onmessage = function (event) {
            postMessage(event.data);
        };
    });
    worker.addEventListener("message", function (event) {
        logger.debug("eventListener : ", event.data);
        synTxData({pageIndex: pageIndex, pageSize: pageSize, address: address, walletId: walletId}, function () {
            worker.terminate();
        });
    });

    // var obj = {
    //     step1: function () {
    ethCommonUtil.getTokensByAddress(address, function (tokenConstractList) {
        logger.debug("token length : ", tokenConstractList.length);
        tokenConstractList.forEach(function (constractAddress) {
            redisTokenUtil.getTokenByAddress(constractAddress).then(function (token) {
                if (!token) {
                    ethersObj.generateToken(constractAddress, function (_token) {
                        addWalletToken(_token, walletId);
                    });
                }
                else {
                    addWalletToken(token, walletId);
                    // walletTokenDao.addWalletToken(walletId, token.id);
                }
            });
        });
    });

    worker.postMessage("start.");
};

/**
 * 获取指定wallet的token列表和总资产
 * @param walletId
 * @returns {Promise<void>}
 */
const getWalletTokenListAndTotalAssets = async function (walletAddress, userPhone) {
    const tokenList = await walletTokenDao.findTokenListByWalletAddressAndUserPhone(walletAddress, userPhone);
    let totalAssets = 0;
    const arr = [];
    for (let token of tokenList) {
        arr.push(
            (async () => {
                await getTokenPriceAndWalletAsset(token, walletAddress);
                totalAssets += parseFloat(token.assets);
            })()
        );
    }
    await Promise.all(arr);
    return {
        totalAssets: new bigDecimal(totalAssets).value,
        tokenList: tokenList
    };
};

/**
 * 获取token价格和钱包资产信息
 * @param token
 * @returns {Promise<void>}
 */
const getTokenPriceAndWalletAsset = async function (token, walletAddress) {
    //获取最新的token价格信息
    const priceInfo = await redisTokenUtil.getTokenUsdCny(token.address);
    if (priceInfo) {
        token.priceCny = new bigDecimal(priceInfo.cnyPrice).value;
        token.priceUsd = new bigDecimal(priceInfo.usdPrice).value;
        //获取余额
        token.balance = await tokenBalance(token.address, walletAddress, token.decimalVal);
        //计算资产
        token.assets = bigDecimal.round(bigDecimal.multiply(token.balance, priceInfo.cnyPrice), 4);
    }
};


/**
 * @deprecated
 * 获取钱包的可选token列表
 * @returns {Promise<void>}
 */
const getWalletOptionsTokenList = async function (walletId) {
    const walletOptionList = await walletTokenDao.findOptionTokenListByWalletAddressAndUserPhone(walletId);
    if (walletOptionList.length <= 0) {
        return null;
    }

    const symbolArr = [];
    for (let item of walletOptionList) {
        symbolArr.push(item.symbol);
    }
    const commonOptionList = await tokenDao.findOptionalTokenList(symbolArr);
    return walletOptionList.concat(commonOptionList);
};

/**
 * 验证transferToken的有效性
 * @param transferToken
 * @param userPhone
 * @returns {Promise<void>}
 */
const validateTransferToken = async function (userPhone, transferToken) {
    if (!transferToken) {
        return null;
    }
    const redisKeyInfo = await redisKeyManager.getTransferTokenKey(userPhone, transferToken);
    return await redisUtil.exists(redisKeyInfo.key);
};

/**
 * 验证transferToken的有效性并返回预提交的转账数据
 * @param transferToken
 * @param userPhone
 * @returns {Promise<void>}
 */
const validateTransferTokenAndGetTransferData = async function (userPhone, transferToken) {
    if (!transferToken) {
        return {
            RES_CODE: RES_CODE.TRANSFER_TOKEN_ERROR
        };
    }
    const redisKeyInfo = await redisKeyManager.getTransferTokenKey(userPhone, transferToken);
    const transferSubmitData = await redisUtil.get(redisKeyInfo.key);
    if (transferSubmitData) {
        const transferTokenUsedTimesKeyInfo = await redisKeyManager.getTransferTokenUsedTimesKey(transferToken, true);
        const transferTokenUsedTimes = await redisUtil.incr(transferTokenUsedTimesKeyInfo.key);
        if (transferTokenUsedTimes == 1) {//确保transferToken只能使用一次
            redisUtil.expire(transferTokenUsedTimesKeyInfo.key, transferTokenUsedTimesKeyInfo.expire);
            return {
                RES_CODE: RES_CODE.CONFIRMED,
                transferData: JSON.parse(transferSubmitData)
            };
        } else {
            return {
                RES_CODE: RES_CODE.TRANSFER_TOKEN_IN_DEAL_ERROR
            }
        }
    }
    return {
        RES_CODE: RES_CODE.TRANSFER_TOKEN_ERROR
    };
};

/**
 * 删除redis中的transferToken
 * @param transferToken
 * @param userPhone
 * @returns {Promise<void>}
 */
const deleteTransferToken = async function (userPhone, transferToken) {
    const redisKeyInfo = await redisKeyManager.getTransferTokenKey(userPhone, transferToken);
    await redisUtil.del(redisKeyInfo.key);
};

/**
 * 生成transferToken并保存预提交的转账信息
 * @param userPhone
 * @param transferData
 * @returns {Promise<void>}
 */
const generateTransferTokenAndSaveTransferSubmitData = async function (userPhone, transferSubmitData) {
    //generate transferToken
    const transferToken = commonUtil.randomStr(32);
    logger.info('generateTransferTokenAndSaveTransferSubmitData() generate transferToken for user==>token=%s;userPhone=%s', transferToken, userPhone);
    const redisKeyInfo = await redisKeyManager.getTransferTokenKey(userPhone, transferToken, true);
    redisUtil.set(redisKeyInfo.key, JSON.stringify(transferSubmitData), redisKeyInfo.expire);
    return transferToken;
};

/**
 * 转账
 * @param userPhone
 * @param transferData
 * @param callback
 * @returns {Promise<void>}
 */
const tokenTransfer = async function (userPhone, transferData) {
    const from = transferData.from;
    const to = transferData.to;
    const tokenAddress = transferData.tokenAddress;
    const value = new bigDecimal(transferData.value).value;
    const password = cryptoUtil.AES.decryptNoPadding(transferData.password, ConfigJSON.aes_cipher_key.password_cipher);
    const gasPrice = parseFloat(ethersObj.utils.parseEther(transferData.gasPrice) || (await ethersObj.provider.getGasPrice()).toString());
    const message = transferData.message;

    const token = await redisTokenUtil.getTokenByAddress(tokenAddress);

    const gasLimit = parseFloat(transferData.gasLimit || token.transferGasUsed);

    const wallet = await walletDao.findByAddressAndUserPhone(from, userPhone, true);

    //transfer
    const withDecimalValue = bigDecimal.multiply(value, Math.pow(10, token.decimalVal));
    let nonce = await transactionService.getAddressTxNonce(from);
    return new Promise(function (resolve, reject) {
        ethersObj.transaction(tokenAddress, userPhone, wallet.id, wallet.v3Json, password,
            from, to, withDecimalValue, gasLimit, gasPrice, nonce, async function (txHash, errorMsg) {
                if (!txHash) {
                    resolve(responseUtil.error(RES_CODE.TOKEN_TRANSFER_ERROR, errorMsg));
                    return;
                }
                //save transaction_log
                let transactionLog = {
                    tokenAddress: tokenAddress,
                    from: from,
                    to: to,
                    value: value,
                    gasFee: ethersObj.utils.formatEther(bigDecimal.multiply(gasPrice, gasLimit)),
                    message: message,
                    txhash: txHash,
                    gasPrice: ethersObj.utils.formatEther(gasPrice),
                    gasLimit: gasLimit,
                    nonce: nonce
                };
                transactionLog = await transactionsDao.add(transactionLog);
                transactionLog.type = 1;//default send out
                transactionLog.status = 0;
                logger.info('tokenTransfer()|added transaction_log==>txhash:%s', txHash);

                //update from nonce
                transactionService.updateAddressTxNonce(from, nonce);

                //incr user transfer times
                walletUserService.incrUserTransferTimes(userPhone);

                //check alarm condition
                alarmService.checkIsTouchAlarmCondition(alarmService.ALARM_TYPE.SINGLE_TRANSACTION_AMOUNT, value, tokenAddress, wallet.ethAddress, userPhone);

                //wait for transaction status
                ethersObj.refreshTxStatus(txHash, async function (transaction) {
                    //get receipt for gasUsed
                    const txReceipt = await ethersObj.provider.getTransactionReceipt(transaction.hash);
                    const gasFee = ethersObj.utils.formatEther(ethersObj.utils.bigNumberify(transaction.gasPrice).mul(txReceipt.gasUsed));
                    //get block for timestamp
                    const block = await ethersObj.provider.getBlock(transaction.blockNumber);
                    transactionLog = {
                        timeStamp: block.timestamp,
                        blockNum: transaction.blockNumber,
                        txhash: transaction.hash,
                        status: txReceipt.status == 1 ? commonEnum.PLATFORM_TX_STATUS.CONFIRMED : commonEnum.PLATFORM_TX_STATUS.FAILED,
                        gasFee: gasFee,
                        gasUsed: txReceipt.gasUsed
                    };
                    //update tx status
                    const resUpdate = await transactionsDao.updateByTxHash(transactionLog);
                    logger.info('tokenTransfer()|updated transaction_log==>txhash:%s;res:%s', txHash, resUpdate);

                    //use jpush send message to client
                    walletNoticeService.sendWalletNotice(txHash, value, token.symbol, txReceipt.status, from, to);
                });

                resolve(responseUtil.success(transactionLog));
            });
    });

}

module.exports = {
    addNewToken: addNewToken,
    deleteToken: deleteToken,
    tokenBalance: tokenBalance,
    synDataForOldWallet, synDataForOldWallet,
    getWalletTokenListAndTotalAssets: getWalletTokenListAndTotalAssets,
    getTokenPriceAndWalletAsset: getTokenPriceAndWalletAsset,
    getWalletOptionsTokenList: getWalletOptionsTokenList,
    validateTransferToken: validateTransferToken,
    validateTransferTokenAndGetTransferData: validateTransferTokenAndGetTransferData,
    deleteTransferToken: deleteTransferToken,
    generateTransferTokenAndSaveTransferSubmitData: generateTransferTokenAndSaveTransferSubmitData,
    tokenTransfer, tokenTransfer,
    addWalletToken: addWalletToken
}