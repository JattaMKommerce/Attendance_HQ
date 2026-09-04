const mysql = require('mysql2/promise');
const config = { host: '127.0.0.1', user: 'root', password: 'root', database: 'hrms_saas', port: 3307 };

async function run() {
  const db = await mysql.createConnection(config);

  // 1. Add missing employee.manage_status permission
  await db.execute(`
    INSERT IGNORE INTO permissions (name, resource, action, description)
    VALUES ('employee.manage_status', 'employee', 'manage_status', 'Activate or deactivate employees')
  `);

  // 2. Get all role IDs
  const [[orgAdmin]] = await db.execute(`SELECT id FROM roles WHERE name = 'ORG_ADMIN'`);
  const [[hrAdmin]]  = await db.execute(`SELECT id FROM roles WHERE name = 'HR_ADMIN'`);
  const [[manager]]  = await db.execute(`SELECT id FROM roles WHERE name = 'MANAGER'`);
  const [[employee]] = await db.execute(`SELECT id FROM roles WHERE name = 'EMPLOYEE'`);

  // 3. Get all permission IDs
  const [allPerms] = await db.execute(`SELECT id, name FROM permissions`);
  const perm = {};
  allPerms.forEach(p => perm[p.name] = p.id);

  // 4. Define role → permissions mapping
  const mappings = [
    // ORG_ADMIN gets everything employee-related
    { role_id: orgAdmin.id, perm_id: perm['employee.view'] },
    { role_id: orgAdmin.id, perm_id: perm['employee.create'] },
    { role_id: orgAdmin.id, perm_id: perm['employee.update'] },
    { role_id: orgAdmin.id, perm_id: perm['employee.delete'] },
    { role_id: orgAdmin.id, perm_id: perm['employee.manage_status'] },
    { role_id: orgAdmin.id, perm_id: perm['attendance.view'] },
    { role_id: orgAdmin.id, perm_id: perm['attendance.manage'] },
    { role_id: orgAdmin.id, perm_id: perm['leave.view'] },
    { role_id: orgAdmin.id, perm_id: perm['leave.approve'] },
    { role_id: orgAdmin.id, perm_id: perm['leave.apply'] },
    { role_id: orgAdmin.id, perm_id: perm['payroll.view'] },
    { role_id: orgAdmin.id, perm_id: perm['payroll.create'] },
    { role_id: orgAdmin.id, perm_id: perm['payroll.edit'] },
    { role_id: orgAdmin.id, perm_id: perm['payroll.approve'] },
    { role_id: orgAdmin.id, perm_id: perm['recruitment.view'] },
    { role_id: orgAdmin.id, perm_id: perm['recruitment.manage'] },
    { role_id: orgAdmin.id, perm_id: perm['reports.view'] },
    { role_id: orgAdmin.id, perm_id: perm['reports.export'] },
    { role_id: orgAdmin.id, perm_id: perm['organizations.view'] },

    // HR_ADMIN gets employee + leave + attendance
    { role_id: hrAdmin.id, perm_id: perm['employee.view'] },
    { role_id: hrAdmin.id, perm_id: perm['employee.create'] },
    { role_id: hrAdmin.id, perm_id: perm['employee.update'] },
    { role_id: hrAdmin.id, perm_id: perm['employee.manage_status'] },
    { role_id: hrAdmin.id, perm_id: perm['attendance.view'] },
    { role_id: hrAdmin.id, perm_id: perm['attendance.manage'] },
    { role_id: hrAdmin.id, perm_id: perm['leave.view'] },
    { role_id: hrAdmin.id, perm_id: perm['leave.approve'] },
    { role_id: hrAdmin.id, perm_id: perm['reports.view'] },

    // MANAGER gets view-only + leave approve for their team
    { role_id: manager.id, perm_id: perm['employee.view'] },
    { role_id: manager.id, perm_id: perm['attendance.view'] },
    { role_id: manager.id, perm_id: perm['leave.view'] },
    { role_id: manager.id, perm_id: perm['leave.approve'] },

    // EMPLOYEE gets minimal self-service
    { role_id: employee.id, perm_id: perm['attendance.view'] },
    { role_id: employee.id, perm_id: perm['leave.apply'] },
    { role_id: employee.id, perm_id: perm['leave.view'] },
  ];

  let inserted = 0;
  for (const m of mappings) {
    if (!m.perm_id) continue; // skip if perm not found
    const [res] = await db.execute(
      'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [m.role_id, m.perm_id]
    );
    inserted += res.affectedRows;
  }

  console.log(`✅ Done! Inserted ${inserted} role-permission mappings.`);
  await db.end();
}
run().catch(console.error);
