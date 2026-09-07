const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 1, organization_id: 1, role_id: 1, roles: ['ORG_ADMIN', 'HR_ADMIN'], permissions: ['attendance.create', 'attendance.view'] }, 
  'your_jwt_secret_key_here_make_it_long_and_random', 
  { expiresIn: '1h' }
);

axios.post('http://127.0.0.1:5001/api/attendance/records/manual', {
  employeeId: 1,
  date: '2026-09-07',
  status: 'present',
  checkInTime: '2026-09-07 09:00:00',
  checkOutTime: '2026-09-07 18:00:00',
  workDurationMinutes: 540
}, {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
