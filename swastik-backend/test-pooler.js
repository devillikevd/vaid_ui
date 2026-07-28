const { Pool } = require("pg");
const connectionString = "postgresql://postgres.fzbdticlmxbxeektckst:2Dv%23E8-kadJ6%23Pi@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query("SELECT 1 as val");
    console.log("Success:", res.rows[0].val);
  } catch(e) {
    console.error("Failed:", e.message);
  } finally {
    await pool.end();
  }
}
run();
