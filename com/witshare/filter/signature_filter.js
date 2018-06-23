/**
 * Created by shizhiguo on 2018/4/11
 */
const ibeesaasAuthUtil = require('../util/ibeesaas_auth_util');
const responseUtil = require('../util/response_util');
const RES_CODE = responseUtil.RES_CODE;
const ConfigJSON = require(ConfigPath + 'config.json');
const logger = require('../logger').getLogger('signature_filter');

/**
 * 接口签名验证
 * @param req
 * @param res
 * @param next
 */
module.exports = function (req, res, next) {
    //get auth token from
    const authToken = req.header(ConfigJSON.ibeesaas.bari.header);
    //get body json
    let bodyJson = "";
    let queryParams = "";
    logger.info("signatureFilter()|body json==>", bodyJson);
    //concat url
    // let urlPath = '/' + ConfigJSON.ibeesaas.bari.name + req.path; TODO 0428
    let urlPath = req.path;
    const requestMethod = req.method;
    if (requestMethod == 'GET') {
        if (req.header('user-agent').indexOf('iOS') != -1) {
            const allParams = Object.assign(req.query, req.params);
            bodyJson = JSON.stringify(allParams);
            bodyJson = bodyJson == '{}' ? '' : bodyJson;
        } else {
            const params = req.originalUrl.split('?');
            queryParams = params.length > 1 ? params[1] : "";
        }
    } else {
        // const allParams = Object.assign(req.query, req.params);
        bodyJson = JSON.stringify(req.body);
    }
    if (!ibeesaasAuthUtil.verifyToken(authToken, urlPath, req.method, queryParams, bodyJson, ConfigJSON.ibeesaas.moon)) {
        res.jsonp(responseUtil.error(RES_CODE.SIGNATURE_AUTH_TOKEN_ERROR));
        return;
    }

    next();
};