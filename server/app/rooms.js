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

  newClient(clientid, cn) {
    this.refreshActivity();

    var client = {
      clientid: clientid,
      cn: cn,
      lastFrame: null
    };

    this.clients[clientid] = client;

    // Install message listener
    cn.on('message', (function(message) {
      this.refreshActivity();

      if (message.type == 'utf8') {
        this.handleJSON(client, JSON.parse(message.utf8Data));
      } else if (message.type == 'binary') {
        client.lastFrame = message.binaryData;
      }
    }).bind(this));

    // Install disconnect listener
    cn.on('close', (function() {
      this.removeClient(client);
    }).bind(this));

    // Send hello
    var hello = {
      messageType: 'hello',
      clientid: clientid
    };

    cn.sendUTF(JSON.stringify(hello));
  }

  removeClient(client) {
    delete this.clients[client.clientid];
  }

  handleJSON(client, message) {

  }

  emitFrames() {
    for(var clientid in this.clients) {
      var client = this.clients[clientid]
      var out = this.buildFramesFor(client);
      if(out != null) {
        client.cn.sendBytes(out);
      }
    }
  }

  buildFramesFor(client) {
    var otherClients = _(this.clients)
      .filter(c => c.clientid != client.clientid)
      .filter(c => c.lastFrame != null);

    var bufferLength = otherClients
      .reduce((r, c) => r + 2 + c.lastFrame.length, 0);

    if(bufferLength == 0) return null;

    var buffer = otherClients
      .reduce((r, c) => {
        r.buffer.writeUInt16BE(c.lastFrame.length, r.cursor);
        r.cursor += 2;
        c.lastFrame.copy(r.buffer, r.cursor);
        r.cursor += c.lastFrame.length
        return r;
      }, { cursor: 0, buffer: Buffer.alloc(bufferLength) })
      .buffer;

    return buffer;
  }

  destroy() {
    clearInterval(this.activityInterval);
    clearInterval(this.emitInterval);
    console.log("Destroyed room: ", this.roomid);
  }
}


module.exports.Rooms = Rooms;
module.exports.Room = Room;
