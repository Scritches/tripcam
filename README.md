# TripCam

A simple node and html5 + javascript cam site


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
