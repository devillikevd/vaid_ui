/**
 * Pharmacy Service
 * Inventory, orders, analytics for pharmacy owners
 */
const { supabaseAdmin } = require('../config/supabase');
const { cacheDel } = require('../config/redis');
const { ApiError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const { v4: uuidv4 } = require('uuid');
const eventEmitter = require('./eventEmitter');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { maybeGeocodeLocationUpdates } = require('../utils/geocoding');
const { sanitizeSearch } = require('../utils/sanitize');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');

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

const ACTIVE_ORDER_STATUSES = ['confirmed', 'processing', 'ready', 'dispatched'];
const ACTIVE_ORDER_DATABASE_STATUSES = ['confirmed', 'processing', 'ready', 'dispatched', 'out_for_delivery'];
const COMPLETED_ORDER_STATUSES = ['delivered', 'cancelled'];

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
});

const normalizePharmacyUpdates = (updates = {}) => {
  const normalized = { ...updates };

  if (normalized.license_number === undefined && updates.licenseNumber !== undefined) {
    normalized.license_number = updates.licenseNumber;
  }
  if (normalized.drug_license_number === undefined && updates.drugLicenseNumber !== undefined) {
    normalized.drug_license_number = updates.drugLicenseNumber;
  }
  if (normalized.license_document_url === undefined && updates.licenseDocumentUrl !== undefined) {
    normalized.license_document_url = updates.licenseDocumentUrl;
  }
  if (normalized.profile_image_url === undefined) {
    normalized.profile_image_url =
      updates.profile_image_url ??
      updates.profile_image ??
      updates.profileImage ??
      updates.image_url;
  }
  if (normalized.delivery_available === undefined) {
    normalized.delivery_available = updates.delivery_available ?? updates.deliveryAvailable ?? updates.offers_delivery;
  }
  if (normalized.is_24_hours === undefined && updates.is24Hours !== undefined) {
    normalized.is_24_hours = updates.is24Hours;
  }

  return normalized;
};

const normalizeInventoryUpdates = (updates = {}) => {
  const normalized = { ...updates };

  if (normalized.generic_name === undefined) {
    normalized.generic_name = updates.generic_name ?? updates.genericName ?? updates.medicineName ?? updates.medicine_name;
  }
  if (normalized.batch_number === undefined && updates.batchNumber !== undefined) {
    normalized.batch_number = updates.batchNumber;
  }
  if (normalized.expiry_date === undefined && updates.expiryDate !== undefined) {
    normalized.expiry_date = updates.expiryDate;
  }
  if (normalized.requires_prescription === undefined && updates.requiresPrescription !== undefined) {
    normalized.requires_prescription = updates.requiresPrescription;
  }
  if (normalized.reorder_level === undefined && updates.minQuantity !== undefined) {
    normalized.reorder_level = updates.minQuantity;
  }
  if (normalized.pack_size === undefined && updates.packSize !== undefined) {
    normalized.pack_size = updates.packSize;
  }
  if (normalized.unit_type === undefined && updates.unitType !== undefined) {
    normalized.unit_type = updates.unitType;
  }

  return normalized;
};

const normalizeSearchToken = (value) =>
  sanitizeSearch(String(value || ''))
    .trim()
    .toLowerCase();

const normalizeOrderStatus = (status) => (
  status === 'out_for_delivery' ? 'dispatched' : status
);

const getDatabaseStatusesForFilter = (status) => {
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === 'dispatched') {
    return ['dispatched', 'out_for_delivery'];
  }
  return [normalizedStatus];
};

const normalizeOrderRecord = (order) => (
  order ? { ...order, status: normalizeOrderStatus(order.status) } : order
);

const normalizeOrderRecords = (orders = []) => orders.map(normalizeOrderRecord);

const collectDistinctSearchTokens = (...values) => [
  ...new Set(values.map(normalizeSearchToken).filter(Boolean)),
];

const rankCatalogMedicineMatch = (medicine, searchTokens = []) => {
  const name = normalizeSearchToken(medicine?.name);
  const genericName = normalizeSearchToken(medicine?.generic_name);

  return searchTokens.reduce((score, token) => {
    if (token === name) return score + 6;
    if (token === genericName) return score + 5;
    if (name.includes(token)) return score + 3;
    if (genericName.includes(token)) return score + 2;
    return score;
  }, 0);
};

const resolveCatalogMedicine = async ({ medicineId, name, genericName } = {}) => {
  const explicitMedicineId = String(medicineId || '').trim();
  if (explicitMedicineId) {
    const { data: exactMatch, error } = await supabaseAdmin
      .from('medicines')
      .select('id, name, generic_name, requires_prescription')
      .eq('id', explicitMedicineId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (exactMatch) return exactMatch;
  }

  const searchTokens = collectDistinctSearchTokens(genericName, name);
  if (searchTokens.length === 0) return null;

  const orConditions = searchTokens.flatMap((token) => [
    `name.ilike.%${token}%`,
    `generic_name.ilike.%${token}%`,
  ]);

  const { data: matches, error } = await supabaseAdmin
    .from('medicines')
    .select('id, name, generic_name, requires_prescription')
    .eq('is_active', true)
    .or(orConditions.join(','))
    .limit(10);

  if (error) throw error;
  if (!matches || matches.length === 0) return null;

  return matches
    .slice()
    .sort((left, right) => rankCatalogMedicineMatch(right, searchTokens) - rankCatalogMedicineMatch(left, searchTokens))[0];
};

const resolveInventoryRowForOrderItem = async (pharmacyId, item = {}, inventoryMap = {}) => {
  const directMatchKey = item.inventoryItemId || item.medicineId;
  if (directMatchKey && inventoryMap[directMatchKey]) {
    return inventoryMap[directMatchKey];
  }

  const searchTokens = collectDistinctSearchTokens(item.genericName, item.name);
  if (searchTokens.length === 0) return null;

  const orConditions = searchTokens.flatMap((token) => [
    `name.ilike.%${token}%`,
    `generic_name.ilike.%${token}%`,
  ]);

  const { data: inventoryRows, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id, price, name, generic_name, medicine_id, quantity, pack_size, unit_type')
    .eq('pharmacy_id', pharmacyId)
    .gt('quantity', 0)
    .or(orConditions.join(','))
    .order('quantity', { ascending: false })
    .limit(5);

  if (error) throw error;
  if (!inventoryRows || inventoryRows.length === 0) return null;

  const rankedRows = inventoryRows
    .map((row) => ({
      row,
      score: Math.max(
        rankCatalogMedicineMatch({ name: row.name, generic_name: row.generic_name }, searchTokens),
        rankCatalogMedicineMatch({ name: row.generic_name, generic_name: row.name }, searchTokens)
      ),
    }))
    .sort((left, right) => right.score - left.score || (right.row.quantity || 0) - (left.row.quantity || 0));

  return rankedRows[0]?.row || null;
};

const matchesOrderSearch = (order, term) => {
  if (!term) return true;

  const haystack = [
    order?.id,
    order?.patient?.name,
    order?.delivery_address,
    ...(Array.isArray(order?.items) ? order.items.map((item) => item?.name || item?.medicineName || item?.medicine_id) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(term);
};

const filterOrdersByGroup = (orders = [], filters = {}) => {
  if (filters.status) {
    const normalizedStatus = normalizeOrderStatus(filters.status);
    return orders.filter((order) => order.status === normalizedStatus);
  }
  if (filters.group === 'active') {
    return orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  }
  if (filters.group === 'completed') {
    return orders.filter((order) => COMPLETED_ORDER_STATUSES.includes(order.status));
  }

  return orders;
};

const summarizeOrders = (orders = []) => ({
  total: orders.length,
  pending: orders.filter((order) => order.status === 'pending').length,
  active: orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
  completed: orders.filter((order) => COMPLETED_ORDER_STATUSES.includes(order.status)).length,
  delivered: orders.filter((order) => order.status === 'delivered').length,
});

// Search pharmacies globally (not limited to nearby)
const searchPharmacies = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('pharmacies')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_approved', true);

  if (filters.city) query = query.ilike('city', `%${sanitizeSearch(filters.city)}%`);
  if (filters.deliveryAvailable === true) query = query.eq('delivery_available', true);
  if (filters.isOpen === true) query = query.eq('is_open', true);
  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%,address.ilike.%${s}%`);
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

// Find nearby pharmacies with a specific medicine
const findNearbyWithMedicine = async (latitude, longitude, medicineId, radius = 10) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  // Get active pharmacies within bounding box
  const { data: pharmacies } = await supabaseAdmin
    .from('pharmacies')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (!pharmacies || pharmacies.length === 0) return [];

  // Filter by distance
  const pharmaciesWithPhone = await enrichMissingPhonesFromOwners(pharmacies || []);

  let nearby = pharmaciesWithPhone
    .map((p) => {
      const dist = calculateDistance({ latitude, longitude }, { latitude: p.latitude, longitude: p.longitude });
      return { ...p, distance: dist, distanceText: formatDistance(dist) };
    })
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  // If medicineId provided, filter pharmacies that carry this medicine
  if (medicineId) {
    const pharmacyIds = nearby.map(p => p.id);
    const { data: inventory } = await supabaseAdmin
      .from('pharmacy_inventory')
      .select('pharmacy_id')
      .eq('medicine_id', medicineId)
      .in('pharmacy_id', pharmacyIds)
      .gt('quantity', 0);

    if (inventory && inventory.length > 0) {
      const pharmaciesWithMedicine = new Set(inventory.map(i => i.pharmacy_id));
      nearby = nearby.filter(p => pharmaciesWithMedicine.has(p.id));
    } else {
      return []; // No pharmacy carries this medicine
    }
  }

  return nearby;
};

// Register pharmacy
const registerPharmacy = async (userId, data) => {
  const { data: pharmacy, error } = await supabaseAdmin
    .from('pharmacies')
    .insert({
      owner_id: userId,
      name: data.name,
      license_number: data.licenseNumber,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      latitude: data.latitude,
      longitude: data.longitude,
      is_active: false, // Pending admin approval
      is_24_hours: data.is24Hours || false,
      delivery_available: data.deliveryAvailable || false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return pharmacy;
};

// Get pharmacy by owner
const getPharmacyByOwner = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Pharmacy not found for this user');
  }

  const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
  const pharmacy = recordWithPhone || data;
  return {
    ...pharmacy,
    profile_image_url: pharmacy.profile_image_url || pharmacy.image_url || null,
  };
};

// Get pharmacy by ID (public)
const getPharmacyById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .eq('is_approved', true)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Pharmacy not found');
  }

  const { data: assocs } = await supabaseAdmin
    .from('facility_provider_associations')
    .select('facility_id, facility_type')
    .eq('provider_id', id)
    .eq('provider_type', 'pharmacy')
    .eq('status', 'accepted')
    .maybeSingle();

  const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
  const pharmacy = recordWithPhone || data;

  return {
    ...pharmacy,
    profile_image_url: pharmacy.profile_image_url || pharmacy.image_url || null,
    hospital_id: assocs?.facility_type === 'hospital' ? assocs.facility_id : null,
    clinic_id: assocs?.facility_type === 'clinic' ? assocs.facility_id : null
  };
};

// Update pharmacy
const updatePharmacy = async (pharmacyId, userId, updates) => {
  const { data: existingPharmacy, error: existingPharmacyError } = await supabaseAdmin
    .from('pharmacies')
    .select('id, owner_id, address, city, state, pincode, latitude, longitude, approval_status')
    .eq('id', pharmacyId)
    .eq('owner_id', userId)
    .single();

  if (existingPharmacyError || !existingPharmacy) {
    throw existingPharmacyError || new ApiError(404, 'Pharmacy not found');
  }

  const normalizedUpdates = normalizePharmacyUpdates(updates);

  // Whitelist allowed update fields to prevent mass-assignment
  const allowedFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
    'latitude', 'longitude', 'license_number', 'drug_license_number', 'license_document_url',
    'is_24_hours', 'is_open', 'delivery_available', 'description', 'opening_hours', 'profile_image_url'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (normalizedUpdates[key] !== undefined) safeUpdates[key] = normalizedUpdates[key];
  }
  if (safeUpdates.profile_image_url !== undefined) {
    safeUpdates.image_url = safeUpdates.profile_image_url;
    delete safeUpdates.profile_image_url;
  }
  Object.assign(safeUpdates, await maybeGeocodeLocationUpdates(existingPharmacy, safeUpdates));
  safeUpdates.updated_at = new Date().toISOString();
  Object.assign(safeUpdates, buildProviderResubmissionFields('pharmacy_owner', existingPharmacy.approval_status));

  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .update(safeUpdates)
    .eq('id', pharmacyId)
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

// Get inventory
const getInventory = async (pharmacyId, filters = {}, page = 1, limit = 50) => {
  if (filters.publicOnly) {
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .select('id')
      .eq('id', pharmacyId)
      .eq('is_active', true)
      .eq('is_approved', true)
      .maybeSingle();

    if (pharmacyError) throw pharmacyError;
    if (!pharmacy) throw new ApiError(404, 'Pharmacy not found');
  }

  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('pharmacy_inventory')
    .select('*', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId);

  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,generic_name.ilike.%${s}%`);
  }
  // Low-stock filter is applied in JS because PostgREST does not support
  // reliable cross-column comparisons like quantity < reorder_level.
  const isLowStockFilter = filters.lowStock === true || filters.lowStock === 'true';
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  let data, error, count;
  {
    if (isLowStockFilter) {
      // Fetch matching category/search rows first, then apply low-stock logic
      const result = await query.order('name');
      const allRows = result.data || [];
      const lowStockRows = allRows.filter(i => (i.quantity || 0) < (i.reorder_level || 10));
      data = lowStockRows.slice(offset, offset + limit);
      error = result.error;
      count = lowStockRows.length;
    } else {
      const result = await query
        .order('name')
        .range(offset, offset + limit - 1);
      data = result.data;
      error = result.error;
      count = result.count;
    }
  }

  if (error) throw error;

  return {
    data: data || [],
    items: data || [], // Alias for route compatibility
    pagination: buildPagination(page, limit, count || 0),
  };
};

// Add inventory item
const addInventoryItem = async (pharmacyId, userId, itemData) => {
  const catalogMedicine = await resolveCatalogMedicine({
    medicineId: itemData.medicine_id,
    name: itemData.name,
    genericName: itemData.generic_name || itemData.genericName,
  });

  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .insert({
      pharmacy_id: pharmacyId,
      medicine_id: catalogMedicine?.id || itemData.medicine_id || null,
      name: itemData.name || catalogMedicine?.name || itemData.generic_name || itemData.genericName,
      generic_name: itemData.generic_name || itemData.genericName || catalogMedicine?.generic_name || null,
      category: itemData.category,
      quantity: itemData.quantity || 0,
      price: itemData.price,
      mrp: itemData.mrp || itemData.price,
      batch_number: itemData.batchNumber || itemData.batch_number,
      expiry_date: itemData.expiryDate || itemData.expiry_date,
      manufacturer: itemData.manufacturer,
      requires_prescription: itemData.requiresPrescription ?? catalogMedicine?.requires_prescription ?? false,
      reorder_level: itemData.reorder_level || itemData.minQuantity || 10,
      pack_size: parseInt(itemData.packSize) || parseInt(itemData.pack_size) || 1,
      unit_type: itemData.unitType || itemData.unit_type || 'unit',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Add bulk inventory items
const addBulkInventoryItems = async (pharmacyId, userId, itemsArray) => {
  if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
    throw new ApiError(400, 'Items array is empty or invalid');
  }

  // To avoid hitting DB for every item's catalog match, we just use the provided names
  // This is acceptable for bulk imports to be fast.
  const recordsToInsert = itemsArray.map((itemData) => ({
    pharmacy_id: pharmacyId,
    name: itemData.name || itemData.generic_name || itemData.genericname || itemData.genericName || 'Unknown',
    generic_name: itemData.generic_name || itemData.genericname || itemData.genericName || null,
    category: itemData.category || 'Tablet',
    quantity: parseInt(itemData.quantity) || 0,
    price: parseFloat(itemData.price) || 0,
    mrp: parseFloat(itemData.mrp) || parseFloat(itemData.price) || 0,
    batch_number: itemData.batch_number || itemData.batchnumber || itemData.batchNumber || null,
    requires_prescription: itemData.requires_prescription || itemData.requiresprescription || itemData.requiresPrescription || false,
    manufacturer: itemData.manufacturer || null,
    expiry_date: itemData.expiryDate || itemData.expirydate || itemData.expiry_date || null,
    reorder_level: parseInt(itemData.reorder_level) || parseInt(itemData.minQuantity) || parseInt(itemData.minquantity) || 10,
    pack_size: parseInt(itemData.packSize) || parseInt(itemData.packsize) || parseInt(itemData.pack_size) || 1,
    unit_type: itemData.unitType || itemData.unittype || itemData.unit_type || 'unit',
  }));

  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .insert(recordsToInsert)
    .select('*');

  if (error) throw error;
  return data;
};

// Update inventory item
const updateInventoryItem = async (itemId, pharmacyId, userId, updates) => {
  const normalizedUpdates = normalizeInventoryUpdates(updates);

  const { data: existingItem, error: existingItemError } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id, pharmacy_id, medicine_id, name, generic_name')
    .eq('id', itemId)
    .eq('pharmacy_id', pharmacyId)
    .maybeSingle();

  if (existingItemError) throw existingItemError;
  if (!existingItem) throw new ApiError(404, 'Inventory item not found');

  const searchFieldsChanged =
    normalizedUpdates.name !== undefined ||
    normalizedUpdates.generic_name !== undefined ||
    normalizedUpdates.medicine_id !== undefined;

  const catalogMedicine = searchFieldsChanged
    ? await resolveCatalogMedicine({
        medicineId: normalizedUpdates.medicine_id,
        name: normalizedUpdates.name ?? existingItem.name,
        genericName: normalizedUpdates.generic_name ?? existingItem.generic_name,
      })
    : null;

  // Whitelist allowed fields
  const allowedFields = ['name', 'generic_name', 'medicine_id', 'category', 'quantity', 'price', 'mrp',
    'batch_number', 'expiry_date', 'manufacturer', 'requires_prescription',
    'reorder_level', 'description', 'pack_size', 'unit_type'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (normalizedUpdates[key] !== undefined) safeUpdates[key] = normalizedUpdates[key];
  }
  if (searchFieldsChanged) {
    safeUpdates.medicine_id =
      normalizedUpdates.medicine_id !== undefined
        ? (catalogMedicine?.id || normalizedUpdates.medicine_id || null)
        : (catalogMedicine?.id || null);
    if (safeUpdates.generic_name === undefined && (catalogMedicine?.generic_name || existingItem.generic_name)) {
      safeUpdates.generic_name = catalogMedicine?.generic_name || existingItem.generic_name || null;
    }
    if (safeUpdates.name === undefined && catalogMedicine?.name) {
      safeUpdates.name = catalogMedicine.name;
    }
  }
  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .update(safeUpdates)
    .eq('id', itemId)
    .eq('pharmacy_id', pharmacyId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Delete inventory item
const deleteInventoryItem = async (itemId, pharmacyId, userId) => {
  const { error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .delete()
    .eq('id', itemId)
    .eq('pharmacy_id', pharmacyId);

  if (error) throw error;
};

// Get orders
const getOrders = async (pharmacyId, filters = {}, page = 1, limit = 20) => {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 20;
  const offset = (safePage - 1) * safeLimit;
  const search = sanitizeSearch(filters.search || '').toLowerCase();
  const selectClause = '*, patient:patients(id, name)';

  let orders = [];
  let count = 0;
  let summary = { total: 0, pending: 0, active: 0, completed: 0, delivered: 0 };

  if (search) {
    const { data: allOrders, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select(selectClause)
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const normalizedOrders = normalizeOrderRecords(allOrders || []);
    const searchMatchedOrders = normalizedOrders.filter((order) => matchesOrderSearch(order, search));
    const filteredOrders = filterOrdersByGroup(searchMatchedOrders, filters);
    orders = filteredOrders.slice(offset, offset + safeLimit);
    count = filteredOrders.length;
    summary = summarizeOrders(searchMatchedOrders);
  } else {
    let query = supabaseAdmin
      .from('pharmacy_orders')
      .select(selectClause, { count: 'exact' })
      .eq('pharmacy_id', pharmacyId);

    if (filters.status) {
      const statusFilters = getDatabaseStatusesForFilter(filters.status);
      query = statusFilters.length > 1
        ? query.in('status', statusFilters)
        : query.eq('status', statusFilters[0]);
    } else if (filters.group === 'active') {
      query = query.in('status', ACTIVE_ORDER_DATABASE_STATUSES);
    } else if (filters.group === 'completed') {
      query = query.in('status', COMPLETED_ORDER_STATUSES);
    }

    const { data, error, count: totalCount } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) throw error;

    orders = normalizeOrderRecords(data || []);
    count = totalCount || 0;

    const [
      { count: totalOrders },
      { count: pendingOrders },
      { count: activeOrders },
      { count: completedOrders },
      { count: deliveredOrders },
    ] = await Promise.all([
      supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId),
      supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).eq('status', 'pending'),
      supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).in('status', ACTIVE_ORDER_DATABASE_STATUSES),
      supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).in('status', COMPLETED_ORDER_STATUSES),
      supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).eq('status', 'delivered'),
    ]);

    summary = {
      total: totalOrders || 0,
      pending: pendingOrders || 0,
      active: activeOrders || 0,
      completed: completedOrders || 0,
      delivered: deliveredOrders || 0,
    };
  }

  return {
    data: orders,
    orders,
    summary,
    pagination: buildPagination(safePage, safeLimit, count),
  };
};

// Valid order status transitions
const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['dispatched', 'delivered', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Update order status
const updateOrderStatus = async (orderId, pharmacyId, userId, status, notes) => {
  // Fetch current order to validate transition
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('status, tracking_token, agent_id')
    .eq('id', orderId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (fetchError || !current) throw new ApiError(404, 'Order not found');

  const currentStatus = normalizeOrderStatus(current.status);
  const nextStatus = normalizeOrderStatus(status);
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(400, `Cannot transition order from '${currentStatus}' to '${nextStatus}'`);
  }

  const persistedStatusCandidates = nextStatus === 'dispatched'
    ? ['dispatched', 'out_for_delivery']
    : [nextStatus];

  let data = null;
  let error = null;
  for (const candidateStatus of persistedStatusCandidates) {
    let updatePayload = {
      status: candidateStatus,
      notes,
      updated_at: new Date().toISOString(),
    };

    if (candidateStatus === 'out_for_delivery' && !current.tracking_token) {
      updatePayload.tracking_token = uuidv4();
    }

    const response = await supabaseAdmin
      .from('pharmacy_orders')
      .update(updatePayload)
      .eq('id', orderId)
      .eq('pharmacy_id', pharmacyId)
      .select('*')
      .single();

    if (!response.error) {
      data = response.data;
      error = null;
      break;
    }

    error = response.error;
  }

  if (error || !data) throw error;
  const normalizedOrder = normalizeOrderRecord(data);

  // If order completed or cancelled, free up agent
  if (['delivered', 'cancelled'].includes(nextStatus) && current.agent_id) {
    await supabaseAdmin
      .from('delivery_agents')
      .update({ status: 'available' })
      .eq('id', current.agent_id);
  }

  // If order cancelled, restore inventory
  if (nextStatus === 'cancelled' && ['pending', 'confirmed', 'processing', 'ready'].includes(currentStatus)) {
    if (Array.isArray(normalizedOrder.items)) {
      for (const item of normalizedOrder.items) {
        if (item.inventory_id && item.quantity > 0) {
          const { data: inv } = await supabaseAdmin
            .from('pharmacy_inventory')
            .select('quantity')
            .eq('id', item.inventory_id)
            .single();
          if (inv) {
            await supabaseAdmin
              .from('pharmacy_inventory')
              .update({ quantity: inv.quantity + item.quantity })
              .eq('id', item.inventory_id);
          }
        }
      }
    }
  }

  // Notify patient
  if (normalizedOrder?.patient_id) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('user_id')
      .eq('id', normalizedOrder.patient_id)
      .single();

    if (patient) {
      eventEmitter.emitOrderStatusUpdated({
        ...normalizedOrder,
        patient_id: patient.user_id,
        pharmacy_owner_id: userId,
      });
    }
  }

  return normalizedOrder;
};

// Analytics
const getAnalytics = async (pharmacyId, userId, period = '30d') => {
  const days = parseInt(period) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { data: inventory },
  ] = await Promise.all([
    supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).gte('created_at', sinceStr),
    supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacyId).eq('status', 'pending'),
    supabaseAdmin.from('pharmacy_inventory').select('quantity, price, reorder_level').eq('pharmacy_id', pharmacyId),
  ]);

  const totalInventoryValue = (inventory || []).reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
  const lowStockCount = (inventory || []).filter(i => i.quantity < (i.reorder_level || 10)).length;

  return {
    data: {
      period,
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      totalInventoryItems: (inventory || []).length,
      lowStockItems: lowStockCount,
      totalInventoryValue,
    },
  };
};

// Create order (from patient via medicine routes)
const createOrder = async (patientUserId, orderData) => {
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', patientUserId)
    .single();

  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
    .from('pharmacies')
    .select('id, owner_id, name')
    .eq('id', orderData.pharmacyId)
    .eq('is_active', true)
    .eq('is_approved', true)
    .maybeSingle();

  if (pharmacyError) throw pharmacyError;
  if (!pharmacy) {
    throw new ApiError(404, 'Pharmacy not found');
  }

  // Batch-fetch all inventory items in one query
  const itemIds = (orderData.items || []).map(i => i.inventoryItemId || i.medicineId).filter(Boolean);
  let inventoryMap = {};
  if (itemIds.length > 0) {
    const { data: invItems } = await supabaseAdmin
      .from('pharmacy_inventory')
      .select('id, price, name, generic_name, medicine_id')
      .eq('pharmacy_id', orderData.pharmacyId)
      .or(`id.in.(${itemIds.join(',')}),medicine_id.in.(${itemIds.join(',')})`);
      
    inventoryMap = (invItems || []).reduce((m, item) => { 
      m[item.id] = item; 
      if (item.medicine_id) m[item.medicine_id] = item;
      return m; 
    }, {});
  }

  let totalAmount = 0;
  const enrichedItems = [];
  const allowUnmatchedItems = Boolean(orderData.prescriptionId);
  for (const item of (orderData.items || [])) {
    const reqItemId = item.inventoryItemId || item.medicineId || item.name || item.genericName;
    const invItem = await resolveInventoryRowForOrderItem(orderData.pharmacyId, item, inventoryMap);
    const catalogMedicine = await resolveCatalogMedicine({
      medicineId: item.medicineId,
      name: item.name,
      genericName: item.genericName,
    });

    if (!invItem && !allowUnmatchedItems) {
      throw new ApiError(400, `Item ${reqItemId || 'requested'} not available at this pharmacy`);
    }

    const itemPrice = invItem?.price || 0;
    totalAmount += itemPrice * (item.quantity || 1);

    enrichedItems.push({
      inventory_id: invItem?.id || null,
      medicine_id: invItem?.medicine_id || catalogMedicine?.id || item.medicineId || null,
      quantity: item.quantity || 1,
      price: itemPrice,
      name: invItem?.name || invItem?.generic_name || item.name || item.genericName || catalogMedicine?.name || 'Medicine',
      generic_name: invItem?.generic_name || item.genericName || catalogMedicine?.generic_name || null,
      requires_manual_review: !invItem,
    });
  }

  const insertPayload = {
    patient_id: patient.id,
    pharmacy_id: orderData.pharmacyId,
    items: enrichedItems,
    total_amount: totalAmount,
    delivery_address: orderData.patientPhone ? `${orderData.deliveryAddress} | Phone: ${orderData.patientPhone}` : orderData.deliveryAddress,
    status: 'pending',
    payment_status: 'pending',
  };

  // Link prescription if provided (enables pharmacy prescription view)
  if (orderData.prescriptionId) {
    insertPayload.prescription_id = orderData.prescriptionId;
  }

  const { data: order, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) throw error;

  // Decrement inventory stock
  for (const item of enrichedItems) {
    if (item.inventory_id && item.quantity > 0) {
      const { data: currentInv } = await supabaseAdmin
        .from('pharmacy_inventory')
        .select('quantity')
        .eq('id', item.inventory_id)
        .single();
      
      if (currentInv) {
        const newQuantity = Math.max(0, currentInv.quantity - item.quantity);
        await supabaseAdmin
          .from('pharmacy_inventory')
          .update({ quantity: newQuantity })
          .eq('id', item.inventory_id);
      }
    }
  }

  // Notify pharmacy owner of new order
  if (pharmacy) {
    eventEmitter.emitNewOrder({
      ...order,
      pharmacy_owner_id: pharmacy.owner_id,
      pharmacy_name: pharmacy.name,
      total: totalAmount,
    });
  }

  return { ...order, total: totalAmount };
};

module.exports = {
  searchPharmacies,
  findNearbyWithMedicine,
  getPharmacyById,
  registerPharmacy,
  getPharmacyByOwner,
  updatePharmacy,
  getInventory,
  addInventoryItem,
  addBulkInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  getOrders,
  updateOrderStatus,
  getAnalytics,
  createOrder,
};
