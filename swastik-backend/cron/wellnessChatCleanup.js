const logger = require('../utils/logger');

const DEFAULT_RETENTION_DAYS = 180;
const BATCH_SIZE = 5000;
const MAX_BATCHES = 100;

const cleanupWellnessChat = async () => {
  const retentionDays = Number(process.env.WELLNESS_CHAT_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const { ChatMessage } = require('../database/models');
  if (!ChatMessage) {
    return { checked: false, deleted: 0, reason: 'chat model unavailable' };
  }

  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    const ids = await ChatMessage.find({ createdAt: { $lt: cutoff }, 'metadata.wellnessSessionId': { $exists: true } })
      .select('_id')
      .limit(BATCH_SIZE)
      .lean();
    if (ids.length === 0) break;
    const result = await ChatMessage.deleteMany({ _id: { $in: ids.map((item) => item._id) } });
    deleted += result.deletedCount || 0;
    if (ids.length < BATCH_SIZE) break;
  }

  logger.info(`[ChatCleanup] Deleted ${deleted} wellness chat messages older than ${retentionDays}d (cutoff ${cutoff.toISOString()})`);
  return { checked: true, deleted, retentionDays, cutoff: cutoff.toISOString() };
};

module.exports = cleanupWellnessChat;
