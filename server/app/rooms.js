const EventEmitter = require('events').EventEmitter,
      _ = require('lodash')._;

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
      if (fromClientId && fromClientId == clientid) continue;
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
  }

  handleConnect(username, client) {
    client.sendMessage({ messageType: 'hello' });
    this.clients[client.clientId] = client;
  }

  handleDisconnect(clientId) {
    console.log('client ', clientId, ' disconnected');
    if(this.clients[clientId]) {
      console.log('deleting client');
      delete this.clients[clientId];
    }
  }


  emitFrames() {
    for(var clientId in this.clients) {
      var client = this.clients[clientId]
      var frames = this.buildFramesFor(clientId);
      if(frames != null) {
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
    this.socket.sendUTF(JSON.stringify(msg));
  }

  handleMessage(msg) {
    if(msg.messageType != 'frame') {
      console.log('<- ', msg);
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
        this.lastFrame = msg.frame;
        return;
      }

      case 'cameraOff': {
        this.lastFrame = '';
        this.emit('cameraOff', this.clientId);
        return;
      }
    }
  }

  handleDisconnect() {
    console.log("Client disconnected");
    this.lastFrame = '';
    this.emit('disconnect', this.clientId);
  }

}





  // broadcast(message, fromClient) {
  //   var msgString = JSON.stringify(message);
  //   for(var clientid in this.clients) {
  //     if (fromClient && fromClient.clientid == clientid) continue;
  //     var client = this.clients[clientid];
  //     client.cn.sendUTF(msgString);
  //   }
  // }
  //
  // removeClient(client) {
  //   delete this.clients[client.clientid];
  // }
  //
  // handleJSON(client, message) {
  //   console.log("client ",client.clientid, " sends ", message);
  //
  //   switch(message.messageType) {
  //     case 'cameraoff': {
  //       client.lastFrame = null;
  //       this.broadcast(message, client);
  //       return;
  //     }
  //
  //     case 'changename': {
  //       client.username = message.newName;
  //       this.broadcast(message, client);
  //       return;
  //     }
  //   }
  //
  // }
  //
  // emitFrames() {
  //   for(var clientid in this.clients) {
  //     var client = this.clients[clientid]
  //     var out = this.buildFramesFor(client);
  //     if(out != null) {
  //       client.cn.sendBytes(out);
  //     }
  //   }
  // }
  //
  // buildFramesFor(client) {
  //   var otherClients = _(this.clients)
  //     //.filter(c => c.clientid != client.clientid)
  //     .filter(c => c.lastFrame != null);
  //
  //   var bufferLength = otherClients
  //     .reduce((r, c) => r + 2 + c.lastFrame.length, 0);
  //
  //   if(bufferLength == 0) return null;
  //
  //   var buffer = otherClients
  //     .reduce((r, c) => {
  //       r.buffer.writeUInt16BE(c.lastFrame.length, r.cursor);
  //       r.cursor += 2;
  //       c.lastFrame.copy(r.buffer, r.cursor);
  //       r.cursor += c.lastFrame.length
  //       return r;
  //     }, { cursor: 0, buffer: Buffer.alloc(bufferLength) })
  //     .buffer;
  //
  //   return buffer;
  // }
  //
  // destroy() {
  //   clearInterval(this.activityInterval);
  //   clearInterval(this.emitInterval);
  //
  //   _.each(this.clients, c => {
  //     c.cn.close();
  //   });
  //
  //   //this.clients = null;
  //
  //   console.log("Destroyed room: ", this.roomid);
  // }
//}







module.exports.Rooms = Rooms;
module.exports.Room = Room;
