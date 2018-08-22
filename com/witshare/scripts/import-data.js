const pathUtil = require('../util/path-util');
pathUtil.initConfigPath();
const _ = require('lodash');
const log = require('../logger').getLogger('token-distribute-service');
const SysProject = require('../proxy/sys-project');
const SysUserAddress = require('../proxy/sys-user-address');
const RecordUserTx = require('../proxy/record-user-tx');
const dbManager = require('../proxy/db-manager');
const xlsx = require("node-xlsx");
const commonUtil = require("../util/common_util");
const ethersObj = require("../eth/ethers_obj");

//默认平台地址
const defaultPlatformAddress = '0x81A4962699F047C65baBee5E59f14a021F22A40A';


batchImportDataFromExcel('/data/airdrop/代打清单(1).xlsx', '20180822-MMDA-Project');

async function batchImportDataFromExcel(path, projectName) {
    log.info('batchImportDataFromExcel - start...');
    const sheetList = xlsx.parse(path);
    //代币信息
    let sheet = sheetList[0];
    log.info('batchImportDataFromExcel - current sheet==>', sheet.name);
    let rows = sheet.data;
    if (rows && rows.length > 0) {
        log.info('batchImportDataFromExcel - row num==>', rows.length);
        for (let i = 0, l = rows.length; i < l; i++) {
            let row = rows[i];
            log.info(`batchImportDataFromExcel - current row==>index=${i}; data=`, row);
            if (row && row.length > 1) {
                //表头
                if (i == 0) {
                    continue;
                }
                let symbol = row[0];
                let tokenAddress = row[1];
                let projectGId = commonUtil.shortUuid();

                await SysProject.insert({
                    projectGid: projectGId,
                    projectAddress: projectName,
                    projectToken: symbol,
                    tokenAddress: tokenAddress,
                    platformAddress: defaultPlatformAddress,
                    softCap: 0,
                    hardCap: 0,
                    minPurchaseAmount: 0,
                    startTime: Date.now(),
                    endTime: Date.now() + 24 * 60 * 60 * 1000,
                    tokenDecimal: await ethersObj.getDecimals(tokenAddress)
                });
            }
        }
    }
    //用户地址信息
    sheet = sheetList[1];
    rows = sheet.data;
    if (rows && rows.length > 0) {
        log.info('batchImportDataFromExcel - row num==>', rows.length);
        for (let i = 0, l = rows.length; i < l; i++) {
            let row = rows[i];
            let row0 = rows[0];
            let projectGidMap = new Map();
            //表头
            if (i == 0) {
                continue;
            }
            let walletAddress = row[1];
            if(walletAddress){
                for (let j = 2; j < row.length; j++) {
                    let value = row[j];
                    let symbol = row0[j];
                    let projectGid = projectGidMap.get(symbol);
                    if (!projectGid) {
                        projectGid = (await  SysProject.findBySymbolAndProjectAddress(symbol, projectName)).projectGid;
                        projectGidMap.set(symbol, projectGid);
                    }
                    let tx = await dbManager.transaction();
                    let userGid = commonUtil.shortUuid();
                    let res1 = await SysUserAddress.insert({
                        userGid: userGid,
                        projectGid: projectGid,
                        projectToken: symbol,
                        payEthAddress: '',
                        getTokenAddress: walletAddress
                    }, tx);

                    let res2 = await RecordUserTx.insert({
                        userGid: userGid,
                        userEmail: '',
                        projectGid: projectGid,
                        projectToken: symbol,
                        payCoinType: 0,
                        payTx: commonUtil.shortUuid(),
                        payAmount: 0,
                        priceRate: 0,
                        hopeGetAmount: value,
                        shouldGetAmount: value,
                        userTxStatus: 2
                    }, tx);

                    res1 && res2 ? tx.commit() : tx.rollback();
                }
            }
        }
    }
    log.info('batchImportDataFromExcel -  end...');
};


