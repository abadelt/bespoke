'use strict';
const http = require('http');
const path = require('path');
const fragmentServerIndex = 1;
const port = 8080 + fragmentServerIndex;
const fs = require('fs');
const jsHeaders = {
    'Content-Type': 'application/javascript',
    'Access-Control-Allow-Origin': '*'
};

const server = http.createServer((req, res) => {
    console.log(req.method + ' request coming in for ' + req.url);

    if (req.url.endsWith('.css')) {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        var content = fs.readFileSync("css/styles.css");
        res.end(content);
    } else if (req.url === '/script_1.js') {
        res.writeHead(200, jsHeaders);
        res.end(`<script type="JavaScript">var x=10</script>`);
    } else {
        res.writeHead(200, {
            Link: `<http://localhost:8081/styles_1.css>;rel="stylesheet",<http://localhost:8081/script_1.js>;rel="fragment-script"`,
            'Content-Type': 'text/html'
        });
        var content = fs.readFileSync("fragment.html");
        res.end(content);
    }
});

server.listen(port);
console.log('Fragment server ' + fragmentServerIndex + ' started at port ' + port);
