const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

async function bootstrapHealthDatabase() {
  logger.info("🚀 Starting database bootstrap for health library...");
  
  // Run prisma db push
  try {
    logger.info("⚙️ Running prisma db push...");
    // Use env variable or default DATABASE_URL
    execSync("npx prisma db push --accept-data-loss", { 
      stdio: "inherit", 
      env: { ...process.env } 
    });
    logger.info("✅ Prisma db push completed successfully.");
  } catch (err) {
    logger.error("❌ Failed to push Prisma schema: " + err.message);
    throw err;
  }

  // Check if we need to migrate data
  const prisma = new PrismaClient();
  try {
    const diseaseCount = await prisma.disease.count();
    logger.info(`📊 Current disease count in PostgreSQL: ${diseaseCount}`);
    
    if (diseaseCount === 0) {
      logger.info("📥 Database is empty. Running SQLite to PostgreSQL migration...");
      const runMigration = require("./migrate-health-data");
      await runMigration();
      logger.info("✅ SQLite to PostgreSQL migration completed.");
    } else {
      logger.info("✅ Health library database is already populated. Skipping migration.");
    }
  } catch (err) {
    logger.error("❌ Error during database check or data migration: " + err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { bootstrapHealthDatabase };
