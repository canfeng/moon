var fs = require("fs");
var FixedConfig = require("../../../conf/fixed_config.json");
const remoteConfigPath = FixedConfig.normal_config.external_config_path;

/**
 * 确定需要使用的配置文件的路径，优先使用外部的配置文件
 * @param basePath
 * @returns {Promise<void>}
 */
async function initConfigPath(basePath) {

    let useLocal = true;
    const exist = fs.existsSync(remoteConfigPath);
    if (exist) {
        const files = fs.readdirSync(remoteConfigPath);
        if (files.length > 0) {
            useLocal = false;
        }
    }
    if (useLocal) {
        global.ConfigPath = basePath + "/conf/";
        console.info('initConfigPath()==>use project internal configuration file==>ConfigPath=%s', ConfigPath);
    } else {
        global.ConfigPath = remoteConfigPath;
        console.info('initConfigPath()==>use project external configuration file==>ConfigPath=%s', ConfigPath);
    }
}


module.exports = {
    initConfigPath: initConfigPath
};