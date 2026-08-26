/**
 * Hospital Pharmacy Service
 * In-House Hospital Dispensary, Medicine Stock & Auto-Charge Aggregation
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Get in-house inventory
 */
const getInventory = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('hospital_inhouse_inventory')
    .select('*', { count: 'exact' })
    .eq('hospital_id', hospitalId)
    .eq('is_active', true);

  if (filters.search) {
    query = query.or(`medicine_name.ilike.%${filters.search}%,generic_name.ilike.%${filters.search}%,batch_number.ilike.%${filters.search}%`);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.lowStock === 'true' || filters.lowStock === true) {
    query = query.filter('stock_quantity', 'lte', 'min_alert_quantity');
  }

  const { data, count, error } = await query
    .order('medicine_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    inventory: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Add or update inventory item
 */
const addOrUpdateInventory = async (hospitalId, itemData) => {
  const { id, medicineName, genericName, category, batchNumber, expiryDate, mrp, costPrice, sellingPrice, stockQuantity, minAlertQuantity, unit, rackLocation } = itemData;

  const payload = {
    hospital_id: hospitalId,
    medicine_name: medicineName?.trim(),
    generic_name: genericName?.trim() || null,
    category: category || 'Tablet',
    batch_number: batchNumber?.trim() || null,
    expiry_date: expiryDate || null,
    mrp: parseFloat(mrp) || 0,
    cost_price: parseFloat(costPrice) || 0,
    selling_price: parseFloat(sellingPrice || mrp) || 0,
    stock_quantity: parseInt(stockQuantity, 10) || 0,
    min_alert_quantity: parseInt(minAlertQuantity, 10) || 10,
    unit: unit || 'strips',
    rack_location: rackLocation?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('hospital_inhouse_inventory')
      .update(payload)
      .eq('id', id)
      .eq('hospital_id', hospitalId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('hospital_inhouse_inventory')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Get pending prescriptions for in-house dispensing
 */
const getPendingPrescriptions = async (hospitalId) => {
  // Get active encounters or admissions in this hospital with prescriptions
  const { data: encounters, error } = await supabaseAdmin
    .from('patient_encounters')
    .select(`
      id,
      patient_id,
      doctor_id,
      encounter_type,
      chief_complaint,
      created_at,
      patient:patients(id, name, age, gender, phone),
      doctor:doctors(id, name, specialization)
    `)
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  // Also get recent active admissions
  const { data: admissions, error: admError } = await supabaseAdmin
    .from('patient_admissions')
    .select(`
      id,
      admission_number,
      patient_id,
      attending_doctor_id,
      status,
      provisional_diagnosis,
      admitted_at,
      patient:patients(id, name, age, gender, phone),
      ward:hospital_wards(name),
      bed:hospital_beds(bed_number)
    `)
    .eq('hospital_id', hospitalId)
    .eq('status', 'admitted')
    .order('admitted_at', { ascending: false })
    .limit(30);

  if (admError) throw admError;

  return {
    recentEncounters: encounters || [],
    admissions: admissions || [],
  };
};

/**
 * Dispense medicines to patient & auto-add to encounter charges
 */
const dispenseMedicines = async (hospitalId, userId, dispensationData) => {
  const { patientId, encounterId, admissionId, prescriptionId, dispenseType, items, notes } = dispensationData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Items array is required for dispensing');
  }

  // Calculate total amount
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = parseInt(item.quantity, 10) || 1;
    const rate = parseFloat(item.unitPrice) || 0;
    const itemTotal = qty * rate;
    totalAmount += itemTotal;

    processedItems.push({
      inventory_id: item.inventoryId || null,
      medicine_name: item.medicineName,
      batch_number: item.batchNumber || null,
      quantity: qty,
      unit_price: rate,
      total_amount: itemTotal,
      instructions: item.instructions || '',
    });

    // Auto-deduct stock if inventory_id is present
    if (item.inventoryId) {
      const { data: currentInv } = await supabaseAdmin
        .from('hospital_inhouse_inventory')
        .select('stock_quantity')
        .eq('id', item.inventoryId)
        .single();

      if (currentInv) {
        const newStock = Math.max(0, currentInv.stock_quantity - qty);
        await supabaseAdmin
          .from('hospital_inhouse_inventory')
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.inventoryId);
      }
    }
  }

  // Generate sequence dispensation number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const dispNumber = `DISP-${dateStr}-${randNum}`;

  // Insert dispensation record
  const { data: dispensation, error: dispError } = await supabaseAdmin
    .from('hospital_pharmacy_dispensations')
    .insert({
      hospital_id: hospitalId,
      patient_id: patientId,
      encounter_id: encounterId || null,
      admission_id: admissionId || null,
      prescription_id: prescriptionId || null,
      dispensation_number: dispNumber,
      dispense_type: dispenseType || 'opd_prescription',
      dispensed_by: userId,
      status: 'dispensed',
      items: processedItems,
      total_amount: totalAmount,
      notes: notes || null,
    })
    .select('*')
    .single();

  if (dispError) throw dispError;

  // Auto-add to encounter_charges for billing aggregation
  try {
    for (const item of processedItems) {
      await supabaseAdmin
        .from('encounter_charges')
        .insert({
          hospital_id: hospitalId,
          encounter_id: encounterId || null,
          admission_id: admissionId || null,
          patient_id: patientId,
          service_name: `Pharmacy: ${item.medicine_name} (x${item.quantity})`,
          category: 'pharmacy',
          quantity: item.quantity,
          unit_rate: item.unit_price,
          discount_amount: 0,
          gst_percent: 0,
          gst_amount: 0,
          net_amount: item.total_amount,
          source_type: 'pharmacy',
          source_id: dispensation.id,
          billed_status: 'unbilled',
        });
    }
  } catch (chargeErr) {
    console.error('Failed to auto-add pharmacy encounter charge:', chargeErr);
  }

  return dispensation;
};

/**
 * Get dispensation history
 */
const getDispensations = async (hospitalId, filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('hospital_pharmacy_dispensations')
    .select(`
      *,
      patient:patients(id, name, phone),
      dispenser:users(id, name)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }
  if (filters.admissionId) {
    query = query.eq('admission_id', filters.admissionId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    dispensations: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

module.exports = {
  getInventory,
  addOrUpdateInventory,
  getPendingPrescriptions,
  dispenseMedicines,
  getDispensations,
};
