const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const DISEASE_FIELDS = [
  "code", "name", "first_letter", "chapter", "body_system", "severity",
  "keywords", "source", "variant_count", "summary", "overview", "types",
  "symptoms", "causes", "risk_factors", "diagnosis", "medicines",
  "home_remedies", "complications", "prevention", "when_to_see_doctor", "faqs",
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runMigration() {
  const SQLITE_PATH = path.join(__dirname, "..", "database", "health_library.db");
  const prisma = new PrismaClient();

  try {
    if (!fs.existsSync(SQLITE_PATH)) {
      logger.error(`Error: SQLite DB not found at ${SQLITE_PATH}`);
      throw new Error(`SQLite DB not found at ${SQLITE_PATH}`);
    }

    const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });

    // ── Diseases ──
    const rawDiseases = sqlite.prepare("SELECT * FROM unique_diseases").all();
    const diseases = rawDiseases.map((r) => {
      const d = {};
      for (const f of DISEASE_FIELDS) d[f] = r[f] ?? (f === "variant_count" ? 1 : (["keywords"].includes(f) ? "" : null));
      d.severity = r.severity || "General";
      d.keywords = r.keywords || "";
      d.source = r.source || "ICD-10-CM";
      d.variant_count = r.variant_count ?? 1;
      return d;
    });

    // ── Categories ──
    const rawCats = sqlite.prepare("SELECT * FROM categories").all();
    const categories = rawCats.map((c) => ({
      chapter: c.chapter,
      body_system: c.body_system,
      disease_count: c.disease_count ?? 0,
      icon: c.icon || "",
    }));

    sqlite.close();

    const cachedCount = diseases.filter((d) => d.faqs).length;
    logger.info(`Migrating SQLite -> PostgreSQL (${diseases.length} diseases, ${categories.length} categories)`);

    // Clear existing rows (idempotent re-runs)
    await prisma.searchStat.deleteMany();
    await prisma.disease.deleteMany();
    await prisma.category.deleteMany();

    // Insert diseases in batches
    let inserted = 0;
    for (const batch of chunk(diseases, 1000)) {
      await prisma.disease.createMany({ data: batch, skipDuplicates: true });
      inserted += batch.length;
      logger.info(`  inserted ${inserted} / ${diseases.length} diseases...`);
    }

    await prisma.category.createMany({ data: categories, skipDuplicates: true });
    
    const [dCount, cCount] = await Promise.all([prisma.disease.count(), prisma.category.count()]);
    logger.info(`Migration successful: ${dCount} diseases, ${cCount} categories in PostgreSQL`);
  } catch (err) {
    logger.error("Migration failed: " + err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = runMigration;
