const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: ".env" });

async function run() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  try {
    console.log("Checking tables...");
    const res = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log("Tables before:", res.rows.map(r => r.tablename).filter(t => t.includes('disease') || t.includes('search')));
    
    console.log("Running DDL...");
    const sql = fs.readFileSync("database/production/050_health_library_tables.sql", "utf-8");
    await pool.query(sql);
    
    const res2 = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log("Tables after:", res2.rows.map(r => r.tablename).filter(t => t.includes('disease') || t.includes('search')));
  } catch (e) {
    console.error("Query failed:", e);
  } finally {
    await pool.end();
  }
}
run();
