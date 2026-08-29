jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../config/minio', () => ({
  uploadProfileImage: jest.fn(),
  deleteFile: jest.fn(),
  signStorageUrlsInPayload: jest.fn((payload) => Promise.resolve(payload)),
}));

jest.mock('../config/redis', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve()),
  cacheDel: jest.fn(() => Promise.resolve()),
}));

const { supabaseAdmin } = require('../config/supabase');
const doctorService = require('../services/doctorService');

const makeSlotsQueryBuilder = (allSlots) => {
  const filters = {};
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn((col, val) => {
      filters[col] = val;
      return builder;
    }),
    neq: jest.fn((col, val) => {
      filters[`neq_${col}`] = val;
      return builder;
    }),
    in: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lt: jest.fn(() => builder),
    insert: jest.fn(() => Promise.resolve({ data: [{ id: 'new-slot' }], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [{ id: 'updated-slot' }], error: null })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
    single: jest.fn(() => Promise.resolve({ data: allSlots[0] || null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: allSlots[0] || null, error: null })),
    then: (resolve, reject) => {
      const filtered = allSlots.filter((s) => {
        if (filters.doctor_id && s.doctor_id && s.doctor_id !== filters.doctor_id) return false;
        if (filters.is_active !== undefined && s.is_active !== filters.is_active) return false;
        if (filters.slot_date && s.slot_date !== filters.slot_date) return false;
        if (filters.neq_id && s.id === filters.neq_id) return false;
        return true;
      });
      return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
    },
    catch: (fn) => Promise.resolve({ data: allSlots, error: null }).catch(fn),
    finally: (fn) => Promise.resolve({ data: allSlots, error: null }).finally(fn),
  };
  return builder;
};

describe('Doctor Schedule Conflict Detection per Exact Calendar Date', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const doctorMock = { id: 'doc-1', user_id: 'user-1' };

  test('TEST 1: Existing schedule on Aug 27 does NOT conflict with new schedule on Sep 3 (different dates)', async () => {
    const existingSlots = [
      {
        id: 'slot-aug27',
        doctor_id: 'doc-1',
        slot_date: '2026-08-27',
        start_time: '09:00:00',
        end_time: '18:01:00',
        is_active: true,
        is_video_enabled: true,
        is_clinic_enabled: false,
      },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeSlotsQueryBuilder([doctorMock]);
      }
      if (table === 'doctor_slots') {
        return makeSlotsQueryBuilder(existingSlots);
      }
      return makeSlotsQueryBuilder([]);
    });

    const conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-03', 540, 1081);
    expect(conflicts).toHaveLength(0);
  });

  test('TEST 2: Existing schedule on Sep 3 (10:00-14:00) DOES conflict with candidate Sep 3 (09:00-18:01)', async () => {
    const existingSlots = [
      {
        id: 'slot-sep3-mid',
        doctor_id: 'doc-1',
        slot_date: '2026-09-03',
        start_time: '10:00:00',
        end_time: '14:00:00',
        is_active: true,
        is_video_enabled: true,
        is_clinic_enabled: false,
      },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctor_slots') {
        return makeSlotsQueryBuilder(existingSlots);
      }
      return makeSlotsQueryBuilder([]);
    });

    // Candidate: 09:00 (540 mins) to 18:01 (1081 mins)
    const conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-03', 540, 1081);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].date).toBe('2026-09-03');
    expect(conflicts[0].start_time).toBe('10:00:00');
    expect(conflicts[0].end_time).toBe('14:00:00');
  });

  test('TEST 3: Same day Sep 3 non-overlapping windows (09:00-12:00 and 15:00-18:00) are ALLOWED', async () => {
    const existingSlots = [
      {
        id: 'slot-sep3-morning',
        doctor_id: 'doc-1',
        slot_date: '2026-09-03',
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_active: true,
        is_video_enabled: true,
        is_clinic_enabled: false,
      },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctor_slots') {
        return makeSlotsQueryBuilder(existingSlots);
      }
      return makeSlotsQueryBuilder([]);
    });

    // Candidate: 15:00 (900 mins) to 18:00 (1080 mins)
    const conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-03', 900, 1080);
    expect(conflicts).toHaveLength(0);
  });

  test('TEST 4: Same day Sep 3 overlapping windows (09:00-12:00 and 11:00-14:00) yield 409 CONFLICT', async () => {
    const existingSlots = [
      {
        id: 'slot-sep3-morning',
        doctor_id: 'doc-1',
        slot_date: '2026-09-03',
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_active: true,
        is_video_enabled: true,
        is_clinic_enabled: false,
      },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctor_slots') {
        return makeSlotsQueryBuilder(existingSlots);
      }
      return makeSlotsQueryBuilder([]);
    });

    // Candidate: 11:00 (660 mins) to 14:00 (840 mins) -> overlaps 11:00 to 12:00
    const conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-03', 660, 840);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].start_time).toBe('09:00:00');
    expect(conflicts[0].end_time).toBe('12:00:00');
  });

  test('TEST 5: Recurring series (Sep 4, Sep 11, Sep 18) correctly isolates conflicts per exact date', async () => {
    const existingSlots = [
      {
        id: 'slot-sep11',
        doctor_id: 'doc-1',
        slot_date: '2026-09-11',
        start_time: '10:00:00',
        end_time: '12:00:00',
        is_active: true,
        is_video_enabled: true,
        is_clinic_enabled: false,
      },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctor_slots') {
        return makeSlotsQueryBuilder(existingSlots);
      }
      return makeSlotsQueryBuilder([]);
    });

    const sep4Conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-04', 540, 1020);
    const sep11Conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-11', 540, 1020);
    const sep18Conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-18', 540, 1020);

    expect(sep4Conflicts).toHaveLength(0);
    expect(sep11Conflicts).toHaveLength(1);
    expect(sep11Conflicts[0].date).toBe('2026-09-11');
    expect(sep18Conflicts).toHaveLength(0);
  });

  test('TEST 6: Past date (Aug 27) does NOT conflict with future date (Sep 3)', async () => {
    const existingSlots = [
      {
        id: 'slot-aug27-past',
        doctor_id: 'doc-1',
        slot_date: '2026-08-27',
        start_time: '09:00:00',
        end_time: '18:01:00',
        is_active: true,
        is_video_enabled: true,
        is_clinic_enabled: false,
      },
    ];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctor_slots') {
        return makeSlotsQueryBuilder(existingSlots);
      }
      return makeSlotsQueryBuilder([]);
    });

    const conflicts = await doctorService._findScheduleConflicts('doc-1', '2026-09-03', 540, 1081);
    expect(conflicts).toHaveLength(0);
  });
});
