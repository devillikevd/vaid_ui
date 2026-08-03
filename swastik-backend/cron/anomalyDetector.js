/**
 * Anomaly Detection Cron Job
 * Scans AuditLogs periodically for suspicious activities like IP switching or role escalation.
 */
const { AuditLog } = require('../database/models');
const logger = require('../utils/logger');

const ANOMALY_THRESHOLDS = {
  ipSwitches: 3, // Alert if 3+ distinct IPs are used by a single user in 1 hour
};

/**
 * Simulate sending a real-time security alert (e.g. to Slack or Email)
 */
const sendSecurityAlert = async (message, level = 'high') => {
  logger.error(`[SECURITY ALERT - ${level.toUpperCase()}] ${message}`);
  // Implementation for sending to Slack/Email would go here
  // e.g. await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message })
};

async function detectAnomalies() {
  try {
    if (!AuditLog) {
      logger.warn('AuditLog model not available. Skipping anomaly detection.');
      return;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const logs = await AuditLog.find({ createdAt: { $gte: oneHourAgo } }).lean();
    if (!logs || logs.length === 0) return;

    const userIps = {};
    const roleEscalations = [];

    for (const log of logs) {
      if (log.userId && log.ipAddress) {
        if (!userIps[log.userId]) userIps[log.userId] = new Set();
        userIps[log.userId].add(log.ipAddress);
      }

      if (log.action && (log.action === 'admin.user_role_update' || log.action === 'user.role_escalation')) {
        roleEscalations.push(log);
      }
    }

    for (const [userId, ips] of Object.entries(userIps)) {
      if (ips.size >= ANOMALY_THRESHOLDS.ipSwitches) {
        const msg = `ANOMALY DETECTED: User ${userId} logged in or acted from ${ips.size} different IPs in the last hour.`;
        await sendSecurityAlert(msg, 'high');
      }
    }

    for (const log of roleEscalations) {
      const msg = `ANOMALY DETECTED: Role escalation action '${log.action}' detected for target ${log.entityId} by user ${log.userId}.`;
      await sendSecurityAlert(msg, 'critical');
    }

  } catch (error) {
    logger.error('Anomaly detection cron failed:', error);
  }
}

let intervalId = null;

function startAnomalyDetector() {
  // Run every 15 minutes
  intervalId = setInterval(detectAnomalies, 15 * 60 * 1000);
  logger.info('Anomaly detection cron started');
}

function stopAnomalyDetector() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Anomaly detection cron stopped');
  }
}

module.exports = {
  startAnomalyDetector,
  stopAnomalyDetector,
  detectAnomalies,
  sendSecurityAlert,
};
