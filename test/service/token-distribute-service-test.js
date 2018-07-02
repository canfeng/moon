const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const tokenDistributeService = require('../../com/witshare/service/token-distribute-service');
const log = require('../../com/witshare/logger').getLogger('token-distribute-service-test');
const SysProject = require('../../com/witshare/proxy/sys-project');
const SysUser = require('../../com/witshare/proxy/sys-user');
const SysUserAddress = require('../../com/witshare/proxy/sys-user-address');
const RecordUserTx = require('../../com/witshare/proxy/record-user-tx');
const commonUtil = require('../../com/witshare/util/common_util');
const redisKeyManager = require('../../com/witshare/common/redis_key_manager');
const redisUtil = require('../../com/witshare/util/redis_util');
const ethersObj = require('../../com/witshare/eth/ethers_obj');
const bigDecimal = require('js-big-decimal');

/************************** init *******************************/

// test_checkUserPayTxValidity()
// getRecordUserListByCondition();
// pollingPlatformTxStatus();
// initRecordUserTx();

// filterStatusArr();

tokenTransfer()

async function initSysUser() {
    let userGid = commonUtil.randomStr(32);
    await SysUser.MODEL.create({
        updateTime: new Date(),
        createTime: new Date(),
        userGid: userGid,
        email: 'shizhiguo@ibeesaas.com',
        nickname: 'shizhiguo',
        userStatus: 1
    });
    return userGid;
}

async function initSysUserAddress() {
    await SysUserAddress.MODEL.create({
        updateTime: new Date(),
        createTime: new Date(),
        userGid: '7z6862ceud71oj4whb1y40g94e7ranrb',
        email: 'shizhiguo@ibeesaas.com',
        projectGid: '1us48s9nz6i6t1t90j2dh6j6sjijrk29',
        projectToken: 'HONEY',
        payEthAddress: '0xa77B82EC4FFF0ab19F9F7672B20Ed5788FaA6647',
        getTokenAddress: '0x0fD170Ab8396b2802f8727523b46131Ec6159aA5'
    });
}

async function initSysProject() {
    SysProject.MODEL.create({
        updateTime: new Date(),
        createTime: new Date(),
        startTime: '2018-06-26',
        createTime: '2018-07-31',
        projectGid: commonUtil.randomStr(32),
        projectToken: 'HONEY',
        tokenAddress: '0xe39eb6a7f5dce8a957901bb04ad8556efd8e9ba1',
        platformAddress: '0x0000001866ec5247354053911e92c7f349201aa7',
        priceRate: 10000,
        softCap: 1000,
        hardCap: 2000,
        minPurchaseAmount: 1
    });
}

async function initRecordUserTx() {
    let arr = [{
        tx: '0xa7c418c4aa83616d923bc58f899f0f6a310c1d2cb52db91b17108588a9bef92e',
        amount: 0.7
    }, {
        tx: '0xca8b76a80fe7d75e5b417e560c25bd8c35ff1a5d6024300bb513bf2984314b44',
        amount: 0.4
    }];
    for (let i = 0; i < arr.length; i++) {
        RecordUserTx.MODEL.create({
            updateTime: new Date(),
            createTime: new Date(),
            userGid: '7z6862ceud71oj4whb1y40g94e7ranrb',
            userEmail: 'shizhiguo@ibeesaas.com',
            projectGid: '1us48s9nz6i6t1t90j2dh6j6sjijrk29',
            projectToken: 'HONEY',
            payCoinType: '0',
            payTx: arr[i].tx,
            payAmount: arr[i].amount,
            priceRate: 10000,
            hopeGetAmount: arr[i].amount * 10000
        });
    }
}


async function test_checkUserPayTxValidity() {
    tokenDistributeService.checkUserPayTxValidity();
}


async function filterStatusArr() {
    tokenDistributeService.filterStatusArr([1, 13, 5], []);
}


async function updatePlatformTxDataByCondition() {
    let updateRecord = {
        userGid: '111',
        platformTx: '123',
        platformTxStatus: 1
    };
    let res = await RecordUserTx.updatePlatformTxDataByCondition(updateRecord, {userTxStatusArr: [1, 2]});
    console.info(res)
}

async function getRecordUserListByCondition() {
    let res = await tokenDistributeService.getRecordUserListByCondition({
        projectGid: '1us48s9nz6i6t1t90j2dh6j6sjijrk29',
        userTxStatusArr: [21, 5]
    });
    console.info(res)
}

async function pollingPlatformTxStatus() {
    tokenDistributeService.pollingPlatformTxStatus();
}

async function generateUserAddress() {
    let wallet1 = await ethersObj.createWallet('ibeesaas');
    let wallet2 = await ethersObj.createWallet('ibeesaas');
    log.info(wallet1.wallet.address + ',' + wallet1.v3Json);
    log.info(wallet2.wallet.address + ',' + wallet2.v3Json);
}

async function tokenTransfer() {
    let tokenAddress = '0x68839597fcc76c7d428b7a4b4e4adbc314a7c45d';
    let targetAddress = '0x33ef21B904298Da59425a1309827066bBBF0a63A';
    let owner = {
        address: '0xa77B82EC4FFF0ab19F9F7672B20Ed5788FaA6647',
        keystore: '{"address":"a77b82ec4fff0ab19f9f7672b20ed5788faa6647","id":"d478909c-1621-48db-a59c-f42539f39bda","version":3,"Crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"444c8afd0809209e9c59d2b6e4779237"},"ciphertext":"04a44829fcba0bd8b81d82b1363974b53f18adf50f29289bfcd430fe5d0a3ae0","kdf":"scrypt","kdfparams":{"salt":"8a4f9476f5d9a58cb297d102cd43030a1446ef5dd4cf20fa84f46ec53b32c87d","n":131072,"dklen":32,"p":1,"r":8},"mac":"38801d6956c7b7e2968f84dd165ace9e241383c7988d2a2dca8ef2213292e528"}}',
        password: 'ibeesaas'
    }

    let wallet = await ethersObj.getWalletFromV3Json(owner.keystore, owner.password);
    let gasPrice = parseFloat(await ethersObj.provider.getGasPrice());
    let decimal = await ethersObj.getDecimals(tokenAddress);
    let value = bigDecimal.multiply(10000000, Math.pow(10, decimal));
    let nonce = await ethersObj.getNonceByAddress(owner.address);
    let txHash = await ethersObj.transferWithWallet(tokenAddress, wallet, targetAddress, value, 60000, gasPrice, nonce);
    log.info(txHash);
}