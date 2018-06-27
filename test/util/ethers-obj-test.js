const pathUtil = require('../../com/witshare/util/path-util');
pathUtil.initConfigPath();
const ethersObj = require('../../com/witshare/eth/ethers_obj');


generateWalletFromPrivateKey('0x5db26787ae119f7caf6aacd136cc1aac37db838f156e2827183faf1dc351543b');

function generateWalletFromPrivateKey(privateKey){
    const Wallet = ethersObj.Wallet;
    var wallet = new Wallet(privateKey);
    wallet.encrypt('ibeesaas', function (percent) {
    }).then(function(json) {
        console.log(privateKey + " >>>> " + json);
    });
}