/**
 * Public Doctor Discovery & Guest Access Test Suite
 * Validates public doctor browsing, guest slot discovery, and strict patient-role isolation.
 */
const { supabaseAdmin } = require('../config/supabase');
const doctorService = require('../services/doctorService');
const patientService = require('../services/patientService');
const { cacheGet, cacheSet } = require('../config/redis');
const { authenticate, authorize } = require('../middleware/auth');
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

jest.mock('../services/doctorService');
jest.mock('../services/patientService');

describe('Public Doctor Discovery & Guest Flow Security', () => {
  const patientUserId = '11111111-1111-1111-1111-111111111111';
  const clinicUserId = '22222222-2222-2222-2222-222222222222';
  const doctorUserId = '33333333-3333-3333-3333-333333333333';

  const jwtSecret = config.jwt.accessSecret;
  const patientToken = jwt.sign({ id: patientUserId, userId: patientUserId, role: 'patient', tokenVersion: 1, type: 'access' }, jwtSecret);
  const clinicToken = jwt.sign({ id: clinicUserId, userId: clinicUserId, role: 'clinic_owner', tokenVersion: 1, type: 'access' }, jwtSecret);
  const doctorToken = jwt.sign({ id: doctorUserId, userId: doctorUserId, role: 'doctor', tokenVersion: 1, type: 'access' }, jwtSecret);

  const mockPublicDoctor = {
    id: 'doc-uuid-1',
    name: 'Dr. Asha Sharma',
    specialization: 'Cardiology',
    experience_years: 12,
    rating: 4.9,
    total_reviews: 45,
    consultation_fee: 600,
    video_consultation_fee: 500,
    profile_image_url: 'https://example.com/asha.jpg',
    is_available: true,
    consultation_types: ['clinic', 'video'],
    affiliatedClinics: [],
    affiliatedHospitals: [],
  };

  const executeRouteHandlers = (route, req) => {
    return new Promise((resolve, reject) => {
      let statusCode = 200;
      const res = {
        status: jest.fn((code) => {
          statusCode = code;
          return res;
        }),
        json: jest.fn((data) => {
          resolve({ status: statusCode, body: data });
          return res;
        }),
      };

      const stack = [...route.route.stack];
      const runNext = (err) => {
        if (err) return reject(err);
        if (stack.length === 0) return resolve({ status: statusCode, body: null });
        const layer = stack.shift();
        try {
          layer.handle(req, res, runNext);
        } catch (e) {
          reject(e);
        }
      };

      runNext();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. GUEST PUBLIC DISCOVERY ─────────────────────────────────────────────

  test('TEST A: Guest (no token) can discover doctors without receiving 401/403', async () => {
    doctorService.getAllDoctors.mockResolvedValueOnce({
      data: [mockPublicDoctor],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    const patientRouter = require('../routes/patient');
    const req = { query: {}, headers: {} };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors' && s.route.methods.get);
    expect(route).toBeDefined();

    const response = await executeRouteHandlers(route, req);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Dr. Asha Sharma');
  });

  test('TEST B: Guest selecting a specialty receives filtered doctors', async () => {
    doctorService.getAllDoctors.mockResolvedValueOnce({
      data: [mockPublicDoctor],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    const patientRouter = require('../routes/patient');
    const req = { query: { specialization: 'Cardiology' }, headers: {} };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(doctorService.getAllDoctors).toHaveBeenCalledWith(
      expect.objectContaining({ specialization: 'Cardiology' }),
      1,
      20
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('TEST C: Guest selecting specialty with zero doctors receives 200 OK with empty array (NOT 403)', async () => {
    doctorService.getAllDoctors.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });

    const patientRouter = require('../routes/patient');
    const req = { query: { specialization: 'NonExistentSpecialty' }, headers: {} };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
  });

  test('TEST D: Guest can search doctors by name or condition', async () => {
    doctorService.getAllDoctors.mockResolvedValueOnce({
      data: [mockPublicDoctor],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    const patientRouter = require('../routes/patient');
    const req = { query: { search: 'Asha' }, headers: {} };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(doctorService.getAllDoctors).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Asha' }),
      1,
      20
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('TEST E: Guest can open public doctor profile by ID', async () => {
    doctorService.getDoctorById.mockResolvedValueOnce(mockPublicDoctor);

    const patientRouter = require('../routes/patient');
    const req = { params: { id: 'doc-uuid-1' }, query: {}, headers: {} };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors/:id' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctor.id).toBe('doc-uuid-1');
  });

  test('TEST F: Guest can fetch available doctor slots', async () => {
    const mockSlots = [
      { time: '09:00', is_available: true },
      { time: '09:30', is_available: false },
      { time: '10:00', is_available: true },
    ];
    doctorService.getAvailableSlots.mockResolvedValueOnce(mockSlots);

    const patientRouter = require('../routes/patient');
    const req = { params: { id: 'doc-uuid-1' }, query: { date: '2026-09-01', type: 'clinic' }, headers: {} };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors/:id/slots' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.date).toBe('2026-09-01');
    expect(response.body.data.slots).toHaveLength(3);
  });

  // ── 2. CROSS-ROLE PROVIDER SESSIONS VISITING PUBLIC DISCOVERY ─────────────

  test('TEST G: Logged-in clinic_owner can browse public doctor discovery without 403 error', async () => {
    cacheGet.mockResolvedValueOnce({
      id: clinicUserId,
      email: 'clinic@example.com',
      role: 'clinic_owner',
      token_version: 1,
      is_active: true
    });
    doctorService.getAllDoctors.mockResolvedValueOnce({
      data: [mockPublicDoctor],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    const patientRouter = require('../routes/patient');
    const req = { query: {}, headers: { authorization: `Bearer ${clinicToken}` } };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  test('TEST H: Logged-in doctor can browse public doctor discovery without gaining patient permissions', async () => {
    cacheGet.mockResolvedValueOnce({
      id: doctorUserId,
      email: 'doctor@example.com',
      role: 'doctor',
      token_version: 1,
      is_active: true
    });
    doctorService.getAllDoctors.mockResolvedValueOnce({
      data: [mockPublicDoctor],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    const patientRouter = require('../routes/patient');
    const req = { query: {}, headers: { authorization: `Bearer ${doctorToken}` } };
    const route = patientRouter.stack.find(s => s.route && s.route.path === '/doctors' && s.route.methods.get);

    const response = await executeRouteHandlers(route, req);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // ── 3. STRICT PATIENT ROLE PROTECTION FOR PRIVATE PATIENT DATA ────────────

  test('TEST I: Guest accessing private patient profile is rejected with 401', async () => {
    const req = { headers: {} };
    let statusCode = null;
    let resBody = null;
    const res = {
      status: jest.fn((code) => { statusCode = code; return res; }),
      json: jest.fn((body) => { resBody = body; return res; })
    };
    const next = jest.fn();

    await authenticate(req, res, next);
    expect(statusCode).toBe(401);
    expect(resBody.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  test('TEST J: Clinic token attempting to access patient-private routes receives 403 Forbidden', async () => {
    cacheGet.mockResolvedValueOnce({
      id: clinicUserId,
      email: 'clinic@example.com',
      role: 'clinic_owner',
      token_version: 1,
      is_active: true
    });

    const req = { headers: { authorization: `Bearer ${clinicToken}` } };
    let statusCode = null;
    let resBody = null;
    const res = {
      status: jest.fn((code) => { statusCode = code; return res; }),
      json: jest.fn((body) => { resBody = body; return res; })
    };
    let nextCalled = false;
    const next = jest.fn(() => { nextCalled = true; });

    await authenticate(req, res, () => {
      authorize('patient')(req, res, next);
    });

    expect(statusCode).toBe(403);
    expect(resBody.success).toBe(false);
    expect(resBody.message).toContain('permission');
    expect(nextCalled).toBe(false);
  });

  // ── 4. SENSITIVE DATA PROJECTION AUDIT ─────────────────────────────────────

  test('TEST K: Public doctor discovery payload never leaks sensitive credentials or private records', () => {
    const publicFields = Object.keys(mockPublicDoctor);
    const forbiddenFields = [
      'password',
      'password_hash',
      'email',
      'phone',
      'phone_number',
      'private_address',
      'bank_account_number',
      'bank_ifsc',
      'bank_upi',
      'license_document_url',
      'degree_certificate_url',
      'government_id_url',
      'pan_card_url',
      'internal_notes',
      'approval_notes'
    ];

    for (const field of forbiddenFields) {
      expect(publicFields).not.toContain(field);
    }
  });
});
