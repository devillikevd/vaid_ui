/**
 * Time Slot Helper Utility
 * Normalizes user-facing time representations (e.g., "11:00 AM - 11:30 AM", "09:30 PM", "9:00 AM", "14:30")
 * into standard PostgreSQL TIME format ('HH:MM:SS') to prevent database syntax exceptions.
 */

const normalizeTimeSlotToTime = (rawSlot) => {
  if (!rawSlot || typeof rawSlot !== 'string') {
    return rawSlot;
  }

  const trimmed = rawSlot.trim();
  if (!trimmed) return trimmed;

  // Match the first time pattern: hours:minutes with optional seconds and optional AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i)
    || trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);

  if (!match) {
    return trimmed;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const meridiem = match[4] ? match[4].toUpperCase() : null;

  if (meridiem) {
    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  // Bounds check
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return trimmed;
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
};

module.exports = {
  normalizeTimeSlotToTime,
};
