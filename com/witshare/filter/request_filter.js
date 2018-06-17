const logger = require('../logger').getLogger('request_filter');
const ConfigJSON = require(ConfigPath + 'config.json');
const commonUtil = require('../util/common_util');

module.exports = async function (req, res, next) {
    let requestStr =
        `ACCEPT REQUEST==>  
==============================START==============================
RequestPath     :%s
Header          :%s
QueryParams     :%s
RequestBody     :%s
RemoteAddress   :%s
===============================END===============================`;
    try {
        const body = commonUtil.hidePassword(req.body);
        logger.info(requestStr, req.path, JSON.stringify(req.headers), JSON.stringify(req.query) + "|" + JSON.stringify(req.params), JSON.stringify(body), getRemoteAddress(req));
    } catch (err) {
        logger.error("requestFilter()|exception==>", err);
    }

    next();
};


function getRemoteAddress(req) {
    let remoteAddress = req.header(ConfigJSON.request_header.remote_request_ip_field);
    if (remoteAddress) {
        return remoteAddress;
    }
    return req._remoteAddress;
}