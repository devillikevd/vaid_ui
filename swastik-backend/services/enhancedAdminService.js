/**
 * Enhanced Admin Service
 * Complete admin management with approval workflows for all provider types
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { sanitizeSearch } = require('../utils/sanitize');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { logAudit } = require('../utils/auditLogger');
const { geocodeProvider } = require('../utils/geocoding');
const notificationService = require('./notificationService');
const { sendApprovalEmail } = require('./emailService');
const eventEmitter = require('./eventEmitter');

// Provider type → Supabase table mapping
const PROVIDER_TABLES = {
  doctor: 'doctors',
  hospital: 'hospitals',
  pharmacy: 'pharmacies',
  clinic: 'clinics',
  diagnostic_center: 'diagnostic_centers',
  ambulance: 'ambulance_operators',
};

const PROVIDER_USER_FIELDS = {
  doctor: 'user_id',
  hospital: 'owner_id',
  pharmacy: 'owner_id',
  clinic: 'owner_id',
  diagnostic_center: 'owner_id',
  ambulance: 'user_id',
};

const getProviderUserId = (provider) => provider?.user_id || provider?.owner_id || null;
const LOCATION_PROVIDER_TYPES = new Set(['hospital', 'pharmacy', 'clinic', 'diagnostic_center']);

const getProviderSnapshot = async (type, id) => {
  const table = PROVIDER_TABLES[type];
  const userField = PROVIDER_USER_FIELDS[type];
  const selectFields = [
    'id',
    'name',
    userField,
    'is_approved',
    'approval_status',
    'approval_notes',
    'approved_by',
    'approved_at',
    ...(type === 'doctor' ? [] : ['is_active']),
  ].join(', ');

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(selectFields)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const invalidateApprovalCaches = async (provider) => {
  const userId = getProviderUserId(provider);
  const keys = ['admin:dashboard'];
  if (userId) keys.push(`auth_user:${userId}`);
  await Promise.allSettled(keys.map((key) => cacheDel(key)));
};

const notifyProviderStatusChange = async ({ provider, type, status, notes = '' }) => {
  const userId = getProviderUserId(provider);
  if (!userId) return;

  const statusConfig = {
    approved: {
      title: 'Registration Approved! 🎉',
      message: `Your ${type} registration for "${provider.name || type}" has been approved. You can now start managing your facility.`,
      emailStatus: 'approved',
    },
    rejected: {
      title: 'Registration Update',
      message: `Your ${type} registration was not approved.${notes ? ` Reason: ${notes}` : ''} Please review and resubmit.`,
      emailStatus: 'rejected',
    },
    suspended: {
      title: 'Account Suspended',
      message: `Your ${type} account has been suspended.${notes ? ` Reason: ${notes}` : ''}`,
      emailStatus: 'suspended',
    },
    reactivated: {
      title: 'Account Reactivated',
      message: `Your ${type} account for "${provider.name || type}" has been reactivated. You can access your dashboard again.`,
      emailStatus: 'reactivated',
    },
  };

  const cfg = statusConfig[status];
  if (!cfg) return;

  try {
    await notificationService.sendNotification(userId, {
      title: cfg.title,
      message: cfg.message,
      type: 'system',
      data: { providerId: provider.id, providerType: type, action: status },
    });
  } catch (err) {
    console.warn(`[Admin] Failed to send ${status} notification:`, err.message);
  }

  if (!cfg.emailStatus) return;

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('email, name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!user?.email) return;

    await sendApprovalEmail(
      user.email,
      user.name || provider.name || 'User',
      user.role,
      cfg.emailStatus,
      notes
    );
  } catch (err) {
    console.warn(`[Admin] Failed to send ${status} email:`, err.message);
  }
};

const auditProviderTransition = async ({ adminId, type, providerId, action, before, after, notes }) => {
  await logAudit({
    userId: adminId,
    userRole: 'admin',
    action,
    entityType: type,
    entityId: providerId,
    oldData: before,
    newData: after,
    metadata: notes ? { notes } : undefined,
  });
};

const broadcastProviderCatalogUpdate = async ({ provider, type, status }) => {
  if (!provider?.id) return;
  eventEmitter.emitProviderCatalogUpdated({
    providerId: provider.id,
    providerType: type,
    status,
  });
};

const backfillProviderCoordinates = async (type, provider) => {
  if (!LOCATION_PROVIDER_TYPES.has(type) || !provider?.id) {
    return provider;
  }

  if (provider.latitude != null && provider.longitude != null) {
    return provider;
  }

  try {
    const geo = await geocodeProvider(provider);
    if (!geo) {
      return provider;
    }

    const table = PROVIDER_TABLES[type];
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({
        latitude: geo.latitude,
        longitude: geo.longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', provider.id)
      .select('*')
      .single();

    if (error) throw error;
    return data || provider;
  } catch (err) {
    console.warn(`[Admin] Failed to geocode approved ${type} ${provider.id}: ${err.message}`);
    return provider;
  }
};

// Dashboard — Fix #34: Use Promise.allSettled to survive individual query failures
// Fix #42: Cache dashboard counts for 60 seconds
const getDashboard = async () => {
  // Check cache first
  const cached = await cacheGet('admin:dashboard');
  if (cached) return cached;

  const safeCount = (result) => (result.status === 'fulfilled' ? result.value.count || 0 : 0);

  const results = await Promise.allSettled([
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

  const [
    totalUsers, totalDoctors, totalPatients, totalHospitals,
    totalPharmacies, totalClinics, totalDiagnosticCenters, totalAmbulances,
    totalAppointments, pendingDoctors, pendingHospitals, pendingPharmacies,
    pendingClinics, pendingDiagnosticCenters, pendingAmbulances, activeEmergencies,
  ] = results.map(safeCount);

  const pendingTotal = (pendingDoctors || 0) + (pendingHospitals || 0) + (pendingPharmacies || 0)
    + (pendingClinics || 0) + (pendingDiagnosticCenters || 0) + (pendingAmbulances || 0);

  const dashboard = {
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

  // Cache for 60 seconds
  await cacheSet('admin:dashboard', dashboard, 60);
  return dashboard;
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
    throw new ApiError(400, 'Invalid provider type');
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new ApiError(404, 'Provider not found');
  }

  return data;
};

// Approve provider
const approveProvider = async (type, id, adminId, notes) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw new ApiError(400, 'Invalid provider type');
  const before = await getProviderSnapshot(type, id);

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
  const approvedProvider = await backfillProviderCoordinates(type, data);

  // Update user verification if applicable
  if (approvedProvider?.user_id || approvedProvider?.owner_id) {
    const userId = approvedProvider.user_id || approvedProvider.owner_id;
    await supabaseAdmin.from('users').update({ is_verified: true }).eq('id', userId);
  }

  await Promise.allSettled([
    invalidateApprovalCaches(approvedProvider),
    notifyProviderStatusChange({ provider: approvedProvider, type, status: 'approved', notes }),
    broadcastProviderCatalogUpdate({ provider: approvedProvider, type, status: 'approved' }),
    auditProviderTransition({
      adminId,
      type,
      providerId: id,
      action: 'provider.approved',
      before,
      after: approvedProvider,
      notes,
    }),
  ]);

  return { data: approvedProvider, message: `${type} approved successfully` };
};

// Reject provider
const rejectProvider = async (type, id, adminId, reason) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw new ApiError(400, 'Invalid provider type');
  const before = await getProviderSnapshot(type, id);

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

  await Promise.allSettled([
    invalidateApprovalCaches(data),
    notifyProviderStatusChange({ provider: data, type, status: 'rejected', notes: reason }),
    broadcastProviderCatalogUpdate({ provider: data, type, status: 'rejected' }),
    auditProviderTransition({
      adminId,
      type,
      providerId: id,
      action: 'provider.rejected',
      before,
      after: data,
      notes: reason,
    }),
  ]);

  return { data, message: `${type} rejected` };
};

// Suspend provider
const suspendProvider = async (type, id, adminId, reason) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw new ApiError(400, 'Invalid provider type');
  const before = await getProviderSnapshot(type, id);

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
  await Promise.allSettled([
    invalidateApprovalCaches(data),
    notifyProviderStatusChange({ provider: data, type, status: 'suspended', notes: reason }),
    broadcastProviderCatalogUpdate({ provider: data, type, status: 'suspended' }),
    auditProviderTransition({
      adminId,
      type,
      providerId: id,
      action: 'provider.suspended',
      before,
      after: data,
      notes: reason,
    }),
  ]);
  return { data, message: `${type} suspended` };
};

// Reactivate provider
const reactivateProvider = async (type, id, adminId, notes) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw new ApiError(400, 'Invalid provider type');
  const before = await getProviderSnapshot(type, id);

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

  if (data?.user_id || data?.owner_id) {
    const userId = data.user_id || data.owner_id;
    await supabaseAdmin.from('users').update({ is_verified: true }).eq('id', userId);
  }

  await Promise.allSettled([
    invalidateApprovalCaches(data),
    notifyProviderStatusChange({ provider: data, type, status: 'reactivated', notes }),
    broadcastProviderCatalogUpdate({ provider: data, type, status: 'reactivated' }),
    auditProviderTransition({
      adminId,
      type,
      providerId: id,
      action: 'provider.reactivated',
      before,
      after: data,
      notes,
    }),
  ]);
  return { data, message: `${type} reactivated` };
};

// Add admin note
const addAdminNote = async (type, id, adminId, note, isInternal = true) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw new ApiError(400, 'Invalid provider type');

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
    throw new ApiError(400, 'You cannot deactivate your own account');
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
    .select('*, patient:patients(id, name)', { count: 'exact' })
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

// Valid emergency status transitions
const EMERGENCY_STATUS_TRANSITIONS = {
  pending: ['assigned', 'dispatched', 'cancelled'],
  assigned: ['dispatched', 'en_route', 'cancelled'],
  dispatched: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Update emergency status with state machine validation
const updateEmergencyStatus = async (emergencyId, status, adminId) => {
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('emergency_requests')
    .select('status')
    .eq('id', emergencyId)
    .single();

  if (fetchError || !current) throw new ApiError(404, 'Emergency request not found');

  const allowed = EMERGENCY_STATUS_TRANSITIONS[current.status] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Cannot transition emergency from '${current.status}' to '${status}'`);
  }

  const { data, error } = await supabaseAdmin
    .from('emergency_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', emergencyId)
    .select('*')
    .single();

  if (error) throw error;

  logAudit({
    userId: adminId,
    userRole: 'admin',
    action: 'emergency.status_update',
    entityType: 'emergency_request',
    entityId: emergencyId,
    details: { from: current.status, to: status },
  });

  return { data, message: `Emergency status updated to '${status}'` };
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
  updateEmergencyStatus,
  getExpiringDocuments,
  getAnalytics,
  getAuditLogs,
  getSystemHealth,
};
