const dbManager = require('./db-manager');
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
    payTxId: {
        field: 'pay_tx_id',
        type: Sequelize.STRING
    },
    projectGid: {
        field: 'project_gid',
        type: Sequelize.STRING
    },
    projectToken: {
        field: 'project_token',
        type: Sequelize.STRING
    },
    priceRate: {
        field: 'price_rate',
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
    payTokenAmount: {
        field: 'pay_token_amount',
        type: Sequelize.DECIMAL
    },
    actualPayTokenAmount: {
        field: 'actual_pay_token_amount',
        type: Sequelize.DECIMAL
    },
    txUserCount: {
        field: 'tx_user_count',
        type: Sequelize.INTEGER
    },
    actualTxUserCount: {
        field: 'actual_tx_user_count',
        type: Sequelize.INTEGER
    },
    txAddressCount: {
        field: 'tx_address_count',
        type: Sequelize.INTEGER
    },
    actualTxAddressCount: {
        field: 'actual_tx_address_count',
        type: Sequelize.INTEGER
    },
    currentDay: {
        field: 'current_day',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('currentDay')).format('YYYY-MM-DD')
        }
    },
});

module.exports = {
    MODEL:ProjectDailyInfo,
};
