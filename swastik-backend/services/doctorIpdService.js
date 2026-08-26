/**
 * Doctor IPD Service
 * In-Patient (IPD) Admissions, Daily Clinical Ward Rounds & Discharge Orders for Doctors
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Get active in-patients admitted under this doctor across all associated hospitals
 */
const getMyAdmissions = async (userId, filters = {}) => {
  // First resolve the doctor's record from userId
  const { data: doctor, error: docError } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialization')
    .eq('user_id', userId)
    .single();

  if (docError || !doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  let query = supabaseAdmin
    .from('patient_admissions')
    .select(`
      id,
      admission_number,
      hospital_id,
      patient_id,
      attending_doctor_id,
      admitting_doctor_id,
      ward_id,
      bed_id,
      admitted_at,
      discharged_at,
      admission_type,
      status,
      provisional_diagnosis,
      discharge_summary,
      patient:patients(id, name, age, gender, phone, blood_group),
      hospital:hospitals(id, name, address, city),
      ward:hospital_wards(id, name, ward_type),
      bed:hospital_beds(id, bed_number, bed_type)
    `)
    .or(`attending_doctor_id.eq.${doctor.id},admitting_doctor_id.eq.${doctor.id}`);

  if (filters.status) {
    query = query.eq('status', filters.status);
  } else {
    // Default to currently active admissions
    query = query.eq('status', 'admitted');
  }

  if (filters.hospitalId) {
    query = query.eq('hospital_id', filters.hospitalId);
  }

  const { data, error } = await query.order('admitted_at', { ascending: false });

  if (error) throw error;
  return {
    doctor,
    admissions: data || [],
  };
};

/**
 * Log daily clinical ward round note
 */
const createDoctorRound = async (userId, roundData) => {
  const { admissionId, vitalsSnapshot, clinicalNotes, treatmentOrders, medicationChanges, dietaryInstructions, dischargeRecommended, dischargeNotes } = roundData;

  // Resolve doctor
  const { data: doctor, error: docError } = await supabaseAdmin
    .from('doctors')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (docError || !doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  // Get admission details to find hospital_id
  const { data: admission, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select('id, hospital_id, patient_id')
    .eq('id', admissionId)
    .single();

  if (admError || !admission) {
    throw new ApiError(404, 'Admission not found');
  }

  const { data: round, error } = await supabaseAdmin
    .from('ipd_doctor_rounds')
    .insert({
      hospital_id: admission.hospital_id,
      admission_id: admissionId,
      doctor_id: doctor.id,
      round_date: new Date().toISOString(),
      vitals_snapshot: vitalsSnapshot || {},
      clinical_notes: clinicalNotes,
      treatment_orders: treatmentOrders || null,
      medication_changes: medicationChanges || [],
      dietary_instructions: dietaryInstructions || null,
      discharge_recommended: dischargeRecommended === true || dischargeRecommended === 'true',
      discharge_notes: dischargeNotes || null,
    })
    .select('*')
    .single();

  if (error) throw error;

  // If discharge recommended, update admission discharge summary draft
  if (dischargeRecommended && dischargeNotes) {
    await supabaseAdmin
      .from('patient_admissions')
      .update({
        discharge_summary: {
          doctor_recommendation: dischargeNotes,
          recommended_at: new Date().toISOString(),
        },
      })
      .eq('id', admissionId);
  }

  return round;
};

/**
 * Get clinical ward round history for an admission
 */
const getDoctorRounds = async (admissionId) => {
  const { data, error } = await supabaseAdmin
    .from('ipd_doctor_rounds')
    .select(`
      *,
      doctor:doctors(id, name, specialization)
    `)
    .eq('admission_id', admissionId)
    .order('round_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

module.exports = {
  getMyAdmissions,
  createDoctorRound,
  getDoctorRounds,
};
