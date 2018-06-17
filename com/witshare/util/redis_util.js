const Redis = require('ioredis');
const logger = require('../logger').getLogger('redis_util');
const redisConf = require(ConfigPath + 'redis_conf.json');
let redisClient;
if (redisConf.cluster_enable) {
    redisClient = new Redis.Cluster(redisConf.cluster, redisConf.options);
    logger.info('==>redis init use cluster config');
} else {
    redisClient = new Redis(redisConf.default_options);
    logger.info('==>redis init use default config');
}

module.exports = {
    redis: redisClient,
    /**
     * 获取
     * @param key
     * @param filed
     * @returns {Promise<any>}
     */
    hget: async function (key, field) {
        logger.info('hget data to redisClient==>key=%s ; field=%s', key, field);
        return redisClient.hget(key, field);
    },

    /**
     * 获取set全部
     * @param key
     * @returns {Promise<any>}
     */
    hgetAll: async function (key) {
        logger.info('hgetAll data to redis==>key=%s', key);
        return redisClient.hgetall(key);
    },

    /**
     * 设置
     * @param key
     * @param field
     * @param data
     */
    hset: function (key, field, data) {
        logger.info('hset data to redisClient==>key=%s ; field=%s', key, field);
        redisClient.hset(key, field, data, function (err) {
            if (err) {
                logger.error("hset() exception==>", err);
            }
        });
    },
    /**
     * 设置
     * @param key
     * @param obj
     * @param expire_seconds ttl in seconds
     */
    hsetAll: async function (key, obj, expire_seconds) {
        logger.info('hsetAll data to redisClient==>key=', key);
        const arr = [];
        for (let field in obj) {
            arr.push(
                (async () => {
                    module.exports.hset(key, field, obj[field])
                })()
            );
        }
        await Promise.all(arr);
        if (expire_seconds) {
            module.exports.expire(key, expire_seconds);
        }
    },

    /**
     * 获取hash中key的数量
     * @param key
     * @param field
     * @param data
     */
    hlen: async function (key) {
        logger.info('hlen key from redisClient==>key=%s', key);
        return redisClient.hlen(key);
    },

    /**
     * 获取
     * @param key
     * @returns {Promise<any>}
     */
    get: async function (key) {
        logger.info('get data from redisClient==>key=', key);
        return redisClient.get(key);
    },
    /**
     * 设置
     * @param key
     * @param data
     * @param expire_seconds ttl in seconds
     */
    set: function (key, data, expire_seconds) {
        logger.info('set data to redisClient==>key=', key);
        redisClient.set(key, data, function (err) {
            if (err) {
                logger.error("set() exception==>", err);
            } else {
                if (expire_seconds) {
                    module.exports.expire(key, expire_seconds);
                }
            }
        });
    },
    sendCommand: function (command) {
        logger.info('sendCommand to redisClient==>command=', command);
        redisClient.sendCommand(command);
    },
    /**
     * 设置过期时间
     * @param key
     * @param expire_seconds ttl in seconds
     */
    expire: function (key, expire_seconds) {
        logger.info('expire redisClient key==>key=%s ; seconds=%s', key, expire_seconds);
        redisClient.expire(key, expire_seconds, function (err) {
            if (err) {
                logger.error("expire() exception==>", err);
            }
        });
    },

    incr: async function (key) {
        logger.info('incr redisClient key==>key=', key);
        return await redisClient.incr(key);
    },

    del: function (key) {
        logger.info('delete redisClient key==>key=', key);
        redisClient.del(key, function (err) {
            if (err) {
                logger.error("del() exception==>", err);
            }
        });
    },

    exists: async function (key) {
        return redisClient.exists(key);
    },

    lpush: function (key, data) {
        logger.info('lpush redisClient key==>key=', key);
        redisClient.lpush(key, data, function (err) {
            if (err) {
                logger.error("lpush() exception==>", err);
            }
        });
    },

    publish: function (key, data) {
        logger.info('publish redisClient key==>key=', key);
        redisClient.publish(key, data, function (err) {
            if (err) {
                logger.error('publish() exception==>', err);
            }
        })
    },
    sendCommand: function (command, args) {
        logger.info('sendCommand redisClient==>command=%s; args=%s', command, args);
        return new Promise(function (resolve, reject) {
            redisClient.send_command(command, args, function (err) {
                if (err) {
                    logger.error('sendCommand() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },
    scan: function (cursor, count, pattern) {
        logger.info('scan redisClient key==>pattern=', pattern);
        return new Promise(function (resolve, reject) {
            redisClient.send_command('scan', [cursor, 'count', count, 'match', pattern], function (err, data) {
                if (err) {
                    logger.error('scan() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },
    zAdd: function (key, member, score) {
        logger.info('zAdd redisClient key==>key=%s; member=%s; score=%s;', key, member, score);
        return new Promise(function (resolve, reject) {
            redisClient.send_command('zadd', [key, score, member], function (err, data) {
                if (err) {
                    logger.error('zAdd() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },
    zRevRange: function (key, start, stop, withScores) {
        logger.info('zRevRange redisClient key==>key=%s; start=%s; stop=%s ', key, start, stop);
        let args = [key, start, stop];
        if (withScores) {
            args.push('withScores');
        }
        return new Promise(function (resolve, reject) {
            redisClient.send_command('zrevrange', args, function (err, data) {
                if (err) {
                    logger.error('zRevRange() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },
    zScore: function (key, member) {
        logger.info('zScore redisClient key==>key=%s; member=%s', key, member);
        return new Promise(function (resolve, reject) {
            redisClient.send_command('zscore', [key, member], function (err, data) {
                if (err) {
                    logger.error('zScore() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },
};

