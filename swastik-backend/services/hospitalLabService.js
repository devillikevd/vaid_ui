/**
 * Hospital Lab Service
 * Lab & radiology ordering workflow (hospital → associated diagnostic center)
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

// ──────────────────────────────────────────────
// LAB ORDERS
// ──────────────────────────────────────────────

const createLabOrder = async (hospitalId, data) => {
  const { data: order, error } = await supabaseAdmin
    .from('lab_orders')
    .insert({
      hospital_id: hospitalId,
      encounter_id: data.encounterId || data.encounter_id || null,
      admission_id: data.admissionId || data.admission_id || null,
      patient_id: data.patientId || data.patient_id,
      ordering_doctor_id: data.orderingDoctorId || data.ordering_doctor_id,
      diagnostic_center_id: data.diagnosticCenterId || data.diagnostic_center_id || null,
      test_name: data.testName || data.test_name,
      test_code: data.testCode || data.test_code || null,
      test_category: data.testCategory || data.test_category || null,
      specimen_type: data.specimenType || data.specimen_type || null,
      priority: data.priority || 'routine',
      clinical_notes: data.clinicalNotes || data.clinical_notes || null,
      fasting_required: data.fastingRequired || data.fasting_required || false,
      expected_tat_minutes: data.expectedTat || data.expected_tat_minutes || null,
    })
    .select(`
      *,
      patient:patients(id, name),
      orderingDoctor:doctors!lab_orders_ordering_doctor_id_fkey(id, name, specialization)
    `)
    .single();

  if (error) throw error;
  return order;
};

const createLabOrdersBulk = async (hospitalId, orders) => {
  const payload = orders.map(o => ({
    hospital_id: hospitalId,
    encounter_id: o.encounterId || o.encounter_id || null,
    admission_id: o.admissionId || o.admission_id || null,
    patient_id: o.patientId || o.patient_id,
    ordering_doctor_id: o.orderingDoctorId || o.ordering_doctor_id,
    diagnostic_center_id: o.diagnosticCenterId || o.diagnostic_center_id || null,
    test_name: o.testName || o.test_name,
    test_code: o.testCode || o.test_code || null,
    test_category: o.testCategory || o.test_category || null,
    specimen_type: o.specimenType || o.specimen_type || null,
    priority: o.priority || 'routine',
    clinical_notes: o.clinicalNotes || o.clinical_notes || null,
  }));

  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return data;
};

const getLabKpis = async (hospitalId, date = null) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const dayStart = `${targetDate}T00:00:00.000Z`;
  const dayEnd = `${targetDate}T23:59:59.999Z`;

  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .select('id, status, priority, created_at, critical_value, is_abnormal')
    .eq('hospital_id', hospitalId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd);

  if (error) throw error;
  const orders = data || [];

  return {
    total_orders_today: orders.length,
    pending_collection: orders.filter(o => ['ordered', 'pending'].includes(o.status)).length,
    samples_collected: orders.filter(o => ['sample_collected', 'sample_received'].includes(o.status)).length,
    processing: orders.filter(o => ['in_progress', 'processing'].includes(o.status)).length,
    reports_ready: orders.filter(o => ['report_ready', 'completed'].includes(o.status)).length,
    pending_approval: orders.filter(o => o.status === 'report_ready').length,
    released_today: orders.filter(o => ['report_approved', 'released'].includes(o.status)).length,
    stat_critical: orders.filter(o => ['stat', 'emergency', 'urgent'].includes(o.priority) && o.status !== 'cancelled').length,
  };
};

const getLabOrderDetails = async (hospitalId, orderId) => {
  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, phone),
      orderingDoctor:doctors!lab_orders_ordering_doctor_id_fkey(id, name, specialization, profile_image_url),
      admission:patient_admissions(id, admission_number, chief_complaint, ward_id, bed_id, bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number), ward:hospital_wards!patient_admissions_ward_id_fkey(id, name))
    `)
    .eq('id', orderId)
    .eq('hospital_id', hospitalId)
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Lab order not found');
  return data;
};

const getLabOrders = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('lab_orders')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender),
      orderingDoctor:doctors!lab_orders_ordering_doctor_id_fkey(id, name, specialization, profile_image_url),
      admission:patient_admissions(id, admission_number, ward_id, bed_id, bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number), ward:hospital_wards!patient_admissions_ward_id_fkey(id, name))
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.doctorId) query = query.eq('ordering_doctor_id', filters.doctorId);
  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.category) query = query.eq('test_category', filters.category);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);
  if (filters.encounterId) query = query.eq('encounter_id', filters.encounterId);
  if (filters.admissionId) query = query.eq('admission_id', filters.admissionId);
  if (filters.date) {
    const dayStart = `${filters.date}T00:00:00.000Z`;
    const dayEnd = `${filters.date}T23:59:59.999Z`;
    query = query.gte('created_at', dayStart).lte('created_at', dayEnd);
  }
  if (filters.search) {
    const s = filters.search;
    query = query.or(`test_name.ilike.%${s}%,order_number.ilike.%${s}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
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

const updateLabOrderStatus = async (hospitalId, orderId, status, statusData = {}) => {
  const updates = { status };
  const nowIso = new Date().toISOString();

  switch (status) {
    case 'sample_collected':
      updates.sample_collected_at = nowIso;
      updates.sample_collected_by = statusData.collectedBy || statusData.collected_by || null;
      updates.sample_barcode = statusData.barcode || statusData.sample_barcode || null;
      break;
    case 'completed':
    case 'report_ready':
      updates.result_data = statusData.resultData || statusData.result_data || {};
      updates.result_notes = statusData.resultNotes || statusData.result_notes || null;
      updates.is_abnormal = statusData.isAbnormal || statusData.is_abnormal || false;
      updates.abnormal_flags = statusData.abnormalFlags || statusData.abnormal_flags || {};
      updates.report_url = statusData.reportUrl || statusData.report_url || null;
      updates.reported_by = statusData.reportedBy || statusData.reported_by || null;
      updates.reported_at = nowIso;
      updates.critical_value = statusData.criticalValue || statusData.critical_value || false;
      // Calculate TAT
      break;
    case 'report_approved':
      updates.approved_by = statusData.approvedBy || statusData.approved_by || null;
      updates.approved_at = nowIso;
      break;
    default:
      break;
  }

  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .update(updates)
    .eq('id', orderId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Lab order not found');

  // Calculate TAT if completing
  if (['report_ready', 'report_approved'].includes(status) && data.created_at) {
    const tat = Math.round((new Date(nowIso) - new Date(data.created_at)) / 60000);
    await supabaseAdmin
      .from('lab_orders')
      .update({ turnaround_minutes: tat })
      .eq('id', orderId);
    data.turnaround_minutes = tat;
  }

  // Send notification to patient when report is ready
  if (status === 'report_ready' || status === 'report_approved') {
    try {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('user_id')
        .eq('id', data.patient_id)
        .single();

      if (patient?.user_id) {
        const notificationService = require('./notificationService');
        notificationService.sendNotification(patient.user_id, {
          title: 'Lab Report Ready',
          message: `Your ${data.test_name} report is ready.`,
          type: 'lab_report_ready',
          category: 'medical',
          data: { labOrderId: data.id, hospitalId },
        }).catch(err => console.error('Failed to notify patient of lab report', err));
      }
    } catch (_) { /* non-critical */ }
  }

  return data;
};

// ──────────────────────────────────────────────
// RADIOLOGY ORDERS
// ──────────────────────────────────────────────

const createRadiologyOrder = async (hospitalId, data) => {
  const { data: order, error } = await supabaseAdmin
    .from('radiology_orders')
    .insert({
      hospital_id: hospitalId,
      encounter_id: data.encounterId || data.encounter_id || null,
      admission_id: data.admissionId || data.admission_id || null,
      patient_id: data.patientId || data.patient_id,
      ordering_doctor_id: data.orderingDoctorId || data.ordering_doctor_id,
      diagnostic_center_id: data.diagnosticCenterId || data.diagnostic_center_id || null,
      modality: data.modality,
      body_part: data.bodyPart || data.body_part || null,
      laterality: data.laterality || null,
      study_description: data.studyDescription || data.study_description || null,
      priority: data.priority || 'routine',
      clinical_indication: data.clinicalIndication || data.clinical_indication || null,
      contrast_required: data.contrastRequired || data.contrast_required || false,
      patient_preparation: data.patientPreparation || data.patient_preparation || null,
    })
    .select(`
      *,
      patient:patients(id, name),
      orderingDoctor:doctors!radiology_orders_ordering_doctor_id_fkey(id, name, specialization)
    `)
    .single();

  if (error) throw error;
  return order;
};

const getRadiologyKpis = async (hospitalId, date = null) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const dayStart = `${targetDate}T00:00:00.000Z`;
  const dayEnd = `${targetDate}T23:59:59.999Z`;

  const { data, error } = await supabaseAdmin
    .from('radiology_orders')
    .select('id, status, priority, modality, created_at, scheduled_at')
    .eq('hospital_id', hospitalId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd);

  if (error) throw error;
  const orders = data || [];

  // Modality Breakdown
  const modalityCounts = {
    xray: orders.filter(o => o.modality?.toLowerCase().includes('xray') || o.modality?.toLowerCase().includes('x-ray')).length,
    ct: orders.filter(o => o.modality?.toLowerCase().includes('ct')).length,
    mri: orders.filter(o => o.modality?.toLowerCase().includes('mri')).length,
    ultrasound: orders.filter(o => o.modality?.toLowerCase().includes('ultrasound') || o.modality?.toLowerCase().includes('usg')).length,
    other: orders.filter(o => !['xray', 'x-ray', 'ct', 'mri', 'ultrasound', 'usg'].some(m => o.modality?.toLowerCase().includes(m))).length,
  };

  return {
    total_studies_today: orders.length,
    pending_scheduling: orders.filter(o => o.status === 'ordered').length,
    scheduled_today: orders.filter(o => o.status === 'scheduled').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    reporting_queue: orders.filter(o => o.status === 'completed').length,
    reports_ready: orders.filter(o => o.status === 'report_ready').length,
    pending_approval: orders.filter(o => o.status === 'report_ready').length,
    released_today: orders.filter(o => o.status === 'report_approved').length,
    stat_critical: orders.filter(o => ['stat', 'emergency', 'urgent'].includes(o.priority) && o.status !== 'cancelled').length,
    modality_breakdown: modalityCounts,
  };
};

const getRadiologyStudyDetails = async (hospitalId, studyId) => {
  const { data, error } = await supabaseAdmin
    .from('radiology_orders')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, phone),
      orderingDoctor:doctors!radiology_orders_ordering_doctor_id_fkey(id, name, specialization, profile_image_url),
      admission:patient_admissions(id, admission_number, chief_complaint, ward_id, bed_id, bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number), ward:hospital_wards!patient_admissions_ward_id_fkey(id, name))
    `)
    .eq('id', studyId)
    .eq('hospital_id', hospitalId)
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Radiology order not found');
  return data;
};

const getRadiologyOrders = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('radiology_orders')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender),
      orderingDoctor:doctors!radiology_orders_ordering_doctor_id_fkey(id, name, specialization, profile_image_url),
      admission:patient_admissions(id, admission_number, ward_id, bed_id, bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number), ward:hospital_wards!patient_admissions_ward_id_fkey(id, name))
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.modality) query = query.ilike('modality', `%${filters.modality}%`);
  if (filters.doctorId) query = query.eq('ordering_doctor_id', filters.doctorId);
  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);
  if (filters.date) {
    const dayStart = `${filters.date}T00:00:00.000Z`;
    const dayEnd = `${filters.date}T23:59:59.999Z`;
    query = query.gte('created_at', dayStart).lte('created_at', dayEnd);
  }
  if (filters.search) {
    const s = filters.search;
    query = query.or(`modality.ilike.%${s}%,body_part.ilike.%${s}%,order_number.ilike.%${s}%,study_description.ilike.%${s}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
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

const updateRadiologyOrderStatus = async (hospitalId, orderId, status, statusData = {}) => {
  const updates = { status };
  const nowIso = new Date().toISOString();

  if (status === 'scheduled') {
    updates.scheduled_at = statusData.scheduledAt || statusData.scheduled_at || nowIso;
  } else if (status === 'in_progress') {
    updates.updated_at = nowIso;
  } else if (status === 'completed') {
    updates.completed_at = nowIso;
  } else if (status === 'report_ready') {
    updates.report_url = statusData.reportUrl || statusData.report_url || null;
    updates.findings = statusData.findings || {};
    updates.impression = statusData.impression || statusData.resultNotes || null;
    updates.reported_by = statusData.reportedBy || statusData.reported_by || null;
    updates.reported_at = nowIso;
    updates.image_urls = statusData.imageUrls || statusData.image_urls || [];
  } else if (status === 'report_approved') {
    updates.approved_by = statusData.approvedBy || statusData.approved_by || null;
    updates.approved_at = nowIso;
  }

  const { data, error } = await supabaseAdmin
    .from('radiology_orders')
    .update(updates)
    .eq('id', orderId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Radiology order not found');
  return data;
};

// ──────────────────────────────────────────────
// ANALYTICS
// ──────────────────────────────────────────────

const getLabTurnaroundTime = async (hospitalId, period = '30d') => {
  const days = parseInt(period) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .select('test_category, turnaround_minutes, priority, status')
    .eq('hospital_id', hospitalId)
    .gte('created_at', sinceIso)
    .not('turnaround_minutes', 'is', null);

  if (error) throw error;

  // Group by category
  const byCategory = {};
  for (const order of (data || [])) {
    const cat = order.test_category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, durations: [], count: 0 };
    byCategory[cat].durations.push(order.turnaround_minutes);
    byCategory[cat].count += 1;
  }

  for (const cat of Object.values(byCategory)) {
    cat.avg_tat_minutes = Math.round(cat.durations.reduce((s, d) => s + d, 0) / cat.durations.length);
    cat.min_tat_minutes = Math.min(...cat.durations);
    cat.max_tat_minutes = Math.max(...cat.durations);
    delete cat.durations;
  }

  const allDurations = (data || []).map(o => o.turnaround_minutes);
  return {
    period,
    total_orders: allDurations.length,
    overall_avg_tat_minutes: allDurations.length > 0 ? Math.round(allDurations.reduce((s, d) => s + d, 0) / allDurations.length) : 0,
    by_category: Object.values(byCategory),
  };
};

module.exports = {
  // Lab
  createLabOrder,
  createLabOrdersBulk,
  getLabOrders,
  getLabOrderDetails,
  getLabKpis,
  updateLabOrderStatus,
  // Radiology
  createRadiologyOrder,
  getRadiologyOrders,
  getRadiologyStudyDetails,
  getRadiologyKpis,
  updateRadiologyOrderStatus,
  // Analytics
  getLabTurnaroundTime,
};
