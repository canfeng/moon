const dbManager = require('./db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');
const commonUtil = require('../util/common_util');

const SysProject = dbManager.define('sys_project', {
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
    tokenAddress: {
        field: 'token_address',
        type: Sequelize.STRING
    },
    tokenDecimal: {
        field: 'token_decimal',
        type: Sequelize.INTEGER
    },
    platformAddress: {
        field: 'platform_address',
        type: Sequelize.STRING
    },
    projectAddress: {
        field: 'project_address',
        type: Sequelize.STRING
    },
    softCap: {
        field: 'soft_cap',
        type: Sequelize.DECIMAL
    },
    hardCap: {
        field: 'hard_cap',
        type: Sequelize.DECIMAL
    },
    minPurchaseAmount: {
        field: 'min_purchase_amount',
        type: Sequelize.DECIMAL
    },
    maxPurchaseAmount: {
        field: 'max_purchase_amount',
        type: Sequelize.DECIMAL
    },
    startTime: {
        field: 'start_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('startTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    endTime: {
        field: 'end_time',
        type: Sequelize.DATE, get() {
            return moment(this.getDataValue('endTime')).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    priceRate: {
        field: 'price_rate',
        type: Sequelize.DECIMAL
    },
    projectStatus: {
        field: 'project_status',
        type: Sequelize.INTEGER
    },
    isAvailable: {
        field: 'is_available',
        type: Sequelize.INTEGER
    },
});


const findByProjectGid = async function (projectGid) {
    let one = await SysProject.findOne({
        where: {
            projectGid: projectGid
        }
    });
    return one ? one.get() : null;
};


module.exports = {
    MODEL: SysProject,
    findByProjectGid: findByProjectGid,
    findBySymbolAndProjectAddress: async function (symbol, projectAddress) {
        let one = await SysProject.findOne({
            where: {
                projectToken: symbol,
                projectAddress: projectAddress
            }
        });
        return one ? one.get() : null;
    },
    insert: async function (record, tx) {
        record.createTime = record.updateTime = Date.now();
        let res = await SysProject.create(record, {
            transaction: tx
        });
        return res ? res.get() : null;
    }
}
