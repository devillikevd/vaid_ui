const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Since we cannot run raw DDL via supabase-js easily, we can use the postgres connection string or try to use REST if there's a custom endpoint.
// Wait, actually we can run a SQL function if `exec_sql` exists, otherwise we'll connect via pg module.
const { Pool } = require('pg');

async function run() {
  if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL found. Will attempt to construct one from SUPABASE_URL");
      // Supabase urls: https://xyz.supabase.co
      // host: db.xyz.supabase.co
      const urlObj = new URL(supabaseUrl);
      const host = "db." + urlObj.hostname.split('.')[0] + ".supabase.co";
      process.env.DATABASE_URL = `postgres://postgres:${process.env.SUPABASE_DB_PASSWORD}@${host}:5432/postgres`;
  }
  
  if (!process.env.DATABASE_URL) {
      console.log("Missing DATABASE_URL");
      return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Altering diagnostic_bookings table...");
    await pool.query('ALTER TABLE diagnostic_bookings ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL;');
    console.log("Successfully added prescription_id column.");
  } catch(e) {
    console.error("Error executing SQL:", e);
  } finally {
    await pool.end();
  }
}

run();
