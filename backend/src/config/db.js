const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrms_saas',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  maxIdle: parseInt(process.env.DB_MAX_IDLE, 10) || 10,
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 60000,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: process.env.DB_TIMEZONE || '+00:00',
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Enable SSL if required for cloud database (AWS RDS, Google Cloud SQL, DigitalOcean)
if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false' && process.env.DB_HOST !== '127.0.0.1') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  };
}

const pool = mysql.createPool(poolConfig);

// Pool connection event error handling for reconnect-safe behavior
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('[MySQL Connection Error]:', err.code || err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.warn('[MySQL Pool] Connection lost. MySQL pool will automatically re-establish connections.');
    }
  });
});


module.exports = pool;
