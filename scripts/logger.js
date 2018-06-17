var log4js = require("log4js");
var log4js_config = {
    "appenders": {
        "wallet-log": {
            "type": "dateFile",
            "filename": "script.log",
            "pattern": "-yyyy-MM-dd",
            "alwaysIncludePattern": true,
            "maxLogSize": 100000000,
            "compress": false,
            "encoding": "utf-8",
            "keepFileExt": true
        },
        "wallet-console": {
            "type": "stdout"
        }
    },
    "categories": {
        "default": {
            "appenders": [
                "wallet-log",
                "wallet-console"
            ],
            "level": "info"
        }
    }
};
log4js.configure(log4js_config);

console.log("----------------------------------------logger(log4js) init success----------------------------------------");

module.exports = log4js;
