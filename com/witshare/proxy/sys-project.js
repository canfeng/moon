const dbManager = require('./db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');

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
    startPriceRate: {
        field: 'start_price_rate',
        type: Sequelize.DECIMAL
    },
    endPriceRate: {
        field: 'start_price_rate',
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
    findByProjectGid: findByProjectGid
}
