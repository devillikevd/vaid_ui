/**
 * Hospital Service
 * Public hospital/facility discovery, search, and reviews
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { sanitizeSearch } = require('../utils/sanitize');

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

// Facility types — fetched from DB with static fallback
const getFacilityTypes = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('facility_types')
      .select('id, name, icon')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) return data;
  } catch (_) { }

  return [
    { id: 'hospital', name: 'Hospital', icon: '🏥' },
    { id: 'clinic', name: 'Clinic', icon: '🩺' },
    { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
    { id: 'diagnostic_center', name: 'Diagnostic Center', icon: '🔬' },
    { id: 'nursing_home', name: 'Nursing Home', icon: '🏠' },
  ];
};

// Get hospitals with filters and pagination
const getHospitals = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('hospitals')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_approved', true);

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.city) query = query.ilike('city', `%${sanitizeSearch(filters.city)}%`);
  if (filters.isEmergencyAvailable) query = query.eq('is_emergency_available', true);
  if (filters.specialization) query = query.contains('specializations', [filters.specialization]);
  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  let results = data || [];

  // SMART RANKING: Top suggested based on rating and reviews
  results = results.map(hosp => {
    const rating = parseFloat(hosp.rating) || 0;
    const reviews = parseInt(hosp.total_reviews) || 0;
    const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
    return { ...hosp, smart_score: score };
  });

  results.sort((a, b) => b.smart_score - a.smart_score);

  const total = results.length;
  results = results.slice(offset, offset + limit);

  return {
    data: results,
    pagination: {
      page, limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get nearby hospitals (using lat/lng distance calculation)
const getNearbyHospitals = async (latitude, longitude, radius = 25, filters = {}) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  let query = supabaseAdmin
    .from('hospitals')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.isEmergencyAvailable) query = query.eq('is_emergency_available', true);
  if (filters.is24Hours) query = query.eq('is_24_hours', true);

  const { data, error } = await query;
  if (error) throw error;

  const recordsWithPhone = await enrichMissingPhonesFromOwners(data || []);

  const nearby = recordsWithPhone
    .map((h) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: h.latitude, longitude: h.longitude });
      const rating = parseFloat(h.rating) || 0;
      const reviews = parseInt(h.total_reviews) || 0;
      const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
      return { ...h, distance: dist, distanceText: formatDistance(dist), smart_score: score };
    })
    .filter((h) => h.distance <= radius)
    .sort((a, b) => b.smart_score - a.smart_score);

  return nearby;
};

// Get emergency hospitals
const getEmergencyHospitals = async (latitude, longitude) => {
  const bounds = getBoundingBox({ latitude, longitude }, 50); // 50km for emergencies

  const { data, error } = await supabaseAdmin
    .from('hospitals')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .eq('is_emergency_available', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (error) throw error;

  const recordsWithPhone = await enrichMissingPhonesFromOwners(data || []);

  return recordsWithPhone
    .map((h) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: h.latitude, longitude: h.longitude });
      return { ...h, distance: dist, distanceText: formatDistance(dist) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20);
};

// Get pharmacies near location
const getPharmacies = async (latitude, longitude, radius = 25) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  const { data, error } = await supabaseAdmin
    .from('pharmacies')
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
    .map((p) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: p.latitude, longitude: p.longitude });
      return { ...p, distance: dist, distanceText: formatDistance(dist) };
    })
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

// Get clinics near location
const getClinics = async (latitude, longitude, radius = 25) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  const { data, error } = await supabaseAdmin
    .from('clinics')
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
    .map((c) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: c.latitude, longitude: c.longitude });
      const rating = parseFloat(c.rating) || 0;
      const reviews = parseInt(c.total_reviews) || 0;
      const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
      return { ...c, distance: dist, distanceText: formatDistance(dist), smart_score: score };
    })
    .filter((c) => c.distance <= radius)
    .sort((a, b) => b.smart_score - a.smart_score);
};

// Get diagnostic centers near location
// Proxies to diagnosticCenterService.findNearby so both discovery paths
// (hospitals/diagnostic-centers AND diagnostic-centers/nearby) use the same table
const getDiagnosticCenters = async (latitude, longitude, radius = 25) => {
  const diagnosticCenterService = require('./diagnosticCenterService');
  return diagnosticCenterService.findNearby(latitude, longitude, radius);
};

// Search hospitals — C4 fix: sanitize search input
const searchHospitals = async (query = '', latitude = null, longitude = null) => {
  const q = sanitizeSearch(query);

  let queryBuilder = supabaseAdmin
    .from('hospitals')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true);

  if (q) {
    queryBuilder = queryBuilder.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
  }

  const { data, error } = await queryBuilder.limit(50);

  if (error) throw error;

  let results = await enrichMissingPhonesFromOwners(data || []);

  // Add distance if coordinates provided
  if (latitude !== null && longitude !== null) {
    results = results
      .map((h) => ({
        ...h,
        distance: h.latitude && h.longitude
          ? calculateDistance({ latitude, longitude }, { latitude: h.latitude, longitude: h.longitude })
          : null,
      }))
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }

  return results;
};

// Get hospital by ID (only approved & active facilities visible to patients)
const getHospitalById = async (id) => {
  const [hospitalRes, associationsRes] = await Promise.all([
    supabaseAdmin
      .from('hospitals')
      .select('*, departments:hospital_departments(*), doctors:hospital_doctors(*, doctor:doctors(id, name, specialization, profile_image_url, consultation_fee, is_approved, rating, total_reviews, experience_years, intro_video_url)), reels:hospital_reels(*)')
      .eq('id', id)
      .eq('is_approved', true)
      .eq('is_active', true)
      .single(),
    supabaseAdmin
      .from('facility_provider_associations')
      .select('*')
      .eq('facility_type', 'hospital')
      .eq('facility_id', id)
      .eq('is_active', true)
  ]);

  const { data, error } = hospitalRes;

  if (error || !data) {
    throw new ApiError(404, 'Hospital not found');
  }

  if (Array.isArray(data.doctors)) {
    data.doctors = data.doctors
      .filter((entry) => entry?.is_active !== false && entry?.doctor?.is_approved === true)
      .map((entry) => {
        if (!entry?.doctor) return entry;
        const { is_approved: _ignored, ...doctor } = entry.doctor;
        const rating = parseFloat(doctor.rating) || 0;
        const reviews = parseInt(doctor.total_reviews) || 0;
        const score = (rating * 10) + (Math.log10(reviews + 1) * 5);
        return { ...entry, doctor: { ...doctor, smart_score: score } };
      });

    // Sort the hospital's doctors by their smart score
    data.doctors.sort((a, b) => (b.doctor?.smart_score || 0) - (a.doctor?.smart_score || 0));
  }

  if (Array.isArray(data.departments)) {
    data.departments = data.departments.filter((department) => department?.is_active !== false);
  }

  // Attach Associated Facilities
  if (associationsRes.data && associationsRes.data.length > 0) {
    const pharmacyIds = associationsRes.data.filter(a => a.provider_type === 'pharmacy').map(a => a.provider_id);
    const diagnosticIds = associationsRes.data.filter(a => a.provider_type === 'diagnostic_center').map(a => a.provider_id);
    
    const [pharmaciesRes, diagnosticsRes] = await Promise.all([
      pharmacyIds.length > 0 ? supabaseAdmin.from('pharmacies').select('id, name, address, rating, is_open, image_url').in('id', pharmacyIds) : Promise.resolve({ data: [] }),
      diagnosticIds.length > 0 ? supabaseAdmin.from('diagnostic_centers').select('id, name, address, rating, is_24_hours, image_url').in('id', diagnosticIds) : Promise.resolve({ data: [] })
    ]);
    
    data.associated_pharmacies = pharmaciesRes.data || [];
    data.associated_diagnostic_centers = diagnosticsRes.data || [];
  } else {
    data.associated_pharmacies = [];
    data.associated_diagnostic_centers = [];
  }

  return data;
};


// Get reviews for a hospital (public)
const getReviews = async (hospitalId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabaseAdmin
    .from('reviews')
    .select('*, patient:patients(name, profile_image_url)', { count: 'exact' })
    .eq('reviewable_type', 'hospital')
    .eq('reviewable_id', hospitalId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    data: (data || []).map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      patientName: r.patient?.name || 'Anonymous',
      patientImage: r.patient?.profile_image_url || null,
      createdAt: r.created_at,
    })),
    pagination: {
      page, limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

// Update ER Wait Time (called by hospital admin from Emergency Dashboard)
const updateErWaitTime = async (hospitalId, waitMinutes) => {
  const { data, error } = await supabaseAdmin
    .from('hospitals')
    .update({
      er_wait_time_minutes: waitMinutes,
      er_last_updated_at: new Date().toISOString(),
    })
    .eq('id', hospitalId)
    .select('id, er_wait_time_minutes, er_last_updated_at')
    .single();

  if (error) throw error;
  return data;
};

module.exports = {
  getFacilityTypes,
  getHospitals,
  getNearbyHospitals,
  getEmergencyHospitals,
  getPharmacies,
  getClinics,
  getDiagnosticCenters,
  searchHospitals,
  getHospitalById,
  getReviews,
  updateErWaitTime,
};
