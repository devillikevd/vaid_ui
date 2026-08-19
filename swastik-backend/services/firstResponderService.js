const { supabaseAdmin } = require('../config/supabase');
const eventEmitter = require('./eventEmitter');

/**
 * Calculates Haversine distance in meters between two coordinates
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// In-memory fallback stores for local development resilience
const memResponders = new Map();
const memBroadcasts = new Map();
const memAssignments = new Map();

class FirstResponderService {
  /**
   * Register or update a user as a First Responder
   */
  async registerResponder(userId, data) {
    const payload = {
      id: data.id || `fr-${userId}`,
      user_id: userId,
      tier: data.tier || 'SAMARITAN',
      skills: Array.isArray(data.skills) ? data.skills : ['CPR', 'FIRST_AID'],
      registration_no: data.registrationNo || null,
      council_name: data.councilName || null,
      cert_document_url: data.certDocumentUrl || null,
      is_verified: true,
      is_on_duty: data.isOnDuty !== undefined ? Boolean(data.isOnDuty) : true,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      last_ping_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data: existing } = await supabaseAdmin
        .from('first_responders')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await supabaseAdmin
          .from('first_responders')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        memResponders.set(userId, updated);
        return updated;
      } else {
        const { data: created, error } = await supabaseAdmin
          .from('first_responders')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        memResponders.set(userId, created);
        return created;
      }
    } catch (err) {
      memResponders.set(userId, { ...payload, id: payload.id || `fr-${userId}` });
      return memResponders.get(userId);
    }
  }

  /**
   * Get responder profile for current user
   */
  async getResponderProfile(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('first_responders')
        .select(`
          *,
          user:users(id, name, phone, email, avatar_url)
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;
    } catch (err) {}

    // Fallback to memory
    return memResponders.get(userId) || null;
  }

  /**
   * Update duty availability status (Available for emergency broadcasts)
   */
  async updateDutyStatus(userId, isOnDuty) {
    const isDuty = Boolean(isOnDuty);
    try {
      const { data, error } = await supabaseAdmin
        .from('first_responders')
        .update({ is_on_duty: isDuty, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        memResponders.set(userId, data);
        return data;
      }
    } catch (err) {}

    const cached = memResponders.get(userId) || { user_id: userId, tier: 'SAMARITAN' };
    cached.is_on_duty = isDuty;
    memResponders.set(userId, cached);
    return cached;
  }

  /**
   * Update live location ping of on-duty responder
   */
  async updateLocation(userId, latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return null;

    try {
      const { data, error } = await supabaseAdmin
        .from('first_responders')
        .update({
          latitude: lat,
          longitude: lng,
          last_ping_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) {
        memResponders.set(userId, data);
        return data;
      }
    } catch (err) {}

    const cached = memResponders.get(userId) || { user_id: userId, tier: 'SAMARITAN' };
    cached.latitude = lat;
    cached.longitude = lng;
    cached.last_ping_at = new Date().toISOString();
    memResponders.set(userId, cached);
    return cached;
  }

  /**
   * Broadcast an emergency to nearby on-duty verified responders within radius
   */
  async broadcastEmergency(data, victimUserId = null) {
    const latitude = parseFloat(data.latitude);
    const longitude = parseFloat(data.longitude);
    const radiusMeters = parseInt(data.radiusMeters, 10) || 2000;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Valid latitude and longitude are required for emergency broadcast');
    }

    let victimName = data.victimName || 'Emergency Victim';
    let victimPhone = data.victimPhone || null;
    let victimBloodGroup = data.victimBloodGroup || null;

    if (victimUserId) {
      try {
        const { data: patient } = await supabaseAdmin
          .from('patients')
          .select('name, phone, blood_group')
          .eq('user_id', victimUserId)
          .maybeSingle();

        if (patient) {
          victimName = patient.name || victimName;
          victimPhone = patient.phone || victimPhone;
          victimBloodGroup = patient.blood_group || victimBloodGroup;
        }
      } catch (_e) {}
    }

    const broadcastPayload = {
      id: `bc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      victim_user_id: victimUserId,
      victim_name: victimName,
      victim_phone: victimPhone,
      victim_blood_group: victimBloodGroup,
      incident_type: data.incidentType || 'CRASH_DETECTED',
      latitude,
      longitude,
      address_text: data.addressText || 'Near Current Location',
      victim_vitals_snapshot: data.vitalsSnapshot || {},
      triage_level: data.triageLevel || 'RED',
      status: 'ACTIVE',
      broadcast_radius_meters: radiusMeters,
      created_at: new Date().toISOString()
    };

    let broadcast = broadcastPayload;
    try {
      const { data: createdB, error: bError } = await supabaseAdmin
        .from('emergency_broadcasts')
        .insert(broadcastPayload)
        .select()
        .single();
      if (!bError && createdB) broadcast = createdB;
    } catch (_e) {}

    memBroadcasts.set(broadcast.id, broadcast);

    // Collect all active responders from DB + Memory
    let allResponders = Array.from(memResponders.values()).filter(r => r.is_on_duty);
    try {
      const { data: dbResponders, error: rError } = await supabaseAdmin
        .from('first_responders')
        .select('id, user_id, tier, skills, latitude, longitude')
        .eq('is_on_duty', true)
        .eq('is_verified', true);
      if (!rError && dbResponders) {
        const seen = new Set(allResponders.map(r => r.id));
        dbResponders.forEach(r => {
          if (!seen.has(r.id)) allResponders.push(r);
        });
      }
    } catch (_e) {}

    const nearbyResponders = allResponders
      .map(r => {
        const distance = calculateDistanceMeters(latitude, longitude, r.latitude, r.longitude);
        const etaSeconds = Math.round(distance / 5.5);
        return {
          ...r,
          distance_meters: distance,
          eta_seconds: etaSeconds
        };
      })
      .filter(r => r.distance_meters <= radiusMeters)
      .sort((a, b) => a.distance_meters - b.distance_meters)
      .slice(0, 8);

    const assignments = nearbyResponders.map(r => ({
      id: `asgn-${broadcast.id}-${r.id}`,
      broadcast_id: broadcast.id,
      responder_id: r.id,
      status: 'NOTIFIED',
      distance_meters: r.distance_meters,
      eta_seconds: r.eta_seconds,
      notified_at: new Date().toISOString()
    }));

    assignments.forEach(a => memAssignments.set(a.id, a));

    try {
      if (assignments.length > 0) {
        await supabaseAdmin.from('emergency_assignments').insert(assignments);
      }
    } catch (_e) {}

    eventEmitter.emit('emergency:broadcast', {
      broadcastId: broadcast.id,
      incidentType: broadcast.incident_type,
      latitude,
      longitude,
      address: broadcast.address_text,
      victimName: broadcast.victim_name,
      victimBloodGroup: broadcast.victim_blood_group,
      notifiedRespondersCount: nearbyResponders.length
    });

    return {
      broadcast,
      notifiedCount: nearbyResponders.length,
      nearbyResponders: nearbyResponders.map(r => ({
        id: r.id,
        name: r.user?.name || `Verified ${r.tier}`,
        tier: r.tier,
        distanceMeters: r.distance_meters,
        etaSeconds: r.eta_seconds
      }))
    };
  }

  /**
   * Get single broadcast details with active assignments
   */
  async getBroadcast(broadcastId) {
    try {
      const { data: broadcast, error } = await supabaseAdmin
        .from('emergency_broadcasts')
        .select(`
          *,
          assignments:emergency_assignments(
            id, status, distance_meters, eta_seconds, responded_at, arrived_at,
            responder:first_responders(
              id, tier, skills, registration_no,
              user:users(id, name, phone, avatar_url)
            )
          )
        `)
        .eq('id', broadcastId)
        .single();

      if (!error && broadcast) return broadcast;
    } catch (_e) {}

    const broadcast = memBroadcasts.get(broadcastId);
    if (!broadcast) throw new Error('Emergency broadcast not found');

    const assignments = Array.from(memAssignments.values()).filter(a => a.broadcast_id === broadcastId);
    return { ...broadcast, assignments };
  }

  /**
   * Responder accepts an emergency broadcast
   */
  async acceptEmergency(broadcastId, responderUserId) {
    const responder = await this.getResponderProfile(responderUserId);
    if (!responder) throw new Error('First responder profile not found');

    let broadcast = memBroadcasts.get(broadcastId);
    if (broadcast) {
      broadcast.status = 'RESPONDER_EN_ROUTE';
      memBroadcasts.set(broadcastId, broadcast);
    }

    try {
      await supabaseAdmin
        .from('emergency_assignments')
        .update({ status: 'ACCEPTED', responded_at: new Date().toISOString() })
        .eq('broadcast_id', broadcastId)
        .eq('responder_id', responder.id);

      const { data: updatedB } = await supabaseAdmin
        .from('emergency_broadcasts')
        .update({ status: 'RESPONDER_EN_ROUTE' })
        .eq('id', broadcastId)
        .select()
        .single();
      if (updatedB) broadcast = updatedB;
    } catch (_e) {}

    eventEmitter.emit('emergency:accepted', {
      broadcastId,
      responderId: responder.id,
      responderTier: responder.tier
    });

    return { broadcast: broadcast || { id: broadcastId, status: 'RESPONDER_EN_ROUTE' }, responder };
  }

  /**
   * Update assignment status (e.g. ARRIVED on scene, COMPLETED)
   */
  async updateAssignmentStatus(broadcastId, responderUserId, status, notes = '') {
    const responder = await this.getResponderProfile(responderUserId);
    if (!responder) throw new Error('First responder profile not found');

    let assignment = Array.from(memAssignments.values()).find(
      a => a.broadcast_id === broadcastId && a.responder_id === responder.id
    );

    if (assignment) {
      assignment.status = status;
      assignment.notes = notes;
      if (status === 'ARRIVED') assignment.arrived_at = new Date().toISOString();
      memAssignments.set(assignment.id, assignment);
    }

    try {
      const updatePayload = {
        status,
        notes,
        ...(status === 'ARRIVED' ? { arrived_at: new Date().toISOString() } : {})
      };
      await supabaseAdmin
        .from('emergency_assignments')
        .update(updatePayload)
        .eq('broadcast_id', broadcastId)
        .eq('responder_id', responder.id);

      if (status === 'ARRIVED') {
        await supabaseAdmin
          .from('emergency_broadcasts')
          .update({ status: 'ON_SCENE' })
          .eq('id', broadcastId);
      }
    } catch (_e) {}

    return assignment || { broadcast_id: broadcastId, responder_id: responder.id, status, notes };
  }

  /**
   * On-scene responder dispatches a verified professional ambulance & pre-alerts hospital
   */
  async dispatchAmbulance(broadcastId, responderUserId, triageLevel = 'RED', notes = '') {
    const broadcast = await this.getBroadcast(broadcastId);
    if (!broadcast) throw new Error('Broadcast not found');

    const emergencyReq = {
      id: `amb-req-${Date.now()}`,
      patient_id: broadcast.victim_user_id || responderUserId,
      emergency_type: broadcast.incident_type === 'CRASH_DETECTED' ? 'accident' : 'trauma',
      description: `Verified on-scene triage [${triageLevel}]: ${notes || 'Immediate ambulance requested by certified first responder.'}`,
      patient_condition: triageLevel === 'RED' ? 'Critical / Life Threat' : 'Urgent / Stable',
      pickup_latitude: broadcast.latitude,
      pickup_longitude: broadcast.longitude,
      pickup_address: broadcast.address_text,
      status: 'searching',
      created_at: new Date().toISOString()
    };

    try {
      const { data: createdReq } = await supabaseAdmin
        .from('emergency_requests')
        .insert(emergencyReq)
        .select()
        .single();
      if (createdReq) Object.assign(emergencyReq, createdReq);

      await supabaseAdmin
        .from('emergency_broadcasts')
        .update({
          ambulance_request_id: emergencyReq.id,
          triage_level: triageLevel,
          status: 'AMBULANCE_DISPATCHED'
        })
        .eq('id', broadcastId);
    } catch (_e) {}

    broadcast.status = 'AMBULANCE_DISPATCHED';
    broadcast.triage_level = triageLevel;
    memBroadcasts.set(broadcastId, broadcast);

    eventEmitter.emit('emergency:ambulance_dispatched', {
      broadcastId,
      ambulanceRequestId: emergencyReq.id,
      triageLevel,
      location: { lat: broadcast.latitude, lng: broadcast.longitude }
    });

    return { broadcast, emergencyRequest: emergencyReq };
  }

  /**
   * List active nearby emergencies for an on-duty responder
   */
  async listActiveNearbyEmergencies(latitude, longitude, radiusMeters = 3000) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    let list = Array.from(memBroadcasts.values()).filter(b =>
      ['ACTIVE', 'RESPONDER_EN_ROUTE', 'ON_SCENE'].includes(b.status)
    );

    try {
      const { data: dbBroadcasts } = await supabaseAdmin
        .from('emergency_broadcasts')
        .select('*')
        .in('status', ['ACTIVE', 'RESPONDER_EN_ROUTE', 'ON_SCENE'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbBroadcasts && dbBroadcasts.length > 0) {
        const seen = new Set(list.map(b => b.id));
        dbBroadcasts.forEach(b => {
          if (!seen.has(b.id)) list.push(b);
        });
      }
    } catch (_e) {}

    return list
      .map(b => {
        const distance = calculateDistanceMeters(lat, lng, b.latitude, b.longitude);
        const etaSeconds = Math.round(distance / 5.5);
        return {
          ...b,
          distance_meters: distance,
          eta_seconds: etaSeconds
        };
      })
      .filter(b => isNaN(lat) || isNaN(lng) || b.distance_meters <= radiusMeters)
      .sort((a, b) => a.distance_meters - b.distance_meters);
  }
}

module.exports = new FirstResponderService();
