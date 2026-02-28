/**
 * Consultation Service
 * Handles video consultations, prescriptions, and consultation history
 */
const { supabaseAdmin } = require('../config/supabase');
const eventEmitter = require('./eventEmitter');
const config = require('../config');

// Redis client for doctor AI rate limiting
let redis;
try {
  redis = require('../config/redis');
} catch { redis = null; }

// MongoDB for doctor AI conversation memory + audit trail
let getDb;
try {
  ({ getDb } = require('../config/mongodb'));
} catch { getDb = null; }

// Get consultation history
const getConsultationHistory = async (userId, role, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin.from('consultations').select(
    '*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name, phone), appointment:appointments(id, appointment_date, time_slot, type), prescriptions(*, prescription_medicines(*))',
    { count: 'exact' }
  );

  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (patient) query = query.eq('patient_id', patient.id);
  } else if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (doctor) query = query.eq('doctor_id', doctor.id);
  } else if (role === 'hospital_owner') {
    // Scope to doctors affiliated with the owner's hospital(s)
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
    // Scope to doctors affiliated with the owner's clinic(s)
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
  }
  // admin role can view all consultations (no filter)

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

// Start consultation (doctor) — C7 Fix: atomic via RPC
const startConsultation = async (doctorUserId, appointmentId) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) {
    const err = new Error('Doctor profile not found');
    err.statusCode = 404;
    throw err;
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
    const err = new Error(reasons[rpcResult?.reason] || 'Failed to start consultation');
    err.statusCode = 404;
    throw err;
  }

  const consultation = rpcResult.consultation;

  // Get patient's user_id for notification
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', consultation.patient_id)
    .single();

  eventEmitter.emitConsultationStarted({
    ...consultation,
    doctor_id: doctorUserId,
    patient_id: patient?.user_id,
  });

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

  // First try: lookup by consultation ID directly
  let { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', idParam)
    .eq('patient_id', patient?.id)
    .eq('status', 'in_progress')
    .single();

  // Fallback: if not found, try lookup by appointment ID (Android sends appointmentId)
  if (!consultation) {
    const fallback = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('appointment_id', idParam)
      .eq('patient_id', patient?.id)
      .eq('status', 'in_progress')
      .single();

    consultation = fallback.data;
    error = fallback.error;
  }

  if (error || !consultation) {
    const err = new Error('Active consultation not found');
    err.statusCode = 404;
    throw err;
  }

  return consultation;
};

// Get consultation by ID
const getConsultation = async (userId, role, consultationId) => {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name, phone), appointment:appointments(*), prescriptions(*, prescription_medicines(*))')
    .eq('id', consultationId)
    .single();

  if (error || !consultation) {
    const err = new Error('Consultation not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization: verify requesting user is the doctor or patient of this consultation
  if (role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).single();
    if (!doctor || consultation.doctor_id !== doctor.id) {
      const err = new Error('Unauthorized to view this consultation');
      err.statusCode = 403;
      throw err;
    }
  } else if (role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
    if (!patient || consultation.patient_id !== patient.id) {
      const err = new Error('Unauthorized to view this consultation');
      err.statusCode = 403;
      throw err;
    }
  } else if (role === 'hospital_owner') {
    // Scope: consultation's doctor must belong to one of the owner's hospitals
    const { data: hospitals } = await supabaseAdmin.from('hospitals').select('id').eq('owner_id', userId);
    const hospitalIds = (hospitals || []).map(h => h.id);
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('id', consultation.doctor_id).in('hospital_id', hospitalIds).maybeSingle();
    if (!doctor) {
      const err = new Error('Unauthorized to view this consultation');
      err.statusCode = 403;
      throw err;
    }
  } else if (role === 'clinic_owner') {
    // Scope: consultation's doctor must belong to one of the owner's clinics
    const { data: clinics } = await supabaseAdmin.from('clinics').select('id').eq('owner_id', userId);
    const clinicIds = (clinics || []).map(c => c.id);
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('id', consultation.doctor_id).in('clinic_id', clinicIds).maybeSingle();
    if (!doctor) {
      const err = new Error('Unauthorized to view this consultation');
      err.statusCode = 403;
      throw err;
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
    const err = new Error('Doctor profile not found');
    err.statusCode = 404;
    throw err;
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
    const err = new Error('Consultation not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  const consultation = rpcResult.consultation;

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

  return consultation;
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
    const err = new Error('Patient profile not found');
    err.statusCode = 404;
    throw err;
  }

  // Verify patient is a participant
  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, doctor_id, patient_id, status')
    .eq('id', consultationId)
    .eq('patient_id', patient.id)
    .single();

  if (!consultation) {
    const err = new Error('Consultation not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  // Get doctor's user_id for notification
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('user_id')
    .eq('id', consultation.doctor_id)
    .single();

  // Emit event so doctor's UI shows "Patient left the call"
  eventEmitter.emit('consultation:patient-left', {
    consultationId,
    patientUserId,
    doctorUserId: doctor?.user_id,
    timestamp: new Date().toISOString(),
  });

  return { message: 'Left consultation' };
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
    const err = new Error('Consultation not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  // Allow prescriptions only during active or recently completed consultations
  const allowedStatuses = ['in_progress', 'completed'];
  if (!allowedStatuses.includes(consultation.status)) {
    const err = new Error(`Cannot add prescription to a ${consultation.status} consultation`);
    err.statusCode = 400;
    throw err;
  }

  // Generate a unique prescription number (RX-YYYYMMDD-XXXXX)
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
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
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('user_id, name, phone')
    .eq('id', consultation.patient_id)
    .single();

  // Generate PDF (non-blocking — don't fail prescription creation if PDF fails)
  try {
    const { generatePrescriptionPdf } = require('../utils/prescriptionPdf');
    const { uploadBuffer } = require('../config/minio');
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

    if (pdfBuffer) {
      const pdfObjectName = `prescriptions/${consultation.patient_id}/${prescription.id}.pdf`;
      const uploadResult = await uploadBuffer(pdfObjectName, pdfBuffer, 'application/pdf');
      // Update prescription with PDF URL
      await supabaseAdmin.from('prescriptions')
        .update({ pdf_url: uploadResult.url, file_url: uploadResult.url })
        .eq('id', prescription.id);
      prescription.pdf_url = uploadResult.url;
    }
  } catch (pdfErr) {
    console.error('[ConsultationService] PDF generation failed (non-blocking):', pdfErr.message);
  }

  eventEmitter.emitPrescriptionCreated({
    ...prescription,
    patient_id: patient?.user_id,
  });

  // Persist notification so patient sees it even if offline
  if (patient?.user_id) {
    const notificationService = require('./notificationService');
    await notificationService.sendNotification(patient.user_id, {
      title: '💊 New Prescription',
      message: `Dr. ${doctor.name} has written a prescription for you`,
      type: 'prescription_created',
      data: {
        prescriptionId: prescription.id,
        consultationId,
        doctorName: doctor.name,
      },
    });
  }

  return { ...prescription, catalogWarnings };
};

// ==================== AI-ASSISTED CONSULTATION ====================

/**
 * Doctor-facing AI assistant during active consultation.
 * Unlike the patient chatbot (which blocks prescriptions), this uses a DOCTOR system
 * prompt that CAN suggest medications, dosages, interactions, and treatment protocols.
 */
const aiAssistDoctor = async (doctorUserId, consultationId, query, context = {}) => {
  const aiRouter = require('./ai/AIRouter');

  // 1. Verify doctor owns this consultation
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, user_id, name, specialization')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) throw Object.assign(new Error('Doctor profile not found'), { statusCode: 403 });

  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, status, diagnosis, notes, appointment_id, doctor_id')
    .eq('id', consultationId)
    .eq('doctor_id', doctor.id)
    .single();

  if (!consultation) throw Object.assign(new Error('Consultation not found or unauthorized'), { statusCode: 404 });

  // Only allow AI assist on active consultations (prevent token abuse on old consultations)
  if (consultation.status !== 'in_progress') {
    throw Object.assign(new Error('AI assistant is only available during active consultations'), { statusCode: 400 });
  }

  // 2. Rate limit: 50 AI requests per doctor per day
  if (redis) {
    const rateLimitKey = `doctor_ai:${doctorUserId}:${new Date().toISOString().slice(0, 10)}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 86400);
    if (count > 50) {
      throw Object.assign(new Error('Daily AI assistant limit reached (50/day). Resets at midnight.'), { statusCode: 429 });
    }
  }

  // 3. Load conversation memory for this consultation from MongoDB
  let conversationHistory = [];
  if (getDb) {
    try {
      const db = getDb();
      const prevMessages = await db.collection('doctor_ai_interactions')
        .find({ consultationId, doctorUserId })
        .sort({ timestamp: 1 })
        .limit(10) // last 10 interactions for context
        .toArray();

      conversationHistory = prevMessages.flatMap(m => [
        { role: 'user', content: m.query },
        { role: 'assistant', content: typeof m.response === 'string' ? m.response : JSON.stringify(m.response) },
      ]);
    } catch (memErr) {
      console.warn('[ConsultationService] Failed to load AI memory:', memErr.message);
    }
  }

  // 4. Build doctor-facing system prompt (NO patient-facing guardrails)
  const systemPrompt = `You are Swastik Clinical Assistant — an AI tool for licensed doctors during active patient consultations on the Swastik Healthcare Platform.

CONTEXT:
- Doctor: Dr. ${doctor.name} (${doctor.specialization || 'General Medicine'})
- Patient symptoms / context from doctor: ${context.symptoms || 'Not specified'}
- Current diagnosis notes: ${consultation.diagnosis || 'None yet'}

YOUR ROLE:
You assist the DOCTOR (not the patient). You may:
- Suggest differential diagnoses based on symptoms
- Recommend medications with standard adult dosages
- Flag drug-drug interactions or contraindications
- Suggest diagnostic tests / lab work
- Reference treatment protocols and clinical guidelines
- Provide evidence-based treatment options

RESPONSE FORMAT (JSON only):
{
  "answer": "Your detailed clinical response",
  "suggested_medications": [
    { "name": "Drug name", "dosage": "Standard dosage", "frequency": "e.g. BD/TDS", "duration": "e.g. 5 days", "notes": "Interaction warnings or precautions" }
  ],
  "differential_diagnoses": ["Diagnosis 1", "Diagnosis 2"],
  "recommended_tests": ["Test 1", "Test 2"],
  "severity_assessment": "mild|moderate|severe",
  "clinical_notes": "Any additional clinical considerations",
  "references": "Guideline or source if applicable"
}

RULES:
1. You are assisting a LICENSED DOCTOR — provide specific, actionable clinical guidance
2. Always include interaction warnings when suggesting medications
3. Flag if any medication requires renal/hepatic dose adjustment
4. Note pediatric vs adult dosing differences when relevant
5. If symptoms suggest emergency, flag it clearly
6. Include contraindications for common conditions (pregnancy, renal failure, etc.)
7. Be concise and clinically precise — no patient-facing language`;

  // 5. Call AI with conversation memory for multi-turn context
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: query },
  ];

  let aiResponse;
  try {
    const result = await aiRouter.routeWithJsonRetry(messages, {
      messageType: 'text',
      maxTokens: 1200,
      temperature: 0.3,
    });

    aiResponse = {
      response: result.parsedContent || { answer: result.content },
      provider: result.provider,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    // Fallback: return raw text if JSON parsing fails
    try {
      const fallback = await aiRouter.route(messages, { messageType: 'text', maxTokens: 1200, temperature: 0.3 });
      aiResponse = {
        response: { answer: fallback.content, suggested_medications: [], differential_diagnoses: [], recommended_tests: [] },
        provider: fallback.provider,
        latencyMs: fallback.latencyMs,
      };
    } catch (fallbackErr) {
      throw Object.assign(new Error('AI assistant temporarily unavailable'), { statusCode: 503 });
    }
  }

  // 6. Save interaction to MongoDB for audit trail + future memory
  if (getDb) {
    try {
      const db = getDb();
      await db.collection('doctor_ai_interactions').insertOne({
        consultationId,
        doctorUserId,
        doctorId: doctor.id,
        doctorName: doctor.name,
        query,
        response: aiResponse.response,
        provider: aiResponse.provider,
        latencyMs: aiResponse.latencyMs,
        context: { symptoms: context.symptoms || null, diagnosis: consultation.diagnosis || null },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error('[ConsultationService] Failed to save AI audit trail:', auditErr.message);
      // Non-blocking — don't fail the response if audit save fails
    }
  }

  return aiResponse;
};

module.exports = {
  getConsultationHistory,
  startConsultation,
  joinConsultation,
  getConsultation,
  endConsultation,
  leaveConsultation,
  addPrescription,
  aiAssistDoctor,
};
