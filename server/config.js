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

    express: {
      viewsPath: join(root, '/app/views'),
      staticPath: join(root, '/app/static')
    }
  };
};

module.exports = config;
