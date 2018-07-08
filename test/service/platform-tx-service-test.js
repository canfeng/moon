global.ConfigPath = process.cwd().toString() + '/../../conf/';
const platformTxService = require('../../com/witshare/service/record-platform-tx-service');
const log = require('../../com/witshare/logger').getLogger('platform-tx-service-test');
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

platformTxService.getPlatformTxDetails();