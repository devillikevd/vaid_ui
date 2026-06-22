const fs = require('fs');
const path = require('path');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('security hardening invariants', () => {
  test('delivery assignment checks role, facility ownership, and agent facility binding before update', () => {
    const source = read('routes/deliveryAgentRoutes.js');
    expect(source).toMatch(/router\.post\('\/assign', authenticate, requireRole\(/);
    expect(source).toContain("ownerId !== req.user.id");
    expect(source).toContain("agent.facility_id !== facilityId");
    expect(source).toContain("agent.facility_type !== facilityType");
    expect(source.indexOf('agent.facility_id !== facilityId')).toBeLessThan(source.indexOf(".update({ \n                agent_id"));
  });

  test('vitals websocket performs backend participant authorization and fails closed without JWT config', () => {
    const aiSource = fs.readFileSync(path.join(__dirname, '..', '..', 'swastik-ai-service', 'main.py'), 'utf8');
    const routeSource = read('routes/vitals.js');
    expect(aiSource).toContain('WebSocket authentication is not configured');
    expect(aiSource).toContain('/api/vitals/session/{session_id}/authorize');
    expect(aiSource).toContain('Session access denied');
    expect(routeSource).toContain("router.get('/session/:sessionId/authorize'");
    expect(routeSource).toContain('verifySessionAccess(req.user.id, req.user.role, req.params.sessionId)');
  });

  test('ambulance publishing and reconnect both re-check emergency access', () => {
    const source = read('sockets/index.js');
    expect(source).toContain("{ allowBroadcastAccess: false, action: 'publish location for' }");
    expect(source).toContain('const stillAuthorized = []');
    expect(source).toContain('stillAuthorized.push(requestId)');
    expect(source).toContain('Invalid location coordinates');
  });

  test('access tokens carry a revocable version checked by HTTP and socket authentication', () => {
    const authService = read('services/authService.js');
    const authMiddleware = read('middleware/auth.js');
    const sockets = read('sockets/index.js');
    const migration = read('database/production/041_token_version.sql');
    expect(authService).toContain("type: 'access', tokenVersion:");
    expect(authService).toContain('await revokeAccessTokens(userId)');
    expect(authMiddleware).toContain("code: 'TOKEN_REVOKED'");
    expect(sockets).toContain('currentTokenVersion !== presentedTokenVersion');
    expect(migration).toContain('token_version INTEGER NOT NULL DEFAULT 0');
  });

  test('unsafe direct uploads are disabled and entity types fail closed', () => {
    const source = read('routes/uploads.js');
    expect(source).toContain("throw new ApiError(410, 'Direct uploads are disabled.");
    expect(source).toContain("if (!entityConfig)");
    expect(source).toContain("throw new ApiError(400, 'Invalid entity type')");
    expect(source).toContain(".from('hospital_managers')");
  });

  test('web provider auth can verify email and reset password before approval', () => {
    const authService = read('services/authService.js');
    const enhancedAdminService = read('services/enhancedAdminService.js');
    const loginSource = authService.slice(authService.indexOf('const login = async'), authService.indexOf('// ==================== Refresh Token'));
    const forgotSource = authService.slice(authService.indexOf('const forgotPassword = async'), authService.indexOf('// ==================== Reset Password'));
    const resetSource = authService.slice(authService.indexOf('const resetPassword = async'), authService.indexOf('// Update current user profile'));
    const webApi = fs.readFileSync(path.join(__dirname, '..', '..', 'swastik-web', 'src', 'lib', 'api.ts'), 'utf8');
    const webAuthStore = fs.readFileSync(path.join(__dirname, '..', '..', 'swastik-web', 'src', 'stores', 'authStore.ts'), 'utf8');

    expect(authService).toContain('const createEmailNotVerifiedError = () =>');
    expect(loginSource.indexOf('throw createEmailNotVerifiedError()')).toBeLessThan(loginSource.indexOf('// Optional role enforcement'));
    expect(forgotSource).toContain(".select('id, name, email, role, requested_role, is_active')");
    expect(resetSource).toContain(".select('role, requested_role')");
    expect(authService).toContain('user.requested_role === expectedRole');
    expect(webApi).toContain('payload?.accessToken || payload?.access_token || payload?.token');
    expect(webApi).toContain('payload?.refreshToken || payload?.refresh_token');
    expect(webAuthStore).toContain('resolveAccessToken(tokens)');
    expect(webAuthStore).toContain('resolveRefreshToken(tokens)');
    expect(enhancedAdminService).toContain('const revokeProviderAuthSessions = async (userId) =>');
    expect(enhancedAdminService).toContain("rawSupabaseAdmin");
    expect(enhancedAdminService).toContain('token_version: Number(user.token_version || 0) + 1');
    expect(enhancedAdminService).toContain('await revokeProviderAuthSessions(userId)');
  });
});
