const dbManager = require('./db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');
const CommonEnum = require('../common/common_enum');

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
    payTxId: {
        field: 'pay_tx_id',
        type: Sequelize.STRING
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
    shouldGetAmount: {
        field: 'should_get_amount',
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

const findSuccessPayUserRecordListByProjectGid = async function (projectGid) {
    let list = await dbManager.query("select user_gid userGid,count(1) count,sum(actual_pay_amount) totalPayAmount,sum(should_get_amount) totalShouldGetAmount from record_user_tx where user_tx_status in (?,?) and project_gid=? group by user_gid", {
        replacements: [CommonEnum.USER_TX_STATUS.CONFIRMED, CommonEnum.USER_TX_STATUS.AMOUNT_MISMATCH, projectGid],
        type: dbManager.QueryTypes.SELECT
    });
    return list;
};

const updateUserTxStatusByPayTx = async function (record) {
    let updateItem = {
        updateTime: new Date()
    };
    if (record.actualPayAmount) {
        updateItem.actualPayAmount = record.actualPayAmount;
    }
    if (record.userTxStatus) {
        updateItem.userTxStatus = record.userTxStatus;
    }
    if (record.shouldGetAmount) {
        updateItem.shouldGetAmount = record.shouldGetAmount;
    }
    return await RecordUserTx.update({
        userTxStatus: status,
        updateTime: new Date(),
    }, {
        where: {
            payTx: record.payTx
        }
    });
};


const updatePlatformTxDataByUserGid = async function (record) {
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
            userGid: record.userGid,
            userTxStatus: {
                [dbManager.Op.in]: [CommonEnum.USER_TX_STATUS.CONFIRMED, CommonEnum.USER_TX_STATUS.AMOUNT_MISMATCH]
            }
        }
    });
};

const updatePlatformTxStatusByPlatformTx = async function (record) {
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
            platformTx: record.platformTx,
        }
    });
};

module.exports = {
    MODEL: RecordUserTx,
    findByUserTxStatus: findByUserTxStatus,
    updateUserTxStatusByPayTx: updateUserTxStatusByPayTx,
    findSuccessPayUserRecordListByProjectGid: findSuccessPayUserRecordListByProjectGid,
    updatePlatformTxDataByUserGid: updatePlatformTxDataByUserGid,
    updatePlatformTxStatusByPlatformTx: updatePlatformTxStatusByPlatformTx
};
