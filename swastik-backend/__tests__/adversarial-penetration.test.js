/**
 * Adversarial Penetration Verification Test Suite
 * Simulates real attack payloads across all security boundaries.
 */
const { authenticate, authorize } = require('../middleware/auth');
const appointmentService = require('../services/appointmentService');
const consultationService = require('../services/consultationService');
const reportService = require('../services/reportService');
const doctorService = require('../services/doctorService');
const clinicService = require('../services/clinicService');
const notificationService = require('../services/notificationService');
const universalReferralService = require('../services/universalReferralService');
const authService = require('../services/authService');
const { supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const config = require('../config');

jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  rawSupabaseAdmin: {
    from: jest.fn(),
  }
}));

jest.mock('../config/redis', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve()),
  cacheDel: jest.fn(() => Promise.resolve()),
  cacheIncr: jest.fn(() => Promise.resolve(1)),
}));

jest.mock('../config/minio', () => ({
  uploadProfileImage: jest.fn(),
  deleteFile: jest.fn(),
  signStorageUrl: jest.fn((url) => Promise.resolve(url)),
  signStorageUrlsInPayload: jest.fn((payload) => Promise.resolve(payload)),
  getPresignedUrl: jest.fn((fileName) => Promise.resolve(`https://s3.example.com/${fileName}?signed=true`)),
  isStorageAvailable: jest.fn(() => true),
}));

const makeQueryBuilder = (result) => {
  const promise = Promise.resolve(result);
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    in: jest.fn(() => builder),
    not: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
    single: jest.fn(() => promise),
    maybeSingle: jest.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
};

describe('Adversarial Penetration Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. CROSS-USER IDOR ATTACKS ──
  describe('1. Cross-User IDOR Attacks', () => {
    test('Patient A attempting to read Patient B appointment -> rejected 403', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return makeQueryBuilder({
            data: { id: 'appt-b', patient_id: 'patient-b-uuid', doctor_id: 'doctor-1' },
            error: null,
          });
        }
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-a-uuid' }, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        appointmentService.getAppointmentById('user-patient-a', 'patient', 'appt-b')
      ).rejects.toThrow(/Unauthorized/i);
    });

    test('Patient A attempting to cancel Patient B appointment -> rejected 404', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-a-uuid' }, error: null });
        }
        if (table === 'appointments') {
          return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        appointmentService.cancelAppointment('user-patient-a', 'appt-b', 'Malicious cancellation')
      ).rejects.toThrow(/not found|cannot be cancelled/i);
    });

    test('Patient A attempting to read Patient B prescription -> rejected 404', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-a-uuid' }, error: null });
        }
        if (table === 'prescriptions') {
          return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        reportService.getPrescriptionById('user-patient-a', 'prescription-b')
      ).rejects.toThrow(/not found/i);
    });
  });

  // ── 2. CROSS-ORGANIZATION IDOR ATTACKS ──
  describe('2. Cross-Organization Attacks', () => {
    test('Clinic Owner A attempting to update Clinic B -> rejected 404', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'clinics') {
          return makeQueryBuilder({
            data: null,
            error: { code: 'PGRST116', message: 'No rows updated' },
          });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        clinicService.updateClinic('clinic-b', 'user-clinic-owner-a', { name: 'Compromised Clinic' })
      ).rejects.toThrow(/Clinic not found/i);
    });
  });

  // ── 3. WEBRTC & CONSULTATION ATTACKS ──
  describe('3. WebRTC & Consultation Attacks', () => {
    test('Unrelated user attempting to obtain ICE servers for consultation -> rejected 403', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'consultations') {
          return makeQueryBuilder({
            data: { id: 'consult-1', doctor_id: 'doctor-a', patient_id: 'patient-a' },
            error: null,
          });
        }
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-attacker' }, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        consultationService.getIceServers('user-attacker', 'patient', 'consult-1')
      ).rejects.toThrow(/Unauthorized/i);
    });

    test('Patient A attempting to join Patient B live consultation -> rejected 404', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-a-uuid' }, error: null });
        }
        if (table === 'consultations') {
          return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        consultationService.joinConsultation('user-patient-a', 'consultation-b')
      ).rejects.toThrow(/Active consultation not found/i);
    });
  });

  // ── 4. CROSS-ROLE AUTHORIZATION ATTACKS ──
  describe('4. Cross-Role Authorization Attacks', () => {
    test('Patient role attempting to access doctor route -> rejected 403', () => {
      const middleware = authorize('doctor');
      const req = { user: { id: 'user-patient-1', role: 'patient' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('Doctor role attempting to access patient private route -> rejected 403', () => {
      const middleware = authorize('patient');
      const req = { user: { id: 'user-doctor-1', role: 'doctor' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('Clinic owner attempting to access admin route -> rejected 403', () => {
      const middleware = authorize('admin');
      const req = { user: { id: 'user-clinic-1', role: 'clinic_owner' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── 5. AUTHENTICATION & TOKEN TAMPERING ATTACKS ──
  describe('5. Authentication & Token Tampering Attacks', () => {
    test('Tampered token with altered role signature fails verification with 401', async () => {
      const forgedToken = jwt.sign(
        { userId: 'user-1', role: 'admin' },
        'wrong-secret-signature'
      );
      const req = {
        headers: { authorization: `Bearer ${forgedToken}` },
        cookies: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('Missing authorization header fails with 401', async () => {
      const req = {
        headers: {},
        cookies: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── 6. REFERRAL & PARTNERSHIP ACCESS ATTACKS ──
  describe('6. Universal Referral & Partnership Authorization Attacks', () => {
    test('Provider attempting to create referral on behalf of unowned clinic -> rejected 403', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'clinics') {
          return makeQueryBuilder({ data: null, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        universalReferralService.validateProviderAccess('clinic', 'unowned-clinic-id', {
          id: 'user-attacker',
          role: 'clinic_owner',
        })
      ).rejects.toThrow(/Unauthorized/i);
    });

    test('Doctor attempting to refer from hospital without active affiliation -> rejected 403', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctors') {
          return makeQueryBuilder({ data: { id: 'doc-1', hospital_id: null }, error: null });
        }
        if (table === 'hospital_doctors') {
          return makeQueryBuilder({ data: null, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        universalReferralService.validateProviderAccess('hospital', 'hospital-id', {
          id: 'user-doctor',
          role: 'doctor',
        })
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  // ── 7. NOTIFICATION ACCESS CONTROL ATTACKS ──
  describe('7. Notification IDOR Attacks', () => {
    test('User cannot delete all notifications for another user', async () => {
      let capturedBuilder;
      supabaseAdmin.from.mockImplementation(() => {
        capturedBuilder = makeQueryBuilder({ data: null, error: null });
        return capturedBuilder;
      });

      await notificationService.clearAllNotifications('legitimate-user-id');
      expect(capturedBuilder.eq).toHaveBeenCalledWith('user_id', 'legitimate-user-id');
    });
  });

  // ── 8. BUSINESS LOGIC & CONCURRENT BOOKING COLLISION ──
  describe('8. Business Logic & Race Condition Protection', () => {
    test('Concurrent booking on already booked slot throws 409 Conflict', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-2' }, error: null });
        }
        if (table === 'doctors') {
          return makeQueryBuilder({ data: { id: 'doc-1', is_approved: true, consultation_fee: 500 }, error: null });
        }
        if (table === 'hospital_doctors') {
          return makeQueryBuilder({ data: [{ hospital_id: 'hosp-1' }], error: null });
        }
        if (table === 'clinic_doctors') {
          return makeQueryBuilder({ data: [], error: null });
        }
        if (table === 'hospitals') {
          return makeQueryBuilder({ data: { is_active: true }, error: null });
        }
        if (table === 'doctor_slots') {
          return makeQueryBuilder({ data: [{ id: 'slot-1' }], error: null });
        }
        if (table === 'doctor_schedule_blocks') {
          return makeQueryBuilder({ data: null, error: null });
        }
        if (table === 'doctor_leaves') {
          return makeQueryBuilder({ data: [], error: null });
        }
        if (table === 'appointments') {
          // An existing overlapping appointment exists for this doctor at 10:00
          return makeQueryBuilder({
            data: [{ time_slot: '10:00', duration_minutes: 15, status: 'scheduled' }],
            error: null,
          });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        appointmentService.bookAppointment('user-patient-2', {
          doctorId: 'doc-1',
          date: '2026-09-01',
          timeSlot: '10:00',
          type: 'in_person',
          hospitalId: 'hosp-1',
        })
      ).rejects.toThrow(/already booked/i);
    });
  });
});

