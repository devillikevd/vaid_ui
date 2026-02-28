/**
 * File Upload Routes
 * Handles file uploads to MinIO storage
 * Security: magic byte validation on all file uploads
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate: authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const { ApiError } = require('../middleware/errorHandler');
const {
    validateMagicBytes,
    ALLOWED_IMAGE_MIMES,
    ALLOWED_DOC_MIMES,
    ALLOWED_MEDICAL_MIMES,
    ALLOWED_VIDEO_MIMES,
} = require('../middleware/upload');
const {
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
    STORAGE_FOLDERS,
} = require('../config/minio');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
    },
});

// ==================== PROFILE IMAGES ====================

/**
 * @route POST /api/uploads/profile
 * @desc Upload profile image
 * @access Private
 */
router.post('/profile', authenticateToken, upload.single('file'), validateMagicBytes(ALLOWED_IMAGE_MIMES), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const result = await uploadProfileImage(req.file, req.user.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== DOCUMENTS ====================

/**
 * @route POST /api/uploads/document
 * @desc Upload general document
 * @access Private
 */
router.post('/document', authenticateToken, upload.single('file'), validateMagicBytes(ALLOWED_DOC_MIMES), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const docType = req.body.type || 'general';
        const result = await uploadDocument(req.file, req.user.id, docType);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== MEDICAL REPORTS ====================

/**
 * @route POST /api/uploads/report
 * @desc Upload medical report
 * @access Private
 */
router.post('/report', authenticateToken, upload.single('file'), validateMagicBytes(ALLOWED_MEDICAL_MIMES), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const result = await uploadReport(req.file, req.user.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== PRESCRIPTIONS ====================

/**
 * @route POST /api/uploads/prescription
 * @desc Upload prescription document
 * @access Private (Doctor only)
 */
router.post('/prescription', authenticateToken, requireRole(ROLES.DOCTOR), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        // Optionally associate with patient
        const patientId = req.body.patientId || req.user.id;
        const result = await uploadPrescription(req.file, patientId);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== VIDEOS ====================

/**
 * @route POST /api/uploads/video
 * @desc Upload video file
 * @access Private
 */
router.post('/video', authenticateToken, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const result = await uploadVideo(req.file, req.user.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== LICENSE DOCUMENTS ====================

/**
 * @route POST /api/uploads/license
 * @desc Upload license/verification document
 * @access Private (Providers only)
 */
router.post('/license', authenticateToken, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const providerType = req.body.providerType || 'general';
        const result = await uploadLicenseDocument(req.file, req.user.id, providerType);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== ENTITY IMAGES ====================

/**
 * @route POST /api/uploads/entity
 * @desc Upload entity image (hospital, clinic, pharmacy)
 * @access Private (Entity owners)
 */
router.post('/entity', authenticateToken, requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER, ROLES.CLINIC_OWNER, ROLES.PHARMACY_OWNER, ROLES.DIAGNOSTIC_CENTER_OWNER, ROLES.ADMIN, ROLES.SUPER_ADMIN), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'No file uploaded');
        }

        const { entityId, entityType } = req.body;
        if (!entityId || !entityType) {
            throw new ApiError(400, 'Entity ID and type are required');
        }

        const result = await uploadEntityImage(req.file, entityId, entityType);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== MULTIPLE FILES ====================

/**
 * @route POST /api/uploads/multiple
 * @desc Upload multiple files
 * @access Private
 */
router.post('/multiple', authenticateToken, upload.array('files', 10), async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            throw new ApiError(400, 'No files uploaded');
        }

        const folder = req.body.folder || STORAGE_FOLDERS.DOCUMENTS;
        const results = await Promise.all(
            req.files.map(file => uploadDocument(file, req.user.id, folder))
        );

        res.json({
            success: true,
            data: results,
            count: results.length,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== PRESIGNED URLS ====================

/**
 * @route GET /api/uploads/presigned-download
 * @desc Get presigned URL for file download
 * @access Private
 */
router.get('/presigned-download', authenticateToken, async (req, res, next) => {
    try {
        const { fileName, expiry } = req.query;

        if (!fileName) {
            throw new ApiError(400, 'File name is required');
        }

        // C8 Fix: Verify user owns this file (file path contains user ID) or is admin
        if (!fileName.includes(req.user.id) && !['admin', 'super_admin'].includes(req.user.role)) {
            throw new ApiError(403, 'You do not have permission to access this file');
        }

        const url = await getPresignedUrl(fileName, parseInt(expiry) || 3600);

        res.json({
            success: true,
            data: { url, expiresIn: parseInt(expiry) || 3600 },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route POST /api/uploads/presigned-upload
 * @desc Get presigned URL for client-side upload
 * @access Private
 */
router.post('/presigned-upload', authenticateToken, async (req, res, next) => {
    try {
        const { fileName, folder, mimeType } = req.body;

        if (!fileName) {
            throw new ApiError(400, 'File name is required');
        }

        const folderPath = folder || STORAGE_FOLDERS.DOCUMENTS;
        const objectName = `${folderPath}/${req.user.id}/${Date.now()}-${fileName}`;

        const url = await getPresignedUploadUrl(objectName);

        res.json({
            success: true,
            data: {
                uploadUrl: url,
                objectName,
                publicUrl: `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET_NAME}/${objectName}`,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ==================== FILE MANAGEMENT ====================

/**
 * @route GET /api/uploads/list
 * @desc List files in a folder for current user
 * @access Private
 */
router.get('/list', authenticateToken, async (req, res, next) => {
    try {
        const folder = req.query.folder || STORAGE_FOLDERS.DOCUMENTS;
        const files = await listFiles(folder, req.user.id);

        res.json({
            success: true,
            data: files,
            count: files.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route DELETE /api/uploads/:fileName
 * @desc Delete a file
 * @access Private
 */
router.delete('/:fileName(*)', authenticateToken, async (req, res, next) => {
    try {
        const { fileName } = req.params;

        // Verify user owns this file (filename contains user ID)
        if (!fileName.includes(req.user.id)) {
            throw new ApiError(403, 'You do not have permission to delete this file');
        }

        await deleteFile(fileName);

        res.json({
            success: true,
            message: 'File deleted successfully',
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
