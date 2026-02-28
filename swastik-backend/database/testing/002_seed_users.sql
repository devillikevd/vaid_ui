-- ============================================================
-- 002: SEED USERS
-- All test user accounts (password: test123456)
-- Hash: $2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG
-- ============================================================

-- Super Admin
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin@swastik.health', '+919000000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Swastik Super Admin', 'super_admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Admin (moderator)
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('a0000000-0000-0000-0000-000000000002', 'moderator@swastik.health', '+919000000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Platform Moderator', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Patient 1: Rahul Kumar
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('b0000000-0000-0000-0000-000000000001', 'rahul.kumar@test.com', '+919100000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Rahul Kumar', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- Patient 2: Priya Sharma
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('b0000000-0000-0000-0000-000000000002', 'priya.sharma@test.com', '+919100000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Priya Sharma', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- Patient 3: Amit Patel
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('b0000000-0000-0000-0000-000000000003', 'amit.patel@test.com', '+919100000003',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Amit Patel', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- Doctor 1: Dr. Arun Mehta (Cardiologist)
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('c0000000-0000-0000-0000-000000000001', 'dr.arun@test.com', '+919200000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Dr. Arun Mehta', 'doctor', true, true)
ON CONFLICT (email) DO NOTHING;

-- Doctor 2: Dr. Meena Iyer (Dermatologist)
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('c0000000-0000-0000-0000-000000000002', 'dr.meena@test.com', '+919200000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Dr. Meena Iyer', 'doctor', true, true)
ON CONFLICT (email) DO NOTHING;

-- Doctor 3: Dr. Vikram Reddy (General Medicine)
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('c0000000-0000-0000-0000-000000000003', 'dr.vikram@test.com', '+919200000003',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Dr. Vikram Reddy', 'doctor', true, true)
ON CONFLICT (email) DO NOTHING;

-- Hospital Owner 1: Apollo
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('d0000000-0000-0000-0000-000000000001', 'apollo.admin@test.com', '+919300000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Apollo Admin', 'hospital_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Hospital Owner 2: Fortis
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('d0000000-0000-0000-0000-000000000002', 'fortis.admin@test.com', '+919300000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Fortis Admin', 'hospital_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Hospital Manager
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('d0000000-0000-0000-0000-000000000003', 'manager.apollo@test.com', '+919300000003',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Apollo Manager', 'hospital_manager', true, true)
ON CONFLICT (email) DO NOTHING;

-- Clinic Owner
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('e0000000-0000-0000-0000-000000000001', 'clinic.owner@test.com', '+919400000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Clinic Owner', 'clinic_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Pharmacy Owner 1
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('f0000000-0000-0000-0000-000000000001', 'pharmacy.owner@test.com', '+919500000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'MedPlus Owner', 'pharmacy_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Pharmacy Owner 2
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('f0000000-0000-0000-0000-000000000002', 'medplus.owner@test.com', '+919500000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Apollo Pharmacy Owner', 'pharmacy_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Ambulance Operator 1
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('f1000000-0000-0000-0000-000000000001', 'ambulance.op@test.com', '+919600000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'Rajesh Ambulance', 'ambulance_operator', true, true)
ON CONFLICT (email) DO NOTHING;

-- Ambulance Operator 2
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('f1000000-0000-0000-0000-000000000002', 'ambulance.op2@test.com', '+919600000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'City Ambulance', 'ambulance_operator', true, true)
ON CONFLICT (email) DO NOTHING;

-- Personal test users (password: test@123456)
INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('ff000000-0000-0000-0000-000000000001', 'nayanpr620@gmail.com', '+919999999901',
        '$2a$12$n/X7Yzev0ItIvRzJ9fFJJ.xk4nH2K9ElikwGyhfSajCWag2eCgqQy', 'Nayan (Operator)', 'ambulance_operator', true, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, phone, password_hash, name, role, is_active, is_verified)
VALUES ('ff000000-0000-0000-0000-000000000002', 'nayanpr620+patient@gmail.com', '+919999999902',
        '$2a$12$n/X7Yzev0ItIvRzJ9fFJJ.xk4nH2K9ElikwGyhfSajCWag2eCgqQy', 'Nayan (Patient)', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;
