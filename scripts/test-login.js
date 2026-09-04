const db = require('./backend/src/config/db');
const authService = require('./backend/src/services/authService');
async function test() {
  try {
    const res = await authService.login('superadmin@hrms.com', 'password123', '127.0.0.1', 'test-agent');
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit();
}
test();
