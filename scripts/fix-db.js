const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'hrms_saas',
  port: 3307
};

async function fixHash() {
  const connection = await mysql.createConnection(config);
  const hash = '$2b$10$xOYsgf/2m8/LP4s.ta7itOq.MkzKjIlM5eeczHvgD1K0ZiL9XP7re';
  console.log("Using hash:", hash);
  await connection.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'superadmin@hrms.com']);
  console.log("Updated superadmin@hrms.com password hash in the database successfully!");
  
  // also fix employee/admin if they exist
  await connection.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@acme.com']);
  await connection.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'employee@acme.com']);

  await connection.end();
}
fixHash();
