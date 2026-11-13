/**
 * Webpack configuration.
 *
 *   npm start       -> dev server at http://localhost:8080 (auto-reload)
 *   npm run build   -> production bundle written to ./dist (this is what gets
 *                      published to GitHub Pages)
 *
 * Everything in ./public (index.html, images) is copied as-is into ./dist;
 * the JavaScript in ./src is bundled into dist/main.js.
 */
const path = require("path")
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = {
  entry: "./src/js/main.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  module: {
    rules: [
      {
        // package.json declares "type": "module" (needed by the tests), which
        // makes webpack demand file extensions in every import. Our code and
        // some libraries import without them, so relax that rule.
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 8080,
    // Never let the browser cache the bundle: otherwise it can keep serving a
    // stale main.js after a rebuild and code changes seem to have no effect.
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  },
}
