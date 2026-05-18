/**
 * Medicine Service
 * Medicine catalog, search, availability, alternatives
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { calculateDistance, formatDistance, getBoundingBox } = require('../utils/geo');
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

const FORM_CATEGORIES = {
  tablet: ['tablet', 'tablets', 'tab', 'tabs', 'caplet'],
  capsule: ['capsule', 'capsules', 'cap', 'caps'],
  syrup: ['syrup', 'suspension', 'oral liquid', 'liquid'],
  ointment: ['ointment', 'cream', 'gel', 'lotion'],
  drops: ['drop', 'drops'],
  powder: ['powder', 'sachet'],
  injection: ['injection', 'inj', 'vial', 'ampoule'],
};

const normalizeMedicineText = (value) =>
  sanitizeSearch(String(value || ''))
    .trim()
    .toLowerCase();

const getInventoryDisplayName = (item = {}) =>
  item.name || item.generic_name || item.medicine_name || 'Medicine';

const getInventoryDiscoveryKey = (item = {}) =>
  item.medicine_id ||
  normalizeMedicineText(item.generic_name) ||
  normalizeMedicineText(item.name) ||
  normalizeMedicineText(item.medicine_name) ||
  item.id;

const inferDosageFormCategory = (item = {}) => {
  const sourceText = [
    item.form,
    item.dosage_form,
    item.category,
    item.subcategory,
    item.name,
    item.generic_name,
    item.medicine_name,
    item.description,
    item.pack_size,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [category, terms] of Object.entries(FORM_CATEGORIES)) {
    if (terms.some((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i').test(sourceText))) {
      return category;
    }
  }

  return 'other';
};

const normalizeMedicineForClient = (medicine = {}) => ({
  ...medicine,
  therapeutic_category: medicine.category || null,
  category: inferDosageFormCategory(medicine),
});

const isDosageFormCategory = (category) =>
  Boolean(category && Object.prototype.hasOwnProperty.call(FORM_CATEGORIES, String(category).toLowerCase()));

const inventoryMatchesMedicine = (item = {}, medicine = {}) => {
  if (!item || !medicine) return false;
  if (item.medicine_id && medicine.id && item.medicine_id === medicine.id) return true;

  const inventoryNames = [
    normalizeMedicineText(item.name),
    normalizeMedicineText(item.generic_name),
    normalizeMedicineText(item.medicine_name),
  ].filter(Boolean);
  const medicineNames = [
    normalizeMedicineText(medicine.name),
    normalizeMedicineText(medicine.generic_name),
  ].filter(Boolean);

  return medicineNames.some((term) => inventoryNames.includes(term));
};

const getNearbyActivePharmacies = async (latitude, longitude, radius = 10) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  const { data: pharmacies, error } = await supabaseAdmin
    .from('pharmacies')
    .select('id, name, address, phone, latitude, longitude')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (error) throw error;
  if (!pharmacies || pharmacies.length === 0) return [];

  return pharmacies
    .map((pharmacy) => ({
      ...pharmacy,
      distance: calculateDistance(
        { latitude, longitude },
        { latitude: pharmacy.latitude, longitude: pharmacy.longitude }
      ),
    }))
    .filter((pharmacy) => pharmacy.distance <= radius)
    .sort((left, right) => left.distance - right.distance);
};

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
  return (data || []).map(normalizeMedicineForClient);
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
  if (filters.category && !isDosageFormCategory(filters.category)) {
    dbQuery = dbQuery.eq('category', filters.category);
  }
  if (filters.requiresPrescription) dbQuery = dbQuery.eq('requires_prescription', true);
  if (filters.maxPrice) dbQuery = dbQuery.lte('price', filters.maxPrice);

  const { data, error, count } = await dbQuery
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const normalizedData = (data || []).map(normalizeMedicineForClient);
  const categoryFilter = filters.category ? String(filters.category).toLowerCase() : null;
  const filteredData = isDosageFormCategory(categoryFilter)
    ? normalizedData.filter((medicine) => medicine.category === categoryFilter)
    : normalizedData;

  return {
    data: filteredData,
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

  return normalizeMedicineForClient(data);
};

// Get medicine availability at nearby pharmacies
const getMedicineAvailability = async (medicineId, latitude, longitude, radius = 10) => {
  const [medicine, nearbyPharmacies] = await Promise.all([
    supabaseAdmin
      .from('medicines')
      .select('id, name, generic_name')
      .eq('id', medicineId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    getNearbyActivePharmacies(latitude, longitude, radius),
  ]);

  if (!medicine || nearbyPharmacies.length === 0) return [];

  const pharmacyIds = nearbyPharmacies.map((pharmacy) => pharmacy.id);
  const pharmacyById = new Map(nearbyPharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));

  const { data: inventory, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id, pharmacy_id, medicine_id, name, generic_name, quantity, price')
    .in('pharmacy_id', pharmacyIds)
    .gt('quantity', 0);

  if (error) throw error;
  if (!inventory) return [];

  const availabilityByPharmacy = new Map();
  for (const item of inventory) {
    if (!inventoryMatchesMedicine(item, medicine)) continue;

    const pharmacy = pharmacyById.get(item.pharmacy_id);
    if (!pharmacy) continue;

    const existing = availabilityByPharmacy.get(item.pharmacy_id);
    const candidate = {
      inventory_item_id: item.id,
      inventoryItemId: item.id,
      pharmacy_id: pharmacy.id,
      pharmacy_name: pharmacy.name,
      address: pharmacy.address,
      price: item.price,
      in_stock: (item.quantity || 0) > 0,
      distance: pharmacy.distance,
    };

    if (!existing || (candidate.price ?? Number.MAX_SAFE_INTEGER) < (existing.price ?? Number.MAX_SAFE_INTEGER)) {
      availabilityByPharmacy.set(item.pharmacy_id, candidate);
    }
  }

  return Array.from(availabilityByPharmacy.values()).sort((left, right) => left.distance - right.distance);
};

// Get nearby medicines (hybrid aggregation)
const getNearbyMedicines = async (latitude, longitude, radius = 10, limit = 20) => {
  if (!latitude || !longitude) return [];
  const nearbyPharmacies = await getNearbyActivePharmacies(latitude, longitude, radius);
  if (nearbyPharmacies.length === 0) return [];

  const pharmacyIds = nearbyPharmacies.map((pharmacy) => pharmacy.id);
  const pharmacyById = new Map(nearbyPharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));

  const { data: inventoryItems, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id, pharmacy_id, medicine_id, name, generic_name, category, price, quantity')
    .in('pharmacy_id', pharmacyIds)
    .gt('quantity', 0)
    .limit(limit * 5);

  if (error) throw error;
  if (!inventoryItems) return [];

  const uniqueMedicines = new Map();
  for (const item of inventoryItems) {
    const pharmacy = pharmacyById.get(item.pharmacy_id);
    if (!pharmacy) continue;

    const key = getInventoryDiscoveryKey(item);
    const candidate = {
      id: item.id,
      medicineId: item.medicine_id,
      name: getInventoryDisplayName(item),
      category: inferDosageFormCategory(item),
      therapeuticCategory: item.category || null,
      price: item.price || 0,
      pharmacyName: pharmacy.name,
      pharmacyId: pharmacy.id,
      inStock: (item.quantity || 0) > 0,
      quantity: item.quantity || 0,
      distance: pharmacy.distance,
    };

    const existing = uniqueMedicines.get(key);
    if (
      !existing ||
      candidate.price < existing.price ||
      (candidate.price === existing.price && candidate.distance < existing.distance)
    ) {
      uniqueMedicines.set(key, candidate);
    }
  }

  return Array.from(uniqueMedicines.values())
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map(({ distance, ...item }) => item);
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
  return (data || []).map(normalizeMedicineForClient);
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
  getNearbyMedicines,
  getAlternatives,
  findPharmaciesWithMedicine,
  checkPrescriptionRequirement,
  validatePrescribedMedicines,
  uploadPrescription,
};
