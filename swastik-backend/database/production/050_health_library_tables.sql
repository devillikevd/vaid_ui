-- Health Library tables (diseases, categories, search_stats)
-- Matches Prisma schema exactly. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS diseases (
    id                 SERIAL PRIMARY KEY,
    code               TEXT NOT NULL UNIQUE,
    name               TEXT NOT NULL,
    first_letter       TEXT NOT NULL,
    chapter            TEXT NOT NULL,
    body_system        TEXT NOT NULL,
    severity           TEXT NOT NULL DEFAULT 'General',
    keywords           TEXT NOT NULL DEFAULT '',
    source             TEXT NOT NULL DEFAULT 'ICD-10-CM',
    variant_count      INTEGER NOT NULL DEFAULT 1,
    summary            TEXT,
    overview           TEXT,
    types              TEXT,
    symptoms           TEXT,
    causes             TEXT,
    risk_factors       TEXT,
    diagnosis          TEXT,
    medicines          TEXT,
    home_remedies      TEXT,
    complications      TEXT,
    prevention         TEXT,
    when_to_see_doctor TEXT,
    faqs               TEXT
);

CREATE INDEX IF NOT EXISTS idx_diseases_first_letter ON diseases (first_letter);
CREATE INDEX IF NOT EXISTS idx_diseases_chapter      ON diseases (chapter);
CREATE INDEX IF NOT EXISTS idx_diseases_severity     ON diseases (severity);
CREATE INDEX IF NOT EXISTS idx_diseases_name         ON diseases (name);

CREATE TABLE IF NOT EXISTS categories (
    id            SERIAL PRIMARY KEY,
    chapter       TEXT NOT NULL UNIQUE,
    body_system   TEXT NOT NULL,
    disease_count INTEGER NOT NULL DEFAULT 0,
    icon          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS search_stats (
    id           SERIAL PRIMARY KEY,
    query        TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    searched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
