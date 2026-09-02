/**
 * Hospital Encounter Service
 * Unified patient encounter management (OPD + IPD + Emergency)
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

const createEncounter = async (hospitalId, data) => {
  const { data: encounter, error } = await supabaseAdmin
    .from('patient_encounters')
    .insert({
      hospital_id: hospitalId,
      patient_id: data.patientId || data.patient_id,
      encounter_type: data.encounterType || data.encounter_type || 'opd',
      status: data.status || 'registered',
      appointment_id: data.appointmentId || data.appointment_id || null,
      admission_id: data.admissionId || data.admission_id || null,
      doctor_id: data.doctorId || data.doctor_id || null,
      department_id: data.departmentId || data.department_id || null,
      chief_complaint: data.chiefComplaint || data.chief_complaint || null,
      vitals: data.vitals || {},
      started_at: data.startedAt || data.started_at || null,
    })
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender),
      doctor:doctors(id, name, specialization),
      department:hospital_departments(id, name)
    `)
    .single();

  if (error) throw error;
  return encounter;
};

const getEncounters = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('patient_encounters')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, profile_image_url),
      doctor:doctors(id, name, specialization, profile_image_url),
      department:hospital_departments(id, name)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.encounterType) query = query.eq('encounter_type', filters.encounterType);
  if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
  if (filters.date) {
    const dayStart = `${filters.date}T00:00:00.000Z`;
    const dayEnd = `${filters.date}T23:59:59.999Z`;
    query = query.gte('created_at', dayStart).lte('created_at', dayEnd);
  }
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    query = query.or(`encounter_number.ilike.%${s}%,chief_complaint.ilike.%${s}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

const getEncounterStats = async (hospitalId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const [
    todayResult,
    opdTodayResult,
    ipdTodayResult,
    emergencyTodayResult,
    activeResult,
    completedTodayResult,
  ] = await Promise.all([
    supabaseAdmin.from('patient_encounters').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).gte('created_at', todayStartIso),
    supabaseAdmin.from('patient_encounters').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).eq('encounter_type', 'opd'),
    supabaseAdmin.from('patient_encounters').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).eq('encounter_type', 'ipd'),
    supabaseAdmin.from('patient_encounters').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).eq('encounter_type', 'emergency'),
    supabaseAdmin.from('patient_encounters').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).in('status', ['registered', 'in_queue', 'in_progress']),
    supabaseAdmin.from('patient_encounters').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).in('status', ['completed', 'discharged']).gte('completed_at', todayStartIso),
  ]);

  return {
    today: todayResult.count || 0,
    opd: opdTodayResult.count || 0,
    ipd: ipdTodayResult.count || 0,
    emergency: emergencyTodayResult.count || 0,
    active: activeResult.count || 0,
    completed_today: completedTodayResult.count || 0,
  };
};

const getEncounterDetail = async (hospitalId, encounterId) => {
  const { data, error } = await supabaseAdmin
    .from('patient_encounters')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, phone, profile_image_url),
      doctor:doctors(id, name, specialization, profile_image_url),
      department:hospital_departments(id, name),
      services:encounter_services(*, performedBy:doctors!encounter_services_performed_by_fkey(id, name))
    `)
    .eq('id', encounterId)
    .eq('hospital_id', hospitalId)
    .single();

  if (error || !data) throw new ApiError(404, 'Encounter not found');
  return data;
};

const updateEncounter = async (hospitalId, encounterId, updates) => {
  const allowed = [
    'status', 'chief_complaint', 'history_of_present_illness', 'past_medical_history',
    'vitals', 'clinical_notes', 'examination_findings', 'diagnosis', 'icd_codes',
    'prescriptions', 'investigations_ordered', 'procedures_performed', 'advice',
    'follow_up_date', 'started_at', 'completed_at', 'payment_status',
  ];
  const safe = {};
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[k] !== undefined) safe[k] = updates[k];
    else if (updates[camel] !== undefined) safe[k] = updates[camel];
  }

  if (safe.status === 'completed' && !safe.completed_at) {
    safe.completed_at = new Date().toISOString();
  }
  if (safe.status === 'in_progress' && !safe.started_at) {
    safe.started_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('patient_encounters')
    .update(safe)
    .eq('id', encounterId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Encounter not found');
  return data;
};

const addEncounterService = async (encounterId, serviceData) => {
  const rate = parseFloat(serviceData.rate) || 0;
  const qty = parseInt(serviceData.quantity) || 1;
  const discPct = parseFloat(serviceData.discountPercent || serviceData.discount_percent) || 0;
  const taxPct = parseFloat(serviceData.taxPercent || serviceData.tax_percent) || 0;

  const grossAmount = rate * qty;
  const discountAmount = (grossAmount * discPct) / 100;
  const taxableAmount = grossAmount - discountAmount;
  const taxAmount = (taxableAmount * taxPct) / 100;
  const netAmount = taxableAmount + taxAmount;

  const { data, error } = await supabaseAdmin
    .from('encounter_services')
    .insert({
      encounter_id: encounterId,
      service_id: serviceData.serviceId || serviceData.service_id || null,
      service_name: serviceData.serviceName || serviceData.service_name,
      service_code: serviceData.serviceCode || serviceData.service_code || null,
      category: serviceData.category || null,
      quantity: qty,
      rate,
      discount_percent: discPct,
      discount_amount: discountAmount,
      tax_percent: taxPct,
      tax_amount: taxAmount,
      net_amount: netAmount,
      performed_by: serviceData.performedBy || serviceData.performed_by || null,
      performed_at: serviceData.performedAt || serviceData.performed_at || null,
      notes: serviceData.notes || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const getEncounterBill = async (hospitalId, encounterId) => {
  const { data: encounter, error } = await supabaseAdmin
    .from('patient_encounters')
    .select(`
      id, encounter_number, encounter_type, total_charges, total_discount, total_tax, net_amount, payment_status,
      patient:patients(id, name),
      services:encounter_services(*)
    `)
    .eq('id', encounterId)
    .eq('hospital_id', hospitalId)
    .single();

  if (error || !encounter) throw new ApiError(404, 'Encounter not found');

  // Check for deposits
  const { data: deposits } = await supabaseAdmin
    .from('patient_deposits')
    .select('amount, type, status')
    .eq('encounter_id', encounterId)
    .eq('status', 'collected');

  const totalDeposits = (deposits || [])
    .filter(d => d.type === 'advance')
    .reduce((s, d) => s + parseFloat(d.amount), 0);

  return {
    ...encounter,
    total_deposits: totalDeposits,
    balance_due: parseFloat(encounter.net_amount || 0) - totalDeposits,
  };
};

const getPatientEncounterHistory = async (hospitalId, patientId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('patient_encounters')
    .select(`
      *,
      doctor:doctors(id, name, specialization),
      department:hospital_departments(id, name)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

module.exports = {
  createEncounter, getEncounters, getEncounterStats, getEncounterDetail, updateEncounter,
  addEncounterService, getEncounterBill, getPatientEncounterHistory,
};
