const adminDao = require('../proxy/sys-user-dao');
const logger = require('../logger').getLogger('admin_service');
const cryptoUtil = require('../util/crypto_util');

/**
 * 校验用户名密码
 * @param userName
 * @param password
 * @returns {Promise<*|boolean>}
 */
const validateUserNameAndPassword = async function (userName, password) {
    const admin = await adminDao.findByUserName(userName);
    return admin && cryptoUtil.verifySaltMD5(password, admin.password);
};


module.exports = {
    validateUserNameAndPassword: validateUserNameAndPassword
};