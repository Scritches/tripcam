function VideoDisplay(clientId, username) {
  if(debug) console.log('new video display: ', clientId);
  this.clientId = clientId;
  this.username = username;

  this.container = null;

  this.frame_el = document.createElement('div');
  this.frame_el.className = clientId == 'local' ? "frame selfframe" : "frame";
  this.frame_el.id = clientId;

  this.frame_el.appendChild(this.videoview_el = document.createElement('div'));
  this.videoview_el.className = 'videoview';
  this.videoview_el.appendChild(this.image_el = new Image());
  this.image_el.className = 'frameimage';
  this.image_el.width = camSize.width;
  this.image_el.height = camSize.height;

  if(clientId == 'local') {
    this.frame_el.appendChild(this.cambutton_el = document.createElement('div'));
    this.cambutton_el.className='camerabutton';
    this.cambutton_el.setAttribute('title', 'Click to toggle your camera.');
  }

  this.frame_el.appendChild(this.username_el = document.createElement('div'));
  this.username_el.className = 'username';
  if (clientId == 'local') {
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
    this.emit('toggle-camera-clicked', this);
  }.bind(this);
}

VideoDisplay.prototype = _.clone(EventEmitter.prototype);

VideoDisplay.prototype.detach = function() {
  if(this.container) {
    this.image_el.removeEventListener('dblclick', this.imageDblClickHandler);
    if(this.clientId == 'local') {
      this.username_el.removeEventListener('click', this.usernameClickHandler);
      this.cambutton_el.removeEventListener('click', this.toggleCameraClickHandler);
    }
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
  if(this.clientId == 'local') {
    this.username_el.addEventListener('click', this.usernameClickHandler);
    this.cambutton_el.addEventListener('click', this.toggleCameraClickHandler);
  }
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
    if(frame === '') {
      if(this.image_el.src != offlineImage.src) this.image_el.src = offlineImage.src;
    } else {
      this.image_el.src = frame;
    }
  }
}
