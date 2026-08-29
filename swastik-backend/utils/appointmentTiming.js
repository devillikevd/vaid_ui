/**
 * Canonical Appointment Timing & 10-Minute Consultation Start Eligibility Helper
 * Handles IST (+05:30) date-time parsing and early start gating.
 */

/**
 * Parse an appointment date and time slot into milliseconds in IST (+05:30).
 * Handles formats: 'YYYY-MM-DD', 'YYYY-MM-DDT...', 'HH:MM', 'HH:MM:SS', 'HH:MM - HH:MM'.
 */
const parseAppointmentDateTimeMs = (appointmentDate, timeSlot) => {
  if (!appointmentDate || !timeSlot) return null;

  const datePart = typeof appointmentDate === 'string' && appointmentDate.includes('T')
    ? appointmentDate.split('T')[0]
    : String(appointmentDate).trim();

  // Extract HH:MM from start of timeSlot string
  const timeMatch = String(timeSlot).match(/^(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  const hours = timeMatch[1].padStart(2, '0');
  const minutes = timeMatch[2];
  const formattedTime = `${hours}:${minutes}`;

  const istIsoStr = `${datePart}T${formattedTime}:00+05:30`;
  const ms = Date.parse(istIsoStr);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Check whether an appointment is currently eligible to be started/joined.
 * Canonical Rule: Consultation can be started starting 10 minutes before scheduled start time.
 * Terminal states ('completed', 'cancelled') are strictly barred from starting.
 */
const checkAppointmentStartEligibility = (appointment, nowMs = Date.now()) => {
  if (!appointment) {
    return {
      canStart: false,
      code: 'APPOINTMENT_NOT_FOUND',
      reason: 'Appointment details not found.',
      scheduledStartMs: null,
      startEligibleAtMs: null,
      diffMinutes: 0,
    };
  }

  const status = (appointment.status || '').toLowerCase();
  if (status === 'completed') {
    return {
      canStart: false,
      code: 'APPOINTMENT_COMPLETED',
      reason: 'This appointment has already been completed.',
      scheduledStartMs: null,
      startEligibleAtMs: null,
      diffMinutes: 0,
    };
  }

  if (status === 'cancelled') {
    return {
      canStart: false,
      code: 'APPOINTMENT_CANCELLED',
      reason: 'This appointment has been cancelled.',
      scheduledStartMs: null,
      startEligibleAtMs: null,
      diffMinutes: 0,
    };
  }

  const dateVal = appointment.appointment_date || appointment.date;
  const timeVal = appointment.time_slot || appointment.timeSlot || appointment.time;
  const scheduledStartMs = parseAppointmentDateTimeMs(dateVal, timeVal);

  if (!scheduledStartMs) {
    return {
      canStart: true,
      code: 'NO_SCHEDULED_TIME',
      scheduledStartMs: null,
      startEligibleAtMs: null,
      diffMinutes: 0,
    };
  }

  const tenMinutesBeforeMs = scheduledStartMs - (10 * 60 * 1000);
  const diffMinutes = Math.round((scheduledStartMs - nowMs) / (60 * 1000));

  if (nowMs < tenMinutesBeforeMs) {
    return {
      canStart: false,
      code: 'TOO_EARLY',
      reason: 'Consultation cannot be started yet. You can start it 10 minutes before the scheduled time.',
      scheduledStartMs,
      startEligibleAtMs: tenMinutesBeforeMs,
      diffMinutes,
    };
  }

  return {
    canStart: true,
    code: 'ELIGIBLE',
    scheduledStartMs,
    startEligibleAtMs: tenMinutesBeforeMs,
    diffMinutes,
  };
};

/**
 * Check whether an appointment's scheduled time has already passed in IST (+05:30).
 * Returns true ONLY when nowMs > scheduledStartMs.
 * Returns false for future appointments, exact time, or when timing is unspecified.
 */
const isAppointmentTimePast = (appointmentDate, timeSlot, nowMs = Date.now()) => {
  const scheduledStartMs = parseAppointmentDateTimeMs(appointmentDate, timeSlot);
  if (!scheduledStartMs) return false;
  return nowMs > scheduledStartMs;
};

/**
 * Check whether an appointment can be directly approved vs requires past reschedule handling.
 * Direct approval is allowed whenever scheduledStartMs >= nowMs (or timing is unassigned).
 * Past reschedule handling is required ONLY when nowMs > scheduledStartMs.
 */
const checkAppointmentApprovalEligibility = (appointment, nowMs = Date.now()) => {
  if (!appointment) {
    return { canDirectlyApprove: true, isPast: false, scheduledStartMs: null };
  }
  const dateVal = appointment.appointment_date || appointment.date;
  const timeVal = appointment.time_slot || appointment.timeSlot || appointment.time;
  const scheduledStartMs = parseAppointmentDateTimeMs(dateVal, timeVal);
  if (!scheduledStartMs) {
    return { canDirectlyApprove: true, isPast: false, scheduledStartMs: null };
  }
  const isPast = nowMs > scheduledStartMs;
  return {
    canDirectlyApprove: !isPast,
    isPast,
    scheduledStartMs,
  };
};

module.exports = {
  parseAppointmentDateTimeMs,
  checkAppointmentStartEligibility,
  isAppointmentTimePast,
  checkAppointmentApprovalEligibility,
};

