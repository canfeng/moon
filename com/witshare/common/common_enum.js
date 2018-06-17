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
        UN_CONFIRM: 0,
        SUCCESS: 1,
        FAIL: 2,
        DISCARD: 3
    }
};