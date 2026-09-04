require('dotenv').config();
const authService = require('./src/services/authService');

async function test() {
  try {
    const res = await authService.login('superadmin@hrms.com', 'password123', '127.0.0.1', 'test-agent');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("LOGIN FAILED:", err);
  }
  process.exit();
}
test();
