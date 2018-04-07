# TripCam websocket protocol:

#### Client connects to server:
Client sends:
```
{
  messageType: 'connect',
  username: '<username>'
}
```

Server responds:
```
{
  messageType: 'hello',
  clientId: '<clientId>'
}
```


#### Client changes username:
Client sends:
```
{
  messageType: 'changeName',
  username: '<username>'
}
```


#### Client wants to send a new video frame
Client sends:
```
{
  messageType: 'frame',
  frame: '<frameData:base64>'
}
```


#### Server wants to send frame data to all clients:
Server broadcasts**:
```
{
  messageType: 'frames',
  frames: [ <for each connected client>
    {
      username: '<username>',
      frame: '<frameData:base64>'
    },
    ...
  ]
}
```

#### Client turns off camera
Client sends:
```
{
  messageType: 'cameraOff'
}
```

----

\* = to all clients except the originating client.

\** = frame data is not echoed back to originating client.
