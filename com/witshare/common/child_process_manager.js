/**
 * Created by shizhiguo on 2018/4/28
 */
const logger = require('../logger').getLogger('child_process_manager');
const fork = require('child_process').fork;
const commonEnum = require('./common_enum');
const commonUtil = require('../util/common_util');
const response_util = require('../util/response_util');
const RES_CODE = response_util.RES_CODE;

/**
 * @deprecated
 * TODO 暂时不行（可能会使用重复的子进程，导致收到的结果一样）
 * 初始化执行，初始和cpu核数一致的子进程
 */
const initWalletDealProcesses = function () {
    global.WALLET_DEAL_PROCESSES = [];
    const cpus = require('os').cpus();
    for (let i = 0, l = cpus.length; i < l; i++) {
        const worker = fork(__dirname + '/wallet_deal_process.js');
        global.WALLET_DEAL_PROCESSES.push(worker);
        logger.info('initWalletDealProcesses()|push child_process[pid:%s] into global.WALLET_DEAL_PROCESSES', worker.pid);
    }
    logger.info('initWalletDealProcesses()|global.WALLET_DEAL_PROCESSES length==>', global.WALLET_DEAL_PROCESSES.length);
};

const notifyChildProcessDeal = function (operation, data) {
    let worker = fork(__dirname + '/wallet_deal_process.js');
    logger.info('current child_process pid==>', worker.pid);
    return new Promise(function (resolve, reject) {
            worker.on('message', async function (result) {//接收工作进程计算结果
                logger.info('receive child_process[pid:%s] deal result for operation[%s] ==>', worker.pid, operation, result);
                worker.kill();//发送杀死进程的信号
                logger.info('kill child_process[pid:%s] for operation[%s]', worker.pid, operation);
                resolve(result);
            });
            worker.send({//发送参数给工作进程
                operation: operation,
                data: data
            });
        }
    );
};


module.exports = {
    notifyChildProcessDeal: notifyChildProcessDeal
}
