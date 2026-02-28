/**
 * Enhanced Admin Service
 * Complete admin management with approval workflows for all provider types
 */
const { supabaseAdmin } = require('../config/supabase');
const { sanitizeSearch } = require('../utils/sanitize');
const { cacheGet, cacheSet } = require('../config/redis');
const { logAudit } = require('../utils/auditLogger');

// Provider type → Supabase table mapping
const PROVIDER_TABLES = {
  doctor: 'doctors',
  hospital: 'hospitals',
  pharmacy: 'pharmacies',
  clinic: 'clinics',
  diagnostic_center: 'diagnostic_centers',
  ambulance: 'ambulance_operators',
};

// Dashboard
const getDashboard = async () => {
  const [
    { count: totalUsers },
    { count: totalDoctors },
    { count: totalPatients },
    { count: totalHospitals },
    { count: totalPharmacies },
    { count: totalClinics },
    { count: totalDiagnosticCenters },
    { count: totalAmbulances },
    { count: totalAppointments },
    { count: pendingDoctors },
    { count: pendingHospitals },
    { count: pendingPharmacies },
    { count: pendingClinics },
    { count: pendingDiagnosticCenters },
    { count: pendingAmbulances },
    { count: activeEmergencies },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('patients').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('hospitals').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('pharmacies').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('clinics').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('diagnostic_centers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('ambulance_operators').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabaseAdmin.from('hospitals').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabaseAdmin.from('pharmacies').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabaseAdmin.from('clinics').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabaseAdmin.from('diagnostic_centers').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabaseAdmin.from('ambulance_operators').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ['pending', 'assigned', 'dispatched', 'en_route_pickup']),
  ]);

  const pendingTotal = (pendingDoctors || 0) + (pendingHospitals || 0) + (pendingPharmacies || 0)
    + (pendingClinics || 0) + (pendingDiagnosticCenters || 0) + (pendingAmbulances || 0);

  return {
    // Flat stats for backward-compat
    totalUsers: totalUsers || 0,
    totalDoctors: totalDoctors || 0,
    totalPatients: totalPatients || 0,
    totalHospitals: totalHospitals || 0,
    totalPharmacies: totalPharmacies || 0,
    totalClinics: totalClinics || 0,
    totalDiagnosticCenters: totalDiagnosticCenters || 0,
    totalAmbulances: totalAmbulances || 0,
    totalAppointments: totalAppointments || 0,
    activeEmergencies: activeEmergencies || 0,
    // Web dashboard reads these
    stats: {
      totalUsers: totalUsers || 0,
      totalProviders: (totalDoctors || 0) + (totalHospitals || 0) + (totalPharmacies || 0)
        + (totalClinics || 0) + (totalDiagnosticCenters || 0) + (totalAmbulances || 0),
      totalPatients: totalPatients || 0,
      activeToday: 0,
      pendingApprovals: pendingTotal,
      todaysAppointments: 0,
      activeEmergencies: activeEmergencies || 0,
    },
    providerCounts: {
      doctors:    { total: totalDoctors || 0,    pending: pendingDoctors || 0 },
      hospitals:  { total: totalHospitals || 0,  pending: pendingHospitals || 0 },
      clinics:    { total: totalClinics || 0,    pending: pendingClinics || 0 },
      pharmacies: { total: totalPharmacies || 0, pending: pendingPharmacies || 0 },
      diagnosticCenters: { total: totalDiagnosticCenters || 0, pending: pendingDiagnosticCenters || 0 },
      ambulances: { total: totalAmbulances || 0, pending: pendingAmbulances || 0 },
    },
    providerCategories: [
      { name: 'Doctors',    type: 'doctors',    pending: pendingDoctors || 0,    approved: (totalDoctors || 0) - (pendingDoctors || 0) },
      { name: 'Hospitals',  type: 'hospitals',  pending: pendingHospitals || 0,  approved: (totalHospitals || 0) - (pendingHospitals || 0) },
      { name: 'Clinics',    type: 'clinics',    pending: pendingClinics || 0,    approved: (totalClinics || 0) - (pendingClinics || 0) },
      { name: 'Pharmacies', type: 'pharmacies', pending: pendingPharmacies || 0, approved: (totalPharmacies || 0) - (pendingPharmacies || 0) },
      { name: 'Diagnostic Centers', type: 'diagnostic_centers', pending: pendingDiagnosticCenters || 0, approved: (totalDiagnosticCenters || 0) - (pendingDiagnosticCenters || 0) },
      { name: 'Ambulances', type: 'ambulances', pending: pendingAmbulances || 0, approved: (totalAmbulances || 0) - (pendingAmbulances || 0) },
    ],
    pendingApprovals: {
      doctors: pendingDoctors || 0,
      hospitals: pendingHospitals || 0,
      pharmacies: pendingPharmacies || 0,
      clinics: pendingClinics || 0,
      diagnosticCenters: pendingDiagnosticCenters || 0,
      ambulances: pendingAmbulances || 0,
    },
  };
};

// Get pending approvals
const getPendingApprovals = async (type = 'all', page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const results = {};

  // Use approval_status = 'pending' as the canonical field across all provider tables
  const fetchPending = async (table) => {
    const { data, count } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact' })
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data || [], total: count || 0 };
  };

  if (type === 'all' || type === 'doctor') {
    results.doctors = await fetchPending('doctors');
  }
  if (type === 'all' || type === 'hospital') {
    results.hospitals = await fetchPending('hospitals');
  }
  if (type === 'all' || type === 'pharmacy') {
    results.pharmacies = await fetchPending('pharmacies');
  }
  if (type === 'all' || type === 'clinic') {
    results.clinics = await fetchPending('clinics');
  }
  if (type === 'all' || type === 'diagnostic_center') {
    results.diagnosticCenters = await fetchPending('diagnostic_centers');
  }
  if (type === 'all' || type === 'ambulance') {
    results.ambulances = await fetchPending('ambulance_operators');
  }

  return { data: results, pagination: { page, limit } };
};

// Get provider details
const getProviderDetails = async (type, id) => {
  const table = PROVIDER_TABLES[type];
  if (!table) {
    const err = new Error('Invalid provider type');
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    throw err;
  }

  return data;
};

// Approve provider
const approveProvider = async (type, id, adminId, notes) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw Object.assign(new Error('Invalid provider type'), { statusCode: 400 });

  // Build update payload — only use columns that exist in the DB schema
  // All tables have: is_approved, approval_status, approval_notes, approved_by, approved_at
  // hospitals/pharmacies/clinics/ambulance_operators have is_active; doctors do NOT
  const updatePayload = {
    is_approved: true,
    approval_status: 'approved',
    approval_notes: notes,
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  };

  // Set is_active for tables that have this column (all except doctors)
  if (type !== 'doctor') {
    updatePayload.is_active = true;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  // Update user verification if applicable
  if (data?.user_id || data?.owner_id) {
    const userId = data.user_id || data.owner_id;
    await supabaseAdmin.from('users').update({ is_verified: true }).eq('id', userId);
  }

  // Notify the facility owner about approval
  const ownerId = data.user_id || data.owner_id;
  if (ownerId) {
    try {
      const eventEmitter = require('./eventEmitter');
      eventEmitter.emit('notification:send', {
        userId: ownerId,
        title: 'Registration Approved! 🎉',
        message: `Your ${type} registration for "${data.name || type}" has been approved. You can now start managing your facility.`,
        type: 'system',
        data: { providerId: id, providerType: type, action: 'approved' },
      });
    } catch (_) { /* notification is non-critical */ }
  }

  return { data, message: `${type} approved successfully` };
};

// Reject provider
const rejectProvider = async (type, id, adminId, reason) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw Object.assign(new Error('Invalid provider type'), { statusCode: 400 });

  // Only use columns that exist in the actual DB schema
  const updatePayload = {
    is_approved: false,
    approval_status: 'rejected',
    approval_notes: reason,
  };

  // Set is_active for tables that have it (all except doctors)
  if (type !== 'doctor') {
    updatePayload.is_active = false;
  }

  // Doctor-specific: rejection_reason column exists only on doctors table
  if (type === 'doctor') {
    updatePayload.rejection_reason = reason;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  // Notify the facility owner about rejection
  const ownerId = data.user_id || data.owner_id;
  if (ownerId) {
    try {
      const eventEmitter = require('./eventEmitter');
      eventEmitter.emit('notification:send', {
        userId: ownerId,
        title: 'Registration Update',
        message: `Your ${type} registration was not approved.${reason ? ` Reason: ${reason}` : ''} Please review and resubmit.`,
        type: 'system',
        data: { providerId: id, providerType: type, action: 'rejected' },
      });
    } catch (_) { /* notification is non-critical */ }
  }

  return { data, message: `${type} rejected` };
};

// Suspend provider
const suspendProvider = async (type, id, adminId, reason) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw Object.assign(new Error('Invalid provider type'), { statusCode: 400 });

  // Only use columns that exist in the actual DB schema
  const updatePayload = {
    is_approved: false,
    approval_status: 'suspended',
    approval_notes: `Suspended: ${reason}`,
  };

  // Set is_active for tables that have it (all except doctors)
  if (type !== 'doctor') {
    updatePayload.is_active = false;
  }

  // Doctor-specific: suspension_reason + suspended_at exist only on doctors table
  if (type === 'doctor') {
    updatePayload.suspension_reason = reason;
    updatePayload.suspended_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return { data, message: `${type} suspended` };
};

// Reactivate provider
const reactivateProvider = async (type, id, adminId, notes) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw Object.assign(new Error('Invalid provider type'), { statusCode: 400 });

  // Only use columns that exist in the actual DB schema
  const updatePayload = {
    is_approved: true,
    approval_status: 'approved',
    approval_notes: notes || 'Reactivated',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  };

  // Set is_active for tables that have it (all except doctors)
  if (type !== 'doctor') {
    updatePayload.is_active = true;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return { data, message: `${type} reactivated` };
};

// Add admin note
const addAdminNote = async (type, id, adminId, note, isInternal = true) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw Object.assign(new Error('Invalid provider type'), { statusCode: 400 });

  // Append to existing notes
  const { data: existing } = await supabaseAdmin
    .from(table)
    .select('approval_notes')
    .eq('id', id)
    .single();

  const timestamp = new Date().toISOString();
  const newNote = `[${timestamp}] ${note}`;
  const existingNotes = existing?.approval_notes || '';
  const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ approval_notes: updatedNotes })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return { note: newNote, provider: data };
};

// Get users
const getUsers = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin.from('users').select('id, name, email, phone, role, is_active, is_verified, created_at, last_login, profile_image_url', { count: 'exact' });

  if (filters.role) query = query.eq('role', filters.role);
  if (filters.isVerified !== undefined) query = query.eq('is_verified', filters.isVerified);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
};

// Update user status
const updateUserStatus = async (adminUserId, userId, isActive, reason) => {
  // Prevent admin from deactivating themselves
  if (adminUserId === userId && !isActive) {
    const err = new Error('You cannot deactivate your own account');
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select('id, name, email, is_active')
    .single();

  if (error) throw error;

  // If deactivating, invalidate their auth cache
  if (!isActive) {
    const { cacheDel } = require('../config/redis');
    await cacheDel(`auth_user:${userId}`);
  }

  logAudit({
    userId: adminUserId,
    userRole: 'admin',
    action: isActive ? 'user.activate' : 'user.deactivate',
    entityType: 'user',
    entityId: userId,
    details: { reason },
  });

  return { data, message: `User ${isActive ? 'activated' : 'deactivated'}` };
};

// Get active emergencies
const getActiveEmergencies = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const { data, error, count } = await supabaseAdmin
    .from('emergency_requests')
    .select('*, patient:patients(id, name, phone)', { count: 'exact' })
    .in('status', ['pending', 'assigned', 'dispatched', 'en_route_pickup'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
};

// Reassign emergency
const reassignEmergency = async (emergencyId, operatorId, adminId, reason) => {
  // Update operator assignment and record reassignment in status_history
  const { data, error } = await supabaseAdmin
    .from('emergency_requests')
    .update({
      operator_id: operatorId,
      admin_notes: `Reassigned by admin: ${reason || 'No reason provided'}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', emergencyId)
    .select('*')
    .single();

  if (error) throw error;
  return { data, message: 'Emergency reassigned' };
};

// Get expiring documents (check ambulance operator licenses)
const getExpiringDocuments = async (days = 30) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data: operators } = await supabaseAdmin
    .from('ambulance_operators')
    .select('id, name, license_expiry, user_id')
    .lte('license_expiry', futureDate.toISOString())
    .gte('license_expiry', new Date().toISOString());

  return { operators: operators || [] };
};

// Analytics
const getAnalytics = async (period = '30d') => {
  const days = parseInt(period) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [
    { count: newUsers },
    { count: newAppointments },
    { count: completedConsultations },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sinceStr),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', sinceStr),
    supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', sinceStr),
  ]);

  return {
    period,
    newUsers: newUsers || 0,
    newAppointments: newAppointments || 0,
    completedConsultations: completedConsultations || 0,
  };
};

// Audit logs (from MongoDB if available, else return empty)
const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  try {
    const { AuditLog } = require('../database/models');
    const mongoFilters = {};
    if (filters.userId) mongoFilters.userId = filters.userId;
    if (filters.action) mongoFilters.action = filters.action;
    if (filters.resourceType) mongoFilters.resourceType = filters.resourceType;
    if (filters.fromDate || filters.toDate) {
      mongoFilters.createdAt = {};
      if (filters.fromDate) mongoFilters.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) mongoFilters.createdAt.$lte = new Date(filters.toDate);
    }

    const total = await AuditLog.countDocuments(mongoFilters);
    const data = await AuditLog.find(mongoFilters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  } catch (err) {
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
};

// System health
const getSystemHealth = async () => {
  const checks = {};

  try {
    await supabaseAdmin.from('users').select('id').limit(1);
    checks.supabase = { status: 'healthy' };
  } catch (e) {
    checks.supabase = { status: 'unhealthy', error: e.message };
  }

  try {
    const { getMongoConnection } = require('../config/mongodb');
    const conn = getMongoConnection();
    checks.mongodb = { status: conn ? 'healthy' : 'unavailable' };
  } catch (e) {
    checks.mongodb = { status: 'unavailable' };
  }

  return {
    status: checks.supabase.status === 'healthy' ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    checks,
  };
};

module.exports = {
  getDashboard,
  getPendingApprovals,
  getProviderDetails,
  approveProvider,
  rejectProvider,
  suspendProvider,
  reactivateProvider,
  addAdminNote,
  getUsers,
  updateUserStatus,
  getActiveEmergencies,
  reassignEmergency,
  getExpiringDocuments,
  getAnalytics,
  getAuditLogs,
  getSystemHealth,
};
