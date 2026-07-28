const express = require('express');
const { Disease, Category, HealthSearchStat } = require('../database/models');
const { generateDetailsViaGemini, generateMockDetails } = require('../utils/diseaseAI');

const router = express.Router();

const VALID_SEVERITIES = new Set(["Critical", "Severe", "Moderate", "General"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper to filter by severity
function severityWhere(severity) {
  return severity && VALID_SEVERITIES.has(severity) ? { severity } : {};
}

// ── CATEGORIES ──────────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await Category.find().sort({ disease_count: -1 }).lean();
    res.json(rows.map(r => ({ ...r, id: r._id.toString(), _id: r._id.toString() })));
  } catch (e) { next(e); }
});

// ── ALPHABET ────────────────────────────────────────────────────
router.get('/alphabet/:letter', async (req, res, next) => {
  try {
    const letter = req.params.letter;
    if (letter.length !== 1 || !/[a-z]/i.test(letter)) {
      return res.status(400).json({ detail: "Invalid letter." });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const where = { first_letter: letter.toUpperCase(), ...severityWhere(req.query.severity) };

    const [total, results] = await Promise.all([
      Disease.countDocuments(where),
      Disease.find(where).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ total, page, limit, results: results.map(r => ({ ...r, id: r._id.toString(), _id: r._id.toString() })) });
  } catch (e) { next(e); }
});

// ── SEARCH ──────────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.status(400).json({ detail: "Query too short." });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const regex = new RegExp(q, "i");
    const where = {
      $or: [
        { name: { $regex: regex } },
        { code: { $regex: regex } },
        { keywords: { $regex: regex } },
        { chapter: { $regex: regex } },
      ],
      ...severityWhere(req.query.severity),
    };

    const [total, results] = await Promise.all([
      Disease.countDocuments(where),
      Disease.find(where).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    // Log search stat (best-effort)
    HealthSearchStat.create({ query: q, result_count: total }).catch(() => {});

    res.json({ total, page, limit, results: results.map(r => ({ ...r, id: r._id.toString(), _id: r._id.toString() })) });
  } catch (e) { next(e); }
});

// ── CATEGORY FILTER ─────────────────────────────────────────────
router.get('/category/:chapter', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const where = { chapter: req.params.chapter, ...severityWhere(req.query.severity) };

    const [total, results] = await Promise.all([
      Disease.countDocuments(where),
      Disease.find(where).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ total, page, limit, results: results.map(r => ({ ...r, id: r._id.toString(), _id: r._id.toString() })) });
  } catch (e) { next(e); }
});

// ── SINGLE DISEASE ──────────────────────────────────────────────
router.get('/disease/:code', async (req, res, next) => {
  try {
    const row = await Disease.findOne({ code: req.params.code }).lean();
    if (!row) return res.status(404).json({ detail: "Disease not found." });
    res.json({ ...row, id: row._id.toString(), _id: row._id.toString() });
  } catch (e) { next(e); }
});

// ── SINGLE DISEASE DETAILS (AI GENERATED) ───────────────────────
router.get('/disease/:code/details', async (req, res, next) => {
  try {
    const code = req.params.code;
    const row = await Disease.findOne({ code }).lean();
    if (!row) return res.status(404).json({ detail: "Disease not found." });

    // Return cached content if already fully generated.
    if (row.overview && row.symptoms && row.faqs) return res.json({ ...row, id: row._id.toString(), _id: row._id.toString() });

    let details;
    if (process.env.GEMINI_API_KEY) {
      try {
        details = await generateDetailsViaGemini(row.name, code, row.chapter);
      } catch (err) {
        console.error(`Gemini generation failed for ${code} (${row.name}):`, err.message);
        details = generateMockDetails(row.name, row.chapter);
      }
    } else {
      await sleep(1500); // mimic generation latency
      details = generateMockDetails(row.name, row.chapter);
    }

    // Cache the results
    try {
      await Disease.updateOne({ code }, { $set: details });
    } catch (e) {
      console.error("Failed to cache details:", e.message);
    }

    res.json({ ...row, ...details, id: row._id.toString(), _id: row._id.toString() });
  } catch (e) { next(e); }
});

// ── STATS ───────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [total_diseases, total_categories, sevGroups, letterGroups] = await Promise.all([
      Disease.countDocuments(),
      Category.countDocuments(),
      Disease.aggregate([{ $group: { _id: "$severity", cnt: { $sum: 1 } } }]),
      Disease.aggregate([{ $group: { _id: "$first_letter", cnt: { $sum: 1 } } }]),
    ]);

    const severity = sevGroups
      .map((g) => ({ severity: g._id, cnt: g.cnt }))
      .sort((a, b) => b.cnt - a.cnt);
    const by_letter = letterGroups
      .map((g) => ({ first_letter: g._id, cnt: g.cnt }))
      .sort((a, b) => a.first_letter.localeCompare(b.first_letter));

    res.json({ total_diseases, total_categories, severity, by_letter });
  } catch (e) { next(e); }
});

module.exports = router;
