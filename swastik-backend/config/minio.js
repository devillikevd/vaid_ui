/**
 * MinIO Configuration (Object Storage)
 * Used for file uploads: profile images, documents, reports, prescriptions, videos
 * Includes WebP thumbnail generation for images (bandwidth optimization)
 */
const Minio = require('minio');
const { v4: uuidv4 } = require('uuid');
const config = require('./index');

// Storage folder structure
const STORAGE_FOLDERS = {
  PROFILES: 'profiles',
  DOCUMENTS: 'documents',
  REPORTS: 'reports',
  PRESCRIPTIONS: 'prescriptions',
  VIDEOS: 'videos',
  LICENSES: 'licenses',
  ENTITIES: 'entities',
  THUMBNAILS: 'thumbnails',
};

let minioClient = null;
let isBucketReady = false;

// Initialize MinIO client
try {
  minioClient = new Minio.Client({
    endPoint: config.minio.endpoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });
} catch (error) {
  console.warn('⚠️  MinIO client initialization failed:', error.message);
}

// Initialize bucket
const initializeBucket = async () => {
  if (!minioClient) {
    console.warn('⚠️  MinIO not available. File uploads will be unavailable.');
    return false;
  }

  try {
    const exists = await minioClient.bucketExists(config.minio.bucketName);
    if (!exists) {
      await minioClient.makeBucket(config.minio.bucketName);
      console.log(`✅ MinIO bucket "${config.minio.bucketName}" created`);
    } else {
      console.log(`✅ MinIO bucket "${config.minio.bucketName}" exists`);
    }
    isBucketReady = true;
    return true;
  } catch (error) {
    console.warn('⚠️  MinIO bucket initialization failed:', error.message);
    console.warn('⚠️  File uploads will be unavailable. Start MinIO with: docker-compose up minio');
    return false;
  }
};

// Helper: generate unique object name
const generateObjectName = (folder, userId, originalName) => {
  const ext = originalName.split('.').pop();
  return `${folder}/${userId}/${uuidv4()}.${ext}`;
};

// Helper: upload file buffer
const uploadBuffer = async (objectName, buffer, contentType) => {
  if (!minioClient || !isBucketReady) {
    throw new Error('File storage is not available');
  }
  await minioClient.putObject(config.minio.bucketName, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });

  const result = {
    objectName,
    url: `${config.minio.publicUrl}/${config.minio.bucketName}/${objectName}`,
    size: buffer.length,
  };

  // Auto-generate thumbnail for images (non-blocking)
  if (contentType && contentType.startsWith('image/')) {
    generateThumbnail(objectName, buffer).catch((err) => {
      console.warn(`[MinIO] Thumbnail generation failed for ${objectName}:`, err.message);
    });
  }

  return result;
};

// ==================== Thumbnail Generation ====================
/**
 * Generates a WebP thumbnail (300px wide) for image uploads.
 * Stored alongside the original with `thumbnails/` prefix.
 * Uses sharp — falls back silently if sharp is not installed.
 */
const generateThumbnail = async (objectName, buffer) => {
  try {
    const sharp = require('sharp');
    const thumbBuffer = await sharp(buffer)
      .resize(300, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    const thumbObjectName = `thumbnails/${objectName.replace(/\.[^.]+$/, '.webp')}`;

    await minioClient.putObject(config.minio.bucketName, thumbObjectName, thumbBuffer, thumbBuffer.length, {
      'Content-Type': 'image/webp',
    });

    return {
      objectName: thumbObjectName,
      url: `${config.minio.publicUrl}/${config.minio.bucketName}/${thumbObjectName}`,
      size: thumbBuffer.length,
    };
  } catch (err) {
    // sharp may not be installed — just skip thumbnails
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('[MinIO] sharp not installed — thumbnail generation skipped. Run: npm install sharp');
    }
    throw err;
  }
};

/**
 * Get the thumbnail URL for a given object (if it exists).
 */
const getThumbnailUrl = (objectName) => {
  const thumbObjectName = `thumbnails/${objectName.replace(/\.[^.]+$/, '.webp')}`;
  return `${config.minio.publicUrl}/${config.minio.bucketName}/${thumbObjectName}`;
};

// Upload profile image
const uploadProfileImage = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.PROFILES, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Upload document
const uploadDocument = async (file, userId, docType = 'general') => {
  const objectName = generateObjectName(STORAGE_FOLDERS.DOCUMENTS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Upload report
const uploadReport = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.REPORTS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Upload prescription
const uploadPrescription = async (file, patientId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.PRESCRIPTIONS, patientId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Upload video
const uploadVideo = async (file, userId) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.VIDEOS, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Upload license document
const uploadLicenseDocument = async (file, userId, providerType) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.LICENSES, userId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Upload entity image
const uploadEntityImage = async (file, entityId, entityType) => {
  const objectName = generateObjectName(STORAGE_FOLDERS.ENTITIES, entityId, file.originalname);
  return uploadBuffer(objectName, file.buffer, file.mimetype);
};

// Get presigned URL for download
const getPresignedUrl = async (objectName, expiry = 3600) => {
  if (!minioClient) throw new Error('File storage is not available');
  return minioClient.presignedGetObject(config.minio.bucketName, objectName, expiry);
};

// Get presigned URL for upload
const getPresignedUploadUrl = async (objectName, expiry = 3600) => {
  if (!minioClient) throw new Error('File storage is not available');
  return minioClient.presignedPutObject(config.minio.bucketName, objectName, expiry);
};

// Delete file
const deleteFile = async (objectName) => {
  if (!minioClient) throw new Error('File storage is not available');
  await minioClient.removeObject(config.minio.bucketName, objectName);
};

// List files in a folder for a user
const listFiles = async (folder, userId) => {
  if (!minioClient) return [];
  const prefix = `${folder}/${userId}/`;
  const files = [];
  const stream = minioClient.listObjectsV2(config.minio.bucketName, prefix, true);
  return new Promise((resolve, reject) => {
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified,
        url: `${config.minio.publicUrl}/${config.minio.bucketName}/${obj.name}`,
      });
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
};

module.exports = {
  minioClient,
  initializeBucket,
  uploadBuffer,
  uploadProfileImage,
  uploadDocument,
  uploadReport,
  uploadPrescription,
  uploadVideo,
  uploadLicenseDocument,
  uploadEntityImage,
  getPresignedUrl,
  getPresignedUploadUrl,
  deleteFile,
  listFiles,
  generateThumbnail,
  getThumbnailUrl,
  STORAGE_FOLDERS,
};
