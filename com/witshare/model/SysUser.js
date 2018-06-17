const dbManager = require('../proxy/db-manager');
const Sequelize = require('sequelize');
const moment = require('moment');

const SysUser = dbManager.define('sys_user', {
    id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    userGid: {
        field: 'user_gid',
        type: Sequelize.STRING
    },
    email: {
        field: 'email',
        type: Sequelize.STRING
    },
    nickname: {
        field: 'nickname',
        type: Sequelize.STRING
    },
    projectNum: {
        field: 'project_num',
        type: Sequelize.INTEGER
    },
    userStatus: {
        field: 'user_status',
        type: Sequelize.INTEGER
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
});

module.exports = SysUser;