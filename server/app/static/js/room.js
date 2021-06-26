var camSize = { width: 320, height: 240 };
var desiredFps = 20;
var delayPerFrame = 1000 / desiredFps;
var cameraQuality = 0.95;
var debug = false;
var useCompression = false;
var offlineImage = document.getElementById("offline");
var currentVersion;
var cameraWasOn = false;

window.addEventListener("load", function () {
  var bodyElement = document.getElementsByTagName("body")[0];
  var username = window.localStorage.getItem("username") || generateName();
  if (username.length > 25) username = username.substr(0, 25);

  var localDisplay = (window.localDisplay = new VideoDisplay(
    "local",
    username
  ));
  var roomLayout = (window.roomLayout = new RoomLayout(
    document.getElementById("channel"),
    localDisplay
  ));
  var camera = (window.camera = new Camera());
  var roomServer = (window.roomServer = new RoomServer(
    serverAddress + "/room/" + roomid
  ));

  //chatContainer, userChat, userChatSubmit
  var chatHandler = (window.chatHandler = new ChatHandler(
    roomServer,
    roomLayout,
    document.getElementById("allchat"),
    document.getElementById("userchat"),
    document.getElementById("userchatsubmit")
  ));
  chatHandler.changeName(username);

  var nameSelectModal = document.getElementById("nameSelectModal");
  var nameSelectTextbox = document.getElementById("newUsername");
  nameSelectTextbox.onkeypress = function (e) {
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == "13") {
      var newName = nameSelectTextbox.value;
      if (newName && newName != username) {
        username = newName;
        window.localStorage.setItem("username", username);
        chatHandler.changeName(username);
        roomServer.changeName(username);
        localDisplay.updateName(username);
      }
      nameSelectModal.style.display = "none";
      return false;
    }
    if (keyCode == "27") {
      nameSelectModal.style.display = "none";
      return false;
    }
  };

  localDisplay.on("username-clicked", function () {
    nameSelectTextbox.value = username;
    nameSelectModal.style.display = "block";
    nameSelectTextbox.focus();
    nameSelectTextbox.select();
  });
  localDisplay.on("toggle-camera-clicked", function () {
    if (!camera.cameraOn) {
      camera.turnCameraOn();
      cameraWasOn = true;
    } else {
      camera.turnCameraOff();
      roomServer.cameraOff();
      cameraWasOn = false;
    }
  });

  roomServer.on("connected", function (ver) {
    if (!currentVersion) currentVersion = ver;

    if (ver != currentVersion) {
      // Reload the whole damn page.
      window.location.reload(true);
    }

    bodyElement.style.backgroundColor = "#232f3b";
    if (cameraWasOn) {
      camera.turnCameraOn();
    }
  });
  roomServer.on("disconnected", function () {
    bodyElement.style.backgroundColor = "#990000";
    camera.turnCameraOff();
    roomLayout.renderFrames([]);

    setTimeout(function () {
      roomServer.connect(username);
    }, 1000);
  });
  roomServer.on("new-frames", function (frames) {
    roomLayout.renderFrames(frames);

    // Fix for in case the user is in another tab; we want their camera to keep working.
    animationFrame();
  });

  // handle window resizing
  window.addEventListener("resize", roomLayout.resized.bind(roomLayout));

  localDisplay.updateFrame("");
  roomLayout.layoutChanged();
  roomLayout.resized();
  roomServer.connect(username);

  var lastProc = Date.now();
  function animationFrame() {
    camera.captureCamera();
    localDisplay.updateFrame(camera.getFrame("image/jpeg", 0.85));

    if (camera.cameraOn && roomServer.connected) {
      var delta = Date.now() - lastProc;
      if (delta > delayPerFrame) {
        var frameData = camera.getFrame("image/jpeg", cameraQuality);
        roomServer.sendFrame(frameData);
        lastProc = Date.now();
      }
    }
  }

  function animation() {
    animationFrame();
    window.requestAnimationFrame(animation);
  }

  window.requestAnimationFrame(animation);
});
