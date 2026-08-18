const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const organizationPartnershipService = require('./organizationPartnershipService');
const consentService = require('./consentService');
const notificationService = require('./notificationService');
const clinicService = require('./clinicService');
const hospitalService = require('./hospitalService');

class ReferralService {
  /**
   * CREATE REFERRAL (Clinic -> Hospital)
   */
  async createClinicReferral(actorId, payload) {
    const { 
      clinicId, 
      hospitalId, 
      patientId, 
      reason, 
      urgency, 
      clinicalSummary, 
      consultationId 
    } = payload;

    // 1. Verify Clinic Context & Ownership
    const clinic = await clinicService.getClinicById(clinicId);
    if (!clinic || clinic.owner_id !== actorId) {
      throw new ApiError(403, 'Unauthorized. You do not own this clinic.');
    }

    // 2. Verify Active Partnership
    const isActive = await organizationPartnershipService.verifyActivePartnership(
      clinicId, 
      hospitalId, 
      'clinic', 
      'hospital'
    );
    if (!isActive) {
      throw new ApiError(403, 'Cannot create referral. No active partnership with this hospital.');
    }

    // 3. Verify Patient Consent for this hospital
    const hasConsent = await consentService.verifyConsent(patientId, 'hospital', hospitalId);
    if (!hasConsent) {
      throw new ApiError(403, 'Cannot create referral. Missing explicit patient consent for this hospital. Please capture consent first.');
    }

    // 4. Duplicate Check: Ensure no active referral exists for this combination
    const { data: existingReferral } = await supabaseAdmin
      .from('patient_referrals')
      .select('id')
      .eq('patient_id', patientId)
      .eq('referring_clinic_id', clinicId)
      .eq('target_hospital_id', hospitalId)
      .not('status', 'in', '("rejected", "cancelled", "discharged")')
      .limit(1)
      .maybeSingle();

    if (existingReferral) {
      throw new ApiError(409, 'An active referral already exists for this patient and hospital.');
    }

    // 5. Create Referral
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', actorId)
      .limit(1)
      .maybeSingle();
      
    // In many workflows, the actor might be clinic owner but not doctor. We will link doctor if found, else just clinic owner doctor id
    const referringDoctorId = doctor ? doctor.id : (await this._getClinicOwnerDoctorId(clinicId));

    if (!referringDoctorId) {
       throw new ApiError(400, 'Could not determine referring doctor ID.');
    }

    const { data: referral, error } = await supabaseAdmin
      .from('patient_referrals')
      .insert({
        patient_id: patientId,
        referring_clinic_id: clinicId,
        target_hospital_id: hospitalId,
        referring_doctor_id: referringDoctorId,
        consultation_id: consultationId || null,
        reason,
        urgency,
        clinical_summary: clinicalSummary,
        consent_granted: true,
        status: 'pending'
      })
      .select(`
        *,
        patient:patients (name, user_id),
        clinic:clinics (name),
        hospital:hospitals (name, owner_id)
      `)
      .single();

    if (error) throw error;

    // 6. Notify Hospital Owner
    if (referral.hospital?.owner_id) {
      notificationService.notify(referral.hospital.owner_id, {
        type: 'REFERRAL_RECEIVED',
        title: 'New Patient Referral',
        message: `${referral.clinic?.name} has referred patient ${referral.patient?.name}.`,
        data: { referralId: referral.id, url: '/hospital/referrals' }
      });
    }

    return referral;
  }

  async _getClinicOwnerDoctorId(clinicId) {
     const { data } = await supabaseAdmin
       .from('clinics')
       .select('owner_id, users!inner(doctors(id))')
       .eq('id', clinicId)
       .maybeSingle();
     return data?.users?.doctors?.[0]?.id || null;
  }

  /**
   * UPDATE REFERRAL STATUS
   */
  async updateReferralStatus(actorId, referralId, newStatus, extraData = {}) {
    const { data: referral } = await supabaseAdmin
      .from('patient_referrals')
      .select(`
        *,
        hospital:hospitals!target_hospital_id (id, owner_id, name),
        clinic:clinics!referring_clinic_id (id, owner_id, name)
      `)
      .eq('id', referralId)
      .single();

    if (!referral) throw new ApiError(404, 'Referral not found');

    const isHospitalOwner = referral.hospital?.owner_id === actorId;
    const isClinicOwner = referral.clinic?.owner_id === actorId;

    // Validate Status Transitions
    if (newStatus === 'cancelled') {
      if (!isClinicOwner) throw new ApiError(403, 'Only clinic can cancel a referral.');
      if (referral.status !== 'pending') throw new ApiError(400, 'Cannot cancel referral after it is processed.');
    } else if (['accepted', 'rejected', 'admission_pending', 'admitted', 'discharged'].includes(newStatus)) {
      if (!isHospitalOwner) throw new ApiError(403, 'Only target hospital can update this status.');
      
      // Strict transitions
      if (newStatus === 'accepted' && referral.status !== 'pending') throw new ApiError(400, 'Can only accept pending referrals.');
      if (newStatus === 'rejected' && referral.status !== 'pending') throw new ApiError(400, 'Can only reject pending referrals.');
      if (newStatus === 'admitted' && !['accepted', 'admission_pending'].includes(referral.status)) throw new ApiError(400, 'Invalid transition to admitted.');
      if (newStatus === 'discharged' && referral.status !== 'admitted') throw new ApiError(400, 'Can only discharge admitted patients.');
    } else {
      throw new ApiError(400, `Invalid status: ${newStatus}`);
    }

    // Prepare Update payload
    const updates = { status: newStatus };
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString();
    if (newStatus === 'admitted') updates.admitted_at = new Date().toISOString();
    if (newStatus === 'discharged') {
      updates.discharged_at = new Date().toISOString();
      updates.discharge_summary = extraData.discharge_summary || 'Care completed.';
    }
    if (newStatus === 'rejected') updates.rejection_reason = extraData.rejection_reason || 'Declined by hospital.';

    const { data: updatedReferral, error } = await supabaseAdmin
      .from('patient_referrals')
      .update(updates)
      .eq('id', referralId)
      .select()
      .single();

    if (error) throw error;

    // Notifications
    let notifType = '';
    let notifMsg = '';
    let targetUserId = null;

    if (newStatus === 'accepted') {
      notifType = 'REFERRAL_ACCEPTED';
      notifMsg = `${referral.hospital?.name} accepted the referral.`;
      targetUserId = referral.clinic?.owner_id;
    } else if (newStatus === 'rejected') {
      notifType = 'REFERRAL_REJECTED';
      notifMsg = `${referral.hospital?.name} rejected the referral.`;
      targetUserId = referral.clinic?.owner_id;
    } else if (newStatus === 'admitted') {
      notifType = 'PATIENT_ADMITTED';
      notifMsg = `Patient admitted to ${referral.hospital?.name}.`;
      targetUserId = referral.clinic?.owner_id;
    } else if (newStatus === 'discharged') {
      notifType = 'PATIENT_DISCHARGED';
      notifMsg = `Patient discharged from ${referral.hospital?.name}.`;
      targetUserId = referral.clinic?.owner_id;
    }

    if (targetUserId && notifType) {
      notificationService.notify(targetUserId, {
        type: notifType,
        title: 'Referral Update',
        message: notifMsg,
        data: { referralId, url: '/clinic/referrals' }
      });
    }

    return updatedReferral;
  }

  /**
   * GET CLINIC REFERRALS (Outgoing)
   */
  async getClinicReferrals(actorId, clinicId, statusFilters = null) {
    const clinic = await clinicService.getClinicById(clinicId);
    if (!clinic || clinic.owner_id !== actorId) {
      throw new ApiError(403, 'Unauthorized.');
    }

    let query = supabaseAdmin
      .from('patient_referrals')
      .select(`
        *,
        patient:patients (id, name, gender, date_of_birth),
        hospital:hospitals (id, name),
        doctor:doctors (id, name)
      `)
      .eq('referring_clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (statusFilters) {
       query = query.in('status', Array.isArray(statusFilters) ? statusFilters : [statusFilters]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * GET HOSPITAL REFERRALS (Incoming)
   */
  async getHospitalReferrals(actorId, hospitalId, statusFilters = null) {
    const hospital = await hospitalService.getHospitalById(hospitalId);
    if (!hospital || hospital.owner_id !== actorId) {
      throw new ApiError(403, 'Unauthorized.');
    }

    let query = supabaseAdmin
      .from('patient_referrals')
      .select(`
        *,
        patient:patients (id, name, gender, date_of_birth),
        clinic:clinics (id, name),
        doctor:doctors (id, users (name))
      `)
      .eq('target_hospital_id', hospitalId)
      .order('created_at', { ascending: false });

    if (statusFilters) {
       query = query.in('status', Array.isArray(statusFilters) ? statusFilters : [statusFilters]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

module.exports = new ReferralService();
