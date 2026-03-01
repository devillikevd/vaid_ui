/**
 * Pharmacy Service
 * Inventory, orders, analytics for pharmacy owners
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const eventEmitter = require('./eventEmitter');
const { calculateDistance, getBoundingBox, formatDistance } = require('../utils/geo');
const { sanitizeSearch } = require('../utils/sanitize');

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
  let nearby = pharmacies
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
      .gt('stock', 0);

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

  return data;
};

// Update pharmacy
const updatePharmacy = async (pharmacyId, userId, updates) => {
  // Whitelist allowed update fields to prevent mass-assignment
  const allowedFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
    'latitude', 'longitude', 'is_24_hours', 'delivery_available', 'description',
    'opening_hours', 'profile_image_url'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .update(safeUpdates)
    .eq('id', pharmacyId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Get inventory
const getInventory = async (pharmacyId, filters = {}, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('pharmacy_inventory')
    .select('*', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId);

  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,medicine_name.ilike.%${s}%`);
  }
  // Low-stock: PostgREST can't compare two columns, so we post-filter using min_quantity
  const applyLowStockFilter = !!filters.lowStock;
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  // When filtering low-stock, fetch all items (no pagination) to post-filter properly
  let data, error, count;
  if (applyLowStockFilter) {
    const result = await query.order('name');
    error = result.error;
    if (!error) {
      // Post-filter: quantity below each item's own min_quantity (default 10)
      const filtered = (result.data || []).filter(i => i.quantity < (i.min_quantity || 10));
      count = filtered.length;
      data = filtered.slice(offset, offset + limit);
    }
  } else {
    const result = await query
      .order('name')
      .range(offset, offset + limit - 1);
    data = result.data;
    error = result.error;
    count = result.count;
  }

  if (error) throw error;

  return {
    data: data || [],
    items: data || [], // Alias for route compatibility
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Add inventory item
const addInventoryItem = async (pharmacyId, userId, itemData) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory')
    .insert({
      pharmacy_id: pharmacyId,
      name: itemData.name || itemData.medicine_name,
      medicine_name: itemData.medicine_name || itemData.name,
      category: itemData.category,
      quantity: itemData.quantity || 0,
      price: itemData.price,
      mrp: itemData.mrp || itemData.price,
      batch_number: itemData.batchNumber || itemData.batch_number,
      expiry_date: itemData.expiryDate || itemData.expiry_date,
      manufacturer: itemData.manufacturer,
      requires_prescription: itemData.requiresPrescription || false,
      min_quantity: itemData.minQuantity || itemData.reorder_level || 10,
      unit: itemData.unit || 'units',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Update inventory item
const updateInventoryItem = async (itemId, pharmacyId, userId, updates) => {
  // Whitelist allowed fields
  const allowedFields = ['name', 'medicine_name', 'category', 'quantity', 'price', 'mrp',
    'batch_number', 'expiry_date', 'manufacturer', 'requires_prescription',
    'min_quantity', 'unit', 'description'];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
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
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('pharmacy_orders')
    .select('*, patient:patients(id, name, phone)', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId);

  if (filters.status) query = query.eq('status', filters.status);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    orders: data || [], // Alias
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Update order status
const updateOrderStatus = async (orderId, pharmacyId, userId, status, notes) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .update({
      status,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('pharmacy_id', pharmacyId)
    .select('*')
    .single();

  if (error) throw error;

  // Notify patient
  if (data?.patient_id) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('user_id')
      .eq('id', data.patient_id)
      .single();

    if (patient) {
      eventEmitter.emitOrderStatusUpdated({
        ...data,
        patient_id: patient.user_id,
        pharmacy_owner_id: userId,
      });
    }
  }

  return data;
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
    supabaseAdmin.from('pharmacy_inventory').select('quantity, price, min_quantity').eq('pharmacy_id', pharmacyId),
  ]);

  const totalInventoryValue = (inventory || []).reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
  const lowStockCount = (inventory || []).filter(i => i.quantity < (i.min_quantity || 10)).length;

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

  // Batch-fetch all inventory items in one query instead of N+1
  const itemIds = (orderData.items || []).map(i => i.inventoryItemId || i.medicineId).filter(Boolean);
  let inventoryMap = {};
  if (itemIds.length > 0) {
    const { data: invItems } = await supabaseAdmin
      .from('pharmacy_inventory')
      .select('id, price, name, medicine_name')
      .eq('pharmacy_id', orderData.pharmacyId)
      .in('id', itemIds);
    inventoryMap = (invItems || []).reduce((m, item) => { m[item.id] = item; return m; }, {});
  }

  let totalAmount = 0;
  const enrichedItems = [];
  for (const item of (orderData.items || [])) {
    const invItem = inventoryMap[item.inventoryItemId || item.medicineId];

    const price = invItem?.price || item.price || 0;
    const quantity = item.quantity || 1;
    totalAmount += price * quantity;
    enrichedItems.push({
      medicineId: item.medicineId,
      inventoryItemId: item.inventoryItemId,
      name: item.name || invItem?.name || invItem?.medicine_name || 'Medicine',
      quantity,
      price,
      subtotal: price * quantity,
    });
  }

  const insertPayload = {
    patient_id: patient.id,
    pharmacy_id: orderData.pharmacyId,
    items: enrichedItems,
    total_amount: totalAmount,
    delivery_address: orderData.deliveryAddress,
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

  // Notify pharmacy owner of new order
  const { data: pharmacy } = await supabaseAdmin
    .from('pharmacies')
    .select('owner_id, name')
    .eq('id', orderData.pharmacyId)
    .single();

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
  findNearbyWithMedicine,
  registerPharmacy,
  getPharmacyByOwner,
  updatePharmacy,
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getOrders,
  updateOrderStatus,
  getAnalytics,
  createOrder,
};
