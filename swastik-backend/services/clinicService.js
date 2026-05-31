/**
 * Clinic Service
 * Clinic registration, management, doctors, appointments
 */
const { supabaseAdmin } = require('../config/supabase');
const { cacheDel } = require('../config/redis');
const { ApiError } = require('../middleware/errorHandler');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { maybeGeocodeLocationUpdates } = require('../utils/geocoding');
const { sanitizeSearch } = require('../utils/sanitize');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');

const enrichMissingPhonesFromOwners = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const ownerIdsNeedingFallback = [
    ...new Set(
      rows
        .filter((row) => row && !row.phone && row.owner_id)
        .map((row) => row.owner_id)
    ),
  ];

  if (ownerIdsNeedingFallback.length === 0) return rows;

  const { data: owners, error } = await supabaseAdmin
    .from('users')
    .select('id, phone')
    .in('id', ownerIdsNeedingFallback);

  if (error || !owners) return rows;

  const ownerPhoneById = new Map(
    owners
      .filter((owner) => owner?.id && owner?.phone)
      .map((owner) => [owner.id, owner.phone])
  );

  return rows.map((row) => {
    if (row?.phone || !row?.owner_id) return row;
    const fallbackPhone = ownerPhoneById.get(row.owner_id);
    return fallbackPhone ? { ...row, phone: fallbackPhone } : row;
  });
};

const buildUserContactMap = async (userIds = []) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, phone')
    .in('id', uniqueUserIds);

  if (error || !data) return new Map();

  return new Map(
    data
      .filter((user) => user?.id)
      .map((user) => [user.id, user])
  );
};

const getActiveClinicDoctorIds = async (clinicId) => {
  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .select('doctor_id')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (error) throw error;

  return (data || []).map((row) => row.doctor_id).filter(Boolean);
};

const mapClinicDoctorAssociation = (association, userContactMap = new Map()) => {
  const doctor = association?.doctor || {};
  const user = doctor?.user_id ? userContactMap.get(doctor.user_id) : null;

  return {
    id: doctor.id || association?.doctor_id || association?.id || '',
    doctorId: doctor.id || association?.doctor_id || '',
    associationId: association?.id || null,
    name: doctor.name || 'Doctor',
    specialization: doctor.specialization || '',
    email: user?.email || '',
    phone: user?.phone || '',
    status: association?.is_active === false ? 'inactive' : doctor?.is_available === false ? 'on-leave' : 'active',
    is_active: association?.is_active !== false,
  };
};

const mapClinicAppointment = (appointment, patientContactMap = new Map()) => {
  const patient = appointment?.patient || {};
  const doctor = appointment?.doctor || {};
  const patientUser = patient?.user_id ? patientContactMap.get(patient.user_id) : null;

  return {
    id: appointment.id,
    patientName: patient.name || 'Patient',
    patientId: patient.id || appointment.patient_id || '',
    patientPhone: patientUser?.phone || '',
    date: appointment.appointment_date || null,
    time: appointment.time_slot || '',
    type: appointment.type || 'clinic',
    status: appointment.status || 'scheduled',
    doctorName: doctor.name || 'Doctor',
    doctorSpecialization: doctor.specialization || '',
    reason: appointment.reason || null,
    fee: appointment.fee ?? null,
    created_at: appointment.created_at || null,
  };
};

const mapClinicConsultation = (consultation, patientContactMap = new Map()) => {
  const patient = consultation?.patient || {};
  const doctor = consultation?.doctor || {};
  const patientUser = patient?.user_id ? patientContactMap.get(patient.user_id) : null;

  return {
    id: consultation.id,
    status: consultation.status || 'pending',
    type: consultation.type || consultation?.appointment?.type || 'video',
    created_at: consultation.created_at || null,
    started_at: consultation.started_at || null,
    ended_at: consultation.ended_at || null,
    diagnosis: consultation.diagnosis || null,
    notes: consultation.notes || null,
    doctor: {
      id: doctor.id || '',
      name: doctor.name || 'Doctor',
      specialization: doctor.specialization || '',
      profile_image_url: doctor.profile_image_url || null,
    },
    patient: {
      id: patient.id || '',
      name: patient.name || 'Patient',
      phone: patientUser?.phone || '',
    },
    appointment: consultation?.appointment
      ? {
          id: consultation.appointment.id || '',
          appointment_date: consultation.appointment.appointment_date || null,
          time_slot: consultation.appointment.time_slot || '',
          type: consultation.appointment.type || consultation.type || 'video',
        }
      : null,
  };
};

// Search clinics
const searchClinics = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('clinics')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_approved', true);

  if (filters.city) query = query.ilike('city', `%${sanitizeSearch(filters.city)}%`);
  if (filters.specialization) query = query.contains('specializations', [filters.specialization]);
  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  let results = data || [];

  // SMART RANKING: Top suggested based on rating and reviews
  results = results.map(clinic => {
    const rating = parseFloat(clinic.rating) || 0;
    const reviews = parseInt(clinic.total_reviews) || 0;
    const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
    return { ...clinic, smart_score: score };
  });

  results.sort((a, b) => b.smart_score - a.smart_score);

  const total = results.length;
  results = results.slice(offset, offset + limit);

  const recordsWithPhone = await enrichMissingPhonesFromOwners(results);

  return {
    data: recordsWithPhone,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

// Find nearby clinics
const findNearby = async (latitude, longitude, radius = 25, specialization) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  let query = supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (specialization) {
    query = query.contains('specializations', [specialization]);
  }

  const { data, error } = await query;
  if (error) throw error;

  const recordsWithPhone = await enrichMissingPhonesFromOwners(data || []);

  return recordsWithPhone
    .map((c) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: c.latitude, longitude: c.longitude });
      const rating = parseFloat(c.rating) || 0;
      const reviews = parseInt(c.total_reviews) || 0;
      const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
      return { ...c, distance: dist, distanceText: formatDistance(dist), smart_score: score };
    })
    .filter((c) => c.distance <= radius)
    .sort((a, b) => b.smart_score - a.smart_score);
};

// Get clinic by ID
const getClinicById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .eq('is_approved', true)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Clinic not found');
  }
  const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
  return recordWithPhone || data;
};

// Register clinic
const registerClinic = async (userId, clinicData) => {
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .insert({
      owner_id: userId,
      name: clinicData.name,
      phone: clinicData.phone,
      email: clinicData.email,
      address: clinicData.address,
      city: clinicData.city,
      state: clinicData.state,
      pincode: clinicData.pincode,
      latitude: clinicData.latitude,
      longitude: clinicData.longitude,
      specializations: clinicData.specializations || [],
      is_active: false, // Pending admin approval
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Get clinic by owner
const getClinicByOwner = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Clinic not found for this user');
  }
  return {
    ...data,
    profile_image_url: data.profile_image_url || data.image_url || null,
  };
};

// Get dashboard stats
const getDashboard = async (clinicId, userId) => {
  // Verify this user owns the clinic
  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('id')
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .single();

  if (!clinic) {
    throw new ApiError(403, 'Clinic not found or access denied');
  }

  const today = new Date().toISOString().split('T')[0];
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);

  if (activeDoctorIds.length === 0) {
    return {
      stats: {
        totalDoctors: 0,
        todayAppointments: 0,
        totalStaff: 0,
        todaysAppointments: 0,
        walkInsToday: 0,
        repeatPatients: '0%',
        totalPatients: 0,
      },
      todayAppointments: [],
      recentAppointments: [],
    };
  }

  const [
    { count: totalDoctors },
    { count: todayAppointments },
    { count: walkInsToday },
    { data: patientRows },
    { data: todayAppointmentRows },
    { data: recentAppointments },
  ] = await Promise.all([
    supabaseAdmin.from('clinic_doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_active', true),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).eq('type', 'clinic').not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('patient_id').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization)').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).not('status', 'in', '(cancelled)').order('time_slot', { ascending: true }).limit(25),
    supabaseAdmin.from('appointments').select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization)').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).not('status', 'in', '(cancelled)').order('appointment_date', { ascending: false }).limit(10),
  ]);

  const patientIds = (patientRows || []).map((r) => r.patient_id).filter(Boolean);
  const uniquePatients = new Set(patientIds).size;
  const patientVisitCounts = patientIds.reduce((acc, pid) => {
    acc[pid] = (acc[pid] || 0) + 1;
    return acc;
  }, {});
  const repeatPatientCount = Object.values(patientVisitCounts).filter((n) => n > 1).length;
  const repeatPatients = uniquePatients > 0
    ? `${Math.round((repeatPatientCount / uniquePatients) * 100)}%`
    : '0%';

  return {
    stats: {
      totalDoctors: totalDoctors || 0,
      todayAppointments: todayAppointments || 0,
      // Aliases for clinic web UI compatibility
      totalStaff: totalDoctors || 0,
      todaysAppointments: todayAppointments || 0,
      walkInsToday: walkInsToday || 0,
      repeatPatients,
      totalPatients: uniquePatients,
    },
    todayAppointments: todayAppointmentRows || [],
    recentAppointments: recentAppointments || [],
  };
};

// Update clinic
const updateClinic = async (clinicId, userId, updates) => {
  const { data: existingClinic, error: existingClinicError } = await supabaseAdmin
    .from('clinics')
    .select('id, owner_id, address, city, state, pincode, latitude, longitude, approval_status')
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .single();

  if (existingClinicError || !existingClinic) {
    throw existingClinicError || new ApiError(404, 'Clinic not found');
  }

  // Whitelist allowed update fields to prevent mass-assignment
  const allowedFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
    'latitude', 'longitude', 'specializations', 'description', 'opening_hours',
    'profile_image_url', 'image_url', 'profile_image', 'is_24_hours', 'facilities',
    'registration_number', 'license_number', 'license_document_url'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }

  // Backward/forward compatibility for mixed frontend payload keys
  if (safeUpdates.profile_image_url === undefined) {
    if (safeUpdates.image_url !== undefined) safeUpdates.profile_image_url = safeUpdates.image_url;
    else if (safeUpdates.profile_image !== undefined) safeUpdates.profile_image_url = safeUpdates.profile_image;
  }
  if (safeUpdates.profile_image_url !== undefined) {
    safeUpdates.image_url = safeUpdates.profile_image_url;
    delete safeUpdates.profile_image_url;
  }
  delete safeUpdates.profile_image;

  Object.assign(safeUpdates, await maybeGeocodeLocationUpdates(existingClinic, safeUpdates));
  safeUpdates.updated_at = new Date().toISOString();
  Object.assign(safeUpdates, buildProviderResubmissionFields('clinic_owner', existingClinic.approval_status));

  const { data, error } = await supabaseAdmin
    .from('clinics')
    .update(safeUpdates)
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  await cacheDel(`auth_user:${userId}`);
  return {
    ...data,
    profile_image_url: data.profile_image_url || data.image_url || null,
  };
};

// Get clinic operating schedule
const getSchedule = async (clinicId, userId) => {
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('opening_hours')
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .single();

  if (error || !data) {
    throw error || new ApiError(404, 'Clinic not found');
  }

  return data.opening_hours || [];
};

// Update clinic operating schedule
const updateSchedule = async (clinicId, userId, schedule) => {
  const payload = {
    opening_hours: schedule || [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('clinics')
    .update(payload)
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .select('opening_hours')
    .single();

  if (error) throw error;
  return data.opening_hours || [];
};

// Get doctors in clinic
const getDoctors = async (clinicId, userId, page = 1, limit = 20, search = '') => {
  const offset = (page - 1) * limit;
  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .select('id, doctor_id, is_active, doctor:doctors(id, user_id, name, specialization, profile_image_url, consultation_fee, is_available)')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (error) throw error;

  const userContactMap = await buildUserContactMap(
    (data || []).map((association) => association?.doctor?.user_id)
  );

  let doctors = (data || []).map((association) => mapClinicDoctorAssociation(association, userContactMap));

  if (search) {
    const normalizedSearch = search.toLowerCase();
    doctors = doctors.filter((doctor) =>
      [doctor.name, doctor.specialization, doctor.email, doctor.phone, doctor.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  const total = doctors.length;
  const paginated = doctors.slice(offset, offset + limit);

  return {
    data: paginated,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

// Add doctor to clinic
const addDoctor = async (clinicId, userId, doctorId) => {
  const { data: doctor, error: doctorError } = await supabaseAdmin
    .from('doctors')
    .select('id, name')
    .eq('id', doctorId)
    .single();

  if (doctorError || !doctor) {
    throw doctorError || new ApiError(404, 'Doctor not found');
  }

  const { data: existingAssociation, error: existingAssociationError } = await supabaseAdmin
    .from('clinic_doctors')
    .select('id, is_active')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctor.id)
    .maybeSingle();

  if (existingAssociationError) throw existingAssociationError;

  if (existingAssociation && existingAssociation.is_active !== false) {
    throw new ApiError(409, 'Doctor is already linked to this clinic');
  }

  let data;
  let error;
  const nowIso = new Date().toISOString();

  const { data: pendingInvite, error: pendingInviteError } = await supabaseAdmin
    .from('clinic_doctor_invites')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctor.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingInviteError) throw pendingInviteError;
  if (pendingInvite) {
    throw new ApiError(409, 'An invite is already pending for this doctor');
  }

  await supabaseAdmin
    .from('clinic_doctor_invites')
    .update({ status: 'expired', responded_at: nowIso })
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctor.id)
    .eq('status', 'pending')
    .lt('expires_at', nowIso);

  ({ data, error } = await supabaseAdmin
    .from('clinic_doctor_invites')
    .insert({
      clinic_id: clinicId,
      doctor_id: doctor.id,
      invited_by: userId,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*, clinic:clinics(name, city), doctor:doctors(name, specialization)')
    .single());

  if (error) throw error;
  return data;
};

// Remove doctor from clinic
const removeDoctor = async (clinicId, userId, doctorId) => {
  const { error } = await supabaseAdmin
    .from('clinic_doctors')
    .update({ is_active: false })
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId);

  if (error) throw error;
};

// Get appointments for clinic
const getAppointments = async (clinicId, userId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  if (activeDoctorIds.length === 0) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  let query = supabaseAdmin
    .from('appointments')
    .select(`
      id,
      patient_id,
      doctor_id,
      appointment_date,
      time_slot,
      status,
      type,
      reason,
      fee,
      created_at,
      patient:patients(
        id,
        name,
        user_id
      ),
      doctor:doctors(
        id,
        name,
        specialization
      )
    `)
    .eq('clinic_id', clinicId)
    .in('doctor_id', activeDoctorIds);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.date) query = query.eq('appointment_date', filters.date);

  const { data, error } = await query
    .order('appointment_date', { ascending: false })
    .order('time_slot', { ascending: false });

  if (error) throw error;

  const patientContactMap = await buildUserContactMap(
    (data || []).map((appointment) => appointment?.patient?.user_id)
  );

  let appointments = (data || []).map((appointment) => mapClinicAppointment(appointment, patientContactMap));

  if (filters.search) {
    const normalizedSearch = filters.search.toLowerCase();
    appointments = appointments.filter((appointment) =>
      [
        appointment.patientName,
        appointment.patientPhone,
        appointment.doctorName,
        appointment.doctorSpecialization,
        appointment.date,
        appointment.time,
        appointment.status,
        appointment.type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  const total = appointments.length;
  const paginated = appointments.slice(offset, offset + limit);

  return {
    data: paginated,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

// Get consultations for all doctors affiliated with this clinic
const getConsultations = async (userId, page = 1, limit = 20, status, search = '') => {
  const clinic = await getClinicByOwner(userId);
  if (!clinic) throw new ApiError(404, 'Clinic not found');

  // Get all doctor IDs affiliated with this clinic
  const { data: clinicDoctors } = await supabaseAdmin
    .from('clinic_doctors')
    .select('doctor_id')
    .eq('clinic_id', clinic.id)
    .eq('is_active', true);

  const doctorIds = (clinicDoctors || []).map(d => d.doctor_id);
  if (doctorIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 1 } };

  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('consultations')
    .select(`
      id,
      doctor_id,
      patient_id,
      appointment_id,
      status,
      type,
      created_at,
      started_at,
      ended_at,
      diagnosis,
      notes,
      doctor:doctors(id, name, specialization, profile_image_url),
      patient:patients(id, name, user_id),
      appointment:appointments!inner(id, appointment_date, time_slot, type, clinic_id)
    `)
    .in('doctor_id', doctorIds)
    .eq('appointment.clinic_id', clinic.id);

  if (status) query = query.eq('status', status);

  const { data, error } = await query
    .order('created_at', { ascending: false });

  if (error) throw error;

  const patientContactMap = await buildUserContactMap(
    (data || []).map((consultation) => consultation?.patient?.user_id)
  );

  let consultations = (data || []).map((consultation) => mapClinicConsultation(consultation, patientContactMap));

  if (search) {
    const normalizedSearch = search.toLowerCase();
    consultations = consultations.filter((consultation) =>
      [
        consultation.patient?.name,
        consultation.patient?.phone,
        consultation.doctor?.name,
        consultation.doctor?.specialization,
        consultation.status,
        consultation.type,
        consultation.appointment?.appointment_date,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  const total = consultations.length;
  const paginated = consultations.slice(offset, offset + limit);

  return {
    data: paginated,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

// Get clinic doctors (public — for patient discovery)
const getClinicDoctorsPublic = async (clinicId) => {
  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from('clinics')
    .select('id')
    .eq('id', clinicId)
    .eq('is_active', true)
    .eq('is_approved', true)
    .maybeSingle();

  if (clinicError) throw clinicError;
  if (!clinic) throw new ApiError(404, 'Clinic not found');

  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url, consultation_fee, experience_years, is_approved)')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (error) throw error;
  let doctors = (data || [])
    .map(cd => cd.doctor)
    .filter((doctor) => doctor?.is_approved === true)
    .map(({ is_approved: _ignored, ...doctor }) => {
      const rating = parseFloat(doctor.rating) || 0;
      const reviews = parseInt(doctor.total_reviews) || 0;
      const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
      return { ...doctor, smart_score: score };
    });

  doctors.sort((a, b) => b.smart_score - a.smart_score);
  return doctors;
};

module.exports = {
  searchClinics,
  findNearby,
  getClinicById,
  registerClinic,
  getClinicByOwner,
  getDashboard,
  getSchedule,
  updateSchedule,
  updateClinic,
  getDoctors,
  addDoctor,
  removeDoctor,
  getAppointments,
  getConsultations,
  getClinicDoctorsPublic,
};
