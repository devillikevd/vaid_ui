/**
 * OPD Queue Service
 * Digital token generation, queue management, wait time estimation
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

// ──────────────────────────────────────────────
// TOKEN GENERATION
// ──────────────────────────────────────────────

const generateToken = async (hospitalId, data) => {
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    hospital_id: hospitalId,
    doctor_id: data.doctorId || data.doctor_id,
    department_id: data.departmentId || data.department_id || null,
    patient_id: data.patientId || data.patient_id || null,
    encounter_id: data.encounterId || data.encounter_id || null,
    appointment_id: data.appointmentId || data.appointment_id || null,
    queue_date: today,
    token_prefix: data.tokenPrefix || data.token_prefix || 'OPD',
    priority: data.priority || 0,
    source: data.source || 'walk_in',
    patient_name: data.patientName || data.patient_name || null,
    patient_phone: data.patientPhone || data.patient_phone || null,
    patient_age: data.patientAge || data.patient_age || null,
    patient_gender: data.patientGender || data.patient_gender || null,
    reason: data.reason || null,
    notes: data.notes || null,
  };

  const { data: token, error } = await supabaseAdmin
    .from('opd_queue')
    .insert(payload)
    .select(`
      *,
      doctor:doctors(id, name, specialization, profile_image_url),
      patient:patients(id, name),
      department:hospital_departments(id, name)
    `)
    .single();

  if (error) throw error;

  // Estimate wait time
  const waitMinutes = await estimateWaitTime(hospitalId, payload.doctor_id);
  token.estimated_wait_minutes = waitMinutes;

  // Update the record with wait estimate
  await supabaseAdmin
    .from('opd_queue')
    .update({ estimated_wait_minutes: waitMinutes })
    .eq('id', token.id);

  return token;
};

// ──────────────────────────────────────────────
// QUEUE OPERATIONS
// ──────────────────────────────────────────────

const getQueue = async (hospitalId, filters = {}) => {
  const today = filters.date || new Date().toISOString().split('T')[0];

  let query = supabaseAdmin
    .from('opd_queue')
    .select(`
      *,
      doctor:doctors(id, name, specialization, profile_image_url),
      patient:patients(id, name, date_of_birth, gender, profile_image_url),
      department:hospital_departments(id, name)
    `)
    .eq('hospital_id', hospitalId)
    .eq('queue_date', today);

  if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
  if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query
    .order('priority', { ascending: false })
    .order('token_number', { ascending: true });

  if (error) throw error;

  const queue = data || [];

  // Calculate position for waiting patients
  const waiting = queue.filter(q => q.status === 'waiting');
  const inConsultation = queue.filter(q => q.status === 'in_consultation');

  return {
    queue,
    stats: {
      total: queue.length,
      waiting: waiting.length,
      in_consultation: inConsultation.length,
      completed: queue.filter(q => q.status === 'completed').length,
      skipped: queue.filter(q => q.status === 'skipped').length,
      no_show: queue.filter(q => q.status === 'no_show').length,
      cancelled: queue.filter(q => q.status === 'cancelled').length,
    },
    current_token: inConsultation.length > 0 ? inConsultation[0].display_token : null,
    next_token: waiting.length > 0 ? waiting[0].display_token : null,
  };
};

const callNextPatient = async (hospitalId, doctorId) => {
  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // Complete the current in_consultation patient
  await supabaseAdmin
    .from('opd_queue')
    .update({
      status: 'completed',
      consultation_end_time: nowIso,
    })
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', doctorId)
    .eq('queue_date', today)
    .eq('status', 'in_consultation');

  // Get next waiting patient (highest priority first, then lowest token number)
  const { data: next, error } = await supabaseAdmin
    .from('opd_queue')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, profile_image_url),
      department:hospital_departments(id, name)
    `)
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', doctorId)
    .eq('queue_date', today)
    .eq('status', 'waiting')
    .order('priority', { ascending: false })
    .order('token_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!next) {
    return { message: 'No more patients in queue', current: null };
  }

  // Move to in_consultation
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('opd_queue')
    .update({
      status: 'in_consultation',
      consultation_start_time: nowIso,
    })
    .eq('id', next.id)
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, profile_image_url),
      department:hospital_departments(id, name)
    `)
    .single();

  if (updateError) throw updateError;

  return { message: 'Next patient called', current: updated };
};

const updateQueueStatus = async (hospitalId, queueId, status, notes = '') => {
  const nowIso = new Date().toISOString();
  const updates = { status };

  if (status === 'in_consultation') {
    updates.consultation_start_time = nowIso;
  } else if (status === 'completed') {
    updates.consultation_end_time = nowIso;
  }

  if (notes) updates.notes = notes;

  const { data, error } = await supabaseAdmin
    .from('opd_queue')
    .update(updates)
    .eq('id', queueId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'Queue entry not found');
  return data;
};

// ──────────────────────────────────────────────
// PATIENT-FACING
// ──────────────────────────────────────────────

const getPatientQueuePosition = async (hospitalId, patientId) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: entries, error } = await supabaseAdmin
    .from('opd_queue')
    .select(`
      *,
      doctor:doctors(id, name, specialization, profile_image_url),
      department:hospital_departments(id, name)
    `)
    .eq('hospital_id', hospitalId)
    .eq('patient_id', patientId)
    .eq('queue_date', today)
    .in('status', ['waiting', 'in_consultation']);

  if (error) throw error;
  if (!entries || entries.length === 0) return null;

  // For each entry, calculate position
  const results = [];
  for (const entry of entries) {
    if (entry.status === 'in_consultation') {
      results.push({ ...entry, position: 0, message: 'You are being consulted' });
      continue;
    }

    // Count patients ahead in queue for same doctor
    const { count } = await supabaseAdmin
      .from('opd_queue')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('doctor_id', entry.doctor_id)
      .eq('queue_date', today)
      .eq('status', 'waiting')
      .lt('token_number', entry.token_number);

    const position = (count || 0) + 1;
    const avgConsultationMinutes = 10; // configurable per doctor later
    const estimatedWait = (position - 1) * avgConsultationMinutes;

    results.push({
      ...entry,
      position,
      estimated_wait_minutes: estimatedWait,
      message: position === 1 ? 'You are next!' : `${position - 1} patient(s) ahead of you`,
    });
  }

  return results;
};

// ──────────────────────────────────────────────
// STATISTICS & WAIT TIME
// ──────────────────────────────────────────────

const estimateWaitTime = async (hospitalId, doctorId) => {
  const today = new Date().toISOString().split('T')[0];

  // Count waiting patients
  const { count: waitingCount } = await supabaseAdmin
    .from('opd_queue')
    .select('*', { count: 'exact', head: true })
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', doctorId)
    .eq('queue_date', today)
    .eq('status', 'waiting');

  // Get average consultation duration from completed entries today
  const { data: completed } = await supabaseAdmin
    .from('opd_queue')
    .select('consultation_start_time, consultation_end_time')
    .eq('hospital_id', hospitalId)
    .eq('doctor_id', doctorId)
    .eq('queue_date', today)
    .eq('status', 'completed')
    .not('consultation_start_time', 'is', null)
    .not('consultation_end_time', 'is', null);

  let avgMinutes = 10; // default
  if (completed && completed.length > 0) {
    const durations = completed.map(c => {
      const start = new Date(c.consultation_start_time);
      const end = new Date(c.consultation_end_time);
      return (end - start) / 60000;
    }).filter(d => d > 0 && d < 120); // filter unreasonable values

    if (durations.length > 0) {
      avgMinutes = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
    }
  }

  return (waitingCount || 0) * avgMinutes;
};

const getQueueStats = async (hospitalId) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('opd_queue')
    .select(`
      doctor_id,
      department_id,
      status,
      doctor:doctors(id, name, specialization),
      department:hospital_departments(id, name)
    `)
    .eq('hospital_id', hospitalId)
    .eq('queue_date', today);

  if (error) throw error;

  // Group by doctor
  const byDoctor = {};
  for (const entry of (data || [])) {
    const key = entry.doctor_id;
    if (!byDoctor[key]) {
      byDoctor[key] = {
        doctor: entry.doctor,
        department: entry.department,
        waiting: 0,
        in_consultation: 0,
        completed: 0,
        total: 0,
      };
    }
    byDoctor[key][entry.status] = (byDoctor[key][entry.status] || 0) + 1;
    byDoctor[key].total += 1;
  }

  // Group by department
  const byDepartment = {};
  for (const entry of (data || [])) {
    const deptName = entry.department?.name || 'Unassigned';
    if (!byDepartment[deptName]) {
      byDepartment[deptName] = { name: deptName, waiting: 0, in_consultation: 0, completed: 0, total: 0 };
    }
    byDepartment[deptName][entry.status] = (byDepartment[deptName][entry.status] || 0) + 1;
    byDepartment[deptName].total += 1;
  }

  const allEntries = data || [];
  return {
    total_tokens: allEntries.length,
    waiting: allEntries.filter(e => e.status === 'waiting').length,
    in_consultation: allEntries.filter(e => e.status === 'in_consultation').length,
    completed: allEntries.filter(e => e.status === 'completed').length,
    by_doctor: Object.values(byDoctor),
    by_department: Object.values(byDepartment),
  };
};

module.exports = {
  generateToken,
  getQueue,
  callNextPatient,
  updateQueueStatus,
  getPatientQueuePosition,
  estimateWaitTime,
  getQueueStats,
};
