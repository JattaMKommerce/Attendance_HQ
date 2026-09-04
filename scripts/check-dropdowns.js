const mysql = require('mysql2/promise');
const config = { host: '127.0.0.1', user: 'root', password: 'root', database: 'hrms_saas', port: 3307 };
async function run() {
  const db = await mysql.createConnection(config);
  const [users] = await db.execute('SELECT id, email, organization_id FROM users');
  console.log('USERS:', JSON.stringify(users));
  const [depts] = await db.execute('SELECT id, organization_id, name FROM departments');
  console.log('DEPARTMENTS:', JSON.stringify(depts));
  const [desigs] = await db.execute('SELECT id, organization_id, name FROM designations');
  console.log('DESIGNATIONS:', JSON.stringify(desigs));
  await db.end();
}
run().catch(console.error);
