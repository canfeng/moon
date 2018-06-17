/**
 * Created by shizhiguo on 2018/6/4
 */
global.ConfigPath = process.cwd() + '/../conf/';
const batchAirdropHoney = require('./batch_airdrop_honey');
const logger = require('./logger').getLogger('batch_airdrop_honey_exec');
const commonUtil = require('../com/witshare/util/common_util');


async function execute1() {
    logger.info("execute1() start...");
    await batchAirdropHoney.step1_updateUserHoneyCount();
    logger.info("execute1() end...");
}

async function execute2() {
    logger.info("execute2() start...");
    await batchAirdropHoney.step2_execAirdrop();
    let step3_Res = {};
    do {
        step3_Res = await batchAirdropHoney.step3_pollingTxHash();
        if (step3_Res.confirmedTxNum > 0) {
            await batchAirdropHoney.step4_updateAssetsAndStatus();
            // await batchAirdropHoney.step5_finalValidate();
        }
        await commonUtil.delay(10);
    } while (step3_Res.unConfirmedTxNum > 0);

    logger.info("execute2() end...");
}

async function execute3() {
    logger.info("execute3() start...");
    let step3_Res = {};
    do {
        step3_Res = await batchAirdropHoney.step3_pollingTxHash();
        if (step3_Res.confirmedTxNum > 0) {
            await batchAirdropHoney.step4_updateAssetsAndStatus();
            // await batchAirdropHoney.step5_finalValidate();
        }
        await commonUtil.delay(10);
    } while (step3_Res.unConfirmedTxNum > 0);

    logger.info("execute3() end...");
}


batchAirdropHoney.step0_filterRepeatEthAddress().then(execute1).then(execute2);
// execute3();

// batchAirdropHoney.resendTransaction("0x4017c459912609385458e6cb1fdaa34b8628671c56c1d7c9545f43bbc4e10115", 10000000000);

// batchAirdropHoney.calcTxGasCost();