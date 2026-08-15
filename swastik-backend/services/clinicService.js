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
const eventEmitter = require('./eventEmitter');
const notificationService = require('./notificationService');

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
    checkedInAt: appointment.checked_in_at || null,
    checkedInBy: appointment.checked_in_by || null,
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

// ── Clinic owner authorization helpers ──────────────────────────────
const assertClinicOwner = async (clinicId, userId) => {
  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('id')
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (!clinic) {
    throw new ApiError(403, 'Clinic not found or access denied');
  }
  return clinic.id;
};

// Fetch an appointment and verify it belongs to this clinic AND an active
// clinic-affiliated doctor (prevents clinic owners from touching unrelated
// appointments — server-side authorization, never frontend-only).
const getClinicScopedAppointment = async (clinicId, appointmentId) => {
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization, user_id)')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error || !appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.clinic_id !== clinicId) {
    throw new ApiError(403, 'This appointment does not belong to your clinic');
  }

  if (!activeDoctorIds.includes(appointment.doctor_id)) {
    throw new ApiError(403, 'This appointment is not linked to an active doctor of your clinic');
  }

  return appointment;
};

const appendStatusHistory = (currentHistory, entry) => {
  const history = Array.isArray(currentHistory) ? currentHistory : [];
  return [...history, entry];
};

const todayIsoDate = () => new Date().toISOString().split('T')[0];

const invalidatePatientDoctorCaches = async (patientUserId, doctorUserId) => {
  await Promise.allSettled([
    patientUserId ? cacheDel(`patient:dashboard:${patientUserId}`) : Promise.resolve(),
    doctorUserId ? cacheDel(`doctor:dashboard:${doctorUserId}`) : Promise.resolve(),
  ]);
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
    if (s) query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%,address.ilike.%${s}%`);
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
  const [clinicRes, associationsRes] = await Promise.all([
    supabaseAdmin
      .from('clinics')
      .select('*, departments:clinic_departments(*), doctors:clinic_doctors(*, doctor:doctors(id, name, specialization, profile_image_url, consultation_fee, is_approved, intro_video_url, experience_years, rating, total_reviews)), reels:clinic_reels(*)')
      .eq('id', id)
      .eq('is_active', true)
      .eq('is_approved', true)
      .single(),
    supabaseAdmin
      .from('facility_provider_associations')
      .select('*')
      .eq('facility_type', 'clinic')
      .eq('facility_id', id)
      .eq('is_active', true)
  ]);

  let { data, error } = clinicRes;

  if (error || !data) {
    throw new ApiError(404, 'Clinic not found');
  }

  // Filter inactive departments
  if (data && data.departments) {
    data.departments = data.departments.filter(d => d.is_active !== false);
  }

  // Filter and enrich doctors
  if (Array.isArray(data.doctors)) {
    data.doctors = data.doctors
      .filter((entry) => entry?.is_active !== false && entry?.doctor?.is_approved === true)
      .map((entry) => {
        if (!entry?.doctor) return entry;
        const { is_approved: _ignored, ...doctor } = entry.doctor;
        const rating = parseFloat(doctor.rating) || 0;
        const reviews = parseInt(doctor.total_reviews) || 0;
        const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
        return { ...entry, doctor: { ...doctor, smart_score: score } };
      })
      .sort((a, b) => (b.doctor?.smart_score || 0) - (a.doctor?.smart_score || 0));
  }

  // Attach Associated Facilities
  if (associationsRes.data && associationsRes.data.length > 0) {
    const pharmacyIds = associationsRes.data.filter(a => a.provider_type === 'pharmacy').map(a => a.provider_id);
    const diagnosticIds = associationsRes.data.filter(a => a.provider_type === 'diagnostic_center').map(a => a.provider_id);
    
    const [pharmaciesRes, diagnosticsRes] = await Promise.all([
      pharmacyIds.length > 0 ? supabaseAdmin.from('pharmacies').select('id, name, address, rating, is_open, image_url').in('id', pharmacyIds) : Promise.resolve({ data: [] }),
      diagnosticIds.length > 0 ? supabaseAdmin.from('diagnostic_centers').select('id, name, address, rating, is_24_hours, image_url').in('id', diagnosticIds) : Promise.resolve({ data: [] })
    ]);
    
    data.associated_pharmacies = pharmaciesRes.data || [];
    data.associated_diagnostic_centers = diagnosticsRes.data || [];
  } else {
    data.associated_pharmacies = [];
    data.associated_diagnostic_centers = [];
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
    .select('*, reels:clinic_reels(*), departments:clinic_departments(*)')
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
        activeDoctors: 0,
        pendingInvites: 0,
        checkedInToday: 0,
        pendingAppointmentsToday: 0,
      },
      todayByStatus: {},
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
    { count: pendingInvites },
    { data: checkedInRows },
    { data: todayStatusRows },
  ] = await Promise.all([
    supabaseAdmin.from('clinic_doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_active', true),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).eq('type', 'clinic').not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('patient_id').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization)').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).not('status', 'in', '(cancelled)').order('time_slot', { ascending: true }).limit(25),
    supabaseAdmin.from('appointments').select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization)').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).not('status', 'in', '(cancelled)').order('appointment_date', { ascending: false }).limit(10),
    supabaseAdmin.from('clinic_doctor_invites').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'pending'),
    supabaseAdmin.from('appointments').select('id, checked_in_at').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).gte('checked_in_at', `${today}T00:00:00.000Z`).not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('status').eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds).eq('appointment_date', today).not('status', 'in', '(cancelled)'),
  ]);

  const todayByStatus = (todayStatusRows || []).reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const pendingAppointmentsToday = todayByStatus.scheduled + todayByStatus.confirmed || 0;

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
      activeDoctors: totalDoctors || 0,
      pendingInvites: pendingInvites || 0,
      checkedInToday: (checkedInRows || []).length || 0,
      pendingAppointmentsToday,
    },
    todayByStatus,
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
    'registration_number', 'license_number', 'license_document_url',
    'website_url', 'established_year', 'insurance_accepted', 'virtual_tour_url',
    'gallery_urls', 'accreditations', 'images'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }

  // opening_hours is stored as TEXT (046); persist arrays as JSON strings
  if (safeUpdates.opening_hours !== undefined) {
    safeUpdates.opening_hours = Array.isArray(safeUpdates.opening_hours)
      ? JSON.stringify(safeUpdates.opening_hours)
      : String(safeUpdates.opening_hours);
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

// Normalize opening_hours stored as either a JSONB array or a JSON string
// (046 converted clinics.opening_hours from JSONB to TEXT). Always returns an array.
const parseOpeningHours = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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

  return parseOpeningHours(data.opening_hours);
};

// Update clinic operating schedule
const updateSchedule = async (clinicId, userId, schedule) => {
  const normalized = Array.isArray(schedule) ? schedule : [];
  const payload = {
    opening_hours: JSON.stringify(normalized),
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
  return parseOpeningHours(data.opening_hours);
};

// Get doctors in clinic
const getDoctors = async (clinicId, userId, page = 1, limit = 20, search = '') => {
  const offset = (page - 1) * limit;
  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .select('id, doctor_id, is_active, joined_at, doctor:doctors(id, user_id, name, specialization, profile_image_url, consultation_fee, is_available, is_approved, rating, total_reviews, experience_years)')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (error) throw error;

  const associations = data || [];

  // Today's appointment count per doctor (single query instead of N+1)
  const today = todayIsoDate();
  const todayCounts = new Map();
  if (associations.length > 0) {
    const { data: todayRows, error: todayError } = await supabaseAdmin
      .from('appointments')
      .select('doctor_id')
      .eq('clinic_id', clinicId)
      .in('doctor_id', associations.map((a) => a.doctor_id))
      .eq('appointment_date', today)
      .not('status', 'in', '(cancelled)');

    if (todayError) throw todayError;
    for (const row of todayRows || []) {
      todayCounts.set(row.doctor_id, (todayCounts.get(row.doctor_id) || 0) + 1);
    }
  }

  const userContactMap = await buildUserContactMap(
    associations.map((association) => association?.doctor?.user_id)
  );

  let doctors = associations.map((association) => {
    const doctor = association?.doctor || {};
    const user = doctor?.user_id ? userContactMap.get(doctor.user_id) : null;
    const isAvailable = doctor.is_available !== false && association.is_active !== false;

    return {
      ...mapClinicDoctorAssociation(association, userContactMap),
      is_approved: doctor.is_approved === true,
      verification: doctor.is_approved === true ? 'verified' : 'pending',
      rating: parseFloat(doctor.rating) || null,
      total_reviews: parseInt(doctor.total_reviews) || 0,
      experience_years: parseInt(doctor.experience_years) || 0,
      consultation_fee: doctor.consultation_fee ?? null,
      profile_image_url: doctor.profile_image_url || null,
      joined_at: association.joined_at || null,
      is_available: isAvailable,
      todayAppointments: todayCounts.get(doctor.id) || 0,
    };
  });

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
      checked_in_at,
      checked_in_by,
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
// ── Clinic Reels ──
const addReel = async (clinicId, userId, data) => {
  const { video_url, thumbnail_url, title } = data;
  const { data: reel, error } = await supabaseAdmin
    .from('clinic_reels')
    .insert({
      clinic_id: clinicId,
      video_url,
      thumbnail_url,
      title
    })
    .select('*')
    .single();

  if (error) throw error;
  return reel;
};

const deleteReel = async (clinicId, userId, reelId) => {
  const { error } = await supabaseAdmin
    .from('clinic_reels')
    .delete()
    .eq('id', reelId)
    .eq('clinic_id', clinicId);

  if (error) throw error;
  return true;
};

// ── Clinic Departments ──
const getClinicDepartments = async (clinicId) => {
  const { data, error } = await supabaseAdmin
    .from('clinic_departments')
    .select('*, headDoctor:doctors(id, name, specialization)')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map((dept) => ({
    ...dept,
    head_doctor_name: dept.headDoctor?.name || null,
    head_doctor_specialization: dept.headDoctor?.specialization || null,
    headDoctor: undefined,
  }));
};

const addDepartment = async (clinicId, userId, deptData) => {
  const name = String(deptData.name || '').trim();
  if (!name) throw new ApiError(400, 'Department name is required');

  const { data: existing } = await supabaseAdmin
    .from('clinic_departments')
    .select('id')
    .eq('clinic_id', clinicId)
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    throw new ApiError(409, 'A department with this name already exists');
  }

  const { data, error } = await supabaseAdmin
    .from('clinic_departments')
    .insert({
      clinic_id: clinicId,
      name,
      description: deptData.description || null,
      head_doctor_id: deptData.head_doctor_id || deptData.headDoctorId || null,
      contact_extension: deptData.contact_extension || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const updateDepartment = async (clinicId, userId, departmentId, updates) => {
  const allowed = ['name', 'description', 'head_doctor_id', 'contact_extension', 'is_active'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  if (updates.headDoctorId !== undefined) safeUpdates.head_doctor_id = updates.headDoctorId;

  if (safeUpdates.name !== undefined) {
    const name = String(safeUpdates.name).trim();
    if (!name) throw new ApiError(400, 'Department name is required');
    safeUpdates.name = name;

    const { data: existing } = await supabaseAdmin
      .from('clinic_departments')
      .select('id')
      .eq('clinic_id', clinicId)
      .ilike('name', name)
      .neq('id', departmentId)
      .maybeSingle();

    if (existing) {
      throw new ApiError(409, 'A department with this name already exists');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('clinic_departments')
    .update(safeUpdates)
    .eq('id', departmentId)
    .eq('clinic_id', clinicId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const deleteDepartment = async (clinicId, userId, departmentId) => {
  const { error } = await supabaseAdmin
    .from('clinic_departments')
    .delete()
    .eq('id', departmentId)
    .eq('clinic_id', clinicId);

  if (error) throw error;
  return true;
};

// ── Clinic Analytics ──
const getAnalytics = async (clinicId, userId, period = '30d') => {
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  if (activeDoctorIds.length === 0) {
    return { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, totalRevenue: 0, avgRating: 0 };
  }

  const days = parseInt(period) || 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString().split('T')[0];

  const [
    { count: totalAppointments },
    { count: completedAppointments },
    { count: cancelledAppointments },
    { data: feeRows },
  ] = await Promise.all([
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds)
      .gte('appointment_date', fromDateStr),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds)
      .eq('status', 'completed').gte('appointment_date', fromDateStr),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds)
      .eq('status', 'cancelled').gte('appointment_date', fromDateStr),
    supabaseAdmin.from('appointments').select('fee')
      .eq('clinic_id', clinicId).in('doctor_id', activeDoctorIds)
      .eq('status', 'completed').gte('appointment_date', fromDateStr),
  ]);

  const totalRevenue = (feeRows || []).reduce((sum, r) => sum + (parseFloat(r.fee) || 0), 0);

  return {
    totalAppointments: totalAppointments || 0,
    completedAppointments: completedAppointments || 0,
    cancelledAppointments: cancelledAppointments || 0,
    totalRevenue,
    period: `${days}d`,
  };
};

// ── Clinic Doctor Invites ──
const getClinicInvites = async (clinicId, userId, page = 1, limit = 20, status = '') => {
  await assertClinicOwner(clinicId, userId);

  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('clinic_doctor_invites')
    .select(`
      id,
      clinic_id,
      doctor_id,
      status,
      created_at,
      responded_at,
      expires_at,
      doctor:doctors(id, user_id, name, specialization, profile_image_url, is_approved),
      invitedBy:users!clinic_doctor_invites_invited_by_fkey(id, name, email)
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  const userContactMap = await buildUserContactMap(
    (data || []).map((invite) => invite?.doctor?.user_id)
  );

  const invites = (data || []).map((invite) => {
    const doctor = invite?.doctor || {};
    const doctorUser = doctor?.user_id ? userContactMap.get(doctor.user_id) : null;
    return {
      id: invite.id,
      clinicId: invite.clinic_id,
      doctorId: invite.doctor_id,
      status: invite.status,
      createdAt: invite.created_at,
      respondedAt: invite.responded_at,
      expiresAt: invite.expires_at,
      invitedByName: invite.invitedBy?.name || 'Clinic Owner',
      doctor: {
        id: doctor.id || '',
        name: doctor.name || 'Doctor',
        specialization: doctor.specialization || '',
        email: doctorUser?.email || '',
        phone: doctorUser?.phone || '',
        profile_image_url: doctor.profile_image_url || null,
        is_approved: doctor.is_approved === true,
      },
    };
  });

  const total = invites.length;

  return {
    data: invites.slice(offset, offset + limit),
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

const cancelClinicInvite = async (clinicId, userId, inviteId) => {
  await assertClinicOwner(clinicId, userId);

  const { data: invite, error } = await supabaseAdmin
    .from('clinic_doctor_invites')
    .select('id, clinic_id, status')
    .eq('id', inviteId)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error || !invite) {
    throw new ApiError(404, 'Invite not found');
  }

  if (invite.status !== 'pending') {
    throw new ApiError(409, `Only pending invites can be cancelled (current status: ${invite.status})`);
  }

  const { error: updateError } = await supabaseAdmin
    .from('clinic_doctor_invites')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (updateError) throw updateError;
  return { id: invite.id, status: 'cancelled' };
};

// ── Clinic Patients ──
const getClinicPatients = async (clinicId, userId, { search = '' } = {}, page = 1, limit = 20) => {
  await assertClinicOwner(clinicId, userId);
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  if (activeDoctorIds.length === 0) {
    return { data: [], pagination: { page, limit, total: 0, totalPages: 1 } };
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      patient_id,
      status,
      appointment_date,
      time_slot,
      patient:patients(id, name, user_id, date_of_birth, gender, profile_image_url),
      doctor:doctors(id, name, specialization)
    `)
    .eq('clinic_id', clinicId)
    .in('doctor_id', activeDoctorIds)
    .not('status', 'in', '(cancelled)')
    .order('appointment_date', { ascending: false });

  if (error) throw error;

  const patientContactMap = await buildUserContactMap(
    (data || []).map((appointment) => appointment?.patient?.user_id)
  );

  const byPatient = new Map();
  for (const appointment of data || []) {
    const patient = appointment?.patient || {};
    if (!patient?.id) continue;
    const patientUser = patient.user_id ? patientContactMap.get(patient.user_id) : null;

    if (!byPatient.has(patient.id)) {
      byPatient.set(patient.id, {
        id: patient.id,
        name: patient.name || 'Patient',
        phone: patientUser?.phone || '',
        email: patientUser?.email || '',
        gender: patient.gender || null,
        dateOfBirth: patient.date_of_birth || null,
        profile_image_url: patient.profile_image_url || null,
        totalVisits: 0,
        lastVisit: null,
        lastVisitDoctor: null,
        nextAppointment: null,
        upcomingCount: 0,
        lastStatus: null,
      });
    }

    const record = byPatient.get(patient.id);
    record.totalVisits += 1;

    const isUpcoming = ['scheduled', 'confirmed'].includes(appointment.status);
    if (isUpcoming && (!record.nextAppointment || appointment.appointment_date < record.nextAppointment.appointment_date)) {
      record.nextAppointment = {
        appointment_date: appointment.appointment_date,
        time_slot: appointment.time_slot,
        status: appointment.status,
        doctorName: appointment.doctor?.name || 'Doctor',
      };
      record.upcomingCount += 1;
    }

    if (appointment.appointment_date >= (record.lastVisit || '1970-01-01')) {
      if (!record.lastVisit || appointment.appointment_date > record.lastVisit) {
        record.lastVisit = appointment.appointment_date;
        record.lastVisitDoctor = appointment.doctor?.name || null;
        record.lastStatus = appointment.status;
      }
    }
  }

  let patients = [...byPatient.values()];

  if (search) {
    const normalized = search.toLowerCase();
    patients = patients.filter((patient) =>
      [patient.name, patient.phone, patient.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }

  patients.sort((a, b) => b.totalVisits - a.totalVisits);
  const total = patients.length;
  const offset = (page - 1) * limit;

  return {
    data: patients.slice(offset, offset + limit),
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

const getClinicPatientDetails = async (clinicId, userId, patientId) => {
  await assertClinicOwner(clinicId, userId);
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  if (activeDoctorIds.length === 0) {
    throw new ApiError(403, 'Clinic has no active doctors to establish patient relationship');
  }

  // Fetch all appointments for this patient at this clinic with active doctors
  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from('appointments')
    .select(`
      id,
      status,
      appointment_date,
      time_slot,
      consultation_type,
      payment_status,
      doctor:doctors(id, name, specialization)
    `)
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .in('doctor_id', activeDoctorIds)
    .order('appointment_date', { ascending: false });

  if (appointmentsError) throw appointmentsError;

  if (!appointments || appointments.length === 0) {
    throw new ApiError(403, 'Patient has no relationship with this clinic');
  }

  // Fetch patient profile
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id, name, date_of_birth, gender, profile_image_url, user_id')
    .eq('id', patientId)
    .single();

  if (patientError || !patient) throw patientError || new ApiError(404, 'Patient not found');

  // Fetch user email/phone
  let email = null;
  let phone = null;
  if (patient.user_id) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, phone')
      .eq('id', patient.user_id)
      .single();
    if (user) {
      email = user.email;
      phone = user.phone;
    }
  }

  // Calculate metrics
  const doctorsSeenMap = new Map();
  let nextAppointment = null;
  let lastVisit = null;

  for (const appt of appointments) {
    if (appt.doctor) {
      if (!doctorsSeenMap.has(appt.doctor.id)) {
        doctorsSeenMap.set(appt.doctor.id, {
          id: appt.doctor.id,
          name: appt.doctor.name,
          specialization: appt.doctor.specialization,
          visitCount: 0
        });
      }
      doctorsSeenMap.get(appt.doctor.id).visitCount++;
    }

    const isUpcoming = ['scheduled', 'confirmed'].includes(appt.status);
    if (isUpcoming && (!nextAppointment || appt.appointment_date < nextAppointment.appointment_date)) {
      nextAppointment = appt;
    }

    if (appt.status === 'completed' && (!lastVisit || appt.appointment_date > lastVisit.appointment_date)) {
      lastVisit = appt;
    }
  }

  return {
    patient: {
      ...patient,
      email,
      phone,
    },
    metrics: {
      totalVisits: appointments.length,
      nextAppointment,
      lastVisit,
    },
    appointments,
    doctorsSeen: Array.from(doctorsSeenMap.values()).sort((a, b) => b.visitCount - a.visitCount)
  };
};

// ── Clinic Appointment Workflow ──
// Clinic front desk may confirm/cancel/mark-no-show/reschedule/check-in
// appointments of its own active doctors. Clinical statuses (in_progress,
// completed) remain exclusively doctor-controlled via appointmentService.
const CLINIC_STATUS_TRANSITIONS = {
  scheduled: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['cancelled', 'no_show'],
};

const updateAppointmentStatusForClinic = async (clinicId, userId, appointmentId, status, reason = '') => {
  await assertClinicOwner(clinicId, userId);

  const appointment = await getClinicScopedAppointment(clinicId, appointmentId);

  const allowed = CLINIC_STATUS_TRANSITIONS[appointment.status];
  if (!allowed || !allowed.includes(status)) {
    throw new ApiError(400, `Cannot transition clinic appointment from '${appointment.status}' to '${status}'`);
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from('appointments')
    .update({
      status,
      cancellation_reason: status === 'cancelled' ? (reason || 'Cancelled by clinic') : null,
      cancelled_by: status === 'cancelled' ? userId : null,
      cancelled_at: status === 'cancelled' ? nowIso : null,
      status_history: appendStatusHistory(appointment.status_history, {
        from: appointment.status,
        to: status,
        by: 'clinic',
        actor_user_id: userId,
        at: nowIso,
      }),
      updated_at: nowIso,
    })
    .eq('id', appointment.id)
    .select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization, user_id)')
    .single();

  if (error || !updated) throw error || new ApiError(404, 'Appointment not found');

  const patientUser = updated.patient?.user_id;
  const doctorUser = updated.doctor?.user_id;

  await invalidatePatientDoctorCaches(patientUser, doctorUser);

  eventEmitter.emitAppointmentUpdated({
    ...updated,
    doctor_id: doctorUser || updated.doctor_id,
    patient_id: patientUser || updated.patient_id,
  });

  await Promise.allSettled([
    patientUser ? notificationService.sendNotification(patientUser, {
      title: status === 'no_show' ? '⚠️ Appointment Marked as No Show' : '🩺 Appointment Updated',
      message: status === 'no_show'
        ? `Your appointment at the clinic on ${updated.appointment_date} at ${updated.time_slot} was marked as a no-show.`
        : `Your appointment at the clinic on ${updated.appointment_date} at ${updated.time_slot} is now ${status.replace('_', ' ')}.`,
      type: 'appointment_status_changed',
      data: { appointmentId: updated.id, status },
    }) : Promise.resolve(),
    doctorUser ? notificationService.sendNotification(doctorUser, {
      title: status === 'no_show' ? '📭 Patient No Show' : '🩺 Appointment Updated',
      message: `Appointment with ${updated.patient?.name || 'patient'} on ${updated.appointment_date} at ${updated.time_slot} is now ${status.replace('_', ' ')}.`,
      type: 'appointment_status_changed',
      data: { appointmentId: updated.id, status },
    }) : Promise.resolve(),
  ]);

  return updated;
};

const rescheduleClinicAppointment = async (clinicId, userId, appointmentId, date, timeSlot) => {
  await assertClinicOwner(clinicId, userId);

  const appointment = await getClinicScopedAppointment(clinicId, appointmentId);

  if (!['scheduled', 'confirmed'].includes(appointment.status)) {
    throw new ApiError(400, 'Only scheduled or confirmed appointments can be rescheduled');
  }

  const { data: conflicts } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('doctor_id', appointment.doctor_id)
    .eq('appointment_date', date)
    .eq('time_slot', timeSlot)
    .in('status', ['scheduled', 'confirmed'])
    .neq('id', appointment.id)
    .limit(1);

  if (conflicts && conflicts.length > 0) {
    throw new ApiError(409, 'The new time slot is already booked');
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from('appointments')
    .update({
      appointment_date: date,
      time_slot: timeSlot,
      status: appointment.status,
      status_history: appendStatusHistory(appointment.status_history, {
        from: 'reschedule',
        to: `${date} ${timeSlot}`,
        by: 'clinic',
        actor_user_id: userId,
        at: nowIso,
      }),
      updated_at: nowIso,
    })
    .eq('id', appointment.id)
    .in('status', ['scheduled', 'confirmed'])
    .select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization, user_id)')
    .single();

  if (error || !updated) {
    throw new ApiError(409, 'Appointment was modified by another request. Please try again.');
  }

  const patientUser = updated.patient?.user_id;
  const doctorUser = updated.doctor?.user_id;

  await invalidatePatientDoctorCaches(patientUser, doctorUser);

  eventEmitter.emitAppointmentUpdated({
    ...updated,
    doctor_id: doctorUser || updated.doctor_id,
    patient_id: patientUser || updated.patient_id,
  });

  await Promise.allSettled([
    patientUser ? notificationService.sendNotification(patientUser, {
      title: '🔁 Appointment Rescheduled',
      message: `Your clinic appointment is now on ${date} at ${timeSlot}.`,
      type: 'appointment_rescheduled',
      data: { appointmentId: updated.id, date, timeSlot },
    }) : Promise.resolve(),
    doctorUser ? notificationService.sendNotification(doctorUser, {
      title: '🔁 Appointment Rescheduled',
      message: `A clinic appointment was rescheduled to ${date} at ${timeSlot}.`,
      type: 'appointment_rescheduled',
      data: { appointmentId: updated.id, date, timeSlot },
    }) : Promise.resolve(),
  ]);

  return updated;
};

const checkInAppointment = async (clinicId, userId, appointmentId) => {
  await assertClinicOwner(clinicId, userId);

  const appointment = await getClinicScopedAppointment(clinicId, appointmentId);

  if (!['scheduled', 'confirmed'].includes(appointment.status)) {
    throw new ApiError(400, `Only scheduled or confirmed appointments can be checked in (current: ${appointment.status})`);
  }

  if (appointment.checked_in_at) {
    throw new ApiError(409, 'Patient is already checked in');
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from('appointments')
    .update({
      checked_in_at: nowIso,
      checked_in_by: userId,
      status_history: appendStatusHistory(appointment.status_history, {
        from: appointment.status,
        to: 'checked_in',
        by: 'clinic',
        actor_user_id: userId,
        at: nowIso,
      }),
      updated_at: nowIso,
    })
    .eq('id', appointment.id)
    .select('*, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization, user_id)')
    .single();

  if (error || !updated) throw error || new ApiError(404, 'Appointment not found');

  const patientUser = updated.patient?.user_id;
  const doctorUser = updated.doctor?.user_id;

  await invalidatePatientDoctorCaches(patientUser, doctorUser);

  // Real-time: clinic dashboard refresh + doctor "patient arrived" signal.
  eventEmitter.emitAppointmentUpdated({
    ...updated,
    doctor_id: doctorUser || updated.doctor_id,
    patient_id: patientUser || updated.patient_id,
  });
  if (doctorUser) {
    eventEmitter.notifyUser(doctorUser, 'appointment:check-in', {
      appointmentId: updated.id,
      appointmentDate: updated.appointment_date,
      timeSlot: updated.time_slot,
      patientName: updated.patient?.name || 'Patient',
      checkedInAt: nowIso,
    });
  }

  await Promise.allSettled([
    doctorUser ? notificationService.sendNotification(doctorUser, {
      title: '✅ Patient Checked In',
      message: `${updated.patient?.name || 'Patient'} has checked in for the ${updated.time_slot} appointment.`,
      type: 'appointment_check_in',
      data: { appointmentId: updated.id, appointmentDate: updated.appointment_date, timeSlot: updated.time_slot },
    }) : Promise.resolve(),
    patientUser ? notificationService.sendNotification(patientUser, {
      title: '✅ You Are Checked In',
      message: `You have been checked in at the clinic. ${updated.doctor?.name ? `Dr. ${updated.doctor.name} will see you shortly.` : ''}`,
      type: 'appointment_check_in',
      data: { appointmentId: updated.id },
    }) : Promise.resolve(),
  ]);

  return updated;
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
  addReel,
  deleteReel,
  getClinicDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  getAnalytics,
  getClinicInvites,
  cancelClinicInvite,
  getClinicPatients,
  getClinicPatientDetails,
  updateAppointmentStatusForClinic,
  rescheduleClinicAppointment,
  checkInAppointment,
};
