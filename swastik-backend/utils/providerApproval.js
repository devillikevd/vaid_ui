const PROVIDER_APPROVAL_CONFIG = {
  doctor: { table: 'doctors', userColumn: 'user_id', hasIsActive: false },
  hospital_owner: { table: 'hospitals', userColumn: 'owner_id', hasIsActive: true },
  clinic_owner: { table: 'clinics', userColumn: 'owner_id', hasIsActive: true },
  pharmacy_owner: { table: 'pharmacies', userColumn: 'owner_id', hasIsActive: true },
  diagnostic_center_owner: { table: 'diagnostic_centers', userColumn: 'owner_id', hasIsActive: true },
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

module.exports = {
  PROVIDER_APPROVAL_CONFIG,
  getProviderApprovalConfig,
  getProviderApprovalRecordByUser,
  buildProviderResubmissionFields,
};
