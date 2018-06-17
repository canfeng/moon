//判断字符是否为空的方法
const isEmpty = function (obj) {
    if (typeof obj == "undefined" || obj == null || obj == "") {
        return true;
    } else {
        return false;
    }
};

//判断是否为数字
const isNumber = function (val) {
    // isNaN()函数 把空串 空格 以及NUll 按照0来处理 所以先去除
    if (val === "" || val == null) {
        return false;
    }
    if (!isNaN(val)) {
        return true;
    } else {
        return false;
    }
};

/**
 * 生成随机字符串（纯数字）
 * @param length
 */
const randomNumStr = function (length) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code = code + parseInt(Math.random() * 10);
    }
    return code;
};

/**
 * 生成随机字符串
 * @param length
 */
const randomStr = function (length) {
    const baseStr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const buffer = Buffer.alloc(length);
    let number;
    for (let i = 0; i < length; i++) {
        number = parseInt(Math.random() * baseStr.length);
        buffer.write(baseStr[number], i);
    }
    return buffer.toString();

};

/**
 * 等待指定时长（单位：s）
 * eg：await delay(2)
 * @param time
 * @returns {Promise<any>}
 */
function delay(time) {
    return new Promise(resolve => {
        return setTimeout(resolve, time * 1000);
    });
}

/**
 * 浅拷贝
 * @param obj
 * @returns {*}
 */
function shallowCopy(obj) {
    if (typeof obj != 'object') {
        return obj;
    }
    const newObj = {};
    for (var attr in obj) {
        newObj[attr] = obj[attr];
    }
    return newObj;
}

/**
 * 深拷贝
 * @param obj
 * @returns {{}}
 */
function deepCopy(obj) {
    if (typeof obj != 'object') {
        return obj;
    }
    var newObj = {};
    for (let attr in obj) {
        newObj[attr] = deepCopy(obj[attr]);
    }
    return newObj;
}

function hidePassword(obj) {
    const cobj = deepCopy(obj);
    if (cobj.password) {
        cobj.password = '******';
    }
    if (cobj.oldPassword) {
        cobj.oldPassword = '******';
    }
    return cobj;
}

module.exports = {
    isEmpty: isEmpty,
    isNumber: isNumber,
    randomNumStr: randomNumStr,
    randomStr: randomStr,
    delay: delay,
    shallowCopy: shallowCopy,
    deepCopy: deepCopy,
    hidePassword: hidePassword
};
