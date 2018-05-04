var camSize = { width: 320, height: 240 };
var desiredFps = 30;
var delayPerFrame = 1000 / desiredFps;
var cameraQuality = 0.50;
var debug = false;
var offlineImage = document.getElementById('offline');
var currentVersion;

window.addEventListener('load', function() {
  var bodyElement = document.getElementsByTagName('body')[0];
  var username = window.localStorage.getItem('username') || generateName();

  var localDisplay = new VideoDisplay('local', username);
  var roomLayout = new RoomLayout(document.getElementById('roomFeed'), localDisplay);
  var camera = new Camera();
  var roomServer = new RoomServer(serverAddress + '/room/' + roomid);

  localDisplay.on('username-clicked', function() {
    var newName = window.prompt('Enter a new username:', username)
    if (newName && newName != username) {
      username = newName;
      window.localStorage.setItem('username', username);
      roomServer.changeName(username);
      localDisplay.updateName(username);
    }
  });
  localDisplay.on('toggle-camera-clicked', function() {
    if (!camera.cameraOn) {
      camera.turnCameraOn();
    } else {
      camera.turnCameraOff();
      roomServer.cameraOff();
    }
  });

  roomServer.on('connected', function(ver) {
    if(!currentVersion) currentVersion = ver;

    if(ver != currentVersion) {
      // Reload the whole damn page.
      window.location.reload(true);
    }

    bodyElement.style.backgroundColor = '#232f3b';
  });
  roomServer.on('disconnected', function() {
    bodyElement.style.backgroundColor = '#990000';
    camera.turnCameraOff();
    roomLayout.renderFrames([]);

    setTimeout(function() {
      roomServer.connect(username);
    }, 1000);
  })
  roomServer.on('new-frames', function(frames) {
    roomLayout.renderFrames(frames);

    // Fix for in case the user is in another tab; we want their camera to keep working.
    animationFrame();
  })

  // handle window resizing
  window.addEventListener('resize', roomLayout.resized.bind(roomLayout));

  localDisplay.updateFrame('');
  roomLayout.layoutChanged();
  roomLayout.resized();
  roomServer.connect(username);

  var lastProc = Date.now();
  function animationFrame() {
    camera.captureCamera();
    localDisplay.updateFrame(camera.getFrame('image/jpeg', .85));

    if(camera.cameraOn && roomServer.connected) {
      var delta = Date.now() - lastProc;
      if(delta > delayPerFrame) {
        var frameData = camera.getFrame('image/jpeg', cameraQuality);
        roomServer.sendFrame(frameData);
      }
    }
  }

  function animation() {
    animationFrame();
    window.requestAnimationFrame(animation);
  }

  window.requestAnimationFrame(animation);
});
