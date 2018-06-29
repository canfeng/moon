/**
 * Created by shizhiguo on 2018/6/27
 */
const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const httpUtil = require('../../com/witshare/util/http_util');
const redisUtil = require('../../com/witshare/util/redis_util');
const redisKeyManager = require('../../com/witshare/common/redis_key_manager');
const log = require('../../com/witshare/logger').getLogger('home-ctrl-test');

let host = 'http://localhost:3000/moon';


// saveKeyStore();
// testTokenInfo();
testTokenDistribute();

async function testTokenDistribute() {
    let params = {
        password: 'ibeesaas',
        projectGid: '1us48s9nz6i6t1t90j2dh6j6sjijrk29',
        userTxStatusArr: [1, 13],
        platformTxStatusArr: [],
        payTxId: '',
    };
    let headers;
    let res = await httpUtil.post(host + '/token/distribute', params, headers);
    log.info('res==>', res);
}

async function testTokenInfo() {
    let params;
    let headers;
    let res = await httpUtil.post(host + '/token/0xcf7c80c4f39465541c54c4acbaa02bf8649a29b9', params, headers);
    log.info('res==>', res);
}


async function saveKeyStore() {
    let address = '0x7ca357f0abf3046627082cfda45ebee3e17b8791';
    let keystore = '{"address":"7ca357f0abf3046627082cfda45ebee3e17b8791","id":"b05e482c-7adc-4ee6-ae4e-bd7835481d8f","version":3,"Crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"8589437c12e8900398411bcb708183d5"},"ciphertext":"e3ee759a82a0df0283c40ee539fa46be05b65f13a47937d775bb6d74095525d6","kdf":"scrypt","kdfparams":{"salt":"d6855a5e58e9c7891c6f77e6d2f7f956946ac608d37f06e0e8c42b9a74e80585","n":131072,"dklen":32,"p":1,"r":8},"mac":"0d069f8aeb0e46447ea62483341fa72d114e92b0ccc9f9cb53045b4397c5037f"}}';
    let keyInfo = await redisKeyManager.getKeyPlatformProjectV3Json(address);
    redisUtil.set(keyInfo.key, keystore, 60 * 60);
}