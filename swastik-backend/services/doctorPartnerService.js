const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const organizationPartnershipService = require('./organizationPartnershipService');
const pharmacyService = require('./pharmacyService');

/**
 * Resolve all facilities (hospitals and clinics) where the doctor has an active/accepted affiliation
 */
const getDoctorAffiliatedFacilities = async (doctorId) => {
  const [
    { data: hospInvites },
    { data: clinicInvites },
    { data: hospDoctors },
    { data: clinicDoctors }
  ] = await Promise.all([
    supabaseAdmin.from('hospital_doctor_invites').select('hospital_id').eq('doctor_id', doctorId).in('status', ['accepted', 'active']),
    supabaseAdmin.from('clinic_doctor_invites').select('clinic_id').eq('doctor_id', doctorId).in('status', ['accepted', 'active']),
    supabaseAdmin.from('hospital_doctors').select('hospital_id').eq('doctor_id', doctorId).eq('is_active', true),
    supabaseAdmin.from('clinic_doctors').select('clinic_id').eq('doctor_id', doctorId).eq('is_active', true),
  ]);

  const facilities = [];
  const seen = new Set();

  for (const h of [...(hospInvites || []), ...(hospDoctors || [])]) {
    if (h.hospital_id && !seen.has(`hospital_${h.hospital_id}`)) {
      seen.add(`hospital_${h.hospital_id}`);
      facilities.push({ type: 'hospital', id: h.hospital_id });
    }
  }

  for (const c of [...(clinicInvites || []), ...(clinicDoctors || [])]) {
    if (c.clinic_id && !seen.has(`clinic_${c.clinic_id}`)) {
      seen.add(`clinic_${c.clinic_id}`);
      facilities.push({ type: 'clinic', id: c.clinic_id });
    }
  }

  return facilities;
};

/**
 * Validate doctor profile and prescription ownership
 */
const getValidatedDoctorAndPrescription = async (doctorUserId, prescriptionId) => {
  const { data: doctor } = await supabaseAdmin
    .from('doctors')
    .select('id, name, user_id')
    .eq('user_id', doctorUserId)
    .single();

  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .select(`
      id, doctor_id, patient_id, consultation_id, diagnosis, notes,
      consultations (
        id, appointment_id,
        appointments ( id, clinic_id, hospital_id, type )
      )
    `)
    .eq('id', prescriptionId)
    .single();

  if (error || !prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  if (prescription.doctor_id !== doctor.id) {
    throw new ApiError(403, 'Prescription does not belong to you');
  }

  return { doctor, prescription };
};

/**
 * Resolve target facilities for a prescription
 */
const resolvePrescriptionFacilities = async (doctor, prescription) => {
  const clinicId = prescription.consultations?.appointments?.clinic_id;
  const hospitalId = prescription.consultations?.appointments?.hospital_id;

  if (clinicId) {
    return [{ type: 'clinic', id: clinicId }];
  }
  if (hospitalId) {
    return [{ type: 'hospital', id: hospitalId }];
  }

  // Standalone / Telemedicine prescription: resolve across doctor's active care networks
  return await getDoctorAffiliatedFacilities(doctor.id);
};

/**
 * Fetch pharmacy partners for a prescription
 */
const getPrescriptionPharmacyPartners = async (doctorUserId, prescriptionId) => {
  const { doctor, prescription } = await getValidatedDoctorAndPrescription(doctorUserId, prescriptionId);
  const facilities = await resolvePrescriptionFacilities(doctor, prescription);

  if (facilities.length === 0) {
    return [];
  }

  const allPartners = [];
  const seenPartners = new Set();

  for (const fac of facilities) {
    const partnerships = await organizationPartnershipService.getPartnerships({
      orgType: fac.type,
      orgId: fac.id,
      status: 'active'
    });

    for (const p of partnerships) {
      if (p.partner?.type === 'pharmacy' && !seenPartners.has(p.partner.id)) {
        seenPartners.add(p.partner.id);
        allPartners.push(p);
      }
    }
  }

  return allPartners;
};

/**
 * Fetch diagnostic partners for a prescription
 */
const getPrescriptionDiagnosticPartners = async (doctorUserId, prescriptionId) => {
  const { doctor, prescription } = await getValidatedDoctorAndPrescription(doctorUserId, prescriptionId);
  const facilities = await resolvePrescriptionFacilities(doctor, prescription);

  if (facilities.length === 0) {
    return [];
  }

  const allPartners = [];
  const seenPartners = new Set();

  for (const fac of facilities) {
    const partnerships = await organizationPartnershipService.getPartnerships({
      orgType: fac.type,
      orgId: fac.id,
      status: 'active'
    });

    for (const p of partnerships) {
      if (p.partner?.type === 'diagnostic_center' && !seenPartners.has(p.partner.id)) {
        seenPartners.add(p.partner.id);
        allPartners.push(p);
      }
    }
  }

  return allPartners;
};

/**
 * Fetch hospital partners / destinations for a prescription referral
 */
const getPrescriptionHospitalPartners = async (doctorUserId, prescriptionId) => {
  const { doctor, prescription } = await getValidatedDoctorAndPrescription(doctorUserId, prescriptionId);
  const facilities = await resolvePrescriptionFacilities(doctor, prescription);

  const hospitalsList = [];
  const seenHospitals = new Set();

  // 1. Direct doctor-affiliated hospitals
  const affiliatedHospitalIds = facilities.filter(f => f.type === 'hospital').map(f => f.id);
  if (affiliatedHospitalIds.length > 0) {
    const { data: hospitals } = await supabaseAdmin
      .from('hospitals')
      .select('id, name, address, city, state, phone, email, is_approved, rating, image_url')
      .in('id', affiliatedHospitalIds)
      .eq('is_active', true);

    for (const h of (hospitals || [])) {
      if (!seenHospitals.has(h.id)) {
        seenHospitals.add(h.id);
        hospitalsList.push({
          id: h.id,
          status: 'active',
          partnership_type: 'direct_affiliation',
          partner: {
            ...h,
            is_verified: Boolean(h.is_approved),
            type: 'hospital',
            typeLabel: 'Hospital'
          }
        });
      }
    }
  }

  // 2. Partner hospitals of doctor's clinics
  for (const fac of facilities.filter(f => f.type === 'clinic')) {
    const partnerships = await organizationPartnershipService.getPartnerships({
      orgType: 'clinic',
      orgId: fac.id,
      status: 'active'
    });

    for (const p of partnerships) {
      if (p.partner?.type === 'hospital' && !seenHospitals.has(p.partner.id)) {
        seenHospitals.add(p.partner.id);
        hospitalsList.push(p);
      }
    }
  }

  return hospitalsList;
};

/**
 * Route prescription to a partner pharmacy
 */
const routePrescriptionToPharmacy = async (doctorUserId, prescriptionId, orderData) => {
  const { doctor, prescription } = await getValidatedDoctorAndPrescription(doctorUserId, prescriptionId);
  const facilities = await resolvePrescriptionFacilities(doctor, prescription);

  if (!orderData.pharmacyId) {
    throw new ApiError(400, 'pharmacyId is required');
  }

  // Validate that the target pharmacy is an active partner of at least one affiliated facility
  let matchingFacility = null;
  for (const fac of facilities) {
    try {
      await organizationPartnershipService.verifyActivePartnership(fac.type, fac.id, 'pharmacy', orderData.pharmacyId);
      matchingFacility = fac;
      break;
    } catch {
      // Continue checking next facility
    }
  }

  if (!matchingFacility) {
    throw new ApiError(403, 'Selected pharmacy is not an authorized partner in your care network.');
  }

  const payload = {
    prescriptionId,
    pharmacyId: orderData.pharmacyId,
    items: orderData.items,
    deliveryType: orderData.deliveryType || 'pickup',
    deliveryAddress: orderData.deliveryAddress
  };

  if (matchingFacility.type === 'hospital') {
    return await pharmacyService.createHospitalPharmacyOrder(matchingFacility.id, doctor.id, payload);
  } else {
    return await pharmacyService.createClinicPharmacyOrder(matchingFacility.id, doctor.id, payload);
  }
};

/**
 * Route prescription to a diagnostic center
 */
const routePrescriptionToDiagnostic = async (doctorUserId, prescriptionId, bookingData) => {
  const { doctor, prescription } = await getValidatedDoctorAndPrescription(doctorUserId, prescriptionId);
  const facilities = await resolvePrescriptionFacilities(doctor, prescription);

  if (!bookingData.centerId) {
    throw new ApiError(400, 'centerId is required');
  }

  // Validate active partnership
  let matchingFacility = null;
  for (const fac of facilities) {
    try {
      await organizationPartnershipService.verifyActivePartnership(fac.type, fac.id, 'diagnostic_center', bookingData.centerId);
      matchingFacility = fac;
      break;
    } catch {
      // Continue checking next facility
    }
  }

  if (!matchingFacility) {
    throw new ApiError(403, 'Selected diagnostic center is not an authorized partner in your care network.');
  }

  // Generate unique booking number
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  const bookingNumber = `DCB-${todayStr}-${randomSuffix}`;

  const bookingDate = bookingData.bookingDate || new Date().toISOString().split('T')[0];
  const sourceValue = matchingFacility.type === 'hospital' ? 'hospital_referral' : 'clinic_referral';

  const { data: booking, error: insertErr } = await supabaseAdmin
    .from('diagnostic_bookings')
    .insert({
      booking_number: bookingNumber,
      patient_id: prescription.patient_id,
      center_id: bookingData.centerId,
      test_id: bookingData.testId || null,
      booking_date: bookingDate,
      booking_time: bookingData.bookingTime || null,
      collection_type: bookingData.collectionType || 'walk_in',
      collection_address: bookingData.collectionAddress || null,
      notes: bookingData.notes || prescription.diagnosis || null,
      status: 'pending',
      result_status: 'pending',
      prescription_id: prescription.id,
      doctor_id: doctor.id,
      consultation_id: prescription.consultation_id || null,
      clinic_id: matchingFacility.type === 'clinic' ? matchingFacility.id : null,
      hospital_id: matchingFacility.type === 'hospital' ? matchingFacility.id : null,
      source: sourceValue
    })
    .select()
    .single();

  if (insertErr) {
    throw new ApiError(500, `Failed to create diagnostic booking: ${insertErr.message}`);
  }

  return booking;
};

/**
 * Refer prescription patient to a hospital
 */
const referPrescriptionToHospital = async (doctorUserId, prescriptionId, referralData) => {
  const { doctor, prescription } = await getValidatedDoctorAndPrescription(doctorUserId, prescriptionId);
  const facilities = await resolvePrescriptionFacilities(doctor, prescription);

  if (!referralData.hospitalId) {
    throw new ApiError(400, 'hospitalId is required');
  }

  // Check if hospital is affiliated with doctor or clinic partner
  const isDirectAffiliated = facilities.some(f => f.type === 'hospital' && f.id === referralData.hospitalId);
  let isPartnerOfClinic = false;

  if (!isDirectAffiliated) {
    for (const fac of facilities.filter(f => f.type === 'clinic')) {
      try {
        await organizationPartnershipService.verifyActivePartnership('clinic', fac.id, 'hospital', referralData.hospitalId);
        isPartnerOfClinic = true;
        break;
      } catch {
        // Next
      }
    }
  }

  if (!isDirectAffiliated && !isPartnerOfClinic) {
    throw new ApiError(403, 'Selected hospital is not an authorized care network affiliate or partner.');
  }

  // Check target hospital active
  const { data: targetHospital } = await supabaseAdmin
    .from('hospitals')
    .select('id, name, is_active')
    .eq('id', referralData.hospitalId)
    .single();

  if (!targetHospital || !targetHospital.is_active) {
    throw new ApiError(404, 'Target hospital is inactive or not found.');
  }

  const referringClinic = facilities.find(f => f.type === 'clinic');
  const referringHospital = facilities.find(f => f.type === 'hospital');

  let senderType = 'clinic';
  let senderId = referringClinic?.id;
  let senderName = 'Clinic';

  if (referringHospital) {
    senderType = 'hospital';
    senderId = referringHospital.id;
    const { data: hosp } = await supabaseAdmin.from('hospitals').select('name').eq('id', referringHospital.id).maybeSingle();
    senderName = hosp?.name || 'Hospital';
  } else if (referringClinic) {
    senderType = 'clinic';
    senderId = referringClinic.id;
    const { data: cln } = await supabaseAdmin.from('clinics').select('name').eq('id', referringClinic.id).maybeSingle();
    senderName = cln?.name || 'Clinic';
  } else {
    // If doctor has only direct affiliation with target hospital
    senderType = 'hospital';
    senderId = targetHospital.id;
    senderName = targetHospital.name;
  }

  // Insert canonical record into universal_referrals
  const universalPayload = {
    patient_id: prescription.patient_id,
    sender_type: senderType,
    sender_id: senderId,
    receiver_type: 'hospital',
    receiver_id: referralData.hospitalId,
    sender_snapshot_name: senderName,
    receiver_snapshot_name: targetHospital.name,
    sender_user_id: doctorUserId,
    sender_user_name_snapshot: doctor.name || 'Doctor',
    reason: referralData.reason,
    urgency: referralData.urgency || 'routine',
    clinical_summary: referralData.clinicalSummary || prescription.diagnosis || null,
    status: 'pending',
    consent_granted: true
  };

  const { data: uRef, error: uErr } = await supabaseAdmin
    .from('universal_referrals')
    .insert(universalPayload)
    .select()
    .single();

  if (uErr) {
    throw new ApiError(500, `Failed to create hospital referral: ${uErr.message}`);
  }

  // If referring clinic exists, also mirror to patient_referrals for clinic compatibility
  if (referringClinic) {
    await supabaseAdmin
      .from('patient_referrals')
      .insert({
        patient_id: prescription.patient_id,
        target_hospital_id: referralData.hospitalId,
        referring_doctor_id: doctor.id,
        referring_clinic_id: referringClinic.id,
        urgency: referralData.urgency || 'routine',
        reason: referralData.reason,
        clinical_summary: referralData.clinicalSummary || prescription.diagnosis || null,
        status: 'pending',
        consent_granted: Boolean(referralData.consentGranted)
      });
  }

  return uRef;
};

module.exports = {
  getDoctorAffiliatedFacilities,
  getValidatedDoctorAndPrescription,
  getPrescriptionPharmacyPartners,
  getPrescriptionDiagnosticPartners,
  getPrescriptionHospitalPartners,
  routePrescriptionToPharmacy,
  routePrescriptionToDiagnostic,
  referPrescriptionToHospital
};
