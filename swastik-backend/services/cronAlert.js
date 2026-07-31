const logger = require('../config/logger');

const notifyCronAlert = async ({ job, ok, message, durationMs, context = {} }) => {
  const webhookUrl = process.env.CRON_ALERT_WEBHOOK_URL;
  const payload = {
    job,
    ok,
    message,
    durationMs,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (webhookUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      logger.info(`[CronAlert] ${job} alert delivered (${res.status})`);
    } catch (err) {
      logger.warn(`[CronAlert] Failed to deliver ${job} alert: ${err.message}`);
    }
  } else if (!ok) {
    logger.error(`[CronAlert] ${job} FAILED: ${message}`);
  }

  return payload;
};

module.exports = { notifyCronAlert };
