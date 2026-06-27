const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

const expirePastAppointments = async () => {
  try {
    const now = new Date();
    // Get IST date string (YYYY-MM-DD)
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayStr = istFormatter.format(now);

    // Get IST time string (HH:mm:ss)
    const istTimeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const currentTimeStr = istTimeFormatter.format(now);

    // Find appointments that are still scheduled/confirmed/in_progress but are in the past
    // condition: date < today OR (date == today AND time < currentTime)
    const { data: pastAppointments, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_date, time_slot')
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .lte('appointment_date', todayStr);

    if (fetchError) throw fetchError;

    if (!pastAppointments || pastAppointments.length === 0) return;

    const toExpireIds = pastAppointments.filter(appt => {
      if (appt.appointment_date < todayStr) return true;
      const apptTimeSlot = appt.time_slot.length === 5 ? `${appt.time_slot}:00` : appt.time_slot;
      return appt.appointment_date === todayStr && apptTimeSlot < currentTimeStr;
    }).map(appt => appt.id);

    if (toExpireIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .in('id', toExpireIds);

      if (updateError) throw updateError;
      logger.info(`Auto-expired ${toExpireIds.length} past appointments.`);
    }
  } catch (error) {
    logger.error('Error in expirePastAppointments cron:', error);
  }
};

module.exports = expirePastAppointments;
