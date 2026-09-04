const db = require('./src/config/db');

async function resetHolidays() {
  try {
    console.log('Clearing holidays table...');
    await db.query('TRUNCATE TABLE holidays');
    console.log('Holidays table cleared successfully.');
  } catch (error) {
    console.error('Failed to clear holidays:', error);
  } finally {
    process.exit(0);
  }
}

resetHolidays();
