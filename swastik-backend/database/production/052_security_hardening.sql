-- ============================================================
-- 052: SECURITY HARDENING — SUPABASE ROW LEVEL SECURITY
-- Defense-in-depth for wellness tables.
-- All data access goes through the backend (service role, which
-- bypasses RLS). This migration guarantees that even if the anon
-- or authenticated (PostgREST) keys were ever exposed or used,
-- wellness tables are unreadable/unwritable directly.
-- Safe to re-run (all statements are idempotent / guarded).
-- ============================================================

DO $$
DECLARE
  t TEXT;
  wellness_tables TEXT[] := ARRAY[
    'wellness_coaches',
    'fitness_profiles',
    'wearable_daily_summaries',
    'workout_plans',
    'workout_sessions',
    'exercise_library',
    'patient_workout_plans',
    'workout_logs',
    'fitness_centers',
    'fitness_center_trainers',
    'fitness_center_trainer_invites',
    'fitness_classes',
    'fitness_bookings',
    'fitness_checkins',
    'wellness_sessions',
    'wellness_groups',
    'wellness_group_members',
    'wellness_challenges',
    'wellness_challenge_entries',
    'wellness_badges',
    'patient_wellness_badges',
    'trusted_supplement_products',
    'supplement_suitability_checks',
    'ai_wellness_insights',
    'coach_patient_relationships',
    'wellness_reels',
    'wellness_diet_plans'
  ];
BEGIN
  FOREACH t IN ARRAY wellness_tables
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
