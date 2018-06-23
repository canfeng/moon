global.ConfigPath = process.cwd() + '/../../conf/';
const tokenDistributeService = require('../../com/witshare/service/token-distribute-service');
const log = require('../../com/witshare/logger').getLogger('token-distribute-service-test');
const SysProject = require('../../com/witshare/proxy/sys-project');
const RecordUserTx = require('../../com/witshare/proxy/record-user-tx');
const commonUtil = require('../../com/witshare/util/common_util');
const redisKeyManager = require('../../com/witshare/common/redis_key_manager');
const redisUtil = require('../../com/witshare/util/redis_util');

/************************** init *******************************/
initKeyStore();
initSysProject();
initRecordUserTx();


async function initSysProject() {
    SysProject.MODEL.create({
        updateTime:new Date(),
        createTime:new Date(),
        projectGid:commonUtil.randomStr(32),
        projectToken:'MOON',
        tokenAddress:'',
    });
}

async function initRecordUserTx() {
    for (let i = 0; i < 10; i++) {
        RecordUserTx.MODEL.create({
            updateTime:new Date(),
            createTime:new Date(),
        });
    }
}

async function initKeyStore() {
    let address='0xa77b82ec4fff0ab19f9f7672b20ed5788faa6647';
    let keystore='{"address":"a77b82ec4fff0ab19f9f7672b20ed5788faa6647","id":"d478909c-1621-48db-a59c-f42539f39bda","version":3,"Crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"444c8afd0809209e9c59d2b6e4779237"},"ciphertext":"04a44829fcba0bd8b81d82b1363974b53f18adf50f29289bfcd430fe5d0a3ae0","kdf":"scrypt","kdfparams":{"salt":"8a4f9476f5d9a58cb297d102cd43030a1446ef5dd4cf20fa84f46ec53b32c87d","n":131072,"dklen":32,"p":1,"r":8},"mac":"38801d6956c7b7e2968f84dd165ace9e241383c7988d2a2dca8ef2213292e528"}}';
    let keyInfo = await redisKeyManager.getKeyPlatformProjectV3Json(address);
    redisUtil.set(keyInfo.key,keystore,60 * 60);
}