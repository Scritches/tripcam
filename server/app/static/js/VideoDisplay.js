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

  this.el_frame.appendChild(this.el_username = document.createElement('div'));
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
      if(this.el_image.src != offlineImage.src) this.el_image.src = offlineImage.src;
    } else {
      this.el_image.src = frame;
    }
  }
}
