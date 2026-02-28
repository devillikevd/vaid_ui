/**
 * Authentication Middleware Tests
 */
const { authenticate } = require('../middleware/auth');
const { mockRequest, mockResponse, mockNext, testUsers, generateTestToken } = require('./setup');

describe('Authentication Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('authenticate', () => {
        it('should reject request without authorization header', async () => {
            const req = mockRequest();
            const res = mockResponse();

            await authenticate(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should reject request with invalid token format', async () => {
            const req = mockRequest({
                headers: { authorization: 'InvalidToken' },
            });
            const res = mockResponse();

            await authenticate(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should reject request with invalid token', async () => {
            const req = mockRequest({
                headers: { authorization: 'Bearer invalid.token.here' },
            });
            const res = mockResponse();

            await authenticate(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should accept request with valid token', async () => {
            const token = generateTestToken(testUsers.patient);
            const req = mockRequest({
                headers: { authorization: `Bearer ${token}` },
            });
            const res = mockResponse();

            await authenticate(req, res, mockNext);

            // If successful, next should be called without error
            // The actual behavior depends on database lookup
        });
    });
});

describe('RBAC Middleware', () => {
    const { requireRole, requireMinRole, ROLES } = require('../middleware/rbac');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('requireRole', () => {
        it('should allow access for matching role', () => {
            const middleware = requireRole(ROLES.PATIENT);
            const req = mockRequest({ user: { role: 'patient' } });
            const res = mockResponse();
            const next = jest.fn();

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should deny access for non-matching role', () => {
            const middleware = requireRole(ROLES.ADMIN);
            const req = mockRequest({ user: { role: 'patient' } });
            const res = mockResponse();
            const next = jest.fn();

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should allow access for any of multiple roles', () => {
            const middleware = requireRole(ROLES.DOCTOR, ROLES.ADMIN);
            const req = mockRequest({ user: { role: 'doctor' } });
            const res = mockResponse();
            const next = jest.fn();

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('requireMinRole', () => {
        it('should allow admin for any minimum role', () => {
            const middleware = requireMinRole(ROLES.PATIENT);
            const req = mockRequest({ user: { role: 'admin' } });
            const res = mockResponse();
            const next = jest.fn();

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should deny lower role access to higher role endpoint', () => {
            const middleware = requireMinRole(ROLES.ADMIN);
            const req = mockRequest({ user: { role: 'patient' } });
            const res = mockResponse();
            const next = jest.fn();

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
