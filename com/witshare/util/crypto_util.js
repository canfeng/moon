const crypto = require('crypto');
const commonUtil = require('./common_util');
const logger = require('../logger').getLogger('crypto_util');

const MD5 = function (data) {
    let md5 = crypto.createHash('md5');
    md5.update(data);
    var sign = md5.digest('hex');
    return sign;
};
/**
 * 加盐md5
 * md5两次
 * @param data
 * @returns {string}
 * @constructor
 */
const MD5WithSalt = function (data) {
    const salt = commonUtil.randomStr(16);
    const md5Final = MD5(MD5(data + salt));
    // 保存盐值 到md5中
    let res = [48];
    let c;
    for (let i = 0; i < 48; i += 3) {
        res[i] = md5Final.charAt(i / 3 * 2);
        res[i + 1] = md5Final.charAt(i / 3 * 2 + 1);
        c = salt.charAt(i / 3);
        res[i + 2] = c;
    }
    return res.join('');
};
/**
 * 加盐md5校验
 * @param data 待校验的值
 * @param md5Str md5后的值
 */
const verifySaltMD5 = function (data, md5Str) {
    md5Str = md5Str.toLowerCase();// 全部转小写
    const saltByte = [16];
    const pwdByte = [32];
    for (let i = 0; i < 48; i += 3) {
        pwdByte[i / 3 * 2] = md5Str.charAt(i);
        pwdByte[i / 3 * 2 + 1] = md5Str.charAt(i + 1);
        saltByte[i / 3] = md5Str.charAt(i + 2);
    }
    const salt = saltByte.join('');
    const pwdMd5 = pwdByte.join('');
    if (pwdMd5 == (MD5(MD5(data + salt)))) {
        return true;
    }
    return false;
};

const AES = {
    /**
     * 加密
     * @param data
     * @param key
     * @returns {string}
     */
    encrypt: function (data, key) {
        var cipher = crypto.createCipher('aes-128-ecb', key);
        var crypted = cipher.update(new Buffer(data), 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    },
    /**
     * 解密
     * @param encode
     * @param key
     * @returns {string}
     */
    decrypt: function (encode, key) {
        var decipher = crypto.createDecipher("aes-128-ecb", key);
        var dec = decipher.update(encode, "hex", "utf8");//编码方式从hex转为utf-8;
        dec += decipher.final("utf8");//编码方式从utf-8;
        return dec;
    },
    /**
     * 加密，NoPadding
     * 1. 加密数据不足16位的倍数需要用0补上
     * 2. 密钥长度必须等于16
     * @param data
     * @param key
     * @returns {string}
     */
    encryptNoPadding: function (data, key) {
        if (key.length != 16) {
            logger.warn('encryptNoPadding()|error==>key length need to be equals to 16');
            return null;
        }
        let dataBuff = fillBuffer(Buffer.from(data));
        let cipher = crypto.createCipheriv('aes-128-ecb', key, "");
        cipher.setAutoPadding(false);
        let crypted = cipher.update(dataBuff, 'utf8', 'hex');
        crypted += cipher.final('hex');

        return crypted;
    },
    /**
     * 解密NoPadding
     * 解密之后的原文会去掉末尾的空格
     * @param data
     * @param key
     * @returns {string}
     */
    decryptNoPadding: function (data, key) {
        try {
            let decipher = crypto.createDecipheriv("aes-128-ecb", key, "");
            decipher.setAutoPadding(false);
            let dec = decipher.update(data, "hex", "utf8");
            dec += decipher.final("utf8");
            return trimBlank(dec);
        } catch (err) {
            logger.error('decryptNoPadding()|error==>', err);
            return null;
        }
    }

}

function fillBuffer(buff) {
    let blockSize = 16;
    let remainder = buff.length % blockSize;
    if (remainder != 0) {
        let needPadLength = blockSize - remainder;
        let padBuff = Buffer.alloc(needPadLength);
        buff = Buffer.concat([buff, padBuff]);
    }
    return buff;
}

function trimBlank(str) {
    let buffer = Buffer.from(str);
    let newStr = [];
    for (const value of buffer.values()) {
        if (value != 0) {
            newStr.push(value);
        }
    }
    return Buffer.from(newStr).toString();
}

module.exports = {
    MD5: MD5,
    MD5WithSalt: MD5WithSalt,
    verifySaltMD5: verifySaltMD5,
    AES: AES,
};

