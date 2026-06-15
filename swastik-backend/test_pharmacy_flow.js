const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { io } = require('socket.io-client');

const API_URL = 'http://localhost:5000/api';
// Assuming we have a test user token or we can just login
// First, let's check if the backend is running
axios.get(`${API_URL}/health`).then(res => console.log('Backend is running')).catch(err => console.log('Backend is not running, please start it'));
