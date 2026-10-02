const fs = require('fs');
const path = require('path');
const db = require('../backend/src/config/db');

async function applyHolidaysAndLeavePolicy() {
  try {
    const rawSql = fs.readFileSync(path.join(__dirname, 'seed-holidays-and-leave-policy.sql'), 'utf8');
    
    const cleanedSql = rawSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, ' ').substring(0, 60);
      console.log(`Executing: ${preview}...`);
      await db.query(stmt);
    }

    console.log('✅ Indian National Holidays and 1-paid-leave policy applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to apply holidays and leave policy:', err);
    process.exit(1);
  }
}

applyHolidaysAndLeavePolicy();
