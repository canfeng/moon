const dbManager = require('./db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');

const RecordUserTx = dbManager.define('record_user_tx', {
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
    userGid: {
        field: 'user_gid',
        type: Sequelize.STRING
    },
    userEmail: {
        field: 'user_email',
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
    userAddress: {
        field: 'user_address',
        type: Sequelize.STRING
    },
    payCoinType: {
        field: 'pay_coin_type',
        type: Sequelize.INTEGER
    },
    payTx: {
        field: 'pay_tx',
        type: Sequelize.STRING
    },
    payAmount: {
        field: 'pay_amount',
        type: Sequelize.DECIMAL
    },
    priceRate: {
        field: 'price_rate',
        type: Sequelize.DECIMAL
    },
    hopeGetAmount: {
        field: 'hope_get_amount',
        type: Sequelize.BIGINT
    },
    actualPayAmount: {
        field: 'actual_pay_amount',
        type: Sequelize.DECIMAL
    },
    actualGetAmount: {
        field: 'actual_get_amount',
        type: Sequelize.DECIMAL
    },
    userTxStatus: {
        field: 'user_tx_status',
        type: Sequelize.INTEGER
    },
    platformTx: {
        field: 'platform_tx',
        type: Sequelize.STRING
    },
    ethFee: {
        field: 'eth_fee',
        type: Sequelize.DECIMAL
    },
    platformTxStatus: {
        field: 'platform_tx_status',
        type: Sequelize.INTEGER
    },
    distributionTime: {
        field: 'distribution_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('distributionTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
});

const findByUserTxStatus = async function (status) {
    let list = await RecordUserTx.findAll({
        where: {
            userTxStatus: status
        }
    });
    if (list) {
        for (let i = 0, l = list.length; i < l; i++) {
            list[i] = list[i].get();
        }
    }
    return list;
};

const findByUserTxStatusAndProjectGid = async function (status, projectGid) {
    let list = await RecordUserTx.findAll({
        where: {
            userTxStatus: status,
            projectGid: projectGid
        }
    });
    if (list) {
        for (let i = 0, l = list.length; i < l; i++) {
            list[i] = list[i].get();
        }
    }
    return list;
};

const updateUserTxStatusByPayTx = async function (payTx, status) {
    return await RecordUserTx.update({
        userTxStatus: status,
        updateTime: new Date(),
    }, {
        where: {
            payTx: payTx
        }
    });
};

const updateRecordById = async function (record) {
    let updateItem = {
        updateTime: new Date()
    };
    if (record.actualGetAmount) {
        updateItem.actualGetAmount = record.actualGetAmount;
    }
    if (record.platformTx) {
        updateItem.platformTx = record.platformTx;
    }
    if (record.platformTxStatus) {
        updateItem.platformTxStatus = record.platformTxStatus;
    }
    if (record.ethFee) {
        updateItem.ethFee = record.ethFee;
    }
    if (record.distributionTime) {
        updateItem.distributionTime = record.distributionTime;
    }
    return await RecordUserTx.update(updateItem, {
        where: {
            id: record.id
        }
    });
};

module.exports = {
    MODEL: RecordUserTx,
    findByUserTxStatus: findByUserTxStatus,
    updateUserTxStatusByPayTx: updateUserTxStatusByPayTx,
    findByUserTxStatusAndProjectGid: findByUserTxStatusAndProjectGid,
    updateRecordById: updateRecordById
};
