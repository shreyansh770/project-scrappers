-- ============================================================
-- Property Scrapers Platform — Database Schema
-- Run this in Supabase SQL Editor (or any PostgreSQL instance)
-- ============================================================

-- 1. Scrapers registry
CREATE TABLE IF NOT EXISTS scrapers (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT UNIQUE NOT NULL,               -- e.g. "rightmove_london"
    display_name    TEXT NOT NULL,                       -- e.g. "Rightmove London"
    website         TEXT,                                -- e.g. "rightmove.co.uk"
    schedule        TEXT DEFAULT '0 */6 * * *',          -- cron expression
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    config          JSONB DEFAULT '{}',                  -- arbitrary scraper config
    file_path       TEXT,                                -- path in repo, e.g. "scrapers/rightmove_london.py"
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Scraper runs (execution log)
CREATE TABLE IF NOT EXISTS scraper_runs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scraper_id      UUID NOT NULL REFERENCES scrapers(id) ON DELETE CASCADE,
    scraper_name    TEXT NOT NULL,                       -- denormalized for quick queries
    status          TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at      TIMESTAMPTZ DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    duration_ms     INTEGER,
    records_count   INTEGER DEFAULT 0,
    error_message   TEXT,
    error_traceback TEXT,
    run_metadata    JSONB DEFAULT '{}',                  -- github run id, commit sha, etc.
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Scraped results (the actual data)
CREATE TABLE IF NOT EXISTS scraper_results (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id          UUID NOT NULL REFERENCES scraper_runs(id) ON DELETE CASCADE,
    scraper_id      UUID NOT NULL REFERENCES scrapers(id) ON DELETE CASCADE,
    scraper_name    TEXT NOT NULL,
    data            JSONB NOT NULL,                      -- the scraped record
    scraped_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes for dashboard queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_runs_scraper_id ON scraper_runs(scraper_id);
CREATE INDEX IF NOT EXISTS idx_runs_scraper_name ON scraper_runs(scraper_name);
CREATE INDEX IF NOT EXISTS idx_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON scraper_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_run_id ON scraper_results(run_id);
CREATE INDEX IF NOT EXISTS idx_results_scraper_id ON scraper_results(scraper_id);
CREATE INDEX IF NOT EXISTS idx_results_scraped_at ON scraper_results(scraped_at DESC);

-- ============================================================
-- Auto-update updated_at on scrapers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON scrapers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Views for dashboard
-- ============================================================

-- Latest 2 runs per scraper (for overview cards)
CREATE OR REPLACE VIEW v_scraper_overview AS
WITH ranked_runs AS (
    SELECT
        r.*,
        ROW_NUMBER() OVER (PARTITION BY r.scraper_id ORDER BY r.started_at DESC) as rn
    FROM scraper_runs r
)
SELECT
    s.id,
    s.name,
    s.display_name,
    s.website,
    s.schedule,
    s.status,
    s.file_path,
    s.created_at,
    -- Last run
    lr.id              AS last_run_id,
    lr.status          AS last_run_status,
    lr.started_at      AS last_run_time,
    lr.records_count   AS last_run_records,
    lr.duration_ms     AS last_run_duration_ms,
    lr.error_message   AS last_run_error,
    -- Previous run
    pr.id              AS prev_run_id,
    pr.status          AS prev_run_status,
    pr.started_at      AS prev_run_time,
    pr.records_count   AS prev_run_records,
    pr.duration_ms     AS prev_run_duration_ms,
    pr.error_message   AS prev_run_error
FROM scrapers s
LEFT JOIN ranked_runs lr ON lr.scraper_id = s.id AND lr.rn = 1
LEFT JOIN ranked_runs pr ON pr.scraper_id = s.id AND pr.rn = 2
ORDER BY s.name;

-- Run history (recent runs across all scrapers)
CREATE OR REPLACE VIEW v_run_history AS
SELECT
    r.id,
    r.scraper_name,
    s.display_name,
    s.website,
    r.status,
    r.started_at,
    r.finished_at,
    r.duration_ms,
    r.records_count,
    r.error_message,
    r.run_metadata
FROM scraper_runs r
JOIN scrapers s ON s.id = r.scraper_id
ORDER BY r.started_at DESC;

-- ============================================================
-- Row Level Security (for Supabase anon key access)
-- ============================================================

ALTER TABLE scrapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_results ENABLE ROW LEVEL SECURITY;

-- Dashboard (anon key) can read everything
CREATE POLICY "Allow read access" ON scrapers FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON scraper_runs FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON scraper_results FOR SELECT USING (true);

-- Only service key can write (scrapers themselves use service key)
CREATE POLICY "Service key insert" ON scrapers FOR INSERT WITH CHECK (true);
CREATE POLICY "Service key update" ON scrapers FOR UPDATE USING (true);
CREATE POLICY "Service key insert" ON scraper_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service key update" ON scraper_runs FOR UPDATE USING (true);
CREATE POLICY "Service key insert" ON scraper_results FOR INSERT WITH CHECK (true);

-- ============================================================
-- Seed data (optional — remove after testing)
-- ============================================================

INSERT INTO scrapers (name, display_name, website, schedule, status, file_path) VALUES
    ('rightmove_london', 'Rightmove London Listings', 'rightmove.co.uk', '0 */6 * * *', 'active', 'scrapers/rightmove_london.py'),
    ('zoopla_manchester', 'Zoopla Manchester', 'zoopla.co.uk', '0 */12 * * *', 'active', 'scrapers/zoopla_manchester.py'),
    ('spareroom_birmingham', 'SpareRoom Birmingham', 'spareroom.co.uk', '0 8 * * *', 'active', 'scrapers/spareroom_birmingham.py')
ON CONFLICT (name) DO NOTHING;
