const axios = require('axios');

const pyClient = axios.create({
  baseURL: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5001',
  timeout: 45000,
  headers: {
    'Accept': 'application/json'
  }
});

module.exports = pyClient;
