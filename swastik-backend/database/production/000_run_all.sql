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
\i 017_ai_vitals_feature_toggles.sql
\i 018_fix_users_role_check.sql
\i 019_reminder_reliability_and_timezone.sql
\i 020_family_member_phone.sql
\i 021_email_otp_indexes.sql
\i 022_hospital_doctor_invites.sql
\i 023_clinic_doctor_invites.sql
\i 024_facility_provider_associations.sql
\i 025_patient_record_access.sql
\i 026_diagnostic_booking_manual_confirmation.sql
\i 027_outbreak_detection.sql
\i 028_community_qa.sql
\i 029_reviews_trigger.sql
\i 030_doctor_profile_enhancements.sql
\i 031_hospital_ambulance_invites.sql
\i 032_doctor_slots_date_migration.sql
\i 033_delivery_tracking.sql
\i 034_pharmacy_inventory_pack_size.sql
\i 034_requested_role.sql
\i 035_diagnostic_booking_prescription.sql
\i 036_phi_encryption.sql
\i 037_patient_consents.sql
\i 038_catalog_requests.sql
\i 038_idempotency_constraints.sql
\i 039_atomic_addresses.sql
\i 040_add_doctor_pending_role.sql
\i 041_token_version.sql
\i 042_master_catalog.sql
\i 043_hospital_detail_enhancements.sql
\i 044_premium_hospital_features.sql
\i 045_hospital_reels.sql
\i 046_clinic_enhancements.sql
\i 047_pharmacy_enhancements.sql
\i 048_diagnostic_enhancements.sql
\i 20250727120000_create_medicine_categories.sql
\i 049_wellness_ecosystem.sql
\i 051_wellness_production_features.sql
\i 052_security_hardening.sql
\i 053_fitness_center_reels.sql
SELECT '✅ SWASTIK PRODUCTION SCHEMA v4.1 DEPLOYED!' as status;
