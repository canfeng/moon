const redisPool = require('../redis');
const logger = require('../logger').getLogger('redis_util');

module.exports = {

    /**
     * 获取
     * @param key
     * @param filed
     * @returns {Promise<any>}
     */
    hget: function (key, field) {
        logger.info('hget data to redis==>key=%s ; field=%s', key, field);
        return new Promise(function (resolve, reject) {
            redisPool.hget(key, field, function (err, data) {
                if (err) {
                    logger.error("hget() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },
    /**
     * 获取set全部
     * @param key
     * @returns {Promise<any>}
     */
    hgetAll: function (key) {
        logger.info('hgetAll data to redis==>key=%s', key);
        return new Promise(function (resolve, reject) {
            redisPool.hgetall(key, function (err, data) {
                if (err) {
                    logger.error("hgetAll() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    /**
     * 设置
     * @param key
     * @param field
     * @param data
     */
    hset: function (key, field, data) {
        logger.info('hset data to redis==>key=%s ; field=%s', key, field);
        redisPool.hset(key, field, data, function (err) {
            if (err) {
                logger.error("hset() exception==>", err);
            }
        });
    },
    /**
     * 获取hash中key的数量
     * @param key
     * @param field
     * @param data
     */
    hlen: function (key) {
        logger.info('hlen key from redis==>key=%s', key);
        return new Promise(function (resolve, reject) {
            redisPool.send_command('hlen', [key], function (err, data) {
                if (err) {
                    logger.error("hlen() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    /**
     * 设置
     * @param key
     * @param obj
     * @param expire_seconds ttl in seconds
     */
    hsetAll: async function (key, obj, expire_seconds) {
        logger.info('hsetAll data to redis==>key=', key);
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
     * 获取
     * @param key
     * @returns {Promise<any>}
     */
    get: function (key) {
        logger.info('get data from redis==>key=', key);
        return new Promise(function (resolve, reject) {
            redisPool.get(key, function (err, data) {
                if (err) {
                    logger.error("get() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },
    /**
     * 设置
     * @param key
     * @param data
     * @param expire_seconds ttl in seconds
     */
    set: function (key, data, expire_seconds) {
        logger.info('set data to redis==>key=', key);
        redisPool.set(key, data, function (err) {
            if (err) {
                logger.error("set() exception==>", err);
            } else {
                if (expire_seconds) {
                    module.exports.expire(key, expire_seconds);
                }
            }
        });
    },
    /**
     * 设置过期时间
     * @param key
     * @param expire_seconds ttl in seconds
     */
    expire: function (key, expire_seconds) {
        logger.info('expire redis key==>key=%s ; seconds=%s', key, expire_seconds);
        redisPool.expire(key, expire_seconds, function (err) {
            if (err) {
                logger.error("expire() exception==>", err);
            }
        });
    },

    incr: function (key) {
        logger.info('incr redis key==>key=', key);
        return new Promise(function (resolve, reject) {
            redisPool.incr(key, function (err, data) {
                if (err) {
                    logger.error("incr() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    del: function (key) {
        logger.info('delete redis key==>key=', key);
        redisPool.del(key, function (err) {
            if (err) {
                logger.error("del() exception==>", err);
            }
        });
    },

    exists: function (key) {
        return new Promise(function (resolve, reject) {
            redisPool.send_command('exists', [key], function (err, data) {
                if (err) {
                    logger.error("exists() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },

    lpush: function (key, data) {
        logger.info('lpush redis key==>key=', key);
        return new Promise(function (resolve, reject) {
            redisPool.lpush(key, data, function (err) {
                if (err) {
                    logger.error("lpush() exception==>", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    publish: function (key, data) {
        logger.info('publish redis key==>key=', key);
        return new Promise(function (resolve, reject) {
            redisPool.send_command('publish', [key, data], function (err) {
                if (err) {
                    logger.error('publish() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    },

    sendCommand: function (command, args) {
        logger.info('sendCommand redis==>command=', command);
        return new Promise(function (resolve, reject) {
            redisPool.send_command(command, args, function (err) {
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
        logger.info('scan redis key==>pattern=', pattern);
        return new Promise(function (resolve, reject) {
            redisPool.send_command('scan', [cursor, 'count', count, 'match', pattern], function (err, data) {
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
        logger.info('zAdd redis key==>key=%s; member=%s; score=%s;', key, member, score);
        return new Promise(function (resolve, reject) {
            redisPool.send_command('zadd', [key, score, member], function (err, data) {
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
        logger.info('zRevRange redis key==>key=%s; start=%s; stop=%s ', key, start, stop);
        let args = [key, start, stop];
        if (withScores) {
            args.push('withScores');
        }
        return new Promise(function (resolve, reject) {
            redisPool.send_command('zrevrange', args, function (err, data) {
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
        logger.info('zScore redis key==>key=%s; member=%s', key, member);
        return new Promise(function (resolve, reject) {
            redisPool.send_command('zscore', [key, member], function (err, data) {
                if (err) {
                    logger.error('zScore() exception==>', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    }
};