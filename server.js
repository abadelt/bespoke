'use strict';

const http = require('http');
const fs = require('fs');
const nodeStatic = require('node-static');
const fileServer = new nodeStatic.Server('./assets');
const Tailor = require('node-tailor');
const jsHeaders = {
    'Content-Type': 'application/javascript',
    'Access-Control-Allow-Origin': '*'
};

var templatesPath = __dirname + '/templates';
if (fs.existsSync("/fabricstorage")) {
    templatesPath = '/fabricstorage';
}
const tailor = new Tailor({
    templatesPath: templatesPath
    // The place to define a custom Opentracing tracer like Jaeger, for ex.
    // tracer: initTracer(config, options)
});

// Root Server
http
    .createServer((req, res) => {
        console.log('Incoming request for : ' + req.url);
        if (req.url.startsWith('/images/') || req.url.startsWith('/css/') || req.url.startsWith('/js/')) {
            fileServer.serve(req, res);
        } else {
            tailor.requestHandler(req, res);
        }
    })
    .listen(8080, function() {
        console.log('Tailor server listening on port 8080');
        console.log('Template path: ' + __dirname + '/templates');
    });

