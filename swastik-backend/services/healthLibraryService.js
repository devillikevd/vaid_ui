const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const SQLITE_PATH = path.join(__dirname, '..', 'database', 'health_library.db');

let sqliteDb = null;

class HealthLibraryUnavailableError extends Error {
  constructor(message = 'Health library service temporarily unavailable') {
    super(message);
    this.name = 'HealthLibraryUnavailableError';
    this.statusCode = 503;
    this.isOperational = true;
  }
}

function getDb() {
  if (!sqliteDb && fs.existsSync(SQLITE_PATH)) {
    try {
      sqliteDb = new DatabaseSync(SQLITE_PATH, { readOnly: true });
    } catch (err) {
      console.error('[HealthLibraryService] Failed to open SQLite database:', err.message);
      return null;
    }
  }
  return sqliteDb;
}

function getStats() {
  const db = getDb();
  if (!db) throw new HealthLibraryUnavailableError();

  const totalDiseases = db.prepare('SELECT COUNT(*) as cnt FROM unique_diseases').get().cnt;
  const totalCategories = db.prepare('SELECT COUNT(*) as cnt FROM categories').get().cnt;
  const severityRows = db.prepare('SELECT severity, COUNT(*) as cnt FROM unique_diseases GROUP BY severity ORDER BY cnt DESC').all();
  const letterRows = db.prepare('SELECT first_letter, COUNT(*) as cnt FROM unique_diseases GROUP BY first_letter ORDER BY first_letter ASC').all();

  return {
    total_diseases: totalDiseases,
    total_categories: totalCategories,
    severity: severityRows.map(r => ({ severity: r.severity || 'General', cnt: r.cnt })),
    by_letter: letterRows.map(r => ({ first_letter: r.first_letter, cnt: r.cnt })),
  };
}

function getCategories() {
  const db = getDb();
  if (!db) throw new HealthLibraryUnavailableError();

  const rows = db.prepare('SELECT id, chapter, body_system, disease_count, icon FROM categories ORDER BY disease_count DESC').all();
  return rows.map(r => ({ ...r, _id: String(r.id) }));
}

function searchDiseases({ query, page = 1, limit = 50, severity = '' }) {
  const db = getDb();
  if (!db) throw new HealthLibraryUnavailableError();

  const offset = (page - 1) * limit;
  const q = `%${query.trim()}%`;

  let countSql = `
    SELECT COUNT(*) as total 
    FROM unique_diseases 
    WHERE (name LIKE ? OR code LIKE ? OR keywords LIKE ? OR chapter LIKE ?)
  `;
  let selectSql = `
    SELECT * 
    FROM unique_diseases 
    WHERE (name LIKE ? OR code LIKE ? OR keywords LIKE ? OR chapter LIKE ?)
  `;

  const countParams = [q, q, q, q];
  const selectParams = [q, q, q, q];

  if (severity) {
    countSql += ' AND severity = ?';
    selectSql += ' AND severity = ?';
    countParams.push(severity);
    selectParams.push(severity);
  }

  selectSql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  selectParams.push(limit, offset);

  const total = db.prepare(countSql).get(...countParams).total;
  const results = db.prepare(selectSql).all(...selectParams);

  return {
    total,
    page,
    limit,
    results: results.map(r => ({ ...r, _id: String(r.id) })),
  };
}

function getByAlphabet({ letter, page = 1, limit = 50, severity = '' }) {
  const db = getDb();
  if (!db) throw new HealthLibraryUnavailableError();

  const offset = (page - 1) * limit;
  const l = letter.toUpperCase();

  let countSql = 'SELECT COUNT(*) as total FROM unique_diseases WHERE first_letter = ?';
  let selectSql = 'SELECT * FROM unique_diseases WHERE first_letter = ?';

  const countParams = [l];
  const selectParams = [l];

  if (severity) {
    countSql += ' AND severity = ?';
    selectSql += ' AND severity = ?';
    countParams.push(severity);
    selectParams.push(severity);
  }

  selectSql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  selectParams.push(limit, offset);

  const total = db.prepare(countSql).get(...countParams).total;
  const results = db.prepare(selectSql).all(...selectParams);

  return {
    total,
    page,
    limit,
    results: results.map(r => ({ ...r, _id: String(r.id) })),
  };
}

function getByCategory({ chapter, page = 1, limit = 50, severity = '' }) {
  const db = getDb();
  if (!db) throw new HealthLibraryUnavailableError();

  const offset = (page - 1) * limit;

  let countSql = 'SELECT COUNT(*) as total FROM unique_diseases WHERE chapter = ?';
  let selectSql = 'SELECT * FROM unique_diseases WHERE chapter = ?';

  const countParams = [chapter];
  const selectParams = [chapter];

  if (severity) {
    countSql += ' AND severity = ?';
    selectSql += ' AND severity = ?';
    countParams.push(severity);
    selectParams.push(severity);
  }

  selectSql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  selectParams.push(limit, offset);

  const total = db.prepare(countSql).get(...countParams).total;
  const results = db.prepare(selectSql).all(...selectParams);

  return {
    total,
    page,
    limit,
    results: results.map(r => ({ ...r, _id: String(r.id) })),
  };
}

function getByCode(code) {
  const db = getDb();
  if (!db) throw new HealthLibraryUnavailableError();

  const row = db.prepare('SELECT * FROM unique_diseases WHERE code = ?').get(code);
  if (!row) return null;
  return { ...row, _id: String(row.id) };
}

module.exports = {
  HealthLibraryUnavailableError,
  getStats,
  getCategories,
  searchDiseases,
  getByAlphabet,
  getByCategory,
  getByCode,
};
