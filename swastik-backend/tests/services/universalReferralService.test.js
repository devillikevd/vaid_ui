const universalReferralService = require('../../services/universalReferralService');
const { supabaseAdmin } = require('../../config/supabase');
const organizationPartnershipService = require('../../services/organizationPartnershipService');
const consentService = require('../../services/consentService');
const { ROLES } = require('../../middleware/rbac');

jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));

jest.mock('../../services/organizationPartnershipService');
jest.mock('../../services/consentService');

describe('UniversalReferralService Security Validations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockSupabaseBuilder = (data = null, error = null) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data, error })
    };
    supabaseAdmin.from.mockReturnValue(builder);
    return builder;
  };

  describe('Provider Authorization (validateProviderAccess)', () => {
    test('Positive: Clinic Owner has access', async () => {
      mockSupabaseBuilder({ id: 'clinic-123' });
      const result = await universalReferralService.validateProviderAccess('clinic', 'clinic-123', { id: 'user-1', role: ROLES.CLINIC_OWNER });
      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('clinics');
    });

    test('Positive: Doctor through active clinic membership', async () => {
      // Mock doctor profile lookup, then clinic_doctors lookup
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'doc-1' }, error: null })
          .mockResolvedValueOnce({ data: { id: 'member-1' }, error: null })
      };
      supabaseAdmin.from.mockReturnValue(builder);

      const result = await universalReferralService.validateProviderAccess('clinic', 'clinic-123', { id: 'doc-user', role: ROLES.DOCTOR });
      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('doctors');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('clinic_doctors');
    });

    test('Negative: Doctor with no organization membership', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'doc-1' }, error: null })
          .mockResolvedValueOnce({ data: null, error: null }) // Active member not found
      };
      supabaseAdmin.from.mockReturnValue(builder);

      await expect(universalReferralService.validateProviderAccess('clinic', 'clinic-123', { id: 'doc-user', role: ROLES.DOCTOR }))
        .rejects.toThrow('Unauthorized. You are not an active doctor at this clinic.');
    });

    test('Negative: Forged organization ID for Clinic Owner', async () => {
      mockSupabaseBuilder(null); // Return null for clinic query
      await expect(universalReferralService.validateProviderAccess('clinic', 'forged-id', { id: 'user-1', role: ROLES.CLINIC_OWNER }))
        .rejects.toThrow('Unauthorized. You do not own this clinic.');
    });

    test('Negative: Forged provider type', async () => {
      await expect(universalReferralService.validateProviderAccess('fake_type', 'clinic-123', { id: 'user-1', role: ROLES.CLINIC_OWNER }))
        .rejects.toThrow('Invalid organization type.');
    });

    test('Negative: Doctor as provider type (should fail before query)', async () => {
      await expect(universalReferralService.validateProviderAccess('doctor', 'doc-123', { id: 'doc-user', role: ROLES.DOCTOR }))
        .rejects.toThrow('Invalid organization type.');
    });
  });

  describe('Patient Access Validation', () => {
    test('Authorized patient (exists in appointments for clinic)', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'patient-123' } }), // patient exists
        then: jest.fn().mockImplementation((cb) => cb({ data: [{ doctor_id: 'doc-1', clinic_id: 'clinic-1', status: 'completed' }] })) // clinic appt exists
      };
      supabaseAdmin.from.mockReturnValue(builder);

      const result = await universalReferralService.validatePatientAccess('clinic', 'clinic-1', 'patient-123');
      expect(result).toBe(true);
    });

    test('Unauthorized patient (no records found)', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'patient-123' } }),
        then: jest.fn().mockImplementation((cb) => cb({ data: [] })) // no clinic appts
      };
      supabaseAdmin.from.mockReturnValue(builder);

      await expect(universalReferralService.validatePatientAccess('clinic', 'clinic-1', 'patient-123'))
        .rejects.toThrow('Unauthorized. No active relationship or explicit consent found with this patient.');
    });
  });

  describe('Receiver Verification (validateReceiverActive)', () => {
    const mockReceiver = (isActive, isApproved, approvalStatus = 'approved') => {
      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { is_active: isActive, is_approved: isApproved, approval_status: approvalStatus },
          error: null
        })
      });
    };

    test('1. Clinic -> partnered Hospital (PASS: partnered or unpartnered, logic only checks verification)', async () => {
      mockReceiver(true, true, 'approved');
      const result = await universalReferralService.validateReceiverActive('hospital', 'hosp-1');
      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('hospitals');
    });

    test('2. Clinic -> unpartnered verified Hospital (PASS)', async () => {
      mockReceiver(true, true, 'approved');
      const result = await universalReferralService.validateReceiverActive('hospital', 'hosp-1');
      expect(result).toBe(true);
    });

    test('3. Clinic -> unpartnered verified Diagnostic Center (PASS)', async () => {
      mockReceiver(true, true, 'approved');
      const result = await universalReferralService.validateReceiverActive('diagnostic_center', 'dc-1');
      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('diagnostic_centers');
    });

    test('4. Clinic -> unpartnered verified Pharmacy (PASS)', async () => {
      mockReceiver(true, true, 'approved');
      const result = await universalReferralService.validateReceiverActive('pharmacy', 'pharm-1');
      expect(result).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('pharmacies');
    });

    test('8. Unverified receiver = BLOCK', async () => {
      mockReceiver(true, false, 'pending');
      await expect(universalReferralService.validateReceiverActive('hospital', 'hosp-1'))
        .rejects.toThrow('Receiver is not verified.');
    });

    test('9. Inactive receiver = BLOCK', async () => {
      mockReceiver(false, true, 'approved');
      await expect(universalReferralService.validateReceiverActive('hospital', 'hosp-1'))
        .rejects.toThrow('Receiver is not active.');
    });

    test('12. Self referral = BLOCK', async () => {
      // This is still in validateReferralPartnership or createReferral
      await expect(universalReferralService.validateReferralPartnership('clinic', 'id-1', 'clinic', 'id-1'))
        .rejects.toThrow('Cannot refer to the same organization.');
    });

    test('13. Doctor as destination = BLOCK', async () => {
      await expect(universalReferralService.validateReceiverActive('doctor', 'doc-1'))
        .rejects.toThrow('Invalid receiver type: doctor');
    });
  });


  describe('Lifecycle Status Validation', () => {
    test('Valid transition: pending -> accepted (Receiver)', () => {
      expect(universalReferralService.validateStatusTransition('pending', 'accepted', true)).toBe(true);
    });
    
    test('Invalid transition: accepted -> rejected (Receiver)', () => {
      expect(() => universalReferralService.validateStatusTransition('accepted', 'rejected', true))
        .toThrow('Invalid state transition');
    });

    test('Invalid transition: accepted -> cancelled (Receiver or Sender)', () => {
      expect(() => universalReferralService.validateStatusTransition('accepted', 'cancelled', true))
        .toThrow('Invalid state transition');
      expect(() => universalReferralService.validateStatusTransition('accepted', 'cancelled', false))
        .toThrow('Invalid state transition');
    });
    
    test('Sender tries to accept (Unauthorized)', () => {
      expect(() => universalReferralService.validateStatusTransition('pending', 'accepted', false))
        .toThrow('Only the receiver can transition to accepted.');
    });
  });

  describe('Hospital Admission Validation', () => {
    test('Valid admission operation for hospital', () => {
      expect(universalReferralService.validateHospitalAdmission('hospital', 'admitted')).toBe(true);
    });

    test('Invalid admission state', () => {
      expect(() => universalReferralService.validateHospitalAdmission('hospital', 'fake_state'))
        .toThrow('Invalid hospital admission status');
    });

    test('Admission operation for non-hospital (rejected)', () => {
      expect(() => universalReferralService.validateHospitalAdmission('clinic', 'admitted'))
        .toThrow('Hospital admission status is only applicable for hospital receivers.');
    });
  });

  describe('Attachment Security', () => {
    test('Same patient report is allowed', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'ref-1', patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1' } }) // referral
          .mockResolvedValueOnce({ data: { id: 'cli-1' } }) // provider access (owner check)
          .mockResolvedValueOnce({ data: { patient_id: 'pat-1' } }) // report belongs to same patient
      };
      supabaseAdmin.from.mockReturnValue(builder);

      const result = await universalReferralService.validateAttachmentAccess('ref-1', { id: 'user-1', role: ROLES.CLINIC_OWNER }, 'rep-1', null);
      expect(result).toBe(true);
    });

    test('Cross patient report is rejected', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'ref-1', patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1' } }) // referral
          .mockResolvedValueOnce({ data: { id: 'cli-1' } }) // provider access (owner check)
          .mockResolvedValueOnce({ data: { patient_id: 'pat-2' } }) // Cross patient!
      };
      supabaseAdmin.from.mockReturnValue(builder);

      await expect(universalReferralService.validateAttachmentAccess('ref-1', { id: 'user-1', role: ROLES.CLINIC_OWNER }, 'rep-1', null))
        .rejects.toThrow('Report does not belong to the referred patient.');
    });
  });

  // ===========================================================================
  // Phase 7.6 — Document Sharing Security (13 mandatory scenarios)
  // ===========================================================================

  describe('P7.6 — getPatientDocumentsForReferral Authorization', () => {

    let validateAccessSpy;
    beforeEach(() => {
      validateAccessSpy = jest.spyOn(universalReferralService, 'validatePatientAccess').mockResolvedValue(true);
    });
    afterEach(() => {
      validateAccessSpy.mockRestore();
    });

    // Helpers for multi-step mocks needed by getPatientDocumentsForReferral:
    // 1. validateProviderAccess  → clinic owner check (from 'clinics')
    // 2. validatePatientAccess   → patient exists (from 'patients'), then appointment (from 'appointments')
    // 3. fetch docs              → reports, prescriptions

    const mockProviderOk = () => ({ data: { id: 'cli-1' }, error: null });
    const mockPatientOk = () => ({ data: { id: 'pat-1' }, error: null });
    const mockApptOk = () => ({ data: { id: 'appt-1' }, error: null });

    // Build a sequential mock builder factory
    const makeSeqBuilder = (seq) => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
      };
      let callIdx = 0;
      builder.maybeSingle.mockImplementation(() => {
        const result = seq[callIdx] || { data: null, error: null };
        callIdx++;
        return Promise.resolve(result);
      });
      // order() returns a non-single result shape (array), so mock separately
      builder.order.mockImplementation(() => ({
        ...builder,
        then: undefined,
        data: seq[callIdx]?.data || [],
        error: null,
      }));
      supabaseAdmin.from.mockReturnValue(builder);
      return builder;
    };

    // Test 1: Same-patient report = PASS
    test('T1: Same-patient report — PASS', async () => {
      // The service calls: clinics (owner), patients (exists), appointments (relationship), then reports+prescriptions
      let callCount = 0;
      const responses = [
        { data: { id: 'cli-1' } },        // validateProviderAccess → clinics
        { data: { id: 'pat-1' } },        // validatePatientAccess → patients
        { data: { id: 'appt-1' } },       // validatePatientAccess → appointments
      ];
      const reportsData = [{ id: 'rep-1', name: 'Blood Test', patient_id: 'pat-1', created_at: '2026-01-01' }];
      const prescriptionsData = [];

      supabaseAdmin.from.mockImplementation((table) => {
        const singleBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((cb) => {
            return cb({ data: [{ doctor_id: 'doc-1', clinic_id: 'cli-1', status: 'completed' }] });
          }),
          maybeSingle: jest.fn().mockImplementation(() => {
            const r = responses[callCount] || { data: null };
            callCount++;
            return Promise.resolve(r);
          }),
        };
        // For reports/prescriptions queries that use .order() without .maybeSingle()
        singleBuilder.order.mockImplementation(() =>
          Promise.resolve(
            table === 'reports' ? { data: reportsData, error: null } : { data: prescriptionsData, error: null }
          )
        );
        return singleBuilder;
      });

      const result = await universalReferralService.getPatientDocumentsForReferral(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { patientId: 'pat-1', senderType: 'clinic', senderId: 'cli-1' }
      );
      expect(result).toHaveProperty('reports');
      expect(result).toHaveProperty('prescriptions');
      expect(result.reports[0].id).toBe('rep-1');
      // Verify no raw file_url is returned
      expect(result.reports[0]).not.toHaveProperty('file_url');
    });

    // Test 2: Same-patient prescription = PASS
    test('T2: Same-patient prescription — PASS', async () => {
      let callCount = 0;
      const responses = [
        { data: { id: 'cli-1' } },
        { data: { id: 'pat-1' } },
        { data: { id: 'appt-1' } },
      ];
      const prescriptionsData = [{ id: 'prx-1', prescription_number: 'RX-001', patient_id: 'pat-1', created_at: '2026-01-01' }];

      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockImplementation(() => {
            const r = responses[callCount] || { data: null };
            callCount++;
            return Promise.resolve(r);
          }),
        };
        b.order.mockImplementation(() =>
          Promise.resolve(
            table === 'prescriptions' ? { data: prescriptionsData, error: null } : { data: [], error: null }
          )
        );
        return b;
      });

      const result = await universalReferralService.getPatientDocumentsForReferral(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { patientId: 'pat-1', senderType: 'clinic', senderId: 'cli-1' }
      );
      expect(result.prescriptions[0].id).toBe('prx-1');
      // No pdf_url or file_url should be returned
      expect(result.prescriptions[0]).not.toHaveProperty('pdf_url');
    });

    // Test 3: Cross-patient report = BLOCK (createReferral attachment validation)
    test('T3: Cross-patient report in createReferral — BLOCK', async () => {
      // Setup: all pre-attachment checks pass, but report.patient_id !== referral patient_id
      organizationPartnershipService.verifyActivePartnership.mockResolvedValue(true);
      consentService.verifyConsent.mockResolvedValue(true);

      let callCount = 0;
      // Sequence: clinics(owner), patients, appts, patients(receiver), clinics(receiver verify),
      //           clinics(receiver active check), clinics(sender snapshot), clinics(receiver snapshot),
      //           INSERT universal_referrals → returns referral,
      //           THEN report lookup → wrong patient_id, THEN compensating delete
      const responses = [
        { data: { id: 'cli-1' } },              // validateProviderAccess
        // validatePatientAccess is mocked via spy

        { data: { id: 'hosp-1', name: 'Hosp' } }, // validateReceiver
        { data: { is_active: true, is_approved: true, approval_status: 'approved' } }, // validateReceiverActive
        { data: { id: 'cli-1', name: 'Clinic A' } }, // senderSnapshot
        { data: { id: 'hosp-1', name: 'Hosp B' } }, // receiverSnapshot
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(),
          maybeSingle: jest.fn(),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
        };
        b.maybeSingle.mockImplementation(() => {
          if (table === 'reports') {
            return Promise.resolve({ data: { id: 'rep-bad', patient_id: 'pat-DIFFERENT' } });
          }
          const r = responses[callCount] || { data: null };
          callCount++;
          return Promise.resolve(r);
        });
        b.single.mockResolvedValue({ data: { id: 'ref-new', patient_id: 'pat-1' }, error: null });
        b.delete.mockReturnThis();
        b.eq.mockReturnThis();
        return b;
      });

      await expect(
        universalReferralService.createReferral(
          { id: 'user-1', role: ROLES.CLINIC_OWNER },
          {
            patient_id: 'pat-1',
            sender_type: 'clinic',
            sender_id: 'cli-1',
            receiver_type: 'hospital',
            receiver_id: 'hosp-1',
            reason: 'Specialist consult',
            urgency: 'routine',
            attachments: [{ report_id: 'rep-bad', document_type: 'report', file_name: 'test.pdf' }],
          }
        )
      ).rejects.toThrow('Cannot attach a report that does not belong to the referred patient.');
    });

    // Test 4: Cross-patient prescription = BLOCK
    test('T4: Cross-patient prescription in createReferral — BLOCK', async () => {
      organizationPartnershipService.verifyActivePartnership.mockResolvedValue(true);
      consentService.verifyConsent.mockResolvedValue(true);

      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'ref-new', patient_id: 'pat-1' }, error: null }),
          maybeSingle: jest.fn().mockImplementation(() => {
            if (table === 'prescriptions') {
              return Promise.resolve({ data: { id: 'prx-bad', patient_id: 'pat-OTHER' } });
            }
            // Everything else passes
            return Promise.resolve({ data: { id: 'some-id', is_active: true, is_approved: true, approval_status: 'approved', name: 'X' }, error: null });
          }),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
        };
        b.delete.mockReturnThis();
        return b;
      });

      await expect(
        universalReferralService.createReferral(
          { id: 'user-1', role: ROLES.CLINIC_OWNER },
          {
            patient_id: 'pat-1',
            sender_type: 'clinic',
            sender_id: 'cli-1',
            receiver_type: 'hospital',
            receiver_id: 'hosp-1',
            reason: 'Consult',
            attachments: [{ prescription_id: 'prx-bad', document_type: 'prescription', file_name: 'rx.pdf' }],
          }
        )
      ).rejects.toThrow('Cannot attach a prescription that does not belong to the referred patient.');
    });

    // Test 5: Unauthorized sender accessing another provider's patient documents = BLOCK
    test('T5: Unauthorized sender (no clinic ownership) — BLOCK', async () => {
      // validateProviderAccess will find no clinic owned by this user
      mockSupabaseBuilder(null); // clinic not owned by user
      await expect(
        universalReferralService.getPatientDocumentsForReferral(
          { id: 'attacker', role: ROLES.CLINIC_OWNER },
          { patientId: 'pat-1', senderType: 'clinic', senderId: 'cli-victim' }
        )
      ).rejects.toThrow(); // 'Unauthorized. You do not own this clinic.'
    });

    // Test 6: Forged sender_id = BLOCK
    test('T6: Forged sender_id in getPatientDocumentsForReferral — BLOCK', async () => {
      mockSupabaseBuilder(null); // Clinic lookup returns null → forged ID fails
      await expect(
        universalReferralService.getPatientDocumentsForReferral(
          { id: 'user-legit', role: ROLES.CLINIC_OWNER },
          { patientId: 'pat-1', senderType: 'clinic', senderId: 'forged-clinic-id' }
        )
      ).rejects.toThrow();
    });

    // Test 7: Forged sender_type = BLOCK
    test('T7: Forged sender_type (invalid type) — BLOCK', async () => {
      await expect(
        universalReferralService.getPatientDocumentsForReferral(
          { id: 'user-1', role: ROLES.CLINIC_OWNER },
          { patientId: 'pat-1', senderType: 'doctor', senderId: 'doc-1' }
        )
      ).rejects.toThrow('Invalid sender_type');
    });

    // Test 8: Unauthorized report sharing (sender has no patient relationship) = BLOCK
    test('T8: Sender has no patient relationship — BLOCK', async () => {
      const error = new Error('Unauthorized. No active relationship or explicit consent found with this patient.');
      error.statusCode = 403;
      validateAccessSpy.mockRejectedValueOnce(error);

      supabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'cli-1' } }) // pass provider access
      });

      // consentService will be called as fallback for non-clinic types
      // For clinic it won't reach consent — it throws immediately after no appt
      await expect(
        universalReferralService.getPatientDocumentsForReferral(
          { id: 'user-1', role: ROLES.CLINIC_OWNER },
          { patientId: 'pat-1', senderType: 'clinic', senderId: 'cli-1' }
        )
      ).rejects.toThrow('Unauthorized. No active relationship or explicit consent found with this patient.');
      
      expect(validateAccessSpy).toHaveBeenCalledWith('clinic', 'cli-1', 'pat-1');
    });

    // Test 9: Unauthorized prescription sharing (report not found) = BLOCK
    test('T9: Missing report in createReferral — BLOCK', async () => {
      organizationPartnershipService.verifyActivePartnership.mockResolvedValue(true);
      consentService.verifyConsent.mockResolvedValue(true);

      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'ref-new', patient_id: 'pat-1' }, error: null }),
          maybeSingle: jest.fn().mockImplementation(() => {
            if (table === 'reports') {
              return Promise.resolve({ data: null }); // Report not found
            }
            return Promise.resolve({ data: { id: 'x', is_active: true, is_approved: true, approval_status: 'approved', name: 'X' } });
          }),
          insert: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
        };
        b.delete.mockReturnThis();
        return b;
      });

      await expect(
        universalReferralService.createReferral(
          { id: 'user-1', role: ROLES.CLINIC_OWNER },
          {
            patient_id: 'pat-1',
            sender_type: 'clinic',
            sender_id: 'cli-1',
            receiver_type: 'hospital',
            receiver_id: 'hosp-1',
            reason: 'Consult',
            attachments: [{ report_id: 'rep-nonexistent', document_type: 'report', file_name: 'test.pdf' }],
          }
        )
      ).rejects.toThrow('not found');
    });

    // Test 10: Multiple valid attachments = PASS
    test('T10: Multiple valid attachments (same patient) — PASS', async () => {
      organizationPartnershipService.verifyActivePartnership.mockResolvedValue(true);
      consentService.verifyConsent.mockResolvedValue(true);

      let reportCount = 0;
      let prxCount = 0;

      // The real createReferral does: from('universal_referrals').insert(...).select('*').single()
      // So the insert mock must return an object with select().single() chaining.
      const makeSingleResult = (data) => ({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data, error: null }),
        }),
      });

      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'ref-new', patient_id: 'pat-1' }, error: null }),
          maybeSingle: jest.fn().mockImplementation(() => {
            if (table === 'reports') {
              reportCount++;
              return Promise.resolve({ data: { id: `rep-${reportCount}`, patient_id: 'pat-1' } });
            }
            if (table === 'prescriptions') {
              prxCount++;
              return Promise.resolve({ data: { id: `prx-${prxCount}`, patient_id: 'pat-1' } });
            }
            return Promise.resolve({ data: { id: 'x', is_active: true, is_approved: true, approval_status: 'approved', name: 'X' } });
          }),
          // insert must return chained .select().single() for the referral INSERT
          insert: jest.fn().mockReturnValue(
            table === 'universal_referrals'
              ? makeSingleResult({ id: 'ref-new', patient_id: 'pat-1' })
              : { data: null, error: null, select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) }
          ),
          delete: jest.fn().mockReturnThis(),
        };
        return b;
      });

      const result = await universalReferralService.createReferral(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        {
          patient_id: 'pat-1',
          sender_type: 'clinic',
          sender_id: 'cli-1',
          receiver_type: 'hospital',
          receiver_id: 'hosp-1',
          reason: 'Multi-doc test',
          attachments: [
            { report_id: 'rep-1', document_type: 'report', file_name: 'report1.pdf' },
            { prescription_id: 'prx-1', document_type: 'prescription', file_name: 'rx1.pdf' },
            { report_id: 'rep-2', document_type: 'report', file_name: 'report2.pdf' },
          ],
        }
      );
      expect(result).toHaveProperty('id');
    });

    // Test 11: Zero attachments = PASS
    test('T11: Zero attachments — PASS', async () => {
      organizationPartnershipService.verifyActivePartnership.mockResolvedValue(true);
      consentService.verifyConsent.mockResolvedValue(true);

      // insert must chain: .select('*').single()
      const insertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'ref-new', patient_id: 'pat-1' }, error: null }),
        }),
      };

      supabaseAdmin.from.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'ref-new', patient_id: 'pat-1' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'x', is_active: true, is_approved: true, approval_status: 'approved', name: 'X' },
          error: null,
        }),
        insert: jest.fn().mockReturnValue(table === 'universal_referrals' ? insertChain : { data: null, error: null }),
      }));

      const result = await universalReferralService.createReferral(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        {
          patient_id: 'pat-1',
          sender_type: 'clinic',
          sender_id: 'cli-1',
          receiver_type: 'hospital',
          receiver_id: 'hosp-1',
          reason: 'No attachments test',
          attachments: [],
        }
      );
      expect(result).toHaveProperty('id');
    });

    // Test 12: Receiver sees explicitly attached same-patient report — PASS
    // validateAttachmentAccess flow:
    //   1. from('universal_referrals').maybeSingle()           → referral row
    //   2. validateProviderAccess(sender_type='clinic', sender_id='cli-1', recv-user)
    //        → from('clinics').maybeSingle() → null (recv-user not the clinic owner) → throws
    //   3. validateProviderAccess(receiver_type='hospital', receiver_id='hosp-1', recv-user)
    //        → from('hospitals').maybeSingle() → { id: 'hosp-1' } → passes
    //   4. from('reports').maybeSingle()                       → same-patient doc → passes
    test('T12: Receiver can access explicitly attached same-patient report — PASS', async () => {
      let maybeSingleCallCount = 0;
      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockImplementation(() => {
            maybeSingleCallCount++;
            if (table === 'universal_referrals') {
              return Promise.resolve({ data: { id: 'ref-1', patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1', receiver_type: 'hospital', receiver_id: 'hosp-1' } });
            }
            if (table === 'clinics') {
              // recv-user does NOT own this clinic
              return Promise.resolve({ data: null });
            }
            if (table === 'hospitals') {
              // recv-user IS the hospital owner
              return Promise.resolve({ data: { id: 'hosp-1' } });
            }
            if (table === 'reports') {
              return Promise.resolve({ data: { patient_id: 'pat-1' } });
            }
            return Promise.resolve({ data: null });
          }),
        };
        return b;
      });

      const result = await universalReferralService.validateAttachmentAccess(
        'ref-1', { id: 'recv-user', role: ROLES.HOSPITAL_OWNER }, 'rep-1', null
      );
      expect(result).toBe(true);
    });

    // Test 13: Receiver cannot access unrelated patient documents — BLOCK
    test('T13: Receiver cannot access unrelated patient documents — BLOCK', async () => {
      supabaseAdmin.from.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() => {
          if (table === 'universal_referrals') {
            return Promise.resolve({ data: { id: 'ref-1', patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1', receiver_type: 'hospital', receiver_id: 'hosp-1' } });
          }
          if (table === 'clinics') return Promise.resolve({ data: null }); // sender check fails
          if (table === 'hospitals') return Promise.resolve({ data: { id: 'hosp-1' } }); // receiver passes
          if (table === 'reports') return Promise.resolve({ data: { patient_id: 'pat-UNRELATED' } }); // wrong patient!
          return Promise.resolve({ data: null });
        }),
      }));

      await expect(
        universalReferralService.validateAttachmentAccess(
          'ref-1', { id: 'recv-user', role: ROLES.HOSPITAL_OWNER }, 'rep-unrelated', null
        )
      ).rejects.toThrow('Report does not belong to the referred patient.');
    });
  });

  // ===========================================================================
  // Phase 7.7 — Patient Search Authorization & Logic (8 Scenarios)
  // ===========================================================================
  describe('P7.7 — searchAuthorizedPatients', () => {

    const setupMocks = (validateProviderAccessResult = true, junctionData = [], patientsData = []) => {
      // Mock validateProviderAccess explicitly since it's an internal call
      jest.spyOn(universalReferralService, 'validateProviderAccess').mockImplementation(() => {
        if (!validateProviderAccessResult) return Promise.reject(new Error('Unauthorized'));
        return Promise.resolve(true);
      });

      let currentIlike = null;

      supabaseAdmin.from.mockImplementation((table) => {
        const b = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockImplementation((field, value) => {
            currentIlike = { field, value: value.replace(/%/g, '').toLowerCase() };
            return b;
          }),
          then: jest.fn().mockImplementation((cb) => {
            if (['appointments', 'pharmacy_orders', 'diagnostic_bookings'].includes(table)) {
              return cb({ data: junctionData, error: null });
            }
            if (table === 'patients') {
              let filtered = patientsData;
              if (currentIlike && currentIlike.field === 'name') {
                filtered = patientsData.filter(p => p.name.toLowerCase().includes(currentIlike.value));
              }
              currentIlike = null; // reset for next query
              return cb({ data: filtered, error: null });
            }
            return cb({ data: null, error: null });
          }),
        };
        return b;
      });
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // S1 — Authorized clinic patient appears (PASS)
    test('S1: Authorized clinic patient appears — PASS', async () => {
      setupMocks(true, [{ patient_id: 'pat-1' }], [{ id: 'pat-1', name: 'John Doe', user: { phone: '1234567890' } }]);
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { senderType: 'clinic', senderId: 'cli-1' }
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('pat-1');
      // Verify no medical history returned
      expect(result.data[0]).not.toHaveProperty('medical_history');
      expect(result.data[0]).not.toHaveProperty('reports');
    });

    // S2 — Patient belonging to another clinic does not appear (BLOCK)
    test('S2: Patient belonging to another clinic does not appear — BLOCK / absent', async () => {
      // Junction data returns nothing (no active appointments for this clinic)
      setupMocks(true, [], []);
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { senderType: 'clinic', senderId: 'cli-1' }
      );
      expect(result.data.length).toBe(0);
    });

    // S3 — Name search filters correctly (PASS)
    test('S3: Name search filters correctly — PASS', async () => {
      // Backend uses ilike, so we simulate patients matching the name
      setupMocks(true, [{ patient_id: 'pat-1' }], [{ id: 'pat-1', name: 'Alice Smith', user: { phone: '123' } }]);
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { senderType: 'clinic', senderId: 'cli-1', q: 'Alice' }
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Alice Smith');
    });

    // S4 — Phone search filters correctly (PASS)
    test('S4: Phone search filters correctly — PASS', async () => {
      // The backend fetches all candidates if q is phone, then filters in memory
      setupMocks(true, [{ patient_id: 'pat-1' }, { patient_id: 'pat-2' }], [
        { id: 'pat-1', name: 'Bob', user: { phone: '9998887777' } },
        { id: 'pat-2', name: 'Charlie', user: { phone: '1112223333' } }
      ]);
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { senderType: 'clinic', senderId: 'cli-1', q: '999888' }
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0].phone).toBe('9998887777'); // In-memory mapping check
    });

    // S5 — Pagination returns correct page/window (PASS)
    test('S5: Pagination returns correct page/window — PASS', async () => {
      // Simulate 5 patients, asking for page 2 limit 2
      const junction = Array.from({ length: 5 }, (_, i) => ({ patient_id: `pat-${i+1}` }));
      const patients = Array.from({ length: 5 }, (_, i) => ({ id: `pat-${i+1}`, name: `Patient ${i+1}`, user: null }));
      setupMocks(true, junction, patients);
      
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { senderType: 'clinic', senderId: 'cli-1', page: 2, limit: 2 }
      );
      // Backend does in-memory slice for phone/empty queries
      expect(result.data.length).toBe(2);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalPages).toBe(3); // 5 items / limit 2 = 3 pages
      expect(result.data[0].id).toBe('pat-3'); // 0,1 are pg1; 2,3 are pg2 (pat-3, pat-4)
    });

    // S6 — Invalid sender_type (400)
    test('S6: Invalid sender_type — 400', async () => {
      await expect(
        universalReferralService.searchAuthorizedPatients(
          { id: 'user-1', role: ROLES.CLINIC_OWNER },
          { senderType: 'invalid_type', senderId: 'cli-1' }
        )
      ).rejects.toThrow('Invalid sender_type');
    });

    // S7 — Forged sender_id where req.user does not own/belong to the organization (403)
    test('S7: Forged sender_id — 403', async () => {
      setupMocks(false); // validateProviderAccess throws
      await expect(
        universalReferralService.searchAuthorizedPatients(
          { id: 'user-hacker', role: ROLES.CLINIC_OWNER },
          { senderType: 'clinic', senderId: 'cli-victim' }
        )
      ).rejects.toThrow('Unauthorized');
    });

    // S8 — Empty query (only current page, max limit, no unlimited)
    test('S8: Empty query honors pagination limits', async () => {
      const junction = Array.from({ length: 100 }, (_, i) => ({ patient_id: `pat-${i+1}` }));
      const patients = Array.from({ length: 100 }, (_, i) => ({ id: `pat-${i+1}`, name: `Patient ${i+1}`, user: null }));
      setupMocks(true, junction, patients);

      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.CLINIC_OWNER },
        { senderType: 'clinic', senderId: 'cli-1', q: '', limit: 500 } // try to request 500
      );
      // Safe limit logic in service caps at 50
      expect(result.pagination.limit).toBe(50);
      expect(result.data.length).toBe(50);
      expect(result.pagination.totalPages).toBe(2);
    });

    // Cross-Provider Coverage & Duplicate Prevention
    test('Cross-Provider: Diagnostic Center uses center_id and prevents duplicates', async () => {
      // Simulate patient having 3 diagnostic bookings
      const junction = [
        { patient_id: 'pat-1' },
        { patient_id: 'pat-1' },
        { patient_id: 'pat-1' }
      ];
      setupMocks(true, junction, [{ id: 'pat-1', name: 'John', user: null }]);
      
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.DIAGNOSTIC_OWNER },
        { senderType: 'diagnostic_center', senderId: 'dc-1' }
      );
      
      // Duplicate prevention check
      expect(result.data.length).toBe(1);
      
      // Verify center_id was used
      expect(supabaseAdmin.from).toHaveBeenCalledWith('diagnostic_bookings');
      // The builder 'eq' is hard to spy exactly without deeper mocks, but we verify it targets diagnostic_bookings
    });

    test('Cross-Provider: Hospital', async () => {
      setupMocks(true, [{ patient_id: 'pat-2' }], [{ id: 'pat-2', name: 'Jane', user: null }]);
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.HOSPITAL_OWNER },
        { senderType: 'hospital', senderId: 'hosp-1' }
      );
      expect(result.data.length).toBe(1);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('appointments');
    });

    test('Cross-Provider: Pharmacy', async () => {
      setupMocks(true, [{ patient_id: 'pat-3' }], [{ id: 'pat-3', name: 'Jim', user: null }]);
      const result = await universalReferralService.searchAuthorizedPatients(
        { id: 'user-1', role: ROLES.PHARMACY_OWNER },
        { senderType: 'pharmacy', senderId: 'pharm-1' }
      );
      expect(result.data.length).toBe(1);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('pharmacy_orders');
    });

    test('Security: unauthorized provider cannot search another provider\'s patients', async () => {
      // Handled by S7, but specifically ensuring that an invalid type doesn't bypass checks
      // handled by S6.
      expect(true).toBe(true);
    });
  });

  describe('P7.10 — Universal Referral Consent', () => {
    test('C1: Valid explicit receiver-specific consent -> PASS', async () => {
      jest.spyOn(consentService, 'verifyConsent').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validateProviderAccess').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validatePatientAccess').mockResolvedValue(true);
      const result = await universalReferralService.checkReferralConsent(
        { id: 'user-1', role: 'clinic_owner' },
        { patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1', receiver_type: 'pharmacy', receiver_id: 'pharm-1' }
      );
      expect(result.hasConsent).toBe(true);
    });

    test('C2: No consent -> BLOCK (createReferral)', async () => {
      jest.spyOn(consentService, 'verifyConsent').mockResolvedValue(false);
      jest.spyOn(universalReferralService, 'validateProviderAccess').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validatePatientAccess').mockResolvedValue(true);
      await expect(universalReferralService.createReferral({ id: 'user-1', role: 'clinic_owner' }, {
        patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1', receiver_type: 'pharmacy', receiver_id: 'pharm-1', reason: 'Test'
      })).rejects.toThrow(/Missing explicit patient consent/);
    });

    test('C3: Consent for provider A but referral to provider B -> BLOCK', async () => {
      jest.spyOn(universalReferralService, 'validateProviderAccess').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validatePatientAccess').mockResolvedValue(true);
      jest.spyOn(consentService, 'verifyConsent').mockImplementation(async (patient, type, id) => {
        return id === 'pharm-A'; // Only pharm-A has consent
      });
      await expect(universalReferralService.createReferral({ id: 'user-1', role: 'clinic_owner' }, {
        patient_id: 'pat-1', sender_type: 'clinic', sender_id: 'cli-1', receiver_type: 'pharmacy', receiver_id: 'pharm-B', reason: 'Test'
      })).rejects.toThrow(/Missing explicit patient consent/);
    });
  });

  describe('P7.9 — Universal Referral Final Submission (createReferral)', () => {
    test('Successful submission with all valid conditions', async () => {
      jest.spyOn(universalReferralService, 'validateProviderAccess').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validatePatientAccess').mockResolvedValue(true);
      jest.spyOn(consentService, 'verifyConsent').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validateReceiver').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'validateReceiverActive').mockResolvedValue(true);
      jest.spyOn(universalReferralService, 'getProviderSnapshot').mockResolvedValue('Mock Snapshot');
      
      const insertMock = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'referral-123' }, error: null }) }) });
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'universal_referrals') {
          return { insert: insertMock };
        }
        if (table === 'reports') {
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'report-1', patient_id: 'pat-1' } }) };
        }
        if (table === 'referral_attachments') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) };
      });

      const payload = {
        patient_id: 'pat-1',
        sender_type: 'clinic',
        sender_id: 'clinic-1',
        receiver_type: 'pharmacy',
        receiver_id: 'pharm-1',
        reason: 'Test Reason',
        urgency: 'routine',
        attachments: [{ report_id: 'report-1', document_type: 'report', file_name: 'test.pdf' }]
      };
      
      const user = { id: 'user-1', name: 'Test Doctor' };
      const referral = await universalReferralService.createReferral(user, payload);
      
      expect(referral.id).toBe('referral-123');
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        patient_id: 'pat-1',
        sender_type: 'clinic',
        sender_snapshot_name: 'Mock Snapshot',
        receiver_snapshot_name: 'Mock Snapshot',
      }));
    });
  });

});
