const readFileSync = require('fs').readFileSync,
      http = require('http'),
      https = require('https'),
      express = require('express'),
      websocket = require('websocket'),
      { Room, Rooms } = require('./rooms');


class TripcamServer {
  constructor(config) {
    this.config = config;

    this.rooms = new Rooms(this.config.rooms);

    this.app = this.setupExpress();
    this.http = this.setupHttp(this.app);
    this.https = this.setupHttps(this.config, this.app);

    this.configureWebRoutes(this.config, this.app);

    this.wss = this.setupWss(this.config, this.https);
  }

  setupExpress() {
    var app = express();
    app.set('views', this.config.express.viewsPath);
    app.set('view engine', 'pug');

    return app;
  }

  setupHttp(app) {
    return http.createServer(app);
  }

  setupHttps(config, app) {
    // Create and configure HTTPS server
    return https.createServer({
      key: readFileSync(config.https.keyPath),
      cert: readFileSync(config.https.certPath)
    }, app);
  }

  configureWebRoutes(config, app) {
    // Configure home routes
    app.get('/', (req, res) => {
      res.render('index');
    });

    // Configure room routes
    // Ensure room route is secure
    app.get('/room/*', (req, res, next) => {
      if (req.secure) { next(); }
      else {
        res.redirect('https://' + req.headers.host + ":" + config.https.listenPort + req.url);
      }
    });

    //
    app.get('/room/:roomid', ((req, res) => {
      let roomid = req.params.roomid;

      this.rooms.createRoom(roomid);
      res.render('room', { roomid: roomid });
    }).bind(this));

    // Configure Static files route
    app.use(express.static(this.config.express.staticPath));
  }

  setupWss(config, http) {
    // Create and configure websocket server
    var wss = new websocket.server({
      httpServer: http,
      autoAcceptConnections: false
    });

    wss.on('request', (req => {
      if(!config.wss.allowedOrigins.includes(req.origin)) {
        request.reject();
        return;
      }

      if(!req.resource.startsWith('/room/')){
        request.reject();
        return;
      }

      var cn = req.accept('room-protocol', req.origin);
      var roomid = req.resource.slice(6);
      var clientid = "client" + Math.random().toString(36).substr(2, 9);

      this.rooms.newClient(roomid, clientid, cn);
    }).bind(this));

    return wss;
  }

  start() {
    this.https.listen(this.config.https.listenPort);
    console.log("Now listening for HTTPS connections on port " + this.config.https.listenPort);

    this.http.listen(this.config.http.listenPort);
    console.log("Now listening for HTTP connections on port " + this.config.http.listenPort);
  }

  stop() {
    
  }
}

module.exports = TripcamServer;
