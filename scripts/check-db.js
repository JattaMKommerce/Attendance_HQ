const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hrms_saas',
  port: process.env.DB_PORT || 3307,
};

const maxRetries = 30;
const delayMs = 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkDatabaseReady() {
  console.log('Waiting for MySQL database to be ready...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const connection = await mysql.createConnection(config);
      await connection.ping();
      await connection.end();
      console.log('✅ MySQL database is ready and accepting connections!');
      process.exit(0);
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('❌ Failed to connect to MySQL database after maximum retries.');
        console.error(error.message);
        process.exit(1);
      }
      // Wait and try again
      await delay(delayMs);
    }
  }
}

checkDatabaseReady();
