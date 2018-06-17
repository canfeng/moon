var JPush = require("jpush-sdk");
var configJson = require(ConfigPath + 'config.json');
var appkey = configJson.jpush.app_key;
var secret = configJson.jpush.master_secret;
var retryTimes = 3;
var client = JPush.buildClient(appkey, secret, retryTimes);
var push = client.push();
push.setPlatform(JPush.ALL);
push.setOptions(null, null, null, true); // set ios product env.
var logger = require("../logger.js").getLogger('jpush_util');
var sendMessage = function (devId, title, content, extraContent, rollBack) {
    var registration = JPush.registration_id(devId);
    push.setNotification('', JPush.android(content, title, 1, extraContent), // alert, title, builder_id, extras
            JPush.ios(content, title, 1, true, extraContent)) // ios (alert, sound, badge, contentAvailable, extras
        .setAudience(registration)
        .send(function (err, res) {
            if (err) {
                if (err instanceof JPush.APIConnectionError) {
                    logger.error("sendMessage error : {devId:%s, title%s, content:%s}.", devId, title, err.message);
                } else if (err instanceof JPush.APIRequestError) {
                    logger.error("sendMessage error : {devId:%s, title%s, content:%s}.", devId, title, err.message);
                }
                rollBack(0);
            } else {
                logger.info("sendMessage success : {Sendno:%, Msg_id:%s, devId:%s, title:%s, content:%s}.",
                    res.Sendno, res.Msg_id, devId, title, content);
                rollBack(1);
            }
        });
};

module.exports = {
    sendMessage : sendMessage
};
