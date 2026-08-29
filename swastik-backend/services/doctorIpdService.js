/**
 * Doctor IPD Service
 * In-Patient (IPD) Admissions, Daily Clinical Ward Rounds & Discharge Orders for Doctors
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { calculateAge } = require('../utils/patientProfile');

/**
 * Helper: Resolve doctor and their affiliated hospital IDs
 */
const _resolveDoctorAndAffiliations = async (userId) => {
  const { data: doctor, error: docError } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialization, hospital_id')
    .eq('user_id', userId)
    .single();

  if (docError || !doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  const affiliatedHospitalIds = new Set();
  if (doctor.hospital_id) {
    affiliatedHospitalIds.add(doctor.hospital_id);
  }

  // Active hospital_doctors rows
  const { data: hospitalLinks } = await supabaseAdmin
    .from('hospital_doctors')
    .select('hospital_id')
    .eq('doctor_id', doctor.id)
    .neq('is_active', false);

  (hospitalLinks || []).forEach((h) => {
    if (h.hospital_id) affiliatedHospitalIds.add(h.hospital_id);
  });

  // Accepted hospital_doctor_invites
  const { data: acceptedInvites } = await supabaseAdmin
    .from('hospital_doctor_invites')
    .select('hospital_id')
    .eq('doctor_id', doctor.id)
    .eq('status', 'accepted');

  (acceptedInvites || []).forEach((inv) => {
    if (inv.hospital_id) affiliatedHospitalIds.add(inv.hospital_id);
  });

  return { doctor, affiliatedHospitalIds };
};

/**
 * Get active in-patients admitted under this doctor across all associated hospitals
 */
const getMyAdmissions = async (userId, filters = {}) => {
  const { doctor, affiliatedHospitalIds } = await _resolveDoctorAndAffiliations(userId);

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
      patient:patients!patient_admissions_patient_id_fkey(id, name, date_of_birth, gender, blood_group),
      hospital:hospitals!patient_admissions_hospital_id_fkey(id, name, address, city),
      ward:hospital_wards!patient_admissions_ward_id_fkey(id, name, ward_type),
      bed:hospital_beds!patient_admissions_bed_id_fkey(id, bed_number, bed_type)
    `);

  if (affiliatedHospitalIds.size > 0) {
    const hospIds = Array.from(affiliatedHospitalIds).join(',');
    query = query.or(`attending_doctor_id.eq.${doctor.id},admitting_doctor_id.eq.${doctor.id},hospital_id.in.(${hospIds})`);
  } else {
    query = query.or(`attending_doctor_id.eq.${doctor.id},admitting_doctor_id.eq.${doctor.id}`);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else if (!filters.status) {
    // Default to currently active admissions (canonical status: 'admitted')
    query = query.eq('status', 'admitted');
  }

  if (filters.hospitalId) {
    query = query.eq('hospital_id', filters.hospitalId);
  }

  const { data, error } = await query.order('admitted_at', { ascending: false });

  if (error) throw error;

  const admissions = data || [];

  // Calculate patient.age from date_of_birth
  admissions.forEach((a) => {
    if (a.patient) {
      a.patient.age = a.patient.date_of_birth ? calculateAge(a.patient.date_of_birth) : undefined;
    }
  });

  // Enrich with latest round for each admission if available
  if (admissions.length > 0) {
    const admissionIds = admissions.map((a) => a.id);
    const { data: rounds } = await supabaseAdmin
      .from('ipd_doctor_rounds')
      .select('id, admission_id, round_date, clinical_notes, treatment_orders, discharge_recommended')
      .in('admission_id', admissionIds)
      .order('round_date', { ascending: false });

    if (rounds && rounds.length > 0) {
      const latestRoundsMap = new Map();
      rounds.forEach((r) => {
        if (!latestRoundsMap.has(r.admission_id)) {
          latestRoundsMap.set(r.admission_id, r);
        }
      });

      admissions.forEach((a) => {
        a.latest_round = latestRoundsMap.get(a.id) || null;
      });
    }
  }

  return {
    doctor,
    admissions,
    hasHospitalAffiliation: affiliatedHospitalIds.size > 0,
  };
};

/**
 * Log daily clinical ward round note
 */
const createDoctorRound = async (userId, roundData) => {
  const { admissionId, vitalsSnapshot, clinicalNotes, treatmentOrders, medicationChanges, dietaryInstructions, dischargeRecommended, dischargeNotes } = roundData;

  const { doctor, affiliatedHospitalIds } = await _resolveDoctorAndAffiliations(userId);

  // Get admission details
  const { data: admission, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select('id, hospital_id, patient_id, attending_doctor_id, admitting_doctor_id')
    .eq('id', admissionId)
    .single();

  if (admError || !admission) {
    throw new ApiError(404, 'Admission not found');
  }

  // Authorization: doctor must be the attending doctor, admitting doctor, or affiliated with the hospital
  const isAuthorized = admission.attending_doctor_id === doctor.id ||
    admission.admitting_doctor_id === doctor.id ||
    affiliatedHospitalIds.has(admission.hospital_id);

  if (!isAuthorized) {
    throw new ApiError(403, 'Unauthorized to create rounds for this admission');
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
const getDoctorRounds = async (userId, admissionId) => {
  const { doctor, affiliatedHospitalIds } = await _resolveDoctorAndAffiliations(userId);

  const { data: admission, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select('id, hospital_id, attending_doctor_id, admitting_doctor_id')
    .eq('id', admissionId)
    .single();

  if (admError || !admission) {
    throw new ApiError(404, 'Admission not found');
  }

  const isAuthorized = admission.attending_doctor_id === doctor.id ||
    admission.admitting_doctor_id === doctor.id ||
    affiliatedHospitalIds.has(admission.hospital_id);

  if (!isAuthorized) {
    throw new ApiError(403, 'Unauthorized to view rounds for this admission');
  }

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
