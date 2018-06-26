const router = require('express').Router();
const logger = require('../com/witshare/logger').getLogger('');
const responseUtil = require('../com/witshare/util/response_util');
const ethersObj = require('../com/witshare/eth/ethers_obj');
const Config = require(ConfigPath + 'config.json');

/**
 * 获取当前转账的gas价格和gasLimit
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const currentGas = async function (req, res) {
    try {
        let gasPrice = await ethersObj.provider.getGasPrice();
        let result = {
            gasPrice: parseFloat(gasPrice),
            gasPriceGWei: parseFloat(ethersObj.utils.formatUnits(gasPrice, 'gwei')) + 'gwei',
            ethGasLimit: Config.eth.default_eth_transfer_gas_used,
        };
        res.jsonp(responseUtil.success(result));
    } catch (err) {
        logger.error("currentGas()|exception==>", err);
        res.jsonp(responseUtil.error());
    }
};

router.get('/gas/current', currentGas);
module.exports = router;