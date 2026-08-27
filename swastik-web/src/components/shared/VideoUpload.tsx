'use client';

import { useState, useRef } from 'react';
import { Video, Loader2, X, Upload } from 'lucide-react';
import { uploadApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VideoUploadProps {
    currentVideo?: string | null;
    onUploadComplete: (url: string) => void;
}

export function VideoUpload({
    currentVideo,
    onUploadComplete,
}: VideoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentVideo || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate
        if (!file.type.startsWith('video/')) {
            setError('Please upload a valid video file (MP4, WebM, etc.).');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setError('Video must be under 20 MB.');
            return;
        }

        setError(null);
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setUploading(true);

        try {
            const res = await uploadApi.uploadFile(file, 'video');
            if (res.success) {
                const data = res.data as any;
                const url = data?.url || data?.fileUrl || (res as any).url;
                onUploadComplete(url);
            } else {
                throw new Error(res.message || 'Upload failed');
            }
        } catch (err: any) {
            console.error('Video upload error:', err);
            setError(err.message || 'Failed to upload video. Please try again.');
            setPreview(currentVideo || null);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 w-full max-w-sm aspect-video flex items-center justify-center">
                {preview ? (
                    <video 
                        src={preview} 
                        controls 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-400">
                        <Video size={48} className="mb-2 opacity-50" />
                        <span className="text-sm text-center px-4">No video uploaded<br/>(15-sec intro reel)</span>
                    </div>
                )}
                
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-medium">Uploading...</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/*"
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-50"
                >
                    <Upload size={16} />
                    {preview ? 'Change Video' : 'Upload Video'}
                </button>
                {preview && !uploading && (
                    <button
                        type="button"
                        onClick={() => {
                            setPreview(null);
                            onUploadComplete('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove Video"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
