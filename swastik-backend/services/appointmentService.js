/**
 * Appointment Service
 * Handles booking, scheduling, cancellation, and rescheduling
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { cacheDel } = require('../config/redis');
const eventEmitter = require('./eventEmitter');
const notificationService = require('./notificationService');
const { checkAppointmentStartEligibility } = require('../utils/appointmentTiming');
const { normalizeTimeSlotToTime } = require('./helpers/timeSlotHelper');

const invalidateDashboardCaches = async (patientUserId, doctorUserId) => {
  await Promise.allSettled([
    patientUserId ? cacheDel(`patient:dashboard:${patientUserId}`) : Promise.resolve(),
    doctorUserId ? cacheDel(`doctor:dashboard:${doctorUserId}`) : Promise.resolve(),
  ]);
};

const APPOINTMENT_SELECT = `
  *,
  doctor:doctors(id, name, specialization, profile_image_url, consultation_fee),
  patient:patients(id, name, date_of_birth, gender, profile_image_url, blood_group, weight, height),
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
  let query = supabaseAdmin.from('appointments').select(APPOINTMENT_SELECT, { count: 'exact' })
    .or('patient_notes.neq.BLOCKED_BY_DOCTOR,patient_notes.is.null');

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
    } else if (String(filters.status).toLowerCase() === 'pending') {
      query = query.eq('status', 'scheduled');
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

  let isAscending = true;
  if (filters.status && ['completed', 'cancelled', 'no_show'].includes(String(filters.status).toLowerCase())) {
    isAscending = false; // History should be most recent first
  } else if (!filters.status && !filters.upcoming) {
    isAscending = false; // ALL should show newest past/future appointments first
  }

  const { data, error, count } = await query
    .order('appointment_date', { ascending: isAscending })
    .order('time_slot', { ascending: isAscending })
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
  const {
    doctorId, date, timeSlot, type, notes, hospitalId, clinicId, reason, symptoms, patientNotes,
    severity, onsetType, symptomDuration, symptomPattern, severityCurrent, severityWorst,
    knownAllergies, currentMedications, medicalHistory, voiceNoteUrl, supportingDocuments,
    reasonForVisit,
  } = appointmentData;
  const normalizedTimeSlot = normalizeTimeSlotToTime(timeSlot);
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
    .select('id, user_id, name, consultation_fee, hospital_id, is_approved')
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

  if (normalizedType === 'in_person') {
    // 1. Verified
    if (!doctor.is_approved) {
      throw new ApiError(400, 'Doctor must be verified to offer in-person consultations');
    }

    // 2. Active Affiliation
    if (!resolvedHospitalId && !resolvedClinicId) {
      throw new ApiError(400, 'In-person consultations require an active clinic or hospital affiliation');
    }

    // 3. Organization Enabled
    if (resolvedClinicId) {
      const { data: clinic } = await supabaseAdmin.from('clinics').select('is_active').eq('id', resolvedClinicId).single();
      if (!clinic || !clinic.is_active) {
        throw new ApiError(400, 'Selected clinic is not currently active');
      }
    } else if (resolvedHospitalId) {
      const { data: hospital } = await supabaseAdmin.from('hospitals').select('is_active').eq('id', resolvedHospitalId).single();
      if (!hospital || !hospital.is_active) {
        throw new ApiError(400, 'Selected hospital is not currently active');
      }
    }

    // 4. Valid Schedule
    let scheduleQuery = supabaseAdmin
      .from('doctor_slots')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('slot_date', date)
      .eq('is_active', true);

    if (resolvedClinicId) {
      scheduleQuery = scheduleQuery.eq('clinic_id', resolvedClinicId);
    } else if (resolvedHospitalId) {
      scheduleQuery = scheduleQuery.eq('hospital_id', resolvedHospitalId);
    }

    const { data: schedules } = await scheduleQuery;
    if (!schedules || schedules.length === 0) {
      // Fallback: Check if there's any active slot on this date
      const { data: generalSlots } = await supabaseAdmin
        .from('doctor_slots')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('slot_date', date)
        .eq('is_active', true);

      if (!generalSlots || generalSlots.length === 0) {
        throw new ApiError(400, `Doctor does not have a valid schedule on ${date}`);
      }
    }
  }

  // --- Global Busy Calendar Conflict Check ---
  const ts = (normalizedTimeSlot && normalizedTimeSlot.length > 5) ? normalizedTimeSlot.slice(0, 5) : (normalizedTimeSlot || timeSlot);
  const reqStartParts = ts ? ts.split(':') : [];
  const reqStartMins = reqStartParts.length >= 2 ? (parseInt(reqStartParts[0], 10) * 60) + parseInt(reqStartParts[1], 10) : null;
  const reqDuration = appointmentData.duration_minutes || 15;
  
  if (reqStartMins !== null) {
    const reqEndMins = reqStartMins + reqDuration;

    // Check manual doctor blocks from doctor_schedule_blocks
    try {
      const timeSlotDb = `${ts}:00`;
      const { data: manualBlock } = await supabaseAdmin
        .from('doctor_schedule_blocks')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('block_date', date)
        .in('time_slot', [ts, timeSlotDb])
        .maybeSingle();

      if (manualBlock) {
        throw new ApiError(409, 'The doctor has blocked this time slot. Please choose another slot.');
      }
    } catch (blockErr) {
      if (blockErr instanceof ApiError) throw blockErr;
      console.warn('[AppointmentService] Error checking doctor_schedule_blocks:', blockErr.message);
    }
    
    // Check doctor active leaves
    try {
      const { data: activeLeaves } = await supabaseAdmin
        .from('doctor_leaves')
        .select('*')
        .eq('doctor_id', doctorId)
        .lte('start_date', date)
        .gte('end_date', date);

      const activeOnly = (activeLeaves || []).filter(l => !l.status || l.status === 'active');
      for (const leave of activeOnly) {
        const isGlobal = !leave.scope || leave.scope === 'global';
        const isMatchingOrg = leave.scope === 'organization' && (
          (resolvedClinicId && (leave.organization_id === resolvedClinicId || leave.clinic_id === resolvedClinicId)) ||
          (resolvedHospitalId && (leave.organization_id === resolvedHospitalId || leave.hospital_id === resolvedHospitalId))
        );

        if (isGlobal || isMatchingOrg) {
          if (!leave.leave_type || leave.leave_type === 'full_day') {
            throw new ApiError(409, `The doctor is on leave on this date${isGlobal ? '' : ' at this organization'}.`);
          } else if (leave.leave_type === 'partial_day' && leave.start_time && leave.end_time) {
            const lTs = leave.start_time.slice(0, 5).split(':');
            const lTe = leave.end_time.slice(0, 5).split(':');
            const lStartMins = (parseInt(lTs[0], 10) * 60) + parseInt(lTs[1], 10);
            const lEndMins = (parseInt(lTe[0], 10) * 60) + parseInt(lTe[1], 10);

            if (Math.max(reqStartMins, lStartMins) < Math.min(reqEndMins, lEndMins)) {
              throw new ApiError(409, `The doctor is on leave during this time slot${isGlobal ? '' : ' at this organization'}.`);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Gracefully ignore if doctor_leaves table query error
    }

    const { data: existingAppts } = await supabaseAdmin
      .from('appointments')
      .select('time_slot, duration_minutes')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);
      
    for (const a of (existingAppts || [])) {

      if (!a.time_slot) continue;
      const eTs = a.time_slot.length > 5 ? a.time_slot.slice(0, 5) : a.time_slot;
      const eParts = eTs.split(':');
      if (eParts.length < 2) continue;
      const eStartMins = (parseInt(eParts[0], 10) * 60) + parseInt(eParts[1], 10);
      const eDuration = a.duration_minutes || 15;
      const eEndMins = eStartMins + eDuration;
      
      if (Math.max(reqStartMins, eStartMins) < Math.min(reqEndMins, eEndMins)) {
        throw new ApiError(409, 'The doctor is already booked at this time in another organization or mode.');
      }
    }
  }
  // ------------------------------------------

  // Generate appointment number: VD-YYYY-MMDD-NNNN
  // Use string splitting to avoid local timezone shift
  const [yyyy, mm, dd] = date.split('-');

  // Find the highest sequence number for this date to prevent unique constraint 
  // violations (23505) caused by deleted appointments or concurrency
  const { data: latestAppt } = await supabaseAdmin
    .from('appointments')
    .select('appointment_number')
    .ilike('appointment_number', `VD-${yyyy}-${mm}${dd}-%`)
    .order('appointment_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let seqNum = 1;
  if (latestAppt && latestAppt.appointment_number) {
    const parts = latestAppt.appointment_number.split('-');
    if (parts.length === 4) {
      seqNum = parseInt(parts[3], 10) + 1;
    }
  }
  const seq = String(seqNum).padStart(4, '0');
  const appointmentNumber = `VD-${yyyy}-${mm}${dd}-${seq}`;

  let finalTimeSlot = normalizedTimeSlot || timeSlot;

  const insertPayload = {
    patient_id: patient.id,
    doctor_id: doctorId,
    appointment_date: date,
    time_slot: finalTimeSlot,
    type: normalizedType,
    notes: notes || null,
    hospital_id: resolvedHospitalId,
    clinic_id: resolvedClinicId,
    fee: doctor.consultation_fee,
    consultation_fee: doctor.consultation_fee,
    status: 'scheduled',
    appointment_number: appointmentNumber,
    reason: reason || null,
    symptoms: symptoms || [],
    patient_notes: patientNotes || null,
    severity: severity || null,
    onset_type: onsetType || null,
    symptom_duration: symptomDuration || null,
    symptom_pattern: symptomPattern || null,
    severity_current: severityCurrent != null ? severityCurrent : null,
    severity_worst: severityWorst != null ? severityWorst : null,
    known_allergies: knownAllergies || [],
    current_medications: currentMedications || null,
    medical_history: medicalHistory || null,
    voice_note_url: voiceNoteUrl || null,
    supporting_documents: supportingDocuments || [],
    reason_for_visit: reasonForVisit || reason || null,
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
    clinic_owner_id
      ? notificationService.sendNotification(clinic_owner_id, {
        title: '📅 New Clinic Appointment',
        message: `${patient.name} booked an appointment with Dr. ${doctor.name} for ${date} at ${timeSlot}.`,
        type: 'appointment_booked',
        data: { appointmentId: appointment.id, patientId: patient.id, date, timeSlot },
      })
      : Promise.resolve(),
  ]);

  // Invalidate cached dashboards so the new booking appears immediately
  // (instead of waiting out the 30s Redis TTL) on both patient and doctor.
  await invalidateDashboardCaches(patientId, doctor.user_id);

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
const updateAppointmentStatus = async (doctorUserId, appointmentId, status, reason, otp) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id')
    .eq('user_id', doctorUserId)
    .single();

  // Fetch current status first to validate transition
  const { data: current, error: currentError } = await supabaseAdmin
    .from('appointments')
    .select('status, type, appointment_date, time_slot')
    .eq('id', appointmentId)
    .eq('doctor_id', doctor?.id)
    .single();

  if (!current) {
    require('fs').appendFileSync('debug.log', `[DEBUG] cancel fail: doctorUserId=${doctorUserId}, doctorId=${doctor?.id}, aptId=${appointmentId}, err=${currentError?.message}\n`);
    throw new ApiError(404, 'Appointment not found or unauthorized');
  }

  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed || !allowed.includes(status)) {
    throw new ApiError(400, `Cannot transition from '${current.status}' to '${status}'`);
  }

  // Enforce 10-minute early start eligibility if transitioning to in_progress
  if (status === 'in_progress') {
    const eligibility = checkAppointmentStartEligibility(current);
    if (!eligibility.canStart) {
      throw new ApiError(409, eligibility.reason);
    }
  }

  let updateData = {
    status,
    cancellation_reason: reason || null,
    cancelled_by: status === 'cancelled' ? doctor?.id : null,
    updated_at: new Date().toISOString(),
  };

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update(updateData)
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

  // If appointment was completed or cancelled, also complete/cancel any active consultation
  if (['completed', 'cancelled', 'no_show'].includes(status)) {
    await supabaseAdmin
      .from('consultations')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId)
      .eq('doctor_id', doctor?.id)
      .eq('status', 'in_progress');
  }

  // Invalidate dashboard caches so both patient and doctor see the change immediately
  await invalidateDashboardCaches(patientUser?.user_id, doctorUserId);

  eventEmitter.emitAppointmentUpdated({
    ...appointment,
    doctor_id: doctorUserId,
    patient_id: patientUser?.user_id || appointment.patient_id,
  });

  let notificationMessage = `Your appointment status is now ${status.replace('_', ' ')}.`;
  if (status === 'in_progress' && appointment.completion_otp) {
    notificationMessage = `Your consultation has started. Your completion OTP is ${appointment.completion_otp}.`;
  }

  await Promise.allSettled([
    patientUser?.user_id ? notificationService.sendNotification(patientUser.user_id, {
      title: '🩺 Appointment Status Updated',
      message: notificationMessage,
      type: 'appointment_status_changed',
      data: { appointmentId: appointment.id, status, completion_otp: appointment.completion_otp },
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
      cancelled_by: patient?.id || null,
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

  // Invalidate dashboard caches so both patient and doctor see the change immediately
  await invalidateDashboardCaches(patientUserId, doctorUser?.user_id);

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
  const normalizedTimeSlot = normalizeTimeSlotToTime(timeSlot) || timeSlot;

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
    .eq('time_slot', normalizedTimeSlot)
    .in('status', ['scheduled', 'confirmed'])
    .neq('id', appointmentId)
    .limit(1);

  if (conflicts && conflicts.length > 0) {
    throw new ApiError(409, 'The new time slot is already booked');
  }

  // Atomic update: re-check status hasn't changed since our read (TOCTOU guard)
  // Preserve the existing status — a confirmed appointment stays confirmed after
  // a reschedule so the patient keeps seeing it as an active booking with the
  // new time, instead of falling back to "waiting for approval".
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({
      appointment_date: date,
      time_slot: normalizedTimeSlot,
      status: existingAppt.status,
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

  // Invalidate dashboard caches so both patient and doctor see the new schedule immediately
  await invalidateDashboardCaches(patientUser?.user_id, doctorUser?.user_id);

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

const resendCompletionOtp = async (doctorUserId, appointmentId) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id')
    .eq('user_id', doctorUserId)
    .single();

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select('id, status, completion_otp, patient_id')
    .eq('id', appointmentId)
    .eq('doctor_id', doctor?.id)
    .single();

  if (error || !appointment) {
    throw new ApiError(404, 'Appointment not found or unauthorized');
  }

  if (appointment.status !== 'in_progress') {
    throw new ApiError(400, 'OTP can only be resent for appointments in progress');
  }

  let completionOtp = appointment.completion_otp;
  if (!completionOtp) {
    // OTP was never generated (e.g. started before the bug fix) — generate one now
    completionOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await supabaseAdmin
      .from('appointments')
      .update({ completion_otp: completionOtp, updated_at: new Date().toISOString() })
      .eq('id', appointmentId);
  }

  const { data: patientUser } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', appointment.patient_id)
    .single();

  if (patientUser?.user_id) {
    await notificationService.sendNotification(patientUser.user_id, {
      title: '🔐 Your Completion OTP',
      message: `Your consultation completion OTP is ${completionOtp}. Please share this with your doctor.`,
      type: 'otp_resend',
      data: { appointmentId: appointment.id, completion_otp: completionOtp },
    });
  }

  return { success: true, message: 'OTP resent successfully' };
};

module.exports = {
  getAppointments,
  bookAppointment,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  resendCompletionOtp,
};
