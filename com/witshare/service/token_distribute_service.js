/**
 * Created by shizhiguo on 2018/6/18
 */
const honeyConfig = require('./honeyConfig');
const HoneyABI = require('./honey-abi.json');
const redisKeyManager = require('../com/witshare/common/redis_key_manager');
const redisUtil = require('../com/witshare/util/redis_util');
const STATUS = require('./status');
const logger = require('./logger').getLogger('batch_airdrop_honey');
const bigDecimal = require('js-big-decimal');

/*
## token分发流程
- A. 检查条件
1. 项目是否未完成，是否未达到硬顶
2.
*/
