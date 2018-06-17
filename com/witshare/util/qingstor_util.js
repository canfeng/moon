var configJson = require(ConfigPath + 'config.json');
var qingstor_sdk = require('qingstor-sdk')
var config = new qingstor_sdk.Config().loadDefaultConfig();
config.access_key_id      = configJson.qingstor.access_key_id;
config.secret_access_key  = configJson.qingstor.secret_access_key;
config.host               = configJson.qingstor.host;
config.port               = configJson.qingstor.port;
config.protocol           = configJson.qingstor.protocol;
config.connection_retries = configJson.qingstor.connection_retries;

var fs = require("fs");
config.log_level='warn';


var logger = require("../logger.js").getLogger('qingstor_util');

var service = new qingstor_sdk.QingStor(config);

var bucket = service.Bucket(configJson.qingstor.bucket, 'pek3a');

var listBuckets = function (funcName) {
    service.listBuckets({
        'location': 'pek3a'
    }, function(err, res) {
        if (err) {
            logger.error("listBuckets error : ", err);
            return ;
        }
        logger.info(res.buckets);
        if (funcName) {
            funcName(res.buckets);
        }
    });
};

var uploadImgsByPath = function (path) {
    for (var i=0; i<3; i++) {
        var files = fs.readdirSync(path);
        files.forEach(function (file) {
            fs.stat(path + "/" + file, function (err, stat) {
                if (err) {
                    logger.error(err);
                    return;
                }
                bucket.putObject(file, {
                    'body': fs.createReadStream(path + "/" + file)
                }, function (err, res) {
                    if (err) {
                        logger.error("uploadImgByPath error : ", err);
                        return;
                    }
                    logger.info(res.url);
                    // fs.unlinkSync(path + "/" + file);
                });
            });
        });
        if (files.length == 0) {
            setTimeout(function () {
                logger.debug('uploadImgsByPath sleep 1000.');
            }, 1000);
        }
        else {
            break;
        }
    }
};

var uploadImgByPath = async function (fileName, filePath) {
    bucket.putObject(fileName, {
        'body': fs.createReadStream(filePath)
    }, function (err, res) {
        if (err) {
            logger.error("uploadImgByPath error : ", err);
            return;
        }
        logger.info(res.url);
        fs.unlinkSync(filePath);
    });
};

var listObjects = function() {
    bucket.listObjects(function(err, res) {
        console.log(res.statusCode);
        console.log(res.keys);
    });
};

module.exports = {
    listBuckets : listBuckets,
    listObjects : listObjects,
    uploadImgsByPath : uploadImgsByPath,
    uploadImgByPath : uploadImgByPath
}