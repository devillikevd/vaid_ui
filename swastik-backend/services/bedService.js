/**
 * Bed Service
 * Ward & bed CRUD + real-time occupancy tracking
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

// ──────────────────────────────────────────────
// WARD MANAGEMENT
// ──────────────────────────────────────────────

const getWards = async (hospitalId, filters = {}) => {
  let query = supabaseAdmin
    .from('hospital_wards')
    .select('*, department:hospital_departments(id, name)')
    .eq('hospital_id', hospitalId)
    .order('floor', { ascending: true })
    .order('name', { ascending: true });

  if (filters.wardType) query = query.eq('ward_type', filters.wardType);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.floor) query = query.eq('floor', filters.floor);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(ward => ({
    ...ward,
    occupancy_percent: ward.total_beds > 0
      ? Math.round((ward.occupied_beds / ward.total_beds) * 100)
      : 0,
    available_beds: ward.total_beds - ward.occupied_beds,
  }));
};

const createWard = async (hospitalId, wardData) => {
  const { data, error } = await supabaseAdmin
    .from('hospital_wards')
    .insert({
      hospital_id: hospitalId,
      name: wardData.name?.trim(),
      ward_type: wardData.ward_type || wardData.wardType || 'general',
      ward_code: wardData.ward_code || wardData.wardCode || null,
      floor: wardData.floor || null,
      wing: wardData.wing || null,
      building: wardData.building || null,
      charge_per_day: wardData.charge_per_day || wardData.chargePerDay || 0,
      department_id: wardData.department_id || wardData.departmentId || null,
      nurse_station: wardData.nurse_station || wardData.nurseStation || null,
      amenities: wardData.amenities || [],
      description: wardData.description || null,
      is_active: wardData.is_active !== false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const updateWard = async (hospitalId, wardId, updates) => {
  const allowedFields = [
    'name', 'ward_type', 'ward_code', 'floor', 'wing', 'building',
    'charge_per_day', 'department_id', 'nurse_station', 'in_charge_nurse_id',
    'amenities', 'description', 'is_active',
  ];
  const safeUpdates = {};
  for (const key of allowedFields) {
    // Support both snake_case and camelCase from frontend
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    else if (updates[camelKey] !== undefined) safeUpdates[key] = updates[camelKey];
  }

  const { data, error } = await supabaseAdmin
    .from('hospital_wards')
    .update(safeUpdates)
    .eq('id', wardId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Ward not found');
  return data;
};

const deleteWard = async (hospitalId, wardId) => {
  // Check if ward has occupied beds
  const { data: beds } = await supabaseAdmin
    .from('hospital_beds')
    .select('id')
    .eq('ward_id', wardId)
    .eq('status', 'occupied')
    .limit(1);

  if (beds && beds.length > 0) {
    throw new ApiError(400, 'Cannot delete ward with occupied beds. Transfer patients first.');
  }

  const { error } = await supabaseAdmin
    .from('hospital_wards')
    .delete()
    .eq('id', wardId)
    .eq('hospital_id', hospitalId);

  if (error) throw error;
  return { success: true };
};

// ──────────────────────────────────────────────
// BED MANAGEMENT
// ──────────────────────────────────────────────

const getBeds = async (hospitalId, filters = {}, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('hospital_beds')
    .select(`
      *,
      ward:hospital_wards(id, name, ward_type, floor, wing),
      patient:patients(id, name, date_of_birth, gender),
      admission:patient_admissions(id, admission_number, status, admitted_at, admitting_doctor_id)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.wardId) query = query.eq('ward_id', filters.wardId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.bedType) query = query.eq('bed_type', filters.bedType);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);

  const { data, error, count } = await query
    .order('ward_id', { ascending: true })
    .order('bed_number', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    pagination: {
      page, limit,
      total: count || 0,
      totalPages: count > 0 ? Math.ceil(count / limit) : 1,
    },
  };
};

const createBed = async (hospitalId, bedData) => {
  const { data, error } = await supabaseAdmin
    .from('hospital_beds')
    .insert({
      hospital_id: hospitalId,
      ward_id: bedData.ward_id || bedData.wardId,
      bed_number: bedData.bed_number || bedData.bedNumber,
      bed_type: bedData.bed_type || bedData.bedType || 'standard',
      features: bedData.features || [],
      notes: bedData.notes || null,
      is_active: bedData.is_active !== false,
    })
    .select('*, ward:hospital_wards(id, name, ward_type)')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'A bed with this number already exists in this ward');
    }
    throw error;
  }
  return data;
};

const createBedsBulk = async (hospitalId, wardId, bedPrefix, startNumber, count, bedType = 'standard') => {
  const beds = [];
  for (let i = 0; i < count; i++) {
    beds.push({
      hospital_id: hospitalId,
      ward_id: wardId,
      bed_number: `${bedPrefix}-${String(startNumber + i).padStart(3, '0')}`,
      bed_type: bedType,
      is_active: true,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('hospital_beds')
    .insert(beds)
    .select('*');

  if (error) throw error;
  return data;
};

const updateBed = async (hospitalId, bedId, updates) => {
  const allowedFields = ['bed_number', 'bed_type', 'features', 'notes', 'is_active', 'ward_id'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    else if (updates[camelKey] !== undefined) safeUpdates[key] = updates[camelKey];
  }

  const { data, error } = await supabaseAdmin
    .from('hospital_beds')
    .update(safeUpdates)
    .eq('id', bedId)
    .eq('hospital_id', hospitalId)
    .select('*, ward:hospital_wards(id, name, ward_type)')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Bed not found');
  return data;
};

const updateBedStatus = async (hospitalId, bedId, status, data = {}) => {
  const updates = { status };

  if (status === 'occupied') {
    updates.current_patient_id = data.patientId || data.patient_id || null;
    updates.current_admission_id = data.admissionId || data.admission_id || null;
  } else if (status === 'available') {
    updates.current_patient_id = null;
    updates.current_admission_id = null;
    updates.last_sanitized_at = new Date().toISOString();
  }

  let query = supabaseAdmin
    .from('hospital_beds')
    .update(updates)
    .eq('id', bedId)
    .eq('hospital_id', hospitalId);

  if (status === 'occupied') {
    // Atomic check: Ensure bed is available before setting to occupied
    query = query.eq('status', 'available');
  }

  const { data: bed, error } = await query
    .select('*, ward:hospital_wards(id, name, ward_type)')
    .maybeSingle();

  if (error) throw error;
  if (!bed) {
    if (status === 'occupied') {
      throw new ApiError(409, 'Bed is no longer available for occupation');
    }
    throw new ApiError(404, 'Bed not found');
  }
  return bed;
};

// ──────────────────────────────────────────────
// OCCUPANCY & AVAILABILITY
// ──────────────────────────────────────────────

const getBedOccupancy = async (hospitalId) => {
  const { data: wards, error } = await supabaseAdmin
    .from('hospital_wards')
    .select('id, name, ward_type, floor, wing, total_beds, occupied_beds, charge_per_day, is_active')
    .eq('hospital_id', hospitalId)
    .eq('is_active', true)
    .order('floor', { ascending: true });

  if (error) throw error;

  const wardStats = (wards || []).map(w => ({
    ...w,
    available_beds: w.total_beds - w.occupied_beds,
    occupancy_percent: w.total_beds > 0 ? Math.round((w.occupied_beds / w.total_beds) * 100) : 0,
  }));

  // Aggregate by ward type
  const byType = {};
  for (const w of wardStats) {
    if (!byType[w.ward_type]) {
      byType[w.ward_type] = { ward_type: w.ward_type, total_beds: 0, occupied_beds: 0, available_beds: 0, wards: 0 };
    }
    byType[w.ward_type].total_beds += w.total_beds;
    byType[w.ward_type].occupied_beds += w.occupied_beds;
    byType[w.ward_type].available_beds += w.available_beds;
    byType[w.ward_type].wards += 1;
  }

  for (const key of Object.keys(byType)) {
    byType[key].occupancy_percent = byType[key].total_beds > 0
      ? Math.round((byType[key].occupied_beds / byType[key].total_beds) * 100) : 0;
  }

  const totalBeds = wardStats.reduce((s, w) => s + w.total_beds, 0);
  const occupiedBeds = wardStats.reduce((s, w) => s + w.occupied_beds, 0);

  return {
    summary: {
      total_beds: totalBeds,
      occupied_beds: occupiedBeds,
      available_beds: totalBeds - occupiedBeds,
      occupancy_percent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    },
    by_ward_type: Object.values(byType),
    wards: wardStats,
  };
};

const getAvailableBeds = async (hospitalId, wardType = null) => {
  let query = supabaseAdmin
    .from('hospital_beds')
    .select('*, ward:hospital_wards(id, name, ward_type, floor, wing, charge_per_day)')
    .eq('hospital_id', hospitalId)
    .eq('status', 'available')
    .eq('is_active', true);

  if (wardType) {
    // Need to filter by ward type via the ward relation
    const { data: wards } = await supabaseAdmin
      .from('hospital_wards')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('ward_type', wardType)
      .eq('is_active', true);

    if (!wards || wards.length === 0) return [];

    query = query.in('ward_id', wards.map(w => w.id));
  }

  const { data, error } = await query
    .order('ward_id', { ascending: true })
    .order('bed_number', { ascending: true });

  if (error) throw error;
  return data || [];
};

module.exports = {
  // Wards
  getWards,
  createWard,
  updateWard,
  deleteWard,
  // Beds
  getBeds,
  createBed,
  createBedsBulk,
  updateBed,
  updateBedStatus,
  // Occupancy
  getBedOccupancy,
  getAvailableBeds,
};
