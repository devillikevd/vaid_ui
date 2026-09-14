/**
 * IPD Service
 * Full InPatient Department lifecycle: admission, transfer, discharge, progress notes
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

// ──────────────────────────────────────────────
// ADMISSION MANAGEMENT
// ──────────────────────────────────────────────

const createAdmission = async (hospitalId, data) => {
  const bedId = data.bedId || data.bed_id || null;
  const wardId = data.wardId || data.ward_id || null;
  const nowIso = new Date().toISOString();

  // Pre-generate collision-proof admission_number for multi-tenant isolation
  let admissionNumber = data.admissionNumber || data.admission_number;
  if (!admissionNumber) {
    const yearStr = new Date().getFullYear();
    const shortHosp = (hospitalId || '').replace(/-/g, '').slice(0, 4).toUpperCase();
    const { count } = await supabaseAdmin
      .from('patient_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId);
    const seq = (count || 0) + 1;
    admissionNumber = `ADM-${yearStr}-${shortHosp}-${String(seq).padStart(5, '0')}`;
  }

  const payload = {
    hospital_id: hospitalId,
    patient_id: data.patientId || data.patient_id,
    admission_number: admissionNumber,
    admitting_doctor_id: data.admittingDoctorId || data.admitting_doctor_id || null,
    attending_doctor_id: data.attendingDoctorId || data.attending_doctor_id || null,
    department_id: data.departmentId || data.department_id || null,
    admission_type: data.admissionType || data.admission_type || 'elective',
    status: bedId ? 'admitted' : 'pre_admission',
    bed_id: bedId,
    ward_id: wardId,
    admitted_at: bedId ? nowIso : null,
    chief_complaint: data.chiefComplaint || data.chief_complaint || null,
    provisional_diagnosis: data.provisionalDiagnosis || data.provisional_diagnosis || null,
    icd_codes: data.icdCodes || data.icd_codes || [],
    comorbidities: data.comorbidities || [],
    allergies: data.allergies || [],
    blood_group: data.bloodGroup || data.blood_group || null,
    expected_discharge_date: data.expectedDischargeDate || data.expected_discharge_date || null,
    is_mlc: data.isMlc || data.is_mlc || false,
    mlc_number: data.mlcNumber || data.mlc_number || null,
    attendant_name: data.attendantName || data.attendant_name || null,
    attendant_phone: data.attendantPhone || data.attendant_phone || null,
    attendant_relation: data.attendantRelation || data.attendant_relation || null,
    attendant_address: data.attendantAddress || data.attendant_address || null,
    insurance_provider: data.insuranceProvider || data.insurance_provider || null,
    policy_number: data.policyNumber || data.policy_number || null,
    tpa_name: data.tpaName || data.tpa_name || null,
    member_id: data.memberId || data.member_id || null,
    source: data.source || 'direct',
    referred_from: data.referredFrom || data.referred_from || null,
    created_by: data.createdBy || data.created_by || null,
  };

  const { data: admission, error } = await supabaseAdmin
    .from('patient_admissions')
    .insert(payload)
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group),
      admittingDoctor:doctors!patient_admissions_admitting_doctor_id_fkey(id, name, specialization),
      department:hospital_departments(id, name)
    `)
    .single();

  if (error) throw error;

  if (bedId && admission) {
    await supabaseAdmin
      .from('hospital_beds')
      .update({
        status: 'occupied',
        current_patient_id: payload.patient_id,
        current_admission_id: admission.id,
      })
      .eq('id', bedId);
  }

  return admission;
};

const admitPatient = async (hospitalId, admissionId, bedId, wardId = null) => {
  // Verify the admission exists and is pre_admission
  const { data: admission, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select('id, status, patient_id')
    .eq('id', admissionId)
    .eq('hospital_id', hospitalId)
    .single();

  if (admError || !admission) throw new ApiError(404, 'Admission not found');
  if (admission.status !== 'pre_admission') {
    throw new ApiError(400, `Cannot admit: current status is '${admission.status}'`);
  }

  // Verify bed is available
  const { data: bed, error: bedError } = await supabaseAdmin
    .from('hospital_beds')
    .select('id, status, ward_id')
    .eq('id', bedId)
    .eq('hospital_id', hospitalId)
    .single();

  if (bedError || !bed) throw new ApiError(404, 'Bed not found');
  if (bed.status !== 'available') {
    throw new ApiError(400, `Bed is not available (current status: ${bed.status})`);
  }

  const nowIso = new Date().toISOString();
  const effectiveWardId = wardId || bed.ward_id;

  // Transaction: update admission + bed status
  const [admissionResult, bedResult] = await Promise.all([
    supabaseAdmin
      .from('patient_admissions')
      .update({
        status: 'admitted',
        bed_id: bedId,
        ward_id: effectiveWardId,
        admitted_at: nowIso,
      })
      .eq('id', admissionId)
      .select('*')
      .single(),
    supabaseAdmin
      .from('hospital_beds')
      .update({
        status: 'occupied',
        current_patient_id: admission.patient_id,
        current_admission_id: admissionId,
      })
      .eq('id', bedId)
      .eq('status', 'available') // ATOMIC: Only update if still available
      .select('*')
      .maybeSingle(),
  ]);

  if (admissionResult.error) throw admissionResult.error;
  if (bedResult.error) throw bedResult.error;

  if (!bedResult.data) {
    // Rollback admission update
    await supabaseAdmin
      .from('patient_admissions')
      .update({
        status: 'pre_admission',
        bed_id: null,
        ward_id: null,
        admitted_at: null,
      })
      .eq('id', admissionId);
    throw new ApiError(409, 'Bed was just occupied by another admission. Please select another bed.');
  }

  return { admission: admissionResult.data, bed: bedResult.data };
};

const transferBed = async (hospitalId, admissionId, newBedId, reason = '') => {
  // Get current admission
  const { data: admission, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select('id, status, bed_id, ward_id, patient_id, admitting_doctor_id, attending_doctor_id')
    .eq('id', admissionId)
    .eq('hospital_id', hospitalId)
    .single();

  if (admError || !admission) throw new ApiError(404, 'Admission not found');
  if (admission.status !== 'admitted') {
    throw new ApiError(400, 'Patient must be in admitted status to transfer');
  }

  // Verify new bed is available
  const { data: newBed, error: newBedError } = await supabaseAdmin
    .from('hospital_beds')
    .select('id, status, ward_id')
    .eq('id', newBedId)
    .eq('hospital_id', hospitalId)
    .single();

  if (newBedError || !newBed) throw new ApiError(404, 'Target bed not found');
  if (newBed.status !== 'available') {
    throw new ApiError(400, `Target bed is not available (status: ${newBed.status})`);
  }

  // Atomically occupy new bed
  const { data: updatedNewBed, error: newBedUpdateError } = await supabaseAdmin
    .from('hospital_beds')
    .update({
      status: 'occupied',
      current_patient_id: admission.patient_id,
      current_admission_id: admissionId,
    })
    .eq('id', newBedId)
    .eq('status', 'available') // ATOMIC: prevent race conditions
    .select('*')
    .maybeSingle();

  if (newBedUpdateError) throw newBedUpdateError;
  if (!updatedNewBed) {
    throw new ApiError(409, 'Target bed is no longer available for transfer');
  }

  // Update admission with new bed and ward
  const { data: updatedAdmission, error: updateAdmError } = await supabaseAdmin
    .from('patient_admissions')
    .update({ bed_id: newBedId, ward_id: newBed.ward_id })
    .eq('id', admissionId)
    .select('*')
    .single();

  if (updateAdmError) {
    // Rollback new bed if admission update failed
    await supabaseAdmin
      .from('hospital_beds')
      .update({ status: 'available', current_patient_id: null, current_admission_id: null })
      .eq('id', newBedId);
    throw updateAdmError;
  }

  // Free old bed if it exists -> transits to housekeeping
  if (admission.bed_id) {
    await supabaseAdmin
      .from('hospital_beds')
      .update({
        status: 'housekeeping',
        current_patient_id: null,
        current_admission_id: null,
      })
      .eq('id', admission.bed_id);
  }

  // Add a transfer progress note
  await supabaseAdmin
    .from('admission_progress_notes')
    .insert({
      admission_id: admissionId,
      doctor_id: admission.admitting_doctor_id || admission.attending_doctor_id,
      note_type: 'transfer',
      assessment: `Bed transfer: ${reason || 'Clinical requirement'}`,
    })
    .select()
    .maybeSingle();

  return updatedAdmission;
};

const dischargePatient = async (hospitalId, admissionId, dischargeData) => {
  const { data: admission, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select('id, status, bed_id, patient_id')
    .eq('id', admissionId)
    .eq('hospital_id', hospitalId)
    .single();

  if (admError || !admission) throw new ApiError(404, 'Admission not found');
  if (admission.status !== 'admitted') {
    throw new ApiError(400, `Cannot discharge: current status is '${admission.status}'`);
  }

  const nowIso = new Date().toISOString();

  const dischargeSummary = {
    final_diagnosis: dischargeData.finalDiagnosis || dischargeData.final_diagnosis || null,
    procedures_performed: dischargeData.proceduresPerformed || dischargeData.procedures_performed || [],
    condition_at_discharge: dischargeData.conditionAtDischarge || dischargeData.condition_at_discharge || 'improved',
    treatment_given: dischargeData.treatmentGiven || dischargeData.treatment_given || null,
    medications_on_discharge: dischargeData.medicationsOnDischarge || dischargeData.medications_on_discharge || [],
    follow_up_instructions: dischargeData.followUpInstructions || dischargeData.follow_up_instructions || null,
    diet_advice: dischargeData.dietAdvice || dischargeData.diet_advice || null,
    activity_restrictions: dischargeData.activityRestrictions || dischargeData.activity_restrictions || null,
    warning_signs: dischargeData.warningSigns || dischargeData.warning_signs || null,
    discharged_by: dischargeData.dischargedBy || dischargeData.discharged_by || null,
  };

  const promises = [
    supabaseAdmin
      .from('patient_admissions')
      .update({
        status: 'discharged',
        discharged_at: nowIso,
        discharge_type: dischargeData.dischargeType || dischargeData.discharge_type || 'normal',
        discharge_summary: dischargeSummary,
        discharge_notes: dischargeData.dischargeNotes || dischargeData.discharge_notes || null,
        condition_at_discharge: dischargeData.conditionAtDischarge || dischargeData.condition_at_discharge || 'improved',
        final_diagnosis: dischargeData.finalDiagnosis || dischargeData.final_diagnosis || null,
        follow_up_date: dischargeData.followUpDate || dischargeData.follow_up_date || null,
        follow_up_instructions: dischargeData.followUpInstructions || dischargeData.follow_up_instructions || null,
      })
      .eq('id', admissionId)
      .select(`
        *,
        patient:patients(id, name, date_of_birth, gender),
        bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number, ward:hospital_wards(id, name, ward_type)),
        admittingDoctor:doctors!patient_admissions_admitting_doctor_id_fkey(id, name, specialization)
      `)
      .single(),
  ];

  // Free the bed
  if (admission.bed_id) {
    promises.push(
      supabaseAdmin
        .from('hospital_beds')
        .update({
          status: 'housekeeping',
          current_patient_id: null,
          current_admission_id: null,
        })
        .eq('id', admission.bed_id)
    );
  }

  const results = await Promise.all(promises);
  if (results[0].error) throw results[0].error;

  return results[0].data;
};

// ──────────────────────────────────────────────
// ADMISSION QUERIES
// ──────────────────────────────────────────────

const getAdmissions = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('patient_admissions')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, profile_image_url),
      bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number),
      ward:hospital_wards(id, name, ward_type, floor),
      admittingDoctor:doctors!patient_admissions_admitting_doctor_id_fkey(id, name, specialization, profile_image_url),
      attendingDoctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name, specialization, profile_image_url),
      department:hospital_departments(id, name)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
  if (filters.wardId) query = query.eq('ward_id', filters.wardId);
  if (filters.doctorId) {
    query = query.or(`admitting_doctor_id.eq.${filters.doctorId},attending_doctor_id.eq.${filters.doctorId}`);
  }
  if (filters.admissionType) query = query.eq('admission_type', filters.admissionType);
  if (filters.fromDate) query = query.gte('admitted_at', filters.fromDate);
  if (filters.toDate) query = query.lte('admitted_at', filters.toDate);

  if (filters.search) {
    const s = filters.search.toLowerCase();
    query = query.or(`admission_number.ilike.%${s}%,chief_complaint.ilike.%${s}%`);
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

const getAdmissionDetail = async (hospitalId, admissionId) => {
  const { data, error } = await supabaseAdmin
    .from('patient_admissions')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, profile_image_url, phone, user:users(email, phone)),
      bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number, bed_type, features, ward:hospital_wards(id, name, ward_type, floor, wing)),
      ward:hospital_wards(id, name, ward_type, floor, wing),
      admittingDoctor:doctors!patient_admissions_admitting_doctor_id_fkey(id, name, specialization, profile_image_url),
      attendingDoctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name, specialization, profile_image_url),
      department:hospital_departments(id, name),
      progressNotes:admission_progress_notes(*, doctor:doctors(id, name, specialization))
    `)
    .eq('id', admissionId)
    .eq('hospital_id', hospitalId)
    .single();

  if (error || !data) throw new ApiError(404, 'Admission not found');

  // Sort progress notes by date descending
  if (data.progressNotes) {
    data.progressNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return data;
};

const getIPDCensus = async (hospitalId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const [
    admittedResult,
    pendingAdmissionsResult,
    pendingDischargeResult,
    admissionsTodayResult,
    dischargesTodayResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('patient_admissions')
      .select(`
        id, admission_number, status, admitted_at, admission_type, chief_complaint,
        patient:patients(id, name, date_of_birth, gender),
        bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number),
        ward:hospital_wards(id, name, ward_type, floor),
        attendingDoctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name, specialization)
      `, { count: 'exact' })
      .eq('hospital_id', hospitalId)
      .eq('status', 'admitted')
      .order('admitted_at', { ascending: true }),

    supabaseAdmin
      .from('patient_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'pre_admission'),

    supabaseAdmin
      .from('patient_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'discharge_pending'),

    supabaseAdmin
      .from('patient_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gte('admitted_at', todayStartIso),

    supabaseAdmin
      .from('patient_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'discharged')
      .gte('discharged_at', todayStartIso),
  ]);

  if (admittedResult.error) throw admittedResult.error;

  return {
    total_admitted: admittedResult.count || 0,
    pending_admissions: pendingAdmissionsResult.count || 0,
    pending_discharge: pendingDischargeResult.count || 0,
    admissions_today: admissionsTodayResult.count || 0,
    discharges_today: dischargesTodayResult.count || 0,
    patients: admittedResult.data || [],
  };
};

// ──────────────────────────────────────────────
// PROGRESS NOTES
// ──────────────────────────────────────────────

const addProgressNote = async (admissionId, doctorId, noteData) => {
  let resolvedDoctorId = doctorId || noteData.doctorId || noteData.doctor_id || null;

  // Resolve doctorId if passed as a user_id or if not directly in doctors table
  if (resolvedDoctorId) {
    const { data: docById } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('id', resolvedDoctorId)
      .maybeSingle();

    if (!docById) {
      const { data: docByUser } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('user_id', resolvedDoctorId)
        .maybeSingle();

      if (docByUser) {
        resolvedDoctorId = docByUser.id;
      } else {
        // Fallback: check admission's attending or admitting doctor
        const { data: adm } = await supabaseAdmin
          .from('patient_admissions')
          .select('attending_doctor_id, admitting_doctor_id')
          .eq('id', admissionId)
          .maybeSingle();
        resolvedDoctorId = adm?.attending_doctor_id || adm?.admitting_doctor_id || null;
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('admission_progress_notes')
    .insert({
      admission_id: admissionId,
      doctor_id: resolvedDoctorId,
      note_type: noteData.noteType || noteData.note_type || 'progress',
      note_date: noteData.noteDate || noteData.note_date || new Date().toISOString().split('T')[0],
      subjective: noteData.subjective || null,
      objective: noteData.objective || null,
      assessment: noteData.assessment || null,
      plan: noteData.plan || null,
      vitals: noteData.vitals || {},
      instructions: noteData.instructions || null,
      diet_instructions: noteData.dietInstructions || noteData.diet_instructions || null,
      activity_level: noteData.activityLevel || noteData.activity_level || null,
      is_critical: noteData.isCritical || noteData.is_critical || false,
    })
    .select('*, doctor:doctors(id, name, specialization)')
    .single();

  if (error) throw error;
  return data;
};

const getProgressNotes = async (admissionId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('admission_progress_notes')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url)', { count: 'exact' })
    .eq('admission_id', admissionId)
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

// ──────────────────────────────────────────────
// DISCHARGE SUMMARY
// ──────────────────────────────────────────────

const getDischargeSummary = async (admissionId) => {
  const { data, error } = await supabaseAdmin
    .from('patient_admissions')
    .select(`
      *,
      patient:patients(id, name, date_of_birth, gender, blood_group, phone),
      bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number, ward:hospital_wards(id, name, ward_type)),
      admittingDoctor:doctors!patient_admissions_admitting_doctor_id_fkey(id, name, specialization, registration_number),
      attendingDoctor:doctors!patient_admissions_attending_doctor_id_fkey(id, name, specialization, registration_number),
      department:hospital_departments(id, name),
      hospital:hospitals(id, name, address, city, phone, email)
    `)
    .eq('id', admissionId)
    .single();

  if (error || !data) throw new ApiError(404, 'Admission not found');
  if (data.status !== 'discharged') {
    throw new ApiError(400, 'Discharge summary is only available after discharge');
  }

  return data;
};

module.exports = {
  createAdmission,
  admitPatient,
  transferBed,
  dischargePatient,
  getAdmissions,
  getAdmissionDetail,
  getIPDCensus,
  addProgressNote,
  getProgressNotes,
  getDischargeSummary,
};
