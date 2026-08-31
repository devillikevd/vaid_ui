const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const notificationService = require('./notificationService');

const ORG_TYPES = {
  hospital: { table: 'hospitals', label: 'Hospital' },
  clinic: { table: 'clinics', label: 'Clinic' },
  pharmacy: { table: 'pharmacies', label: 'Pharmacy' },
  diagnostic_center: { table: 'diagnostic_centers', label: 'Diagnostic Center' }
};

const assertOrgType = (type) => {
  if (!ORG_TYPES[type]) throw new ApiError(400, 'Invalid organization type');
};

const getCanonicalOrder = (typeA, idA, typeB, idB) => {
  if (typeA < typeB || (typeA === typeB && idA < idB)) {
    return { org_a_type: typeA, org_a_id: idA, org_b_type: typeB, org_b_id: idB, isReversed: false };
  }
  return { org_a_type: typeB, org_a_id: idB, org_b_type: typeA, org_b_id: idA, isReversed: true };
};

const buildOrgDetailsMap = async (orgsList) => {
  const map = new Map();
  const groupedByType = {};
  
  for (const org of orgsList) {
    if (!groupedByType[org.type]) groupedByType[org.type] = [];
    groupedByType[org.type].push(org.id);
  }

  for (const [type, ids] of Object.entries(groupedByType)) {
    if (!ORG_TYPES[type] || ids.length === 0) continue;
    const uniqueIds = [...new Set(ids)];
    
    let selectFields = 'id, name, city, state, address, image_url, phone, rating';
    if (type === 'pharmacy') {
      selectFields += ', is_verified, is_approved';
    } else {
      selectFields += ', is_approved';
    }

    const { data } = await supabaseAdmin
      .from(ORG_TYPES[type].table)
      .select(selectFields)
      .in('id', uniqueIds);
      
    if (data) {
      data.forEach(item => {
        const isVerified = item.is_verified || item.is_approved || false;
        map.set(`${type}_${item.id}`, { ...item, is_verified: isVerified, type, typeLabel: ORG_TYPES[type].label });
      });
    }
  }
  return map;
};

const mapPartnershipRow = (row, orgId, orgType, orgDetailsMap) => {
  const isInitiator = row.initiated_by_id === orgId && row.initiated_by_type === orgType;
  
  // Determine who the "partner" is from the perspective of the requesting org
  let partnerType, partnerId;
  if (row.org_a_type === orgType && row.org_a_id === orgId) {
    partnerType = row.org_b_type;
    partnerId = row.org_b_id;
  } else {
    partnerType = row.org_a_type;
    partnerId = row.org_a_id;
  }

  const partnerDetails = orgDetailsMap.get(`${partnerType}_${partnerId}`) || {
    id: partnerId, type: partnerType, name: 'Unknown Organization'
  };

  return {
    id: row.id,
    status: row.status,
    partnership_type: row.partnership_type,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    accepted_at: row.accepted_at,
    terminated_at: row.terminated_at,
    is_initiator: isInitiator,
    initiator_type: row.initiated_by_type,
    initiator_id: row.initiated_by_id,
    partner: partnerDetails
  };
};

const getPartnerships = async ({ orgType, orgId, status }) => {
  assertOrgType(orgType);
  
  // 1. Query organization_partnerships
  let query = supabaseAdmin
    .from('organization_partnerships')
    .select('*')
    .or(`and(org_a_type.eq.${orgType},org_a_id.eq.${orgId}),and(org_b_type.eq.${orgType},org_b_id.eq.${orgId})`)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: rows, error } = await query;
  if (error) throw new ApiError(500, 'Error fetching partnerships');

  // 2. Query facility_provider_invites where org is facility or provider
  const inviteStatusFilter = status === 'active' ? ['accepted', 'active'] : status ? [status] : null;
  let invitesQuery = supabaseAdmin
    .from('facility_provider_invites')
    .select('*')
    .or(`and(facility_type.eq.${orgType},facility_id.eq.${orgId}),and(provider_type.eq.${orgType},provider_id.eq.${orgId})`)
    .order('updated_at', { ascending: false });

  if (inviteStatusFilter) {
    invitesQuery = invitesQuery.in('status', inviteStatusFilter);
  }

  const { data: inviteRows } = await invitesQuery;

  // Collect partner IDs to fetch from both tables
  const orgsToFetch = [];
  
  (rows || []).forEach(r => {
    if (r.org_a_type === orgType && r.org_a_id === orgId) {
      orgsToFetch.push({ type: r.org_b_type, id: r.org_b_id });
    } else {
      orgsToFetch.push({ type: r.org_a_type, id: r.org_a_id });
    }
  });

  (inviteRows || []).forEach(inv => {
    if (inv.facility_type === orgType && inv.facility_id === orgId) {
      orgsToFetch.push({ type: inv.provider_type, id: inv.provider_id });
    } else {
      orgsToFetch.push({ type: inv.facility_type, id: inv.facility_id });
    }
  });

  const orgDetailsMap = await buildOrgDetailsMap(orgsToFetch);
  
  const mappedOrgPartnerships = (rows || []).map(row => mapPartnershipRow(row, orgId, orgType, orgDetailsMap));

  const mappedInvitePartnerships = (inviteRows || []).map(inv => {
    const isFacility = inv.facility_type === orgType && inv.facility_id === orgId;
    const partnerType = isFacility ? inv.provider_type : inv.facility_type;
    const partnerId = isFacility ? inv.provider_id : inv.facility_id;
    const partnerDetails = orgDetailsMap.get(`${partnerType}_${partnerId}`) || {
      id: partnerId, type: partnerType, name: 'Unknown Organization'
    };

    return {
      id: inv.id,
      status: ['accepted', 'active'].includes(inv.status) ? 'active' : inv.status,
      partnership_type: 'network_affiliation',
      metadata: {},
      created_at: inv.created_at,
      updated_at: inv.updated_at,
      accepted_at: inv.responded_at,
      terminated_at: null,
      is_initiator: isFacility,
      initiator_type: inv.facility_type,
      initiator_id: inv.facility_id,
      partner: partnerDetails
    };
  });

  // Merge and deduplicate by partner type & id
  const merged = [];
  const seenPartners = new Set();

  for (const p of [...mappedOrgPartnerships, ...mappedInvitePartnerships]) {
    const key = `${p.partner?.type}_${p.partner?.id}`;
    if (!seenPartners.has(key)) {
      seenPartners.add(key);
      merged.push(p);
    }
  }

  return merged;
};

const getPartnershipById = async (id, orgType, orgId) => {
  const { data: row, error } = await supabaseAdmin
    .from('organization_partnerships')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !row) throw new ApiError(404, 'Partnership not found');

  if (!(row.org_a_type === orgType && row.org_a_id === orgId) && 
      !(row.org_b_type === orgType && row.org_b_id === orgId)) {
    throw new ApiError(403, 'Unauthorized access to partnership');
  }

  const partnerType = row.org_a_type === orgType && row.org_a_id === orgId ? row.org_b_type : row.org_a_type;
  const partnerId = row.org_a_type === orgType && row.org_a_id === orgId ? row.org_b_id : row.org_a_id;

  const orgDetailsMap = await buildOrgDetailsMap([{ type: partnerType, id: partnerId }]);
  return mapPartnershipRow(row, orgId, orgType, orgDetailsMap);
};

const createPartnershipRequest = async ({ initiatorType, initiatorId, initiatorUserId, targetType, targetId, partnershipType, metadata = {} }) => {
  assertOrgType(initiatorType);
  assertOrgType(targetType);

  if (initiatorType === targetType && initiatorId === targetId) {
    throw new ApiError(400, 'Cannot partner with self');
  }

  const canonical = getCanonicalOrder(initiatorType, initiatorId, targetType, targetId);

  // Check for existing records
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('organization_partnerships')
    .select('id, status')
    .eq('org_a_type', canonical.org_a_type)
    .eq('org_a_id', canonical.org_a_id)
    .eq('org_b_type', canonical.org_b_type)
    .eq('org_b_id', canonical.org_b_id);

  if (checkError) throw new ApiError(500, 'Error checking existing partnerships');

  if (existing && existing.length > 0) {
    const active = existing.find(e => ['pending', 'changes_requested', 'active'].includes(e.status));
    if (active) {
      const msg = active.status === 'active'
        ? 'This organization is already an active partner.'
        : 'A partnership request already exists with this organization.';
      throw new ApiError(409, msg);
    }
  }

  let finalRow;
  const formerRow = existing && existing.find(e => ['terminated', 'rejected', 'cancelled'].includes(e.status));

  if (formerRow) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('organization_partnerships')
      .update({
        status: 'pending',
        initiated_by_type: initiatorType,
        initiated_by_id: initiatorId,
        initiated_by_user_id: initiatorUserId,
        partnership_type: partnershipType || null,
        metadata: { ...(formerRow.metadata || {}), ...metadata, reconnected_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
        accepted_at: null,
        terminated_at: null
      })
      .eq('id', formerRow.id)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      throw new ApiError(500, 'Failed to request partnership reconnection');
    }
    finalRow = updated;
  } else {
    const { data: newRow, error: insertError } = await supabaseAdmin
      .from('organization_partnerships')
      .insert({
        org_a_type: canonical.org_a_type,
        org_a_id: canonical.org_a_id,
        org_b_type: canonical.org_b_type,
        org_b_id: canonical.org_b_id,
        initiated_by_type: initiatorType,
        initiated_by_id: initiatorId,
        initiated_by_user_id: initiatorUserId,
        status: 'pending',
        partnership_type: partnershipType || null,
        metadata
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      throw new ApiError(500, 'Failed to create partnership request');
    }
    finalRow = newRow;
  }

  // Notify target organization owner
  try {
    const { data: targetOrg } = await supabaseAdmin
      .from(ORG_TYPES[targetType].table)
      .select('owner_id, name')
      .eq('id', targetId)
      .maybeSingle();

    if (targetOrg?.owner_id) {
      const { data: initOrg } = await supabaseAdmin
        .from(ORG_TYPES[initiatorType].table)
        .select('name')
        .eq('id', initiatorId)
        .maybeSingle();

      notificationService.sendNotification(targetOrg.owner_id, {
        type: 'partnership_invite_received',
        category: 'partnership',
        title: 'New Partnership Invitation',
        message: `${initOrg?.name || 'A healthcare organization'} has invited you to connect for care coordination.`,
        action_url: `/${targetType.replace('_', '-')}/partnerships`,
        data: { partnershipId: finalRow.id }
      }).catch((e) => {
        console.warn('[Partnership sendNotification warning]', e.message);
      });
    }
  } catch (notifErr) {
    console.warn('[Partnership Invite Notification Failed]', notifErr.message);
  }
  
  return finalRow;
};

const sendInvite = async (initiatorType, initiatorId, targetType, targetId, initiatorUserId, partnershipType, metadata) => {
  return createPartnershipRequest({
    initiatorType,
    initiatorId,
    initiatorUserId,
    targetType,
    targetId,
    partnershipType,
    metadata
  });
};

const updatePartnershipStatus = async (id, currentOrgType, currentOrgId, newStatus, additionalData = {}) => {
  const { data: row, error } = await supabaseAdmin
    .from('organization_partnerships')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !row) throw new ApiError(404, 'Partnership not found');

  if (!(row.org_a_type === currentOrgType && row.org_a_id === currentOrgId) && 
      !(row.org_b_type === currentOrgType && row.org_b_id === currentOrgId)) {
    throw new ApiError(403, 'Unauthorized access to partnership');
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('organization_partnerships')
    .update({ status: newStatus, ...additionalData })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw new ApiError(500, `Failed to update partnership to ${newStatus}`);

  // TODO: Trigger appropriate notification based on new status
  
  return updated;
};

const respondToPartnershipRequest = async (id, currentOrgType, currentOrgId, action) => {
  if (!['accept', 'reject'].includes(action)) throw new ApiError(400, 'Invalid action');
  
  const newStatus = action === 'accept' ? 'active' : 'rejected';
  const additional = action === 'accept' ? { accepted_at: new Date().toISOString() } : {};
  
  return updatePartnershipStatus(id, currentOrgType, currentOrgId, newStatus, additional);
};

const requestChanges = async (id, currentOrgType, currentOrgId, changesMsg, metadataUpdates = {}) => {
  const { data: row } = await supabaseAdmin
    .from('organization_partnerships')
    .select('metadata')
    .eq('id', id)
    .single();
    
  if (!row) throw new ApiError(404, 'Partnership not found');
  
  const newMetadata = { 
    ...row.metadata, 
    ...metadataUpdates,
    last_changes_message: changesMsg,
    changes_requested_by: currentOrgType
  };
  
  return updatePartnershipStatus(id, currentOrgType, currentOrgId, 'changes_requested', { metadata: newMetadata });
};

const acceptChanges = async (id, currentOrgType, currentOrgId) => {
  return updatePartnershipStatus(id, currentOrgType, currentOrgId, 'active', { accepted_at: new Date().toISOString() });
};

const cancelRequest = async (id, currentOrgType, currentOrgId) => {
  return updatePartnershipStatus(id, currentOrgType, currentOrgId, 'cancelled');
};

const terminatePartnership = async (id, currentOrgType, currentOrgId) => {
  return updatePartnershipStatus(id, currentOrgType, currentOrgId, 'terminated', { terminated_at: new Date().toISOString() });
};

const verifyActivePartnership = async (initiatorType, initiatorId, targetType, targetId) => {
  const canonical = getCanonicalOrder(initiatorType, initiatorId, targetType, targetId);
  
  const { data: orgPartnership } = await supabaseAdmin
    .from('organization_partnerships')
    .select('id, status, metadata')
    .eq('org_a_type', canonical.org_a_type)
    .eq('org_a_id', canonical.org_a_id)
    .eq('org_b_type', canonical.org_b_type)
    .eq('org_b_id', canonical.org_b_id)
    .eq('status', 'active')
    .maybeSingle();
    
  if (orgPartnership) {
    return orgPartnership;
  }

  // Check facility_provider_invites (e.g. hospital/clinic with pharmacy/diagnostic)
  const { data: facilityInvite } = await supabaseAdmin
    .from('facility_provider_invites')
    .select('id, status, facility_type, facility_id, provider_type, provider_id')
    .or(`and(facility_type.eq.${initiatorType},facility_id.eq.${initiatorId},provider_type.eq.${targetType},provider_id.eq.${targetId}),and(facility_type.eq.${targetType},facility_id.eq.${targetId},provider_type.eq.${initiatorType},provider_id.eq.${initiatorId})`)
    .in('status', ['accepted', 'active'])
    .maybeSingle();

  if (facilityInvite) {
    return facilityInvite;
  }
  
  throw new ApiError(403, `Active partnership required between ${initiatorType} and ${targetType}`);
};

module.exports = {
  getPartnerships,
  getPartnershipById,
  createPartnershipRequest,
  sendInvite,
  respondToPartnershipRequest,
  requestChanges,
  acceptChanges,
  cancelRequest,
  terminatePartnership,
  verifyActivePartnership
};
