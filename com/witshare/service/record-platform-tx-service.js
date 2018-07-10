const log = require('../logger').getLogger('record-platform-tx-service');
const RecordPlatformTx = require('../proxy/record_platform_tx');
const commonEnum = require('../common/common_enum');
const bigDecimal = require('js-big-decimal');
const ethersObj = require('../eth/ethers_obj');
const configJson = require(ConfigPath + 'config.json');
const PLATFORM_TX_STATUS = commonEnum.PLATFORM_TX_STATUS;

const erc20TransferMethodId = ethersObj.utils.id('transfer(address,uint256)').substring(0, 10);
const erc20TransferFromMethodId = ethersObj.utils.id('transferFrom(address,address,uint256)').substring(0, 10);
const erc20TransferEventTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * 获取平台和项目之间的交易流水详情和状态
 * @param obj
 * @returns {boolean}
 */
const getPlatformTxDetails = async () => {
    log.info('*********************** getPlatformTxDetails() START *********************');
    const start = Date.now();
    //获取需要查询的交易记录
    let recordList;
    do {
        let result = await RecordPlatformTx.pageByTxStatus([PLATFORM_TX_STATUS.INIT, PLATFORM_TX_STATUS.DISCARD], 1, 1000);//暂不分页处理
        log.info(`getPlatformTxDetails() total count=${result.count}`);
        recordList = result.rows;
        let updatedItem = {};
        for (let record of recordList) {
            log.info('getPlatformTxDetails() current search txHash==>', record.txHash);
            try {
                updatedItem = {
                    txHash: record.txHash,
                    txVerificationTime: new Date()
                };
                let txHash = record.txHash;
                //检查交易hash的格式
                if (/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
                    //检查交易有效性
                    let receipt = await ethersObj.provider.getTransactionReceipt(txHash);
                    let transaction = await ethersObj.provider.getTransaction(txHash);
                    if (receipt) {
                        updatedItem.txTokenType = 'ETH';
                        updatedItem.txAmount = ethersObj.utils.formatEther(transaction.value);
                        updatedItem.fromAddress = transaction.from;
                        updatedItem.toAddress = transaction.to;
                        updatedItem.ethFee = ethersObj.utils.formatEther(bigDecimal.multiply(transaction.gasPrice, receipt.gasUsed));
                        //判断是否是token转账
                        let addressCode = await ethersObj.provider.getCode(transaction.to);
                        let transData = transaction.data;
                        if ('0x' !== addressCode && '0x' !== transData) {
                            updatedItem.txTokenType = await ethersObj.getSymbol(transaction.to);
                            let decimal = await ethersObj.getDecimals(transaction.to);
                            if (transaction.data.startsWith(erc20TransferMethodId)) {
                                updatedItem.txAmount = ethersObj.parseTokenValueByTx(erc20TransferMethodId, decimal, transData);
                                updatedItem.toAddress = await ethersObj.parseToAddressByTx(erc20TransferMethodId, transData);
                            } else if (transaction.data.startsWith(erc20TransferFromMethodId)) {
                                updatedItem.txAmount = ethersObj.parseTokenValueByTx(erc20TransferFromMethodId, decimal, transData);
                                updatedItem.toAddress = await ethersObj.parseToAddressByTx(erc20TransferFromMethodId, transData);
                            }
                        }

                        //get last blockNumber
                        let lastBlockNumber = await ethersObj.provider.getBlockNumber();
                        log.info('getPlatformTxDetails() lastBlockNumber==>', lastBlockNumber);
                        if (transaction.blockNumber + 6 <= lastBlockNumber) {
                            //get block for timestamp
                            let block = await ethersObj.provider.getBlock(transaction.blockNumber);
                            updatedItem.txTime = new Date(block.timestamp * 1000);
                            updatedItem.txStatus = receipt.status === 1 ? PLATFORM_TX_STATUS.SUCCESS : PLATFORM_TX_STATUS.FAILED;
                        } else {
                            log.info(`getPlatformTxDetails() tx already mined, but confirmed block number not enough to 6==>txHash=${txHash}; minedBlock=${transaction.blockNumber}; lastBlock=${lastBlockNumber}`);
                            updatedItem.txStatus = PLATFORM_TX_STATUS.PENDING;//1
                        }
                    } else {
                        if (!transaction) {
                            log.info(`getPlatformTxDetails() txHash not exist==>txHash=${txHash}`);
                            updatedItem.txStatus = PLATFORM_TX_STATUS.DISCARD;//4
                        } else {
                            log.info(`getPlatformTxDetails() txHash not mined==>txHash=${txHash}`);
                            updatedItem.txStatus = PLATFORM_TX_STATUS.PENDING;//1
                        }
                    }
                } else {
                    log.info("getPlatformTxDetails() txHash is invalid==>txHash=%s", txHash);
                    updatedItem.txStatus = PLATFORM_TX_STATUS.TX_INVALID;//5
                }
                await RecordPlatformTx.updateTxStatusByPayTx(updatedItem);
            } catch (err) {
                log.error("getPlatformTxDetails() exception==>txHash=%s", record.txHash, err);
                continue;
            }
        }
    } while (recordList && recordList.length > 0);
    log.info('*********************** getPlatformTxDetails() END *********************** ==> ' +
        'total used time=%sms;', Date.now() - start);
};

module.exports = {
    getPlatformTxDetails: getPlatformTxDetails
};