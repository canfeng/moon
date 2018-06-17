const router = require('express').Router();
const logger = require('../com/witshare/logger').getLogger('home_controller');
const buildVersion = require('../conf/build.json');
const ConfigJSON = require(ConfigPath + 'config.json');
const responseUtil = require('../com/witshare/util/response_util');
const RES_CODE = responseUtil.RES_CODE;

/**
 * 分发token，打币
 * @returns {Promise<void>}
 */
const distributeToken = async function (req, res) {
    try {
        let password = req.body
    } catch (err) {
        logger.error("distributeToken()|exception==>", err);
        res.jsonp(responseUtil.error());
    }
};

router.get('/token/distribute', distributeToken);
module.exports = router;