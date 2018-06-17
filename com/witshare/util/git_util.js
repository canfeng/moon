const Promise = require('bluebird');
var fs = require("fs");
const remoteConfigPath = "/data/config/bari/";

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
        console.info('initConfigPath()==>use local config file of project');
    } else {
        global.ConfigPath = remoteConfigPath;
        console.info('initConfigPath()==>use config file under the %s', remoteConfigPath);
    }
    /*try{
        var content = fs.readFileSync(".git/HEAD");
        content = content.toString().split(/\: | \s/)[1];
        console.info("git version is : %s.", content);

        if (content.indexOf("master") > 0) { // product env
            global.ConfigPath = "/data/conf/bari/";
        }
        else if (content.indexOf("tag") > 0) { // test env
            global.ConfigPath = "/data/conf/bari/";
        }
        else if (content.indexOf("develop") > 0 || content.indexOf("feature") > 0) { // develop env
            global.ConfigPath = basePath + "/conf/";
        }
    }catch(e){
        //may you not have read permission or the file not exists

    }*/

}


module.exports = {
    initConfigPath: initConfigPath
};