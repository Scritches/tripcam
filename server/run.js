const config = require('./config.js')(__dirname),
      TripcamServer = require('./app/tripcam-server');

let server = new TripcamServer(config);
server.start();
