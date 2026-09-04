const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting payroll migration...');
        const sqlPath = path.join(__dirname, 'database/schema/18_payroll_management.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

        for (let stmt of statements) {
            await db.query(stmt);
        }
        console.log('Payroll migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
