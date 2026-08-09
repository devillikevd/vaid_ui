require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const crypto = require('crypto');
const WebSocket = require('ws');

const config = require('./config');
const logger = require('./utils/logger');
const compression = require('compression');
const { initializeBucket, storageProvider } = require('./config/minio');
const { connectMongoDB } = require('./config/mongodb');
const { connectRedis } = require('./config/redis');
const { initializeNotificationQueue, shutdownNotificationQueue } = require('./services/notificationQueueService');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { signStorageUrlsMiddleware } = require('./middleware/signStorageUrls');
const { initializeSocketIO } = require('./sockets');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const appointmentRoutes = require('./routes/appointment');
const consultationRoutes = require('./routes/consultation');
const hospitalRoutes = require('./routes/hospital');
const ambulanceRoutes = require('./routes/ambulance');
const medicineRoutes = require('./routes/medicine');
const chatbotRoutes = require('./routes/chatbot');
const featureToggleRoutes = require('./routes/featureToggle');
const reportRoutes = require('./routes/report');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/enhancedAdmin');
const pharmacyRoutes = require('./routes/pharmacy');
const hospitalManagerRoutes = require('./routes/hospitalManager');
const clinicRoutes = require('./routes/clinic');
const diagnosticCenterRoutes = require('./routes/diagnosticCenter');
const uploadRoutes = require('./routes/uploads');
const healthCardRoutes = require('./routes/healthCard');
const vitalsRoutes = require('./routes/vitals');
const outbreakRoutes = require('./routes/outbreak');
const mapsRoutes = require('./routes/maps');
const deliveryAgentRoutes = require('./routes/deliveryAgentRoutes');
const dietRoutes = require('./routes/diet');
const diseasesRoutes = require('./routes/diseases');
const wellnessRoutes = require('./routes/wellness');
const discountRoutes = require('./routes/discounts');
const patientConsentRoutes = require('./routes/patient/consents');

const { startOutbreakCron } = require('./services/outbreakService');

const isEnvEnabled = (name, fallback = true) => {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() !== 'false';
};

// Create Express app
const app = express();
const server = http.createServer(app);

const withApexAndWww = (value) => {
  if (!value || !/^https?:\/\//i.test(value)) return [value].filter(Boolean);

  try {
    const url = new URL(value);
    const variants = [url.toString().replace(/\/$/, '')];

    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      variants.push(url.toString().replace(/\/$/, ''));
    } else {
      url.hostname = `www.${url.hostname}`;
      variants.push(url.toString().replace(/\/$/, ''));
    }

    return variants;
  } catch {
    return [value];
  }
};

// Shared CORS allowlist for both HTTP and WebSocket.
// Include apex/www variants so the selected Vercel primary domain does not
// break browser requests when the other form is configured in env.
const allowedOrigins = Array.from(new Set([
  ...withApexAndWww(config.frontendWebUrl),
  ...withApexAndWww(config.frontendDoctorWebUrl),
  config.frontendAppUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://10.0.2.2:3000', // Android Emulator (Docker/Standard)
  'http://10.0.2.2:5001', // Android Emulator (Local Fallback)
].filter(Boolean)));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // mobile apps / curl / server-to-server
  if (allowedOrigins.includes(origin)) return true;
  if (config.env === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (config.env === 'development' && /^http:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/.test(origin)) return true;
  return false;
};

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Allow legacy Engine.IO v3 clients (Android socket.io-client 2.x)
  allowEIO3: true,
});

// ── WebSocket Proxy: /ws/vitals/* → FastAPI AI Service (localhost:8000) ──
// This lets browsers connect to wss://api.vaididea.in/ws/vitals/...
// through the ALB on port 443, without needing port 8000 publicly exposed.
const AI_SERVICE_WS_TARGET = process.env.AI_SERVICE_URL || 'http://localhost:8000';
logger.info(`[WS Proxy] AI Service target: ${AI_SERVICE_WS_TARGET}`);

server.on('upgrade', (req, socket, head) => {
  // Only intercept /ws/vitals/* paths; let Socket.IO handle everything else
  if (!req.url || !req.url.startsWith('/ws/vitals/')) return;

  const targetUrl = new URL(req.url, AI_SERVICE_WS_TARGET);
  if (targetUrl.protocol === 'http:') targetUrl.protocol = 'ws:';
  else if (targetUrl.protocol === 'https:') targetUrl.protocol = 'wss:';
  logger.info(`[WS Proxy] Upgrading ${req.url} → ${targetUrl.toString()}`);

  const upstream = new WebSocket(targetUrl.toString(), {
    headers: {
      // Forward origin and any other headers the client sent
      ...(req.headers.origin ? { origin: req.headers.origin } : {}),
    },
  });

    // Create a WebSocket server instance to handle the client side of the upgrade
  const wss = new WebSocket.Server({ noServer: true });
  wss.handleUpgrade(req, socket, head, (clientWs) => {
    // Buffer messages arriving before upstream is open (fixes race condition
    // where patient vitals sent during connection setup were silently dropped)
    const pendingMessages = [];

    // Keepalive ping/pong to prevent ALB 60s idle timeout
    const pingInterval = setInterval(() => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.ping();
      if (upstream.readyState === WebSocket.OPEN) upstream.ping();
    }, 30000);

    // Relay: client → upstream (register immediately, not inside 'open')
    clientWs.on('message', (data) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data);
      } else {
        pendingMessages.push(data);
      }
    });

    upstream.on('open', () => {
      logger.info(`[WS Proxy] Upstream connected for ${req.url}`);
      // Flush buffered messages from before upstream was ready
      for (const msg of pendingMessages) {
        upstream.send(msg);
      }
      pendingMessages.length = 0;
    });

    // Relay: upstream → client
    upstream.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
    });

    // Clean up on close
    clientWs.on('close', (code, reason) => {
      clearInterval(pingInterval);
      logger.info(`[WS Proxy] Client closed ${req.url}: ${code} ${reason || ''}`);
      upstream.close();
    });
    upstream.on('close', (code, reason) => {
      clearInterval(pingInterval);
      logger.info(`[WS Proxy] Upstream closed ${req.url}: ${code} ${reason || ''}`);
      clientWs.close();
    });

    // Error handling
    clientWs.on('error', (err) => {
      clearInterval(pingInterval);
      logger.error(`[WS Proxy] Client error ${req.url}:`, err.message);
      upstream.close();
    });
    upstream.on('error', (err) => {
      clearInterval(pingInterval);
      logger.error(`[WS Proxy] Upstream error ${req.url}:`, err.message);
      clientWs.close();
    });
  });
});

// I7: Socket.IO Redis adapter for horizontal scaling
if (config.redis.ioredisUrl) {
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');
    const pubClient = new Redis(config.redis.ioredisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO Redis adapter connected');
      })
      .catch((err) => {
        logger.warn('⚠️  Socket.IO Redis adapter failed (falling back to in-memory):', err.message);
      });
  } catch (err) {
    logger.warn('⚠️  @socket.io/redis-adapter not available:', err.message);
  }
} else {
  logger.warn('⚠️  REDIS_URL/UPSTASH_REDIS_URL not set for ioredis adapter. Socket.IO scaling is disabled (single-instance mode).');
}

// Initialize Socket.IO
initializeSocketIO(io);

// Initialize event emitter with Socket.IO instance
const eventEmitter = require('./services/eventEmitter');
eventEmitter.setIO(io);

// Make io accessible to routes
app.set('io', io);

// CORS - MUST come before all other middleware
app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// L004: Only trust X-Forwarded-For (and set req.ip accordingly) when the
// connecting peer is on the explicit trusted-proxy allowlist. Without this,
// a client can spoof X-Forwarded-For to bypass IP-based rate limiting.
// Configure with TRUSTED_PROXY_IPS (comma-separated IPs and/or IPv4 CIDRs),
// e.g. the AWS ALB subnet CIDRs. Fails closed when unset.
const net = require('net');
const TRUSTED_PROXY_IPS = (process.env.TRUSTED_PROXY_IPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ipv4ToInt = (ipv4) => {
  const octets = ipv4.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
  return octets.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
};

const cidrContains = (cidr, ipv4) => {
  const slash = cidr.indexOf('/');
  if (slash === -1) return false;
  const range = ipv4ToInt(cidr.slice(0, slash));
  const bits = Number(cidr.slice(slash + 1));
  if (range === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ipv4) & mask) === (range & mask);
};

const isTrustedProxy = (remoteIp) => {
  const normalized = String(remoteIp).replace(/^::ffff:/, '');
  if (!net.isIP(normalized)) return false;
  return TRUSTED_PROXY_IPS.some((entry) => {
    if (entry.includes('/')) return cidrContains(entry, normalized);
    return entry === normalized || entry === remoteIp;
  });
};

app.set('trust proxy', TRUSTED_PROXY_IPS.length > 0 ? isTrustedProxy : false);

// H001: Origin validation for state-changing requests (defense-in-depth on top
// of header-based bearer auth + SameSite=Strict cookies).
const { csrfProtection } = require('./middleware/csrf');
app.use(csrfProtection);

// Security middleware (after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Explicit HSTS so subdomains + preload are covered (browsers only honor it over HTTPS)
  strictTransportSecurity: {
    maxAge: 15552000, // 180 days
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'no-referrer' },
  // L003: explicit CSP directives for any HTML this server renders (error
  // pages, /health, swagger-style content). API JSON responses carry it too,
  // which is harmless. No inline/remote sources are allowed.
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
}));

// Response compression — 60-80% bandwidth reduction for JSON/text responses
// Critical for low-bandwidth rural areas
app.use(compression({
  level: 6, // Good balance between speed and compression ratio
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Request ID for tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Request Logging (non-health endpoints)
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 2000 || res.statusCode >= 500) {
      logger.warn(`[SLOW/ERR] ${req.method} ${req.path} ${res.statusCode} ${duration}ms [${req.id}]`);
    }
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  // Skip rate limiting for health check endpoint
  skip: (req) => req.path === '/health',
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15 min
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + email to prevent distributed brute-force
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing (M001: HttpOnly refresh-token cookie)
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Resolve private object-storage URLs into signed read URLs for normal API responses.
app.use(signStorageUrlsMiddleware);

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check — I17: Verify backing stores for production readiness
// H007: The public response is minimal. When HEALTHCHECK_SECRET is configured,
// detailed diagnostics require `x-healthcheck-secret` to match, so internal
// state (providers, storage, MongoDB) is not exposed to unauthenticated clients.
app.get('/health', async (req, res) => {
  const healthSecretOk =
    !config.healthCheckSecret ||
    (req.headers['x-healthcheck-secret'] && req.headers['x-healthcheck-secret'] === config.healthCheckSecret);

  if (!healthSecretOk) {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  const checks = { server: 'ok' };
  let overallStatus = 'ok';

  // Check Supabase (PostgreSQL)
  try {
    const { supabaseAdmin } = require('./config/supabase');
    const url = process.env.SUPABASE_URL || '';
    if (url.includes('your-project.supabase.co')) {
      checks.supabase = 'not_configured';
    } else {
      const { error } = await supabaseAdmin.from('users').select('id').limit(1);
      if (error) {
        checks.supabase = 'degraded';
        overallStatus = 'degraded';
      } else {
        checks.supabase = 'ok';
      }
    }
  } catch {
    checks.supabase = 'down';
    overallStatus = 'degraded';
  }

  // Check Redis
  try {
    const { cacheGet, cacheSet } = require('./config/redis');
    await cacheSet('health:ping', 'pong', 10);
    const val = await cacheGet('health:ping');
    checks.redis = val === 'pong' ? 'ok' : 'degraded';
  } catch {
    checks.redis = 'down';
    // Redis is optional, don't degrade overall
  }

  // Check MongoDB
  try {
    const mongoose = require('mongoose');
    checks.mongodb = mongoose.connection.readyState === 1 ? 'ok' : 'disconnected';
  } catch {
    checks.mongodb = 'unknown';
  }

  // Check object storage (uploads dependency)
  try {
    const { isStorageAvailable } = require('./config/minio');
    checks.storage = isStorageAvailable() ? 'ok' : 'down';
    checks.storageProvider = storageProvider;
    checks.minio = checks.storage;
  } catch {
    checks.storage = 'unknown';
    checks.minio = 'unknown';
  }

  const statusCode = overallStatus === 'ok' ? 200 : 503;
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: config.env,
    uptime: process.uptime(),
    checks,
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'VAIDIDEA Healthcare API',
    version: '1.0.0',
    description: 'Complete healthcare platform for patients and doctors',
    documentation: '/api/docs',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use('/api/feature-toggles', featureToggleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/hospital-manager', hospitalManagerRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/diagnostic-centers', diagnosticCenterRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/health-card', healthCardRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/admin/outbreaks', outbreakRoutes);
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/maps', mapsRoutes);
app.use('/api/delivery-agents', deliveryAgentRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/diseases', diseasesRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/patients/consents', patientConsentRoutes);


// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize services and start server
const startServer = async () => {
  try {
    // Initialize infrastructure
    await connectMongoDB();
    await connectRedis();

    // Initialize health library database
    try {
      const { bootstrapHealthDatabase } = require('./scripts/bootstrap-db');
      await bootstrapHealthDatabase();
    } catch (e) {
      logger.error('⚠️ Could not bootstrap health database: ' + e.message);
    }

    // Start Redis Monitor
    try {
      const redisMonitor = require('./services/redisMonitor');
      redisMonitor.startPolling();
    } catch (e) {
      logger.warn('⚠️ Could not start Redis Monitor:', e.message);
    }

    // Initialize async notification dispatch queue (falls back to direct send if unavailable)
    await initializeNotificationQueue();

    // Initialize MinIO bucket
    await initializeBucket();

    // Recover any broadcasts stuck from a previous server restart
    try {
      const dispatchService = require('./services/dispatchService');
      await dispatchService.recoverBroadcasts();
    } catch (err) {
      logger.warn('⚠️  Broadcast recovery failed (non-fatal):', err.message);
    }

    // Start server
    const PORT = config.port;
    server.listen(PORT, '0.0.0.0', () => {
      if (isEnvEnabled('BACKGROUND_JOBS_ENABLED', true)) {
        // Start consultation timeout cron
        startConsultationTimeoutCron();
        // Start patient reminder notification cron
        startReminderNotificationCron();
        // Start appointment expire cron
        startAppointmentExpireCron();
        // Start wellness badge evaluation cron (nightly)
        startWellnessBadgesCron();
        // Start wellness chat retention cleanup (daily)
        startWellnessChatCleanupCron();
        // Start disease outbreak detection cron (runs every 6 hours)
        if (isEnvEnabled('OUTBREAK_CRON_ENABLED', true)) {
          startOutbreakCron(6);
        } else {
          logger.info('[Cron] Outbreak scheduler is disabled by OUTBREAK_CRON_ENABLED=false');
        }
      } else {
        logger.info('[Cron] Background job schedulers are disabled by BACKGROUND_JOBS_ENABLED=false');
      }
      logger.info(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🏥 VAIDIDEA Healthcare API Server                              ║
║                                                                  ║
║   Environment: ${config.env.padEnd(47)}║
║   Port: ${PORT.toString().padEnd(55)}║
║   URL: http://localhost:${PORT.toString().padEnd(42)}║
║                                                                  ║
║   📡 API Endpoints:                                              ║
║   ├─ Auth:          POST /api/auth/login, /register              ║
║   ├─ Patients:      GET  /api/patients/profile, /dashboard       ║
║   ├─ Doctors:       GET  /api/doctors, /api/doctors/:id          ║
║   ├─ Appointments:  POST /api/appointments                       ║
║   ├─ Consultations: POST /api/consultations/:id/start            ║
║   ├─ Hospitals:     GET  /api/hospitals/nearby                   ║
║   ├─ Ambulances:    POST /api/ambulances/request (SOS)           ║
║   ├─ Medicines:     GET  /api/medicines/search                   ║
║   ├─ Chatbot:       POST /api/chatbot/message                    ║
║   ├─ Reports:       GET  /api/reports                            ║
║   └─ Notifications: GET  /api/notifications                      ║
║                                                                  ║
║   🔌 WebSocket Events:                                           ║
║   ├─ ambulance:track      - Track ambulance location             ║
║   ├─ ambulance:location   - Update ambulance location            ║
║   ├─ video:join           - Join video consultation              ║
║   ├─ video:offer/answer   - WebRTC signaling                     ║
║   └─ chat:message         - In-consultation chat                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// I19: Consultation timeout cron — mark stale 'in_progress' consultations as 'timed_out'
let consultationTimeoutInterval;
let reminderNotificationInterval;
let appointmentExpireInterval;
let wellnessBadgesInterval;
let wellnessChatCleanupInterval;

const startAppointmentExpireCron = () => {
  if (String(process.env.APPOINTMENT_EXPIRE_CRON_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('[Cron] Appointment expire scheduler is disabled');
    return;
  }
  const intervalMs = Number(process.env.APPOINTMENT_EXPIRE_CRON_INTERVAL_MS || 5 * 60 * 1000);
  const lockTtlSec = Math.max(30, Math.ceil(intervalMs / 1000) - 5);
  appointmentExpireInterval = setInterval(async () => {
    const startedAt = Date.now();
    try {
      try {
        const { cacheSetIfNotExists } = require('./config/redis');
        const lockAcquired = await cacheSetIfNotExists('cron:appointment-expire:lock', process.pid, lockTtlSec);
        if (!lockAcquired) return;
      } catch (lockErr) {}
      const expirePastAppointments = require('./cron/expireAppointments');
      const result = await expirePastAppointments();
      logger.info(`[Cron] Appointment expire result: ${JSON.stringify(result)}`);
      if (result && result.error) {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'appointment-expire',
          ok: false,
          message: result.error,
          durationMs: Date.now() - startedAt,
        });
      } else if (String(process.env.CRON_ALERT_ON_SUCCESS || 'false').toLowerCase() === 'true') {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'appointment-expire',
          ok: true,
          message: 'Appointment expiry scan completed',
          durationMs: Date.now() - startedAt,
          context: result || {},
        });
      }
    } catch (err) {
      logger.error('[Cron] Appointment expire error:', err.message);
      try {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'appointment-expire',
          ok: false,
          message: err.message,
          durationMs: Date.now() - startedAt,
        });
      } catch (alertErr) {
        logger.warn('[Cron] Failed to send appointment-expire alert:', alertErr.message);
      }
    }
  }, intervalMs);
};

const startConsultationTimeoutCron = () => {
  if (isEnvEnabled('CONSULTATION_TIMEOUT_CRON_ENABLED', true) === false) {
    logger.info('[Cron] Consultation timeout scheduler is disabled by CONSULTATION_TIMEOUT_CRON_ENABLED=false');
    return;
  }

  const intervalMs = Number(process.env.CONSULTATION_TIMEOUT_CRON_INTERVAL_MS || 10 * 60 * 1000);
  const lockTtlSec = Math.max(30, Math.ceil(intervalMs / 1000) - 5);

  consultationTimeoutInterval = setInterval(async () => {
    const startedAt = Date.now();
    try {
      // Multi-instance safety: only one instance should run this scan per interval.
      try {
        const { cacheSetIfNotExists } = require('./config/redis');
        const lockAcquired = await cacheSetIfNotExists('cron:consultation-timeout:lock', process.pid, lockTtlSec);
        if (!lockAcquired) return;
      } catch (lockErr) {
        logger.warn('[Cron] Consultation timeout lock unavailable; running without lock:', lockErr.message);
      }

      const { supabaseAdmin } = require('./config/supabase');
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours
      const { data, error } = await supabaseAdmin
        .from('consultations')
        .update({ status: 'timed_out', ended_at: new Date().toISOString() })
        .eq('status', 'in_progress')
        .lt('started_at', cutoff)
        .select('id');

      if (error) throw error;
      const result = { timedOut: data?.length || 0 };
      logger.info(`[Cron] Consultation timeout result: ${JSON.stringify(result)}`);
      if (String(process.env.CRON_ALERT_ON_SUCCESS || 'false').toLowerCase() === 'true') {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'consultation-timeout',
          ok: true,
          message: 'Consultation timeout scan completed',
          durationMs: Date.now() - startedAt,
          context: result,
        });
      }
    } catch (err) {
      logger.error('[Cron] Consultation timeout error:', err.message);
      try {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'consultation-timeout',
          ok: false,
          message: err.message,
          durationMs: Date.now() - startedAt,
        });
      } catch (alertErr) {
        logger.warn('[Cron] Failed to send consultation-timeout alert:', alertErr.message);
      }
    }
  }, intervalMs);
};

const startWellnessBadgesCron = () => {
  if (String(process.env.WELLNESS_BADGES_CRON_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('[Cron] Wellness badge scheduler is disabled by WELLNESS_BADGES_CRON_ENABLED=false');
    return;
  }

  const intervalMs = Number(process.env.WELLNESS_BADGES_CRON_INTERVAL_MS || 24 * 60 * 60 * 1000);
  const lockTtlSec = Math.max(60, Math.ceil(intervalMs / 1000) - 5);

  wellnessBadgesInterval = setInterval(async () => {
    const startedAt = Date.now();
    try {
      try {
        const { cacheSetIfNotExists } = require('./config/redis');
        const lockAcquired = await cacheSetIfNotExists('cron:wellness-badges:lock', process.pid, lockTtlSec);
        if (!lockAcquired) return;
      } catch (lockErr) {
        logger.warn('[Cron] Wellness badge lock unavailable; running without lock:', lockErr.message);
      }
      const evaluateWellnessBadges = require('./cron/badges');
      const result = await evaluateWellnessBadges();
      logger.info(`[Cron] Wellness badge evaluation result: ${JSON.stringify(result)}`);
      if (String(process.env.CRON_ALERT_ON_SUCCESS || 'false').toLowerCase() === 'true') {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'wellness-badges',
          ok: true,
          message: 'Wellness badge evaluation completed',
          durationMs: Date.now() - startedAt,
          context: result,
        });
      }
    } catch (err) {
      logger.error('[Cron] Wellness badge evaluation error:', err.message);
      try {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'wellness-badges',
          ok: false,
          message: err.message,
          durationMs: Date.now() - startedAt,
        });
      } catch (alertErr) {
        logger.warn('[Cron] Failed to send badge alert:', alertErr.message);
      }
    }
  }, intervalMs);
};

const startWellnessChatCleanupCron = () => {
  if (String(process.env.WELLNESS_CHAT_CLEANUP_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('[Cron] Wellness chat cleanup scheduler is disabled by WELLNESS_CHAT_CLEANUP_ENABLED=false');
    return;
  }

  const intervalMs = Number(process.env.WELLNESS_CHAT_CLEANUP_INTERVAL_MS || 24 * 60 * 60 * 1000);
  const lockTtlSec = Math.max(60, Math.ceil(intervalMs / 1000) - 5);

  wellnessChatCleanupInterval = setInterval(async () => {
    const startedAt = Date.now();
    try {
      try {
        const { cacheSetIfNotExists } = require('./config/redis');
        const lockAcquired = await cacheSetIfNotExists('cron:wellness-chat-cleanup:lock', process.pid, lockTtlSec);
        if (!lockAcquired) return;
      } catch (lockErr) {
        logger.warn('[Cron] Wellness chat cleanup lock unavailable; running without lock:', lockErr.message);
      }
      const cleanupWellnessChat = require('./cron/wellnessChatCleanup');
      const result = await cleanupWellnessChat();
      logger.info(`[Cron] Wellness chat cleanup result: ${JSON.stringify(result)}`);
      if (String(process.env.CRON_ALERT_ON_SUCCESS || 'false').toLowerCase() === 'true') {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'wellness-chat-cleanup',
          ok: true,
          message: 'Wellness chat cleanup completed',
          durationMs: Date.now() - startedAt,
          context: result,
        });
      }
    } catch (err) {
      logger.error('[Cron] Wellness chat cleanup error:', err.message);
      try {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'wellness-chat-cleanup',
          ok: false,
          message: err.message,
          durationMs: Date.now() - startedAt,
        });
      } catch (alertErr) {
        logger.warn('[Cron] Failed to send wellness-chat-cleanup alert:', alertErr.message);
      }
    }
  }, intervalMs);
};

const startReminderNotificationCron = () => {
  if (String(process.env.REMINDER_CRON_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('[Cron] Reminder notification scheduler is disabled by REMINDER_CRON_ENABLED=false');
    return;
  }

  const intervalMs = Number(process.env.REMINDER_CRON_INTERVAL_MS || 60 * 1000);
  const lockTtlSec = Math.max(10, Math.ceil(intervalMs / 1000) - 2);

  reminderNotificationInterval = setInterval(async () => {
    const startedAt = Date.now();
    try {
      // Multi-instance safety: only one instance should run reminder scan per interval.
      try {
        const { cacheSetIfNotExists } = require('./config/redis');
        const lockAcquired = await cacheSetIfNotExists('cron:reminder:lock', process.pid, lockTtlSec);
        if (!lockAcquired) return;
      } catch (lockErr) {
        logger.warn('[Cron] Reminder lock unavailable; running without lock:', lockErr.message);
      }

      const reminderNotificationService = require('./services/reminderNotificationService');
      await reminderNotificationService.runReminderNotificationTick();
    } catch (err) {
      logger.error('[Cron] Reminder notification error:', err.message);
      try {
        const { notifyCronAlert } = require('./services/cronAlert');
        await notifyCronAlert({
          job: 'reminder-notifications',
          ok: false,
          message: err.message,
          durationMs: Date.now() - startedAt,
        });
      } catch (alertErr) {
        logger.warn('[Cron] Failed to send reminder alert:', alertErr.message);
      }
    }
  }, intervalMs);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Clear cron interval to prevent stale timers
  if (consultationTimeoutInterval) clearInterval(consultationTimeoutInterval);
  if (reminderNotificationInterval) clearInterval(reminderNotificationInterval);
  if (appointmentExpireInterval) clearInterval(appointmentExpireInterval);
  if (wellnessBadgesInterval) clearInterval(wellnessBadgesInterval);
  if (wellnessChatCleanupInterval) clearInterval(wellnessChatCleanupInterval);
  server.close(() => {
    process.exit(1);
  });
  // Force kill after 15 seconds if server.close() hangs
  setTimeout(() => {
    logger.error('Forced shutdown after unhandled rejection timeout');
    process.exit(1);
  }, 15000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// I18: Graceful shutdown — close all connections cleanly
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    try {
      // Stop cron
      if (consultationTimeoutInterval) clearInterval(consultationTimeoutInterval);
      if (reminderNotificationInterval) clearInterval(reminderNotificationInterval);
      if (appointmentExpireInterval) clearInterval(appointmentExpireInterval);
      if (wellnessBadgesInterval) clearInterval(wellnessBadgesInterval);
      if (wellnessChatCleanupInterval) clearInterval(wellnessChatCleanupInterval);

      // Close Socket.IO
      if (io) {
        io.close();
        logger.info('✅ Socket.IO closed');
      }

      // Close notification queue worker/producer
      await shutdownNotificationQueue();

      // Close distributed event bus clients
      await eventEmitter.shutdown();

      // Close MongoDB
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          logger.info('✅ MongoDB closed');
        }
      } catch { /* ignore */ }

      logger.info('Process terminated.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force kill after 15 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

module.exports = { app, server, io };
