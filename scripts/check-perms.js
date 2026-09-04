const mysql = require('mysql2/promise');
const config = { host: '127.0.0.1', user: 'root', password: 'root', database: 'hrms_saas', port: 3307 };
async function run() {
  const db = await mysql.createConnection(config);
  const [roles] = await db.execute('SELECT * FROM roles');
  console.log('ROLES:', JSON.stringify(roles, null, 2));
  const [perms] = await db.execute('SELECT * FROM permissions');
  console.log('PERMISSIONS:', JSON.stringify(perms, null, 2));
  const [rp] = await db.execute(`SELECT r.name as role, p.name as perm FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id`);
  console.log('ROLE-PERMISSIONS:', JSON.stringify(rp, null, 2));
  await db.end();
}
run().catch(console.error);
