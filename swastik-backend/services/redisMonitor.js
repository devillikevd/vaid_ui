/**
 * Redis Monitor Service
 * Periodically checks Redis health: memory usage, ops/sec, connected clients.
 * Emits warnings when memory exceeds configured thresholds.
 *
 * Works with both ioredis (TCP) and Upstash REST backends.
 * For Upstash REST, INFO is not available so we degrade gracefully.
 */
const { getRedisClient, getConnectionState } = require('../config/redis');

// Thresholds (bytes)
const MEMORY_WARN_BYTES  = 50 * 1024 * 1024;  // 50 MB
const MEMORY_CRIT_BYTES  = 100 * 1024 * 1024; // 100 MB
const POLL_INTERVAL_MS   = 60_000;             // 1 minute

let pollTimer = null;
let lastSnapshot = null;

/**
 * Attempt to run Redis INFO command (only works with ioredis / TCP).
 * Returns parsed key-value object or null.
 */
async function fetchInfo() {
  const client = getRedisClient();
  if (!client) return null;

  // Upstash REST facade doesn't expose .info()
  if (client.type === 'upstash-rest') return null;

  // ioredis facade wraps a real ioredis client but our facade doesn't expose .info()
  // We reach through to the underlying client for diagnostics only
  try {
    // ioredis natively supports .info()
    const rawClient = client._raw || client;
    if (typeof rawClient.info !== 'function') return null;

    const raw = await rawClient.info('all');
    const result = {};
    for (const line of raw.split('\r\n')) {
      if (!line || line.startsWith('#')) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx < 0) continue;
      result[line.slice(0, colonIdx)] = line.slice(colonIdx + 1);
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Build a health snapshot from INFO output.
 */
function buildSnapshot(info) {
  if (!info) {
    return {
      available: getConnectionState(),
      backend: getRedisClient()?.type || 'unknown',
      infoSupported: false,
      checkedAt: new Date().toISOString(),
    };
  }

  const usedMemory = parseInt(info.used_memory, 10) || 0;
  const peakMemory = parseInt(info.used_memory_peak, 10) || 0;
  const opsPerSec  = parseInt(info.instantaneous_ops_per_sec, 10) || 0;
  const connectedClients = parseInt(info.connected_clients, 10) || 0;
  const uptimeSeconds = parseInt(info.uptime_in_seconds, 10) || 0;
  const totalKeys = parseInt(info.db0?.match(/keys=(\d+)/)?.[1] || '0', 10);

  // Memory warnings
  let memoryStatus = 'ok';
  if (usedMemory > MEMORY_CRIT_BYTES) {
    memoryStatus = 'critical';
    console.error(`[RedisMonitor] ⚠️  CRITICAL: Redis memory ${(usedMemory / 1024 / 1024).toFixed(1)} MB exceeds ${MEMORY_CRIT_BYTES / 1024 / 1024} MB threshold`);
  } else if (usedMemory > MEMORY_WARN_BYTES) {
    memoryStatus = 'warning';
    console.warn(`[RedisMonitor] ⚠️  WARNING: Redis memory ${(usedMemory / 1024 / 1024).toFixed(1)} MB exceeds ${MEMORY_WARN_BYTES / 1024 / 1024} MB threshold`);
  }

  return {
    available: true,
    backend: 'ioredis',
    infoSupported: true,
    usedMemoryBytes: usedMemory,
    usedMemoryHuman: info.used_memory_human || `${(usedMemory / 1024 / 1024).toFixed(1)}M`,
    peakMemoryBytes: peakMemory,
    opsPerSec,
    connectedClients,
    uptimeSeconds,
    totalKeys,
    memoryStatus,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Run one health check cycle.
 */
async function check() {
  try {
    const info = await fetchInfo();
    lastSnapshot = buildSnapshot(info);
    return lastSnapshot;
  } catch (err) {
    console.error('[RedisMonitor] Health check failed:', err.message);
    lastSnapshot = {
      available: false,
      error: err.message,
      checkedAt: new Date().toISOString(),
    };
    return lastSnapshot;
  }
}

/**
 * Start periodic health polling.
 */
function startPolling(intervalMs = POLL_INTERVAL_MS) {
  if (pollTimer) return; // already running
  console.log(`[RedisMonitor] Starting health polling every ${intervalMs / 1000}s`);
  // Run immediately, then on interval
  check();
  pollTimer = setInterval(check, intervalMs);
  // Don't prevent process exit
  if (pollTimer.unref) pollTimer.unref();
}

/**
 * Stop periodic health polling.
 */
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Get latest cached snapshot without running a new check.
 */
function getLastSnapshot() {
  return lastSnapshot;
}

module.exports = {
  check,
  startPolling,
  stopPolling,
  getLastSnapshot,
  MEMORY_WARN_BYTES,
  MEMORY_CRIT_BYTES,
};
