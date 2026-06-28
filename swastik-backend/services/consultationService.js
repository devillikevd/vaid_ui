/**
 * Consultation Service
 * Handles video consultations, prescriptions, and consultation history
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const eventEmitter = require('./eventEmitter');
const config = require('../config');
const crypto = require('crypto');

// Redis client for doctor AI rate limiting and cache invalidation
let cacheIncr, cacheDel;
try {
  ({ cacheIncr, cacheDel } = require('../config/redis'));
} catch { 
  cacheIncr = null; 
  cacheDel = null; 
}

// MongoDB for doctor AI conversation memory + audit trail
// Removed unused getDb

const getAccessibleHospitalIds = async (userId) => {
  const { data: ownedHospitals, error: ownedHospitalsError } = await supabaseAdmin
    .from('hospitals')
    .select('id')
    .eq('owner_id', userId);

  if (ownedHospitalsError) throw ownedHospitalsError;

  const { data: managedHospitals, error: managedHospitalsError } = await supabaseAdmin
    .from('hospital_managers')
    .select('hospital_id')
    .eq('user_id', userId);

  if (managedHospitalsError) throw managedHospitalsError;

  return [...new Set([
    ...(ownedHospitals || []).map((hospital) => hospital.id),
    ...(managedHospitals || []).map((manager) => manager.hospital_id),
  ].filter(Boolean))];
};

const getActiveHospitalDoctorIds = async (hospitalIds = []) => {
  if (hospitalIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('hospital_doctors')
    .select('doctor_id')
    .in('hospital_id', hospitalIds)
    .eq('is_active', true);

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.doctor_id).filter(Boolean))];
};

const getAccessibleClinicIds = async (userId) => {
  const { data: clinics, error } = await supabaseAdmin
    .from('clinics')
    .select('id')
    .eq('owner_id', userId);

  if (error) throw error;
  return (clinics || []).map((clinic) => clinic.id).filter(Boolean);
};

const getActiveClinicDoctorIds = async (clinicIds = []) => {
  if (clinicIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('clinic_doctors')
    .select('doctor_id')
    .in('clinic_id', clinicIds)
    .eq('is_active', true);

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.doctor_id).filter(Boolean))];
};

const buildTurnUrlVariants = (turnServer) => {
  if (!turnServer) return [];

  try {
    const normalized = turnServer.includes('://')
      ? turnServer
      : turnServer.replace(/^turns?:/, (scheme) => `${scheme}//`);
    const url = new URL(normalized);
    const scheme = url.protocol.replace(':', '');
    const host = url.hostname;
    const port = url.port || (scheme === 'turns' ? '5349' : '3478');
    const existingTransport = url.searchParams.get('transport')?.toLowerCase();

    if (!host) return [turnServer];

    const hostPart = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
    const variants = [];
    const add = (candidate) => {
      if (!variants.includes(candidate)) variants.push(candidate);
    };

    // TURN over UDP should be tried before relay-over-TCP because TCP relay can
    // amplify latency/jitter for live video. If someone accidentally configures
    // only turns:...tcp, still offer the standard 3478 UDP/TCP candidates first
    // for our coturn deployment, then keep TLS as a last fallback.
    if (scheme === 'turns') {
      add(`turn:${hostPart}:3478?transport=udp`);
      add(`turn:${hostPart}:3478?transport=tcp`);
      add(`turns:${hostPart}:${port}?transport=${existingTransport || 'tcp'}`);
      return variants;
    }

    add(`${scheme}:${hostPart}:${port}?transport=udp`);
    add(`${scheme}:${hostPart}:${port}?transport=tcp`);

    return variants;
  } catch {
    return [turnServer];
  }
};

const syncConsultationSessionState = async (consultationId, fields = {}) => {
  const updates = {};
  if (fields.roomId) updates.room_id = fields.roomId;
  if (fields.doctorJoinedAt) updates.doctor_joined_at = fields.doctorJoinedAt;
  if (fields.patientJoinedAt) updates.patient_joined_at = fields.patientJoinedAt;
  if (fields.durationMinutes != null) updates.duration_minutes = fields.durationMinutes;

  if (Object.keys(updates).length === 0) return null;

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .update(updates)
    .eq('id', consultationId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const emitConsultationStartedSync = async (consultation, doctorUserId, doctorName) => {
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', consultation.patient_id)
    .single();

  eventEmitter.emitConsultationStarted({
    ...consultation,
    doctor_id: doctorUserId,
    patient_id: patient?.user_id,
    doctor_name: doctorName,
  });
};

// Get consultation history
const getConsultationHistory = async (userId, role, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin.from('consultations').select(
    '*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name), appointment:appointments(id, appointment_date, time_slot, type), prescriptions(*, prescription_medicines(*))',
    { count: 'exact' }
  );

  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (!patient) {
      // Fix #4: No patient record found — return empty instead of unfiltered query
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    query = query.eq('patient_id', patient.id);
  } else if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (!doctor) {
      // Fix #4: No doctor record found — return empty instead of unfiltered query
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    query = query.eq('doctor_id', doctor.id);
  } else if (role === 'hospital_owner' || role === 'hospital_manager') {
    // Scope strictly to doctors with accepted active hospital roster links.
    const hospitalIds = await getAccessibleHospitalIds(userId);
    if (hospitalIds.length > 0) {
      const doctorIds = await getActiveHospitalDoctorIds(hospitalIds);
      if (doctorIds.length > 0) {
        query = query.in('doctor_id', doctorIds);
      } else {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
    } else {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  } else if (role === 'clinic_owner') {
    // Scope strictly to doctors with accepted active clinic roster links.
    const clinicIds = await getAccessibleClinicIds(userId);
    if (clinicIds.length > 0) {
      const doctorIds = await getActiveClinicDoctorIds(clinicIds);
      if (doctorIds.length > 0) {
        query = query.in('doctor_id', doctorIds);
      } else {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
    } else {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  } else if (role === 'admin') {
    // admin role can view all consultations (no filter)
  } else {
    // Unknown role — deny access to prevent data leak
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
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
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};


const checkTimeBounds = (appointmentDate, timeSlot) => {
  if (!appointmentDate || !timeSlot) return true;
  const slotDateStr = `${appointmentDate}T${timeSlot.padStart(5, '0')}:00+05:30`;
  const slotTimeMs = Date.parse(slotDateStr);
  if (isNaN(slotTimeMs)) return true;
  
  const diffMins = (Date.now() - slotTimeMs) / 60000;
  return diffMins >= -15 && diffMins <= 60;
};

// Start consultation (doctor) — C7 Fix: atomic via RPC
const startConsultation = async (doctorUserId, appointmentId) => {
  const { data: appointment } = await supabaseAdmin
    .from('appointments')
    .select('appointment_date, time_slot')
    .eq('id', appointmentId)
    .single();

  if (appointment && !checkTimeBounds(appointment.appointment_date, appointment.time_slot)) {
    throw new ApiError(403, 'Consultation can only be started 15 minutes before and up to 1 hour after the scheduled time.');
  }

  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, name')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  const { data: existingConsultation, error: existingConsultationError } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('appointment_id', appointmentId)
    .eq('doctor_id', doctor.id)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConsultationError) throw existingConsultationError;

  if (existingConsultation) {
    const nowIso = new Date().toISOString();
    const consultation = await syncConsultationSessionState(existingConsultation.id, {
      roomId: existingConsultation.room_id || existingConsultation.id,
      doctorJoinedAt: existingConsultation.doctor_joined_at || nowIso,
    }) || existingConsultation;

    // Re-emit the start event so waiting patients recover if they missed the
    // original notification and the doctor retries opening the same session.
    await emitConsultationStartedSync(consultation, doctorUserId, doctor.name);
    return consultation;
  }

  // C7: Atomic start — creates consultation + updates appointment in one transaction
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('rpc_start_consultation', {
    p_appointment_id: appointmentId,
    p_doctor_id: doctor.id,
  });

  if (rpcError) throw rpcError;

  if (!rpcResult?.success) {
    const reasons = {
      appointment_not_found: 'Valid appointment not found',
    };
    throw new ApiError(404, reasons[rpcResult?.reason] || 'Failed to start consultation');
  }

  let consultation = rpcResult.consultation;
  const nowIso = new Date().toISOString();

  consultation = await syncConsultationSessionState(consultation.id, {
    roomId: consultation.room_id || consultation.id,
    doctorJoinedAt: consultation.doctor_joined_at || nowIso,
  }) || consultation;

  await emitConsultationStartedSync(consultation, doctorUserId, doctor.name);

  return consultation;
};

// Join consultation (patient)
// Supports both consultation ID and appointment ID (for Android app compatibility)
const joinConsultation = async (patientUserId, idParam) => {
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', patientUserId)
    .single();

  // BUG-H1 Fix: Guard against null patient — prevents eq('patient_id', null) query
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found. Please complete your profile first.');
  }

  // First try: lookup by consultation ID directly
  let { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', idParam)
    .eq('patient_id', patient.id)
    .eq('status', 'in_progress')
    .single();

  // Fallback: if not found, try lookup by appointment ID (Android sends appointmentId)
  if (!consultation) {
    const fallback = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('appointment_id', idParam)
      .eq('patient_id', patient.id)
      .eq('status', 'in_progress')
      .single();

    consultation = fallback.data;
    error = fallback.error;
  }

  if (error || !consultation) {
    throw new ApiError(404, 'Active consultation not found');
  }

  const nowIso = new Date().toISOString();
  if (!consultation.room_id || !consultation.patient_joined_at) {
    consultation = await syncConsultationSessionState(consultation.id, {
      roomId: consultation.room_id || consultation.id,
      patientJoinedAt: consultation.patient_joined_at || nowIso,
    }) || consultation;
  }

  return consultation;
};

// Get consultation by ID
const getConsultation = async (userId, role, consultationId) => {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name), appointment:appointments(*), prescriptions(*, prescription_medicines(*))')
    .eq('id', consultationId)
    .single();

  if (error || !consultation) {
    throw new ApiError(404, 'Consultation not found');
  }

  // Authorization: verify requesting user is the doctor or patient of this consultation
  if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (!doctor || consultation.doctor_id !== doctor.id) {
      throw new ApiError(403, 'Unauthorized to view this consultation');
    }
  } else if (role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (!patient || consultation.patient_id !== patient.id) {
      throw new ApiError(403, 'Unauthorized to view this consultation');
    }
  } else if (role === 'hospital_owner' || role === 'hospital_manager') {
    // Scope strictly via active accepted hospital roster links.
    const hospitalIds = await getAccessibleHospitalIds(userId);
    if (hospitalIds.length === 0) {
      throw new ApiError(403, 'Unauthorized to view this consultation');
    }

    const { data: association } = await supabaseAdmin
      .from('hospital_doctors')
      .select('doctor_id')
      .in('hospital_id', hospitalIds)
      .eq('doctor_id', consultation.doctor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!association) {
      throw new ApiError(403, 'Unauthorized to view this consultation');
    }
  } else if (role === 'clinic_owner') {
    // Scope strictly via active accepted clinic roster links.
    const clinicIds = await getAccessibleClinicIds(userId);
    if (clinicIds.length === 0) {
      throw new ApiError(403, 'Unauthorized to view this consultation');
    }

    const { data: association } = await supabaseAdmin
      .from('clinic_doctors')
      .select('doctor_id')
      .in('clinic_id', clinicIds)
      .eq('doctor_id', consultation.doctor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!association) {
      throw new ApiError(403, 'Unauthorized to view this consultation');
    }
  }
  // admin role can view any consultation

  return consultation;
};

// End consultation (doctor) — C7 Fix: atomic via RPC
const endConsultation = async (doctorUserId, consultationId, data = {}) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  // C7: Atomic end — updates consultation + appointment in one transaction
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('rpc_end_consultation', {
    p_consultation_id: consultationId,
    p_doctor_id: doctor.id,
    p_diagnosis: data.diagnosis || null,
    p_notes: data.notes || null,
    p_follow_up_date: data.followUpDate || null,
  });

  if (rpcError) throw rpcError;

  if (!rpcResult?.success) {
    throw new ApiError(404, 'Consultation not found or unauthorized');
  }

  let consultation = rpcResult.consultation;
  if (consultation?.appointment_id) {
    await supabaseAdmin
      .from('appointments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', consultation.appointment_id)
      .eq('doctor_id', doctor.id)
      .eq('status', 'in_progress');
  }

  const requestedDurationSeconds = Number(data.duration);
  const requestedDurationMinutes = Number.isFinite(requestedDurationSeconds)
    ? Math.max(1, Math.ceil(requestedDurationSeconds / 60))
    : null;
  const derivedDurationMinutes =
    consultation.started_at && consultation.ended_at
      ? Math.max(1, Math.ceil((Date.parse(consultation.ended_at) - Date.parse(consultation.started_at)) / 60000))
      : null;
  const durationMinutes = requestedDurationMinutes || derivedDurationMinutes;

  if (durationMinutes != null && consultation.duration_minutes !== durationMinutes) {
    consultation = await syncConsultationSessionState(consultation.id, {
      durationMinutes,
    }) || consultation;
  }

  // Get patient user_id
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', consultation.patient_id)
    .single();

  eventEmitter.emitConsultationEnded({
    ...consultation,
    doctor_id: doctorUserId,
    patient_id: patient?.user_id,
  });

  // Invalidate dashboard caches to remove completed consultation immediately
  if (cacheDel) {
    await cacheDel(`doctor:dashboard:${doctorUserId}`);
    if (patient?.user_id) {
      await cacheDel(`patient:dashboard:${patient.user_id}`);
    }
  }

  return consultation;
};

// Get ICE servers for a consultation (doctor/patient only)
const getIceServers = async (userId, role, consultationId) => {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('id, doctor_id, patient_id')
    .eq('id', consultationId)
    .single();

  if (error || !consultation) {
    throw new ApiError(404, 'Consultation not found');
  }

  if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (!doctor || consultation.doctor_id !== doctor.id) {
      throw new ApiError(403, 'Unauthorized to view ICE servers');
    }
  } else if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (!patient || consultation.patient_id !== patient.id) {
      throw new ApiError(403, 'Unauthorized to view ICE servers');
    }
  } else {
    throw new ApiError(403, 'Unauthorized to view ICE servers');
  }

  const { webrtc } = config;
  const iceServers = [];

  const stunServers = Array.isArray(webrtc?.stunServers)
    ? webrtc.stunServers
    : [webrtc?.stunServer].filter(Boolean);

  for (const stunServer of stunServers) {
    iceServers.push({ urls: [stunServer] });
  }

  const turnUrls = [
    ...new Set((Array.isArray(webrtc?.turnServers) ? webrtc.turnServers : [webrtc?.turnServer])
      .flatMap(buildTurnUrlVariants)
      .filter(Boolean)),
  ];

  if (turnUrls.length > 0 && webrtc?.turnCredential) {
    // Generate ephemeral TURN credentials using the TURN REST API mechanism
    const expiry = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours validity
    const generatedUsername = `${expiry}:${userId}`;
    const generatedPassword = crypto
      .createHmac('sha1', webrtc.turnCredential)
      .update(generatedUsername)
      .digest('base64');

    iceServers.push({
      urls: turnUrls,
      username: generatedUsername,
      credential: generatedPassword,
      credentialType: 'password',
    });
  }

  return { iceServers };
};

// Leave consultation (patient) — signal the patient has left the video call
// Unlike endConsultation (doctor-only), this just emits a socket event and returns OK.
const leaveConsultation = async (patientUserId, consultationId) => {
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', patientUserId)
    .single();

  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  // Verify patient is a participant
  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, doctor_id, patient_id, status')
    .eq('id', consultationId)
    .eq('patient_id', patient.id)
    .single();

  if (!consultation) {
    throw new ApiError(404, 'Consultation not found or unauthorized');
  }

  // Get doctor's user_id for notification
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('user_id')
    .eq('id', consultation.doctor_id)
    .single();

  // Emit event so doctor's UI shows "Patient left the call"
  eventEmitter.emitConsultationPatientLeft({
    consultationId,
    patientUserId,
    doctorUserId: doctor?.user_id,
    timestamp: new Date().toISOString(),
  });

  return { message: 'Left consultation' };
};

const deriveReminderTimes = (frequency = '') => {
  const f = String(frequency || '').toLowerCase();

  // Try explicit times first: 08:00, 8:30 pm, etc.
  const explicit = [];
  const explicitRegex = /(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)/gi;
  for (const match of f.matchAll(explicitRegex)) {
    explicit.push(match[1]);
  }
  if (explicit.length > 0) return explicit;

  const slots = [];
  if (f.includes('morning')) slots.push('08:00');
  if (f.includes('afternoon')) slots.push('14:00');
  if (f.includes('evening')) slots.push('19:00');
  if (f.includes('night') || f.includes('bedtime')) slots.push('22:00');
  if (slots.length > 0) return slots;

  if (f.includes('thrice') || f.includes('three times') || f.includes('3 times')) {
    return ['08:00', '14:00', '20:00'];
  }
  if (f.includes('twice') || f.includes('two times') || f.includes('2 times')) {
    return ['09:00', '21:00'];
  }
  return ['09:00'];
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildLocalClinicalFallback = ({ query, vitalsData, patientHistory, doctor }) => {
  const alerts = [];
  const pushAlert = (code, metric, severity, message, threshold = null, currentValue = null) => {
    alerts.push({
      code,
      metric,
      severity,
      threshold,
      current_value: currentValue,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  if (vitalsData) {
    if (vitalsData.heart_rate > 120) {
      pushAlert('TACHYCARDIA', 'heart_rate', 'warning', `Tachycardia detected: ${vitalsData.heart_rate} bpm`, 120, vitalsData.heart_rate);
    }
    if (vitalsData.heart_rate && vitalsData.heart_rate < 50) {
      pushAlert('BRADYCARDIA', 'heart_rate', 'warning', `Bradycardia detected: ${vitalsData.heart_rate} bpm`, 50, vitalsData.heart_rate);
    }
    if (vitalsData.spo2 && vitalsData.spo2 < 92) {
      pushAlert('LOW_SPO2', 'spo2', 'critical', `Low SpO2 detected: ${vitalsData.spo2}%`, 92, vitalsData.spo2);
    }
    if (vitalsData.respiration_rate > 25) {
      pushAlert('TACHYPNEA', 'respiration_rate', 'warning', `Elevated respiratory rate: ${vitalsData.respiration_rate}/min`, 25, vitalsData.respiration_rate);
    }
    if (vitalsData.temperature > 38.5) {
      pushAlert('FEVER', 'temperature', 'warning', `Fever-range temperature detected: ${vitalsData.temperature}°C`, 38.5, vitalsData.temperature);
    }
    if (vitalsData.temperature && vitalsData.temperature < 35.5) {
      pushAlert('HYPOTHERMIA', 'temperature', 'critical', `Low temperature detected: ${vitalsData.temperature}°C`, 35.5, vitalsData.temperature);
    }
    if (vitalsData.stress_level === 'critical' || vitalsData.stress_level === 'high') {
      pushAlert('ELEVATED_STRESS', 'stress_level', vitalsData.stress_level === 'critical' ? 'critical' : 'warning', `Elevated stress/HRV signal: ${vitalsData.stress_level}`, null, vitalsData.stress_level);
    }
    if (vitalsData.drowsiness_score > 0.8) {
      pushAlert('DROWSINESS', 'drowsiness_score', 'warning', `Severe drowsiness detected: ${Math.round(vitalsData.drowsiness_score * 100)}%`, 0.8, vitalsData.drowsiness_score);
    }
    if (vitalsData.fall_detected) {
      pushAlert('FALL_DETECTED', 'fall_detected', 'critical', 'Fall detected during consultation', null, true);
    }
    if (vitalsData.pain_score >= 7) {
      pushAlert('SEVERE_PAIN', 'pain_score', 'critical', `Severe pain score detected: ${vitalsData.pain_score}/10`, 7, vitalsData.pain_score);
    }
    if (vitalsData.facial_asymmetry_score > 0.35) {
      pushAlert('FACIAL_ASYMMETRY', 'facial_asymmetry_score', 'critical', 'Significant facial asymmetry detected; consider urgent neuro screen', 0.35, vitalsData.facial_asymmetry_score);
    }
    if (vitalsData.tremor_detected && vitalsData.tremor_severity > 6) {
      pushAlert('TREMOR', 'tremor_severity', 'warning', `Marked tremor detected: ${vitalsData.tremor_severity}/10`, 6, vitalsData.tremor_severity);
    }
    if (vitalsData.pallor_score > 0.5) {
      pushAlert('PALLOR', 'pallor_score', 'warning', 'Pallor signal detected; consider anemia/perfusion correlation', 0.5, vitalsData.pallor_score);
    }
    if (vitalsData.blood_pressure_systolic > 180) {
      pushAlert('SEVERE_HYPERTENSION', 'blood_pressure_systolic', 'critical', `Severely elevated systolic BP: ${vitalsData.blood_pressure_systolic} mmHg`, 180, vitalsData.blood_pressure_systolic);
    }
  }

  const vitalsLine = vitalsData
    ? [
        vitalsData.heart_rate ? `HR ${vitalsData.heart_rate} bpm` : null,
        vitalsData.respiration_rate ? `RR ${vitalsData.respiration_rate}/min` : null,
        vitalsData.spo2 ? `SpO2 ${vitalsData.spo2}%` : null,
        vitalsData.temperature ? `Temp ${vitalsData.temperature}°C` : null,
        vitalsData.blood_pressure_systolic ? `BP ${vitalsData.blood_pressure_systolic}/${vitalsData.blood_pressure_diastolic || '?'} mmHg` : null,
        vitalsData.stress_level ? `Stress ${vitalsData.stress_level}` : null,
        vitalsData.pain_score ? `Pain ${vitalsData.pain_score}/10` : null,
        vitalsData.drowsiness_score ? `Drowsiness ${Math.round(vitalsData.drowsiness_score * 100)}%` : null,
      ].filter(Boolean).join(', ') || 'No numeric live vitals available'
    : 'No live vitals available';

  const highRisk = alerts.some((alert) => alert.severity === 'critical');
  const answer = [
    'Local clinical fallback is active because the external AI reasoning service is unavailable.',
    `Request: ${String(query || '').slice(0, 240)}`,
    `Live context: ${vitalsLine}.`,
    patientHistory ? `Patient context: ${patientHistory}.` : null,
    alerts.length > 0
      ? `Immediate flags: ${alerts.map((alert) => alert.message).join('; ')}.`
      : 'No rule-based danger signs were detected from the available vitals.',
    highRisk
      ? 'Prioritize direct clinical assessment and escalation before routine prescribing.'
      : 'Use this as a safety checklist while continuing the consultation.',
  ].filter(Boolean).join('\n\n');

  return {
    response: {
      answer,
      alerts,
      possible_conditions: [],
      suggested_questions: [
        'Can you describe onset, duration, and severity of the main symptom?',
        'Any chest pain, breathlessness, weakness, confusion, or fainting?',
        'Any allergies, pregnancy, chronic illness, or current medicines?',
      ],
      summary: alerts.length > 0 ? 'Rule-based fallback found vitals requiring review.' : 'Rule-based fallback found no critical vitals from available data.',
      clinical_notes: `Fallback generated locally in Node for Dr. ${doctor?.name || 'Doctor'}; verify clinically before acting.`,
      risk_indicators: alerts.map((alert) => alert.message),
      severity_assessment: highRisk ? 'critical' : alerts.length > 0 ? 'warning' : 'mild',
      suggested_medications: [],
      differential_diagnoses: [],
      recommended_tests: highRisk ? ['Repeat vitals with clinical-grade device', 'Focused physical examination'] : [],
      vitals_interpretation: vitalsLine,
    },
    provider: 'local-rule-fallback',
    latencyMs: 0,
  };
};

const generateAndUploadPrescriptionPdfWithRetry = async ({
  prescription,
  doctor,
  patient,
  consultationPatientId,
  enrichedItems,
}) => {
  const { isStorageAvailable, uploadBuffer } = require('../config/minio');
  if (!isStorageAvailable()) {
    return null;
  }

  const maxAttempts = Math.max(1, Number(process.env.PRESCRIPTION_PDF_UPLOAD_RETRIES || 3));
  const baseDelayMs = Math.max(100, Number(process.env.PRESCRIPTION_PDF_UPLOAD_RETRY_DELAY_MS || 400));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { generatePrescriptionPdf } = require('../utils/prescriptionPdf');

      const pdfBuffer = await generatePrescriptionPdf({
        ...prescription,
        doctor: { name: doctor.name, specialization: null },
        patient: { name: patient?.name, phone: patient?.phone },
        prescription_medicines: enrichedItems.map(item => ({
          medicine_name: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
          quantity: item.quantity,
          generic_name: item.generic_name || null,
          before_food: item.beforeFood || false,
          is_critical: item.isCritical || false,
        })),
      });

      if (!pdfBuffer) return null;

      const pdfObjectName = `prescriptions/${consultationPatientId}/${prescription.id}.pdf`;
      const uploadResult = await uploadBuffer(pdfObjectName, pdfBuffer, 'application/pdf');

      await supabaseAdmin
        .from('prescriptions')
        .update({ pdf_url: uploadResult.url, file_url: uploadResult.url })
        .eq('id', prescription.id);

      return uploadResult.url;
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw err;
      }
      const backoffMs = baseDelayMs * (2 ** (attempt - 1));
      await sleep(backoffMs);
    }
  }

  return null;
};

const createMedicineRemindersFromPrescription = async (patientId, prescriptionId, items = []) => {
  if (!patientId || !Array.isArray(items) || items.length === 0) return;

  const reminders = [];
  for (const item of items) {
    const times = deriveReminderTimes(item.frequency);
    for (const time of times) {
      reminders.push({
        patient_id: patientId,
        title: `${item.medicineName}${item.dosage ? ` (${item.dosage})` : ''}`,
        type: 'medicine',
        time,
        days: [],
        notes: item.instructions || `Prescription ${prescriptionId}`,
        is_active: true,
      });
    }
  }

  // Best-effort only (non-blocking)
  if (reminders.length > 0) {
    const { error } = await supabaseAdmin.from('reminders').insert(reminders);
    if (error) {
      console.warn('[ConsultationService] Reminder auto-create skipped:', error.message);
    }
  }
};

// Add prescription
const addPrescription = async (doctorUserId, consultationId, prescriptionData) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, name')
    .eq('user_id', doctorUserId)
    .single();

  // Verify consultation belongs to doctor AND is in valid status
  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, patient_id, status')
    .eq('id', consultationId)
    .eq('doctor_id', doctor?.id)
    .single();

  if (!consultation) {
    throw new ApiError(404, 'Consultation not found or unauthorized');
  }

  // Allow prescriptions only during active or recently completed consultations
  const allowedStatuses = ['in_progress', 'completed'];
  if (!allowedStatuses.includes(consultation.status)) {
    throw new ApiError(400, `Cannot add prescription to a ${consultation.status} consultation`);
  }

  // Prevent accidental duplicate writes (double-click/retry). Allow override when explicitly requested.
  if (!prescriptionData.allowMultiplePrescriptions) {
    const { data: existingPrescription, error: existingError } = await supabaseAdmin
      .from('prescriptions')
      .select('id, created_at, prescription_number')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingPrescription) {
      throw new ApiError(
        409,
        `Prescription already exists for this consultation (${existingPrescription.prescription_number || existingPrescription.id})`
      );
    }
  }

  // Fix #32: Generate a unique prescription number with crypto-secure randomness (8 chars)
  const crypto = require('crypto');
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  const prescriptionNumber = `RX-${datePart}-${randomPart}`;

  // Validate medicines against drug catalog (non-blocking — warns for unknown)
  let catalogWarnings = [];
  let enrichedItems = prescriptionData.items || [];
  try {
    const medicineService = require('./medicineService');
    const validation = await medicineService.validatePrescribedMedicines(enrichedItems);
    enrichedItems = validation.items;
    catalogWarnings = validation.warnings;
  } catch (valErr) {
    console.error('[ConsultationService] Drug catalog validation skipped:', valErr.message);
  }

  // Build medicines JSONB for backward compatibility
  const medicinesJson = enrichedItems.map(item => ({
    medicine_name: item.medicineName,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions || null,
    quantity: item.quantity || null,
  }));

  // Create prescription
  const validFrom = new Date().toISOString().slice(0, 10);
  // Default validity: 30 days (configurable per prescription)
  const validityDays = prescriptionData.validityDays || 30;
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + validityDays);
  const validUntil = validUntilDate.toISOString().slice(0, 10);

  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .insert({
      consultation_id: consultationId,
      doctor_id: doctor.id,
      patient_id: consultation.patient_id,
      diagnosis: prescriptionData.diagnosis,
      notes: prescriptionData.notes,
      prescription_number: prescriptionNumber,
      medicines: medicinesJson,
      valid_from: validFrom,
      valid_until: validUntil,
      dietary_advice: prescriptionData.dietaryAdvice || null,
      lifestyle_advice: prescriptionData.lifestyleAdvice || null,
      instructions: prescriptionData.instructions || null,
      file_url: prescriptionData.fileUrl || null,
    })
    .select('*')
    .single();

  if (error) throw error;

  // Add prescription medicines (with rollback on failure for atomicity)
  if (enrichedItems.length > 0) {
    const medicines = enrichedItems.map((item) => ({
      prescription_id: prescription.id,
      medicine_name: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity: item.quantity,
      generic_name: item.generic_name || null,
      before_food: item.beforeFood || false,
      is_critical: item.isCritical || false,
    }));

    const { error: medError } = await supabaseAdmin.from('prescription_medicines').insert(medicines);

    if (medError) {
      // Rollback: delete the orphaned prescription header
      await supabaseAdmin.from('prescriptions').delete().eq('id', prescription.id);
      throw medError;
    }
  }

  // Get patient user_id
  const { data: patientProfile } = await supabaseAdmin
    .from('patients')
    .select('user_id, name')
    .eq('id', consultation.patient_id)
    .single();

  let patient = patientProfile ? {
    user_id: patientProfile.user_id,
    name: patientProfile.name,
    phone: null,
  } : null;

  if (patient?.user_id) {
    const { data: patientUser } = await supabaseAdmin
      .from('users')
      .select('phone')
      .eq('id', patient.user_id)
      .single();

    patient.phone = patientUser?.phone || null;
  }

  // Generate PDF (non-blocking — don't fail prescription creation if PDF fails)
  try {
    const pdfUrl = await generateAndUploadPrescriptionPdfWithRetry({
      prescription,
      doctor,
      patient,
      consultationPatientId: consultation.patient_id,
      enrichedItems,
    });
    if (pdfUrl) prescription.pdf_url = pdfUrl;
  } catch (pdfErr) {
    console.error('[ConsultationService] PDF generation failed (non-blocking):', pdfErr.message);
  }

  eventEmitter.emitPrescriptionCreated({
    ...prescription,
    patient_id: patient?.user_id,
    doctor_name: doctor.name,
  });

  // Persist notification so patient sees it even if offline
  if (patient?.user_id) {
    const { enqueueNotification } = require('./notificationQueueService');
    await enqueueNotification(patient.user_id, {
      title: '💊 New Prescription',
      message: `Dr. ${doctor.name} has written a prescription for you`,
      type: 'prescription_created',
      data: {
        prescriptionId: prescription.id,
        consultationId,
        doctorName: doctor.name,
        idempotencyKey: `prescription-created:${prescription.id}`,
      },
    });
  }

  // Auto-create medicine reminders in background so API response is not blocked by DB latency
  createMedicineRemindersFromPrescription(consultation.patient_id, prescription.id, enrichedItems)
    .catch((reminderErr) => {
      console.warn('[ConsultationService] Reminder auto-create failed (non-blocking):', reminderErr.message);
    });

  return { ...prescription, catalogWarnings };
};

// ==================== AI-ASSISTED CONSULTATION (via FastAPI) ====================

/**
 * Doctor-facing AI assistant during active consultation.
 * Proxies to the FastAPI AI microservice (swastik-ai-service).
 * Sends vitals context from the real-time pipeline for richer reasoning.
 */
const aiAssistDoctor = async (doctorUserId, consultationId, query, context = {}) => {
  const featureToggleService = require('./featureToggleService');

  // 1. Verify doctor owns this consultation
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, user_id, name, specialization')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) throw new ApiError(403, 'Doctor profile not found');

  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, status, diagnosis, notes, appointment_id, doctor_id, patient_id')
    .eq('id', consultationId)
    .eq('doctor_id', doctor.id)
    .single();

  if (!consultation) throw new ApiError(404, 'Consultation not found or unauthorized');

  if (consultation.status !== 'in_progress') {
    throw new ApiError(400, 'AI assistant is only available during active consultations');
  }

  // 2. Rate limit: 50 AI requests per doctor per day
  if (cacheIncr) {
    const rateLimitKey = `doctor_ai:${doctorUserId}:${new Date().toISOString().slice(0, 10)}`;
    const count = await cacheIncr(rateLimitKey, 86400);
    if (count !== null && count > 50) {
      throw new ApiError(429, 'Daily AI assistant limit reached (50/day). Resets at midnight.');
    }
  }

  let vitalsData = null;
  try {
    const vitalsService = require('./vitalsService');
    let latestVitals = context.vitals;
    if (!latestVitals) {
      latestVitals = await vitalsService.getLatest(consultationId);
    }
    
    if (latestVitals) {
      vitalsData = await featureToggleService.filterVitalsByToggles(doctorUserId, latestVitals);
    }
  } catch (err) {
    console.warn('[ConsultationService] Failed to load latest vitals for AI assist:', err.message);
  }

  // 5. Get patient history
  let patientHistory = '';
  let patientName = '';
  try {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('name, blood_group, allergies, chronic_conditions, emergency_contact')
      .eq('id', consultation.patient_id)
      .single();

    if (patient) {
      patientName = patient.name;
      const parts = [];
      if (patient.blood_group) parts.push(`Blood Group: ${patient.blood_group}`);
      if (patient.allergies) parts.push(`Allergies: ${patient.allergies}`);
      if (patient.chronic_conditions) parts.push(`Chronic Conditions: ${patient.chronic_conditions}`);
      patientHistory = parts.join(', ') || 'No medical history on file';
    }
  } catch {}

  // 6. Call FastAPI AI service
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const axios = require('axios');

  const requestPayload = {
    consultation_id: consultationId,
    doctor_name: doctor.name,
    doctor_specialization: doctor.specialization || 'General Medicine',
    patient_name: patientName || '',
    symptoms: (context.symptoms || '').slice(0, 500),
    vitals: vitalsData,
    history: patientHistory,
    diagnosis_notes: (consultation.diagnosis || '').slice(0, 500),
    query,
  };

  try {
    // Get the doctor's JWT token to forward to FastAPI
    const jwt = require('jsonwebtoken');
    const tempToken = jwt.sign(
      { userId: doctorUserId, id: doctorUserId, role: 'doctor' },
      config.jwt.accessSecret,
      { expiresIn: '1m' }
    );

    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/consult`, requestPayload, {
      headers: {
        'Authorization': `Bearer ${tempToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data?.success) {
      return response.data.data;
    }
    if (response.data?.response || response.data?.answer) {
      return response.data;
    }

    throw new Error('FastAPI returned unsuccessful response');
  } catch (err) {
    console.warn('[ConsultationService] FastAPI AI unavailable; using local clinical fallback:', err.message);
    return buildLocalClinicalFallback({ query, vitalsData, patientHistory, doctor });
  }
};

// Generate AI Clinical Summary at the end or during consultation
const generateClinicalSummary = async (doctorUserId, consultationId, clientVitalsHistory = null) => {
  const axios = require('axios');
  const jwt = require('jsonwebtoken');

  // 1. Verify doctor owns this consultation
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, user_id, name, specialization')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) throw new ApiError(403, 'Doctor profile not found');

  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, status, diagnosis, notes, appointment_id, doctor_id, patient_id, appointment:appointments(symptoms), patient:patients(name, blood_group, allergies, chronic_conditions, emergency_contact)')
    .eq('id', consultationId)
    .eq('doctor_id', doctor.id)
    .single();

  if (!consultation) throw new ApiError(404, 'Consultation not found or unauthorized');

  let patientHistory = '';
  if (consultation.patient) {
    const parts = [];
    if (consultation.patient.blood_group) parts.push(`Blood Group: ${consultation.patient.blood_group}`);
    if (consultation.patient.allergies) parts.push(`Allergies: ${consultation.patient.allergies}`);
    if (consultation.patient.chronic_conditions) parts.push(`Chronic Conditions: ${consultation.patient.chronic_conditions}`);
    patientHistory = parts.join(', ') || 'No medical history on file';
  }

  // 2. Fetch live CV vitals history. Use client-provided history as primary, fallback to backend store.
  let vitalsHistory = [];
  try {
    if (clientVitalsHistory && Array.isArray(clientVitalsHistory) && clientVitalsHistory.length > 0) {
      vitalsHistory = clientVitalsHistory;
    } else {
      const vitalsService = require('./vitalsService');
      vitalsHistory = await vitalsService.getHistory(consultationId, 30);
    }
  } catch (err) {
    console.warn('[ConsultationService] Could not fetch vitals history for summary:', err.message);
  }

  // 3. Fetch prescriptions if any exist
  let prescriptions = [];
  try {
    const { data: rxRecords } = await supabaseAdmin
      .from('prescriptions')
      .select('id, diagnosis, notes, medicines, dietary_advice, lifestyle_advice')
      .eq('consultation_id', consultationId);
    if (rxRecords) prescriptions = rxRecords;
  } catch (err) {}

  // 4. Call FastAPI AI Service
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  const requestPayload = {
    consultation_id: consultationId,
    doctor_name: doctor.name,
    patient_name: consultation.patient?.name || '',
    symptoms: consultation.appointment?.symptoms || '',
    history: patientHistory,
    transcript: consultation.notes || '',
    diagnosis: consultation.diagnosis || '',
    prescriptions: prescriptions,
    vitals_history: vitalsHistory
  };

  try {
    const tempToken = jwt.sign(
      { userId: doctorUserId, id: doctorUserId, role: 'doctor' },
      config.jwt.accessSecret,
      { expiresIn: '1m' }
    );

    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/summarize`, requestPayload, {
      headers: {
        'Authorization': `Bearer ${tempToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.data?.success) {
      return response.data.data;
    }
    throw new Error('FastAPI summary endpoint failed');
  } catch (err) {
    console.warn('[ConsultationService] FastAPI AI summarize failed:', err.message);
    
    // Fallback if AI service is down
    return {
      summary: {
        consultation_summary: "AI Service is temporarily unavailable. Summary could not be generated.",
        key_findings: ["System unavailable"],
        vitals_summary: "Not analyzed",
        cv_signals_used: [],
        treatment_plan: "Please rely on manual prescriptions.",
        severity_assessment: "mild"
      },
      provider: "fallback"
    };
  }
};

module.exports = {
  getConsultationHistory,
  startConsultation,
  joinConsultation,
  getConsultation,
  getIceServers,
  endConsultation,
  leaveConsultation,
  addPrescription,
  aiAssistDoctor,
  generateClinicalSummary,
  _internals: {
    buildTurnUrlVariants,
  },
};
