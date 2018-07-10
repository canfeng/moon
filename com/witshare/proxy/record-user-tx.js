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
    payCoinType: {
        field: 'pay_coin_type',
        type: Sequelize.INTEGER
    },
    /**
     * 用户认购时提交的支付eth数量
     */
    payAmount: {
        field: 'pay_amount',
        type: Sequelize.DECIMAL
    },
    /**
     * 用户当时认购时的eth：token价格比例
     */
    priceRate: {
        field: 'price_rate',
        type: Sequelize.DECIMAL
    },
    /**
     * 用户期望得到的token数量
     */
    hopeGetAmount: {
        field: 'hope_get_amount',
        type: Sequelize.BIGINT
    },
    /**
     * 用户交易hash
     */
    payTx: {
        field: 'pay_tx',
        type: Sequelize.STRING
    },
    /**
     * 用户交易的验证时间
     */
    txVerificationTime: {
        field: 'tx_verification_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('txVerificationTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    /**
     * 用户交易的打包时间
     */
    actualTxTime: {
        field: 'actual_tx_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('actualTxTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    /**
     * 用户交易实际发送地址
     */
    actualSendingAddress: {
        field: 'actual_sending_address',
        type: Sequelize.STRING
    },
    /**
     * 用户交易实际接收地址
     */
    actualReceivingAddress: {
        field: 'actual_receiving_address',
        type: Sequelize.STRING
    },
    /**
     * 用户实际支付eth数量
     */
    actualPayAmount: {
        field: 'actual_pay_amount',
        type: Sequelize.DECIMAL
    },
    /**
     * 用户应该得到的token数量
     */
    shouldGetAmount: {
        field: 'should_get_amount',
        type: Sequelize.BIGINT
    },
    /**
     * 用户交易状态
     */
    userTxStatus: {
        field: 'user_tx_status',
        type: Sequelize.INTEGER
    },
    /**
     * 用户实际得到的token数量
     */
    actualGetAmount: {
        field: 'actual_get_amount',
        type: Sequelize.DECIMAL
    },
    /**
     * 平台打币交易hash
     */
    platformTx: {
        field: 'platform_tx',
        type: Sequelize.STRING
    },
    /**
     * 平台打币交易消耗的gas费用
     */
    ethFee: {
        field: 'eth_fee',
        type: Sequelize.DECIMAL
    },
    /**
     * 平台打币交易状态
     */
    platformTxStatus: {
        field: 'platform_tx_status',
        type: Sequelize.INTEGER
    },
    /**
     * 平台打币交易确认时间
     */
    distributionTime: {
        field: 'distribution_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('distributionTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    /**
     * 打币批次id
     */
    distributionBatchId: {
        field: 'distribution_batch_id',
        type: Sequelize.STRING,
    },

});

const pageByUserTxStatus = async function (statusArr, pageIndex, pageSize) {
    let options = {
        where: {
            userTxStatus: {
                [dbManager.Op.in]: statusArr
            }
        },
        order: [['id', 'ASC']],
    };
    if (pageIndex && pageSize) {
        options.limit = pageSize;
        options.offset = (pageIndex - 1) * pageSize;
    }
    let res = await RecordUserTx.findAndCount(options);
    if (res) {
        for (let i = 0, l = res.rows.length; i < l; i++) {
            res.rows[i] = res.rows[i].get();
        }
    }
    return res;
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
    if (record.actualSendingAddress) {
        updateItem.actualSendingAddress = record.actualSendingAddress;
    }
    if (record.actualReceivingAddress) {
        updateItem.actualReceivingAddress = record.actualReceivingAddress;
    }
    if (record.txVerificationTime) {
        updateItem.txVerificationTime = record.txVerificationTime;
    }
    if (record.actualTxTime) {
        updateItem.actualTxTime = record.actualTxTime;
    }
    return await RecordUserTx.update(updateItem, {
        where: {
            payTx: record.payTx
        }
    });
};

const updatePlatformTxDataByCondition = async function (record, condition) {
    let updateItem = {
        updateTime: new Date(),
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
    let where = {
        userGid: record.userGid,
        distributionBatchId: record.distributionBatchId
    };
    if (condition) {
        if (condition.id) {
            where.id = condition.id;

        } else if (condition.platformTxStatusArr && condition.platformTxStatusArr.length > 0) {
            where.platformTxStatus = {
                [dbManager.Op.in]: condition.platformTxStatusArr
            }

        } else if (condition.userTxStatusArr && condition.userTxStatusArr.length > 0) {
            where.userTxStatus = {
                [dbManager.Op.in]: condition.userTxStatusArr
            }
        }
    }
    return await RecordUserTx.update(updateItem, {
        where: where
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
    pageByUserTxStatus: pageByUserTxStatus,
    updateUserTxStatusByPayTx: updateUserTxStatusByPayTx,
    updatePlatformTxDataByCondition: updatePlatformTxDataByCondition,
    updatePlatformTxStatusByPlatformTx: updatePlatformTxStatusByPlatformTx
};
