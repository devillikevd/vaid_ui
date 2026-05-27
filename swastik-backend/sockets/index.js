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

// Redis-backed connected users tracking (Bug 3 fix)
const CONNECTED_PREFIX = 'socket:connected:';
const RATE_LIMIT_PREFIX = 'socket:ratelimit:';
const TRACKING_PREFIX = 'socket:tracking:';

// Token revalidation interval (Bug 5 fix) — check every 5 minutes
const TOKEN_REVALIDATION_INTERVAL_MS = 5 * 60 * 1000;

// Allowed roles for each action
const AMBULANCE_ROLES = ['ambulance_operator', 'ambulance_driver', 'admin'];
const GLOBAL_DISPATCH_ROLES = ['admin', 'super_admin', 'ambulance_operator', 'ambulance_driver'];
const HOSPITAL_DISPATCH_ROLES = ['hospital_owner', 'hospital_manager'];
const DISPATCH_ROLES = [...new Set([...GLOBAL_DISPATCH_ROLES, ...HOSPITAL_DISPATCH_ROLES])];
const TRACKING_ROLES = ['patient', 'ambulance_operator', 'ambulance_driver', 'hospital_owner', 'hospital_manager', 'admin', 'super_admin'];
const VIDEO_ROLES = ['doctor', 'patient'];
const CHAT_ROLES = ['doctor', 'patient'];

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

      const decoded = jwt.verify(token, config.jwt.accessSecret);
      // I8 Fix: Enforce token expiry explicitly (belt-and-suspenders with jwt.verify)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return next(new Error('Token expired'));
      }
      socket.userId = decoded.userId || decoded.id;
      socket.userRole = decoded.role;
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
          trackedRooms.forEach((requestId) => {
            socket.join(`ambulance:${requestId}`);
          });
        }
      } catch {}
    })();

    // Bug 5 fix: Periodic token revalidation — disconnect if token expired or revoked
    const tokenCheckInterval = setInterval(async () => {
      try {
        // Check if token has expired
        if (socket.tokenExp && socket.tokenExp * 1000 < Date.now()) {
          console.log(`🔌 Token expired for user ${userId}, disconnecting`);
          socket.emit('error', { message: 'Token expired', code: 'TOKEN_EXPIRED' });
          socket.disconnect(true);
          return;
        }
        // Check if user still exists and hasn't been deactivated
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, is_active, is_verified')
          .eq('id', userId)
          .single();
        if (!user) {
          socket.emit('error', { message: 'Account not found', code: 'ACCOUNT_REMOVED' });
          socket.disconnect(true);
        } else if (!user.is_active) {
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

      const locationPayload = {
        requestId: data.requestId || null,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
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
    }));

    socket.on('video:leave', safeHandler(socket, (roomId) => {
      if (!roomId || typeof roomId !== 'string') return;
      socket.leave(`video:${roomId}`);
      socket.to(`video:${roomId}`).emit('video:user-left', {
        userId: userId,
      });
    }));

    socket.on('video:offer', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'offer'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;
      socket.to(`video:${data.roomId}`).emit('video:offer', {
        offer: data.offer,
        from: userId,
      });
    }));

    socket.on('video:answer', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'answer'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;
      socket.to(`video:${data.roomId}`).emit('video:answer', {
        answer: data.answer,
        from: userId,
      });
    }));

    socket.on('video:ice-candidate', safeHandler(socket, async (data) => {
      if (!hasRole(socket, VIDEO_ROLES)) return;
      if (!validateData(data, ['roomId', 'candidate'])) return;
      if (!await ensureConsultationRoomAccess(socket, 'video', data.roomId)) return;
      socket.to(`video:${data.roomId}`).emit('video:ice-candidate', {
        candidate: data.candidate,
        from: userId,
      });
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

    socket.on('chat:message', safeHandler(socket, (data) => {
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
      (async () => {
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
      })();
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

    // ==================== DISCONNECT ====================

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
