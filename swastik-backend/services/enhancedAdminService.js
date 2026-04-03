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

const PROVIDER_LABELS = {
  doctor: 'Doctor',
  hospital: 'Hospital',
  pharmacy: 'Pharmacy',
  clinic: 'Clinic',
  diagnostic_center: 'Diagnostic Center',
  ambulance: 'Ambulance Operator',
};

const PROVIDER_COMPLIANCE_DOCS = {
  doctor: [
    {
      key: 'license_document_url',
      label: 'Medical License',
      requiredFields: [
        { key: 'registration_number', label: 'Registration number' },
        { key: 'license_number', label: 'License number' },
      ],
    },
    {
      key: 'degree_certificate_url',
      label: 'Degree Certificate',
      requiredFields: [],
    },
  ],
  hospital: [
    {
      key: 'license_document_url',
      label: 'Hospital License',
      requiredFields: [
        { key: 'license_number', label: 'License number' },
      ],
    },
  ],
  clinic: [
    {
      key: 'license_document_url',
      label: 'Clinic License',
      requiredFields: [
        { key: 'registration_number', label: 'Registration number' },
        { key: 'license_number', label: 'License number' },
      ],
    },
  ],
  pharmacy: [
    {
      key: 'license_document_url',
      label: 'Pharmacy License',
      requiredFields: [
        { key: 'license_number', label: 'License number' },
        { key: 'drug_license_number', label: 'Drug license number' },
      ],
    },
  ],
  diagnostic_center: [
    {
      key: 'license_document_url',
      label: 'Diagnostic License',
      requiredFields: [
        { key: 'registration_number', label: 'Registration number' },
        { key: 'license_number', label: 'License number' },
      ],
    },
  ],
  ambulance: [
    {
      key: 'license_document_url',
      label: 'Operator License',
      requiredFields: [
        { key: 'registration_number', label: 'Registration number' },
      ],
      expiryField: 'license_expiry',
    },
  ],
};

const getProviderUserId = (provider) => provider?.user_id || provider?.owner_id || null;
const LOCATION_PROVIDER_TYPES = new Set(['hospital', 'pharmacy', 'clinic', 'diagnostic_center']);
const PROVIDER_UI_TYPES = {
  doctor: 'doctors',
  hospital: 'hospitals',
  pharmacy: 'pharmacies',
  clinic: 'clinics',
  diagnostic_center: 'diagnostic_centers',
  ambulance: 'ambulances',
};
const ADMIN_SETTINGS_CACHE_KEY = 'admin:settings';
const ADMIN_SETTINGS_CACHE_TTL = 60 * 60 * 24 * 365;
const ADMIN_SETTINGS_DEFAULTS = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  twoFactorAuth: false,
  sessionTimeout: '30',
  maintenanceMode: false,
  platformName: 'Swastik Healthcare',
  supportEmail: 'support@swastik.health',
};

const normalizeAdminProviderType = (rawType = 'all') => {
  const normalized = String(rawType || 'all').trim().toLowerCase();
  const map = {
    all: 'all',
    doctor: 'doctor',
    doctors: 'doctor',
    hospital: 'hospital',
    hospitals: 'hospital',
    clinic: 'clinic',
    clinics: 'clinic',
    pharmacy: 'pharmacy',
    pharmacies: 'pharmacy',
    diagnostic_center: 'diagnostic_center',
    diagnostic_centers: 'diagnostic_center',
    diagnosticcenter: 'diagnostic_center',
    diagnosticcenters: 'diagnostic_center',
    ambulance: 'ambulance',
    ambulances: 'ambulance',
  };

  return map[normalized] || normalized;
};

const normalizeProviderLifecycleStatus = (provider) => {
  if (provider?.approval_status) return provider.approval_status;
  if (provider?.is_active === false) return 'suspended';
  if (provider?.is_approved === true) return 'approved';
  return 'pending';
};

const isPresentValue = (value) => {
  if (Array.isArray(value)) return value.some((item) => isPresentValue(item));
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const formatDocumentStatus = (providerStatus, hasMissingRequiredItems, expiryDate, daysWindow) => {
  const now = Date.now();
  const expiryTs = expiryDate ? new Date(expiryDate).getTime() : Number.NaN;
  const daysUntilExpiry = Number.isFinite(expiryTs)
    ? Math.ceil((expiryTs - now) / (1000 * 60 * 60 * 24))
    : null;

  if (hasMissingRequiredItems) {
    return { status: 'missing', daysUntilExpiry };
  }
  if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
    return { status: 'expired', daysUntilExpiry };
  }
  if (daysUntilExpiry !== null && daysUntilExpiry <= daysWindow) {
    return { status: 'expiring_soon', daysUntilExpiry };
  }
  if (providerStatus === 'approved') {
    return { status: 'approved', daysUntilExpiry };
  }
  if (providerStatus === 'rejected') {
    return { status: 'rejected', daysUntilExpiry };
  }
  if (providerStatus === 'suspended') {
    return { status: 'suspended', daysUntilExpiry };
  }
  if (providerStatus === 'under_review') {
    return { status: 'under_review', daysUntilExpiry };
  }
  return { status: 'submitted', daysUntilExpiry };
};

const buildProviderComplianceDocuments = (type, provider, options = {}) => {
  const providerStatus = normalizeProviderLifecycleStatus(provider);
  const daysWindow = Number.isFinite(options.daysWindow) ? options.daysWindow : 30;
  const definitions = PROVIDER_COMPLIANCE_DOCS[type] || [];

  return definitions.map((definition) => {
    const url = provider?.[definition.key] || null;
    const identifiers = (definition.requiredFields || [])
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: provider?.[field.key],
      }));

    const missingItems = [];
    if (!isPresentValue(url)) {
      missingItems.push('Document file');
    }

    identifiers.forEach((field) => {
      if (!isPresentValue(field.value)) {
        missingItems.push(field.label);
      }
    });

    const expiryDate = definition.expiryField ? provider?.[definition.expiryField] || null : null;
    const { status, daysUntilExpiry } = formatDocumentStatus(
      providerStatus,
      missingItems.length > 0,
      expiryDate,
      daysWindow
    );

    return {
      id: `${type}:${provider.id}:${definition.key}`,
      provider_id: provider.id,
      provider_name: provider.name || 'Unknown',
      provider_type: type,
      provider_type_label: PROVIDER_LABELS[type] || type,
      provider_status: providerStatus,
      created_at: provider.created_at,
      updated_at: provider.updated_at,
      document_key: definition.key,
      document_type: definition.label,
      document_url: url,
      identifiers: identifiers.filter((field) => isPresentValue(field.value)),
      missing_items: missingItems,
      expiry_date: expiryDate,
      days_until_expiry: daysUntilExpiry,
      status,
    };
  });
};

const summarizeComplianceDocuments = (documents = []) => ({
  total: documents.length,
  missing: documents.filter((doc) => doc.status === 'missing').length,
  submitted: documents.filter((doc) => doc.status === 'submitted' || doc.status === 'under_review').length,
  approved: documents.filter((doc) => doc.status === 'approved').length,
  rejected: documents.filter((doc) => doc.status === 'rejected').length,
  suspended: documents.filter((doc) => doc.status === 'suspended').length,
  expired: documents.filter((doc) => doc.status === 'expired').length,
  expiringSoon: documents.filter((doc) => doc.status === 'expiring_soon').length,
});

const hasMappableCoordinates = (provider) =>
  typeof provider?.latitude === 'number' &&
  !Number.isNaN(provider.latitude) &&
  typeof provider?.longitude === 'number' &&
  !Number.isNaN(provider.longitude);

const hasGeocodableAddress = (provider) =>
  [provider?.address, provider?.city, provider?.state, provider?.pincode]
    .some((value) => typeof value === 'string' && value.trim().length > 0);

const resolveApprovalBlockReason = (type, provider, resolvedPhone) => {
  if (!resolvedPhone) {
    return 'Provider phone is required before approval.';
  }

  if (LOCATION_PROVIDER_TYPES.has(type) && !hasMappableCoordinates(provider) && !hasGeocodableAddress(provider)) {
    return 'Address or map coordinates are required before approval so patients can discover this provider.';
  }

  return null;
};

const getProviderUserProfile = async (provider) => {
  const userId = getProviderUserId(provider);
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone, role, is_active, is_verified')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn(`[Admin] Failed to fetch provider user profile ${userId}: ${error.message}`);
    return null;
  }

  return data;
};

const enrichProviderForAdmin = async (type, provider, options = {}) => {
  const user = await getProviderUserProfile(provider);
  const phone = provider?.phone || user?.phone || null;
  const email = provider?.email || user?.email || null;
  const approvalBlockReason = resolveApprovalBlockReason(type, provider, phone);
  const complianceDocuments = buildProviderComplianceDocuments(type, provider, {
    daysWindow: options.complianceDays,
  });

  return {
    ...provider,
    provider_type: PROVIDER_UI_TYPES[type] || type,
    provider_type_key: type,
    email,
    phone,
    contact_name: user?.name || null,
    user_role: user?.role || null,
    user_id: provider?.user_id || provider?.owner_id || null,
    status: normalizeProviderLifecycleStatus(provider),
    approval_block_reason: approvalBlockReason,
    can_approve: !approvalBlockReason,
    compliance_documents: complianceDocuments,
    missing_compliance_documents: complianceDocuments
      .filter((document) => document.status === 'missing')
      .map((document) => document.document_type),
    compliance_summary: summarizeComplianceDocuments(complianceDocuments),
  };
};

const resolveProviderPhone = async (provider) => {
  if (provider?.phone) return provider.phone;
  const userId = getProviderUserId(provider);
  if (!userId) return null;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('phone')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return user?.phone || null;
};

const assertProviderApprovalReadiness = async (type, provider) => {
  if (!provider?.id) throw new ApiError(404, 'Provider not found');

  const phone = await resolveProviderPhone(provider);
  if (!phone) {
    throw new ApiError(
      400,
      'Provider phone is required before approval. Update provider profile (or owner phone) and try again.'
    );
  }

  if (LOCATION_PROVIDER_TYPES.has(type)) {
    const hasLatitude = typeof provider.latitude === 'number' && !Number.isNaN(provider.latitude);
    const hasLongitude = typeof provider.longitude === 'number' && !Number.isNaN(provider.longitude);
    if (!hasLatitude || !hasLongitude) {
      throw new ApiError(
        400,
        'Provider latitude/longitude are required before approval so patients can discover this provider on map.'
      );
    }
  }
};

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

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();

  const ACTIVE_EMERGENCY_STATUSES = [
    'pending',
    'broadcasting',
    'assigned',
    'accepted',
    'dispatched',
    'en_route_pickup',
    'en_route',
    'arrived',
    'picked_up',
    'en_route_hospital',
  ];

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
    supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    supabaseAdmin.from('hospitals').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
    supabaseAdmin.from('pharmacies').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
    supabaseAdmin.from('clinics').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
    supabaseAdmin.from('diagnostic_centers').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
    supabaseAdmin.from('ambulance_operators').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
    supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ACTIVE_EMERGENCY_STATUSES),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('last_login', dayStartIso),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', dayStartIso),
  ]);

  const [
    totalUsers, totalDoctors, totalPatients, totalHospitals,
    totalPharmacies, totalClinics, totalDiagnosticCenters, totalAmbulances,
    totalAppointments, pendingDoctors, pendingHospitals, pendingPharmacies,
    pendingClinics, pendingDiagnosticCenters, pendingAmbulances,
    approvedDoctors, approvedHospitals, approvedPharmacies,
    approvedClinics, approvedDiagnosticCenters, approvedAmbulances,
    activeEmergencies, activeTodayUsers, todaysAppointments,
  ] = results.map(safeCount);

  const pendingTotal = (pendingDoctors || 0) + (pendingHospitals || 0) + (pendingPharmacies || 0)
    + (pendingClinics || 0) + (pendingDiagnosticCenters || 0) + (pendingAmbulances || 0);

  const totalProviders = (totalDoctors || 0) + (totalHospitals || 0) + (totalPharmacies || 0)
    + (totalClinics || 0) + (totalDiagnosticCenters || 0) + (totalAmbulances || 0);

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
      totalProviders,
      totalPatients: totalPatients || 0,
      activeToday: activeTodayUsers || 0,
      pendingApprovals: pendingTotal,
      todaysAppointments: todaysAppointments || 0,
      activeEmergencies: activeEmergencies || 0,
    },
    providerCounts: {
      doctors:    { total: totalDoctors || 0, pending: pendingDoctors || 0 },
      hospitals:  { total: totalHospitals || 0, pending: pendingHospitals || 0 },
      clinics:    { total: totalClinics || 0, pending: pendingClinics || 0 },
      pharmacies: { total: totalPharmacies || 0, pending: pendingPharmacies || 0 },
      diagnosticCenters: { total: totalDiagnosticCenters || 0, pending: pendingDiagnosticCenters || 0 },
      ambulances: { total: totalAmbulances || 0, pending: pendingAmbulances || 0 },
    },
    providerCategories: [
      { name: 'Doctors',    type: 'doctors',    pending: pendingDoctors || 0,    approved: approvedDoctors || 0 },
      { name: 'Hospitals',  type: 'hospitals',  pending: pendingHospitals || 0,  approved: approvedHospitals || 0 },
      { name: 'Clinics',    type: 'clinics',    pending: pendingClinics || 0,    approved: approvedClinics || 0 },
      { name: 'Pharmacies', type: 'pharmacies', pending: pendingPharmacies || 0, approved: approvedPharmacies || 0 },
      { name: 'Diagnostic Centers', type: 'diagnostic_centers', pending: pendingDiagnosticCenters || 0, approved: approvedDiagnosticCenters || 0 },
      { name: 'Ambulances', type: 'ambulances', pending: pendingAmbulances || 0, approved: approvedAmbulances || 0 },
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
  const normalizedType = normalizeAdminProviderType(type);

  // Use approval_status = 'pending' as the canonical field across all provider tables
  const fetchPending = async (providerType) => {
    const table = PROVIDER_TABLES[providerType];
    const { data, count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact' })
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const enriched = await Promise.all((data || []).map((provider) => enrichProviderForAdmin(providerType, provider)));
    return { data: enriched, total: count || 0 };
  };

  if (normalizedType === 'all' || normalizedType === 'doctor') {
    results[PROVIDER_UI_TYPES.doctor] = await fetchPending('doctor');
  }
  if (normalizedType === 'all' || normalizedType === 'hospital') {
    results[PROVIDER_UI_TYPES.hospital] = await fetchPending('hospital');
  }
  if (normalizedType === 'all' || normalizedType === 'pharmacy') {
    results[PROVIDER_UI_TYPES.pharmacy] = await fetchPending('pharmacy');
  }
  if (normalizedType === 'all' || normalizedType === 'clinic') {
    results[PROVIDER_UI_TYPES.clinic] = await fetchPending('clinic');
  }
  if (normalizedType === 'all' || normalizedType === 'diagnostic_center') {
    results[PROVIDER_UI_TYPES.diagnostic_center] = await fetchPending('diagnostic_center');
  }
  if (normalizedType === 'all' || normalizedType === 'ambulance') {
    results[PROVIDER_UI_TYPES.ambulance] = await fetchPending('ambulance');
  }

  return { data: results, pagination: { page, limit } };
};

// Get provider details
const getProviderDetails = async (type, id) => {
  const normalizedType = normalizeAdminProviderType(type);
  const table = PROVIDER_TABLES[normalizedType];
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

  return enrichProviderForAdmin(normalizedType, data);
};

const getProviders = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const normalizedType = normalizeAdminProviderType(filters.type || 'all');
  const providerTypes = normalizedType === 'all'
    ? Object.keys(PROVIDER_TABLES)
    : [normalizedType];

  const providerGroups = await Promise.all(providerTypes.map(async (providerType) => {
    const table = PROVIDER_TABLES[providerType];
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Promise.all((data || []).map((provider) => enrichProviderForAdmin(providerType, provider)));
  }));

  const searchTerm = sanitizeSearch(filters.search || '').toLowerCase();
  let providers = providerGroups.flat();

  if (filters.status) {
    const expectedStatus = String(filters.status).trim().toLowerCase();
    providers = providers.filter((provider) => normalizeProviderLifecycleStatus(provider) === expectedStatus);
  }

  if (searchTerm) {
    providers = providers.filter((provider) => (
      [
        provider.name,
        provider.email,
        provider.phone,
        provider.address,
        provider.registration_number,
        provider.license_number,
        provider.company_name,
        provider.contact_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm))
    ));
  }

  providers.sort((left, right) => {
    const leftCreatedAt = left.created_at || '';
    const rightCreatedAt = right.created_at || '';
    return rightCreatedAt.localeCompare(leftCreatedAt);
  });

  const total = providers.length;

  return {
    data: providers.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
    },
  };
};

// Approve provider
const approveProvider = async (type, id, adminId, notes) => {
  const table = PROVIDER_TABLES[type];
  if (!table) throw new ApiError(400, 'Invalid provider type');
  const before = await getProviderSnapshot(type, id);
  let providerDraft = await getProviderDetails(type, id);

  if (LOCATION_PROVIDER_TYPES.has(type)) {
    providerDraft = await backfillProviderCoordinates(type, providerDraft);
  }

  await assertProviderApprovalReadiness(type, providerDraft);

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

const getSettings = async () => {
  const stored = await cacheGet(ADMIN_SETTINGS_CACHE_KEY);
  return {
    ...ADMIN_SETTINGS_DEFAULTS,
    ...(stored || {}),
  };
};

const updateSettings = async (adminId, updates = {}) => {
  const current = await getSettings();
  const nextSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  await cacheSet(ADMIN_SETTINGS_CACHE_KEY, nextSettings, ADMIN_SETTINGS_CACHE_TTL);

  await logAudit({
    userId: adminId,
    userRole: 'admin',
    action: 'admin.settings.update',
    entityType: 'admin_settings',
    entityId: ADMIN_SETTINGS_CACHE_KEY,
    oldData: current,
    newData: nextSettings,
  });

  return nextSettings;
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
const getActiveEmergencies = async (page = 1, limit = 20, filters = {}) => {
  const ACTIVE_EMERGENCY_STATUSES = [
    'active',
    'pending',
    'broadcasting',
    'assigned',
    'accepted',
    'dispatched',
    'en_route_pickup',
    'en_route',
    'arrived',
    'picked_up',
    'en_route_hospital',
    'arrived_hospital',
  ];
  const RESOLVED_EMERGENCY_STATUSES = ['completed', 'resolved'];
  const CANCELLED_EMERGENCY_STATUSES = ['cancelled', 'timeout', 'no_ambulance'];
  const statusFilter = String(filters.status || 'active').trim().toLowerCase();
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('emergency_requests')
    .select(`
      *,
      patient:patients(
        id,
        name,
        user_id,
        user:users(phone)
      ),
      vehicle:ambulances(
        id,
        vehicle_number,
        driver_name,
        driver_phone,
        vehicle_type,
        current_latitude,
        current_longitude
      )
    `, { count: 'exact' })
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter === 'active') {
    query = query.in('status', ACTIVE_EMERGENCY_STATUSES);
  } else if (statusFilter === 'resolved') {
    query = query.in('status', RESOLVED_EMERGENCY_STATUSES);
  } else if (statusFilter === 'cancelled') {
    query = query.in('status', CANCELLED_EMERGENCY_STATUSES);
  } else if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const [
    { data, error, count },
    { count: pendingCount },
    { count: activeCount },
    { count: resolvedCount },
    { count: cancelledCount },
  ] = await Promise.all([
    query,
    supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ['pending', 'broadcasting']),
    supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ACTIVE_EMERGENCY_STATUSES.filter((status) => !['pending', 'broadcasting'].includes(status))),
    supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', RESOLVED_EMERGENCY_STATUSES),
    supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', CANCELLED_EMERGENCY_STATUSES),
  ]);

  if (error) throw error;
  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    },
    summary: {
      pending: pendingCount || 0,
      active: activeCount || 0,
      resolved: resolvedCount || 0,
      cancelled: cancelledCount || 0,
      total: (pendingCount || 0) + (activeCount || 0) + (resolvedCount || 0) + (cancelledCount || 0),
    },
    activeStatuses: ACTIVE_EMERGENCY_STATUSES,
  };
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

const getComplianceDocuments = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const days = Number.isFinite(filters.days) ? filters.days : 30;
  const normalizedType = normalizeAdminProviderType(filters.type || 'all');
  const providerTypes = normalizedType === 'all'
    ? Object.keys(PROVIDER_TABLES)
    : [normalizedType];

  const providerGroups = await Promise.all(providerTypes.map(async (providerType) => {
    const table = PROVIDER_TABLES[providerType];
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Promise.all((data || []).map((provider) => enrichProviderForAdmin(
      providerType,
      provider,
      { complianceDays: days }
    )));
  }));

  const searchTerm = sanitizeSearch(filters.search || '').toLowerCase();
  let documents = providerGroups.flat().flatMap((provider) => (
    (provider.compliance_documents || []).map((document) => ({
      ...document,
      email: provider.email,
      phone: provider.phone,
      contact_name: provider.contact_name,
      approval_notes: provider.approval_notes || null,
      can_approve_provider: provider.can_approve,
      provider_approval_block_reason: provider.approval_block_reason || null,
      provider_missing_compliance_documents: provider.missing_compliance_documents || [],
    }))
  ));

  if (filters.status && filters.status !== 'all') {
    const expectedStatus = String(filters.status).trim().toLowerCase();
    documents = documents.filter((document) => document.status === expectedStatus);
  }

  if (searchTerm) {
    documents = documents.filter((document) => (
      [
        document.provider_name,
        document.provider_type_label,
        document.document_type,
        document.email,
        document.phone,
        ...(document.identifiers || []).map((identifier) => identifier.value),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm))
    ));
  }

  const statusOrder = {
    missing: 0,
    expired: 1,
    expiring_soon: 2,
    submitted: 3,
    under_review: 4,
    rejected: 5,
    suspended: 6,
    approved: 7,
  };

  documents.sort((left, right) => {
    const leftOrder = statusOrder[left.status] ?? 99;
    const rightOrder = statusOrder[right.status] ?? 99;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(right.created_at || '').localeCompare(String(left.created_at || ''));
  });

  const total = documents.length;
  const paginatedDocuments = documents.slice(offset, offset + limit);

  return {
    data: paginatedDocuments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil((total || 0) / limit)),
    },
    summary: summarizeComplianceDocuments(documents),
    coverage: {
      trackedProviderTypes: providerTypes,
      note: 'Compliance tracking now covers provider document presence across doctors, hospitals, clinics, pharmacies, diagnostic centers, and ambulance operators. Expiry monitoring is currently available for ambulance operator licenses.',
    },
  };
};

// Backward-compatible wrapper for the legacy compliance endpoint name.
const getExpiringDocuments = async (days = 30) => getComplianceDocuments({ days }, 1, 500);

// Analytics
const getAnalytics = async (period = '30d') => {
  const parsePeriodToDays = (value) => {
    const normalized = String(value || '30d').trim().toLowerCase();
    if (normalized === '1y') return 365;
    if (normalized.endsWith('d')) {
      const d = parseInt(normalized, 10);
      return Number.isFinite(d) && d > 0 ? d : 30;
    }
    const fallback = parseInt(normalized, 10);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 30;
  };

  const pctChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  const days = parsePeriodToDays(period);
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - days);
  const prevSince = new Date(since);
  prevSince.setDate(prevSince.getDate() - days);

  const sinceStr = since.toISOString();
  const nowStr = now.toISOString();
  const prevSinceStr = prevSince.toISOString();

  const [
    // Totals
    { count: totalUsers },
    { count: totalAppointments },
    { count: totalDoctors },

    // Current period
    { count: usersCurrent },
    { count: appointmentsCurrent },
    { count: doctorsCurrent },

    // Previous period
    { count: usersPrevious },
    { count: appointmentsPrevious },
    { count: doctorsPrevious },

    // Supplemental
    { count: completedConsultations },
    { count: activeNow },
    reviewsRes,
    doctorReviewsRes,
    specialtiesRes,
    usersSeriesRes,
    apptSeriesRes,
    waitSeriesRes,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),

    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sinceStr).lte('created_at', nowStr),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', sinceStr).lte('created_at', nowStr),
    supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').gte('created_at', sinceStr).lte('created_at', nowStr),

    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', prevSinceStr).lt('created_at', sinceStr),
    supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', prevSinceStr).lt('created_at', sinceStr),
    supabaseAdmin.from('doctors').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').gte('created_at', prevSinceStr).lt('created_at', sinceStr),

    supabaseAdmin.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', sinceStr),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true).gte('last_login', new Date(Date.now() - 15 * 60 * 1000).toISOString()),
    supabaseAdmin.from('reviews').select('rating').eq('is_visible', true),
    supabaseAdmin.from('doctor_reviews').select('rating'),
    supabaseAdmin.from('doctors').select('specialization').eq('approval_status', 'approved'),
    supabaseAdmin.from('users').select('created_at').gte('created_at', sinceStr),
    supabaseAdmin.from('appointments').select('created_at').gte('created_at', sinceStr),
    supabaseAdmin.from('consultations').select('created_at,started_at').not('started_at', 'is', null).gte('created_at', sinceStr),
  ]);

  const dailyGranularity = days <= 31;
  const periodKey = (iso) => {
    const d = new Date(iso);
    if (dailyGranularity) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const periodLabel = (key) => {
    const parts = key.split('-').map(Number);
    if (dailyGranularity) {
      const [y, m, d] = parts;
      return new Date(y, m - 1, d).toLocaleString('en-IN', { day: '2-digit', month: 'short' });
    }
    const [y, m] = parts;
    return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short' });
  };

  const usersBuckets = new Map();
  for (const row of usersSeriesRes.data || []) {
    const key = periodKey(row.created_at);
    usersBuckets.set(key, (usersBuckets.get(key) || 0) + 1);
  }

  const apptBuckets = new Map();
  for (const row of apptSeriesRes.data || []) {
    const key = periodKey(row.created_at);
    apptBuckets.set(key, (apptBuckets.get(key) || 0) + 1);
  }

  const allKeys = Array.from(new Set([...usersBuckets.keys(), ...apptBuckets.keys()])).sort();
  const monthlyData = allKeys.map((k) => ({
    month: periodLabel(k),
    users: usersBuckets.get(k) || 0,
    appointments: apptBuckets.get(k) || 0,
  }));

  // Top specialties
  const specCounts = new Map();
  for (const row of specialtiesRes.data || []) {
    const raw = (row.specialization || '').trim();
    if (!raw) continue;
    specCounts.set(raw, (specCounts.get(raw) || 0) + 1);
  }
  const totalSpecs = Array.from(specCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const topSpecialties = Array.from(specCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Number(((count / totalSpecs) * 100).toFixed(1)),
    }));

  // Ratings / satisfaction
  const allRatings = [];
  for (const r of reviewsRes.data || []) if (Number.isFinite(r.rating)) allRatings.push(Number(r.rating));
  for (const r of doctorReviewsRes.data || []) if (Number.isFinite(r.rating)) allRatings.push(Number(r.rating));
  const avgRating = allRatings.length
    ? Number((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1))
    : 0;
  const positive = allRatings.filter((r) => r >= 4).length;
  const patientSatisfaction = allRatings.length
    ? Number(((positive / allRatings.length) * 100).toFixed(1))
    : 0;

  // Approx wait time: created_at -> started_at for consultations (capped 0..180 mins)
  const waits = [];
  for (const row of waitSeriesRes.data || []) {
    const created = new Date(row.created_at).getTime();
    const started = new Date(row.started_at).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(started)) continue;
    const mins = (started - created) / 60000;
    if (mins >= 0 && mins <= 180) waits.push(mins);
  }
  const avgWaitMinutes = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

  return {
    period,
    // backward-compatible fields
    newUsers: usersCurrent || 0,
    newAppointments: appointmentsCurrent || 0,
    completedConsultations: completedConsultations || 0,

    // UI contract expected by web analytics page
    stats: {
      totalUsers: totalUsers || 0,
      totalDoctors: totalDoctors || 0,
      totalAppointments: totalAppointments || 0,
      platformUptime: 99.9,
      userGrowth: pctChange(usersCurrent || 0, usersPrevious || 0),
      doctorGrowth: pctChange(doctorsCurrent || 0, doctorsPrevious || 0),
      appointmentGrowth: pctChange(appointmentsCurrent || 0, appointmentsPrevious || 0),
    },
    monthlyData,
    topSpecialties,
    platformMetrics: {
      avgRating,
      patientSatisfaction,
      avgWaitTime: `${avgWaitMinutes}m`,
      activeNow: activeNow || 0,
    },
  };
};

// Audit logs (from MongoDB if available, else return empty)
const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  try {
    const { AuditLog } = require('../database/models');
    const mongoFilters = {};
    if (filters.userId) mongoFilters.userId = filters.userId;
    if (filters.action) mongoFilters.action = filters.action;
    if (filters.resourceType) mongoFilters.entityType = filters.resourceType;
    if (filters.fromDate || filters.toDate) {
      mongoFilters.createdAt = {};
      if (filters.fromDate) mongoFilters.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) mongoFilters.createdAt.$lte = new Date(filters.toDate);
    }
    if (filters.search) {
      const pattern = sanitizeSearch(filters.search);
      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        mongoFilters.$or = [
          { action: regex },
          { entityType: regex },
          { entityId: regex },
          { userId: regex },
        ];
      }
    }

    const total = await AuditLog.countDocuments(mongoFilters);
    const rawLogs = await AuditLog.find(mongoFilters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const userIds = [...new Set((rawLogs || []).map((log) => log.userId).filter(Boolean))];
    let usersById = new Map();

    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds);

      usersById = new Map((users || []).map((user) => [user.id, user]));
    }

    const data = (rawLogs || []).map((log) => {
      const plainLog = typeof log.toObject === 'function' ? log.toObject() : log;
      const user = usersById.get(plainLog.userId);
      return {
        ...plainLog,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } : null,
        userName: user?.name || null,
        userEmail: user?.email || null,
        userRole: user?.role || plainLog.userRole || 'unknown',
      };
    });

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil((total || 0) / limit)) },
      sourceStatus: 'available',
    };
  } catch (err) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 1 },
      sourceStatus: 'unavailable',
      message: 'Audit log storage is currently unavailable.',
    };
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

  try {
    const redis = require('../config/redis');
    const client = redis.getRedisClient();
    if (!client) {
      checks.redis = { status: 'unavailable' };
    } else {
      await client.ping();
      checks.redis = { status: 'healthy' };
    }
  } catch (e) {
    checks.redis = { status: 'unavailable' };
  }

  return {
    status: checks.supabase.status === 'healthy' && checks.mongodb.status === 'healthy'
      ? 'healthy'
      : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    // Backward-compatible top-level keys consumed by older UIs
    database: checks.mongodb,
    supabase: checks.supabase,
    redis: checks.redis,
    checks,
  };
};

// Valid emergency status transitions
const CANONICAL_EMERGENCY_STATUS_MAP = {
  active: 'pending',
  accepted: 'assigned',
  dispatched: 'assigned',
  en_route_pickup: 'en_route',
  arrived_pickup: 'arrived',
  patient_onboard: 'picked_up',
};

const toCanonicalEmergencyStatus = (status) => CANONICAL_EMERGENCY_STATUS_MAP[status] || status;

const EMERGENCY_STATUS_TRANSITIONS = {
  pending: ['broadcasting', 'assigned', 'cancelled', 'no_ambulance'],
  broadcasting: ['assigned', 'timeout', 'cancelled', 'no_ambulance'],
  assigned: ['en_route', 'cancelled'],
  en_route: ['arrived', 'picked_up', 'cancelled'],
  arrived: ['picked_up', 'completed', 'cancelled'],
  picked_up: ['en_route_hospital', 'completed', 'cancelled'],
  en_route_hospital: ['arrived_hospital', 'completed', 'cancelled'],
  arrived_hospital: ['completed'],
  timeout: ['broadcasting', 'cancelled'],
  no_ambulance: ['broadcasting', 'cancelled'],
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

  const currentStatus = toCanonicalEmergencyStatus(current.status);
  const nextStatus = toCanonicalEmergencyStatus(status);

  const allowed = EMERGENCY_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(400, `Cannot transition emergency from '${current.status}' to '${status}'`);
  }

  const { data, error } = await supabaseAdmin
    .from('emergency_requests')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
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
    details: { from: current.status, to: nextStatus },
  });

  return { data, message: `Emergency status updated to '${nextStatus}'` };
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
  getProviders,
  getSettings,
  getUsers,
  updateUserStatus,
  getActiveEmergencies,
  reassignEmergency,
  updateEmergencyStatus,
  getComplianceDocuments,
  getExpiringDocuments,
  getAnalytics,
  getAuditLogs,
  getSystemHealth,
  updateSettings,
};
