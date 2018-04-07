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
          "https://localhost",
          "https://24.88.118.234",
          "https://scritchface.cf"
      ]
    },

    express: {
      viewsPath: join(root, '/app/views'),
      staticPath: join(root, '/app/static')
    },

    rooms: {
      activityTimeout: 60000,
      serverFps: 5
    }
  };
};

module.exports = config;
