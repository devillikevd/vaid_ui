jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve(true)),
  cacheDel: jest.fn(() => Promise.resolve(true)),
}));

const { supabaseAdmin } = require('../config/supabase');
const doctorService = require('../services/doctorService');

describe('doctorService.getAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDoctor = { id: 'doc-123', consultation_fee: 500 };

  test('calculates correct metrics for today filter with video and in-person appointments', async () => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const mockAppointments = [
      { id: 'apt-1', appointment_date: todayStr, status: 'completed', type: 'video', fee: 600, patient_id: 'p-1', time_slot: '10:00' },
      { id: 'apt-2', appointment_date: todayStr, status: 'completed', type: 'in_person', fee: 400, patient_id: 'p-2', time_slot: '11:00' },
      { id: 'apt-3', appointment_date: todayStr, status: 'cancelled', type: 'online', fee: 500, patient_id: 'p-3', time_slot: '12:00' },
      { id: 'apt-4', appointment_date: todayStr, status: 'scheduled', type: 'clinic', fee: 500, patient_id: 'p-4', time_slot: '14:00' },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        const b = {
          select: jest.fn(() => b),
          eq: jest.fn(() => b),
          maybeSingle: jest.fn(() => Promise.resolve({ data: mockDoctor, error: null })),
          single: jest.fn(() => Promise.resolve({ data: mockDoctor, error: null })),
        };
        return b;
      }
      if (table === 'appointments') {
        let isSlotQuery = false;
        const b = {
          select: jest.fn((fields) => {
            if (fields === 'time_slot') isSlotQuery = true;
            return b;
          }),
          eq: jest.fn(() => b),
          gte: jest.fn(() => b),
          lte: jest.fn(() => b),
          or: jest.fn(() => b),
          not: jest.fn(() => b),
          order: jest.fn(() => Promise.resolve({ data: mockAppointments, error: null })),
          then: (resolve) => {
            if (isSlotQuery) {
              resolve({ data: mockAppointments.map(a => ({ time_slot: a.time_slot })), error: null });
            } else {
              resolve({ data: mockAppointments, error: null });
            }
          },
        };
        return b;
      }
      return { select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })) };
    });

    const result = await doctorService.getAnalytics('user-123', 'today');

    expect(result.period).toBe('today');
    expect(result.startDate).toBe(todayStr);
    expect(result.endDate).toBe(todayStr);
    expect(result.summary.totalAppointments).toBe(4);
    expect(result.summary.videoConsultations).toBe(2); // apt-1 (video) + apt-3 (online)
    expect(result.summary.inPersonConsultations).toBe(2); // apt-2 (in_person) + apt-4 (clinic)
    expect(result.summary.completedAppointments).toBe(2);
    expect(result.summary.cancelledAppointments).toBe(1);
    expect(result.summary.totalRevenue).toBe(1000); // 600 + 400 (completed only)
    expect(result.summary.completionRate).toBe(50); // 2 / 4 * 100
    expect(result.summary.cancellationRate).toBe(25); // 1 / 4 * 100
    expect(result.summary.uniquePatients).toBe(4);
  });

  test('handles empty period gracefully without NaN', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        const b = {
          select: jest.fn(() => b),
          eq: jest.fn(() => b),
          maybeSingle: jest.fn(() => Promise.resolve({ data: mockDoctor, error: null })),
          single: jest.fn(() => Promise.resolve({ data: mockDoctor, error: null })),
        };
        return b;
      }
      if (table === 'appointments') {
        const b = {
          select: jest.fn(() => b),
          eq: jest.fn(() => b),
          gte: jest.fn(() => b),
          lte: jest.fn(() => b),
          or: jest.fn(() => b),
          not: jest.fn(() => b),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          then: (resolve) => resolve({ data: [], error: null }),
        };
        return b;
      }
      return { select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })) };
    });

    const result = await doctorService.getAnalytics('user-123', '7d');

    expect(result.summary.totalAppointments).toBe(0);
    expect(result.summary.videoConsultations).toBe(0);
    expect(result.summary.inPersonConsultations).toBe(0);
    expect(result.summary.completedAppointments).toBe(0);
    expect(result.summary.cancelledAppointments).toBe(0);
    expect(result.summary.totalRevenue).toBe(0);
    expect(result.summary.completionRate).toBe(0);
    expect(result.summary.cancellationRate).toBe(0);
  });
});
