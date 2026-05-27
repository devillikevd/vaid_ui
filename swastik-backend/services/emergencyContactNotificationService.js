const { supabaseAdmin } = require('../config/supabase');
const notificationService = require('./notificationService');

const ALERT_TYPES = {
  fall_detected: {
    type: 'fall_detected',
    title: 'Fall detected',
    label: 'fall',
    message: (patientName) => `${patientName} may have had a fall. Please check on them now.`,
  },
  car_crash: {
    type: 'crash_sos',
    title: 'Car crash SOS triggered',
    label: 'car crash',
    message: (patientName) => `${patientName} triggered a car crash SOS. Ambulance dispatch has been requested.`,
  },
  sos: {
    type: 'sos_contact_alert',
    title: 'Emergency SOS triggered',
    label: 'SOS',
    message: (patientName) => `${patientName} triggered an emergency SOS. Please check on them now.`,
  },
};

const normalizeAlertType = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (['fall', 'fall_detected', 'fall detected', 'fall_alert'].includes(raw)) return 'fall_detected';
  if (['car_crash', 'crash', 'crash_detected', 'accident', 'vehicle_crash'].includes(raw)) return 'car_crash';
  return 'sos';
};

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

const phoneMatchKey = (phone) => {
  const digits = normalizePhone(phone);
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const phoneCandidates = (phone) => {
  const raw = String(phone || '').trim();
  const digits = normalizePhone(raw);
  const candidates = new Set();
  if (raw) candidates.add(raw);
  if (digits) {
    candidates.add(digits);
    candidates.add(`+${digits}`);
    if (digits.length === 10) {
      candidates.add(`+91${digits}`);
      candidates.add(`91${digits}`);
      candidates.add(`+1${digits}`);
      candidates.add(`1${digits}`);
    }
  }
  return Array.from(candidates);
};

const buildMaps = (contacts = []) => {
  const candidates = new Set();
  const contactPhoneKeys = new Set();

  contacts.forEach((contact) => {
    phoneCandidates(contact.phone).forEach((candidate) => candidates.add(candidate));
    const key = phoneMatchKey(contact.phone);
    if (key) contactPhoneKeys.add(key);
  });

  return {
    candidates: Array.from(candidates),
    contactPhoneKeys,
  };
};

const resolvePatientAndContacts = async (patientUserId) => {
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id, name, user_id')
    .eq('user_id', patientUserId)
    .maybeSingle();

  if (patientError) throw patientError;
  if (!patient) return { patient: null, contacts: [] };

  const { data: contacts, error: contactsError } = await supabaseAdmin
    .from('emergency_contacts')
    .select('id, name, phone, relationship')
    .eq('patient_id', patient.id);

  if (contactsError) throw contactsError;
  return { patient, contacts: contacts || [] };
};

const resolveContactUsers = async (contacts, patientUserId) => {
  const { candidates, contactPhoneKeys } = buildMaps(contacts);
  if (candidates.length === 0) return [];

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, phone')
    .in('phone', candidates);

  if (error) throw error;

  const unique = new Map();
  (users || []).forEach((user) => {
    const key = phoneMatchKey(user.phone);
    if (
      user.id &&
      user.id !== patientUserId &&
      key &&
      contactPhoneKeys.has(key)
    ) {
      unique.set(user.id, user);
    }
  });

  return Array.from(unique.values());
};

const notifyEmergencyContacts = async (patientUserId, alert = {}) => {
  const alertKey = normalizeAlertType(alert.alertType || alert.type);
  const template = ALERT_TYPES[alertKey] || ALERT_TYPES.sos;
  const { patient, contacts } = await resolvePatientAndContacts(patientUserId);

  if (!patient) {
    return {
      alertType: alertKey,
      contactCount: 0,
      matchedUserCount: 0,
      notifiedUserCount: 0,
      skippedContactCount: 0,
      message: 'Patient profile not found',
    };
  }

  const contactUsers = await resolveContactUsers(contacts, patientUserId);
  const patientName = patient.name || 'Your emergency contact';
  const locationUrl = alert.latitude != null && alert.longitude != null
    ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
    : null;
  const idempotencyKey = alert.idempotencyKey ||
    `${alertKey}:${patient.id}:${alert.sourceId || alert.requestId || Date.now()}`;

  const notification = {
    title: template.title,
    message: template.message(patientName),
    type: template.type,
    data: {
      idempotencyKey,
      alertType: alertKey,
      patientId: patient.id,
      patientUserId,
      sourceId: alert.sourceId || alert.requestId || '',
      latitude: alert.latitude ?? '',
      longitude: alert.longitude ?? '',
      locationUrl: locationUrl || '',
      notes: alert.notes || '',
    },
  };

  const results = await Promise.allSettled(
    contactUsers.map((user) => notificationService.sendNotification(user.id, notification))
  );

  return {
    alertType: alertKey,
    contactCount: contacts.length,
    matchedUserCount: contactUsers.length,
    notifiedUserCount: results.filter((result) => result.status === 'fulfilled').length,
    skippedContactCount: Math.max(contacts.length - contactUsers.length, 0),
  };
};

module.exports = {
  notifyEmergencyContacts,
  normalizeAlertType,
  normalizePhone,
  phoneMatchKey,
  phoneCandidates,
};
