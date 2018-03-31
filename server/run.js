const config = require('./config.js')(__dirname),
      TripcamServer = require('./app/tripcam-server');

let server = new TripcamServer(config);
server.start();

function stop() {
  console.log("Stopping...");
  server.stop(function() {
    process.exit(0);
  });
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);
