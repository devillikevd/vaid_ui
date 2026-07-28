/**
 * migrate-health-data.js
 * ──────────────────────
 * Reads the pre-exported JSON seed (gzipped) and bulk-inserts diseases +
 * categories into PostgreSQL via Prisma.
 *
 * This version has ZERO native-module dependencies (no node:sqlite).
 * It runs identically on macOS, Linux, Alpine Docker, AWS, etc.
 */

const path = require("node:path");
const fs = require("node:fs");
const zlib = require("node:zlib");
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const SEED_PATH = path.join(__dirname, "..", "database", "seeds", "health_library_seed.json.gz");

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runMigration() {
  const prisma = new PrismaClient();

  try {
    // ── Read seed file ──
    if (!fs.existsSync(SEED_PATH)) {
      throw new Error(`Seed file not found at ${SEED_PATH}. Run 'node scripts/export-health-data.js' locally first.`);
    }

    const compressed = fs.readFileSync(SEED_PATH);
    const json = zlib.gunzipSync(compressed).toString("utf-8");
    const { diseases, categories } = JSON.parse(json);

    if (!Array.isArray(diseases) || !Array.isArray(categories)) {
      throw new Error("Seed file is malformed — expected { diseases: [...], categories: [...] }");
    }

    logger.info(`📦 Seed loaded: ${diseases.length} diseases, ${categories.length} categories`);

    // ── Clear existing rows (idempotent re-runs) ──
    await prisma.searchStat.deleteMany();
    await prisma.disease.deleteMany();
    await prisma.category.deleteMany();

    // ── Insert diseases in batches ──
    let inserted = 0;
    for (const batch of chunk(diseases, 1000)) {
      await prisma.disease.createMany({ data: batch, skipDuplicates: true });
      inserted += batch.length;
      logger.info(`  inserted ${inserted} / ${diseases.length} diseases...`);
    }

    // ── Insert categories ──
    await prisma.category.createMany({ data: categories, skipDuplicates: true });

    const [dCount, cCount] = await Promise.all([
      prisma.disease.count(),
      prisma.category.count(),
    ]);
    logger.info(`✅ Migration successful: ${dCount} diseases, ${cCount} categories in PostgreSQL`);
  } catch (err) {
    logger.error("❌ Migration failed: " + err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = runMigration;
