/**
 * Diagnostic Center Service
 * Registration, management, tests catalog, appointments, and results
 */
const { supabaseAdmin } = require('../config/supabase');
const { randomUUID } = require('crypto');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { ApiError } = require('../middleware/errorHandler');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { maybeGeocodeLocationUpdates } = require('../utils/geocoding');
const { sanitizeSearch } = require('../utils/sanitize');
const eventEmitter = require('./eventEmitter');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');
const { signStorageUrlsInPayload } = require('../config/minio');

const normalizeDiagnosticBookingStatus = (status) => (
  status === 'booked' ? 'pending' : status
);

const getDiagnosticBookingStatusesForFilter = (status) => {
  const normalizedStatus = normalizeDiagnosticBookingStatus(status);
  if (normalizedStatus === 'pending') {
    return ['pending', 'booked'];
  }
  return [normalizedStatus];
};

const normalizeDiagnosticBookingRecord = (booking) => (
  booking ? {
    ...booking,
    status: normalizeDiagnosticBookingStatus(booking.status),
    facility: booking.facility || booking.center || null,
  } : booking
);

const normalizeDiagnosticBookingRecords = (bookings = []) => (
  bookings.map(normalizeDiagnosticBookingRecord)
);

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
});

const enrichMissingPhonesFromOwners = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const ownerIdsNeedingFallback = [
    ...new Set(
      rows
        .filter((row) => row && !row.phone && row.owner_id)
        .map((row) => row.owner_id)
    ),
  ];

  if (ownerIdsNeedingFallback.length === 0) return rows;

  const { data: owners, error } = await supabaseAdmin
    .from('users')
    .select('id, phone')
    .in('id', ownerIdsNeedingFallback);

  if (error || !owners) return rows;

  const ownerPhoneById = new Map(
    owners
      .filter((owner) => owner?.id && owner?.phone)
      .map((owner) => [owner.id, owner.phone])
  );

  return rows.map((row) => {
    if (row?.phone || !row?.owner_id) return row;
    const fallbackPhone = ownerPhoneById.get(row.owner_id);
    return fallbackPhone ? { ...row, phone: fallbackPhone } : row;
  });
};

// ==================== Public / Discovery ====================

// Search diagnostic centers
const searchDiagnosticCenters = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('diagnostic_centers')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_approved', true);

  if (filters.city) query = query.ilike('city', `%${sanitizeSearch(filters.city)}%`);
  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%`);
  }
  if (filters.testType) {
    query = query.contains('test_categories', [filters.testType]);
  }

  const { data, error, count } = await query
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;
  const recordsWithPhone = await enrichMissingPhonesFromOwners(data || []);

  return {
    data: recordsWithPhone,
    pagination: buildPagination(page, limit, count || 0),
  };
};

// Find nearby diagnostic centers
const findNearby = async (latitude, longitude, radius = 10) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  const { data, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (error) throw error;

  const recordsWithPhone = await enrichMissingPhonesFromOwners(data || []);

  return recordsWithPhone
    .map((dc) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: dc.latitude, longitude: dc.longitude });
      return { ...dc, distance: dist, distanceText: formatDistance(dist) };
    })
    .filter((dc) => dc.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

// Get diagnostic center by ID (public)
const getDiagnosticCenterById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .eq('approval_status', 'approved') // Fix #37: Only show approved centers publicly
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Diagnostic center not found');
  }

  const { data: assocs } = await supabaseAdmin
    .from('facility_provider_associations')
    .select('facility_id, facility_type')
    .eq('provider_id', id)
    .eq('provider_type', 'diagnostic_center')
    .eq('status', 'accepted')
    .maybeSingle();

  const { data: reels } = await supabaseAdmin
    .from('diagnostic_reels')
    .select('*')
    .eq('diagnostic_center_id', id)
    .order('created_at', { ascending: false });

  const { data: tests } = await supabaseAdmin
    .from('diagnostic_tests')
    .select('*')
    .eq('center_id', id)
    .eq('is_available', true);

  const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
  const center = recordWithPhone || data;

  return {
    ...center,
    reels: reels || [],
    tests: tests || [],
    hospital_id: assocs?.facility_type === 'hospital' ? assocs.facility_id : null,
    clinic_id: assocs?.facility_type === 'clinic' ? assocs.facility_id : null
  };
};

// ==================== Owner Registration ====================

// Register diagnostic center
const registerDiagnosticCenter = async (userId, centerData) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .insert({
      owner_id: userId,
      name: centerData.name,
      description: centerData.description,
      phone: centerData.phone,
      email: centerData.email,
      website: centerData.website,
      emergency_phone: centerData.emergencyPhone || centerData.emergency_phone,
      address: centerData.address,
      city: centerData.city,
      state: centerData.state,
      pincode: centerData.pincode,
      latitude: centerData.latitude,
      longitude: centerData.longitude,
      registration_number: centerData.registrationNumber || centerData.registration_number,
      license_number: centerData.licenseNumber || centerData.license_number,
      nabl_accreditation: centerData.nablAccreditation || centerData.nabl_accreditation,
      test_categories: centerData.testCategories || centerData.test_categories || [],
      accreditations: centerData.accreditations || [],
      is_active: false, // Pending admin approval
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// ==================== Owner Management ====================

// Get diagnostic center by owner
const getDiagnosticCenterByOwner = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Diagnostic center not found for this user');
  }

  const { data: reels } = await supabaseAdmin
    .from('diagnostic_reels')
    .select('*')
    .eq('diagnostic_center_id', data.id)
    .order('created_at', { ascending: false });

  const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
  const center = recordWithPhone || data;

  return {
    ...center,
    profile_image_url: center.profile_image_url || center.image_url || null,
    reels: reels || [],
  };
};

// Get dashboard stats
const getDashboard = async (centerId) => {
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalTests },
    { count: todayBookings },
    { count: pendingResults },
    { data: patientRows },
    { data: todayBookingsList },
    { data: recentBookings },
  ] = await Promise.all([
    supabaseAdmin
      .from('diagnostic_tests')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('is_active', true),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('booking_date', today)
      .neq('status', 'cancelled'),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('result_status', 'pending')
      .neq('status', 'cancelled'),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('patient_id')
      .eq('center_id', centerId)
      .not('patient_id', 'is', null),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*, patient:patients(name), test:diagnostic_tests(name, category)')
      .eq('center_id', centerId)
      .eq('booking_date', today)
      .neq('status', 'cancelled')
      .order('booking_time', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*, patient:patients(name), test:diagnostic_tests(name, category)')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const uniquePatients = new Set((patientRows || []).map((r) => r.patient_id)).size;

  return {
    stats: {
      totalTests: totalTests || 0,
      todayBookings: todayBookings || 0,
      // Legacy alias for web UI compatibility
      todaysBookings: todayBookings || 0,
      pendingResults: pendingResults || 0,
      totalPatients: uniquePatients,
    },
    todayBookings: todayBookingsList || [],
    todaysBookings: todayBookingsList || [],
    recentBookings: recentBookings || [],
  };
};

// Update diagnostic center profile — field whitelisting to prevent mass-assignment
const updateDiagnosticCenter = async (centerId, userId, updates) => {
  const { data: existingCenter, error: existingCenterError } = await supabaseAdmin
    .from('diagnostic_centers')
    .select('id, owner_id, address, city, state, pincode, latitude, longitude, approval_status')
    .eq('id', centerId)
    .eq('owner_id', userId)
    .single();

  if (existingCenterError || !existingCenter) {
    throw existingCenterError || new ApiError(404, 'Diagnostic center not found');
  }

  const ALLOWED_FIELDS = [
    'name', 'description', 'phone', 'email', 'website', 'website_url', 'emergency_phone',
    'address', 'city', 'state', 'pincode', 'latitude', 'longitude',
    'opening_hours', 'test_categories', 'accreditations', 'image_url',
    'sample_collection_available', 'home_collection_available', 'home_collection_fee', 'is_24_hours',
    'registration_number', 'license_number', 'license_document_url', 'nabl_accreditation',
    'established_year', 'virtual_tour_url', 'floor_guide_map_url'
  ];
  const safeUpdates = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  // Support common aliases from web payloads
  if (updates.operating_hours !== undefined) safeUpdates.opening_hours = updates.operating_hours;
  if (updates.profile_image !== undefined) safeUpdates.image_url = updates.profile_image;
  if (updates.profile_image_url !== undefined) safeUpdates.image_url = updates.profile_image_url;
  if (updates.is_home_collection_available !== undefined) safeUpdates.home_collection_available = updates.is_home_collection_available;
  if (updates.home_collection_radius !== undefined && safeUpdates.home_collection_fee === undefined) {
    // keep compatibility if older clients send radius-like value
    safeUpdates.home_collection_fee = updates.home_collection_radius;
  }
  Object.assign(safeUpdates, await maybeGeocodeLocationUpdates(existingCenter, safeUpdates));
  safeUpdates.updated_at = new Date().toISOString();
  Object.assign(safeUpdates, buildProviderResubmissionFields('diagnostic_center_owner', existingCenter.approval_status));

  const { data, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .update(safeUpdates)
    .eq('id', centerId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  await cacheDel(`auth_user:${userId}`);
  return {
    ...data,
    profile_image_url: data.profile_image_url || data.image_url || null,
  };
};

// ==================== Test Catalog Management ====================

// Get tests offered by this center
const getTests = async (centerId, filters = {}, page = 1, limit = 50) => {
  if (filters.publicOnly) {
    const { data: center, error: centerError } = await supabaseAdmin
      .from('diagnostic_centers')
      .select('id')
      .eq('id', centerId)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .maybeSingle();

    if (centerError) throw centerError;
    if (!center) throw new ApiError(404, 'Diagnostic center not found');
  }

  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('diagnostic_tests')
    .select('*, master_test:master_diagnostic_tests(icon_url)', { count: 'exact' })
    .eq('center_id', centerId);

  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,category.ilike.%${s}%`);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (typeof filters.isActive === 'boolean') {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error, count } = await query
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Map joined icon_url to top level for frontend/app consumption
  const mappedData = (data || []).map(row => {
    const mapped = { ...row };
    if (mapped.master_test && mapped.master_test.icon_url) {
      mapped.icon_url = mapped.master_test.icon_url;
    }
    delete mapped.master_test; // Clean up nested object
    return mapped;
  });

  return {
    data: mappedData,
    pagination: buildPagination(page, limit, count || 0),
  };
};

// Add a test to the catalog
const addTest = async (centerId, testData) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_tests')
    .insert({
      center_id: centerId,
      name: testData.name,
      category: testData.category,
      description: testData.description,
      price: testData.price,
      discounted_price: testData.discountedPrice || testData.discounted_price || null,
      turnaround_hours: testData.turnaroundHours || testData.turnaround_hours || 24,
      sample_type: testData.sampleType || testData.sample_type || null,
      preparation_instructions: testData.preparationInstructions || testData.preparation_instructions,
      master_test_id: testData.master_test_id || testData.masterTestId || null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Update a test
const updateTest = async (centerId, testId, updates) => {
  // Fix #16: Whitelist allowed fields instead of spreading raw updates
  const ALLOWED_TEST_FIELDS = [
    'name', 'category', 'description', 'price', 'discounted_price',
    'turnaround_hours', 'sample_type', 'preparation_instructions', 'is_active', 'master_test_id'
  ];
  const safeUpdates = {};
  for (const key of ALLOWED_TEST_FIELDS) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  // Also support camelCase inputs
  if (updates.discountedPrice !== undefined) safeUpdates.discounted_price = updates.discountedPrice;
  if (updates.turnaroundHours !== undefined) safeUpdates.turnaround_hours = updates.turnaroundHours;
  if (updates.sampleType !== undefined) safeUpdates.sample_type = updates.sampleType;
  if (updates.preparationInstructions !== undefined) safeUpdates.preparation_instructions = updates.preparationInstructions;
  if (updates.masterTestId !== undefined) safeUpdates.master_test_id = updates.masterTestId;

  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('diagnostic_tests')
    .update(safeUpdates)
    .eq('id', testId)
    .eq('center_id', centerId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Delete a test (soft)
const deleteTest = async (centerId, testId) => {
  const { error } = await supabaseAdmin
    .from('diagnostic_tests')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', testId)
    .eq('center_id', centerId);

  if (error) throw error;
};

// ==================== Bookings / Results ====================

// Get bookings for this center
const getBookings = async (centerId, filters = {}, page = 1, limit = 20) => {
  let query = supabaseAdmin
    .from('diagnostic_bookings')
    .select('*, patient:patients(name, user_id, user:users(phone)), test:diagnostic_tests(name, category, sample_type), center:diagnostic_centers(id, name, phone, address, latitude, longitude), prescription:prescriptions(file_url), delivery_agents(*)', {
      count: 'exact',
    })
    .eq('center_id', centerId);

  if (filters.status) {
    const statusFilters = getDiagnosticBookingStatusesForFilter(filters.status);
    query = statusFilters.length > 1
      ? query.in('status', statusFilters)
      : query.eq('status', statusFilters[0]);
  }
  if (filters.resultStatus) {
    if (filters.resultStatus !== 'all') {
      query = query.eq('result_status', filters.resultStatus);
    }
    // If we're filtering results, don't show cancelled bookings (which stay result_status=pending)
    if (filters.resultStatus === 'pending' || filters.resultStatus === 'processing' || filters.resultStatus === 'all') {
      query = query.neq('status', 'cancelled');
    }
  }
  if (filters.date) query = query.eq('booking_date', filters.date);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  const normalizedRows = normalizeDiagnosticBookingRecords(data || []);
  const searchTerm = sanitizeSearch(filters.search || '').toLowerCase();
  const filteredData = normalizedRows.filter((booking) => {
    if (!searchTerm) return true;
    const patientName = String(booking?.patient?.name || booking?.patient_name || '').toLowerCase();
    const testName = String(booking?.test?.name || booking?.test_name || '').toLowerCase();
    const bookingId = String(booking?.id || '').toLowerCase();
    return patientName.includes(searchTerm) || testName.includes(searchTerm) || bookingId.includes(searchTerm);
  });

  const offset = (page - 1) * limit;
  const paginatedData = filteredData.slice(offset, offset + limit);
  const signedPaginatedData = await signStorageUrlsInPayload(paginatedData);
  const summary = filteredData.reduce((acc, booking) => {
    acc.total += 1;
    acc.status[booking.status] = (acc.status[booking.status] || 0) + 1;
    if (booking.status !== 'cancelled') {
      acc.resultStatus[booking.result_status] = (acc.resultStatus[booking.result_status] || 0) + 1;
    }
    return acc;
  }, { total: 0, status: {}, resultStatus: {} });
  return {
    data: signedPaginatedData,
    pagination: buildPagination(page, limit, filteredData.length),
    summary,
  };
};

// M6: Get a single booking by ID
const getBookingById = async (centerId, bookingId) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .select('*, patient:patients(name, user_id), test:diagnostic_tests(name, category, sample_type, price), center:diagnostic_centers(id, name, phone, address, latitude, longitude), delivery_agents(*)')
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Booking not found');
  }
  const normalized = normalizeDiagnosticBookingRecord(data);
  return signStorageUrlsInPayload(normalized);
};

// Valid status transitions
const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'arrived', 'sample_collected', 'cancelled'],
  dispatched: ['arrived', 'sample_collected', 'cancelled'],
  arrived: ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Update booking status (confirm, dispatch, collect sample, complete, cancel)
const updateBookingStatus = async (centerId, bookingId, status, meta = {}) => {
  // Validate status transition
  const { data: current } = await supabaseAdmin
    .from('diagnostic_bookings')
    .select('status, collection_type, tracking_token, agent_id')
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .single();

  const nextStatus = normalizeDiagnosticBookingStatus(status);
  if (current) {
    const currentStatus = normalizeDiagnosticBookingStatus(current.status);
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new ApiError(400, `Cannot transition from '${currentStatus}' to '${nextStatus}'`);
    }
    if (nextStatus === 'dispatched' && current.collection_type !== 'home_collection') {
      throw new ApiError(400, 'Only home collection bookings can be dispatched');
    }
  }

  const updatePayload = {
    status: normalizeDiagnosticBookingStatus(status),
    updated_at: new Date().toISOString(),
  };

  // Track cancellation details
  if (status === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString();
    if (meta.cancelledBy) updatePayload.cancelled_by = meta.cancelledBy;
    if (meta.reason) updatePayload.cancellation_reason = meta.reason;
  }

  if (nextStatus === 'dispatched' && current && !current.tracking_token) {
    updatePayload.tracking_token = randomUUID();
  }

  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .select('*')
    .single();

  if (error) throw error;
  const normalizedBooking = normalizeDiagnosticBookingRecord(data);

  // If booking is completed, sample collected or cancelled, free up the agent
  if (['sample_collected', 'completed', 'cancelled'].includes(nextStatus) && current && current.agent_id) {
    await supabaseAdmin
      .from('delivery_agents')
      .update({ status: 'available' })
      .eq('id', current.agent_id);
  }

  // Notify patient about booking status change — resolve user_id from patients table
  if (normalizedBooking.patient_id) {
    const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', normalizedBooking.patient_id).single();
    if (patient) {
      eventEmitter.emitDiagnosticBookingStatusUpdated({
        ...normalizedBooking,
        patient_id: patient.user_id,
      });
    }
  }

  return normalizedBooking;
};

// Get aggregated patients for a diagnostic center
const getPatients = async (centerId, { search = '', page = 1, limit = 20 } = {}) => {
  let query = supabaseAdmin
    .from('diagnostic_bookings')
    .select(`
      patient_id,
      status,
      booking_date,
      patient:patients(id, name, user_id, user:users(phone)),
      test:diagnostic_tests(name)
    `)
    .eq('center_id', centerId)
    .order('booking_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw new ApiError(500, 'Database error');

  const byPatient = new Map();

  for (const booking of data || []) {
    const patient = booking?.patient || {};
    if (!patient?.id) continue;

    if (search) {
      const searchLower = search.toLowerCase();
      const nameMatch = patient.name?.toLowerCase().includes(searchLower);
      const phoneMatch = patient.user?.phone?.includes(search);
      const idMatch = patient.id.includes(searchLower);
      if (!nameMatch && !phoneMatch && !idMatch) {
        continue;
      }
    }

    if (!byPatient.has(patient.id)) {
      byPatient.set(patient.id, {
        id: patient.id,
        name: patient.name || 'Unknown',
        phone: patient.user?.phone || '',
        total_bookings: 0,
        pending_bookings: 0,
        completed_bookings: 0,
        last_test_name: null,
        last_booking_date: null,
        last_booking_status: null,
      });
    }

    const record = byPatient.get(patient.id);
    record.total_bookings += 1;
    
    if (booking.status === 'pending') {
      record.pending_bookings += 1;
    }
    
    if (booking.status === 'completed') {
      record.completed_bookings += 1;
    }

    // Since bookings are ordered by booking_date descending, the first one encountered is the latest
    if (!record.last_booking_date) {
      record.last_test_name = booking.test?.name || 'Unknown Test';
      record.last_booking_date = booking.booking_date;
      record.last_booking_status = booking.status;
    }
  }

  const allPatients = Array.from(byPatient.values());
  const total = allPatients.length;
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPatients = allPatients.slice(startIndex, endIndex);

  return {
    data: paginatedPatients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get history of diagnostic bookings for a specific patient at a specific center
const getPatientHistory = async (centerId, patientId, page = 1, limit = 10) => {
  // First, verify the patient has interacted with this center
  const { data: interactionCheck, error: checkError } = await supabaseAdmin
    .from('diagnostic_bookings')
    .select('id')
    .eq('center_id', centerId)
    .eq('patient_id', patientId)
    .limit(1);

  if (checkError) {
    console.error('getPatientHistory checkError:', checkError);
    throw new ApiError(500, 'Database error verifying patient interaction');
  }
  if (!interactionCheck || interactionCheck.length === 0) {
    // If no interaction, we can either throw 403 or return empty.
    // Given the prompt says "Return the patient's diagnostic history belonging ONLY to the authenticated Diagnostic Center.", an empty list is appropriate if there is no history.
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      }
    };
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from('diagnostic_bookings')
    .select(`
      id,
      status,
      result_status,
      booking_date,
      collection_type,
      test:diagnostic_tests(name, price),
      prescription:prescriptions(id)
    `, { count: 'exact' })
    .eq('center_id', centerId)
    .eq('patient_id', patientId)
    .order('booking_date', { ascending: false })
    .range(startIndex, endIndex);

  if (error) {
    console.error('getPatientHistory query error:', error);
    throw new ApiError(500, 'Database error fetching patient history');
  }

  const formattedData = data.map(booking => ({
    id: booking.id,
    test_name: booking.test?.name || 'Unknown Test',
    status: booking.status,
    result_status: booking.result_status,
    collection_type: booking.collection_type,
    booking_date: booking.booking_date,
    price_snapshot: booking.amount ?? booking.test?.price ?? null,
    has_report: booking.result_status === 'completed' || booking.status === 'completed' // Based on existing logic
  }));

  return {
    data: formattedData,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
    }
  };
};

// Upload test result
const uploadResult = async (centerId, bookingId, resultData, uploadedByUserId) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .update({
      result_status: 'completed',
      result_url: resultData.resultUrl || resultData.result_url,
      result_notes: resultData.resultNotes || resultData.result_notes,
      result_uploaded_at: new Date().toISOString(),
      result_uploaded_by: uploadedByUserId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .select('*, test:diagnostic_tests(name, category), center:diagnostic_centers(name)')
    .single();

  if (error) throw error;

  // Notify patient that their result is ready — resolve user_id from patients table
  if (data.patient_id) {
    const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
    if (patient) {
      // Create Medical Record entry automatically
      const testCategory = (data.test?.category || '').toLowerCase();
      let reportType = 'other';
      if (testCategory.includes('blood') || testCategory.includes('pathology')) reportType = 'blood_test';
      else if (testCategory.includes('urine')) reportType = 'urine_test';
      else if (testCategory.includes('x-ray') || testCategory.includes('xray')) reportType = 'x_ray';
      else if (testCategory.includes('mri')) reportType = 'mri';
      else if (testCategory.includes('ct') || testCategory.includes('scan')) reportType = 'ct_scan';
      else if (testCategory.includes('ecg') || testCategory.includes('cardio')) reportType = 'ecg';
      else if (testCategory.includes('ultrasound') || testCategory.includes('sono')) reportType = 'ultrasound';

      await supabaseAdmin.from('reports').insert({
        patient_id: data.patient_id,
        name: data.test?.name || 'Diagnostic Report',
        type: reportType,
        lab_name: data.center?.name || 'Diagnostic Center',
        test_date: data.booking_date,
        result_date: new Date().toISOString().split('T')[0],
        status: 'normal',
        doctor_notes: data.result_notes,
        file_url: data.result_url,
        file_size: resultData.file_size || resultData.fileSize,
      });

      eventEmitter.emitDiagnosticResultUploaded({ ...data, patient_id: patient.user_id });
    }
  }

  return data;
};

// ==================== Staff Management ====================

const getDiagnosticMembers = async (centerId) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_members')
    .select(`
      id,
      user_id,
      member_role,
      status,
      created_at,
      user:users!diagnostic_members_user_id_fkey(id, name, email, phone, profile_image_url)
    `)
    .eq('diagnostic_center_id', centerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error fetching staff:', error);
    throw new ApiError(500, 'Database error fetching staff members');
  }

  return data.map(m => ({
    id: m.id,
    user_id: m.user_id,
    role: m.member_role,
    status: m.status,
    created_at: m.created_at,
    user: m.user
  }));
};

const inviteDiagnosticMember = async (centerId, inviterUserId, targetEmail, requestedRole) => {
  const ALLOWED_MEMBER_ROLES = ['manager', 'lab_technician'];
  // Map 'staff' from frontend to 'lab_technician' in backend
  const backendRole = requestedRole === 'staff' ? 'lab_technician' : requestedRole;
  if (!ALLOWED_MEMBER_ROLES.includes(backendRole)) {
    throw new ApiError(400, `Invalid role. Allowed: ${ALLOWED_MEMBER_ROLES.join(', ')}`);
  }

  const { data: targetUser } = await supabaseAdmin.from('users').select('*').eq('email', targetEmail).single();
  if (!targetUser) throw new ApiError(404, 'No user found with this email.');
  if (['admin', 'super_admin', 'pharmacy_owner', 'hospital_owner', 'clinic_owner', 'diagnostic_center_owner'].includes(targetUser.role)) {
    throw new ApiError(409, 'This user already holds an organization owner role and cannot be added as staff.');
  }

  const { data: existing } = await supabaseAdmin
    .from('diagnostic_members')
    .select('*')
    .eq('user_id', targetUser.id)
    .eq('diagnostic_center_id', centerId)
    .single();

  if (existing) {
    if (existing.status === 'active') throw new ApiError(409, 'This user is already an active member.');
    const { data: updated } = await supabaseAdmin
      .from('diagnostic_members')
      .update({ member_role: backendRole, status: 'active', invited_by: inviterUserId, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select().single();
    await supabaseAdmin.from('users').update({ role: backendRole === 'manager' ? 'diagnostic_manager' : 'lab_technician' }).eq('id', targetUser.id);
    return { member: updated, reactivated: true };
  }

  const { data: member, error } = await supabaseAdmin
    .from('diagnostic_members')
    .insert({
      user_id: targetUser.id,
      diagnostic_center_id: centerId,
      member_role: backendRole,
      status: 'active',
      invited_by: inviterUserId
    })
    .select()
    .single();

  if (error) throw new ApiError(500, 'Error adding member.');
  
  await supabaseAdmin.from('users').update({ role: backendRole === 'manager' ? 'diagnostic_manager' : 'lab_technician' }).eq('id', targetUser.id);
  return { member, user: targetUser };
};

const updateDiagnosticMemberRole = async (centerId, memberId, newRole) => {
  const ALLOWED_MEMBER_ROLES = ['manager', 'lab_technician'];
  // Map 'staff' from frontend to 'lab_technician' in backend
  const backendRole = newRole === 'staff' ? 'lab_technician' : newRole;
  if (!ALLOWED_MEMBER_ROLES.includes(backendRole)) {
    throw new ApiError(400, `Invalid role. Allowed: ${ALLOWED_MEMBER_ROLES.join(', ')}`);
  }

  const { data: member, error: findError } = await supabaseAdmin
    .from('diagnostic_members')
    .select('*')
    .eq('id', memberId)
    .eq('diagnostic_center_id', centerId)
    .single();

  if (findError || !member) throw new ApiError(404, 'Member not found in this center.');
  if (member.status === 'removed') throw new ApiError(400, 'Cannot update a removed member.');

  const { error: updateError } = await supabaseAdmin
    .from('diagnostic_members')
    .update({ member_role: backendRole })
    .eq('id', memberId);

  if (updateError) throw new ApiError(500, 'Failed to update member role');

  await supabaseAdmin.from('users').update({ role: backendRole === 'manager' ? 'diagnostic_manager' : 'lab_technician' }).eq('id', member.user_id);
  return { success: true };
};

const updateDiagnosticMemberStatus = async (centerId, memberId, action) => {
  const { data: member, error: findError } = await supabaseAdmin
    .from('diagnostic_members')
    .select('*')
    .eq('id', memberId)
    .eq('diagnostic_center_id', centerId)
    .single();

  if (findError || !member) throw new ApiError(404, 'Member not found in this center.');

  const newStatus = action === 'suspend' ? 'suspended' : 'active';

  const { error: updateError } = await supabaseAdmin
    .from('diagnostic_members')
    .update({ status: newStatus })
    .eq('id', memberId);

  if (updateError) throw new ApiError(500, 'Failed to update member status');

  return { success: true };
};

const removeDiagnosticMember = async (centerId, memberId) => {
  const { data: member, error: findError } = await supabaseAdmin
    .from('diagnostic_members')
    .select('*')
    .eq('id', memberId)
    .eq('diagnostic_center_id', centerId)
    .single();

  if (findError || !member) throw new ApiError(404, 'Member not found in this center.');

  const { error: updateError } = await supabaseAdmin
    .from('diagnostic_members')
    .update({ status: 'removed' })
    .eq('id', memberId);

  if (updateError) throw new ApiError(500, 'Failed to remove member');

  await supabaseAdmin.from('users').update({ role: 'patient' }).eq('id', member.user_id);
  return { success: true };
};


// Get analytics
const getAnalytics = async (centerId, { from, to } = {}) => {
  const toDate = to ? new Date(to) : new Date();
  let fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Previous period equivalent length
  const periodLength = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevFromDate = new Date(prevToDate.getTime() - periodLength);

  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();
  const prevFromISO = prevFromDate.toISOString();
  const prevToISO = prevToDate.toISOString();

  // Current period query
  let currentQuery = supabaseAdmin
    .from('diagnostic_bookings')
    .select('*, test:diagnostic_tests(id, name, price)')
    .eq('center_id', centerId)
    .gte('created_at', fromISO)
    .lte('created_at', toISO);

  // Previous period query
  let previousQuery = supabaseAdmin
    .from('diagnostic_bookings')
    .select('*, test:diagnostic_tests(price)')
    .eq('center_id', centerId)
    .gte('created_at', prevFromISO)
    .lte('created_at', prevToISO);

  const [{ data: currentBookings }, { data: previousBookings }] = await Promise.all([
    currentQuery,
    previousQuery
  ]);

  const current = currentBookings || [];
  const previous = previousBookings || [];

  // Determine trend grouping (daily vs weekly)
  const diffDays = periodLength / (1000 * 3600 * 24);
  const useWeekly = diffDays > 60;
  const useMonthly = diffDays > 180;

  // Current Period Summary
  let totalBookings = current.length;
  let completed = 0;
  let pending = 0;
  let cancelled = 0;
  let revenue = 0; // Only realized (completed) revenue
  let pendingValue = 0;
  
  // Patient Tracking
  const uniquePatientsSet = new Set();
  
  // Peak Tracking
  const peakHours = new Array(6).fill(0);
  const peakDays = new Array(7).fill(0);

  // Sample Collection tracking
  const sampleCollection = {
    home: { total: 0, completed: 0, revenue: 0 },
    walkIn: { total: 0, completed: 0, revenue: 0 }
  };

  const statusBreakdown = {};
  const revenueByStatus = {};
  const testStats = {};
  const trendsMap = {}; // key -> { date, bookings, revenue }

  current.forEach(b => {
    // Basic status counts
    const isCompleted = b.status === 'completed' || b.result_status === 'completed';
    if (isCompleted) completed++;
    else if (b.status === 'cancelled') cancelled++;
    else pending++;

    statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1;
    if (b.patient_id) uniquePatientsSet.add(b.patient_id);

    // Revenue tracking
    const fee = Number(b.amount ?? b.test?.price ?? 0);
    revenueByStatus[b.status] = (revenueByStatus[b.status] || 0) + fee;
    
    if (isCompleted) {
      revenue += fee;
    } else if (b.status !== 'cancelled') {
      pendingValue += fee;
    }
    
    // Sample collection analytics
    if (b.collection_type === 'home_collection') {
        sampleCollection.home.total++;
        if (isCompleted) {
            sampleCollection.home.completed++;
            sampleCollection.home.revenue += fee;
        }
    } else {
        sampleCollection.walkIn.total++;
        if (isCompleted) {
            sampleCollection.walkIn.completed++;
            sampleCollection.walkIn.revenue += fee;
        }
    }

    // Peak Hours / Days
    if (b.created_at) {
        const d = new Date(b.created_at);
        const hour = d.getHours();
        const hourIndex = Math.floor(hour / 4);
        if (hourIndex >= 0 && hourIndex < 6) peakHours[hourIndex]++;
        
        const day = d.getDay();
        if (day >= 0 && day < 7) peakDays[day]++;
    }

    // Trends grouping
    const dateObj = new Date(b.created_at);
    let dateKey = dateObj.toISOString().split('T')[0];
    if (useWeekly) {
        const d = new Date(dateObj);
        d.setDate(d.getDate() - d.getDay());
        dateKey = d.toISOString().split('T')[0];
    }
    if (useMonthly) {
        const d = new Date(dateObj);
        d.setDate(1);
        dateKey = d.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    }
    
    if (!trendsMap[dateKey]) trendsMap[dateKey] = { date: dateKey, bookings: 0, completed: 0, revenue: 0 };
    trendsMap[dateKey].bookings++;
    if (isCompleted) {
      trendsMap[dateKey].completed++;
      trendsMap[dateKey].revenue += fee;
    }

    // Test stats
    if (b.test) {
      if (!testStats[b.test.id]) {
        testStats[b.test.id] = { id: b.test.id, name: b.test.name, total: 0, completed: 0, pending: 0, cancelled: 0, revenue: 0 };
      }
      testStats[b.test.id].total++;
      if (isCompleted) {
          testStats[b.test.id].completed++;
          testStats[b.test.id].revenue += fee;
      }
      else if (b.status === 'cancelled') testStats[b.test.id].cancelled++;
      else testStats[b.test.id].pending++;
    }
  });

  const completionRate = totalBookings > 0 ? Math.round((completed / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0;
  const averageRevenuePerBooking = completed > 0 ? Math.round(revenue / completed) : 0;

  // Previous Period Summary
  let prevTotal = previous.length;
  let prevCompleted = 0;
  let prevRevenue = 0;
  let prevCancelled = 0;

  previous.forEach(b => {
    if (b.status === 'completed' || b.result_status === 'completed') {
      prevCompleted++;
      const fee = Number(b.amount ?? b.test?.price ?? 0);
      prevRevenue += fee;
    }
    else if (b.status === 'cancelled') prevCancelled++;
  });
  
  const prevCancellationRate = prevTotal > 0 ? Math.round((prevCancelled / prevTotal) * 100) : 0;
  const prevAverageRevenue = prevCompleted > 0 ? Math.round(prevRevenue / prevCompleted) : 0;

  let revenueGrowth = null;
  if (prevRevenue > 0) {
      revenueGrowth = Math.round(((revenue - prevRevenue) / prevRevenue) * 100);
  }

  // Compile arrays
  const trends = Object.values(trendsMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => ({
        ...t,
        averageRevenue: t.completed > 0 ? Math.round(t.revenue / t.completed) : 0
    }));
  
  const testPerformance = Object.values(testStats).map(t => ({
    ...t,
    completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0
  })).sort((a, b) => b.total - a.total);

  const popularTests = [...testPerformance].slice(0, 10).map(t => ({
    id: t.id,
    name: t.name,
    count: t.total,
    percentage: totalBookings > 0 ? Math.round((t.total / totalBookings) * 100) : 0
  }));
  
  const revenueByTest = [...testPerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(t => ({
      id: t.id,
      name: t.name,
      revenue: t.revenue,
      count: t.total,
      average: t.completed > 0 ? Math.round(t.revenue / t.completed) : 0,
      percentage: revenue > 0 ? Math.round((t.revenue / revenue) * 100) : 0
  }));

  let newPatientsCount = 0;
  if (uniquePatientsSet.size > 0) {
      const patientIds = Array.from(uniquePatientsSet);
      const { data: earlyBookings } = await supabaseAdmin
        .from('diagnostic_bookings')
        .select('patient_id')
        .eq('center_id', centerId)
        .lt('created_at', fromISO)
        .in('patient_id', patientIds);
        
      const returningPatientsSet = new Set((earlyBookings || []).map(b => b.patient_id));
      newPatientsCount = patientIds.length - returningPatientsSet.size;
  }

  return {
    summary: {
      totalBookings,
      completed,
      pending,
      cancelled,
      completionRate,
      cancellationRate,
      revenue,
      pendingValue,
      averageRevenuePerBooking,
      revenueGrowth
    },
    previousPeriod: {
      totalBookings: prevTotal,
      completed: prevCompleted,
      revenue: prevRevenue,
      cancellationRate: prevCancellationRate,
      averageRevenuePerBooking: prevAverageRevenue
    },
    patientAnalytics: {
      totalUnique: uniquePatientsSet.size,
      newPatients: newPatientsCount,
      returningPatients: uniquePatientsSet.size - newPatientsCount
    },
    sampleCollection,
    cancellationAnalytics: {
        total: cancelled,
        rate: cancellationRate,
        previousRate: prevCancellationRate
    },
    peakAnalytics: {
        peakHours,
        peakDays
    },
    trends,
    statusBreakdown,
    revenueByStatus,
    popularTests,
    testPerformance,
    revenueByTest
  };
};

// ==================== Patient-facing: Book a test ====================

const bookTest = async (patientId, centerId, testId, bookingData) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .insert({
      patient_id: patientId,
      center_id: centerId,
      test_id: testId || null,
      prescription_id: bookingData.prescriptionId || bookingData.prescription_id || null,
      booking_date: bookingData.bookingDate || bookingData.booking_date,
      booking_time: bookingData.bookingTime || bookingData.booking_time || null,
      collection_type: bookingData.collectionType || bookingData.collection_type || 'walk_in',
      collection_address: bookingData.patientPhone ? `${bookingData.collectionAddress || bookingData.collection_address || ''} | Phone: ${bookingData.patientPhone}` : (bookingData.collectionAddress || bookingData.collection_address || null),
      notes: bookingData.notes || null,
      status: 'pending',
      result_status: 'pending',
        source_referral_id: bookingData.source_referral_id || null,
    })
    .select('*, test:diagnostic_tests(name, category, price)')
    .single();

  if (error) throw error;

  // Note: Socket event emission is handled by the route (which has user_id context)
  return normalizeDiagnosticBookingRecord(data);
};

// DC5: Resolve patient ID from user ID (extracted from route handler)
const resolvePatientId = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data.id;
};

// DC5: Get center owner ID (extracted from route handler)
const getCenterOwnerId = async (centerId) => {
  const { data } = await supabaseAdmin
    .from('diagnostic_centers')
    .select('owner_id')
    .eq('id', centerId)
    .single();
  return data?.owner_id || null;
};

// Clinic-routed diagnostic booking / referral
const createClinicDiagnosticBooking = async (clinicId, actorId, bookingData) => {
  const { 
    centerId, 
    patientId, 
    testId, 
    testName, 
    investigation, 
    reason, 
    notes, 
    clinicalSummary, 
    urgency = 'routine', 
    bookingDate, 
    bookingTime, 
    collectionType = 'walk_in', 
    collectionAddress,
    prescriptionId 
  } = bookingData;

  if (!centerId || !patientId) {
    throw new ApiError(400, 'Valid centerId and patientId are required');
  }

  // 1. Verify Active Partnership
  const organizationPartnershipService = require('./organizationPartnershipService');
  await organizationPartnershipService.verifyActivePartnership('clinic', clinicId, 'diagnostic_center', centerId);

  // 2. Resolve Test ID if not directly provided
  let resolvedTestId = testId || null;
  const targetInvestigation = testName || investigation || reason || '';
  if (!resolvedTestId && targetInvestigation) {
    const { data: matchedTest } = await supabaseAdmin
      .from('diagnostic_tests')
      .select('id')
      .eq('diagnostic_center_id', centerId)
      .ilike('name', `%${targetInvestigation}%`)
      .limit(1)
      .maybeSingle();
    if (matchedTest) resolvedTestId = matchedTest.id;
  }

  const bookingNotes = [
    targetInvestigation ? `Investigation: ${targetInvestigation}` : '',
    reason ? `Reason: ${reason}` : '',
    clinicalSummary ? `Clinical Summary: ${clinicalSummary}` : '',
    notes ? notes : '',
    urgency && urgency !== 'routine' ? `[Priority: ${urgency.toUpperCase()}]` : ''
  ].filter(Boolean).join(' | ');

  // 3. Create Diagnostic Booking Record
  const { data: booking, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .insert({
      patient_id: patientId,
      center_id: centerId,
      test_id: resolvedTestId,
      prescription_id: prescriptionId || null,
      booking_date: bookingDate || new Date().toISOString().split('T')[0],
      booking_time: bookingTime || null,
      collection_type: collectionType,
      collection_address: collectionAddress || null,
      notes: bookingNotes || 'Clinic Diagnostic Referral',
      status: 'pending',
      result_status: 'pending',
    })
    .select('*, test:diagnostic_tests(name, category, price)')
    .single();

  if (error) throw error;

  // 4. Notify Diagnostic Center Owner
  const ownerId = await getCenterOwnerId(centerId);
  if (ownerId) {
    const notificationService = require('./notificationService');
    notificationService.notify(ownerId, {
      type: 'DIAGNOSTIC_REFERRAL_RECEIVED',
      title: 'New Diagnostic Referral',
      message: `A new diagnostic test has been referred by clinic.`,
      data: { bookingId: booking.id, url: '/diagnostic-center/bookings' }
    }).catch(() => {});
  }

  return normalizeDiagnosticBookingRecord(booking);
};

module.exports = {
  // Public / Discovery
  searchDiagnosticCenters,
  findNearby,
  getDiagnosticCenterById,
  // Owner Registration
  registerDiagnosticCenter,
  // Owner Management
  addReel: async (userId, data) => {
    const { data: center } = await supabaseAdmin.from('diagnostic_centers').select('id').eq('owner_id', userId).single();
    if (!center) throw new ApiError(404, 'Diagnostic center not found');
    const { data: reel, error } = await supabaseAdmin.from('diagnostic_reels').insert({
      diagnostic_center_id: center.id,
      video_url: data.videoUrl,
      thumbnail_url: data.thumbnailUrl,
      title: data.title
    }).select().single();
    if (error) throw new ApiError(500, 'Failed to add reel');
    return reel;
  },
  deleteReel: async (userId, reelId) => {
    const { data: center } = await supabaseAdmin.from('diagnostic_centers').select('id').eq('owner_id', userId).single();
    if (!center) throw new ApiError(404, 'Diagnostic center not found');
    const { error } = await supabaseAdmin.from('diagnostic_reels').delete().eq('id', reelId).eq('diagnostic_center_id', center.id);
    if (error) throw new ApiError(500, 'Failed to delete reel');
    return true;
  },

  getDiagnosticCenterByOwner,
  getDashboard,
  updateDiagnosticCenter,
  // Test Catalog
  getTests,
  addTest,
  updateTest,
  deleteTest,
  // Bookings / Results
  getBookings,
  getPatients,
  getPatientHistory,
  getBookingById,
  updateBookingStatus,
  uploadResult,
  getAnalytics,
  getDiagnosticMembers,
  inviteDiagnosticMember,
  updateDiagnosticMemberRole,
  updateDiagnosticMemberStatus,
  removeDiagnosticMember,

  // Patient-facing
  bookTest,
  // Clinic-facing
  createClinicDiagnosticBooking,
  // Helpers (DC5: extracted from inline route handlers)
  resolvePatientId,
  getCenterOwnerId,
};
