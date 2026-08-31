const { authenticate, authorize } = require('../middleware/auth');
const appointmentService = require('../services/appointmentService');
const consultationService = require('../services/consultationService');
const reportService = require('../services/reportService');
const doctorService = require('../services/doctorService');
const clinicService = require('../services/clinicService');
const notificationService = require('../services/notificationService');
const { supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const config = require('../config');

jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
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

describe('Second-Pass Deep Security & IDOR / BOLA Audits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario A: Patient A attempting to access Patient B resources', () => {
    test('Patient A cannot view Patient B appointment (IDOR check)', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return makeQueryBuilder({
            data: { id: 'appt-123', patient_id: 'patient-2', doctor_id: 'doctor-1' },
            error: null,
          });
        }
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-1' }, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        appointmentService.getAppointmentById('user-patient-1', 'patient', 'appt-123')
      ).rejects.toThrow(/Unauthorized/i);
    });

    test('Patient A cannot view Patient B medical report (IDOR check)', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-1' }, error: null });
        }
        if (table === 'reports') {
          return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        reportService.getReportById('user-patient-1', 'report-belonging-to-patient-2')
      ).rejects.toThrow(/not found/i);
    });

    test('Patient A cannot delete Patient B medical report', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-1' }, error: null });
        }
        if (table === 'reports') {
          return makeQueryBuilder({ data: null, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        reportService.deleteReport('user-patient-1', 'report-belonging-to-patient-2')
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Scenario B: Doctor A attempting to access unrelated Patient B records & vitals', () => {
    test('Doctor A cannot view details of Patient B without prior appointment or consultation', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctors') {
          return makeQueryBuilder({ data: { id: 'doctor-1' }, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        doctorService.getPatientDetails('user-doctor-1', 'unrelated-patient-2')
      ).rejects.toThrow(/patients|Unauthorized/i);
    });
  });

  describe('Scenario C: Organization Isolation (Clinic A vs Clinic B)', () => {
    test('Clinic owner cannot manage or update another clinic', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'clinics') {
          // Returning DB error on mismatched owner_id/clinicId
          return makeQueryBuilder({
            data: null,
            error: { code: 'PGRST116', message: 'No rows updated' },
          });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        clinicService.updateClinic('clinic-2', 'user-clinic-owner-1', { name: 'Hacked Clinic' })
      ).rejects.toThrow();
    });
  });

  describe('Scenario D: WebRTC / Consultation Join Authorization', () => {
    test('Unauthorized patient cannot join unrelated consultation', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients') {
          return makeQueryBuilder({ data: { id: 'patient-1' }, error: null });
        }
        if (table === 'consultations') {
          return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        consultationService.joinConsultation('user-patient-1', 'consultation-of-patient-2')
      ).rejects.toThrow(/Active consultation not found/i);
    });

    test('Doctor cannot view or join consultation they are not assigned to', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'consultations') {
          return makeQueryBuilder({
            data: {
              id: 'consultation-1',
              doctor_id: 'doctor-2',
              patient_id: 'patient-1',
            },
            error: null,
          });
        }
        if (table === 'doctors') {
          return makeQueryBuilder({ data: { id: 'doctor-1' }, error: null });
        }
        return makeQueryBuilder({ data: null, error: null });
      });

      await expect(
        consultationService.getConsultation('user-doctor-1', 'doctor', 'consultation-1')
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('Scenario E: Notification Access Control', () => {
    test('User can only mark their own notifications as read', async () => {
      let capturedBuilder;
      supabaseAdmin.from.mockImplementation((table) => {
        capturedBuilder = makeQueryBuilder({ data: { id: 'notif-123', is_read: true }, error: null });
        return capturedBuilder;
      });

      const res = await notificationService.markAsRead('user-1', 'notif-123');
      expect(capturedBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(capturedBuilder.eq).toHaveBeenCalledWith('id', 'notif-123');
      expect(res.message).toContain('marked as read');
    });

    test('User cannot delete another user notification', async () => {
      let capturedBuilder;
      supabaseAdmin.from.mockImplementation((table) => {
        capturedBuilder = makeQueryBuilder({ data: null, error: null });
        return capturedBuilder;
      });

      await notificationService.deleteNotification('user-1', 'notif-999');
      expect(capturedBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(capturedBuilder.eq).toHaveBeenCalledWith('id', 'notif-999');
    });
  });

  describe('Scenario F: Token & Session Security', () => {
    test('Rejects invalid JWT tokens with 401', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid.token.value' },
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

    test('Rejects expired JWT tokens with 401', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-1', role: 'patient' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );
      const req = {
        headers: { authorization: `Bearer ${expiredToken}` },
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
});
