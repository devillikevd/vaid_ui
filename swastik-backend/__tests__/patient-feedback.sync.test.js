jest.mock('../config/supabase', () => {
  const resultQueue = [];
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    is: jest.fn(() => builder),
    not: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(() => builder),
    single: jest.fn(() => builder),
    update: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    onConflict: jest.fn(() => builder),
    then: (resolve) => {
      const next = resultQueue.length ? resultQueue.shift() : { data: null, error: null };
      return Promise.resolve(resolve(next));
    },
  };
  return {
    __resultQueue: resultQueue,
    __builder: builder,
    supabaseAdmin: {
      from: jest.fn(() => builder),
      rpc: jest.fn(() => Promise.resolve({ data: { success: true }, error: null })),
    },
  };
});

jest.mock('../config/minio', () => ({
  uploadProfileImage: jest.fn(() => Promise.resolve({ url: 'https://minio.local/screenshot.jpg' })),
  signStorageUrlsInPayload: jest.fn((p) => Promise.resolve(p)),
}));

jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn(() => Promise.resolve({ id: 'notif-1' })),
}));

jest.mock('../services/eventEmitter', () => ({
  emitConsultationStarted: jest.fn(),
  emitConsultationEnded: jest.fn(),
  emitConsultationStage: jest.fn(),
  emitConsultationLog: jest.fn(),
}));

const { supabaseAdmin, __resultQueue } = require('../config/supabase');
const notificationService = require('../services/notificationService');
const { DoctorFeedback } = require('../database/models');

const pushResult = (data, error = null) => __resultQueue.push({ data, error });

describe('Patient App Feedback & Admin Center Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resultQueue.length = 0;
  });

  test('DoctorFeedback model instantiates with patient details and contact permissions', () => {
    const feedback = new DoctorFeedback({
      userId: 'user-pat-123',
      userRole: 'patient',
      userName: 'Chandan Kumar',
      userEmail: 'chandan@example.com',
      patientPhone: '+919876543210',
      type: 'bug',
      category: 'Bug Report',
      title: 'App crashed when booking medicine',
      description: 'The app crashed when I pressed confirm order on the checkout screen.',
      rating: 2,
      allowContact: true,
      device: 'Android App',
      appVersion: '1.0.0',
      status: 'Submitted',
      priority: 'High',
    });

    expect(feedback.userRole).toBe('patient');
    expect(feedback.userName).toBe('Chandan Kumar');
    expect(feedback.patientPhone).toBe('+919876543210');
    expect(feedback.allowContact).toBe(true);
    expect(feedback.rating).toBe(2);
    expect(feedback.priority).toBe('High');
    expect(feedback.status).toBe('Submitted');
  });
});
