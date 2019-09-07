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

  this.localDisplay.on('feed-doubleclicked', this.displayDblClicked.bind(this));

  this.renderFrames = function(frames) {
    var layoutChanged = false;

    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      let remote = this.remoteDisplays[frame.clientId];

      if (!remote) {
        layoutChanged = true;
        remote = new VideoDisplay(frame.clientId, frame.username);
        remote.on('feed-doubleclicked', this.displayDblClicked.bind(this));
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
      remote.removeAllListeners();
      delete this.remoteDisplays[offline[i]];
      numDisplays--;
    }

    if (layoutChanged) {
      this.layoutChanged();
    }
  };

  this.currentFrameLayout = null;
  this.currentFrameset = [];
  this.layoutChanged = function() {
    var newFrameLayout = frameLayouts[numDisplays + 1];
    if (this.currentFrameLayout == null && newFrameLayout == null) {
      return;
    }

    if (this.fullScreenDisplay) newFrameLayout = { rows: 1, cols: 1 };

    for (let i = 0; i < this.currentFrameset.length; i++) {
      const frame = this.currentFrameset[i];
      frame.detach();
    }
    this.currentFrameset = [];

    // Create cells for each video frame to render
    // Handle full-screen case
    if(this.fullScreenDisplay) {
      this.fullScreenDisplay.attach(this.container);
      this.currentFrameset.push(this.fullScreenDisplay);
    } else {
      // Add the local video display
      this.localDisplay.attach(this.container);
      this.currentFrameset.push(this.localDisplay);

      // Add all the remote video displays
      var remoteDisplayClientIds = _.pluck(this.remoteDisplays, 'clientId');
      for (let remoteDisplayIndex = 0; remoteDisplayIndex < remoteDisplayClientIds.length; remoteDisplayIndex++) {
        const remoteId = remoteDisplayClientIds[remoteDisplayIndex];
        this.remoteDisplays[remoteId].attach(this.container);
        this.currentFrameset.push(this.remoteDisplays[remoteId]);
      }
    }

    // Update the container's grid
    var newStyle;
    if(isIE11) {
      newStyle = "-ms-grid-rows: (1fr)[" + newFrameLayout.rows.toString() + "];\r\n-ms-grid-colums: (1fr)[" + newFrameLayout.cols.toString() + "];";
    } else {
      newStyle = "grid-template: repeat(" + newFrameLayout.rows.toString() + ", 1fr) / repeat(" + newFrameLayout.cols.toString() + ", 1fr);";
    }

    this.container.setAttribute('style', newStyle)

    this.currentFrameLayout = newFrameLayout;
    this.resized();
  };

  this.resized = function() {
    var containerSize = { width: this.container.clientWidth, height: this.container.clientHeight };

    var cellSize = {
      width: Math.floor(containerSize.width / this.currentFrameLayout.cols),
      height: Math.floor(containerSize.height / this.currentFrameLayout.rows)
    };

    if(cellSize.width / cellSize.height > camSize.width / camSize.height) {
      cellSize.width = cellSize.height * (camSize.width / camSize.height);
    }

    if (cellSize.height / cellSize.width > camSize.height / camSize.width) {
      cellSize.height = cellSize.width * (camSize.height / camSize.width);
    }

    this.localDisplay.resize(cellSize.width, cellSize.height);
    //Object.values(this.remoteDisplays).forEach(function(d) { d.resize(cellSize.width, cellSize.height); });
    var key;
    for (key in this.remoteDisplays) {
      this.remoteDisplays[key].resize(cellSize.width, cellSize.height);
    }
  };
}

var frameLayouts = function() {
  var r = [];
  r[0] = null;
  for (var cams = 1; cams <= 16; cams++) {
    switch (cams) {
      case 1: case 2:                     r[cams] = { rows: 1, cols: 2 }; break;
      case 3:                             r[cams] = { rows: 1, cols: 3 }; break;
      case 4:                             r[cams] = { rows: 1, cols: 4 }; break;
      case 5: case 6:                     r[cams] = { rows: 2, cols: 4 }; break;
      case 7: case 8:                     r[cams] = { rows: 2, cols: 4 }; break;
      case 9: case 10: case 11: case 12:  r[cams] = { rows: 3, cols: 4 }; break;
      case 13: case 14: case 15: case 16: r[cams] = { rows: 4, cols: 4 }; break;
    }
  }
  return r;
}();
