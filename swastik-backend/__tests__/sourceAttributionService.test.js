const { 
  resolveAcquisitionSource, 
  getLegacyDatabaseSource,
  buildCanonicalContext 
} = require('../services/sourceAttributionService');
const { ROLES } = require('../middleware/rbac');

describe('sourceAttributionService', () => {

  describe('resolveAcquisitionSource', () => {

    test('Patient App -> vaididea_app', () => {
      const source = resolveAcquisitionSource({
        role: ROLES.PATIENT,
        clientApp: 'ios'
      });
      expect(source).toBe('vaididea_app');

      const sourceAndroid = resolveAcquisitionSource({
        role: ROLES.PATIENT,
        clientApp: 'android'
      });
      expect(sourceAndroid).toBe('vaididea_app');
    });

    test('Patient Web -> vaididea_web', () => {
      const source = resolveAcquisitionSource({
        role: ROLES.PATIENT,
        clientApp: 'web'
      });
      expect(source).toBe('vaididea_web');

      const sourceMissing = resolveAcquisitionSource({
        role: ROLES.PATIENT
      });
      expect(sourceMissing).toBe('vaididea_web');
    });

    test('Clinic -> clinic_referral', () => {
      const source = resolveAcquisitionSource({
        b2bOrigin: 'clinic'
      });
      expect(source).toBe('clinic_referral');
    });

    test('Hospital -> hospital_referral', () => {
      const source = resolveAcquisitionSource({
        b2bOrigin: 'hospital'
      });
      expect(source).toBe('hospital_referral');
    });

    test('Doctor -> doctor_referral', () => {
      const source = resolveAcquisitionSource({
        b2bOrigin: 'doctor'
      });
      expect(source).toBe('doctor_referral');
    });

    test('Affiliate -> affiliate', () => {
      const source = resolveAcquisitionSource({
        b2bOrigin: 'affiliate'
      });
      expect(source).toBe('affiliate');
    });

    test('Provider Walk-in -> direct_walk_in', () => {
      const source = resolveAcquisitionSource({
        role: ROLES.CLINIC_OWNER,
        providerInput: 'walk_in'
      });
      expect(source).toBe('direct_walk_in');

      // Default for provider without input is walk_in
      const sourceDefault = resolveAcquisitionSource({
        role: ROLES.PHARMACY_STAFF
      });
      expect(sourceDefault).toBe('direct_walk_in');
    });

    test('Provider Phone -> direct_phone', () => {
      const source = resolveAcquisitionSource({
        role: ROLES.DIAGNOSTIC_CENTER_OWNER,
        providerInput: 'phone'
      });
      expect(source).toBe('direct_phone');
    });

    test('Unknown -> unknown', () => {
      const source = resolveAcquisitionSource({});
      expect(source).toBe('unknown');
    });

    test('Malicious client source is ignored', () => {
      // Trying to send affiliate as a patient
      const source = resolveAcquisitionSource({
        role: ROLES.PATIENT,
        clientApp: 'web',
        // In reality we don't even read 'source' from the context, 
        // the function signature explicitly doesn't consume it
        source: 'affiliate' 
      });
      expect(source).toBe('vaididea_web');
    });

  });

  describe('getLegacyDatabaseSource', () => {

    test('Pharmacy mappings', () => {
      expect(getLegacyDatabaseSource('vaididea_app', 'pharmacy')).toBe('online');
      expect(getLegacyDatabaseSource('vaididea_web', 'pharmacy')).toBe('online');
      expect(getLegacyDatabaseSource('clinic_referral', 'pharmacy')).toBe('online');
      expect(getLegacyDatabaseSource('direct_walk_in', 'pharmacy')).toBe('pos');
      expect(getLegacyDatabaseSource('direct_phone', 'pharmacy')).toBe('pos');
    });

    test('Diagnostic mappings', () => {
      expect(getLegacyDatabaseSource('vaididea_app', 'diagnostic')).toBe('online');
      expect(getLegacyDatabaseSource('vaididea_web', 'diagnostic')).toBe('online');
      expect(getLegacyDatabaseSource('affiliate', 'diagnostic')).toBe('online');
      
      expect(getLegacyDatabaseSource('direct_walk_in', 'diagnostic')).toBe('walk_in');
      expect(getLegacyDatabaseSource('direct_phone', 'diagnostic')).toBe('walk_in');

      expect(getLegacyDatabaseSource('clinic_referral', 'diagnostic')).toBe('clinic_referral');
      expect(getLegacyDatabaseSource('hospital_referral', 'diagnostic')).toBe('hospital_referral');
    });

    test('Appointments mappings', () => {
      expect(getLegacyDatabaseSource('vaididea_app', 'appointment')).toBeUndefined();
    });

  });

  describe('buildCanonicalContext', () => {
    test('Builds expected object', () => {
      const context = buildCanonicalContext({
        source: 'vaididea_app',
        mode: 'video',
        portal: 'clinic',
        transactionType: 'appointment'
      });
      expect(context).toEqual({
        source: 'vaididea_app',
        source_id: null,
        mode: 'video',
        portal: 'clinic',
        transactionType: 'appointment'
      });
    });
  });
});
