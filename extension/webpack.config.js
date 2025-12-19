const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        popup: './src/popup.js',
        dashboard: './src/dashboard.js',
        sandbox: './src/sandbox.js'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    optimization: {
        minimize: false // For easier debugging
    },
    devtool: 'cheap-module-source-map'
};
