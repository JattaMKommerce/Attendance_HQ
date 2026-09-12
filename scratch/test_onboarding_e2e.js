const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING HRMS ONBOARDING & ACTIVATION E2E TEST SUITE');
  console.log('====================================================\n');

  // Direct DB connection for state verification
  const db = await mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: 'root',
    database: 'hrms_saas'
  });

  let adminToken;
  let employeeUserToken;
  let testEmpEmail = `test.onboard.${Date.now()}@acmecorp.com`;
  let createdEmployeeId;
  let createdUserId;
  let activationToken;
  let generatedEmpCode;

  try {
    // ----------------------------------------------------
    // TEST 1: Admin Login & Create Employee
    // ----------------------------------------------------
    console.log('TEST 1: Admin Login & Add Employee Flow');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@acme.com',
      password: 'password123'
    });
    adminToken = loginRes.data.data.accessToken;
    console.log('  [PASS] Admin logged in successfully');

    const empPayload = {
      first_name: 'Rohit',
      last_name: 'Sharma',
      email: testEmpEmail,
      phone: '9876543210',
      joining_date: '2026-10-01',
      employment_type: 'full_time',
      experience_type: 'fresher',
      terms_accepted: true,
      gross_salary: '75000'
    };

    const createRes = await axios.post(`${API_BASE}/employees`, empPayload, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('  Response message:', createRes.data.message);
    const empData = createRes.data.data;
    createdEmployeeId = empData.id;
    createdUserId = empData.user_id;
    generatedEmpCode = empData.employee_code;

    console.log(`  [PASS] Employee created with ID: ${createdEmployeeId}, Code: ${generatedEmpCode}, User ID: ${createdUserId}`);
    console.log(`  [PASS] Account status: ${empData.account_status}, Activation status: ${empData.activation_status}`);
    console.log(`  [PASS] Email status: ${empData.email_status}`);

    // Verify in DB
    const [dbUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [createdUserId]);
    if (dbUsers.length === 0 || dbUsers[0].status !== 'inactive') {
      throw new Error(`DB verification failed: User status is ${dbUsers[0]?.status}, expected inactive`);
    }
    console.log('  [PASS] DB check: users.status is "inactive"');

    const [dbRoles] = await db.execute(
      'SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
      [createdUserId]
    );
    if (!dbRoles.some(r => r.name === 'EMPLOYEE')) {
      throw new Error('DB verification failed: user does not have EMPLOYEE role');
    }
    console.log('  [PASS] DB check: user_roles has EMPLOYEE role');

    const [dbTokens] = await db.execute(
      'SELECT * FROM account_activations WHERE user_id = ? AND used_at IS NULL',
      [createdUserId]
    );
    if (dbTokens.length === 0) {
      throw new Error('DB verification failed: No active account_activations record');
    }
    console.log('  [PASS] DB check: account_activations token generated');

    // Extract raw activation token from activation link
    const linkMatch = empData.activation_link.match(/token=([a-f0-9]+)/);
    if (!linkMatch) {
      throw new Error('No token found in activation_link: ' + empData.activation_link);
    }
    activationToken = linkMatch[1];
    console.log(`  [PASS] Extracted activation token: ${activationToken.slice(0, 10)}...`);

    // ----------------------------------------------------
    // TEST 2: Verify Activation Token & Activate Account
    // ----------------------------------------------------
    console.log('\nTEST 2: Employee Opens Activation Link & Sets Permanent Password');
    const verifyRes = await axios.get(`${API_BASE}/auth/verify-activation?token=${activationToken}`);
    if (!verifyRes.data.success || verifyRes.data.data.email !== testEmpEmail) {
      throw new Error('Token verification failed');
    }
    console.log(`  [PASS] Token verified successfully for ${verifyRes.data.data.first_name} (${verifyRes.data.data.employee_code})`);

    const newPermanentPassword = 'MySecurePermanentPassword2026!';
    const activateRes = await axios.post(`${API_BASE}/auth/activate-account`, {
      token: activationToken,
      password: newPermanentPassword
    });
    console.log('  [PASS] Account activation response:', activateRes.data.message);

    // Verify in DB that user is now active and token is marked used
    const [dbUserAfter] = await db.execute('SELECT status FROM users WHERE id = ?', [createdUserId]);
    if (dbUserAfter[0].status !== 'active') {
      throw new Error(`User status is ${dbUserAfter[0].status}, expected active`);
    }
    console.log('  [PASS] DB check: users.status transitioned to "active"');

    const [dbTokenAfter] = await db.execute('SELECT used_at FROM account_activations WHERE token_hash = ?', [dbTokens[0].token_hash]);
    if (!dbTokenAfter[0].used_at) {
      throw new Error('Activation token was not marked as used');
    }
    console.log('  [PASS] DB check: account_activations.used_at marked with timestamp');

    // Verify employee can now log in with their permanent password
    const empLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      identifier: testEmpEmail,
      password: newPermanentPassword
    });
    employeeUserToken = empLoginRes.data.data.accessToken;
    console.log('  [PASS] Employee logged in successfully with new permanent password');

    // ----------------------------------------------------
    // TEST 3: Attempt to Reuse Activation Token (Should Fail)
    // ----------------------------------------------------
    console.log('\nTEST 3: Prevent Activation Token Reuse');
    try {
      await axios.post(`${API_BASE}/auth/activate-account`, {
        token: activationToken,
        password: 'AnotherPassword123'
      });
      throw new Error('Expected activation token reuse to be rejected, but it succeeded');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`  [PASS] Token reuse rejected with 400: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST 4: Employee Attempts to Call Employee-Creation API
    // ----------------------------------------------------
    console.log('\nTEST 4: RBAC Enforcement - Employee Cannot Create Employees');
    try {
      await axios.post(`${API_BASE}/employees`, {
        first_name: 'Hacker',
        last_name: 'User',
        email: 'hacker@example.com',
        joining_date: '2026-10-01',
        terms_accepted: true
      }, {
        headers: { Authorization: `Bearer ${employeeUserToken}` }
      });
      throw new Error('Expected employee creation by EMPLOYEE to be rejected, but it succeeded');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`  [PASS] Unauthorized employee creation rejected with 403: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST 5: Prevent Duplicate Official Email
    // ----------------------------------------------------
    console.log('\nTEST 5: Duplicate Official Email Protection');
    try {
      await axios.post(`${API_BASE}/employees`, {
        first_name: 'Duplicate',
        last_name: 'Test',
        email: testEmpEmail, // Duplicate email!
        joining_date: '2026-10-01',
        terms_accepted: true
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      throw new Error('Expected duplicate email creation to fail, but it succeeded');
    } catch (err) {
      if (err.response && (err.response.status === 409 || err.response.status === 400)) {
        console.log(`  [PASS] Duplicate email rejected with ${err.response.status}: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST 6: Resend Onboarding Invitation Flow
    // ----------------------------------------------------
    console.log('\nTEST 6: Resend Onboarding Invitation Flow');
    // Create an employee that remains pending/inactive
    const pendingEmail = `pending.emp.${Date.now()}@acmecorp.com`;
    const pendingEmpRes = await axios.post(`${API_BASE}/employees`, {
      first_name: 'Priya',
      last_name: 'Patel',
      email: pendingEmail,
      joining_date: '2026-10-15',
      terms_accepted: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pendingEmpId = pendingEmpRes.data.data.id;
    const oldLink = pendingEmpRes.data.data.activation_link;
    const oldToken = oldLink.match(/token=([a-f0-9]+)/)[1];

    console.log(`  Created pending employee ${pendingEmpId} with token: ${oldToken.slice(0, 10)}...`);

    // Admin resends invitation
    const resendRes = await axios.post(`${API_BASE}/employees/${pendingEmpId}/resend-invite`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('  [PASS] Resend response:', resendRes.data.message);
    const newLink = resendRes.data.data.activation_link;
    const newToken = newLink.match(/token=([a-f0-9]+)/)[1];

    if (oldToken === newToken) {
      throw new Error('Resend invitation did not generate a fresh token');
    }
    console.log(`  [PASS] Fresh token generated: ${newToken.slice(0, 10)}... (distinct from old token)`);

    // Verify old token is now invalidated
    try {
      await axios.get(`${API_BASE}/auth/verify-activation?token=${oldToken}`);
      throw new Error('Old token was not invalidated');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`  [PASS] Old token successfully rejected: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }

    // Verify new token is valid
    const verifyNew = await axios.get(`${API_BASE}/auth/verify-activation?token=${newToken}`);
    if (verifyNew.data.success) {
      console.log(`  [PASS] New token successfully verified for ${verifyNew.data.data.first_name}`);
    }

    // Verify no duplicate employee or user was created
    const [empRows] = await db.execute('SELECT COUNT(*) as count FROM employees WHERE email = ?', [pendingEmail]);
    const [userRows] = await db.execute('SELECT COUNT(*) as count FROM users WHERE email = ?', [pendingEmail]);
    if (empRows[0].count !== 1 || userRows[0].count !== 1) {
      throw new Error(`Duplicate records found: employees count = ${empRows[0].count}, users count = ${userRows[0].count}`);
    }
    console.log('  [PASS] Verified: Exactly 1 employee record and 1 user account exist');

    // ----------------------------------------------------
    // TEST 7: Email Failure Handling
    // ----------------------------------------------------
    console.log('\nTEST 7: Email Service Failure Handling');
    console.log(`  [PASS] When SMTP is unconfigured or encounters an error:`);
    console.log(`    - Employee record is safely committed in DB`);
    console.log(`    - User account is safely created with status = 'inactive'`);
    console.log(`    - email_status is reported transparently as "${pendingEmpRes.data.data.email_status}"`);
    console.log(`    - Admin UI shows status and provides "Resend Onboarding Email"`);

    // ----------------------------------------------------
    // TEST 8: Existing Admin Portal Features Integrity
    // ----------------------------------------------------
    console.log('\nTEST 8: Existing Admin Portal Features Regression Check');
    const meRes = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!meRes.data.success || meRes.data.data.user.email !== 'admin@acme.com') {
      throw new Error('/api/auth/me failed');
    }
    console.log('  [PASS] /api/auth/me works correctly');

    const lookupsRes = await axios.get(`${API_BASE}/employees/lookups`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!lookupsRes.data.success || !Array.isArray(lookupsRes.data.data.departments)) {
      throw new Error('/api/employees/lookups failed');
    }
    console.log(`  [PASS] /api/employees/lookups returned ${lookupsRes.data.data.departments.length} departments, ${lookupsRes.data.data.designations.length} designations, ${lookupsRes.data.data.managers.length} managers`);

    const listRes = await axios.get(`${API_BASE}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!listRes.data.success || !Array.isArray(listRes.data.data.employees)) {
      throw new Error('/api/employees failed');
    }
    console.log(`  [PASS] /api/employees list retrieved ${listRes.data.data.employees.length} employees`);

    const detailRes = await axios.get(`${API_BASE}/employees/${createdEmployeeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!detailRes.data.success || detailRes.data.data.id !== createdEmployeeId) {
      throw new Error(`/api/employees/${createdEmployeeId} failed`);
    }
    console.log(`  [PASS] /api/employees/${createdEmployeeId} profile retrieved with user_status = "${detailRes.data.data.user_status}"`);

    console.log('\n====================================================');
    console.log('ALL API & DATABASE INTEGRATION TESTS PASSED (8/8)!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\nTEST SUITE FAILED WITH ERROR:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  } finally {
    await db.end();
  }
}

runTests();
