/**
 * Created by shizhiguo on 2018/6/18
 */
const HoneyABI = require('./honey-abi.json');
const redisKeyManager = require('../common/redis_key_manager');
const commonEnum = require('../common/common_enum');
const redisUtil = require('../util/redis_util');
const STATUS = require('./status');
const logger = require('./logger').getLogger('batch_airdrop_honey');
const bigDecimal = require('js-big-decimal');
const SysProject = require('../proxy/sys-project');
const RecordUserTx = require('../proxy/record-user-tx');
const ethersObj = require('../eth/ethers_obj');
const Config = require(ConfigPath + 'config.json');

/*
## token分发流程
- A. 检查条件
1. 项目是否未完成，是否未达到硬顶
2.
*/
const tokenDistribute = async function (projectGid, password) {
    let project = await SysProject.findByProjectGid(projectGid);
    if (project) {
        let tokenAddress = project.tokenAddress;
        let projectPlatFormAddress = project.platformAddress;
        //获取projectPlatFormAddress的v3json
        let v3Json = redisKeyManager.getKeyPlatformProjectV3Json(projectPlatFormAddress);

        let listRecordUserTx = await RecordUserTx.findByUserTxStatusAndProjectGid(commonEnum.UserTxStatus.SUCCESS);
        if (listRecordUserTx) {
            for (let record of listRecordUserTx) {
                let userReceiveAddress = record.getTokenAddress;
                let value = 0;
                let gasLimit = Config.eth.default_token_transfer_gas_used;
                let defaultGasPrice = parseFloat(await ethersObj.provider.getGasPrice());
                let nonce = getNonce(projectPlatFormAddress);
                //token转账
                ethersObj.transfer(tokenAddress, v3Json, password, projectPlatFormAddress, userReceiveAddress, value, gasLimit, defaultGasPrice, nonce, function (txHash) {
                    if (!txHash) {
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
                });
            }
        } else {
            logger.warn('tokenDistribute() no record_user_tx for this project==>projectGid=%s', projectGid);
        }
    } else {
        logger.error("tokenDistribute() project not found==>projectGid=%s", projectGid);
    }
};


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
