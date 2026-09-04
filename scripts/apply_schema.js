const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hrms_saas',
  port: process.env.DB_PORT || 3307,
  multipleStatements: true
};

async function apply() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    const sqlFile = path.join(__dirname, '../backend/database/schema/17_leave_enhancements.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await connection.query(sql);
    console.log('Schema applied successfully.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (connection) await connection.end();
  }
}

apply();
