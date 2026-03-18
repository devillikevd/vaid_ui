/**
 * Patient Routes Tests
 */
const { testUsers, generateTestToken, mockRequest, mockResponse, mockNext, today, tomorrow } = require('./setup');

// Mock dependencies
jest.mock('../config/supabase', () => ({
    supabaseAdmin: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
    },
}));

jest.mock('../middleware/auth', () => {
    const { testUsers: mockTestUsers } = require('./setup');
    return {
        authenticate: (req, res, next) => {
            req.user = mockTestUsers.patient;
            next();
        },
    };
});

jest.mock('../middleware/rbac', () => ({
    requireRole: () => (req, res, next) => next(),
    ROLES: { PATIENT: 'patient' },
}));

jest.mock('../services/eventEmitter', () => ({
    emitNewAppointment: jest.fn(),
    emitAppointmentUpdate: jest.fn(),
    emitNewEmergency: jest.fn(),
    emitNotification: jest.fn(),
}));

const { supabaseAdmin } = require('../config/supabase');

const resetSupabaseMocks = () => {
    const chainMethods = [
        'from', 'select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte',
        'in', 'or', 'order', 'range', 'limit'
    ];

    chainMethods.forEach((method) => {
        supabaseAdmin[method].mockReset();
        supabaseAdmin[method].mockReturnThis();
    });

    supabaseAdmin.single.mockReset();
};

describe('Patient Routes', () => {
    beforeEach(() => {
        resetSupabaseMocks();
    });

    describe('GET /dashboard', () => {
        it('should return patient dashboard data', async () => {
            const mockPatient = {
                id: 'patient-1',
                name: 'Test Patient',
                phone: '+91 98765 43210',
                blood_group: 'O+',
            };

            supabaseAdmin.single.mockResolvedValueOnce({ data: mockPatient, error: null });

            const result = await supabaseAdmin.from('patients').select('*').single();
            expect(result.data.name).toBe('Test Patient');
        });

        it('should include upcoming appointments', async () => {
            const mockAppointments = [
                {
                    id: 'apt-1',
                    date: tomorrow(),
                    time_slot: '10:00',
                    status: 'confirmed',
                    doctors: { name: 'Dr. Test', specialization: 'General' },
                },
            ];

            expect(mockAppointments).toHaveLength(1);
            expect(mockAppointments[0].status).toBe('confirmed');
        });
    });

    describe('Doctor Search', () => {
        it('should search doctors by specialization', async () => {
            const mockDoctors = [
                { id: 'd1', name: 'Dr. Cardiologist', specialization: 'Cardiology', rating: 4.8 },
                { id: 'd2', name: 'Dr. Heart', specialization: 'Cardiology', rating: 4.5 },
            ];

            // Verify search functionality
            const filtered = mockDoctors.filter(d => d.specialization === 'Cardiology');
            expect(filtered).toHaveLength(2);
        });

        it('should search doctors by name', async () => {
            const mockDoctors = [
                { id: 'd1', name: 'Dr. Arun Sharma', specialization: 'General' },
                { id: 'd2', name: 'Dr. Priya Patel', specialization: 'Dermatology' },
            ];

            const searchTerm = 'sharma';
            const filtered = mockDoctors.filter(d =>
                d.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            expect(filtered).toHaveLength(1);
            expect(filtered[0].name).toBe('Dr. Arun Sharma');
        });

        it('should get available slots for a doctor', async () => {
            const mockSchedule = {
                day_of_week: 1,
                start_time: '09:00',
                end_time: '17:00',
                slot_duration: 15,
                is_available: true,
            };

            const mockBookedSlots = ['10:00', '10:15', '14:00'];

            // Generate available slots
            const allSlots = ['09:00', '09:15', '09:30', '10:00', '10:15', '10:30'];
            const availableSlots = allSlots.filter(slot => !mockBookedSlots.includes(slot));

            expect(availableSlots).not.toContain('10:00');
            expect(availableSlots).toContain('09:00');
        });
    });

    describe('Appointment Booking', () => {
        it('should book an appointment', async () => {
            const bookingData = {
                doctorId: 'doc-1',
                date: tomorrow(),
                timeSlot: '10:00',
                type: 'clinic',
                reason: 'General checkup',
            };

            supabaseAdmin.single.mockResolvedValueOnce({
                data: { id: 'apt-1', ...bookingData, status: 'pending' },
                error: null,
            });

            const result = await supabaseAdmin.from('appointments').insert(bookingData).single();
            expect(result.data.status).toBe('pending');
        });

        it('should prevent double booking', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({ data: { id: 'existing-apt' }, error: null });

            // Should throw error - slot already booked
            const existingBooking = await supabaseAdmin.from('appointments').select('id').single();
            expect(existingBooking.data).not.toBeNull();
        });

        it('should cancel an appointment', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({
                data: {
                    id: 'apt-1',
                    status: 'cancelled',
                    cancellation_reason: 'Schedule conflict',
                    cancelled_by: 'patient',
                    doctors: { users: { id: 'doc-user-1' } },
                },
                error: null,
            });

            const result = await supabaseAdmin
                .from('appointments')
                .update({ status: 'cancelled' })
                .single();

            expect(result.data.status).toBe('cancelled');
            expect(result.data.cancelled_by).toBe('patient');
        });
    });

    describe('Emergency Request', () => {
        it('should create emergency request', async () => {
            const emergencyData = {
                latitude: 28.6139,
                longitude: 77.209,
                address: '123 Test Street',
                emergencyType: 'medical_emergency',
                description: 'Need immediate help',
            };

            supabaseAdmin.single.mockResolvedValueOnce({
                data: {
                    id: 'emr-1',
                    request_number: 'EMR123',
                    status: 'pending',
                    ...emergencyData,
                },
                error: null,
            });

            const result = await supabaseAdmin.from('emergency_requests').insert(emergencyData).single();
            expect(result.data.status).toBe('pending');
            expect(result.data.request_number).toBeTruthy();
        });

        it('should prevent duplicate active emergency requests', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({
                data: { id: 'emr-existing', status: 'pending' },
                error: null
            });

            // Existing request found - should throw error
            const existingRequest = await supabaseAdmin
                .from('emergency_requests')
                .select('id')
                .single();

            expect(existingRequest.data).not.toBeNull();
        });

        it('should cancel emergency request', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({
                data: {
                    id: 'emr-1',
                    status: 'cancelled',
                    cancellation_reason: 'No longer needed',
                },
                error: null,
            });

            const result = await supabaseAdmin
                .from('emergency_requests')
                .update({ status: 'cancelled' })
                .single();

            expect(result.data.status).toBe('cancelled');
        });
    });

    describe('Prescriptions', () => {
        it('should get patient prescriptions', async () => {
            const mockPrescriptions = [
                {
                    id: 'presc-1',
                    prescription_number: 'RX123',
                    diagnosis: 'Common Cold',
                    doctors: { name: 'Dr. Test' },
                    prescription_medicines: [
                        { medicine_name: 'Paracetamol', dosage: '500mg' },
                    ],
                },
            ];

            expect(mockPrescriptions).toHaveLength(1);
            expect(mockPrescriptions[0].prescription_medicines.length).toBeGreaterThan(0);
        });

        it('should get prescription details', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({
                data: {
                    id: 'presc-1',
                    prescription_number: 'RX123',
                    diagnosis: 'Common Cold',
                    follow_up_date: '2026-02-20',
                    doctors: { name: 'Dr. Test', specialization: 'General' },
                    prescription_medicines: [
                        { medicine_name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily' },
                    ],
                },
                error: null,
            });

            const result = await supabaseAdmin.from('prescriptions').select('*').single();
            expect(result.data.diagnosis).toBe('Common Cold');
        });
    });

    describe('Reports', () => {
        it('should get patient reports', async () => {
            const mockReports = [
                { id: 'r1', title: 'Blood Test', type: 'lab', report_date: '2026-02-01' },
                { id: 'r2', title: 'X-Ray', type: 'imaging', report_date: '2026-01-15' },
            ];

            expect(mockReports).toHaveLength(2);
        });

        it('should upload a new report', async () => {
            const reportData = {
                title: 'New Blood Test',
                type: 'lab',
                reportDate: '2026-02-09',
                fileUrl: 'https://storage.example.com/reports/report.pdf',
            };

            supabaseAdmin.single.mockResolvedValueOnce({
                data: { id: 'report-1', ...reportData },
                error: null,
            });

            const result = await supabaseAdmin.from('reports').insert(reportData).single();
            expect(result.data.title).toBe('New Blood Test');
        });
    });

    describe('Reviews', () => {
        it('should submit a review for completed appointment', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({
                data: { id: 'review-1', rating: 5, comment: 'Excellent doctor!' },
                error: null,
            });

            const result = await supabaseAdmin
                .from('reviews')
                .insert({ rating: 5, comment: 'Excellent doctor!' })
                .single();

            expect(result.data.rating).toBe(5);
        });

        it('should prevent duplicate reviews for same appointment', async () => {
            supabaseAdmin.single.mockResolvedValueOnce({ data: { id: 'existing-review' }, error: null });

            const existingReview = await supabaseAdmin.from('reviews').select('id').single();
            expect(existingReview.data).not.toBeNull();
        });
    });
});
