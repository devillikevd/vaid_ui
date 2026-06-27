/**
 * Appointment Service
 * Handles booking, scheduling, cancellation, and rescheduling
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const eventEmitter = require('./eventEmitter');
const notificationService = require('./notificationService');

const APPOINTMENT_SELECT = `
  *,
  doctor:doctors(id, name, specialization, profile_image_url, consultation_fee),
  patient:patients(id, name, blood_group),
  hospital:hospitals(id, name, address, city, type),
  clinic:clinics(id, name, address, city)
`;

const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress'];

const attachConsultationContext = async (appointments = []) => {
  if (!appointments.length) return appointments;

  const appointmentIds = appointments.map((appointment) => appointment.id).filter(Boolean);
  if (appointmentIds.length === 0) return appointments;

  const { data: consultations, error: consultationError } = await supabaseAdmin
    .from('consultations')
    .select('id, appointment_id, status, room_id, started_at, ended_at, created_at')
    .in('appointment_id', appointmentIds)
    .order('created_at', { ascending: false });

  if (consultationError) throw consultationError;

  const latestConsultationByAppointmentId = new Map();
  const consultationIds = [];
  for (const consultation of consultations || []) {
    if (!consultation?.appointment_id) continue;
    if (!latestConsultationByAppointmentId.has(consultation.appointment_id)) {
      latestConsultationByAppointmentId.set(consultation.appointment_id, consultation);
      consultationIds.push(consultation.id);
    }
  }

  let prescriptionConsultationIds = new Set();
  if (consultationIds.length > 0) {
    const { data: rxRows, error: rxError } = await supabaseAdmin
      .from('prescriptions')
      .select('id, consultation_id')
      .in('consultation_id', consultationIds);
    if (rxError) throw rxError;
    prescriptionConsultationIds = new Set((rxRows || []).map((row) => row.consultation_id).filter(Boolean));
  }

  return appointments.map((appointment) => {
    const consultation = latestConsultationByAppointmentId.get(appointment.id) || null;
    return {
      ...appointment,
      consultation_id: consultation?.id || null,
      consultation_status: consultation?.status || null,
      consultation_room_id: consultation?.room_id || consultation?.id || null,
      has_prescription: consultation ? prescriptionConsultationIds.has(consultation.id) : false,
    };
  });
};

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

// Get appointments for a user (patient or doctor)
const getAppointments = async (userId, role, filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin.from('appointments').select(APPOINTMENT_SELECT, { count: 'exact' });

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
  } else if (role === 'hospital_owner' || role === 'hospital_manager') {
    const hospitalIds = await getAccessibleHospitalIds(userId);
    if (hospitalIds.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    const doctorIds = await getActiveHospitalDoctorIds(hospitalIds);
    if (doctorIds.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    query = query.in('hospital_id', hospitalIds).in('doctor_id', doctorIds);
  } else if (role === 'clinic_owner') {
    const clinicIds = await getAccessibleClinicIds(userId);
    if (clinicIds.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    const doctorIds = await getActiveClinicDoctorIds(clinicIds);
    if (doctorIds.length === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    query = query.in('clinic_id', clinicIds).in('doctor_id', doctorIds);
  } else if (!['admin', 'super_admin'].includes(role)) {
    // Fix #27: Unknown roles get no appointments
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  // Apply filters
  if (filters.status) {
    if (['active', 'upcoming'].includes(String(filters.status).toLowerCase())) {
      query = query.in('status', ACTIVE_APPOINTMENT_STATUSES);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.fromDate) query = query.gte('appointment_date', filters.fromDate);
  if (filters.toDate) query = query.lte('appointment_date', filters.toDate);
  if (filters.upcoming) {
    query = query.gte('appointment_date', new Date().toISOString().split('T')[0]).in('status', ['scheduled', 'confirmed', 'in_progress']);
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

  let appointments = await attachConsultationContext(data || []);

  // Check if each appointment has been reviewed
  if (appointments.length > 0) {
    const appointmentIds = appointments.map(a => a.id);

    // Find consultations linked to these appointments
    const { data: consultations } = await supabaseAdmin
      .from('consultations')
      .select('id, appointment_id')
      .in('appointment_id', appointmentIds);

    const consultIds = (consultations || []).map(c => c.id);
    const consultToAppt = new Map((consultations || []).map(c => [c.id, c.appointment_id]));

    // Find reviews linked to either the appointments directly or their consultations
    let reviews = [];
    const reviewTargets = [...appointmentIds, ...consultIds].filter(Boolean);
    if (reviewTargets.length > 0) {
      const reviewsResult = await supabaseAdmin
        .from('reviews')
        .select('consultation_id')
        .in('consultation_id', reviewTargets);
      if (reviewsResult.error) throw reviewsResult.error;
      reviews = reviewsResult.data || [];
    }

    const reviewedAppointmentIds = new Set();
    (reviews || []).forEach(r => {
      if (appointmentIds.includes(r.consultation_id)) {
        reviewedAppointmentIds.add(r.consultation_id);
      } else if (consultToAppt.has(r.consultation_id)) {
        reviewedAppointmentIds.add(consultToAppt.get(r.consultation_id));
      }
    });

    appointments = appointments.map(a => ({
      ...a,
      is_reviewed: reviewedAppointmentIds.has(a.id)
    }));
  }

  return {
    data: appointments,
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
  const { doctorId, date, timeSlot, type, notes, hospitalId, clinicId } = appointmentData;
  const normalizedType = type === 'in_person' ? 'clinic' : (type || 'clinic');

  if (hospitalId && clinicId) {
    throw new ApiError(400, 'Choose either a hospital or a clinic for this booking');
  }

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
    .select('id, user_id, name, consultation_fee, hospital_id')
    .eq('id', doctorId)
    .single();

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const [hospitalLinksResult, clinicLinksResult] = await Promise.all([
    supabaseAdmin
      .from('hospital_doctors')
      .select('hospital_id')
      .eq('doctor_id', doctorId)
      .eq('is_active', true),
    supabaseAdmin
      .from('clinic_doctors')
      .select('clinic_id, clinic:clinics(owner_id)')
      .eq('doctor_id', doctorId)
      .eq('is_active', true),
  ]);

  if (hospitalLinksResult.error) throw hospitalLinksResult.error;
  if (clinicLinksResult.error) throw clinicLinksResult.error;

  // Only treat accepted hospital roster associations as bookable hospital links.
  // The legacy doctors.hospital_id field is intentionally ignored here so
  // pending invites or stale historical affiliations do not leak into current
  // hospital booking/discovery behavior.
  const doctorHospitalIds = new Set(
    (hospitalLinksResult.data || []).map(link => link.hospital_id).filter(Boolean)
  );
  const doctorClinicLinks = clinicLinksResult.data || [];
  const doctorClinicIds = new Set(doctorClinicLinks.map(link => link.clinic_id).filter(Boolean));

  let resolvedHospitalId = hospitalId || null;
  let resolvedClinicId = clinicId || null;

  if (resolvedHospitalId && !doctorHospitalIds.has(resolvedHospitalId)) {
    throw new ApiError(400, 'Selected doctor is not affiliated with this hospital');
  }
  if (resolvedClinicId && !doctorClinicIds.has(resolvedClinicId)) {
    throw new ApiError(400, 'Selected doctor is not affiliated with this clinic');
  }

  if (!resolvedHospitalId && !resolvedClinicId) {
    if (doctorClinicIds.size === 1 && doctorHospitalIds.size === 0) {
      resolvedClinicId = Array.from(doctorClinicIds)[0];
    } else if (doctorHospitalIds.size === 1 && doctorClinicIds.size === 0) {
      resolvedHospitalId = Array.from(doctorHospitalIds)[0];
    }
  }

  // Generate appointment number: VD-YYYY-MMDD-NNNN
  const bookingDate = new Date(date);
  const yyyy = bookingDate.getFullYear();
  const mm = String(bookingDate.getMonth() + 1).padStart(2, '0');
  const dd = String(bookingDate.getDate()).padStart(2, '0');

  // Count existing appointments on this date to generate sequence
  const { count: existingCount } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('appointment_date', date);
  const seq = String((existingCount || 0) + 1).padStart(4, '0');
  const appointmentNumber = `VD-${yyyy}-${mm}${dd}-${seq}`;

  const insertPayload = {
    patient_id: patient.id,
    doctor_id: doctorId,
    appointment_date: date,
    time_slot: timeSlot,
    type: normalizedType,
    notes: notes || null,
    hospital_id: resolvedHospitalId,
    clinic_id: resolvedClinicId,
    fee: doctor.consultation_fee,
    consultation_fee: doctor.consultation_fee,
    status: 'scheduled',
    appointment_number: appointmentNumber,
  };

  const { data: insertedAppointment, error: insertError } = await supabaseAdmin
    .from('appointments')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw new ApiError(409, 'This time slot is already booked');
    }
    throw insertError;
  }

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', insertedAppointment.id)
    .single();

  if (error) throw error;

  // Resolve hospital/clinic owner for real-time dashboard notifications
  let hospital_owner_id = null;
  let clinic_owner_id = null;
  if (resolvedHospitalId) {
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('owner_id')
      .eq('id', resolvedHospitalId)
      .single();
    hospital_owner_id = hospital?.owner_id || null;
  }
  if (resolvedClinicId) {
    const clinicLink = doctorClinicLinks.find(link => link.clinic_id === resolvedClinicId);
    if (clinicLink?.clinic?.owner_id) {
      clinic_owner_id = clinicLink.clinic.owner_id;
    }
  }

  // Emit event — use user_ids (not table FKs) for Socket.IO routing
  eventEmitter.emitAppointmentBooked({
    ...appointment,
    doctor_id: doctor.user_id,
    patient_id: patientId,
    hospital_owner_id,
    clinic_owner_id,
  });

  // Persistent + push notifications
  await Promise.allSettled([
    notificationService.sendNotification(patientId, {
      title: '✅ Appointment Booked',
      message: `Your appointment with Dr. ${doctor.name} is scheduled on ${date} at ${timeSlot}.`,
      type: 'appointment_confirmed',
      data: { appointmentId: appointment.id, doctorId: doctorId, date, timeSlot },
    }),
    notificationService.sendNotification(doctor.user_id, {
      title: '📅 New Appointment',
      message: `${patient.name} booked an appointment for ${date} at ${timeSlot}.`,
      type: 'appointment_booked',
      data: { appointmentId: appointment.id, patientId: patient.id, date, timeSlot },
    }),
  ]);

  return (await attachConsultationContext([appointment]))[0] || appointment;
};

// Get appointment by ID
const getAppointmentById = async (userId, role, appointmentId) => {
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select(APPOINTMENT_SELECT)
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
  } else if (role === 'hospital_owner' || role === 'hospital_manager') {
    const hospitalIds = await getAccessibleHospitalIds(userId);
    if (!hospitalIds.includes(appointment.hospital_id)) {
      throw new ApiError(403, 'Unauthorized to view this appointment');
    }

    const { data: association } = await supabaseAdmin
      .from('hospital_doctors')
      .select('doctor_id')
      .eq('hospital_id', appointment.hospital_id)
      .eq('doctor_id', appointment.doctor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!association) {
      throw new ApiError(403, 'Unauthorized to view this appointment');
    }
  } else if (role === 'clinic_owner') {
    const clinicIds = await getAccessibleClinicIds(userId);
    if (!clinicIds.includes(appointment.clinic_id)) {
      throw new ApiError(403, 'Unauthorized to view this appointment');
    }

    const { data: association } = await supabaseAdmin
      .from('clinic_doctors')
      .select('doctor_id')
      .eq('clinic_id', appointment.clinic_id)
      .eq('doctor_id', appointment.doctor_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!association) {
      throw new ApiError(403, 'Unauthorized to view this appointment');
    }
  }

  return (await attachConsultationContext([appointment]))[0] || appointment;
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
    .select(APPOINTMENT_SELECT)
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

  await Promise.allSettled([
    patientUser?.user_id ? notificationService.sendNotification(patientUser.user_id, {
      title: '🩺 Appointment Status Updated',
      message: `Your appointment status is now ${status.replace('_', ' ')}.`,
      type: 'appointment_status_changed',
      data: { appointmentId: appointment.id, status },
    }) : Promise.resolve(),
  ]);
  return (await attachConsultationContext([appointment]))[0] || appointment;
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
    .select(APPOINTMENT_SELECT)
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

  await Promise.allSettled([
    notificationService.sendNotification(patientUserId, {
      title: '❌ Appointment Cancelled',
      message: `Your appointment${doctorUser?.name ? ` with Dr. ${doctorUser.name}` : ''} was cancelled.`,
      type: 'appointment_cancelled',
      data: { appointmentId: appointment.id, reason: reason || 'Cancelled by patient' },
    }),
    doctorUser?.user_id ? notificationService.sendNotification(doctorUser.user_id, {
      title: '📭 Appointment Cancelled',
      message: `A patient cancelled the appointment scheduled on ${appointment.appointment_date} at ${appointment.time_slot}.`,
      type: 'appointment_cancelled',
      data: { appointmentId: appointment.id, reason: reason || 'Cancelled by patient' },
    }) : Promise.resolve(),
  ]);
  return (await attachConsultationContext([appointment]))[0] || appointment;
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
    .select(APPOINTMENT_SELECT)
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

  await Promise.allSettled([
    patientUser?.user_id ? notificationService.sendNotification(patientUser.user_id, {
      title: '🔁 Appointment Rescheduled',
      message: `Your appointment is now on ${date} at ${timeSlot}.`,
      type: 'appointment_rescheduled',
      data: { appointmentId: appointment.id, date, timeSlot },
    }) : Promise.resolve(),
    doctorUser?.user_id ? notificationService.sendNotification(doctorUser.user_id, {
      title: '🔁 Appointment Rescheduled',
      message: `An appointment was rescheduled to ${date} at ${timeSlot}.`,
      type: 'appointment_rescheduled',
      data: { appointmentId: appointment.id, date, timeSlot },
    }) : Promise.resolve(),
  ]);
  return (await attachConsultationContext([appointment]))[0] || appointment;
};

module.exports = {
  getAppointments,
  bookAppointment,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
};
