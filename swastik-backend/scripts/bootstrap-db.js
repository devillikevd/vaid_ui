/**
 * bootstrap-db.js
 * ────────────────
 * Creates health-library tables in PostgreSQL (if they don't exist) using
 * raw SQL via the `pg` driver, then seeds data from the JSON seed file
 * if the tables are empty.
 *
 * This replaces the previous approach that relied on `npx prisma db push`
 * (which needs the Prisma CLI binary at runtime — unreliable in Docker).
 */

const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const SQL_PATH = path.join(
  __dirname, "..", "database", "production", "050_health_library_tables.sql"
);

async function bootstrapHealthDatabase() {
  logger.info("🚀 Starting database bootstrap for health library...");

  // ── Step 1: Create tables via raw SQL ──
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    const sql = fs.readFileSync(SQL_PATH, "utf-8");
    logger.info("⚙️  Running health library DDL (CREATE TABLE IF NOT EXISTS)...");
    await pool.query(sql);
    logger.info("✅ Health library tables are ready.");
  } catch (err) {
    logger.error("❌ Failed to create health library tables: " + err.message);
    throw err;
  } finally {
    await pool.end();
  }

  // ── Step 2: Seed data if empty ──
  const prisma = new PrismaClient();
  try {
    const diseaseCount = await prisma.disease.count();
    logger.info(`📊 Current disease count in PostgreSQL: ${diseaseCount}`);

    if (diseaseCount === 0) {
      logger.info("📥 Database is empty. Running JSON seed → PostgreSQL migration...");
      const runMigration = require("./migrate-health-data");
      await runMigration();
      logger.info("✅ Health library seed completed.");
    } else {
      logger.info("✅ Health library database is already populated. Skipping seed.");
    }
  } catch (err) {
    logger.error("❌ Error during database check or data seeding: " + err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { bootstrapHealthDatabase };
