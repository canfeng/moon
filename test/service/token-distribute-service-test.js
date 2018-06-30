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

/************************** init *******************************/

test_checkUserPayTxValidity()
// getRecordUserListByCondition();
// pollingPlatformTxStatus();
// initRecordUserTx();

// filterStatusArr();

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
    },{
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
    let res= await RecordUserTx.updatePlatformTxDataByCondition(updateRecord, {userTxStatusArr: [1, 2]});
    console.info(res)
}

async function getRecordUserListByCondition() {
    let res =await tokenDistributeService.getRecordUserListByCondition({projectGid:'1us48s9nz6i6t1t90j2dh6j6sjijrk29',userTxStatusArr: [21,5]});
    console.info(res)
}

async function pollingPlatformTxStatus() {
    tokenDistributeService.pollingPlatformTxStatus();
}