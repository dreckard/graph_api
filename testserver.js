// --------------------------------------------------------------------------------
// Throttling Facebook Graph API library - simple node server for testing
// 
// Implements routes for /get, /post, and /delete/:id to test the API
// Your own token is required, of course
//
// dreckard
// March 2015
// --------------------------------------------------------------------------------
//http://localhost:3000/api/stats?ad_ids=1,2,3&start_time=2013-09-01&end_time=2013-10-01
var url = require('url');
var express = require('express');
var api = require('./graph_api');

api.throttleRequests = 60;
api.throttleInterval = 600; //sec
api.endpoint = 'https://graph.facebook.com';
api.token = 'token';

var app = express();
var server = app.listen(3000);
app.get('/', function (req,res) {
        res.end('Server is running...');
    });
app.get('/get', function (req,res) {
        api.get('/me')
        .done( function(body) { res.end(body); },
               function(err)  { res.end('Error: ' + err.message) } );
    });
app.get('/post', function (req,res) {
        api.post('/me/feed',{message: 'Hello Graph API'})
        .done( function(body) { res.end(body); },
               function(err)  { res.end('Error: ' + err.message) } );
    });
app.get('/delete/:id', function (req,res) {
        var pars = url.parse(req.url,true);
        api.delete('/'+req.params.id)
        .done( function(body) { res.end(body); },
               function(err)  { res.end('Error: ' + err.message) } );
    });
    
//The FB API docs don't list any PUT endpoints but here it is for completeness anyway
/*app.get('/put', function (req,res) {
        api.put('/me/feed',{message: 'Hello Graph API'})
        .done( function(body) { res.end(body); },
               function(err)  { res.end('Error: ' + err.message) } );
    });*/
    
console.log('Server running...');
