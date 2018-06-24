const router = require('express').Router();
const logger = require('../com/witshare/logger').getLogger('home_controller');
const responseUtil = require('../com/witshare/util/response_util');
const ethersObj = require('../com/witshare/eth/ethers_obj');
const tokenDistributeService = require('../com/witshare/service/token-distribute-service');
const RES_CODE = responseUtil.RES_CODE;
const commonEnum = require('../com/witshare/common/common_enum');
const Config = require(ConfigPath + 'config.json');

/**
 * 分发token，打币
 * @returns {Promise<void>}
 */
const distributeToken = async function (req, res) {
    try {
        let password = req.body.password;
        let projectGid = req.body.projectGid;
        let userTxStatusArr = req.body.userTxStatusArr;
        let platformTxStatusArr = req.body.platformTxStatusArr;
        let payTxId = req.body.payTxId;
        if (!password || !projectGid) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR));
            return;
        }
        tokenDistributeService.filterStatusArr(userTxStatusArr,platformTxStatusArr);
        let recordUserList = await tokenDistributeService.getRecordUserListByCondition(projectGid,userTxStatusArr,platformTxStatusArr,payTxId);
        tokenDistributeService.tokenDistribute(projectGid, password, recordUserList);
        res.jsonp(responseUtil.success());
    } catch (err) {
        logger.error("distributeToken()|exception==>", err);
        res.jsonp(responseUtil.error());
    }
};

/**
 * 获取打币总结报告
 * @returns {Promise<void>}
 */
const distributeProgress = async function (req, res) {
    try {
        let projectGid = req.body.projectGid;
        if (!projectGid) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR));
            return;
        }
        let summary = await tokenDistributeService.distributeProgress(projectGid);
        res.jsonp(responseUtil.success(summary));
    } catch (err) {
        logger.error("distributeSummary()|exceptioposn==>", err);
        res.jsonp(responseUtil.error());
    }
};



router.post('/token/distribute', distributeToken);
router.get('/token/distribute/progress', distributeProgress);
module.exports = router;