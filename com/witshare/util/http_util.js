const axios = require('axios');
const logger = require('../logger').getLogger('http-util');

async function request(method, url, params, body, headers) {
    const rid = Date.now() + '' + Math.round(Math.random() * 10000);
    logger.info('request==>rid_%s| url:%s;params:%s;body:%s;header:%s', rid, url, JSON.stringify(params), JSON.stringify(body), JSON.stringify(headers));
    let res = await axios({
        method: method,
        url: url,
        data: method == 'get' ? '' : body,
        params: method == 'post' ? '' : params,
        headers: headers,
        timeout: 0
    });
    logger.info("response==>rid_%s|", rid, res.data);
    return res.data;
}

/**
 *
 * @param url
 * @param params
 * @param headers
 * @returns {Promise<*>}
 */
async function get(url, params, headers) {
    return await request('get', url, params, "", headers);
}

/**
 *
 * @param url
 * @param params
 * @param headers
 * @returns {Promise<*>}
 */
async function post(url, params, headers) {
    return await request('post', url, "", params, headers);
}

module.exports = {
    get: get,
    post: post,
}