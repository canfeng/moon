var transactionsDao = require("../proxy/transactions_dao.js");

var ethersObj = require("./ethers_obj.js");

var logger = require("../logger.js").getLogger("schedule");

var walletDao = require("../proxy/wallet_dao.js");

var tokenDao = require('../proxy/token_dao.js');
var tokenService = require("../service/token_service.js");

const walletTokenDao = require('../proxy/wallet_token_dao');

var walletNoticeService = require("../service/wallet_notice_service.js");

var ethCommonUtil = require('./common_util.js');

var redisTokenUtil = require("./redis_token_util.js");

var blockTimestampCache = require('memory-cache');

function putTimstamp(blockNum, timestamp) {
    blockTimestampCache.put(blockNum, timestamp, "100000", function () {
        logger.info("blockTimestampCache key %s overdue.", key);
    });
}

function getTimetamp(blockNum, funcName) {
    var val = blockTimestampCache.get(blockNum);
    if (!val) {
        ethersObj.readProvider.getBlock(blockNum).then(function (block) {
            val = block.timestamp;
            if (funcName) {
                funcName(val);
            }
            putTimstamp(blockNum, block.timestamp);
        });
        return;
    }
    if (funcName) {
        funcName(val);
    }
}

function dealAbnormalTransactions(list) {
    list.forEach(function (item) {
        ethersObj.readProvider.getTransactionReceipt(item.txhash).then(async function (transactionReceipt) {
            if (!transactionReceipt) {
                let transaction = await ethersObj.readProvider.getTransaction(item.txhash);
                if (!transaction) {
                    //修改交易记录状态为已作废
                    transactionsDao.updateByTxHash({status: 3, txhash: item.txhash});
                    return;
                }
                return ;
            }
            var blockNumber = transactionReceipt.blockNumber;
            var status = transactionReceipt.status;
            if (!blockNumber) {
                return;
            }
            status = status == 0 ? 2 : status;
            item.blockNum = blockNumber;
            item.status = status;
            getTimetamp(item.blockNum, function (timestamp) {
                item.timeStamp = timestamp;
                synWalletToken(item.from, item.to, item.tokenAddress, function () {
                    logger.info("dealAbnormalTransactions wallet token.")
                });
                transactionsDao.updateByTxHash(item).then(function (res) {
                    sendWalletNotice(item.txhash, item.value, item.tokenAddress, item.status, item.from, item.to);
                });
            })(item);
        });
    });
}

/**
 * monitor current new block product
 */
var monitorBlockChange = function () {
    logger.info("****************************************************monitor block****************************************************");
    ethersObj.readProvider.on("block", function (blockNumber) {
        ethersObj.readProvider.getBlock(blockNumber).then(function (block) {
            transactionsDao.fundAbnormalData().then(function (list) {
                if (list.count > 0) {
                    dealAbnormalTransactions(list.rows)
                }
            });
            block.number = block.number - 1;
            logger.info("synTxForActualTime blockNumber [%s] start.", block.number);
            var transactions = block.transactions;
            var params = {transactions: transactions, timestamp: block.timestamp};
            synTxForActualTime(params, false);
            logger.info("synTxForActualTime blockNumber [%s]  params[%s] end.", block.number, JSON.stringify(params));
        });
    });
};

var correctBlockDataByNumber = function (blockNumber) {
    logger.info("correctBlockDataByNumber block : ", blockNumber);
    ethersObj.readProvider.getBlock(blockNumber).then(function (block) {
        block.number = block.number;
        logger.info("correcthBlockDataByNumber blockNumber[%s] start.", block.number);
        var transactions = block.transactions;
        var params = {transactions: transactions, timestamp: block.timestamp};
        synTxForActualTime(params, true);
        logger.info("correcthBlockDataByNumber blockNumber[%s]  params[%s] end.", block.number, JSON.stringify(params));
    });
};

var initAddressToCache = async function () {
    var list = await walletDao.findAll();
    if (list) {
        list.forEach(function (item) {
            redisTokenUtil.addAddressToHash(item.ethAddress.toLocaleLowerCase());
        });
    }
    ;
};

async function addWalletToken(token, walletId) {
    /*   var _token = await redisTokenUtil.getTokenByAddress(token.address);
       logger.info("addWalletToken token : ", _token);
       if (!_token) {
           var res = await tokenService.addNewToken(token);
           _token = token;
           _token.id = res.id;
           if (_token.id && _token.type != 0) {
               await walletTokenDao.addWalletToken(walletId, _token.id);
               await redisTokenUtil.refreshToken(_token);
           }
       }
       else {
           var walletToken = await walletTokenDao.findOneByWalletIdTokenId(walletId, _token.id);
           if (!walletToken) {
               walletTokenDao.addWalletToken(walletId, _token.id);
           }
       }*/

    tokenService.addWalletToken(token, walletId);
}

/**
 * syn wallet token and token to db.
 * @param _from : transaction from address
 * @param _to : transaction to address
 * @param constractAddress : contract address(ether default 0x0)
 * @returns {Promise<void>}
 */
async function synWalletToken(_from, _to, constractAddress, funcName) {
    walletDao.findByAddress(_from).then(function (walletList) {
        if (walletList && walletList.length > 0) {
            walletList.forEach(function (tmp) {
                ethersObj.generateToken(constractAddress, function (token) {
                    logger.debug(constractAddress + " token : %s.", token);
                    addWalletToken(token, tmp.id);
                });
            });
        }
        walletDao.findByAddress(_to).then(function (walletList) {
            if (walletList && walletList.length > 0) {
                walletList.forEach(function (tmp) {
                    ethersObj.generateToken(constractAddress, function (token) {
                        logger.debug(constractAddress + " token : %s.", token);
                        addWalletToken(token, tmp.id);
                        funcName();
                    });
                });
            }
            else {
                funcName();
            }
        });
    });
}

function synTxForActualTime(params, isToCorrect) {
    var timestamp = params.timestamp;
    var transactions = params.transactions;
    transactions.forEach(function (transaction) {
        ethersObj.readProvider.getTransaction(transaction).then(function (item) {
            item.timestamp = timestamp;
            dealTransaction(item, isToCorrect);
        });
    });
};

async function dealTransaction(item, isToCorrect) {
    var _data = item.data;
    var to = item.to;

    logger.info("hash : ", item.hash);
    // TODO need to modify, it is not accuracy currently.
    if (_data == "0x" || ethersObj.utils.bigNumberify(item.value).gt(0)) {
        item.tokenAddress = "0x0";
    }
    else {
        item.tokenAddress = item.to;
    }

    item.to = ethCommonUtil.parseToAdressByTx(to, _data, item.tokenAddress);
    if (!item.to) {
        return;
    }
    // filter(only the wallet in system)
    /*var listFrom = await walletDao.findByAddress(item.from);
    var listTo = await walletDao.findByAddress(to);
    if ((!listFrom || listFrom.length == 0) && (!listTo || listTo.length == 0)) {
        return ;
    }*/
    var existFrom = await redisTokenUtil.existAddressInHash(item.from.toLocaleLowerCase());
    var existTo = await redisTokenUtil.existAddressInHash(item.to.toLocaleLowerCase());
    if (!existTo && !existFrom) {
        return;
    }
    ethersObj.readProvider.getTransactionReceipt(item.hash).then(function (transactionReceipt) {
        console.info("-------------------------------------------------------------------------------");
        item.status = transactionReceipt.status;
        item.status = item.status == 0 ? 2 : item.status;
        logger.debug("item :: ", item);
        var fee = ethersObj.utils.formatEther(ethersObj.utils.bigNumberify(item.gasPrice).mul(item.gasLimit));
        var value = item.value;

        synWalletToken(item.from, item.to, item.tokenAddress, function () {
            getOrSetDecimal(item.tokenAddress, function (decimal) {
                if (item.tokenAddress == "0x0") {
                    value = ethersObj.utils.formatEther(value, {commify: true});
                }
                else {
                    value = ethCommonUtil.parseValueByTx(decimal, item.data, value);
                }
                var tx = {
                    tokenAddress: item.tokenAddress,
                    from: item.from,
                    gasFee: fee,
                    value: value,
                    to: item.to,
                    message: '',
                    timeStamp: item.timestamp,
                    blockNum: item.blockNumber,
                    txhash: item.hash,
                    status: item.status,
                    gasPrice:item.gasPrice,
                    gasLimit:item.gasLimit,
                    gasUsed:transactionReceipt.gasUsed,
                    nonce:item.nonce
                };
                transactionsDao.add(tx);
                if (!isToCorrect) {
                    sendWalletNotice(item.hash, value, item.tokenAddress, item.status, item.from, item.to);
                }
            });
        });
    })(item);
}

async function sendWalletNotice(hash, value, tokenAddress, status, from, to) {
    ethersObj.getSymbol(tokenAddress).then(function (symbol) {
        walletNoticeService.sendWalletNotice(hash, value, symbol, status, from, to);
    });
}

async function getOrSetDecimal(address, funcName) {
    var val = await redisTokenUtil.getTokenDecimal(address);
    if (!val) {
        val = await ethersObj.getDecimals(address);
        redisTokenUtil.refreshTokenDecimal(val);
    }
    funcName(val);
}

var refreshTokenPrice = function () {
    var list = [];
    ethCommonUtil.refreshTokenPriceByfxhao(1, list);
}

module.exports = {
    monitorBlockChange: monitorBlockChange,
    correctBlockDataByNumber: correctBlockDataByNumber,
    initAddressToCache: initAddressToCache,
    refreshTokenPrice: refreshTokenPrice
};