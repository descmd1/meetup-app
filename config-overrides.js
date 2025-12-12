const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),  // <- note the slash
    util: require.resolve("util/"),
    process: require.resolve("process/browser"),
  };
  config.plugins = [...config.plugins, new NodePolyfillPlugin()];
  return config;
};
