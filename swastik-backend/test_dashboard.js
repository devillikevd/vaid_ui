require('dotenv').config();
const { getDashboard } = require('./services/diagnosticCenterService');

async function testHistory() {
  const result = await getDashboard('f4e8fe5d-43cc-41d7-a1a6-56dde6ec841c');
  console.log(JSON.stringify(result, null, 2));
}

testHistory();
