/**
 * bootstrap-db.js
 * ────────────────
 * Bootstraps the health library database in MongoDB by checking if the
 * Disease collection is empty and running the JSON seed migration if needed.
 */

const { connectMongoDB, mongoose } = require("../config/mongodb");
const { Disease } = require("../database/models");
const logger = require("../utils/logger");

async function bootstrapHealthDatabase() {
  try {
    // ── Step 1: Connect to MongoDB ──
    await connectMongoDB();

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      logger.info("ℹ️ MongoDB not connected. Skipping health database bootstrap.");
      return;
    }

    // ── Step 2: Seed data if empty ──
    const diseaseCount = await Disease.countDocuments();
    logger.info(`📊 Current disease count in MongoDB: ${diseaseCount}`);

    if (diseaseCount === 0) {
      logger.info("📥 Database is empty. Running JSON seed → MongoDB migration...");
      const runMigration = require("./migrate-health-data");
      await runMigration();
      logger.info("✅ Health library seed completed.");
    } else {
      logger.info("✅ Health library database is already populated. Skipping seed.");
    }
  } catch (err) {
    logger.error("❌ Error during database check or data seeding: " + err.message);
    throw err;
  }
}

module.exports = { bootstrapHealthDatabase };

