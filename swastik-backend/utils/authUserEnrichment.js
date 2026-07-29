const PROVIDER_ROLE_CONFIG = {
  doctor: { table: 'doctors', column: 'user_id', select: 'id, approval_status, approval_notes' },
  hospital_owner: { table: 'hospitals', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  clinic_owner: { table: 'clinics', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  pharmacy_owner: { table: 'pharmacies', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  diagnostic_center_owner: { table: 'diagnostic_centers', column: 'owner_id', select: 'id, approval_status, approval_notes' },
  wellness_coach: {
    table: 'wellness_coaches',
    column: 'user_id',
    select: 'id, approval_status, approval_notes, registration_number, address, city, state, email',
  },
  fitness_center_owner: {
    table: 'fitness_centers',
    column: 'owner_user_id',
    select: 'id, approval_status, approval_notes, name, center_type, address, city, state, email',
  },
  ambulance_operator: {
    table: 'ambulance_operators',
    column: 'user_id',
    select: 'id, approval_status, approval_notes, company_name, registration_number, address, city, state, alternate_phone, email, license_document_url, license_expiry',
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
      center_type: provider.center_type ?? user.center_type ?? null,
      registration_number: provider.registration_number ?? user.registration_number ?? null,
      address: provider.address ?? user.address ?? null,
      city: provider.city ?? user.city ?? null,
      state: provider.state ?? user.state ?? null,
      alternate_phone: provider.alternate_phone ?? user.alternate_phone ?? null,
      provider_email: provider.email ?? user.provider_email ?? null,
      license_document_url: provider.license_document_url ?? user.license_document_url ?? null,
      license_expiry: provider.license_expiry ?? user.license_expiry ?? null,
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
