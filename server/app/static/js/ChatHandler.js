if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        value: function(search, rawPos) {
            pos = rawPos > 0 ? rawPos|0 : 0;
            return this.substring(pos, pos + search.length) === search;
        }
    });
}

function ChatHandler(roomServer, roomLayout, chatContainer, userChat, userChatSubmit) {
    this.username = "";
    this.roomServer = roomServer;
    this.chatContainer = chatContainer;
    this.userChat = userChat;
    this.userChatSubmit = userChatSubmit;
    this.roomLayout = roomLayout;

    this.ytPlayer = new YT.Player(
        'youtube',
        {
            width: 360,
            height: 200
        }
    );

    this.ytEl = document.getElementById('youtube');
    this.videoContainer = this.ytEl.parentElement;
    
    this.videoEl = document.getElementById("video");
    this.videoEl.hidden = true;

    var wasConnected = false;
    this.roomServer.on('connected', function() {
        this.displayChat("TripCam", "../images/video-camera-icon.png", "You are connected to the server.");
        this.roomServer.sendChat("> has entered the channel <")
        wasConnected = true;
    }.bind(this));

    this.roomServer.on('disconnected', function() {
        if(wasConnected) this.displayChat("TripCam", "../images/video-camera-icon.png", "You have been disconnected from the server.");
        wasConnected = false;
    }.bind(this));

    this.roomServer.on('chat-received', function(msg) {
        var remoteDisplay = this.roomLayout.remoteDisplays[msg.clientId];
        var frameUrl = "../images/video-camera-icon.png";
        if (remoteDisplay) frameUrl = remoteDisplay.lastFrame;
        this.displayChat(msg.username, frameUrl, msg.text);
    }.bind(this));

    this.userChatSubmit.onclick = function() {
        var chatText = this.userChat.value;
        if(chatText.trim() == "") return;
        this.roomServer.sendChat(chatText);
        var frameUrl = this.roomLayout.localDisplay.lastFrame;
        this.displayChat(this.username, frameUrl, chatText);
        this.userChat.value = "";
    }.bind(this);
            
    this.userChat.onkeypress = function(e) {
        if (!e) e = window.event;
        var keyCode = e.keyCode || e.which;
        if (keyCode == '13') {
            var chatText = this.userChat.value;
            if(chatText.trim() == "") return;
            this.roomServer.sendChat(chatText);
            var frameUrl = this.roomLayout.localDisplay.lastFrame;
            this.displayChat(this.username, frameUrl, chatText);
            this.userChat.value = "";
        }
    }.bind(this);
}

function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
    })
}

ChatHandler.prototype.changeName = function(newName) {
    this.username=newName;
}

ChatHandler.prototype.displayChat = function(fromName, fromImage, chatText) {
    var origText = chatText;
    var chatLine = document.createElement('div');
    chatLine.className = 'chatline';
    
    var chatImage = new Image();
    chatImage.src = fromImage;
    chatImage.setAttribute('title', new Date().toLocaleString());

    var chatName = document.createElement('span');
    chatName.className = 'chatname';
    chatName.innerText = fromName;

    var chatEntry = document.createElement('span');
    chatEntry.className = 'chatentry';
    chatEntry.textContent = chatText;
    chatText = urlify(chatEntry.innerHTML);
    
    var isAction = false;
    if(chatText.startsWith("/me ")) {
        isAction = true;
        chatText = " <i><b>" + fromName + "</b> " + chatText.substring(4) + "</i>";
    }
    
    chatEntry.innerHTML = chatText;
    chatText = origText;

    chatLine.appendChild(chatImage);
    if(!isAction) chatLine.appendChild(chatName);
    chatLine.appendChild(chatEntry);

    this.chatContainer.appendChild(chatLine);

    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    if(chatText.startsWith('!play ')) {
        this.videoEl.pause();
        this.videoEl.hidden = true;
        this.ytEl.hidden = false;

        var youtubeLink = chatText.substring(6);
        var linkRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var linkMatch = youtubeLink.match(linkRegex);
        if(linkMatch) {
            var id = linkMatch[2];
            this.ytPlayer.loadVideoById(id);
        }
    }

    if(chatText.startsWith('!url ')) {
        this.ytPlayer.stopVideo();
        this.ytEl.hidden = true;
        this.videoEl.hidden = false;

        var url = chatText.substring(5);
        this.videoEl.autoplay = true;
        this.videoEl.src = url;
    }
}