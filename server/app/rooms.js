var EventEmitter = require('events').EventEmitter;

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

    // Install message listener
    cn.on('message', (function(message) {
      this.refreshActivity();

      if (message.type == 'utf8') {
        this.handleJSON(JSON.parse(message.utf8Data));
      } else if (message.type == 'binary') {
        this.handleBinary(message.binaryData);
      }
    }).bind(this));

    // Send hello
    var hello = {
      messageType: 'hello',
      clientid: clientid
    };

    cn.sendUTF(JSON.stringify(hello));





    //cn.sendUTF({ 'clientid': \"" + clientid + "\" }");
    //cn.sendUTF(JSON.stringify({ 'clientid' : clientid }));
    //cn.sendBytes(new Buffer("test"));

    // cn.on('message', (message => {
    //   console.log('websocket message received from: ' + cn.remoteAddress);
    //   console.log(message);
    // }).bind(this));

    // cn.on('close', ((rc, d) => {
    //   console.log((new Date()) + ' websocket connection closed: ' + cn.remoteAddress);
    // }).bind(this));
  }

  handleJSON(message) {
    
  }

  handleBinary(data) {

  }

  destroy() {
    clearInterval(this.activityInterval);
    console.log("Destroyed room: ", this.roomid);
  }
}


module.exports.Rooms = Rooms;
module.exports.Room = Room;
