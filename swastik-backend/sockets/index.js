/**
 * Socket.IO Initialization
 * Handles all real-time events: notifications, ambulance tracking, video, chat
 *
 * Fixes applied:
 *   - Bug 3: connectedUsers, rateLimiters moved from in-memory Map to Redis
 *   - Bug 5: Periodic token revalidation + force-disconnect on logout
 *   - Chat messages persisted to MongoDB
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { calculateDistance, calculateETA } = require('../utils/geo');
const dispatchService = require('../services/dispatchService');
const eventEmitter = require('../services/eventEmitter');
const hospitalManagerService = require('../services/hospitalManagerService');
const { getMongoConnection } = require('../config/mongodb');

// Redis-backed connected users tracking (Bug 3 fix)
const CONNECTED_PREFIX = 'socket:connected:';
const RATE_LIMIT_PREFIX = 'socket:ratelimit:';
const TRACKING_PREFIX = 'socket:tracking:';

// Token revalidation interval (Bug 5 fix) — check every 5 minutes
const TOKEN_REVALIDATION_INTERVAL_MS = 60 * 1000;

// Allowed roles for each action
const AMBULANCE_ROLES = ['ambulance_operator', 'ambulance_driver', 'admin'];
const GLOBAL_DISPATCH_ROLES = ['admin', 'super_admin', 'ambulance_operator', 'ambulance_driver'];
const HOSPITAL_DISPATCH_ROLES = ['hospital_owner', 'hospital_manager'];
const DISPATCH_ROLES = [...new Set([...GLOBAL_DISPATCH_ROLES, ...HOSPITAL_DISPATCH_ROLES])];
const TRACKING_ROLES = ['patient', 'ambulance_operator', 'ambulance_driver', 'hospital_owner', 'hospital_manager', 'admin', 'super_admin'];
const VIDEO_ROLES = ['doctor', 'patient'];
const CHAT_ROLES = ['doctor', 'patient'];
const WELLNESS_CHAT_ROLES = ['patient', 'wellness_coach'];

// Helper: wrap socket event handlers with async try-catch
const safeHandler = (socket, handler) => {
  return (...args) => {
    try {
      const result = handler(...args);
      // Handle async errors
      if (result && typeof result.catch === 'function') {
        result.catch((err) => {
          console.error(`Socket async error [${socket.userId}]:`, err.message);
          socket.emit('error', { message: 'An unexpected error occurred' });
        });
      }
    } catch (err) {
      console.error(`Socket error [${socket.userId}]:`, err.message);
      socket.emit('error', { message: 'An unexpected error occurred' });
    }
  };
};

// Helper: check if socket user has one of the allowed roles
const hasRole = (socket, allowedRoles) => {
  return allowedRoles.includes(socket.userRole);
};
// Helper: validate required fields in data object
const validateData = (data, requiredFields) => {
  if (!data || typeof data !== 'object') return false;
  return requiredFields.every((field) => data[field] !== undefined && data[field] !== null);
};

const verifyConsultationParticipant = async (userId, role, consultationId) => {
  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('doctor_id, patient_id')
    .eq('id', consultationId)
    .single();

  if (!consultation) {
    throw new Error('Consultation not found');
  }

  const table = role === 'doctor' ? 'doctors' : 'patients';
  const { data: record } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .single();

  const participantId = record?.id;
  const isParticipant =
    participantId === consultation.doctor_id ||
    participantId === consultation.patient_id;

  if (!isParticipant) {
    throw new Error('Access denied: you are not a participant in this consultation');
  }

  return consultation;
};

const ensureConsultationRoomAccess = async (socket, roomPrefix, roomId) => {
  if (!roomId || typeof roomId !== 'string') return false;

  const room = `${roomPrefix}:${roomId}`;
  socket.verifiedConsultationRooms ||= new Set();

  if (!socket.verifiedConsultationRooms.has(room)) {
    try {
      await verifyConsultationParticipant(socket.userId, socket.userRole, roomId);
      socket.verifiedConsultationRooms.add(room);
    } catch (dbErr) {
      console.warn(`C10: Ownership check failed for ${room}, user ${socket.userId}:`, dbErr.message);
      socket.emit('error', { message: dbErr.message || 'Unable to verify consultation access' });
      return false;
    }
  }

  if (!socket.rooms.has(room)) {
    socket.join(room);
  }
  return true;
};

// Wellness session chat — verifies that the user is the coach or patient of the session.
const verifyWellnessSessionParticipant = async (userId, role, sessionId) => {
  if (!WELLNESS_CHAT_ROLES.includes(role)) {
    throw new Error('Unauthorized: wellness chat access denied');
  }

  const { data: session, error } = await supabaseAdmin
    .from('wellness_sessions')
    .select('id, coach_id, patient_id, status, scheduled_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) throw new Error('Wellness session not found');

  const table = role === 'patient' ? 'patients' : 'wellness_coaches';
  const { data: record } = await supabaseAdmin
    .from(table)
    .select('id, user_id')
    .eq('user_id', userId)
    .single();

  const participantId = record?.id;
  const isParticipant =
    role === 'patient'
      ? participantId === session.patient_id
      : participantId === session.coach_id;

  if (!isParticipant) {
    throw new Error('Access denied: you are not a participant of this wellness session');
  }

  const participantUserIds = await (async () => {
    const [patientRow, coachRow] = await Promise.all([
      supabaseAdmin.from('patients').select('user_id').eq('id', session.patient_id).single(),
      supabaseAdmin.from('wellness_coaches').select('user_id').eq('id', session.coach_id).single(),
    ]);
    return {
      patientUserId: patientRow.data?.user_id || null,
      coachUserId: coachRow.data?.user_id || null,
    };
  })();

  return { session, ...participantUserIds };
};

const ensureWellnessChatRoomAccess = async (socket, sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') return false;

  const room = `wellness:chat:${sessionId}`;
  socket.verifiedWellnessChatRooms ||= new Set();
  socket.wellnessSessions ||= {};

  if (!socket.verifiedWellnessChatRooms.has(room)) {
    try {
      const verified = await verifyWellnessSessionParticipant(socket.userId, socket.userRole, sessionId);
      socket.verifiedWellnessChatRooms.add(room);
      socket.wellnessSessions[room] = verified;
    } catch (dbErr) {
      console.warn(`Wellness chat access check failed for ${room}, user ${socket.userId}:`, dbErr.message);
      socket.emit('error', { message: dbErr.message || 'Unable to verify wellness session access' });
      return false;
    }
  }

  if (!socket.rooms.has(room)) {
    socket.join(room);
  }
  return true;
};

const logSignalingEvent = async (roomId, userId, eventType, data = {}) => {
  try {
    const connection = getMongoConnection();
    const db = connection ? connection.db : null;
    if (!db) return;
    
    // Check for TURN relay usage
    let isTurnUsed = false;
    let candidateType = null;
    let candidateProtocol = null;
    let candidateTcpType = null;
    if (eventType === 'ice-candidate' && data.candidate && typeof data.candidate.candidate === 'string') {
      const candidateParts = data.candidate.candidate.trim().split(/\s+/);
      candidateProtocol = candidateParts[2]?.toLowerCase() || null;
      const typeIndex = candidateParts.indexOf('typ');
      const tcpTypeIndex = candidateParts.indexOf('tcptype');
      candidateType = typeIndex >= 0 ? candidateParts[typeIndex + 1] || null : null;
      candidateTcpType = tcpTypeIndex >= 0 ? candidateParts[tcpTypeIndex + 1] || null : null;
      isTurnUsed = candidateType === 'relay';
    }
    
    await db.collection('webrtc_signaling_logs').insertOne({
      consultationId: roomId,
      userId,
      eventType,
      isTurnUsed,
      candidateType,
      candidateProtocol,
      candidateTcpType,
      timestamp: new Date()
    });
  } catch (err) {
    console.warn('Failed to log signaling event:', err.message);
  }
};

const initializeSocketIO = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      if (socket.handshake.query?.token) {
        return next(new Error('Query token authentication is not allowed'));
      }
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret, { algorithms: ['HS256'] });
      if (decoded.type && decoded.type !== 'access') {
        return next(new Error('Invalid token type'));
      }
      // I8 Fix: Enforce token expiry explicitly (belt-and-suspenders with jwt.verify)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return next(new Error('Token expired'));
      }
      const socketUserId = decoded.userId || decoded.id;
      const { data: socketUser } = await supabaseAdmin
        .from('users')
        .select('id, role, is_active, is_verified, token_version')
        .eq('id', socketUserId)
        .maybeSingle();
      const currentTokenVersion = Number(socketUser?.token_version || 0);
      const presentedTokenVersion = Number(decoded.tokenVersion || 0);
      if (!socketUser || !socketUser.is_active || !socketUser.is_verified || currentTokenVersion !== presentedTokenVersion) {
        return next(new Error('Invalid or revoked token'));
      }
      socket.userId = socketUser.id;
      socket.userRole = socketUser.role;
      socket.tokenVersion = presentedTokenVersion;
      socket.tokenExp = decoded.exp; // Store for periodic checks
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId} [${socket.userRole}] (${socket.id})`);

    // Track user connection in Redis (Bug 3 fix)
    cacheSet(`${CONNECTED_PREFIX}${userId}`, socket.id, 86400); // 24h TTL
    socket.join(`user:${userId}`);

    // Auto-join role-specific channel so we can broadcast role-targeted events
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Re-join any active ambulance tracking rooms on reconnect (from Redis)
    (async () => {
      try {
        const trackedRooms = await cacheGet(`${TRACKING_PREFIX}${userId}`);
        if (trackedRooms && Array.isArray(trackedRooms)) {
          const stillAuthorized = [];
          for (const requestId of trackedRooms) {
            try {
              await dispatchService.assertEmergencyAccess(
                { id: userId, role: socket.userRole },
                requestId,
                { allowBroadcastAccess: true, action: 'track' }
              );
              socket.join(`ambulance:${requestId}`);
              stillAuthorized.push(requestId);
            } catch (_) { /* revoked/stale room: deliberately skipped */ }
          }
          if (stillAuthorized.length > 0) await cacheSet(`${TRACKING_PREFIX}${userId}`, stillAuthorized, 86400);
          else await cacheDel(`${TRACKING_PREFIX}${userId}`);
        }
      } catch {}
    })();

    // Bug 5 fix: Periodic token revalidation — disconnect if token expired or revoked
    const tokenCheckInterval = setInterval(async () => {
      try {
        // Check if token has expired
        if (socket.tokenExp && socket.tokenExp * 1000 < Date.now()) {
          console.log(`🔌 Token expired for user ${userId}, disconnecting`);
          socket.emit('auth:expired', { message: 'Token expired', code: 'TOKEN_EXPIRED' });
          socket.disconnect(true);
          return;
        }
        // Check if user still exists and hasn't been deactivated
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, is_active, is_verified, role, token_version')
          .eq('id', userId)
          .single();
        if (!user) {
          socket.emit('error', { message: 'Account not found', code: 'ACCOUNT_REMOVED' });
          socket.disconnect(true);
        } else if (!user.is_active || !user.is_verified || user.role !== socket.userRole || Number(user.token_version || 0) !== socket.tokenVersion) {
          socket.emit('error', { message: 'Account deactivated', code: 'ACCOUNT_DEACTIVATED' });
          socket.disconnect(true);
        }
      } catch {}
    }, TOKEN_REVALIDATION_INTERVAL_MS);

    // Listen for force-logout event (from auth service when user logs out)
    socket.on('auth:logout', safeHandler(socket, () => {
      console.log(`🔌 User ${userId} logged out, disconnecting socket`);
      socket.disconnect(true);
    }));

    // ==================== NOTIFICATIONS ====================

    socket.on('subscribe:notifications', safeHandler(socket, () => {
      socket.join(`notifications:${userId}`);
    }));

    // Explicit role-channel subscription (complements auto-join on connect)
    socket.on('subscribe:role', safeHandler(socket, () => {
      if (socket.userRole) {
        socket.join(`role:${socket.userRole}`);
      }
    }));

    // ==================== AMBULANCE DISPATCH & TRACKING ====================

    // Join dispatch room(s) appropriate for the current role.
    socket.on('ambulance:join-dispatch', safeHandler(socket, async () => {
      if (!hasRole(socket, DISPATCH_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: dispatch access denied' });
      }

      if (GLOBAL_DISPATCH_ROLES.includes(socket.userRole)) {
        socket.join('ambulance:dispatch');
      }

      if (HOSPITAL_DISPATCH_ROLES.includes(socket.userRole)) {
        let hospital = null;
        try {
          hospital = await hospitalManagerService.getHospitalByOwner(userId);
        } catch (err) {
          if (err?.statusCode === 404) {
            return socket.emit('error', { message: 'Hospital profile not found for dispatch access' });
          }
          throw err;
        }

        const hospitalRoom = eventEmitter.getHospitalDispatchRoom(hospital?.id);
        if (!hospitalRoom) {
          return socket.emit('error', { message: 'Hospital dispatch room unavailable' });
        }

        socket.join(hospitalRoom);
        socket.hospitalDispatchRoom = hospitalRoom;
      }
    }));

    socket.on('ambulance:leave-dispatch', safeHandler(socket, () => {
      socket.leave('ambulance:dispatch');
      if (socket.hospitalDispatchRoom) {
        socket.leave(socket.hospitalDispatchRoom);
        socket.hospitalDispatchRoom = null;
      }
    }));

    // Track a specific emergency request — with ownership verification
    socket.on('ambulance:track', safeHandler(socket, async (requestId) => {
      if (!requestId || typeof requestId !== 'string') return;
      if (!hasRole(socket, TRACKING_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: tracking access denied' });
      }

      try {
        await dispatchService.assertEmergencyAccess(
          { id: userId, role: socket.userRole },
          requestId,
          { allowBroadcastAccess: true, action: 'track' }
        );
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 403) {
          return socket.emit('error', { message: err.message });
        }
        throw err;
      }

      socket.join(`ambulance:${requestId}`);
      // Remember for reconnect in Redis (Bug 3 fix)
      (async () => {
        try {
          const existing = await cacheGet(`${TRACKING_PREFIX}${userId}`) || [];
          if (!existing.includes(requestId)) {
            existing.push(requestId);
            await cacheSet(`${TRACKING_PREFIX}${userId}`, existing, 86400);
          }
        } catch {}
      })();
    }));

    socket.on('ambulance:untrack', safeHandler(socket, (requestId) => {
      if (!requestId || typeof requestId !== 'string') return;
      socket.leave(`ambulance:${requestId}`);
      // Clean up reconnect tracking in Redis
      (async () => {
        try {
          const existing = await cacheGet(`${TRACKING_PREFIX}${userId}`) || [];
          const updated = existing.filter((id) => id !== requestId);
          if (updated.length > 0) {
            await cacheSet(`${TRACKING_PREFIX}${userId}`, updated, 86400);
          } else {
            await cacheDel(`${TRACKING_PREFIX}${userId}`);
          }
        } catch {}
      })();
    }));

    // Driver broadcasts location (high-frequency GPS) — ambulance roles only, rate-limited
    socket.on('ambulance:location', safeHandler(socket, async (data) => {
      if (!hasRole(socket, AMBULANCE_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: only ambulance operators can broadcast location' });
      }

      // Rate limit: max 1 location update per second per driver (Redis-backed)
      const now = Date.now();
      const rateLimitKey = `${RATE_LIMIT_PREFIX}driver:${userId}`;
      const lastPingStr = await cacheGet(rateLimitKey);
      const lastPing = lastPingStr ? parseInt(lastPingStr, 10) : 0;
      if (now - lastPing < 1000) return; // silently drop
      cacheSet(rateLimitKey, now.toString(), 10); // 10s TTL for cleanup

      // Allow location updates with or without requestId
      if (!validateData(data, ['latitude', 'longitude'])) return;

      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return socket.emit('error', { message: 'Invalid location coordinates' });
      }

      if (data.requestId) {
        try {
          await dispatchService.assertEmergencyAccess(
            { id: userId, role: socket.userRole },
            data.requestId,
            { allowBroadcastAccess: false, action: 'publish location for' }
          );
        } catch (err) {
          return socket.emit('error', { message: err.message || 'Location update denied' });
        }
      }

      const locationPayload = {
        requestId: data.requestId || null,
        latitude,
        longitude,
        heading: data.heading || 0,
        speed: data.speed || 0,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to the specific request room if requestId provided
      // Include ETA if we can look up the pickup point
      if (data.requestId) {
        // Non-blocking ETA computation — look up pickup coords from cache or DB
        (async () => {
          let requestMeta = null;
          try {
            const { data: req } = await supabaseAdmin
              .from('emergency_requests')
              .select('pickup_latitude, pickup_longitude, hospital_id, destination_hospital_id')
              .eq('id', data.requestId)
              .single();
            requestMeta = req || null;
            if (req?.pickup_latitude && req?.pickup_longitude) {
              const distKm = calculateDistance(
                { latitude: locationPayload.latitude, longitude: locationPayload.longitude },
                { latitude: req.pickup_latitude, longitude: req.pickup_longitude }
              );
              locationPayload.distanceKm = Math.round(distKm * 10) / 10;
              locationPayload.eta = calculateETA(distKm, 40);
            }
          } catch { /* ETA is best-effort */ }
          eventEmitter.emitEmergencyDispatch('ambulance:location-update', {
            ...locationPayload,
            hospitalId: requestMeta?.hospital_id || null,
            destinationHospitalId: requestMeta?.destination_hospital_id || null,
          });
          io.to(`ambulance:${data.requestId}`).emit('ambulance:location-update', locationPayload);
        })();
      } else {
        // No requestId, only admins/operators need the general fleet location stream.
        eventEmitter.emitEmergencyDispatch('ambulance:location-update', locationPayload);
      }

      // Update the DB every 10 seconds to ensure the backend can find nearby ambulances
      const dbRateLimitKey = `${RATE_LIMIT_PREFIX}db_driver:${userId}`;
      const lastDbPingStr = await cacheGet(dbRateLimitKey);
      const lastDbPing = lastDbPingStr ? parseInt(lastDbPingStr, 10) : 0;
      if (now - lastDbPing >= 10000) {
        cacheSet(dbRateLimitKey, now.toString(), 30);
        try {
          const ambulanceService = require('../services/ambulanceService');
          await ambulanceService.updateLocation(
            userId,
            locationPayload.latitude,
            locationPayload.longitude,
            locationPayload.heading,
            locationPayload.speed
          );
        } catch (err) {
          console.warn('[sockets] failed to update DB location:', err.message);
        }
      }
    }));

    // Patient sends updated GPS location during active emergency
    socket.on('patient:location-update', safeHandler(socket, async (data) => {
      if (socket.userRole !== 'patient') {
        return socket.emit('error', { message: 'Unauthorized: only patients can send location updates' });
      }
      if (!validateData(data, ['requestId', 'latitude', 'longitude'])) return;

      // Fix #3: Verify patient owns this emergency request
      const { data: patientRecord } = await supabaseAdmin
        .from('patients').select('id').eq('user_id', userId).single();
      if (patientRecord) {
        const { data: requestRecord } = await supabaseAdmin
          .from('emergency_requests').select('id').eq('id', data.requestId)
          .eq('patient_id', patientRecord.id).single();
        if (!requestRecord) {
          return socket.emit('error', { message: 'Request not found or access denied' });
        }
      } else {
        return socket.emit('error', { message: 'Patient profile not found' });
      }

      // Rate limit: max 1 per 5 seconds per patient (Redis-backed)
      const now = Date.now();
      const rateLimitKey = `${RATE_LIMIT_PREFIX}patient:${userId}`;
      const lastPingStr = await cacheGet(rateLimitKey);
      const lastPing = lastPingStr ? parseInt(lastPingStr, 10) : 0;
      if (now - lastPing < 5000) return;
      cacheSet(rateLimitKey, now.toString(), 30); // 30s TTL

      const payload = {
        requestId: data.requestId,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timestamp: new Date().toISOString(),
      };

      // Broadcast to the ambulance tracking room so the driver sees updated pickup location
      io.to(`ambulance:${data.requestId}`).emit('patient:location-update', payload);

      // Also update pickup coordinates in the DB for persistence
      try {
        await supabaseAdmin
          .from('emergency_requests')
          .update({
            pickup_latitude: payload.latitude,
            pickup_longitude: payload.longitude,
            pickup_address: `${payload.latitude}, ${payload.longitude}`,
          })
          .eq('id', data.requestId);
      } catch (err) {
        console.warn('Failed to persist patient location update:', err.message);
      }
    }));

    // Driver sends status update — calls the actual service layer for DB persistence
    socket.on('ambulance:status-update', safeHandler(socket, async (data) => {
      if (!hasRole(socket, AMBULANCE_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: only ambulance operators can update status' });
      }
      if (!validateData(data, ['requestId', 'status'])) return;

      const validStatuses = ['en_route', 'arrived', 'picked_up', 'en_route_hospital', 'arrived_hospital', 'completed', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        return socket.emit('error', { message: `Invalid status: ${data.status}. Valid: ${validStatuses.join(', ')}` });
      }

      // Call the actual dispatch service to persist to DB + trigger notifications
      try {
        const dispatchService = require('../services/dispatchService');
        await dispatchService.updateStatus(userId, data.requestId, data.status, {
          reason: data.reason,
          hospitalId: data.hospitalId,
        });
        // dispatchService.updateStatus already emits via eventEmitter, no double-emit needed
      } catch (err) {
        console.error(`Socket ambulance:status-update DB error:`, err.message);
        socket.emit('error', { message: err.message || 'Failed to update status' });
      }
    }));

    // Driver accepts SOS broadcast via socket — calls actual service for atomic DB accept
    socket.on('ambulance:accept', safeHandler(socket, async (data) => {
      if (!hasRole(socket, AMBULANCE_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: only ambulance operators can accept requests' });
      }
      if (!validateData(data, ['requestId'])) return;

      try {
        const dispatchService = require('../services/dispatchService');
        const result = await dispatchService.acceptRequest(userId, data.requestId);
        socket.emit('ambulance:accept-result', { success: true, ...result });
        // dispatchService.acceptRequest already emits to dispatch room + patient
      } catch (err) {
        console.error(`Socket ambulance:accept DB error:`, err.message);
        socket.emit('ambulance:accept-result', { success: false, message: err.message });
      }
    }));

    // ==================== VIDEO CONSULTATION ====================

    socket.on('video:join', safeHandler(socket, async (roomId) => {
      if (!hasRole(socket, VIDEO_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: video access denied' });
      }
      if (!roomId || typeof roomId !== 'string') return;

      if (!await ensureConsultationRoomAccess(socket, 'video', roomId)) return;

      // Send current room state to the joining socket so clients can decide
      // whether they should initiate WebRTC immediately even if peers joined earlier.
      try {
        const roomSockets = await io.in(`video:${roomId}`).fetchSockets();
        const participantUserIds = roomSockets
          .filter((s) => s.id !== socket.id)
          .map((s) => s.userId)
          .filter(Boolean);

        socket.emit('video:room-state', {
          roomId,
          participants: Array.from(new Set(participantUserIds)),
          participantCount: participantUserIds.length,
        });
      } catch (stateErr) {
        console.warn(`Failed to emit video:room-state for ${roomId}:`, stateErr.message);
      }

      socket.to(`video:${roomId}`).emit('video:user-joined', {
        userId: userId,
        socketId: socket.id,
        role: socket.userRole,
      });
      logSignalingEvent(roomId, userId, 'join', { role: socket.userRole });
    }));

    socket.on('video:leave', safeHandler(socket, (roomId) => {
      if (!roomId || typeof roomId !== 'string') return;
      socket.leave(`video:${roomId}`);
      socket.to(`video:${roomId}`).emit('video:user-left', {
        userId: userId,
      });
      logSignalingEvent(roomId, userId, 'leave');
    }));

    socket.on('video:offer', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'offer'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;
      socket.to(`video:${data.roomId}`).emit('video:offer', {
        offer: data.offer,
        from: userId,
      });
      logSignalingEvent(data.roomId, userId, 'offer');
    }));

    socket.on('video:answer', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'answer'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;
      socket.to(`video:${data.roomId}`).emit('video:answer', {
        answer: data.answer,
        from: userId,
      });
      logSignalingEvent(data.roomId, userId, 'answer');
    }));

    socket.on('video:ice-candidate', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'candidate'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;
      socket.to(`video:${data.roomId}`).emit('video:ice-candidate', {
        candidate: data.candidate,
        from: userId,
      });
      logSignalingEvent(data.roomId, userId, 'ice-candidate', { candidate: data.candidate });
    }));

    socket.on('video:mode', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'mode'])) return;
      if (!['video', 'audio', 'chat'].includes(data.mode)) return;
      if (data.preferredMode && !['video', 'audio', 'chat'].includes(data.preferredMode)) return;
      if (data.effectiveMode && !['video', 'audio', 'chat'].includes(data.effectiveMode)) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;

      socket.to(`video:${data.roomId}`).emit('video:mode', {
        roomId: data.roomId,
        mode: data.mode,
        preferredMode: data.preferredMode || 'video',
        effectiveMode: data.effectiveMode || data.mode,
        from: userId,
        timestamp: new Date().toISOString(),
      });
    }));

    socket.on('consultation:ended', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['consultationId'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.consultationId)) return;

      // Broadcast to the other party so they can immediately end the call
      socket.to(`video:${data.consultationId}`).emit('consultation:ended', {
        consultationId: data.consultationId,
        from: userId
      });
    }));

    socket.on('video:ai_proof', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'proofUrl', 'predictionResult'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;

      // Broadcast the AI proof to the other party (doctor) in the live consultation room securely
      socket.to(`video:${data.roomId}`).emit('video:ai_proof', {
        ...data,
        from: userId
      });
      logSignalingEvent(data.roomId, userId, 'ai_proof');
    }));

    // ==================== CONSULTATION CHAT ====================

    socket.on('chat:join', safeHandler(socket, async (consultationId) => {
      if (!hasRole(socket, CHAT_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: chat access denied' });
      }
      if (!consultationId || typeof consultationId !== 'string') return;

      if (!await ensureConsultationRoomAccess(socket, 'chat', consultationId)) return;
      socket.emit('chat:joined', { consultationId });
    }));

    socket.on('chat:leave', safeHandler(socket, (consultationId) => {
      if (!consultationId || typeof consultationId !== 'string') return;
      socket.leave(`chat:${consultationId}`);
    }));

    socket.on('chat:message', safeHandler(socket, async (data) => {
      if (!hasRole(socket, CHAT_ROLES)) return;
      if (!validateData(data, ['consultationId', 'message'])) return;
      if (typeof data.message !== 'string' || data.message.trim().length === 0) return;

      // Fix #24: Enforce message length limit (2000 chars)
      if (data.message.length > 2000) {
        return socket.emit('error', { message: 'Message too long (max 2000 characters)' });
      }

      // Fix: auto-join after participant verification so the first message isn't lost
      // if the client sends immediately after entering fallback chat mode.
      const chatRoom = `chat:${data.consultationId}`;
      if (!await ensureConsultationRoomAccess(socket, 'chat', data.consultationId)) return;

      // Rate limit: max 5 messages per second per user
      const chatRateLimitKey = `${RATE_LIMIT_PREFIX}chat:${userId}`;
      const now = Date.now();
      try {
        const lastStr = await cacheGet(chatRateLimitKey);
        const last = lastStr ? parseInt(lastStr, 10) : 0;
        if (now - last < 200) return; // 200ms = 5 msg/sec
        await cacheSet(chatRateLimitKey, now.toString(), 10);
      } catch { /* rate limit best-effort */ }

      const chatPayload = {
        userId,
        role: socket.userRole,
        message: data.message.trim(),
        timestamp: new Date().toISOString(),
      };

      // BUG-A7 Fix: Use socket.to() instead of io.to() so the sender doesn't
      // receive their own message back (prevents duplicates on both Web and Android).
      // The sender gets a separate 'chat:message:sent' ack for delivery confirmation.
      socket.to(chatRoom).emit('chat:message', chatPayload);
      socket.emit('chat:message:sent', chatPayload);

      // Persist chat message to MongoDB
      try {
        const { ChatMessage } = require('../database/models');
        if (ChatMessage) {
          await ChatMessage.create({
            sessionId: data.consultationId,
            userId,
            role: socket.userRole,
            content: data.message.trim(),
            metadata: { consultationId: data.consultationId, source: 'socket' },
          });
        }
      } catch (err) {
        console.warn('Failed to persist chat message:', err.message);
      }
    }));

    socket.on('chat:typing', safeHandler(socket, async (data) => {
      if (!hasRole(socket, CHAT_ROLES)) return;
      if (!validateData(data, ['consultationId'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'chat', data.consultationId)) return;
      socket.to(`chat:${data.consultationId}`).emit('chat:typing', {
        userId,
        isTyping: !!data.isTyping,
      });
    }));

    // ==================== WELLNESS SESSION CHAT ====================

    socket.on('wellness:chat:join', safeHandler(socket, async (sessionId) => {
      if (!hasRole(socket, WELLNESS_CHAT_ROLES)) {
        return socket.emit('error', { message: 'Unauthorized: wellness chat access denied' });
      }
      if (!sessionId || typeof sessionId !== 'string') return;

      if (!await ensureWellnessChatRoomAccess(socket, sessionId)) return;
      socket.emit('wellness:chat:joined', { sessionId });
    }));

    socket.on('wellness:chat:leave', safeHandler(socket, (sessionId) => {
      if (!sessionId || typeof sessionId !== 'string') return;
      socket.leave(`wellness:chat:${sessionId}`);
    }));

    socket.on('wellness:chat:message', safeHandler(socket, async (data) => {
      if (!hasRole(socket, WELLNESS_CHAT_ROLES)) return;
      if (!validateData(data, ['sessionId', 'message'])) return;
      if (typeof data.message !== 'string' || data.message.trim().length === 0) return;

      if (data.message.length > 2000) {
        return socket.emit('error', { message: 'Message too long (max 2000 characters)' });
      }

      const chatRoom = `wellness:chat:${data.sessionId}`;
      if (!await ensureWellnessChatRoomAccess(socket, data.sessionId)) return;

      const chatRateLimitKey = `${RATE_LIMIT_PREFIX}wellness_chat:${userId}`;
      const now = Date.now();
      try {
        const lastStr = await cacheGet(chatRateLimitKey);
        const last = lastStr ? parseInt(lastStr, 10) : 0;
        if (now - last < 200) return; // 200ms = 5 msg/sec
        await cacheSet(chatRateLimitKey, now.toString(), 10);
      } catch { /* rate limit best-effort */ }

      const chatPayload = {
        userId,
        role: socket.userRole,
        message: data.message.trim(),
        timestamp: new Date().toISOString(),
      };

      socket.to(chatRoom).emit('wellness:chat:message', chatPayload);
      socket.emit('wellness:chat:message:sent', chatPayload);

      // Persist chat message to MongoDB (shared ChatMessage collection, source-tagged)
      try {
        const { ChatMessage } = require('../database/models');
        if (ChatMessage) {
          await ChatMessage.create({
            sessionId: data.sessionId,
            userId,
            role: socket.userRole,
            content: data.message.trim(),
            metadata: { wellnessSessionId: data.sessionId, source: 'wellness_socket' },
          });
        }
      } catch (err) {
        console.warn('Failed to persist wellness chat message:', err.message);
      }
    }));

    socket.on('wellness:chat:typing', safeHandler(socket, async (data) => {
      if (!hasRole(socket, WELLNESS_CHAT_ROLES)) return;
      if (!validateData(data, ['sessionId'])) return;
      if (!await ensureWellnessChatRoomAccess(socket, data.sessionId)) return;
      socket.to(`wellness:chat:${data.sessionId}`).emit('wellness:chat:typing', {
        userId,
        isTyping: !!data.isTyping,
      });
    }));

    // ==================== DOCTOR SLOTS SUBSCRIPTION ====================
    socket.on('doctor:slots:subscribe', safeHandler(socket, (data) => {
      if (!data || !data.doctorId) return;
      socket.join(`doctor:slots:${data.doctorId}`);
    }));

    socket.on('doctor:slots:unsubscribe', safeHandler(socket, (data) => {
      if (!data || !data.doctorId) return;
      socket.leave(`doctor:slots:${data.doctorId}`);
    }));

    // ==================== AGENT TRACKING SUBSCRIPTION ====================
    socket.on('agent:track', safeHandler(socket, (data) => {
      if (!data || !data.trackingToken) return;
      socket.join(`tracking_${data.trackingToken}`);
    }));

    socket.on('agent:untrack', safeHandler(socket, (data) => {
      if (!data || !data.trackingToken) return;
      socket.leave(`tracking_${data.trackingToken}`);
    }));

    socket.on('agent:location-update', safeHandler(socket, (data) => {
      if (!data || !data.trackingToken || data.latitude == null || data.longitude == null) return;
      
      const payload = {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        heading: data.heading || 0,
        speed: data.speed || 0,
        timestamp: new Date().toISOString(),
      };
      
      io.to(`tracking_${data.trackingToken}`).emit('agent:location-update', payload);
    }));

    // ==================== DISCONNECT ====================

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('video:')) {
          const roomId = room.split(':')[1];
          socket.to(room).emit('video:user-left', {
            userId: userId,
          });
          logSignalingEvent(roomId, userId, 'leave', { reason: 'abrupt_disconnect' });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${userId} (${reason})`);
      // Clean up Redis connection tracking
      cacheDel(`${CONNECTED_PREFIX}${userId}`);
      cacheDel(`${RATE_LIMIT_PREFIX}driver:${userId}`);
      cacheDel(`${RATE_LIMIT_PREFIX}patient:${userId}`);
      // Clear token revalidation interval
      clearInterval(tokenCheckInterval);
      // Note: tracking rooms preserved in Redis for reconnect
    });
  });

  // Bug 5 fix: Global logout listener — force-disconnect user's socket from any service
  io.forceDisconnect = (userId) => {
    io.to(`user:${userId}`).emit('auth:force-logout', { message: 'Session ended' });
    io.in(`user:${userId}`).disconnectSockets(true);
    cacheDel(`${CONNECTED_PREFIX}${userId}`);
  };

  return io;
};

// Helper: send notification to specific user
const sendToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Helper: check if user is online (Redis-backed)
const isUserOnline = async (userId) => {
  const socketId = await cacheGet(`${CONNECTED_PREFIX}${userId}`);
  return !!socketId;
};

module.exports = { initializeSocketIO, sendToUser, isUserOnline };
