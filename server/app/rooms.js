const EventEmitter = require('events').EventEmitter,
      _ = require('lodash')._,
      pako = require('pako');

class Rooms {
  constructor(config) {
    this.config = config;
    this.rooms = { };
  }

  createRoom(roomid) {
    var room;
    if(this.rooms[roomid]) {
      var room = this.rooms[roomid];
      room.refreshActivity();
      return room;
    }

    this.rooms[roomid] = room = new Room(roomid, this.config);

    room.on('inactive', (function() {
      this.destroyRoom(roomid);
    }).bind(this));

    return room;
  }

  destroyRoom(roomid) {
    if (this.rooms[roomid]) {
      var room = this.rooms[roomid];
      room.destroy();

      delete this.rooms[roomid];
    }
  }

  newClient(roomid, clientid, cn) {
    if (this.rooms[roomid]){
      var room = this.rooms[roomid];
      room.newClient(clientid, cn);
    }
  }

  destroyAllRooms() {
    for(var room in this.rooms) {
      this.destroyRoom(room.roomid);
    }
  }
}



class Room extends EventEmitter {
  constructor(roomid, config) {
    super();
    this.roomid = roomid;
    this.config = config;

    this.clients = { };

    this.lastActivity = (new Date()).getTime();

    this.activityInterval = setInterval((function() {
      if(!this.isStillActive) {
        this.emit('inactive');
      }
    }).bind(this), 1000);

    var dpf = 1000 / this.config.serverFps;
    this.emitInterval = setInterval((function() {
      this.emitFrames();
    }).bind(this), dpf);

    console.log("Created new room: ", roomid);
  }

  get isStillActive() {
    var now = (new Date()).getTime();
    var elapsed = now - this.lastActivity;

    return elapsed < this.config.activityTimeout;
  }

  refreshActivity() {
    this.lastActivity = (new Date()).getTime();
  }

  broadcast(msg, fromClientId) {
    var msgString = JSON.stringify(msg);
    for(var clientId in this.clients) {
      if (fromClientId && fromClientId == clientId) continue;
      var client = this.clients[clientId];
      client.socket.sendUTF(msgString);
    }
  }


  newClient(clientId, socket) {
    this.refreshActivity();

    var client = new Client(clientId, socket);
    client.on('message', this.refreshActivity.bind(this));
    client.on('connect', this.handleConnect.bind(this));
    client.on('disconnect', this.handleDisconnect.bind(this));
    client.on('chat', this.handleChat.bind(this));
  }

  handleConnect(username, client) {
    client.sendMessage({
      messageType: 'hello',
      clientVersion: '0.6'
     });
    this.clients[client.clientId] = client;
  }

  handleDisconnect(clientId) {
    if (this.clients[clientId]) {
      delete this.clients[clientId];
    }
  }

  handleChat(clientId, username, text) {
    this.broadcast({
      messageType: 'chat',
      clientId: clientId,
      username: username,
      text: text
    }, clientId);
  }


  emitFrames() {
    for(var clientId in this.clients) {
      var client = this.clients[clientId]
      var frames = this.buildFramesFor(clientId);

      if(frames != null) {
        if (this.config.allowCompression && frames) {
          frames = pako.deflate(JSON.stringify(frames), { to: 'string' });
        }
        client.sendMessage({
          messageType: 'frames',
          frames: frames
        });
      }
    }
  }

  buildFramesFor(clientId) {
    var otherClients = _(this.clients)
      .filter(c => c.clientId != clientId);

    var frames = [];
    otherClients.each(c => {
      frames.push({
        clientId: c.clientId,
        username: c.username,
        frame: c.lastFrame || ''
      });
    })

    return frames;
  }


  destroy() {
    clearInterval(this.activityInterval);
    clearInterval(this.emitInterval);

    _.each(this.clients, c => {
      c.socket.close();
    });

    console.log("Destroyed room: ", this.roomid);
  }
}


class Client extends EventEmitter {
  constructor(clientId, socket) {
    super();

    this.clientId = clientId;
    this.socket = socket;
    this.lastFrame = '';
    this.username = clientId;

    socket.on('message', (function(msg) {
      if (msg.type == 'utf8') {
        msg = JSON.parse(msg.utf8Data);
        this.handleMessage(msg);
      }
    }).bind(this));

    socket.on('close', this.handleDisconnect.bind(this));
  }

  sendMessage(msg) {
    if(msg.messageType != 'frames') {
      console.log('-> ', msg, ' : ', this.username);
    }

    this.socket.sendUTF(JSON.stringify(msg));
  }

  handleMessage(msg) {
    if(msg.messageType != 'frame' && msg.messageType != 'keepalive') {
      console.log('<- ', msg, ' : ', this.username);
    }

    this.emit('message');

    switch(msg.messageType) {
      case 'connect': {
        this.username = msg.username;
        this.emit('connect', msg.username, this);
        return;
      }

      case 'changeName': {
        this.username = msg.username;
        this.emit('changeName', this.username, this.clientId);
        return;
      }

      case 'frame': {
        delete this.lastFrame;
        this.lastFrame = msg.frame;
        return;
      }

      case 'cameraOff': {
        delete this.lastFrame;
        this.lastFrame = '';
        this.emit('cameraOff', this.clientId);
        return;
      }

      case 'chat': {
        this.emit('chat', this.clientId, this.username, msg.text)
      }
    }
  }

  handleDisconnect() {
    console.log('Client', this.clientId,' : ', this.username, 'disconnected');
    delete this.lastFrame;
    this.lastFrame = '';
    this.emit('disconnect', this.clientId);
  }

}

module.exports.Rooms = Rooms;
module.exports.Room = Room;
