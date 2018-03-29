const readFileSync = require('fs').readFileSync,
      http = require('http'),
      https = require('https'),
      express = require('express');

const TripcamServer = function(config) {
  this.config = config;

  // Create and configure server express app
  this.app = express();
  this.app.set('views', this.config.express.viewsPath);
  this.app.set('view engine', 'pug');

  // Create and configure HTTP Server
  this.http = http.createServer(this.app);

  // Create and configure HTTPS server
  this.https = https.createServer({
    key: readFileSync(this.config.https.keyPath),
    cert: readFileSync(this.config.https.certPath)
  }, this.app);


  // Configure home routes
  this.app.get('/', (req, res) => {
    res.render('index');
  });

  // Configure room routes
  // Ensure room route is secure
  this.app.get('/room/*', (req, res, next) => {
    if (req.secure) { next(); }
    else {
      res.redirect('https://' + req.headers.host + ":" + this.config.https.listenPort + req.url);
    }
  });

  this.app.get('/room/:roomid', (req, res) => {
    res.render('room', { roomid: req.params.roomid });
  });

  // Configure Static files route
  this.app.use(express.static(this.config.express.staticPath));
}

TripcamServer.prototype.start = function() {
  this.https.listen(this.config.https.listenPort);
  console.log("Now listening for HTTPS connections on port " + this.config.https.listenPort);

  this.http.listen(this.config.http.listenPort);
  console.log("Now listening for HTTP connections on port " + this.config.http.listenPort);
}

module.exports = TripcamServer;
