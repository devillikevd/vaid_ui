const { supabaseAdmin } = require('../config/supabase');
const { uploadProfileImage, deleteFile } = require('../config/minio');
const { ApiError } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { sanitizeSearch } = require('../utils/sanitize');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');

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
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .select(`
        *,
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
      supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id),
      supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id).eq('status', 'completed'),
      supabaseAdmin.from('doctor_reviews').select('*').eq('doctor_id', doctor.id).order('created_at', { ascending: false }).limit(5),
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
      updatePayload.experience_years = updateData.experience || updateData.experienceYears;
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
    Object.assign(updatePayload, buildProviderResubmissionFields('doctor', doctor.approval_status));

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

    const today = new Date().toISOString().split('T')[0];

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
        .select('*, patient:patients(id, name, age, gender, profile_image_url)')
        .eq('doctor_id', doctor.id).eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('time_slot', { ascending: true }),
      supabaseAdmin.from('appointments')
        .select('*, patient:patients(id, name, age, gender)')
        .eq('doctor_id', doctor.id).gt('appointment_date', today)
        .in('status', ['scheduled', 'confirmed'])
        .order('appointment_date', { ascending: true }).limit(10),
      supabaseAdmin.from('appointments')
        .select('*', { count: 'exact' })
        .eq('doctor_id', doctor.id).eq('status', 'scheduled')
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

    const todayAppointments = todayApptsResult.data || [];
    const upcomingAppointments = upcomingApptsResult.data || [];
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

    let query = supabaseAdmin
      .from('doctors')
      .select(`
        id, name, specialization, experience_years, rating, total_reviews,
        consultation_fee, profile_image_url, languages, is_available,
        hospital:hospitals(id, name, city)
      `, { count: 'exact' })
      .eq('is_approved', true);

    if (filters.specialization) {
      query = query.eq('specialization', filters.specialization);
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

    if (filters.maxFee) {
      query = query.lte('consultation_fee', filters.maxFee);
    }

    if (filters.search) {
      const s = sanitizeSearch(filters.search);
      if (s) query = query.or(`name.ilike.%${s}%,specialization.ilike.%${s}%`);
    }

    const { data: doctors, count, error } = await query
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiError(400, 'Failed to fetch doctors');
    }

    return paginatedResponse(doctors, count, page, limit);
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

    // Get available slots
    const { data: slots } = await supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true);

    // Get reviews
    const { data: reviews } = await supabaseAdmin
      .from('doctor_reviews')
      .select(`
        *,
        patient:patients(name)
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...doctor,
      slots: slots || [],
      reviews: reviews || [],
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
  async getAvailableSlots(doctorId, date) {
    // Get doctor's slot configuration
    const { data: slotConfig } = await supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true)
      .eq('day_of_week', new Date(date).getDay());

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

    const bookedSlots = bookedAppointments?.map(a => a.time_slot) || [];

    // Generate available time slots
    const availableSlots = [];
    slotConfig.forEach(config => {
      const start = parseInt(config.start_time.split(':')[0]);
      const end = parseInt(config.end_time.split(':')[0]);

      for (let hour = start; hour < end; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        if (!bookedSlots.includes(timeSlot)) {
          availableSlots.push({
            time: timeSlot,
            period: hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening',
            is_available: true,
          });
        }
      }
    });

    return availableSlots;
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
    // Prevent invalid rows like day_of_week = null, which makes patient slot lookup fail.
    const slotsJson = slots.map((slot) => {
      const day_of_week = normalizeDayOfWeek(slot);
      const start_time = normalizeTime24(slot.startTime ?? slot.start_time);
      const end_time = normalizeTime24(slot.endTime ?? slot.end_time);
      const is_active = normalizeBoolean(slot.isAvailable ?? slot.is_active ?? slot.isActive, true);

      if (day_of_week === null || !start_time || !end_time) {
        throw new ApiError(400, 'Invalid slot format. Provide valid day, startTime, and endTime.');
      }

      const startMinutes = toMinutes(start_time);
      const endMinutes = toMinutes(end_time);
      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        throw new ApiError(400, 'Invalid slot range. endTime must be after startTime.');
      }

      return { day_of_week, start_time, end_time, is_active };
    });

    const canUseRpc = slotsJson.every((slot) => slot.is_active === true);
    const { error: rpcError } = canUseRpc
      ? await supabaseAdmin.rpc('rpc_replace_doctor_slots', {
        p_doctor_id: doctor.id,
        p_slots: slotsJson,
      })
      : { error: new Error('Slot replacement RPC cannot preserve inactive slots') };

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
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_duration: 15,
        is_video_enabled: true,
        is_clinic_enabled: true,
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
      .order('day_of_week', { ascending: true });

    if (fetchError) {
      throw new ApiError(400, 'Failed to fetch updated slots');
    }

    return newSlots;
  }

  // Get patients list (for doctor)
  async getPatients(userId, page = 1, limit = 20, search = '') {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    const { offset } = paginate(page, limit);

    // Get unique patients who have had appointments
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        patient_id,
        appointment_date,
        created_at,
        patient:patients(
          id, name, age, gender, blood_group, profile_image_url,
          user:users(email, phone)
        )
      `)
      .eq('doctor_id', doctor.id)
      .order('appointment_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Get unique patients
    const patientMap = new Map();
    appointments?.forEach(apt => {
      if (!apt.patient) return;

      const existing = patientMap.get(apt.patient.id);
      const lastVisit = apt.appointment_date || apt.created_at || null;

      if (!existing) {
        patientMap.set(apt.patient.id, {
          id: apt.patient.id,
          name: apt.patient.name,
          age: apt.patient.age,
          gender: apt.patient.gender,
          bloodGroup: apt.patient.blood_group,
          profileImageUrl: apt.patient.profile_image_url,
          email: apt.patient.user?.email || null,
          phone: apt.patient.user?.phone || null,
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

    patients.sort((a, b) => {
      const left = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
      const right = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
      return left - right;
    });
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

    // Check if doctor has treated this patient
    const { data: hasAppointment } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor.id)
      .eq('patient_id', patientId)
      .limit(1)
      .single();

    if (!hasAppointment) {
      throw new ApiError(403, 'You can only view details of your patients');
    }

    const [
      { data: patient },
      { data: consultations },
      { data: reports },
      { data: appointments },
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
        .from('reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('appointments')
        .select('id, appointment_date, time_slot, type, status, reason, fee, notes, created_at')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
    ]);

    const totalVisits = appointments?.length || 0;
    const lastVisit = appointments?.[0]?.appointment_date || appointments?.[0]?.created_at || null;

    return {
      ...patient,
      email: patient?.user?.email || null,
      phone: patient?.user?.phone || null,
      totalVisits,
      lastVisit,
      appointments: appointments || [],
      consultations: consultations || [],
      reports: reports || [],
    };
  }
}

module.exports = new DoctorService();
