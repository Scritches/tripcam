var pageResources;

var camSize = { width: 320, height:240 };
var desiredFps = 15;
var delayPerFrame = 1000 / desiredFps;
var cameraQuality = 0.75;
var debug = false;

var forceKeyframeMS = 500;


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
  this.el_image.width = camSize.width;
  this.el_image.height = camSize.height;

  this.el.appendChild(this.el_username = document.createElement('div'));
  this.el_username.className = 'username';
  this.el_username.innerText = this.username;

  this.imageDblClickHandler = function() {
    this.emit('dblclick', this);
  }.bind(this);


  this.keyFrameCanvas = document.createElement('canvas');
  this.keyFrameCanvas.width = camSize.width;
  this.keyFrameCanvas.height = camSize.height;
  this.keyFrameContext = this.keyFrameCanvas.getContext('2d');
  this.keyFrameData = null;

  this.diffFrameCanvas = document.createElement('canvas');
  this.diffFrameCanvas.width = camSize.width;
  this.diffFrameCanvas.height = camSize.height;
  this.diffFrameGlsl = new GlslCanvas(this.diffFrameCanvas, { preserveDrawingBuffer: true });
  this.diffFrameGlsl.width = camSize.width;
  this.diffFrameGlsl.height = camSize.height;

  this.diffFrameGlsl.load(decompressShader());

  pageResources.renderContainer.appendChild(this.diffFrameCanvas);
}

VideoDisplay.prototype = _.clone(EventEmitter.prototype);

VideoDisplay.prototype.detach = function() {
  if(this.container) {
    this.el_image.removeEventListener('dblclick', this.imageDblClickHandler);
    this.container.removeChild(this.el);
    this.container = null;
    this.hasKeyframe = false;
  }
}

VideoDisplay.prototype.attach = function(container) {
  if(this.container) {
    this.detach();
  }

  container.appendChild(this.el);
  this.container = container;

  this.el_image.addEventListener('dblclick', this.imageDblClickHandler);
}

VideoDisplay.prototype.updateName = function(username) {
  if(username && this.username !== username) {
    this.username = username
    this.el_username.innerText = this.username;
  }
}

VideoDisplay.prototype.updateFrame = function(frame, isLocal) {
  if(this.container) {
    // No point updating the current frame if the display isn't attached to the document
    if(frame === '') {
      if(this.el_image.src != pageResources.offlineImage.src) this.el_image.src = pageResources.offlineImage.src;
    } else {
      if(isLocal) {
        this.el_image.src = frame;
        return;
      }

      if (!this.keyFrameData && !frame.isKeyframe) return;
      if (frame.isKeyframe) {
        this.keyFrameData = frame.data;
        this.el_image.src = frame.data;
        return;
      }

      this.diffFrameGlsl.setUniform('u_keyframe', this.keyFrameData);
      this.diffFrameGlsl.setUniform('u_diffframe', frame.data);
      console.log(frame.data);
      this.el_image.src = this.diffFrameCanvas.toDataURL('image/jpeg', cameraQuality);
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

    var imgs = this.container.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].width = cellSize.width;
      imgs[i].height = cellSize.height;
    }

    var nameLabels = document.querySelectorAll('.username');
    for (var i = 0; i < nameLabels.length; i++) {
      nameLabels[i].setAttribute('style', 'width: ' + cellSize.width + 'px;');
    }
  };


}








window.addEventListener('load', function() {

  // Gather resources
  pageResources = {
    bodyElement: document.getElementsByTagName('body')[0],
    offlineImage: document.getElementById('offline'),
    toggleCameraButton: document.getElementById('cameraToggle'),
    usernameElement: document.getElementById('username'),
    usernameChangeButton: document.getElementById('changeUsername'),
    renderContainer: document.getElementById('roomFeed'),
    bpsDisplay: document.getElementById('bps'),

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

  function updateUsernameDisplay() {
    pageResources.usernameElement.innerText = '[ ' + username + ' ] ';
  }

  pageResources.usernameChangeButton.addEventListener('click', function() {
    var newName = window.prompt('Enter a new username:', username)
    if (newName && newName != username) {
      username = newName;
      updateUsernameDisplay();

      window.localStorage.setItem('username', username);

      if (connected) sendMessage({
        messageType: 'changeName',
        username: username
      });

      pageResources.localDisplay.updateName(username);
    }
  });

  updateUsernameDisplay();

  // local camera handling
  var cameraResources = {
    cameraOn: false,
    stream: null
  };

  pageResources.toggleCameraButton.addEventListener('click', function() {
    pageResources.toggleCameraButton.disabled = true;
    if (!cameraResources.cameraOn) {
      navigator.mediaDevices.getUserMedia({
        video: { width: camSize.width, height: camSize.height },
        audio: false
      }).then(function(stream) {
        pageResources.videoElement.srcObject = cameraResources.stream = stream;
        pageResources.toggleCameraButton.innerText = 'Turn Camera Off';
        cameraResources.cameraOn = true;
        pageResources.toggleCameraButton.disabled = false;
        window.requestAnimationFrame(captureCameraLoop);
      },function(error) {
        console.log(error);
        pageResources.toggleCameraButton.disabled = false;
      });
    } else {
      pageResources.videoElement.srcObject = null;
      cameraResources.stream.getTracks().forEach(function(t) { t.stop(); });
      cameraResources.stream = null;
      pageResources.toggleCameraButton.innerText = 'Turn Camera On';
      cameraResources.cameraOn = false;
      pageResources.toggleCameraButton.disabled = false;
      if (connected) sendMessage({
        messageType: 'cameraOff'
      });
    }
  });


  function captureCamera() {
    ctx.drawImage(pageResources.videoElement,0,0,camSize.width,camSize.height);
    pageResources.localDisplay.updateFrame(pageResources.recordCanvas.toDataURL('image/jpeg', .85), true);
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
  setInterval(function() {
    if(!connected) {
      frames = [];
      pageResources.bpsDisplay.innerText = ' * Disconnected *';
    } else {
      var sentStr = bytesSent > 2048
        ? Math.floor(bytesSent / 1024) + ' KB sent'
        : bytesSent + ' bytes sent';

      var recvStr = bytesRcvd > 2048
        ? Math.floor(bytesRcvd / 1024) + ' KB recv'
        : bytesRcvd + ' bytes recv';

      pageResources.bpsDisplay.innerText = ' ' + sentStr + ' - ' + recvStr;
    }

    bytesSent = 0;
    bytesRcvd = 0;
  }, 1000);

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




  var doKeyframe = true;

  if(forceKeyframeMS != -1)  setInterval(function() { doKeyframe = true; }, forceKeyframeMS);

  var diffCanvas = document.createElement('canvas');
  diffCanvas.width = camSize.width;
  diffCanvas.height = camSize.height;
  var diffGlsl = new GlslCanvas(diffCanvas, { preserveDrawingBuffer: true });
  diffGlsl.width = camSize.width;
  diffGlsl.height = camSize.height;

  diffGlsl.load(compressShader());

  var keyFrameCanvas = document.createElement('canvas');
  keyFrameCanvas.width = camSize.width;
  keyFrameCanvas.height = camSize.height;
  var keyFrameContext = keyFrameCanvas.getContext('2d');

  pageResources.renderContainer.appendChild(keyFrameCanvas);
  pageResources.renderContainer.appendChild(diffCanvas);
  var asdfImage = new Image();
  asdfImage.width = camSize.width;
  asdfImage.height = camSize.height;
  pageResources.renderContainer.appendChild(asdfImage);


  var keyframeIndex = 0;
  var keyFrameDataUrl;

  function record() {
    if (connected && cameraResources.cameraOn) {
      if (doKeyframe) {
        doKeyframe = false;
        var data = ctx.getImageData(0,0,camSize.width,camSize.height);
        keyFrameContext.putImageData(data, 0, 0);
        keyFrameDataUrl = keyFrameCanvas.toDataURL('image/jpeg', cameraQuality);

        sendMessage({
          messageType: 'frame',
          frame: {
            isKeyframe: true,
            index: ++keyframeIndex,
            data: keyFrameDataUrl
          }
        });
      } else {
        diffGlsl.setUniform('u_currentframe', pageResources.recordCanvas.toDataURL('image/jpeg', cameraQuality));
        diffGlsl.setUniform('u_keyframe', keyFrameDataUrl);
        var diffDataUrl = diffCanvas.toDataURL('image/jpeg', cameraQuality * .75);
        asdfImage.src = diffDataUrl;

        sendMessage({
          messageType: 'frame',
          frame: {
            isKeyframe: false,
            data: diffDataUrl
          }
        });
      }
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


function compressShader() {
  return `
  precision highp float;

  uniform sampler2D u_keyframe;
  uniform sampler2D u_currentframe;
  uniform vec2 u_resolution;

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 kfcolor = texture2D(u_keyframe, st).rgb;
    vec3 cfcolor = texture2D(u_currentframe, st).rgb;
    vec3 dfcolor = ((cfcolor - kfcolor) / 2.0) + 0.5;

    gl_FragColor = vec4(dfcolor, 1.0);
  }`;
}

function decompressShader() {
  return `
  precision highp float;

  uniform sampler2D u_keyframe;
  uniform sampler2D u_diffframe;
  uniform vec2 u_resolution;

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 kfcolor = texture2D(u_keyframe, st).rgb;
    vec3 dfcolor = texture2D(u_diffframe, st).rgb;
    vec3 cfcolor = (2.0 * (dfcolor - 0.5)) + kfcolor;

    gl_FragColor = vec4(cfcolor, 1.0);
  }`;
}
