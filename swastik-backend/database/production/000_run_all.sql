-- ============================================================
-- SWASTIK Healthcare Platform — PRODUCTION DATABASE
-- Master Script — Run this file to deploy the entire schema
-- Version: 4.0.0 | Date: 2026-02-24
-- ============================================================
--
-- This master script runs all schema files in order.
-- Safe to re-run (all statements are idempotent).
--
-- Usage:
--   Option A (Supabase SQL Editor): Copy-paste each file in order
--   Option B (psql CLI):            psql -f 000_run_all.sql
--
-- ============================================================

\i 001_users_and_auth.sql
\i 002_patients.sql
\i 003_hospitals_and_clinics.sql
\i 004_doctors.sql
\i 005_pharmacy_and_medicines.sql
\i 006_diagnostic_centers.sql
\i 007_ambulance_and_emergency.sql
\i 008_appointments_and_consultations.sql
\i 009_medical_records.sql
\i 010_reviews_notifications_chat.sql
\i 011_system_and_audit.sql
\i 012_indexes.sql
\i 013_rls_policies.sql
\i 014_triggers_and_functions.sql
\i 015_views.sql
\i 016_migrations.sql

SELECT '✅ SWASTIK PRODUCTION SCHEMA v4.0 DEPLOYED!' as status;
