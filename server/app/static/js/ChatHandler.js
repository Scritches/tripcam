function ChatHandler(roomServer, roomLayout, chatContainer, userChat, userChatSubmit) {
    this.username = "";
    this.roomServer = roomServer;
    this.chatContainer = chatContainer;
    this.userChat = userChat;
    this.userChatSubmit = userChatSubmit;
    this.roomLayout = roomLayout;

    this.roomServer.on('connected', function() {
        this.displayChat("TripCam", "../images/video-camera-icon.png", "You are connected to the server.");
        this.roomServer.sendChat("> has entered the channel <")
    }.bind(this));

    this.roomServer.on('disconnected', function() {
        this.displayChat("TripCam", "../images/video-camera-icon.png", "You have been disconnected from the server.");
    }.bind(this));

    this.roomServer.on('chat-received', function(msg) {
        var remoteDisplay = this.roomLayout.remoteDisplays[msg.clientId];
        var frameUrl = "#";
        if (remoteDisplay) frameUrl = remoteDisplay.lastFrame;
        this.displayChat(msg.username, frameUrl, msg.text);
    }.bind(this));

    this.userChatSubmit.onclick = function() {
        var chatText = this.userChat.value;
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
    var chatLine = document.createElement('div');
    chatLine.className = 'chatline';
    
    var chatImage = new Image();
    chatImage.src = fromImage;

    var chatName = document.createElement('span');
    chatName.className = 'chatname';
    chatName.innerText = fromName;

    var chatEntry = document.createElement('span');
    chatEntry.className = 'chatentry';
    chatEntry.textContent = chatText;
    chatText = chatEntry.innerHTML;
    chatEntry.innerHTML = urlify(chatText);

    chatLine.appendChild(chatImage);
    chatLine.appendChild(chatName);
    chatLine.appendChild(chatEntry);

    this.chatContainer.appendChild(chatLine);

    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
}