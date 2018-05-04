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
  this.currentLayout = null;
  this.layoutChanged = function() {
    var newFrameLayout = frameLayouts[numDisplays + 1];
    if (this.currentFrameLayout == null && newFrameLayout == null) {
      return;
    }

    if (this.fullScreenDisplay) newFrameLayout = { rows: 1, cols: 1 };

    // Create the new layout and assign video display elements to the cells
    var newLayout = document.createElement('div');
    newLayout.className = 'roomLayout';

    var remoteDisplayIndex = 0;
    var remoteDisplayClientIds = _.pluck(this.remoteDisplays, 'clientId');

    for (var rowNum = 0; rowNum < newFrameLayout.rows; rowNum++) {
      // Create row element
      var row = document.createElement('div');
      newLayout.appendChild(row);
      row.className = 'feedRow';

      for (var colNum = 0; colNum < newFrameLayout.cols; colNum++) {
        // Create column element
        var col = document.createElement('div');
        row.appendChild(col);
        col.className = 'feedCol';

        // Populate cell
        if (rowNum == 0 && colNum == 0) {
          // This is where the local display (or the full screen display) needs to be homed.
          if (this.fullScreenDisplay) {
            this.fullScreenDisplay.attach(col);
          } else {
            this.localDisplay.attach(col);
          }
        } else {
          // This cell belongs to a remote display.
          if (remoteDisplayIndex < numDisplays) {
            this.remoteDisplays[remoteDisplayClientIds[remoteDisplayIndex]].attach(col);
            remoteDisplayIndex++;
          } else {
            new VideoDisplay('','').attach(col);
          }
        }
      }
    }

    if (this.currentLayout) this.container.removeChild(this.currentLayout);
    this.container.appendChild(newLayout);
    this.currentLayout = newLayout;
    this.currentFrameLayout = newFrameLayout;
    this.resized();
  };

  this.resized = function() {
    var containerSize = { width: this.container.clientWidth - 10, height: this.container.clientHeight - 10 };

    var cellSize = {
      width: Math.floor(containerSize.width / this.currentFrameLayout.cols) - 20, // -20 for border components
      height: Math.floor(containerSize.height / this.currentFrameLayout.rows) - 20 //-20 for username label height
    };

    if(!this.fullScreenDisplay) {
      if(cellSize.width > camSize.width * 2) cellSize.width = camSize.width * 2;
    }

    if(cellSize.width / cellSize.height > camSize.width / camSize.height) {
      cellSize.width = cellSize.height * (camSize.width / camSize.height);
    }

    if (cellSize.height / cellSize.width > camSize.height / camSize.width) {
      cellSize.height = cellSize.width * (camSize.height / camSize.width);
    }

    var imgs = this.container.getElementsByClassName('video');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].width = cellSize.width;
      imgs[i].height = cellSize.height;
      imgs[i].parentElement.setAttribute('style', 'width: ' + cellSize.width + 'px; height: ' + cellSize.height + ';');
    }
  };
}

var frameLayouts = function() {
  var r = [];
  r[0] = null;
  for (var cams = 1; cams <= 16; cams++) {
    switch (cams) {
      case 1: case 2:                     r[cams] = { rows: 1, cols: 2 }; break;
      case 3: case 4:                     r[cams] = { rows: 2, cols: 2 }; break;
      case 5: case 6:                     r[cams] = { rows: 2, cols: 3 }; break;
      case 7: case 8: case 9:             r[cams] = { rows: 3, cols: 3 }; break;
      case 10: case 11: case 12:          r[cams] = { rows: 3, cols: 4 }; break;
      case 13: case 14: case 15: case 16: r[cams] = { rows: 4, cols: 4 }; break;
    }
  }
  return r;
}();
