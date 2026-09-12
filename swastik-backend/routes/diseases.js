const express = require('express');
const healthLibraryService = require('../services/healthLibraryService');
const { generateDetailsViaGemini, generateMockDetails } = require('../utils/diseaseAI');

const router = express.Router();

const VALID_SEVERITIES = new Set(["Critical", "Severe", "Moderate", "General"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sanitizeSeverity(severity) {
  return severity && VALID_SEVERITIES.has(severity) ? severity : '';
}

function handleDiseaseError(err, res) {
  if (err && (err.name === 'HealthLibraryUnavailableError' || err.statusCode === 503)) {
    return res.status(503).json({
      success: false,
      message: 'Health library service temporarily unavailable',
    });
  }
  if (err && err.statusCode === 404) {
    return res.status(404).json({
      success: false,
      message: err.message || 'Disease not found.',
    });
  }
  if (err && err.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid request parameters.',
    });
  }
  console.error('[Disease API Error]:', err.message);
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred in health library service.',
  });
}

// ── CATEGORIES ──────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const rows = healthLibraryService.getCategories();
    res.json(rows);
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

// ── STATS ───────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const stats = healthLibraryService.getStats();
    res.json(stats);
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

// ── ALPHABET ────────────────────────────────────────────────────
router.get('/alphabet/:letter', async (req, res) => {
  try {
    const letter = req.params.letter;
    if (letter.length !== 1 || !/[a-z0-9(]/i.test(letter)) {
      return res.status(400).json({ success: false, message: "Invalid letter." });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const severity = sanitizeSeverity(req.query.severity);

    const result = healthLibraryService.getByAlphabet({ letter, page, limit, severity });
    res.json(result);
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

// ── SEARCH ──────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.status(400).json({ success: false, message: "Query too short." });
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const severity = sanitizeSeverity(req.query.severity);

    const result = healthLibraryService.searchDiseases({ query: q, page, limit, severity });
    res.json(result);
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

// ── CATEGORY FILTER ─────────────────────────────────────────────
router.get('/category/:chapter', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const severity = sanitizeSeverity(req.query.severity);

    const result = healthLibraryService.getByCategory({ chapter: req.params.chapter, page, limit, severity });
    res.json(result);
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

// ── SINGLE DISEASE ──────────────────────────────────────────────
router.get('/disease/:code', async (req, res) => {
  try {
    const row = healthLibraryService.getByCode(req.params.code);
    if (!row) return res.status(404).json({ success: false, message: "Disease not found." });
    res.json(row);
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

// ── SINGLE DISEASE DETAILS (AI GENERATED) ───────────────────────
router.get('/disease/:code/details', async (req, res) => {
  try {
    const code = req.params.code;
    const row = healthLibraryService.getByCode(code);
    if (!row) return res.status(404).json({ success: false, message: "Disease not found." });

    // Return cached content if already fully generated.
    if (row.overview && row.symptoms && row.faqs) {
      return res.json(row);
    }

    let details;
    if (process.env.GEMINI_API_KEY) {
      try {
        details = await generateDetailsViaGemini(row.name, code, row.chapter);
      } catch (err) {
        console.error(`Gemini generation failed for ${code} (${row.name}):`, err.message);
        details = generateMockDetails(row.name, row.chapter);
      }
    } else {
      await sleep(300);
      details = generateMockDetails(row.name, row.chapter);
    }

    res.json({ ...row, ...details });
  } catch (e) {
    handleDiseaseError(e, res);
  }
});

module.exports = router;

