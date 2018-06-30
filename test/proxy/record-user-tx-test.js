const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const RecordUserTx = require('../../com/witshare/proxy/record-user-tx');

/////////////////////////////////////////////////////////

updatePlatformTxDataByCondition();


/////////////////////////////////////////////////////////

async function updatePlatformTxDataByCondition() {
    let updateRecord = {
        userGid: '111',
        platformTx: '123',
        platformTxStatus: 1
    };
    let res= await RecordUserTx.updatePlatformTxDataByCondition(updateRecord, {userTxStatusArr: [1, 2]});
    console.info(res)
}
