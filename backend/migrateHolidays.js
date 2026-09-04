const db = require('./src/config/db');

async function migrate() {
  try {
    console.log('Running migration for holidays table...');
    
    // Add columns if they don't exist
    const [columns] = await db.query(`SHOW COLUMNS FROM holidays`);
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('type')) {
      await db.query(`ALTER TABLE holidays ADD COLUMN type VARCHAR(50) DEFAULT 'Company'`);
      console.log('Added column: type');
    }
    
    if (!columnNames.includes('location')) {
      await db.query(`ALTER TABLE holidays ADD COLUMN location VARCHAR(100) DEFAULT 'All'`);
      console.log('Added column: location');
    }
    
    if (!columnNames.includes('is_active')) {
      await db.query(`ALTER TABLE holidays ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
      console.log('Added column: is_active');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
