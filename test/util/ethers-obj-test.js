const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const ethersObj = require('../../com/witshare/eth/ethers_obj');
const bigDecimal = require('js-big-decimal');


// generateWalletFromPrivateKey();
// getReceipt();
// getTransaction();
// getTransaction();

async function createWallet() {
    let wallet =await ethersObj.createWallet();
    console.info(wallet)
}

function generateWalletFromPrivateKey(privateKey) {
    const Wallet = ethersObj.Wallet;
    var wallet = new Wallet(privateKey);
    wallet.encrypt('ibeesaas', function (percent) {
    }).then(function (json) {
        console.log(privateKey + " >>>> " + json);
    });
}

async function getReceipt() {
    let receipt = await ethersObj.provider.getTransactionReceipt('0xfce6c86293d97759e01909bdf14646ceaea812c90f0ff81861b9a0d0368ef038');
    console.info(receipt);
    if (receipt) {
        for (let log of receipt.logs) {
            if (log.topics) {
                for (let topic of log.topics) {
                    console.info(`topic ==>${topic}`)
                }
            }
        }
    }
}

async function getTransaction() {
    let res = await ethersObj.provider.getTransaction('0x939edf82b1068b4ea5863db3abd717f24a58cc17ac47a8240dc0fdcba80ee474');
    console.info('res==>'+res);
    console.info('value==>'+res.value.toString())
    console.info('eth==>'+ ethersObj.utils.formatEther(res.value))
}

async function getStorageAt() {
    let res = await ethersObj.provider.getStorageAt('0x7cA357F0aBF3046627082cfdA45eBee3e17b8791', 0);
    console.info('res==>'+res);
}

async function getCode() {
    let res = await ethersObj.provider.getCode('0x7cA357F0aBF3046627082cfdA45eBee3e17b8791');
    console.info(res)
}

async function transferMethodID() {
    const tokenTransferMethodId = ethersObj.utils.id('transfer(address,uint256)').substring(0, 10);
    console.info(tokenTransferMethodId)
}

async function bigDecimaltest() {
    let res= bigDecimal.multiply('0.1111111111', 8000.0000000000);
    console.info(res);
    res = bigDecimal.round(res,9);
    console.info(res);
}