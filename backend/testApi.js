const axios = require('axios');

async function runTest() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'hradmin@acmecorp.com',
      password: 'password'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful');

    // 2. Try fetching holidays
    const res = await axios.get('http://localhost:5001/api/leaves/holidays?year=2026', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Get success:', res.data.data);
  } catch (err) {
    console.error('Create error:', err.response?.data || err.message);
  }
}

runTest();
