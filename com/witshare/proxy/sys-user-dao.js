const SysUser = require('../model/SysUser');

/**
 *
 * @param userGid
 * @returns {Promise<*>}
 */
async function findByUserGid(userGid) {
    const res = await SysUser.findOne({
        where: {
            userGid: userGid
        }
    });
    return res ? res.get() : null;
}


module.exports = {
    Admin: SysUser,
    findByUserGid: findByUserGid
};
