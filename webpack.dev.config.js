"use strict"

const path = require("path")

module.exports = {
    entry: ["./demo/app.js"],
    output: {
      filename: "app.bundle.js",
    },
    module: {
      rules: [
        {
          test: /\.js?$/,
          // use: 'babel-loader',
          exclude: /node_modules/
        }
      ]
    },
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      contentBase: path.join(__dirname, 'demo'),
      publicPath: "/assets/",
      historyApiFallback: true,
      port: 3200,
    }
}
