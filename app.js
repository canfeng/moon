const express = require('express');

const gitUtil = require('./com/witshare/util/git_util.js');
gitUtil.initConfigPath(__dirname);
console.info(global.ConfigPath);

const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const manageAuthFilter = require('./com/witshare/filter/manage_auth_filter');
const requestFilter = require('./com/witshare/filter/request_filter');
const signatureFilter = require('./com/witshare/filter/signature_filter');
const responseUtil = require('./com/witshare/util/response_util');
const log4jsLogger = require('./com/witshare/logger').getLogger('app');

const appverCtrl = require('./routes/appver_ctrl');


var app = express();


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());


/****************************manage************************/
app.use('/moon/appver', appverCtrl);
app.use(requestFilter);
app.use(signatureFilter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    // res.render('error');
    log4jsLogger.error("not captured exception==>", err);
    res.jsonp(responseUtil.error(responseUtil.RES_CODE.SYSTEM_EXCEPTION));
});


module.exports = app;
