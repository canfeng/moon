// global.ConfigPath = process.cwd().toString().replace('\\routes', '/conf/');
const router = require('express').Router();
const logger = require('../com/witshare/logger').getLogger('appver_controller');
// const exec = require('child_process').execSync;
const buildVersion = require('../conf/build.json');
const ConfigJSON = require(ConfigPath + 'config.json');

const appVersion = function (req, res) {
    if (!buildVersion || !buildVersion["build.datetime"]) {
        logger.error('build.json is empty!')
    }
    buildVersion['run.host'] = req.hostname;
    buildVersion['run.remote'] = getRemoteAddress(req);
    res.jsonp(buildVersion);
};

function getRemoteAddress(req) {
    let remoteAddress = req.header(ConfigJSON.request_header.remote_request_ip_field);
    if (remoteAddress) {
        return remoteAddress;
    }
    return req._remoteAddress;
}

router.get('/', appVersion);
module.exports = router;