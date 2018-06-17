var ethers = require("ethers");
const CONFIG = require('./config.json');
const Sequelize = require('sequelize');
const timeUtil = require('../com/witshare/util/time_util');
const httpUtil = require('../com/witshare/util/http_util');
const commonUtil = require('../com/witshare/util/common_util');
const STATUS = require('./status');
const moment = require('moment');

var Wallet = ethers.Wallet;
var nodeUrl = CONFIG.eth.nodeUrl;
var providers = ethers.providers;
let network = CONFIG.eth.network;
var provider = new providers.JsonRpcProvider(nodeUrl, network == "ropsten" ? providers.networks.ropsten : providers.networks.homestead);
//mysql client
const bariMysql = new Sequelize(CONFIG.mysql.bari.db, CONFIG.mysql.bari.user, CONFIG.mysql.bari.pwd, {
    host: CONFIG.mysql.bari.host,
    port: CONFIG.mysql.bari.port,
    dialect: 'mysql',
    operatorsAliases: false,
    // logging: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        underscored: true,// 字段以下划线（_）来分割（默认是驼峰命名风格）
        freezeTableName: true,//固定表名
        timestamps: false//禁用时间戳createdAt/updatedAt
    },
    // isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ
    timezone: '+08:00', //东八时区
    logging: function (sql) {
        console.info(sql);
    }
});
const turinMysql = new Sequelize(CONFIG.mysql.turin.db, CONFIG.mysql.turin.user, CONFIG.mysql.turin.pwd, {
    host: CONFIG.mysql.turin.host,
    port: CONFIG.mysql.turin.port,
    dialect: 'mysql',
    operatorsAliases: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        underscored: true,// 字段以下划线（_）来分割（默认是驼峰命名风格）
        freezeTableName: true,//固定表名
        timestamps: false//禁用时间戳createdAt/updatedAt
    },
    // isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ
    timezone: '+08:00', //东八时区
    logging: function (sql) {
        console.info(sql);
    }
});
//model
const UserPickupHoney = turinMysql.define('user_pickup_honey', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    phone: {
        type: Sequelize.STRING
    },
    name: {
        type: Sequelize.STRING
    },
    idCardNo: {
        type: Sequelize.STRING,
        field: 'id_card_no'
    },
    honeyCount: {
        type: Sequelize.STRING,
        field: 'honey_count'
    },
    ethAddress: {
        type: Sequelize.STRING,
        field: 'eth_address'
    },
    status: {
        type: Sequelize.INTEGER.UNSIGNED
    },
    txHash: {
        type: Sequelize.STRING,
        field: 'tx_hash'
    },
    userId: {
        type: Sequelize.STRING,
        field: 'user_id'
    },
    useEther: {
        type: Sequelize.STRING,
        field: 'use_ether'
    },
    ctime: {
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('ctime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    utime: {
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('utime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
});
const RecordTask = turinMysql.define('record_task', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    taskId: {
        type: Sequelize.INTEGER.UNSIGNED,
        field: 'task_id'
    },
    userId: {
        type: Sequelize.STRING,
        field: 'user_id'
    },
    awardBeenum: {
        type: Sequelize.INTEGER.UNSIGNED,
        field: 'award_beenum'
    },
    awardHoneynum: {
        type: Sequelize.DECIMAL,
        field: 'award_honeynum'
    },
    toUserId: {
        type: Sequelize.STRING,
        field: 'to_user_id'
    },
    ctime: {
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('ctime')).format('YYYY-MM-DD HH:mm:ss')
        }
    }, utime: {
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('utime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
});
const UserAssets = turinMysql.define('user_assets', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    honey: {
        type: Sequelize.DECIMAL
    },
    userId: {
        type: Sequelize.STRING,
        field: 'user_id'
    },
    beeCount: {
        type: Sequelize.INTEGER.UNSIGNED,
        field: 'bee_count'
    },
    ctime: {
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('ctime')).format('YYYY-MM-DD HH:mm:ss')
        }
    }, utime: {
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('utime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
});

var successPath = "/data/log/bari/scripts/common.log";
var errorPath = "/data/log/bari/scripts/error.log";
var contractAddress = CONFIG.honey.contractAddress;
var v3Json = CONFIG.owner.v3Json;
var password = CONFIG.owner.password;
global.gasLimit = CONFIG.eth.gasLimit;
var chainId = CONFIG.eth.chainId;

global.balance = 0;

global.decimal = CONFIG.honey.decimal;

var utils = ethers.utils;

var transferData = utils.id('transfer(address,uint256)').substring(0, 10);

var methodData = ethers.utils.id('balanceOf(address)').substring(0, 10);
global.blockNumber = 0;
global.wallet = null;

global.countIndex = 0;

// //     0x204fB782351f29a46C458348F1b1bEc4cB97308d
// var wallet1 = new Wallet("0x396d11fda23cd1a1ca71867f5012a937115f2546459a52fd02a2ecd904b4920c");
// // *********************************");
// // 0xf444739C156236eB9c50B82188Ae310d2938ABdf
// var wallet2 = new Wallet("0x7c884c5c69e08f574b135408da7b87834de590168b416a29bc29d3a215403470");
// // *********************************");
// // 0xcabaDCAEA8AE294b94c64A513EE2ef86178fB1Eb");
// var wallet3 = new Wallet("0xb36186704e85f329716b0e2f60952285d8a4b9ef65572d66c00aeabcac7fc60a");
// // *********************************");
// // 0x09bcEe6C3269133605E4E3caf4D206fAca3C8438");
// var wallet4 = new Wallet("0x70d566f64ff02e149a8ce445573ee9ce1a47238a9c26536dde2519ad1cc1a7cf");
// // *********************************");
// // 0xc45acdA382035Cc5eCed31CC7916b1F681491cB1");
// var wallet5 = new Wallet("0x7634850d7d16cfb3a9f476b349b9a206e8e73a7b17780e3f6aafb5879f09238d");
// // *********************************");
// // 0xe4EDff840c8F6fB345e5F613197d3690e68D0563");
// var wallet6 = new Wallet("0xc58d5994aacbc84fbe66b016517898e27de334234bba4480aacb603e64514e7d");

var v3Jsons = [
    "{\"address\":\"204fb782351f29a46c458348f1b1bec4cb97308d\",\"id\":\"12c36cfa-4be2-4e37-9680-1012813516ad\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"58089d6e3840376fdae815fd56646616\"},\"ciphertext\":\"de3f22b373ffd9b503fc3fed428d534a3148b7ef0e48c1f81110da967988f408\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"2c7965788a1ec9a0e70e4433ae96e6e96f94facf09ca522ef2d88460711cf13f\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"75185eae9b03a4a534be1bc586dfcabd317e1857ac5654fd34307271446f45ea\"}}\n",
    "{\"address\":\"f444739c156236eb9c50b82188ae310d2938abdf\",\"id\":\"adbdf7ae-8c09-4e44-aa68-7f2d2cfb2f74\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"b7ef3299cee28bb7b681a49e820f0234\"},\"ciphertext\":\"ad8c4073d6a95c6b80e80619cfefdce9a0aef48d866af4afa025780d8feeaaf8\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"fde84e9a5b1f6594b842566e7931285819611a48f9871e36049bc25fa33b18be\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"34b9c2d4a26a19774406472b1e033ac0bfce190344861d416a1ef593480c969e\"}}\n",
    "{\"address\":\"cabadcaea8ae294b94c64a513ee2ef86178fb1eb\",\"id\":\"8e338c5b-a6d4-452d-93a3-1208d8a8685e\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"265857da524ca7a1217cc87f7d646873\"},\"ciphertext\":\"5379379c8eaaca1c58526b310852c02b0075ff6aeed0d21510da1018e9ac331f\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"397ab33e5ba0ff65bee350c883216c5420ae0ac5190005164d3c8bc6df364624\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"5ed49bf56aeee656fcdcc971ffb90d8fd0c8ad9703480d5b97dc2c77e5045b5d\"}}\n",
    "{\"address\":\"09bcee6c3269133605e4e3caf4d206faca3c8438\",\"id\":\"22e2f3d4-b98c-4c73-b9d9-8c623348d0ae\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"a824791b32f8026776e832f856e66709\"},\"ciphertext\":\"71f6556cbcae8001d4d0542435bc50212bebff9fa7b47db62d3b60407df494c5\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"8a358ebf5b7067c8365db8f51bcd3ec649e8e7d3e60aa39d0e7ce847c14b89e0\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"1a66546faa1b21ddf3fa37275b6effd78bbf11e5194aab157473d1afc549d5f5\"}}\n",
    "{\"address\":\"c45acda382035cc5eced31cc7916b1f681491cb1\",\"id\":\"fe5d9f4b-8823-4d76-b317-0a0935c31fa1\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"b0f7fac052fb3238d7561b99abb859bd\"},\"ciphertext\":\"b9c02f54bd93566495e93cb2c03cc373f164ed9a38eb42688eb1534845048515\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"1741c3749608813314a056ae6a6fbf7e4603953714fb5067c707a78976260b35\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"6506994f6f16f03c1ec05013d6383e547a9cf19158dadf9777644955cb59c888\"}}\n",
    "{\"address\":\"e4edff840c8f6fb345e5f613197d3690e68d0563\",\"id\":\"bae38eef-ec4d-4cfc-9ea5-41b448465610\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"337df65a58e6e9f2e5a2bf12ff14adce\"},\"ciphertext\":\"41c712da56939786c05cc18e642ff060bf1ce9ff04a7351f50739811f9736aa7\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"0022489ffea8ba9ec62cd97d3d2d92e38265f69d882e7725457238134561df84\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"fb0a773ff3e06390e1609744e1dc14f9857a792af22a22ab139cb4fe12758633\"}}\n"
];

var passwords = [
    "ibeesaas",
    "ibeesaas",
    "ibeesaas",
    "ibeesaas",
    "ibeesaas",
    "ibeesaas"
];

global.wallets = [];//[wallet1,wallet2,wallet3,wallet4,wallet5,wallet6];
global.walletNonces = [];//[0,0,0,0,0,0];


global.gasPrice = CONFIG.eth.gasPrice;

async function initWallets() {
    for (var i = 0; i < v3Jsons.length; i++) {
        await Wallet.fromEncryptedWallet(v3Jsons[i], passwords[i]).then(async function (wallet) {
            wallet.provider = provider;
            await wallets.push(wallet);
            await walletNonces.push(0);
        });
    }
    for (var i = 0; i < wallets.length; i++) {
        walletNonces[i] = await provider.getTransactionCount(wallets[i].address, "pending");
        // walletNonces[i] += 1;
        console.info("walletNonces[" + i + "] >>> " + walletNonces[i]);
    }
}

function balanceOf(address, callbak) {
    var data = methodData + '000000000000000000000000' + address.replace("0x", "");
    // console.info("data:::" +data);
    var transaction = {
        to: contractAddress,
        data: data,
    }

    // provider.call(transaction).then(function (result) {
    providers.getDefaultProvider().call(transaction).then(function (result) {
        var val = utils.bigNumberify(result).toString();
        console.info("balanceOf address " + address + ":" + val);
        val = val / Math.pow(10, decimal);
        callbak(val);
    });
}

function decimalOf(callbak) {
    var data = utils.id("decimals()").substring(0, 10);
    var transaction = {
        to: contractAddress,
        data: data,
    };
    provider.call(transaction).then(function (result) {
        var val = utils.bigNumberify(result).toString();
        console.info("decimalOf value : " + val);
        callbak(val);
    });
}

// format:phone;address;value;
async function dealSendHoney(status, offset, pageSize) {
    return new Promise((resolve, reject) => {
        readSourceData(status, offset, pageSize, async function (item) {
            var name = item[0];
            var phone = item[1];
            var address = item[2];
            var idCardNo = item[3];
            var sourceId = item[4];
            await checkAddressAndValue(name, phone, address, idCardNo, sourceId, async function (value, userId) {
                countIndex++;
                if (value != 0 && userId != 0) {
                    var walletIndex = countIndex % wallets.length;
                    // wallet = wallets[walletIndex]; // walletNonces
                    await transferHoney(address, value, sourceId, userId, walletIndex);
                }
                resolve();
            });
        });
    });

};

async function dealWhiteListHoney(whiteList) {
    return new Promise((resolve, reject) => {
        readWhiteListData(whiteList, async function (item) {
            if (!item) {
                resolve();
                return;
            }
            var name = item[0];
            var phone = item[1];
            var address = item[2];
            var idCardNo = item[3];
            var sourceId = item[4];
            await checkAddressAndValue(name, phone, address, idCardNo, sourceId, async function (value, userId) {
                countIndex++;
                console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> " + countIndex);
                if (value != 0 && userId != 0) {
                    var walletIndex = countIndex % wallets.length;
                    // wallet = wallets[walletIndex]; // walletNonces
                    await transferHoney(address, value, sourceId, userId, walletIndex);
                }
                resolve();
            });
        });
    });

};

async function updateTransferByNonce(id, txHash, index, value, address) {
    console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>updateTransferByNonce:{id:%s, txHash:%s} start.>>>>>>>>>>>>>>>>" +
        ">>>>>>>>>>>>>>>>>>>>>", id, txHash);
    await provider.getTransaction(txHash).then(async function (tx) {
        console.info(txHash + " :: to be changed transaction >>> ", tx);
        if (tx) {
            var valueAcount = value * Math.pow(10, decimal);
            var data = transferData + "000000000000000000000000" + address.split('0x')[1] + valueToHex64(valueAcount);
            var transaction = {
                to: contractAddress,
                data: data,
                gasLimit: gasLimit,
                gasPrice: gasPrice,
                nonce: tx.nonce,
                value: utils.parseEther('0.0'),
                chainId: chainId
            };
            console.info("updateTransferByNonce transaction be changed as : ", transaction);
            try {
                await provider.sendTransaction(wallets[index].sign(transaction)).then(async function (hash) {
                    console.info("tx_hash_nonce : {tx_hash:%s, nonce:%s}.", hash, transaction.nonce);
                    console.info("updateTransferByNonce " + address + " transferToken " + value + " hash : " + hash);
                    await updateUserPickupHoneyById(id, 1, hash, value);
                }).catch(function (err) {
                    console.error("updateTransferByNonce transaction error : ", err);
                    return;
                });
            }
            catch (err) {
                console.error("updateTransferByNonce transaction error : ", err);
                return;
            }
            console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>end.>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        }
    });
}

async function transferHoney(address, value, sourceId, userId, index) {
    // wallets[walletIndex]; // walletNonces
    var valueAcount = value * Math.pow(10, decimal);
    var data = transferData + "000000000000000000000000" + address.split('0x')[1] + valueToHex64(valueAcount);
    var transaction = {
        to: contractAddress,
        data: data,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        nonce: walletNonces[index],
        value: utils.parseEther('0.0'),
        chainId: chainId
    };
    walletNonces[index]++;
    if (gasLimit == 0) {
        try {
            await wallets[index].estimateGas(transaction).then(async function (_gasLimit) {
                gasLimit = Math.ceil(_gasLimit * 1.2);
                transaction.gasLimit = gasLimit;
                console.info(transaction);
                await provider.sendTransaction(wallets[index].sign(transaction)).then(async function (hash) {
                    console.info(address + " transferToken " + value + " hash : " + hash);
                    console.info("tx_hash_nonce : {tx_hash:%s, nonce:%s}.", hash, transaction.nonce);
                    await updateUserPickupHoneyById(sourceId, 1, hash, value, userId);
                }).catch(function (err) {
                    console.error("transaction error : ", err);
                    return;
                });
            });
        }
        catch (err) {
            console.error("transaction error : ", err);
        }
    }
    else {
        console.info(transaction);
        try {
            await provider.sendTransaction(wallets[index].sign(transaction)).then(async function (hash) {
                console.info(address + " transferToken " + value + " hash : " + hash);
                console.info("tx_hash_nonce : {tx_hash:%s, nonce:%s}.", hash, transaction.nonce);
                await updateUserPickupHoneyById(sourceId, 1, hash, value, userId);
            }).catch(function (err) {
                console.error("transaction error : ", err);
                return;
            });
        }
        catch (err) {
            console.error("transaction error : ", err);
        }
    }
    console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>record end>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
}

async function transferHoneyOnly(address, value) {
    var valueAcount = value * Math.pow(10, decimal);
    var data = transferData + "000000000000000000000000" + address.split('0x')[1] + valueToHex64(valueAcount);
    if (nonce == 0) {
        nonce = await provider.getTransactionCount(wallet.address, "pending");
    }
    else {
        nonce++;
    }
    var transaction = {
        to: contractAddress,
        data: data,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        nonce: nonce,
        value: utils.parseEther('0.0'),
        chainId: chainId
    };
    if (gasLimit == 0) {
        await wallet.estimateGas(transaction).then(function (_gasLimit) {
            gasLimit = _gasLimit;
            transaction.gasLimit = gasLimit;
            console.info(transaction);
            provider.sendTransaction(wallet.sign(transaction)).then(function (hash) {
                console.info(address + " transferToken " + value + " hash : " + hash);
            }).catch(function (err) {
                console.error("transaction error : ", err);
                return;
            });
        });
    }
    else {
        console.info(transaction);
        await provider.sendTransaction(wallet.sign(transaction)).then(function (hash) {
            console.info(address + " transferToken " + value + " hash : " + hash);
        });
    }
}

/**
 * 更新honey资产
 * @param value
 * @param userId
 * @param tx
 * @returns {Promise<void>}
 */
async function updateUserAssetsHoney(value, userId, tx) {
    var sql = "update user_assets set honey=honey-?  where user_id=? and honey > ?";
    return new Promise(async function (resolve, reject) {
        await turinMysql.query(sql, {
            replacements: [value, userId, value],
            transaction: tx
        }).spread(function (results) {
            resolve(results && results.changedRows > 0);
        });
    })
}

function valueToHex64(number, startWith0x) {
    const bigNumber = utils.bigNumberify(number);
    // logger.info('hexValue==>',bigNumber);
    const hexArray = utils.padZeros(utils.arrayify(bigNumber), 32);
    // logger.info('hexArray==>',hexArray);
    const hexStr = utils.hexlify(hexArray); //"0000000000000000000000000000000000000000000031303030303030303030";//
    if (startWith0x) {
        return hexStr;
    }
    return hexStr.replace('0x', '');
};

async function getHashPhoneByPhone(phone) {
    try {
        return await httpUtil.get("https://api.sociallending.io/turin/user/getHashPhone?phone=" + phone);
    } catch (err) {
        console.info("getUserIdFromPhone error : " + phone + ", error:", err);
        return null;
    }
}

async function getUserHoney(userId, callbak) {
    var userSql = "select * from user_assets ua where user_id = '" + userId + "'";
    console.info("getUserHoney : " + userSql);
    turinMysql.query(userSql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(async function (slnRes) {
        if (slnRes.length > 0) {
            await callbak(slnRes[0].honey);
        }
    });
}

/**
 * 检查用户地址和资产
 * @param name
 * @param phone
 * @param address
 * @param sourceId
 * @returns {Promise<{honeyCount: number, userId: string, status: number}>}
 */
async function checkAddressAndValue(name, phone, address, sourceId) {
    let returnRes = {
        honeyCount: 0,
        userId: '',
        status: 0
    };

    // 手机号，钱包地址一致
    var sql = "select * from wallet where status=1 and user_phone=? and eth_address=?";
    let vals = await bariMysql.query(sql, {replacements: [phone, address], type: bariMysql.QueryTypes.SELECT});
    if (vals && vals.length > 0) {
        let hashPhone = await getHashPhoneByPhone(phone);
        if (hashPhone) {
            var userSql = `
                select ub.phone,ub.user_id,ua.honey,ub.idcard_name,ub.idcard_no from user_assets ua 
                INNER JOIN user_base ub 
                on ua.user_id = ub.user_id
                where ub.hash_phone = ?  
            `;
            let slnRes = await turinMysql.query(userSql, {
                replacements: [hashPhone],
                type: turinMysql.QueryTypes.SELECT
            });
            // （1）	蜂蜜持有量超过488滴（含488），即可申请进行蜂蜜提取；
            // （2）	提蜜过程中，平台将收取38滴蜂蜜作为Gas手续费；
            // （3）	实际提取蜂蜜量=持有蜂蜜量-100滴-38滴
            if (slnRes && slnRes.length > 0) {
                let userInfo = slnRes[0];
                returnRes.userId = userInfo.user_id;
                if (false) { //since 7th June, user needs not to certificate. (!userInfo.idcard_no || !userInfo.idcard_name || !name.endsWith(userInfo.idcard_name.substr(userInfo.idcard_name.length - 1))) {
                    returnRes.status = STATUS.QUALIFY_VALIDATE_FAIL_NO_AUTH; //13
                } else {
                    if (userInfo.honey >= CONFIG.honey.extractLimitMinHoneyCount) {
                        var value = userInfo.honey - CONFIG.honey.remainHoneyCount - CONFIG.honey.gasHoneyCount;
                        returnRes.honeyCount = value.toFixed(2);
                        returnRes.status = STATUS.QUALIFY_VALIDATE_SUCCESS; //1
                    } else {
                        returnRes.status = STATUS.QUALIFY_VALIDATE_FAIL_HONEY_INSUFFICIENT; //14
                    }
                }
            } else {
                returnRes.status = STATUS.QUALIFY_VALIDATE_FAIL_USER_NOT_FOUND; //12
            }
        }
    } else {
        returnRes.status = STATUS.QUALIFY_VALIDATE_FAIL_PHONE_ADDRESS_MISMATCH; //11
    }
    return returnRes;

    /*await bariMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(async function (vals) {
        if (vals && vals.length > 0) {
            // phone hash
            await getHashPhoneByPhone(phone, async function (_phone) {
                // /!*and idcard_name='" + name + "' and ub.idcard_no='" + idCardNo + "'*!/
                var userSql = "select * from user_assets ua where exists (" +
                    "select id from user_base ub where ub.user_id=ua.user_id  and ub.hash_phone='" + _phone + "'" +
                    ")";
                await turinMysql.query(userSql, {
                    replacements: [],
                    type: turinMysql.QueryTypes.SELECT
                }).then(async function (slnRes) {
                    // （1）	蜂蜜持有量超过488滴（含488），即可申请进行蜂蜜提取；
                    // （2）	提蜜过程中，平台将收取38滴蜂蜜作为Gas手续费；
                    // （3）	实际提取蜂蜜量=持有蜂蜜量-100滴-38滴
                    if (slnRes && slnRes.length > 0 && slnRes[0].honey >= CONFIG.honey.extractLimitMinHoneyCount) {
                        var value = slnRes[0].honey - CONFIG.honey.remainHoneyCount - CONFIG.honey.gasHoneyCount;
                        value = value.toFixed(2);
                        if (fn) {
                            await fn(value, slnRes[0].user_id);
                        }
                    }
                    else {
                        console.info("(" + phone + " " + address + ") : honey count insufficient .");
                        await updateUserPickupHoneyById(sourceId, 6, null, null, slnRes[0] ? slnRes[0].user_id : null);
                        fn(0, 0);
                    }
                });
            });
        }
        else {
            console.info("(" + phone + " " + address + ") : should legal.");
            await updateUserPickupHoneyById(sourceId, 6, null, null); // unusual
            fn(0, 0);
        }
    });*/
}

async function readWhiteListData(whiteList, callbak) {
    var sql = "select * from user_pickup_honey where status='0' and phone in ('" + whiteList + "')";
    await turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(async function (res) {
        var index = 0;
        console.info(res);
        if (res && res.length > 0) {
            for (; index < res.length; index++) {
                console.info("==========================================deal with record : {id:%s,type:whiteList}========================================== ", res[index].id);
                var item = [];
                item.push(res[index].name);
                item.push(res[index].phone);
                item.push(res[index].eth_address);
                item.push(res[index].id_card_no);
                item.push(res[index].id);
                await callbak(item);
            }
        }
        else {
            await callbak(null);
        }
    });
}

// read db data
// status : 0：未提取；1：提取中；2：提取成功；3：提取失败（最终状态）；4：验证成功（提取成功才需要验证，最终状态）；
async function readSourceData(status, offset, pageSize, callbak) {
    console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>record start>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    var sql = "select * from user_pickup_honey where status='" + status + "' order by id limit " + offset + "," + pageSize;
    await turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(async function (res) {
        /*if ((status == 0 || status == 3)) {
            console.info("sender ether should > 0!!!")
            return ;
        }*/
        var index = 0;
        if (res && res.length > 0) {
            for (; index < res.length; index++) {
                console.info("==========================================deal with record : {id:%s,status:%s}========================================== ", res[index].id, status);
                if (status == 0 || status == 3) {
                    var item = [];
                    item.push(res[index].name);
                    item.push(res[index].phone);
                    item.push(res[index].eth_address);
                    item.push(res[index].id_card_no);
                    item.push(res[index].id);
                    await callbak(item);
                }
                else if (status == 1 || status == 2) {
                    var item = {
                        id: res[index].id,
                        txhash: res[index].tx_hash,
                        value: res[index].honey_count,
                        address: res[index].eth_address,
                        phone: res[index].phone,
                        userId: res[index].user_id
                    }
                    await callbak(item);
                }
            }
            /*if (status !=0 && index == size) {
                readSourceData(status, callbak);
            }*/
        }
    });
}

async function readTxSourceData(status, offset, pageSize, callbak) {
    console.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>record start>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    var sql = "select * from user_pickup_honey where status='" + status + "' and tx_hash!='' order by id limit " + offset + "," + pageSize;
    await turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(async function (res) {
        /*if (err) {
            console.error("readSourceData : ", err);
            console.info(JSON.stringify(err));
            return ;
        }*/
        var size = res.length;
        var index = 0;
        if (size > 0) {
            for (; index < size; index++) {
                console.info("+++++++++++++++++++++++++++++++++++++deal with record : {id:%s,status:%s}+++++++++++++++++++++++++++++++++++++", res[index].id, status);
                if (status == 0 || status == 3) {
                    var item = [];
                    item.push(res[index].name);
                    item.push(res[index].phone);
                    item.push(res[index].eth_address);
                    item.push(res[index].id_card_no);
                    item.push(res[index].id);
                    await callbak(item);
                }
                else if (status == 1 || status == 2) {
                    var item = {
                        id: res[index].id,
                        txhash: res[index].tx_hash,
                        value: res[index].honey_count,
                        address: res[index].eth_address,
                        phone: res[index].phone,
                        userId: res[index].user_id
                    }
                    await callbak(item);
                }
            }
            /*if (status !=0 && index == size) {
                readSourceData(status, callbak);
            }*/
        }
    });
}

function readCheckData(offset, pageSize, callbak) { // index, pageSize,
    var sql = "select * from user_pickup_honey where (status='1' or status='0') and tx_hash='' limit " + offset + "," + pageSize;
    turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(function (res) {
        var size = res.length;
        var index = 0;
        if (size > 0) {
            for (; index < size; index++) {
                console.info("==========================================deal readCheckData record : {id:%s,status:%s}==========================================", res[index].id, res[index].status);
                var item = {
                    name: res[index].name,
                    id: res[index].id,
                    phone: res[index].phone,
                    address: res[index].eth_address,
                    id_card_no: res[index].id_card_no
                };
                callbak(item);
            }
        }
    });
}

function readSourceCount(status, rollBack) {
    var sql = "select count(0) as count from user_pickup_honey where status='" + status + "'";
    if (status == 3) {
        sql += " and honey_count > 0";
    }
    // dbManager.query(sql, {replacements: [walletAddress, userPhone], type: dbManager.QueryTypes.SELECT});
    turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(function (res) {
        if (res.length > 0) {
            var count = res[0].count;
            console.info("status " + status + " count : " + count);
            rollBack(count);
        }
    });
}

function readCheckCount(callBack) {
    var sql = "select count(0) as count from user_pickup_honey where tx_hash='' and (status='0' or status='1')";
    turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(function (res) {
        if (res.length > 0) {
            var count = res[0].count;
            console.info("sreadCheckCount count : " + count);
            callBack(count);
        }
    });
}

function readTxSourceCount(status, callBack) {
    var sql = "select count(0) as count from user_pickup_honey where status='" + status + "' and tx_hash!=''";
    if (status == 3) {
        sql += " and honey_count > 0";
    }
    // dbManager.query(sql, {replacements: [walletAddress, userPhone], type: dbManager.QueryTypes.SELECT});
    turinMysql.query(sql, {replacements: [], type: turinMysql.QueryTypes.SELECT}).then(function (res) {
        if (res.length > 0) {
            var count = res[0].count;
            console.info("status " + status + " count : " + count);
            callBack(count);
        }
    });
}

/**
 *
 * @param id
 * @param status
 * @param txhash
 * @param value
 * @param userId
 * @param beforeStatus
 * @param etherUsed
 * @param fn
 * @returns {Promise<this>}
 */
async function updateUserPickupHoneyById(id, status, txhash, honeyCount, userId, beforeStatus, etherUsed, fn) {
    let item = {
        utime: new Date()
    };
    if (commonUtil.isNumber(status)) {
        item.status = status;
    }
    if (txhash) {
        item.txHash = txhash;
    }
    if (honeyCount) {
        item.honeyCount = honeyCount;
    }
    if (userId) {
        item.userId = userId;
    }
    if (etherUsed) {
        item.useEther = etherUsed;
    }
    let where = {
        id: id,
    };
    if (commonUtil.isNumber(beforeStatus)) {
        where.status = beforeStatus;
    }
    let res = await UserPickupHoney.update(item, {
        where: where
    });
    if (res <= 0) {
        console.error("updateUserPickupHoneyById error ==> id=%s; txhash=%s ", id, txhash);
    }

    /* var sql = "update user_pickup_honey set status='" + status + "'";
     var dateTime = new Date();
     sql += ", utime=now()";
     if (txhash) {
         sql += ", tx_hash='" + txhash + "'";
     }
     if (value) {
         sql += ", honey_count='" + value + "'";
     }
     if (userId) {
         sql += ", user_id='" + userId + "'";
     }
     if (etherUsed) {
         sql += ", use_ether='" + etherUsed + "'"
     }
     sql += " where id='" + id + "'";
     if (beforeStatus) {
         sql += " and status = '" + beforeStatus + "'";
     }
     await turinMysql.query(sql).spread(async function (res, metadata) {
         if (!res || res.changedRows <= 0) {
             console.error("updateUserPickupHoneyById error : ", sql);
             if (txhash) {
                 console.error("updateUserPickupHoneyById error txhash: ", txhash);
             }
         }
         if (res && res.changedRows > 0) {
             if (fn) {
                 await fn();
             }
         }
     });*/
}

async function insertTask(userid, honeyCount, tx) {
    let time = timeUtil.currentTimeStamp();
    let task = {
        ctime: time,
        utime: time,
        userId: userid,
        taskId: 10,
        awardHoneynum: `-` + honeyCount,
        awardBeenum: 0
    };
    const one = await RecordTask.create(task, {
        transaction: tx
    });
    return one ? one.get() : null;
}

function logError(data) {
    fs.writeFile(errorFd, data + "\n");
}

function logSuccess(data) {
    fs.writeFileSync(successFd, data + "\n");
}

function flushLogs() {
    fs.closeSync(errorFd);
    fs.closeSync(successFd);
}


async function updateStatusByTxHash(txHash, status) {
    let res = await UserPickupHoney.update({
        utime: new Date(),
        status: status
    }, {
        where: {
            txHash: txHash
        }
    });
    if (res <= 0) {
        console.error("updateStatusByTxHash error ==> txhash=%s; status=%s", txHash, status);
    }
}

async function updateTxHashByTxHash(beforeTxHash, currentTxHash) {
    let res = await UserPickupHoney.update({
        utime: new Date(),
        txHash: currentTxHash
    }, {
        where: {
            txHash: beforeTxHash
        }
    });
    if (res <= 0) {
        console.error("updateTxHashByTxHash error ==> beforeTxHash=%s;currentTxHash=%s", beforeTxHash, currentTxHash);
    }
}

module.exports = {
    ethers: ethers,
    Wallet: Wallet,
    nodeUrl: nodeUrl,
    providers: providers,
    provider: provider,
    bariMysql: bariMysql,
    turinMysql: turinMysql,
    successPath: successPath,
    errorPath: errorPath,
    contractAddress: contractAddress,
    v3Json: v3Json,
    password: password,
    gasLimit: gasLimit,
    gasPrice: gasPrice,
    chainId: chainId,
    balanceOf: balanceOf,
    decimalOf: decimalOf,
    dealSendHoney: dealSendHoney,
    transferHoney: transferHoney,
    updateUserAssetsHoney: updateUserAssetsHoney,
    valueToHex64: valueToHex64,
    getUserIdFromPhone: getHashPhoneByPhone,
    getUserHoney: getUserHoney,
    checkAddressAndValue: checkAddressAndValue,
    readSourceData: readSourceData,
    readSourceCount: readSourceCount,
    updateUserPickupHoneyById: updateUserPickupHoneyById,
    logError: logError,
    logSuccess: logSuccess,
    flushLogs: flushLogs,
    utils: utils,
    insertTask: insertTask,
    balance: balance,
    decimal: decimal,
    transferData: transferData,
    methodData: methodData,
    blockNumber: blockNumber,
    wallet: wallet,
    readCheckData: readCheckData,
    readTxSourceData: readTxSourceData,
    readTxSourceCount: readTxSourceCount,
    transferHoneyOnly: transferHoneyOnly,
    initWallets: initWallets,
    readCheckCount: readCheckCount,
    dealWhiteListHoney: dealWhiteListHoney,
    updateTransferByNonce: updateTransferByNonce,
    updateStatusByTxHash: updateStatusByTxHash,
    UserPickupHoney: UserPickupHoney,
    RecordTask: RecordTask,
    updateTxHashByTxHash: updateTxHashByTxHash
}