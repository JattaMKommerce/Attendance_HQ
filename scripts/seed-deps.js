const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'hrms_saas',
  port: 3307
};

async function seedDeps() {
  const connection = await mysql.createConnection(config);
  try {
    const [orgs] = await connection.execute('SELECT id FROM organizations WHERE subdomain = "acme"');
    if (orgs.length === 0) throw new Error("Acme not found");
    const orgId = orgs[0].id;
    
    // Seed Departments
    const deps = ['Engineering', 'Human Resources', 'Sales', 'Marketing'];
    for (const d of deps) {
       await connection.execute('INSERT IGNORE INTO departments (organization_id, name) VALUES (?, ?)', [orgId, d]);
    }

    // Seed Designations
    const desigs = ['Software Engineer', 'Senior Software Engineer', 'HR Manager', 'Sales Representative', 'Marketing Specialist'];
    for (const d of desigs) {
       await connection.execute('INSERT IGNORE INTO designations (organization_id, name) VALUES (?, ?)', [orgId, d]);
    }
    console.log("Departments and designations seeded for Acme.");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
seedDeps();
