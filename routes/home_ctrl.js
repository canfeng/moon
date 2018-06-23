const router = require('express').Router();
const logger = require('../com/witshare/logger').getLogger('home_controller');
const responseUtil = require('../com/witshare/util/response_util');
const tokenDistributeService = require('../com/witshare/service/token-distribute-service');
const RES_CODE = responseUtil.RES_CODE;
const commonEnum = require('../com/witshare/common/common_enum');

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
        if (platformTxStatusArr && platformTxStatusArr.length > 0 && platformTxStatusArr.indexOf(commonEnum.TX_STATUS.FAIL) < 0 && platformTxStatusArr.indexOf(commonEnum.TX_STATUS.DISCARD) < 0) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR, "platformTxStatusArr error"));
            return;
        }
        if (userTxStatusArr && userTxStatusArr.length > 0
            && userTxStatusArr.indexOf(commonEnum.USER_TX_STATUS.CONFIRM_SUCCESS) < 0
            && userTxStatusArr.indexOf(commonEnum.USER_TX_STATUS.CONFIRM_FAIL_FROM_NOT_MATCH) < 0
            && userTxStatusArr.indexOf(commonEnum.USER_TX_STATUS.CONFIRM_FAIL_AMOUNT_NOT_MATCH) < 0) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR, "userTxStatusArr error"));
            return;
        }

        tokenDistributeService.tokenDistribute(projectGid, password, userTxStatusArr, platformTxStatusArr, payTxId);
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
const distributeSummary = async function (req, res) {
    try {
        let projectGid = req.body.projectGid;
        if (!password || !projectGid) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR));
            return;
        }
        let summary = await tokenDistributeService.distributeSummary(projectGid);
        res.jsonp(responseUtil.success(summary));
    } catch (err) {
        logger.error("distributeSummary()|exceptioposn==>", err);
        res.jsonp(responseUtil.error());
    }
};

/**
 * 估算手续费
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const estimateGasCost = async function (req, res) {
    try {
        let projectGid = req.body.projectGid;
        if (!password || !projectGid) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR));
            return;
        }
        res.jsonp(responseUtil.success());
    } catch (err) {
        logger.error("estimateGasCost()|exception==>", err);
        res.jsonp(responseUtil.error());
    }
};

router.post('/token/distribute', distributeToken);
router.post('/token/distribute/summary', distributeSummary);
router.post('/token/tx/gas-cost/estimate', estimateGasCost);
module.exports = router;