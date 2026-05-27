jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn(() => Promise.resolve({ id: 'notification-1' })),
}));

const { supabaseAdmin } = require('../config/supabase');
const notificationService = require('../services/notificationService');
const emergencyContactNotificationService = require('../services/emergencyContactNotificationService');

const makeBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
  return builder;
};

describe('emergency contact notification sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('notifies matched emergency contact users for Guardian fall alerts', async () => {
    const patientBuilder = makeBuilder({
      data: { id: 'patient-1', name: 'Patient One', user_id: 'patient-user-1' },
      error: null,
    });
    const contactsBuilder = makeBuilder({
      data: [
        { id: 'contact-1', name: 'Contact One', phone: '+91 98765 43210', relationship: 'family' },
      ],
      error: null,
    });
    const usersBuilder = makeBuilder({
      data: [
        { id: 'contact-user-1', phone: '+919876543210' },
        { id: 'patient-user-1', phone: '+919876543210' },
      ],
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(patientBuilder)
      .mockReturnValueOnce(contactsBuilder)
      .mockReturnValueOnce(usersBuilder);

    const result = await emergencyContactNotificationService.notifyEmergencyContacts('patient-user-1', {
      alertType: 'fall_detected',
      latitude: 12.34,
      longitude: 56.78,
      sourceId: 'fall-1',
    });

    expect(result).toEqual(expect.objectContaining({
      alertType: 'fall_detected',
      contactCount: 1,
      matchedUserCount: 1,
      notifiedUserCount: 1,
      skippedContactCount: 0,
    }));
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      'contact-user-1',
      expect.objectContaining({
        type: 'fall_detected',
        data: expect.objectContaining({
          alertType: 'fall_detected',
          patientUserId: 'patient-user-1',
          sourceId: 'fall-1',
          locationUrl: 'https://maps.google.com/?q=12.34,56.78',
        }),
      })
    );
  });
});
