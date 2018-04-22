# TripCam

A simple node and html5 + javascript cam site


## Compression Spike

Oh, nothing much, just an mjpeg video stream compression algorithm.

If you wanna run this yourself, once you're in a room, start your camera. The leftmost canvas displays the current keyframe, which
the diff frames take as their foundation; the middle canvas is the diff frame itself; and the rightmost canvas is the rehydrated
frame using the keyframe and the diff frame to reconstitute the original video frame. The compression artifacts here come from the fact
that the diff frame is compressed into jpeg at 75% of the original frame's quality.

If you want metrics on how much bandwidth this approach saves over just sending raw gzipped frames, look in the header.

Some factors to play with:

* `camSize`, `desiredFps`, and `cameraQuality` will have predictable effects on how much data is transferred.

* `forceKeyframeMS` is how often you want to force a new keyframe to be sent. Set this to -1 if you don't ever want to force one.

* `diffFactorBeforeKeyframe` - every time a new frame is diff'd, a measure of how much the frame differs compared to the keyframe is
computed. The higher this diff factor is, the more different the new frame is from the last keyframe. If this factor rises above this
value, then a new keyframe is scheduled. Higher values here mean better compression, to a point - but also lower quality in the output.
A good value will depend on the other factors involved - especially `camSize` and `cameraQuality`. Experimentation is a must.

The code is a mess right now. Stay tuned, I guess, while I clean it up and get it actually working over the network.


### Installing

There's no npm package yet, so clone the repository:

```
git clone https://github.com/Scritches/tripcam.git
```

When that's done, `cd server` for the rest:

You'll need bower, so in case you haven't already, run (you made need sudo):
```
npm install bower -g
```

Once that's done:
```
npm install
bower install
```


### Security Certificates

The server uses SSL so you'll need a certificate and key. These will go in the ./certs directory: if you already have a certificate you want to use, put them there. Otherwise, you can generate a self-signed certificate by running `npm run new-certs` and following the prompts.

Note that the self-signed cert will cause browsers to warn users about an insecure page. For the client to work properly the user will have to add an exception for the page, the means of which depends on the browser. Self-signed certs are for development and testing purposes only and must be replaced with proper certificates upon deployment.


### Configuration

Now it's time to configure TripCam. Run:
```
cp config.sample.js config.js
```
and edit `config.js`, and follow the instructions you find therein.

### Running

All done? Run `node run` to start, and `Ctrl + C` to stop.
