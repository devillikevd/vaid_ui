'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FileUploadProps {
    label: string;
    accept?: string;
    maxSizeMB?: number;
    value?: File | null;
    onChange: (file: File | null) => void;
    error?: string;
}

export function FileUpload({ label, accept = "image/*,application/pdf", maxSizeMB = 5, value, onChange, error }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [localError, setLocalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (value) {
            if (value.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(value);
                setPreview(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
            } else {
                setPreview('pdf');
            }
        } else {
            setPreview(null);
            setUploadProgress(0);
        }
    }, [value]);

    const handleFile = (file: File) => {
        setLocalError(null);
        if (file.size > maxSizeMB * 1024 * 1024) {
            setLocalError(`File size must be less than ${maxSizeMB}MB`);
            return;
        }

        // Simulate upload progress
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    onChange(file);
                    return 100;
                }
                return prev + 20;
            });
        }, 100);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleRemove = () => {
        onChange(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>

            {!value && uploadProgress === 0 ? (
                <div
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ease-in-out cursor-pointer flex flex-col items-center justify-center text-center
                        ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'}
                        ${displayError ? 'border-red-500 bg-red-500/10' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        accept={accept}
                        className="hidden"
                    />
                    <UploadCloud className={`h-10 w-10 mb-3 ${isDragging ? 'text-emerald-500' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-200">
                        Drag & Drop or <span className="text-emerald-400">Click to Upload</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        Supported: {accept.split(',').map(a => a.split('/')[1]).join(', ')} (Max {maxSizeMB}MB)
                    </p>
                </div>
            ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                    {/* Preview Area */}
                    <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 flex items-center justify-center border border-gray-700">
                        {preview === 'pdf' ? (
                            <FileText className="h-8 w-8 text-rose-500" />
                        ) : preview ? (
                            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>

                    {/* Details & Progress */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                            {value?.name || 'Uploading...'}
                        </p>
                        
                        {uploadProgress < 100 ? (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Uploading...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                                <CheckCircle className="h-3 w-3" /> Upload Complete
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    {uploadProgress === 100 && (
                        <div className="flex items-center gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0" 
                                onClick={() => fileInputRef.current?.click()}
                                title="Replace File"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                                onClick={handleRemove}
                                title="Remove File"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {displayError && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {displayError}
                </p>
            )}
        </div>
    );
}
