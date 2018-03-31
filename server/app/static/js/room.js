// polyfill for canvas.toBlob
if (!HTMLCanvasElement.prototype.toBlob) {
   Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
     value: function (callback, type, quality) {
       var canvas = this;
       setTimeout(function() {
         var binStr = atob( canvas.toDataURL(type, quality).split(',')[1] ),
         len = binStr.length,
         arr = new Uint8Array(len);

         for (var i = 0; i < len; i++ ) {
            arr[i] = binStr.charCodeAt(i);
         }

         callback( new Blob( [arr], {type: type || 'image/png'} ) );
       });
     }
  });
}


// This is all temporary code, just to test displaying local video and recording frames.
// So this is all ugly, largely lifted from other areas and hacked at until I got it working.
// Please don't judge me yet. >.<

var desiredFps = 30;
var delayPerFrame = 1000 / desiredFps;


var video = document.getElementById('video');
var canvas = document.getElementById('record');

var camWidth = 320;
var camHeight = 240;

var remoteArray = [];
for(var i = 0; i < 5; i++) {
  var elementId = 'remote' + i.toString();
  var elem = document.getElementById(elementId);
  var ctx = elem.getContext('2d');

  var img = new Image();

  var remoteEntry = {
    canvas: elem,
    context: ctx,
    image: img
  };

  remoteArray.push(remoteEntry);

  img.onload = (function() {
    console.log("drawing to " + this.canvas.id);
    this.context.drawImage(this.image, 0, 0, camWidth, camHeight);
  }).bind(remoteEntry);

  elem.width = camWidth;
  elem.height = camHeight;
  elem.style = "border:1px solid";
}

var context = canvas.getContext('2d');

var width, height;

if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({video: { width: camWidth, height: camHeight }})
      .then(ms => {
        video.srcObject = ms;

        video.onloadedmetadata = function(e) {
          video.play();
          canvas.width = camWidth;
          canvas.height = camHeight;
          //window.requestAnimationFrame(loop);
          lastT = Date.now();
          //window.setTimeout(loop, delayPerFrame);
          window.postMessage("","*");
        };
      });
}

function takepicture() {
  context.drawImage(video, 0, 0, camWidth, camHeight);
}

var connected = false;

function emitpicture() {
  if (connected) {
    canvas.toBlob(function(blob) {
      socket.send(blob);
    }, 'image/jpeg', 0.25);
  }
}

window.addEventListener("message", loop, false);

var lastT = 0;
var picSize = 0;
var delta = 0;
function loop() {
  var t = Date.now();

  delta = delta + t - lastT;
  if(delta > delayPerFrame) {
    delta = 0;
    takepicture();
    emitpicture();
  }

  lastT = t;

  //window.requestAnimationFrame(loop);
  //window.setTimeout(loop, delayPerFrame);
  window.postMessage("","*");
}



var socket = new WebSocket('wss://24.88.118.234:8080/room/'+roomid, 'room-protocol');
socket.binaryType = 'arraybuffer'
socket.onmessage = function(event) {
  // assume string data is json
  // assume binary data is camera data

  if(typeof event.data === "string") {
    var message = JSON.parse(event.data);
    handleIncomingMessage(message);
  } else if (event.data instanceof ArrayBuffer) {
    handleIncomingBinary(event.data);
  }
}

function handleIncomingMessage(message) {
  if (message.messageType == 'hello') {
    // This is the 'hello' packet from server. Contains the clientid for this client.
    clientid = message.clientid;
    connected = true;
  }
}

function handleIncomingBinary(arrayBuffer) {
  var dv = new DataView(arrayBuffer);

  var cursor = 0;
  var remoteId = 0;
  do {
    var frameLen = dv.getUint16(cursor); cursor += 2;
    var frame = arrayBuffer.slice(cursor, frameLen + cursor); cursor += frameLen;
    var frameBlob = new Blob([frame], { type: 'image/jpeg' });
    remoteArray[remoteId].image.src = URL.createObjectURL(frameBlob);

    remoteId++;
  } while(cursor < arrayBuffer.byteLength);

}
