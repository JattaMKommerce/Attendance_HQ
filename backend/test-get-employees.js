const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 2, organization_id: 1, role_id: 2, roles: ['ORG_ADMIN', 'HR_ADMIN'], permissions: ['employee.view'] }, 
  'your_jwt_secret_key_here_make_it_long_and_random', 
  { expiresIn: '1h' }
);

axios.get('http://127.0.0.1:5001/api/employees', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(JSON.stringify(res.data, null, 2))).catch(err => console.error(err.response ? err.response.data : err.message));
