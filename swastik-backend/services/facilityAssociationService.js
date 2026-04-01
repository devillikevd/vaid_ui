const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

const FACILITY_TYPES = {
  hospital: {
    table: 'hospitals',
    label: 'Hospital',
  },
  clinic: {
    table: 'clinics',
    label: 'Clinic',
  },
};

const PROVIDER_TYPES = {
  pharmacy: {
    table: 'pharmacies',
    ownerRole: 'pharmacy_owner',
    label: 'Pharmacy',
  },
  diagnostic_center: {
    table: 'diagnostic_centers',
    ownerRole: 'diagnostic_center_owner',
    label: 'Diagnostic Center',
  },
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const assertFacilityType = (facilityType) => {
  if (!FACILITY_TYPES[facilityType]) {
    throw new ApiError(400, 'Invalid facility type');
  }
};

const assertProviderType = (providerType) => {
  if (!PROVIDER_TYPES[providerType]) {
    throw new ApiError(400, 'Invalid provider type');
  }
};

const buildUserContactMap = async (userIds = []) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone')
    .in('id', ids);

  if (error) throw error;

  return new Map((data || []).filter((row) => row?.id).map((row) => [row.id, row]));
};

const getFacilityById = async (facilityType, facilityId) => {
  assertFacilityType(facilityType);
  const config = FACILITY_TYPES[facilityType];

  const { data, error } = await supabaseAdmin
    .from(config.table)
    .select('id, owner_id, name, email, phone, address, city, state, pincode, approval_status, is_active, is_approved')
    .eq('id', facilityId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ApiError(404, `${config.label} not found`);

  return data;
};

const getProviderById = async (providerType, providerId) => {
  assertProviderType(providerType);
  const config = PROVIDER_TYPES[providerType];

  const { data, error } = await supabaseAdmin
    .from(config.table)
    .select('id, owner_id, name, email, phone, address, city, state, pincode, approval_status, is_active, is_approved')
    .eq('id', providerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ApiError(404, `${config.label} not found`);

  return data;
};

const getProviderByOwner = async (providerType, ownerId) => {
  assertProviderType(providerType);
  const config = PROVIDER_TYPES[providerType];

  const { data, error } = await supabaseAdmin
    .from(config.table)
    .select('id, owner_id, name, email, phone, address, city, state, pincode, approval_status, is_active, is_approved')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ApiError(404, `${config.label} profile not found for this user`);

  return data;
};

const resolveProviderByInviteEmail = async (providerType, email) => {
  assertProviderType(providerType);
  const config = PROVIDER_TYPES[providerType];
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new ApiError(400, 'Provider email is required');
  }

  const matchesByProviderEmailPromise = supabaseAdmin
    .from(config.table)
    .select('id, owner_id, name, email, phone, address, city, state, pincode, approval_status, is_active, is_approved')
    .eq('email', normalizedEmail)
    .limit(5);

  const ownerUserIdsPromise = supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', config.ownerRole)
    .eq('email', normalizedEmail);

  const [{ data: providerEmailMatches, error: providerEmailError }, { data: ownerUsers, error: ownerError }] = await Promise.all([
    matchesByProviderEmailPromise,
    ownerUserIdsPromise,
  ]);

  if (providerEmailError) throw providerEmailError;
  if (ownerError) throw ownerError;

  let ownerMatches = [];
  const ownerUserIds = (ownerUsers || []).map((row) => row.id).filter(Boolean);
  if (ownerUserIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from(config.table)
      .select('id, owner_id, name, email, phone, address, city, state, pincode, approval_status, is_active, is_approved')
      .in('owner_id', ownerUserIds)
      .limit(5);

    if (error) throw error;
    ownerMatches = data || [];
  }

  const merged = [...ownerMatches, ...(providerEmailMatches || [])];
  const seen = new Set();
  const uniqueMatches = merged.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const provider =
    uniqueMatches.find((row) => normalizeEmail(row.email) === normalizedEmail) ||
    uniqueMatches[0];

  if (!provider) {
    throw new ApiError(404, `${config.label} account not found for this email`);
  }

  if (provider.is_active === false || provider.is_approved !== true || provider.approval_status !== 'approved') {
    throw new ApiError(409, `${config.label} must be approved before it can be associated`);
  }

  return provider;
};

const mapProviderSummary = (provider, ownerContactMap = new Map()) => {
  const owner = provider?.owner_id ? ownerContactMap.get(provider.owner_id) : null;

  return {
    id: provider.id,
    name: provider.name || 'Provider',
    email: provider.email || owner?.email || '',
    phone: provider.phone || owner?.phone || '',
    address: provider.address || '',
    city: provider.city || '',
    state: provider.state || '',
    pincode: provider.pincode || '',
  };
};

const mapFacilitySummary = (facility, ownerContactMap = new Map(), facilityType = 'hospital') => {
  const owner = facility?.owner_id ? ownerContactMap.get(facility.owner_id) : null;

  return {
    id: facility.id,
    type: facilityType,
    label: FACILITY_TYPES[facilityType]?.label || 'Facility',
    name: facility.name || 'Facility',
    email: facility.email || owner?.email || '',
    phone: facility.phone || owner?.phone || '',
    address: facility.address || '',
    city: facility.city || '',
    state: facility.state || '',
    pincode: facility.pincode || '',
  };
};

const inviteProviderForFacility = async ({ facilityType, facilityId, invitedBy, providerType, email }) => {
  assertFacilityType(facilityType);
  assertProviderType(providerType);

  const [facility, provider] = await Promise.all([
    getFacilityById(facilityType, facilityId),
    resolveProviderByInviteEmail(providerType, email),
  ]);

  if (facility.is_active === false || facility.is_approved !== true || facility.approval_status !== 'approved') {
    throw new ApiError(409, `${FACILITY_TYPES[facilityType].label} must be approved before inviting providers`);
  }

  const { data: existingAssociation, error: existingAssociationError } = await supabaseAdmin
    .from('facility_provider_associations')
    .select('id, is_active')
    .eq('facility_type', facilityType)
    .eq('facility_id', facilityId)
    .eq('provider_type', providerType)
    .eq('provider_id', provider.id)
    .maybeSingle();

  if (existingAssociationError) throw existingAssociationError;
  if (existingAssociation?.is_active) {
    throw new ApiError(409, `${provider.name} is already associated with this ${FACILITY_TYPES[facilityType].label.toLowerCase()}`);
  }

  const { data: existingPending, error: existingPendingError } = await supabaseAdmin
    .from('facility_provider_invites')
    .select('id, status, expires_at')
    .eq('facility_type', facilityType)
    .eq('facility_id', facilityId)
    .eq('provider_type', providerType)
    .eq('provider_id', provider.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPendingError) throw existingPendingError;
  if (existingPending) {
    return {
      invite: existingPending,
      provider: mapProviderSummary(provider),
      alreadyPending: true,
    };
  }

  const { data: invite, error } = await supabaseAdmin
    .from('facility_provider_invites')
    .insert({
      facility_type: facilityType,
      facility_id: facilityId,
      provider_type: providerType,
      provider_id: provider.id,
      invited_by: invitedBy,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  return {
    invite,
    provider: mapProviderSummary(provider),
  };
};

const getFacilityAssociations = async ({ facilityType, facilityId, providerType }) => {
  assertFacilityType(facilityType);
  assertProviderType(providerType);

  const { data: associations, error: associationsError } = await supabaseAdmin
    .from('facility_provider_associations')
    .select('id, provider_id, accepted_at, created_at')
    .eq('facility_type', facilityType)
    .eq('facility_id', facilityId)
    .eq('provider_type', providerType)
    .eq('is_active', true)
    .order('accepted_at', { ascending: false });

  if (associationsError) throw associationsError;
  if (!associations || associations.length === 0) return [];

  const providerIds = associations.map((row) => row.provider_id).filter(Boolean);
  const { data: providers, error: providersError } = await supabaseAdmin
    .from(PROVIDER_TYPES[providerType].table)
    .select('id, owner_id, name, email, phone, address, city, state, pincode')
    .in('id', providerIds);

  if (providersError) throw providersError;

  const providerById = new Map((providers || []).filter((row) => row?.id).map((row) => [row.id, row]));
  const ownerContactMap = await buildUserContactMap((providers || []).map((row) => row.owner_id));

  return associations
    .map((association) => {
      const provider = providerById.get(association.provider_id);
      if (!provider) return null;
      return {
        associationId: association.id,
        providerId: provider.id,
        providerType,
        providerLabel: PROVIDER_TYPES[providerType].label,
        associatedAt: association.accepted_at || association.created_at || null,
        ...mapProviderSummary(provider, ownerContactMap),
      };
    })
    .filter(Boolean);
};

const unlinkProviderFromFacility = async ({ facilityType, facilityId, providerType, providerId }) => {
  assertFacilityType(facilityType);
  assertProviderType(providerType);

  const { data, error } = await supabaseAdmin
    .from('facility_provider_associations')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('facility_type', facilityType)
    .eq('facility_id', facilityId)
    .eq('provider_type', providerType)
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ApiError(404, 'Association not found');
  }

  return data;
};

const getProviderInvites = async ({ providerType, ownerId }) => {
  assertProviderType(providerType);
  const provider = await getProviderByOwner(providerType, ownerId);

  const { data: invites, error: invitesError } = await supabaseAdmin
    .from('facility_provider_invites')
    .select('id, facility_type, facility_id, status, invited_by, expires_at, responded_at, created_at')
    .eq('provider_type', providerType)
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });

  if (invitesError) throw invitesError;
  if (!invites || invites.length === 0) return [];

  const hospitalIds = invites.filter((row) => row.facility_type === 'hospital').map((row) => row.facility_id);
  const clinicIds = invites.filter((row) => row.facility_type === 'clinic').map((row) => row.facility_id);

  const [
    { data: hospitals, error: hospitalsError },
    { data: clinics, error: clinicsError },
    invitedByMap,
  ] = await Promise.all([
    hospitalIds.length
      ? supabaseAdmin.from('hospitals').select('id, owner_id, name, email, phone, address, city, state, pincode').in('id', hospitalIds)
      : Promise.resolve({ data: [], error: null }),
    clinicIds.length
      ? supabaseAdmin.from('clinics').select('id, owner_id, name, email, phone, address, city, state, pincode').in('id', clinicIds)
      : Promise.resolve({ data: [], error: null }),
    buildUserContactMap(invites.map((row) => row.invited_by)),
  ]);

  if (hospitalsError) throw hospitalsError;
  if (clinicsError) throw clinicsError;

  const facilityOwnerContacts = await buildUserContactMap([
    ...(hospitals || []).map((row) => row.owner_id),
    ...(clinics || []).map((row) => row.owner_id),
  ]);

  const hospitalById = new Map((hospitals || []).map((row) => [row.id, row]));
  const clinicById = new Map((clinics || []).map((row) => [row.id, row]));

  return invites.map((invite) => {
    const facility = invite.facility_type === 'hospital'
      ? hospitalById.get(invite.facility_id)
      : clinicById.get(invite.facility_id);

    return {
      id: invite.id,
      facility_type: invite.facility_type,
      facility_id: invite.facility_id,
      provider_type: providerType,
      status: invite.status,
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      responded_at: invite.responded_at,
      facility: facility ? mapFacilitySummary(facility, facilityOwnerContacts, invite.facility_type) : null,
      invitedBy: invitedByMap.get(invite.invited_by) || null,
    };
  });
};

const respondToProviderInvite = async ({ providerType, ownerId, inviteId, decision }) => {
  assertProviderType(providerType);
  const provider = await getProviderByOwner(providerType, ownerId);
  const normalizedDecision = decision === 'accept' ? 'accept' : decision === 'reject' ? 'reject' : null;

  if (!normalizedDecision) {
    throw new ApiError(400, 'Decision must be accept or reject');
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('facility_provider_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('provider_type', providerType)
    .eq('provider_id', provider.id)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) throw new ApiError(404, 'Invite not found');
  if (invite.status !== 'pending') throw new ApiError(409, 'Invite has already been handled');

  const nowIso = new Date().toISOString();
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from('facility_provider_invites')
      .update({
        status: 'expired',
        responded_at: nowIso,
      })
      .eq('id', invite.id);
    throw new ApiError(409, 'Invite has expired');
  }

  const nextStatus = normalizedDecision === 'accept' ? 'accepted' : 'rejected';
  const { error: updateInviteError } = await supabaseAdmin
    .from('facility_provider_invites')
    .update({
      status: nextStatus,
      responded_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', invite.id);

  if (updateInviteError) throw updateInviteError;

  if (normalizedDecision === 'accept') {
    const { error: associationError } = await supabaseAdmin
      .from('facility_provider_associations')
      .upsert({
        facility_type: invite.facility_type,
        facility_id: invite.facility_id,
        provider_type: providerType,
        provider_id: provider.id,
        invited_by: invite.invited_by,
        accepted_by: ownerId,
        is_active: true,
        accepted_at: nowIso,
        updated_at: nowIso,
      }, {
        onConflict: 'facility_type,facility_id,provider_type,provider_id',
      });

    if (associationError) throw associationError;
  }

  return {
    id: invite.id,
    status: nextStatus,
  };
};

const getProviderAssociations = async ({ providerType, ownerId }) => {
  assertProviderType(providerType);
  const provider = await getProviderByOwner(providerType, ownerId);

  const { data: associations, error: associationsError } = await supabaseAdmin
    .from('facility_provider_associations')
    .select('id, facility_type, facility_id, accepted_at, created_at')
    .eq('provider_type', providerType)
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .order('accepted_at', { ascending: false });

  if (associationsError) throw associationsError;
  if (!associations || associations.length === 0) return [];

  const hospitalIds = associations.filter((row) => row.facility_type === 'hospital').map((row) => row.facility_id);
  const clinicIds = associations.filter((row) => row.facility_type === 'clinic').map((row) => row.facility_id);

  const [
    { data: hospitals, error: hospitalsError },
    { data: clinics, error: clinicsError },
  ] = await Promise.all([
    hospitalIds.length
      ? supabaseAdmin.from('hospitals').select('id, owner_id, name, email, phone, address, city, state, pincode').in('id', hospitalIds)
      : Promise.resolve({ data: [], error: null }),
    clinicIds.length
      ? supabaseAdmin.from('clinics').select('id, owner_id, name, email, phone, address, city, state, pincode').in('id', clinicIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (hospitalsError) throw hospitalsError;
  if (clinicsError) throw clinicsError;

  const facilityOwnerContacts = await buildUserContactMap([
    ...(hospitals || []).map((row) => row.owner_id),
    ...(clinics || []).map((row) => row.owner_id),
  ]);

  const hospitalById = new Map((hospitals || []).map((row) => [row.id, row]));
  const clinicById = new Map((clinics || []).map((row) => [row.id, row]));

  return associations
    .map((association) => {
      const facility = association.facility_type === 'hospital'
        ? hospitalById.get(association.facility_id)
        : clinicById.get(association.facility_id);
      if (!facility) return null;

      return {
        associationId: association.id,
        facilityId: facility.id,
        facilityType: association.facility_type,
        associatedAt: association.accepted_at || association.created_at || null,
        ...mapFacilitySummary(facility, facilityOwnerContacts, association.facility_type),
      };
    })
    .filter(Boolean);
};

module.exports = {
  inviteProviderForFacility,
  getFacilityAssociations,
  unlinkProviderFromFacility,
  getProviderInvites,
  respondToProviderInvite,
  getProviderAssociations,
};
