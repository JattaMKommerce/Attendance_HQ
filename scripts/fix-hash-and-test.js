require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/db');
const bcrypt = require('bcryptjs');

async function fixAndTest() {
  try {
    const hash = bcrypt.hashSync('password123', 10);
    console.log("Updating superadmin hash in DB...");
    await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'superadmin@hrms.com']);
    console.log("Hash updated.");

    console.log("Testing authService.login...");
    const authService = require('./backend/src/services/authService');
    const res = await authService.login('superadmin@hrms.com', 'password123', '127.0.0.1', 'test-agent');
    console.log("Login Success:", res.user.email);
  } catch (err) {
    console.error("Login Error:", err);
  } finally {
    process.exit();
  }
}
fixAndTest();
