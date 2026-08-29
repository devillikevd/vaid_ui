'use client';

import React, { useState } from 'react';
import {
    X,
    ExternalLink,
    Download,
    FileText,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface ReportViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportUrl: string | null;
    patientName?: string;
    testName?: string;
    bookingId?: string;
    isLoading?: boolean;
    error?: string | null;
    onRetry?: () => void;
}

export function ReportViewerModal({
    isOpen,
    onClose,
    reportUrl,
    patientName,
    testName,
    bookingId,
    isLoading = false,
    error = null,
    onRetry,
}: ReportViewerModalProps) {
    const [zoom, setZoom] = useState(1);
    const [imageError, setImageError] = useState(false);

    if (!isOpen) return null;

    const isPdf = reportUrl ? /\.pdf($|\?)/i.test(reportUrl) : false;
    const isImage = reportUrl ? /\.(webp|png|jpe?g|gif|svg)($|\?)/i.test(reportUrl) || !isPdf : false;

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
    const handleResetZoom = () => setZoom(1);

    const handleOpenInNewTab = () => {
        if (reportUrl) {
            window.open(reportUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="relative w-full max-w-4xl bg-white dark:bg-[#111c2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 shrink-0">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {testName || 'Diagnostic Report'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                Patient: {patientName || 'Patient'}{bookingId ? ` • ID: ${bookingId.slice(0, 8)}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {reportUrl && !isLoading && !error && (
                            <>
                                {isImage && (
                                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-2">
                                        <button
                                            type="button"
                                            onClick={handleZoomOut}
                                            disabled={zoom <= 0.5}
                                            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30"
                                            title="Zoom Out"
                                        >
                                            <ZoomOut className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetZoom}
                                            className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
                                            title="Reset Zoom"
                                        >
                                            {Math.round(zoom * 100)}%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleZoomIn}
                                            disabled={zoom >= 3}
                                            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30"
                                            title="Zoom In"
                                        >
                                            <ZoomIn className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleOpenInNewTab}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition-colors"
                                    title="Open in new window"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Open in Tab</span>
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                            aria-label="Close report viewer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center min-h-[400px] bg-slate-100/60 dark:bg-slate-950/60">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Generating secure report access...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 max-w-sm text-center">
                            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-8 w-8" />
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                Unable to Load Report
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {error}
                            </p>
                            {onRetry && (
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> Retry Access
                                </button>
                            )}
                        </div>
                    ) : reportUrl ? (
                        isPdf ? (
                            <iframe
                                src={reportUrl}
                                title={testName || 'Report PDF'}
                                className="w-full h-[68vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-sm"
                            />
                        ) : (
                            <div className="overflow-auto max-h-[72vh] flex items-center justify-center w-full">
                                {imageError ? (
                                    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <AlertCircle className="h-8 w-8 text-amber-500" />
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Unable to preview image directly
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleOpenInNewTab}
                                            className="mt-2 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
                                        >
                                            Open in New Tab
                                        </button>
                                    </div>
                                ) : (
                                    <img
                                        src={reportUrl}
                                        alt={testName || 'Diagnostic Report'}
                                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                                        onError={() => setImageError(true)}
                                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm transition-transform duration-150"
                                    />
                                )}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                            <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                            <p className="text-xs font-medium">No report URL available.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
