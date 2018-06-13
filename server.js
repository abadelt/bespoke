'use strict';

const http = require('http');
const fs = require('fs');

const Tailor = require('node-tailor');

const tailor = new Tailor({
    templatesPath: __dirname + '/templates'
    // The place to define a custom Opentracing tracer like Jaeger, for ex.
    // tracer: initTracer(config, options)
});

// Root Server
http
    .createServer((req, res) => {
        console.log('Incoming request for : ' + req.url);
        if (req.url.endsWith('fake.css')) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            var content = fs.readFileSync("css/fake.css");
            res.end(content);
        } else if (req.url.endsWith('.css')) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            var content = fs.readFileSync("css/base.css");
            res.end(content);
        } else {
            tailor.requestHandler(req, res);
        }
    })
    .listen(8080, function() {
        console.log('Tailor server listening on port 8080');
        console.log('Template path: ' + __dirname + '/templates');
    });

