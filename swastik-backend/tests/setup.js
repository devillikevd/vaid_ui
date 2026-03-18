/**
 * Test Setup and Utilities
 */
const { supabaseAdmin } = require('../config/supabase');

// Test user data
const testUsers = {
    patient: {
        id: 'test-patient-001',
        email: 'testpatient@swastik.test',
        phone: '+919876543210',
        role: 'patient',
        password: 'Test@123456',
    },
    doctor: {
        id: 'test-doctor-001',
        email: 'testdoctor@swastik.test',
        phone: '+919876543211',
        role: 'doctor',
        password: 'Test@123456',
    },
    admin: {
        id: 'test-admin-001',
        email: 'testadmin@swastik.test',
        phone: '+919876543212',
        role: 'admin',
        password: 'Test@123456',
    },
    pharmacyOwner: {
        id: 'test-pharmacy-001',
        email: 'testpharmacy@swastik.test',
        phone: '+919876543213',
        role: 'pharmacy_owner',
        password: 'Test@123456',
    },
};

// Generate test JWT token
const jwt = require('jsonwebtoken');
const config = require('../config');

const generateTestToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
        },
        config.jwt.accessSecret,
        { expiresIn: '1h' }
    );
};

// Cleanup test data
const cleanupTestData = async () => {
    try {
        // Delete test users
        await supabaseAdmin
            .from('users')
            .delete()
            .like('email', '%@swastik.test');

        // Delete test appointments
        await supabaseAdmin
            .from('appointments')
            .delete()
            .like('appointment_number', 'TEST-%');

        // Delete test prescriptions
        await supabaseAdmin
            .from('prescriptions')
            .delete()
            .like('prescription_number', 'TEST-%');

        console.log('Test data cleanup complete');
    } catch (error) {
        console.error('Test data cleanup failed:', error);
    }
};

// Create test data
const createTestData = async () => {
    try {
        // Create test users
        for (const [key, user] of Object.entries(testUsers)) {
            await supabaseAdmin.from('users').upsert({
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                password_hash: '$2a$10$testhashedpassword',
                is_verified: true,
            });
        }

        console.log('Test data created');
    } catch (error) {
        console.error('Test data creation failed:', error);
    }
};

// Mock request/response objects
const mockRequest = (options = {}) => ({
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user || testUsers.patient,
    headers: options.headers || {},
    get: (key) => options.headers?.[key],
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

// Wait helper
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Random ID generator
const randomId = () => Math.random().toString(36).substring(2, 15);

// Date helpers
const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};
const nextWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
};

module.exports = {
    testUsers,
    generateTestToken,
    cleanupTestData,
    createTestData,
    mockRequest,
    mockResponse,
    mockNext,
    wait,
    randomId,
    today,
    tomorrow,
    nextWeek,
};
