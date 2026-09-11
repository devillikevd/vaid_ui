const jwt = require('jsonwebtoken');
const config = require('../config');
const { authorize } = require('../middleware/auth');
const authService = require('../services/authService');
const { supabaseAdmin } = require('../config/supabase');

jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  rawSupabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve(true)),
  cacheDel: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  sendVerificationOtpEmail: jest.fn(() => Promise.resolve()),
  sendPasswordResetOtpEmail: jest.fn(() => Promise.resolve()),
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
    or: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    single: jest.fn(() => promise),
    maybeSingle: jest.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
};

describe('Doctor Registration Document Security & Token Boundary Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPendingDoctor = {
    id: 'doc-pending-uuid-1',
    email: 'dr.test@example.com',
    role: 'doctor_pending',
    token_version: 0,
    is_active: true,
    is_verified: true,
  };

  describe('1. Registration Token 2-Hour Expiry & Role Verification', () => {
    test('doctor registration generates a 2-hour access token and 2-hour refresh token with isRegistrationToken flag', async () => {
      let isInsert = false;
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'otp_verifications') {
          return makeQueryBuilder({
            data: { id: 'otp-1', verified_at: new Date().toISOString() },
            error: null,
          });
        }
        if (table === 'users') {
          const builder = {
            select: jest.fn(() => builder),
            insert: jest.fn(() => {
              isInsert = true;
              return builder;
            }),
            or: jest.fn(() => builder),
            limit: jest.fn(() => builder),
            delete: jest.fn(() => builder),
            eq: jest.fn(() => builder),
            maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            single: jest.fn(() => Promise.resolve({
              data: isInsert ? mockPendingDoctor : null,
              error: null,
            })),
            then: (resolve) => resolve({ data: isInsert ? mockPendingDoctor : null, error: null }),
          };
          return builder;
        }
        if (table === 'doctors' || table === 'patients' || table === 'refresh_tokens') {
          return makeQueryBuilder({
            data: { id: 'created-id' },
            error: null,
          });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      const res = await authService.register({
        name: 'Dr. John Doe',
        email: 'dr.test@example.com',
        phone: '+919876543210',
        password: 'Password123!',
        role: 'doctor',
        is_draft: true,
      });

      expect(res.success).toBe(true);
      expect(res.isRegistrationToken).toBe(true);
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();

      // Verify decoded access token payload & expiry
      const decodedAccess = jwt.decode(res.accessToken);
      expect(decodedAccess.role).toBe('doctor_pending');
      expect(decodedAccess.userId).toBe(mockPendingDoctor.id);
      expect(decodedAccess.type).toBe('access');

      // 2 hours = 7200 seconds (allow +/- 5 seconds difference)
      const accessTtl = decodedAccess.exp - decodedAccess.iat;
      expect(accessTtl).toBe(7200);

      // Verify decoded refresh token payload & expiry
      const decodedRefresh = jwt.decode(res.refreshToken);
      expect(decodedRefresh.userId).toBe(mockPendingDoctor.id);
      expect(decodedRefresh.type).toBe('refresh');
      const refreshTtl = decodedRefresh.exp - decodedRefresh.iat;
      expect(refreshTtl).toBe(7200);
    });
  });

  describe('2. Refresh Token Rotation Limits for doctor_pending', () => {
    test('refreshing a doctor_pending token maintains the 2h limit and NEVER issues a 7-day or 30-day session', async () => {
      // Generate a signed registration refresh token
      const originalRefreshToken = jwt.sign(
        {
          userId: mockPendingDoctor.id,
          sub: mockPendingDoctor.id,
          type: 'refresh',
          aud: config.jwt.audience,
          iss: config.jwt.issuer,
        },
        config.jwt.refreshSecret,
        { expiresIn: '2h' }
      );

      let storedTokenRevoked = false;
      let newSessionExpiresAt = null;

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'refresh_tokens') {
          const builder = {
            select: jest.fn(() => builder),
            insert: jest.fn((row) => {
              newSessionExpiresAt = row.expires_at;
              return builder;
            }),
            update: jest.fn(() => {
              storedTokenRevoked = true;
              return builder;
            }),
            eq: jest.fn(() => builder),
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'rt-1',
                token: originalRefreshToken,
                is_revoked: false,
                family_id: 'family-1',
                user_id: mockPendingDoctor.id,
              },
              error: null,
            })),
            then: (resolve) => resolve({ data: {}, error: null }),
          };
          return builder;
        }
        if (table === 'users') {
          return makeQueryBuilder({
            data: mockPendingDoctor,
            error: null,
          });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      const refreshResult = await authService.refreshToken(originalRefreshToken);

      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(refreshResult.isRegistrationToken).toBe(true);
      expect(storedTokenRevoked).toBe(true);

      // Verify the new access token is still 2 hours
      const decodedAccess = jwt.decode(refreshResult.accessToken);
      expect(decodedAccess.role).toBe('doctor_pending');
      const accessTtl = decodedAccess.exp - decodedAccess.iat;
      expect(accessTtl).toBe(7200);

      // Verify the new refresh token is still 2 hours
      const decodedRefresh = jwt.decode(refreshResult.refreshToken);
      const refreshTtl = decodedRefresh.exp - decodedRefresh.iat;
      expect(refreshTtl).toBe(7200);

      // Verify database stored expiry is approximately 2 hours, NOT 30 days
      expect(newSessionExpiresAt).toBeDefined();
      const dbTtlMs = new Date(newSessionExpiresAt).getTime() - Date.now();
      expect(dbTtlMs).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 5000);
      expect(dbTtlMs).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    });
  });

  describe('3. Role Boundary Enforcement for doctor_pending', () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('authorize("doctor", "doctor_pending") allows doctor_pending for registration endpoints', () => {
      const regAuthorizer = authorize('doctor', 'doctor_pending');
      const req = { user: { id: 'doc-1', role: 'doctor_pending' } };
      const res = mockRes();
      const next = jest.fn();

      regAuthorizer(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('authorize("doctor") strictly REJECTS doctor_pending for normal doctor portal endpoints', () => {
      const portalAuthorizer = authorize('doctor');
      const req = { user: { id: 'doc-1', role: 'doctor_pending' } };
      const res = mockRes();
      const next = jest.fn();

      portalAuthorizer(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('permission'),
      }));
    });

    test('patient, clinic_owner, and admin role authorizers all reject doctor_pending', () => {
      const patientAuthorizer = authorize('patient');
      const clinicAuthorizer = authorize('clinic_owner');
      const adminAuthorizer = authorize('admin', 'super_admin');

      const req = { user: { id: 'doc-1', role: 'doctor_pending' } };

      const res1 = mockRes();
      const next1 = jest.fn();
      patientAuthorizer(req, res1, next1);
      expect(next1).not.toHaveBeenCalled();
      expect(res1.status).toHaveBeenCalledWith(403);

      const res2 = mockRes();
      const next2 = jest.fn();
      clinicAuthorizer(req, res2, next2);
      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(403);

      const res3 = mockRes();
      const next3 = jest.fn();
      adminAuthorizer(req, res3, next3);
      expect(next3).not.toHaveBeenCalled();
      expect(res3.status).toHaveBeenCalledWith(403);
    });
  });

  describe('4. Login Endpoint Isolation for doctor_pending', () => {
    test('doctor_pending user attempting login via normal login route is rejected with 403 review error', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Secret123!', 10);

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'users') {
          return makeQueryBuilder({
            data: {
              ...mockPendingDoctor,
              password_hash: passwordHash,
              requested_role: 'doctor',
            },
            error: null,
          });
        }
        if (table === 'doctors') {
          return makeQueryBuilder({
            data: {
              id: 'doc-profile-1',
              user_id: mockPendingDoctor.id,
              approval_status: 'pending',
            },
            error: null,
          });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      await expect(
        authService.login('dr.test@example.com', 'Secret123!', 'doctor')
      ).rejects.toThrow('Your account is currently under review by an administrator');
    });
  });
});
