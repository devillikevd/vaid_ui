'use client';

import { useRef, useState } from 'react';
import { AlertCircle, ExternalLink, FileText, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { uploadApi } from '@/lib/api';

interface ComplianceDocumentUploadProps {
    label: string;
    providerType: string;
    value?: string | null;
    onChange: (value: string) => void;
    description?: string;
    placeholder?: string;
}

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function ComplianceDocumentUpload({
    label,
    providerType,
    value,
    onChange,
    description,
    placeholder = 'Paste a document URL or upload a PDF/image',
}: ComplianceDocumentUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            setError('Upload a PDF, JPG, PNG, DOC, or DOCX file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Document must be under 10 MB.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const response = await uploadApi.uploadFile(file, 'license', { providerType });
            if (!response.success || !response.data) {
                setError(response.error || 'Upload failed. You can still paste a document URL manually.');
                return;
            }

            const payload = response.data as Record<string, unknown>;
            const storageUrl = String(payload.storageUrl || payload.storage_url || payload.objectUrl || payload.object_url || payload.url || payload.fileUrl || payload.file_url || '');
            const resolvedUrl = String(payload.resolvedUrl || payload.resolved_url || payload.url || payload.fileUrl || payload.file_url || '');
            if (!storageUrl) {
                setError('Upload finished, but the file URL was missing.');
                return;
            }

            onChange(storageUrl);
            setPreviewUrl(resolvedUrl || storageUrl);
        } catch {
            setError('Upload failed. You can still paste a document URL manually.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                    {description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span className="ml-1">{uploading ? 'Uploading' : 'Upload File'}</span>
                    </Button>
                </div>
            </div>

            <Input
                label="Document URL"
                value={value || ''}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
            />

            {(previewUrl || value) && (
                <a
                    href={previewUrl || value || ''}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                >
                    <FileText className="h-4 w-4" />
                    Open current document
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}

            {error && (
                <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}
