function ChatHandler(roomServer, chatContainer, userChat, userChatSubmit) {
    this.username = "";
    this.roomServer = roomServer;
    this.chatContainer = chatContainer;
    this.userChat = userChat;
    this.userChatSubmit = userChatSubmit;

    this.roomServer.on('connected', function() {
        this.displayChat("TripCam", "#", "You are connected to the server.");
        this.roomServer.sendChat("> has entered the channel <")
    }.bind(this));

    this.roomServer.on('disconnected', function() {
        this.displayChat("TripCam", "#", "You have been disconnected from the server.");
    }.bind(this));

    this.roomServer.on('chat-received', function(msg) {
        this.displayChat(msg.username, "#", msg.text);
    }.bind(this));

    this.userChatSubmit.onclick = function() {
        var chatText = this.userChat.value;
        this.roomServer.sendChat(chatText);
        this.displayChat(this.username, "#", chatText);
        this.userChat.value = "";
    }.bind(this);
            
    this.userChat.onkeypress = function(e) {
        if (!e) e = window.event;
        var keyCode = e.keyCode || e.which;
        if (keyCode == '13') {
            var chatText = this.userChat.value;
            this.roomServer.sendChat(chatText);
            this.displayChat(this.username, "#", chatText);
            this.userChat.value = "";
        }
    }.bind(this);
}

function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
    })
    // or alternatively
    // return text.replace(urlRegex, '<a href="$1">$1</a>')
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