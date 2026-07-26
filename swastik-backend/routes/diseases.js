const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateDetailsViaGemini, generateMockDetails } = require('../utils/diseaseAI');

const router = express.Router();
const prisma = new PrismaClient();

const VALID_SEVERITIES = new Set(["Critical", "Severe", "Moderate", "General"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper to filter by severity
function severityWhere(severity) {
  return severity && VALID_SEVERITIES.has(severity) ? { severity } : {};
}

// ── CATEGORIES ──────────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await prisma.category.findMany({ orderBy: { disease_count: "desc" } });
    res.json(rows);
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
      prisma.disease.count({ where }),
      prisma.disease.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    ]);
    res.json({ total, page, limit, results });
  } catch (e) { next(e); }
});

// ── SEARCH ──────────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.status(400).json({ detail: "Query too short." });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const ci = { mode: "insensitive" };
    const where = {
      OR: [
        { name: { contains: q, ...ci } },
        { code: { contains: q, ...ci } },
        { keywords: { contains: q, ...ci } },
        { chapter: { contains: q, ...ci } },
      ],
      ...severityWhere(req.query.severity),
    };

    const [total, results] = await Promise.all([
      prisma.disease.count({ where }),
      prisma.disease.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    ]);

    // Log search stat (best-effort)
    prisma.searchStat.create({ data: { query: q, result_count: total } }).catch(() => {});

    res.json({ total, page, limit, results });
  } catch (e) { next(e); }
});

// ── CATEGORY FILTER ─────────────────────────────────────────────
router.get('/category/:chapter', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const where = { chapter: req.params.chapter, ...severityWhere(req.query.severity) };

    const [total, results] = await Promise.all([
      prisma.disease.count({ where }),
      prisma.disease.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    ]);
    res.json({ total, page, limit, results });
  } catch (e) { next(e); }
});

// ── SINGLE DISEASE ──────────────────────────────────────────────
router.get('/disease/:code', async (req, res, next) => {
  try {
    const row = await prisma.disease.findUnique({ where: { code: req.params.code } });
    if (!row) return res.status(404).json({ detail: "Disease not found." });
    res.json(row);
  } catch (e) { next(e); }
});

// ── SINGLE DISEASE DETAILS (AI GENERATED) ───────────────────────
router.get('/disease/:code/details', async (req, res, next) => {
  try {
    const code = req.params.code;
    const row = await prisma.disease.findUnique({ where: { code } });
    if (!row) return res.status(404).json({ detail: "Disease not found." });

    // Return cached content if already fully generated.
    if (row.overview && row.symptoms && row.faqs) return res.json(row);

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
      await prisma.disease.update({ where: { code }, data: details });
    } catch (e) {
      console.error("Failed to cache details:", e.message);
    }

    res.json({ ...row, ...details });
  } catch (e) { next(e); }
});

// ── STATS ───────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [total_diseases, total_categories, sevGroups, letterGroups] = await Promise.all([
      prisma.disease.count(),
      prisma.category.count(),
      prisma.disease.groupBy({ by: ["severity"], _count: { _all: true } }),
      prisma.disease.groupBy({ by: ["first_letter"], _count: { _all: true } }),
    ]);

    const severity = sevGroups
      .map((g) => ({ severity: g.severity, cnt: g._count._all }))
      .sort((a, b) => b.cnt - a.cnt);
    const by_letter = letterGroups
      .map((g) => ({ first_letter: g.first_letter, cnt: g._count._all }))
      .sort((a, b) => a.first_letter.localeCompare(b.first_letter));

    res.json({ total_diseases, total_categories, severity, by_letter });
  } catch (e) { next(e); }
});

module.exports = router;
