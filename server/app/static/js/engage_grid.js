// The problem here is that we need to set the maximal height of the
// chat to what is allowed by the container... Otherwise new chat messages
// just move the grid borders.
var fixChatHeight = () => {
  var h = document.getElementById('chat_container').clientHeight;
  document.getElementById('allchat').style = 'max-height:' + h + 'px;';
}

window.Split({
  rowGutters: [{
      track: 1,
      element: document.querySelector('.horizontal-gutter'),
    }],
    onDragEnd: fixChatHeight,
    onDragStart: () => {
      // Bit of a hack: need to hide the chat content so it'll let us
      // resize it smaller. This is reset by the override of the allchat 
      // style in fixChatHeight, when the content is reflowed.
      document.getElementById('allchat').style = 'display:none;';
    }
})

fixChatHeight();
