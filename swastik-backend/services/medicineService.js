/**
 * Medicine Service
 * Medicine catalog, search, availability, alternatives
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { calculateDistance, formatDistance } = require('../utils/geo');
const { sanitizeSearch } = require('../utils/sanitize');
const { logSearch } = require('../utils/auditLogger');

// Medicine categories
const CATEGORIES = [
  { id: 'general', name: 'General Medicine' },
  { id: 'antibiotic', name: 'Antibiotics' },
  { id: 'painkiller', name: 'Painkillers' },
  { id: 'vitamin', name: 'Vitamins & Supplements' },
  { id: 'cardiac', name: 'Cardiac Medicine' },
  { id: 'diabetes', name: 'Diabetes Medicine' },
  { id: 'skin', name: 'Skin Care' },
  { id: 'respiratory', name: 'Respiratory' },
  { id: 'digestive', name: 'Digestive Health' },
  { id: 'ayurvedic', name: 'Ayurvedic' },
];

// Get categories
const getCategories = async () => {
  return CATEGORIES;
};

// Get popular medicines
const getPopularMedicines = async (limit = 10) => {
  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Search medicines
const searchMedicines = async (query, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let dbQuery = supabaseAdmin
    .from('medicines')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (query) {
    const q = sanitizeSearch(query);
    if (q) dbQuery = dbQuery.or(`name.ilike.%${q}%,generic_name.ilike.%${q}%,manufacturer.ilike.%${q}%`);
  }
  if (filters.category) dbQuery = dbQuery.eq('category', filters.category);
  if (filters.requiresPrescription) dbQuery = dbQuery.eq('requires_prescription', true);
  if (filters.maxPrice) dbQuery = dbQuery.lte('price', filters.maxPrice);

  const { data, error, count } = await dbQuery
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Get medicine by ID
const getMedicineById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Medicine not found');
  }

  // Increment search count atomically via RPC or direct SQL
  // Avoids read-then-write race condition on concurrent requests
  try {
    // Attempt atomic increment via Supabase RPC (preferred)
    const { error: rpcError } = await supabaseAdmin.rpc('increment_search_count', { medicine_id: id });
    if (rpcError) {
      // Fallback: use raw SQL increment (still atomic at DB level)
      await supabaseAdmin
        .from('medicines')
        .update({ search_count: (data.search_count || 0) + 1 })
        .eq('id', id)
        .eq('search_count', data.search_count || 0); // optimistic lock
    }
  } catch (_) { /* search_count column may not exist */ }

  return data;
};

// Get medicine availability at nearby pharmacies
const getMedicineAvailability = async (medicineId, latitude, longitude, radius = 10) => {
  // Get pharmacy inventory for this medicine
  const { data: inventory } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('*, pharmacy:pharmacies(id, name, address, phone, latitude, longitude)')
    .eq('medicine_id', medicineId)
    .gt('quantity', 0);

  if (!inventory) return [];

  // Filter by distance
  return inventory
    .filter(i => i.pharmacy?.latitude && i.pharmacy?.longitude)
    .map(i => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: i.pharmacy.latitude, longitude: i.pharmacy.longitude });
      return {
        pharmacy: i.pharmacy,
        quantity: i.quantity,
        price: i.price,
        distance: dist,
        distanceText: formatDistance(dist),
      };
    })
    .filter(i => i.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

// Get alternatives (generic equivalents)
const getAlternatives = async (medicineId) => {
  // Get the medicine's generic name
  const { data: medicine } = await supabaseAdmin
    .from('medicines')
    .select('generic_name')
    .eq('id', medicineId)
    .single();

  if (!medicine?.generic_name) return [];

  // Find medicines with same generic name
  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select('*')
    .ilike('generic_name', medicine.generic_name)
    .neq('id', medicineId)
    .eq('is_active', true)
    .order('price')
    .limit(10);

  if (error) throw error;
  return data || [];
};

// Find pharmacies with medicine
const findPharmaciesWithMedicine = async (medicineId, latitude, longitude, radius = 10) => {
  return getMedicineAvailability(medicineId, latitude, longitude, radius);
};

// Check prescription requirement
const checkPrescriptionRequirement = async (medicineIds) => {
  const { data, error } = await supabaseAdmin
    .from('medicines')
    .select('id, name, requires_prescription')
    .in('id', medicineIds);

  if (error) throw error;

  const requiresPrescription = (data || []).some(m => m.requires_prescription);
  const prescriptionMedicines = (data || []).filter(m => m.requires_prescription);

  return {
    requiresPrescription,
    medicines: data || [],
    prescriptionMedicines,
  };
};

/**
 * Validate prescribed medicine names against the drug catalog.
 * Returns enriched items with generic_name when a catalog match is found.
 * Non-blocking: warns but does NOT reject unknown medicines (doctors may prescribe compounded/off-catalog drugs).
 */
const validatePrescribedMedicines = async (items) => {
  if (!items || items.length === 0) return { items, warnings: [] };

  const warnings = [];
  const enrichedItems = [];

  for (const item of items) {
    const name = (item.medicineName || '').trim();
    if (!name) {
      enrichedItems.push(item);
      continue;
    }

    // Try exact match first, then fuzzy (ilike)
    const { data: matches } = await supabaseAdmin
      .from('medicines')
      .select('id, name, generic_name, requires_prescription, contraindications, side_effects')
      .or(`name.ilike.${name},generic_name.ilike.${name}`)
      .limit(3);

    if (!matches || matches.length === 0) {
      warnings.push(`"${name}" not found in drug catalog — prescribing as free-text`);
      enrichedItems.push({ ...item, catalogMatch: null, generic_name: null });
    } else {
      const bestMatch = matches.find(m => m.name.toLowerCase() === name.toLowerCase()) || matches[0];
      enrichedItems.push({
        ...item,
        catalogMatch: bestMatch.id,
        generic_name: bestMatch.generic_name || null,
      });
    }
  }

  return { items: enrichedItems, warnings };
};

// Upload prescription
const uploadPrescription = async (userId, file, orderId) => {
  const { uploadPrescription: uploadToMinio } = require('../config/minio');
  const uploadResult = await uploadToMinio(file, userId);
  const fileUrl = uploadResult.url;

  // If orderId provided, link to order
  if (orderId) {
    await supabaseAdmin
      .from('pharmacy_orders')
      .update({ prescription_url: fileUrl })
      .eq('id', orderId);
  }

  return { url: fileUrl, message: 'Prescription uploaded successfully' };
};

module.exports = {
  getCategories,
  getPopularMedicines,
  searchMedicines,
  getMedicineById,
  getMedicineAvailability,
  getAlternatives,
  findPharmaciesWithMedicine,
  checkPrescriptionRequirement,
  validatePrescribedMedicines,
  uploadPrescription,
};
