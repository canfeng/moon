const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const ethersObj = require('../../com/witshare/eth/ethers_obj');


// generateWalletFromPrivateKey('0x5db26787ae119f7caf6aacd136cc1aac37db838f156e2827183faf1dc351543b');
getTransaction();

function generateWalletFromPrivateKey(privateKey){
    const Wallet = ethersObj.Wallet;
    var wallet = new Wallet(privateKey);
    wallet.encrypt('ibeesaas', function (percent) {
    }).then(function(json) {
        console.log(privateKey + " >>>> " + json);
    });
}

async function getReceipt() {
    let receipt = await ethersObj.provider.getTransactionReceipt('0xd46fc25c54fe7b078c33b05cda539664b3dc97445b9f51e863f35add6b6056a1');
    console.info(receipt)
}
async function getTransaction() {
    let receipt = await ethersObj.provider.getTransaction('0xdc9f30b716597999eafa0cabaa0b33423845e2f13d4c30d845018d4cf7bad933');
    console.info(receipt)
}