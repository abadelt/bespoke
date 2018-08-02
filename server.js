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
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
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


// Create Root Server
http
    .createServer((req, res) => {
        console.log('Incoming request for : ' + req.url);
        if (req.url.startsWith('/images/') || req.url.startsWith('/assets/') || req.url.startsWith('/css/') || req.url.startsWith('/js/')) {
            fileServer.serve(req, res);
        } else {
            if (!db) {
                return tailor.requestHandler(req, res);
            }

            var templateUrlPath = req.url.substr(1); // remove leading "/"
            if (templateUrlPath.length == 0) {
                templateUrlPath = "index"
            }
            var templateFilePath = templateUrlPath + ".html";

            db.collection('template').find({ fileName: { $eq: templateFilePath}}).sort({ created: -1 }).limit(1).toArray(function(err, items) {
                if (err) {
                    console.log('Error in find: ' + err);
                    tailor.requestHandler(req, res);
                    return;
                }
                if (items.length < 1 || !items[0]) {
                    console.log('No template found in DB. Continuing with what is in the file system...' );
                    tailor.requestHandler(req, res);
                } else {
                    var template = items[0];
                    console.log('Before writeFile to ' + templateRoot + templateUrlPath);
                    fs.writeFile(templateRoot + templateFilePath, template.content, function (err, success) {
                        if (err) {
                            console.log('Error writing template file: ' + err);
                        }
                        tailor.requestHandler(req, res);
                    });
                }
            });
        }
    })
    .listen(port, function() {
        console.log('Tailor server listening on port ' + port);
        console.log('Template path is: ' + templateRoot);
    });

