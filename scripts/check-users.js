const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'hrms_saas',
  port: 3307
};

async function checkUsers() {
  const connection = await mysql.createConnection(config);
  const [users] = await connection.execute('SELECT id, email, status FROM users');
  console.log("Users in DB:", users);
  await connection.end();
}
checkUsers();
