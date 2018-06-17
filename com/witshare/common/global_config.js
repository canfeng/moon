/**
 * Created by shizhiguo on 2018/4/18
 */
const FixedConfigJSON = require('../../../conf/fixed_config.json');
const redisUtil = require('../util/redis_util');

/**
 * 根据key获取全局配置值
 * 默认从redis获取，如果redis取不到，从配置文件中取，然后在更新到redis
 * @returns {Promise<void>}
 */
const getValueByKey = async function (key) {
    let value = await redisUtil.hget(FixedConfigJSON.redis_key.global_config_key, key);
    if (value) {
        return value;
    }
    value = FixedConfigJSON.global_config[key];
    redisUtil.hset(FixedConfigJSON.redis_key.global_config_key, key, value);
    return value;
};

const getIntValueByKey = async function (key) {
    const value = await getValueByKey(key);
    return parseInt(value);
};

/**
 * 初始化，全局配置刷入redis缓存
 * @returns {Promise<void>}
 */
const initRefreshCache = async function () {
    redisUtil.hsetAll(FixedConfigJSON.redis_key.global_config_key, FixedConfigJSON.global_config);
};


module.exports = {
    initRefreshCache: initRefreshCache,
    getValueByKey: getValueByKey,
    getIntValueByKey: getIntValueByKey
}