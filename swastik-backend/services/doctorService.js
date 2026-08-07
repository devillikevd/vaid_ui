const { supabaseAdmin } = require('../config/supabase');
const { uploadProfileImage, deleteFile, signStorageUrlsInPayload } = require('../config/minio');
const { ApiError } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { sanitizeSearch } = require('../utils/sanitize');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');
const { calculateAge } = require('../utils/patientProfile');

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

class DoctorService {
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
      .select('id, approval_status')
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
    
    Object.assign(updatePayload, buildProviderResubmissionFields('doctor', doctor.approval_status));
    
    // VULN-BS-05: Reset approval if credential fields are modified
    const credentialFieldsUpdated = [
      'registrationNo', 'registration_number',
      'licenseNumber', 'license_number',
      'licenseDocumentUrl', 'license_document_url',
      'degreeCertificateUrl', 'degree_certificate_url'
    ].some(field => updateData[field] !== undefined);

    if (credentialFieldsUpdated) {
      updatePayload.approval_status = 'pending';
      updatePayload.is_approved = false;
      updatePayload.approval_notes = 'Credential fields updated by provider. Re-verification required.';
      updatePayload.approved_by = null;
      updatePayload.approved_at = null;
    }

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
      if (s) query = query.or(`name.ilike.%${s}%,specialization.ilike.%${s}%`);
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
    }

    const { data: slotConfig } = await query;

    if (!slotConfig || slotConfig.length === 0) {
      return [];
    }

    // Get booked appointments for the date
    const { data: bookedAppointments } = await supabaseAdmin
      .from('appointments')
      .select('time_slot')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    // Appointments store time_slot as "HH:MM:SS" while generated slots are
    // "HH:MM" — normalize to "HH:MM" so booked slots are actually matched.
    const bookedSlots = new Set(
      (bookedAppointments || []).map(a => (a.time_slot && a.time_slot.length > 5 ? a.time_slot.slice(0, 5) : a.time_slot))
    );

    // Generate available time slots
    const availableSlots = [];
    const pastSlots = [];

    slotConfig.forEach(config => {
      const [startHour, startMin] = config.start_time.split(':').map(Number);
      const [endHour, endMin] = config.end_time.split(':').map(Number);
      const duration = config.slot_duration || 15;

      // If it's an in-person slot (window) and we are requesting in-person slots, we don't break it into 15m intervals
      // Instead, we return the entire window as a single slot.
      if (type === 'in_person' && config.is_clinic_enabled && !config.is_video_enabled) {
        const timeSlot = `${config.start_time.slice(0, 5)}-${config.end_time.slice(0, 5)}`;
        const period = startHour < 12 ? 'Morning' : startHour < 17 ? 'Afternoon' : 'Evening';
        const slotDateStr = `${date}T${config.end_time.slice(0, 5)}:00+05:30`;
        const slotTimeMs = Date.parse(slotDateStr);
        const isPast = !isNaN(slotTimeMs) && slotTimeMs < Date.now();
        
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

        if (isPast) {
          // Already-elapsed slot: collected separately and capped below so the
          // booking UI isn't flooded with stale "booked" entries from earlier
          // in the day.
          pastSlots.push({ time: timeSlot, period, is_available: false });
        } else {
          availableSlots.push({
            time: timeSlot,
            period: period,
            is_available: !bookedSlots.has(timeSlot),
          });
        }
        currentTotalMins += duration;
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
          is_clinic_enabled
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
          is_clinic_enabled
        });
      } else {
        slotsJson.push({ slot_date, start_time, end_time, is_active, is_video_enabled, is_clinic_enabled });
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
        slot_duration: (slot.is_clinic_enabled && !slot.is_video_enabled) ? null : 15,
        is_video_enabled: slot.is_video_enabled,
        is_clinic_enabled: slot.is_clinic_enabled,
        is_active: slot.is_active,
      }));

      const { error: insertFallbackError } = await supabaseAdmin
        .from('doctor_slots')
        .insert(fallbackRows);

      if (insertFallbackError) {
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

    const { data, error } = await supabaseAdmin
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
        hospital:hospitals(id, name, city, address),
        invitedBy:users!hospital_doctor_invites_invited_by_fkey(id, name, email)
      `)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async respondHospitalInvite(userId, inviteId, decision) {
    const action = (decision || '').toLowerCase();
    if (!['accept', 'reject'].includes(action)) {
      throw new ApiError(400, 'Decision must be either accept or reject');
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

    const { data, error } = await supabaseAdmin
      .from('clinic_doctor_invites')
      .select(`
        id,
        clinic_id,
        doctor_id,
        status,
        created_at,
        responded_at,
        expires_at,
        clinic:clinics(id, name, city, address),
        invitedBy:users!clinic_doctor_invites_invited_by_fkey(id, name, email)
      `)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async respondClinicInvite(userId, inviteId, decision) {
    const action = (decision || '').toLowerCase();
    if (!['accept', 'reject'].includes(action)) {
      throw new ApiError(400, 'Decision must be either accept or reject');
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
      return { message: 'Invite rejected successfully' };
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

    return { message: 'Invite accepted. Clinic assigned successfully.' };
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
    };

    return await signStorageUrlsInPayload(payload);
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
}

module.exports = new DoctorService();
