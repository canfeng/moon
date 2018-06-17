/**
 * 预警控制
 */
const logger = require('../logger').getLogger('alarm_service');
const ibeesaasAuthUtil = require('../util/ibeesaas_auth_util');
const httpUtil = require('../util/http_util');
const redisTokenUtil = require('../eth/redis_token_util');
const bigDecimal = require('js-big-decimal');
const FixedConfigJSON = require('../../../conf/fixed_config.json');
const ConfigJSON = require(ConfigPath + 'config.json');
const smsConfig = ConfigJSON.ibeesaas.sms_alarm;
const alarmContactPhones = FixedConfigJSON.alarm_contacts.phones;
const ALARM_TYPE = FixedConfigJSON.alarm_type;

/**
 * 触发报警
 * @returns {Promise<*|boolean>}
 */
const triggerAlarm = async function (alarmType, currentValue, extra) {
    let smsBody = {
        appId: smsConfig.biz_type,
        msgType: ibeesaasAuthUtil.SmsMsgType.notify,
        body: smsConfig.template.notify_alarm.replace('{0}', alarmType.desc).replace('{1}', alarmType.limit).replace('{2}', currentValue).replace('{3}', extra ? extra : '')
    };
    for (let userPhone of alarmContactPhones) {
        logger.info('triggerAlarm() sendSms to userPhone[%s]->alarmType[%s]', userPhone, JSON.stringify(alarmType));
        smsBody.phoneNo = userPhone;
        let expireTime = parseInt(Date.now() / 1000 + 3600);
        let authToken = ibeesaasAuthUtil.generateToken(smsConfig.url, ibeesaasAuthUtil.METHOD.POST, "", JSON.stringify(smsBody), expireTime, smsConfig.version, smsConfig.ak, smsConfig.sk);
        let urlPath = smsConfig.host + smsConfig.url;
        let header = {};
        header[smsConfig.header] = authToken;
        try {
            let res = await httpUtil.post(urlPath, smsBody, header);
            if (!res || res.retCode != 1000) {
                logger.info('triggerAlarm()|send sms failed==>userPhone=%s', userPhone);
            }
        } catch (err) {
            logger.info('triggerAlarm()|send sms error==>userPhone=%s |exception detail==>', userPhone, err);
            continue;
        }
    }
};

/**
 * 检查是否触达了预警条件
 * @returns {Promise<void>}
 */
const checkIsTouchAlarmCondition = async function (alarmType) {
    if (alarmType == ALARM_TYPE.LOCKED_USER_NUM) {
        let currentLockedNum = arguments[1];
        if (currentLockedNum >= alarmType.limit) {
            triggerAlarm(alarmType, currentLockedNum);
        }
    } else if (alarmType == ALARM_TYPE.SINGLE_TRANSACTION_AMOUNT) {
        let transferValue = arguments[1];
        let tokenAddress = arguments[2];
        let walletAddress = arguments[3];
        let userPhone = arguments[4];
        let tokenPriceInfo = await redisTokenUtil.getTokenUsdCny(tokenAddress);
        let transferAmount = bigDecimal.multiply(transferValue, tokenPriceInfo.cnyPrice);
        if (transferAmount >= alarmType.limit) {
            let extra = '钱包地址：' + walletAddress + ';用户手机号：' + userPhone;
            triggerAlarm(alarmType, transferAmount, extra);
        }
    } else if (alarmType == ALARM_TYPE.WALLETADDRESS_USERPHONE_MISMATCH_NUM) {
        let currentMisMatchNum = arguments[1];
        if (currentMisMatchNum >= alarmType.limit) {
            triggerAlarm(alarmType, currentMisMatchNum);
        }
    } else if (alarmType == ALARM_TYPE.TRANSFER_FAIL_RATE) {
        let failedTimes = arguments[1];
        let totalTimes = arguments[2];
        let userPhone = arguments[3];
        let failedRate = (failedTimes / totalTimes).toFixed(2);
        if (totalTimes > 10 && failedRate > alarmType.limit) {
            let extra = '用户手机号：' + userPhone + '；转账调用次数：' + totalTimes + '；转账失败次数：' + failedTimes;
            triggerAlarm(alarmType, failedRate, extra);
        }
    }
};


module.exports = {
    ALARM_TYPE: ALARM_TYPE,
    checkIsTouchAlarmCondition: checkIsTouchAlarmCondition,
    triggerAlarm: triggerAlarm
};

