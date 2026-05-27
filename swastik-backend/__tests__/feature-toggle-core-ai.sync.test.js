jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve()),
  cacheDel: jest.fn(() => Promise.resolve()),
}));

const { supabaseAdmin } = require('../config/supabase');
const { cacheSet } = require('../config/redis');
const featureToggleService = require('../services/featureToggleService');

const makeToggleBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
    upsert: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

describe('core consultation AI feature toggles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes stored disabled core AI toggles back to enabled', async () => {
    const builder = makeToggleBuilder({
      data: {
        toggles: {
          ai_vitals_monitoring: false,
          ai_consultation_assistant: false,
          heart_rate_rppg: false,
        },
      },
      error: null,
    });
    supabaseAdmin.from.mockReturnValueOnce(builder);

    const toggles = await featureToggleService.getToggles('doctor-user-1');

    expect(toggles.ai_vitals_monitoring).toBe(true);
    expect(toggles.ai_consultation_assistant).toBe(true);
    expect(toggles.heart_rate_rppg).toBe(false);
    expect(cacheSet).toHaveBeenCalledWith(
      'feature_toggles:doctor-user-1',
      expect.objectContaining({
        ai_vitals_monitoring: true,
        ai_consultation_assistant: true,
      }),
      expect.any(Number)
    );
  });

  test('updates cannot disable always-on core AI toggles', async () => {
    const currentBuilder = makeToggleBuilder({
      data: {
        toggles: {
          ai_vitals_monitoring: true,
          ai_consultation_assistant: true,
        },
      },
      error: null,
    });
    const upsertBuilder = makeToggleBuilder({ error: null });

    supabaseAdmin.from
      .mockReturnValueOnce(currentBuilder)
      .mockReturnValueOnce(upsertBuilder);

    const toggles = await featureToggleService.updateToggles('doctor-user-1', {
      ai_vitals_monitoring: false,
      ai_consultation_assistant: false,
      heart_rate_rppg: false,
    });

    expect(toggles.ai_vitals_monitoring).toBe(true);
    expect(toggles.ai_consultation_assistant).toBe(true);
    expect(toggles.heart_rate_rppg).toBe(false);
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        doctor_user_id: 'doctor-user-1',
        toggles: expect.objectContaining({
          ai_vitals_monitoring: true,
          ai_consultation_assistant: true,
          heart_rate_rppg: false,
        }),
      }),
      { onConflict: 'doctor_user_id' }
    );
  });
});
