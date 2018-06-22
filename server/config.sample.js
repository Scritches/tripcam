const join = require('path').join;

const config = function(root) {
  return {
    https: {
      /*
       * If your SSL certificates are not in the ./certs folder,
       * you'll need to change these paths to indicate where they are.
       * Also you may need to change the paths to indicate the correct
       * names, if they aren't named 'server.key' and 'server.crt'.
      */
      keyPath: join(root, '/certs/server.key'),
      certPath: join(root, '/certs/server.crt'),

      // This is the port the HTTPS server is listening on.
      listenPort: 443
    },

    http: {
      // This is the port the HTTP server is listening on.
      listenPort: 80
    },

    wss: {
        /* 
         * This array allows you to specify what origins are allowed to
         * connect to the websocket server. Origins that are not included
         * in this array are rejected.
        */
         allowedOrigins: [
          'https://localhost',
          'https://127.0.0.1',
      ],

      // This is the secure websocket address the websocket server is listening on.
      serverAddress: 'wss://127.0.0.1'
    },

    express: {
      viewsPath: join(root, '/app/views'),
      staticPath: join(root, '/app/static')
    },

    rooms: {
      // How long should a room survive after the last person leaves? In milliseconds.
      activityTimeout: 60000,

      // How fast should the server send frames to room participants? In frames-per-second.
      serverFps: 20,

      // Whether the server should compress frames before sending.
      allowCompression: false
    }
  };
};

module.exports = config;
