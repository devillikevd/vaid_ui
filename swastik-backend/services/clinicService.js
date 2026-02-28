/**
 * Clinic Service
 * Clinic registration, management, doctors, appointments
 */
const { supabaseAdmin } = require('../config/supabase');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { sanitizeSearch } = require('../utils/sanitize');

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

  const { data, error, count } = await query
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Find nearby clinics
const findNearby = async (latitude, longitude, radius = 10, specialization) => {
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

  if (specialization) query = query.contains('specializations', [specialization]);

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .map((c) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: c.latitude, longitude: c.longitude });
      return { ...c, distance: dist, distanceText: formatDistance(dist) };
    })
    .filter((c) => c.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

// Get clinic by ID
const getClinicById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    const err = new Error('Clinic not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
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
    const err = new Error('Clinic not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return data;
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
    const err = new Error('Clinic not found or access denied');
    err.statusCode = 403;
    throw err;
  }

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalDoctors },
    { count: todayAppointments },
    { data: patientRows },
    { data: recentAppointments },
  ] = await Promise.all([
    supabaseAdmin.from('clinic_doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('appointment_date', today),
    supabaseAdmin.from('appointments').select('patient_id').eq('clinic_id', clinicId),
    supabaseAdmin.from('appointments').select('*, patient:patients(name, phone), doctor:doctors(name, specialization)').eq('clinic_id', clinicId).order('appointment_date', { ascending: false }).limit(10),
  ]);

  const uniquePatients = new Set((patientRows || []).map((r) => r.patient_id)).size;

  return {
    stats: {
      totalDoctors: totalDoctors || 0,
      todayAppointments: todayAppointments || 0,
      totalPatients: uniquePatients,
    },
    recentAppointments: recentAppointments || [],
  };
};

// Update clinic
const updateClinic = async (clinicId, userId, updates) => {
  // Whitelist allowed update fields to prevent mass-assignment
  const allowedFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
    'latitude', 'longitude', 'specializations', 'description', 'opening_hours',
    'profile_image_url', 'facilities'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('clinics')
    .update(safeUpdates)
    .eq('id', clinicId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Get doctors in clinic
const getDoctors = async (clinicId, userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabaseAdmin
    .from('clinic_doctors')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url, consultation_fee)', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Add doctor to clinic
const addDoctor = async (clinicId, userId, doctorId) => {
  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .insert({ clinic_id: clinicId, doctor_id: doctorId })
    .select('*, doctor:doctors(id, name, specialization)')
    .single();

  if (error) throw error;
  return data;
};

// Remove doctor from clinic
const removeDoctor = async (clinicId, userId, doctorId) => {
  const { error } = await supabaseAdmin
    .from('clinic_doctors')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId);

  if (error) throw error;
};

// Get appointments for clinic
const getAppointments = async (clinicId, userId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('appointments')
    .select('*, patient:patients(name, phone), doctor:doctors(name, specialization)', { count: 'exact' })
    .eq('clinic_id', clinicId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.date) query = query.eq('appointment_date', filters.date);

  const { data, error, count } = await query
    .order('appointment_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Get consultations for all doctors affiliated with this clinic
const getConsultations = async (userId, page = 1, limit = 20, status) => {
  const clinic = await getClinicByOwner(userId);
  if (!clinic) throw Object.assign(new Error('Clinic not found'), { statusCode: 404 });

  // Get all doctor IDs affiliated with this clinic
  const { data: clinicDoctors } = await supabaseAdmin
    .from('clinic_doctors')
    .select('doctor_id')
    .eq('clinic_id', clinic.id)
    .eq('is_active', true);

  const doctorIds = (clinicDoctors || []).map(d => d.doctor_id);
  if (doctorIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('consultations')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name, phone), appointment:appointments(id, appointment_date, time_slot, type)', { count: 'exact' })
    .in('doctor_id', doctorIds);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Get clinic doctors (public — for patient discovery)
const getClinicDoctorsPublic = async (clinicId) => {
  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url, consultation_fee, experience_years)')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (error) throw error;
  return (data || []).map(cd => cd.doctor).filter(Boolean);
};

module.exports = {
  searchClinics,
  findNearby,
  getClinicById,
  registerClinic,
  getClinicByOwner,
  getDashboard,
  updateClinic,
  getDoctors,
  addDoctor,
  removeDoctor,
  getAppointments,
  getConsultations,
  getClinicDoctorsPublic,
};
