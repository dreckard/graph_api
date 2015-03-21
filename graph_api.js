// --------------------------------------------------------------------------------
// Simple throttling Facebook graph API library for node.js
// 
// Install/Setup:
//   Use npm install dreckard/graph_api to install everything directly from github
//   or simply place this file in the proper directory and load as a file module 
//   with require('./graph_api')
//
// Usage:
//   All requests return Q promise objects and errors are logged to <logFile>
//   
//   get(path):
//   delete(path):
//   post(path,content):
//   put(path,content):
//   These functions all issue the HTTP requests their names suggest to the
//   URL at <exports.endpoint> + <path> using the form data specified in <content>
//   
//   Requests are throttled to <exports.throttleRequests> per 
//   <exports.throttleInterval> sec and will be queued if the limit is exceeded
//
// dreckard
// March 2015
// --------------------------------------------------------------------------------
var url = require('url');
var assert = require('assert');
var request = require('request');
var Q = require('q');
var winston = require('winston');
var Queue = require('tiny-queue');

var throttleCounter = 0;
var throttleQueue = new Queue(); //This can be done with a plain old array but the shifting will be slow

exports.throttleRequests = 60;
exports.throttleInterval = 600; //sec
exports.logFile = 'request_log.txt';
exports.endpoint = null;
exports.token = null;

//Setup logging
winston.add(winston.transports.File, { filename: exports.logFile });

function checkRequestError(requestType,path,response,body,error)
{
    var errMsg = requestType + ' ' + path + ' failed; ';
    if ( error )
    {
        winston.error(errMsg + error.message);
        return error;
    }
    
    try
    {
        var resp = JSON.parse(body);
        if ( resp.error )
        {
            winston.error(errMsg + resp.error.type + '; ' + resp.error.message);
            return new Error(errMsg + resp.error.type + '; ' + resp.error.message);
        }
    }
    catch (e)
    { 
        winston.error(errMsg + e.message);
        return new Error(errMsg + e.message); 
    }
    return null;
}

function genUrl(path)
{
    var request_url = url.parse(url.resolve(exports.endpoint,path),true);
    request_url.query.access_token = exports.token;
    return request_url;
}
function submitRequest(context)
{
    //DEBUG
    //winston.info('Submitting request to: ' + context.url);
    //context.deferred.resolve('Result!\nCounter: ' + throttleCounter + '\nQueue: ' + throttleQueue.length);
    
    request({method: context.method, url: context.url, form: context.form}, function (error, response, body) {
        var reqError = checkRequestError(context.method,context.url,response,body,error);
        if (reqError)
            context.deferred.reject(reqError);
        else
            context.deferred.resolve(body);
        });
}
function processRequestQueue() //Called every time a throttled request "ages out" (i.e. after throttleInterval secs) 
{
    assert(throttleCounter > 0, 'throttleCounter > 0 failed');
    
    if ( throttleQueue.length > 0 )
        submitRequest(throttleQueue.shift());
    throttleCounter--;
}
function queueRequest(reqMethod,path,content)
{
    var def = Q.defer();
    var reqContext = {deferred: def, method: reqMethod, url: url.format(genUrl(path)), form: content};
    
    throttleCounter++;
    if ( throttleCounter >= exports.throttleRequests )
        throttleQueue.push(reqContext);
    else
        submitRequest(reqContext);
    
    setTimeout(processRequestQueue,exports.throttleInterval*1000);
    return def.promise;
}
exports.get = function(path)
{
    return queueRequest('GET',path);
}
exports.post = function(path,content)
{
    return queueRequest('POST',path,content);
}
exports.put = function(path,content)
{
    return queueRequest('PUT',path,content);
}
exports.delete = function(path)
{
    return queueRequest('DELETE',path);
}
