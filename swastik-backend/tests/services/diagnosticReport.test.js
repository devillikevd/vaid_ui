const { extractObjectNameFromUrl, isStorageObjectUrl, isAlreadySignedUrl } = require('../../config/minio');

describe('Diagnostic Report Storage URL & Presigning Security', () => {
    test('extractObjectNameFromUrl correctly extracts object keys from various S3 and storage URL formats', () => {
        // Raw S3 URL
        const s3Url = 'https://swastik-telemedicine.s3.ap-south-1.amazonaws.com/reports/user-123/report-456.webp';
        expect(extractObjectNameFromUrl(s3Url)).toBe('reports/user-123/report-456.webp');

        // Path-style S3 URL
        const pathStyleUrl = 'https://s3.ap-south-1.amazonaws.com/swastik-telemedicine/reports/user-123/report-456.webp';
        expect(extractObjectNameFromUrl(pathStyleUrl)).toBe('reports/user-123/report-456.webp');

        // Direct object path / key
        const directKey = 'reports/user-123/report-456.webp';
        expect(extractObjectNameFromUrl(directKey)).toBe('reports/user-123/report-456.webp');

        // PDF report
        const pdfUrl = 'https://swastik-bucket.s3.amazonaws.com/reports/user-789/blood-test.pdf';
        expect(extractObjectNameFromUrl(pdfUrl)).toBe('reports/user-789/blood-test.pdf');

        // Non-storage URL
        expect(extractObjectNameFromUrl('https://example.com/some/random/image.jpg')).toBeNull();
        expect(extractObjectNameFromUrl(null)).toBeNull();
    });

    test('isStorageObjectUrl identifies storage resources and ignores already signed URLs', () => {
        expect(isStorageObjectUrl('reports/user-123/file.webp')).toBe(true);
        expect(isStorageObjectUrl('https://swastik-telemedicine.s3.amazonaws.com/reports/123/file.webp')).toBe(true);

        // Already signed URL should not be re-signed
        const presignedUrl = 'https://swastik-telemedicine.s3.amazonaws.com/reports/123/file.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test&X-Amz-Signature=abcd';
        expect(isStorageObjectUrl(presignedUrl)).toBe(false);
    });
});
