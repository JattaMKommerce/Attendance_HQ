const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'hrms_saas',
  port: 3307
};

async function seedAcme() {
  const connection = await mysql.createConnection(config);
  try {
    const hash = '$2b$10$xOYsgf/2m8/LP4s.ta7itOq.MkzKjIlM5eeczHvgD1K0ZiL9XP7re';
    
    // Seed Organization
    const [orgRes] = await connection.execute(
      `INSERT INTO organizations (name, subdomain, email, status) 
       VALUES ('Acme Corp', 'acme', 'admin@acme.com', 'active')`
    );
    const orgId = orgRes.insertId;
    
    // Get roles
    const [roles] = await connection.execute('SELECT id, name FROM roles');
    const adminRoleId = roles.find(r => r.name === 'ORG_ADMIN').id;
    const employeeRoleId = roles.find(r => r.name === 'EMPLOYEE').id;

    // Seed Admin
    const [adminRes] = await connection.execute(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) 
       VALUES (?, 'admin@acme.com', ?, 'Alice', 'Admin', 'active')`,
      [orgId, hash]
    );
    await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminRes.insertId, adminRoleId]);

    // Seed Employee
    const [empRes] = await connection.execute(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) 
       VALUES (?, 'employee@acme.com', ?, 'Bob', 'Employee', 'active')`,
      [orgId, hash]
    );
    await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [empRes.insertId, employeeRoleId]);

    console.log("Acme Corp, admin, and employee seeded successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
seedAcme();
