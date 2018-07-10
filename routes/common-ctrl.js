const router = require('express').Router();
const logger = require('../com/witshare/logger').getLogger('');
const responseUtil = require('../com/witshare/util/response_util');
const RES_CODE = responseUtil.RES_CODE;
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

/**
 * 获取token的基本信息，包括name，symbol，decimal
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const tokenInfo = async function (req, res) {
    try {
        let address = req.params.address;
        if (!address) {
            res.jsonp(responseUtil.error(RES_CODE.PARAMS_ERROR));
            return;
        }
        let result = {
            name: await ethersObj.getName(address),
            symbol: await ethersObj.getSymbol(address),
            decimal: await ethersObj.getDecimals(address),
        };
        res.jsonp(responseUtil.success(result));
    } catch (err) {
        logger.error("tokenInfo()|exception==>", err);
        res.jsonp(responseUtil.error());
    }
};

router.get('/gas/current', currentGas);
router.get('/token/:address', tokenInfo);
module.exports = router;