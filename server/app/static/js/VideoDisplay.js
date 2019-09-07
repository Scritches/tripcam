function VideoDisplay(clientId, username) {
  this.isLocal = clientId == 'local';
  this.remoteVisible = true;

  if(debug) console.log('new video display: ', clientId);
  this.lastFrame = '#';
  this.clientId = clientId;
  this.username = username;

  this.container = null;

  this.frame_el = document.createElement('div');
  this.frame_el.className = this.isLocal ? "frame selfframe" : "frame";
  this.frame_el.id = clientId;

  this.frame_el.appendChild(this.videoview_el = document.createElement('div'));
  this.videoview_el.className = 'videoview';
  this.videoview_el.appendChild(this.image_el = new Image());
  this.image_el.className = 'frameimage';
  this.image_el.width = camSize.width;
  this.image_el.height = camSize.height;

  this.frame_el.appendChild(this.cambutton_el = document.createElement('div'));
  this.cambutton_el.className='camerabutton';
  this.cambutton_el.setAttribute('title', 'Click to toggle ' + (this.isLocal ? 'your' : 'this') + ' camera.');

  this.frame_el.appendChild(this.username_el = document.createElement('div'));
  this.username_el.className = 'username';
  if (this.isLocal) {
    this.username_el.setAttribute('title', 'Click to change your name.');
  }
  this.username_el.innerText = this.username;

  this.usernameClickHandler = function() {
    this.emit('username-clicked', this);
  }.bind(this);

  this.imageDblClickHandler = function() {
    this.emit('feed-doubleclicked', this);
  }.bind(this);

  this.toggleCameraClickHandler = function() {
    if (!this.isLocal) {
      this.remoteVisible = !this.remoteVisible;
      this.updateFrame('');
    } else {
      this.emit('toggle-camera-clicked', this);
    }
  }.bind(this);
}

VideoDisplay.prototype = _.clone(EventEmitter.prototype);

VideoDisplay.prototype.detach = function() {
  if(this.container) {
    this.image_el.removeEventListener('dblclick', this.imageDblClickHandler);
    if(this.isLocal) {
      this.username_el.removeEventListener('click', this.usernameClickHandler);
    }
    this.cambutton_el.removeEventListener('click', this.toggleCameraClickHandler);
    this.container.removeChild(this.frame_el);
    this.container = null;
  }
}

VideoDisplay.prototype.attach = function(container) {
  if(this.container) {
    this.detach();
  }

  container.appendChild(this.frame_el);
  this.container = container;

  this.image_el.addEventListener('dblclick', this.imageDblClickHandler);
  if(this.isLocal) {
    this.username_el.addEventListener('click', this.usernameClickHandler);
  }
  this.cambutton_el.addEventListener('click', this.toggleCameraClickHandler);
}

VideoDisplay.prototype.updateName = function(username) {
  if(username && this.username !== username) {
    this.username = username
    this.username_el.innerText = this.username;
  }
}

VideoDisplay.prototype.updateFrame = function(frame) {
  if(this.container) {
    // No point updating the current frame if the display isn't attached to the document
    if(frame === '' || !this.remoteVisible) {
      if(this.image_el.src != offlineImage.src) this.image_el.src = offlineImage.src;
      this.lastFrame = offlineImage.src;
    } else {
      this.image_el.src = frame;
      this.lastFrame = frame;
    }
  }
}

VideoDisplay.prototype.resize = function(width, height) {
  var newStyle = "width: " + width.toString() + "px; height:" + height.toString() + "px";
  this.image_el.setAttribute('style', newStyle);
  this.image_el.width = width;
  this.image_el.height = height;
}
