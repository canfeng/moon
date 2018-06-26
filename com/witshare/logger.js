var log4js = require("log4js");
var log4js_config = require("../../conf/log4js.json");
log4js.configure(log4js_config);

console.log("----------------------------------------logger(log4js) init success----------------------------------------");

module.exports = log4js;
