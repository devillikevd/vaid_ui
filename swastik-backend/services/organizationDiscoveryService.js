const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { ROLES } = require('../middleware/rbac');

const ORG_TABLE_MAP = {
  hospital: { table: 'hospitals', label: 'Hospital', defaultType: 'hospital' },
  clinic: { table: 'clinics', label: 'Clinic', defaultType: 'clinic' },
  pharmacy: { table: 'pharmacies', label: 'Pharmacy', defaultType: 'pharmacy' },
  diagnostic_center: { table: 'diagnostic_centers', label: 'Diagnostic Lab', defaultType: 'diagnostic_center' }
};

/**
 * Normalizes input org type into canonical keys: 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic_center'
 */
const normalizeOrgType = (type) => {
  if (!type) return 'hospital';
  const t = String(type).toLowerCase().trim();
  if (['diagnostic_center', 'diagnostic_lab', 'diagnostic', 'diagnostics', 'lab', 'labs'].includes(t)) {
    return 'diagnostic_center';
  }
  if (['hospital', 'hospitals'].includes(t)) return 'hospital';
  if (['pharmacy', 'pharmacies', 'chemist'].includes(t)) return 'pharmacy';
  if (['clinic', 'clinics'].includes(t)) return 'clinic';
  return t;
};

/**
 * Resolves the caller organization context from the authenticated user.
 */
const resolveCallerOrg = async (user) => {
  if (!user || !user.id) return null;

  const role = user.role;

  // 1. Clinic
  if ([ROLES.CLINIC_OWNER, ROLES.CLINIC_STAFF].includes(role)) {
    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (clinic) {
      return { type: 'clinic', id: clinic.id, name: clinic.name };
    }

    // Check clinic_members
    const { data: member } = await supabaseAdmin
      .from('clinic_members')
      .select('clinic_id, clinics(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (member && member.clinics) {
      return { type: 'clinic', id: member.clinics.id, name: member.clinics.name };
    }
  }

  // 2. Hospital
  if ([ROLES.HOSPITAL_ADMIN, ROLES.HOSPITAL_STAFF].includes(role)) {
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (hospital) {
      return { type: 'hospital', id: hospital.id, name: hospital.name };
    }

    const { data: member } = await supabaseAdmin
      .from('hospital_staff')
      .select('hospital_id, hospitals(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (member && member.hospitals) {
      return { type: 'hospital', id: member.hospitals.id, name: member.hospitals.name };
    }
  }

  // 3. Diagnostic Center
  if ([ROLES.DIAGNOSTIC_OWNER, ROLES.DIAGNOSTIC_STAFF].includes(role)) {
    const { data: center } = await supabaseAdmin
      .from('diagnostic_centers')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (center) {
      return { type: 'diagnostic_center', id: center.id, name: center.name };
    }
  }

  // 4. Pharmacy
  if ([ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER, ROLES.PHARMACY_STAFF].includes(role)) {
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (pharmacy) {
      return { type: 'pharmacy', id: pharmacy.id, name: pharmacy.name };
    }
  }

  // 5. Fallback check across tables by owner_id
  const [cRes, hRes, dRes, pRes] = await Promise.all([
    supabaseAdmin.from('clinics').select('id, name').eq('owner_id', user.id).maybeSingle(),
    supabaseAdmin.from('hospitals').select('id, name').eq('owner_id', user.id).maybeSingle(),
    supabaseAdmin.from('diagnostic_centers').select('id, name').eq('owner_id', user.id).maybeSingle(),
    supabaseAdmin.from('pharmacies').select('id, name').eq('owner_id', user.id).maybeSingle(),
  ]);

  if (cRes.data) return { type: 'clinic', id: cRes.data.id, name: cRes.data.name };
  if (hRes.data) return { type: 'hospital', id: hRes.data.id, name: hRes.data.name };
  if (dRes.data) return { type: 'diagnostic_center', id: dRes.data.id, name: dRes.data.name };
  if (pRes.data) return { type: 'pharmacy', id: pRes.data.id, name: pRes.data.name };

  return null;
};

/**
 * Discover registered organizations with relationship status enriched against the caller org.
 */
const discoverOrganizations = async (user, { type = 'hospital', query = '', page = 1, limit = 50 }) => {
  const canonicalTargetType = normalizeOrgType(type);
  const orgConfig = ORG_TABLE_MAP[canonicalTargetType];

  if (!orgConfig) {
    throw new ApiError(400, `Unsupported organization type: ${type}`);
  }

  const callerOrg = await resolveCallerOrg(user);
  const callerOrgId = callerOrg?.id || null;
  const callerOrgType = callerOrg?.type || null;

  // 1. Fetch matching registered organizations from the database
  let dbQuery = supabaseAdmin
    .from(orgConfig.table)
    .select('id, name, city, state, address, phone, email, image_url, rating, is_active, is_approved')
    .not('is_active', 'eq', false);

  // Filter out caller's own organization if target type matches caller type
  if (callerOrgType === canonicalTargetType && callerOrgId) {
    dbQuery = dbQuery.neq('id', callerOrgId);
  }

  const cleanQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
  const normalizeText = (str) => (str || '').toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  const normalizedQuery = normalizeText(cleanQuery);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  // Use database ILIKE for single-word queries when alphanumeric
  if (tokens.length === 1 && tokens[0].length >= 2) {
    const safeToken = tokens[0].replace(/[%_,()'"\\]/g, '').trim();
    if (safeToken) {
      dbQuery = dbQuery.or(`name.ilike.%${safeToken}%,city.ilike.%${safeToken}%,address.ilike.%${safeToken}%`);
    }
  }

  const { data: rawOrgs, error: searchError } = await dbQuery
    .order('name', { ascending: true })
    .limit(Math.min(100, Math.max(1, parseInt(limit) || 50)));

  if (searchError) {
    console.error('[Organization Discovery Error]', searchError);
    throw new ApiError(500, `Failed to search ${orgConfig.label}s`);
  }

  let candidateOrgs = rawOrgs || [];

  // 2. Perform comprehensive multi-word and partial matching & relevance scoring
  if (normalizedQuery && tokens.length > 0) {
    const scored = candidateOrgs.map(org => {
      const name = (org.name || '').toLowerCase();
      const normName = normalizeText(org.name);
      const city = (org.city || '').toLowerCase();
      const normCity = normalizeText(org.city);
      const address = (org.address || '').toLowerCase();
      const normAddress = normalizeText(org.address);
      const state = (org.state || '').toLowerCase();
      const normState = normalizeText(org.state);
      const combined = `${name} ${city} ${address} ${state}`;
      const normCombined = `${normName} ${normCity} ${normAddress} ${normState}`;

      let score = 0;

      if (normName === normalizedQuery || name === cleanQuery) {
        score += 100;
      } else if (normName.startsWith(normalizedQuery) || name.startsWith(cleanQuery)) {
        score += 60;
      } else if (normName.includes(normalizedQuery) || name.includes(cleanQuery)) {
        score += 40;
      } else if (normCombined.includes(normalizedQuery) || combined.includes(cleanQuery)) {
        score += 25;
      }

      // Check tokens
      const allTokensInName = tokens.every(tok => normName.includes(tok));
      const allTokensInCombined = tokens.every(tok => normCombined.includes(tok));

      if (allTokensInName) {
        score += 30;
      } else if (allTokensInCombined) {
        score += 20;
      }

      let anyTokenMatch = false;
      for (const tok of tokens) {
        if (normName.includes(tok)) {
          score += 10;
          anyTokenMatch = true;
        } else if (normCombined.includes(tok)) {
          score += 5;
          anyTokenMatch = true;
        }
      }

      const isMatch = (score > 0) || allTokensInCombined || anyTokenMatch;

      return { org, score, isMatch };
    });

    candidateOrgs = scored
      .filter(s => s.isMatch)
      .sort((a, b) => b.score - a.score || (a.org.name || '').localeCompare(b.org.name || ''))
      .map(s => s.org);
  }

  if (candidateOrgs.length === 0) {
    return [];
  }

  // 2. Query existing partnerships with caller org to compute real-time relationship states
  const candidateIds = candidateOrgs.map(o => o.id);
  const partnershipMap = new Map();

  if (callerOrgId && callerOrgType) {
    // Query unified organization_partnerships
    const { data: partnerships } = await supabaseAdmin
      .from('organization_partnerships')
      .select('*')
      .or(
        `and(org_a_type.eq.${callerOrgType},org_a_id.eq.${callerOrgId}),and(org_b_type.eq.${callerOrgType},org_b_id.eq.${callerOrgId})`
      );

    if (partnerships && partnerships.length > 0) {
      for (const p of partnerships) {
        let partnerType, partnerId;
        if (p.org_a_type === callerOrgType && p.org_a_id === callerOrgId) {
          partnerType = p.org_b_type;
          partnerId = p.org_b_id;
        } else {
          partnerType = p.org_a_type;
          partnerId = p.org_a_id;
        }

        if (partnerType === canonicalTargetType && candidateIds.includes(partnerId)) {
          partnershipMap.set(partnerId, p);
        }
      }
    }

    // Also check legacy facility_provider_invites for facility-pharmacy/diagnostic relationships
    const { data: legacyInvites } = await supabaseAdmin
      .from('facility_provider_invites')
      .select('*')
      .or(
        `and(facility_type.eq.${callerOrgType},facility_id.eq.${callerOrgId}),and(provider_type.eq.${callerOrgType},provider_id.eq.${callerOrgId})`
      );

    if (legacyInvites && legacyInvites.length > 0) {
      for (const inv of legacyInvites) {
        let partnerType, partnerId;
        if (inv.facility_type === callerOrgType && inv.facility_id === callerOrgId) {
          partnerType = inv.provider_type;
          partnerId = inv.provider_id;
        } else {
          partnerType = inv.facility_type;
          partnerId = inv.facility_id;
        }

        if (partnerType === canonicalTargetType && candidateIds.includes(partnerId) && !partnershipMap.has(partnerId)) {
          partnershipMap.set(partnerId, {
            id: inv.id,
            status: inv.status === 'accepted' ? 'active' : inv.status,
            initiated_by_type: inv.facility_type,
            initiated_by_id: inv.facility_id,
            created_at: inv.created_at
          });
        }
      }
    }
  }

  // 3. Format and enrich each organization record with canonical status and actionable capabilities
  const enrichedList = candidateOrgs.map(org => {
    const partnership = partnershipMap.get(org.id);
    let relationshipStatus = 'not_connected';
    let partnershipId = null;
    let isInitiator = false;

    if (partnership) {
      partnershipId = partnership.id;
      isInitiator = (partnership.initiated_by_type === callerOrgType && partnership.initiated_by_id === callerOrgId);

      if (partnership.status === 'active') {
        relationshipStatus = 'connected';
      } else if (partnership.status === 'pending') {
        relationshipStatus = isInitiator ? 'invitation_sent' : 'invitation_received';
      } else if (partnership.status === 'changes_requested') {
        relationshipStatus = 'changes_requested';
      } else if (['terminated', 'rejected', 'cancelled'].includes(partnership.status)) {
        relationshipStatus = 'former';
      }
    }

    const isVerified = Boolean(org.is_approved || org.is_verified || true);

    return {
      id: org.id,
      name: org.name || 'Healthcare Organization',
      type: canonicalTargetType,
      typeLabel: orgConfig.label,
      city: org.city || '',
      state: org.state || '',
      address: org.address || '',
      phone: org.phone || null,
      email: org.email || null,
      rating: org.rating || 4.5,
      image_url: org.image_url || null,
      is_verified: isVerified,
      relationship_status: relationshipStatus,
      partnership_id: partnershipId,
      can_request_partnership: relationshipStatus === 'not_connected',
      can_reconnect: relationshipStatus === 'former',
      is_connected: relationshipStatus === 'connected',
      is_pending: relationshipStatus === 'invitation_sent' || relationshipStatus === 'invitation_received'
    };
  });

  return enrichedList;
};

/**
 * Detailed profile view for an organization during discovery.
 */
const getOrganizationDetails = async (user, { orgType, orgId }) => {
  const canonicalType = normalizeOrgType(orgType);
  const orgConfig = ORG_TABLE_MAP[canonicalType];
  if (!orgConfig) throw new ApiError(400, 'Invalid organization type');

  const { data: org, error } = await supabaseAdmin
    .from(orgConfig.table)
    .select('*')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    throw new ApiError(404, 'Organization not found');
  }

  const callerOrg = await resolveCallerOrg(user);
  let relationshipStatus = 'not_connected';
  let partnershipId = null;

  if (callerOrg?.id && callerOrg?.type) {
    const { data: partnership } = await supabaseAdmin
      .from('organization_partnerships')
      .select('*')
      .or(
        `and(org_a_type.eq.${callerOrg.type},org_a_id.eq.${callerOrg.id},org_b_type.eq.${canonicalType},org_b_id.eq.${orgId}),and(org_a_type.eq.${canonicalType},org_a_id.eq.${orgId},org_b_type.eq.${callerOrg.type},org_b_id.eq.${callerOrg.id})`
      )
      .maybeSingle();

    if (partnership) {
      partnershipId = partnership.id;
      if (partnership.status === 'active') relationshipStatus = 'connected';
      else if (partnership.status === 'pending') {
        relationshipStatus = (partnership.initiated_by_type === callerOrg.type && partnership.initiated_by_id === callerOrg.id)
          ? 'invitation_sent'
          : 'invitation_received';
      } else if (['terminated', 'rejected', 'cancelled'].includes(partnership.status)) {
        relationshipStatus = 'former';
      }
    }
  }

  return {
    id: org.id,
    name: org.name,
    type: canonicalType,
    typeLabel: orgConfig.label,
    city: org.city || '',
    state: org.state || '',
    address: org.address || '',
    phone: org.phone || null,
    email: org.email || null,
    rating: org.rating || 4.5,
    image_url: org.image_url || null,
    is_verified: Boolean(org.is_approved || org.is_verified || true),
    relationship_status: relationshipStatus,
    partnership_id: partnershipId,
    can_request_partnership: relationshipStatus === 'not_connected',
    can_reconnect: relationshipStatus === 'former'
  };
};

module.exports = {
  discoverOrganizations,
  getOrganizationDetails,
  resolveCallerOrg,
  normalizeOrgType
};
