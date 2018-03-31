const join = require('path').join;

const config = function(root) {
  return {
    https: {
      keyPath: join(root, '/certs/server.key'),
      certPath: join(root, '/certs/server.crt'),
      listenPort: 8080
    },

    http: {
      listenPort: 80
    },

    wss: {
      allowedOrigins: [
          "https://localhost:8080",
          "https://24.88.118.234:8080"
      ]
    },

    express: {
      viewsPath: join(root, '/app/views'),
      staticPath: join(root, '/app/static')
    },

    rooms: {
      activityTimeout: 5000,
      serverFps: 30
    }
  };
};

module.exports = config;
