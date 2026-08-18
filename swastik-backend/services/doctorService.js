const { supabaseAdmin } = require('../config/supabase');
const { uploadProfileImage, deleteFile, signStorageUrlsInPayload } = require('../config/minio');
const { ApiError } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { sanitizeSearch } = require('../utils/sanitize');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');
const { calculateAge } = require('../utils/patientProfile');
const eventEmitter = require('./eventEmitter');
const notificationService = require('./notificationService');

// Cap on how many already-past slots to surface on a given day's booking view.
// Without this, a full day of elapsed slots floods the UI as "booked".
const MAX_PAST_SLOTS_SHOWN = 8;

/**
 * Haversine distance between two lat/lng points in kilometers.
 * Used for nearby doctor search.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // rounded to 1 decimal
}

const getActivePatientRecordGrant = async (patientId, doctorId) => {
  const nowIso = new Date().toISOString();
  const { data: grant } = await supabaseAdmin
    .from('patient_record_access')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .maybeSingle();

  if (!grant) return null;
  if (grant.status !== 'active') return null;

  if (grant.expires_at && new Date(grant.expires_at).getTime() <= Date.now()) {
    await supabaseAdmin
      .from('patient_record_access')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('id', grant.id);
    return null;
  }

  return grant;
};

const getExplicitlySharedReports = async (patientId, doctorId) => {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*, report_shares!inner(doctor_id, shared_at)')
    .eq('patient_id', patientId)
    .eq('report_shares.doctor_id', doctorId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
};

const DAY_NAME_TO_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const normalizeDayOfWeek = (slot) => {
  if (Number.isInteger(slot?.dayOfWeek)) return slot.dayOfWeek;
  if (Number.isInteger(slot?.day_of_week)) return slot.day_of_week;
  if (Number.isInteger(slot?.day)) return slot.day;

  const dayRaw = (slot?.day ?? slot?.dayName ?? '').toString().trim().toLowerCase();
  if (dayRaw in DAY_NAME_TO_INDEX) return DAY_NAME_TO_INDEX[dayRaw];

  const parsed = Number.parseInt(dayRaw, 10);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) return parsed;
  return null;
};

const normalizeTime24 = (timeRaw) => {
  if (typeof timeRaw !== 'string') return null;
  const value = timeRaw.trim();
  if (!value) return null;

  // 24h format: HH:mm or HH:mm:ss
  let match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  }

  // 12h format: h:mm AM/PM or h AM/PM
  match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hour12 = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2] || '0', 10);
  const meridiem = match[3].toUpperCase();

  if (Number.isNaN(hour12) || Number.isNaN(minute) || hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (hour12 === 12) hour12 = 0;
  const hour24 = meridiem === 'PM' ? hour12 + 12 : hour12;
  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
};

const toMinutes = (time24) => {
  if (typeof time24 !== 'string') return null;
  const parts = time24.split(':');
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return (h * 60) + m;
};

const normalizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

// True when a Supabase/PostgREST error means the object doesn't exist in the DB
// yet (missing table → PGRST205, missing column → 42703). Used to degrade
// gracefully when the Phase 6 schedule migration (033) hasn't been applied.
const isMissingSchemaError = (error) => {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === '42P01';
};

class DoctorService {
  /**
   * Look up a doctor by their exact registered email address.
   * Returns a limited profile for invitation purposes, and their relationship status if clinicId is provided.
   */
  async lookupDoctorByEmail(email, clinicId = null) {
    if (!email) throw new ApiError(400, 'Email is required');
    
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by exact email and verify role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error('Error looking up user by email:', userError);
      throw new ApiError(500, 'Error verifying doctor account');
    }

    // 2. Exact match and role check
    if (!user || user.role !== 'doctor') {
      return null; // Treat as not found to prevent role enumeration
    }

    // 3. Fetch limited doctor profile
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('id, name, specialization, is_approved, profile_image_url, experience_years')
      .eq('user_id', user.id)
      .maybeSingle();

    if (doctorError) {
      console.error('Error looking up doctor profile:', doctorError);
      throw new ApiError(500, 'Error fetching doctor profile');
    }

    if (!doctor) {
      return null;
    }

    const doctorProfile = {
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      verification: doctor.is_approved ? 'verified' : 'unverified',
      profile_image_url: doctor.profile_image_url,
      experience_years: doctor.experience_years
    };

    let relationship = 'NOT_CONNECTED';

    if (clinicId) {
      // Check active affiliation
      const { data: activeAssoc } = await supabaseAdmin
        .from('clinic_doctors')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctor.id)
        .eq('is_active', true)
        .maybeSingle();

      if (activeAssoc) {
        relationship = 'ACTIVE';
      } else {
        // Check pending invitation
        const { data: pendingInvite } = await supabaseAdmin
          .from('clinic_doctor_invites')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('doctor_id', doctor.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (pendingInvite) {
          relationship = 'INVITATION_PENDING';
        }
      }
    }

    return {
      doctor: doctorProfile,
      relationship
    };
  }

  // Get doctor profile
  async getProfile(userId) {
    // HIGH-13 Fix: Explicit field selection prevents leaking internal credentials or raw metadata
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .select(`
        id, name, specialization, experience_years, qualifications, bio,
        consultation_fee, video_consultation_fee, profile_image_url, intro_video_url,
        languages, awards, registration_number, license_number,
        consultation_types, education, certifications, rating, total_reviews,
        is_available, is_approved, approval_status,
        degree_certificate_url, license_document_url, government_id_url, live_selfie_url, compliance_documents,
        hospital_id, is_public_profile, show_phone_number,
        user:users!doctors_user_id_fkey(email, phone, is_verified, created_at),
        hospital:hospitals(id, name, address, city)
      `)
      .eq('user_id', userId)
      .single();

    if (error || !doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    // Get stats
    const [
      { data: patientRows },
      { count: totalAppointments },
      { count: completedConsultations },
      { data: reviews }
    ] = await Promise.all([
      supabaseAdmin.from('appointments').select('patient_id').eq('doctor_id', doctor.id),
      supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('doctor_id', doctor.id),
      supabaseAdmin.from('consultations').select('id', { count: 'exact', head: true }).eq('doctor_id', doctor.id).eq('status', 'completed'),
      supabaseAdmin.from('reviews').select('id, rating, comment, created_at, patient:patients(name)').eq('reviewable_type', 'doctor').eq('reviewable_id', doctor.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const uniquePatients = new Set((patientRows || []).map((r) => r.patient_id)).size;

    return {
      ...doctor,
      stats: {
        totalPatients: uniquePatients,
        totalAppointments: totalAppointments || 0,
        completedConsultations: completedConsultations || 0,
      },
      recentReviews: reviews || [],
    };
  }

  // Update doctor profile
  async updateProfile(userId, updateData) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    // Partial update: only include fields that are explicitly provided (not undefined)
    // This prevents Web frontend from accidentally nulling out fields set by Android
    const updatePayload = { updated_at: new Date().toISOString() };
    if (updateData.name !== undefined) updatePayload.name = updateData.name;
    if (updateData.specialization !== undefined) updatePayload.specialization = updateData.specialization;
    if (updateData.experience !== undefined || updateData.experienceYears !== undefined) {
      updatePayload.experience_years = updateData.experience ?? updateData.experienceYears;
    }
    if (updateData.qualifications !== undefined) updatePayload.qualifications = updateData.qualifications;
    if (updateData.registrationNo !== undefined || updateData.registration_number !== undefined) {
      updatePayload.registration_number = updateData.registrationNo ?? updateData.registration_number;
    }
    if (updateData.licenseNumber !== undefined || updateData.license_number !== undefined) {
      updatePayload.license_number = updateData.licenseNumber ?? updateData.license_number;
    }
    if (updateData.licenseDocumentUrl !== undefined || updateData.license_document_url !== undefined) {
      updatePayload.license_document_url = updateData.licenseDocumentUrl ?? updateData.license_document_url;
    }
    if (updateData.degreeCertificateUrl !== undefined || updateData.degree_certificate_url !== undefined) {
      updatePayload.degree_certificate_url = updateData.degreeCertificateUrl ?? updateData.degree_certificate_url;
    }
    if (updateData.consultationFee !== undefined || updateData.consultation_fee !== undefined) {
      updatePayload.consultation_fee = updateData.consultationFee ?? updateData.consultation_fee;
    }
    if (updateData.bio !== undefined) updatePayload.bio = updateData.bio;
    if (updateData.languages !== undefined) updatePayload.languages = updateData.languages;
    if (updateData.hospitalId !== undefined) updatePayload.hospital_id = updateData.hospitalId;
    if (updateData.profileImage !== undefined || updateData.profile_image !== undefined || updateData.profile_image_url !== undefined) {
      updatePayload.profile_image_url = updateData.profileImage ?? updateData.profile_image ?? updateData.profile_image_url;
    }
    if (updateData.intro_video_url !== undefined) {
      updatePayload.intro_video_url = updateData.intro_video_url;
    }
    if (updateData.awards !== undefined) updatePayload.awards = updateData.awards;
    if (updateData.consultationTypes !== undefined || updateData.consultation_types !== undefined) {
      updatePayload.consultation_types = updateData.consultationTypes ?? updateData.consultation_types;
    }
    if (updateData.education !== undefined) updatePayload.education = updateData.education;
    if (updateData.certifications !== undefined) updatePayload.certifications = updateData.certifications;

    // Privacy Settings
    if (updateData.isPublicProfile !== undefined || updateData.is_public_profile !== undefined) {
      updatePayload.is_public_profile = updateData.isPublicProfile ?? updateData.is_public_profile;
    }
    if (updateData.showPhoneNumber !== undefined || updateData.show_phone_number !== undefined) {
      updatePayload.show_phone_number = updateData.showPhoneNumber ?? updateData.show_phone_number;
    }

    // Registration Overhaul Fields
    if (updateData.registration_date !== undefined) updatePayload.registration_date = updateData.registration_date;
    if (updateData.registration_valid_till !== undefined) updatePayload.registration_valid_till = updateData.registration_valid_till;
    if (updateData.medical_council !== undefined) updatePayload.medical_council = updateData.medical_council;
    if (updateData.government_id_type !== undefined) updatePayload.government_id_type = updateData.government_id_type;
    if (updateData.government_id_url !== undefined) updatePayload.government_id_url = updateData.government_id_url;
    if (updateData.live_selfie_url !== undefined) updatePayload.live_selfie_url = updateData.live_selfie_url;
    if (updateData.qualification_details !== undefined) updatePayload.qualification_details = updateData.qualification_details;
    if (updateData.experience_months !== undefined) updatePayload.experience_months = updateData.experience_months;
    if (updateData.home_visit_consultation_fee !== undefined) updatePayload.home_visit_consultation_fee = updateData.home_visit_consultation_fee;
    if (updateData.emergency_consultation_fee !== undefined) updatePayload.emergency_consultation_fee = updateData.emergency_consultation_fee;
    if (updateData.is_emergency_available !== undefined) updatePayload.is_emergency_available = updateData.is_emergency_available;
    
    // Clinic Fields
    if (updateData.clinic_name !== undefined) updatePayload.clinic_name = updateData.clinic_name;
    if (updateData.clinic_address !== undefined) updatePayload.clinic_address = updateData.clinic_address;
    if (updateData.clinic_pincode !== undefined) updatePayload.clinic_pincode = updateData.clinic_pincode;
    if (updateData.clinic_map_url !== undefined) updatePayload.clinic_map_url = updateData.clinic_map_url;
    if (updateData.clinic_photo_url !== undefined) updatePayload.clinic_photo_url = updateData.clinic_photo_url;
    if (updateData.clinic_lat !== undefined) updatePayload.clinic_lat = updateData.clinic_lat;
    if (updateData.clinic_lng !== undefined) updatePayload.clinic_lng = updateData.clinic_lng;
    if (updateData.multiple_clinics !== undefined) updatePayload.multiple_clinics = updateData.multiple_clinics;

    // Document Categories
    if (updateData.pan_card_url !== undefined) updatePayload.pan_card_url = updateData.pan_card_url;
    if (updateData.cancelled_cheque_url !== undefined) updatePayload.cancelled_cheque_url = updateData.cancelled_cheque_url;
    if (updateData.gst_certificate_url !== undefined) updatePayload.gst_certificate_url = updateData.gst_certificate_url;
    if (updateData.clinic_license_url !== undefined) updatePayload.clinic_license_url = updateData.clinic_license_url;
    if (updateData.digital_signature_url !== undefined) updatePayload.digital_signature_url = updateData.digital_signature_url;

    // Bank Details
    if (updateData.bank_account_number !== undefined) updatePayload.bank_account_number = updateData.bank_account_number;
    if (updateData.bank_ifsc !== undefined) updatePayload.bank_ifsc = updateData.bank_ifsc;
    if (updateData.bank_upi !== undefined) updatePayload.bank_upi = updateData.bank_upi;

    // Professional Rich Data
    if (updateData.publications !== undefined) updatePayload.publications = updateData.publications;
    if (updateData.experience_timeline !== undefined) updatePayload.experience_timeline = updateData.experience_timeline;
    if (updateData.insurance_accepted !== undefined) updatePayload.insurance_accepted = updateData.insurance_accepted;
    if (updateData.languages_spoken !== undefined) updatePayload.languages_spoken = updateData.languages_spoken;

    // Emergency Contact
    if (updateData.emergency_contact_name !== undefined) updatePayload.emergency_contact_name = updateData.emergency_contact_name;
    if (updateData.emergency_contact_phone !== undefined) updatePayload.emergency_contact_phone = updateData.emergency_contact_phone;
    if (updateData.emergency_contact_relation !== undefined) updatePayload.emergency_contact_relation = updateData.emergency_contact_relation;

    
    Object.assign(updatePayload, buildProviderResubmissionFields('doctor', doctor.approval_status));
    
    // VULN-BS-05: Reset approval if credential fields are modified
    const credentialFieldsUpdated = [
      'registrationNo', 'registration_number',
      'licenseNumber', 'license_number',
      'licenseDocumentUrl', 'license_document_url',
      'degreeCertificateUrl', 'degree_certificate_url',
      'government_id_url', 'live_selfie_url'
    ].some(field => updateData[field] !== undefined);

    if (credentialFieldsUpdated && doctor.approval_status !== 'draft') {
      updatePayload.approval_status = 'pending';
      updatePayload.is_approved = false;
      updatePayload.approval_notes = 'Credential fields updated by provider. Re-verification required.';
      updatePayload.approved_by = null;
      updatePayload.approved_at = null;
    }

    // 🌟 Phase 2: Compute Profile Completion Score
    const mergedDoctor = { ...doctor, ...updatePayload };
    let score = 0;
    let totalWeights = 0;
    const addWeight = (field, weight) => {
      totalWeights += weight;
      if (Array.isArray(field) ? field.length > 0 : !!field) score += weight;
    };
    
    addWeight(mergedDoctor.name, 10);
    addWeight(mergedDoctor.profile_image_url, 10);
    addWeight(mergedDoctor.specialization, 5);
    addWeight(mergedDoctor.experience_years, 5);
    addWeight(mergedDoctor.bio, 5);
    addWeight(mergedDoctor.languages, 5);
    
    addWeight(mergedDoctor.registration_number, 10);
    addWeight(mergedDoctor.degree_certificate_url, 15);
    addWeight(mergedDoctor.license_document_url, 15);
    addWeight(mergedDoctor.government_id_url, 10);
    addWeight(mergedDoctor.live_selfie_url, 10);
    
    updatePayload.profile_completion_percentage = Math.round((score / totalWeights) * 100);
    // Backward compatibility if needed:
    updatePayload.profile_completion_score = updatePayload.profile_completion_percentage;

    const { data: updatedDoctor, error } = await supabaseAdmin
      .from('doctors')
      .update(updatePayload)
      .eq('id', doctor.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to update profile');
    }

    await cacheDel(`auth_user:${userId}`);

    return updatedDoctor;
  }

  // Update verification documents
  async updateVerificationDocuments(userId, data) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, approval_status')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const allowedFields = [
      'degree_certificate_url',
      'license_document_url',
      'government_id_url',
      'live_selfie_url'
    ];

    let updatePayload = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updatePayload[field] = data[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new ApiError(400, 'No valid verification documents provided');
    }

    // If they were rejected, put them back under review automatically
    if (doctor.approval_status === 'rejected') {
      updatePayload.approval_status = 'under_review';
      // No-op for approval_block_reason as column doesn't exist
    }

    const { data: updatedDoctor, error } = await supabaseAdmin
      .from('doctors')
      .update(updatePayload)
      .eq('id', doctor.id)
      .select('approval_status')
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to update verification documents');
    }

    return updatedDoctor;
  }


  // Get doctor dashboard
  async getDashboard(userId) {
    const cacheKey = `doctor:dashboard:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, name, specialization, is_available, consultation_fee')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    // Fix #42: Use IST for today's date instead of UTC to prevent timezone offset issues in India
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Fix #40: Run all dashboard queries in parallel instead of sequentially
    const [
      todayApptsResult,
      upcomingApptsResult,
      pendingApptsResult,
      recentConsultResult,
      totalPatientsResult,
      completedTodayResult,
      completedTodayApptsResult,
    ] = await Promise.all([
      supabaseAdmin.from('appointments')
        .select('*, patient:patients(id, name, date_of_birth, gender, profile_image_url, blood_group, weight, height)')
        .eq('doctor_id', doctor.id).eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .or('patient_notes.neq.BLOCKED_BY_DOCTOR,patient_notes.is.null')
        .order('time_slot', { ascending: true }),
      supabaseAdmin.from('appointments')
        .select('*, patient:patients(id, name, date_of_birth, gender, profile_image_url, blood_group, weight, height)')
        .eq('doctor_id', doctor.id).gt('appointment_date', today)
        .in('status', ['scheduled', 'confirmed'])
        .or('patient_notes.neq.BLOCKED_BY_DOCTOR,patient_notes.is.null')
        .order('appointment_date', { ascending: true }).limit(10),
      supabaseAdmin.from('appointments')
        .select('*', { count: 'exact' })
        .eq('doctor_id', doctor.id).eq('status', 'scheduled')
        .or('patient_notes.neq.BLOCKED_BY_DOCTOR,patient_notes.is.null')
        .gte('appointment_date', today),
      supabaseAdmin.from('consultations')
        .select('*, patient:patients(id, name), appointment:appointments(type)')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id).eq('appointment_date', today),
      supabaseAdmin.from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id).eq('appointment_date', today)
        .eq('status', 'completed'),
      supabaseAdmin.from('appointments')
        .select('id, fee')
        .eq('doctor_id', doctor.id).eq('appointment_date', today)
        .eq('status', 'completed'),
    ]);

    const normalizeAppointmentPatient = (appointment) => ({
      ...appointment,
      patient: appointment.patient
        ? {
          ...appointment.patient,
          age: calculateAge(appointment.patient.date_of_birth),
        }
        : appointment.patient,
    });
    const todayAppointments = (todayApptsResult.data || []).map(normalizeAppointmentPatient);
    const upcomingAppointments = (upcomingApptsResult.data || []).map(normalizeAppointmentPatient);
    const pendingCount = pendingApptsResult.count || 0;
    const recentConsultations = recentConsultResult.data || [];
    const totalPatientsToday = totalPatientsResult.count || 0;
    const completedToday = completedTodayResult.count || 0;
    const completedTodayAppts = completedTodayApptsResult.data || [];

    const totalEarningsToday = completedTodayAppts.reduce((sum, a) => sum + (a.fee || doctor.consultation_fee || 0), 0);

    const dashboard = {
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        isAvailable: doctor.is_available,
      },
      todayAppointments,
      upcomingAppointments,
      pendingCount,
      recentConsultations,
      stats: {
        totalPatientsToday,
        completedToday,
        earningsToday: totalEarningsToday,
        todaysAppointments: todayAppointments.length,
        completed: completedToday,
        pending: pendingCount,
        todaysEarnings: totalEarningsToday,
      },
    };

    try { await cacheSet(cacheKey, dashboard, 30); } catch (_) { /* non-fatal */ }

    return dashboard;
  }

  // Get all doctors (for patient search)
  async getAllDoctors(filters = {}, page = 1, limit = 10) {
    const { offset } = paginate(page, limit);
    const { CATEGORY_TO_SPECIALIZATIONS } = require('../utils/specializations');
    let clinicDoctorIds = null;

    if (filters.clinicId) {
      const { data: clinicLinks, error: clinicError } = await supabaseAdmin
        .from('clinic_doctors')
        .select('doctor_id')
        .eq('clinic_id', filters.clinicId)
        .eq('is_active', true);

      if (clinicError) {
        throw new ApiError(400, 'Failed to fetch clinic doctors');
      }

      clinicDoctorIds = (clinicLinks || []).map(link => link.doctor_id).filter(Boolean);
      if (clinicDoctorIds.length === 0) {
        return paginatedResponse([], 0, page, limit);
      }
    }

    // Resolve category name to actual specialization(s) if needed
    let specializations = [];
    if (filters.specialization) {
      const mapped = CATEGORY_TO_SPECIALIZATIONS[filters.specialization];
      if (mapped) {
        specializations = mapped;
      } else {
        specializations = [filters.specialization];
      }
    }

    let query = supabaseAdmin
      .from('doctors')
      .select(`
        id, name, specialization, experience_years, rating, total_reviews, total_consultations,
        qualifications, consultation_fee, video_consultation_fee, bio,
        profile_image_url, intro_video_url, languages, is_available,
        hospital_id, clinic_doctors(clinic_id, clinic:clinics(latitude, longitude)),
        hospital:hospitals(id, name, city, address, latitude, longitude)
      `, { count: 'exact' })
      .eq('is_approved', true);

    if (specializations.length === 1) {
      query = query.eq('specialization', specializations[0]);
    } else if (specializations.length > 1) {
      query = query.in('specialization', specializations);
    }

    if (filters.hospitalId) {
      query = query.eq('hospital_id', filters.hospitalId);
    }
    if (clinicDoctorIds) {
      query = query.in('id', clinicDoctorIds);
    }

    if (filters.isAvailable !== undefined) {
      query = query.eq('is_available', filters.isAvailable);
    }

    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }

    // Removed old filters.global logic because it forced video_consultation_fee to not be null.
    // We now rely on consultationType for filtering by fee.

    if (filters.maxFee) {
      query = query.lte('consultation_fee', filters.maxFee);
    }

    if (filters.consultationType === 'video') {
      query = query.not('video_consultation_fee', 'is', null);
    } else if (filters.consultationType === 'in_person') {
      query = query.not('consultation_fee', 'is', null);
    }

    // City-based filter: match hospital city
    if (filters.city) {
      const s = sanitizeSearch(filters.city);
      if (s) {
        // Get hospital IDs in this city first
        const { data: cityHospitals } = await supabaseAdmin
          .from('hospitals')
          .select('id')
          .ilike('city', `%${s}%`)
          .eq('is_approved', true);

        // Also get clinic doctor IDs in this city
        const { data: cityClinics } = await supabaseAdmin
          .from('clinics')
          .select('id')
          .ilike('city', `%${s}%`)
          .eq('is_approved', true);

        const cityHospitalIds = (cityHospitals || []).map(h => h.id);
        const cityClinicIds = (cityClinics || []).map(c => c.id);

        let cityDoctorIds = [];
        if (cityClinicIds.length > 0) {
          const { data: clinicDocLinks } = await supabaseAdmin
            .from('clinic_doctors')
            .select('doctor_id')
            .in('clinic_id', cityClinicIds)
            .eq('is_active', true);
          cityDoctorIds = (clinicDocLinks || []).map(l => l.doctor_id);
        }

        if (cityHospitalIds.length > 0 || cityDoctorIds.length > 0) {
          // Build OR filter: hospital_id in cityHospitalIds OR id in cityDoctorIds
          const conditions = [];
          if (cityHospitalIds.length > 0) {
            query = query.or(
              `hospital_id.in.(${cityHospitalIds.join(',')})`
              + (cityDoctorIds.length > 0 ? `,id.in.(${cityDoctorIds.join(',')})` : '')
            );
          } else if (cityDoctorIds.length > 0) {
            query = query.in('id', cityDoctorIds);
          }
        } else {
          // No hospitals or clinics in this city
          return paginatedResponse([], 0, page, limit);
        }
      }
    }

    if (filters.search) {
      const s = sanitizeSearch(filters.search);
      if (s) {
        if (s.includes('@')) {
          const { data: userMatch } = await supabaseAdmin.from('users').select('id').ilike('email', s).maybeSingle();
          if (userMatch) {
            query = query.eq('user_id', userMatch.id);
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          query = query.or(`name.ilike.%${s}%,specialization.ilike.%${s}%`);
        }
      }
    }

    // Determine if we need to sort by distance (which requires fetching all first)
    const patLat = parseFloat(filters.latitude);
    const patLng = parseFloat(filters.longitude);
    const hasLocation = !isNaN(patLat) && !isNaN(patLng) && (patLat !== 0 || patLng !== 0);

    let doctors, count, error;

    // We fetch all matching doctors to perform a smart in-memory ranking
    // for both Location-based (distance) and Non-Location-based (smart score).
    // This ensures true "Best Possible" recommendations globally.
    const res = await query;
    doctors = res.data;
    count = res.count;
    error = res.error;

    if (error) {
      throw new ApiError(400, 'Failed to fetch doctors');
    }

    let result = doctors || [];

    if (hasLocation) {
      result = result.map(doc => {
        const hospLat = doc.hospital?.latitude;
        const hospLng = doc.hospital?.longitude;
        const clinicLat = doc.clinic_doctors?.[0]?.clinic?.latitude;
        const clinicLng = doc.clinic_doctors?.[0]?.clinic?.longitude;
        
        let hospDist = null;
        let clinicDist = null;
        
        if (hospLat && hospLng) {
          hospDist = haversineDistance(patLat, patLng, hospLat, hospLng);
        }
        if (clinicLat && clinicLng) {
          clinicDist = haversineDistance(patLat, patLng, clinicLat, clinicLng);
        }
        
        let distance = null;
        if (hospDist !== null && clinicDist !== null) {
          distance = Math.min(hospDist, clinicDist);
        } else if (hospDist !== null) {
          distance = hospDist;
        } else if (clinicDist !== null) {
          distance = clinicDist;
        }
        
        return { ...doc, distance_km: distance };
      });
    }

    if (hasLocation) {
      if (filters.hospitalId || filters.clinicId) {
        // Limit to 25km for hospital/clinic specific searches
        result = result.filter(doc => doc.distance_km !== null && doc.distance_km <= 25.0);
      } else if (!filters.global) {
        // Limit to 120km for In-Person searches
        result = result.filter(doc => doc.distance_km !== null && doc.distance_km <= 120.0);
      }
      // If filters.global is true, do not filter by distance
    } else {
      if (!filters.global && !filters.city && !filters.hospitalId && !filters.clinicId) {
        // Cannot filter 120km if no location and no city provided
        return paginatedResponse([], 0, page, limit);
      }
    }

    // ALWAYS sort by SMART RANKING (top rated) as requested by the user
    // Score formula: (rating * 10) + log10(total_reviews + 1) * 5
    // This guarantees highly rated doctors with many reviews appear first!
    result = result.map(doc => {
      const rating = parseFloat(doc.rating) || 0;
      const reviews = parseInt(doc.total_reviews) || 0;
      const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
      return { 
        ...doc, 
        clinic_id: doc.clinic_doctors?.[0]?.clinic_id,
        smart_score: score 
      };
    });

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'rating_desc':
          result.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
          break;
        case 'consultations_desc':
          result.sort((a, b) => (parseInt(b.total_consultations) || 0) - (parseInt(a.total_consultations) || 0));
          break;
        case 'experience_desc':
          result.sort((a, b) => (parseInt(b.experience_years) || 0) - (parseInt(a.experience_years) || 0));
          break;
        case 'fee_asc':
          result.sort((a, b) => {
            const getFee = (doc) => {
              let fee = 999999;
              if (filters.consultationType === 'video' && doc.video_consultation_fee != null) {
                fee = parseFloat(doc.video_consultation_fee);
              } else if (filters.consultationType === 'in_person' && doc.consultation_fee != null) {
                fee = parseFloat(doc.consultation_fee);
              } else {
                const cFee = parseFloat(doc.consultation_fee);
                const vFee = parseFloat(doc.video_consultation_fee);
                let validFees = [];
                if (!isNaN(cFee) && cFee > 0) validFees.push(cFee);
                if (!isNaN(vFee) && vFee > 0) validFees.push(vFee);
                if (validFees.length > 0) fee = Math.min(...validFees);
              }
              return (isNaN(fee) || fee <= 0) ? 999999 : fee;
            };
            return getFee(a) - getFee(b);
          });
          break;
        case 'fee_desc':
          result.sort((a, b) => {
            const getFee = (doc) => {
              let fee = -1;
              if (filters.consultationType === 'video' && doc.video_consultation_fee != null) {
                fee = parseFloat(doc.video_consultation_fee);
              } else if (filters.consultationType === 'in_person' && doc.consultation_fee != null) {
                fee = parseFloat(doc.consultation_fee);
              } else {
                const cFee = parseFloat(doc.consultation_fee);
                const vFee = parseFloat(doc.video_consultation_fee);
                let validFees = [];
                if (!isNaN(cFee) && cFee > 0) validFees.push(cFee);
                if (!isNaN(vFee) && vFee > 0) validFees.push(vFee);
                if (validFees.length > 0) fee = Math.max(...validFees);
              }
              return (isNaN(fee) || fee <= 0) ? -1 : fee;
            };
            return getFee(b) - getFee(a);
          });
          break;
        case 'distance_asc':
          result.sort((a, b) => (parseFloat(a.distance_km) || 999999) - (parseFloat(b.distance_km) || 999999));
          break;
        default:
          result.sort((a, b) => b.smart_score - a.smart_score);
      }
    } else {
      result.sort((a, b) => b.smart_score - a.smart_score);
    }

    // Apply pagination in memory for both cases
    count = result.length;
    result = result.slice(offset, offset + limit);
    return paginatedResponse(result, count, page, limit);
  }

  // Get doctor by ID
  async getDoctorById(doctorId) {
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .select(`
        *,
        hospital:hospitals(id, name, address, city, phone)
      `)
      .eq('id', doctorId)
      .eq('is_approved', true)
      .single();

    if (error || !doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    // Fetch related data in parallel
    const [
      { data: slots },
      { data: reviews },
      { data: reviewsDist },
      { data: queueCount },
      { data: clinicsData },
      { data: hospitalsData }
    ] = await Promise.all([
      supabaseAdmin.from('doctor_slots').select('*').eq('doctor_id', doctorId).eq('is_active', true),
      supabaseAdmin.from('reviews').select('*, patient:patients(id, name, profile_image_url)').eq('reviewable_type', 'doctor').eq('reviewable_id', doctorId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('reviews').select('rating').eq('reviewable_type', 'doctor').eq('reviewable_id', doctorId),
      supabaseAdmin.rpc('get_doctor_queue_count', { p_doctor_id: doctorId }),
      supabaseAdmin.from('clinic_doctors').select('consultation_fee, schedule, clinic:clinics(*)').eq('doctor_id', doctorId).eq('is_active', true),
      supabaseAdmin.from('hospital_doctors').select('department, designation, schedule, hospital:hospitals(*)').eq('doctor_id', doctorId).eq('is_active', true),
    ]);

    const reviewDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (reviewsDist) {
      reviewsDist.forEach(r => {
        if (r.rating) {
          reviewDistribution[r.rating] = (reviewDistribution[r.rating] || 0) + 1;
        }
      });
    }

    return {
      ...doctor,
      slots: slots || [],
      reviews: reviews || [],
      reviewDistribution,
      queueCount: queueCount || 0,
      affiliatedClinics: clinicsData || [],
      affiliatedHospitals: hospitalsData || [],
    };
  }

  // Get specialties
  async getSpecialties() {
    const { data, error } = await supabaseAdmin
      .from('doctors')
      .select('specialization')
      .eq('is_approved', true);

    if (error) {
      throw new ApiError(400, 'Failed to fetch specialties');
    }

    // Get unique specializations with count
    const specialtyMap = {};
    data.forEach(d => {
      if (d.specialization) {
        specialtyMap[d.specialization] = (specialtyMap[d.specialization] || 0) + 1;
      }
    });

    const specialties = Object.entries(specialtyMap).map(([name, count]) => ({
      name,
      doctorCount: count,
    }));

    return specialties.sort((a, b) => b.doctorCount - a.doctorCount);
  }

  // Get doctor's available slots for a specific date
  async getAvailableSlots(doctorId, date, type = 'all') {
    // 1. Fetch active leaves covering this date
    let activeLeaves = [];
    try {
      const { data: leaves, error: leavesErr } = await supabaseAdmin
        .from('doctor_leaves')
        .select('*')
        .eq('doctor_id', doctorId)
        .lte('start_date', date)
        .gte('end_date', date);

      if (!leavesErr && leaves) {
        activeLeaves = leaves.filter(l => !l.status || l.status === 'active');
      }
    } catch (e) {
      activeLeaves = [];
    }

    // Global full-day leave blocks all slots on this date
    const globalFullDayLeave = activeLeaves.find(
      l => (!l.scope || l.scope === 'global') && (!l.leave_type || l.leave_type === 'full_day')
    );
    if (globalFullDayLeave) {
      return [];
    }

    // Global partial-day leaves
    const globalPartialLeaves = activeLeaves.filter(
      l => (!l.scope || l.scope === 'global') && l.leave_type === 'partial_day' && l.start_time && l.end_time
    ).map(l => ({
      start: toMinutes(l.start_time.slice(0, 5)),
      end: toMinutes(l.end_time.slice(0, 5))
    })).filter(l => l.start !== null && l.end !== null && l.end > l.start);

    // Organization-specific leaves
    const orgLeaves = activeLeaves.filter(l => l.scope === 'organization' && (l.organization_id || l.clinic_id || l.hospital_id));

    // Get doctor's slot configuration
    let query = supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true)
      .eq('slot_date', date);

    if (type === 'video') {
      query = query.eq('is_video_enabled', true);
    } else if (type === 'in_person') {
      query = query.eq('is_clinic_enabled', true);
    } else if (type === 'home') {
      query = query.eq('is_home_enabled', true);
    }

    const { data: slotConfig } = await query;

    if (!slotConfig || slotConfig.length === 0) {
      return [];
    }

    // Get booked appointments for the date
    const { data: bookedAppointments } = await supabaseAdmin
      .from('appointments')
      .select('time_slot, duration_minutes')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    const bookedIntervals = (bookedAppointments || []).map(a => {
      if (!a.time_slot) return null;
      const ts = a.time_slot.length > 5 ? a.time_slot.slice(0, 5) : a.time_slot;
      const startMin = toMinutes(ts);
      if (startMin === null) return null;
      const duration = a.duration_minutes || 15;
      return { start: startMin, end: startMin + duration };
    }).filter(Boolean);

    // Generate available time slots
    const availableSlots = [];
    const pastSlots = [];

    slotConfig.forEach(config => {
      const [startHour, startMin] = config.start_time.split(':').map(Number);
      const [endHour, endMin] = config.end_time.split(':').map(Number);
      const duration = config.slot_duration || 15;
      const buffer = config.buffer_time || 0;

      // Check for organization-specific leave matching this slot
      const slotOrgId = config.organization_id || (config.is_clinic_enabled ? config.clinic_id : config.hospital_id);
      const matchingOrgLeave = slotOrgId ? orgLeaves.find(l => l.organization_id === slotOrgId || l.clinic_id === slotOrgId || l.hospital_id === slotOrgId) : null;

      // If it's an in-person slot (window) and we are requesting in-person slots, we don't break it into 15m intervals
      // Instead, we return the entire window as a single slot.
      if (type === 'in_person' && config.is_clinic_enabled && !config.is_video_enabled && !config.is_home_enabled) {
        const timeSlot = `${config.start_time.slice(0, 5)}-${config.end_time.slice(0, 5)}`;
        const period = startHour < 12 ? 'Morning' : startHour < 17 ? 'Afternoon' : 'Evening';
        const slotDateStr = `${date}T${config.end_time.slice(0, 5)}:00+05:30`;
        const slotTimeMs = Date.parse(slotDateStr);
        const isPast = !isNaN(slotTimeMs) && slotTimeMs < Date.now();
        
        let isLeaveBlocked = false;
        const windowStartMins = startHour * 60 + (startMin || 0);
        const windowEndMins = endHour * 60 + (endMin || 0);

        if (globalPartialLeaves.some(l => Math.max(windowStartMins, l.start) < Math.min(windowEndMins, l.end))) {
          isLeaveBlocked = true;
        } else if (matchingOrgLeave) {
          if (!matchingOrgLeave.leave_type || matchingOrgLeave.leave_type === 'full_day') {
            isLeaveBlocked = true;
          } else if (matchingOrgLeave.start_time && matchingOrgLeave.end_time) {
            const lStart = toMinutes(matchingOrgLeave.start_time.slice(0, 5));
            const lEnd = toMinutes(matchingOrgLeave.end_time.slice(0, 5));
            if (lStart !== null && lEnd !== null && Math.max(windowStartMins, lStart) < Math.min(windowEndMins, lEnd)) {
              isLeaveBlocked = true;
            }
          }
        }

        if (isLeaveBlocked) {
          return; // Blocked by leave
        }

        if (isPast) {
          pastSlots.push({ time: timeSlot, period, is_available: false });
        } else {
          availableSlots.push({
            time: timeSlot,
            period: period,
            is_available: true, // We allow multiple bookings per window
          });
        }
        return; // Skip 15-min breakdown
      }

      let currentTotalMins = startHour * 60 + (startMin || 0);
      const endTotalMins = endHour * 60 + (endMin || 0);

      while (currentTotalMins + duration <= endTotalMins) {
        const h = Math.floor(currentTotalMins / 60);
        const m = currentTotalMins % 60;
        const timeSlot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        const period = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';

        const slotDateStr = `${date}T${timeSlot.padStart(5, '0')}:00+05:30`;
        const slotTimeMs = Date.parse(slotDateStr);
        const isPast = !isNaN(slotTimeMs) && slotTimeMs < Date.now();

        const slotStartMins = currentTotalMins;
        const slotEndMins = currentTotalMins + duration;

        // Check for leave blocking
        let isLeaveBlocked = false;
        if (globalPartialLeaves.some(l => Math.max(slotStartMins, l.start) < Math.min(slotEndMins, l.end))) {
          isLeaveBlocked = true;
        } else if (matchingOrgLeave) {
          if (!matchingOrgLeave.leave_type || matchingOrgLeave.leave_type === 'full_day') {
            isLeaveBlocked = true;
          } else if (matchingOrgLeave.start_time && matchingOrgLeave.end_time) {
            const lStart = toMinutes(matchingOrgLeave.start_time.slice(0, 5));
            const lEnd = toMinutes(matchingOrgLeave.end_time.slice(0, 5));
            if (lStart !== null && lEnd !== null && Math.max(slotStartMins, lStart) < Math.min(slotEndMins, lEnd)) {
              isLeaveBlocked = true;
            }
          }
        }

        // Check for overlaps with globally booked intervals
        let isBooked = false;
        for (const interval of bookedIntervals) {
          if (Math.max(slotStartMins, interval.start) < Math.min(slotEndMins, interval.end)) {
            isBooked = true;
            break;
          }
        }

        if (isPast) {
          // Already-elapsed slot
          pastSlots.push({ time: timeSlot, period, is_available: false });
        } else {
          availableSlots.push({
            time: timeSlot,
            period: period,
            is_available: !isBooked && !isLeaveBlocked,
          });
        }
        currentTotalMins += (duration + buffer);
      }
    });

    // Keep only the most recent elapsed slots (MAX_PAST_SLOTS_SHOWN).
    pastSlots.sort((a, b) => b.time.localeCompare(a.time)); // most recent first
    const keptPastSlots = pastSlots.slice(0, MAX_PAST_SLOTS_SHOWN);

    const allSlots = availableSlots.concat(keptPastSlots);
    allSlots.sort((a, b) => a.time.localeCompare(b.time));
    return allSlots;
  }

  // Update availability
  async updateAvailability(userId, isAvailable) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const { error } = await supabaseAdmin
      .from('doctors')
      .update({ is_available: isAvailable })
      .eq('id', doctor.id);

    if (error) {
      throw new ApiError(400, 'Failed to update availability');
    }

    return { isAvailable };
  }

  // Manage slots — M2 Fix: atomic replacement via RPC
  async updateSlots(userId, slots) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    // Accept both backend-native slot shape and web UI shape.
    // Prevent invalid rows like slot_date = null
    const slotsJson = [];
    
    slots.forEach((slot) => {
      const slot_date = slot.slot_date || slot.date || slot.slotDate;
      const start_time = normalizeTime24(slot.startTime ?? slot.start_time);
      const end_time = normalizeTime24(slot.endTime ?? slot.end_time);
      const is_active = normalizeBoolean(slot.isAvailable ?? slot.is_active ?? slot.isActive, true);
      const is_video_enabled = normalizeBoolean(slot.isVideoEnabled ?? slot.is_video_enabled, true);
      const is_clinic_enabled = normalizeBoolean(slot.isClinicEnabled ?? slot.is_clinic_enabled, true);
      const is_home_enabled = normalizeBoolean(slot.isHomeEnabled ?? slot.is_home_enabled, false);
      const slot_duration = parseInt(slot.slotDuration ?? slot.slot_duration ?? 15, 10);
      const buffer_time = parseInt(slot.bufferTime ?? slot.buffer_time ?? 0, 10);

      if (!slot_date || !start_time || !end_time) {
        throw new ApiError(400, 'Invalid slot format. Provide valid slot_date, startTime, and endTime.');
      }

      const startMinutes = toMinutes(start_time);
      const endMinutes = toMinutes(end_time);
      if (startMinutes === null || endMinutes === null) {
        throw new ApiError(400, 'Invalid slot times provided.');
      }

      if (startMinutes >= endMinutes) {
        // Spans past midnight - Split into two slots
        // 1. Current day slot (start_time to 23:59:00)
        slotsJson.push({
          slot_date,
          start_time,
          end_time: '23:59:00',
          is_active,
          is_video_enabled,
          is_clinic_enabled,
          is_home_enabled,
          slot_duration,
          buffer_time
        });

        // Calculate next day date
        const nextDate = new Date(slot_date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateString = nextDate.toISOString().split('T')[0];

        // 2. Next day slot (00:00:00 to end_time)
        slotsJson.push({
          slot_date: nextDateString,
          start_time: '00:00:00',
          end_time,
          is_active,
          is_video_enabled,
          is_clinic_enabled,
          is_home_enabled,
          slot_duration,
          buffer_time
        });
      } else {
        slotsJson.push({ slot_date, start_time, end_time, is_active, is_video_enabled, is_clinic_enabled, is_home_enabled, slot_duration, buffer_time });
      }
    });

    const canUseRpc = false; // Bypass RPC to ensure custom fields are handled
    const { error: rpcError } = canUseRpc
      ? await supabaseAdmin.rpc('rpc_replace_doctor_slots', {
        p_doctor_id: doctor.id,
        p_slots: slotsJson,
      })
      : { error: new Error('Slot replacement RPC cannot preserve custom slots correctly') };

    if (rpcError) {
      // Backward-compatible fallback for environments where RPC is missing/outdated
      const { error: deleteError } = await supabaseAdmin
        .from('doctor_slots')
        .delete()
        .eq('doctor_id', doctor.id);

      if (deleteError) {
        throw new ApiError(400, 'Failed to update slots');
      }

      const fallbackRows = slotsJson.map((slot) => ({
        doctor_id: doctor.id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_duration: (slot.is_clinic_enabled && !slot.is_video_enabled && !slot.is_home_enabled) ? null : slot.slot_duration,
        is_video_enabled: slot.is_video_enabled,
        is_clinic_enabled: slot.is_clinic_enabled,
        is_active: slot.is_active,
      }));

      let { error: insertFallbackError } = await supabaseAdmin
        .from('doctor_slots')
        .insert(fallbackRows);

      if (insertFallbackError && insertFallbackError.code === '42703') {
        // doctor_slots is missing the is_home_enabled column (migration 033 not
        // applied). Retry with the pre-033 column set so video/clinic slots can
        // still be created; home-visit slots persist only after 033 is applied.
        const compatibleRows = fallbackRows.map((row) => ({
          doctor_id: row.doctor_id,
          slot_date: row.slot_date,
          start_time: row.start_time,
          end_time: row.end_time,
          slot_duration: row.slot_duration,
          is_video_enabled: row.is_video_enabled,
          is_clinic_enabled: row.is_clinic_enabled,
          is_active: row.is_active,
        }));
        ({ error: insertFallbackError } = await supabaseAdmin
          .from('doctor_slots')
          .insert(compatibleRows));
      }

      if (insertFallbackError) {
        console.error('insertFallbackError details:', insertFallbackError);
        throw new ApiError(400, 'Failed to update slots');
      }
    }

    // Fetch the newly inserted slots to return
    const { data: newSlots, error: fetchError } = await supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (fetchError) {
      throw new ApiError(400, 'Failed to fetch updated slots');
    }

    return newSlots;
  }
  
  // ============================
  // LEAVE MANAGEMENT (Global + Organization-Specific)
  // ============================
  
  /**
   * Helper to query affected appointments for a proposed or active leave
   */
  async _findAffectedAppointments(doctorId, leaveQuery) {
    const {
      startDate,
      endDate,
      startTime = null,
      endTime = null,
      scope = 'global',
      organizationType = null,
      organizationId = null,
    } = leaveQuery;

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        id, appointment_number, appointment_date, time_slot, duration_minutes,
        type, status, reason, reason_for_visit, clinic_id, hospital_id,
        patient:patients(id, name, user_id),
        clinic:clinics(id, name),
        hospital:hospitals(id, name)
      `)
      .eq('doctor_id', doctorId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    if (scope === 'organization' && organizationId) {
      if (organizationType === 'clinic') {
        query = query.eq('clinic_id', organizationId);
      } else if (organizationType === 'hospital') {
        query = query.eq('hospital_id', organizationId);
      }
    }

    const { data: rawAppts, error } = await query;
    if (error) {
      console.error('Failed to query affected appointments', error);
      return [];
    }

    const appts = rawAppts || [];
    if (!startTime || !endTime) {
      return appts;
    }

    // Partial day interval filter: [appt_start, appt_end) vs [leave_start, leave_end)
    const leaveStartMins = toMinutes(startTime.length > 5 ? startTime.slice(0, 5) : startTime);
    const leaveEndMins = toMinutes(endTime.length > 5 ? endTime.slice(0, 5) : endTime);

    if (leaveStartMins === null || leaveEndMins === null) {
      return appts;
    }

    return appts.filter(a => {
      if (!a.time_slot) return true;
      const ts = a.time_slot.length > 5 ? a.time_slot.slice(0, 5) : a.time_slot;
      const apptStartMins = toMinutes(ts);
      if (apptStartMins === null) return true;
      const apptDuration = a.duration_minutes || 15;
      const apptEndMins = apptStartMins + apptDuration;

      // Overlap: max(start1, start2) < min(end1, end2)
      return Math.max(apptStartMins, leaveStartMins) < Math.min(apptEndMins, leaveEndMins);
    });
  }

  /**
   * Preview affected appointments before submitting leave
   */
  async checkAffectedAppointments(userId, leaveData) {
    const doctor = await this._resolveDoctor(userId);
    if (!leaveData.start_date || !leaveData.end_date) {
      throw new ApiError(400, 'Start date and end date are required');
    }

    const affected = await this._findAffectedAppointments(doctor.id, {
      startDate: leaveData.start_date,
      endDate: leaveData.end_date,
      startTime: leaveData.leave_type === 'partial_day' ? leaveData.start_time : null,
      endTime: leaveData.leave_type === 'partial_day' ? leaveData.end_time : null,
      scope: leaveData.scope || 'global',
      organizationType: leaveData.organization_type || null,
      organizationId: leaveData.organization_id || null,
    });

    return {
      affected_count: affected.length,
      appointments: affected.map(a => ({
        id: a.id,
        appointment_number: a.appointment_number,
        date: a.appointment_date,
        time: a.time_slot,
        patient_name: a.patient?.name || 'Patient',
        consultation_type: a.type,
        organization_name: a.clinic?.name || a.hospital?.name || (a.type === 'video' ? 'Video' : 'Organization'),
      })),
    };
  }

  async getLeaves(userId) {
    const doctor = await this._resolveDoctor(userId);
    
    let leaves = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('doctor_leaves')
        .select('*')
        .eq('doctor_id', doctor.id)
        .order('start_date', { ascending: false });

      if (error) {
        if (isMissingSchemaError(error)) {
          throw new ApiError(503, 'LEAVE_FEATURE_UNAVAILABLE: Database migration 075 for doctor leaves is pending. Please run 075_doctor_leaves_management.sql.');
        }
        throw error;
      }
      leaves = data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'Failed to fetch doctor leaves');
    }

    // Populate organization names and compute affected appointment summary
    const enrichedLeaves = await Promise.all(leaves.map(async (leave) => {
      let orgName = null;
      if (leave.scope === 'organization' && (leave.organization_id || leave.clinic_id || leave.hospital_id)) {
        const orgId = leave.organization_id || leave.clinic_id || leave.hospital_id;
        if (leave.organization_type === 'clinic' || leave.clinic_id) {
          const { data: clinic } = await supabaseAdmin.from('clinics').select('name').eq('id', orgId).maybeSingle();
          orgName = clinic?.name || 'Clinic';
        } else if (leave.organization_type === 'hospital' || leave.hospital_id) {
          const { data: hosp } = await supabaseAdmin.from('hospitals').select('name').eq('id', orgId).maybeSingle();
          orgName = hosp?.name || 'Hospital';
        }
      }

      return {
        ...leave,
        organization_name: orgName,
        status: leave.status || 'active',
      };
    }));

    return enrichedLeaves;
  }
  
  async addLeave(userId, leaveData) {
    const doctor = await this._resolveDoctor(userId);
    
    const {
      start_date,
      end_date,
      reason = null,
      scope = 'global',
      organization_type = null,
      organization_id = null,
      leave_type = 'full_day',
      start_time = null,
      end_time = null,
    } = leaveData;

    if (!start_date || !end_date) {
      throw new ApiError(400, 'Start date and end date are required');
    }
    if (end_date < start_date) {
      throw new ApiError(400, 'End date cannot be earlier than start date');
    }

    const today = new Date().toISOString().split('T')[0];
    if (end_date < today) {
      throw new ApiError(400, 'Cannot request leave in the past');
    }

    if (leave_type === 'partial_day') {
      if (!start_time || !end_time) {
        throw new ApiError(400, 'Start time and end time are required for partial-day leave');
      }
      const sMins = toMinutes(start_time.length > 5 ? start_time.slice(0, 5) : start_time);
      const eMins = toMinutes(end_time.length > 5 ? end_time.slice(0, 5) : end_time);
      if (sMins === null || eMins === null || eMins <= sMins) {
        throw new ApiError(400, 'End time must be after start time');
      }
    }

    if (scope === 'organization') {
      if (!organization_type || !['clinic', 'hospital'].includes(organization_type)) {
        throw new ApiError(400, 'Organization type must be clinic or hospital');
      }
      if (!organization_id) {
        throw new ApiError(400, 'Organization ID is required for organization-specific leave');
      }

      // Verify active affiliation with the organization
      if (organization_type === 'clinic') {
        const { data: aff, error: affErr } = await supabaseAdmin
          .from('clinic_doctors')
          .select('id, is_active')
          .eq('doctor_id', doctor.id)
          .eq('clinic_id', organization_id)
          .maybeSingle();

        if (affErr || !aff || !aff.is_active) {
          throw new ApiError(400, 'You do not have an active affiliation with this clinic');
        }
      } else if (organization_type === 'hospital') {
        const { data: aff, error: affErr } = await supabaseAdmin
          .from('hospital_doctors')
          .select('id, is_active')
          .eq('doctor_id', doctor.id)
          .eq('hospital_id', organization_id)
          .maybeSingle();

        if (affErr || !aff || !aff.is_active) {
          throw new ApiError(400, 'You do not have an active affiliation with this hospital');
        }
      }
    }

    // ── Check for conflicting / duplicate overlapping active leaves ──
    try {
      const { data: existingActiveLeaves } = await supabaseAdmin
        .from('doctor_leaves')
        .select('*')
        .eq('doctor_id', doctor.id)
        .lte('start_date', end_date)
        .gte('end_date', start_date);

      const activeOnly = (existingActiveLeaves || []).filter(l => !l.status || l.status === 'active');
      
      const newLeaveStartMins = leave_type === 'partial_day' ? toMinutes(start_time.slice(0, 5)) : 0;
      const newLeaveEndMins = leave_type === 'partial_day' ? toMinutes(end_time.slice(0, 5)) : 1440;

      for (const ex of activeOnly) {
        const isExGlobal = !ex.scope || ex.scope === 'global';
        const isNewGlobal = scope === 'global';
        const sameOrg = (ex.organization_id === organization_id) || (ex.clinic_id === organization_id) || (ex.hospital_id === organization_id);

        // If either is global or both target the same organization
        if (isExGlobal || isNewGlobal || sameOrg) {
          const exStartMins = (ex.leave_type === 'partial_day' && ex.start_time) ? toMinutes(ex.start_time.slice(0, 5)) : 0;
          const exEndMins = (ex.leave_type === 'partial_day' && ex.end_time) ? toMinutes(ex.end_time.slice(0, 5)) : 1440;

          if (exStartMins !== null && exEndMins !== null && newLeaveStartMins !== null && newLeaveEndMins !== null) {
            if (Math.max(newLeaveStartMins, exStartMins) < Math.min(newLeaveEndMins, exEndMins)) {
              throw new ApiError(409, `An active ${isExGlobal ? 'global' : 'organization'} leave already overlaps with this requested time.`);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (!isMissingSchemaError(err)) throw err;
    }

    // ── Find Affected Appointments ──
    const affectedAppointments = await this._findAffectedAppointments(doctor.id, {
      startDate: start_date,
      endDate: end_date,
      startTime: leave_type === 'partial_day' ? start_time : null,
      endTime: leave_type === 'partial_day' ? end_time : null,
      scope,
      organizationType: organization_type,
      organizationId: organization_id,
    });

    // ── Insert Leave ──
    let insertedLeave = null;
    const nowIso = new Date().toISOString();
    try {
      const { data, error } = await supabaseAdmin
        .from('doctor_leaves')
        .insert({
          doctor_id: doctor.id,
          scope,
          organization_type: scope === 'organization' ? organization_type : null,
          organization_id: scope === 'organization' ? organization_id : null,
          clinic_id: (scope === 'organization' && organization_type === 'clinic') ? organization_id : null,
          hospital_id: (scope === 'organization' && organization_type === 'hospital') ? organization_id : null,
          leave_type,
          start_date,
          end_date,
          start_time: leave_type === 'partial_day' ? start_time : null,
          end_time: leave_type === 'partial_day' ? end_time : null,
          reason: reason || null,
          status: 'active',
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (error) {
        if (isMissingSchemaError(error)) {
          throw new ApiError(503, 'LEAVE_FEATURE_UNAVAILABLE: Database migration 075 for doctor leaves is pending. Please run 075_doctor_leaves_management.sql.');
        }
        // Fallback: If advanced columns don't exist yet, try base schema
        if (error.code === '42703' || error.code === 'PGRST204') {
          const { data: baseData, error: baseError } = await supabaseAdmin
            .from('doctor_leaves')
            .insert({
              doctor_id: doctor.id,
              start_date,
              end_date,
              reason: reason || null,
            })
            .select()
            .single();
          if (baseError) throw baseError;
          insertedLeave = baseData;
        } else {
          throw error;
        }
      } else {
        insertedLeave = data;
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, `Failed to add leave: ${err.message || 'database error'}`);
    }

    // ── Notify Affected Patients via Existing notificationService ──
    if (affectedAppointments.length > 0) {
      for (const appt of affectedAppointments) {
        const patientUserId = appt.patient?.user_id;
        if (patientUserId) {
          notificationService.sendNotification(patientUserId, {
            title: 'Doctor Schedule Update / Time Off Notice',
            message: `Dr. ${doctor.name} has scheduled time off during your appointment on ${appt.appointment_date} at ${appt.time_slot?.slice(0, 5) || ''}. Our support team will assist with rescheduling if needed.`,
            type: 'appointment_leave_notice',
            category: 'appointment',
            data: {
              appointmentId: appt.id,
              doctorId: doctor.id,
              appointmentDate: appt.appointment_date,
            },
            action_url: `/patient/appointments/${appt.id}`,
          }).catch(err => console.error('Failed to notify patient of doctor leave', err));
        }
      }
    }

    return {
      ...insertedLeave,
      affected_appointments_count: affectedAppointments.length,
    };
  }
  
  async cancelLeave(userId, leaveId) {
    const doctor = await this._resolveDoctor(userId);
    
    // Attempt soft cancellation (status = 'cancelled')
    const { data, error } = await supabaseAdmin
      .from('doctor_leaves')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', leaveId)
      .eq('doctor_id', doctor.id)
      .select()
      .maybeSingle();
      
    if (error) {
      if (isMissingSchemaError(error)) {
        throw new ApiError(503, 'LEAVE_FEATURE_UNAVAILABLE: Database migration 075 for doctor leaves is pending.');
      }
      // If status column is missing, perform delete fallback
      if (error.code === '42703' || error.code === 'PGRST204') {
        const { error: delErr } = await supabaseAdmin
          .from('doctor_leaves')
          .delete()
          .eq('id', leaveId)
          .eq('doctor_id', doctor.id);
        if (delErr) throw delErr;
        return { success: true, status: 'cancelled' };
      }
      throw new ApiError(400, 'Failed to cancel leave');
    }

    if (!data) {
      throw new ApiError(404, 'Leave record not found');
    }

    return { success: true, ...data };
  }

  async deleteLeave(userId, leaveId) {
    return this.cancelLeave(userId, leaveId);
  }

  // Get patients list (for doctor)
  async getPatients(userId, page = 1, limit = 20, search = '', filter = 'all', sort = 'recent') {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const { offset } = paginate(page, limit);

    const patientSelect = `
      id, name, date_of_birth, gender, blood_group, profile_image_url,
      user:users(email, phone)
    `;

    const [appointmentsResult, consultationsResult] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select(`
          patient_id,
          appointment_date,
          created_at,
          patient:patients(${patientSelect})
        `)
        .eq('doctor_id', doctor.id)
        .order('appointment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('consultations')
        .select(`
          patient_id,
          started_at,
          ended_at,
          created_at,
          patient:patients(${patientSelect})
        `)
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false }),
    ]);

    if (appointmentsResult.error) throw appointmentsResult.error;
    if (consultationsResult.error) throw consultationsResult.error;

    const patientEvents = [
      ...(appointmentsResult.data || []).map((appointment) => ({
        patient: appointment.patient,
        lastVisit: appointment.appointment_date || appointment.created_at || null,
      })),
      ...(consultationsResult.data || []).map((consultation) => ({
        patient: consultation.patient,
        lastVisit: consultation.started_at || consultation.ended_at || consultation.created_at || null,
      })),
    ];

    const patientMap = new Map();
    patientEvents.forEach((event) => {
      if (!event.patient) return;

      const existing = patientMap.get(event.patient.id);
      const lastVisit = event.lastVisit;

      if (!existing) {
        patientMap.set(event.patient.id, {
          id: event.patient.id,
          name: event.patient.name,
          age: calculateAge(event.patient.date_of_birth),
          dateOfBirth: event.patient.date_of_birth || null,
          gender: event.patient.gender,
          bloodGroup: event.patient.blood_group,
          profileImageUrl: event.patient.profile_image_url,
          email: event.patient.user?.email || null,
          phone: event.patient.user?.phone || null,
          lastVisit,
          totalVisits: 1,
        });
        return;
      }

      existing.totalVisits += 1;
      if (lastVisit && (!existing.lastVisit || new Date(lastVisit) > new Date(existing.lastVisit))) {
        existing.lastVisit = lastVisit;
      }
    });

    let patients = Array.from(patientMap.values());
    const normalizedSearch = sanitizeSearch(search)?.toLowerCase();
    if (normalizedSearch) {
      patients = patients.filter((patient) =>
        [patient.name, patient.email, patient.phone]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch))
      );
    }

    if (filter === 'last_7_days') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      patients = patients.filter(p => p.lastVisit && new Date(p.lastVisit) >= weekAgo);
    } else if (filter === 'last_30_days') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      patients = patients.filter(p => p.lastVisit && new Date(p.lastVisit) >= monthAgo);
    }

    if (sort === 'frequent') {
      patients.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0));
    } else if (sort === 'oldest') {
      patients.sort((a, b) => {
        const left = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const right = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        return left - right;
      });
    } else {
      // default: recent
      patients.sort((a, b) => {
        const left = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        const right = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        return left - right;
      });
    }
    const paginatedPatients = patients.slice(offset, offset + limit);

    return paginatedResponse(paginatedPatients, patients.length, page, limit);
  }

  async getHospitalInvites(userId) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const nowIso = new Date().toISOString();

    // Expire stale pending invites (best-effort cleanup)
    await supabaseAdmin
      .from('hospital_doctor_invites')
      .update({ status: 'expired', responded_at: nowIso })
      .eq('doctor_id', doctor.id)
      .eq('status', 'pending')
      .lt('expires_at', nowIso);

    const { data: invites, error } = await supabaseAdmin
      .from('hospital_doctor_invites')
      .select(`
        id,
        hospital_id,
        doctor_id,
        department,
        schedule,
        status,
        created_at,
        responded_at,
        expires_at,
        practice_type,
        consultation_modes,
        fee_amount,
        payout_terms,
        start_date,
        hospital:hospitals(id, name, city, address),
        invitedBy:users!hospital_doctor_invites_invited_by_fkey(id, name, email)
      `)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: activeDoctors, error: adError } = await supabaseAdmin
      .from('hospital_doctors')
      .select(`
        id,
        hospital_id,
        doctor_id,
        department,
        schedule,
        joined_at,
        hospital:hospitals(id, name, city, address)
      `)
      .eq('doctor_id', doctor.id)
      .eq('is_active', true);

    if (adError) throw adError;

    const synthesizedInvites = (activeDoctors || []).map(hd => ({
      id: hd.id,
      hospital_id: hd.hospital_id,
      doctor_id: hd.doctor_id,
      department: hd.department,
      schedule: hd.schedule,
      status: 'accepted',
      created_at: hd.joined_at,
      responded_at: hd.joined_at,
      expires_at: null,
      practice_type: 'visiting',
      consultation_modes: ['in_clinic'],
      fee_amount: null,
      payout_terms: null,
      start_date: hd.joined_at,
      hospital: hd.hospital,
      invitedBy: null
    }));

    const result = [...(invites || [])];
    // Avoid duplicates if a doctor has an accepted invite AND an active record
    for (const s of synthesizedInvites) {
      if (!result.find(r => r.hospital_id === s.hospital_id && r.status === 'accepted')) {
        result.push(s);
      }
    }

    return result;
  }

  async respondHospitalInvite(userId, inviteId, decision, options = {}) {
    const action = (decision || '').toLowerCase();
    if (!['accept', 'reject', 'changes_requested'].includes(action)) {
      throw new ApiError(400, 'Decision must be accept, reject, or changes_requested');
    }

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, hospital_id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('hospital_doctor_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('doctor_id', doctor.id)
      .single();

    if (inviteError || !invite) {
      throw new ApiError(404, 'Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new ApiError(409, `Invite already ${invite.status}`);
    }

    const nowIso = new Date().toISOString();
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from('hospital_doctor_invites')
        .update({ status: 'expired', responded_at: nowIso })
        .eq('id', invite.id);
      throw new ApiError(400, 'Invite has expired');
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('hospital_doctor_invites')
        .update({ status: 'rejected', responded_at: nowIso })
        .eq('id', invite.id);

      if (error) throw error;
      return { message: 'Invite rejected successfully' };
    }

    if (action === 'changes_requested') {
      const { error } = await supabaseAdmin
        .from('hospital_doctor_invites')
        .update({ 
          status: 'changes_requested', 
          responded_at: nowIso,
          counter_proposal: options.counterProposal || null
        })
        .eq('id', invite.id);

      if (error) throw error;
      return { message: 'Changes requested successfully' };
    }

    // Accept flow
    const { data: existingAssoc } = await supabaseAdmin
      .from('hospital_doctors')
      .select('id, is_active')
      .eq('hospital_id', invite.hospital_id)
      .eq('doctor_id', doctor.id)
      .maybeSingle();

    if (!existingAssoc) {
      const { error: assocError } = await supabaseAdmin
        .from('hospital_doctors')
        .insert({
          hospital_id: invite.hospital_id,
          doctor_id: doctor.id,
          department: invite.department,
          schedule: invite.schedule || {},
          is_active: true,
        });

      if (assocError) throw assocError;
    } else if (existingAssoc.is_active === false) {
      const { error: assocError } = await supabaseAdmin
        .from('hospital_doctors')
        .update({
          department: invite.department,
          schedule: invite.schedule || {},
          is_active: true,
          joined_at: nowIso,
        })
        .eq('id', existingAssoc.id);

      if (assocError) throw assocError;
    }

    const { error: inviteUpdateError } = await supabaseAdmin
      .from('hospital_doctor_invites')
      .update({ status: 'accepted', responded_at: nowIso })
      .eq('id', invite.id);

    if (inviteUpdateError) throw inviteUpdateError;

    // Keep legacy single-hospital field in sync with the most recently
    // accepted hospital association.
    await supabaseAdmin
      .from('doctors')
      .update({ hospital_id: invite.hospital_id })
      .eq('id', doctor.id);

    return { message: 'Invite accepted. Hospital assigned successfully.' };
  }

  async getClinicInvites(userId) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from('clinic_doctor_invites')
      .update({ status: 'expired', responded_at: nowIso })
      .eq('doctor_id', doctor.id)
      .eq('status', 'pending')
      .lt('expires_at', nowIso);

    const { data: invites, error } = await supabaseAdmin
      .from('clinic_doctor_invites')
      .select(`
        id,
        clinic_id,
        doctor_id,
        status,
        created_at,
        responded_at,
        expires_at,
        practice_type,
        consultation_modes,
        schedule,
        fee_amount,
        payout_terms,
        start_date,
        clinic:clinics(id, name, city, address),
        invitedBy:users!clinic_doctor_invites_invited_by_fkey(id, name, email)
      `)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: activeDoctors, error: adError } = await supabaseAdmin
      .from('clinic_doctors')
      .select(`
        id,
        clinic_id,
        doctor_id,
        schedule,
        joined_at,
        consultation_fee,
        clinic:clinics(id, name, city, address)
      `)
      .eq('doctor_id', doctor.id)
      .eq('is_active', true);

    if (adError) throw adError;

    const synthesizedInvites = (activeDoctors || []).map(cd => ({
      id: cd.id,
      clinic_id: cd.clinic_id,
      doctor_id: cd.doctor_id,
      schedule: cd.schedule,
      status: 'accepted',
      created_at: cd.joined_at,
      responded_at: cd.joined_at,
      expires_at: null,
      practice_type: 'visiting',
      consultation_modes: ['in_clinic'],
      fee_amount: cd.consultation_fee,
      payout_terms: null,
      start_date: cd.joined_at,
      clinic: cd.clinic,
      invitedBy: null
    }));

    const result = [...(invites || [])];
    for (const s of synthesizedInvites) {
      if (!result.find(r => r.clinic_id === s.clinic_id && r.status === 'accepted')) {
        result.push(s);
      }
    }

    return result;
  }

  async respondClinicInvite(userId, inviteId, decision, options = {}) {
    const action = (decision || '').toLowerCase();
    if (!['accept', 'reject', 'changes_requested'].includes(action)) {
      throw new ApiError(400, 'Decision must be accept, reject, or changes_requested');
    }

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('clinic_doctor_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('doctor_id', doctor.id)
      .single();

    if (inviteError || !invite) {
      throw new ApiError(404, 'Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new ApiError(409, `Invite already ${invite.status}`);
    }

    const nowIso = new Date().toISOString();
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from('clinic_doctor_invites')
        .update({ status: 'expired', responded_at: nowIso })
        .eq('id', invite.id);
      throw new ApiError(400, 'Invite has expired');
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('clinic_doctor_invites')
        .update({ status: 'rejected', responded_at: nowIso })
        .eq('id', invite.id);

      if (error) throw error;
      await this.notifyClinicOwnerOfResponse(invite.clinic_id, invite.id, 'rejected', doctor.id);
      return { message: 'Invite rejected successfully' };
    }

    if (action === 'changes_requested') {
      const { error } = await supabaseAdmin
        .from('clinic_doctor_invites')
        .update({ 
          status: 'changes_requested', 
          responded_at: nowIso,
          counter_proposal: options.counterProposal || null
        })
        .eq('id', invite.id);

      if (error) throw error;
      await this.notifyClinicOwnerOfResponse(invite.clinic_id, invite.id, 'changes_requested', doctor.id);
      return { message: 'Changes requested successfully' };
    }

    const { data: existingAssoc } = await supabaseAdmin
      .from('clinic_doctors')
      .select('id, is_active')
      .eq('clinic_id', invite.clinic_id)
      .eq('doctor_id', doctor.id)
      .maybeSingle();

    if (!existingAssoc) {
      const { error: assocError } = await supabaseAdmin
        .from('clinic_doctors')
        .insert({
          clinic_id: invite.clinic_id,
          doctor_id: doctor.id,
          is_active: true,
        });

      if (assocError) throw assocError;
    } else if (existingAssoc.is_active === false) {
      const { error: assocError } = await supabaseAdmin
        .from('clinic_doctors')
        .update({
          is_active: true,
          joined_at: nowIso,
        })
        .eq('id', existingAssoc.id);

      if (assocError) throw assocError;
    }

    const { error: inviteUpdateError } = await supabaseAdmin
      .from('clinic_doctor_invites')
      .update({ status: 'accepted', responded_at: nowIso })
      .eq('id', invite.id);

    if (inviteUpdateError) throw inviteUpdateError;

    await this.notifyClinicOwnerOfResponse(invite.clinic_id, invite.id, 'accepted', doctor.id);

    return { message: 'Invite accepted. Clinic assigned successfully.' };
  }

  // Cross-portal sync: when a doctor accepts/rejects a clinic invite, the
  // clinic owner gets a persisted notification + real-time event so the
  // Clinic Portal reflects the decision without a manual refresh.
  async notifyClinicOwnerOfResponse(clinicId, inviteId, decision, doctorId) {
    try {
      const [{ data: clinic }, { data: doctor }] = await Promise.all([
        supabaseAdmin.from('clinics').select('owner_id, name').eq('id', clinicId).maybeSingle(),
        supabaseAdmin.from('doctors').select('name').eq('id', doctorId).maybeSingle(),
      ]);

      const ownerId = clinic?.owner_id;
      if (!ownerId) return;

      const doctorName = doctor?.name || 'A doctor';
      const payload = { inviteId, clinicId, decision, doctorId };

      eventEmitter.notifyUser(ownerId, 'clinic:invite-updated', payload);

      await notificationService.sendNotification(ownerId, {
        title: decision === 'accepted' ? '✅ Doctor Joined Your Clinic' : '😔 Doctor Declined Invitation',
        message: decision === 'accepted'
          ? `${doctorName} accepted your invitation and joined ${clinic.name}.`
          : `${doctorName} declined your invitation to ${clinic.name}.`,
        type: 'clinic_invite_response',
        data: { ...payload, clinicName: clinic?.name },
      });
    } catch (err) {
      console.error(`[DoctorService] notifyClinicOwnerOfResponse failed: ${err.message}`);
    }
  }

  // Get patient details (for doctor)
  async getPatientDetails(userId, patientId) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const [{ data: hasAppointment }, { data: hasConsultation }] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .limit(1)
        .maybeSingle(),
    ]);

    if (!hasAppointment && !hasConsultation) {
      throw new ApiError(403, 'You can only view details of your patients');
    }

    const grant = await getActivePatientRecordGrant(patientId, doctor.id);

    let guardianAnalytics = null;
    if (grant) {
      try {
        const cached = await cacheGet(`record_access_analytics:${grant.id}`);
        if (cached) {
          guardianAnalytics = typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
      } catch (err) {
        console.error('Failed to get guardian analytics', err);
      }
    }

    const [
      { data: patient },
      { data: consultations },
      { data: appointments },
      { data: sharedConsultations },
      { data: sharedPrescriptions },
      fullHistoryReportsResult,
      explicitlySharedReports,
      { data: internalNotes },
    ] = await Promise.all([
      supabaseAdmin
        .from('patients')
        .select(`
          *,
          user:users(email, phone)
        `)
        .eq('id', patientId)
        .single(),
      supabaseAdmin
        .from('consultations')
        .select(`
          *,
          prescriptions(*)
        `)
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('appointments')
        .select('id, appointment_date, time_slot, type, status, reason, fee, notes, created_at')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      grant
        ? supabaseAdmin
          .from('consultations')
          .select(`
            id,
            created_at,
            status,
            diagnosis,
            notes,
            doctor:doctors(id, name, specialization, profile_image_url),
            appointment:appointments(id, appointment_date, time_slot, type)
          `)
          .eq('patient_id', patientId)
          .neq('doctor_id', doctor.id)
          .order('created_at', { ascending: false })
          .limit(12)
        : Promise.resolve({ data: [] }),
      grant
        ? supabaseAdmin
          .from('prescriptions')
          .select(`
            id,
            diagnosis,
            notes,
            status,
            created_at,
            doctor:doctors(id, name, specialization, profile_image_url),
            prescription_medicines(*)
          `)
          .eq('patient_id', patientId)
          .neq('doctor_id', doctor.id)
          .order('created_at', { ascending: false })
          .limit(12)
        : Promise.resolve({ data: [] }),
      grant
        ? supabaseAdmin
          .from('reports')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(10)
        : Promise.resolve({ data: [] }),
      grant ? Promise.resolve([]) : getExplicitlySharedReports(patientId, doctor.id),
      supabaseAdmin
        .from('doctor_patient_notes')
        .select('notes')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .maybeSingle(),
    ]);

    const totalVisits = Math.max(appointments?.length || 0, consultations?.length || 0);
    const appointmentLastVisit = appointments?.[0]?.appointment_date || appointments?.[0]?.created_at || null;
    const consultationLastVisit = consultations?.[0]?.started_at || consultations?.[0]?.ended_at || consultations?.[0]?.created_at || null;
    const lastVisit = [appointmentLastVisit, consultationLastVisit]
      .filter(Boolean)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;
    const visibleReports = grant
      ? (fullHistoryReportsResult?.data || [])
      : explicitlySharedReports;

    const payload = {
      ...patient,
      age: calculateAge(patient?.date_of_birth),
      email: patient?.user?.email || null,
      phone: patient?.user?.phone || null,
      totalVisits,
      lastVisit,
      appointments: appointments || [],
      consultations: consultations || [],
      sharedConsultations: sharedConsultations || [],
      sharedPrescriptions: sharedPrescriptions || [],
      reports: visibleReports || [],
      recordAccess: {
        hasFullHistoryAccess: Boolean(grant),
        grantedAt: grant?.granted_at || null,
        expiresAt: grant?.expires_at || null,
        reportVisibility: grant ? 'all' : ((visibleReports || []).length > 0 ? 'shared_only' : 'none'),
        guardianAnalytics: guardianAnalytics,
      },
      internalNotes: internalNotes?.notes || '',
    };

    return await signStorageUrlsInPayload(payload);
  }

  async updatePatientMedicalHistory(userId, patientId, { allergies, chronic_conditions, current_medications }) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!doctor) throw new ApiError(404, 'Doctor profile not found');

    const [{ data: hasAppt }, { data: hasConsult }] = await Promise.all([
      supabaseAdmin.from('appointments').select('id').eq('doctor_id', doctor.id).eq('patient_id', patientId).limit(1).maybeSingle(),
      supabaseAdmin.from('consultations').select('id').eq('doctor_id', doctor.id).eq('patient_id', patientId).limit(1).maybeSingle(),
    ]);

    if (!hasAppt && !hasConsult) {
      throw new ApiError(403, 'You can only update details of your patients');
    }

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .update({
        allergies: allergies || [],
        chronic_conditions: chronic_conditions || [],
        current_medications: current_medications || [],
      })
      .eq('id', patientId)
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return patient;
  }

  async updatePatientInternalNotes(userId, patientId, notes) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!doctor) throw new ApiError(404, 'Doctor profile not found');

    const { data, error } = await supabaseAdmin
      .from('doctor_patient_notes')
      .upsert({
        doctor_id: doctor.id,
        patient_id: patientId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'doctor_id,patient_id' })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return data;
  }

  async getPatientAlerts(userId) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!doctor) throw new ApiError(404, 'Doctor profile not found');

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', doctor.id);

    const patientIds = [...new Set((appointments || []).map(a => a.patient_id))];
    if (patientIds.length === 0) return [];

    const { data: vitals, error } = await supabaseAdmin
      .from('patient_vitals')
      .select('*, patients!inner(id, name, date_of_birth, gender, blood_group)')
      .in('patient_id', patientIds)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) throw new ApiError(500, error.message);

    const alerts = [];
    const processedPatients = new Set();
    let idCounter = 1;

    for (const vital of vitals || []) {
      if (processedPatients.has(vital.patient_id)) continue;
      processedPatients.add(vital.patient_id);

      const { blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_level } = vital;
      let severity = null;
      let trigger = [];

      if (blood_pressure_systolic >= 180 || blood_pressure_systolic <= 80 || blood_pressure_diastolic >= 110 || blood_pressure_diastolic <= 50) {
        severity = 'critical';
        trigger.push(`Blood Pressure: ${blood_pressure_systolic}/${blood_pressure_diastolic} mmHg`);
      } else if (blood_pressure_systolic >= 140 || blood_pressure_systolic <= 90 || blood_pressure_diastolic >= 90 || blood_pressure_diastolic <= 60) {
        severity = severity || 'warning';
        trigger.push(`Blood Pressure: ${blood_pressure_systolic}/${blood_pressure_diastolic} mmHg`);
      }

      if (heart_rate >= 120 || heart_rate <= 50) {
        severity = 'critical';
        trigger.push(`Heart Rate: ${heart_rate} bpm`);
      } else if (heart_rate >= 100 || heart_rate <= 60) {
        severity = severity || 'warning';
        trigger.push(`Heart Rate: ${heart_rate} bpm`);
      }

      if (temperature >= 103 || temperature <= 95) {
        severity = 'critical';
        trigger.push(`Temperature: ${temperature}°F`);
      } else if (temperature >= 100) {
        severity = severity || 'warning';
        trigger.push(`Temperature: ${temperature}°F`);
      }

      if (oxygen_level && oxygen_level < 90) {
        severity = 'critical';
        trigger.push(`SpO2: ${oxygen_level}%`);
      } else if (oxygen_level && oxygen_level < 95) {
        severity = severity || 'warning';
        trigger.push(`SpO2: ${oxygen_level}%`);
      }

      if (severity) {
        const patient = vital.patients;
        const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A';
        
        alerts.push({
          id: idCounter++,
          patientId: vital.patient_id,
          patientName: patient.name || 'Unknown Patient',
          age: age,
          gender: patient.gender ? (patient.gender.toLowerCase() === 'male' ? 'M' : (patient.gender.toLowerCase() === 'female' ? 'F' : 'O')) : 'U',
          bloodGroup: patient.blood_group || 'N/A',
          severity: severity,
          trigger: trigger.join(', '),
          timestamp: 'Recent',
          isRead: false,
          recordedAt: vital.recorded_at
        });
      }
    }

    alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return new Date(b.recordedAt) - new Date(a.recordedAt);
    });

    return alerts;
  }

  async submitForApproval(userId) {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, approval_status, name, specialization, registration_number, government_id_type, government_id_url, degree_certificate_url, license_document_url, live_selfie_url')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    if (doctor.approval_status !== 'draft' && doctor.approval_status !== 'needs_info') {
      throw new ApiError(400, 'Profile is already submitted or in a state that cannot be submitted.');
    }

    // Validate mandatory fields before submission
    const requiredFields = [
      { key: 'name', label: 'Name' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'registration_number', label: 'Registration Number' },
      { key: 'government_id_type', label: 'Government ID Type' },
      { key: 'government_id_url', label: 'Government ID Document' },
      { key: 'degree_certificate_url', label: 'Medical Degree Document' },
      { key: 'license_document_url', label: 'Medical Registration Certificate' },
      { key: 'live_selfie_url', label: 'Live Selfie Verification' }
    ];

    const missingFields = requiredFields.filter(f => !doctor[f.key]);

    if (missingFields.length > 0) {
      throw new ApiError(400, `Cannot submit. Missing required fields: ${missingFields.map(f => f.label).join(', ')}`);
    }

    const { data: updatedDoctor, error } = await supabaseAdmin
      .from('doctors')
      .update({
        approval_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', doctor.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to submit profile for approval');
    }

    await cacheDel(`auth_user:${userId}`);

    // Optional: Log to audit trail
    await supabaseAdmin.from('doctor_profile_audits').insert({
      doctor_id: doctor.id,
      changed_by: userId,
      action: 'submitted_for_approval',
      remarks: 'Doctor submitted profile via registration wizard'
    });

    return { message: 'Profile submitted for review successfully', data: updatedDoctor };
  }

  // ── Doctor Join Requests ──────────────────────────────────────

  /**
   * Doctor requests to join a clinic.
   */
  async requestToJoinClinic(userId, clinicId, requestData = {}) {
    const doctor = await this._resolveDoctor(userId);

    // Verify clinic exists and is active
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name, owner_id, is_active, approval_status')
      .eq('id', clinicId)
      .single();

    if (clinicError || !clinic) throw new ApiError(404, 'Clinic not found');
    if (!clinic.is_active || clinic.approval_status !== 'approved') {
      throw new ApiError(400, 'This clinic is not currently accepting requests');
    }

    // Check if already affiliated
    const { data: existingAffiliation } = await supabaseAdmin
      .from('clinic_doctors')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctor.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existingAffiliation) {
      throw new ApiError(409, 'You are already affiliated with this clinic');
    }

    // Check for existing pending invite from clinic
    const { data: existingInvite } = await supabaseAdmin
      .from('clinic_doctor_invites')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctor.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      throw new ApiError(409, 'This clinic already has a pending invitation for you. Check your invitations.');
    }

    // Insert join request
    const { data: joinRequest, error: insertError } = await supabaseAdmin
      .from('doctor_clinic_join_requests')
      .insert({
        doctor_id: doctor.id,
        clinic_id: clinicId,
        specialization: requestData.specialization || doctor.specialization,
        department: requestData.department || null,
        practice_type: requestData.practiceType || null,
        consultation_modes: requestData.consultationModes || [],
        preferred_days: requestData.preferredDays || [],
        preferred_start_time: requestData.preferredStartTime || null,
        preferred_end_time: requestData.preferredEndTime || null,
        preferred_start_date: requestData.preferredStartDate || null,
        message: requestData.message || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new ApiError(409, 'You already have a pending request for this clinic');
      }
      throw insertError;
    }

    // Notify clinic owner
    if (clinic.owner_id) {
      notificationService.sendNotification(clinic.owner_id, {
        title: 'New Doctor Join Request',
        message: `Dr. ${doctor.name} has requested to join ${clinic.name}`,
        type: 'join_request',
        category: 'clinic',
        data: { joinRequestId: joinRequest.id, doctorId: doctor.id, doctorName: doctor.name },
        action_url: '/clinic/doctors?tab=join-requests',
      }).catch(err => console.error('Failed to notify clinic owner of join request', err));
    }

    return joinRequest;
  }

  /**
   * Doctor requests to join a hospital.
   */
  async requestToJoinHospital(userId, hospitalId, requestData = {}) {
    const doctor = await this._resolveDoctor(userId);

    const { data: hospital, error: hospError } = await supabaseAdmin
      .from('hospitals')
      .select('id, name, owner_id, is_active, approval_status')
      .eq('id', hospitalId)
      .single();

    if (hospError || !hospital) throw new ApiError(404, 'Hospital not found');
    if (!hospital.is_active || hospital.approval_status !== 'approved') {
      throw new ApiError(400, 'This hospital is not currently accepting requests');
    }

    // Check if already affiliated
    const { data: existingAffiliation } = await supabaseAdmin
      .from('hospital_doctors')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('doctor_id', doctor.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existingAffiliation) {
      throw new ApiError(409, 'You are already affiliated with this hospital');
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabaseAdmin
      .from('hospital_doctor_invites')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('doctor_id', doctor.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      throw new ApiError(409, 'This hospital already has a pending invitation for you. Check your invitations.');
    }

    const { data: joinRequest, error: insertError } = await supabaseAdmin
      .from('doctor_hospital_join_requests')
      .insert({
        doctor_id: doctor.id,
        hospital_id: hospitalId,
        specialization: requestData.specialization || doctor.specialization,
        department: requestData.department || null,
        practice_type: requestData.practiceType || null,
        consultation_modes: requestData.consultationModes || [],
        preferred_days: requestData.preferredDays || [],
        preferred_start_time: requestData.preferredStartTime || null,
        preferred_end_time: requestData.preferredEndTime || null,
        preferred_start_date: requestData.preferredStartDate || null,
        message: requestData.message || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new ApiError(409, 'You already have a pending request for this hospital');
      }
      throw insertError;
    }

    // Notify hospital owner
    if (hospital.owner_id) {
      notificationService.sendNotification(hospital.owner_id, {
        title: 'New Doctor Join Request',
        message: `Dr. ${doctor.name} has requested to join ${hospital.name}`,
        type: 'join_request',
        category: 'hospital',
        data: { joinRequestId: joinRequest.id, doctorId: doctor.id, doctorName: doctor.name },
        action_url: '/hospital/doctors?tab=join-requests',
      }).catch(err => console.error('Failed to notify hospital owner of join request', err));
    }

    return joinRequest;
  }

  /**
   * Doctor sees all their join requests (clinic + hospital).
   */
  async getMyJoinRequests(userId) {
    const doctor = await this._resolveDoctor(userId);

    const [clinicRes, hospitalRes] = await Promise.all([
      supabaseAdmin
        .from('doctor_clinic_join_requests')
        .select('*, clinic:clinics(id, name, city, address, profile_image_url, image_url, phone, email, rating)')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('doctor_hospital_join_requests')
        .select('*, hospital:hospitals(id, name, city, address, image_url, phone, email, rating)')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false }),
    ]);

    if (clinicRes.error) throw clinicRes.error;
    if (hospitalRes.error) throw hospitalRes.error;

    const clinicRequests = (clinicRes.data || []).map(r => ({
      ...r,
      organization_type: 'clinic',
      organization: r.clinic,
    }));

    const hospitalRequests = (hospitalRes.data || []).map(r => ({
      ...r,
      organization_type: 'hospital',
      organization: r.hospital,
    }));

    return [...clinicRequests, ...hospitalRequests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Doctor cancels own pending join request.
   */
  async cancelJoinRequest(userId, requestId, type) {
    const doctor = await this._resolveDoctor(userId);
    const table = type === 'clinic' ? 'doctor_clinic_join_requests' : 'doctor_hospital_join_requests';

    const { data: request, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', requestId)
      .eq('doctor_id', doctor.id)
      .single();

    if (error || !request) throw new ApiError(404, 'Join request not found');
    if (request.status !== 'pending') {
      throw new ApiError(409, `Only pending requests can be cancelled (current: ${request.status})`);
    }

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) throw updateError;
    return { id: requestId, status: 'cancelled' };
  }

  /**
   * Doctor responds to a join request counter-proposal (changes_requested)
   */
  async respondJoinRequest(userId, requestId, type, decision, options = {}) {
    const action = (decision || '').toLowerCase();
    if (!['accept', 'reject', 'decline', 'suggest_changes'].includes(action)) {
      throw new ApiError(400, 'Decision must be accept, decline, or suggest_changes');
    }

    const doctor = await this._resolveDoctor(userId);
    const table = type === 'clinic' ? 'doctor_clinic_join_requests' : 'doctor_hospital_join_requests';

    const { data: request, error: requestError } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', requestId)
      .eq('doctor_id', doctor.id)
      .single();

    if (requestError || !request) {
      throw new ApiError(404, 'Join request not found');
    }

    if (request.status !== 'changes_requested') {
      throw new ApiError(409, `Cannot respond to a request with status ${request.status}`);
    }

    const nowIso = new Date().toISOString();

    if (action === 'reject' || action === 'decline') {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ status: 'rejected', updated_at: nowIso })
        .eq('id', requestId);

      if (error) throw error;
      return { message: 'Join request declined' };
    }

    if (action === 'suggest_changes') {
      const { error } = await supabaseAdmin
        .from(table)
        .update({
          status: 'changes_requested',
          updated_at: nowIso,
          practice_type: options.practiceType || request.practice_type,
          consultation_modes: options.consultationModes || request.consultation_modes,
          preferred_days: options.preferredDays || request.preferred_days,
          preferred_start_time: options.preferredStartTime || request.preferred_start_time,
          preferred_end_time: options.preferredEndTime || request.preferred_end_time,
          preferred_start_date: options.preferredStartDate || request.preferred_start_date,
          message: options.message || request.message
        })
        .eq('id', requestId);

      if (error) throw error;
      
      // Notify organization
      if (type === 'clinic') {
         const { data: clinic } = await supabaseAdmin.from('clinics').select('owner_id').eq('id', request.clinic_id).maybeSingle();
         if (clinic && clinic.owner_id) {
           notificationService.sendNotification(clinic.owner_id, {
             title: 'Doctor Suggested Changes',
             message: `Dr. ${doctor.name} suggested changes to the join request`,
             type: 'join_request_update',
             category: 'clinic',
             data: { joinRequestId: requestId }
           }).catch(() => {});
         }
      } else {
         const { data: hospital } = await supabaseAdmin.from('hospitals').select('owner_id').eq('id', request.hospital_id).maybeSingle();
         if (hospital && hospital.owner_id) {
           notificationService.sendNotification(hospital.owner_id, {
             title: 'Doctor Suggested Changes',
             message: `Dr. ${doctor.name} suggested changes to the join request`,
             type: 'join_request_update',
             category: 'hospital',
             data: { joinRequestId: requestId }
           }).catch(() => {});
         }
      }

      return { message: 'Changes suggested successfully' };
    }

    // Accept flow
    if (type === 'hospital') {
      const { data: existingAssoc } = await supabaseAdmin
        .from('hospital_doctors')
        .select('id, is_active')
        .eq('hospital_id', request.hospital_id)
        .eq('doctor_id', doctor.id)
        .maybeSingle();

      if (!existingAssoc) {
        const { error: assocError } = await supabaseAdmin
          .from('hospital_doctors')
          .insert({
            hospital_id: request.hospital_id,
            doctor_id: doctor.id,
            department: request.department,
            schedule: {},
            is_active: true,
            joined_at: nowIso
          });
        if (assocError) throw assocError;
      } else if (existingAssoc.is_active === false) {
        const { error: assocError } = await supabaseAdmin
          .from('hospital_doctors')
          .update({
            department: request.department,
            is_active: true,
            joined_at: nowIso,
          })
          .eq('id', existingAssoc.id);
        if (assocError) throw assocError;
      }
    } else {
      const { data: existingAssoc } = await supabaseAdmin
        .from('clinic_doctors')
        .select('id, is_active')
        .eq('clinic_id', request.clinic_id)
        .eq('doctor_id', doctor.id)
        .maybeSingle();

      if (!existingAssoc) {
        const { error: assocError } = await supabaseAdmin
          .from('clinic_doctors')
          .insert({
            clinic_id: request.clinic_id,
            doctor_id: doctor.id,
            consultation_fee: 0,
            schedule: {},
            is_active: true,
            joined_at: nowIso
          });
        if (assocError) throw assocError;
      } else if (existingAssoc.is_active === false) {
        const { error: assocError } = await supabaseAdmin
          .from('clinic_doctors')
          .update({
            is_active: true,
            joined_at: nowIso,
          })
          .eq('id', existingAssoc.id);
        if (assocError) throw assocError;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ status: 'accepted', updated_at: nowIso })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Notify organization
    if (type === 'clinic') {
        const { data: clinic } = await supabaseAdmin.from('clinics').select('owner_id').eq('id', request.clinic_id).maybeSingle();
        if (clinic && clinic.owner_id) {
          notificationService.sendNotification(clinic.owner_id, {
            title: 'Join Request Accepted',
            message: `Dr. ${doctor.name} has accepted the counter-proposal and joined the clinic`,
            type: 'join_request_accepted',
            category: 'clinic',
            data: { joinRequestId: requestId }
          }).catch(() => {});
        }
    } else {
        const { data: hospital } = await supabaseAdmin.from('hospitals').select('owner_id').eq('id', request.hospital_id).maybeSingle();
        if (hospital && hospital.owner_id) {
          notificationService.sendNotification(hospital.owner_id, {
            title: 'Join Request Accepted',
            message: `Dr. ${doctor.name} has accepted the counter-proposal and joined the hospital`,
            type: 'join_request_accepted',
            category: 'hospital',
            data: { joinRequestId: requestId }
          }).catch(() => {});
        }
    }

    if (type === 'hospital') {
      await supabaseAdmin
        .from('doctors')
        .update({ hospital_id: request.hospital_id })
        .eq('id', doctor.id);
    }

    return { message: 'Counter-proposal accepted. Affiliation created successfully.' };
  }

  // ============================
  // ORGANIZATION-SPECIFIC SCHEDULING
  // ============================

  /**
   * Return the authenticated doctor's ACTIVE affiliations (clinics + hospitals).
   * Used to populate the "Organization" dropdown when creating an In-Person schedule.
   * Only organizations the doctor is actively affiliated with AND that are active
   * are returned — never arbitrary clinics/hospitals.
   */
  async getMyOrganizations(userId) {
    const doctor = await this._resolveDoctor(userId);

    const [clinicsRes, hospitalsRes] = await Promise.all([
      supabaseAdmin
        .from('clinic_doctors')
        .select(`
          clinic_id, consultation_fee, schedule,
          clinic:clinics(id, name, image_url, profile_image_url, address, city, state, is_active, is_approved, opening_hours, is_24_hours)
        `)
        .eq('doctor_id', doctor.id)
        .neq('is_active', false),  // matches true AND null — never drops rows with unset is_active
      supabaseAdmin
        .from('hospital_doctors')
        .select(`
          hospital_id, department, designation, schedule,
          hospital:hospitals(id, name, image_url, address, city, state, is_active, opening_time, closing_time, is_24_hours)
        `)
        .eq('doctor_id', doctor.id)
        .neq('is_active', false),  // matches true AND null — never drops rows with unset is_active
    ]);

    const clinicLinks = clinicsRes.data || [];
    const hospitalLinks = hospitalsRes.data || [];

    // ── Fallback 1: doctors.hospital_id ──
    // A doctor may have been assigned a primary hospital without a hospital_doctors row.
    if (doctor.hospital_id) {
      const alreadyIncluded = hospitalLinks.some((h) => h.hospital_id === doctor.hospital_id);
      if (!alreadyIncluded) {
        const { data: primaryHospital } = await supabaseAdmin
          .from('hospitals')
          .select('id, name, image_url, address, city, state, is_active, opening_time, closing_time, is_24_hours')
          .eq('id', doctor.hospital_id)
          .maybeSingle();
        if (primaryHospital) {
          hospitalLinks.push({ hospital_id: primaryHospital.id, department: null, designation: null, schedule: {}, hospital: primaryHospital });
        }
      }
    }

    // ── Fallback 2: accepted hospital_doctor_invites ──
    // If a hospital_doctors row was never created or has is_active = false but the
    // doctor accepted the invite, surface the hospital anyway.
    try {
      const { data: acceptedInvites } = await supabaseAdmin
        .from('hospital_doctor_invites')
        .select(`
          hospital_id, department, schedule,
          hospital:hospitals(id, name, image_url, address, city, state, is_active, opening_time, closing_time, is_24_hours)
        `)
        .eq('doctor_id', doctor.id)
        .eq('status', 'accepted');

      for (const inv of acceptedInvites || []) {
        const alreadyIncluded = hospitalLinks.some((h) => h.hospital_id === inv.hospital_id);
        if (!alreadyIncluded && inv.hospital) {
          hospitalLinks.push({
            hospital_id: inv.hospital_id,
            department: inv.department || null,
            designation: null,
            schedule: inv.schedule || {},
            hospital: inv.hospital,
          });
        }
      }
    } catch (_) {
      // Non-fatal: table may not exist yet in all environments
    }

    const clinicIds = clinicLinks.map((c) => c.clinic_id).filter(Boolean);
    const hospitalIds = hospitalLinks.map((h) => h.hospital_id).filter(Boolean);

    const [clinicDeptsRes, hospitalDeptsRes] = await Promise.all([
      clinicIds.length
        ? supabaseAdmin.from('clinic_departments').select('id, clinic_id, name, is_active').in('clinic_id', clinicIds)
        : Promise.resolve({ data: [] }),
      hospitalIds.length
        ? supabaseAdmin.from('hospital_departments').select('id, hospital_id, name, is_active').in('hospital_id', hospitalIds)
        : Promise.resolve({ data: [] }),
    ]);

    const deptsByOrg = {};
    (clinicDeptsRes.data || []).forEach((d) => {
      if (d.is_active === false) return;
      if (!deptsByOrg[`clinic:${d.clinic_id}`]) deptsByOrg[`clinic:${d.clinic_id}`] = [];
      deptsByOrg[`clinic:${d.clinic_id}`].push({ id: d.id, name: d.name });
    });
    (hospitalDeptsRes.data || []).forEach((d) => {
      if (d.is_active === false) return;
      if (!deptsByOrg[`hospital:${d.hospital_id}`]) deptsByOrg[`hospital:${d.hospital_id}`] = [];
      deptsByOrg[`hospital:${d.hospital_id}`].push({ id: d.id, name: d.name });
    });

    const organizations = [];

    clinicLinks.forEach((link) => {
      const clinic = link.clinic;
      if (!clinic || clinic.is_active === false) return;
      organizations.push({
        type: 'clinic',
        organization_type: 'clinic',
        id: clinic.id,
        name: clinic.name,
        image_url: clinic.image_url || clinic.profile_image_url || null,
        address: clinic.address,
        city: clinic.city,
        consultation_fee: link.consultation_fee || null,
        departments: deptsByOrg[`clinic:${clinic.id}`] || [],
        schedule: link.schedule && typeof link.schedule === 'object' ? link.schedule : {},
      });
    });

    hospitalLinks.forEach((link) => {
      const hospital = link.hospital;
      if (!hospital || hospital.is_active === false) return;
      organizations.push({
        type: 'hospital',
        organization_type: 'hospital',
        id: hospital.id,
        name: hospital.name,
        image_url: hospital.image_url || hospital.profile_image_url || null,
        address: hospital.address,
        city: hospital.city,
        department: link.department || null,
        designation: link.designation || null,
        departments: deptsByOrg[`hospital:${hospital.id}`] || [],
        schedule: link.schedule && typeof link.schedule === 'object' ? link.schedule : {},
      });
    });

    return organizations;
  }

  /**
   * Validate that the doctor is actively affiliated with the given organization
   * and that the organization itself is active before an In-Person schedule is created.
   */
  async _validateInPersonOrganization(doctor, organizationType, organizationId) {
    if (!organizationType || !organizationId) {
      throw new ApiError(400, 'In-person schedules require an organization (clinic or hospital).');
    }
    if (!['clinic', 'hospital'].includes(organizationType)) {
      throw new ApiError(400, 'organization_type must be "clinic" or "hospital".');
    }

    if (organizationType === 'clinic') {
      const { data: link, error } = await supabaseAdmin
        .from('clinic_doctors')
        .select('id, clinic:clinics(id, name, is_active)')
        .eq('clinic_id', organizationId)
        .eq('doctor_id', doctor.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw new ApiError(400, 'Failed to verify clinic affiliation');
      if (!link) throw new ApiError(403, 'You are not actively affiliated with this clinic.');
      if (!link.clinic || link.clinic.is_active === false) {
        throw new ApiError(400, 'Selected clinic is not currently active.');
      }
      return { type: 'clinic', id: organizationId, name: link.clinic.name };
    }

    // hospital
    const { data: link, error } = await supabaseAdmin
      .from('hospital_doctors')
      .select('id, hospital:hospitals(id, name, is_active)')
      .eq('hospital_id', organizationId)
      .eq('doctor_id', doctor.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new ApiError(400, 'Failed to verify hospital affiliation');
    if (!link) throw new ApiError(403, 'You are not actively affiliated with this hospital.');
    if (!link.hospital || link.hospital.is_active === false) {
      throw new ApiError(400, 'Selected hospital is not currently active.');
    }
    return { type: 'hospital', id: organizationId, name: link.hospital.name };
  }

  /**
   * Detect overlapping commitments for a doctor on a given date.
   * Conflicts are doctor-level: the doctor cannot be in two places at once, so
   * ALL active schedules (video + every organization's in-person) participate.
   */
  async _findScheduleConflicts(doctorId, slotDate, startMinutes, endMinutes, excludeId = null) {
    const selectColumns = [
      'id', 'doctor_id', 'slot_date', 'start_time', 'end_time', 'slot_duration',
      'buffer_time', 'is_video_enabled', 'is_clinic_enabled', 'is_home_enabled', 'is_active',
      'organization_type', 'organization_id', 'department_id',
    ].join(',');

    const fetchRows = async (cols) => {
      let query = supabaseAdmin
        .from('doctor_slots')
        .select(cols)
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .eq('slot_date', slotDate);
      if (excludeId) query = query.neq('id', excludeId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    };

    let rows = [];
    try {
      rows = await fetchRows(selectColumns);
    } catch (error) {
      // Organization columns may not exist yet (pending migration) — retry with base columns.
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        rows = await fetchRows(
          ['id', 'doctor_id', 'slot_date', 'start_time', 'end_time', 'slot_duration',
            'buffer_time', 'is_video_enabled', 'is_clinic_enabled', 'is_active'].join(',')
        );
      } else if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        rows = await fetchRows(
          ['id', 'doctor_id', 'slot_date', 'start_time', 'end_time', 'slot_duration',
            'is_video_enabled', 'is_clinic_enabled', 'is_active'].join(',')
        );
      } else {
        throw new ApiError(400, 'Failed to check schedule conflicts');
      }
    }

    const conflicts = [];
    for (const row of rows) {
      const rowStart = toMinutes(row.start_time);
      const rowEnd = toMinutes(row.end_time);
      if (rowStart === null || rowEnd === null) continue;
      if (rowEnd > startMinutes && rowStart < endMinutes) {
        conflicts.push({
          id: row.id,
          date: slotDate,
          start_time: row.start_time,
          end_time: row.end_time,
          mode: row.is_video_enabled && !row.is_clinic_enabled ? 'video'
            : (!row.is_video_enabled && row.is_clinic_enabled) ? 'in_person'
            : 'mixed',
          organization_type: row.organization_type || null,
          organization_id: row.organization_id || null,
          department_id: row.department_id || null,
        });
      }
    }
    return conflicts;
  }

  /**
   * Best-effort lookup of organization display names for a list of (type, id) pairs.
   * Used to produce human-readable conflict messages.
   */
  async _resolveOrganizationNames(pairs) {
    const names = {};
    const clinicIds = pairs.filter((p) => p && p.organization_type === 'clinic' && p.organization_id).map((p) => p.organization_id);
    const hospitalIds = pairs.filter((p) => p && p.organization_type === 'hospital' && p.organization_id).map((p) => p.organization_id);

    if (clinicIds.length) {
      const { data } = await supabaseAdmin.from('clinics').select('id, name').in('id', clinicIds);
      (data || []).forEach((c) => { names[`clinic:${c.id}`] = c.name; });
    }
    if (hospitalIds.length) {
      const { data } = await supabaseAdmin.from('hospitals').select('id, name').in('id', hospitalIds);
      (data || []).forEach((h) => { names[`hospital:${h.id}`] = h.name; });
    }
    return names;
  }

  /**
   * Insert schedule rows into doctor_slots.
   * - Video schedules use only base columns (is_home_enabled/buffer_time degrade if migration 033 missing).
   * - In-Person schedules REQUIRE the organization columns; if those columns do not exist yet the
   *   insert is refused with a clear message (pending migration) instead of silently writing a
   *   doctor-only generic slot.
   */
  async _insertScheduleRows(doctorId, rows, organization, department) {
    const baseRow = (r) => ({
      doctor_id: doctorId,
      slot_date: r.slot_date,
      start_time: r.start_time,
      end_time: r.end_time,
      slot_duration: r.slot_duration,
      buffer_time: r.buffer_time,
      is_active: r.is_active,
      is_video_enabled: r.is_video_enabled,
      is_clinic_enabled: r.is_clinic_enabled,
      is_home_enabled: r.is_home_enabled,
    });

    if (!organization) {
      const { data, error } = await supabaseAdmin
        .from('doctor_slots')
        .insert(rows.map(baseRow))
        .select();
      if (!error) return data;
      if (error.code === '42703') {
        // is_home_enabled / buffer_time missing (migration 033 not applied)
        const compatRows = rows.map((r) => ({
          doctor_id: doctorId,
          slot_date: r.slot_date,
          start_time: r.start_time,
          end_time: r.end_time,
          slot_duration: r.slot_duration,
          is_active: r.is_active,
          is_video_enabled: r.is_video_enabled,
          is_clinic_enabled: r.is_clinic_enabled,
        }));
        const { data: compatData, error: compatError } = await supabaseAdmin
          .from('doctor_slots')
          .insert(compatRows)
          .select();
        if (compatError) throw new ApiError(400, 'Failed to create video schedule.');
        return compatData;
      }
      throw new ApiError(400, 'Failed to create video schedule.');
    }

    // Organization-scoped in-person schedule
    const orgColumn = organization.type === 'clinic' ? 'clinic_id' : 'hospital_id';
    const orgRows = rows.map((r) => ({
      ...baseRow(r),
      organization_type: organization.type,
      [orgColumn]: organization.id,
      ...(department && department.id ? { department_id: department.id } : {}),
      ...(department && department.name ? { department_name: department.name } : {}),
    }));

    const { data, error } = await supabaseAdmin
      .from('doctor_slots')
      .insert(orgRows)
      .select();
    if (!error) return data;
    if (error.code === '42703') {
      throw new ApiError(400, 'Organization-specific In-Person scheduling requires a database migration that has not been applied yet. Please run the pending doctor_slots migration (organization_type, clinic_id, hospital_id, department_id, department_name columns).');
    }
    throw new ApiError(400, 'Failed to create in-person schedule.');
  }

  /**
   * Create a single schedule (video or organization-specific in-person).
   * Runs conflict detection across ALL of the doctor's active schedules before persisting.
   */
  async createSchedule(userId, payload) {
    const doctor = await this._resolveDoctor(userId);

    const mode = payload.consultation_mode === 'in_person' ? 'in_person' : 'video';
    const slotDate = payload.slot_date || payload.date;
    const startTime = normalizeTime24(payload.startTime ?? payload.start_time);
    const endTime = normalizeTime24(payload.endTime ?? payload.end_time);
    const slotDuration = parseInt(payload.slotDuration ?? payload.slot_duration ?? 15, 10);
    const bufferTime = parseInt(payload.bufferTime ?? payload.buffer_time ?? 0, 10);
    const recurringWeeks = Math.max(parseInt(payload.recurringWeeks ?? 0, 10) || 0, 0);

    if (!slotDate || !startTime || !endTime) {
      throw new ApiError(400, 'Provide slot_date, startTime and endTime.');
    }
    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    if (startM === null || endM === null || startM >= endM) {
      throw new ApiError(400, 'Invalid schedule times provided (end must be after start).');
    }
    if (slotDuration <= 0) throw new ApiError(400, 'Slot duration must be a positive number.');
    if (bufferTime < 0) throw new ApiError(400, 'Buffer time cannot be negative.');

    // In-Person: active affiliation + active organization required
    let organization = null;
    let department = null;
    if (mode === 'in_person') {
      const organizationType = payload.organization_type;
      const organizationId = payload.organization_id;
      if (!organizationType || !organizationId) {
        throw new ApiError(400, 'In-person schedules require an organization (clinic or hospital).');
      }
      organization = await this._validateInPersonOrganization(doctor, organizationType, organizationId);

      if (payload.department_id) {
        department = { id: payload.department_id, name: payload.department_name || null };
      }
    }

    // Build dates (recurring = N consecutive weeks)
    const dates = [];
    if (recurringWeeks > 0) {
      const start = new Date(`${slotDate}T00:00:00`);
      for (let i = 0; i < recurringWeeks; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else {
      dates.push(slotDate);
    }

    // Conflict detection across all active schedules (video + every org's in-person)
    for (const date of dates) {
      const conflicts = await this._findScheduleConflicts(doctor.id, date, startM, endM);
      if (conflicts.length > 0) {
        const names = await this._resolveOrganizationNames(conflicts);
        const enriched = conflicts.map((c) => ({
          ...c,
          organization_name: c.organization_id ? (names[`${c.organization_type}:${c.organization_id}`] || null) : null,
        }));
        throw new ApiError(409, 'Schedule conflict detected', { conflicts: enriched });
      }
    }

    const rows = dates.map((date) => ({
      slot_date: date,
      start_time: startTime,
      end_time: endTime,
      slot_duration: slotDuration,
      buffer_time: bufferTime,
      is_active: true,
      is_video_enabled: mode === 'video',
      is_clinic_enabled: mode === 'in_person',
      is_home_enabled: false,
    }));

    const inserted = await this._insertScheduleRows(doctor.id, rows, organization, department);
    return { mode, organization, department, schedules: inserted };
  }

  /**
   * Update an existing schedule (edit times/date or pause/resume).
   * Changing the organization is blocked when appointments exist for that schedule.
   */
  async updateSchedule(userId, scheduleId, payload) {
    const doctor = await this._resolveDoctor(userId);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('id', scheduleId)
      .eq('doctor_id', doctor.id)
      .maybeSingle();

    if (fetchError || !existing) throw new ApiError(404, 'Schedule not found');

    // Pause / resume
    if (typeof payload.is_active === 'boolean') {
      const { error } = await supabaseAdmin
        .from('doctor_slots')
        .update({ is_active: payload.is_active })
        .eq('id', scheduleId);
      if (error) throw new ApiError(400, 'Failed to update schedule.');
      return { ...existing, is_active: payload.is_active };
    }

    const slotDate = payload.slot_date || existing.slot_date;
    const startTime = normalizeTime24(payload.startTime ?? payload.start_time ?? existing.start_time);
    const endTime = normalizeTime24(payload.endTime ?? payload.end_time ?? existing.end_time);
    const slotDuration = parseInt(payload.slotDuration ?? payload.slot_duration ?? existing.slot_duration ?? 15, 10);
    const bufferTime = parseInt(payload.bufferTime ?? payload.buffer_time ?? existing.buffer_time ?? 0, 10);

    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    if (startM === null || endM === null || startM >= endM) {
      throw new ApiError(400, 'Invalid schedule times provided (end must be after start).');
    }

    // Organization change guard: if appointments exist, changing the org would
    // invalidate historical appointments → require a new schedule instead.
    const orgChanged = (payload.organization_type && payload.organization_id) && (
      existing.organization_type !== payload.organization_type || existing.organization_id !== payload.organization_id
    );
    if (orgChanged) {
      const hasAppointments = await this._hasAppointmentsForSchedule(doctor.id, existing.slot_date, existing.start_time, existing.end_time);
      if (hasAppointments) {
        throw new ApiError(400, 'This schedule has existing appointments. Create a new schedule instead of changing its organization.');
      }
    }

    const conflicts = await this._findScheduleConflicts(doctor.id, slotDate, startM, endM, scheduleId);
    if (conflicts.length > 0) {
      const names = await this._resolveOrganizationNames(conflicts);
      const enriched = conflicts.map((c) => ({
        ...c,
        organization_name: c.organization_id ? (names[`${c.organization_type}:${c.organization_id}`] || null) : null,
      }));
      throw new ApiError(409, 'Schedule conflict detected', { conflicts: enriched });
    }

    const updatePayload = {
      slot_date: slotDate,
      start_time: startTime,
      end_time: endTime,
      slot_duration: slotDuration,
      buffer_time: bufferTime,
    };

    const { error: updateError } = await supabaseAdmin
      .from('doctor_slots')
      .update(updatePayload)
      .eq('id', scheduleId)
      .eq('doctor_id', doctor.id);
    if (updateError) {
      if (updateError.code === '42703') {
        delete updatePayload.buffer_time;
        const { error: retryError } = await supabaseAdmin
          .from('doctor_slots')
          .update(updatePayload)
          .eq('id', scheduleId)
          .eq('doctor_id', doctor.id);
        if (retryError) throw new ApiError(400, 'Failed to update schedule.');
        return { ...existing, ...updatePayload };
      }
      throw new ApiError(400, 'Failed to update schedule.');
    }

    return { ...existing, ...updatePayload };
  }

  /**
   * Disable/end a schedule. If appointments exist for the schedule, it is disabled
   * (is_active=false) so historical/future bookings stay intact. If no appointments
   * exist it may be removed entirely.
   */
  async disableSchedule(userId, scheduleId) {
    const doctor = await this._resolveDoctor(userId);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('id', scheduleId)
      .eq('doctor_id', doctor.id)
      .maybeSingle();

    if (fetchError || !existing) throw new ApiError(404, 'Schedule not found');

    const hasAppointments = await this._hasAppointmentsForSchedule(doctor.id, existing.slot_date, existing.start_time, existing.end_time);

    if (hasAppointments) {
      const { error } = await supabaseAdmin
        .from('doctor_slots')
        .update({ is_active: false })
        .eq('id', scheduleId);
      if (error) throw new ApiError(400, 'Failed to disable schedule.');
      return { id: scheduleId, disabled: true, message: 'Schedule ended. Existing appointments remain intact.' };
    }

    const { error } = await supabaseAdmin
      .from('doctor_slots')
      .delete()
      .eq('id', scheduleId)
      .eq('doctor_id', doctor.id);
    if (error) throw new ApiError(400, 'Failed to remove schedule.');
    return { id: scheduleId, deleted: true, message: 'Schedule removed.' };
  }

  async _hasAppointmentsForSchedule(doctorId, slotDate, startTime, endTime) {
    const { count, error } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('appointment_date', slotDate)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .gte('time_slot', startTime.slice(0, 5))
      .lt('time_slot', endTime.slice(0, 5));

    if (error) return false;
    return (count || 0) > 0;
  }

  /**
   * Helper to retrieve all affiliations, invites, and join requests for a doctor
   */
  async _getDoctorRelationships(doctorId) {
    if (!doctorId) return { clinicRelationships: {}, hospitalRelationships: {} };

    const [
      clinicDocsRes,
      clinicInvitesRes,
      clinicReqsRes,
      hospDocsRes,
      hospInvitesRes,
      hospReqsRes,
    ] = await Promise.all([
      supabaseAdmin.from('clinic_doctors').select('clinic_id, is_active').eq('doctor_id', doctorId).eq('is_active', true),
      supabaseAdmin.from('clinic_doctor_invites').select('id, clinic_id, status').eq('doctor_id', doctorId),
      supabaseAdmin.from('doctor_clinic_join_requests').select('id, clinic_id, status').eq('doctor_id', doctorId),
      supabaseAdmin.from('hospital_doctors').select('hospital_id, is_active').eq('doctor_id', doctorId).eq('is_active', true),
      supabaseAdmin.from('hospital_doctor_invites').select('id, hospital_id, status').eq('doctor_id', doctorId),
      supabaseAdmin.from('doctor_hospital_join_requests').select('id, hospital_id, status').eq('doctor_id', doctorId),
    ]);

    const clinicRelationships = {};
    const hospitalRelationships = {};

    // 1. Clinic join requests
    for (const req of (clinicReqsRes.data || [])) {
      if (req.status === 'accepted') {
        clinicRelationships[req.clinic_id] = { relationship: 'ACTIVE', joinRequestId: req.id };
      } else if (req.status === 'pending') {
        clinicRelationships[req.clinic_id] = { relationship: 'REQUEST_PENDING', joinRequestId: req.id };
      } else if (req.status === 'rejected') {
        clinicRelationships[req.clinic_id] = { relationship: 'REJECTED', joinRequestId: req.id };
      }
    }

    // 2. Clinic invites (takes precedence over join requests)
    for (const inv of (clinicInvitesRes.data || [])) {
      if (inv.status === 'accepted') {
        clinicRelationships[inv.clinic_id] = { relationship: 'ACTIVE', inviteId: inv.id };
      } else if (inv.status === 'pending') {
        clinicRelationships[inv.clinic_id] = { relationship: 'INVITATION_PENDING', inviteId: inv.id };
      } else if (inv.status === 'changes_requested') {
        clinicRelationships[inv.clinic_id] = { relationship: 'CHANGES_REQUESTED', inviteId: inv.id };
      }
    }

    // 3. Active clinic_doctors (authoritative active)
    for (const cd of (clinicDocsRes.data || [])) {
      if (cd.is_active) {
        clinicRelationships[cd.clinic_id] = { relationship: 'ACTIVE' };
      }
    }

    // 4. Hospital join requests
    for (const req of (hospReqsRes.data || [])) {
      if (req.status === 'accepted') {
        hospitalRelationships[req.hospital_id] = { relationship: 'ACTIVE', joinRequestId: req.id };
      } else if (req.status === 'pending') {
        hospitalRelationships[req.hospital_id] = { relationship: 'REQUEST_PENDING', joinRequestId: req.id };
      } else if (req.status === 'rejected') {
        hospitalRelationships[req.hospital_id] = { relationship: 'REJECTED', joinRequestId: req.id };
      }
    }

    // 5. Hospital invites (takes precedence)
    for (const inv of (hospInvitesRes.data || [])) {
      if (inv.status === 'accepted') {
        hospitalRelationships[inv.hospital_id] = { relationship: 'ACTIVE', inviteId: inv.id };
      } else if (inv.status === 'pending') {
        hospitalRelationships[inv.hospital_id] = { relationship: 'INVITATION_PENDING', inviteId: inv.id };
      } else if (inv.status === 'changes_requested') {
        hospitalRelationships[inv.hospital_id] = { relationship: 'CHANGES_REQUESTED', inviteId: inv.id };
      }
    }

    // 6. Active hospital_doctors (authoritative active)
    for (const hd of (hospDocsRes.data || [])) {
      if (hd.is_active) {
        hospitalRelationships[hd.hospital_id] = { relationship: 'ACTIVE' };
      }
    }

    return { clinicRelationships, hospitalRelationships };
  }

  /**
   * Search clinics and hospitals for the "Find & Join" flow (relationship-aware & nearby-aware).
   */
  async searchOrganizations(query = '', type = 'all', latitude, longitude, userId) {
    const results = { clinics: [], hospitals: [] };

    let doctor = null;
    let clinicRelationships = {};
    let hospitalRelationships = {};

    if (userId) {
      try {
        doctor = await this._resolveDoctor(userId);
        if (doctor) {
          const rels = await this._getDoctorRelationships(doctor.id);
          clinicRelationships = rels.clinicRelationships;
          hospitalRelationships = rels.hospitalRelationships;
        }
      } catch (_) {
        // Continue unauthenticated/anonymously if doctor resolution fails
      }
    }

    const hasCoords = (latitude !== null && latitude !== undefined && !isNaN(Number(latitude))) &&
                      (longitude !== null && longitude !== undefined && !isNaN(Number(longitude)));
    const userLat = hasCoords ? Number(latitude) : null;
    const userLng = hasCoords ? Number(longitude) : null;

    if (type === 'all' || type === 'clinic') {
      let clinicQuery = supabaseAdmin
        .from('clinics')
        .select('id, name, city, address, state, pincode, latitude, longitude, specializations, facilities, opening_hours, is_24_hours, phone, email, image_url, profile_image_url, rating, total_reviews, is_active, approval_status, description')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .limit(40);

      if (query && query.trim()) {
        const q = query.trim();
        clinicQuery = clinicQuery.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: clinics, error } = await clinicQuery;
      if (!error && clinics) {
        results.clinics = clinics.map(c => {
          const rel = clinicRelationships[c.id] || { relationship: 'NOT_CONNECTED' };
          const dist = (userLat !== null && userLng !== null && c.latitude && c.longitude)
            ? haversineDistance(userLat, userLng, Number(c.latitude), Number(c.longitude))
            : null;
          return {
            ...c,
            organization_type: 'clinic',
            type: 'clinic',
            relationship: rel.relationship,
            invite_id: rel.inviteId || null,
            join_request_id: rel.joinRequestId || null,
            distance_km: dist !== null ? Math.round(dist * 10) / 10 : null,
          };
        });
      }
    }

    if (type === 'all' || type === 'hospital') {
      let hospitalQuery = supabaseAdmin
        .from('hospitals')
        .select('id, name, city, address, state, pincode, latitude, longitude, specializations, departments, facilities, opening_hours, is_24_hours, is_emergency_available, ambulance_available, phone, email, website, emergency_phone, type, description, image_url, rating, total_reviews, is_active, approval_status')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .limit(40);

      if (query && query.trim()) {
        const q = query.trim();
        hospitalQuery = hospitalQuery.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: hospitals, error } = await hospitalQuery;
      if (!error && hospitals) {
        results.hospitals = hospitals.map(h => {
          const isPrimaryHosp = doctor && doctor.hospital_id === h.id;
          const rel = isPrimaryHosp ? { relationship: 'ACTIVE' } : (hospitalRelationships[h.id] || { relationship: 'NOT_CONNECTED' });
          const dist = (userLat !== null && userLng !== null && h.latitude && h.longitude)
            ? haversineDistance(userLat, userLng, Number(h.latitude), Number(h.longitude))
            : null;
          return {
            ...h,
            organization_type: 'hospital',
            type: 'hospital',
            relationship: rel.relationship,
            invite_id: rel.inviteId || null,
            join_request_id: rel.joinRequestId || null,
            distance_km: dist !== null ? Math.round(dist * 10) / 10 : null,
          };
        });
      }
    }

    // Sort: if distance is present, sort nearest first; otherwise sort by rating/default
    const all = [...results.clinics, ...results.hospitals].sort((a, b) => {
      if (userLat !== null && userLng !== null) {
        if (a.distance_km !== null && b.distance_km !== null) return a.distance_km - b.distance_km;
        if (a.distance_km !== null) return -1;
        if (b.distance_km !== null) return 1;
      }
      const rA = Number(a.rating || 0);
      const rB = Number(b.rating || 0);
      if (rB !== rA) return rB - rA;
      return (b.total_reviews || 0) - (a.total_reviews || 0);
    });

    return { data: all, clinics: results.clinics, hospitals: results.hospitals };
  }

  /**
   * Get single organization details with public profile, departments, active doctors, and doctor relationship
   */
  async getOrganizationDetails(orgId, type, userId) {
    if (!orgId) throw new ApiError(400, 'Organization ID is required');

    let organization = null;
    let doctor = null;
    let clinicRelationships = {};
    let hospitalRelationships = {};

    if (userId) {
      try {
        doctor = await this._resolveDoctor(userId);
        if (doctor) {
          const rels = await this._getDoctorRelationships(doctor.id);
          clinicRelationships = rels.clinicRelationships;
          hospitalRelationships = rels.hospitalRelationships;
        }
      } catch (_) {
        // ignore
      }
    }

    if (type === 'clinic' || !type) {
      const { data: clinic, error: clinicErr } = await supabaseAdmin
        .from('clinics')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (!clinicErr && clinic) {
        // Fetch affiliated active doctors
        const { data: activeInvites } = await supabaseAdmin
          .from('clinic_doctor_invites')
          .select('id, role, department, practice_type, doctor:doctors(id, name, specialization, experience_years, profile_image_url, rating)')
          .eq('clinic_id', orgId)
          .eq('status', 'accepted')
          .limit(10);

        const rel = clinicRelationships[clinic.id] || { relationship: 'NOT_CONNECTED' };

        organization = {
          ...clinic,
          organization_type: 'clinic',
          type: 'clinic',
          relationship: rel.relationship,
          invite_id: rel.inviteId || null,
          join_request_id: rel.joinRequestId || null,
          doctors: (activeInvites || []).map(i => ({
            ...i.doctor,
            role: i.role,
            department: i.department,
            practice_type: i.practice_type,
          })).filter(d => !!d && !!d.id),
        };
      }
    }

    if (!organization && (type === 'hospital' || !type)) {
      const { data: hospital, error: hospErr } = await supabaseAdmin
        .from('hospitals')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (!hospErr && hospital) {
        // Fetch departments
        const { data: depts } = await supabaseAdmin
          .from('hospital_departments')
          .select('*')
          .eq('hospital_id', orgId)
          .eq('is_active', true);

        // Fetch affiliated active doctors
        const { data: activeInvites } = await supabaseAdmin
          .from('hospital_doctor_invites')
          .select('id, role, department, practice_type, doctor:doctors(id, name, specialization, experience_years, profile_image_url, rating)')
          .eq('hospital_id', orgId)
          .eq('status', 'accepted')
          .limit(10);

        const isPrimaryHosp = doctor && doctor.hospital_id === hospital.id;
        const rel = isPrimaryHosp ? { relationship: 'ACTIVE' } : (hospitalRelationships[hospital.id] || { relationship: 'NOT_CONNECTED' });

        organization = {
          ...hospital,
          organization_type: 'hospital',
          type: 'hospital',
          relationship: rel.relationship,
          invite_id: rel.inviteId || null,
          join_request_id: rel.joinRequestId || null,
          department_list: depts || [],
          doctors: (activeInvites || []).map(i => ({
            ...i.doctor,
            role: i.role,
            department: i.department,
            practice_type: i.practice_type,
          })).filter(d => !!d && !!d.id),
        };
      }
    }

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    return organization;
  }

  /**
   * Complete doctor onboarding.
   */
  async completeOnboarding(userId, practiceSetupType) {
    const doctor = await this._resolveDoctor(userId);

    const validTypes = ['own_clinic', 'join_organization', 'video_only'];
    if (!validTypes.includes(practiceSetupType)) {
      throw new ApiError(400, `Invalid practice setup type. Must be one of: ${validTypes.join(', ')}`);
    }

    const { error } = await supabaseAdmin
      .from('doctors')
      .update({
        onboarding_completed: true,
        practice_setup_type: practiceSetupType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doctor.id);

    if (error) throw error;
    await cacheDel(`auth_user:${userId}`);
    return { message: 'Onboarding completed', practiceSetupType };
  }

  // ── Helper ────────────────────────────────────────────────────

  async _resolveDoctor(userId) {
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .select('id, name, specialization, user_id, hospital_id')
      .eq('user_id', userId)
      .single();

    if (error || !doctor) throw new ApiError(404, 'Doctor profile not found');
    return doctor;
  }
}

module.exports = new DoctorService();
