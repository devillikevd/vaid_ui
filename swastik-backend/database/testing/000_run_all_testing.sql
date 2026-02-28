-- ============================================================
-- SWASTIK Healthcare Platform — TESTING DATABASE
-- Master Script — Run this file to deploy schema + test data
-- Version: 4.0.0 | Date: 2026-02-24
-- ============================================================
--
-- This deploys the FULL production schema, then seeds realistic
-- test data for local/staging environments.
--
-- TEST CREDENTIALS (all passwords: "test123456")
-- ┌──────────────────────┬──────────────────────────────┬──────────────────────┐
-- │ Role                 │ Email                        │ Phone                │
-- ├──────────────────────┼──────────────────────────────┼──────────────────────┤
-- │ Super Admin          │ admin@swastik.health         │ +919000000001        │
-- │ Admin                │ moderator@swastik.health     │ +919000000002        │
-- │ Patient 1            │ rahul.kumar@test.com         │ +919100000001        │
-- │ Patient 2            │ priya.sharma@test.com        │ +919100000002        │
-- │ Patient 3            │ amit.patel@test.com          │ +919100000003        │
-- │ Doctor 1             │ dr.arun@test.com             │ +919200000001        │
-- │ Doctor 2             │ dr.meena@test.com            │ +919200000002        │
-- │ Doctor 3             │ dr.vikram@test.com           │ +919200000003        │
-- │ Hospital Owner       │ apollo.admin@test.com        │ +919300000001        │
-- │ Hospital Owner 2     │ fortis.admin@test.com        │ +919300000002        │
-- │ Hospital Manager     │ manager.apollo@test.com      │ +919300000003        │
-- │ Clinic Owner         │ clinic.owner@test.com        │ +919400000001        │
-- │ Pharmacy Owner       │ pharmacy.owner@test.com      │ +919500000001        │
-- │ Pharmacy Owner 2     │ medplus.owner@test.com       │ +919500000002        │
-- │ Ambulance Operator   │ ambulance.op@test.com        │ +919600000001        │
-- │ Ambulance Operator 2 │ ambulance.op2@test.com       │ +919600000002        │
-- └──────────────────────┴──────────────────────────────┴──────────────────────┘
--
-- Usage:
--   Option A: Run production schema first, then this file
--   Option B (psql CLI): psql -f 000_run_all_testing.sql
-- ============================================================

-- Step 1: Clean slate (drop all public tables/views for re-run safety)
\i 001_clean_slate.sql

-- Step 2: Load production schema
\i ../production/001_users_and_auth.sql
\i ../production/002_patients.sql
\i ../production/003_hospitals_and_clinics.sql
\i ../production/004_doctors.sql
\i ../production/005_pharmacy_and_medicines.sql
\i ../production/006_diagnostic_centers.sql
\i ../production/007_ambulance_and_emergency.sql
\i ../production/008_appointments_and_consultations.sql
\i ../production/009_medical_records.sql
\i ../production/010_reviews_notifications_chat.sql
\i ../production/011_system_and_audit.sql
\i ../production/012_indexes.sql
\i ../production/013_rls_policies.sql
\i ../production/014_triggers_and_functions.sql
\i ../production/015_views.sql

-- Step 3: Seed test data
\i 002_seed_users.sql
\i 003_seed_patients.sql
\i 004_seed_hospitals.sql
\i 005_seed_doctors.sql
\i 006_seed_clinics.sql
\i 007_seed_pharmacies_and_medicines.sql
\i 008_seed_ambulances.sql
\i 009_seed_appointments_and_consultations.sql
\i 010_seed_reports_reviews_notifications.sql
\i 011_seed_system_settings.sql

SELECT '✅ SWASTIK TESTING DATABASE v4.0 DEPLOYED!' as status;
