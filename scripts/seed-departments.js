const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'hrms_saas',
  port: 3307
};

async function seed() {
  const connection = await mysql.createConnection(config);
  try {
    // Hardcode org ID 1 for ACME Corp (based on earlier scripts)
    const orgId = 1;

    const departments = [
      'Engineering', 'IT', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations'
    ];
    
    for (const d of departments) {
      await connection.execute(
        'INSERT IGNORE INTO departments (organization_id, name) VALUES (?, ?)',
        [orgId, d]
      );
    }

    const designations = [
      'Junior Developer', 'Senior Developer', 'Tech Lead', 'Sales Associate', 
      'Sales Manager', 'HR Executive', 'HR Manager', 'System Administrator',
      'Marketing Specialist', 'Finance Analyst'
    ];

    for (const des of designations) {
      await connection.execute(
        'INSERT IGNORE INTO designations (organization_id, name) VALUES (?, ?)',
        [orgId, des]
      );
    }

    console.log("Departments and Designations seeded successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
seed();
