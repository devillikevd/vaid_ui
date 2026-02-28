/**
 * Notification Service
 * User notifications, push notifications, device registration, email fallback
 */
const { supabaseAdmin } = require('../config/supabase');
const config = require('../config');

// ==================== Email Fallback ====================
const { sendNotificationEmail } = require('./emailService');

// Critical notification types that warrant email fallback
const EMAIL_CRITICAL_TYPES = [
  'appointment_confirmed',
  'appointment_cancelled',
  'sos_update',
  'sos_accepted',
  'prescription_ready',
  'emergency',
  'consultation_started',
];

/**
 * Send email notification as fallback when push notification fails or user has no FCM token.
 * Only sends for critical notification types.
 */
const sendEmailFallback = async (userId, notification) => {
  try {
    // Only send email for critical types
    if (!EMAIL_CRITICAL_TYPES.includes(notification.type)) return;

    // Look up user's email and name
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (!user?.email) return;

    await sendNotificationEmail(user.email, user.name, notification);
    console.log(`[EMAIL] Fallback sent to user ${userId} (${user.email})`);
  } catch (err) {
    console.error(`[EMAIL] Fallback failed for user ${userId}:`, err.message);
  }
};

// ==================== FCM Push Helper ====================
/**
 * Sends a Firebase Cloud Messaging push notification to a user.
 * Uses FCM HTTP v1 API via Google OAuth2 service account, or falls back
 * to legacy API. Gracefully no-ops if firebase-admin is not configured.
 */
let firebaseApp = null;
let firebaseInitFailed = false;

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;
  if (firebaseInitFailed) return null;

  try {
    const admin = require('firebase-admin');
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountPath) {
      console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT env var not set — push notifications disabled');
      firebaseInitFailed = true;
      return null;
    }

    const serviceAccount = require(serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[FCM] Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (err) {
    console.warn('[FCM] Firebase Admin init failed — push disabled:', err.message);
    firebaseInitFailed = true;
    return null;
  }
};

/**
 * Send push notification to a user via FCM if they have an fcm_token.
 * @param {string} userId - User ID to send push to
 * @param {Object} notification - { title, message, type, data }
 */
const sendPushNotification = async (userId, notification) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      // FCM not configured — try email for critical notifications
      await sendEmailFallback(userId, notification);
      return;
    }

    // Look up user's FCM token
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('fcm_token, device_type')
      .eq('id', userId)
      .single();

    if (!user?.fcm_token) {
      // No FCM token — try email for critical notifications
      await sendEmailFallback(userId, notification);
      return;
    }

    const admin = require('firebase-admin');
    const message = {
      token: user.fcm_token,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        type: notification.type || 'info',
        ...(notification.data ? Object.fromEntries(
          Object.entries(notification.data).map(([k, v]) => [k, String(v)])
        ) : {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'swastik_default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    await admin.messaging(app).send(message);
    console.log(`[FCM] Push sent to user ${userId}`);
  } catch (err) {
    // Token may be invalid/expired — clean up and try email
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      console.warn(`[FCM] Invalid token for user ${userId}, cleaning up & sending email`);
      await supabaseAdmin
        .from('users')
        .update({ fcm_token: null })
        .eq('id', userId);
      // Fallback to email for critical notifications
      await sendEmailFallback(userId, notification);
    } else {
      console.error(`[FCM] Push failed for user ${userId}:`, err.message);
      // Also try email when push fails entirely
      await sendEmailFallback(userId, notification);
    }
  }
};

// Get user notifications (used by routes/notifications.js)
const getUserNotifications = async (userId, page = 1, limit = 20, unreadOnly = false) => {
  const offset = (page - 1) * limit;
  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    notifications: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// Get notifications (alias for routes/notification/index.js)
const getNotifications = async (userId, page = 1, limit = 20) => {
  return getUserNotifications(userId, page, limit, false);
};

// Get unread count
const getUnreadCount = async (userId) => {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

// Mark as read
const markAsRead = async (userId, notificationId) => {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return { message: 'Notification marked as read', data };
};

// Mark all as read
const markAllAsRead = async (userId) => {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return { message: 'All notifications marked as read' };
};

// Delete notification
const deleteNotification = async (userId, notificationId) => {
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
  return { message: 'Notification deleted' };
};

// Clear all notifications
const clearAllNotifications = async (userId) => {
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
  return { message: 'All notifications cleared' };
};

// Register device for push notifications
const registerDevice = async (userId, fcmToken, deviceType) => {
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      fcm_token: fcmToken,
    })
    .eq('id', userId);

  if (error) throw error;
  return { message: 'Device registered for push notifications' };
};

// Create notification (used internally by other services)
const createNotification = async (userId, notification) => {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      data: notification.data || {},
      is_read: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Send notification — creates persistent DB record + emits via Socket.IO + FCM push
// This is the primary method other services should call.
const sendNotification = async (userId, notification) => {
  const data = await createNotification(userId, notification);

  // Also emit via Socket.IO for real-time delivery
  try {
    const eventEmitter = require('./eventEmitter');
    const io = eventEmitter.getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        id: data.id,
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        timestamp: data.created_at,
      });
    }
  } catch {
    // Socket not available — notification is still persisted in DB
  }

  // Send FCM push notification (non-blocking)
  sendPushNotification(userId, notification).catch(() => {});

  return data;
};

module.exports = {
  getUserNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  registerDevice,
  createNotification,
  sendNotification,
  sendPushNotification,
  sendEmailFallback,
};
