const mysql = require('mysql2/promise');
const config = { host: '127.0.0.1', user: 'root', password: 'root', database: 'hrms_saas', port: 3307, multipleStatements: true };
async function run() {
  const db = await mysql.createConnection(config);
  try {
    // Add columns one by one to avoid IF NOT EXISTS syntax issue in older MySQL
    const cols = [
      "ALTER TABLE employees ADD COLUMN bank_name VARCHAR(100)",
      "ALTER TABLE employees ADD COLUMN account_number VARCHAR(50)",
      "ALTER TABLE employees ADD COLUMN ifsc_code VARCHAR(20)",
      "ALTER TABLE employees ADD COLUMN esi_percentage DECIMAL(5,2) DEFAULT 0.75",
      "ALTER TABLE employees ADD COLUMN pf_percentage DECIMAL(5,2) DEFAULT 12.00",
      "ALTER TABLE employees ADD COLUMN monthly_paid_leaves INT DEFAULT 2",
      "ALTER TABLE employees ADD COLUMN special_allowance DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE employees ADD COLUMN other_allowance DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE employees ADD COLUMN professional_tax DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE employees ADD COLUMN advances DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE employees ADD COLUMN incentives DECIMAL(10,2) DEFAULT 0",
    ];
    for (const sql of cols) {
      try {
        await db.execute(sql);
        console.log('✅', sql.split('ADD COLUMN')[1].trim().split(' ')[0]);
      } catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('⏭️  Already exists:', sql.split('ADD COLUMN')[1].trim().split(' ')[0]);
        } else throw e;
      }
    }
    console.log('Migration complete!');
  } finally {
    await db.end();
  }
}
run().catch(console.error);
