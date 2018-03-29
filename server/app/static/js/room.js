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

var desiredFps = 20;
var delayPerFrame = 1000 / desiredFps;


var video = document.getElementById('video');
var canvas = document.getElementById('record');
var remote = document.getElementById('remote');
var fps = document.getElementById('fps');

var width, height;

if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({video: { width: 320, height: 240 }})
      .then(ms => {
        video.srcObject = ms;

        video.onloadedmetadata = function(e) {
          video.play();
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          //window.requestAnimationFrame(loop);
          lastT = Date.now();
          window.setTimeout(loop, delayPerFrame);
        };
      });
}

function takepicture() {
  var context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function emitpicture(){
  canvas.toBlob(function(blob) {

    var context = remote.getContext('2d');
    var img = new Image();
    img.onload = () => {
      remote.width = 320;
      remote.height = 240;
      context.drawImage(img,0,0,320,240);
      picSize = blob.size;
    };
    img.src = URL.createObjectURL(blob);


  }, 'image/jpeg', 0.5);
}

var lastT = 0;
var picSize = 0;
function loop() {
  var t = Date.now();
  takepicture();
  emitpicture();

  var fpsCalc = Math.round((1 / (t - lastT) * 1000) * 100) / 100
  var bps = fpsCalc * picSize;
  fps.innerText = fpsCalc.toString() + " -- " + picSize + " bytes per frame = " + Math.round(bps) + " bytes per second";
  lastT = t;

  //window.requestAnimationFrame(loop);
  window.setTimeout(loop, delayPerFrame);
}
