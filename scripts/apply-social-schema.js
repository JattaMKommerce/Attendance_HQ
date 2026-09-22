const fs = require('fs');
const path = require('path');
const db = require('../backend/src/config/db');

async function applySchema() {
  try {
    const rawSql = fs.readFileSync(path.join(__dirname, '../backend/database/schema/21_jmk_social.sql'), 'utf8');
    
    // Strip comment lines
    const cleanedSql = rawSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split on semicolon
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, ' ').substring(0, 60);
      console.log(`Executing: ${preview}...`);
      await db.query(stmt);
    }

    console.log('✅ JMK Social tables created successfully!');
    
    const [tables] = await db.query("SHOW TABLES LIKE 'social%'");
    console.log('Verified social tables:', tables.map(t => Object.values(t)[0]));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to apply social schema:', err);
    process.exit(1);
  }
}

applySchema();
