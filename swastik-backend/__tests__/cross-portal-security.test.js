const fs = require('fs');
const path = require('path');
const { authorize } = require('../middleware/auth');

const PORTAL_ROLE_MAP = {
  doctor: ['doctor', 'doctor_pending'],
  clinic: ['clinic', 'clinic_owner', 'clinic_manager', 'clinic_staff'],
  pharmacy: ['pharmacy', 'pharmacy_owner', 'pharmacy_manager', 'pharmacy_staff'],
  diagnostic_center: ['diagnostic_center', 'diagnostic_center_owner', 'diagnostic_manager', 'lab_technician'],
  hospital: ['hospital_owner', 'hospital_manager'],
  patient: ['patient'],
  wellness: ['wellness_coach', 'wellness'],
  wellness_coach: ['wellness_coach', 'wellness'],
  fitness_center: ['fitness_center_owner', 'fitness_trainer', 'fitness-center', 'gym'],
  fitness_center_owner: ['fitness_center_owner', 'fitness_trainer', 'fitness-center', 'gym'],
  admin: ['admin', 'super_admin'],
};

function doesRoleMatchPortal(userRole, portalOrRoles) {
  if (!userRole) return false;
  const normalizedUserRole = String(userRole).toLowerCase().trim();
  const allowed = (Array.isArray(portalOrRoles) ? portalOrRoles.flat() : [portalOrRoles])
    .map((r) => String(r).toLowerCase().trim());

  for (const target of allowed) {
    if (target === normalizedUserRole) return true;
    if (PORTAL_ROLE_MAP[target]?.includes(normalizedUserRole)) return true;
    for (const group of Object.values(PORTAL_ROLE_MAP)) {
      if (group.includes(target) && group.includes(normalizedUserRole)) return true;
    }
  }
  return false;
}

function isRoleValidForPortal(role, portal) {
  return doesRoleMatchPortal(role, portal);
}

function isPatientAuthenticated(user, isAuthenticated) {
  return Boolean(isAuthenticated && user?.role && String(user.role).toLowerCase().trim() === 'patient');
}


describe('Vaididea Multi-Portal Cross-Role Security & Isolation Test Suite', () => {
  describe('1. Role Authorization Middleware Boundary', () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('Patient routes strictly reject clinic_owner, doctor, and hospital_owner', () => {
      const patientAuthorizer = authorize('patient');
      const next = jest.fn();

      // Clinic owner attempting patient route
      const clinicReq = { user: { id: 'user-clinic-1', role: 'clinic_owner' } };
      const res1 = mockRes();
      patientAuthorizer(clinicReq, res1, next);
      expect(res1.status).toHaveBeenCalledWith(403);
      expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('permission'),
      }));

      expect(next).not.toHaveBeenCalled();

      // Doctor attempting patient route
      const doctorReq = { user: { id: 'user-doc-1', role: 'doctor' } };
      const res2 = mockRes();
      patientAuthorizer(doctorReq, res2, next);
      expect(res2.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      // Patient allowed
      const patientReq = { user: { id: 'user-pat-1', role: 'patient' } };
      const res3 = mockRes();
      patientAuthorizer(patientReq, res3, next);
      expect(next).toHaveBeenCalled();
    });

    test('Doctor routes strictly reject patient and pharmacy_owner', () => {
      const doctorAuthorizer = authorize('doctor');
      const next = jest.fn();

      const patientReq = { user: { id: 'user-pat-1', role: 'patient' } };
      const res1 = mockRes();
      doctorAuthorizer(patientReq, res1, next);
      expect(res1.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const doctorReq = { user: { id: 'user-doc-1', role: 'doctor' } };
      const res2 = mockRes();
      doctorAuthorizer(doctorReq, res2, next);
      expect(next).toHaveBeenCalled();
    });

    test('Clinic routes strictly reject patient and wellness_coach', () => {
      const clinicAuthorizer = authorize('clinic_owner', 'clinic_manager', 'clinic_staff');
      const next = jest.fn();

      const patientReq = { user: { id: 'user-pat-1', role: 'patient' } };
      const res1 = mockRes();
      clinicAuthorizer(patientReq, res1, next);
      expect(res1.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const coachReq = { user: { id: 'user-coach-1', role: 'wellness_coach' } };
      const res2 = mockRes();
      clinicAuthorizer(coachReq, res2, next);
      expect(res2.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      const clinicReq = { user: { id: 'user-clinic-1', role: 'clinic_owner' } };
      const res3 = mockRes();
      clinicAuthorizer(clinicReq, res3, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('2. Frontend Portal Isolation & Role Helpers', () => {
    test('isPatientAuthenticated returns true ONLY for patient role', () => {
      expect(isPatientAuthenticated({ role: 'patient' }, true)).toBe(true);
      expect(isPatientAuthenticated({ role: 'clinic_owner' }, true)).toBe(false);
      expect(isPatientAuthenticated({ role: 'doctor' }, true)).toBe(false);
      expect(isPatientAuthenticated({ role: 'hospital_owner' }, true)).toBe(false);
      expect(isPatientAuthenticated({ role: 'pharmacy_owner' }, true)).toBe(false);
      expect(isPatientAuthenticated({ role: 'admin' }, true)).toBe(false);
      expect(isPatientAuthenticated(null, true)).toBe(false);
      expect(isPatientAuthenticated({ role: 'patient' }, false)).toBe(false);
    });

    test('doesRoleMatchPortal and isRoleValidForPortal match expected roles', () => {
      // Clinic Portal
      expect(isRoleValidForPortal('clinic_owner', 'clinic')).toBe(true);
      expect(isRoleValidForPortal('clinic_manager', 'clinic')).toBe(true);
      expect(isRoleValidForPortal('patient', 'clinic')).toBe(false);
      expect(isRoleValidForPortal('doctor', 'clinic')).toBe(false);

      // Patient Portal
      expect(isRoleValidForPortal('patient', 'patient')).toBe(true);
      expect(isRoleValidForPortal('clinic_owner', 'patient')).toBe(false);
      expect(isRoleValidForPortal('doctor', 'patient')).toBe(false);

      // Doctor Portal
      expect(isRoleValidForPortal('doctor', 'doctor')).toBe(true);
      expect(isRoleValidForPortal('doctor_pending', 'doctor')).toBe(true);
      expect(isRoleValidForPortal('patient', 'doctor')).toBe(false);

      // Wellness Portal
      expect(isRoleValidForPortal('wellness_coach', 'wellness_coach')).toBe(true);
      expect(isRoleValidForPortal('patient', 'wellness_coach')).toBe(false);

      // Fitness Center Portal
      expect(isRoleValidForPortal('fitness_center_owner', 'fitness_center_owner')).toBe(true);
      expect(isRoleValidForPortal('patient', 'fitness_center_owner')).toBe(false);
    });

    test('PORTAL_ROLE_MAP contains all canonical system portals', () => {
      expect(PORTAL_ROLE_MAP).toHaveProperty('doctor');
      expect(PORTAL_ROLE_MAP).toHaveProperty('clinic');
      expect(PORTAL_ROLE_MAP).toHaveProperty('pharmacy');
      expect(PORTAL_ROLE_MAP).toHaveProperty('diagnostic_center');
      expect(PORTAL_ROLE_MAP).toHaveProperty('hospital');
      expect(PORTAL_ROLE_MAP).toHaveProperty('patient');
      expect(PORTAL_ROLE_MAP).toHaveProperty('wellness');
      expect(PORTAL_ROLE_MAP).toHaveProperty('fitness_center');
      expect(PORTAL_ROLE_MAP).toHaveProperty('admin');
    });
  });

  describe('3. Codebase Invariant Audits', () => {
    const readBackend = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    const readWeb = (relativePath) => fs.readFileSync(path.join(__dirname, '..', '..', 'swastik-web', relativePath), 'utf8');

    test('Patient backend router mounts authenticate and authorize(patient) before subroutes', () => {
      const patientIndex = readBackend('routes/patient/index.js');
      const authPos = patientIndex.indexOf("router.use(authorize('patient'));");
      const reviewsPos = patientIndex.indexOf("router.use('/reviews', reviewsRoutes);");
      const referralsPos = patientIndex.indexOf("router.use('/referrals', referralsRoutes);");

      expect(authPos).toBeGreaterThan(0);
      expect(authPos).toBeLessThan(reviewsPos);
      expect(authPos).toBeLessThan(referralsPos);
    });

    test('Next.js proxy middleware protects private patient routes and excludes public routes', () => {
      const proxySource = readWeb('src/proxy.ts');
      expect(proxySource).toContain("'/patient/appointments': 'patient'");
      expect(proxySource).toContain("'/patient/records': 'patient'");
      expect(proxySource).toContain("'/patient/digital-health-card': 'patient'");
      expect(proxySource).toContain("'/patient/health-id': 'patient'");
      expect(proxySource).toContain("'/patient/assistant': 'patient'");
      expect(proxySource).toContain('matcher:');
      expect(proxySource).toContain("'/patient/appointments/:path*'");
    });

    test('PatientLayout gates private profile fetching and patient profile menu on isPatientAuthenticated', () => {
      const layoutSource = readWeb('src/app/patient/layout.tsx');
      expect(layoutSource).toContain('isPatientAuthenticated');
      expect(layoutSource).toContain('isPatientAuthenticated(user, isAuthenticated)');
      expect(layoutSource).toContain('if (isPatient) {');
      expect(layoutSource).toMatch(/patientApi\s*\.getProfile\(\)/);
      expect(layoutSource).toContain('isPatient ? (');
    });

    test('Patient Dashboard and Private Pages gate fetches on isPatient', () => {
      const dashboardSource = readWeb('src/app/patient/page.tsx');
      expect(dashboardSource).toContain('isPatientAuthenticated');
      expect(dashboardSource).toContain('if (isPatient) {');
      expect(dashboardSource).toMatch(/!isPatient\s*\?/);

      const recordsSource = readWeb('src/app/patient/records/page.tsx');
      expect(recordsSource).toContain('isPatientAuthenticated');
      expect(recordsSource).toMatch(/if\s*\(_hasHydrated\s*&&\s*!authLoading\s*&&\s*!isPatient\)/);

      const appointmentsSource = readWeb('src/app/patient/appointments/page.tsx');
      expect(appointmentsSource).toContain('isPatientAuthenticated');
      expect(appointmentsSource).toMatch(/if\s*\(_hasHydrated\s*&&\s*!authLoading\s*&&\s*!isPatient\)/);
    });

  });
});
