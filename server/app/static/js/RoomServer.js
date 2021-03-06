function RoomServer(serverUrl) {
  this.serverUrl = serverUrl;
  this.socket = null;
  this.connected = false;
  this.keepAlive = null;
}

RoomServer.prototype = _.clone(EventEmitter.prototype);

RoomServer.prototype.connect = function(username) {
  this.socket = new WebSocket(this.serverUrl, 'room-protocol');

  this.socket.onopen = function() {
    this.send({
      messageType: 'connect',
      username: username
    })
  }.bind(this);

  this.socket.onclose = function() {
    this.connected = false;
    clearInterval(this.keepAlive);
    this.socket = null;
    this.emit('disconnected');
  }.bind(this);

  this.socket.onmessage = function(e) {
    this.emit('message-received', e.data);
    var msg = JSON.parse(e.data);

    if (msg.messageType == 'hello') {
      this.connected = true;
      this.emit('connected', msg.clientVersion);

      this.keepAlive = setInterval(function() {
        this.send({
          messageType: 'keepalive'
        });
      }.bind(this), 1000);
    }

    if (msg.messageType == 'frames') {
      var frames = msg.frames;
      if (useCompression && frames) {
        frames = JSON.parse(pako.inflate(frames, { to: 'string' }));
      }

      this.emit('new-frames', frames);
    }

    if (msg.messageType == 'chat') {
      this.emit('chat-received', msg);
    }

  }.bind(this);
};

RoomServer.prototype.send = function(message) {
  var out = JSON.stringify(message);
  this.socket.send(out);
  this.emit('message-sent', out);
};

RoomServer.prototype.changeName = function(newName) {
  if (this.connected)
    this.send({
      messageType: 'changeName',
      username: newName
    });
}

RoomServer.prototype.cameraOff = function() {
  if (this.connected)
    this.send({
      messageType: 'cameraOff'
    });
}

RoomServer.prototype.sendFrame = function(frameData) {
  if (this.connected)
    this.send({
      messageType: 'frame',
      frame: frameData
    });
}

RoomServer.prototype.sendChat = function(text) {
  if (this.connected)
    this.send({
      messageType: 'chat',
      text: text
    });
}
