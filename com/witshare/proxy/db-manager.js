const Sequelize = require('sequelize');
const MysqlJSON = require(ConfigPath + 'mysql_conf.json')
const mysqlConf = MysqlJSON[MysqlJSON.run_env];
const logger = require('../logger').getLogger('sequelize_proxy');

const sequelize = new Sequelize(mysqlConf.database, mysqlConf.user, mysqlConf.password, {
    host: mysqlConf.host,
    port: mysqlConf.port,
    dialect: 'mysql',
    operatorsAliases: false,
    // logging: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        underscored: true,// 字段以下划线（_）来分割（默认是驼峰命名风格）
        freezeTableName: true,//固定表名
        timestamps: false//禁用时间戳createdAt/updatedAt
    },
    // isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ
    timezone: '+08:00', //东八时区
    logging: function (sql) {
        logger.info(sql);
    }
});

module.exports = sequelize;