window.addEventListener('load', function() {

  var camSize = { width: 320, height: 240 };
  var desiredFps = 20;
  var delayPerFrame = 1000 / desiredFps;
  var cameraQuality = 0.5;
  var debug = false;

  // Gather resources
  var pageResources = {
    offlineImage: document.getElementById('offline'),
    toggleCameraButton: document.getElementById('cameraToggle'),
    usernameElement: document.getElementById('username'),
    usernameChangeButton: document.getElementById('changeUsername'),
    renderContainer: document.getElementById('roomFeed'),

    videoElement: document.createElement('video'),
    recordCanvas: document.createElement('canvas'),

    remoteImages: []
  };

  // Prepare the record canvas
  pageResources.renderContainer.appendChild(pageResources.recordCanvas);

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
    fixLayout();
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
  }

  function captureCameraLoop() {
    if (cameraResources.cameraOn) {
      captureCamera();
      window.requestAnimationFrame(captureCameraLoop);
    } else {
      ctx.drawImage(pageResources.offlineImage,0,0,camSize.width,camSize.height);
    }
  }

  // Room server socket handling
  var connected = false;
  var frames = [];
  var socket = new WebSocket(serverAddress + '/room/' + roomid, 'room-protocol');

  function sendMessage(msg) {
    if (debug) console.log('-> ', msg);
    socket.send(JSON.stringify(msg));
  }

  socket.onopen = function() {
    sendMessage({
      messageType: 'connect',
      username: username
    });
  }

  socket.onclose = function() {
    connected = false;
  }

  socket.onmessage = function(e) {
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

  var layoutWidth = camSize.width;
  var layoutHeight = camSize.height;
  function fixLayout() {

  }

  function render() {
    var didChangeLayout = false;

    while (pageResources.remoteImages.length > frames.length) {
      // We have too many images
      pageResources.renderContainer.removeChild(pageResources.remoteImages[0]);
      pageResources.remoteImages.splice(0, 1);
      didChangeLayout = true;
    }

    while (pageResources.remoteImages.length < frames.length) {
      // We don't have enough images
      var newImg = new Image();
      newImg.width = camSize.width;
      newImg.height = camSize.height;
      pageResources.remoteImages.push(newImg);
      pageResources.renderContainer.appendChild(newImg);
      didChangeLayout = true;
    }

    for (var i = 0; i < frames.length; i++) {
      if (frames[i].frame == '') {
        pageResources.remoteImages[i].src = pageResources.offlineImage.src;
      } else {
        pageResources.remoteImages[i].src = frames[i].frame;
      }
      pageResources.remoteImages[i].dataset.username = frames[i].username;
    }

    if (didChangeLayout) fixLayout();
  }

  var lastProc = Date.now();
  function mainProc() {
    var delta = Date.now() - lastProc;
    if (delta > delayPerFrame) {
      lastProc = Date.now();
      record();
      render();
    }
  }

  function mainProcLoop() {
    mainProc();
    window.requestAnimationFrame(mainProcLoop);
  }

  fixLayout();
});
