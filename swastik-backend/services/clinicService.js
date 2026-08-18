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

  let patientAge = null;
  if (patient.date_of_birth) {
    const birthDate = new Date(patient.date_of_birth);
    if (!isNaN(birthDate.getTime())) {
      const ageDifMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDifMs);
      patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    }
  }

  return {
    id: appointment.id,
    patientName: patient.name || 'Patient',
    patientId: patient.id || appointment.patient_id || '',
    patientPhone: patientUser?.phone || '',
    patientEmail: patientUser?.email || '',
    patientGender: patient.gender || null,
    patientAge,
    patientProfileImage: patient.profile_image_url || null,
    date: appointment.appointment_date || null,
    time: appointment.time_slot || '',
    type: appointment.type || 'clinic',
    status: appointment.status || 'scheduled',
    doctorId: doctor.id || appointment.doctor_id || '',
    doctorName: doctor.name || 'Doctor',
    doctorSpecialization: doctor.specialization || '',
    doctorProfileImage: doctor.profile_image_url || null,
    reason: appointment.reason || null,
    symptoms: appointment.symptoms || null,
    notes: appointment.notes || null,
    fee: appointment.fee ?? null,
    paymentStatus: appointment.payment_status || 'pending',
    paymentMethod: appointment.payment_method || null,
    checkedInAt: appointment.checked_in_at || null,
    checkedInBy: appointment.checked_in_by || null,
    statusHistory: Array.isArray(appointment.status_history) ? appointment.status_history : [],
    created_at: appointment.created_at || null,
    updated_at: appointment.updated_at || null,
  };
};

const mapClinicConsultation = (consultation, patientContactMap = new Map()) => {
  const patient = consultation?.patient || {};
  const doctor = consultation?.doctor || {};
  const patientUser = patient?.user_id ? patientContactMap.get(patient.user_id) : null;
  const appointment = consultation?.appointment || {};
  const prescriptions = consultation?.prescriptions || [];
  const hasPrescription = Array.isArray(prescriptions) ? prescriptions.length > 0 : !!prescriptions;

  let durationMinutes = null;
  if (consultation.started_at && consultation.ended_at) {
    const diffMs = new Date(consultation.ended_at).getTime() - new Date(consultation.started_at).getTime();
    if (diffMs > 0) {
      durationMinutes = Math.round(diffMs / (1000 * 60));
    }
  }

  let patientAge = null;
  if (patient.date_of_birth) {
    const birthDate = new Date(patient.date_of_birth);
    if (!isNaN(birthDate.getTime())) {
      const ageDifMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDifMs);
      patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    }
  }

  return {
    id: consultation.id,
    status: consultation.status || 'scheduled',
    type: consultation.type || appointment.type || 'video',
    created_at: consultation.created_at || null,
    started_at: consultation.started_at || null,
    ended_at: consultation.ended_at || null,
    durationMinutes,
    room_id: consultation.room_id || null,
    fee: consultation.fee ?? appointment.fee ?? appointment.consultation_fee ?? null,
    patient: {
      id: patient.id || consultation.patient_id || '',
      name: patient.name || 'Patient',
      phone: patientUser?.phone || '',
      email: patientUser?.email || '',
      gender: patient.gender || null,
      age: patientAge,
      date_of_birth: patient.date_of_birth || null,
      profile_image_url: patient.profile_image_url || null,
    },
    doctor: {
      id: doctor.id || consultation.doctor_id || '',
      name: doctor.name || 'Doctor',
      specialization: doctor.specialization || '',
      profile_image_url: doctor.profile_image_url || null,
    },
    appointment: appointment.id ? {
      id: appointment.id,
      date: appointment.appointment_date || null,
      time: appointment.time_slot || '',
      type: appointment.type || 'clinic',
      status: appointment.status || null,
      reason: appointment.reason || null,
      symptoms: appointment.symptoms || null,
      fee: appointment.fee ?? appointment.consultation_fee ?? null,
      paymentStatus: appointment.payment_status || 'pending',
    } : null,
    hasPrescription,
    prescriptionCount: Array.isArray(prescriptions) ? prescriptions.length : (prescriptions ? 1 : 0),
    prescriptions: Array.isArray(prescriptions) ? prescriptions : (prescriptions ? [prescriptions] : []),
    diagnosis: consultation.diagnosis || null,
    notes: consultation.notes || null,
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

// Get dashboard stats & Command Center payload
const getDashboard = async (clinicId, userId) => {
  // Verify this user owns the clinic
  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('id, name')
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .single();

  if (!clinic) {
    throw new ApiError(403, 'Clinic not found or access denied');
  }

  const today = new Date().toISOString().split('T')[0];
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Parallelized execution across all clinic operational domains
  const [
    clinicDoctorsResult,
    todayAppointmentsResult,
    recentAppointmentsResult,
    pendingInvitesResult,
    checkedInRowsResult,
    todayStatusRowsResult,
    sevenDayAppointmentsResult,
    patientRowsResult,
    doctorLeavesResult,
    pharmacyOrdersResult,
    diagnosticBookingsResult,
    hospitalReferralsResult,
    reviewsResult,
  ] = await Promise.all([
    // 1. Active doctors with profile details
    supabaseAdmin
      .from('clinic_doctors')
      .select('doctor_id, doctor:doctors(id, name, specialization, profile_image_url, rating, total_reviews)')
      .eq('clinic_id', clinicId)
      .eq('is_active', true),

    // 2. Today's appointments with patient & doctor info
    supabaseAdmin
      .from('appointments')
      .select('id, patient_id, doctor_id, appointment_date, time_slot, status, type, fee, checked_in_at, created_at, patient:patients(id, name, user_id), doctor:doctors(id, name, specialization)')
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today)
      .not('status', 'in', '(cancelled)')
      .order('time_slot', { ascending: true })
      .limit(50),

    // 3. Recent appointments for activity feed
    supabaseAdmin
      .from('appointments')
      .select('id, patient_id, doctor_id, appointment_date, time_slot, status, type, fee, checked_in_at, updated_at, patient:patients(id, name), doctor:doctors(id, name)')
      .eq('clinic_id', clinicId)
      .order('updated_at', { ascending: false })
      .limit(10),

    // 4. Pending doctor invitations
    supabaseAdmin
      .from('clinic_doctor_invites')
      .select('id, doctor_id, status, created_at, doctor:doctors(id, name)')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending'),

    // 5. Checked-in rows today
    supabaseAdmin
      .from('appointments')
      .select('id, checked_in_at')
      .eq('clinic_id', clinicId)
      .gte('checked_in_at', `${today}T00:00:00.000Z`)
      .not('status', 'in', '(cancelled)'),

    // 6. Today status breakdown & revenue sum
    supabaseAdmin
      .from('appointments')
      .select('status, fee, type')
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today)
      .not('status', 'in', '(cancelled)'),

    // 7. Last 7 days appointments for trend chart
    supabaseAdmin
      .from('appointments')
      .select('appointment_date, status, patient_id')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', sevenDaysAgoStr)
      .lte('appointment_date', today)
      .not('status', 'in', '(cancelled)'),

    // 8. Overall patient IDs for repeat patient rate
    supabaseAdmin
      .from('appointments')
      .select('patient_id')
      .eq('clinic_id', clinicId)
      .not('status', 'in', '(cancelled)'),

    // 9. Doctor leaves today and upcoming 7 days
    activeDoctorIds.length > 0
      ? supabaseAdmin
        .from('doctor_leaves')
        .select('id, doctor_id, start_date, end_date, reason, status, created_at, doctor:doctors(id, name)')
        .in('doctor_id', activeDoctorIds)
        .gte('end_date', today)
        .order('start_date', { ascending: true })
      : Promise.resolve({ data: [] }),

    // 10. Pharmacy orders (last 30 days)
    supabaseAdmin
      .from('pharmacy_orders')
      .select('id, pharmacy_id, status, total_amount, created_at, updated_at, pharmacy:pharmacies(id, name)')
      .eq('clinic_id', clinicId)
      .gte('created_at', thirtyDaysAgoStr)
      .order('created_at', { ascending: false }),

    // 11. Diagnostic bookings (last 30 days)
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('id, center_id, status, report_url, created_at, updated_at, center:diagnostic_centers(id, name)')
      .eq('clinic_id', clinicId)
      .gte('created_at', thirtyDaysAgoStr)
      .order('created_at', { ascending: false }),

    // 12. Hospital referrals (last 30 days)
    supabaseAdmin
      .from('patient_referrals')
      .select('id, target_hospital_id, status, urgency, reason, created_at, updated_at, hospital:hospitals(id, name)')
      .eq('referring_clinic_id', clinicId)
      .gte('created_at', thirtyDaysAgoStr)
      .order('created_at', { ascending: false }),

    // 13. Clinic reviews
    supabaseAdmin
      .from('reviews')
      .select('id, rating, comment, is_anonymous, response, created_at, patient:patients(id, name)')
      .eq('reviewable_type', 'clinic')
      .eq('reviewable_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const activeDoctorsList = (clinicDoctorsResult.data || []).map((row) => row.doctor).filter(Boolean);
  const totalDoctors = activeDoctorsList.length;

  const todayAppointments = todayAppointmentsResult.data || [];
  const totalTodayAppointments = todayAppointments.length;
  const walkInsToday = (todayStatusRowsResult.data || []).filter((r) => r.type === 'clinic' || r.type === 'in_person').length;

  // Compute today's revenue (sum of fees for confirmed/completed appointments)
  const todaysRevenue = (todayStatusRowsResult.data || []).reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

  // Status mapping today
  const todayByStatus = (todayStatusRowsResult.data || []).reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const pendingAppointmentsToday = (todayByStatus.scheduled || 0) + (todayByStatus.confirmed || 0);

  // Checked-in count
  const checkedInToday = (checkedInRowsResult.data || []).length;

  // Unique patients today
  const todayPatientIds = new Set(todayAppointments.map((a) => a.patient_id).filter(Boolean));
  const todaysPatientsCount = todayPatientIds.size;

  // Lifetime repeat patients
  const allPatientIds = (patientRowsResult.data || []).map((r) => r.patient_id).filter(Boolean);
  const uniquePatients = new Set(allPatientIds).size;
  const patientVisitCounts = allPatientIds.reduce((acc, pid) => {
    acc[pid] = (acc[pid] || 0) + 1;
    return acc;
  }, {});
  const repeatPatientCount = Object.values(patientVisitCounts).filter((n) => n > 1).length;
  const repeatPatients = uniquePatients > 0
    ? `${Math.round((repeatPatientCount / uniquePatients) * 100)}%`
    : '0%';

  // ── Connected Care Metrics ──
  const pharmacyOrders = pharmacyOrdersResult.data || [];
  const pharmacyMetrics = {
    totalOrders: pharmacyOrders.length,
    pending: pharmacyOrders.filter((o) => (o.status || 'pending').toLowerCase() === 'pending').length,
    processing: pharmacyOrders.filter((o) => ['processing', 'accepted', 'out_for_delivery', 'dispatched'].includes((o.status || '').toLowerCase())).length,
    ready: pharmacyOrders.filter((o) => (o.status || '').toLowerCase() === 'ready').length,
    completed: pharmacyOrders.filter((o) => ['completed', 'delivered'].includes((o.status || '').toLowerCase())).length,
  };

  const diagnosticBookings = diagnosticBookingsResult.data || [];
  const diagnosticMetrics = {
    totalBookings: diagnosticBookings.length,
    pending: diagnosticBookings.filter((b) => (b.status || 'pending').toLowerCase() === 'pending').length,
    sampleCollected: diagnosticBookings.filter((b) => (b.status || '').toLowerCase() === 'sample_collected').length,
    processing: diagnosticBookings.filter((b) => (b.status || '').toLowerCase() === 'processing').length,
    reportsReady: diagnosticBookings.filter((b) => (b.status || '').toLowerCase() === 'report_ready' || b.report_url).length,
    completed: diagnosticBookings.filter((b) => (b.status || '').toLowerCase() === 'completed').length,
  };

  const hospitalReferrals = hospitalReferralsResult.data || [];
  const referralMetrics = {
    totalReferrals: hospitalReferrals.length,
    pending: hospitalReferrals.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length,
    accepted: hospitalReferrals.filter((r) => (r.status || '').toLowerCase() === 'accepted').length,
    admitted: hospitalReferrals.filter((r) => ['admitted', 'admission_pending'].includes((r.status || '').toLowerCase())).length,
    discharged: hospitalReferrals.filter((r) => (r.status || '').toLowerCase() === 'discharged').length,
  };

  // ── Actionable Needs Attention Alerts ──
  const needsAttention = [];
  const pendingInvites = (pendingInvitesResult.data || []).length;

  if (pendingInvites > 0) {
    needsAttention.push({
      id: 'invite-pending',
      severity: 'warning',
      source: 'clinic',
      title: `${pendingInvites} Doctor Invite${pendingInvites > 1 ? 's' : ''} Pending`,
      description: `${pendingInvites} doctor invitation${pendingInvites > 1 ? 's are' : ' is'} awaiting response.`,
      timestamp: new Date().toISOString(),
      actionUrl: '/clinic/doctors?tab=invites',
      actionLabel: 'View Invites',
    });
  }

  if (referralMetrics.pending > 0) {
    needsAttention.push({
      id: 'ref-pending',
      severity: 'critical',
      source: 'hospital',
      title: `${referralMetrics.pending} Hospital Referral${referralMetrics.pending > 1 ? 's' : ''} Pending`,
      description: 'Patient referral requests submitted to partner hospitals are awaiting review.',
      timestamp: new Date().toISOString(),
      actionUrl: '/clinic/referrals',
      actionLabel: 'View Referrals',
    });
  }

  if (pharmacyMetrics.pending > 0) {
    needsAttention.push({
      id: 'pharm-pending',
      severity: 'warning',
      source: 'pharmacy',
      title: `${pharmacyMetrics.pending} Pharmacy Order${pharmacyMetrics.pending > 1 ? 's' : ''} Pending Acceptance`,
      description: 'Prescription orders routed to partner pharmacies need acceptance.',
      timestamp: new Date().toISOString(),
      actionUrl: '/clinic/pharmacies',
      actionLabel: 'View Orders',
    });
  }

  if (diagnosticMetrics.reportsReady > 0) {
    needsAttention.push({
      id: 'dx-ready',
      severity: 'info',
      source: 'diagnostics',
      title: `${diagnosticMetrics.reportsReady} Diagnostic Report${diagnosticMetrics.reportsReady > 1 ? 's' : ''} Ready`,
      description: 'Authorized lab test reports have been uploaded and are ready for doctor review.',
      timestamp: new Date().toISOString(),
      actionUrl: '/clinic/diagnostic-centers',
      actionLabel: 'View Reports',
    });
  }

  const reviews = reviewsResult.data || [];
  const unrespondedReviews = reviews.filter((r) => !r.response).length;
  if (unrespondedReviews > 0) {
    needsAttention.push({
      id: 'reviews-unresponded',
      severity: 'info',
      source: 'reviews',
      title: `${unrespondedReviews} Unanswered Clinic Review${unrespondedReviews > 1 ? 's' : ''}`,
      description: 'Patient feedback submitted for your clinic is waiting for provider response.',
      timestamp: new Date().toISOString(),
      actionUrl: '/clinic/reviews',
      actionLabel: 'View Reviews',
    });
  }

  // Active / Upcoming Leaves in next 7 days
  const leaves = doctorLeavesResult.data || [];
  const leavesToday = leaves.filter((l) => l.start_date <= today && l.end_date >= today);
  if (leavesToday.length > 0) {
    needsAttention.push({
      id: 'doctor-leave-today',
      severity: 'warning',
      source: 'schedule',
      title: `${leavesToday.length} Doctor${leavesToday.length > 1 ? 's' : ''} on Leave Today`,
      description: `Active leave: ${leavesToday.map((l) => `Dr. ${l.doctor?.name || 'Doctor'}`).join(', ')}.`,
      timestamp: new Date().toISOString(),
      actionUrl: '/clinic/schedule',
      actionLabel: 'View Schedule',
    });
  }

  const pendingActionsCount = needsAttention.length + (todayByStatus.scheduled || 0);

  // ── Team Snapshot (Top Doctors) ──
  const doctorTodayApptsCount = todayAppointments.reduce((acc, a) => {
    if (a.doctor_id) {
      acc[a.doctor_id] = (acc[a.doctor_id] || 0) + 1;
    }
    return acc;
  }, {});

  const doctorTodayCompletedCount = todayAppointments.reduce((acc, a) => {
    if (a.doctor_id && a.status === 'completed') {
      acc[a.doctor_id] = (acc[a.doctor_id] || 0) + 1;
    }
    return acc;
  }, {});

  const onLeaveDoctorIds = new Set(leavesToday.map((l) => l.doctor_id));

  const teamSnapshot = activeDoctorsList.slice(0, 5).map((doc) => ({
    id: doc.id,
    name: doc.name,
    specialization: doc.specialization || 'General Physician',
    profileImageUrl: doc.profile_image_url || null,
    rating: doc.rating ? parseFloat(Number(doc.rating).toFixed(1)) : 5.0,
    totalReviews: doc.total_reviews || 0,
    todaysAppointments: doctorTodayApptsCount[doc.id] || 0,
    completedToday: doctorTodayCompletedCount[doc.id] || 0,
    onLeaveToday: onLeaveDoctorIds.has(doc.id),
  }));

  // ── Reviews Snapshot ──
  const totalReviewsCount = reviews.length;
  const totalRatingSum = reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
  const clinicAverageRating = totalReviewsCount > 0 ? parseFloat((totalRatingSum / totalReviewsCount).toFixed(1)) : 5.0;

  const reviewsSnapshot = {
    averageRating: clinicAverageRating,
    totalReviews: totalReviewsCount,
    unrespondedCount: unrespondedReviews,
    recentReviews: reviews.slice(0, 3).map((r) => ({
      id: r.id,
      patientName: r.is_anonymous ? 'Anonymous Patient' : (r.patient?.name || 'Patient'),
      rating: r.rating || 5,
      comment: r.comment || null,
      createdAt: r.created_at,
      hasResponse: Boolean(r.response),
    })),
  };

  // ── 7-Day Trends ──
  const sevenDayAppointments = sevenDayAppointmentsResult.data || [];
  const dateMap = new Map();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    dateMap.set(dStr, { date: dStr, label, count: 0, completed: 0, patients: new Set() });
  }

  sevenDayAppointments.forEach((a) => {
    if (dateMap.has(a.appointment_date)) {
      const entry = dateMap.get(a.appointment_date);
      entry.count += 1;
      if (a.status === 'completed') entry.completed += 1;
      if (a.patient_id) entry.patients.add(a.patient_id);
    }
  });

  const trends = {
    appointmentsLast7Days: Array.from(dateMap.values()).map((e) => ({
      date: e.date,
      label: e.label,
      count: e.count,
      completed: e.completed,
    })),
    patientsLast7Days: Array.from(dateMap.values()).map((e) => ({
      date: e.date,
      label: e.label,
      count: e.patients.size,
    })),
  };

  // ── Recent Activity Feed ──
  const recentAppointments = (recentAppointmentsResult.data || []).map((a) => ({
    id: `appt-${a.id}`,
    type: 'appointment',
    title: `Appointment ${a.status.replace('_', ' ')}`,
    description: `${a.patient?.name || 'Patient'} with Dr. ${a.doctor?.name || 'Doctor'} (${a.time_slot || a.appointment_date})`,
    timestamp: a.updated_at || a.created_at,
    actionUrl: '/clinic/appointments',
    status: a.status,
  }));

  const recentReferrals = hospitalReferrals.slice(0, 3).map((r) => ({
    id: `ref-${r.id}`,
    type: 'referral',
    title: `Hospital Referral: ${r.hospital?.name || 'Partner Hospital'}`,
    description: `Referral is currently ${r.status.replace('_', ' ')} (${r.urgency || 'routine'}).`,
    timestamp: r.updated_at || r.created_at,
    actionUrl: '/clinic/referrals',
    status: r.status,
  }));

  const recentPharmacy = pharmacyOrders.slice(0, 3).map((o) => ({
    id: `pharm-${o.id}`,
    type: 'pharmacy',
    title: `Pharmacy Order: ${o.pharmacy?.name || 'Partner Pharmacy'}`,
    description: `Order status is ${o.status.replace('_', ' ')}.`,
    timestamp: o.updated_at || o.created_at,
    actionUrl: '/clinic/pharmacies',
    status: o.status,
  }));

  const recentActivity = [...recentAppointments, ...recentReferrals, ...recentPharmacy]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    stats: {
      totalDoctors,
      todayAppointments: totalTodayAppointments,
      totalStaff: totalDoctors,
      todaysAppointments: totalTodayAppointments,
      walkInsToday,
      repeatPatients,
      totalPatients: uniquePatients,
      activeDoctors: totalDoctors,
      pendingInvites,
      checkedInToday,
      todaysRevenue,
      todaysPatients: todaysPatientsCount,
      pendingActions: pendingActionsCount,
      pendingAppointmentsToday,
    },
    todayByStatus,
    todayAppointments,
    recentAppointments: recentAppointmentsResult.data || [],
    needsAttention,
    connectedCare: {
      pharmacy: pharmacyMetrics,
      diagnostics: diagnosticMetrics,
      hospitals: referralMetrics,
    },
    teamSnapshot,
    reviewsSnapshot,
    trends,
    recentActivity,
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
    .select(`
      id, doctor_id, is_active, joined_at, schedule, consultation_fee,
      doctor:doctors(
        id, user_id, name, specialization, sub_specialization, profile_image_url,
        consultation_fee, video_consultation_fee, is_available, is_approved,
        rating, total_reviews, experience_years, qualifications, education,
        languages, bio, total_consultations, available_days, available_hours,
        registration_number
      )
    `)
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (error) throw error;

  const associations = data || [];
  const doctorIds = associations.map((a) => a.doctor_id).filter(Boolean);

  // Today's & Upcoming appointment counts per doctor (single batch query)
  const today = todayIsoDate();
  const todayCounts = new Map();
  const upcomingCounts = new Map();
  const completedCounts = new Map();

  // Fetch practice terms from latest invites or join requests
  const inviteTermsMap = new Map();

  if (doctorIds.length > 0) {
    const [
      { data: todayRows },
      { data: upcomingRows },
      { data: completedRows },
      { data: acceptedInvites },
      { data: acceptedJoinRequests }
    ] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('doctor_id')
        .eq('clinic_id', clinicId)
        .in('doctor_id', doctorIds)
        .eq('appointment_date', today)
        .not('status', 'in', '(cancelled)'),
      supabaseAdmin
        .from('appointments')
        .select('doctor_id')
        .eq('clinic_id', clinicId)
        .in('doctor_id', doctorIds)
        .gte('appointment_date', today)
        .not('status', 'in', '(cancelled,completed)'),
      supabaseAdmin
        .from('appointments')
        .select('doctor_id')
        .eq('clinic_id', clinicId)
        .in('doctor_id', doctorIds)
        .eq('status', 'completed'),
      supabaseAdmin
        .from('clinic_doctor_invites')
        // NOTE: clinic_doctor_invites has no `department` column (only
        // doctor_clinic_join_requests does). Selecting it made this query
        // fail intermittently with "column does not exist" on a stale
        // PostgREST schema cache.
        .select('doctor_id, practice_type, consultation_modes, fee_amount, payout_terms, schedule')
        .eq('clinic_id', clinicId)
        .in('doctor_id', doctorIds)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('doctor_clinic_join_requests')
        .select('doctor_id, practice_type, consultation_modes, department, preferred_days, preferred_start_time, preferred_end_time')
        .eq('clinic_id', clinicId)
        .in('doctor_id', doctorIds)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false }),
    ]);

    for (const row of todayRows || []) {
      todayCounts.set(row.doctor_id, (todayCounts.get(row.doctor_id) || 0) + 1);
    }
    for (const row of upcomingRows || []) {
      upcomingCounts.set(row.doctor_id, (upcomingCounts.get(row.doctor_id) || 0) + 1);
    }
    for (const row of completedRows || []) {
      completedCounts.set(row.doctor_id, (completedCounts.get(row.doctor_id) || 0) + 1);
    }

    // Populate terms from join requests first, then accepted invites override
    for (const req of (acceptedJoinRequests || [])) {
      if (!inviteTermsMap.has(req.doctor_id)) {
        inviteTermsMap.set(req.doctor_id, {
          practice_type: req.practice_type,
          consultation_modes: req.consultation_modes,
          department: req.department,
          preferred_days: req.preferred_days,
          preferred_start_time: req.preferred_start_time,
          preferred_end_time: req.preferred_end_time,
        });
      }
    }
    for (const inv of (acceptedInvites || [])) {
      const existingTerms = inviteTermsMap.get(inv.doctor_id) || {};
      // Accepted invites override join-request terms, but only with fields
      // they actually carry (invites have no `department` column, so it must
      // not be nulled out here).
      inviteTermsMap.set(inv.doctor_id, {
        practice_type: inv.practice_type ?? existingTerms.practice_type,
        consultation_modes: Array.isArray(inv.consultation_modes) && inv.consultation_modes.length > 0
          ? inv.consultation_modes
          : existingTerms.consultation_modes,
        department: existingTerms.department,
        fee_amount: inv.fee_amount,
        payout_terms: inv.payout_terms,
        schedule: inv.schedule,
      });
    }
  }

  const userContactMap = await buildUserContactMap(
    associations.map((association) => association?.doctor?.user_id)
  );

  let doctors = associations.map((association) => {
    const doctor = association?.doctor || {};
    const user = doctor?.user_id ? userContactMap.get(doctor.user_id) : null;
    const isAvailable = doctor.is_available !== false && association.is_active !== false;
    const terms = inviteTermsMap.get(doctor.id) || {};

    const rawSchedule = association.schedule && Object.keys(association.schedule).length > 0
      ? association.schedule
      : terms.schedule || doctor.available_hours || {};

    return {
      ...mapClinicDoctorAssociation(association, userContactMap),
      sub_specialization: doctor.sub_specialization || null,
      qualifications: doctor.qualifications || null,
      education: doctor.education || null,
      languages: Array.isArray(doctor.languages) ? doctor.languages : [],
      bio: doctor.bio || null,
      registration_number: doctor.registration_number || null,
      is_approved: doctor.is_approved === true,
      verification: doctor.is_approved === true ? 'verified' : 'pending',
      rating: parseFloat(doctor.rating) || null,
      total_reviews: parseInt(doctor.total_reviews) || 0,
      total_consultations: parseInt(doctor.total_consultations) || 0,
      completed_consultations: completedCounts.get(doctor.id) || 0,
      experience_years: parseInt(doctor.experience_years) || 0,
      consultation_fee: association.consultation_fee ?? doctor.consultation_fee ?? terms.fee_amount ?? null,
      video_consultation_fee: doctor.video_consultation_fee ?? null,
      profile_image_url: doctor.profile_image_url || null,
      joined_at: association.joined_at || null,
      is_available: isAvailable,
      todayAppointments: todayCounts.get(doctor.id) || 0,
      upcomingAppointments: upcomingCounts.get(doctor.id) || 0,
      practice_type: terms.practice_type || 'full_time',
      consultation_modes: Array.isArray(terms.consultation_modes) && terms.consultation_modes.length > 0
        ? terms.consultation_modes
        : ['in_clinic', 'video'],
      department: terms.department || null,
      schedule: rawSchedule,
      available_days: Array.isArray(doctor.available_days) ? doctor.available_days : terms.preferred_days || [],
      available_hours: doctor.available_hours || (terms.preferred_start_time ? `${terms.preferred_start_time} - ${terms.preferred_end_time}` : 'Standard Hours'),
    };
  });

  if (search) {
    const normalizedSearch = search.toLowerCase();
    doctors = doctors.filter((doctor) =>
      [doctor.name, doctor.specialization, doctor.email, doctor.phone, doctor.status, doctor.department, doctor.practice_type]
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

// Get full clinic-scoped profile for a doctor
const getClinicDoctorProfile = async (clinicId, userId, doctorId) => {
  // 1. Verify Clinic Ownership
  await assertClinicOwner(clinicId, userId);

  // 2. Fetch the association to ensure the doctor is affiliated with this clinic
  const { data: association, error: assocError } = await supabaseAdmin
    .from('clinic_doctors')
    .select(`
      id, is_active, joined_at, schedule, consultation_fee,
      doctor:doctors(
        id, user_id, name, specialization, sub_specialization, profile_image_url,
        consultation_fee, video_consultation_fee, is_available, is_approved,
        rating, total_reviews, experience_years, qualifications, education,
        languages, bio, available_days, available_hours, registration_number
      )
    `)
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .maybeSingle();

  if (assocError || !association) {
    throw new ApiError(403, 'Doctor is not affiliated with your clinic');
  }

  const doctor = association.doctor;

  // 3. Get practice terms (if accepted invite exists)
  const { data: invite } = await supabaseAdmin
    .from('clinic_doctor_invites')
    .select('practice_type, consultation_modes, fee_amount, payout_terms, schedule')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const terms = invite || {};

  // 4. Appointment Summary scoped strictly to this clinic
  const today = todayIsoDate();
  
  const [
    { count: todayCount },
    { count: upcomingCount },
    { count: completedCount },
    { data: todayList },
    { data: upcomingList },
    { data: completedList }
  ] = await Promise.all([
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId).eq('doctor_id', doctorId).eq('appointment_date', today).not('status', 'in', '(cancelled)'),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId).eq('doctor_id', doctorId).gte('appointment_date', today).not('status', 'in', '(cancelled,completed)'),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId).eq('doctor_id', doctorId).eq('status', 'completed'),
    
    supabaseAdmin.from('appointments').select('id, appointment_date, start_time, end_time, status, consultation_mode, patient:patients(id, user_id, users(name))')
      .eq('clinic_id', clinicId).eq('doctor_id', doctorId).eq('appointment_date', today).not('status', 'in', '(cancelled)').order('start_time').limit(10),
    supabaseAdmin.from('appointments').select('id, appointment_date, start_time, end_time, status, consultation_mode, patient:patients(id, user_id, users(name))')
      .eq('clinic_id', clinicId).eq('doctor_id', doctorId).gte('appointment_date', today).not('status', 'in', '(cancelled,completed)').order('appointment_date').order('start_time').limit(10),
    supabaseAdmin.from('appointments').select('id, appointment_date, start_time, end_time, status, consultation_mode, patient:patients(id, user_id, users(name))')
      .eq('clinic_id', clinicId).eq('doctor_id', doctorId).eq('status', 'completed').order('appointment_date', { ascending: false }).order('start_time', { ascending: false }).limit(10)
  ]);

  // 5. Leave / Availability
  const { data: leaves } = await supabaseAdmin
    .from('doctor_leaves')
    .select('start_date, end_date, reason')
    .eq('doctor_id', doctorId)
    .lte('start_date', today)
    .gte('end_date', today)
    .eq('status', 'approved');

  const onLeave = leaves && leaves.length > 0;
  
  // 6. User details
  const { data: user } = await supabaseAdmin.from('users').select('email, phone').eq('id', doctor.user_id).single();

  return {
    id: doctor.id,
    name: doctor.name,
    email: user?.email || '',
    phone: user?.phone || '',
    specialization: doctor.specialization,
    sub_specialization: doctor.sub_specialization,
    qualifications: doctor.qualifications,
    education: doctor.education,
    languages: Array.isArray(doctor.languages) ? doctor.languages : [],
    bio: doctor.bio,
    registration_number: doctor.registration_number,
    profile_image_url: doctor.profile_image_url,
    experience_years: doctor.experience_years,
    is_approved: doctor.is_approved,
    
    // Exact ONE Doctor Rating source of truth (synced from reviews)
    rating: parseFloat(doctor.rating) || 0,
    total_reviews: parseInt(doctor.total_reviews) || 0,
    
    // Affiliation Details
    affiliation_status: association.is_active ? 'Active' : 'Historical / Ended',
    is_active: association.is_active,
    joined_at: association.joined_at,
    practice_type: terms.practice_type || 'full_time',
    consultation_modes: Array.isArray(terms.consultation_modes) && terms.consultation_modes.length > 0 
      ? terms.consultation_modes 
      : ['in_clinic', 'video'],
    department: terms.department || null,
    
    // Fees
    in_person_fee: association.consultation_fee ?? doctor.consultation_fee ?? terms.fee_amount,
    video_fee: doctor.video_consultation_fee,
    
    // Schedule
    schedule: association.schedule && Object.keys(association.schedule).length > 0 
      ? association.schedule 
      : (terms.schedule || {}),
    available_days: Array.isArray(doctor.available_days) ? doctor.available_days : [],
    available_hours: doctor.available_hours || '',
    
    // Availability
    availability_status: onLeave ? 'On Leave' : (doctor.is_available && association.is_active ? 'Available' : 'Unavailable'),
    leave_details: onLeave ? leaves[0] : null,
    
    // Clinic-scoped Metrics
    metrics: {
      todayAppointments: todayCount || 0,
      upcomingAppointments: upcomingCount || 0,
      completedAppointments: completedCount || 0
    },
    appointments: {
      today: todayList || [],
      upcoming: upcomingList || [],
      completed: completedList || []
    }
  };
};

// Add doctor to clinic
const addDoctor = async (clinicId, userId, doctorId, options = {}) => {
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
      practice_type: options.practiceType || null,
      consultation_modes: options.consultationModes || [],
      schedule: options.schedule || {},
      fee_amount: options.feeAmount || null,
      payout_terms: options.payoutTerms || null,
      start_date: options.startDate || null,
    })
    .select('*, clinic:clinics(name, city), doctor:doctors(name, specialization)')
    .single());

  if (error) throw error;

  // Notify the doctor
  if (doctor.user_id || data.doctor?.user_id) {
    // If the select('*, doctor:doctors(...)') doesn't pull user_id, fetch it
    let docUserId = doctor.user_id || data.doctor?.user_id;
    if (!docUserId) {
      const { data: d } = await supabaseAdmin.from('doctors').select('user_id').eq('id', doctorId).single();
      docUserId = d?.user_id;
    }

    if (docUserId) {
      notificationService.sendNotification(docUserId, {
        title: 'New Clinic Invitation',
        message: `You have been invited to join ${data.clinic?.name || 'a clinic'}.`,
        type: 'clinic_invite',
        category: 'clinic',
        data: { inviteId: data.id, clinicId },
        action_url: '/doctor/care-networks?tab=invitations'
      }).catch(err => console.error('Failed to notify doctor of clinic invite', err));
    }
  }

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
      metrics: {
        todayAppointments: 0,
        pendingConfirmation: 0,
        checkedIn: 0,
        completed: 0,
        cancelledNoShow: 0,
      },
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  let query = supabaseAdmin
    .from('appointments')
    .select(`
      *,
      patient:patients(
        id,
        name,
        user_id,
        gender,
        date_of_birth,
        profile_image_url
      ),
      doctor:doctors(
        id,
        name,
        specialization,
        profile_image_url
      )
    `)
    .eq('clinic_id', clinicId)
    .in('doctor_id', activeDoctorIds);

  const { data, error } = await query
    .order('appointment_date', { ascending: false })
    .order('time_slot', { ascending: false });

  if (error) throw error;

  const patientContactMap = await buildUserContactMap(
    (data || []).map((appointment) => appointment?.patient?.user_id)
  );

  const allAppointments = (data || []).map((appointment) => mapClinicAppointment(appointment, patientContactMap));

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  // Calculate real metrics across all appointments for this clinic
  const metrics = {
    todayAppointments: allAppointments.filter((a) => a.date === today).length,
    pendingConfirmation: allAppointments.filter((a) => a.status === 'scheduled').length,
    checkedIn: allAppointments.filter((a) => a.checkedInAt != null || a.status === 'checked_in').length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
    cancelledNoShow: allAppointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length,
  };

  let filtered = allAppointments;

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'checked_in') {
      filtered = filtered.filter((a) => a.checkedInAt != null || a.status === 'checked_in');
    } else {
      filtered = filtered.filter((a) => a.status === filters.status);
    }
  }

  // Filter by date or dateRange
  if (filters.date) {
    filtered = filtered.filter((a) => a.date === filters.date);
  } else if (filters.dateRange && filters.dateRange !== 'all') {
    if (filters.dateRange === 'today') {
      filtered = filtered.filter((a) => a.date === today);
    } else if (filters.dateRange === 'tomorrow') {
      filtered = filtered.filter((a) => a.date === tomorrow);
    } else if (filters.dateRange === 'this_week') {
      filtered = filtered.filter((a) => a.date && a.date >= startOfWeekStr && a.date <= endOfWeekStr);
    }
  }

  // Filter by doctor
  if (filters.doctorId && filters.doctorId !== 'all') {
    filtered = filtered.filter((a) => a.doctorId === filters.doctorId);
  }

  // Filter by consultation type
  if (filters.type && filters.type !== 'all') {
    filtered = filtered.filter((a) => (a.type || 'clinic') === filters.type);
  }

  // Search
  if (filters.search) {
    const normalizedSearch = filters.search.toLowerCase();
    filtered = filtered.filter((appointment) =>
      [
        appointment.patientName,
        appointment.patientPhone,
        appointment.patientEmail,
        appointment.doctorName,
        appointment.doctorSpecialization,
        appointment.reason,
        appointment.id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    data: paginated,
    metrics,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

// Get consultations for all doctors affiliated with this clinic
const getConsultations = async (userId, page = 1, limit = 20, filters = {}) => {
  const clinic = await getClinicByOwner(userId);
  if (!clinic) throw new ApiError(404, 'Clinic not found');

  // Get all doctor IDs affiliated with this clinic
  const activeDoctorIds = await getActiveClinicDoctorIds(clinic.id);
  if (activeDoctorIds.length === 0) {
    return {
      data: [],
      metrics: {
        todayConsultations: 0,
        inProgress: 0,
        completed: 0,
        videoConsultations: 0,
        inPersonConsultations: 0,
      },
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  // ── ISOLATION FIX (Bug 3) ────────────────────────────────────────────────
  // Pre-fetch appointment IDs that are strictly scoped to this clinic.
  // Filtering by doctor_id alone would expose direct-doctor and hospital
  // consultations for the same affiliated doctors — a cross-tenant data leak.
  // The source of truth is: appointment.clinic_id = this clinic.
  const { data: clinicApptRows, error: clinicApptError } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinic.id)
    .in('doctor_id', activeDoctorIds);

  if (clinicApptError) throw clinicApptError;

  const clinicAppointmentIds = (clinicApptRows || []).map((a) => a.id).filter(Boolean);

  if (clinicAppointmentIds.length === 0) {
    return {
      data: [],
      metrics: {
        todayConsultations: 0,
        inProgress: 0,
        completed: 0,
        videoConsultations: 0,
        inPersonConsultations: 0,
      },
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }
  // ────────────────────────────────────────────────────────────────────────

  const offset = (page - 1) * limit;
  const { data, error } = await supabaseAdmin
    .from('consultations')
    .select(`
      *,
      doctor:doctors(id, name, specialization, profile_image_url),
      patient:patients(id, name, user_id, gender, date_of_birth, profile_image_url),
      appointment:appointments(id, appointment_date, time_slot, type, clinic_id, fee, consultation_fee, payment_status, reason, symptoms, notes),
      prescriptions(*, prescription_medicines(*))
    `)
    .in('appointment_id', clinicAppointmentIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const patientContactMap = await buildUserContactMap(
    (data || []).map((consultation) => consultation?.patient?.user_id)
  );

  const allConsultations = (data || []).map((consultation) => mapClinicConsultation(consultation, patientContactMap));

  const today = new Date().toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
  const startOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  // Calculate real metrics across all clinic consultations
  const metrics = {
    todayConsultations: allConsultations.filter((c) => {
      const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
      return d === today;
    }).length,
    inProgress: allConsultations.filter((c) => ['in_progress', 'started', 'active'].includes(c.status)).length,
    completed: allConsultations.filter((c) => ['completed', 'ended'].includes(c.status)).length,
    videoConsultations: allConsultations.filter((c) => c.type === 'video').length,
    inPersonConsultations: allConsultations.filter((c) => c.type === 'clinic' || c.type === 'in_person').length,
  };

  let filtered = allConsultations;

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'in_progress') {
      filtered = filtered.filter((c) => ['in_progress', 'started', 'active'].includes(c.status));
    } else if (filters.status === 'completed') {
      filtered = filtered.filter((c) => ['completed', 'ended'].includes(c.status));
    } else {
      filtered = filtered.filter((c) => c.status === filters.status);
    }
  }

  // Filter by consultation mode / type
  if (filters.type && filters.type !== 'all') {
    if (filters.type === 'clinic' || filters.type === 'in_person') {
      filtered = filtered.filter((c) => c.type === 'clinic' || c.type === 'in_person');
    } else {
      filtered = filtered.filter((c) => c.type === filters.type);
    }
  }

  // Filter by doctor
  if (filters.doctorId && filters.doctorId !== 'all') {
    filtered = filtered.filter((c) => c.doctor?.id === filters.doctorId || c.doctorId === filters.doctorId);
  }

  // Filter by date or dateRange
  if (filters.date) {
    filtered = filtered.filter((c) => {
      const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
      return d === filters.date;
    });
  } else if (filters.dateRange && filters.dateRange !== 'all') {
    if (filters.dateRange === 'today') {
      filtered = filtered.filter((c) => {
        const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
        return d === today;
      });
    } else if (filters.dateRange === 'this_week') {
      filtered = filtered.filter((c) => {
        const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
        return d && d >= startOfWeekStr && d <= endOfWeekStr;
      });
    } else if (filters.dateRange === 'this_month') {
      filtered = filtered.filter((c) => {
        const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
        return d && d >= startOfMonthStr && d <= endOfMonthStr;
      });
    }
  }

  // Filter by search query
  if (filters.search) {
    const normalizedSearch = filters.search.toLowerCase();
    filtered = filtered.filter((c) =>
      [
        c.patient?.name,
        c.patient?.phone,
        c.patient?.email,
        c.doctor?.name,
        c.doctor?.specialization,
        c.diagnosis,
        c.id,
        c.appointment?.id,
        c.appointment?.reason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    data: paginated,
    metrics,
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

// Build the real doctor→department context for a clinic. Department members
// are derived from:
//   1. accepted doctor_clinic_join_requests whose `department` text matches a
//      department name (the only real doctor→department link in the schema),
//   2. the department's head_doctor_id.
// A doctor is only counted as a member when the clinic_doctors affiliation is
// active. Appointment links flow through Appointment → Doctor → Department.
const getClinicDepartmentContext = async (clinicId) => {
  const today = todayIsoDate();
  const [
    { data: departments, error: departmentsError },
    { data: associations, error: associationsError },
    { data: joinRequests, error: joinRequestsError },
    { data: invites, error: invitesError },
    { data: todayAppointments, error: todayError },
  ] = await Promise.all([
    supabaseAdmin
      .from('clinic_departments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('clinic_doctors')
      .select('doctor_id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true),
    supabaseAdmin
      .from('doctor_clinic_join_requests')
      .select('doctor_id, department, practice_type, consultation_modes')
      .eq('clinic_id', clinicId)
      .eq('status', 'accepted'),
    supabaseAdmin
      .from('clinic_doctor_invites')
      .select('doctor_id, practice_type, consultation_modes')
      .eq('clinic_id', clinicId)
      .eq('status', 'accepted'),
    supabaseAdmin
      .from('appointments')
      .select('doctor_id')
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today)
      .not('status', 'in', '(cancelled)'),
  ]);

  const results = [departmentsError, associationsError, joinRequestsError, invitesError, todayError];
  for (const result of results) {
    if (result) throw result;
  }

  const activeDoctorIds = new Set((associations || []).map((a) => a.doctor_id));

  const deptByNormalizedName = new Map();
  for (const dept of departments || []) {
    deptByNormalizedName.set(String(dept.name || '').trim().toLowerCase(), dept);
  }

  const memberIdsByDept = new Map();
  const modesByDept = new Map();
  const termsByDoctor = new Map();

  const registerTerm = (doctorId, term) => {
    const existing = termsByDoctor.get(doctorId) || {};
    termsByDoctor.set(doctorId, {
      practice_type: term.practice_type ?? existing.practice_type,
      consultation_modes:
        Array.isArray(term.consultation_modes) && term.consultation_modes.length > 0
          ? term.consultation_modes
          : existing.consultation_modes,
      department: term.department ?? existing.department,
    });
  };

  for (const req of joinRequests || []) {
    registerTerm(req.doctor_id, {
      practice_type: req.practice_type,
      consultation_modes: req.consultation_modes,
      department: req.department,
    });
  }
  for (const inv of invites || []) {
    registerTerm(inv.doctor_id, {
      practice_type: inv.practice_type,
      consultation_modes: inv.consultation_modes,
    });
  }

  const addMember = (dept, doctorId) => {
    if (!activeDoctorIds.has(doctorId)) return;
    if (!memberIdsByDept.has(dept.id)) memberIdsByDept.set(dept.id, new Set());
    memberIdsByDept.get(dept.id).add(doctorId);
  };

  for (const req of joinRequests || []) {
    const key = String(req.department || '').trim().toLowerCase();
    const dept = key && deptByNormalizedName.get(key);
    if (dept) addMember(dept, req.doctor_id);
  }
  for (const dept of departments || []) {
    if (dept.head_doctor_id) addMember(dept, dept.head_doctor_id);
  }

  for (const dept of departments || []) {
    const memberIds = memberIdsByDept.get(dept.id);
    if (!memberIds) continue;
    for (const doctorId of memberIds) {
      const term = termsByDoctor.get(doctorId);
      const modes = Array.isArray(term?.consultation_modes) && term.consultation_modes.length > 0
        ? term.consultation_modes
        : ['in_clinic', 'video'];
      if (!modesByDept.has(dept.id)) modesByDept.set(dept.id, new Set());
      for (const mode of modes) modesByDept.get(dept.id).add(mode);
    }
  }

  const todayByDept = new Map();
  for (const appt of todayAppointments || []) {
    for (const [deptId, ids] of memberIdsByDept) {
      if (ids.has(appt.doctor_id)) {
        todayByDept.set(deptId, (todayByDept.get(deptId) || 0) + 1);
      }
    }
  }

  return {
    departments: departments || [],
    memberIdsByDept,
    modesByDept,
    todayByDept,
    activeDoctorIds,
    termsByDoctor,
    today,
  };
};

const fetchDoctorsById = async (ids) => {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialization, profile_image_url, is_approved, is_available')
    .in('id', uniqueIds);
  if (error) throw error;
  return new Map((data || []).map((d) => [d.id, d]));
};

const getClinicDepartments = async (clinicId) => {
  const ctx = await getClinicDepartmentContext(clinicId);

  const headIds = ctx.departments.map((dept) => dept.head_doctor_id).filter(Boolean);
  const headsById = await fetchDoctorsById(headIds);

  return ctx.departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    description: dept.description || '',
    head_doctor_id: dept.head_doctor_id || null,
    head_doctor_name: headsById.get(dept.head_doctor_id)?.name || null,
    head_doctor_specialization: headsById.get(dept.head_doctor_id)?.specialization || null,
    head_doctor_profile_image_url: headsById.get(dept.head_doctor_id)?.profile_image_url || null,
    contact_extension: dept.contact_extension || '',
    is_active: dept.is_active !== false,
    created_at: dept.created_at,
    doctor_count: ctx.memberIdsByDept.get(dept.id)?.size || 0,
    today_appointments: ctx.todayByDept.get(dept.id) || 0,
    consultation_modes: Array.from(ctx.modesByDept.get(dept.id) || []),
  }));
};

const getClinicDepartmentMeta = async (clinicId) => {
  const ctx = await getClinicDepartmentContext(clinicId);
  const departments = ctx.departments;
  const active = departments.filter((d) => d.is_active !== false);
  const memberIds = new Set();
  for (const ids of ctx.memberIdsByDept.values()) {
    for (const id of ids) memberIds.add(id);
  }
  let todayAppointments = 0;
  for (const count of ctx.todayByDept.values()) todayAppointments += count;
  return {
    total: departments.length,
    active: active.length,
    inactive: departments.length - active.length,
    doctorsAssigned: memberIds.size,
    todayAppointments,
  };
};

const getClinicDepartmentById = async (clinicId, departmentId) => {
  const { data: department, error: departmentError } = await supabaseAdmin
    .from('clinic_departments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('id', departmentId)
    .maybeSingle();

  if (departmentError) throw departmentError;
  if (!department) {
    throw new ApiError(404, 'Department not found for this clinic');
  }

  const ctx = await getClinicDepartmentContext(clinicId);
  const memberIds = Array.from(ctx.memberIdsByDept.get(department.id) || []);

  const [
    { data: doctorRows },
    { data: upcomingRows },
    { data: completedRows },
    { data: cancelledRows },
  ] = await Promise.all([
    memberIds.length > 0
      ? supabaseAdmin.from('doctors').select('id, user_id, name, specialization, sub_specialization, profile_image_url, is_approved, rating, total_reviews, experience_years')
      : Promise.resolve({ data: [], error: null }),
    memberIds.length > 0
      ? supabaseAdmin.from('appointments').select('doctor_id').eq('clinic_id', clinicId).in('doctor_id', memberIds).gte('appointment_date', ctx.today).not('status', 'in', '(cancelled,completed)')
      : Promise.resolve({ data: [], error: null }),
    memberIds.length > 0
      ? supabaseAdmin.from('appointments').select('doctor_id').eq('clinic_id', clinicId).in('doctor_id', memberIds).eq('status', 'completed')
      : Promise.resolve({ data: [], error: null }),
    memberIds.length > 0
      ? supabaseAdmin.from('appointments').select('doctor_id').eq('clinic_id', clinicId).in('doctor_id', memberIds).eq('status', 'cancelled')
      : Promise.resolve({ data: [], error: null }),
  ]);

  const doctorsById = new Map((doctorRows || []).map((d) => [d.id, d]));

  const doctorMembers = memberIds.map((doctorId) => {
    const doctor = doctorsById.get(doctorId) || {};
    const term = ctx.termsByDoctor.get(doctorId) || {};
    const isHead = department.head_doctor_id === doctorId;
    return {
      doctor_id: doctorId,
      name: doctor.name || 'Doctor',
      specialization: doctor.specialization || 'General Medicine',
      sub_specialization: doctor.sub_specialization || null,
      profile_image_url: doctor.profile_image_url || null,
      is_approved: doctor.is_approved === true,
      verification: doctor.is_approved === true ? 'verified' : 'pending',
      rating: doctor.rating != null ? Number(doctor.rating) : null,
      total_reviews: Number(doctor.total_reviews || 0),
      experience_years: Number(doctor.experience_years || 0),
      practice_type: term.practice_type || 'full_time',
      consultation_modes: Array.isArray(term.consultation_modes) && term.consultation_modes.length > 0
        ? term.consultation_modes
        : ['in_clinic', 'video'],
      affiliation: isHead ? 'head' : 'member',
      is_head: isHead,
    };
  });

  const headDoctor = department.head_doctor_id
    ? (() => {
      const doctor = doctorsById.get(department.head_doctor_id);
      if (!doctor) return null;
      return {
        doctor_id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        profile_image_url: doctor.profile_image_url,
        is_approved: doctor.is_approved === true,
        verification: doctor.is_approved === true ? 'verified' : 'pending',
      };
    })()
    : null;

  return {
    ...department,
    is_active: department.is_active !== false,
    head_doctor_name: headDoctor?.name || null,
    head_doctor_specialization: headDoctor?.specialization || null,
    head_doctor_profile_image_url: headDoctor?.profile_image_url || null,
    head_doctor: headDoctor,
    doctors: doctorMembers,
    doctor_count: doctorMembers.length,
    consultation_modes: Array.from(ctx.modesByDept.get(department.id) || []),
    today_appointments: ctx.todayByDept.get(department.id) || 0,
    schedule: {
      // Scheduling is doctor-specific, not department-level (see schema).
      // Department availability is therefore derived from assigned doctors.
      doctor_count: doctorMembers.length,
    },
    appointments: {
      today: ctx.todayByDept.get(department.id) || 0,
      upcoming: (upcomingRows || []).length,
      completed: (completedRows || []).length,
      cancelled: (cancelledRows || []).length,
    },
  };
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
  await assertClinicOwner(clinicId, userId);

  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  const days = parseInt(period) || (period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString().split('T')[0];

  // 1. Fetch appointments in period
  let appointmentsQuery = supabaseAdmin
    .from('appointments')
    .select(`
      id,
      patient_id,
      doctor_id,
      appointment_date,
      time_slot,
      status,
      fee,
      type,
      created_at,
      patient:patients(id, name, gender),
      doctor:doctors(id, name, specialization, profile_image_url, rating, total_reviews)
    `)
    .eq('clinic_id', clinicId)
    .gte('appointment_date', fromDateStr);

  if (activeDoctorIds.length > 0) {
    appointmentsQuery = appointmentsQuery.in('doctor_id', activeDoctorIds);
  }

  // 2. Fetch doctors affiliated with clinic
  const doctorsQuery = supabaseAdmin
    .from('clinic_doctor_relations')
    .select(`
      doctor_id,
      doctor:doctors(id, name, specialization, profile_image_url, rating, total_reviews)
    `)
    .eq('clinic_id', clinicId)
    .eq('status', 'active');

  // 3. Fetch doctor reviews
  const doctorReviewsQuery = activeDoctorIds.length > 0
    ? supabaseAdmin
      .from('reviews')
      .select('id, reviewable_id, rating, is_verified, response, is_visible')
      .eq('reviewable_type', 'doctor')
      .in('reviewable_id', activeDoctorIds)
      .eq('is_visible', true)
    : Promise.resolve({ data: [] });

  // 4. Fetch clinic reviews
  const clinicReviewsQuery = supabaseAdmin
    .from('reviews')
    .select('id, rating, is_verified, response, is_visible')
    .eq('reviewable_type', 'clinic')
    .eq('reviewable_id', clinicId)
    .eq('is_visible', true);

  // 5. Fetch pharmacy orders routed from this clinic
  const pharmacyOrdersQuery = supabaseAdmin
    .from('pharmacy_orders')
    .select('id, pharmacy_id, status, total_amount, created_at, pharmacy:pharmacies(id, name)')
    .eq('clinic_id', clinicId)
    .gte('created_at', fromDateStr);

  // 6. Fetch diagnostic bookings routed from this clinic
  const diagnosticBookingsQuery = supabaseAdmin
    .from('diagnostic_bookings')
    .select('id, center_id, status, total_price, report_url, created_at, center:diagnostic_centers(id, name)')
    .eq('clinic_id', clinicId)
    .gte('created_at', fromDateStr);

  // 7. Fetch hospital referrals from this clinic
  const hospitalReferralsQuery = supabaseAdmin
    .from('patient_referrals')
    .select('id, target_hospital_id, status, urgency, created_at, hospital:hospitals(id, name)')
    .eq('referring_clinic_id', clinicId)
    .gte('created_at', fromDateStr);

  // 8. Fetch upcoming leaves for doctors
  const todayStr = new Date().toISOString().split('T')[0];
  const leavesQuery = activeDoctorIds.length > 0
    ? supabaseAdmin
      .from('doctor_leaves')
      .select('id, doctor_id, start_date, end_date, reason, status, doctor:doctors(id, name)')
      .in('doctor_id', activeDoctorIds)
      .gte('end_date', todayStr)
      .order('start_date', { ascending: true })
    : Promise.resolve({ data: [] });

  const [
    { data: appointmentsData },
    { data: doctorRelationsData },
    { data: doctorReviewsData },
    { data: clinicReviewsData },
    { data: pharmacyOrdersData },
    { data: diagnosticBookingsData },
    { data: hospitalReferralsData },
    { data: leavesData },
  ] = await Promise.all([
    appointmentsQuery,
    doctorsQuery,
    doctorReviewsQuery,
    clinicReviewsQuery,
    pharmacyOrdersQuery,
    diagnosticBookingsQuery,
    hospitalReferralsQuery,
    leavesQuery,
  ]);

  const appointments = appointmentsData || [];
  const doctorRelations = doctorRelationsData || [];
  const doctorReviews = doctorReviewsData || [];
  const clinicReviews = clinicReviewsData || [];
  const pharmacyOrders = pharmacyOrdersData || [];
  const diagnosticBookings = diagnosticBookingsData || [];
  const hospitalReferrals = hospitalReferralsData || [];
  const upcomingLeaves = leavesData || [];

  // Overview metrics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
  const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled').length;
  const noShowAppointments = appointments.filter((a) => a.status === 'no_show').length;
  const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0;
  const noShowRate = totalAppointments > 0 ? Math.round((noShowAppointments / totalAppointments) * 100) : 0;
  const totalRevenue = appointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (parseFloat(a.fee) || 0), 0);
  const cancelledLoss = appointments
    .filter((a) => a.status === 'cancelled')
    .reduce((sum, a) => sum + (parseFloat(a.fee) || 0), 0);

  // Mode Split
  const inPersonAppointments = appointments.filter((a) => a.type === 'in_person' || a.type === 'in-person' || !a.type);
  const videoAppointments = appointments.filter((a) => a.type === 'video' || a.type === 'teleconsultation');
  const inPersonRevenue = inPersonAppointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (parseFloat(a.fee) || 0), 0);
  const videoRevenue = videoAppointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (parseFloat(a.fee) || 0), 0);

  // Status Breakdown
  const statusBreakdown = {
    completed: completedAppointments,
    cancelled: cancelledAppointments,
    no_show: noShowAppointments,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending: appointments.filter((a) => a.status === 'pending' || a.status === 'requested').length,
    in_progress: appointments.filter((a) => a.status === 'in_progress').length,
  };

  // Patients metrics
  const patientMap = new Map();
  const genderDistribution = { male: 0, female: 0, other: 0, unknown: 0 };

  appointments.forEach((a) => {
    const pid = a.patient_id || a.patient?.id;
    if (!pid) return;
    const count = patientMap.get(pid) || 0;
    patientMap.set(pid, count + 1);

    const gender = (a.patient?.gender || '').toLowerCase();
    if (gender === 'male' || gender === 'm') genderDistribution.male += 1;
    else if (gender === 'female' || gender === 'f') genderDistribution.female += 1;
    else if (gender === 'other') genderDistribution.other += 1;
    else genderDistribution.unknown += 1;
  });

  const totalPatients = patientMap.size;
  let newPatients = 0;
  let returningPatients = 0;
  let visitFreqOnce = 0;
  let visitFreqRepeat = 0;
  let visitFreqFrequent = 0;

  patientMap.forEach((count) => {
    if (count === 1) {
      newPatients += 1;
      visitFreqOnce += 1;
    } else {
      returningPatients += 1;
      if (count <= 3) visitFreqRepeat += 1;
      else visitFreqFrequent += 1;
    }
  });

  // Daily Trends Map
  const trendMap = new Map();
  appointments.forEach((a) => {
    const date = (a.appointment_date || '').split('T')[0];
    if (!date) return;
    const existing = trendMap.get(date) || { date, total: 0, completed: 0, cancelled: 0, revenue: 0, inPerson: 0, video: 0 };
    existing.total += 1;
    if (a.status === 'completed') {
      existing.completed += 1;
      existing.revenue += parseFloat(a.fee) || 0;
    } else if (a.status === 'cancelled') {
      existing.cancelled += 1;
    }
    if (a.type === 'video' || a.type === 'teleconsultation') existing.video += 1;
    else existing.inPerson += 1;
    trendMap.set(date, existing);
  });

  const appointmentTrend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Peak consultation hours histogram (from time_slot)
  const hourMap = {};
  for (let h = 8; h <= 20; h++) {
    const key = `${String(h).padStart(2, '0')}:00`;
    hourMap[key] = 0;
  }
  appointments.forEach((a) => {
    const slot = a.time_slot || '';
    const match = slot.match(/^(\d{1,2}):/);
    if (match) {
      const h = parseInt(match[1]);
      if (h >= 8 && h <= 20) {
        const key = `${String(h).padStart(2, '0')}:00`;
        hourMap[key] = (hourMap[key] || 0) + 1;
      }
    }
  });
  const peakHours = Object.entries(hourMap).map(([hour, count]) => ({ hour, count }));

  // Doctor Performance
  const doctorMap = new Map();
  doctorRelations.forEach((rel) => {
    const doc = rel.doctor;
    if (!doc) return;
    doctorMap.set(doc.id, {
      id: doc.id,
      name: doc.name || 'Doctor',
      specialization: doc.specialization || 'General',
      profileImageUrl: doc.profile_image_url || null,
      rating: parseFloat(doc.rating) || 0,
      totalReviews: parseInt(doc.total_reviews) || 0,
      appointments: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      revenue: 0,
    });
  });

  appointments.forEach((a) => {
    const docId = a.doctor_id || a.doctor?.id;
    if (!docId) return;
    let docStats = doctorMap.get(docId);
    if (!docStats && a.doctor) {
      docStats = {
        id: docId,
        name: a.doctor.name || 'Doctor',
        specialization: a.doctor.specialization || 'General',
        profileImageUrl: a.doctor.profile_image_url || null,
        rating: parseFloat(a.doctor.rating) || 0,
        totalReviews: parseInt(a.doctor.total_reviews) || 0,
        appointments: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        revenue: 0,
      };
      doctorMap.set(docId, docStats);
    }
    if (docStats) {
      docStats.appointments += 1;
      if (a.status === 'completed') {
        docStats.completed += 1;
        docStats.revenue += parseFloat(a.fee) || 0;
      } else if (a.status === 'cancelled') {
        docStats.cancelled += 1;
      } else if (a.status === 'no_show') {
        docStats.noShow += 1;
      }
    }
  });

  const doctorPerformance = Array.from(doctorMap.values()).sort((a, b) => b.appointments - a.appointments);

  // Connected Care — Pharmacy
  const pharmacyStatusCounts = {
    pending: 0,
    accepted: 0,
    processing: 0,
    ready: 0,
    out_for_delivery: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
  };
  const pharmacyPartnerMap = new Map();
  pharmacyOrders.forEach((o) => {
    const st = (o.status || 'pending').toLowerCase();
    if (pharmacyStatusCounts[st] !== undefined) pharmacyStatusCounts[st] += 1;
    else pharmacyStatusCounts.pending += 1;

    const pharm = o.pharmacy;
    if (pharm) {
      const existing = pharmacyPartnerMap.get(pharm.id) || { id: pharm.id, name: pharm.name, totalOrders: 0, completedOrders: 0 };
      existing.totalOrders += 1;
      if (st === 'completed' || st === 'delivered') existing.completedOrders += 1;
      pharmacyPartnerMap.set(pharm.id, existing);
    }
  });

  // Connected Care — Diagnostics
  const diagnosticStatusCounts = {
    pending: 0,
    accepted: 0,
    sample_collected: 0,
    processing: 0,
    report_ready: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
  };
  const diagnosticPartnerMap = new Map();
  diagnosticBookings.forEach((b) => {
    const st = (b.status || 'pending').toLowerCase();
    if (diagnosticStatusCounts[st] !== undefined) diagnosticStatusCounts[st] += 1;
    else diagnosticStatusCounts.pending += 1;

    const center = b.center;
    if (center) {
      const existing = diagnosticPartnerMap.get(center.id) || { id: center.id, name: center.name, totalBookings: 0, completedBookings: 0, reportsReady: 0 };
      existing.totalBookings += 1;
      if (st === 'completed') existing.completedBookings += 1;
      if (st === 'report_ready' || b.report_url) existing.reportsReady += 1;
      diagnosticPartnerMap.set(center.id, existing);
    }
  });

  // Connected Care — Hospital Referrals
  const referralStatusCounts = {
    pending: 0,
    accepted: 0,
    admission_pending: 0,
    admitted: 0,
    discharged: 0,
    rejected: 0,
    cancelled: 0,
  };
  const hospitalPartnerMap = new Map();
  hospitalReferrals.forEach((r) => {
    const st = (r.status || 'pending').toLowerCase();
    if (referralStatusCounts[st] !== undefined) referralStatusCounts[st] += 1;
    else referralStatusCounts.pending += 1;

    const hosp = r.hospital;
    if (hosp) {
      const existing = hospitalPartnerMap.get(hosp.id) || { id: hosp.id, name: hosp.name, totalReferrals: 0, admitted: 0, discharged: 0 };
      existing.totalReferrals += 1;
      if (st === 'admitted') existing.admitted += 1;
      if (st === 'discharged') existing.discharged += 1;
      hospitalPartnerMap.set(hosp.id, existing);
    }
  });

  // Clinic Reviews breakdown
  const clinicStarDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let clinicTotalStars = 0;
  let clinicVerifiedCount = 0;
  let clinicRespondedCount = 0;

  clinicReviews.forEach((rev) => {
    const r = Math.min(5, Math.max(1, Math.round(rev.rating || 5)));
    clinicStarDist[r] = (clinicStarDist[r] || 0) + 1;
    clinicTotalStars += rev.rating || 0;
    if (rev.is_verified) clinicVerifiedCount += 1;
    if (rev.response) clinicRespondedCount += 1;
  });

  const clinicReviewCount = clinicReviews.length;
  const clinicAvgRating = clinicReviewCount > 0 ? parseFloat((clinicTotalStars / clinicReviewCount).toFixed(1)) : 0;
  const clinicResponseRate = clinicReviewCount > 0 ? Math.round((clinicRespondedCount / clinicReviewCount) * 100) : 0;

  // Doctor Reviews breakdown (separate from clinic reviews)
  const docReviewStatsMap = new Map();
  doctorReviews.forEach((rev) => {
    const docId = rev.reviewable_id;
    if (!docId) return;
    const existing = docReviewStatsMap.get(docId) || { totalReviews: 0, starSum: 0, verified: 0, responded: 0 };
    existing.totalReviews += 1;
    existing.starSum += rev.rating || 0;
    if (rev.is_verified) existing.verified += 1;
    if (rev.response) existing.responded += 1;
    docReviewStatsMap.set(docId, existing);
  });

  const doctorReviewsSummary = doctorPerformance.map((doc) => {
    const rStats = docReviewStatsMap.get(doc.id);
    const revCount = rStats?.totalReviews || doc.totalReviews || 0;
    const avgRat = rStats && rStats.totalReviews > 0 ? parseFloat((rStats.starSum / rStats.totalReviews).toFixed(1)) : doc.rating;
    return {
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      averageRating: avgRat,
      totalReviews: revCount,
    };
  });

  // Action Center
  const pendingPharmacyOrders = pharmacyStatusCounts.pending;
  const pendingDiagnosticBookings = diagnosticStatusCounts.pending;
  const pendingHospitalReferrals = referralStatusCounts.pending;
  const unrespondedReviews = clinicReviews.filter((r) => !r.response).length;
  const highCancellationAlert = cancellationRate >= 20 && totalAppointments >= 5;

  return {
    period: `${days}d`,
    overview: {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      completionRate,
      cancellationRate,
      noShowRate,
      totalRevenue,
      totalPatients,
      newPatients,
      returningPatients,
    },
    clinical: {
      appointmentTrend,
      modeSplit: {
        inPerson: {
          count: inPersonAppointments.length,
          revenue: inPersonRevenue,
          rate: totalAppointments > 0 ? Math.round((inPersonAppointments.length / totalAppointments) * 100) : 0,
        },
        video: {
          count: videoAppointments.length,
          revenue: videoRevenue,
          rate: totalAppointments > 0 ? Math.round((videoAppointments.length / totalAppointments) * 100) : 0,
        },
      },
      statusBreakdown,
      peakHours,
      doctorPerformance,
    },
    patients: {
      totalPatients,
      newPatients,
      returningPatients,
      visitFrequency: {
        once: visitFreqOnce,
        repeat2to3: visitFreqRepeat,
        frequent4Plus: visitFreqFrequent,
      },
      genderDistribution,
    },
    doctors: {
      totalDoctors: doctorRelations.length,
      performance: doctorPerformance,
    },
    connectedCare: {
      pharmacy: {
        totalOrders: pharmacyOrders.length,
        statusCounts: pharmacyStatusCounts,
        partners: Array.from(pharmacyPartnerMap.values()),
      },
      diagnostics: {
        totalBookings: diagnosticBookings.length,
        statusCounts: diagnosticStatusCounts,
        partners: Array.from(diagnosticPartnerMap.values()),
      },
      hospitalReferrals: {
        totalReferrals: hospitalReferrals.length,
        statusCounts: referralStatusCounts,
        hospitals: Array.from(hospitalPartnerMap.values()),
      },
    },
    reviews: {
      clinic: {
        averageRating: clinicAvgRating,
        totalReviews: clinicReviewCount,
        verifiedReviews: clinicVerifiedCount,
        starDistribution: clinicStarDist,
        responseRate: clinicResponseRate,
      },
      doctors: doctorReviewsSummary,
    },
    finance: {
      totalRevenue,
      inPersonRevenue,
      videoRevenue,
      cancelledLoss,
      revenueTrend: appointmentTrend.map((t) => ({ date: t.date, amount: t.revenue })),
      doctorContributions: doctorPerformance.map((d) => ({ doctorId: d.id, name: d.name, revenue: d.revenue })),
    },
    capacity: {
      activeDoctorsCount: activeDoctorIds.length,
      upcomingLeaves: upcomingLeaves.map((l) => ({
        id: l.id,
        doctorId: l.doctor_id,
        doctorName: l.doctor?.name || 'Doctor',
        startDate: l.start_date,
        endDate: l.end_date,
        reason: l.reason || 'Personal Leave',
        status: l.status,
      })),
    },
    actionCenter: {
      pendingPharmacyOrders,
      pendingDiagnosticBookings,
      pendingHospitalReferrals,
      unrespondedReviews,
      highCancellationAlert,
    },
    // Backwards compatibility legacy top-level fields
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    totalRevenue,
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

// ── Doctor Join Requests ──

const getClinicJoinRequests = async (clinicId, userId, page = 1, limit = 10, status = 'all') => {
  await assertClinicOwner(clinicId, userId);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('doctor_clinic_join_requests')
    .select(`
      *,
      doctor:doctors(id, name, specialization, profile_image_url, user_id, rating, total_reviews, experience_years)
    `, { count: 'exact' })
    .eq('clinic_id', clinicId);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiError(500, 'Failed to fetch join requests');
  }

  // Enrich with user email/phone
  const userContactMap = await buildUserContactMap(
    (data || []).map((req) => req?.doctor?.user_id)
  );

  const requests = (data || []).map((req) => {
    const doctor = req?.doctor || {};
    const doctorUser = doctor?.user_id ? userContactMap.get(doctor.user_id) : null;
    return {
      id: req.id,
      clinicId: req.clinic_id,
      doctorId: req.doctor_id,
      status: req.status,
      message: req.message,
      specialization: req.specialization,
      department: req.department,
      practiceType: req.practice_type,
      consultationModes: req.consultation_modes,
      preferredDays: req.preferred_days,
      preferredStartTime: req.preferred_start_time,
      preferredEndTime: req.preferred_end_time,
      preferredStartDate: req.preferred_start_date,
      createdAt: req.created_at,
      respondedAt: req.responded_at,
      responseMessage: req.response_message,
      doctor: {
        id: doctor.id || '',
        name: doctor.name || 'Doctor',
        specialization: doctor.specialization || '',
        email: doctorUser?.email || '',
        phone: doctorUser?.phone || '',
        profile_image_url: doctor.profile_image_url || null,
        rating: doctor.rating,
        total_reviews: doctor.total_reviews,
        experience_years: doctor.experience_years,
      },
    };
  });

  return {
    data: requests,
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

const respondToJoinRequest = async (clinicId, userId, requestId, decision, responseMessage = '') => {
  await assertClinicOwner(clinicId, userId);

  if (!['accept', 'reject'].includes(decision)) {
    throw new ApiError(400, "Decision must be 'accept' or 'reject'");
  }

  const { data: request, error } = await supabaseAdmin
    .from('doctor_clinic_join_requests')
    .select('*, doctor:doctors(id, name, user_id), clinic:clinics(name)')
    .eq('id', requestId)
    .eq('clinic_id', clinicId)
    .single();

  if (error || !request) {
    throw new ApiError(404, 'Join request not found');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, `This request has already been processed (status: ${request.status})`);
  }

  const newStatus = decision === 'accept' ? 'accepted' : 'rejected';

  // 1. Update request status
  const { error: updateError } = await supabaseAdmin
    .from('doctor_clinic_join_requests')
    .update({
      status: newStatus,
      response_message: responseMessage,
      responded_at: new Date().toISOString(),
      responded_by: userId
    })
    .eq('id', requestId);

  if (updateError) {
    throw new ApiError(500, 'Failed to update request status');
  }

  // 2. If accepted, create clinic_doctors association
  if (decision === 'accept') {
    const { error: assocError } = await supabaseAdmin
      .from('clinic_doctors')
      .upsert({
        clinic_id: clinicId,
        doctor_id: request.doctor_id,
        is_active: true,
        // Optional default empty schedule. The clinic can negotiate/edit this later.
        schedule: []
      }, { onConflict: 'clinic_id, doctor_id' });

    if (assocError) {
      console.error('Failed to create clinic_doctors association', assocError);
    }
  }

  // 3. Notify the doctor
  if (request.doctor?.user_id) {
    const title = decision === 'accept' ? 'Join Request Accepted' : 'Join Request Declined';
    const message = decision === 'accept'
      ? `Your request to join ${request.clinic?.name} has been approved.`
      : `Your request to join ${request.clinic?.name} was declined. ${responseMessage ? `Reason: ${responseMessage}` : ''}`;

    notificationService.sendNotification(request.doctor.user_id, {
      title,
      message,
      type: 'join_request_response',
      category: 'clinic',
      data: { joinRequestId: request.id, clinicId, status: newStatus },
      action_url: '/doctor/care-networks?tab=requests'
    }).catch(err => console.error('Failed to notify doctor', err));
  }

  return { id: requestId, status: newStatus };
};


// ── Clinic Patients ──
const getClinicPatients = async (clinicId, userId, { search = '', filter = 'all', doctorId = '' } = {}, page = 1, limit = 20) => {
  await assertClinicOwner(clinicId, userId);
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  if (activeDoctorIds.length === 0) {
    return {
      data: [],
      metrics: {
        totalPatients: 0,
        repeatPatients: 0,
        newPatients: 0,
        upcomingVisitsCount: 0,
      },
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  // ── ISOLATION FIX (Bug 1) ────────────────────────────────────────────────
  // Filter strictly by clinic_id. The previous OR condition
  // (`clinic_id IS NULL AND hospital_id IS NULL`) silently ingested
  // direct-doctor appointments that have no organization identifier — those
  // are NOT clinic patients and must not appear here.
  // Source of truth: appointment.clinic_id = authenticatedClinicId.
  let query = supabaseAdmin
    .from('appointments')
    .select(`
      patient_id,
      status,
      appointment_date,
      time_slot,
      type,
      doctor_id,
      clinic_id,
      patient:patients(id, name, user_id, date_of_birth, gender, profile_image_url),
      doctor:doctors(id, name, specialization)
    `)
    .eq('clinic_id', clinicId)
    .in('doctor_id', activeDoctorIds)
    .not('status', 'in', '(cancelled)')
    .order('appointment_date', { ascending: false });
  // ────────────────────────────────────────────────────────────────────────

  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const patientContactMap = await buildUserContactMap(
    (data || []).map((appointment) => appointment?.patient?.user_id)
  );

  const today = todayIsoDate();
  const byPatient = new Map();

  for (const appointment of data || []) {
    const patient = appointment?.patient || {};
    if (!patient?.id) continue;
    const patientUser = patient.user_id ? patientContactMap.get(patient.user_id) : null;

    if (!byPatient.has(patient.id)) {
      let age = null;
      if (patient.date_of_birth) {
        const birthDate = new Date(patient.date_of_birth);
        if (!isNaN(birthDate.getTime())) {
          const ageDifMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDifMs);
          age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
      }

      byPatient.set(patient.id, {
        id: patient.id,
        name: patient.name || 'Patient',
        phone: patientUser?.phone || '',
        email: patientUser?.email || '',
        gender: patient.gender || null,
        dateOfBirth: patient.date_of_birth || null,
        age: age,
        profile_image_url: patient.profile_image_url || null,
        totalVisits: 0,
        completedVisits: 0,
        lastVisit: null,
        lastVisitDoctor: null,
        lastVisitType: null,
        lastStatus: null,
        nextAppointment: null,
        upcomingCount: 0,
        doctorsSeen: new Set(),
      });
    }

    const record = byPatient.get(patient.id);
    record.totalVisits += 1;
    if (appointment.status === 'completed') {
      record.completedVisits += 1;
    }
    if (appointment.doctor?.name) {
      record.doctorsSeen.add(appointment.doctor.name);
    }

    const isUpcoming = ['scheduled', 'confirmed'].includes(appointment.status) && appointment.appointment_date >= today;
    if (isUpcoming) {
      record.upcomingCount += 1;
      if (!record.nextAppointment || appointment.appointment_date < record.nextAppointment.appointment_date) {
        record.nextAppointment = {
          appointment_date: appointment.appointment_date,
          time_slot: appointment.time_slot,
          status: appointment.status,
          type: appointment.type || 'clinic',
          doctorName: appointment.doctor?.name || 'Doctor',
          doctorSpecialization: appointment.doctor?.specialization || '',
        };
      }
    }

    if (appointment.appointment_date <= today || !record.lastVisit) {
      if (!record.lastVisit || appointment.appointment_date > record.lastVisit) {
        record.lastVisit = appointment.appointment_date;
        record.lastVisitDoctor = appointment.doctor?.name || null;
        record.lastVisitType = appointment.type || 'clinic';
        record.lastStatus = appointment.status;
      }
    }
  }

  const allPatients = [...byPatient.values()].map((p) => ({
    ...p,
    doctorsSeenCount: p.doctorsSeen.size,
    doctorsSeen: Array.from(p.doctorsSeen),
  }));

  // Calculate real metrics across all patients for this clinic
  const metrics = {
    totalPatients: allPatients.length,
    repeatPatients: allPatients.filter((p) => p.totalVisits > 1).length,
    newPatients: allPatients.filter((p) => p.totalVisits === 1).length,
    upcomingVisitsCount: allPatients.filter((p) => p.upcomingCount > 0).length,
  };

  let filtered = allPatients;

  // Filter by category
  if (filter === 'upcoming') {
    filtered = filtered.filter((p) => p.upcomingCount > 0);
  } else if (filter === 'repeat') {
    filtered = filtered.filter((p) => p.totalVisits > 1);
  } else if (filter === 'new') {
    filtered = filtered.filter((p) => p.totalVisits === 1);
  }

  if (search) {
    const normalized = search.toLowerCase();
    filtered = filtered.filter((patient) =>
      [patient.name, patient.phone, patient.email, patient.lastVisitDoctor, ...(patient.doctorsSeen || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }

  filtered.sort((a, b) => {
    if (filter === 'upcoming' && a.nextAppointment && b.nextAppointment) {
      return a.nextAppointment.appointment_date.localeCompare(b.nextAppointment.appointment_date);
    }
    return (b.lastVisit || '').localeCompare(a.lastVisit || '') || b.totalVisits - a.totalVisits;
  });

  const total = filtered.length;
  const offset = (page - 1) * limit;

  return {
    data: filtered.slice(offset, offset + limit),
    metrics,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

const getClinicPatientDetails = async (clinicId, userId, patientId) => {
  await assertClinicOwner(clinicId, userId);
  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  if (activeDoctorIds.length === 0) {
    throw new ApiError(403, 'Clinic has no active doctors to establish patient relationship');
  }

  // ── ISOLATION FIX (Bug 2) ────────────────────────────────────────────────
  // Fetch only appointments for this patient that are strictly scoped to this
  // clinic. The previous OR condition (`clinic_id IS NULL`) allowed a direct
  // URL to /patients/:id to expose records from direct-doctor encounters.
  // Source of truth: appointment.clinic_id = authenticatedClinicId.
  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from('appointments')
    .select(`
      id,
      status,
      appointment_date,
      time_slot,
      type,
      payment_status,
      doctor:doctors(id, name, specialization)
    `)
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .in('doctor_id', activeDoctorIds)
    .order('appointment_date', { ascending: false });
  // ────────────────────────────────────────────────────────────────────────

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

// ── Clinic Health Intelligence & Alert Center ──
const getHealthAlerts = async (clinicId, userId) => {
  await assertClinicOwner(clinicId, userId);

  const activeDoctorIds = await getActiveClinicDoctorIds(clinicId);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromDateStr = fromDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch appointments in past 30 days
  let appointmentsQuery = supabaseAdmin
    .from('appointments')
    .select('id, appointment_date, status, fee, type, created_at')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', fromDateStr);

  if (activeDoctorIds.length > 0) {
    appointmentsQuery = appointmentsQuery.in('doctor_id', activeDoctorIds);
  }

  // 2. Fetch upcoming doctor leaves
  const leavesQuery = activeDoctorIds.length > 0
    ? supabaseAdmin
      .from('doctor_leaves')
      .select('id, doctor_id, start_date, end_date, reason, status, created_at, doctor:doctors(id, name)')
      .in('doctor_id', activeDoctorIds)
      .gte('end_date', todayStr)
      .order('start_date', { ascending: true })
    : Promise.resolve({ data: [] });

  // 3. Fetch unresponded clinic reviews
  const reviewsQuery = supabaseAdmin
    .from('reviews')
    .select('id, rating, is_verified, response, is_visible, created_at')
    .eq('reviewable_type', 'clinic')
    .eq('reviewable_id', clinicId)
    .eq('is_visible', true);

  // 4. Fetch pharmacy orders (past 30 days)
  const pharmacyOrdersQuery = supabaseAdmin
    .from('pharmacy_orders')
    .select('id, pharmacy_id, status, total_amount, created_at, pharmacy:pharmacies(id, name)')
    .eq('clinic_id', clinicId)
    .gte('created_at', fromDateStr)
    .order('created_at', { ascending: false });

  // 5. Fetch diagnostic bookings (past 30 days)
  const diagnosticBookingsQuery = supabaseAdmin
    .from('diagnostic_bookings')
    .select('id, center_id, status, total_price, report_url, created_at, center:diagnostic_centers(id, name)')
    .eq('clinic_id', clinicId)
    .gte('created_at', fromDateStr)
    .order('created_at', { ascending: false });

  // 6. Fetch hospital referrals (past 30 days)
  const hospitalReferralsQuery = supabaseAdmin
    .from('patient_referrals')
    .select('id, target_hospital_id, status, urgency, reason, clinical_summary, created_at, hospital:hospitals(id, name)')
    .eq('referring_clinic_id', clinicId)
    .gte('created_at', fromDateStr)
    .order('created_at', { ascending: false });

  // 7. Fetch public health / outbreak alerts
  const outbreaksQuery = supabaseAdmin
    .from('outbreak_alerts')
    .select('id, disease_or_symptom, severity, city, state, event_count, baseline_count, recommendations, detected_at')
    .order('detected_at', { ascending: false })
    .limit(10);

  const [
    { data: appointmentsData },
    { data: leavesData },
    { data: reviewsData },
    { data: pharmacyOrdersData },
    { data: diagnosticBookingsData },
    { data: hospitalReferralsData },
    outbreaksResponse,
  ] = await Promise.all([
    appointmentsQuery,
    leavesQuery,
    reviewsQuery,
    pharmacyOrdersQuery,
    diagnosticBookingsQuery,
    hospitalReferralsQuery,
    outbreaksQuery,
  ]);

  const appointments = appointmentsData || [];
  const leaves = leavesData || [];
  const reviews = reviewsData || [];
  const pharmacyOrders = pharmacyOrdersData || [];
  const diagnosticBookings = diagnosticBookingsData || [];
  const hospitalReferrals = hospitalReferralsData || [];
  const outbreaks = outbreaksResponse?.data || [];

  const alerts = [];

  // ── A. Clinic Operational Alerts ──
  const totalApts = appointments.length;
  const cancelledApts = appointments.filter((a) => a.status === 'cancelled').length;
  const cancellationRate = totalApts >= 5 ? Math.round((cancelledApts / totalApts) * 100) : 0;
  if (cancellationRate >= 20) {
    alerts.push({
      id: 'clinic-alert-cancellation-rate',
      category: 'clinic',
      severity: 'warning',
      title: 'Elevated Appointment Cancellation Rate',
      description: `${cancellationRate}% of booked clinic appointments were cancelled in the past 30 days (${cancelledApts} of ${totalApts}).`,
      sourceName: 'Clinic Operations',
      timestamp: new Date().toISOString(),
      status: 'active',
      actionUrl: '/clinic/appointments',
      actionLabel: 'View Appointments',
    });
  }

  leaves.forEach((l) => {
    alerts.push({
      id: `clinic-leave-${l.id}`,
      category: 'clinic',
      severity: 'warning',
      title: `Upcoming Leave: ${l.doctor?.name || 'Affiliated Doctor'}`,
      description: `Leave scheduled from ${l.start_date} to ${l.end_date} (${l.reason || 'Personal leave'}). Please review schedule coverage.`,
      sourceName: 'Clinic Scheduling',
      timestamp: l.created_at || new Date().toISOString(),
      status: l.status || 'active',
      actionUrl: '/clinic/schedule',
      actionLabel: 'View Schedule',
    });
  });

  const unrespondedReviews = reviews.filter((r) => !r.response);
  if (unrespondedReviews.length > 0) {
    alerts.push({
      id: 'clinic-alert-unresponded-reviews',
      category: 'clinic',
      severity: 'info',
      title: `${unrespondedReviews.length} Patient Review(s) Awaiting Response`,
      description: 'Recent patient feedback requires your clinic response to maintain patient trust.',
      sourceName: 'Clinic Quality',
      timestamp: unrespondedReviews[0]?.created_at || new Date().toISOString(),
      status: 'active',
      actionUrl: '/clinic/reviews',
      actionLabel: 'View Reviews',
    });
  }

  // ── B. Hospital Partner Alerts ──
  hospitalReferrals.forEach((ref) => {
    const st = (ref.status || 'pending').toLowerCase();
    const hospName = ref.hospital?.name || 'Partner Hospital';
    if (st === 'pending') {
      alerts.push({
        id: `hosp-ref-${ref.id}`,
        category: 'hospital',
        severity: 'critical',
        title: 'Hospital Referral Awaiting Response',
        description: `Referral to ${hospName} (${ref.urgency ? ref.urgency.toUpperCase() : 'Routine'}) is pending acceptance.`,
        sourceName: hospName,
        timestamp: ref.created_at,
        status: 'pending',
        actionUrl: '/clinic/referrals',
        actionLabel: 'View Referral',
      });
    } else if (st === 'admitted') {
      alerts.push({
        id: `hosp-ref-admitted-${ref.id}`,
        category: 'hospital',
        severity: 'info',
        title: 'Patient Admitted at Hospital',
        description: `Referred patient has been successfully admitted at ${hospName}.`,
        sourceName: hospName,
        timestamp: ref.created_at,
        status: 'admitted',
        actionUrl: '/clinic/referrals',
        actionLabel: 'View Referral',
      });
    } else if (st === 'rejected') {
      alerts.push({
        id: `hosp-ref-declined-${ref.id}`,
        category: 'hospital',
        severity: 'warning',
        title: 'Referral Declined by Hospital',
        description: `Referral request was declined by ${hospName}. Please evaluate alternate care options.`,
        sourceName: hospName,
        timestamp: ref.created_at,
        status: 'declined',
        actionUrl: '/clinic/referrals',
        actionLabel: 'View Referral',
      });
    }
  });

  // ── C. Pharmacy Partner Alerts ──
  pharmacyOrders.forEach((o) => {
    const st = (o.status || 'pending').toLowerCase();
    const pharmName = o.pharmacy?.name || 'Partner Pharmacy';
    const orderCode = `ORD-${o.id.slice(0, 8).toUpperCase()}`;

    if (st === 'pending') {
      alerts.push({
        id: `pharm-order-pending-${o.id}`,
        category: 'pharmacy',
        severity: 'warning',
        title: `Prescription Order ${orderCode} Pending Acceptance`,
        description: `Prescription routed to ${pharmName} is awaiting pharmacy acceptance.`,
        sourceName: pharmName,
        timestamp: o.created_at,
        status: 'pending',
        actionUrl: '/clinic/pharmacies',
        actionLabel: 'View Order',
      });
    } else if (st === 'rejected') {
      alerts.push({
        id: `pharm-order-rejected-${o.id}`,
        category: 'pharmacy',
        severity: 'critical',
        title: `Order ${orderCode} Rejected`,
        description: `Prescription order was declined by ${pharmName} (stock unavailability or out of delivery zone).`,
        sourceName: pharmName,
        timestamp: o.created_at,
        status: 'rejected',
        actionUrl: '/clinic/pharmacies',
        actionLabel: 'View Order',
      });
    } else if (st === 'ready') {
      alerts.push({
        id: `pharm-order-ready-${o.id}`,
        category: 'pharmacy',
        severity: 'info',
        title: `Order ${orderCode} Ready for Pickup / Delivery`,
        description: `Medicines have been packed by ${pharmName} and are ready for fulfillment.`,
        sourceName: pharmName,
        timestamp: o.created_at,
        status: 'ready',
        actionUrl: '/clinic/pharmacies',
        actionLabel: 'View Order',
      });
    }
  });

  // ── D. Diagnostic Partner Alerts ──
  diagnosticBookings.forEach((b) => {
    const st = (b.status || 'pending').toLowerCase();
    const centerName = b.center?.name || 'Diagnostic Center';
    const bookingCode = `DX-${b.id.slice(0, 8).toUpperCase()}`;

    if (st === 'report_ready' || b.report_url) {
      alerts.push({
        id: `dx-report-ready-${b.id}`,
        category: 'diagnostics',
        severity: 'info',
        title: `Lab Report Ready: ${bookingCode}`,
        description: `Authorized lab report from ${centerName} has been uploaded and is ready for clinical review.`,
        sourceName: centerName,
        timestamp: b.created_at,
        status: 'report_ready',
        actionUrl: '/clinic/diagnostic-centers',
        actionLabel: 'View Report',
      });
    } else if (st === 'pending') {
      alerts.push({
        id: `dx-booking-pending-${b.id}`,
        category: 'diagnostics',
        severity: 'warning',
        title: `Diagnostic Booking ${bookingCode} Pending Routing`,
        description: `Test request at ${centerName} is awaiting center acceptance and schedule slot confirmation.`,
        sourceName: centerName,
        timestamp: b.created_at,
        status: 'pending',
        actionUrl: '/clinic/diagnostic-centers',
        actionLabel: 'View Booking',
      });
    } else if (st === 'rejected') {
      alerts.push({
        id: `dx-booking-rejected-${b.id}`,
        category: 'diagnostics',
        severity: 'critical',
        title: `Diagnostic Request ${bookingCode} Declined`,
        description: `Test request was declined by ${centerName}. Please re-route to an alternative diagnostic partner.`,
        sourceName: centerName,
        timestamp: b.created_at,
        status: 'rejected',
        actionUrl: '/clinic/diagnostic-centers',
        actionLabel: 'View Booking',
      });
    }
  });

  // ── E. Public Health Alerts ──
  outbreaks.forEach((outbreak) => {
    alerts.push({
      id: `outbreak-${outbreak.id}`,
      category: 'public_health',
      severity: outbreak.severity === 'critical' ? 'critical' : outbreak.severity === 'warning' ? 'warning' : 'info',
      title: `Public Health Advisory: ${outbreak.disease_or_symptom}`,
      description: outbreak.recommendations || `Elevated incident cluster detected in ${outbreak.city}, ${outbreak.state} (${outbreak.event_count} events).`,
      sourceName: 'Public Health Department',
      timestamp: outbreak.detected_at,
      status: 'active',
      actionUrl: '',
      actionLabel: '',
    });
  });

  // Sort alerts newest first
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // KPI Metrics
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const needsAttentionCount = alerts.filter((a) => a.status === 'pending' || a.severity === 'critical' || a.severity === 'warning').length;
  const events30d = alerts.length;

  return {
    alerts,
    kpi: {
      critical: criticalCount,
      warnings: warningCount,
      needsAttention: needsAttentionCount,
      events30d,
    },
    countsByCategory: {
      all: alerts.length,
      clinic: alerts.filter((a) => a.category === 'clinic').length,
      hospital: alerts.filter((a) => a.category === 'hospital').length,
      pharmacy: alerts.filter((a) => a.category === 'pharmacy').length,
      diagnostics: alerts.filter((a) => a.category === 'diagnostics').length,
      public_health: alerts.filter((a) => a.category === 'public_health').length,
    },
    countsBySeverity: {
      all: alerts.length,
      critical: criticalCount,
      warning: warningCount,
      info: alerts.filter((a) => a.severity === 'info').length,
      resolved: alerts.filter((a) => a.status === 'resolved' || a.status === 'completed' || a.status === 'admitted').length,
    },
    clinicTrends: {
      totalAppointments: totalApts,
      cancellationRate,
      activeLeavesCount: leaves.length,
      partnerHandoffsCount: hospitalReferrals.length + pharmacyOrders.length + diagnosticBookings.length,
    },
  };
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
  getClinicDoctorProfile,
  addDoctor,
  removeDoctor,
  getAppointments,
  getConsultations,
  getClinicDoctorsPublic,
  addReel,
  deleteReel,
  getClinicDepartments,
  getClinicDepartmentMeta,
  getClinicDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  getAnalytics,
  getHealthAlerts,
  getClinicInvites,
  cancelClinicInvite,
  getClinicJoinRequests,
  respondToJoinRequest,
  getClinicPatients,
  getClinicPatientDetails,
  updateAppointmentStatusForClinic,
  rescheduleClinicAppointment,
  checkInAppointment,
};
