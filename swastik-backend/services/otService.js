/**
 * OT Service
 * Operation Theater scheduling, room management, checklists
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

// ── OT ROOMS ──

const getOtRooms = async (hospitalId) => {
  const { data, error } = await supabaseAdmin
    .from('ot_rooms')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

const createOtRoom = async (hospitalId, roomData) => {
  const { data, error } = await supabaseAdmin
    .from('ot_rooms')
    .insert({
      hospital_id: hospitalId,
      name: roomData.name?.trim(),
      room_number: roomData.roomNumber || roomData.room_number || null,
      room_type: roomData.roomType || roomData.room_type || 'major',
      floor: roomData.floor || null,
      equipment: roomData.equipment || [],
      capacity_notes: roomData.capacityNotes || roomData.capacity_notes || null,
      is_active: roomData.is_active !== false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const updateOtRoom = async (hospitalId, roomId, updates) => {
  const allowed = ['name', 'room_number', 'room_type', 'floor', 'equipment', 'capacity_notes', 'is_active'];
  const safe = {};
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[k] !== undefined) safe[k] = updates[k];
    else if (updates[camel] !== undefined) safe[k] = updates[camel];
  }
  const { data, error } = await supabaseAdmin
    .from('ot_rooms')
    .update(safe)
    .eq('id', roomId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'OT room not found');
  return data;
};

// ── OT SCHEDULING ──

const scheduleOt = async (hospitalId, data) => {
  // Check for scheduling conflicts
  const scheduledStart = data.scheduledStart || data.scheduled_start;
  const scheduledEnd = data.scheduledEnd || data.scheduled_end;
  const otRoomId = data.otRoomId || data.ot_room_id;

  if (scheduledEnd) {
    const { data: conflicts } = await supabaseAdmin
      .from('ot_schedules')
      .select('id')
      .eq('ot_room_id', otRoomId)
      .not('status', 'in', '("cancelled","postponed")')
      .lt('scheduled_start', scheduledEnd)
      .gt('scheduled_end', scheduledStart)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      throw new ApiError(409, 'This OT room has a scheduling conflict at the requested time');
    }
  }

  const { data: schedule, error } = await supabaseAdmin
    .from('ot_schedules')
    .insert({
      hospital_id: hospitalId,
      ot_room_id: otRoomId,
      patient_id: data.patientId || data.patient_id,
      admission_id: data.admissionId || data.admission_id || null,
      encounter_id: data.encounterId || data.encounter_id || null,
      primary_surgeon_id: data.primarySurgeonId || data.primary_surgeon_id,
      assistant_surgeon_ids: data.assistantSurgeonIds || data.assistant_surgeon_ids || [],
      anesthetist_id: data.anesthetistId || data.anesthetist_id || null,
      scrub_nurse: data.scrubNurse || data.scrub_nurse || null,
      circulating_nurse: data.circulatingNurse || data.circulating_nurse || null,
      surgery_type: data.surgeryType || data.surgery_type || 'major',
      surgery_name: data.surgeryName || data.surgery_name,
      procedure_code: data.procedureCode || data.procedure_code || null,
      procedure_description: data.procedureDescription || data.procedure_description || null,
      laterality: data.laterality || null,
      anesthesia_type: data.anesthesiaType || data.anesthesia_type || null,
      position: data.position || null,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd || null,
      estimated_duration_minutes: data.estimatedDuration || data.estimated_duration_minutes || 60,
      priority: data.priority || 'elective',
      pre_op_diagnosis: data.preOpDiagnosis || data.pre_op_diagnosis || null,
      consent_obtained: data.consentObtained || data.consent_obtained || false,
      consent_document_url: data.consentDocumentUrl || data.consent_document_url || null,
      special_instructions: data.specialInstructions || data.special_instructions || null,
    })
    .select(`
      *,
      otRoom:ot_rooms(id, name, room_type),
      patient:patients(id, name, date_of_birth, gender),
      primarySurgeon:doctors!ot_schedules_primary_surgeon_id_fkey(id, name, specialization)
    `)
    .single();

  if (error) throw error;
  return schedule;
};

const getOtSchedules = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('ot_schedules')
    .select(`
      *,
      otRoom:ot_rooms(id, name, room_type, floor),
      patient:patients(id, name, date_of_birth, gender),
      primarySurgeon:doctors!ot_schedules_primary_surgeon_id_fkey(id, name, specialization, profile_image_url),
      anesthetist:doctors!ot_schedules_anesthetist_id_fkey(id, name, specialization)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.otRoomId) query = query.eq('ot_room_id', filters.otRoomId);
  if (filters.surgeonId) query = query.eq('primary_surgeon_id', filters.surgeonId);
  if (filters.date) {
    const dayStart = `${filters.date}T00:00:00.000Z`;
    const dayEnd = `${filters.date}T23:59:59.999Z`;
    query = query.gte('scheduled_start', dayStart).lte('scheduled_start', dayEnd);
  }
  if (filters.fromDate) query = query.gte('scheduled_start', filters.fromDate);
  if (filters.toDate) query = query.lte('scheduled_start', filters.toDate);

  const { data, error, count } = await query
    .order('scheduled_start', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: count > 0 ? Math.ceil(count / limit) : 1 },
  };
};

const updateOtStatus = async (hospitalId, scheduleId, status, notes = {}) => {
  const updates = { status };
  const nowIso = new Date().toISOString();

  if (status === 'in_progress') updates.actual_start = nowIso;
  if (status === 'completed') {
    updates.actual_end = nowIso;
    if (notes.operativeNotes || notes.operative_notes) updates.operative_notes = notes.operativeNotes || notes.operative_notes;
    if (notes.postOpDiagnosis || notes.post_op_diagnosis) updates.post_op_diagnosis = notes.postOpDiagnosis || notes.post_op_diagnosis;
    if (notes.complications) updates.complications = notes.complications;
    if (notes.bloodLoss || notes.blood_loss_ml) updates.blood_loss_ml = notes.bloodLoss || notes.blood_loss_ml;
    if (notes.specimensSent || notes.specimens_sent) updates.specimens_sent = notes.specimensSent || notes.specimens_sent;
    if (notes.implantsUsed || notes.implants_used) updates.implants_used = notes.implantsUsed || notes.implants_used;
  }
  if (status === 'pre_op' && (notes.preOpNotes || notes.pre_op_notes)) {
    updates.pre_op_notes = notes.preOpNotes || notes.pre_op_notes;
  }
  if (status === 'post_op' && (notes.postOpNotes || notes.post_op_notes)) {
    updates.post_op_notes = notes.postOpNotes || notes.post_op_notes;
  }
  if (notes.anesthesiaNotes || notes.anesthesia_notes) {
    updates.anesthesia_notes = notes.anesthesiaNotes || notes.anesthesia_notes;
  }

  const { data, error } = await supabaseAdmin
    .from('ot_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();

  if (error) throw error;
  if (!data) throw new ApiError(404, 'OT schedule not found');
  return data;
};

const addOtChecklist = async (scheduleId, checklistData) => {
  const { data, error } = await supabaseAdmin
    .from('ot_checklists')
    .insert({
      schedule_id: scheduleId,
      checklist_type: checklistData.checklistType || checklistData.checklist_type || 'pre_op',
      items: checklistData.items || [],
      is_complete: checklistData.isComplete || checklistData.is_complete || false,
      completed_by: checklistData.completedBy || checklistData.completed_by || null,
      completed_at: checklistData.isComplete ? new Date().toISOString() : null,
      notes: checklistData.notes || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const getOtAvailability = async (hospitalId, date) => {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [roomsRes, schedulesRes] = await Promise.all([
    supabaseAdmin.from('ot_rooms').select('*').eq('hospital_id', hospitalId).eq('is_active', true),
    supabaseAdmin.from('ot_schedules').select('ot_room_id, scheduled_start, scheduled_end, status, surgery_name, primary_surgeon_id')
      .eq('hospital_id', hospitalId).gte('scheduled_start', dayStart).lte('scheduled_start', dayEnd)
      .not('status', 'in', '("cancelled","postponed")'),
  ]);

  if (roomsRes.error) throw roomsRes.error;
  if (schedulesRes.error) throw schedulesRes.error;

  const schedulesByRoom = {};
  for (const s of (schedulesRes.data || [])) {
    if (!schedulesByRoom[s.ot_room_id]) schedulesByRoom[s.ot_room_id] = [];
    schedulesByRoom[s.ot_room_id].push(s);
  }

  return (roomsRes.data || []).map(room => ({
    ...room,
    schedules: schedulesByRoom[room.id] || [],
    total_surgeries: (schedulesByRoom[room.id] || []).length,
    is_free: !(schedulesByRoom[room.id] || []).some(s => s.status === 'in_progress'),
  }));
};

module.exports = {
  getOtRooms, createOtRoom, updateOtRoom,
  scheduleOt, getOtSchedules, updateOtStatus,
  addOtChecklist, getOtAvailability,
};
