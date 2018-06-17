var ethers = require("ethers");
var configJson = require(ConfigPath + 'config.json');
var Wallet = ethers.Wallet;
var Contract = ethers.Contract;
var providers = ethers.providers;
var network = providers.networks.rinkeby;
var utils = ethers.utils;
var providerNetwork = configJson.eth.provider_network;
var chainId = configJson.eth.chain_id;
var walletExpire = configJson.eth.wallet_expire;
var etherscanApikey = configJson.eth.etherscan_apikey;
var ApiEtherScanUrl = configJson.eth.api_etherscan_url_prefix;

var transferData = utils.id('transfer(address,uint256)').substring(0, 10);
// classic,kovan,rinkeby,testnet,ropsten,morden,mainnet,homestead,unspecified
switch (providerNetwork) {
    case "classic":
        network = providers.networks.classic;
        break;
    case "kovan":
        network = providers.networks.kovan;
        break;
    case "rinkeby":
        network = providers.networks.rinkeby;
        break;
    case "testnet":
        network = providers.networks.testnet;
        break;
    case "ropsten":
        network = providers.networks.ropsten;
        break;
    case "morden":
        network = providers.networks.morden;
        break;
    case "mainnet":
        network = providers.networks.mainnet;
        break;
    case "homestead":
        network = providers.networks.homestead;
        break;
    case "unspecified":
        network = providers.networks.unspecified;
        break;
    case "kovan":
        network = providers.networks.kovan;
        break;
    default:
        network = "";
}
var provider = (!network || network == "") ? new providers.JsonRpcProvider(configJson.eth.provider_url) :
    new providers.JsonRpcProvider(configJson.eth.provider_url, network);
var readProvider = (!network || network == "") ? new providers.JsonRpcProvider(configJson.eth.provider_url) :
    new providers.JsonRpcProvider(configJson.eth.provider_url, network);
var walletCache = require("./wallet_cache.js");
var https = require("https");
var logger = require("../logger.js").getLogger('ethers_obj');
var erc20Abi = require('../../../conf/erc20_abi.json');
var redisTokenUtil = require('../eth/redis_token_util.js');

var ContractCache = require("memory-cache");

var getContractInstance = async function (contractAddress) {
    var contract = ContractCache.get(contractAddress);
    if (commonUtil.isNull(contract)) {
        contract = await new Contract(contractAddress, erc20Abi, provider);
        logger.debug("new contract : " + contract);
        ContractCache.put(contractAddress, contract);
    }
    return contract;
};
var getDecimals = async function (contractAddress) {
    if (contractAddress == "0x0") {
        return 18;
    }
    try {
        var data = utils.id('decimals()').substring(0, 10);
        data = await data + '000000000000000000000000' + contractAddress.split('0x')[1];
        var transaction = {
            to: contractAddress,
            data: data,
        }
        var val = await provider.call(transaction);
        val = utils.bigNumberify(val).toString();
        logger.debug(contractAddress + " decimals : ", val);
        return val;
    } catch (err) {
        logger.error('getDecimals()|error==>', err);
        return 0;
    }
};

var getSymbol = async function (contractAddress) {
    if (contractAddress == "0x0") {
        return "ETH";
    }
    if (!contractAddress) {
        logger.error('getSymbol()|error==>', err);
        return configJson.eth.default_token_symbol;
    }
    try {
        var data = utils.id('symbol()').substring(0, 10);
        data = await data + '000000000000000000000000' + contractAddress.split('0x')[1];
        var transaction = {
            to: contractAddress,
            data: data,
        }
        var val = await provider.call(transaction);
        val = utils.toUtf8String(val);
        if (!val) {
            return configJson.eth.default_token_symbol;
        }
        val = val.replace(/\0/g, '');
        val = val.match(/[0-9a-zA-Z\u4e00-\u9fa5]+/)[0];
        logger.debug(contractAddress + " getSymbol : ", val);
        if (val && val.length > 254) {
            val = val.substr(0, 254);
        }
        return val;
    } catch (err) {
        logger.error('getSymbol()|error==>', err);
        return configJson.eth.default_token_symbol;
    }
};

var getOwner = async function (contractAddress) {
    const contract = await getContractInstance(contractAddress);
    try {
        return await contract.owner();
    } catch (err) {
        logger.error('getOwner()|exception==>', err);
        return '';
    }
}

var getName = async function (contractAddress) {
    var contract = await getContractInstance(contractAddress);
    try {
        var val = await contract.name();
        logger.debug("getName : ", val);
        if (val && val.length > 254) {
            val = val.substr(0, 254);
        }
        return val;
    } catch (err) {
        logger.error('getName()|exception==>', err);
        return '';
    }
};

var getTotalSupply = async function (contractAddress) {
    var contract = getContractInstance(contractAddress);
    var val = await contract.totalSupply();
    return utils.bigNumberify(val).toString();
};

var commonUtil = require("./common_util.js");

var generateToken = async function (contractAddress, funcName) {
    logger.debug("contractAddress >>> ", contractAddress);
    var token = {};
    if (contractAddress == "0x0") {
        var usdCny = await redisTokenUtil.getTokenUsdCny(contractAddress);
        token.logo = "/imgs/token/0x0.png";
        token.name = "Ether";
        token.symbol = "";
        token.decimalVal = 18;
        token.priceUsd = usdCny.usdPrice;
        token.priceCny = usdCny.cnyPrice;
        token.address = contractAddress;
        token.transferGasUsed = await estimateTokenTransferGas(contractAddress);
        token.chainType = 0;
        token.type = 0;
        logger.info("generateToken : ", token);
        funcName(token);
    }
    else {
        token.name = await getName(contractAddress);
        token.symbol = await getSymbol(contractAddress);
        token.decimalVal = await getDecimals(contractAddress);
        token.transferGasUsed = await estimateTokenTransferGas(contractAddress);
        commonUtil.initTokenUsdPrice(contractAddress, function (obj) {
            token.priceUsd = obj.UsdPrice;
            token.priceCny = obj.CnyPrice;
            token.logo = obj.logo;
            token.address = contractAddress;
            token.chainType = 0;
            token.type = 2;
            logger.info("generateToken : ", token);
            funcName(token);
        });
    }
};

var getRealTotalSupply = async function (contractAddress) {
    var contract = getContractInstance(contractAddress);
    var total = await contract.totalSupply();
    total = utils.bigNumberify(total);
    var decimals = await contract.decimals();
    decimals = await (utils.bigNumberify(decimals.toString()));
    return total.div(decimals);
};

var getBalance = async function (contractAddress, address) {
    try {
        if (contractAddress == "0x0") {
            return await provider.getBalance(address);
        }
        else {
            var contract = await getContractInstance(contractAddress);
            var balance = await contract.balanceOf(address);
            return balance;
        }
    } catch (err) {
        logger.error('getBalance() error==>tokenAddress:[%s];walletAddress:[%s]', contractAddress, address, err);
        return 0;
    }
};

var createWallet = async function (password) {
    var wallet = Wallet.createRandom();
    var json = await wallet.encrypt(password, function (percent) {
    });
    return {wallet: wallet, json: json};
};

var importWallet = async function (json, oldPassword, newPassword) {
    var wallet = await Wallet.fromEncryptedWallet(json, oldPassword);
    if (commonUtil.isNull(wallet)) {
        return undefined;
    }
    var json = await wallet.encrypt(newPassword, function (percent) {
    });
    return {wallet: wallet, json: json};
};

/**
 * 估算token交易消耗的gas
 * @param tokenContractAddress
 * @returns {Promise<void>}
 */
var estimateTokenTransferGas = async function (tokenAddress) {
    if (tokenAddress == '0x0') {
        return configJson.eth.default_eth_transfer_gas_used;
    }
    let data = transferData;
    data = data + "000000000000000000000000be4d261fe5f1a24dd5ce238cbb0b5fa48aae879f0000000000000000000000000000000000000000000000000000000000000064";
    const owner = await getOwner(tokenAddress);

    if (owner) {
        try {
            const transaction = {
                from: owner,
                to: tokenAddress,
                data: data,
                value: ethers.utils.parseEther('0.0')
            };
            const gas = await provider.estimateGas(transaction);
            if (gas) {
                return utils.bigNumberify(gas).toString() * configJson.eth.transfer_gas_used_ratio;
            }
        } catch (err) {
            logger.error('estimateTokenTransferGas()|error==>', err);
        }
    }
    return configJson.eth.default_token_transfer_gas_used;
};
/**
 * 转账
 * @param contractAddress
 * @param phone
 * @param walletId
 * @param json
 * @param password
 * @param from
 * @param to
 * @param value
 * @param gasLimit
 * @param gasPrice
 * @param nonce
 * @param funcName
 * @returns {Promise<void>}
 */
var transaction = async function (contractAddress, phone, walletId, json, password, from, to, value, gasLimit, gasPrice, nonce, funcName) {
    var wallet = walletCache.getWalletByGenerateKey(from);
    if (commonUtil.isNull(wallet)) {
        wallet = await Wallet.fromEncryptedWallet(json, password);
        ethersObj.walletCache.putWallet(from, wallet, walletExpire);
    }
    if (!nonce) {
        nonce = await getNonceByAddress(wallet.address);
    }
    wallet.provider = provider;
    logger.info("transaction generate : {contractAddress:%s, phone:%s, walletId:%s, from:%s, to:%s, value:%s, " +
        "gasLimit:%s, gasPrice:%s, nonce:%s}", contractAddress, phone, walletId, from, to, value, gasLimit, gasPrice, nonce);
    if (contractAddress == '0x0') {
        transferEther(wallet, gasPrice, from, to, gasLimit, nonce, value, funcName);
    }
    else {
        transferToken(contractAddress, wallet, gasPrice, from, to, value, gasLimit, nonce, funcName);
    }

};

var transferToken = async function (contractAddress, wallet, gasPrice, from, to, value, gasLimit, nonce, funcName) {
    var data = transferData + "000000000000000000000000" + to.split('0x')[1] + valueToHex64(value);
    var transaction = {
        to: contractAddress,
        data: data,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        nonce: nonce,
        value: utils.parseEther('0.0'),
        chainId: chainId
    };
    provider.sendTransaction(wallet.sign(transaction)).then(function (hash) {
        logger.info("transferToken hash : ", hash);
        funcName(hash);
    }).catch(function (err) {
        logger.error("transferToken error transaction : ", JSON.stringify(transaction));
        logger.error("transferToken error detail : ", err);
        if (err) {
            var errorMsg;
            if (err.responseText) {
                const rpcRes = JSON.parse(err.responseText);
                if (rpcRes.error) {
                    errorMsg = rpcRes.error.message;
                }
            }
            funcName(undefined, errorMsg);
        }
        else {
            funcName(undefined);
        }
    });
};

var transferEther = async function (wallet, gasPrice, from, to, gasLimit, nonce, val, funcName) {
    // check to address format.
    var prefixSplitArray = /0x/.exec(to);
    var fieldAmountArray = /[0-9a-zA-Z]{42}/.exec(to);
    if (!prefixSplitArray && !fieldAmountArray) {
        funcName(undefined);
        return;
    }
    var transaction = {
        to: to,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
        nonce: nonce,
        value: parseFloat(val),
        chainId: chainId
    };
    var signedTransaction = wallet.sign(transaction);
    provider.sendTransaction(signedTransaction).then(function (hash) {
        funcName(hash);
    }).catch(function (err) {
        logger.error("transferToken error transaction : ", JSON.stringify(transaction));
        logger.error("transferToken error detail : ", err);
        if (err) {
            var errorMsg;
            if (err.responseText) {
                const rpcRes = JSON.parse(err.responseText);
                if (rpcRes.error) {
                    errorMsg = rpcRes.error.message;
                }
            }
            funcName(undefined, errorMsg);
        }
        else {
            funcName(undefined);
        }
    });
};

var listTxpage = function (pageIndex, pageSize, address, isRecursion, funcName) {
    var listUrl = ApiEtherScanUrl + "api?module=account&action=txlist&address=" +
        address + "&startblock=0&endblock=latest&page=" + pageIndex + "&" +
        "offset=" + pageSize + "&sort=asc&apikey=" + etherscanApikey;
    logger.debug("listTxpage url : ", listUrl);
    https.get(listUrl, (res) => {
        var datas = [];
        res.on('data', (d) => {
            datas.push(d);
        });
        res.on('end', function (err) {
            if (err) {
                logger.error("listTxpage error : %s", err);
            }
            var json;
            try {
                json = JSON.parse(datas.toString());
            } catch (err) {
                logger.error('listTxpage() error==>data parse json error==>', err);
                json = {};
            }
            logger.debug("listTxpage result : ", datas.toString());
            if (json.status === "1") {
                funcName(json.result);
                if (isRecursion) {
                    pageIndex = pageIndex + 1;
                    listTxpage(pageIndex, pageSize, address, isRecursion, funcName)
                }
            }
        });
    }).on('error', (e) => {
        logger.error("listTxpage error : ", e);
    });
};

var getNonceByAddress = async function (address) {
    return await provider.getTransactionCount(address, "pending");
};

var refreshTxStatus = function (transactionHash, funcName) {
    provider.waitForTransaction(transactionHash).then(function (transaction) {
        logger.info('refreshTxStatus Transaction Minded : {transaction:%s, hash:%s}l', JSON.stringify(transaction),
            transaction.hash);
        funcName(transaction);
    });
};

/**
 * 数值转为64进制的64位字符串
 * @param number
 * @returns {void|string|*}
 */
var valueToHex64 = function (number, startWith0x) {
    const bigNumber = utils.bigNumberify(number);
    // logger.info('hexValue==>',bigNumber);
    const hexArray = utils.padZeros(utils.arrayify(bigNumber), 32);
    // logger.info('hexArray==>',hexArray);
    const hexStr = utils.hexlify(hexArray);
    if (startWith0x) {
        return hexStr;
    }
    return hexStr.replace('0x', '');
};

function synTxForActualTime(transactions) {
    transactions.forEach(function (item) {

    });
}


const ethersObj = {
    ethers: ethers,
    Wallet: Wallet,
    providers: providers,
    network: network,
    utils: utils,
    provider: provider,
    readProvider: readProvider,
    walletCache: walletCache,
    getDecimals: getDecimals,
    getSymbol: getSymbol,
    getName: getName,
    getTotalSupply: getTotalSupply,
    generateToken: generateToken,
    getRealTotalSupply: getRealTotalSupply,
    getBalance: getBalance,
    createWallet: createWallet,
    importWallet: importWallet,
    transaction: transaction,
    listTxpage: listTxpage,
    getNonceByAddress: getNonceByAddress,
    refreshTxStatus: refreshTxStatus,
    estimateTokenTransferGas: estimateTokenTransferGas,
    valueToHex64: valueToHex64
};

module.exports = ethersObj;