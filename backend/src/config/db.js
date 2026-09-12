const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrms_saas',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
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


module.exports = pool;
