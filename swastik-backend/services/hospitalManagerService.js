/**
 * Hospital Manager Service
 * Hospital owner/manager operations: profile, doctors, appointments, analytics
 */
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { cacheDel } = require('../config/redis');
const { maybeGeocodeLocationUpdates } = require('../utils/geocoding');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');

// Get hospital by owner/manager
const getHospitalByOwner = async (userId) => {
  // Try owner first
  let { data: hospital } = await supabaseAdmin
    .from('hospitals')
    .select('*, reels:hospital_reels(*)')
    .eq('owner_id', userId)
    .single();

  if (!hospital) {
    // Check if user is a manager
    const { data: managerEntry } = await supabaseAdmin
      .from('hospital_managers')
      .select('hospital_id')
      .eq('user_id', userId)
      .single();

    if (managerEntry) {
      const { data: h } = await supabaseAdmin
        .from('hospitals')
        .select('*, reels:hospital_reels(*)')
        .eq('id', managerEntry.hospital_id)
        .single();
      hospital = h;
    }
  }

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found for this user');
  }

  return {
    ...hospital,
    profile_image_url: hospital.profile_image_url || hospital.image_url || null,
  };
};

/**
 * Resolve staff context: staff_role, permissions, and department
 */
const getStaffContext = async (userId) => {
  // Check if owner
  const { data: ownerHospital } = await supabaseAdmin
    .from('hospitals')
    .select('id, name, city, address, approval_status')
    .eq('owner_id', userId)
    .maybeSingle();

  if (ownerHospital) {
    return {
      hospital: ownerHospital,
      staffRole: 'hospital_owner',
      isOwner: true,
      permissions: ['*'],
      department: null,
      shift: 'all',
    };
  }

  // Check if hospital staff/manager
  const { data: staffEntry } = await supabaseAdmin
    .from('hospital_managers')
    .select(`
      id,
      role,
      staff_role,
      permissions,
      shift,
      department_id,
      hospital:hospitals(id, name, city, address, approval_status),
      department:hospital_departments(id, name)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (staffEntry && staffEntry.hospital) {
    return {
      hospital: staffEntry.hospital,
      staffRole: staffEntry.staff_role || staffEntry.role || 'hospital_admin',
      isOwner: false,
      permissions: staffEntry.permissions || [],
      department: staffEntry.department || null,
      shift: staffEntry.shift || 'general',
    };
  }

  throw new ApiError(404, 'Hospital not found for this user');
};

const assertDoctorBelongsToHospital = async (hospitalId, doctorId) => {
  if (!doctorId) return null;

  const { data: association, error } = await supabaseAdmin
    .from('hospital_doctors')
    .select('doctor_id')
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', doctorId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!association) {
    throw new ApiError(400, 'Selected head doctor must belong to this hospital');
  }

  return association.doctor_id;
};

const getActiveHospitalDoctorIds = async (hospitalId) => {
  const { data, error } = await supabaseAdmin
    .from('hospital_doctors')
    .select('doctor_id')
    .eq('hospital_id', hospitalId)
    .eq('is_active', true);

  if (error) throw error;

  return (data || []).map((row) => row.doctor_id).filter(Boolean);
};

const buildDepartmentSummaries = async (hospitalId) => {
  const [
    { data: departments, error: departmentsError },
    { data: doctorAssociations, error: doctorsError },
    { data: appointments, error: appointmentsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('hospital_departments')
      .select(`
        id,
        name,
        description,
        is_active,
        head_doctor_id,
        headDoctor:doctors!fk_dept_head_doctor(id, name)
      `)
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('hospital_doctors')
      .select('doctor_id, department, is_active')
      .eq('hospital_id', hospitalId),
    supabaseAdmin
      .from('appointments')
      .select('doctor_id')
      .eq('hospital_id', hospitalId)
      .not('status', 'eq', 'cancelled'),
  ]);

  if (departmentsError) throw departmentsError;
  if (doctorsError) throw doctorsError;
  if (appointmentsError) throw appointmentsError;

  const doctorCountsByDepartment = new Map();
  const doctorDepartmentById = new Map();

  (doctorAssociations || []).forEach((association) => {
    const departmentName = association.department?.trim();
    if (!departmentName || association.is_active === false) return;

    doctorDepartmentById.set(association.doctor_id, departmentName);
    doctorCountsByDepartment.set(
      departmentName,
      (doctorCountsByDepartment.get(departmentName) || 0) + 1
    );
  });

  const appointmentCountsByDepartment = new Map();
  (appointments || []).forEach((appointment) => {
    const departmentName = doctorDepartmentById.get(appointment.doctor_id);
    if (!departmentName) return;

    appointmentCountsByDepartment.set(
      departmentName,
      (appointmentCountsByDepartment.get(departmentName) || 0) + 1
    );
  });

  return (departments || []).map((department) => ({
    id: department.id,
    name: department.name,
    description: department.description || '',
    head: department.headDoctor?.name || '',
    headDoctorId: department.head_doctor_id || null,
    status: department.is_active === false ? 'inactive' : 'active',
    doctors: doctorCountsByDepartment.get(department.name) || 0,
    doctorCount: doctorCountsByDepartment.get(department.name) || 0,
    appointments: appointmentCountsByDepartment.get(department.name) || 0,
  }));
};

const mapHospitalDoctorAssociation = (association, appointmentsTodayByDoctorId) => ({
  id: association.doctor?.id || association.doctor_id || association.id,
  associationId: association.id,
  name: association.doctor?.name || 'Doctor',
  specialization: association.doctor?.specialization || 'General Medicine',
  department: association.department || 'Unassigned',
  status: association.is_active === false ? 'inactive' : association.doctor?.is_available === false ? 'on-leave' : 'active',
  appointmentsToday: appointmentsTodayByDoctorId.get(association.doctor?.id || association.doctor_id) || 0,
  email: association.doctor?.user?.email || '',
  phone: association.doctor?.user?.phone || '',
  profileImageUrl: association.doctor?.profile_image_url || '',
  rating: association.doctor?.rating || 0,
});

const mapHospitalAppointment = (appointment) => ({
  id: appointment.id,
  patientId: appointment.patient?.id || appointment.patient_id || null,
  patientName: appointment.patient?.name || 'Patient',
  patientPhone: appointment.patient?.user?.phone || '',
  doctorId: appointment.doctor?.id || appointment.doctor_id || null,
  doctorName: appointment.doctor?.name || 'Doctor',
  doctorSpecialization: appointment.doctor?.specialization || '',
  doctorProfileImageUrl: appointment.doctor?.profile_image_url || '',
  date: appointment.appointment_date || null,
  time: appointment.time_slot || null,
  status: appointment.status || 'scheduled',
  type: appointment.type || 'hospital',
  reason: appointment.reason || '',
  fee: appointment.fee ?? null,
  createdAt: appointment.created_at || null,
});

const mapHospitalConsultation = (consultation) => ({
  id: consultation.id,
  status: consultation.status || 'scheduled',
  type: consultation.type || consultation.appointment?.type || 'video',
  created_at: consultation.created_at || null,
  started_at: consultation.started_at || null,
  ended_at: consultation.ended_at || null,
  diagnosis: consultation.diagnosis || null,
  notes: consultation.notes || null,
  doctor: {
    id: consultation.doctor?.id || consultation.doctor_id || null,
    name: consultation.doctor?.name || 'Doctor',
    specialization: consultation.doctor?.specialization || '',
    profile_image_url: consultation.doctor?.profile_image_url || null,
  },
  patient: {
    id: consultation.patient?.id || consultation.patient_id || null,
    name: consultation.patient?.name || 'Patient',
    phone: consultation.patient?.user?.phone || '',
  },
  appointment: consultation.appointment ? {
    id: consultation.appointment.id,
    appointment_date: consultation.appointment.appointment_date || null,
    time_slot: consultation.appointment.time_slot || null,
    type: consultation.appointment.type || consultation.type || 'video',
  } : null,
});

// Dashboard
const getDashboard = async (hospitalId, userId) => {
  const today = new Date().toISOString().split('T')[0];
  const departmentSummariesPromise = buildDepartmentSummaries(hospitalId);

  const [
    { data: hospitalMeta },
    activeDoctorIds,
    departments,
  ] = await Promise.all([
    supabaseAdmin
      .from('hospitals')
      .select('total_beds, beds_available, icu_beds, icu_beds_available, emergency_beds')
      .eq('id', hospitalId)
      .maybeSingle(),
    getActiveHospitalDoctorIds(hospitalId),
    departmentSummariesPromise,
  ]);

  const totalDoctors = activeDoctorIds.length;

  let todayAppointments = 0;
  let totalAppointments = 0;
  let uniquePatients = 0;
  let recentAppointments = [];

  if (activeDoctorIds.length > 0) {
    const [
      { count: todayAppointmentsCount },
      { count: totalAppointmentsCount },
      { data: patientRows },
      { data: recentAppointmentRows },
    ] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .eq('appointment_date', today)
        .in('doctor_id', activeDoctorIds),
      supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .in('doctor_id', activeDoctorIds),
      supabaseAdmin
        .from('appointments')
        .select('patient_id')
        .eq('hospital_id', hospitalId)
        .in('doctor_id', activeDoctorIds),
      supabaseAdmin
        .from('appointments')
        .select('*, patient:patients(name), doctor:doctors(name, specialization)')
        .eq('hospital_id', hospitalId)
        .in('doctor_id', activeDoctorIds)
        .order('appointment_date', { ascending: false })
        .limit(10),
    ]);

    todayAppointments = todayAppointmentsCount || 0;
    totalAppointments = totalAppointmentsCount || 0;
    uniquePatients = new Set((patientRows || []).map((row) => row.patient_id)).size;
    recentAppointments = recentAppointmentRows || [];
  }

  const departmentList = departments || [];
  const activeDepartmentCount = departmentList.filter((department) => department.status !== 'inactive').length;
  const beds = hospitalMeta?.total_beds ?? hospitalMeta?.bed_capacity ?? hospitalMeta?.bed_count ?? null;

  return {
    stats: {
      totalDoctors: totalDoctors || 0,
      todayAppointments: todayAppointments || 0,
      // Alias for existing web UI key
      todaysAppointments: todayAppointments || 0,
      totalAppointments: totalAppointments || 0,
      totalPatients: uniquePatients,
      // UI reads this from stats
      departments: activeDepartmentCount,
      bedCapacity: beds != null ? `${beds} beds` : undefined,
    },
    recentAppointments: recentAppointments || [],
    departments: departmentList,
  };
};

// Update hospital
const updateHospital = async (hospitalId, userId, updates) => {
  const { data: existingHospital, error: existingHospitalError } = await supabaseAdmin
    .from('hospitals')
    .select('id, owner_id, address, city, state, pincode, latitude, longitude, approval_status')
    .eq('id', hospitalId)
    .single();

  if (existingHospitalError || !existingHospital) {
    throw existingHospitalError || new ApiError(404, 'Hospital not found');
  }

  // Whitelist allowed update fields to prevent mass-assignment
  const allowedFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
    'latitude', 'longitude', 'description', 'opening_hours', 'facilities',
    'profile_image_url', 'emergency_available', 'bed_count', 'total_beds', 'specializations',
    'license_number', 'license_document_url', 'accreditations',
    'website_url', 'established_year', 'insurance_accepted', 'gallery_urls', 'beds_available'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  if (safeUpdates.profile_image_url !== undefined) {
    safeUpdates.image_url = safeUpdates.profile_image_url;
    delete safeUpdates.profile_image_url;
  }
  if (updates.bed_capacity !== undefined && safeUpdates.total_beds === undefined) {
    safeUpdates.total_beds = updates.bed_capacity;
  }
  Object.assign(safeUpdates, await maybeGeocodeLocationUpdates(existingHospital, safeUpdates));
  safeUpdates.updated_at = new Date().toISOString();
  Object.assign(safeUpdates, buildProviderResubmissionFields('hospital_owner', existingHospital.approval_status));

  const { data, error } = await supabaseAdmin
    .from('hospitals')
    .update(safeUpdates)
    .eq('id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  await cacheDel(`auth_user:${userId}`);
  return {
    ...data,
    profile_image_url: data.profile_image_url || data.image_url || null,
  };
};

// Get doctors
const getDoctors = async (hospitalId, userId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: associations, error: doctorsError },
    { data: todayAppointments, error: appointmentsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('hospital_doctors')
      .select(`
        id,
        doctor_id,
        department,
        designation,
        is_active,
        joined_at,
        doctor:doctors(
          id,
          name,
          specialization,
          profile_image_url,
          consultation_fee,
          is_available,
          rating,
          user:users!doctors_user_id_fkey(email, phone)
        )
      `)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true),
    supabaseAdmin
      .from('appointments')
      .select('doctor_id')
      .eq('hospital_id', hospitalId)
      .eq('appointment_date', today)
      .not('status', 'eq', 'cancelled'),
  ]);

  if (doctorsError) throw doctorsError;
  if (appointmentsError) throw appointmentsError;

  const appointmentsTodayByDoctorId = new Map();
  (todayAppointments || []).forEach((appointment) => {
    if (!appointment.doctor_id) return;
    appointmentsTodayByDoctorId.set(
      appointment.doctor_id,
      (appointmentsTodayByDoctorId.get(appointment.doctor_id) || 0) + 1
    );
  });

  let result = (associations || []).map((association) =>
    mapHospitalDoctorAssociation(association, appointmentsTodayByDoctorId)
  );

  if (filters.specialization) {
    result = result.filter((doctor) => doctor.specialization === filters.specialization);
  }

  if (filters.isAvailable !== undefined) {
    result = result.filter((doctor) => (doctor.status === 'active') === filters.isAvailable);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter((doctor) =>
      [doctor.name, doctor.specialization, doctor.department, doctor.email, doctor.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }

  const total = result.length;
  const paginated = result.slice(offset, offset + limit);

  return {
    data: paginated,
    pagination: { page, limit, total, totalPages: total > 0 ? Math.ceil(total / limit) : 1 },
  };
};

// Invite doctor
const inviteDoctor = async (hospitalId, userId, data) => {
  const { doctorId, email, department, schedule } = data;

  let doctor;

  if (doctorId) {
    // Direct ID-based lookup
    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id, name')
      .eq('id', doctorId)
      .single();
    doctor = doc;
  } else if (email) {
    // Route sends email — resolve to doctor via user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      throw new ApiError(404, 'No user found with this email');
    }

    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id, name')
      .eq('user_id', user.id)
      .single();
    doctor = doc;
  }

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found. Please verify the email or doctor ID.');
  }

  // Use resolved doctor.id (handles both direct-ID and email paths)
  const resolvedDoctorId = doctor.id;

  // Check if already associated
  const { data: existing } = await supabaseAdmin
    .from('hospital_doctors')
    .select('id, is_active')
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', resolvedDoctorId)
    .maybeSingle();

  if (existing && existing.is_active !== false) {
    throw new ApiError(409, 'Doctor is already associated with this hospital');
  }

  const nowIso = new Date().toISOString();

  // Expire stale pending invites before checking for duplicates so old invites do not block re-invites.
  await supabaseAdmin
    .from('hospital_doctor_invites')
    .update({ status: 'expired', responded_at: nowIso })
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', resolvedDoctorId)
    .eq('status', 'pending')
    .lt('expires_at', nowIso);

  // Avoid duplicate active invites
  const { data: pendingInvite } = await supabaseAdmin
    .from('hospital_doctor_invites')
    .select('id, created_at')
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', resolvedDoctorId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingInvite) {
    throw new ApiError(409, 'An invite is already pending for this doctor');
  }

  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabaseAdmin
    .from('hospital_doctor_invites')
    .insert({
      hospital_id: hospitalId,
      doctor_id: resolvedDoctorId,
      invited_by: userId,
      department,
      schedule: schedule || {},
      status: 'pending',
      expires_at: inviteExpiresAt,
      practice_type: data.practiceType || null,
      consultation_modes: data.consultationModes || [],
      fee_amount: data.feeAmount || null,
      payout_terms: data.payoutTerms || null,
      start_date: data.startDate || null,
    })
    .select('*, doctor:doctors(name, specialization), hospital:hospitals(name, city)')
    .single();

  if (error) throw error;

  // Notify the doctor
  if (doctor.user_id || invite.doctor?.user_id) {
    let docUserId = doctor.user_id || invite.doctor?.user_id;
    if (!docUserId) {
      const { data: d } = await supabaseAdmin.from('doctors').select('user_id').eq('id', resolvedDoctorId).single();
      docUserId = d?.user_id;
    }

    if (docUserId) {
      const notificationService = require('./notificationService');
      notificationService.sendNotification(docUserId, {
        title: 'New Hospital Invitation',
        message: `You have been invited to join ${invite.hospital?.name || 'a hospital'}.`,
        type: 'hospital_invite',
        category: 'hospital',
        data: { inviteId: invite.id, hospitalId },
        action_url: '/doctor/care-networks?tab=invitations'
      }).catch(err => console.error('Failed to notify doctor of hospital invite', err));
    }
  }

  return { data: invite, message: 'Invitation sent. Doctor must accept before being assigned.' };
};

// Remove doctor
const removeDoctor = async (hospitalId, userId, doctorId) => {
  const { error } = await supabaseAdmin
    .from('hospital_doctors')
    .update({ is_active: false })
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', doctorId);

  if (error) throw error;

  await supabaseAdmin
    .from('hospital_departments')
    .update({ head_doctor_id: null })
    .eq('hospital_id', hospitalId)
    .eq('head_doctor_id', doctorId);

  const { data: otherActiveAssociation } = await supabaseAdmin
    .from('hospital_doctors')
    .select('hospital_id')
    .eq('doctor_id', doctorId)
    .eq('is_active', true)
    .neq('hospital_id', hospitalId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabaseAdmin
    .from('doctors')
    .update({ hospital_id: otherActiveAssociation?.hospital_id || null })
    .eq('id', doctorId)
    .eq('hospital_id', hospitalId);
};

const getDepartments = async (hospitalId, userId) => {
  const departments = await buildDepartmentSummaries(hospitalId);
  return {
    data: departments,
  };
};

const addDepartment = async (hospitalId, userId, departmentData) => {
  const headDoctorId = await assertDoctorBelongsToHospital(hospitalId, departmentData.headDoctorId || departmentData.head_doctor_id);

  const { error } = await supabaseAdmin
    .from('hospital_departments')
    .insert({
      hospital_id: hospitalId,
      name: departmentData.name?.trim(),
      description: departmentData.description || null,
      head_doctor_id: headDoctorId,
      is_active: departmentData.status !== 'inactive',
    });

  if (error) throw error;

  const departments = await buildDepartmentSummaries(hospitalId);
  return {
    data: departments,
    message: 'Department added successfully',
  };
};

const updateDepartment = async (hospitalId, userId, departmentId, departmentData) => {
  const headDoctorId = await assertDoctorBelongsToHospital(hospitalId, departmentData.headDoctorId || departmentData.head_doctor_id);

  const { error } = await supabaseAdmin
    .from('hospital_departments')
    .update({
      name: departmentData.name?.trim(),
      description: departmentData.description || null,
      head_doctor_id: headDoctorId,
      is_active: departmentData.status !== 'inactive',
    })
    .eq('id', departmentId)
    .eq('hospital_id', hospitalId);

  if (error) throw error;

  const departments = await buildDepartmentSummaries(hospitalId);
  return {
    data: departments,
    message: 'Department updated successfully',
  };
};

const deleteDepartment = async (hospitalId, userId, departmentId) => {
  const { error } = await supabaseAdmin
    .from('hospital_departments')
    .delete()
    .eq('id', departmentId)
    .eq('hospital_id', hospitalId);

  if (error) throw error;

  return {
    success: true,
    message: 'Department deleted successfully',
  };
};

// Get appointments
const getAppointments = async (hospitalId, userId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const activeDoctorIds = await getActiveHospitalDoctorIds(hospitalId);
  if (activeDoctorIds.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 1,
      },
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
        user:users(phone)
      ),
      doctor:doctors(
        id,
        name,
        specialization,
        profile_image_url
      )
    `)
    .eq('hospital_id', hospitalId)
    .in('doctor_id', activeDoctorIds);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
  if (filters.date) query = query.eq('appointment_date', filters.date);
  if (filters.fromDate) query = query.gte('appointment_date', filters.fromDate);
  if (filters.toDate) query = query.lte('appointment_date', filters.toDate);

  const { data, error } = await query
    .order('appointment_date', { ascending: false })
    .order('time_slot', { ascending: false });

  if (error) throw error;

  let result = (data || []).map(mapHospitalAppointment);

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter((appointment) =>
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
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }

  const total = result.length;
  const paginated = result.slice(offset, offset + limit);
  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    },
  };
};

// Analytics
const getAnalytics = async (hospitalId, userId, period = '30d') => {
  const days = parseInt(period) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split('T')[0];
  const activeDoctorIds = await getActiveHospitalDoctorIds(hospitalId);

  if (activeDoctorIds.length === 0) {
    return {
      data: {
        period,
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        totalRevenue: 0,
      },
    };
  }

  const [
    { count: totalAppointments },
    { count: completedAppointments },
    { count: cancelledAppointments },
    { data: appointmentData },
  ] = await Promise.all([
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalId).in('doctor_id', activeDoctorIds).gte('appointment_date', sinceDate),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalId).in('doctor_id', activeDoctorIds).eq('status', 'completed').gte('appointment_date', sinceDate),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalId).in('doctor_id', activeDoctorIds).eq('status', 'cancelled').gte('appointment_date', sinceDate),
    supabaseAdmin.from('appointments').select('fee, status').eq('hospital_id', hospitalId).in('doctor_id', activeDoctorIds).eq('status', 'completed').gte('appointment_date', sinceDate),
  ]);

  const totalRevenue = (appointmentData || []).reduce((sum, a) => sum + (a.fee || 0), 0);

  return {
    data: {
      period,
      totalAppointments: totalAppointments || 0,
      completedAppointments: completedAppointments || 0,
      cancelledAppointments: cancelledAppointments || 0,
      totalRevenue,
    },
  };
};

// Get managers & staff
const getManagers = async (hospitalId, userId) => {
  let { data, error } = await supabaseAdmin
    .from('hospital_managers')
    .select('*, user:users(id, name, email, phone, profile_image_url), department:hospital_departments(id, name)')
    .eq('hospital_id', hospitalId);

  // Fallback if migration 112 (department_id FK) hasn't run yet
  if (error) {
    const fallback = await supabaseAdmin
      .from('hospital_managers')
      .select('*, user:users(id, name, email, phone, profile_image_url)')
      .eq('hospital_id', hospitalId);
    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }

  return data || [];
};

// Add manager / staff member with specific role
const addManager = async (hospitalId, userId, managerData) => {
  const { email, name, phone, password, permissions, role, staffRole, departmentId, shift } = managerData;

  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone, role')
    .eq('email', normalizedEmail)
    .maybeSingle();

  // If user does not exist, create new staff account directly with password
  if (!user) {
    const rawPassword = password || 'Staff@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email: normalizedEmail,
        name: name?.trim() || normalizedEmail,
        phone: phone?.trim() || null,
        password_hash: passwordHash,
        role: 'hospital_manager',
        is_active: true,
        email_verified: true,
      })
      .select('id, name, email, phone, role')
      .single();

    if (createError) throw createError;
    user = newUser;
  }

  // Check if user is already a manager for this hospital
  const { data: existingManager } = await supabaseAdmin
    .from('hospital_managers')
    .select('id')
    .eq('hospital_id', hospitalId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingManager) {
    throw new ApiError(409, 'This user is already a staff/manager for this hospital');
  }

  const { data: existingManagerAssignment } = await supabaseAdmin
    .from('hospital_managers')
    .select('hospital_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingManagerAssignment && existingManagerAssignment.hospital_id !== hospitalId) {
    throw new ApiError(409, 'This user is already assigned as staff for another hospital');
  }

  // Check if user already has a provider role that shouldn't be overwritten
  const protectedRoles = ['doctor', 'hospital_owner', 'pharmacy_owner', 'clinic_owner', 'diagnostic_center_owner', 'ambulance_operator', 'admin', 'super_admin'];
  if (protectedRoles.includes(user.role)) {
    throw new ApiError(409, `Cannot assign hospital_manager role: user already has role '${user.role}'. They must use a different account.`);
  }

  const userUpdates = { role: 'hospital_manager' };
  if (!user.name && name) userUpdates.name = name;
  if (!user.phone && phone) userUpdates.phone = phone;

  const { error: userUpdateError } = await supabaseAdmin
    .from('users')
    .update(userUpdates)
    .eq('id', user.id);
  if (userUpdateError) throw userUpdateError;

  const assignedRole = staffRole || role || 'hospital_admin';

  let manager;
  // Try inserting with enhanced migration 112 fields first
  const { data: enhancedManager, error: insertError } = await supabaseAdmin
    .from('hospital_managers')
    .insert({
      hospital_id: hospitalId,
      user_id: user.id,
      name: name || user.name || user.email,
      role: assignedRole,
      staff_role: assignedRole,
      department_id: departmentId || null,
      shift: shift || 'general',
      permissions: permissions || ['*'],
    })
    .select('*, user:users(id, name, email), department:hospital_departments(id, name)')
    .single();

  if (!insertError) {
    manager = enhancedManager;
  } else {
    // Fallback gracefully to standard schema if migration 112 columns aren't applied yet
    console.warn('[HospitalManagerService] Migration 112 columns not yet present, using base schema insert:', insertError.message);
    const { data: fallbackManager, error: fallbackError } = await supabaseAdmin
      .from('hospital_managers')
      .insert({
        hospital_id: hospitalId,
        user_id: user.id,
        name: name || user.name || user.email,
        role: assignedRole,
        permissions: permissions || ['*'],
      })
      .select('*, user:users(id, name, email)')
      .single();

    if (fallbackError) throw fallbackError;
    manager = { ...fallbackManager, staff_role: assignedRole, shift: shift || 'general' };
  }

  return manager;
};

// Remove staff member / manager
const removeManager = async (hospitalId, userId, managerId) => {
  const { data: manager, error: findError } = await supabaseAdmin
    .from('hospital_managers')
    .select('id, user_id')
    .eq('id', managerId)
    .eq('hospital_id', hospitalId)
    .single();

  if (findError || !manager) {
    throw new ApiError(404, 'Staff member not found in this hospital');
  }

  const { error: deleteError } = await supabaseAdmin
    .from('hospital_managers')
    .delete()
    .eq('id', managerId)
    .eq('hospital_id', hospitalId);

  if (deleteError) throw deleteError;
  return { success: true };
};

// Reset staff password directly by hospital owner
const resetStaffPassword = async (hospitalId, userId, managerId, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const { data: manager, error: findError } = await supabaseAdmin
    .from('hospital_managers')
    .select('id, user_id')
    .eq('id', managerId)
    .eq('hospital_id', hospitalId)
    .single();

  if (findError || !manager) {
    throw new ApiError(404, 'Staff member not found in this hospital');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', manager.user_id);

  if (updateError) throw updateError;
  return { success: true, message: 'Password updated successfully' };
};

// Update staff member role / shift
const updateManager = async (hospitalId, userId, managerId, updates) => {
  const { staffRole, role, shift, departmentId, permissions } = updates;

  const updateFields = {};
  if (staffRole || role) {
    updateFields.role = staffRole || role;
    updateFields.staff_role = staffRole || role;
  }
  if (shift) updateFields.shift = shift;
  if (departmentId !== undefined) updateFields.department_id = departmentId;
  if (permissions) updateFields.permissions = permissions;

  let { data, error } = await supabaseAdmin
    .from('hospital_managers')
    .update(updateFields)
    .eq('id', managerId)
    .eq('hospital_id', hospitalId)
    .select('*, user:users(id, name, email), department:hospital_departments(id, name)')
    .single();

  if (error) {
    // Fallback if enhanced schema not present
    const baseUpdates = {};
    if (staffRole || role) baseUpdates.role = staffRole || role;
    if (permissions) baseUpdates.permissions = permissions;

    const fallback = await supabaseAdmin
      .from('hospital_managers')
      .update(baseUpdates)
      .eq('id', managerId)
      .eq('hospital_id', hospitalId)
      .select('*, user:users(id, name, email)')
      .single();

    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }

  return data;
};

// Get consultations for doctors currently active in this hospital roster
const getConsultations = async (userId, page = 1, limit = 20, status, search = '') => {
  const hospital = await getHospitalByOwner(userId);
  if (!hospital) throw new ApiError(404, 'Hospital not found');

  const doctorIds = await getActiveHospitalDoctorIds(hospital.id);
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
      patient:patients(
        id,
        name,
        user:users(phone)
      ),
      appointment:appointments(id, appointment_date, time_slot, type, hospital_id)
    `)
    .in('doctor_id', doctorIds);

  if (status) query = query.eq('status', status);

  const { data, error } = await query
    .order('created_at', { ascending: false });

  if (error) throw error;

  let result = (data || [])
    .filter((consultation) => consultation.appointment?.hospital_id === hospital.id)
    .map(mapHospitalConsultation);

  if (search) {
    const normalizedSearch = search.toLowerCase();
    result = result.filter((consultation) =>
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

  const total = result.length;
  const paginated = result.slice(offset, offset + limit);
  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    },
  };
};

// Get affiliated ambulances and pending invites
const getAffiliatedAmbulances = async (hospitalId, userId) => {
  const [
    { data: ambulances, error: ambError },
    { data: invites, error: invError }
  ] = await Promise.all([
    supabaseAdmin
      .from('ambulances')
      .select('id, vehicle_number, driver_name, driver_phone, vehicle_type, is_active')
      .eq('affiliated_hospital_id', hospitalId),
    supabaseAdmin
      .from('hospital_ambulance_invites')
      .select('id, driver_email, status, created_at')
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending')
  ]);

  if (ambError) throw ambError;
  if (invError) throw invError;

  return { ambulances: ambulances || [], invites: invites || [] };
};

// Invite an ambulance driver
const inviteAmbulance = async (hospitalId, userId, data) => {
  let { email } = data;
  if (!email) throw new ApiError(400, 'Email is required');
  
  email = email.trim().toLowerCase();

  // Check if an invite is already pending for this email
  const { data: existingInvite } = await supabaseAdmin
    .from('hospital_ambulance_invites')
    .select('id')
    .eq('hospital_id', hospitalId)
    .ilike('driver_email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) {
    throw new ApiError(409, 'An invitation is already pending for this email');
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  const { data: invite, error } = await supabaseAdmin
    .from('hospital_ambulance_invites')
    .insert({
      hospital_id: hospitalId,
      driver_email: email,
      token,
      status: 'pending'
    })
    .select('*')
    .single();

  if (error) throw error;
  
  // In a real system, send email via NotificationService. 
  // Here we return success.
  return { data: invite, message: 'Invitation sent to the ambulance driver.' };
};

// Remove affiliated ambulance
const removeAffiliatedAmbulance = async (hospitalId, userId, ambulanceId) => {
  const { error } = await supabaseAdmin
    .from('ambulances')
    .update({ affiliated_hospital_id: null })
    .eq('id', ambulanceId)
    .eq('affiliated_hospital_id', hospitalId);
    
  if (error) throw error;
  return { success: true, message: 'Ambulance association removed.' };
};

// Add Hospital Reel
const addReel = async (hospitalId, userId, data) => {
  const { video_url, thumbnail_url, title } = data;
  const { data: reel, error } = await supabaseAdmin
    .from('hospital_reels')
    .insert({
      hospital_id: hospitalId,
      video_url,
      thumbnail_url,
      title
    })
    .select('*')
    .single();

  if (error) throw error;
  return reel;
};

// Delete Hospital Reel
const deleteReel = async (hospitalId, userId, reelId) => {
  const { error } = await supabaseAdmin
    .from('hospital_reels')
    .delete()
    .eq('id', reelId)
    .eq('hospital_id', hospitalId);

  if (error) throw error;
  return true;
};

// ── Doctor Join Requests ──

const getHospitalJoinRequests = async (hospitalId, userId, page = 1, limit = 10, status = 'all') => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('doctor_hospital_join_requests')
    .select(`
      *,
      doctor:doctors(id, name, specialization, profile_image_url, user_id, rating, total_reviews, experience_years)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiError(500, 'Failed to fetch join requests');
  }

  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

const respondToJoinRequest = async (hospitalId, userId, requestId, decision, responseMessage = '') => {
  if (!['accept', 'reject'].includes(decision)) {
    throw new ApiError(400, "Decision must be 'accept' or 'reject'");
  }

  const { data: request, error } = await supabaseAdmin
    .from('doctor_hospital_join_requests')
    .select('*, doctor:doctors(id, name, user_id), hospital:hospitals(name)')
    .eq('id', requestId)
    .eq('hospital_id', hospitalId)
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
    .from('doctor_hospital_join_requests')
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

  // 2. If accepted, create hospital_doctors association
  if (decision === 'accept') {
    const { error: assocError } = await supabaseAdmin
      .from('hospital_doctors')
      .upsert({
        hospital_id: hospitalId,
        doctor_id: request.doctor_id,
        is_active: true,
        department: request.department || null,
        designation: request.practice_type === 'full_time' ? 'Consultant' : 'Visiting Consultant',
        schedule: []
      }, { onConflict: 'hospital_id, doctor_id' });

    if (assocError) {
      console.error('Failed to create hospital_doctors association', assocError);
    }
  }

  // 3. Notify the doctor
  if (request.doctor?.user_id) {
    const notificationService = require('./notificationService');
    const title = decision === 'accept' ? 'Join Request Accepted' : 'Join Request Declined';
    const message = decision === 'accept' 
      ? `Your request to join ${request.hospital?.name} has been approved.`
      : `Your request to join ${request.hospital?.name} was declined. ${responseMessage ? `Reason: ${responseMessage}` : ''}`;

    notificationService.sendNotification(request.doctor.user_id, {
      title,
      message,
      type: 'join_request_response',
      category: 'hospital',
      data: { joinRequestId: request.id, hospitalId, status: newStatus },
      action_url: '/doctor/care-networks?tab=requests'
    }).catch(err => console.error('Failed to notify doctor', err));
  }

  return { id: requestId, status: newStatus };
};

module.exports = {
  getHospitalByOwner,
  getStaffContext,
  getDashboard,
  updateHospital,
  getDoctors,
  inviteDoctor,
  removeDoctor,
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  getAppointments,
  getAnalytics,
  getManagers,
  addManager,
  updateManager,
  removeManager,
  resetStaffPassword,
  getConsultations,
  getAffiliatedAmbulances,
  inviteAmbulance,
  removeAffiliatedAmbulance,
  addReel,
  deleteReel,
  getHospitalJoinRequests,
  respondToJoinRequest,
};
