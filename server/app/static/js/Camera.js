function Camera() {
  this.videoElement = document.createElement('video');
  this.videoElement.autoplay = true;
  this.videoElement.height = camSize.height;
  this.videoElement.width = camSize.width;

  this.cameraOn = false;
  this.stream = null;

  this.canvas = document.createElement('canvas');
  this.canvas.height = camSize.height;
  this.canvas.width = camSize.width;

  this.context = this.canvas.getContext('2d');
}

Camera.prototype.turnCameraOn = function() {
  navigator.mediaDevices.getUserMedia({
    video: { width: camSize.width, height: camSize.height },
    audio: false
  }).then(function(stream) {
    this.videoElement.srcObject = this.stream = stream;
    this.cameraOn = true;
  }.bind(this),function(error) {
    console.log(error);
  });
}

Camera.prototype.turnCameraOff = function() {
  if (this.cameraOn) {
    this.videoElement.srcObject = null;
    this.stream.getTracks().forEach(function(t) { t.stop(); });
    this.stream = null;
    this.cameraOn = false;
  }
}

Camera.prototype.captureCamera = function() {
  if (this.cameraOn) {
    this.context.drawImage(this.videoElement, 0, 0, camSize.width, camSize.height);
  }
}

Camera.prototype.getFrame = function(format, quality) {
  if(this.cameraOn) {
    return this.canvas.toDataURL(format, quality);
  } else {
    return '';
  }
}
