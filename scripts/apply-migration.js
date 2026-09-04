const mysql = require('mysql2/promise');
const fs = require('fs');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'hrms_saas',
  port: 3307,
  multipleStatements: true
};

async function applyMigration() {
  const connection = await mysql.createConnection(config);
  try {
    const sql = fs.readFileSync('backend/database/schema/14_employee_extensions.sql', 'utf8');
    await connection.query(sql);
    console.log("Migration applied successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
applyMigration();
