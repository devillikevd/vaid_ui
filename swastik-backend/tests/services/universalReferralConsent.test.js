const universalReferralService = require('../../services/universalReferralService');
const { supabaseAdmin } = require('../../config/supabase');
const consentService = require('../../services/consentService');

jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis()
  }
}));

jest.mock('../../services/consentService', () => ({
  verifyConsent: jest.fn(),
  grantConsent: jest.fn()
}));

describe('Universal Referral Consent Flow', () => {
  const mockUser = { id: 'user-1', name: 'Dr. John' };
  const payload = {
    patient_id: 'pat-1',
    sender_type: 'clinic',
    sender_id: 'clin-1',
    receiver_type: 'hospital',
    receiver_id: 'hosp-1',
    reason: 'Cardio checkup'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock access validations
    universalReferralService.validateProviderAccess = jest.fn().mockResolvedValue(true);
    universalReferralService.validatePatientAccess = jest.fn().mockResolvedValue(true);
    universalReferralService.validateReceiver = jest.fn().mockResolvedValue(true);
    universalReferralService.validateReceiverActive = jest.fn().mockResolvedValue(true);
    universalReferralService.getProviderSnapshot = jest.fn().mockResolvedValue('Mock Provider Name');
  });

  it('createDraftReferral creates a new referral in awaiting_consent state', async () => {
    // Mock no existing draft
    supabaseAdmin.maybeSingle.mockResolvedValueOnce({ data: null });
    
    // Mock insert
    supabaseAdmin.single.mockResolvedValueOnce({ 
      data: { id: 'ref-1', status: 'awaiting_consent' } 
    });

    consentService.verifyConsent.mockResolvedValueOnce(false);

    const result = await universalReferralService.createDraftReferral(mockUser, payload);

    expect(result.referralId).toBe('ref-1');
    expect(result.hasConsent).toBe(false);
    expect(supabaseAdmin.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'awaiting_consent',
      consent_granted: false
    }));
  });

  it('submitReferral throws if consent is not granted', async () => {
    supabaseAdmin.single.mockResolvedValueOnce({ 
      data: { id: 'ref-1', status: 'awaiting_consent', ...payload } 
    });
    consentService.verifyConsent.mockResolvedValueOnce(false);

    await expect(universalReferralService.submitReferral(mockUser, 'ref-1'))
      .rejects.toThrow('Cannot submit referral. Missing explicit patient consent.');
  });

  it('submitReferral succeeds if consent is granted', async () => {
    supabaseAdmin.single.mockResolvedValueOnce({ 
      data: { id: 'ref-1', status: 'awaiting_consent', ...payload } 
    });
    // the update call
    supabaseAdmin.single.mockResolvedValueOnce({ 
      data: { id: 'ref-1', status: 'pending', consent_granted: true, ...payload } 
    });
    
    consentService.verifyConsent.mockResolvedValueOnce(true);
    
    universalReferralService._processAttribution = jest.fn().mockResolvedValue(true);

    const result = await universalReferralService.submitReferral(mockUser, 'ref-1');
    
    expect(result.status).toBe('pending');
    expect(supabaseAdmin.update).toHaveBeenCalledWith({
      status: 'pending',
      consent_granted: true
    });
  });
});
