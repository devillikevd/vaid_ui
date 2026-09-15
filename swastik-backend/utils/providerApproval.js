const PROVIDER_APPROVAL_CONFIG = {
  doctor: { table: 'doctors', userColumn: 'user_id', hasIsActive: false },
  doctor_pending: { table: 'doctors', userColumn: 'user_id', hasIsActive: false },
  hospital_owner: { table: 'hospitals', userColumn: 'owner_id', hasIsActive: true },
  hospital_owner_pending: { table: 'hospitals', userColumn: 'owner_id', hasIsActive: true },
  clinic_owner: { table: 'clinics', userColumn: 'owner_id', hasIsActive: true },
  clinic_owner_pending: { table: 'clinics', userColumn: 'owner_id', hasIsActive: true },
  pharmacy_owner: { table: 'pharmacies', userColumn: 'owner_id', hasIsActive: true },
  pharmacy_owner_pending: { table: 'pharmacies', userColumn: 'owner_id', hasIsActive: true },
  diagnostic_center_owner: { table: 'diagnostic_centers', userColumn: 'owner_id', hasIsActive: true },
  diagnostic_center_owner_pending: { table: 'diagnostic_centers', userColumn: 'owner_id', hasIsActive: true },
  wellness_coach: { table: 'wellness_coaches', userColumn: 'user_id', hasIsActive: true },
  wellness_coach_pending: { table: 'wellness_coaches', userColumn: 'user_id', hasIsActive: true },
  fitness_center_owner: { table: 'fitness_centers', userColumn: 'owner_user_id', hasIsActive: true },
  fitness_center_owner_pending: { table: 'fitness_centers', userColumn: 'owner_user_id', hasIsActive: true },
  ambulance_operator: { table: 'ambulance_operators', userColumn: 'user_id', hasIsActive: true },
};

const getProviderApprovalConfig = (role) => PROVIDER_APPROVAL_CONFIG[role] || null;

const getProviderApprovalRecordByUser = async (supabaseAdmin, role, userId) => {
  const config = getProviderApprovalConfig(role);
  if (!config || !userId) return null;

  const { data, error } = await supabaseAdmin
    .from(config.table)
    .select('id, approval_status, approval_notes')
    .eq(config.userColumn, userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const buildProviderResubmissionFields = (role, approvalStatus) => {
  const config = getProviderApprovalConfig(role);
  if (!config || approvalStatus !== 'rejected') {
    return {};
  }

  const updates = {
    is_approved: false,
    approval_status: 'pending',
    approval_notes: 'Provider updated profile details and resubmitted for review.',
    approved_by: null,
    approved_at: null,
  };

  if (config.hasIsActive) {
    updates.is_active = false;
  }

  return updates;
};

const assertDocumentOwnership = (documentUrl, userId, providerId = null) => {
  if (!documentUrl || typeof documentUrl !== 'string') return;
  try {
    const { extractObjectNameFromUrl } = require('../config/minio');
    const objectName = extractObjectNameFromUrl(documentUrl);
    if (!objectName) {
      // Non-storage URL or external URL, allow
      return;
    }

    const segments = objectName.split('/');
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '-');
    const safeProviderId = providerId ? String(providerId).replace(/[^a-zA-Z0-9_-]/g, '-') : null;

    const matchesUser = segments.includes(safeUserId) || segments.some((s) => s.includes(safeUserId));
    const matchesProvider = safeProviderId && (segments.includes(safeProviderId) || segments.some((s) => s.includes(safeProviderId)));

    if (!matchesUser && !matchesProvider) {
      const { ApiError } = require('../middleware/errorHandler');
      throw new ApiError(403, 'Document does not belong to the authenticated provider.');
    }
  } catch (err) {
    if (err.statusCode) throw err;
  }
};

module.exports = {
  PROVIDER_APPROVAL_CONFIG,
  getProviderApprovalConfig,
  getProviderApprovalRecordByUser,
  buildProviderResubmissionFields,
  assertDocumentOwnership,
};

