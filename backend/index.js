// cPanel Phusion Passenger Root Entry Point
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

const app = require('./src/app');
require('./src/server.js');
module.exports = app;
