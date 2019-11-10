const readFileSync = require('fs').readFileSync,
      https = require('https'),
      async = require('async'),
      express = require('express'),
      websocket = require('websocket'),
      { Room, Rooms } = require('./rooms');


class TripcamServer {
  constructor(config) {
    this.config = config;

    this.rooms = new Rooms(this.config.rooms);

    this.app = this.setupExpress();
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

    app.get('/room/:roomid', ((req, res) => {
        let roomid = req.params.roomid;

        this.rooms.createRoom(roomid);
        res.render('room', { roomid: roomid, serverAddress: this.config.wss.serverAddress });
    }).bind(this));

    // Configure Static files route
    app.use(express.static(this.config.express.staticPath));
  }

  setupWss(config, https) {
    // Create and configure websocket server
    var wss = new websocket.server({
      httpServer: https,
      autoAcceptConnections: false
    });

    wss.on('request', (req => {
      if(!config.wss.allowedOrigins.includes(req.origin)) {
        console.log("rejecting wss: not allowed origin");
        req.reject();
        return;
      }

      if(!req.resource.startsWith('/room/')) {
        console.log("rejecting wss: wrong url");
        req.reject();
        return;
      }

      console.log("accepting wss");

      var cn = req.accept('room-protocol', req.origin);
      var roomid = req.resource.slice(6);
      this.rooms.createRoom(roomid);

      var clientid = "client" + Math.random().toString(36).substr(2, 9);

      this.rooms.newClient(roomid, clientid, cn);
    }).bind(this));

    return wss;
  }

  start() {
    this.https.listen(this.config.https.listenPort);
    console.log("Now listening for HTTPS connections on port " + this.config.https.listenPort);
  }

  stop(done) {
    async.parallel({
      https: (function(cb) {
        console.log("stopping https");
        this.https.close(cb);
      }).bind(this),

      wss: (function(cb) {
        setImmediate((function() {
          console.log("stopping wss");
          this.wss.shutDown();
          cb();
        }).bind(this));
      }).bind(this)
    }, (function(err, r) {
      console.log("destroying rooms");
      this.rooms.destroyAllRooms();
      console.log("shutdown complete");
      done();
    }).bind(this));
  }
}

module.exports = TripcamServer;
