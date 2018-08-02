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

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.HOST_NAME   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";


var templateRoot = __dirname + '/templates/';
if (fs.existsSync(__dirname + '/templatestore')) {
    templateRoot = __dirname + '/templatestore/';
}


if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
        mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
        mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
        mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
        mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
        mongoUser = process.env[mongoServiceName + '_USER'];

    if (mongoHost && mongoPort && mongoDatabase) {
        mongoURLLabel = mongoURL = 'mongodb://';
        if (mongoUser && mongoPassword) {
            mongoURL += mongoUser + ':' + mongoPassword + '@';
        }
        // Provide UI label that excludes user id and pw
        mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
        mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

    }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
    if (mongoURL == null) return;

    var mongodb = require('mongodb');

    if (mongodb == null) return;

    console.log('Connecting to DB...');

    mongodb.connect(mongoURL, function(err, conn) {
        if (err) {
            initDb(function(err){
                console.log('Error connecting to DB: ' + err)
            });
            callback(err);
            return;
        }

        db = conn;
        dbDetails.databaseName = db.databaseName;
        dbDetails.url = mongoURLLabel;
        dbDetails.type = 'MongoDB';

        console.log('Connected to MongoDB at: %s', mongoURL);
    });
};


const tailor = new Tailor({
    templatesPath: templateRoot
    // The place to define a custom Opentracing tracer like Jaeger, for ex.
    // tracer: initTracer(config, options)
});

// Initialization
console.log('Initializing DB connection...');
initDb(function(err) {
    console.log('Init DB Error: ' + err)
});

var writeResponse = function(response, statusCode, text, logText) {

    if (logText) {
        console.log(logText);
    } else {
        console.log("[" + statusCode + "] " + text);
    }
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'text/html');
    response.write('<html><body>' + text + '</body></html>');
    response.end();
    console.log("RESPONSE: " + response.toString());
}

// Create Root Server
const server = http.createServer().listen(port, function() {
    console.log('Tailor server listening on port ' + port);
    console.log('Template path is: ' + templateRoot);
});

server.on('request', (req, res) => {
    console.log('Incoming request for : ' + req.url);
    if (req.url.startsWith('/images/') || req.url.startsWith('/assets/') || req.url.startsWith('/css/') || req.url.startsWith('/js/')) {
        fileServer.serve(req, res);
    } else if (req.url.startsWith('/refresh-templates')) {
        if (!db) {
            return tailor.requestHandler(req, res);
        }
        db.collection('template').find({ latest: true }).toArray(function(err, items) {
            if (err) {
                return writeResponse(res, 500, "Error while querying database: " + err);
            }
            if (items.length < 1) {
                return writeResponse(res, 422, 'No template found in DB.' );
            } else {
                var errors = "";
                items.forEach(function (template) {
                    console.log('Before writeFile to ' + template.fileName);
                    fs.writeFile(templateRoot + template.fileName, template.content, function (err, success) {
                        if (err) {
                            errors += "Error writing template file: " + err + "\n";
                        }
                    });
                });
                if (errors.length > 0) {
                    return writeResponse(res, 500, errors);
                }
                return writeResponse(res, 205, 'Templates refreshed.' );
            }
        });
    } else {
        tailor.requestHandler(req, res);
    }
});


