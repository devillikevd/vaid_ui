jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../services/featureToggleService', () => ({
  getToggles: jest.fn(() => Promise.resolve({
    ai_vitals_monitoring: true,
    ai_consultation_assistant: true,
    heart_rate_rppg: true,
    respiration_monitoring: true,
    spo2_estimation: true,
    fall_detection: true,
  })),
  filterVitalsByToggles: jest.fn((_doctorUserId, vitals) => Promise.resolve(vitals)),
}));

jest.mock('../services/vitalsService', () => ({
  getLatest: jest.fn(() => Promise.resolve({
    session_id: 'consultation-1',
    heart_rate: 132,
    respiration_rate: 28,
    spo2: 89,
    fall_detected: false,
  })),
}));

jest.mock('axios', () => ({
  post: jest.fn(() => Promise.reject(new Error('AI service down'))),
}));

const { supabaseAdmin } = require('../config/supabase');
const consultationService = require('../services/consultationService');

const makeSelectBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

describe('consultation AI assistant fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns structured local clinical fallback when FastAPI AI is unavailable', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(makeSelectBuilder({
        data: {
          id: 'doctor-1',
          user_id: 'doctor-user-1',
          name: 'Asha',
          specialization: 'General Medicine',
        },
        error: null,
      }))
      .mockReturnValueOnce(makeSelectBuilder({
        data: {
          id: 'consultation-1',
          status: 'in_progress',
          diagnosis: null,
          notes: null,
          appointment_id: 'appointment-1',
          doctor_id: 'doctor-1',
          patient_id: 'patient-1',
        },
        error: null,
      }))
      .mockReturnValueOnce(makeSelectBuilder({
        data: {
          name: 'Chandan',
          blood_group: 'O+',
          allergies: 'Penicillin',
          chronic_conditions: 'Asthma',
          emergency_contact: null,
        },
        error: null,
      }));

    const result = await consultationService.aiAssistDoctor(
      'doctor-user-1',
      'consultation-1',
      'Interpret current vitals'
    );

    expect(result.provider).toBe('local-rule-fallback');
    expect(result.response.answer).toContain('Local clinical fallback is active');
    expect(result.response.answer).toContain('HR 132 bpm');
    expect(result.response.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TACHYCARDIA', metric: 'heart_rate' }),
        expect.objectContaining({ code: 'LOW_SPO2', metric: 'spo2', severity: 'critical' }),
      ])
    );
    expect(result.response.severity_assessment).toBe('critical');
    expect(result.response.suggested_questions.length).toBeGreaterThan(0);
  });
});
