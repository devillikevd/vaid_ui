/**
 * Diagnostic Center Service
 * Registration, management, tests catalog, appointments, and results
 */
const { supabaseAdmin } = require('../config/supabase');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { sanitizeSearch } = require('../utils/sanitize');
const eventEmitter = require('./eventEmitter');

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
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
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

  return (data || [])
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
    .single();

  if (error || !data) {
    const err = new Error('Diagnostic center not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
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
    const err = new Error('Diagnostic center not found for this user');
    err.statusCode = 404;
    throw err;
  }
  return data;
};

// Get dashboard stats
const getDashboard = async (centerId) => {
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalTests },
    { count: todayBookings },
    { count: pendingResults },
    { data: patientRows },
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
      .eq('booking_date', today),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('result_status', 'pending'),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('patient_id')
      .eq('center_id', centerId)
      .not('patient_id', 'is', null),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*, patient:patients(name, phone), test:diagnostic_tests(name, category)')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const uniquePatients = new Set((patientRows || []).map((r) => r.patient_id)).size;

  return {
    stats: {
      totalTests: totalTests || 0,
      todayBookings: todayBookings || 0,
      pendingResults: pendingResults || 0,
      totalPatients: uniquePatients,
    },
    recentBookings: recentBookings || [],
  };
};

// Update diagnostic center profile — field whitelisting to prevent mass-assignment
const updateDiagnosticCenter = async (centerId, userId, updates) => {
  const ALLOWED_FIELDS = [
    'name', 'description', 'phone', 'email', 'website', 'emergency_phone',
    'address', 'city', 'state', 'pincode', 'latitude', 'longitude',
    'operating_hours', 'test_categories', 'accreditations', 'profile_image_url',
    'is_home_collection_available', 'home_collection_radius',
  ];
  const safeUpdates = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .update(safeUpdates)
    .eq('id', centerId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// ==================== Test Catalog Management ====================

// Get tests offered by this center
const getTests = async (centerId, filters = {}, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('diagnostic_tests')
    .select('*', { count: 'exact' })
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
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
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
      sample_type: testData.sampleType || testData.sample_type || 'Blood',
      preparation_instructions: testData.preparationInstructions || testData.preparation_instructions,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Update a test
const updateTest = async (centerId, testId, updates) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_tests')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('diagnostic_bookings')
    .select('*, patient:patients(name, phone, user_id), test:diagnostic_tests(name, category, sample_type)', {
      count: 'exact',
    })
    .eq('center_id', centerId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.resultStatus) query = query.eq('result_status', filters.resultStatus);
  if (filters.date) query = query.eq('booking_date', filters.date);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// M6: Get a single booking by ID
const getBookingById = async (centerId, bookingId) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .select('*, patient:patients(name, phone, user_id), test:diagnostic_tests(name, category, sample_type, price)')
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .single();

  if (error || !data) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
};

// Valid status transitions
const VALID_STATUS_TRANSITIONS = {
  booked: ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Update booking status (sample collected, completed, cancelled)
const updateBookingStatus = async (centerId, bookingId, status, meta = {}) => {
  // Validate status transition
  const { data: current } = await supabaseAdmin
    .from('diagnostic_bookings')
    .select('status')
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .single();

  if (current) {
    const allowed = VALID_STATUS_TRANSITIONS[current.status] || [];
    if (!allowed.includes(status)) {
      const err = new Error(`Cannot transition from '${current.status}' to '${status}'`);
      err.statusCode = 400;
      throw err;
    }
  }

  const updatePayload = { status, updated_at: new Date().toISOString() };

  // Track cancellation details
  if (status === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString();
    if (meta.cancelledBy) updatePayload.cancelled_by = meta.cancelledBy;
    if (meta.reason) updatePayload.cancellation_reason = meta.reason;
  }

  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .eq('center_id', centerId)
    .select('*')
    .single();

  if (error) throw error;

  // Notify patient about booking status change — resolve user_id from patients table
  if (data.patient_id) {
    const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
    if (patient) {
      eventEmitter.emitDiagnosticBookingStatusUpdated({ ...data, patient_id: patient.user_id });
    }
  }

  return data;
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
    .select('*')
    .single();

  if (error) throw error;

  // Notify patient that their result is ready — resolve user_id from patients table
  if (data.patient_id) {
    const { data: patient } = await supabaseAdmin.from('patients').select('user_id').eq('id', data.patient_id).single();
    if (patient) {
      eventEmitter.emitDiagnosticResultUploaded({ ...data, patient_id: patient.user_id });
    }
  }

  return data;
};

// Get analytics
const getAnalytics = async (centerId) => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalBookings },
    { count: completedResults },
    { count: monthlyBookings },
    { data: popularTests },
  ] = await Promise.all([
    supabaseAdmin.from('diagnostic_bookings').select('*', { count: 'exact', head: true }).eq('center_id', centerId),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('result_status', 'completed'),
    supabaseAdmin
      .from('diagnostic_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .gte('created_at', thirtyDaysAgo),
    supabaseAdmin
      .from('diagnostic_tests')
      .select('id, name, category, price')
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('name')
      .limit(20),
  ]);

  // Rank tests by actual booking count
  let rankedTests = popularTests || [];
  if (rankedTests.length > 0) {
    const testIds = rankedTests.map((t) => t.id);
    const { data: bookingCounts } = await supabaseAdmin
      .from('diagnostic_bookings')
      .select('test_id')
      .eq('center_id', centerId)
      .in('test_id', testIds);

    const countMap = {};
    (bookingCounts || []).forEach((b) => {
      countMap[b.test_id] = (countMap[b.test_id] || 0) + 1;
    });

    rankedTests = rankedTests
      .map((t) => ({ ...t, bookingCount: countMap[t.id] || 0 }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10);
  }

  return {
    totalBookings: totalBookings || 0,
    completedResults: completedResults || 0,
    monthlyBookings: monthlyBookings || 0,
    completionRate: totalBookings ? Math.round(((completedResults || 0) / totalBookings) * 100) : 0,
    popularTests: rankedTests,
  };
};

// ==================== Patient-facing: Book a test ====================

const bookTest = async (patientId, centerId, testId, bookingData) => {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_bookings')
    .insert({
      patient_id: patientId,
      center_id: centerId,
      test_id: testId,
      booking_date: bookingData.bookingDate || bookingData.booking_date,
      booking_time: bookingData.bookingTime || bookingData.booking_time || null,
      collection_type: bookingData.collectionType || bookingData.collection_type || 'walk_in',
      collection_address: bookingData.collectionAddress || bookingData.collection_address || null,
      notes: bookingData.notes || null,
      status: 'booked',
      result_status: 'pending',
    })
    .select('*, test:diagnostic_tests(name, category, price)')
    .single();

  if (error) throw error;

  // Note: Socket event emission is handled by the route (which has user_id context)
  return data;
};

module.exports = {
  // Public / Discovery
  searchDiagnosticCenters,
  findNearby,
  getDiagnosticCenterById,
  // Owner Registration
  registerDiagnosticCenter,
  // Owner Management
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
  getBookingById,
  updateBookingStatus,
  uploadResult,
  getAnalytics,
  // Patient-facing
  bookTest,
};
