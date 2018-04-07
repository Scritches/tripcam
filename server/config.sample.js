const join = require('path').join;

const config = function(root) {
  return {
    https: {
      keyPath: join(root, '/certs/server.key'),
      certPath: join(root, '/certs/server.crt'),
      listenPort: 443
    },

    http: {
      listenPort: 80
    },

    wss: {
      allowedOrigins: [
          'https://localhost',
          'https://127.0.0.1',
      ],
      serverAddress: 'wss://127.0.0.1'
    },

    express: {
      viewsPath: join(root, '/app/views'),
      staticPath: join(root, '/app/static')
    },

    rooms: {
      activityTimeout: 60000,
      serverFps: 20
    }
  };
};

module.exports = config;
