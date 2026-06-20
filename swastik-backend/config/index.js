/**
 * Centralized Configuration
 * Loads all environment variables with defaults
 */
require('dotenv').config();

const normalizeFrontendUrl = (value, fallback) => {
  const raw = value || fallback;

  try {
    const url = new URL(raw);
    if (
      process.env.NODE_ENV !== 'production' &&
      url.protocol === 'https:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
    ) {
      url.protocol = 'http:';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const parseCsvList = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const uniqueList = (values) => [...new Set(values.filter(Boolean))];

const buildDefaultStoragePublicUrl = ({ provider, bucketName, region, endpoint, port, useSSL }) => {
  if (provider === 's3') {
    return `https://${bucketName}.s3.${region}.amazonaws.com`;
  }

  const protocol = useSSL ? 'https' : 'http';
  const normalizedPort = port && ![80, 443].includes(port) ? `:${port}` : '';
  return `${protocol}://${endpoint}${normalizedPort}/${bucketName}`;
};

const storageProvider = process.env.STORAGE_PROVIDER
  || process.env.FILE_STORAGE_PROVIDER
  || (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || process.env.S3_BUCKET_NAME || process.env.BUCKET_NAME
    ? 's3'
    : 'minio');

const storageRegion = process.env.AWS_REGION || process.env.S3_REGION || 'ap-south-1';
const storageEndpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || (storageProvider === 's3' ? `s3.${storageRegion}.amazonaws.com` : 'localhost');
const storageUseSSL = parseBoolean(
  process.env.STORAGE_USE_SSL ?? process.env.S3_USE_SSL ?? process.env.MINIO_USE_SSL,
  storageProvider === 's3'
);
const storagePort = parseInt(process.env.STORAGE_PORT || process.env.MINIO_PORT || (storageUseSSL ? '443' : '9000'), 10);
const storageBucketName = process.env.S3_BUCKET_NAME || process.env.BUCKET_NAME || process.env.MINIO_BUCKET_NAME || 'swastik-healthcare';
const storagePublicUrl = (
  process.env.STORAGE_PUBLIC_URL
  || process.env.S3_PUBLIC_URL
  || process.env.MINIO_PUBLIC_URL
  || buildDefaultStoragePublicUrl({
    provider: storageProvider,
    bucketName: storageBucketName,
    region: storageRegion,
    endpoint: storageEndpoint,
    port: storagePort,
    useSSL: storageUseSSL,
  })
).replace(/\/$/, '');
const storagePublicReadPrefixes = (
  process.env.STORAGE_PUBLIC_READ_PREFIXES
  || 'profiles/*,documents/*,reports/*,prescriptions/*,videos/*,licenses/*,entities/*,thumbnails/*,medium/*'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // JWT — I12: Separate secrets for access & refresh tokens
  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET environment variable is required in production');
      }
      if (!secret) {
        throw new Error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
      }
      return secret;
    })(),
    get accessSecret() {
      return process.env.JWT_ACCESS_SECRET || this.secret;
    },
    get refreshSecret() {
      return process.env.JWT_REFRESH_SECRET || this.secret;
    },
    expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Fix #35: Reduced from 7d to 1h
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'swastik_healthcare',
  },

  // Redis (Upstash)
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    // I7: ioredis TCP URL for Socket.IO adapter & pub/sub (Upstash provides this)
    ioredisUrl: (() => {
      let url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
      if (url && process.env.REDIS_PASSWORD && !url.includes('@')) {
        url = url.replace('redis://', `redis://:${process.env.REDIS_PASSWORD}@`);
      }
      return url;
    })(),
  },

  // Object storage (Amazon S3 in production, MinIO in local/dev by default)
  storage: {
    provider: storageProvider,
    endpoint: storageEndpoint,
    port: storagePort,
    region: storageRegion,
    accessKey: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || (() => {
      if (storageProvider === 's3') {
        // In AWS runtimes, prefer the task/instance IAM role via the SDK default
        // credential provider chain instead of long-lived access keys.
        return undefined;
      }
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: storage access key is required in production');
      }
      return 'minioadmin';
    })(),
    secretKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY || process.env.MINIO_SECRET_KEY || (() => {
      if (storageProvider === 's3') {
        return undefined;
      }
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: storage secret key is required in production');
      }
      return 'minioadmin';
    })(),
    useSSL: storageUseSSL,
    bucketName: storageBucketName,
    publicUrl: storagePublicUrl,
    signedUrlExpirySeconds: parseInt(process.env.STORAGE_SIGNED_URL_EXPIRY_SECONDS || process.env.S3_SIGNED_URL_EXPIRY_SECONDS || '3600', 10),
    signedReadUrlExpirySeconds: parseInt(process.env.STORAGE_SIGNED_READ_URL_EXPIRY_SECONDS || process.env.S3_SIGNED_READ_URL_EXPIRY_SECONDS || '86400', 10),
    signedUploadUrlExpirySeconds: parseInt(process.env.STORAGE_SIGNED_UPLOAD_URL_EXPIRY_SECONDS || process.env.S3_SIGNED_UPLOAD_URL_EXPIRY_SECONDS || process.env.STORAGE_SIGNED_URL_EXPIRY_SECONDS || '3600', 10),
    autoCreateBucket: parseBoolean(process.env.STORAGE_AUTO_CREATE_BUCKET, storageProvider !== 's3'),
    forcePathStyle: parseBoolean(process.env.STORAGE_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE, storageProvider !== 's3'),
    publicReadPrefixes: storagePublicReadPrefixes,
  },
  // Backward-compatible alias for older imports / scripts
  minio: null,

  // Frontend URLs
  frontendWebUrl: normalizeFrontendUrl(process.env.FRONTEND_WEB_URL, 'http://localhost:3000'),
  frontendDoctorWebUrl: normalizeFrontendUrl(process.env.FRONTEND_DOCTOR_WEB_URL, 'http://localhost:3001'),
  frontendAppUrl: process.env.FRONTEND_APP_URL || 'exp://localhost:8081',

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // AI Providers
  ai: {
    groqApiKey: process.env.GROQ_API_KEY,
    huggingFaceKey: process.env.HUGGINGFACE_API_KEY,
    // Provider routing: text → HuggingFace, voice → Groq
    textProvider: process.env.AI_TEXT_PROVIDER || 'huggingface',
    voiceProvider: process.env.AI_VOICE_PROVIDER || 'groq',
    // Rate limits
    maxMessagesPerSession: parseInt(process.env.AI_MAX_PER_SESSION, 10) || 20,
    maxMessagesPerDay: parseInt(process.env.AI_MAX_PER_DAY, 10) || 100,
    // Context window
    conversationMemorySize: parseInt(process.env.AI_MEMORY_SIZE, 10) || 6,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 800,
  },

  // Legacy aliases (backward compat)
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
  },

  // ElevenLabs TTS
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  },

  // WebRTC
  webrtc: {
    stunServers: uniqueList([
      ...parseCsvList(process.env.WEBRTC_STUN_SERVERS),
      process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ]),
    stunServer: process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnServers: uniqueList([
      process.env.WEBRTC_TURN_SERVER || '',
      ...parseCsvList(process.env.WEBRTC_TURN_SERVERS),
      process.env.WEBRTC_TURN_TCP_SERVER || '',
      process.env.WEBRTC_TURNS_SERVER || '',
    ]),
    turnServer: process.env.WEBRTC_TURN_SERVER || '',
    turnUsername: process.env.WEBRTC_TURN_USERNAME || '',
    turnCredential: process.env.WEBRTC_TURN_CREDENTIAL || process.env.WEBRTC_TURN_PASSWORD || '',
  },

  // Email (Gmail SMTP via Nodemailer)
  email: {
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME || 'VAIDIDEA Healthcare',
    fromEmail: process.env.EMAIL_FROM_ADDRESS || process.env.FROM_EMAIL || 'noreply@vaididea.in',
  },
};

config.minio = config.storage;

module.exports = config;
