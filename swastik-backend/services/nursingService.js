/**
 * Nursing Service
 * Nursing dashboard, task management, medication administration record (MAR)
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

// ── NURSING TASKS ──

const createNursingTask = async (hospitalId, data) => {
  const { data: task, error } = await supabaseAdmin
    .from('nursing_tasks')
    .insert({
      hospital_id: hospitalId,
      admission_id: data.admissionId || data.admission_id,
      ward_id: data.wardId || data.ward_id || null,
      bed_id: data.bedId || data.bed_id || null,
      assigned_nurse_id: data.assignedNurseId || data.assigned_nurse_id || null,
      task_type: data.taskType || data.task_type,
      task_description: data.taskDescription || data.task_description,
      priority: data.priority || 'routine',
      scheduled_at: data.scheduledAt || data.scheduled_at,
      due_by: data.dueBy || data.due_by || null,
      recurring: data.recurring || false,
      recurrence_rule: data.recurrenceRule || data.recurrence_rule || null,
      medication_details: data.medicationDetails || data.medication_details || null,
      doctor_order_ref: data.doctorOrderRef || data.doctor_order_ref || null,
      notes: data.notes || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return task;
};

const createNursingTasksBulk = async (hospitalId, tasks) => {
  const payload = tasks.map(t => ({
    hospital_id: hospitalId,
    admission_id: t.admissionId || t.admission_id,
    ward_id: t.wardId || t.ward_id || null,
    bed_id: t.bedId || t.bed_id || null,
    assigned_nurse_id: t.assignedNurseId || t.assigned_nurse_id || null,
    task_type: t.taskType || t.task_type,
    task_description: t.taskDescription || t.task_description,
    priority: t.priority || 'routine',
    scheduled_at: t.scheduledAt || t.scheduled_at,
    medication_details: t.medicationDetails || t.medication_details || null,
  }));

  const { data, error } = await supabaseAdmin
    .from('nursing_tasks')
    .insert(payload)
    .select('*');
  if (error) throw error;
  return data;
};

const getNursingTasks = async (hospitalId, filters = {}, page = 1, limit = 30) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('nursing_tasks')
    .select(`
      *,
      admission:patient_admissions(
        id, admission_number, patient:patients(id, name, date_of_birth, gender),
        bed:hospital_beds(id, bed_number)
      ),
      ward:hospital_wards(id, name, ward_type, floor),
      assignedNurse:users!nursing_tasks_assigned_nurse_id_fkey(id, name)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.wardId) query = query.eq('ward_id', filters.wardId);
  if (filters.nurseId) query = query.eq('assigned_nurse_id', filters.nurseId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.taskType) query = query.eq('task_type', filters.taskType);
  if (filters.admissionId) query = query.eq('admission_id', filters.admissionId);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.date) {
    const dayStart = `${filters.date}T00:00:00.000Z`;
    const dayEnd = `${filters.date}T23:59:59.999Z`;
    query = query.gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd);
  }

  const { data, error, count } = await query
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

const updateTaskStatus = async (hospitalId, taskId, status, data = {}) => {
  const nowIso = new Date().toISOString();
  const updates = { status };

  if (status === 'in_progress') updates.started_at = nowIso;
  if (status === 'completed') {
    updates.completed_at = nowIso;
    updates.completed_by = data.completedBy || data.completed_by || null;
    if (data.vitalsData || data.vitals_data) updates.vitals_data = data.vitalsData || data.vitals_data;
    if (data.assessmentData || data.assessment_data) updates.assessment_data = data.assessmentData || data.assessment_data;
  }
  if (status === 'escalated') {
    updates.escalation_reason = data.escalationReason || data.escalation_reason || null;
  }
  if (data.notes) updates.notes = data.notes;

  const { data: task, error } = await supabaseAdmin
    .from('nursing_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!task) throw new ApiError(404, 'Nursing task not found');
  return task;
};

// ── MEDICATION ADMINISTRATION RECORD (MAR) ──

const addMedicationAdministration = async (hospitalId, data) => {
  const { data: mar, error } = await supabaseAdmin
    .from('medication_administration')
    .insert({
      hospital_id: hospitalId,
      admission_id: data.admissionId || data.admission_id,
      nursing_task_id: data.nursingTaskId || data.nursing_task_id || null,
      drug_name: data.drugName || data.drug_name,
      generic_name: data.genericName || data.generic_name || null,
      dose: data.dose,
      dose_unit: data.doseUnit || data.dose_unit || null,
      route: data.route,
      frequency: data.frequency || null,
      duration_days: data.durationDays || data.duration_days || null,
      instructions: data.instructions || null,
      scheduled_time: data.scheduledTime || data.scheduled_time,
      status: data.status || 'scheduled',
    })
    .select('*')
    .single();

  if (error) throw error;
  return mar;
};

const updateMedicationStatus = async (hospitalId, marId, status, data = {}) => {
  const updates = { status };
  const nowIso = new Date().toISOString();

  if (status === 'administered') {
    updates.administered_at = nowIso;
    updates.administered_by = data.administeredBy || data.administered_by || null;
    updates.witnessed_by = data.witnessedBy || data.witnessed_by || null;
    updates.batch_number = data.batchNumber || data.batch_number || null;
  } else if (status === 'held') {
    updates.hold_reason = data.holdReason || data.hold_reason || null;
  } else if (status === 'refused') {
    updates.refusal_reason = data.refusalReason || data.refusal_reason || null;
  }

  if (data.adverseReaction || data.adverse_reaction) {
    updates.adverse_reaction = true;
    updates.reaction_details = data.reactionDetails || data.reaction_details || null;
  }
  if (data.notes) updates.notes = data.notes;

  const { data: mar, error } = await supabaseAdmin
    .from('medication_administration')
    .update(updates)
    .eq('id', marId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!mar) throw new ApiError(404, 'Medication record not found');
  return mar;
};

const getMedicationSchedule = async (hospitalId, admissionId, date = null) => {
  let query = supabaseAdmin
    .from('medication_administration')
    .select('*')
    .eq('hospital_id', hospitalId)
    .eq('admission_id', admissionId);

  if (date) {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;
    query = query.gte('scheduled_time', dayStart).lte('scheduled_time', dayEnd);
  }

  const { data, error } = await query.order('scheduled_time', { ascending: true });
  if (error) throw error;
  return data || [];
};

// ── WARD DASHBOARD ──

const getWardDashboard = async (hospitalId, wardId) => {
  const today = new Date().toISOString().split('T')[0];
  const dayStart = `${today}T00:00:00.000Z`;
  const dayEnd = `${today}T23:59:59.999Z`;

  const [wardRes, patientsRes, tasksRes] = await Promise.all([
    supabaseAdmin.from('hospital_wards')
      .select('*').eq('id', wardId).eq('hospital_id', hospitalId).single(),
    supabaseAdmin.from('patient_admissions')
      .select(`
        id, admission_number, status, admitted_at, chief_complaint,
        patient:patients(id, name, date_of_birth, gender, blood_group),
        bed:hospital_beds(id, bed_number, bed_type),
        attendingDoctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name, specialization)
      `)
      .eq('hospital_id', hospitalId).eq('ward_id', wardId).eq('status', 'admitted'),
    supabaseAdmin.from('nursing_tasks')
      .select('id, task_type, status, priority, scheduled_at')
      .eq('hospital_id', hospitalId).eq('ward_id', wardId)
      .gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd),
  ]);

  if (wardRes.error) throw wardRes.error;
  if (!wardRes.data) throw new ApiError(404, 'Ward not found');

  const tasks = tasksRes.data || [];
  return {
    ward: wardRes.data,
    patients: patientsRes.data || [],
    total_patients: (patientsRes.data || []).length,
    tasks_summary: {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
      urgent: tasks.filter(t => t.priority === 'urgent' || t.priority === 'stat').length,
    },
  };
};

module.exports = {
  createNursingTask, createNursingTasksBulk, getNursingTasks, updateTaskStatus,
  addMedicationAdministration, updateMedicationStatus, getMedicationSchedule,
  getWardDashboard,
};
