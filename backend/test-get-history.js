const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 1, organization_id: 1, role_id: 1, roles: ['ORG_ADMIN', 'HR_ADMIN'], permissions: ['attendance.view'] }, 
  'your_jwt_secret_key_here_make_it_long_and_random', 
  { expiresIn: '1h' }
);

axios.get('http://127.0.0.1:5001/api/attendance/employee/1/history?year=2026&month=09', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(res.data.data)).catch(err => console.error(err.response ? err.response.data : err.message));
