const dbManager = require('../proxy/db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');

const ProjectDailyInfo = dbManager.define('project_daily_info', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    createTime: {
        field: 'create_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('createTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    updateTime: {
        field: 'update_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('updateTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    projectGid: {
        field: 'project_gid',
        type: Sequelize.STRING
    },
    projectToken: {
        field: 'project_token',
        type: Sequelize.STRING
    },
    price: {
        field: 'price',
        type: Sequelize.DECIMAL
    },
    getEthAmount: {
        field: 'get_eth_amount',
        type: Sequelize.DECIMAL
    },
    actualGetEthAmount: {
        field: 'actual_get_eth_amount',
        type: Sequelize.DECIMAL
    },
    distributeAmount: {
        field: 'distribute_amount',
        type: Sequelize.DECIMAL
    },
    actualDistributeAmount: {
        field: 'actual_distribute_amount',
        type: Sequelize.DECIMAL
    },
    txUserAmount: {
        field: 'tx_user_amount',
        type: Sequelize.DECIMAL
    },
    actualTxUserAmount: {
        field: 'actual_tx_user_amount',
        type: Sequelize.DECIMAL
    },
    currentDay: {
        field: 'current_day',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('currentDay')).format('YYYY-MM-DD')
        }
    },
});

module.exports = ProjectDailyInfo;
