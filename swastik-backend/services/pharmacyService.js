/**
 * Pharmacy Service
 * Inventory, orders, analytics for pharmacy owners
 */
const { supabaseAdmin } = require('../config/supabase');
const { cacheDel } = require('../config/redis');
const { ApiError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const { randomUUID } = require('crypto');
const eventEmitter = require('./eventEmitter');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { maybeGeocodeLocationUpdates } = require('../utils/geocoding');
const { sanitizeSearch } = require('../utils/sanitize');
const { buildProviderResubmissionFields } = require('../utils/providerApproval');
const { computeBestPrices, recordRedemptions, voidRedemptionsForOrder } = require('./discountService');
const organizationPartnershipService = require('./organizationPartnershipService');

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
  order ? {
    ...order,
    status: normalizeOrderStatus(order.status),
    facility: order.facility || order.pharmacy || null,
  } : order
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

// Find nearby pharmacies (general — no medicineId required)
const findNearbyGeneral = async (latitude, longitude, radius = 25) => {
  const bounds = getBoundingBox({ latitude, longitude }, radius);

  const { data: pharmacies } = await supabaseAdmin
    .from('pharmacies')
    .select('id, name, address, phone, latitude, longitude, is_open, delivery_available, image_url, profile_image_url')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('latitude', bounds.minLat)
    .lte('latitude', bounds.maxLat)
    .gte('longitude', bounds.minLng)
    .lte('longitude', bounds.maxLng);

  if (!pharmacies || pharmacies.length === 0) return [];

  return pharmacies
    .map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      distance: calculateDistance({ latitude, longitude }, { latitude: p.latitude, longitude: p.longitude }),
      rating: null,
      image: p.profile_image_url || p.image_url || null,
      is_open: p.is_open ?? false,
      delivery_available: p.delivery_available ?? false,
    }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
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

// Get pharmacy by owner (owner-only — backward compatible, used by owner-only routes)
const getPharmacyByOwner = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .select('*, reels:pharmacy_reels(*)')
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

// Get pharmacy by user (owner OR active member — used by shared operational routes)
// Constraint: pharmacyId is never passed in; it is resolved from authoritative data.
const getPharmacyByUser = async (userId, userRole) => {
  if (userRole === 'pharmacy_owner') {
    return getPharmacyByOwner(userId);
  }

  if (userRole === 'pharmacy_manager' || userRole === 'pharmacy_staff') {
    const { data: member } = await supabaseAdmin
      .from('pharmacy_members')
      .select('pharmacy_id, status, member_role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) throw new ApiError(403, 'Pharmacy membership not found. Contact your pharmacy owner.');
    if (member.status !== 'active') throw new ApiError(403, 'Your pharmacy membership is not active.');

    const { data, error } = await supabaseAdmin
      .from('pharmacies')
      .select('*')
      .eq('id', member.pharmacy_id)
      .single();

    if (error || !data) throw new ApiError(404, 'Linked pharmacy not found.');

    const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
    const pharmacy = recordWithPhone || data;
    return {
      ...pharmacy,
      profile_image_url: pharmacy.profile_image_url || pharmacy.image_url || null,
      _memberRole: member.member_role, // internal — not exposed to frontend
    };
  }

  throw new ApiError(403, 'Pharmacy role required.');
};

// ── Staff Management ──────────────────────────────────────────────────────────

// List all members of a pharmacy (owner-only)
const getPharmacyMembers = async (pharmacyId) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacy_members')
    .select(`
      id,
      member_role,
      status,
      invited_by,
      created_at,
      updated_at,
      user:users!pharmacy_members_user_id_fkey(id, name, email, phone, profile_image_url)
    `)
    .eq('pharmacy_id', pharmacyId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Invite a user to join as member (owner-only)
// Constraint: inviterUserId must be validated as the pharmacy owner before calling.
// The member_role value is server-validated here — never trusted from frontend directly.
const invitePharmacyMember = async (pharmacyId, inviterUserId, targetEmail, requestedRole) => {
  // Validate role server-side — never trust frontend string directly
  const ALLOWED_MEMBER_ROLES = ['manager', 'staff'];
  if (!ALLOWED_MEMBER_ROLES.includes(requestedRole)) {
    throw new ApiError(400, `Invalid role. Allowed: ${ALLOWED_MEMBER_ROLES.join(', ')}`);
  }

  // Look up target user by email
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role')
    .eq('email', targetEmail)
    .maybeSingle();

  if (!targetUser) {
    throw new ApiError(404, 'No user found with that email. They must register on Vaididea first.');
  }

  // Validate the target user does not already hold a conflicting org role
  const DISALLOWED_TARGET_ROLES = ['pharmacy_owner', 'clinic_owner', 'hospital_owner', 'admin', 'super_admin', 'diagnostic_center_owner'];
  if (DISALLOWED_TARGET_ROLES.includes(targetUser.role)) {
    throw new ApiError(409, 'This user already holds an organization owner role and cannot be added as pharmacy staff.');
  }

  // Check for existing membership
  const { data: existing } = await supabaseAdmin
    .from('pharmacy_members')
    .select('id, status')
    .eq('user_id', targetUser.id)
    .eq('pharmacy_id', pharmacyId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') throw new ApiError(409, 'This user is already an active member of this pharmacy.');
    if (existing.status === 'invited') throw new ApiError(409, 'An invitation is already pending for this user.');
    // If suspended/removed, re-activate
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pharmacy_members')
      .update({ member_role: requestedRole, status: 'active', invited_by: inviterUserId, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return { member: updated, reactivated: true };
  }

  // Insert new membership
  const { data: member, error } = await supabaseAdmin
    .from('pharmacy_members')
    .insert({
      user_id: targetUser.id,
      pharmacy_id: pharmacyId,
      member_role: requestedRole,
      status: 'active', // E1: direct activation; invite-token flow is future E2+
      invited_by: inviterUserId,
    })
    .select()
    .single();

  if (error) throw error;

  // Update the target user's role in users table
  const newUserRole = requestedRole === 'manager' ? 'pharmacy_manager' : 'pharmacy_staff';
  await supabaseAdmin
    .from('users')
    .update({ role: newUserRole })
    .eq('id', targetUser.id);

  return { member, user: targetUser };
};

// Update member role (owner-only)
// Constraint: newRole is validated server-side
const updatePharmacyMemberRole = async (pharmacyId, memberId, newRole) => {
  const ALLOWED_MEMBER_ROLES = ['manager', 'staff'];
  if (!ALLOWED_MEMBER_ROLES.includes(newRole)) {
    throw new ApiError(400, `Invalid role. Allowed: ${ALLOWED_MEMBER_ROLES.join(', ')}`);
  }

  const { data: member, error: findError } = await supabaseAdmin
    .from('pharmacy_members')
    .select('id, user_id, status')
    .eq('id', memberId)
    .eq('pharmacy_id', pharmacyId)
    .maybeSingle();

  if (findError || !member) throw new ApiError(404, 'Member not found in this pharmacy.');
  if (member.status === 'removed') throw new ApiError(400, 'Cannot update a removed member.');

  const { data: updated, error } = await supabaseAdmin
    .from('pharmacy_members')
    .update({ member_role: newRole })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;

  // Sync users.role
  const newUserRole = newRole === 'manager' ? 'pharmacy_manager' : 'pharmacy_staff';
  await supabaseAdmin.from('users').update({ role: newUserRole }).eq('id', member.user_id);

  return updated;
};

// Remove/suspend a member (owner-only)
const removePharmacyMember = async (pharmacyId, memberId, action = 'remove') => {
  const { data: member, error: findError } = await supabaseAdmin
    .from('pharmacy_members')
    .select('id, user_id, status')
    .eq('id', memberId)
    .eq('pharmacy_id', pharmacyId)
    .maybeSingle();

  if (findError || !member) throw new ApiError(404, 'Member not found in this pharmacy.');

  const newStatus = action === 'suspend' ? 'suspended' : 'removed';

  const { data: updated, error } = await supabaseAdmin
    .from('pharmacy_members')
    .update({ status: newStatus })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;

  // If removed, revert the user's role to 'patient' so they cannot log back in as pharmacy staff
  if (newStatus === 'removed') {
    await supabaseAdmin.from('users').update({ role: 'patient' }).eq('id', member.user_id);
  }

  return updated;
};

// Get pharmacy by ID (public)
const getPharmacyById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .select('*, reels:pharmacy_reels(*)')
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

  // Fetch top inventory for public display
  const { data: inventory } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id, name, generic_name, price, quantity, pack_size, unit_type, is_active')
    .eq('pharmacy_id', id)
    .eq('is_active', true)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(10);

  const [recordWithPhone] = await enrichMissingPhonesFromOwners([data]);
  const pharmacy = recordWithPhone || data;

  return {
    ...pharmacy,
    profile_image_url: pharmacy.profile_image_url || pharmacy.image_url || null,
    hospital_id: assocs?.facility_type === 'hospital' ? assocs.facility_id : null,
    clinic_id: assocs?.facility_type === 'clinic' ? assocs.facility_id : null,
    inventory: inventory || []
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
    'is_24_hours', 'is_open', 'delivery_available', 'description', 'opening_hours', 'profile_image_url',
    'website_url', 'established_year', 'virtual_tour_url', 'accreditations', 'facilities',
    'delivery_radius_km', 'min_order_delivery'];
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
    .select('*, medicine:medicines(id, name, generic_name, manufacturer, category, subcategory, description, form, dosage_form, strength, pack_size, requires_prescription, image_url)', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId);

  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,generic_name.ilike.%${s}%,barcode.eq.${s}`);
  }
  // Low-stock filter is applied in JS because PostgREST does not support
  // reliable cross-column comparisons like quantity < reorder_level.
  const isLowStockFilter = filters.lowStock === true || filters.lowStock === 'true';
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const sortBy = filters.sortBy || 'name';
  const sortOrder = filters.sortOrder === 'desc' ? { ascending: false } : { ascending: true };
  const allowedSorts = ['name', 'expiry_date', 'quantity', 'price'];
  const finalSort = allowedSorts.includes(sortBy) ? sortBy : 'name';

  let data, error, count;
  {
    if (isLowStockFilter) {
      // Fetch matching category/search rows first, then apply low-stock logic
      const result = await query.order(finalSort, sortOrder);
      const allRows = result.data || [];
      const lowStockRows = allRows.filter(i => {
        const available = (i.quantity || 0) - (i.reserved_quantity || 0);
        return available <= (i.minimum_stock ?? 10); // fallback to 10 if missing
      });
      data = lowStockRows.slice(offset, offset + limit);
      error = result.error;
      count = lowStockRows.length;
    } else {
      const result = await query
        .order(finalSort, sortOrder)
        .range(offset, offset + limit - 1);
      data = result.data;
      error = result.error;
      count = result.count;
    }
  }

  if (error) throw error;

  // Map joined image_url to top level for frontend/app consumption
  const mappedData = (data || []).map(row => {
    const mapped = { ...row };
    if (mapped.medicine && mapped.medicine.image_url) {
      mapped.image_url = mapped.medicine.image_url;
    }
    delete mapped.medicine; // Clean up the nested object
    mapped.available_quantity = (mapped.quantity || 0) - (mapped.reserved_quantity || 0);
    return mapped;
  });

  return {
    data: mappedData,
    items: mappedData, // Alias for route compatibility
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

  // Resolve each item against master catalog in parallel
  const resolvedItems = await Promise.all(itemsArray.map(async (itemData) => {
    let catalogMedicine = await resolveCatalogMedicine({
      medicineId: itemData.medicine_id,
      name: itemData.name,
      genericName: itemData.generic_name || itemData.genericname || itemData.genericName,
    });

    // If no match in master catalog, auto-create a basic entry so pharmacy gets a medicine_id link
    // This ensures image, dosage_form etc. can be added later by admin
    if (!catalogMedicine && itemData.name) {
      const { data: newMedicine, error: createError } = await supabaseAdmin
        .from('medicines')
        .insert({
          name: itemData.name,
          generic_name: itemData.generic_name || itemData.genericname || itemData.genericName || null,
          manufacturer: itemData.manufacturer || null,
          category: itemData.category || null,
          price: parseFloat(itemData.price) || 0,
          mrp: parseFloat(itemData.mrp) || parseFloat(itemData.price) || 0,
        })
        .select('id, name, generic_name, requires_prescription')
        .single();

      if (!createError && newMedicine) {
        catalogMedicine = newMedicine;
      }
    }

    return {
      pharmacy_id: pharmacyId,
      medicine_id: catalogMedicine?.id || null,
      name: itemData.name || catalogMedicine?.name || itemData.generic_name || itemData.genericname || itemData.genericName || 'Unknown',
      generic_name: itemData.generic_name || itemData.genericname || itemData.genericName || catalogMedicine?.generic_name || null,
      category: itemData.category || null,
      quantity: parseInt(itemData.quantity) || 0,
      price: parseFloat(itemData.price) || 0,
      mrp: parseFloat(itemData.mrp) || parseFloat(itemData.price) || 0,
      batch_number: itemData.batch_number || itemData.batchnumber || itemData.batchNumber || null,
      requires_prescription: itemData.requires_prescription || itemData.requiresprescription || itemData.requiresPrescription || catalogMedicine?.requires_prescription || false,
      manufacturer: itemData.manufacturer || null,
      expiry_date: itemData.expiryDate || itemData.expirydate || itemData.expiry_date || null,
      reorder_level: parseInt(itemData.reorder_level) || parseInt(itemData.minQuantity) || parseInt(itemData.minquantity) || 10,
      pack_size: parseInt(itemData.packSize) || parseInt(itemData.packsize) || parseInt(itemData.pack_size) || 1,
      unit_type: itemData.unitType || itemData.unittype || itemData.unit_type || 'unit',
    };
  }));

  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .insert(resolvedItems)
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
  const selectClause = '*, clinic:clinics(id, name), hospital:hospitals(id, name), patient:patients(id, name, user:users(phone)), pharmacy:pharmacies(id, name, phone, address, latitude, longitude), delivery_agents(*)';

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
const updateOrderStatus = async (orderId, pharmacyId, userId, status, notes, pharmacyOwnerIdOverride) => {
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
      updatePayload.tracking_token = randomUUID();
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

  // Handle Inventory Updates on Cancellation or Dispatch/Delivery
  if (['cancelled', 'rejected'].includes(nextStatus)) {
    await voidRedemptionsForOrder(orderId);
    if (['pending', 'confirmed', 'processing', 'ready'].includes(currentStatus)) {
      if (Array.isArray(normalizedOrder.items)) {
        for (const item of normalizedOrder.items) {
          if (item.inventory_id && item.quantity > 0) {
            let retries = 3;
            while (retries > 0) {
              const { data: inv } = await supabaseAdmin
                .from('pharmacy_inventory')
                .select('reserved_quantity')
                .eq('id', item.inventory_id)
                .single();
              if (inv) {
                const newReserved = Math.max(0, (inv.reserved_quantity || 0) - item.quantity);
                const { data: updated, error } = await supabaseAdmin
                  .from('pharmacy_inventory')
                  .update({ reserved_quantity: newReserved })
                  .eq('id', item.inventory_id)
                  .eq('reserved_quantity', inv.reserved_quantity || 0)
                  .select();
                if (!error && updated && updated.length > 0) break;
                retries--;
                if (retries === 0) console.error(`Failed to restore reserved inventory ${item.inventory_id} after retries`);
              } else {
                break;
              }
            }
          }
        }
      }
    }
  } else if (['dispatched', 'delivered'].includes(nextStatus)) {
    // Only deduct physical inventory and finalize reservation if it wasn't already fulfilled
    if (['pending', 'confirmed', 'processing', 'ready'].includes(currentStatus)) {
      if (Array.isArray(normalizedOrder.items)) {
        for (const item of normalizedOrder.items) {
          if (item.inventory_id && item.quantity > 0) {
            let retries = 3;
            while (retries > 0) {
              const { data: inv } = await supabaseAdmin
                .from('pharmacy_inventory')
                .select('quantity, reserved_quantity')
                .eq('id', item.inventory_id)
                .single();
              if (inv) {
                const newQuantity = Math.max(0, (inv.quantity || 0) - item.quantity);
                const newReserved = Math.max(0, (inv.reserved_quantity || 0) - item.quantity);
                const { data: updated, error } = await supabaseAdmin
                  .from('pharmacy_inventory')
                  .update({ quantity: newQuantity, reserved_quantity: newReserved })
                  .eq('id', item.inventory_id)
                  .eq('quantity', inv.quantity)
                  .eq('reserved_quantity', inv.reserved_quantity || 0)
                  .select();
                if (!error && updated && updated.length > 0) break;
                retries--;
                if (retries === 0) console.error(`Failed to consume inventory ${item.inventory_id} after retries`);
              } else {
                break;
              }
            }
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
        pharmacy_owner_id: pharmacyOwnerIdOverride || userId,
      });
    }
  }

  return normalizedOrder;
};

// Analytics — Advanced R1-R10
const getAnalytics = async (pharmacyId, userId, period = '30d') => {
  const days = parseInt(period, 10) || 30;

  // 1. Attempt single optimized RPC call (Migration 091)
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_pharmacy_advanced_analytics', {
    p_pharmacy_id: pharmacyId,
    p_period_days: days,
  });

  if (!rpcError && rpcData) {
    const overview = rpcData.overview || {};
    const inventory = rpcData.inventory || {};

    return {
      data: {
        period,
        // Legacy top-level compatibility fields
        totalOrders: overview.totalOrders || 0,
        pendingOrders: overview.pendingOrders || 0,
        totalInventoryItems: inventory.total_items || 0,
        lowStockItems: inventory.low_stock || 0,
        totalInventoryValue: Number(inventory.inventory_value || 0),

        // Advanced Analytics Sections (R1 - R10)
        overview: {
          totalOrders: overview.totalOrders || 0,
          pendingOrders: overview.pendingOrders || 0,
          grossSales: Number(overview.grossSales || 0),
          netSales: Number(overview.netSales || 0),
          averageOrderValue: Number(overview.averageOrderValue || 0),
          paidOrders: overview.paidOrders || 0,
          refundedOrders: overview.refundedOrders || 0,
          refundedAmount: Number(overview.refundedAmount || 0),
        },
        trends: rpcData.trends || [],
        sources: rpcData.sources || [],
        inventory: {
          total_items: inventory.total_items || 0,
          total_units: inventory.total_units || 0,
          reserved_units: inventory.reserved_units || 0,
          available_units: inventory.available_units || 0,
          low_stock: inventory.low_stock || 0,
          out_of_stock: inventory.out_of_stock || 0,
          expired: inventory.expired || 0,
          expiring_30: inventory.expiring_30 || 0,
          expiring_60: inventory.expiring_60 || 0,
          expiring_90: inventory.expiring_90 || 0,
          inventory_value: Number(inventory.inventory_value || 0),
        },
        topMedicines: rpcData.top_medicines || [],
        slowMedicines: rpcData.slow_medicines || [],
        partners: rpcData.partners || {
          clinic_orders: 0,
          clinic_revenue: 0,
          hospital_orders: 0,
          hospital_revenue: 0,
          top_partners: [],
        },
        campaigns: rpcData.campaigns || {
          total_redemptions: 0,
          total_discount_given: 0,
          campaigns: [],
        },
        delivery: rpcData.delivery || {
          total_delivery_orders: 0,
          assigned_orders: 0,
          dispatched_orders: 0,
          delivered_orders: 0,
          pending_delivery: 0,
          average_delivery_time_minutes: 0,
          agents: [],
        },
        meta: rpcData.meta || {
          period_days: days,
          generated_at: new Date().toISOString(),
        },
      },
    };
  }

  // Fallback if RPC has not been executed yet in the database
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [
    { data: ordersData },
    { count: pendingOrders },
    { data: inventory },
    { data: redemptions },
  ] = await Promise.all([
    supabaseAdmin
      .from('pharmacy_orders')
      .select('id, total_amount, status, payment_status, source, clinic_id, hospital_id, agent_id, delivered_at, created_at, items')
      .eq('pharmacy_id', pharmacyId)
      .gte('created_at', sinceStr),
    supabaseAdmin
      .from('pharmacy_orders')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('pharmacy_inventory')
      .select('id, name, medicine_id, quantity, reserved_quantity, price, reorder_level, expiry_date')
      .eq('pharmacy_id', pharmacyId),
    supabaseAdmin
      .from('campaign_redemptions')
      .select('id, campaign_id, discount_amount, redeemed_at')
      .eq('pharmacy_id', pharmacyId)
      .gte('redeemed_at', sinceStr),
  ]);

  const orders = ordersData || [];
  const validOrders = orders.filter(o => !['cancelled', 'failed', 'refunded'].includes(o.status));
  const grossSales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const netSales = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
  const refundedOrdersList = orders.filter(o => o.status === 'refunded' || o.payment_status === 'refunded');
  const refundedAmount = refundedOrdersList.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const averageOrderValue = validOrders.length > 0 ? Number((netSales / validOrders.length).toFixed(2)) : 0;

  // Trends
  const trendMap = {};
  orders.forEach(o => {
    const dt = o.created_at ? o.created_at.split('T')[0] : 'Unknown';
    if (!trendMap[dt]) trendMap[dt] = { date: dt, orders: 0, revenue: 0 };
    trendMap[dt].orders += 1;
    if (!['cancelled', 'failed', 'refunded'].includes(o.status)) {
      trendMap[dt].revenue += (Number(o.total_amount) || 0);
    }
  });
  const trends = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  // Sources
  const sourceMap = {
    clinic: { source: 'clinic', source_label: 'Partner Clinic', order_count: 0, revenue: 0 },
    hospital: { source: 'hospital', source_label: 'Partner Hospital', order_count: 0, revenue: 0 },
    pos: { source: 'pos', source_label: 'POS / Walk-in', order_count: 0, revenue: 0 },
    online: { source: 'online', source_label: 'Online / Patient', order_count: 0, revenue: 0 },
  };
  orders.forEach(o => {
    let srcKey = 'online';
    if (o.clinic_id) srcKey = 'clinic';
    else if (o.hospital_id) srcKey = 'hospital';
    else if (o.source === 'pos') srcKey = 'pos';

    if (sourceMap[srcKey]) {
      sourceMap[srcKey].order_count += 1;
      if (!['cancelled', 'failed', 'refunded'].includes(o.status)) {
        sourceMap[srcKey].revenue += (Number(o.total_amount) || 0);
      }
    }
  });
  const sources = Object.values(sourceMap).filter(s => s.order_count > 0);

  // Inventory
  const todayStr = new Date().toISOString().split('T')[0];
  const d30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const d60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const d90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const invList = inventory || [];
  let totalUnits = 0;
  let reservedUnits = 0;
  let availableUnits = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let expired = 0;
  let expiring30 = 0;
  let expiring60 = 0;
  let expiring90 = 0;
  let inventoryValue = 0;

  invList.forEach(i => {
    const qty = Number(i.quantity) || 0;
    const res = Number(i.reserved_quantity) || 0;
    const avail = Math.max(0, qty - res);
    const reorder = i.reorder_level !== null && i.reorder_level !== undefined ? Number(i.reorder_level) : 10;

    totalUnits += qty;
    reservedUnits += res;
    availableUnits += avail;
    inventoryValue += qty * (Number(i.price) || 0);

    if (qty <= reorder && qty > 0) lowStock += 1;
    if (qty === 0 || avail === 0) outOfStock += 1;

    if (i.expiry_date) {
      if (i.expiry_date < todayStr) expired += 1;
      else if (i.expiry_date <= d30) expiring30 += 1;
      else if (i.expiry_date <= d60) expiring60 += 1;
      else if (i.expiry_date <= d90) expiring90 += 1;
    }
  });

  // Top Medicines and Slow Moving from items
  const salesMap = {};
  validOrders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(it => {
        const key = it.medicine_id || it.inventory_id || it.name || 'Unknown';
        if (!salesMap[key]) {
          salesMap[key] = {
            medicine_id: it.medicine_id || null,
            inventory_id: it.inventory_id || null,
            name: it.name || 'Medicine',
            units_sold: 0,
            revenue: 0,
          };
        }
        const q = Number(it.quantity) || 1;
        const p = Number(it.price) || 0;
        salesMap[key].units_sold += q;
        salesMap[key].revenue += q * p;
      });
    }
  });

  const topMedicines = Object.values(salesMap)
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, 10);

  const slowMedicines = invList
    .map(i => {
      const match = Object.values(salesMap).find(s =>
        (i.medicine_id && s.medicine_id === i.medicine_id) ||
        (i.id && s.inventory_id === i.id) ||
        (s.name && s.name.toLowerCase() === (i.name || '').toLowerCase())
      );
      const unitsSold = match ? match.units_sold : 0;
      return {
        inventory_id: i.id,
        medicine_id: i.medicine_id || null,
        name: i.name,
        current_stock: i.quantity,
        units_sold: unitsSold,
        velocity: Number((unitsSold / days).toFixed(4)),
        formula: `units_sold / ${days} days`,
      };
    })
    .sort((a, b) => a.units_sold - b.units_sold || b.current_stock - a.current_stock)
    .slice(0, 10);

  return {
    data: {
      period,
      totalOrders: orders.length,
      pendingOrders: pendingOrders || 0,
      totalInventoryItems: invList.length,
      lowStockItems: lowStock,
      totalInventoryValue: inventoryValue,
      overview: {
        totalOrders: orders.length,
        pendingOrders: pendingOrders || 0,
        grossSales,
        netSales,
        averageOrderValue,
        paidOrders,
        refundedOrders: refundedOrdersList.length,
        refundedAmount,
      },
      trends,
      sources,
      inventory: {
        total_items: invList.length,
        total_units: totalUnits,
        reserved_units: reservedUnits,
        available_units: availableUnits,
        low_stock: lowStock,
        out_of_stock: outOfStock,
        expired,
        expiring_30: expiring30,
        expiring_60: expiring60,
        expiring_90: expiring90,
        inventory_value: inventoryValue,
      },
      topMedicines,
      slowMedicines,
      partners: {
        clinic_orders: orders.filter(o => o.clinic_id).length,
        clinic_revenue: orders.filter(o => o.clinic_id && !['cancelled', 'failed', 'refunded'].includes(o.status)).reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
        hospital_orders: orders.filter(o => o.hospital_id).length,
        hospital_revenue: orders.filter(o => o.hospital_id && !['cancelled', 'failed', 'refunded'].includes(o.status)).reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
        top_partners: [],
      },
      campaigns: {
        total_redemptions: (redemptions || []).length,
        total_discount_given: (redemptions || []).reduce((s, r) => s + (Number(r.discount_amount) || 0), 0),
        campaigns: [],
      },
      delivery: {
        total_delivery_orders: orders.filter(o => o.agent_id || o.delivery_type === 'delivery').length,
        assigned_orders: orders.filter(o => o.agent_id).length,
        dispatched_orders: orders.filter(o => ['dispatched', 'out_for_delivery'].includes(o.status)).length,
        delivered_orders: orders.filter(o => o.status === 'delivered').length,
        pending_delivery: orders.filter(o => (o.agent_id || o.delivery_type === 'delivery') && ['pending', 'confirmed', 'processing', 'ready', 'dispatched', 'out_for_delivery'].includes(o.status)).length,
        average_delivery_time_minutes: 0,
        agents: [],
      },
      meta: {
        period_days: days,
        generated_at: new Date().toISOString(),
      },
    },
  };
};



// Create order (from clinic on behalf of a patient)
const createClinicPharmacyOrder = async (clinicId, doctorId, orderData) => {
  if (!orderData.prescriptionId) {
    throw new ApiError(400, 'A valid prescription ID is required for clinic-routed orders');
  }

  // 1. Verify Active Partnership
  await organizationPartnershipService.verifyActivePartnership('clinic', clinicId, 'pharmacy', orderData.pharmacyId);

  // 2. Verify Prescription ownership
  // Clinic context is verified by checking the prescription's consultation's appointment's clinic_id
  const { data: prescription, error: prescriptionError } = await supabaseAdmin
    .from('prescriptions')
    .select(`
      id,
      patient_id,
      consultations (
        appointments (
          clinic_id
        )
      )
    `)
    .eq('id', orderData.prescriptionId)
    .single();

  if (prescriptionError || !prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  const presClinicId = prescription.consultations?.appointments?.clinic_id;
  if (presClinicId && presClinicId !== clinicId) {
    throw new ApiError(403, 'Prescription does not belong to your clinic');
  }

  // Check for duplicate active route
  const { data: existingOrder } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('id')
    .eq('prescription_id', orderData.prescriptionId)
    .eq('clinic_id', clinicId)
    .eq('pharmacy_id', orderData.pharmacyId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existingOrder) {
    throw new ApiError(409, 'This prescription is already routed to this pharmacy.');
  }

  const patientUserId = prescription.patient_id; // actually this is patient's table UUID, let's just get patient's user_id if needed, but createOrder uses user_id. Wait! createOrder accepts patientUserId (the user table ID). We need to pass the user_id of the patient.
  
  const { data: patientData } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', prescription.patient_id)
    .single();

  if (!patientData || !patientData.user_id) {
    throw new ApiError(404, 'Patient user profile not found');
  }

  // Check delivery fee configuration from pharmacy
  const { data: pharmacyConfig } = await supabaseAdmin
    .from('pharmacies')
    .select('delivery_fee, offers_delivery')
    .eq('id', orderData.pharmacyId)
    .single();

  // If pharmacy has delivery fee configured, apply it to the order data so base createOrder uses it, 
  // actually createOrder calculates total from items + doesn't automatically add delivery fee unless passed
  let deliveryFee = 0;
  if (orderData.deliveryType === 'delivery' && pharmacyConfig) {
      deliveryFee = pharmacyConfig.delivery_fee || 0;
  }
  
  let items = Array.isArray(orderData.items) && orderData.items.length > 0 ? orderData.items : [];
  if (items.length === 0 && orderData.prescriptionId) {
    const { data: presItems } = await supabaseAdmin
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', orderData.prescriptionId);
    if (presItems && presItems.length > 0) {
      items = presItems.map(pi => ({
        name: pi.medicine_name || pi.name || 'Prescribed Medicine',
        dosage: pi.dosage,
        frequency: pi.frequency,
        duration: pi.duration,
        quantity: pi.quantity || 1,
        price: 0
      }));
    } else {
      items = [{
        name: prescription.diagnosis ? `Prescribed Medication (${prescription.diagnosis})` : 'Prescribed Medications',
        quantity: 1,
        price: 0
      }];
    }
  }

  orderData.items = items;
  orderData.deliveryFee = deliveryFee;
  orderData.clinicId = clinicId;

  // Delegate to existing createOrder logic to avoid duplicating item pricing and inventory logic
  const order = await createOrder(patientData.user_id, orderData);

  // Trigger specific notification if needed
  eventEmitter.emitOrderStatusUpdated({
    ...order,
    status: 'pending',
    clinic_id: clinicId,
  });

  return order;
};

// Create order (from hospital on behalf of a patient)
const createHospitalPharmacyOrder = async (hospitalId, doctorId, orderData) => {
  if (!orderData.prescriptionId) {
    throw new ApiError(400, 'A valid prescription ID is required for hospital-routed orders');
  }

  // 1. Verify Active Partnership
  await organizationPartnershipService.verifyActivePartnership('hospital', hospitalId, 'pharmacy', orderData.pharmacyId);

  // 2. Verify Prescription ownership
  // Hospital context is verified by checking the prescription's consultation's appointment's hospital_id
  const { data: prescription, error: prescriptionError } = await supabaseAdmin
    .from('prescriptions')
    .select(`
      id,
      patient_id,
      consultations (
        appointments (
          hospital_id
        )
      )
    `)
    .eq('id', orderData.prescriptionId)
    .single();

  if (prescriptionError || !prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  const presHospitalId = prescription.consultations?.appointments?.hospital_id;
  if (presHospitalId && presHospitalId !== hospitalId) {
    throw new ApiError(403, 'Prescription does not belong to your hospital');
  }

  // Check for duplicate active route
  const { data: existingOrder } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('id')
    .eq('prescription_id', orderData.prescriptionId)
    .eq('hospital_id', hospitalId)
    .eq('pharmacy_id', orderData.pharmacyId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existingOrder) {
    throw new ApiError(409, 'This prescription is already routed to this pharmacy.');
  }

  const { data: patientData } = await supabaseAdmin
    .from('patients')
    .select('user_id')
    .eq('id', prescription.patient_id)
    .single();

  if (!patientData || !patientData.user_id) {
    throw new ApiError(404, 'Patient user profile not found');
  }

  // Check delivery fee configuration from pharmacy
  const { data: pharmacyConfig } = await supabaseAdmin
    .from('pharmacies')
    .select('delivery_fee, offers_delivery')
    .eq('id', orderData.pharmacyId)
    .single();

  let deliveryFee = 0;
  if (orderData.deliveryType === 'delivery' && pharmacyConfig) {
      deliveryFee = pharmacyConfig.delivery_fee || 0;
  }
  
  orderData.deliveryFee = deliveryFee;
  orderData.hospitalId = hospitalId;

  // Delegate to existing createOrder logic to avoid duplicating item pricing and inventory logic
  const order = await createOrder(patientData.user_id, orderData);

  // Trigger specific notification if needed
  eventEmitter.emitOrderStatusUpdated({
    ...order,
    status: 'pending',
    hospital_id: hospitalId,
  });

  return order;
};

// Create POS (Walk-in) Order
const createPOSOrder = async (pharmacyId, orderData) => {
  // Batch-fetch all inventory items in one query
  const itemIds = (orderData.items || []).map(i => i.inventoryItemId || i.medicineId).filter(Boolean);
  let inventoryMap = {};
  if (itemIds.length > 0) {
    const { data: invItems } = await supabaseAdmin
      .from('pharmacy_inventory')
      .select('id, price, mrp, name, generic_name, requires_prescription, medicine_id, quantity, reserved_quantity, medicine:medicines(name, generic_name, dosage_form, strength, pack_size, manufacturer, image_url, requires_prescription)')
      .eq('pharmacy_id', pharmacyId)
      .in('id', itemIds);

    inventoryMap = (invItems || []).reduce((m, item) => {
      m[item.id] = item;
      return m;
    }, {});
  }

  let totalAmount = 0;
  const enrichedItems = [];
  const itemsToConsume = [];

  for (const item of (orderData.items || [])) {
    const invItem = inventoryMap[item.inventoryItemId];
    if (!invItem) {
      throw new ApiError(400, `Item ${item.inventoryItemId || 'requested'} not found in inventory.`);
    }

    const available = (invItem.quantity || 0) - (invItem.reserved_quantity || 0);
    if (available < (item.quantity || 1)) {
      throw new ApiError(409, `Insufficient stock for ${invItem.name}. Requested: ${item.quantity || 1}, Available: ${available}`);
    }

    const itemPrice = invItem.price || 0;
    totalAmount += itemPrice * (item.quantity || 1);

    enrichedItems.push({
      inventory_id: invItem.id,
      medicine_id: invItem.medicine_id || null,
      quantity: item.quantity || 1,
      price: itemPrice,
      mrp: invItem.mrp || itemPrice,
      name: invItem.name || invItem.generic_name || 'Medicine',
      generic_name: invItem.generic_name || null,
      requires_manual_review: false,
    });

    itemsToConsume.push({ inventory_id: invItem.id, quantity: item.quantity || 1 });
  }

  // Atomically decrement the physical quantity without touching reserved_quantity
  if (itemsToConsume.length > 0) {
    const { error: consumeError } = await supabaseAdmin.rpc('consume_pos_pharmacy_inventory', {
      p_pharmacy_id: pharmacyId,
      order_items: itemsToConsume,
    });

    if (consumeError) {
      console.error('POS Inventory consumption failed:', consumeError);
      throw new ApiError(409, 'Insufficient available stock for one or more medicines.');
    }
  }

  // Create the order as POS, delivered and paid
  const insertPayload = {
    patient_id: null,
    pharmacy_id: pharmacyId,
    clinic_id: null,
    hospital_id: null,
    items: enrichedItems,
    subtotal: totalAmount,
    delivery_fee: 0,
    total_amount: totalAmount,
    delivery_type: 'pickup',
    status: 'delivered',
    payment_status: 'paid',
    payment_method: orderData.paymentMethod || 'cash',
    source: 'pos',
  };

  const { data: order, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .insert(insertPayload)
    .select('*, clinic:clinics(id, name), hospital:hospitals(id, name), patient:patients(id, name, user:users(phone)), pharmacy:pharmacies(id, name, phone, address, latitude, longitude)')
    .single();

  if (error) {
    // Note: In a true microservice architecture, we would have a rollback strategy for inventory if order creation failed here.
    // However, since inventory consume succeeded, we assume order insert mostly succeeds.
    // Future improvement: Wrap both in a single DB transaction RPC.
    throw error;
  }

  return order;
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
      .select('id, price, mrp, name, generic_name, requires_prescription, medicine_id')
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
  const prescriptionRequiredItems = [];
  const allowUnmatchedItems = Boolean(orderData.prescriptionId) || Boolean(orderData.isCatalogOrder);

  // Server-side campaign pricing (single source of truth).
  // computeBestPrices expects MEDICINE ids, but order items may carry inventory
  // ids — resolve through the inventory map so discounts actually apply.
  const orderMedicineIds = [];
  const orderQuantities = {};
  for (const orderItem of orderData.items || []) {
    const invItem = inventoryMap[orderItem.inventoryItemId || orderItem.medicineId];
    const medicineId = orderItem.medicineId || invItem?.medicine_id;
    if (medicineId) {
      orderMedicineIds.push(medicineId);
      orderQuantities[medicineId] = (orderQuantities[medicineId] || 0) + (orderItem.quantity || 1);
    }
  }
  let campaignPriceById = new Map();
  try {
    const bestPrices = await computeBestPrices(orderMedicineIds, {
      pharmacyId: orderData.pharmacyId,
      quantities: orderQuantities,
      userId: patientUserId,
    });
    bestPrices.forEach((p) => campaignPriceById.set(p.medicine_id, p));
  } catch (campaignErr) {
    console.error('Campaign pricing failed (order proceeds without discount):', campaignErr.message);
  }

  for (const item of (orderData.items || [])) {
    const reqItemId = item.inventoryItemId || item.medicineId || item.name || item.genericName;
    const invItem = await resolveInventoryRowForOrderItem(orderData.pharmacyId, item, inventoryMap);
    const catalogMedicine = await resolveCatalogMedicine({
      medicineId: item.medicineId || invItem?.medicine_id,
      name: item.name,
      genericName: item.genericName,
    });

    if (!invItem && !allowUnmatchedItems) {
      throw new ApiError(400, `Item ${reqItemId || 'requested'} not available at this pharmacy`);
    }

    // Legally required: prescription-gated (Rx) medicines cannot be sold
    // without a prescription attached to the order.
    const itemName = invItem?.name || item.name || catalogMedicine?.name || reqItemId;
    const requiresRx = Boolean(
      catalogMedicine?.requires_prescription ??
      invItem?.requires_prescription ??
      item.requiresPrescription ??
      false
    );
    if (requiresRx && !orderData.prescriptionId) {
      prescriptionRequiredItems.push(itemName);
    }

    // Base price: client price for catalog orders, inventory price otherwise
    const basePrice = orderData.isCatalogOrder && item.price !== undefined ? item.price : (invItem?.price || 0);
    // Campaign price lookup by inventory medicine_id (server-side, authoritative)
    const medicineKey = (invItem?.medicine_id || item.medicineId || '');
    const campaignPrice = campaignPriceById.get(medicineKey);

    const itemPrice = campaignPrice ? campaignPrice.final_price : basePrice;
    totalAmount += itemPrice * (item.quantity || 1);

    enrichedItems.push({
      inventory_id: invItem?.id || null,
      medicine_id: invItem?.medicine_id || catalogMedicine?.id || item.medicineId || null,
      quantity: item.quantity || 1,
      price: itemPrice,
      mrp: invItem?.mrp || campaignPrice?.mrp || item.mrp || itemPrice,
      campaign_id: campaignPrice?.campaign?.id || item.campaignId || null,
      campaign_name: campaignPrice?.campaign?.name || item.campaignName || null,
      discount_amount: campaignPrice ? campaignPrice.discount_amount * (item.quantity || 1) : (item.discountAmount || null),
      name: invItem?.name || invItem?.generic_name || item.name || item.genericName || catalogMedicine?.name || 'Medicine',
      generic_name: invItem?.generic_name || item.genericName || catalogMedicine?.generic_name || null,
       requires_manual_review: !invItem,
     });
   }

   // Enforce prescription requirement for Rx medicines (drug-law compliance)
   if (prescriptionRequiredItems.length > 0) {
     throw new ApiError(
       422,
       `The following item(s) require a prescription and cannot be ordered without one: ${prescriptionRequiredItems.join(', ')}. Attach a prescription via "prescriptionId".`
     );
   }

   // Direct MedCoins Redemption (1 MedCoin = ₹1 instant discount)
   const requestedCoins = Number(orderData.medcoinsRedeemed || orderData.redeemMedcoins || 0);
   const medcoinsDiscount = requestedCoins > 0 ? Math.min(totalAmount, requestedCoins) : 0;
   const finalTotalAmount = Math.max(0, totalAmount - medcoinsDiscount);

   const insertPayload = {
    patient_id: patient.id,
    pharmacy_id: orderData.pharmacyId,
    clinic_id: orderData.clinicId || null,
    hospital_id: orderData.hospitalId || null,
    items: enrichedItems,
    subtotal: totalAmount,
    delivery_fee: orderData.deliveryFee || 0,
    total_amount: finalTotalAmount + (orderData.deliveryFee || 0),
    discount_amount: (orderData.discountAmount || 0) + medcoinsDiscount,
    medcoins_redeemed: medcoinsDiscount,
    delivery_address: orderData.patientPhone ? `${orderData.deliveryAddress} | Phone: ${orderData.patientPhone}` : orderData.deliveryAddress,
    delivery_type: orderData.deliveryType || 'pickup',
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

  // Atomically reserve inventory stock
  const itemsToReserve = enrichedItems
    .filter(item => item.inventory_id && item.quantity > 0)
    .map(item => ({ inventory_id: item.inventory_id, quantity: item.quantity }));

  if (itemsToReserve.length > 0) {
    const { error: reserveError } = await supabaseAdmin.rpc('reserve_pharmacy_inventory', {
      p_pharmacy_id: orderData.pharmacyId,
      order_items: itemsToReserve,
    });

    if (reserveError) {
      // Rollback order if reservation fails due to insufficient stock
      await supabaseAdmin.from('pharmacy_orders').delete().eq('id', order.id);
      console.error('Inventory reservation failed:', reserveError);
      throw new ApiError(409, 'Insufficient available stock for one or more medicines.');
    }
  }

  // Record campaign redemptions
  try {
    const campaignIds = [...new Set(enrichedItems.map((i) => i.campaign_id).filter(Boolean))];
    if (campaignIds.length > 0) {
      const discountByCampaign = {};
      enrichedItems.forEach((i) => {
        if (i.campaign_id) {
          discountByCampaign[i.campaign_id] = (discountByCampaign[i.campaign_id] || 0) + (i.discount_amount || 0);
        }
      });
      await recordRedemptions({
        campaignIds,
        pharmacyId: orderData.pharmacyId,
        patientUserId,
        orderId: order.id,
        discountAmountsByCampaign: discountByCampaign,
      });
    }
  } catch (redemptionErr) {
    console.error('Failed to record campaign redemptions:', redemptionErr.message);
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

// Add reel
const addReel = async (userId, reelData) => {
  const pharmacy = await getPharmacyByOwner(userId);
  if (!pharmacy) throw new ApiError(404, 'Pharmacy not found');

  const { data, error } = await supabaseAdmin
    .from('pharmacy_reels')
    .insert([{ ...reelData, pharmacy_id: pharmacy.id }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Delete reel
const deleteReel = async (userId, reelId) => {
  const pharmacy = await getPharmacyByOwner(userId);
  if (!pharmacy) throw new ApiError(404, 'Pharmacy not found');

  const { error } = await supabaseAdmin
    .from('pharmacy_reels')
    .delete()
    .eq('id', reelId)
    .eq('pharmacy_id', pharmacy.id);

  if (error) throw error;
  return { success: true };
};

/**
 * Calculate dynamic profile completion percentage and actionable milestones for a pharmacy.
 * Real DB calculation from pharmacies, pharmacy_inventory, and partnerships/associations.
 */
const getPharmacyProfileCompletion = async (pharmacyId, userId) => {
  // 1. Fetch pharmacy entity
  const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
    .from('pharmacies')
    .select('*')
    .eq('id', pharmacyId)
    .maybeSingle();

  if (pharmacyError || !pharmacy) {
    throw new ApiError(404, 'Pharmacy not found');
  }

  // 2. Fetch inventory counts
  const { count: inventoryCount } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId);

  const { count: inStockCount } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('id', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId)
    .gt('quantity', 0);

  // 3. Fetch partnerships & associations count
  const [{ count: partnershipsCount }, { count: associationsCount }] = await Promise.all([
    supabaseAdmin
      .from('organization_partnerships')
      .select('id', { count: 'exact', head: true })
      .or(`and(initiator_type.eq.pharmacy,initiator_id.eq.${pharmacyId}),and(target_type.eq.pharmacy,target_id.eq.${pharmacyId})`)
      .in('status', ['active', 'pending']),
    supabaseAdmin
      .from('facility_provider_associations')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', pharmacyId)
      .eq('provider_type', 'pharmacy')
  ]);

  // ── Milestone 1: Pharmacy Profile (20%) ──────────────────────────────
  const hasName = Boolean(pharmacy.name && pharmacy.name.trim().length > 0);
  const hasContact = Boolean((pharmacy.phone && pharmacy.phone.trim().length > 0) || (pharmacy.email && pharmacy.email.trim().length > 0));
  const hasAddress = Boolean((pharmacy.address && pharmacy.address.trim().length > 0) && (pharmacy.city && pharmacy.city.trim().length > 0));
  const hasLogo = Boolean(pharmacy.profile_image_url || pharmacy.image_url || (Array.isArray(pharmacy.images) && pharmacy.images.length > 0));

  const profileTasks = [
    { id: 'name', label: 'Pharmacy Name & Details', completed: hasName, route: '/pharmacy/settings?category=profile' },
    { id: 'contact', label: 'Contact Phone & Email', completed: hasContact, route: '/pharmacy/settings?category=profile' },
    { id: 'address', label: 'Address & Location', completed: hasAddress, route: '/pharmacy/settings?category=profile' },
    { id: 'logo', label: 'Storefront Logo or Photo', completed: hasLogo, route: '/pharmacy/settings?category=profile' },
  ];
  const profileCompletedCount = profileTasks.filter(t => t.completed).length;
  const profilePct = (profileCompletedCount / profileTasks.length) * 20;
  const profileSectionComplete = profileCompletedCount === profileTasks.length;

  // ── Milestone 2: License & Compliance (20%) ─────────────────────────
  const hasLicenseNumber = Boolean((pharmacy.license_number && pharmacy.license_number.trim().length > 0) || (pharmacy.drug_license_number && pharmacy.drug_license_number.trim().length > 0));
  const hasGst = Boolean(pharmacy.gst_number && pharmacy.gst_number.trim().length > 0);
  const hasVerification = Boolean(pharmacy.is_approved === true || pharmacy.is_verified === true || pharmacy.approval_status === 'approved');
  const hasLicenseDoc = Boolean(pharmacy.license_document_url && pharmacy.license_document_url.trim().length > 0);

  const complianceTasks = [
    { id: 'drug_license', label: 'Drug / Retail License Number', completed: hasLicenseNumber, route: '/pharmacy/settings?category=compliance' },
    { id: 'gst_number', label: 'GST / Tax Business Registration', completed: hasGst, route: '/pharmacy/settings?category=compliance' },
    { id: 'verification_status', label: 'Pharmacy Verification & Approval', completed: hasVerification, route: '/pharmacy/settings?category=compliance' },
    { id: 'license_document', label: 'License Document Upload', completed: hasLicenseDoc, route: '/pharmacy/settings?category=compliance' },
  ];
  const complianceCompletedCount = complianceTasks.filter(t => t.completed).length;
  const compliancePct = (complianceCompletedCount / complianceTasks.length) * 20;
  const complianceSectionComplete = complianceCompletedCount === complianceTasks.length;

  // ── Milestone 3: Operations & Delivery (20%) ─────────────────────────
  let hasWorkingHours = Boolean(pharmacy.is_24_hours);
  if (!hasWorkingHours && (pharmacy.opening_time || pharmacy.opening_hours)) {
    hasWorkingHours = true;
  }
  const hasDeliveryConfig = Boolean(pharmacy.offers_delivery || pharmacy.delivery_available || (pharmacy.delivery_radius_km && Number(pharmacy.delivery_radius_km) > 0));

  const operationsTasks = [
    { id: 'working_hours', label: 'Operating & Working Hours', completed: hasWorkingHours, route: '/pharmacy/settings?category=operations', description: hasWorkingHours ? 'Operating schedule is active' : 'Set daily store hours or 24/7 availability' },
    { id: 'delivery_fulfillment', label: 'Delivery & Home Fulfillment Setup', completed: hasDeliveryConfig, route: '/pharmacy/settings?category=operations', description: hasDeliveryConfig ? 'Delivery radius and options configured' : 'Configure home delivery radius and minimum order' },
  ];
  const operationsCompletedCount = operationsTasks.filter(t => t.completed).length;
  const operationsPct = (operationsCompletedCount / operationsTasks.length) * 20;
  const operationsSectionComplete = operationsCompletedCount === operationsTasks.length;

  // ── Milestone 4: Inventory & Catalog (20%) ──────────────────────────
  const hasCatalogItems = (inventoryCount || 0) > 0;
  const hasActiveStock = (inStockCount || 0) > 0;

  const inventoryTasks = [
    { id: 'catalog_medicines', label: 'Add Medicines to Inventory Catalog', completed: hasCatalogItems, route: '/pharmacy/inventory', description: hasCatalogItems ? `${inventoryCount} item(s) in catalog` : 'Add at least one medicine or OTC product' },
    { id: 'stock_management', label: 'Active Stock & Reorder Levels', completed: hasActiveStock, route: '/pharmacy/inventory', description: hasActiveStock ? `${inStockCount} active in-stock item(s)` : 'Maintain active stock with reorder levels' },
  ];
  const inventoryCompletedCount = inventoryTasks.filter(t => t.completed).length;
  const inventoryPct = (inventoryCompletedCount / inventoryTasks.length) * 20;
  const inventorySectionComplete = inventoryCompletedCount === inventoryTasks.length;

  // ── Milestone 5: Network & Services (20%) ───────────────────────────
  const hasServices = Boolean(
    (Array.isArray(pharmacy.facilities) && pharmacy.facilities.length > 0) ||
    (Array.isArray(pharmacy.accreditations) && pharmacy.accreditations.length > 0) ||
    (pharmacy.description && pharmacy.description.trim().length > 0)
  );
  const totalNetworkCount = (partnershipsCount || 0) + (associationsCount || 0);
  const hasNetwork = totalNetworkCount > 0;

  const networkTasks = [
    { id: 'store_services', label: 'Pharmacy Services & Facilities', completed: hasServices, route: '/pharmacy/settings?category=profile', description: 'Configure specialized pharmacy services and counseling' },
    { id: 'care_network', label: 'Care Network & Hospital/Clinic Partners', completed: hasNetwork, route: '/pharmacy/network', description: hasNetwork ? `${totalNetworkCount} connected partner(s)` : 'Connect with hospitals, clinics and diagnostic labs' },
  ];
  const networkCompletedCount = networkTasks.filter(t => t.completed).length;
  const networkPct = (networkCompletedCount / networkTasks.length) * 20;
  const networkSectionComplete = networkCompletedCount === networkTasks.length;

  // ── Grand Totals ────────────────────────────────────────────────────
  const totalPercentage = Math.min(100, Math.round(profilePct + compliancePct + operationsPct + inventoryPct + networkPct));
  const sections = [
    {
      id: 'pharmacy_profile',
      title: 'Pharmacy Information',
      description: 'Storefront identity, contact numbers and location',
      weight: 20,
      percentage: Math.round((profilePct / 20) * 100),
      completed: profileSectionComplete,
      tasks: profileTasks,
    },
    {
      id: 'license_compliance',
      title: 'License & Compliance',
      description: 'Drug license, GST registration and official verification',
      weight: 20,
      percentage: Math.round((compliancePct / 20) * 100),
      completed: complianceSectionComplete,
      tasks: complianceTasks,
    },
    {
      id: 'operations_fulfillment',
      title: 'Operating Hours & Delivery',
      description: 'Daily opening/closing schedule and delivery radius',
      weight: 20,
      percentage: Math.round((operationsPct / 20) * 100),
      completed: operationsSectionComplete,
      tasks: operationsTasks,
    },
    {
      id: 'inventory_catalog',
      title: 'Inventory & Catalog',
      description: 'Medicine catalog, batch stock and reorder thresholds',
      weight: 20,
      percentage: Math.round((inventoryPct / 20) * 100),
      completed: inventorySectionComplete,
      tasks: inventoryTasks,
    },
    {
      id: 'network_services',
      title: 'Services & Care Network',
      description: 'Pharmacy services and healthcare provider partnerships',
      weight: 20,
      percentage: Math.round((networkPct / 20) * 100),
      completed: networkSectionComplete,
      tasks: networkTasks,
    },
  ];

  const allTasks = [...profileTasks, ...complianceTasks, ...operationsTasks, ...inventoryTasks, ...networkTasks];
  const completedTasksCount = allTasks.filter(t => t.completed).length;
  const totalTasksCount = allTasks.length;
  const completedSectionsCount = sections.filter(s => s.completed).length;
  const totalSectionsCount = sections.length;

  // Determine next actionable step
  let nextStep = null;
  if (totalPercentage < 100) {
    if (!profileSectionComplete) {
      const firstMissing = profileTasks.find(t => !t.completed);
      nextStep = {
        id: firstMissing.id,
        label: `Complete ${firstMissing.label}`,
        description: 'Update your pharmacy profile details to help customers find you.',
        route: firstMissing.route,
        sectionId: 'pharmacy_profile',
      };
    } else if (!complianceSectionComplete) {
      const firstMissing = complianceTasks.find(t => !t.completed);
      nextStep = {
        id: firstMissing.id,
        label: `Add ${firstMissing.label}`,
        description: 'Provide licensing details and tax registration for regulatory compliance.',
        route: firstMissing.route,
        sectionId: 'license_compliance',
      };
    } else if (!operationsSectionComplete) {
      const firstMissing = operationsTasks.find(t => !t.completed);
      nextStep = {
        id: firstMissing.id,
        label: `Configure ${firstMissing.label}`,
        description: 'Set operating schedule and delivery boundaries to process orders smoothly.',
        route: firstMissing.route,
        sectionId: 'operations_fulfillment',
      };
    } else if (!inventorySectionComplete) {
      const firstMissing = inventoryTasks.find(t => !t.completed);
      nextStep = {
        id: firstMissing.id,
        label: `Add ${firstMissing.label}`,
        description: 'Stock your inventory catalog with medicines and wellness items.',
        route: firstMissing.route,
        sectionId: 'inventory_catalog',
      };
    } else if (!networkSectionComplete) {
      const firstMissing = networkTasks.find(t => !t.completed);
      nextStep = {
        id: firstMissing.id,
        label: `Connect ${firstMissing.label}`,
        description: 'Connect with local clinics and hospital networks for prescription referrals.',
        route: firstMissing.route,
        sectionId: 'network_services',
      };
    }
  }

  return {
    percentage: totalPercentage,
    completedSectionsCount,
    totalSectionsCount,
    completedTasksCount,
    totalTasksCount,
    isComplete: totalPercentage === 100,
    status: totalPercentage === 100 ? 'completed' : (totalPercentage > 0 ? 'in_progress' : 'not_started'),
    nextStep,
    sections,
    summary: `${completedSectionsCount} of ${totalSectionsCount} setup milestones completed`,
  };
};

/**
 * Get dashboard visibility and preferences for pharmacy owner.
 */
const DEFAULT_QUICK_OPERATIONS = [
  { key: 'orders', enabled: true, order: 1 },
  { key: 'inventory', enabled: true, order: 2 },
  { key: 'requests', enabled: true, order: 3 },
  { key: 'referrals', enabled: true, order: 4 },
];

const getPharmacyPreferences = async (pharmacyId, userId) => {
  const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(userId);
  const metadata = userRecord?.user?.user_metadata || {};
  const pharmacyPrefs = metadata.pharmacy_dashboard_preferences || {};

  return {
    show_profile_completion: pharmacyPrefs.show_profile_completion !== false,
    onboarding_completed: pharmacyPrefs.onboarding_completed === true,
    quick_operations: Array.isArray(pharmacyPrefs.quick_operations) && pharmacyPrefs.quick_operations.length > 0
      ? pharmacyPrefs.quick_operations
      : DEFAULT_QUICK_OPERATIONS,
  };
};

/**
 * Update dashboard visibility and preferences for pharmacy owner.
 */
const updatePharmacyPreferences = async (pharmacyId, userId, preferences = {}) => {
  const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(userId);
  const currentMetadata = userRecord?.user?.user_metadata || {};
  const currentPharmacyPrefs = currentMetadata.pharmacy_dashboard_preferences || {};

  const updatedPrefs = {
    ...currentPharmacyPrefs,
    ...(preferences.show_profile_completion !== undefined ? { show_profile_completion: preferences.show_profile_completion } : {}),
    ...(preferences.onboarding_completed !== undefined ? { onboarding_completed: preferences.onboarding_completed } : {}),
    ...(preferences.quick_operations !== undefined ? { quick_operations: preferences.quick_operations } : {}),
  };

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      pharmacy_dashboard_preferences: updatedPrefs,
    },
  });

  return {
    show_profile_completion: updatedPrefs.show_profile_completion !== false,
    onboarding_completed: updatedPrefs.onboarding_completed === true,
    quick_operations: updatedPrefs.quick_operations || DEFAULT_QUICK_OPERATIONS,
  };
};

module.exports = {
  addReel,
  deleteReel,
  searchPharmacies,
  findNearbyWithMedicine,
  findNearbyGeneral,
  getPharmacyById,
  registerPharmacy,
  getPharmacyByOwner,
  getPharmacyByUser,
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
  createPOSOrder,
  createClinicPharmacyOrder,
  createHospitalPharmacyOrder,
  getPharmacyMembers,
  invitePharmacyMember,
  updatePharmacyMemberRole,
  removePharmacyMember,
  getPharmacyProfileCompletion,
  getPharmacyPreferences,
  updatePharmacyPreferences,
};

