-- ============================================================
-- 051: WELLNESS PRODUCTION FEATURES
-- Sub-roles, coach-patient relationships, reels, diet plans,
-- challenge leaderboard support, and notification triggers.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- ── 1. Wellness coach primary sub-role ───────────────────────────
-- Fitness Trainer, Yoga Coach, Nutritionist — drives role-conditional
-- rendering in the Coach Dashboard.
ALTER TABLE wellness_coaches
ADD COLUMN IF NOT EXISTS sub_role TEXT;

ALTER TABLE wellness_coaches
ADD COLUMN IF NOT EXISTS is_accepting_clients BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_wellness_coaches_sub_role ON wellness_coaches(sub_role);

-- ── 2. Coach ↔ Patient relationship ──────────────────────────────
-- Explicit assignment of a patient to a coach (also backfilled from
-- workout plans / sessions). Enables coach client lists + analytics.
CREATE TABLE IF NOT EXISTS coach_patient_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'ended')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ,
    source TEXT DEFAULT 'session',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_patient_coach ON coach_patient_relationships(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_coach_patient_patient ON coach_patient_relationships(patient_id, status);

-- ── 3. Wellness reels (short video content) ──────────────────────
CREATE TABLE IF NOT EXISTS wellness_reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    category TEXT DEFAULT 'fitness',
    tags TEXT[] DEFAULT '{}',
    duration_seconds INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_reels_category ON wellness_reels(category, is_active);
CREATE INDEX IF NOT EXISTS idx_wellness_reels_coach ON wellness_reels(coach_id);

-- ── 4. Nutritionist diet plans ───────────────────────────────────
CREATE TABLE IF NOT EXISTS wellness_diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    diet_type TEXT DEFAULT 'balanced',
    daily_calories INTEGER,
    macro_goals JSONB DEFAULT '{}',
    restricted_foods TEXT[] DEFAULT '{}',
    meal_plan JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_diet_plans_patient ON wellness_diet_plans(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_wellness_diet_plans_coach ON wellness_diet_plans(coach_id);

-- ── 5. Challenge entry progress bookkeeping ──────────────────────
ALTER TABLE wellness_challenge_entries
ADD COLUMN IF NOT EXISTS source_metric TEXT DEFAULT 'steps';

-- ── 6. Fitness class recurring support ───────────────────────────
ALTER TABLE fitness_classes
ADD COLUMN IF NOT EXISTS recurring JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS waitlisted_count INTEGER DEFAULT 0;

-- ── 7. Notifications trigger on new check-ins (owner real-time feed) ──

CREATE OR REPLACE FUNCTION notify_fitness_checkin()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('fitness_checkin', json_build_object(
        'id', NEW.id,
        'center_id', NEW.center_id,
        'patient_id', NEW.patient_id,
        'checked_in_at', NEW.checked_in_at
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fitness_checkin_notify ON fitness_checkins;
CREATE TRIGGER trg_fitness_checkin_notify
AFTER INSERT ON fitness_checkins
FOR EACH ROW EXECUTE FUNCTION notify_fitness_checkin();

DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'coach_patient_relationships', 'wellness_reels', 'wellness_diet_plans'
    ]
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', table_name, table_name);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        table_name,
        table_name
      );
    END LOOP;
  END IF;
END $$;

-- ── 8. Badges for the nightly badge-evaluation cron ──────────────
INSERT INTO wellness_badges (code, name, description, icon, criteria) VALUES
('ten_workouts', '10 Workouts Club', 'Completed ten logged workouts.', 'trophy', '{"workouts_completed":10}'),
('ten_k_steps_7d', '10K Step Streak', 'Logged 10,000+ steps on 7 consecutive days.', 'footprints', '{"steps_over_10k_days":7}')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    criteria = EXCLUDED.criteria;
