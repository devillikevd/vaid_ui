const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    const sql = fs.readFileSync('database/production/056_community_qa_v4.sql', 'utf8');
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

require('dotenv').config();
run();
