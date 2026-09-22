// cPanel Phusion Passenger Root Entry Point
const app = require('./src/app');
require('./src/server.js');
module.exports = app;
