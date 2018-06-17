var Threads = {};//TODO 这个分支中没有用到 require('webworker-threads');
var logger = require('../logger').getLogger('threads_util');
var runFuncByThread = function (func, funcName, _params, cbName) {
    var thread = Threads.create();
    _params = JSON.stringify(_params);
    logger.info("runFuncByThread : { func:%s, funcName:%s, _params:%s, cbName:%s }", func, funcName, _params, cbName);
    thread.eval(func).eval(funcName + "('" + _params + "')", function (err, data) {
        cbName(err, data);
        thread.destroy();
    });
}

module.exports = {
    runFuncByThread: runFuncByThread,
    Threads: Threads
};