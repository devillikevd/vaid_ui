/**
 * Health Card Service — QR-Based Portable Medical Records
 *
 * Allows patients to generate a secure, time-limited token that encodes
 * a URL. When a doctor (registered or external) scans the QR / opens the URL,
 * they see the patient's portable clinical summary without needing to log in.
 *
 * Security model:
 *   - Token stored in Redis with 24h TTL
 *   - Patient can revoke at any time
 *   - Each generation invalidates previous tokens
 *   - Public endpoint requires only the token (no auth)
 */
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { ApiError } = require('../middleware/errorHandler');
const { signStorageUrlsInPayload } = require('../config/minio');
const config = require('../config');
const consentService = require('./consentService');

const HEALTH_CARD_PREFIX = 'health_card:';
const HEALTH_CARD_REVERSE = 'health_card_user:'; // maps userId → token for revocation
const TOKEN_EXPIRY_SECONDS = 86400; // 24 hours

class HealthCardService {
  /**
   * Generate (or regenerate) a health card token for a patient.
   * Invalidates any existing token for this user.
   */
  async generateToken(userId, guardianAnalytics = null) {
    // Verify user is a patient
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id, name, user_id')
      .eq('user_id', userId)
      .single();

    if (patientError) {
      if (patientError.code === '503') throw new ApiError(503, 'Database is temporarily unavailable (might be paused).');
      throw new ApiError(500, 'Database error: ' + patientError.message);
    }

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    // Revoke any existing token
    const existingToken = await cacheGet(`${HEALTH_CARD_REVERSE}${userId}`);
    if (existingToken) {
      await cacheDel(`${HEALTH_CARD_PREFIX}${existingToken}`);
    }

    // Generate a secure 16-character alphanumeric token (VULN-BS-12: increased from 6)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    const randomBytesArray = crypto.randomBytes(16);
    for (let i = 0; i < 16; i++) {
      token += chars[randomBytesArray[i] % chars.length];
    }

    // Store: token → userId mapping (for public lookup)
    await cacheSet(`${HEALTH_CARD_PREFIX}${token}`, {
      userId,
      patientId: patient.id,
      patientName: patient.name,
      generatedAt: new Date().toISOString(),
      guardianAnalytics, // Store if provided
    }, TOKEN_EXPIRY_SECONDS);

    // V-011 Fix: explicitly create a consent record for the health card
    await consentService.grantConsent({
      patientId: patient.id,
      entityType: 'other', // Must be one of: hospital, pharmacy, diagnostic_center, doctor, research, family, other
      entityId: '00000000-0000-0000-0000-000000000000', // Must be a valid UUID
      entityName: 'Public Health Card QR',
      purpose: 'Emergency medical access',
      durationDays: 1 // health card expires in 24 hours
    });

    // Store: userId → token mapping (for revocation)
    await cacheSet(`${HEALTH_CARD_REVERSE}${userId}`, token, TOKEN_EXPIRY_SECONDS);

    return {
      token,
      url: `${config.frontendWebUrl}/health-card/${token}`,
      expires_at: new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000).toISOString(),
      expires_in_hours: 24,
    };
  }

  /**
   * Revoke the current health card token.
   */
  async revokeToken(userId) {
    const existingToken = await cacheGet(`${HEALTH_CARD_REVERSE}${userId}`);
    if (existingToken) {
      await cacheDel(`${HEALTH_CARD_PREFIX}${existingToken}`);
      await cacheDel(`${HEALTH_CARD_REVERSE}${userId}`);
    }

    // V-011 Fix: revoke the active consent for health_card_public
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (patient) {
      await supabaseAdmin
        .from('patient_consents')
        .update({ status: 'revoked', revoked_at: new Date().toISOString(), revocation_reason: 'User revoked health card' })
        .eq('patient_id', patient.id)
        .eq('entity_type', 'health_card_public')
        .eq('entity_id', 'public')
        .eq('status', 'active');
    }

    return { revoked: true };
  }

  /**
   * Get the current active token status for a patient (used by the app).
   */
  async getTokenStatus(userId) {
    const token = await cacheGet(`${HEALTH_CARD_REVERSE}${userId}`);
    if (!token) {
      return { has_active_card: false, url: null, generated_at: null, expires_at: null };
    }

    // Verify the token data still exists (hasn't expired from Redis)
    const data = await cacheGet(`${HEALTH_CARD_PREFIX}${token}`);
    if (!data) {
      // Token expired, clean up reverse mapping
      await cacheDel(`${HEALTH_CARD_REVERSE}${userId}`);
      return { has_active_card: false, url: null, generated_at: null, expires_at: null };
    }

    return {
      has_active_card: true,
      url: `${config.frontendWebUrl}/health-card/${token}`,
      generated_at: data.generatedAt,
      expires_at: data.generatedAt
        ? new Date(new Date(data.generatedAt).getTime() + TOKEN_EXPIRY_SECONDS * 1000).toISOString()
        : null,
    };
  }

  /**
   * PUBLIC: Fetch portable clinical summary by token.
   * No authentication required — the token IS the authorization.
   * @param {string} token
   * @param {object} accessInfo - IP address, user-agent for audit logging
   */
  async getHealthRecord(token, accessInfo = {}) {
    const tokenData = await cacheGet(`${HEALTH_CARD_PREFIX}${token}`);

    if (!tokenData) {
      throw new ApiError(404, 'Health card not found or expired. Please ask the patient to generate a new QR code.');
    }

    const { patientId, userId, guardianAnalytics } = tokenData;

    // V-011 Fix: Explicitly check that patient consent is still active
    const hasConsent = await consentService.verifyConsent(patientId, 'health_card_public', 'public');
    if (!hasConsent) {
      throw new ApiError(403, 'Access denied: The patient has revoked consent for this health card.');
    }

    // Audit log: record who accessed this health card
    try {
      const { logAudit } = require('../utils/auditLogger');
      logAudit({
        userId: 'anonymous',
        userRole: 'public',
        action: 'health_card.accessed',
        entityType: 'health_card',
        entityId: patientId,
        details: {
          ip: accessInfo.ip || 'unknown',
          userAgent: accessInfo.userAgent || 'unknown',
          accessedAt: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      // Non-blocking — don’t fail the request if audit logging fails
      console.warn('Health card audit log failed:', auditErr.message);
    }

    // Fetch all data in parallel for speed
    const [
      patientResult,
      prescriptionsResult,
      reportsResult,
      vitalsResult,
      consultationsResult,
    ] = await Promise.all([
      // 1. Patient profile. ABHA is intentionally omitted from the public QR response.
      supabaseAdmin
        .from('patients')
        .select(`
          id, name, date_of_birth, gender, blood_group,
          weight, height,
          medical_conditions, allergies, chronic_conditions,
          current_medications, medical_history,
          insurance_provider, insurance_id
        `)
        .eq('id', patientId)
        .single(),

      // 2. Prescriptions (last 20)
      supabaseAdmin
        .from('prescriptions')
        .select(`
          id, notes, is_active, created_at, file_url,
          doctor:doctors(id, name, specialization),
          consultation:consultations(id, chief_complaint, notes),
          prescription_medicines(id, medicine_name, dosage, frequency, duration, instructions, quantity)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20),

      // 3. Reports (last 20)
      supabaseAdmin
        .from('reports')
        .select(`
          id, name, type, lab_name, test_date, result_date,
          status, doctor_notes, file_url, file_size, parameters
        `)
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false })
        .limit(20),

      // 4. Vitals (last 30 entries)
      supabaseAdmin
        .from('patient_vitals')
        .select(`
          id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
          temperature, oxygen_level, respiratory_rate, weight, height,
          blood_sugar, notes, recorded_at
        `)
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(30),

      // 5. Consultations (last 15)
      supabaseAdmin
        .from('consultations')
        .select(`
          id, chief_complaint, notes, diagnosis, advice,
          diagnosis_codes, follow_up_required, follow_up_date,
          status, started_at, ended_at,
          doctor:doctors(id, name, specialization)
        `)
        .eq('patient_id', patientId)
        .in('status', ['completed', 'in_progress'])
        .order('started_at', { ascending: false })
        .limit(15),

    ]);

    const patient = patientResult.data;
    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    // Compute age from date_of_birth
    const dob = patient.date_of_birth ? new Date(patient.date_of_birth) : null;
    const computedAge = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    const result = {
      patient: {
        name: patient.name,
        age: computedAge,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        bloodGroup: patient.blood_group,
        weight: patient.weight,
        height: patient.height,
        // Critical medical info
        allergies: patient.allergies || [],
        medicalConditions: patient.medical_conditions || [],
        chronicConditions: patient.chronic_conditions || [],
        currentMedications: patient.current_medications || [],
        medicalHistory: patient.medical_history || [],
        // Fix #36: Redact insurance details — PHI not needed for clinical viewing
        insuranceProvider: patient.insurance_provider ? 'On file' : null,
      },
      prescriptions: (prescriptionsResult.data || []).map(rx => ({
        id: rx.id,
        notes: rx.notes,
        isActive: rx.is_active,
        createdAt: rx.created_at,
        fileUrl: rx.file_url,
        medications: rx.prescription_medicines || [],
        doctor: rx.doctor ? { name: rx.doctor.name, specialization: rx.doctor.specialization } : null,
        chiefComplaint: rx.consultation?.chief_complaint,
        consultationNotes: rx.consultation?.notes,
      })),
      reports: (reportsResult.data || []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        labName: r.lab_name,
        testDate: r.test_date,
        resultDate: r.result_date,
        status: r.status,
        doctorNotes: r.doctor_notes,
        fileUrl: r.file_url, // Added to allow doctors to view actual reports securely via QR
        parameters: r.parameters,
      })),
      vitals: (vitalsResult.data || []).map(v => ({
        heartRate: v.heart_rate,
        bpSystolic: v.blood_pressure_systolic,
        bpDiastolic: v.blood_pressure_diastolic,
        temperature: v.temperature,
        oxygenLevel: v.oxygen_level,
        respiratoryRate: v.respiratory_rate,
        weight: v.weight,
        height: v.height,
        bloodSugar: v.blood_sugar,
        notes: v.notes,
        recordedAt: v.recorded_at,
      })),
      consultations: (consultationsResult.data || []).map(c => ({
        id: c.id,
        chiefComplaint: c.chief_complaint,
        notes: c.notes,
        diagnosis: c.diagnosis,
        advice: c.advice,
        diagnosisCodes: c.diagnosis_codes,
        followUpRequired: c.follow_up_required,
        followUpDate: c.follow_up_date,
        status: c.status,
        date: c.started_at,
        doctor: c.doctor ? { name: c.doctor.name, specialization: c.doctor.specialization } : null,
      })),
      sharingDisclosure: {
        scope: 'Patient-generated, time-limited clinical summary. Anyone with the active QR/link can view it until expiry or revocation.',
        expiry: '24 hours by default, unless the patient revokes earlier.',
        includedSources: [
          {
            label: 'Patient profile',
            source: 'Swastik/Vaididea patient profile',
            reliability: 'Depends on patient and clinic-entered profile accuracy.',
            included: true,
          },
          {
            label: 'Prescriptions and consultations',
            source: 'Doctor-created records in Swastik/Vaididea',
            reliability: 'High when entered by a verified provider; still requires clinical review.',
            included: true,
          },
          {
            label: 'Medical reports',
            source: 'Uploaded or diagnostic-center records',
            reliability: 'Report metadata and parameters are shared; raw file URLs are not exposed on the public QR.',
            included: true,
          },
          {
            label: 'Vitals history',
            source: 'Manual vitals and Health Connect synced vitals where the patient granted permission',
            reliability: 'Useful trend signal; wearable or phone data may vary by device and should not replace clinical measurement.',
            included: true,
          },
          {
            label: 'Guardian safety analytics',
            source: 'Phone sensors, GPS, Activity Recognition, and Health Connect when enabled',
            reliability: 'Patient-generated analytics. Supports clinical context but is not a medical diagnosis.',
            included: !!guardianAnalytics,
          },
        ],
        notIncluded: [
          'ABHA number',
          'Insurance identifier',
          'Unauthenticated report file URLs',
          ...(guardianAnalytics ? [] : ['Guardian analytics (patient has not shared it)']),
        ],
        privacyControls: [
          'Patient can revoke this QR at any time',
          'Generating a new QR invalidates the previous token',
          'Public access is rate-limited and audit-logged',
          'Responses are marked no-store/no-cache',
        ],
      },
      guardianAnalytics: guardianAnalytics || null,
      generatedAt: tokenData.generatedAt,
    };

    // VULN-BS-13: Sign all file URLs so raw S3/MinIO paths are never exposed
    return signStorageUrlsInPayload(result);
  }
}

module.exports = new HealthCardService();
