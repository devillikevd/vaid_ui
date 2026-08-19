/**
 * Object Storage Configuration
 * Backward-compatible module name kept as `minio.js` because the rest of the
 * codebase already imports this path.
 *
 * Supported providers:
 *   - MinIO (default for local development)
 *   - Amazon S3 (recommended for production)
 *
 * Used for file uploads: profile images, documents, reports, prescriptions, videos
 *
 * Bandwidth Optimization Pipeline:
 *   1. Originals compressed & converted to WebP (quality 88, progressive)
 *   2. Medium variant generated (1024px wide) for cards/lists
 *   3. Thumbnail variant generated (300px wide) for avatars/previews
 *   4. Cache-Control headers set on all objects (30 days)
 *   5. All image variants stored as WebP for ~30-50% size reduction
 */
const Minio = require('minio');
const { randomUUID } = require('crypto');
const {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('./index');

// Try to load sharp for image processing
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.warn('[Storage] sharp not installed — image optimization disabled. Run: npm install sharp');
}

const storageConfig = config.storage || config.minio;
const storageProvider = storageConfig.provider || 'minio';
const storageLabel = storageProvider === 's3' ? 'Amazon S3' : 'MinIO';

// Storage folder structure
const STORAGE_FOLDERS = {
  PROFILES: 'profiles',
  DOCUMENTS: 'documents',
  REPORTS: 'reports',
  PRESCRIPTIONS: 'prescriptions',
  VIDEOS: 'videos',
  LICENSES: 'licenses',
  ENTITIES: 'entities',
  MEDICINES: 'medicines',
  MASTER_TESTS: 'master-tests',
  THUMBNAILS: 'thumbnails',
  MEDIUM: 'medium',
  EXERCISES: 'exercises',
  INTAKE_DOCS: 'intake-docs',
  VOICE_NOTES: 'voice-notes',
};

// Image processing constants
const IMAGE_SIZES = {
  THUMBNAIL: { width: 320, quality: 78 },
  MEDIUM: { width: 1024, quality: 82 },
  ORIGINAL: { maxWidth: 2560, quality: 88 },
};

// Cache duration: 30 days
const CACHE_MAX_AGE = 30 * 24 * 60 * 60;

let minioClient = null;
let s3Client = null;
let isBucketReady = false;

const joinUrl = (base, path) => `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;

const getBucketAwarePublicBaseUrl = () => {
  const rawBase = String(storageConfig.publicUrl || '').replace(/\/$/, '');
  try {
    const parsed = new URL(rawBase);
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    const bucketInPath = pathSegments[0] === storageConfig.bucketName;
    const bucketInHost = parsed.hostname.startsWith(`${storageConfig.bucketName}.`);
    return bucketInPath || bucketInHost ? rawBase : joinUrl(rawBase, storageConfig.bucketName);
  } catch {
    return rawBase;
  }
};

const publicBaseUrl = getBucketAwarePublicBaseUrl();
const buildObjectUrl = (objectName) => joinUrl(publicBaseUrl, objectName);

const isAlreadySignedUrl = (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    return (
      url.searchParams.has('X-Amz-Signature')
      || url.searchParams.has('X-Amz-Algorithm')
      || url.searchParams.has('X-Amz-Credential')
    );
  } catch {
    return false;
  }
};

const isStorageObjectUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string' || !/^https?:\/\//i.test(fileUrl)) {
    return false;
  }

  try {
    const url = new URL(fileUrl);
    const publicUrl = new URL(publicBaseUrl);
    const normalizedPublicPath = publicUrl.pathname.replace(/\/$/, '');
    const normalizedPath = url.pathname.replace(/\/$/, '');
    const bucketHostPrefix = `${storageConfig.bucketName}.`;

    if (url.hostname.startsWith(bucketHostPrefix)) {
      return true;
    }

    if (url.origin === publicUrl.origin) {
      if (!normalizedPublicPath) return true;
      return normalizedPath === normalizedPublicPath || normalizedPath.startsWith(`${normalizedPublicPath}/`);
    }

    if (
      ['localhost', '127.0.0.1', publicUrl.hostname, storageConfig.endpoint].includes(url.hostname)
      && normalizedPath.includes(`/${storageConfig.bucketName}/`)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const extractObjectNameFromUrl = (fileUrl) => {
  if (!isStorageObjectUrl(fileUrl)) return null;

  try {
    const url = new URL(fileUrl);
    const rawSegments = url.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
    const bucketName = storageConfig.bucketName;

    if (!rawSegments.length) return null;

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const bucketIndex = rawSegments.findIndex((segment) => segment === bucketName);
      return bucketIndex >= 0 ? rawSegments.slice(bucketIndex + 1).join('/') : rawSegments.join('/');
    }

    if (url.hostname.startsWith(`${bucketName}.`)) {
      return rawSegments.join('/');
    }

    const bucketIndex = rawSegments.findIndex((segment) => segment === bucketName);
    if (bucketIndex >= 0) {
      return rawSegments.slice(bucketIndex + 1).join('/');
    }

    return rawSegments.join('/');
  } catch {
    return null;
  }
};

const createPublicReadPolicy = () => {
  return null;
};

const isBucketNotFoundError = (error) => {
  const statusCode = error?.$metadata?.httpStatusCode;
  return statusCode === 404
    || error?.name === 'NotFound'
    || error?.name === 'NoSuchBucket'
    || /NoSuchBucket|NotFound/i.test(error?.message || '');
};

const ensureS3Bucket = async () => {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: storageConfig.bucketName }));
    return true;
  } catch (error) {
    if (!isBucketNotFoundError(error)) throw error;
    if (!storageConfig.autoCreateBucket) {
      throw new Error(`S3 bucket "${storageConfig.bucketName}" does not exist and STORAGE_AUTO_CREATE_BUCKET=false`);
    }

    const createParams = { Bucket: storageConfig.bucketName };
    if (storageConfig.region && storageConfig.region !== 'us-east-1') {
      createParams.CreateBucketConfiguration = {
        LocationConstraint: storageConfig.region,
      };
    }

    await s3Client.send(new CreateBucketCommand(createParams));
    return true;
  }
};

const ensureMinioBucket = async () => {
  const exists = await minioClient.bucketExists(storageConfig.bucketName);
  if (!exists) {
    await minioClient.makeBucket(storageConfig.bucketName);
    console.log(`✅ ${storageLabel} bucket "${storageConfig.bucketName}" created`);
  }
  return true;
};

const applyPublicReadPolicy = async () => {
  // Fix FILE-02: Bucket should remain private. Signed URLs are used for all access.
  console.log(`✅ ${storageLabel} bucket configured as private`);
};

// Initialize storage client
try {
  if (storageProvider === 's3') {
    const endpoint = storageConfig.endpoint
      ? `${storageConfig.useSSL ? 'https' : 'http'}://${storageConfig.endpoint}${storageConfig.port && ![80, 443].includes(storageConfig.port) ? `:${storageConfig.port}` : ''}`
      : undefined;

    const s3ClientOptions = {
      region: storageConfig.region,
      endpoint,
      forcePathStyle: storageConfig.forcePathStyle,
    };

    if (storageConfig.accessKey && storageConfig.secretKey) {
      s3ClientOptions.credentials = {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      };
    }

    s3Client = new S3Client(s3ClientOptions);
  } else {
    minioClient = new Minio.Client({
      endPoint: storageConfig.endpoint,
      port: storageConfig.port,
      useSSL: storageConfig.useSSL,
      accessKey: storageConfig.accessKey,
      secretKey: storageConfig.secretKey,
    });
  }
} catch (error) {
  console.warn(`⚠️  ${storageLabel} client initialization failed:`, error.message);
}

// Initialize bucket / policy
const initializeBucket = async () => {
  if (!minioClient && !s3Client) {
    console.warn(`⚠️  ${storageLabel} not available. File uploads will be unavailable.`);
    isBucketReady = false;
    return false;
  }

  try {
    if (storageProvider === 's3') {
      await ensureS3Bucket();
      console.log(`✅ ${storageLabel} bucket "${storageConfig.bucketName}" is reachable`);
    } else {
      await ensureMinioBucket();
      console.log(`✅ ${storageLabel} bucket "${storageConfig.bucketName}" exists`);
    }

    try {
      await applyPublicReadPolicy();
    } catch (policyError) {
      console.warn(`⚠️  ${storageLabel} bucket policy setup skipped:`, policyError.message);
    }

    isBucketReady = true;
    return true;
  } catch (error) {
    isBucketReady = false;
    const endpoint = storageProvider === 's3'
      ? `${storageConfig.useSSL ? 'https' : 'http'}://${storageConfig.endpoint}`
      : `${storageConfig.useSSL ? 'https' : 'http'}://${storageConfig.endpoint}:${storageConfig.port}`;
    const statusCode = error?.$metadata?.httpStatusCode;
    const requestId = error?.$metadata?.requestId;
    console.warn(`⚠️  ${storageLabel} initialization failed:`, error.message || '(no message)');
    if (error?.name || statusCode || requestId) {
      console.warn(`⚠️  ${storageLabel} error details:`, JSON.stringify({
        name: error?.name || null,
        statusCode: statusCode || null,
        requestId: requestId || null,
      }));
    }
    console.warn(`⚠️  Storage target: ${endpoint} (bucket: ${storageConfig.bucketName})`);
    console.warn(`⚠️  Storage public URL: ${storageConfig.publicUrl}`);
    console.warn('⚠️  File uploads will be unavailable until storage credentials/network are healthy.');
    return false;
  }
};

const isStorageAvailable = () => Boolean((minioClient || s3Client) && isBucketReady);

// Helper: generate unique object name
// H003: folder/userId are sanitized so a user-controlled value can never
// escape the intended storage prefix via `../` or absolute paths.
const sanitizePathSegment = (segment, fallback = 'misc') => {
  if (typeof segment !== 'string') return fallback;
  // Keep only safe [a-z0-9-_] and collapse separators to single dashes.
  const cleaned = segment
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
  return cleaned || fallback;
};

const generateObjectName = (folder, userId, originalName) => {
  const safeFolder = sanitizePathSegment(folder, 'misc');
  const safeUserId = sanitizePathSegment(userId, 'unknown');
  let ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
  ext = ext.replace(/[^a-zA-Z0-9]/g, '');
  if (!ext) ext = 'bin';
  return `${safeFolder}/${safeUserId}/${randomUUID()}.${ext}`;
};

// Allowlists for sub-folder segments that are derived from user input.
// Any value not present here falls back to the base folder, never to raw input.
const LICENSE_PROVIDER_TYPES = ['doctor', 'hospital', 'clinic', 'pharmacy', 'diagnostic_center', 'wellness_coach', 'fitness_center', 'ambulance_operator'];
const ENTITY_TYPES = ['hospital', 'clinic', 'pharmacy', 'diagnostic_center', 'wellness_coach', 'fitness_center', 'ambulance_operator', 'medicine', 'doctor', 'patient'];

// ==================== Image Optimization Pipeline ====================

const optimizeOriginalImage = async (buffer) => {
  if (!sharp) return { buffer, contentType: null };
  try {
    const optimized = await sharp(buffer)
      .resize(IMAGE_SIZES.ORIGINAL.maxWidth, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: IMAGE_SIZES.ORIGINAL.quality, effort: 4 })
      .toBuffer();
    return { buffer: optimized, contentType: 'image/webp' };
  } catch (err) {
    console.warn('[Storage] Image optimization failed, storing original:', err.message);
    return { buffer, contentType: null };
  }
};

const generateVariant = async (buffer, width, quality) => {
  if (!sharp) return null;
  try {
    return await sharp(buffer)
      .resize(width, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();
  } catch (err) {
    console.warn(`[Storage] Variant generation (${width}px) failed:`, err.message);
    return null;
  }
};

const putObject = async (objectName, buffer, contentType, cacheControl) => {
  if (storageProvider === 's3') {
    await s3Client.send(new PutObjectCommand({
      Bucket: storageConfig.bucketName,
      Key: objectName,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl,
    }));
    return;
  }

  const metadata = {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  };
  await minioClient.putObject(storageConfig.bucketName, objectName, buffer, buffer.length, metadata);
};

const uploadBuffer = async (objectName, buffer, contentType) => {
  if (!isStorageAvailable()) {
    throw new Error('File storage is not available');
  }

  const isImage = contentType && contentType.startsWith('image/');
  let finalBuffer = buffer;
  let finalContentType = contentType;
  let finalObjectName = objectName;

  if (isImage && sharp) {
    const optimized = await optimizeOriginalImage(buffer);
    finalBuffer = optimized.buffer;
    if (optimized.contentType) {
      finalContentType = optimized.contentType;
      finalObjectName = objectName.replace(/\.[^.]+$/, '.webp');
    }
  }

  const cacheControl = `public, max-age=${CACHE_MAX_AGE}, immutable`;
  await putObject(finalObjectName, finalBuffer, finalContentType, cacheControl);

  const result = {
    objectName: finalObjectName,
    url: buildObjectUrl(finalObjectName),
    size: finalBuffer.length,
    originalSize: buffer.length,
    compressionRatio: isImage ? Math.round((1 - finalBuffer.length / buffer.length) * 100) : 0,
  };

  if (isImage) {
    generateImageVariants(finalObjectName, finalBuffer).catch((err) => {
      console.warn(`[Storage] Variant generation failed for ${finalObjectName}:`, err.message);
    });
  }

  return result;
};

// ==================== Multi-Size Image Variant Generation ====================

const generateImageVariants = async (objectName, originalBuffer) => {
  if (!sharp) return;

  const cacheControl = `public, max-age=${CACHE_MAX_AGE}, immutable`;
  const baseName = objectName.replace(/\.[^.]+$/, '.webp');

  const [thumbBuffer, mediumBuffer] = await Promise.all([
    generateVariant(originalBuffer, IMAGE_SIZES.THUMBNAIL.width, IMAGE_SIZES.THUMBNAIL.quality),
    generateVariant(originalBuffer, IMAGE_SIZES.MEDIUM.width, IMAGE_SIZES.MEDIUM.quality),
  ]);

  const uploads = [];

  if (thumbBuffer) {
    uploads.push(
      putObject(`thumbnails/${baseName}`, thumbBuffer, 'image/webp', cacheControl)
    );
  }

  if (mediumBuffer) {
    uploads.push(
      putObject(`medium/${baseName}`, mediumBuffer, 'image/webp', cacheControl)
    );
  }

  await Promise.all(uploads);
};

const getThumbnailUrl = (objectName) => {
  const baseName = objectName.replace(/\.[^.]+$/, '.webp');
  return buildObjectUrl(`thumbnails/${baseName}`);
};

const getMediumUrl = (objectName) => {
  const baseName = objectName.replace(/\.[^.]+$/, '.webp');
  return buildObjectUrl(`medium/${baseName}`);
};

const getImageVariants = (objectName) => {
  const baseName = objectName.replace(/\.[^.]+$/, '.webp');
  return {
    original: buildObjectUrl(objectName),
    medium: buildObjectUrl(`medium/${baseName}`),
    thumbnail: buildObjectUrl(`thumbnails/${baseName}`),
  };
};

const uploadProfileImage = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.PROFILES, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadDocument = async (file, userId, docType = 'general') => {
  const objectName = generateObjectName(STORAGE_FOLDERS.DOCUMENTS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadReport = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.REPORTS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadPrescription = async (file, patientId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.PRESCRIPTIONS, patientId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadVideo = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.VIDEOS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadLicenseDocument = async (file, userId, providerType) => {
  // H003: allowlist providerType — user-controlled values can never escape the
  // licenses/ prefix into arbitrary storage paths.
  const safeProvider = LICENSE_PROVIDER_TYPES.includes(providerType) ? providerType : null;
  const folder = safeProvider ? `${STORAGE_FOLDERS.LICENSES}/${safeProvider}` : STORAGE_FOLDERS.LICENSES;
  const objectName = generateObjectName(folder, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadEntityImage = async (file, entityId, entityType) => {
  // H003: allowlist entityType (e.g. "../../etc/passwd" now falls back to `entities/`).
  const safeEntityType = ENTITY_TYPES.includes(entityType) ? entityType : null;
  const folder = safeEntityType ? `${STORAGE_FOLDERS.ENTITIES}/${safeEntityType}` : STORAGE_FOLDERS.ENTITIES;
  const objectName = generateObjectName(folder, entityId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadMedicineImage = async (file, medicineId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.MEDICINES, medicineId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadMasterTestImage = async (file, testId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.MASTER_TESTS, testId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadIntakeDocument = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.INTAKE_DOCS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const uploadVoiceNote = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.VOICE_NOTES, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

const getPresignedUrl = async (objectName, expiry = storageConfig.signedUrlExpirySeconds || 3600) => {
  if (!isStorageAvailable()) throw new Error('File storage is not available');

  if (storageProvider === 's3') {
    return getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: storageConfig.bucketName,
        Key: objectName,
      }),
      { expiresIn: expiry }
    );
  }

  return minioClient.presignedGetObject(storageConfig.bucketName, objectName, expiry);
};

// ==================== Global Signed URL Cache ====================
// Avoids redundant S3 presigning calls for the same object across requests.
// A 5-minute TTL is safe because signed URLs themselves last 24 hours.
const SIGN_CACHE_TTL_MS = 5 * 60 * 1000;
const SIGN_CACHE_MAX_SIZE = 500;
const signedUrlGlobalCache = new Map(); // key: objectName, value: { url, expiresAt }

const pruneSignedUrlCache = () => {
  if (signedUrlGlobalCache.size <= SIGN_CACHE_MAX_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of signedUrlGlobalCache) {
    if (entry.expiresAt <= now || signedUrlGlobalCache.size > SIGN_CACHE_MAX_SIZE) {
      signedUrlGlobalCache.delete(key);
    }
  }
};

// M003: evict a cached signed URL immediately. Callers invoke this whenever an
// object is removed/overwritten so clients never receive a signed URL that
// points at a deleted object (they would 404 for the whole TTL window).
const invalidateSignedUrlCache = (objectName) => {
  if (!objectName) return;
  signedUrlGlobalCache.delete(objectName);
};

const signStorageUrl = async (
  fileUrl,
  expiry = storageConfig.signedReadUrlExpirySeconds || storageConfig.signedUrlExpirySeconds || 86400,
  memo = new Map()
) => {
  if (!isStorageObjectUrl(fileUrl)) {
    return fileUrl;
  }

  const objectName = extractObjectNameFromUrl(fileUrl);
  if (!objectName) return fileUrl;

  // Per-request dedup (same URL appearing multiple times in one response)
  if (memo.has(objectName)) {
    return memo.get(objectName);
  }

  // Global process-wide cache with TTL
  const cached = signedUrlGlobalCache.get(objectName);
  if (cached && cached.expiresAt > Date.now()) {
    memo.set(objectName, cached.url);
    return cached.url;
  }

  try {
    const signedUrl = await getPresignedUrl(objectName, expiry);
    memo.set(objectName, signedUrl);
    signedUrlGlobalCache.set(objectName, { url: signedUrl, expiresAt: Date.now() + SIGN_CACHE_TTL_MS });
    pruneSignedUrlCache();
    return signedUrl;
  } catch (error) {
    console.warn(`[Storage] Failed to sign object URL for ${objectName}:`, error.message);
    return fileUrl;
  }
};

const getPresignedUploadUrl = async (
  objectName,
  expiry = storageConfig.signedUploadUrlExpirySeconds || storageConfig.signedUrlExpirySeconds || 3600,
  contentType
) => {
  if (!isStorageAvailable()) throw new Error('File storage is not available');

  if (storageProvider === 's3') {
    return getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: storageConfig.bucketName,
        Key: objectName,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: `public, max-age=${CACHE_MAX_AGE}, immutable`,
      }),
      { expiresIn: expiry }
    );
  }

  return minioClient.presignedPutObject(storageConfig.bucketName, objectName, expiry);
};

const signStorageUrlsInPayload = async (value, options = {}) => {
  const {
    expiry = storageConfig.signedReadUrlExpirySeconds || storageConfig.signedUrlExpirySeconds || 86400,
    memo = new Map(),
    skipKeys = new Set(['storageUrl', 'storage_url', 'objectName', 'object_name']),
  } = options;

  if (value == null) return value;

  if (typeof value === 'string') {
    return signStorageUrl(value, expiry, memo);
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => signStorageUrlsInPayload(item, { expiry, memo, skipKeys })));
  }

  if (typeof value === 'object') {
    // Automatically inject variant URLs for image_url and icon_url
    const objectWithVariants = { ...value };
    for (const key of ['image_url', 'icon_url']) {
      if (typeof objectWithVariants[key] === 'string' && isStorageObjectUrl(objectWithVariants[key])) {
        const objectName = extractObjectNameFromUrl(objectWithVariants[key]);
        if (objectName && !objectName.startsWith(STORAGE_FOLDERS.THUMBNAILS) && !objectName.startsWith(STORAGE_FOLDERS.MEDIUM)) {
          const baseName = objectName.replace(/\.[^.]+$/, '.webp');
          objectWithVariants[`${key}_thumb`] = buildObjectUrl(`thumbnails/${baseName}`);
          objectWithVariants[`${key}_medium`] = buildObjectUrl(`medium/${baseName}`);
        }
      }
    }

    const entries = await Promise.all(
      Object.entries(objectWithVariants).map(async ([key, nestedValue]) => {
        if (skipKeys.has(key)) return [key, nestedValue];
        return [key, await signStorageUrlsInPayload(nestedValue, { expiry, memo, skipKeys })];
      })
    );
    return Object.fromEntries(entries);
  }

  return value;
};

const deleteObject = async (objectName) => {
  // M003: drop cached signed URLs for the deleted object so stale links
  // (that would now return 404) are never served to clients.
  invalidateSignedUrlCache(objectName);

  if (storageProvider === 's3') {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: storageConfig.bucketName,
      Key: objectName,
    }));
    return;
  }

  await minioClient.removeObject(storageConfig.bucketName, objectName);
};

const deleteFile = async (objectName) => {
  if (!isStorageAvailable()) throw new Error('File storage is not available');

  const normalizedObjectName = String(objectName || '').replace(/^\/+/, '');
  if (!normalizedObjectName) return;

  const deleteTargets = new Set([normalizedObjectName]);

  if (!normalizedObjectName.startsWith(`${STORAGE_FOLDERS.THUMBNAILS}/`) && !normalizedObjectName.startsWith(`${STORAGE_FOLDERS.MEDIUM}/`)) {
    const baseName = normalizedObjectName.replace(/\.[^.]+$/, '.webp');
    deleteTargets.add(`thumbnails/${baseName}`);
    deleteTargets.add(`medium/${baseName}`);
  }

  await Promise.allSettled([...deleteTargets].map((target) => deleteObject(target)));
};

/**
 * Safely delete the old image when a URL is replaced in the DB.
 * Accepts a raw storageUrl; silently no-ops for null/empty/non-storage URLs.
 */
const deleteOldImageUrl = async (oldUrl) => {
  if (!oldUrl || typeof oldUrl !== 'string') return;
  const objectName = extractObjectNameFromUrl(oldUrl);
  if (!objectName) return;
  try {
    await deleteFile(objectName);
  } catch (err) {
    console.warn(`[Storage] Failed to clean up old image ${objectName}:`, err.message);
  }
};

const listFiles = async (folder, userId) => {
  if (!isStorageAvailable()) return [];

  const prefix = `${folder}/${userId}/`;

  if (storageProvider === 's3') {
    const files = [];
    let continuationToken;

    do {
      const response = await s3Client.send(new ListObjectsV2Command({
        Bucket: storageConfig.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      for (const obj of response.Contents || []) {
        files.push({
          name: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          url: buildObjectUrl(obj.Key),
        });
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return files;
  }

  const files = [];
  const stream = minioClient.listObjectsV2(storageConfig.bucketName, prefix, true);
  return new Promise((resolve, reject) => {
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified,
        url: buildObjectUrl(obj.name),
      });
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
};

module.exports = {
  minioClient,
  s3Client,
  storageProvider,
  publicBaseUrl,
  initializeBucket,
  isStorageAvailable,
  isStorageObjectUrl,
  uploadBuffer,
  uploadProfileImage,
  uploadDocument,
  uploadReport,
  uploadPrescription,
  uploadVideo,
  uploadLicenseDocument,
  uploadEntityImage,
  uploadMedicineImage,
  uploadMasterTestImage,
  uploadIntakeDocument,
  uploadVoiceNote,

  getPresignedUrl,
  getPresignedUploadUrl,
  signStorageUrl,
  signStorageUrlsInPayload,
  getPublicObjectUrl: buildObjectUrl,
  extractObjectNameFromUrl,
  deleteFile,
  deleteOldImageUrl,
  listFiles,
  generateImageVariants,
  getThumbnailUrl,
  getMediumUrl,
  getImageVariants,
  STORAGE_FOLDERS,
  IMAGE_SIZES,
};
