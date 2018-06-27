const dbManager = require('./db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');

const SysUserAddress = dbManager.define('sys_user_address', {
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
    projectGid: {
        field: 'project_gid',
        type: Sequelize.STRING
    },
    email: {
        field: 'email',
        type: Sequelize.STRING
    },
    projectToken: {
        field: 'project_token',
        type: Sequelize.STRING
    },
    payEthAddress: {
        field: 'pay_eth_address',
        type: Sequelize.STRING
    },
    getTokenAddress: {
        field: 'get_token_address',
        type: Sequelize.STRING
    },
});

module.exports = {
    MODEL: SysUserAddress,
    findByUserGidAndProjectGid: async function (userGid, projectGid) {
        let one = await SysUserAddress.findOne({
            where: {
                userGid: userGid,
                projectGid: projectGid
            }
        });
        return one ? one.get() : null;
    }
};
