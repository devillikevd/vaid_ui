/**
 * Appointment Service
 * Handles booking, scheduling, cancellation, and rescheduling
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const eventEmitter = require('./eventEmitter');

// Get appointments for a user (patient or doctor)
const getAppointments = async (userId, role, filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin.from('appointments').select('*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name, phone)', { count: 'exact' });

  // Filter by role
  if (role === 'patient') {
    // Resolve patient record ID from user ID (patient_id is FK to patients table, not users)
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (!patient) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    query = query.eq('patient_id', patient.id);
  } else if (role === 'doctor') {
    // Find doctor record first
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (!doctor) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    query = query.eq('doctor_id', doctor.id);
  } else if (role === 'hospital_owner') {
    // Fix #27: Scope to doctors affiliated with this hospital owner's hospitals
    const { data: hospitals } = await supabaseAdmin.from('hospitals').select('id').eq('owner_id', userId);
    const hospitalIds = (hospitals || []).map(h => h.id);
    if (hospitalIds.length > 0) {
      const { data: doctors } = await supabaseAdmin.from('doctors').select('id').in('hospital_id', hospitalIds);
      const doctorIds = (doctors || []).map(d => d.id);
      if (doctorIds.length > 0) {
        query = query.in('doctor_id', doctorIds);
      } else {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
    } else {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  } else if (role === 'clinic_owner') {
    // Fix #27: Scope to doctors affiliated with this clinic owner's clinics
    const { data: clinics } = await supabaseAdmin.from('clinics').select('id').eq('owner_id', userId);
    const clinicIds = (clinics || []).map(c => c.id);
    if (clinicIds.length > 0) {
      const { data: doctors } = await supabaseAdmin.from('doctors').select('id').in('clinic_id', clinicIds);
      const doctorIds = (doctors || []).map(d => d.id);
      if (doctorIds.length > 0) {
        query = query.in('doctor_id', doctorIds);
      } else {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
    } else {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  } else if (!['admin', 'super_admin'].includes(role)) {
    // Fix #27: Unknown roles get no appointments
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  // Apply filters
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.fromDate) query = query.gte('appointment_date', filters.fromDate);
  if (filters.toDate) query = query.lte('appointment_date', filters.toDate);
  if (filters.upcoming) {
    query = query.gte('appointment_date', new Date().toISOString().split('T')[0]).in('status', ['scheduled', 'confirmed']);
  }
  // Incremental sync: only return records modified after a given timestamp
  if (filters.since) {
    query = query.gte('updated_at', filters.since);
  }

  const { data, error, count } = await query
    .order('appointment_date', { ascending: true })
    .order('time_slot', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

// Book a new appointment
const bookAppointment = async (patientId, appointmentData) => {
  const { doctorId, date, timeSlot, type, notes, hospitalId } = appointmentData;

  // Get patient record
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id, name')
    .eq('user_id', patientId)
    .single();

  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  // Verify doctor exists
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, user_id, name, consultation_fee')
    .eq('id', doctorId)
    .single();

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Atomic conflict-check + insert via PostgreSQL RPC (prevents double-booking race condition)
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('rpc_book_appointment', {
    p_patient_id: patient.id,
    p_doctor_id: doctorId,
    p_appointment_date: date,
    p_time_slot: timeSlot,
    p_type: type || 'clinic',
    p_notes: notes || null,
    p_hospital_id: hospitalId || null,
    p_fee: doctor.consultation_fee,
  });

  if (rpcError) {
    // Fallback: unique index will also catch double-booking (23505 = unique_violation)
    if (rpcError.code === '23505') {
      throw new ApiError(409, 'This time slot is already booked');
    }
    throw rpcError;
  }

  if (!rpcResult?.success) {
    throw new ApiError(409, 'This time slot is already booked');
  }

  // Fetch the full appointment with relations
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select('*, doctor:doctors(id, name, specialization), patient:patients(id, name, phone)')
    .eq('id', rpcResult.appointment_id)
    .single();

  if (error) throw error;

  // Resolve hospital/clinic owner for real-time dashboard notifications
  let hospital_owner_id = null;
  let clinic_owner_id = null;
  if (hospitalId) {
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('owner_id')
      .eq('id', hospitalId)
      .single();
    hospital_owner_id = hospital?.owner_id || null;
  }
  // Also check if doctor is linked to a clinic
  const { data: clinicLink } = await supabaseAdmin
    .from('clinic_doctors')
    .select('clinic_id, clinic:clinics(owner_id)')
    .eq('doctor_id', doctorId)
    .limit(1)
    .maybeSingle();
  if (clinicLink?.clinic?.owner_id) {
    clinic_owner_id = clinicLink.clinic.owner_id;
  }

  // Emit event — use user_ids (not table FKs) for Socket.IO routing
  eventEmitter.emitAppointmentBooked({
    ...appointment,
    doctor_id: doctor.user_id,
    patient_id: patientId,
    hospital_owner_id,
    clinic_owner_id,
  });

  return appointment;
};

// Get appointment by ID
const getAppointmentById = async (userId, role, appointmentId) => {
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url, consultation_fee), patient:patients(id, name, phone, blood_group)')
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Authorization: verify requesting user is the doctor or patient of this appointment
  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (!patient || appointment.patient_id !== patient.id) {
      throw new ApiError(403, 'Unauthorized to view this appointment');
    }
  } else if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (!doctor || appointment.doctor_id !== doctor.id) {
      throw new ApiError(403, 'Unauthorized to view this appointment');
    }
  }
  // hospital_owner, clinic_owner, admin roles can view any appointment

  return appointment;
};

// Valid appointment status transitions (state machine)
const VALID_TRANSITIONS = {
  scheduled:    ['confirmed', 'cancelled', 'no_show'],
  confirmed:    ['in_progress', 'completed', 'cancelled', 'no_show'],
  in_progress:  ['completed', 'cancelled'],
  completed:    [],                    // terminal state
  cancelled:    [],                    // terminal state
  no_show:      ['scheduled'],         // can be rescheduled
};

// Update appointment status (doctor)
const updateAppointmentStatus = async (doctorUserId, appointmentId, status, reason) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id')
    .eq('user_id', doctorUserId)
    .single();

  // Fetch current status first to validate transition
  const { data: current } = await supabaseAdmin
    .from('appointments')
    .select('status')
    .eq('id', appointmentId)
    .eq('doctor_id', doctor?.id)
    .single();

  if (!current) {
    throw new ApiError(404, 'Appointment not found or unauthorized');
  }

  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed || !allowed.includes(status)) {
    throw new ApiError(400, `Cannot transition from '${current.status}' to '${status}'`);
  }

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({ status, cancellation_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .eq('doctor_id', doctor?.id)
    .select('*, doctor:doctors(id, name, specialization), patient:patients(id, name, phone)')
    .single();

  if (error || !appointment) {
    throw new ApiError(404, 'Appointment not found or unauthorized');
  }

  // Resolve patient user_id for correct Socket.IO routing
  const { data: patientUser } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', appointment.patient_id)
    .single();

  eventEmitter.emitAppointmentUpdated({
    ...appointment,
    doctor_id: doctorUserId,
    patient_id: patientUser?.user_id || appointment.patient_id,
  });
  return appointment;
};

// Cancel appointment (patient)
const cancelAppointment = async (patientUserId, appointmentId, reason) => {
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', patientUserId)
    .single();

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelled by patient',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
    .eq('patient_id', patient?.id)
    .in('status', ['scheduled', 'confirmed'])
    .select('*')
    .single();

  if (error || !appointment) {
    throw new ApiError(404, 'Appointment not found or cannot be cancelled');
  }

  // Resolve doctor user_id for correct Socket.IO routing
  const { data: doctorUser } = await supabaseAdmin
    .from('doctors')
    .select('user_id, name, specialization')
    .eq('id', appointment.doctor_id)
    .single();

  eventEmitter.emitAppointmentCancelled({
    ...appointment,
    patient_id: patientUserId,
    doctor_id: doctorUser?.user_id || appointment.doctor_id,
  });
  return appointment;
};

// Reschedule appointment
const rescheduleAppointment = async (userId, role, appointmentId, date, timeSlot) => {
  // Fetch current appointment
  const { data: existingAppt } = await supabaseAdmin
    .from('appointments')
    .select('doctor_id, patient_id, status')
    .eq('id', appointmentId)
    .single();

  if (!existingAppt) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Only allow rescheduling of scheduled/confirmed appointments
  if (!['scheduled', 'confirmed'].includes(existingAppt.status)) {
    throw new ApiError(400, 'Only scheduled or confirmed appointments can be rescheduled');
  }

  // Authorization: verify the requesting user owns this appointment
  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (!patient || existingAppt.patient_id !== patient.id) {
      throw new ApiError(403, 'Unauthorized to reschedule this appointment');
    }
  } else if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (!doctor || existingAppt.doctor_id !== doctor.id) {
      throw new ApiError(403, 'Unauthorized to reschedule this appointment');
    }
  }
  // admin, hospital_owner, clinic_owner can reschedule any

  const { data: conflicts } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('doctor_id', existingAppt.doctor_id)
    .eq('appointment_date', date)
    .eq('time_slot', timeSlot)
    .in('status', ['scheduled', 'confirmed'])
    .neq('id', appointmentId)
    .limit(1);

  if (conflicts && conflicts.length > 0) {
    throw new ApiError(409, 'The new time slot is already booked');
  }

  // Atomic update: re-check status hasn't changed since our read (TOCTOU guard)
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({
      appointment_date: date,
      time_slot: timeSlot,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)
    .in('status', ['scheduled', 'confirmed']) // ensures status hasn't changed since we checked
    .select('*')
    .single();

  if (error || !appointment) {
    throw new ApiError(409, 'Appointment was modified by another request. Please try again.');
  }

  // Resolve both user_ids for correct Socket.IO routing
  const { data: doctorUser } = await supabaseAdmin
    .from('doctors')
    .select('user_id')
    .eq('id', appointment.doctor_id)
    .single();
  const { data: patientUser } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', appointment.patient_id)
    .single();

  eventEmitter.emitAppointmentUpdated({
    ...appointment,
    doctor_id: doctorUser?.user_id || appointment.doctor_id,
    patient_id: patientUser?.user_id || appointment.patient_id,
  });
  return appointment;
};

module.exports = {
  getAppointments,
  bookAppointment,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
};
