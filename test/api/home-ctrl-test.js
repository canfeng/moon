/**
 * Created by shizhiguo on 2018/6/27
 */
const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const httpUtil = require('../../com/witshare/util/http_util');
const redisUtil = require('../../com/witshare/util/redis_util');
const redisKeyManager = require('../../com/witshare/common/redis_key_manager');
const FixedConfig = require('../../conf/fixed_config');
const log = require('../../com/witshare/logger').getLogger('home-ctrl-test');

let host = 'http://localhost:3000/moon';


saveKeyStore().then(testTokenDistribute);
// testTokenInfo();
// tokenDistributeProgress();
// testTokenDistribute()

async function testTokenDistribute() {
    let params = {
        password: FixedConfig.temp.airdroper.password,
        projectGid: '38b9ab6f15ca43e48870f8caeea016ac',
        userTxStatusArr: [],
        platformTxStatusArr: [0],
    };
    let headers;
    let res = await httpUtil.post(host + '/token/distribute', params, headers);
    log.info('res==>', res);
}

async function tokenDistributeProgress() {
    let params = {
        projectGid: '1us48s9nz6i6t1t90j2dh6j6sjijrk29',
        distributionBatchId: '20180630165848157'
    };
    let headers;
    let res = await httpUtil.get(host + '/token/distribute/progress', params, headers);
    log.info('res==>', res);
}

async function testTokenInfo() {
    let params;
    let headers;
    let res = await httpUtil.post(host + '/token/0xcf7c80c4f39465541c54c4acbaa02bf8649a29b9', params, headers);
    log.info('res==>', res);
}

async function saveKeyStore() {
    let owner = FixedConfig.temp.airdroper;
    let address = owner.address;
    let keystore = owner.keystore;
    let keyInfo = await redisKeyManager.getKeyPlatformProjectV3Json(address);
    redisUtil.set(keyInfo.key, keystore, 60 * 60);
}