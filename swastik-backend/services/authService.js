/**
 * Auth Service
 * Handles registration, login, JWT, email verification, password management.
 * 
 * Architecture: Email + Password + JWT (free tier)
 * - bcrypt password hashing
 * - JWT access + refresh tokens with DB rotation
 * - Email verification via signed JWT links (Gmail SMTP / Nodemailer)
 * - Password reset via email links
 * - NO OTP, NO Twilio, NO Supabase Auth \u2014 Supabase used as PostgreSQL only
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { supabaseAdmin, rawSupabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { logAudit } = require('../utils/auditLogger');
const { enrichAuthUser } = require('../utils/authUserEnrichment');
const { getProviderApprovalRecordByUser } = require('../utils/providerApproval');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
} = require('./emailService');

// Helper: convert JWT duration string to seconds (e.g., '7d' -> 604800)
const parseExpiresIn = (duration) => {
  if (typeof duration === 'number') return duration;
  const match = String(duration).match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 604800; // default 7 days
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return 604800;
  }
};

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const firstProvided = (...values) => values.find((value) => {
  if (value === undefined || value === null) return false;
  return typeof value !== 'string' || value.trim() !== '';
});

const normalizeTextArray = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }
  const text = normalizeText(value);
  return text ? text.split(',').map(normalizeText).filter(Boolean) : [];
};

const parseNonNegativeNumber = (value) => {
  const parsed = parseOptionalNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};

const validateRoleRegistrationPayload = (role, data) => {
  if (role === 'wellness_coach') {
    const coachTypes = normalizeTextArray(firstProvided(data.coachTypes, data.coach_types, data.specialties, data.specialization));
    const qualifications = normalizeTextArray(firstProvided(data.qualifications, data.qualification, data.certifications));
    const experience = parseNonNegativeNumber(firstProvided(data.experienceYears, data.experience_years));
    const sessionFee = parseNonNegativeNumber(firstProvided(data.sessionFee, data.session_fee, data.consultationFee, data.consultation_fee, 0));

    if (coachTypes.length === 0) {
      throw new ApiError(400, 'At least one coach type or specialty is required for wellness coach registration.');
    }

    if (qualifications.length === 0) {
      throw new ApiError(400, 'Qualification or certification is required for wellness coach registration.');
    }

    if (experience === null) {
      throw new ApiError(400, 'Years of experience must be a valid non-negative number.');
    }

    if (sessionFee === null) {
      throw new ApiError(400, 'Session fee must be a valid non-negative number.');
    }

    return;
  }

  if (role === 'fitness_center_owner') {
    const facilityName = normalizeText(resolveFacilityName(data));
    const address = normalizeText(data.address);
    const city = normalizeText(data.city);

    if (!facilityName) {
      throw new ApiError(400, 'Gym or studio name is required for fitness center registration.');
    }

    if (!address || !city) {
      throw new ApiError(400, 'Address and city are required for fitness center registration.');
    }

    return;
  }

  if (role !== 'doctor') return;

  const specialization = normalizeText(data.specialization); // Still used as Primary
  const specializations = normalizeTextArray(firstProvided(data.specializations, data.specialties));
  const licenseNumber = normalizeText(firstProvided(data.licenseNumber, data.license_number));
  const registrationNumber = normalizeText(firstProvided(data.registrationNumber, data.registration_number));
  const qualifications = normalizeTextArray(firstProvided(data.qualifications, data.qualification, data.degree));
  const experience = parseNonNegativeNumber(firstProvided(data.experienceYears, data.experience_years));
  const consultationFee = parseNonNegativeNumber(firstProvided(data.consultationFee, data.consultation_fee));

  if (!specialization) {
    throw new ApiError(400, 'Primary specialization is required for doctor registration.');
  }

  if (specializations.length === 0) {
    throw new ApiError(400, 'At least one specialization is required for doctor registration.');
  }

  if (!licenseNumber) {
    throw new ApiError(400, 'Medical license number is required for doctor registration.');
  }

  if (!registrationNumber) {
    throw new ApiError(400, 'Medical registration number is required for doctor registration.');
  }

  if (qualifications.length === 0) {
    throw new ApiError(400, 'Medical qualification or degree is required for doctor registration.');
  }

  if (experience === null) {
    throw new ApiError(400, 'Years of experience must be a valid non-negative number.');
  }

  if (consultationFee === null) {
    throw new ApiError(400, 'Consultation fee must be a valid non-negative number.');
  }
};

const OTP_PURPOSE_EMAIL_VERIFICATION = 'login';
const OTP_PURPOSE_PASSWORD_RESET = 'password_reset';
const OTP_EXPIRY_MINUTES = 5; // H002: reduced from 10 min to shrink the brute-force window
const OTP_MAX_ATTEMPTS = 5;

const normalizeEmail = (value) => value?.toLowerCase().trim();

// H002: OTPs are stored as bcrypt hashes (salted, adaptive) instead of plain
// SHA256(secret+otp), which was crackable offline if the DB ever leaked.
const hashOtp = (otp) => bcrypt.hash(otp, 12);
const verifyOtpHash = (otp, storedHash) => bcrypt.compare(otp, storedHash);

const generateEmailOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const createOtpError = (code, message, statusCode = 400) => {
  const error = new ApiError(statusCode, message);
  error.code = code;
  return error;
};

const createEmailNotVerifiedError = () => {
  const error = new ApiError(403, 'Your account is not verified. Please complete email verification to continue.');
  error.code = 'EMAIL_NOT_VERIFIED';
  return error;
};

const authRoleMatches = (user, expectedRole) => {
  if (!expectedRole) return true;
  return user.role === expectedRole ||
    user.requested_role === expectedRole ||
    (expectedRole === 'doctor' && user.role === 'doctor_pending') ||
    (expectedRole === 'admin' && user.role === 'super_admin') ||
    (expectedRole === 'hospital_owner' && user.role === 'hospital_manager') ||
    (expectedRole === 'ambulance_operator' && user.role === 'ambulance_driver');
};

const issueEmailOtp = async ({ userId = null, email, purpose, sender, name }) => {
  const otp = generateEmailOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('otp_verifications')
    .delete()
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('is_verified', false);

  const { error } = await supabaseAdmin
    .from('otp_verifications')
    .insert({
      user_id: userId,
      email,
      otp: await hashOtp(otp),
      purpose,
      expires_at: expiresAt,
      is_verified: false,
      attempts: 0,
    });

  if (error) throw error;

  sender(email, name, otp).catch(err => {
    console.error('[OTP Sender Error]', err);
  });
  return { expiresAt };
};

const getActiveOtpRecord = async (email, purpose) => {
  const { data, error } = await supabaseAdmin
    .from('otp_verifications')
    .select('id, user_id, email, otp, purpose, attempts, expires_at, is_verified')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const consumeOtpRecord = async ({ email, purpose, otp }) => {
  const record = await getActiveOtpRecord(email, purpose);

  if (!record) {
    throw createOtpError('OTP_NOT_FOUND', 'No active verification code was found. Please request a new code.');
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('otp_verifications').delete().eq('id', record.id);
    throw createOtpError('OTP_EXPIRED', 'This code has expired. Please request a new one.');
  }

  if ((record.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    await supabaseAdmin.from('otp_verifications').delete().eq('id', record.id);
    throw createOtpError('OTP_LOCKED', 'Too many incorrect attempts. Please request a new code.');
  }

  const otpMatches = await verifyOtpHash(otp, record.otp);
  if (!otpMatches) {
    const nextAttempts = (record.attempts || 0) + 1;
    await supabaseAdmin
      .from('otp_verifications')
      .update({ attempts: nextAttempts })
      .eq('id', record.id);

    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      throw createOtpError('OTP_LOCKED', 'Too many incorrect attempts. Please request a new code.');
    }

    throw createOtpError('OTP_INVALID', 'The code you entered is incorrect.');
  }

  await supabaseAdmin
    .from('otp_verifications')
    .update({ is_verified: true, verified_at: new Date().toISOString() })
    .eq('id', record.id);

  return record;
};

// Universal OTP engine (Part 10) — reuses the existing otp_verifications
// table + hash/attempt/expiry logic for any business purpose. Additive:
// does not touch the existing auth OTP flows.
const issueUniversalOtp = async ({ userId = null, email, purpose, name, title, intro }) => {
  if (!email || !purpose) {
    throw createOtpError('OTP_INVALID_REQUEST', 'Email and purpose are required');
  }
  const emailService = require('./emailService');
  const sender = async (targetEmail, displayName, otp) => {
    await emailService.sendOtpEmail({
      email: targetEmail,
      name: displayName || 'there',
      otp,
      title: title || 'Verification Code',
      intro: intro || 'use the verification code below to continue.',
      subject: `Your ${title || 'Verification'} Code — VAIDIDEA Healthcare`,
      accentColor: '#059669',
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });
  };
  return issueEmailOtp({ userId, email, purpose, sender, name });
};

const verifyUniversalOtp = async ({ email, purpose, otp }) => {
  if (!email || !purpose || !otp) {
    throw createOtpError('OTP_INVALID_REQUEST', 'Email, purpose and OTP are required');
  }
  return consumeOtpRecord({ email, purpose, otp });
};

const resolveFacilityName = (data) =>
  data.facilityName ||
  data.facility_name ||
  data.organizationName ||
  data.organization_name ||
  data.businessName ||
  data.business_name ||
  data.companyName ||
  data.company_name ||
  data.name;

const toUserFacingRegistrationError = (error, fallbackMessage = 'Failed to complete registration. Please review your details and try again.') => {
  const source = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();

  if (source.includes('email')) {
    return new ApiError(409, 'An account with this email already exists.');
  }

  if (source.includes('phone')) {
    return new ApiError(409, 'An account with this phone number already exists.');
  }

  if (source.includes('license_number')) {
    return new ApiError(409, 'This license number is already registered.');
  }

  if (source.includes('registration_number')) {
    return new ApiError(409, 'This registration number is already registered.');
  }

  if (source.includes('users_name_key')) {
    return new ApiError(409, 'This account already exists.');
  }

  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(error?.statusCode || 400, error?.message || fallbackMessage);
};

// Generate JWT tokens
const generateTokens = (user) => {
  const expiresInStr = config.jwt.expiresIn || '7d';
  const now = Math.floor(Date.now() / 1000);
  const userId = String(user.id);

  // CVE-002: bind tokens to the issuing service via aud/iss/sub claims so a
  // token minted for one audience is not silently valid in another.
  const accessToken = jwt.sign(
    {
      userId: user.id,
      sub: userId,
      role: user.role,
      email: user.email,
      type: 'access', tokenVersion: Number(user.token_version || 0),
      aud: config.jwt.audience,
      iss: config.jwt.issuer,
      iat: now,
    },
    config.jwt.accessSecret,
    { expiresIn: expiresInStr }
  );
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      sub: userId,
      type: 'refresh',
      aud: config.jwt.audience,
      iss: config.jwt.issuer,
      iat: now,
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn || '30d' }
  );

  const tokens = { accessToken, refreshToken, expiresIn: parseExpiresIn(expiresInStr) };

  // CVE-002: when a dedicated AI-service secret is configured, mint a separate,
  // short-lived token for the FastAPI microservice. The AI service verifies it
  // with JWT_AI_SERVICE_SECRET — a compromise of the AI service can no longer
  // forge backend access tokens.
  if (config.jwt.aiServiceSecret) {
    tokens.aiServiceToken = jwt.sign(
      {
        userId: user.id,
        sub: userId,
        role: user.role,
        type: 'ai',
        aud: config.jwt.aiServiceAudience,
        iss: config.jwt.issuer,
        tokenVersion: Number(user.token_version || 0),
        iat: now,
      },
      config.jwt.aiServiceSecret,
      { expiresIn: process.env.JWT_AI_SERVICE_EXPIRES_IN || '15m' }
    );
  }

  return tokens;
};

const revokeAccessTokens = async (userId) => {
  const { data: user, error: readError } = await rawSupabaseAdmin
    .from('users')
    .select('token_version')
    .eq('id', userId)
    .single();
  if (readError || !user) throw readError || new ApiError(404, 'User not found');

  const nextVersion = Number(user.token_version || 0) + 1;
  const { error: updateError } = await rawSupabaseAdmin
    .from('users')
    .update({ token_version: nextVersion })
    .eq('id', userId);
  if (updateError) throw updateError;
  await cacheDel(`auth_user:${userId}`);
  return nextVersion;
};

// ==================== Register ====================
const register = async (userData) => {
  const { email: rawEmail, phone, password, name: rawName, role = 'patient', ...rest } = userData;
  const email = normalizeEmail(rawEmail);

  let name = rawName;
  if (role === 'doctor' && name) {
    name = name.replace(/^(Dr\.?\s*|Doctor\s+)/i, '').trim();
    name = `Dr. ${name}`;
  }

  if (role === 'admin' || role === 'super_admin') {
    throw new ApiError(403, 'Self-registration for admin roles is not permitted.');
  }

  const orFilters = [];
  if (email) orFilters.push(`email.eq.${email}`);
  if (phone) orFilters.push(`phone.eq.${phone}`);
  const { data: existing, error: existingLookupError } = orFilters.length > 0
    ? await supabaseAdmin
      .from('users')
      .select('id, role, email, phone, is_verified')
      .or(orFilters.join(','))
      .limit(1)
      .maybeSingle()
    : { data: null, error: null };

  if (existingLookupError) throw existingLookupError;

  if (existing) {
    if (!existing.is_verified) {
      // The user abandoned the previous registration before verifying their email
      // Delete the ghost account and allow the new registration to proceed
      await supabaseAdmin.from('users').delete().eq('id', existing.id);
    } else {
      const providerRecord = await getProviderApprovalRecordByUser(supabaseAdmin, existing.role, existing.id);
      const isSameRole = existing.role === role;
      const approvalStatus = providerRecord?.approval_status;
      const emailConflict = Boolean(email) && existing.email === email;

      let message = emailConflict
        ? 'An account with this email already exists. Please sign in to that account or use a different email.'
        : 'An account with this phone number already exists. Please sign in to that account or use a different phone number.';

      if (isSameRole && approvalStatus === 'rejected') {
        message = 'This account already exists and was rejected. Sign in with the same account, update your settings/documents, and save to resubmit for review.';
      } else if (isSameRole && ['pending', 'review', 'under_review'].includes(approvalStatus)) {
        message = 'This account already exists and is already under review. Sign in with the same account to check its approval status.';
      } else if (isSameRole && approvalStatus === 'approved') {
        message = 'This account already exists and has already been registered. Sign in with the same account instead of registering again.';
      }

      const error = new Error(message);
      error.statusCode = 409;
      throw error;
    }
  }

  if (!password || password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.statusCode = 400;
    throw error;
  }

  // Enforce password complexity: at least one uppercase, one lowercase, one number
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    const error = new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    error.statusCode = 400;
    throw error;
  }

  validateRoleRegistrationPayload(role, { name, email, phone, ...rest });

  const password_hash = await bcrypt.hash(password, 12);

  const isProvider = role !== 'patient' && role !== 'admin' && role !== 'super_admin';
  const finalRole = role === 'doctor' ? 'doctor_pending' : (isProvider ? 'patient' : role);
  const requestedRole = isProvider ? role : null;

  // Enforce Pre-Registration Email OTP Verification
  const { data: verifiedOtp, error: otpLookupError } = await supabaseAdmin
    .from('otp_verifications')
    .select('id, verified_at')
    .eq('email', email)
    .eq('purpose', 'registration')
    .eq('is_verified', true)
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpLookupError) throw otpLookupError;

  if (!verifiedOtp) {
    const error = new ApiError(403, 'Email not verified. Please complete email verification before registering.');
    error.code = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      phone: phone || null,
      password_hash,
      name,
      role: finalRole,
      requested_role: requestedRole,
      is_active: true,
      is_verified: true, // Mark as verified immediately
    })
    .select('*')
    .single();

  if (error) throw error;

  try {
    // If the role was forced to patient, we still want to create the provider profile
    // using the originally requested role.
    await createRoleProfile(user.id, role, { name, email, phone, ...rest });
    
    // Create patient profile as well if they were forced to patient
    if (isProvider) {
        try {
            await createRoleProfile(user.id, 'patient', { name, email, phone, ...rest });
        } catch (patientProfileError) {
            console.error('Failed to create patient profile for provider registration', patientProfileError);
        }
    }
  } catch (profileError) {
    console.error(`Registration profile creation failed for ${role}:`, profileError.message);
    await supabaseAdmin.from('users').delete().eq('id', user.id);
    throw toUserFacingRegistrationError(profileError);
  }

  // Cleanup the verified OTP record so it cannot be reused
  await supabaseAdmin.from('otp_verifications').delete().eq('id', verifiedOtp.id);

  // Link any pending platform invites to this newly registered user
  try {
    const platformInviteService = require('./platformInviteService');
    await platformInviteService.linkPlatformInvites(user.id, user.email);
  } catch (inviteError) {
    console.error('Failed to link platform invites during registration:', inviteError);
  }

  const { password_hash: _, ...safeUser } = user;

  return {
    user: safeUser,
    message: 'Registration successful.',
    requiresVerification: false,
    verificationEmailSent: false,
  };
};

const createRoleProfile = async (userId, role, data) => {
  const insertProfile = async (table, payload) => {
    const { error } = await supabaseAdmin.from(table).insert(payload);
    if (error) throw error;
  };

  switch (role) {
    case 'patient':
      await insertProfile('patients', {
        user_id: userId,
        name: data.name,
        blood_group: data.bloodGroup,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
      });
      break;
    case 'doctor': {
      const doctorQualifications = normalizeTextArray(firstProvided(data.qualifications, data.qualification, data.degree));
      const doctorLanguages = normalizeTextArray(data.languages);
      const doctorExperience = parseInt(firstProvided(data.experienceYears, data.experience_years, '0'), 10);
      const doctorConsultationFee = parseNonNegativeNumber(firstProvided(data.consultationFee, data.consultation_fee, 0));
      const doctorVideoFee = parseNonNegativeNumber(firstProvided(data.videoConsultationFee, data.video_consultation_fee));

      const doctorSpecializations = normalizeTextArray(firstProvided(data.specializations, data.specialties));

      await insertProfile('doctors', {
        user_id: userId,
        name: data.name,
        specialization: normalizeText(data.specialization),
        specializations: doctorSpecializations.length > 0 ? doctorSpecializations : [normalizeText(data.specialization)],
        license_number: normalizeText(firstProvided(data.licenseNumber, data.license_number)),
        registration_number: normalizeText(firstProvided(data.registrationNumber, data.registration_number)) || null,
        qualifications: doctorQualifications,
        experience_years: Number.isFinite(doctorExperience) ? doctorExperience : 0,
        consultation_fee: doctorConsultationFee ?? 0,
        video_consultation_fee: doctorVideoFee ?? 0,
        bio: normalizeText(data.bio) || null,
        languages: doctorLanguages,
        is_approved: false,
        approval_status: 'pending',
        clinic_name: data.clinicName || null,
        clinic_address: data.address || null,
        clinic_city: data.city || null,
        clinic_state: data.state || null,
        clinic_pincode: data.pincode || null,
        clinic_lat: parseOptionalNumber(data.latitude),
        clinic_lng: parseOptionalNumber(data.longitude),
      });
      break;
    }
    case 'hospital_owner':
      await insertProfile('hospitals', {
        owner_id: userId,
        name: resolveFacilityName(data) || 'Unnamed Hospital',
        address: data.address || '',
        city: data.city || '',
        license_number: data.licenseNumber || data.license_number || null,
        phone: data.phone || null,
        email: data.email || null,
        latitude: parseOptionalNumber(data.latitude),
        longitude: parseOptionalNumber(data.longitude),
        is_emergency_available: data.is_emergency_available || false,
        type: data.type || 'Private',
        is_approved: false,
        approval_status: 'pending',
      });
      break;
    case 'pharmacy_owner':
      await insertProfile('pharmacies', {
        owner_id: userId,
        name: resolveFacilityName(data) || 'Unnamed Pharmacy',
        address: data.address || '',
        city: data.city || '',
        license_number: data.licenseNumber || data.license_number || null,
        phone: data.phone || null,
        email: data.email || null,
        latitude: parseOptionalNumber(data.latitude),
        longitude: parseOptionalNumber(data.longitude),
        is_approved: false,
        approval_status: 'pending',
      });
      break;
    case 'clinic_owner':
      await insertProfile('clinics', {
        owner_id: userId,
        name: resolveFacilityName(data) || 'Unnamed Clinic',
        address: data.address || '',
        city: data.city || '',
        registration_number: data.registrationNumber || data.registration_number || null,
        license_number: data.licenseNumber || data.license_number || null,
        phone: data.phone || null,
        email: data.email || null,
        latitude: parseOptionalNumber(data.latitude),
        longitude: parseOptionalNumber(data.longitude),
        is_approved: false,
        approval_status: 'pending',
      });
      break;
    case 'diagnostic_center_owner':
      await insertProfile('diagnostic_centers', {
        owner_id: userId,
        name: resolveFacilityName(data) || 'Unnamed Diagnostic Center',
        address: data.address || '',
        city: data.city || '',
        registration_number: data.registrationNumber || data.registration_number || null,
        license_number: data.licenseNumber || data.license_number || null,
        phone: data.phone || null,
        email: data.email || null,
        latitude: parseOptionalNumber(data.latitude),
        longitude: parseOptionalNumber(data.longitude),
        is_approved: false,
        approval_status: 'pending',
      });
      break;
    case 'fitness_center_owner':
      await insertProfile('fitness_centers', {
        owner_user_id: userId,
        name: resolveFacilityName(data) || 'Unnamed Fitness Center',
        center_type: data.centerType || data.center_type || data.type || 'gym',
        description: normalizeText(data.description) || null,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        phone: data.phone || null,
        email: data.email || null,
        latitude: parseOptionalNumber(data.latitude),
        longitude: parseOptionalNumber(data.longitude),
        facilities: normalizeTextArray(data.facilities),
        equipment: normalizeTextArray(data.equipment),
        amenities: normalizeTextArray(data.amenities),
        is_women_only: Boolean(data.isWomenOnly || data.is_women_only),
        is_beginner_friendly: data.isBeginnerFriendly ?? data.is_beginner_friendly ?? true,
        is_24_hours: Boolean(data.is24Hours || data.is_24_hours),
        parking_available: Boolean(data.parkingAvailable || data.parking_available),
        trainer_available: true,
        is_active: false,
        is_verified: false,
        approval_status: 'pending',
      });
      break;
    case 'wellness_coach': {
      const coachTypes = normalizeTextArray(firstProvided(data.coachTypes, data.coach_types, data.specialties, data.specialization));
      const specialties = normalizeTextArray(firstProvided(data.specialties, data.specializations, data.specialization));
      const expertiseTags = normalizeTextArray(firstProvided(data.expertiseTags, data.expertise_tags, data.tags));
      const qualifications = normalizeTextArray(firstProvided(data.qualifications, data.qualification, data.degree));
      const certifications = normalizeTextArray(firstProvided(data.certifications, data.certification));
      const languages = normalizeTextArray(data.languages);
      const sessionModes = normalizeTextArray(firstProvided(data.sessionModes, data.session_modes, ['video', 'chat', 'in_person']));
      const experienceYears = parseInt(firstProvided(data.experienceYears, data.experience_years, 0), 10);
      const sessionFee = parseNonNegativeNumber(firstProvided(data.sessionFee, data.session_fee, data.consultationFee, data.consultation_fee, 0));
      const videoSessionFee = parseNonNegativeNumber(firstProvided(data.videoSessionFee, data.video_session_fee, data.videoConsultationFee, data.video_consultation_fee));
      const monthlyPlanFee = parseNonNegativeNumber(firstProvided(data.monthlyPlanFee, data.monthly_plan_fee));
      const subRole = normalizeText(firstProvided(data.subRole, data.sub_role));
      if (subRole && !['fitness_trainer', 'yoga_coach', 'nutritionist'].includes(subRole)) {
        throw new ApiError(400, 'Invalid wellness coach sub-role. Use fitness_trainer, yoga_coach, or nutritionist.');
      }

      await insertProfile('wellness_coaches', {
        user_id: userId,
        name: data.name,
        sub_role: subRole || null,
        headline: normalizeText(data.headline) || null,
        coach_types: coachTypes,
        specialties,
        expertise_tags: expertiseTags.length > 0 ? expertiseTags : specialties,
        qualifications,
        certifications,
        registration_number: normalizeText(firstProvided(data.registrationNumber, data.registration_number)) || null,
        license_number: normalizeText(firstProvided(data.licenseNumber, data.license_number)) || null,
        certification_document_url: firstProvided(data.certificationDocumentUrl, data.certification_document_url, data.licenseDocumentUrl, data.license_document_url) || null,
        experience_years: Number.isFinite(experienceYears) ? experienceYears : 0,
        session_modes: sessionModes.length > 0 ? sessionModes : ['video', 'chat', 'in_person'],
        languages,
        bio: normalizeText(data.bio) || null,
        session_fee: sessionFee ?? 0,
        video_session_fee: videoSessionFee ?? sessionFee ?? 0,
        monthly_plan_fee: monthlyPlanFee ?? 0,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        phone: data.phone || null,
        email: data.email || null,
        latitude: parseOptionalNumber(data.latitude),
        longitude: parseOptionalNumber(data.longitude),
        is_active: false,
        is_approved: false,
        approval_status: 'pending',
      });
      break;
    }
    case 'ambulance_operator': {
      const { data: operator, error: opError } = await supabaseAdmin.from('ambulance_operators').insert({
        user_id: userId,
        name: data.name || data.companyName || 'Unnamed Operator',
        company_name: data.companyName || data.name,
        registration_number: data.registrationNumber || data.registration_number || null,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        phone: data.phone,
        alternate_phone: data.alternatePhone || data.alternate_phone || null,
        email: data.email || null,
        license_document_url: data.licenseDocumentUrl || data.license_document_url || null,
        license_expiry: data.licenseExpiry || data.license_expiry || null,
        is_active: false,
        is_approved: false,
        approval_status: 'pending',
      }).select().single();

      if (opError) throw opError;

      // Auto-create the single ambulance vehicle for this operator
      const vehicleNumber = data.vehicleNumber || data.vehicle_number || data.registrationNumber || `UNKNOWN-${Date.now()}`;
      const vehicleType = data.vehicleType || data.vehicle_type || 'basic';
      
      const { error: ambError } = await supabaseAdmin.from('ambulances').insert({
        operator_id: operator.id,
        driver_user_id: userId, // The operator is the driver for this app instance
        vehicle_number: vehicleNumber,
        driver_name: data.name || operator.name,
        driver_phone: data.phone || operator.phone,
        vehicle_type: vehicleType,
        is_active: false,
        status: 'offline'
      });

      if (ambError) {
        console.error('Failed to auto-create ambulance vehicle:', ambError.message);
        throw ambError;
      }
      break;
    }
    default:
      break;
  }
};

// Validate role profile exists (strict real-data mode).
const assertRoleProfileExists = async (user) => {
  if (!user?.id || !user?.role) return;

  const missingProfileError = () => new ApiError(
    403,
    'Profile setup is incomplete for this account. Please complete onboarding or contact support.'
  );

  switch (user.role) {
    case 'patient': {
      const { data: existing } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      break;
    }

    case 'doctor': {
      const { data: existing } = await supabaseAdmin
        .from('doctors')
        .select('id, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'hospital_owner': {
      const { data: existing } = await supabaseAdmin
        .from('hospitals')
        .select('id, approval_status')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'hospital_manager': {
      const { data: existing } = await supabaseAdmin
        .from('hospital_managers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      break;
    }

    case 'clinic_owner': {
      const { data: existing } = await supabaseAdmin
        .from('clinics')
        .select('id, approval_status')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'pharmacy_owner': {
      const { data: existing } = await supabaseAdmin
        .from('pharmacies')
        .select('id, approval_status')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'diagnostic_center_owner': {
      const { data: existing } = await supabaseAdmin
        .from('diagnostic_centers')
        .select('id, approval_status')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'wellness_coach': {
      const { data: existing } = await supabaseAdmin
        .from('wellness_coaches')
        .select('id, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'fitness_center_owner': {
      const { data: existing } = await supabaseAdmin
        .from('fitness_centers')
        .select('id, approval_status')
        .eq('owner_user_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    case 'ambulance_operator': {
      const { data: existing } = await supabaseAdmin
        .from('ambulance_operators')
        .select('id, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) throw missingProfileError();
      if (existing.approval_status === 'rejected') throw new ApiError(403, 'Your account application was rejected. Please contact support.');
      if (existing.approval_status !== 'approved') throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      break;
    }

    default:
      break;
  }
};

// ==================== Verify Email ====================
const verifyEmail = async (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ is_verified: true })
      .eq('id', decoded.userId)
      .select('id, email, name, role, is_verified')
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from('otp_verifications')
      .delete()
      .eq('email', user.email)
      .eq('purpose', OTP_PURPOSE_EMAIL_VERIFICATION);

    return {
      message: 'Email verified successfully. You can now log in.',
      user,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Verification link has expired. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }
    const error = new Error('Invalid or expired verification link');
    error.statusCode = 400;
    throw error;
  }
};

const verifyEmailOtp = async (rawEmail, otp) => {
  const email = normalizeEmail(rawEmail);
  if (!email || !otp) {
    throw createOtpError('OTP_REQUIRED', 'Email and verification code are required.');
  }

  const record = await consumeOtpRecord({
    email,
    purpose: OTP_PURPOSE_EMAIL_VERIFICATION,
    otp,
  });

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update({ is_verified: true })
    .eq('id', record.user_id)
    .select('*')
    .single();

  if (error) throw error;

  // Determine if we should auto-login the user after email verification
  // We only auto-login patients because web roles and ambulance operators need admin approval before logging in
  const shouldAutoLogin = ['patient'].includes(user.role);

  if (shouldAutoLogin) {
    const tokens = generateTokens(user);

    try {
      await supabaseAdmin.from('refresh_tokens').insert({
        user_id: user.id,
        token: tokens.refreshToken,
        family_id: require('crypto').randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false,
      });
    } catch (err) {
      console.error('Error storing refresh token during email verification:', err);
    }

    // Sanitize user object before returning
    delete user.password_hash;

    return {
      message: 'Email verified successfully. You are now logged in.',
      user,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  // Sanitize user object before returning
  delete user.password_hash;

  return {
    message: 'Email verified successfully. You can now log in.',
    user,
  };
};

// ==================== Resend Verification ====================
const resendVerification = async (rawEmail) => {
  const email = normalizeEmail(rawEmail);
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, is_verified')
    .eq('email', email)
    .single();

  if (!user) {
    return { message: 'If an account exists with this email, a verification code has been sent.' };
  }

  if (user.is_verified) {
    return { message: 'This email is already verified. You can log in.' };
  }

  await issueEmailOtp({
    userId: user.id,
    email: user.email,
    purpose: OTP_PURPOSE_EMAIL_VERIFICATION,
    sender: sendVerificationOtpEmail,
    name: user.name,
  });

  return { message: 'If an account exists with this email, a verification code has been sent.' };
};

// ==================== Login ====================
const normalizeReqMeta = (reqMeta = {}) => {
  const deviceInfo = reqMeta?.deviceInfo || null;
  const ipAddress = reqMeta?.ipAddress || null;
  return {
    deviceInfo: deviceInfo ? String(deviceInfo).slice(0, 500) : null,
    ipAddress: ipAddress ? String(ipAddress).slice(0, 64) : null,
  };
};

const recordLoginHistory = async (entry) => {
  try {
    await supabaseAdmin.from('login_history').insert(entry);
  } catch (err) {
    console.warn('Failed to persist login history:', err.message);
  }
};

const login = async (rawEmail, password, expectedRole = null, reqMeta = {}) => {
  const email = normalizeEmail(rawEmail);
  const meta = normalizeReqMeta(reqMeta);

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase Login Error:', error);
      throw new ApiError(500, 'Database connection error. Check environment variables.');
    }

    if (!user) {
      throw new ApiError(401, 'Account is not registered');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.is_active) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
    }

    if (!user.is_verified) {
      throw createEmailNotVerifiedError();
    }

    // Optional role enforcement (portal-specific login)
    // Keep backward compatibility: admin portal accepts both admin and super_admin.
    if (expectedRole) {
      const roleMatches = authRoleMatches(user, expectedRole);
      if (user.requested_role === expectedRole && user.role !== expectedRole) {
        const providerRecord = await getProviderApprovalRecordByUser(supabaseAdmin, expectedRole, user.id);
        if (providerRecord?.approval_status === 'rejected') {
          throw new ApiError(403, 'Your account application was rejected. Please contact support.');
        }
        throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
      }
      if (!roleMatches) {
        if (user.requested_role === expectedRole) {
          const providerRecord = await getProviderApprovalRecordByUser(supabaseAdmin, expectedRole, user.id);
          if (providerRecord) {
            if (providerRecord.approval_status === 'rejected') {
              throw new ApiError(403, 'Your account application was rejected. Please contact support.');
            } else if (['pending', 'review', 'under_review'].includes(providerRecord.approval_status)) {
              throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
            }
          }
          throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
        }
        throw new ApiError(403, 'Invalid credentials for this portal role');
      }

      if (expectedRole === 'doctor' && user.role === 'doctor_pending') {
        const providerRecord = await getProviderApprovalRecordByUser(supabaseAdmin, 'doctor', user.id);
        if (providerRecord && providerRecord.approval_status === 'rejected') {
          throw new ApiError(403, 'Your account application was rejected. Please contact support.');
        } else {
          throw new ApiError(403, 'Your account is currently under review by an administrator. You will be able to log in once your account is approved.');
        }
      }
    }

    // Strict validation: login requires an actual profile row for the role.
    await assertRoleProfileExists(user);

    const tokens = generateTokens(user);

    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let sessionId = null;
    try {
      const { data: session } = await supabaseAdmin
        .from('active_sessions')
        .insert({
          user_id: user.id,
          device_info: meta.deviceInfo,
          ip_address: meta.ipAddress,
          expires_at: sessionExpiresAt,
        })
        .select('id')
        .single();
      sessionId = session?.id || null;
    } catch (err) {
      console.warn('Failed to persist active session:', err.message);
    }

    try {
      const tokenRow = {
        user_id: user.id,
        token: tokens.refreshToken,
        family_id: require('crypto').randomUUID(),
        expires_at: sessionExpiresAt,
        is_revoked: false,
      };
      if (sessionId) tokenRow.session_id = sessionId;
      await supabaseAdmin.from('refresh_tokens').insert(tokenRow);
    } catch (err) {
      console.warn('Failed to persist refresh token:', err.message);
    }

    await recordLoginHistory({
      user_id: user.id,
      email,
      ip_address: meta.ipAddress,
      device_info: meta.deviceInfo,
      status: 'success',
    });

    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    logAudit({ userId: user.id, userRole: user.role, action: 'user.login', entityType: 'user', entityId: user.id });

    const { password_hash: _, ...safeUser } = user;
    const enrichedUser = await enrichAuthUser(safeUser, supabaseAdmin);

    return {
      user: enrichedUser,
      ...tokens,
    };
  } catch (err) {
    if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 403)) {
      await recordLoginHistory({
        email,
        ip_address: meta.ipAddress,
        device_info: meta.deviceInfo,
        status: 'failed',
        reason: typeof err.message === 'string' ? err.message.slice(0, 200) : null,
      });
    }
    throw err;
  }
};

// ==================== Refresh Token ====================
const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const { data: storedToken } = await supabaseAdmin
      .from('refresh_tokens')
      .select('id, is_revoked, family_id')
      .eq('token', token)
      .eq('user_id', decoded.userId)
      .single();

    // Fix #12: Guard against null storedToken (token not found in DB)
    if (!storedToken) {
      throw new ApiError(401, 'Refresh token not found or already used');
    }

    if (storedToken.is_revoked) {
      // B-07: Token Reuse Detected!
      // If a revoked token is used, it means either a compromised token is being used 
      // or a legitimate user has a stale token due to network issues. 
      // Security requires we invalidate the ENTIRE token family.
      if (storedToken.family_id) {
        await supabaseAdmin
          .from('refresh_tokens')
          .update({ is_revoked: true, revoked_at: new Date().toISOString() })
          .eq('family_id', storedToken.family_id);
      }
      throw new ApiError(401, 'Security Alert: Refresh token reuse detected. You have been logged out of all devices for your protection.');
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (!user || !user.is_active) {
      throw new ApiError(401, 'User not found or inactive');
    }

    if (!user.is_verified) {
      const err = new ApiError(403, 'Email not verified');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    const tokens = generateTokens(user);

    if (storedToken) {
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ 
          is_revoked: true, 
          revoked_at: new Date().toISOString(),
          replaced_by_token: tokens.refreshToken
        })
        .eq('id', storedToken.id);
    }

    const familyId = storedToken.family_id || require('crypto').randomUUID();

    try {
      await supabaseAdmin.from('refresh_tokens').insert({
        user_id: user.id,
        token: tokens.refreshToken,
        family_id: familyId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false,
      });
    } catch (_) { /* non-fatal */ }

    const { password_hash: _, ...safeUser } = user;
    const enrichedUser = await enrichAuthUser(safeUser, supabaseAdmin);
    return { user: enrichedUser, ...tokens };
  } catch (err) {
    if (err.statusCode) throw err;
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }
};

// ==================== Logout ====================
const logout = async (userId, refreshTokenValue) => {
  if (refreshTokenValue) {
    const { data: tokenRows } = await supabaseAdmin
      .from('refresh_tokens')
      .select('session_id')
      .eq('user_id', userId)
      .eq('token', refreshTokenValue);
    const sessionId = tokenRows?.[0]?.session_id;
    if (sessionId) {
      await supabaseAdmin
        .from('active_sessions')
        .update({ is_revoked: true })
        .eq('id', sessionId);
    }
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('token', refreshTokenValue);
  } else {
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_revoked', false);
  }
  await cacheDel(`auth_user:${userId}`);
  await revokeAccessTokens(userId);
  logAudit({ userId, userRole: 'unknown', action: 'user.logout', entityType: 'user', entityId: userId });
  return { message: 'Logged out successfully' };
};

// ==================== Change Password ====================
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new ApiError(400, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', userId);

  // Revoke all refresh tokens to force re-login on other devices
  await supabaseAdmin
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_revoked', false);

  try {
    await supabaseAdmin
      .from('active_sessions')
      .update({ is_revoked: true })
      .eq('user_id', userId)
      .eq('is_revoked', false);
  } catch (err) {
    console.warn('Failed to revoke active sessions after password change:', err.message);
  }

  await revokeAccessTokens(userId);

  return { message: 'Password changed successfully' };
};

// ==================== Forgot Password ====================
const forgotPassword = async (rawEmail, expectedRole = null) => {
  const email = normalizeEmail(rawEmail);
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, requested_role, is_active')
    .eq('email', email)
    .single();

  if (!user || !user.is_active) {
    return { message: 'If an account exists with this email, a 6-digit reset code has been sent.' };
  }

  if (expectedRole) {
    if (!authRoleMatches(user, expectedRole)) {
      return { message: 'If an account exists with this email, a 6-digit reset code has been sent.' };
    }
  }

  await issueEmailOtp({
    userId: user.id,
    email: user.email,
    purpose: OTP_PURPOSE_PASSWORD_RESET,
    sender: sendPasswordResetOtpEmail,
    name: user.name,
  });

  return { message: 'If an account exists with this email, a 6-digit reset code has been sent.' };
};

// ==================== Reset Password ====================
const resetPassword = async ({ token = null, email: rawEmail = null, otp = null, password: newPassword, role: expectedRole = null }) => {
  // Enforce password complexity (matching register/changePassword)
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new ApiError(400, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token');
      }

      const storedUserId = await cacheGet(`reset:${token}`);
      if (!storedUserId) {
        throw new ApiError(400, 'Reset link has already been used or expired');
      }

      if (expectedRole) {
        const { data: user } = await supabaseAdmin.from('users').select('role, requested_role').eq('id', storedUserId).single();
        if (user) {
          if (!authRoleMatches(user, expectedRole)) {
            throw new ApiError(403, 'Invalid token for this portal role');
          }
        }
      }

      const password_hash = await bcrypt.hash(newPassword, 12);

      const { error: dbError } = await supabaseAdmin
        .from('users')
        .update({ password_hash })
        .eq('id', decoded.userId);

      if (dbError) {
        console.error('Password reset DB update failed:', dbError.message);
        throw new ApiError(500, 'Failed to update password. Please try again.');
      }

      await cacheDel(`reset:${token}`);

      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true, revoked_at: new Date().toISOString() })
        .eq('user_id', decoded.userId)
        .eq('is_revoked', false);

      await revokeAccessTokens(decoded.userId);

      return { message: 'Password reset successfully' };
    } catch (err) {
      if (err.statusCode) throw err;
      const error = new Error('Invalid or expired reset token');
      error.statusCode = 400;
      throw error;
    }
  }

  const email = normalizeEmail(rawEmail);
  if (!email || !otp) {
    throw createOtpError('OTP_REQUIRED', 'Email and reset code are required.');
  }

  const record = await consumeOtpRecord({
    email,
    purpose: OTP_PURPOSE_PASSWORD_RESET,
    otp,
  });

  if (expectedRole) {
    const { data: user } = await supabaseAdmin.from('users').select('role, requested_role').eq('id', record.user_id).single();
    if (user) {
      if (!authRoleMatches(user, expectedRole)) {
        throw new ApiError(403, 'Invalid reset code for this portal role');
      }
    }
  }

  const password_hash = await bcrypt.hash(newPassword, 12);

  const { error: dbError } = await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', record.user_id);

  if (dbError) {
    console.error('Password reset DB update failed:', dbError.message);
    throw new ApiError(500, 'Failed to update password. Please try again.');
  }

  await supabaseAdmin
    .from('otp_verifications')
    .delete()
    .eq('email', email)
    .eq('purpose', OTP_PURPOSE_PASSWORD_RESET);

  await supabaseAdmin
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', record.user_id)
    .eq('is_revoked', false);

  await revokeAccessTokens(record.user_id);

  return { message: 'Password reset successfully' };
};

// Update current user profile (name, phone)
const updateProfile = async (userId, role, updates) => {
  const {
    name,
    phone,
    companyName,
    company_name,
    registrationNumber,
    registration_number,
    address,
    city,
    state,
    alternatePhone,
    alternate_phone,
    licenseDocumentUrl,
    license_document_url,
    licenseExpiry,
    license_expiry,
  } = updates;

  const hasAmbulanceOperatorFields = role === 'ambulance_operator' && [
    companyName,
    company_name,
    registrationNumber,
    registration_number,
    address,
    city,
    state,
    alternatePhone,
    alternate_phone,
    licenseDocumentUrl,
    license_document_url,
    licenseExpiry,
    license_expiry,
  ].some((value) => value !== undefined);

  if (!name && !phone && !hasAmbulanceOperatorFields) {
    throw new ApiError(400, 'No valid fields to update');
  }

  // Update phone on users table with format validation
  if (phone) {
    // Fix #44: Validate phone format (E.164 or common Indian formats)
    const phoneStr = String(phone).trim();
    if (!/^\+?[1-9]\d{6,14}$/.test(phoneStr)) {
      throw new ApiError(400, 'Invalid phone number format. Use E.164 format (e.g., +919876543210)');
    }
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('phone')
      .eq('id', userId)
      .single();

    const { error } = await supabaseAdmin.from('users').update({ phone: phoneStr }).eq('id', userId);
    if (error) throw error;

    // CVE-005: phone is a security-sensitive identifier (used for OTP flows).
    // Rotate token_version + revoke refresh tokens so existing sessions are
    // invalidated the moment the account's phone changes.
    if (existingUser && existingUser.phone !== phoneStr) {
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true, revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_revoked', false);
      await revokeAccessTokens(userId);
    }
  }

  // Update name in role-specific table (and always on users table for consistency)
  if (name) {
    // Always update users.name as the canonical display name
    await supabaseAdmin.from('users').update({ name }).eq('id', userId);

    // Also update role-specific profile table if applicable
    // Map role → { table, ownerColumn } for profile sync
    // Owner roles use 'owner_id', staff roles use 'user_id'
    const roleTableMap = {
      patient: { table: 'patients', col: 'user_id' },
      doctor: { table: 'doctors', col: 'user_id' },
      hospital_owner: { table: 'hospitals', col: 'owner_id' },
      clinic_owner: { table: 'clinics', col: 'owner_id' },
      pharmacy_owner: { table: 'pharmacies', col: 'owner_id' },
      diagnostic_center_owner: { table: 'diagnostic_centers', col: 'owner_id' },
      wellness_coach: { table: 'wellness_coaches', col: 'user_id' },
      fitness_center_owner: { table: 'fitness_centers', col: 'owner_user_id' },
      ambulance_operator: { table: 'ambulance_operators', col: 'user_id' },
      admin: { table: 'admins', col: 'user_id' },
      super_admin: { table: 'admins', col: 'user_id' },
    };
    const mapping = roleTableMap[role];
    if (mapping) {
      await supabaseAdmin.from(mapping.table).update({ name }).eq(mapping.col, userId);
    }
  }

  if (role === 'ambulance_operator') {
    const operatorUpdates = {};

    if (companyName !== undefined || company_name !== undefined) {
      operatorUpdates.company_name = companyName ?? company_name ?? null;
    }
    if (registrationNumber !== undefined || registration_number !== undefined) {
      operatorUpdates.registration_number = registrationNumber ?? registration_number ?? null;
    }
    if (address !== undefined) operatorUpdates.address = address || null;
    if (city !== undefined) operatorUpdates.city = city || null;
    if (state !== undefined) operatorUpdates.state = state || null;

    const alternatePhoneValue = alternatePhone ?? alternate_phone;
    if (alternatePhoneValue !== undefined) {
      const alternatePhoneStr = String(alternatePhoneValue).trim();
      if (alternatePhoneStr && !/^\+?[1-9]\d{6,14}$/.test(alternatePhoneStr)) {
        throw new ApiError(400, 'Invalid alternate phone number format. Use E.164 format (e.g., +919876543210)');
      }
      operatorUpdates.alternate_phone = alternatePhoneStr || null;
    }

    if (licenseDocumentUrl !== undefined || license_document_url !== undefined) {
      operatorUpdates.license_document_url = licenseDocumentUrl ?? license_document_url ?? null;
    }

    const licenseExpiryValue = licenseExpiry ?? license_expiry;
    if (licenseExpiryValue !== undefined) {
      operatorUpdates.license_expiry = licenseExpiryValue || null;
    }

    if (Object.keys(operatorUpdates).length > 0) {
      await supabaseAdmin
        .from('ambulance_operators')
        .update(operatorUpdates)
        .eq('user_id', userId);
    }
  }

  await cacheDel(`auth_user:${userId}`);

  return { message: 'Profile updated' };
};

// ==================== Active Sessions & Login History ====================

const getActiveSessions = async (userId) => {
  const { data } = await supabaseAdmin
    .from('active_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .gte('expires_at', new Date().toISOString())
    .order('last_active', { ascending: false });

  return (data || []).map((session, index) => ({
    id: session.id,
    device_info: session.device_info,
    ip_address: session.ip_address,
    last_active: session.last_active,
    created_at: session.created_at,
    expires_at: session.expires_at,
    is_current: index === 0,
  }));
};

const logoutDevice = async (userId, sessionId) => {
  const { data: existing } = await supabaseAdmin
    .from('active_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (!existing || existing.length === 0) {
    throw new ApiError(404, 'Session not found');
  }

  await supabaseAdmin
    .from('active_sessions')
    .update({ is_revoked: true })
    .eq('id', sessionId)
    .eq('user_id', userId);

  try {
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('is_revoked', false);
  } catch (err) {
    console.warn('Failed to revoke tokens for session:', err.message);
  }

  logAudit({ userId, userRole: 'unknown', action: 'user.session_revoked', entityType: 'user', entityId: userId });
  return { message: 'Session signed out' };
};

const logoutAllDevices = async (userId, exceptSessionId = null) => {
  let sessionQuery = supabaseAdmin
    .from('active_sessions')
    .update({ is_revoked: true })
    .eq('user_id', userId)
    .eq('is_revoked', false);
  if (exceptSessionId) sessionQuery = sessionQuery.neq('id', exceptSessionId);
  await sessionQuery;

  let tokenQuery = supabaseAdmin
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_revoked', false);
  if (exceptSessionId) tokenQuery = tokenQuery.neq('session_id', exceptSessionId);
  await tokenQuery;

  await cacheDel(`auth_user:${userId}`);
  logAudit({ userId, userRole: 'unknown', action: 'user.sessions_revoked', entityType: 'user', entityId: userId });
  return { message: 'Signed out from all other devices' };
};

const getLoginHistory = async (userId) => {
  const { data } = await supabaseAdmin
    .from('login_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data || []).map((entry) => ({
    id: entry.id,
    email: entry.email,
    ip_address: entry.ip_address,
    device_info: entry.device_info,
    status: entry.status,
    reason: entry.reason,
    created_at: entry.created_at,
  }));
};

module.exports = {
  register,
  login,
  verifyEmail,
  verifyEmailOtp,
  resendVerification,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  issueUniversalOtp,
  verifyUniversalOtp,
  getActiveSessions,
  logoutDevice,
  logoutAllDevices,
  getLoginHistory,
};
