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
    TX_STATUS: {
        INIT: 0,
        SUCCESS: 1,
        FAIL: 2,
        DISCARD: 3
    },
    USER_TX_STATUS: {
        INIT: 0,
        CONFIRM_SUCCESS: 1,
        //to地址不是平台地址
        CONFIRM_FAIL_TO_NOT_PLATFORM: 11,
        //from地址不匹配
        CONFIRM_FAIL_FROM_NOT_MATCH: 12,
        //金额不匹配
        CONFIRM_FAIL_AMOUNT_NOT_MATCH: 13,
        TX_FAILED: 2,
        TX_NOT_EXIST: 3
    }
};