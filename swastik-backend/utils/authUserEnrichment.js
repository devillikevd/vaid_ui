const PROVIDER_ROLE_CONFIG = {
  doctor: { table: 'doctors', column: 'user_id', select: 'id, approval_status, approval_notes' },
  hospital_owner: { table: 'hospitals', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  clinic_owner: { table: 'clinics', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  pharmacy_owner: { table: 'pharmacies', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  diagnostic_center_owner: { table: 'diagnostic_centers', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  ambulance_operator: {
    table: 'ambulance_operators',
    column: 'user_id',
    select: 'id, approval_status, approval_notes, company_name',
  },
};

const requiresAuthUserEnrichment = (role) => role === 'hospital_manager' || Boolean(PROVIDER_ROLE_CONFIG[role]);

const enrichAuthUser = async (user, supabaseAdmin) => {
  if (!user?.id || !user?.role || !requiresAuthUserEnrichment(user.role)) {
    return user;
  }

  try {
    let provider = null;

    if (user.role === 'hospital_manager') {
      const { data: managerEntry } = await supabaseAdmin
        .from('hospital_managers')
        .select('hospital_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (managerEntry?.hospital_id) {
        const { data: hospital } = await supabaseAdmin
          .from('hospitals')
          .select('id, approval_status, approval_notes')
          .eq('id', managerEntry.hospital_id)
          .maybeSingle();
        provider = hospital;
      }
    } else {
      const config = PROVIDER_ROLE_CONFIG[user.role];
      const { data } = await supabaseAdmin
        .from(config.table)
        .select(config.select)
        .eq(config.column, user.id)
        .maybeSingle();
      provider = data;
    }

    if (!provider) return user;

    return {
      ...user,
      provider_id: provider.id ?? user.provider_id ?? null,
      approval_status: provider.approval_status ?? user.approval_status ?? null,
      approval_notes: provider.approval_notes ?? user.approval_notes ?? null,
      company_name: provider.company_name ?? user.company_name ?? null,
    };
  } catch (err) {
    console.warn(`Failed to enrich auth user ${user.id} [${user.role}]:`, err.message);
    return user;
  }
};

module.exports = {
  enrichAuthUser,
  requiresAuthUserEnrichment,
};
