/**
 * Seed Script for Test Users
 * 
 * Run this script to create test users in Supabase.
 * 
 * Prerequisites:
 * 1. Valid Supabase credentials in .env
 * 2. Required database tables exist (users, patients)
 * 
 * Usage: node scripts/seed-test-users.js
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const testUsers = [
    // Patient user
    {
        email: 'patient@swastik.health',
        phone: '+919876543210',
        password: 'Patient@123',
        name: 'Test Patient',
        role: 'patient'
    },
    // Admin user
    {
        email: 'admin@swastik.health',
        phone: '+919876543200',
        password: 'Admin@123',
        name: 'System Admin',
        role: 'admin'
    },
    // Doctor user
    {
        email: 'doctor1@swastik.health',
        phone: '+919876543212',
        password: 'Doctor@123',
        name: 'Dr. Priya Sharma',
        role: 'doctor'
    },
    // Hospital owner - matches swastik-web demo
    {
        email: 'hospital1@swastik.health',
        phone: '+919876543213',
        password: 'Hospital@123',
        name: 'Rajesh Kumar',
        role: 'hospital_owner',
        hospitalName: 'City Care Hospital'
    },
    // Clinic owner - matches swastik-web demo
    {
        email: 'clinic1@swastik.health',
        phone: '+919876543214',
        password: 'Clinic@123',
        name: 'Anita Verma',
        role: 'clinic_owner',
        clinicName: 'WellCare Clinic'
    },
    // Pharmacy owner - matches swastik-web demo
    {
        email: 'pharmacy1@swastik.health',
        phone: '+919876543215',
        password: 'Pharmacy@123',
        name: 'Suresh Patel',
        role: 'pharmacy_owner',
        pharmacyName: 'MediPlus Pharmacy'
    },
    // Ambulance operator - matches swastik-web demo
    {
        email: 'ambulance1@swastik.health',
        phone: '+919876543216',
        password: 'Ambulance@123',
        name: 'Quick Response Services',
        role: 'ambulance_operator'
    }
];


async function seedUsers() {
    console.log('🌱 Seeding test users...\n');

    for (const userData of testUsers) {
        try {
            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, 12);

            // Check if user exists
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', userData.email)
                .single();

            if (existing) {
                // Update existing user with password_hash
                await supabase
                    .from('users')
                    .update({
                        password_hash: passwordHash,
                        is_active: true,
                        is_verified: true,
                    })
                    .eq('id', existing.id);
                console.log(`🔄 Updated ${userData.email} with password_hash`);
                continue;
            }

            // Create user
            const { data: user, error: userError } = await supabase
                .from('users')
                .insert({
                    email: userData.email,
                    phone: userData.phone,
                    password_hash: passwordHash,
                    role: userData.role,
                    is_active: true,
                    is_verified: true, // Pre-verified for testing
                })
                .select()
                .single();

            if (userError) {
                console.error(`❌ Failed to create ${userData.email}:`, userError.message);
                continue;
            }

            // Create profile based on role
            if (userData.role === 'patient') {
                await supabase.from('patients').insert({
                    user_id: user.id,
                    name: userData.name,
                });
            } else if (userData.role === 'doctor') {
                await supabase.from('doctors').insert({
                    user_id: user.id,
                    name: userData.name,
                    specialization: 'General Physician',
                    is_approved: true,
                });
            } else if (userData.role === 'hospital_owner') {
                await supabase.from('hospitals').insert({
                    owner_id: user.id,
                    name: userData.hospitalName || userData.name,
                    is_approved: true,
                    approval_status: 'approved',
                });
            } else if (userData.role === 'clinic_owner') {
                await supabase.from('clinics').insert({
                    owner_id: user.id,
                    name: userData.clinicName || userData.name,
                    is_approved: true,
                    approval_status: 'approved',
                });
            } else if (userData.role === 'pharmacy_owner') {
                await supabase.from('pharmacies').insert({
                    owner_id: user.id,
                    name: userData.pharmacyName || userData.name,
                    is_approved: true,
                    approval_status: 'approved',
                });
            } else if (userData.role === 'ambulance_operator') {
                await supabase.from('ambulance_operators').insert({
                    user_id: user.id,
                    name: userData.name,
                    is_approved: true,
                    approval_status: 'approved',
                });
            }
            // Admin role doesn't need a separate profile

            console.log(`✅ Created ${userData.role}: ${userData.email} (password: ${userData.password})`);

        } catch (error) {
            console.error(`❌ Error creating ${userData.email}:`, error.message);
        }
    }

    console.log('\n✨ Seed complete!');
    console.log('\n📋 Test Credentials:');
    console.log('┌────────────────────────┬─────────────┐');
    console.log('│ Email                  │ Password    │');
    console.log('├────────────────────────┼─────────────┤');
    testUsers.forEach(u => {
        console.log(`│ ${u.email.padEnd(22)} │ ${u.password.padEnd(11)} │`);
    });
    console.log('└────────────────────────┴─────────────┘');
}

seedUsers().catch(console.error);
