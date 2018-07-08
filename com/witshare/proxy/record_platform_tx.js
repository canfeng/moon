const dbManager = require('./db-manager');
const Sequelize = require('sequelize');
const commonEnum = require('../common/common_enum');
const moment = require('moment');

const RecordPlatformTx = dbManager.define('record_platform_tx', {
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
    txHash: {
        field: 'tx_hash',
        type: Sequelize.STRING
    },
    txType: {
        field: 'tx_type',
        type: Sequelize.INTEGER.UNSIGNED
    },
    fromName: {
        field: 'from_name',
        type: Sequelize.STRING
    },
    fromAddress: {
        field: 'from_address',
        type: Sequelize.STRING
    },
    toName: {
        field: 'to_name',
        type: Sequelize.STRING
    },
    toAddress: {
        field: 'to_address',
        type: Sequelize.STRING
    },
    txTokenType: {
        field: 'tx_token_type',
        type: Sequelize.STRING
    },
    txAmount: {
        field: 'tx_amount',
        type: Sequelize.DECIMAL
    },
    ethFee: {
        field: 'eth_fee',
        type: Sequelize.DECIMAL
    },
    txStatus: {
        field: 'tx_status',
        type: Sequelize.INTEGER.UNSIGNED
    },
    txVerificationTime: {
        field: 'tx_verification_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('txVerificationTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    txTime: {
        field: 'tx_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('txTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
});

module.exports = {
    MODEL: RecordPlatformTx,

    pageByTxStatus: async (txStatusArr, pageIndex, pageSize) => {
        let options = {
            where: {
                txStatus: {
                    [dbManager.Op.in]: txStatusArr,
                }
            },
            order: [['id', 'ASC']],
        };
        if (pageIndex && pageSize) {
            options.limit = pageSize;
            options.offset = (pageIndex - 1) * pageSize;
        }
        let res = await RecordPlatformTx.findAndCount(options);
        if (res) {
            for (let i = 0, l = res.rows.length; i < l; i++) {
                res.rows[i] = res.rows[i].get();
            }
        }
        return res;
    },

    updateTxStatusByPayTx: async record => {
        let updateItem = {
            updateTime: new Date()
        };
        if (record.txTokenType) {
            updateItem.txTokenType = record.txTokenType;
        }
        if (record.txStatus) {
            updateItem.txStatus = record.txStatus;
        }
        if (record.fromAddress) {
            updateItem.fromAddress = record.fromAddress;
        }
        if (record.toAddress) {
            updateItem.toAddress = record.toAddress;
        }
        if (record.txAmount) {
            updateItem.txAmount = record.txAmount;
        }
        if (record.ethFee) {
            updateItem.ethFee = record.ethFee;
        }
        if (record.txVerificationTime) {
            updateItem.txVerificationTime = record.txVerificationTime;
        }
        if (record.txTime) {
            updateItem.txTime = record.txTime;
        }
        return await RecordPlatformTx.update(updateItem, {
            where: {
                txHash: record.txHash
            }
        });
    },
};
