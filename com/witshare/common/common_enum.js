/**
 * Created by shizhiguo on 2018/4/29
 */


module.exports = {
    wallet_operation: {
        CREATE_WALLET: 'create_wallet',
        IMPORT_KEYSTORE: 'import_keystore',
        IMPORT_PRIVATE_KEY: 'import_private_key'
    },
    sms_scene: {
        TRANSFER: 'transfer',
        EXPORT_KEYSTORE: 'exportKeystore',
        DELETE_WALLET: 'deleteWallet'
    },
    PLATFORM_TX_STATUS: {
        INIT: 0,
        PENDING: 1,
        SUCCESS: 2,
        FAILED: 3,
        DISCARD: 4
    },
    USER_TX_STATUS: {
        INIT: 0,
        //交易还未被打包
        TX_PENDING: 1,
        //验证成功
        CONFIRM_SUCCESS: 2,
        //to地址不是平台地址
        CONFIRM_FAIL_TO_NOT_PLATFORM: 21,
        //from地址不匹配
        CONFIRM_FAIL_FROM_NOT_MATCH: 22,
        //金额不匹配
        CONFIRM_FAIL_AMOUNT_NOT_MATCH: 23,
        //交易失败
        TX_FAILED: 3,
        //交易未找到
        TX_NOT_EXIST: 4,
        //非法交易号
        TX_INVALID: 5
    }
};