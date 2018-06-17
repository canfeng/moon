/**
 * Created by shizhiguo on 2018/4/28
 */
global.ConfigPath = '/data/config/bari/';//for response_util
const ethers = require("ethers");
const Wallet = ethers.Wallet;
const commonEnum = require('./common_enum');
const commonUtil = require('../util/common_util');
const responseUtil = require('../util/response_util');
const RES_CODE = responseUtil.RES_CODE;

const createWallet = async function (password) {
    try {
        var wallet = Wallet.createRandom();
        var json = await wallet.encrypt(password, function (percent) {
        });
        return {wallet: wallet, json: json};
    } catch (err) {
        console.info('child_process[%s] - time:[%s] - wallet_deal_process.createWallet() error ==>', process.pid, new Date(), err);
        return undefined;
    }
};

const importKeystore = async function (json, oldPassword, newPassword) {
    try {
        var wallet = await Wallet.fromEncryptedWallet(json, oldPassword);
        if (!wallet) {
            return undefined;
        }
        var json = await wallet.encrypt(newPassword, function (percent) {
        });
        return {wallet: wallet, json: json};
    } catch (err) {
        console.info('child_process[%s] - time:[%s] - wallet_deal_process.importKeystore() error ==>', process.pid, new Date(), err);
        return undefined;
    }
};

const importPrivateKey = async function (privateKey, password) {
    try {
        let wallet = new Wallet(privateKey);
        let json = await wallet.encrypt(password);
        return {wallet: wallet, json: json};
    } catch (err) {
        console.info('child_process[%s] - time:[%s] - wallet_deal_process.importPrivateKey() error ==>', process.pid, new Date(), err);
        return undefined;
    }
};

process.on('message', async function (message) {
//接收主进程发送过来的消息
    if (message) {
        console.info('child_process[%s] - time:[%s] - wallet_deal_process - receive message==>operation=[%s]', process.pid, new Date(), message.operation);
        switch (message.operation) {
            case commonEnum.wallet_operation.CREATE_WALLET:
                createWallet(message.data.password).then(function (walletObj) {
                    let errCode = RES_CODE.SUCCESS;
                    if (!walletObj) {
                        errCode = RES_CODE.WALLET_CREATE_FAILED_ERROR;
                    }
                    process.send({data: walletObj, errCode: errCode});
                });
                break;
            case commonEnum.wallet_operation.IMPORT_KEYSTORE:
                importKeystore(message.data.v3Json, message.data.oldPassword, message.data.password).then(function (walletObj) {
                    let errCode = RES_CODE.SUCCESS;
                    if (!walletObj) {
                        errCode = RES_CODE.KEYSTORE_OR_PASSWORD_ERROR;
                    }
                    process.send({data: walletObj, errCode: errCode});
                });
                break;
            case commonEnum.wallet_operation.IMPORT_PRIVATE_KEY:
                importPrivateKey(message.data.privateKey, message.data.password).then(function (walletObj) {
                    let errCode = RES_CODE.SUCCESS;
                    if (!walletObj) {
                        errCode = RES_CODE.PRIVATE_KEY_ERROR;
                    }
                    process.send({data: walletObj, errCode: errCode});
                });
                break;
        }
    }
});
process.on('error', function (error) {
    console.error('child_process[%s] - time:[%s] - error==>', error);
    process.exit();
});

process.on('SIGHUP', function () {
    console.info('time:[%s] - wallet_deal_process - child_process killed==>', new Date());
    process.exit();//收到kill信息，进程退出
});
