const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hrms_saas',
  port: process.env.DB_PORT || 3307,
};

async function seedShifts() {
  const connection = await mysql.createConnection(config);
  try {
    const orgId = 1;
    await connection.execute('INSERT IGNORE INTO shifts (id, organization_id, name, start_time, end_time, break_duration_minutes) VALUES (?, ?, ?, ?, ?, ?)', [1, orgId, 'General Shift', '09:00:00', '18:00:00', 60]);
    await connection.execute('INSERT IGNORE INTO shifts (id, organization_id, name, start_time, end_time, break_duration_minutes) VALUES (?, ?, ?, ?, ?, ?)', [2, orgId, 'Morning Shift', '06:00:00', '14:00:00', 30]);
    await connection.execute('INSERT IGNORE INTO shifts (id, organization_id, name, start_time, end_time, break_duration_minutes) VALUES (?, ?, ?, ?, ?, ?)', [3, orgId, 'Evening Shift', '14:00:00', '22:00:00', 30]);
    await connection.execute('INSERT IGNORE INTO shifts (id, organization_id, name, start_time, end_time, break_duration_minutes) VALUES (?, ?, ?, ?, ?, ?)', [4, orgId, 'Night Shift', '22:00:00', '06:00:00', 30]);
    console.log('Shifts seeded.');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
seedShifts();
