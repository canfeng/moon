/**
 * Created by shizhiguo on 2018/4/19
 * token 空投
 */
const logger = require('../logger').getLogger('token_airdrop_service');
const ethersObj = require('../eth/ethers_obj');
const tokenService = require('../service/token_service');
const walletUserService = require('../service/wallet_user_service');
const walletDao = require('../proxy/wallet_dao');
const tokenDao = require('../proxy/token_dao');
const commonUtil = require('../util/common_util');
const cryptoUtil = require('../util/crypto_util');
const httpUtil = require('../util/http_util');
const ConfigJSON = require(ConfigPath + 'config.json');
const dbManager = require('../proxy/db-manager');


const tokenList = async function (excludeSymbolList) {
    const where = {
        status: 1,
        type: {
            [dbManager.Op.in]: [0, 1]
        }
    };
    if (excludeSymbolList && excludeSymbolList.length > 0) {
        where.symbol = {
            [dbManager.Op.notIn]: excludeSymbolList
        }
    }
    const list = await tokenDao.Token.findAll({
        where: where
    });
    for (let i = 0, l = list.length; i < l; i++) {
        list[i] = list[i].get();
        list[i].status = 0;
    }
    return list;
}


/**
 * 获取以太币
 */
const faucetEther = async function (targetUserPhoneList) {
    const testNetFaucetUrl = "http://faucet.ropsten.be:3001/donate/{address}";

    for (let userPhone of targetUserPhoneList) {

        const wallets = await walletDao.findByUserPhone(userPhone);
        logger.info('all wallets of userPhone==>length:', wallets.length);
        const times = 0;
        let currentAddressIndex = 0;

        logger.info('start get faucet ether===>');
        logger.info('faucetEther()|start==>userPhone=', userPhone);
        for (let wallet of wallets) {
            const address = wallet.ethAddress;
            const balance = await ethersObj.getBalance('0x0', address);
            logger.info('current account balance now==>address=%s;balance=', address, ethersObj.utils.formatEther(balance));
            //faucet
            const res = await httpUtil.get(testNetFaucetUrl.replace('{address}', address));
        }
        logger.info('faucetEther()|end==>userPhone=', userPhone);
        await commonUtil.delay(1);
    }
};

/**
 * 空投ETH
 * @param ownerWallet
 * @param targetUserPhoneList
 * @returns {Promise<void>}
 */
const airdropEth = async function (ownerWallet, targetUserPhoneList) {
    logger.info('✈✈**********************************************AirdropETH START***********************************************');
    // ownerWallet = await walletDao.findByAddressAndUserPhone(ownerWallet.ethAddress, ownerWallet.userPhone);
    logger.info('【1】 owner wallet==>address:%s ;userPhone:%s', ownerWallet.ethAddress, ownerWallet.userPhone);

    logger.info('【2】 need airdrop userPhone count==>', targetUserPhoneList.length);

    const ethToken = {
        symbol: 'ETH',
        address: '0x0',
        transferGasUsed: 21000
    }

    //可用于空投的token
    logger.info('【3】 foreach targetUserPhoneList to airdrop for every userPhone owned wallet==>');
    for (let targetUserPhone of targetUserPhoneList) {
        const targetUserWalletList = await walletDao.findByUserPhone(targetUserPhone);
        logger.info('※ targetUserPhone[%s] airdrop start; total:%d==>', targetUserPhone, targetUserWalletList.length);
        let i = 0;
        for (let targetWallet of targetUserWalletList) {
            try {
                logger.info('\t☸ airdrop ETH to targetWallet start===>address=', targetWallet.ethAddress);
                //random send value 10-110
                const value = parseInt(Math.random() * 10 + 10);
                logger.info('\t\t┕➣ transfer ETH to wallet==>symbol=%s ; value=%s ; wallet=%s', ethToken.symbol, value, targetWallet.ethAddress);
                await tokenTransfer(ownerWallet.userPhone, ownerWallet.password, ownerWallet.ethAddress, targetWallet.ethAddress, ethToken.address, value, ethToken.transferGasUsed);

                await commonUtil.delay(1);
                logger.info('\t☸ airdrop ETH to targetWallet end===>address=', targetWallet.ethAddress);
            } catch (err) {
                logger.error('✘\t☸ airdrop ETH error==>targetWallet=%s ;', targetWallet, err);
                continue;
            }
        }
        logger.info('※ targetUserPhone==end==>', targetUserPhone);
    }
    logger.info('✈✈**********************************************AirdropETH END***********************************************');
}

/**
 * 空投token
 * @param ownerWallet obj {address:'',userPhone:'',password:''}
 * @param targetUserPhoneList array [15011018222,134131313131...]
 * @returns {Promise<void>}
 */
const airdropToken = async function (ownerWallet, targetUserPhoneList) {
    logger.info('✈✈**********************************************AirdropToken START***********************************************');
    // ownerWallet = await walletDao.findByAddressAndUserPhone(ownerWallet.ethAddress, ownerWallet.userPhone);
    logger.info('【1】 owner wallet==>address:%s ;userPhone:%s', ownerWallet.ethAddress, ownerWallet.userPhone);

    logger.info('【2】 need airdrop userPhone count==>', targetUserPhoneList.length);

    //可用于空投的token
    const tokenList = await module.exports.tokenList(['ETH']);
    logger.info('【3】 get all can be airdrop token list ; total:%d==>', tokenList.length);
    for (let token of tokenList) {
        logger.info('\t┕➣ token[%s : %s]', token.symbol, token.address);
    }
    logger.info('【4】 foreach targetUserPhoneList to airdrop for every userPhone owned wallet==>');
    for (let targetUserPhone of targetUserPhoneList) {
        const targetUserWalletList = await walletDao.findByUserPhone(targetUserPhone);
        logger.info('※ targetUserPhone[%s] airdrop start; total:%d==>', targetUserPhone, targetUserWalletList.length);
        let i = 0;
        for (let targetWallet of targetUserWalletList) {
            if (i++ > 1) {//只投给第一个钱包
            // if (targetWallet.ethAddress != '0x1b5c6C8bCA597A116C965742073a52ddA505D544') {//只投给第一个钱包
                continue;
            }
            try {
                logger.info('\t☸ airdrop token to targetWallet start===>address=', targetWallet.ethAddress);
                //token 空投种类 3~8 个
                const holdTokenNum = parseInt(Math.random() * 5 + 3);
                // const holdTokenNum = tokenList.length;
                for (let i = 0; i < holdTokenNum; i++) {
                    //random send token to address
                    const ranToken = tokenList[parseInt(Math.random() * tokenList.length)];

                    //random send value 至少100
                    const value = parseInt(Math.random() * 100000 + 100000);
                    logger.info('\t\t┕➣ transfer token to wallet==>symbol=%s ; value=%s ; wallet=%s', ranToken.symbol, value, targetWallet.ethAddress);
                    await tokenTransfer(ownerWallet.userPhone, ownerWallet.password, ownerWallet.ethAddress, targetWallet.ethAddress, ranToken.address, value, ranToken.transferGasUsed);

                    await commonUtil.delay(1);
                }
                logger.info('\t☸ airdrop token to targetWallet end===>address=', targetWallet.ethAddress);
            } catch (err) {
                logger.error('✘\t☸ airdrop token error==>targetWallet=%s ;', targetWallet, err);
                continue;
            }
        }
        logger.info('※ targetUserPhone==end==>', targetUserPhone);
    }
    logger.info('✈✈**********************************************AirdropToken END***********************************************');
}


/**
 * 空投token
 * @param ownerWallet obj {address:'',userPhone:'',password:''}
 * @param targetUserPhoneList array [15011018222,134131313131...]
 * @returns {Promise<void>}
 */
const airdropTokenToAddress = async function (ownerWallet, addressList) {
    logger.info('✈✈**********************************************AirdropToken START***********************************************');
    // ownerWallet = await walletDao.findByAddressAndUserPhone(ownerWallet.ethAddress, ownerWallet.userPhone);
    logger.info('【1】 owner wallet==>address:%s ;userPhone:%s', ownerWallet.ethAddress, ownerWallet.userPhone);

    logger.info('【2】 need airdrop address count==>', addressList.length);

    //可用于空投的token
    const tokenList = await module.exports.tokenList(['ETH']);
    logger.info('【3】 get all can be airdrop token list ; total:%d==>', tokenList.length);
    for (let token of tokenList) {
        logger.info('\t┕➣ token[%s : %s]', token.symbol, token.address);
    }
    logger.info('【4】 foreach targetUserPhoneList to airdrop for every userPhone owned wallet==>');
    for (let address of addressList) {
        try {
            logger.info('\t☸ airdrop token to targetWallet start===>address=', address);
            //token 空投种类 3~8 个
            // const holdTokenNum = parseInt(Math.random() * 5 + 3);
            const holdTokenNum = tokenList.length;
            for (let i = 0; i < holdTokenNum; i++) {
                //random send token to address
                const ranToken = tokenList[parseInt(Math.random() * tokenList.length)];

                if (ranToken.symbol != 'HONEY') {
                    continue;
                }
                //random send value 至少100
                const value = parseInt(Math.random() * 100000 + 100000);
                logger.info('\t\t┕➣ transfer token to wallet==>symbol=%s ; value=%s ; wallet=%s', ranToken.symbol, value, address);
                await tokenTransfer(ownerWallet.userPhone, ownerWallet.password, ownerWallet.ethAddress, address, ranToken.address, value, ranToken.transferGasUsed);

                await commonUtil.delay(1);
            }
            logger.info('\t☸ airdrop token to targetWallet end===>address=', address);
        } catch (err) {
            logger.error('✘\t☸ airdrop token error==>targetWallet=%s ;', address, err);
            continue;
        }
    }
    logger.info('✈✈**********************************************AirdropToken END***********************************************');
}

/**
 * 转账
 * @param userPhone
 * @param password
 * @param from
 * @param to
 * @param value
 * @param gasLimit
 * @param gasPrice
 * @returns {Promise<void>}
 */
const tokenTransfer = async function (userPhone, password, from, to, tokenAddress, value, gasLimit, gasPrice) {
    const transferData = {
        from: from,
        to: to,
        value: value,
        gasLimit: gasLimit || 60000,
        gasPrice: gasPrice || '0.000000002',
        message: '空投',
        tokenAddress: tokenAddress,
        password: cryptoUtil.AES.encryptNoPadding(password, ConfigJSON.aes_cipher_key.password_cipher)
    };

    const result = await tokenService.tokenTransfer(userPhone, transferData);
    if (result.code != '0') {
        logger.error('tokenTransfer() failed==>result = %s; transferData=%s;', JSON.stringify(result), JSON.stringify(transferData));
    } else {
        logger.info('tokenTransfer() success==>', JSON.stringify(result));
    }
};

/**
 * 查询余额 （所有Token）
 * @param ethAddressList 地址数组
 * @returns {Promise<void>}
 */
const balanceStatisticsForAddressList = async function (ethAddressList) {
    const tokenList = await module.exports.tokenList();
    for (let address of ethAddressList) {
        logger.info('**********************************************search balance for ethAddress[%s] START***********************************************', address);
        let i = 0;
        for (let token of tokenList) {
            const balance = await tokenService.tokenBalance(token.address, address, token.decimalVal);
            logger.info('index:%d --> balance for token[%s:%s] ==>', i++, token.symbol, token.address, balance);
        }
        logger.info('**********************************************search balance for ethAddress[%s] END*************************************************', address);
    }
}

/**
 * 查询余额 （所有Token）
 * @param userPhoneList 手机号数组
 * @returns {Promise<void>}
 */
const balanceStatisticsByUserPhoneList = async function (userPhoneList) {
    const tokenList = await module.exports.tokenList();
    for (let userPhone of userPhoneList) {
        const walletList = await walletDao.findByUserPhone(userPhone);
        let address;
        for (let wallet of walletList) {
            address = wallet.ethAddress;
            logger.info('**********************************************search balance for ethAddress[%s] START***********************************************', address);
            let i = 0;
            for (let token of tokenList) {
                const balance = await tokenService.tokenBalance(token.address, address, token.decimalVal);
                logger.info('index:%d --> balance for token[%s:%s] ==>', i++, token.symbol, token.address, balance);
            }
            logger.info('**********************************************search balance for ethAddress[%s] END*************************************************', address);

        }
    }

}

/**
 * 批量空投token
 * @param addressList
 * @param value
 * @returns {Promise<void>}
 */
const batchAirdropHoney = async function (v3Json, password, tokenAddress, addressList, value, gasPrice, chainId) {
    let fromWallet = await ethersObj.Wallet.fromEncryptedWallet(v3Json, password);
    let utils = ethersObj.utils;
    let funcSign = utils.id('batchAirdrop(uint256,address[])').substring(0, 10);
    let data = funcSign;
    data += (await ethersObj.valueToHex64(value, false));
    data += "00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000062";
    for (let address of addressList) {
        let hexArray = utils.padZeros(address, 32);
        let itemAddress = utils.hexlify(hexArray).replace('0x', '');
        logger.info('address=%s ; after=%s', address, itemAddress);
        data += itemAddress;
    }
    logger.info("data=>", data);
    let transaction = {
        to: tokenAddress,
        data: data,
        gasPrice: gasPrice,
        nonce: await ethersObj.getNonceByAddress(fromWallet.address),
        value: utils.parseEther('0.0'),
        chainId: chainId
    };
    transaction.gasLimit = 3000000;//await ethersObj.provider.estimateGas(transaction);
    ethersObj.provider.sendTransaction(fromWallet.sign(transaction)).then(function (hash) {
        logger.info("transferToken hash : ", hash);
    })
};

/**
 * 批量空投token
 * @param addressList
 * @param value
 * @returns {Promise<void>}
 */
const batchAirdropHoneyDiff2 = async function (v3Json, password, tokenAddress, addressList, valueList, gasPrice, chainId) {
    let fromWallet = await ethersObj.Wallet.fromEncryptedWallet(v3Json, password);
    let utils = ethersObj.utils;
    if (valueList.length != addressList.length) {
        console.warn("batchAirdropToken() valueList.length != addressList.length");
        return;
    }
    let funcSign = utils.id('airdropDiff(uint256[],address[])').substring(0, 10);
    let data = funcSign;
    data += "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c";
    data += (await ethersObj.valueToHex64(valueList.length, false));
    for (let value of valueList) {
        let value64 = ethersObj.valueToHex64(value, false);
        data += value64;
    }
    for (let address of addressList) {
        let address64 = utils.hexlify(utils.padZeros(address, 32)).replace('0x', '');
        logger.info('address=%s ; after=%s', address, address64);
        data += address64;
    }
    logger.info("data=>", data);
    let transaction = {
        from: fromWallet.address,
        to: tokenAddress,
        data: data,
        gasPrice: gasPrice,
        nonce: await ethersObj.getNonceByAddress(fromWallet.address),
        value: utils.parseEther('0.0'),
        chainId: chainId
    };
    transaction.gasLimit = await ethersObj.provider.estimateGas(transaction);
    ethersObj.provider.sendTransaction(fromWallet.sign(transaction)).then(function (hash) {
        logger.info("transferToken hash : ", hash);
    })
};

/**
 * 批量空投token
 * @param addressList
 * @param value
 * @returns {Promise<void>}
 */
const batchAirdropHoneyDiff = async function (v3Json, password, tokenAddress, addressList, valueList, gasPrice, chainId) {
    let fromWallet = await ethersObj.Wallet.fromEncryptedWallet(v3Json, password);
    fromWallet.provider = ethersObj.provider;
    let utils = ethersObj.utils;
    if (valueList.length != addressList.length) {
        console.warn("batchAirdropToken() valueList.length != addressList.length");
        return;
    }
    let contract = await new ethersObj.Contract(CONFIG.honey.contractAddress, HoneyABI, fromWallet);
    let gasLimit = await contract.estimate.airdropDiff(valueList, addressList);
    let transaction = await contract.airdropDiff(valueList, addressList);
    transaction.gasLimit = gasLimit;
    // let transaction = {
    //     from: fromWallet.address,
    //     to: tokenAddress,
    //     data: data,
    //     gasPrice: gasPrice,
    //     nonce: await provider.getTransactionCount(fromWallet.address, "pending"),
    //     value: utils.parseEther('0.0'),
    //     chainId: chainId
    // };
    // transaction.gasLimit = CONFIG.eth.gasLimit;//await ethersObj.provider.estimateGas(transaction);

    // transaction.gasLimit = await contract.estimate.airdropDiff(valueList, addressList);
    return await ethersObj.provider.sendTransaction(fromWallet.sign(transaction));
};

module.exports = {
    tokenList: tokenList,
    faucetEther: faucetEther,
    airdropToken: airdropToken,
    airdropTokenToAddress: airdropTokenToAddress,
    airdropEth: airdropEth,
    batchAirdropHoney: batchAirdropHoney,
    batchAirdropHoneyDiff: batchAirdropHoneyDiff,
    balanceStatisticsByUserPhoneList: balanceStatisticsByUserPhoneList,
    balanceStatisticsForAddressList: balanceStatisticsForAddressList
};