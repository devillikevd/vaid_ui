/**
 * export-health-data.js
 * ─────────────────────
 * One-time LOCAL script: reads the SQLite health_library.db and writes
 * a compressed JSON seed file that can be loaded on ANY platform
 * (no node:sqlite needed on production).
 *
 * Usage:  node scripts/export-health-data.js
 * Output: database/seeds/health_library_seed.json.gz
 */

const path = require("node:path");
const fs = require("node:fs");
const zlib = require("node:zlib");
const { DatabaseSync } = require("node:sqlite");

const SQLITE_PATH = path.join(__dirname, "..", "database", "health_library.db");
const SEED_DIR = path.join(__dirname, "..", "database", "seeds");
const SEED_PATH = path.join(SEED_DIR, "health_library_seed.json.gz");

const DISEASE_FIELDS = [
  "code", "name", "first_letter", "chapter", "body_system", "severity",
  "keywords", "source", "variant_count", "summary", "overview", "types",
  "symptoms", "causes", "risk_factors", "diagnosis", "medicines",
  "home_remedies", "complications", "prevention", "when_to_see_doctor", "faqs",
];

function run() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`❌ SQLite DB not found at ${SQLITE_PATH}`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });

  // ── Diseases ──
  const rawDiseases = sqlite.prepare("SELECT * FROM unique_diseases").all();
  const diseases = rawDiseases.map((r) => {
    const d = {};
    for (const f of DISEASE_FIELDS) {
      d[f] = r[f] ?? (f === "variant_count" ? 1 : (["keywords"].includes(f) ? "" : null));
    }
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

  // ── Write compressed JSON ──
  fs.mkdirSync(SEED_DIR, { recursive: true });

  const payload = JSON.stringify({ diseases, categories });
  const compressed = zlib.gzipSync(Buffer.from(payload), { level: 9 });

  fs.writeFileSync(SEED_PATH, compressed);

  const origMB = (Buffer.byteLength(payload) / 1024 / 1024).toFixed(1);
  const compMB = (compressed.length / 1024 / 1024).toFixed(1);

  console.log(`✅ Exported ${diseases.length} diseases, ${categories.length} categories`);
  console.log(`   Original: ${origMB} MB → Compressed: ${compMB} MB`);
  console.log(`   Saved to: ${SEED_PATH}`);
}

run();
