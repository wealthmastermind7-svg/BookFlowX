const { getDefaultConfig } = require("expo/metro-config");
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = getDefaultConfig(__dirname);

// Replit's Expo preview has a separate origin from Express. Keep browser API
// requests same-origin without changing the native/published URL resolution.
const backend = createProxyMiddleware({
  target: "http://127.0.0.1:5000",
  changeOrigin: false,
  pathFilter: (pathname) => /^\/(api|book|embed)(\/|$)/.test(pathname),
  on: {
    error: (_error, _request, response) => {
      if (!response.headersSent) {
        response.writeHead(503, { "Content-Type": "application/json" });
      }
      response.end(JSON.stringify({ error: "The development API is not available yet. Please retry." }));
    },
  },
});

const previousEnhancer = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const metro = previousEnhancer ? previousEnhancer(middleware, server) : middleware;
  return (request, response, next) => backend(request, response, () => metro(request, response, next));
};

module.exports = config;