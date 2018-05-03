var pageResources;

var camSize = { width: 240, height:180 };
var desiredFps = 15;
var delayPerFrame = 1000 / desiredFps;
var cameraQuality = 0.50;
var debug = false;


function VideoDisplay(clientId, username) {
  if(debug) console.log('new video display: ', clientId);
  this.clientId = clientId;
  this.username = username;

  this.container = null;

  this.el = document.createElement('div');
  this.el.className = 'videoFrame';
  this.el.id = clientId;

  this.el.appendChild(this.el_frame = document.createElement('div'));
  this.el_frame.className = 'frame';

  this.el_frame.appendChild(this.el_image = new Image());
  this.el_image.className = 'video';
  this.el_image.width = camSize.width;
  this.el_image.height = camSize.height;

  this.el.appendChild(this.el_username = document.createElement('div'));
  this.el_username.className = 'username';
  this.el_username.innerText = this.username;

  if (clientId == 'local') {
    this.el_username.className = 'username localDisplay';
    this.el_username.setAttribute('title', 'Click to edit your name.');

    this.el_frame.appendChild(this.el_camButton = new Image());
    this.el_camButton.width = 32;
    this.el_camButton.height = 32;
    this.el_camButton.src = '/images/video-camera-icon.png';
    this.el_camButton.className = 'camButton';
    this.el_camButton.setAttribute('title', 'Click to toggle your camera.');
  }


  this.usernameClickHandler = function() {
    this.emit('usernameClicked', this);
  }.bind(this);

  this.imageDblClickHandler = function() {
    this.emit('dblclick', this);
  }.bind(this);

  this.toggleCameraClickHandler = function() {
    this.emit('toggleCameraClicked', this);
  }.bind(this);
}

VideoDisplay.prototype = _.clone(EventEmitter.prototype);

VideoDisplay.prototype.detach = function() {
  if(this.container) {
    this.el_image.removeEventListener('dblclick', this.imageDblClickHandler);
    if(this.clientId == 'local') {
      this.el_username.removeEventListener('click', this.usernameClickHandler);
      this.el_camButton.removeEventListener('click', this.toggleCameraClickHandler);
    }
    this.container.removeChild(this.el);
    this.container = null;
  }
}

VideoDisplay.prototype.attach = function(container) {
  if(this.container) {
    this.detach();
  }

  container.appendChild(this.el);
  this.container = container;

  this.el_image.addEventListener('dblclick', this.imageDblClickHandler);
  if(this.clientId == 'local') {
    this.el_username.addEventListener('click', this.usernameClickHandler);
    this.el_camButton.addEventListener('click', this.toggleCameraClickHandler);
  }
}

VideoDisplay.prototype.updateName = function(username) {
  if(username && this.username !== username) {
    this.username = username
    this.el_username.innerText = this.username;
  }
}

VideoDisplay.prototype.updateFrame = function(frame) {
  if(this.container) {
    // No point updating the current frame if the display isn't attached to the document
    if(frame === '') {
      if(this.el_image.src != pageResources.offlineImage.src) this.el_image.src = pageResources.offlineImage.src;
    } else {
      this.el_image.src = frame;
    }
  }
}



var frameLayouts = function() {
  var r = [];
  r[0] = null;
  for (var cams = 1; cams <= 16; cams++) {
    switch (cams) {
      case 1: case 2:                     r[cams] = { rows: 1, cols: 2 }; break;
      case 3: case 4:                     r[cams] = { rows: 2, cols: 2 }; break;
      case 5: case 6:                     r[cams] = { rows: 2, cols: 3 }; break;
      case 7: case 8: case 9:             r[cams] = { rows: 3, cols: 3 }; break;
      case 10: case 11: case 12:          r[cams] = { rows: 3, cols: 4 }; break;
      case 13: case 14: case 15: case 16: r[cams] = { rows: 4, cols: 4 }; break;
    }
  }
  return r;
}();



function RoomLayout(container, localDisplay) {
  this.container = container;
  this.localDisplay = localDisplay;
  this.remoteDisplays = { };
  this.fullScreenDisplay = null;
  var numDisplays = 0;

  this.displayDblClicked = function(display) {
    if (this.fullScreenDisplay === display) {
      this.fullScreenDisplay = null;
      this.layoutChanged();
    } else {
      this.fullScreenDisplay = display;
      this.layoutChanged();
    }
  };

  this.localDisplay.on('dblclick', this.displayDblClicked.bind(this));

  this.renderFrames = function(frames) {
    var layoutChanged = false;

    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      let remote = this.remoteDisplays[frame.clientId];

      if (!remote) {
        layoutChanged = true;
        remote = new VideoDisplay(frame.clientId, frame.username);
        remote.on('dblclick', this.displayDblClicked.bind(this));
        this.remoteDisplays[frame.clientId] = remote;
        numDisplays++;
      }

      remote.updateFrame(frame.frame);
      remote.updateName(frame.username);
    }

    var currentClientIds = _.pluck(this.remoteDisplays, 'clientId');
    var frameClientIds = _.pluck(frames, 'clientId');
    var offline = _.difference(currentClientIds, frameClientIds);

    for (var i = 0; i < offline.length; i++) {
      layoutChanged = true;
      let remote = this.remoteDisplays[offline[i]];
      if (this.fullScreenDisplay == remote) this.fullScreenDisplay = null;
      remote.detach();
      delete this.remoteDisplays[offline[i]];
      numDisplays--;
    }

    if (layoutChanged) {
      this.layoutChanged();
    }
  };

  this.currentFrameLayout = null;
  this.currentLayout = null;
  this.layoutChanged = function() {
    var newFrameLayout = frameLayouts[numDisplays + 1];
    if (this.currentFrameLayout == null && newFrameLayout == null) {
      return;
    }

    if (this.fullScreenDisplay) newFrameLayout = { rows: 1, cols: 1 };

    // Create the new layout and assign video display elements to the cells
    var newLayout = document.createElement('div');
    newLayout.className = 'roomLayout';

    var remoteDisplayIndex = 0;
    var remoteDisplayClientIds = _.pluck(this.remoteDisplays, 'clientId');

    for (var rowNum = 0; rowNum < newFrameLayout.rows; rowNum++) {
      // Create row element
      var row = document.createElement('div');
      newLayout.appendChild(row);
      row.className = 'feedRow';

      for (var colNum = 0; colNum < newFrameLayout.cols; colNum++) {
        // Create column element
        var col = document.createElement('div');
        row.appendChild(col);
        col.className = 'feedCol';

        // Populate cell
        if (rowNum == 0 && colNum == 0) {
          // This is where the local display (or the full screen display) needs to be homed.
          if (this.fullScreenDisplay) {
            this.fullScreenDisplay.attach(col);
          } else {
            this.localDisplay.attach(col);
          }
        } else {
          // This cell belongs to a remote display.
          if (remoteDisplayIndex < numDisplays) {
            this.remoteDisplays[remoteDisplayClientIds[remoteDisplayIndex]].attach(col);
            remoteDisplayIndex++;
          } else {
            new VideoDisplay('','').attach(col);
          }
        }
      }
    }

    if (this.currentLayout) this.container.removeChild(this.currentLayout);
    this.container.appendChild(newLayout);
    this.currentLayout = newLayout;
    this.currentFrameLayout = newFrameLayout;
    this.resized();
  };

  this.resized = function() {
    var containerSize = { width: this.container.clientWidth - 10, height: this.container.clientHeight - 10 };

    var cellSize = {
      width: Math.floor(containerSize.width / this.currentFrameLayout.cols) - 20, // -20 for border components
      height: Math.floor(containerSize.height / this.currentFrameLayout.rows) - 20 //-20 for username label height
    };

    if(!this.fullScreenDisplay) {
      if(cellSize.width > camSize.width * 2) cellSize.width = camSize.width * 2;
    }

    if(cellSize.width / cellSize.height > camSize.width / camSize.height) {
      cellSize.width = cellSize.height * (camSize.width / camSize.height);
    }

    if (cellSize.height / cellSize.width > camSize.height / camSize.width) {
      cellSize.height = cellSize.width * (camSize.height / camSize.width);
    }

    var imgs = this.container.getElementsByClassName('video');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].width = cellSize.width;
      imgs[i].height = cellSize.height;
    }

    var nameLabels = document.querySelectorAll('.username');
    for (var i = 0; i < nameLabels.length; i++) {
      //nameLabels[i].style.width = cellSize.width;
      nameLabels[i].setAttribute('style', 'width: ' + cellSize.width + 'px;');
    }
  };


}








window.addEventListener('load', function() {

  // Gather resources
  pageResources = {
    bodyElement: document.getElementsByTagName('body')[0],
    offlineImage: document.getElementById('offline'),
    renderContainer: document.getElementById('roomFeed'),

    videoElement: document.createElement('video'),
    recordCanvas: document.createElement('canvas'),

    localDisplay: null,
    roomLayout: null
  };

  // Set up initial values for resources
  pageResources.videoElement.autoplay = true;
  pageResources.videoElement.height = camSize.height;
  pageResources.videoElement.width = camSize.width;

  pageResources.recordCanvas.height = camSize.height;
  pageResources.recordCanvas.width = camSize.width;

  var ctx = pageResources.recordCanvas.getContext('2d');
  ctx.drawImage(pageResources.offlineImage, 0, 0, camSize.width, camSize.height);

  // handle window resizing
  window.addEventListener('resize', doResize);
  function doResize() {
    pageResources.roomLayout.resized();
  }

  // Username handling functions
  var username = window.localStorage.getItem('username') || generateName();

  function getNewUsername() {
    var newName = window.prompt('Enter a new username:', username)
    if (newName && newName != username) {
      username = newName;

      window.localStorage.setItem('username', username);

      if (connected) sendMessage({
        messageType: 'changeName',
        username: username
      });

      pageResources.localDisplay.updateName(username);
    }
  }

  // local camera handling
  var cameraResources = {
    cameraOn: false,
    stream: null
  };

  function turnCameraOn() {
    navigator.mediaDevices.getUserMedia({
      video: { width: camSize.width, height: camSize.height },
      audio: false
    }).then(function(stream) {
      pageResources.videoElement.srcObject = cameraResources.stream = stream;
      cameraResources.cameraOn = true;
      window.requestAnimationFrame(captureCameraLoop);
    },function(error) {
      console.log(error);
    });
  }

  function turnCameraOff() {
    if (cameraResources.cameraOn) {
      pageResources.videoElement.srcObject = null;
      cameraResources.stream.getTracks().forEach(function(t) { t.stop(); });
      cameraResources.stream = null;
      cameraResources.cameraOn = false;
      if (connected) sendMessage({
        messageType: 'cameraOff'
      });
    }
  }

  function captureCamera() {
    ctx.drawImage(pageResources.videoElement,0,0,camSize.width,camSize.height);
    pageResources.localDisplay.updateFrame(pageResources.recordCanvas.toDataURL('image/jpeg', .85));
  }

  function captureCameraLoop() {
    if (cameraResources.cameraOn) {
      captureCamera();
      window.requestAnimationFrame(captureCameraLoop);
    } else {
      ctx.drawImage(pageResources.offlineImage,0,0,camSize.width,camSize.height);
      pageResources.localDisplay.updateFrame('');
    }
  }


  pageResources.localDisplay = new VideoDisplay('local', username);

  pageResources.localDisplay.on('usernameClicked', function() {
    getNewUsername();
  });

  pageResources.localDisplay.on('toggleCameraClicked', function() {
    if (!cameraResources.cameraOn) {
      turnCameraOn();
    } else {
      turnCameraOff();
    }
  })

  pageResources.roomLayout = new RoomLayout(pageResources.renderContainer, pageResources.localDisplay);

  setTimeout(function() {
    pageResources.localDisplay.updateFrame('');
  }, 1);


  // Room server socket handling
  var connected = false;
  var frames = [];
  var socket = new WebSocket(serverAddress + '/room/' + roomid, 'room-protocol');

  var bytesSent = 0;
  var bytesRcvd = 0;
  if (debug) {
    setInterval(function() {
      if(connected) {
        var sentStr = bytesSent > 2048
          ? Math.floor(bytesSent / 1024) + ' KBps sent'
          : bytesSent + ' bps sent';

        var recvStr = bytesRcvd > 2048
          ? Math.floor(bytesRcvd / 1024) + ' KBps recv'
          : bytesRcvd + ' bps recv';

        console.log(sentStr + ' - ' + recvStr);
      }

      bytesSent = 0;
      bytesRcvd = 0;
    }, 1000);
  }

  function sendMessage(msg) {
    if (debug) console.log('-> ', msg);
    var out = JSON.stringify(msg);
    bytesSent += out.length;
    socket.send(out);
  }

  socket.onopen = function() {
    sendMessage({
      messageType: 'connect',
      username: username
    });
  }

  socket.onclose = function() {
    connected = false;
    pageResources.bodyElement.style.backgroundColor = '#990000';
    frames = [];
    turnCameraOff();
  }

  socket.onmessage = function(e) {
    bytesRcvd += e.data.length;
    var msg = JSON.parse(e.data);
    if (debug) console.log('<- ', msg);

    if (msg.messageType == 'hello') {
      connected = true;
      window.requestAnimationFrame(mainProcLoop);
      setInterval(function() {
        if (connected) sendMessage({
          messageType: 'keepalive'
        });
      }, 1000);
    }

    if (msg.messageType == 'frames') {
      frames = msg.frames;
      frames = frames == [] ? frames : JSON.parse(pako.inflate(frames, { to: 'string' }));

      captureCamera();
      mainProc();
    }
  }



  function record() {
    if (connected && cameraResources.cameraOn) {
      var frameData = pageResources.recordCanvas.toDataURL('image/jpeg', cameraQuality);
      sendMessage({
        messageType: 'frame',
        frame: frameData
      });
    }
  }


  var lastProc = Date.now();
  function mainProc() {
    var delta = Date.now() - lastProc;
    if (delta > delayPerFrame) {
      lastProc = Date.now();
      record();
      pageResources.roomLayout.renderFrames(frames);
    }
  }

  function mainProcLoop() {
    mainProc();
    window.requestAnimationFrame(mainProcLoop);
  }

  pageResources.roomLayout.layoutChanged();
  pageResources.roomLayout.resized();
});
