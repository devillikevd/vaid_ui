const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { ROLES } = require('../middleware/rbac');
const organizationPartnershipService = require('./organizationPartnershipService');
const consentService = require('./consentService');
const notificationService = require('./notificationService');

const PROVIDER_TYPES = {
  CLINIC: 'clinic',
  HOSPITAL: 'hospital',
  DIAGNOSTIC_CENTER: 'diagnostic_center',
  PHARMACY: 'pharmacy',
};

const ALLOWED_PROVIDER_TYPES = Object.values(PROVIDER_TYPES);

async function notifyOrganizationOwner(orgType, orgId, payload) {
    try {
        let tableName = '';
        if (orgType === PROVIDER_TYPES.CLINIC) tableName = 'clinics';
        else if (orgType === PROVIDER_TYPES.HOSPITAL) tableName = 'hospitals';
        else if (orgType === PROVIDER_TYPES.DIAGNOSTIC_CENTER) tableName = 'diagnostic_centers';
        else if (orgType === PROVIDER_TYPES.PHARMACY) tableName = 'pharmacies';
        
        if (!tableName) return;
        
        const { data: org } = await supabaseAdmin.from(tableName).select('owner_id').eq('id', orgId).maybeSingle();
        if (org && org.owner_id) {
            await notificationService.createNotification(org.owner_id, payload);
        }
    } catch (err) {
        console.error('[UniversalReferralService] Notification failed:', err.message);
    }
}

class UniversalReferralService {
  /**
   * Validates if the authenticated user has access to act on behalf of the specified organization.
   */
  async validateProviderAccess(orgType, orgId, user) {
    if (!user || !user.id || !user.role) {
      throw new ApiError(401, 'Authentication required to validate provider access.');
    }

    if (!ALLOWED_PROVIDER_TYPES.includes(orgType)) {
      throw new ApiError(400, `Invalid organization type. Allowed types: ${ALLOWED_PROVIDER_TYPES.join(', ')}`);
    }

    const { role, id: userId } = user;

    switch (orgType) {
      case PROVIDER_TYPES.CLINIC:
        if (role === ROLES.CLINIC_OWNER) {
          const { data } = await supabaseAdmin.from('clinics').select('id').eq('id', orgId).eq('owner_id', userId).maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You do not own this clinic.');
          return true;
        } else if (role === ROLES.DOCTOR) {
          const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
          if (!doctor) throw new ApiError(403, 'Doctor profile not found.');
          const { data: member } = await supabaseAdmin.from('clinic_doctors').select('id').eq('doctor_id', doctor.id).eq('clinic_id', orgId).eq('is_active', true).maybeSingle();
          if (!member) throw new ApiError(403, 'Unauthorized. You are not an active doctor at this clinic.');
          return true;
        }
        break;

      case PROVIDER_TYPES.HOSPITAL:
        if (role === ROLES.HOSPITAL_OWNER) {
          const { data } = await supabaseAdmin.from('hospitals').select('id').eq('id', orgId).eq('owner_id', userId).maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You do not own this hospital.');
          return true;
        } else if (role === ROLES.HOSPITAL_MANAGER) {
          const { data } = await supabaseAdmin.from('hospital_managers').select('id').eq('hospital_id', orgId).eq('user_id', userId).maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You are not a manager of this hospital.');
          return true;
        } else if (role === ROLES.DOCTOR) {
          const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
          if (!doctor) throw new ApiError(403, 'Doctor profile not found.');
          const { data: member } = await supabaseAdmin.from('hospital_doctors').select('id').eq('doctor_id', doctor.id).eq('hospital_id', orgId).eq('is_active', true).maybeSingle();
          if (!member) throw new ApiError(403, 'Unauthorized. You are not an active doctor at this hospital.');
          return true;
        }
        break;

      case PROVIDER_TYPES.DIAGNOSTIC_CENTER:
        if (role === ROLES.DIAGNOSTIC_CENTER_OWNER) {
          const { data } = await supabaseAdmin.from('diagnostic_centers').select('id').eq('id', orgId).eq('owner_id', userId).maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You do not own this diagnostic center.');
          return true;
        } else if ([ROLES.DIAGNOSTIC_MANAGER, ROLES.LAB_TECHNICIAN].includes(role)) {
          const { data } = await supabaseAdmin.from('diagnostic_members').select('id').eq('diagnostic_center_id', orgId).eq('user_id', userId).eq('status', 'active').maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You do not have active staff access to this diagnostic center.');
          return true;
        }
        break;

      case PROVIDER_TYPES.PHARMACY:
        if (role === ROLES.PHARMACY_OWNER) {
          const { data } = await supabaseAdmin.from('pharmacies').select('id').eq('id', orgId).eq('owner_id', userId).maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You do not own this pharmacy.');
          return true;
        } else if ([ROLES.PHARMACY_MANAGER, ROLES.PHARMACY_STAFF].includes(role)) {
          const { data } = await supabaseAdmin.from('pharmacy_members').select('id').eq('pharmacy_id', orgId).eq('user_id', userId).eq('status', 'active').maybeSingle();
          if (!data) throw new ApiError(403, 'Unauthorized. You do not have active staff access to this pharmacy.');
          return true;
        }
        break;
    }

    throw new ApiError(403, `Access denied. Your role '${role}' is not authorized to act on behalf of a ${orgType}.`);
  }

  /**
   * Validates receiver organization exists and is active.
   */
  async validateReceiver(orgType, orgId) {
    if (!ALLOWED_PROVIDER_TYPES.includes(orgType)) {
      throw new ApiError(400, `Invalid receiver type. Allowed types: ${ALLOWED_PROVIDER_TYPES.join(', ')}`);
    }

    let tableName;
    if (orgType === PROVIDER_TYPES.CLINIC) tableName = 'clinics';
    if (orgType === PROVIDER_TYPES.HOSPITAL) tableName = 'hospitals';
    if (orgType === PROVIDER_TYPES.DIAGNOSTIC_CENTER) tableName = 'diagnostic_centers';
    if (orgType === PROVIDER_TYPES.PHARMACY) tableName = 'pharmacies';

    const { data: receiver, error } = await supabaseAdmin
      .from(tableName)
      .select('id, name, is_active')
      .eq('id', orgId)
      .maybeSingle();

    if (error || !receiver) {
      throw new ApiError(404, `Target ${orgType} not found.`);
    }

    if (receiver.is_active === false) {
      throw new ApiError(400, `Target ${orgType} is currently deactivated.`);
    }

    return receiver;
  }

  /**
   * Verifies the receiver is active and approved (verified).
   */
  async validateReceiverActive(receiverType, receiverId) {
    let tableName;
    if (receiverType === PROVIDER_TYPES.CLINIC) tableName = 'clinics';
    else if (receiverType === PROVIDER_TYPES.HOSPITAL) tableName = 'hospitals';
    else if (receiverType === PROVIDER_TYPES.DIAGNOSTIC_CENTER) tableName = 'diagnostic_centers';
    else if (receiverType === PROVIDER_TYPES.PHARMACY) tableName = 'pharmacies';
    else throw new ApiError(400, `Invalid receiver type: ${receiverType}`);

    const { data: receiver } = await supabaseAdmin
      .from(tableName)
      .select('is_active, is_approved, approval_status')
      .eq('id', receiverId)
      .maybeSingle();

    if (!receiver) {
      throw new ApiError(404, `Receiver not found.`);
    }

    if (receiver.is_active !== true) {
      throw new ApiError(403, `Receiver is not active.`);
    }

    // All 4 schemas use approval_status = 'approved' and/or is_approved = true.
    if (receiver.approval_status !== 'approved' && receiver.is_approved !== true) {
      throw new ApiError(403, `Receiver is not verified.`);
    }

    return true;
  }

  /**
   * Safely retrieves provider name snapshot.
   */
  async getProviderSnapshot(orgType, orgId) {
    let tableName;
    if (orgType === PROVIDER_TYPES.CLINIC) tableName = 'clinics';
    if (orgType === PROVIDER_TYPES.HOSPITAL) tableName = 'hospitals';
    if (orgType === PROVIDER_TYPES.DIAGNOSTIC_CENTER) tableName = 'diagnostic_centers';
    if (orgType === PROVIDER_TYPES.PHARMACY) tableName = 'pharmacies';

    const { data } = await supabaseAdmin.from(tableName).select('name').eq('id', orgId).maybeSingle();
    return data ? data.name : 'Unknown Provider';
  }

  /**
   * Ensures sender provider has a legitimate context to refer this patient.
   */
  async validatePatientAccess(senderType, senderId, patientId) {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('id', patientId).maybeSingle();
    if (!patient) throw new ApiError(404, 'Patient not found.');

    if (senderType === PROVIDER_TYPES.CLINIC || senderType === PROVIDER_TYPES.HOSPITAL) {
      const { data: appt } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('patient_id', patientId)
        .eq(senderType === PROVIDER_TYPES.CLINIC ? 'clinic_id' : 'hospital_id', senderId)
        .not('status', 'eq', 'cancelled')
        .limit(1)
        .maybeSingle();
      
      if (appt) return true;
    }

    if (senderType === PROVIDER_TYPES.PHARMACY) {
      const { data: order } = await supabaseAdmin
        .from('pharmacy_orders')
        .select('id')
        .eq('patient_id', patientId)
        .eq('pharmacy_id', senderId)
        .not('status', 'eq', 'cancelled')
        .limit(1)
        .maybeSingle();
      
      if (order) return true;
    }

    if (senderType === PROVIDER_TYPES.DIAGNOSTIC_CENTER) {
      const { data: booking } = await supabaseAdmin
        .from('diagnostic_bookings')
        .select('id')
        .eq('patient_id', patientId)
        .eq('center_id', senderId)  // Schema: diagnostic_bookings.center_id (not diagnostic_center_id)
        .not('status', 'eq', 'cancelled')
        .limit(1)
        .maybeSingle();
      
      if (booking) return true;
    }

    // Fallback: Check explicit consent (noting patient_consents doesn't naturally map 'clinic' yet, so we fall back to generic checks if authorized)
    if (senderType !== PROVIDER_TYPES.CLINIC) {
      const hasConsent = await consentService.verifyConsent(patientId, senderType, senderId);
      if (hasConsent) return true;
    }

    throw new ApiError(403, 'Unauthorized. No active relationship or explicit consent found with this patient.');
  }

  /**
   * Verifies an active partnership exists between sender and receiver.
   */
  async validateReferralPartnership(senderType, senderId, receiverType, receiverId) {
    if (senderType === receiverType && senderId === receiverId) {
      throw new ApiError(400, 'Cannot refer to the same organization.');
    }

    const isActive = await organizationPartnershipService.verifyActivePartnership(
      senderId,
      receiverId,
      senderType,
      receiverType
    );

    if (!isActive) {
      throw new ApiError(403, `Cannot create referral. No active partnership between this ${senderType} and ${receiverType}.`);
    }

    return true;
  }

  /**
   * Validates if a transition between two status values is legal.
   */
  validateStatusTransition(currentStatus, newStatus, isReceiver) {
    const validTransitions = {
      pending: ['accepted', 'rejected', 'cancelled'],
      accepted: ['in_progress', 'completed'], // Removed 'cancelled' from accepted (cannot cancel after accepted)
      in_progress: ['completed'], // Removed 'cancelled' from in_progress
      completed: [],
      rejected: [],
      cancelled: []
    };

    if (!validTransitions[currentStatus]) {
      throw new ApiError(400, `Unknown current status: ${currentStatus}`);
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new ApiError(400, `Invalid state transition from ${currentStatus} to ${newStatus}.`);
    }

    if (newStatus === 'cancelled' && isReceiver) {
       throw new ApiError(403, 'Only the sender can cancel a referral.');
    }
    if (['accepted', 'rejected', 'in_progress', 'completed'].includes(newStatus) && !isReceiver) {
       throw new ApiError(403, `Only the receiver can transition to ${newStatus}.`);
    }

    return true;
  }

  /**
   * Validates hospital admission states.
   */
  validateHospitalAdmission(receiverType, admissionStatus) {
    if (!admissionStatus) return true; 

    if (receiverType !== PROVIDER_TYPES.HOSPITAL) {
      throw new ApiError(400, 'Hospital admission status is only applicable for hospital receivers.');
    }

    const validStates = ['admission_pending', 'admitted', 'discharged'];
    if (!validStates.includes(admissionStatus)) {
      throw new ApiError(400, `Invalid hospital admission status: ${admissionStatus}`);
    }

    return true;
  }

  /**
   * Validates attachment access strictly.
   */
  async validateAttachmentAccess(referralId, user, reportId = null, prescriptionId = null) {
    const { data: referral, error } = await supabaseAdmin
      .from('universal_referrals')
      .select('id, patient_id, sender_type, sender_id, receiver_type, receiver_id')
      .eq('id', referralId)
      .maybeSingle();

    if (error || !referral) {
      throw new ApiError(404, 'Referral not found.');
    }

    let isAuthorized = false;
    try {
      await this.validateProviderAccess(referral.sender_type, referral.sender_id, user);
      isAuthorized = true;
    } catch (e) {
      try {
        await this.validateProviderAccess(referral.receiver_type, referral.receiver_id, user);
        isAuthorized = true;
      } catch (e2) {
        // Fallthrough
      }
    }

    if (!isAuthorized) {
       throw new ApiError(403, 'Access denied. You do not have access to this referral.');
    }

    // Verify cross-patient attachment prevention
    if (reportId) {
      const { data: report } = await supabaseAdmin.from('reports').select('patient_id').eq('id', reportId).maybeSingle();
      if (!report || report.patient_id !== referral.patient_id) {
         throw new ApiError(400, 'Report does not belong to the referred patient.');
      }
    }

    if (prescriptionId) {
      const { data: prescription } = await supabaseAdmin.from('prescriptions').select('patient_id').eq('id', prescriptionId).maybeSingle();
      if (!prescription || prescription.patient_id !== referral.patient_id) {
         throw new ApiError(400, 'Prescription does not belong to the referred patient.');
      }
    }

    return true;
  }

  /**
   * Returns the patient's eligible reports and prescriptions for referral attachment.
   *
   * AUTHORIZATION MODEL:
   *   1. req.user identity is authenticated by the authenticate middleware.
   *   2. validateProviderAccess confirms the caller actually belongs to sender_type/sender_id.
   *   3. validatePatientAccess confirms an active care relationship exists.
   *   Only then are documents fetched and returned (safe metadata only, no raw storage URLs).
   */
  async getPatientDocumentsForReferral(user, { patientId, senderType, senderId }) {
    // 1. Validate provider type (rejects forged / illegal types such as 'doctor')
    if (!ALLOWED_PROVIDER_TYPES.includes(senderType)) {
      throw new ApiError(400, `Invalid sender_type. Allowed: ${ALLOWED_PROVIDER_TYPES.join(', ')}`);
    }

    // 2. Validate the authenticated user actually controls sender_type/sender_id
    await this.validateProviderAccess(senderType, senderId, user);

    // 3. Validate the sender has a legitimate care relationship with this patient
    await this.validatePatientAccess(senderType, senderId, patientId);

    // 4. Fetch documents — authorization is complete; use admin client safely
    const [reportsResult, prescriptionsResult] = await Promise.all([
      supabaseAdmin
        .from('reports')
        .select('id, name, type, lab_name, test_date, result_date, status, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('prescriptions')
        .select('id, prescription_number, diagnosis, valid_from, valid_until, status, created_at')
        .eq('patient_id', patientId)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
    ]);

    // Return safe metadata only — no raw file_url / storage paths
    return {
      reports: (reportsResult.data || []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        lab_name: r.lab_name,
        test_date: r.test_date,
        result_date: r.result_date,
        status: r.status,
        created_at: r.created_at
      })),
      prescriptions: (prescriptionsResult.data || []).map(p => ({
        id: p.id,
        prescription_number: p.prescription_number,
        diagnosis: p.diagnosis,
        valid_from: p.valid_from,
        valid_until: p.valid_until,
        status: p.status,
        created_at: p.created_at
      }))
    };
  }

  async createReferral(user, payload) {
    const {
      patient_id,
      sender_type,
      sender_id,
      receiver_type,
      receiver_id,
      reason,
      urgency = 'routine',
      clinical_summary,
      attachments = []
    } = payload;

    if (!patient_id || !sender_type || !sender_id || !receiver_type || !receiver_id || !reason) {
      throw new ApiError(400, 'Missing required referral fields.');
    }

    // 1. Validate sender access
    await this.validateProviderAccess(sender_type, sender_id, user);

    // 2. Validate patient access (sender must have a relationship with patient)
    await this.validatePatientAccess(sender_type, sender_id, patient_id);

    // 3. Verify Patient Consent for the receiving entity
    const hasConsent = await consentService.verifyConsent(patient_id, receiver_type, receiver_id);
    if (!hasConsent) {
      throw new ApiError(403, `Cannot create referral. Missing explicit patient consent for this ${receiver_type}.`);
    }

    // 4. Validate receiver
    await this.validateReceiver(receiver_type, receiver_id);

    // 5. Prevent self-referral
    if (sender_type === receiver_type && sender_id === receiver_id) {
      throw new ApiError(400, 'Cannot refer to the same organization.');
    }

    // 6. Verify receiver is verified/active
    await this.validateReceiverActive(receiver_type, receiver_id);

    // 7. Get Snapshots
    const senderSnapshot = await this.getProviderSnapshot(sender_type, sender_id);
    const receiverSnapshot = await this.getProviderSnapshot(receiver_type, receiver_id);

    // 8. Transactional insert (using supabaseAdmin)
    const { data: referral, error: insertError } = await supabaseAdmin
      .from('universal_referrals')
      .insert({
        patient_id,
        sender_type,
        sender_id,
        receiver_type,
        receiver_id,
        sender_snapshot: senderSnapshot,
        receiver_snapshot: receiverSnapshot,
        sender_user_id: user.id,
        sender_user_name_snapshot: user.name,
        reason,
        urgency,
        clinical_summary,
        status: 'pending',
        consent_granted: true // Verified explicitly above
      })
      .select('*')
      .single();

    if (insertError) {
      throw new ApiError(400, `Failed to create referral: ${insertError.message}`);
    }

    // 9. Validate and add attachments (compensating cleanup on fail)
    if (attachments && attachments.length > 0) {
      // 9a. Document-level ownership validation BEFORE any insertion.
      // Rules:
      //   - report.patient_id must equal referral patient_id (cross-patient prevention)
      //   - prescription.patient_id must equal referral patient_id
      //   - Backend is authoritative; frontend document IDs are NEVER trusted.
      // Note: The sender has already passed validatePatientAccess, meaning they have
      // an active care relationship with this patient. Documents are validated to
      // belong specifically to the referral's patient, preventing cross-patient leaks.
      for (const att of attachments) {
        if (att.report_id) {
          const { data: report } = await supabaseAdmin
            .from('reports')
            .select('id, patient_id')
            .eq('id', att.report_id)
            .maybeSingle();

          if (!report) {
            await supabaseAdmin.from('universal_referrals').delete().eq('id', referral.id);
            throw new ApiError(400, `Report ${att.report_id} not found.`);
          }
          if (report.patient_id !== patient_id) {
            await supabaseAdmin.from('universal_referrals').delete().eq('id', referral.id);
            throw new ApiError(400, 'Cannot attach a report that does not belong to the referred patient.');
          }
        }

        if (att.prescription_id) {
          const { data: prescription } = await supabaseAdmin
            .from('prescriptions')
            .select('id, patient_id')
            .eq('id', att.prescription_id)
            .maybeSingle();

          if (!prescription) {
            await supabaseAdmin.from('universal_referrals').delete().eq('id', referral.id);
            throw new ApiError(400, `Prescription ${att.prescription_id} not found.`);
          }
          if (prescription.patient_id !== patient_id) {
            await supabaseAdmin.from('universal_referrals').delete().eq('id', referral.id);
            throw new ApiError(400, 'Cannot attach a prescription that does not belong to the referred patient.');
          }
        }

        // Reject attachments with neither a known document reference nor a storage_path
        if (!att.report_id && !att.prescription_id && !att.storage_path) {
          await supabaseAdmin.from('universal_referrals').delete().eq('id', referral.id);
          throw new ApiError(400, 'Each attachment must reference a report, prescription, or provide a storage_path.');
        }
      }

      // 9b. All attachments validated — insert
      const attachmentRows = attachments.map(att => ({
        referral_id: referral.id,
        report_id: att.report_id || null,
        prescription_id: att.prescription_id || null,
        document_type: att.document_type || (att.report_id ? 'report' : att.prescription_id ? 'prescription' : 'other'),
        file_name: att.file_name || 'Attached Document',
        storage_path: att.storage_path || null,
        uploaded_by: user.id
      }));

      const { error: attachError } = await supabaseAdmin
        .from('referral_attachments')
        .insert(attachmentRows);

      if (attachError) {
        // Compensating cleanup
        await supabaseAdmin.from('universal_referrals').delete().eq('id', referral.id);
        throw new ApiError(400, `Failed to add attachments: ${attachError.message}. Referral creation aborted.`);
      }
    }

    // 10. Notify receiver
    notifyOrganizationOwner(receiver_type, receiver_id, {
        title: 'New Referral Received',
        message: `You have received a new referral from ${sender_type}.`,
        type: 'referral_created',
        data: { referral_id: referral.id, status: 'pending' }
    }).catch(() => {});

    return referral;
  }

  async getInbox(user, query = {}) {
    const { status, urgency, sender_type, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const orgs = [];
    if (user.role === ROLES.CLINIC_OWNER) {
      const { data } = await supabaseAdmin.from('clinics').select('id').eq('owner_id', user.id);
      (data || []).forEach(d => orgs.push({ type: 'clinic', id: d.id }));
    } else if (user.role === ROLES.HOSPITAL_ADMIN) {
      const { data } = await supabaseAdmin.from('hospitals').select('id').eq('admin_id', user.id);
      (data || []).forEach(d => orgs.push({ type: 'hospital', id: d.id }));
    } else if (user.role === ROLES.DOCTOR) {
      const { data: clinicAff } = await supabaseAdmin.from('doctor_clinics').select('clinic_id').eq('doctor_id', user.id).eq('is_active', true);
      const { data: hospAff } = await supabaseAdmin.from('doctor_hospitals').select('hospital_id').eq('doctor_id', user.id).eq('is_active', true);
      (clinicAff || []).forEach(d => orgs.push({ type: 'clinic', id: d.clinic_id }));
      (hospAff || []).forEach(d => orgs.push({ type: 'hospital', id: d.hospital_id }));
    } else if (user.role === 'diagnostic_center_staff' || user.role === 'diagnostic_center_admin') {
      const { data } = await supabaseAdmin.from('diagnostic_centers').select('id').eq('owner_id', user.id);
      (data || []).forEach(d => orgs.push({ type: 'diagnostic_center', id: d.id }));
    } else if (user.role === 'pharmacy_owner' || user.role === 'pharmacy_staff') {
      const { data } = await supabaseAdmin.from('pharmacies').select('id').eq('owner_id', user.id);
      (data || []).forEach(d => orgs.push({ type: 'pharmacy', id: d.id }));
    }

    if (orgs.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const receiverConditions = orgs.map(org => `and(receiver_type.eq.${org.type},receiver_id.eq.${org.id})`).join(',');
    
    let dbQuery = supabaseAdmin
      .from('universal_referrals')
      .select('*, patient:patients(id, user_id, full_name, users(name, email, phone))', { count: 'exact' })
      .or(receiverConditions);

    if (status) dbQuery = dbQuery.eq('status', status);
    if (urgency) dbQuery = dbQuery.eq('urgency', urgency);
    if (sender_type) dbQuery = dbQuery.eq('sender_type', sender_type);

    dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw new ApiError(400, error.message);

    return {
      data: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  async getSent(user, query = {}) {
    const { status, urgency, receiver_type, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const orgs = [];
    if (user.role === ROLES.CLINIC_OWNER) {
      const { data } = await supabaseAdmin.from('clinics').select('id').eq('owner_id', user.id);
      (data || []).forEach(d => orgs.push({ type: 'clinic', id: d.id }));
    } else if (user.role === ROLES.HOSPITAL_ADMIN) {
      const { data } = await supabaseAdmin.from('hospitals').select('id').eq('admin_id', user.id);
      (data || []).forEach(d => orgs.push({ type: 'hospital', id: d.id }));
    } else if (user.role === ROLES.DOCTOR) {
      const { data: clinicAff } = await supabaseAdmin.from('doctor_clinics').select('clinic_id').eq('doctor_id', user.id).eq('is_active', true);
      const { data: hospAff } = await supabaseAdmin.from('doctor_hospitals').select('hospital_id').eq('doctor_id', user.id).eq('is_active', true);
      (clinicAff || []).forEach(d => orgs.push({ type: 'clinic', id: d.clinic_id }));
      (hospAff || []).forEach(d => orgs.push({ type: 'hospital', id: d.hospital_id }));
    }

    if (orgs.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const senderConditions = orgs.map(org => `and(sender_type.eq.${org.type},sender_id.eq.${org.id})`).join(',');
    
    let dbQuery = supabaseAdmin
      .from('universal_referrals')
      .select('*, patient:patients(id, user_id, full_name, users(name, email, phone))', { count: 'exact' })
      .or(senderConditions);

    if (status) dbQuery = dbQuery.eq('status', status);
    if (urgency) dbQuery = dbQuery.eq('urgency', urgency);
    if (receiver_type) dbQuery = dbQuery.eq('receiver_type', receiver_type);

    dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await dbQuery;
    if (error) throw new ApiError(400, error.message);

    return {
      data: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  async getReferralDetail(referralId, user) {
    const { data: referral, error } = await supabaseAdmin
      .from('universal_referrals')
      .select('*, patient:patients(id, user_id, full_name, date_of_birth, gender, users(name, email, phone)), attachments:referral_attachments(*)')
      .eq('id', referralId)
      .single();

    if (error || !referral) throw new ApiError(404, 'Referral not found');

    let hasAccess = false;
    if (user.role === ROLES.PATIENT && referral.patient && referral.patient.user_id === user.id) {
        hasAccess = true;
    }

    try {
        if (!hasAccess) {
            await this.validateProviderAccess(referral.sender_type, referral.sender_id, user);
            hasAccess = true;
        }
    } catch(e) { }

    try {
        if (!hasAccess) {
            await this.validateProviderAccess(referral.receiver_type, referral.receiver_id, user);
            hasAccess = true;
        }
    } catch(e) { }

    if (!hasAccess) {
        throw new ApiError(403, 'Unauthorized to view this referral.');
    }

    return referral;
  }

  async updateReferralStatus(referralId, user, { status }) {
    const referral = await this.getReferralDetail(referralId, user);
    
    let isSender = false;
    let isReceiver = false;
    try { await this.validateProviderAccess(referral.sender_type, referral.sender_id, user); isSender = true; } catch(e){}
    try { await this.validateProviderAccess(referral.receiver_type, referral.receiver_id, user); isReceiver = true; } catch(e){}

    if (!isSender && !isReceiver) {
        throw new ApiError(403, 'Unauthorized to modify this referral.');
    }

    const currentStatus = referral.status;
    const validTransitions = {
        pending: ['accepted', 'rejected', 'cancelled'],
        accepted: ['in_progress'],
        in_progress: ['completed']
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
        throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${status}`);
    }

    if (status === 'cancelled' && !isSender) {
        throw new ApiError(403, 'Only the sender can cancel a pending referral.');
    }

    if (['accepted', 'rejected'].includes(status) && !isReceiver) {
        throw new ApiError(403, 'Only the receiver can accept or reject a referral.');
    }

    if (['in_progress', 'completed'].includes(status) && !isReceiver) {
        throw new ApiError(403, `Only the receiver can mark a referral as ${status}.`);
    }

    const updatePayload = { status, updated_at: new Date().toISOString() };
    if (status === 'accepted') updatePayload.accepted_at = new Date().toISOString();
    if (status === 'completed') updatePayload.completed_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('universal_referrals')
        .update(updatePayload)
        .eq('id', referralId)
        .select('*')
        .single();

    if (error) throw new ApiError(400, `Failed to update status: ${error.message}`);

    // Notifications
    try {
        if (status === 'accepted') {
            await notificationService.createNotification(referral.sender_user_id, {
                title: 'Referral Accepted',
                message: `Your referral has been accepted by ${referral.receiver_snapshot.name}.`,
                type: 'referral_accepted',
                data: { referral_id: referral.id, status }
            });
        } else if (status === 'rejected') {
            await notificationService.createNotification(referral.sender_user_id, {
                title: 'Referral Rejected',
                message: `Your referral was rejected by ${referral.receiver_snapshot.name}.`,
                type: 'referral_rejected',
                data: { referral_id: referral.id, status }
            });
        } else if (status === 'completed') {
            await notificationService.createNotification(referral.sender_user_id, {
                title: 'Referral Completed',
                message: `Your referral to ${referral.receiver_snapshot.name} has been completed.`,
                type: 'referral_completed',
                data: { referral_id: referral.id, status }
            });
        } else if (status === 'cancelled') {
            await notifyOrganizationOwner(referral.receiver_type, referral.receiver_id, {
                title: 'Referral Cancelled',
                message: `A pending referral from ${referral.sender_snapshot.name} was cancelled.`,
                type: 'referral_cancelled',
                data: { referral_id: referral.id, status }
            });
        }
    } catch(err) {
        console.error('[UniversalReferralService] Status Notification failed:', err.message);
    }

    return data;
  }

  async validateDownstreamAttribution(sourceReferralId, patientId, receiverType, receiverId, user) {
      if (!sourceReferralId) return null;

      const { data: referral, error } = await supabaseAdmin
          .from('universal_referrals')
          .select('*')
          .eq('id', sourceReferralId)
          .single();

      if (error || !referral) {
          throw new ApiError(404, 'Provided source referral not found.');
      }

      if (referral.patient_id !== patientId) {
          throw new ApiError(403, 'Referral patient does not match downstream patient.');
      }

      if (referral.receiver_type !== receiverType) {
          throw new ApiError(403, `Referral is directed to a , not a .`);
      }

      if (referral.receiver_id !== receiverId) {
          throw new ApiError(403, 'Referral is directed to a different organization.');
      }

      if (!['accepted', 'in_progress'].includes(referral.status)) {
          throw new ApiError(400, `Referral status '' does not permit downstream execution.`);
      }

      if (user.role !== ROLES.PATIENT) {
          await this.validateProviderAccess(receiverType, receiverId, user);
      } else {
          const { data: pt } = await supabaseAdmin.from('patients').select('user_id').eq('id', patientId).single();
          if (!pt || pt.user_id !== user.id) {
              throw new ApiError(403, 'Unauthorized patient for this referral.');
          }
      }
      return referral;
  }

  async addAttachment(referralId, user, attachmentData) {
      const referral = await this.getReferralDetail(referralId, user);
      
      const { report_id, prescription_id, document_type, file_name, storage_path } = attachmentData;

      if (!report_id && !prescription_id && !storage_path) {
          throw new ApiError(400, 'Must provide report_id, prescription_id, or storage_path');
      }

      if (report_id) {
          const { data: report } = await supabaseAdmin.from('diagnostic_reports').select('patient_id').eq('id', report_id).single();
          if (!report || report.patient_id !== referral.patient_id) {
              throw new ApiError(403, 'Report does not belong to the referred patient.');
          }
      }

      if (prescription_id) {
          const { data: pres } = await supabaseAdmin.from('prescriptions').select('patient_id').eq('id', prescription_id).single();
          if (!pres || pres.patient_id !== referral.patient_id) {
              throw new ApiError(403, 'Prescription does not belong to the referred patient.');
          }
      }

      const { data, error } = await supabaseAdmin
        .from('referral_attachments')
        .insert({
            referral_id: referralId,
            report_id: report_id || null,
            prescription_id: prescription_id || null,
            document_type: document_type || 'other',

            file_name: file_name || 'Attached Document',
            storage_path: storage_path || null,
            uploaded_by: user.id
        })
        .select('*')
        .single();

      if (error) throw new ApiError(400, `Failed to add attachment: ${error.message}`);
      return data;
  }

  /**
   * P7.7 — Searches authorized patients for a given sender context.
   *
   * SECURITY:
   *   1. validateProviderAccess() verifies req.user actually owns/belongs to sender_id.
   *      sender_type and sender_id from the frontend are treated as context hints only.
   *   2. The junction-table query is scoped strictly to senderId — a forged senderId
   *      that passes step 1 (impossible) would still only see that org's patients.
   *   3. Returns minimum fields only: id, name, phone.
   *      No visit history, reports, prescriptions, or sensitive metadata.
   *
   * Schema verified against production SQL:
   *   clinic        → appointments.clinic_id        (status 'cancelled' = inactive)
   *   hospital      → appointments.hospital_id       (status 'cancelled' = inactive)
   *   pharmacy      → pharmacy_orders.pharmacy_id    (status 'cancelled' = inactive)
   *   diagnostic    → diagnostic_bookings.center_id  (NOT diagnostic_center_id; status 'cancelled' = inactive)
   *   phone         → patients.user_id → users.phone
   *
   * @param {object} user     - Authenticated user (req.user)
   * @param {object} params
   * @param {string} params.senderType
   * @param {string} params.senderId
   * @param {string} [params.q='']      - Name or phone search term
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]  - Capped at 50
   */
  async searchAuthorizedPatients(user, { senderType, senderId, q = '', page = 1, limit = 20 }) {
    // 1. Validate sender_type is a known type
    if (!ALLOWED_PROVIDER_TYPES.includes(senderType)) {
      throw new ApiError(400, `Invalid sender_type. Allowed: ${ALLOWED_PROVIDER_TYPES.join(', ')}`);
    }

    // 2. Re-validate that req.user actually owns / belongs to senderId.
    //    A forged senderId will throw 403 here before any patient data is accessed.
    await this.validateProviderAccess(senderType, senderId, user);

    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 50);
    const safePage  = Math.max(1, parseInt(page) || 1);
    const offset    = (safePage - 1) * safeLimit;
    const searchTerm = (q || '').trim();

    // 3. Get the distinct set of authorized patient_ids for this org.
    //    Each provider type uses its own junction table, scoped to senderId.
    //    Exclude cancelled records (inactive relationship).
    //    Supabase postgREST doesn't natively deduplicate, so we do it in Node
    //    (the set is bounded to this org's patients — not a global scan).
    let junctionQuery;
    if (senderType === PROVIDER_TYPES.CLINIC) {
      junctionQuery = supabaseAdmin
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', senderId)
        .not('status', 'eq', 'cancelled');
    } else if (senderType === PROVIDER_TYPES.HOSPITAL) {
      junctionQuery = supabaseAdmin
        .from('appointments')
        .select('patient_id')
        .eq('hospital_id', senderId)
        .not('status', 'eq', 'cancelled');
    } else if (senderType === PROVIDER_TYPES.PHARMACY) {
      junctionQuery = supabaseAdmin
        .from('pharmacy_orders')
        .select('patient_id')
        .eq('pharmacy_id', senderId)
        .not('status', 'eq', 'cancelled');
    } else if (senderType === PROVIDER_TYPES.DIAGNOSTIC_CENTER) {
      // Schema: diagnostic_bookings.center_id (confirmed in 006_diagnostic_centers.sql)
      junctionQuery = supabaseAdmin
        .from('diagnostic_bookings')
        .select('patient_id')
        .eq('center_id', senderId)
        .not('status', 'eq', 'cancelled');
    } else {
      throw new ApiError(400, `Patient search not supported for sender type: ${senderType}`);
    }

    const { data: junctionRows, error: junctionError } = await junctionQuery;
    if (junctionError) {
      throw new ApiError(500, `Patient lookup failed: ${junctionError.message}`);
    }

    // Deduplicate: a patient may have multiple appointments/orders/bookings
    const allPatientIds = [...new Set(
      (junctionRows || []).map(r => r.patient_id).filter(Boolean)
    )];

    if (allPatientIds.length === 0) {
      return {
        data: [],
        pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 1 }
      };
    }

    // 4. Fetch patient rows scoped to allPatientIds.
    //    patients does NOT have a phone column; phone lives on users table via patients.user_id.
    //    We join users to get the phone.
    //
    //    Name search: ilike server-side on patients.name.
    //    Phone search: if q looks like a phone number (digits/spaces/+/-), we do a second
    //    pass fetching all candidates and filter by user.phone in memory (bounded set).
    //    This avoids downloading the global users table.

    let nameCandidates = [];
    if (searchTerm) {
      const { data: byName, error: nameErr } = await supabaseAdmin
        .from('patients')
        .select('id, name, user_id, user:users(phone)')
        .in('id', allPatientIds)
        .ilike('name', `%${searchTerm}%`);
      if (nameErr) throw new ApiError(500, `Patient search failed: ${nameErr.message}`);
      nameCandidates = byName || [];
    } else {
      // No search term — return all authorized patients (paginated)
      const { data: all, error: allErr } = await supabaseAdmin
        .from('patients')
        .select('id, name, user_id, user:users(phone)')
        .in('id', allPatientIds);
      if (allErr) throw new ApiError(500, `Patient search failed: ${allErr.message}`);
      nameCandidates = all || [];
    }

    let candidates = nameCandidates;

    // Phone search: if q is non-empty, also include patients whose phone matches
    if (searchTerm) {
      const { data: phoneBatch, error: phoneErr } = await supabaseAdmin
        .from('patients')
        .select('id, name, user_id, user:users(phone)')
        .in('id', allPatientIds);
      
      if (!phoneErr && phoneBatch) {
        const seen = new Set(candidates.map(p => p.id));
        const lowerQ = searchTerm.toLowerCase();
        const normalizedQ = searchTerm.replace(/\D/g, '');

        for (const p of phoneBatch) {
          if (seen.has(p.id)) continue;
          const rawPhone = p.user?.phone || '';
          // Match on raw phone (contains) or digits-only (contains)
          if (
            rawPhone.toLowerCase().includes(lowerQ) ||
            (normalizedQ.length > 0 && rawPhone.replace(/\D/g, '').includes(normalizedQ))
          ) {
            candidates.push(p);
            seen.add(p.id);
          }
        }
      }
    }

    const total = candidates.length;
    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 1;

    // Paginate in Node (set is bounded to org's patients — not a global table scan)
    const pageData = candidates.slice(offset, offset + safeLimit).map(p => ({
      id: p.id,
      name: p.name || 'Patient',
      // Only return phone — no medical history, reports, or unrelated sensitive data
      phone: p.user?.phone || null,
    }));

    return {
      data: pageData,
      pagination: { page: safePage, limit: safeLimit, total, totalPages }
    };
  }
}

module.exports = new UniversalReferralService();
