const mysql = require('mysql2/promise');
require('dotenv').config();

async function testInsert() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'hrms_saas',
    port: process.env.DB_PORT || 3307
  });

  try {
    const [result] = await connection.query(`
      INSERT INTO holidays (organization_id, name, holiday_date, description, type, location, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [1, 'Test', '2026-01-01', '', 'National', 'All', true]);
    console.log('Inserted:', result);
  } catch (error) {
    console.error('Insert error:', error);
  } finally {
    await connection.end();
  }
}

testInsert();
