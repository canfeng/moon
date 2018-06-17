var redisConf = require(ConfigPath + 'redis_conf.json')
var walletRedisPool = require('redis-connection-pool')('myRedisPool', redisConf);
module.exports = walletRedisPool;
