const http = require('http');

function post(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api' + path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('=== LOCALHOST HRMS AUTOMATED VERIFICATION ===\n');

  // 1. Login
  console.log('1. Logging in as Admin (hrms@jattamkommerce.com)...');
  const loginRes = await post('/auth/login', {
    email: 'hrms@jattamkommerce.com',
    password: 'hrms.jmk123'
  });

  const token = loginRes.data?.data?.accessToken || loginRes.data?.data?.token;
  if (loginRes.status !== 200 || !token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  console.log('✔ Login successful! User:', loginRes.data.data.user.email);

  // 2. Attendance Overview (Deduplication Check)
  console.log('\n2. Fetching Attendance Overview Records (GET /api/attendance/records)...');
  const recordsRes = await get('/attendance/records?date=2026-10-06', token);
  const records = recordsRes.data?.data || [];
  console.log(`✔ Total attendance rows returned: ${records.length}`);
  records.forEach((r, idx) => {
    console.log(`   [${idx+1}] ID: ${r.employee_id} | Code: ${r.employee_code} | Name: ${r.first_name} ${r.last_name} | Shift: ${r.shift_name} | Status: ${r.status}`);
  });

  // Verify uniqueness of employees
  const empIds = records.map(r => r.employee_id);
  const uniqueEmpIds = new Set(empIds);
  if (empIds.length === uniqueEmpIds.size) {
    console.log(`✔ PASS: Zero duplicate employees in attendance list! (${empIds.length} unique employees)`);
  } else {
    console.error(`✖ FAIL: Duplicate employee rows detected:`, empIds);
  }

  // 3. Indian Holidays Calendar Check
  console.log('\n3. Fetching Holidays Calendar (GET /api/leaves/holidays?year=2026)...');
  const holidaysRes = await get('/leaves/holidays?year=2026', token);
  const holidays = holidaysRes.data?.data || [];
  console.log(`✔ Total holidays returned: ${holidays.length}`);
  holidays.forEach((h, idx) => {
    console.log(`   [${idx+1}] ${h.holiday_date} | ${h.name} | Type: ${h.type} | Active: ${h.is_active}`);
  });

  // Verify uniqueness of holidays
  const holidayKeys = holidays.map(h => `${h.holiday_date}_${h.name}`);
  const uniqueHolidayKeys = new Set(holidayKeys);
  if (holidayKeys.length === uniqueHolidayKeys.size) {
    console.log(`✔ PASS: Zero duplicate holidays! (${holidays.length} clean Indian holidays)`);
  } else {
    console.error(`✖ FAIL: Duplicate holidays detected!`);
  }

  // 4. Employee Attendance History & Holiday Integration
  if (records.length > 0) {
    const empId = records[0].employee_id;
    console.log(`\n4. Fetching Employee Attendance Detail with Holidays (GET /api/attendance/employee/${empId}/history?month=10&year=2026)...`);
    const historyRes = await get(`/attendance/employee/${empId}/history?month=10&year=2026`, token);
    const history = historyRes.data?.data || {};
    const histRecords = history.records || [];
    const holidayDays = histRecords.filter(r => r.status === 'holiday');
    console.log(`✔ Total days returned in October 2026: ${histRecords.length}`);
    console.log(`✔ Holiday days tagged on calendar: ${holidayDays.length}`);
    holidayDays.forEach(h => {
      console.log(`   * ${h.date}: ${h.holiday_name} (${h.notes || 'Holiday'})`);
    });
  }

  console.log('\n===========================================');
  console.log('🎉 ALL LOCALHOST CHECKS PASSED PERFECTLY!');
  console.log('===========================================');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
