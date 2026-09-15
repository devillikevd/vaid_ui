jest.mock('archiver', () => jest.fn(() => ({
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
})));

const jwt = require('jsonwebtoken');
const config = require('../config');
const { authorize } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const authService = require('../services/authService');
const enhancedAdminService = require('../services/enhancedAdminService');
const { assertDocumentOwnership } = require('../utils/providerApproval');
const { supabaseAdmin } = require('../config/supabase');
const redisClient = require('../config/redis');

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
  cacheIncr: jest.fn(() => Promise.resolve(1)),
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

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Facility Provider Registration & Admin Approval Security Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const FACILITY_ROLES = [
    { requestedRole: 'clinic_owner', pendingRole: 'clinic_owner_pending', table: 'clinics', ownerField: 'owner_id' },
    { requestedRole: 'hospital_owner', pendingRole: 'hospital_owner_pending', table: 'hospitals', ownerField: 'owner_id' },
    { requestedRole: 'pharmacy_owner', pendingRole: 'pharmacy_owner_pending', table: 'pharmacies', ownerField: 'owner_id' },
    { requestedRole: 'diagnostic_center_owner', pendingRole: 'diagnostic_center_owner_pending', table: 'diagnostic_centers', ownerField: 'owner_id' },
    { requestedRole: 'wellness_coach', pendingRole: 'wellness_coach_pending', table: 'wellness_coaches', ownerField: 'user_id' },
    { requestedRole: 'fitness_center_owner', pendingRole: 'fitness_center_owner_pending', table: 'fitness_centers', ownerField: 'owner_user_id' },
  ];

  describe('1. Registration Issues 2-Hour Tokens for All 6 Facility Roles', () => {
    test.each(FACILITY_ROLES)(
      'registering as $requestedRole assigns $pendingRole with 2h access and refresh tokens',
      async ({ requestedRole, pendingRole, table }) => {
        const mockUser = {
          id: `user-${requestedRole}-uuid`,
          email: `${requestedRole}@example.com`,
          role: pendingRole,
          requested_role: requestedRole,
          token_version: 0,
          is_active: true,
          is_verified: true,
        };

        let isUserInsert = false;
        supabaseAdmin.from.mockImplementation((tbl) => {
          if (tbl === 'otp_verifications') {
            return makeQueryBuilder({
              data: { id: 'otp-1', verified_at: new Date().toISOString() },
              error: null,
            });
          }
          if (tbl === 'users') {
            const builder = {
              select: jest.fn(() => builder),
              insert: jest.fn(() => {
                isUserInsert = true;
                return builder;
              }),
              or: jest.fn(() => builder),
              limit: jest.fn(() => builder),
              delete: jest.fn(() => builder),
              eq: jest.fn(() => builder),
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
              single: jest.fn(() => Promise.resolve({
                data: isUserInsert ? mockUser : null,
                error: null,
              })),
              then: (resolve) => resolve({ data: isUserInsert ? mockUser : null, error: null }),
            };
            return builder;
          }
          if (tbl === table || tbl === 'refresh_tokens' || tbl === 'patients') {
            return makeQueryBuilder({
              data: { id: `entity-${requestedRole}-id` },
              error: null,
            });
          }
          return makeQueryBuilder({ data: {}, error: null });
        });

        const res = await authService.register({
          name: `Owner of ${requestedRole}`,
          email: `${requestedRole}@example.com`,
          phone: '+919876543210',
          password: 'Password123!',
          role: requestedRole,
          facility_name: `Test ${requestedRole} Facility`,
          address: '123 Facility Road',
          city: 'Mumbai',
          coach_types: ['Yoga'],
          qualifications: ['Certified Trainer'],
          experience_years: 5,
          session_fee: 500,
          is_draft: true,
        });

        expect(res.success).toBe(true);
        expect(res.isRegistrationToken).toBe(true);
        expect(res.accessToken).toBeDefined();
        expect(res.refreshToken).toBeDefined();

        const decodedAccess = jwt.decode(res.accessToken);
        expect(decodedAccess.role).toBe(pendingRole);
        expect(decodedAccess.userId).toBe(mockUser.id);
        expect(decodedAccess.exp - decodedAccess.iat).toBe(7200);

        const decodedRefresh = jwt.decode(res.refreshToken);
        expect(decodedRefresh.userId).toBe(mockUser.id);
        expect(decodedRefresh.exp - decodedRefresh.iat).toBe(7200);
      }
    );
  });

  describe('2. Absolute 2-Hour Expiry Enforced on Token Refresh', () => {
    test('refreshing pending registration token recalculates remaining time from original session and does NOT reset clock', async () => {
      const userId = 'user-clinic-pending-uuid';
      const originalRefreshToken = jwt.sign(
        { userId, sub: userId, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: '2h' }
      );

      // Suppose 30 minutes have elapsed, so 5400s (90m) remain
      const sessionCreationTime = new Date(Date.now() - 30 * 60 * 1000);
      const originalExpiresAt = new Date(sessionCreationTime.getTime() + 2 * 60 * 60 * 1000).toISOString();

      let rotatedExpiresAt = null;

      supabaseAdmin.from.mockImplementation((tbl) => {
        if (tbl === 'refresh_tokens') {
          const builder = {
            select: jest.fn(() => builder),
            insert: jest.fn((row) => {
              rotatedExpiresAt = row.expires_at;
              return builder;
            }),
            update: jest.fn(() => builder),
            eq: jest.fn(() => builder),
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'rt-1',
                token: originalRefreshToken,
                is_revoked: false,
                user_id: userId,
                expires_at: originalExpiresAt,
              },
              error: null,
            })),
            then: (resolve) => resolve({ data: {}, error: null }),
          };
          return builder;
        }
        if (tbl === 'users') {
          return makeQueryBuilder({
            data: {
              id: userId,
              role: 'clinic_owner_pending',
              is_active: true,
              is_verified: true,
              token_version: 0,
            },
            error: null,
          });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      const refreshResult = await authService.refreshToken(originalRefreshToken);

      expect(refreshResult.isRegistrationToken).toBe(true);
      expect(rotatedExpiresAt).toBe(originalExpiresAt); // Session clock NOT reset

      const decodedAccess = jwt.decode(refreshResult.accessToken);
      const remainingSeconds = decodedAccess.exp - decodedAccess.iat;
      // Should be approximately 5400s (90 mins), strictly less than 7200s
      expect(remainingSeconds).toBeLessThanOrEqual(5405);
      expect(remainingSeconds).toBeGreaterThanOrEqual(5390);
    });

    test('rejects refresh when absolute 2-hour window has expired', async () => {
      const userId = 'user-clinic-pending-uuid';
      const expiredRefreshToken = jwt.sign(
        { userId, sub: userId, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: '2h' }
      );

      // Session created 2 hours and 5 minutes ago
      const expiredTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      supabaseAdmin.from.mockImplementation((tbl) => {
        if (tbl === 'refresh_tokens') {
          const builder = {
            select: jest.fn(() => builder),
            eq: jest.fn(() => builder),
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'rt-expired',
                token: expiredRefreshToken,
                is_revoked: false,
                user_id: userId,
                expires_at: expiredTimestamp,
              },
              error: null,
            })),
            then: (resolve) => resolve({ data: {}, error: null }),
          };
          return builder;
        }
        if (tbl === 'users') {
          return makeQueryBuilder({
            data: {
              id: userId,
              role: 'clinic_owner_pending',
              is_active: true,
              is_verified: true,
              token_version: 0,
            },
            error: null,
          });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      await expect(authService.refreshToken(expiredRefreshToken)).rejects.toThrow(
        expect.objectContaining({ statusCode: 401, message: expect.stringContaining('expired') })
      );
    });
  });

  describe('3. Operational RBAC Rejection for Pending Roles', () => {
    test.each(FACILITY_ROLES)(
      '$pendingRole is strictly DENIED operational access by requireRole($requestedRole)',
      ({ requestedRole, pendingRole }) => {
        const operationalGuard = requireRole(requestedRole);
        const req = { user: { id: 'u1', role: pendingRole } };
        const res = mockRes();
        const next = jest.fn();

        operationalGuard(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: false,
          message: expect.stringContaining('Access denied'),
        }));
      }
    );

    test('normal login is blocked for users with pending roles', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('Password123!', 10);

      supabaseAdmin.from.mockImplementation((tbl) => {
        if (tbl === 'users') {
          return makeQueryBuilder({
            data: {
              id: 'u-pending',
              email: 'clinic@test.com',
              role: 'clinic_owner_pending',
              password_hash: hashedPassword,
              is_active: true,
              is_verified: true,
            },
            error: null,
          });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      await expect(authService.login('clinic@test.com', 'Password123!', 'clinic_owner')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('under review'),
        })
      );
    });
  });

  describe('4. Document Ownership Enforcement', () => {
    test('assertDocumentOwnership permits documents belonging to the authenticated user', () => {
      const validUrl = 'http://localhost:9000/vaididea-documents/licenses/user-123/clinic-cert.pdf';
      expect(() => assertDocumentOwnership(validUrl, 'user-123', 'clinic-abc')).not.toThrow();
    });

    test('assertDocumentOwnership permits documents containing the provider ID', () => {
      const validUrl = 'http://localhost:9000/vaididea-documents/licenses/clinic-abc/clinic-cert.pdf';
      expect(() => assertDocumentOwnership(validUrl, 'user-123', 'clinic-abc')).not.toThrow();
    });

    test('assertDocumentOwnership rejects cross-account document URLs from other users', () => {
      const stolenUrl = 'http://localhost:9000/vaididea-documents/licenses/attacker-user-999/clinic-cert.pdf';
      expect(() => assertDocumentOwnership(stolenUrl, 'victim-user-123', 'clinic-abc')).toThrow(
        expect.objectContaining({ statusCode: 403, message: expect.stringContaining('authenticated provider') })
      );
    });
  });

  describe('5. Admin Approval Lifecycle & Cache Invalidation', () => {
    test('approving provider transitions role, increments token_version, and uses cache versioning', async () => {
      const targetUserId = 'user-clinic-owner-id';
      let userRoleUpdated = null;
      let tokenVersionIncremented = false;

      supabaseAdmin.from.mockImplementation((tbl) => {
        if (tbl === 'clinics') {
          const clinicData = {
            id: 'clinic-1',
            name: 'City Clinic',
            phone: '+919876543210',
            owner_id: targetUserId,
            approval_status: 'pending',
            latitude: 19.0760,
            longitude: 72.8777,
            registration_number: 'CLN-12345',
            license_number: 'CLN-12345',
            address: '123 Test St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            license_document_url: `http://localhost:9000/licenses/${targetUserId}/doc.pdf`,
          };
          const builder = {
            select: jest.fn(() => builder),
            update: jest.fn((updates) => {
              Object.assign(clinicData, updates);
              return builder;
            }),
            eq: jest.fn(() => builder),
            single: jest.fn(() => Promise.resolve({ data: clinicData, error: null })),
            maybeSingle: jest.fn(() => Promise.resolve({ data: clinicData, error: null })),
            then: (resolve) => resolve({ data: clinicData, error: null }),
          };
          return builder;
        }
        if (tbl === 'users') {
          const builder = {
            select: jest.fn(() => builder),
            update: jest.fn((updates) => {
              if (updates.role) userRoleUpdated = updates.role;
              return builder;
            }),
            eq: jest.fn(() => builder),
            single: jest.fn(() => Promise.resolve({
              data: { id: targetUserId, role: 'clinic_owner_pending', requested_role: 'clinic_owner', token_version: 1 },
              error: null,
            })),
            maybeSingle: jest.fn(() => Promise.resolve({
              data: { id: targetUserId, role: 'clinic_owner_pending', requested_role: 'clinic_owner', token_version: 1 },
              error: null,
            })),
            then: (resolve) => resolve({ data: { id: targetUserId }, error: null }),
          };
          return builder;
        }
        if (tbl === 'approval_logs' || tbl === 'notifications') {
          return makeQueryBuilder({ data: {}, error: null });
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      // Mock rawSupabaseAdmin.from for revokeProviderAuthSessions
      const { rawSupabaseAdmin } = require('../config/supabase');
      rawSupabaseAdmin.from = jest.fn((tbl) => {
        if (tbl === 'users') {
          const builder = {
            select: jest.fn(() => builder),
            update: jest.fn(() => {
              tokenVersionIncremented = true;
              return builder;
            }),
            eq: jest.fn(() => builder),
            single: jest.fn(() => Promise.resolve({
              data: { token_version: 1 },
              error: null,
            })),
            then: (resolve) => resolve({ data: {}, error: null }),
          };
          return builder;
        }
        return makeQueryBuilder({ data: {}, error: null });
      });

      const result = await enhancedAdminService.approveProvider('clinic', 'clinic-1', 'admin-uuid-1', 'Approved all credentials');

      expect(result.data).toBeDefined();
      expect(result.data.approval_status).toBe('approved');
      expect(userRoleUpdated).toBe('clinic_owner'); // Transited to approved operational role
      expect(tokenVersionIncremented).toBe(true); // Old session revoked

      // Verify exact key and version-based cache invalidation, NEVER wildcard DEL
      expect(redisClient.cacheIncr).toHaveBeenCalled();
      expect(redisClient.cacheDel).not.toHaveBeenCalledWith(expect.stringContaining('*'));
    });
  });
});
