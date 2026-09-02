'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    ScanLine,
    User,
    Building2,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Play,
    Check,
    ArrowUpRight,
    Stethoscope,
    ShieldAlert,
    Loader2,
    ExternalLink,
    FileText,
    Activity,
    ClipboardCheck,
    AlertCircle,
    Download,
    QrCode,
    CheckCheck,
    Sparkles,
    Eye
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface RadiologyDetailsDrawerProps {
    study: any | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (studyId: string, status: string, statusData?: Record<string, any>) => Promise<void>;
    canManageRadiology?: boolean;
}

export function RadiologyDetailsDrawer({
    study,
    isOpen,
    onClose,
    onUpdateStatus,
    canManageRadiology = true,
}: RadiologyDetailsDrawerProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'report' | 'protocol'>('details');

    // Reporting input state
    const [impression, setImpression] = useState('');
    const [reportUrl, setReportUrl] = useState('');
    const [reportedBy, setReportedBy] = useState('Consultant Radiologist');
    const [showReportForm, setShowReportForm] = useState(false);

    // Scheduling input state
    const [scheduledAt, setScheduledAt] = useState('');
    const [showScheduleForm, setShowScheduleForm] = useState(false);

    if (!isOpen || !study) return null;

    const patient = study.patient;
    const doctor = study.orderingDoctor;
    const admission = study.admission;

    const formatDateTime = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return d;
        }
    };

    const handleAction = async (status: string, extraData?: Record<string, any>) => {
        setActionLoading(status);
        try {
            await onUpdateStatus(study.id, status, extraData);
            if (status === 'report_approved' || status === 'report_ready') {
                setShowReportForm(false);
                setShowScheduleForm(false);
                onClose();
            }
        } finally {
            setActionLoading(null);
        }
    };

    const isOrdered = study.status === 'ordered';
    const isScheduled = study.status === 'scheduled';
    const isInProgress = study.status === 'in_progress';
    const isCompleted = study.status === 'completed';
    const isReportReady = study.status === 'report_ready';
    const isApproved = study.status === 'report_approved';

    const getModalityBadge = (m?: string) => {
        const mod = (m || 'xray').toLowerCase();
        if (mod.includes('mri')) return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300';
        if (mod.includes('ct')) return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300';
        if (mod.includes('ultra') || mod.includes('usg')) return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300';
        if (mod.includes('mammo')) return 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300';
        if (mod.includes('pet')) return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300';
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-gray-800 dark:text-slate-200';
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-2xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    RAD-{study.id ? study.id.slice(0, 8).toUpperCase() : ''}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getModalityBadge(study.modality)}`}>
                                    {study.modality || 'X-Ray'}
                                </span>
                                <StatusBadge status={study.status || 'ordered'} size="sm" />
                                {study.priority && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        study.priority === 'stat' || study.priority === 'emergency'
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                                            : study.priority === 'urgent'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                                            : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300'
                                    }`}>
                                        {study.priority}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                {study.study_description || `${study.modality?.toUpperCase()} ${study.body_part || 'Study'}`}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-gray-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sub-navigation Tabs */}
                    <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs">
                        {[
                            { id: 'details', label: 'Study & Patient' },
                            { id: 'protocol', label: 'Protocol & Clinical' },
                            { id: 'report', label: 'Radiology Report' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as any)}
                                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                                    activeTab === t.id
                                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">

                        {activeTab === 'details' && (
                            <>
                                {/* 1. Patient Details Card */}
                                <div className="p-4 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                                                {patient?.name ? patient.name[0].toUpperCase() : 'P'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                    {patient?.name || 'Patient'}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {patient?.gender ? `${patient.gender} • ` : ''}
                                                    {patient?.date_of_birth ? `DOB: ${patient.date_of_birth} ` : ''}
                                                    {patient?.blood_group ? `• Blood: ${patient.blood_group}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-400 block">Modality</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase">
                                                {study.modality || 'X-Ray'}
                                            </span>
                                        </div>
                                    </div>

                                    {admission && (
                                        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Admission No</span>
                                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                    {admission.admission_number || 'IPD'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Ward / Bed</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {admission.ward?.name || 'Ward'} / Bed {admission.bed?.bed_number || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Ordering Physician & Timing */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <span>Ordering Physician & Diagnostic Schedule</span>
                                    </h4>
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Ordering Doctor</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                                    Dr. {doctor?.name || 'Duty Medical Officer'}
                                                </span>
                                                <span className="text-[11px] text-slate-500 block">
                                                    {doctor?.specialization || 'Clinical Staff'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Scheduled Scan Time</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                    {formatDateTime(study.scheduled_at)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Ordered At</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                    {formatDateTime(study.created_at)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Scan Completed At</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                    {formatDateTime(study.completed_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'protocol' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                                            <ScanLine className="w-4 h-4 text-teal-600" />
                                            <span>Imaging Protocol & Anatomical Site</span>
                                        </h4>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                                            {study.body_part || 'Whole Body'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-teal-700 dark:text-teal-300">
                                        Patient safety prerequisites and clinical indications for the study.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Body Part / Region</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100">
                                                {study.body_part || 'General'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Laterality</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                                                {study.laterality || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {study.contrast_required && (
                                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2 font-semibold">
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>Contrast Media Required (Verify renal profile & IV cannula prior to scan)</span>
                                        </div>
                                    )}

                                    {study.clinical_indication && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                            <span className="text-slate-400 block text-[10px]">Clinical Indication</span>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{study.clinical_indication}</p>
                                        </div>
                                    )}

                                    {study.patient_preparation && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                            <span className="text-slate-400 block text-[10px]">Patient Preparation</span>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{study.patient_preparation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'report' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-teal-600" />
                                            <span>Radiologist Findings & Impression</span>
                                        </h4>
                                        {study.status === 'report_approved' && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                                <CheckCheck className="w-3 h-3" />
                                                <span>Verified & Released</span>
                                            </span>
                                        )}
                                    </div>

                                    {study.impression ? (
                                        <div className="p-3.5 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 space-y-2">
                                            <span className="text-slate-400 block text-[10px]">Impression / Findings</span>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{study.impression}</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 italic">
                                            Radiologist findings have not yet been documented for this study.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-xs">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Reported By</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {study.reported_by || 'Pending Radiologist'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Reported At</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                                {formatDateTime(study.reported_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scheduling Sub-form */}
                        {showScheduleForm && (
                            <div className="p-4 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl space-y-3 animate-in fade-in">
                                <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs">
                                    Schedule Imaging Scan
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                        Preferred Date & Time <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) => setScheduledAt(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAction('scheduled', { scheduledAt })}
                                        disabled={Boolean(actionLoading) || !scheduledAt}
                                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'scheduled' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Confirm Schedule</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleForm(false)}
                                        className="px-3.5 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Report Entry Sub-form */}
                        {showReportForm && (
                            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                                    Document Radiologist Findings & Finalize Report
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Impression / Diagnostic Findings <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Enter radiological findings, protocol details, comparison with prior imaging, and clinical impression..."
                                        value={impression}
                                        onChange={(e) => setImpression(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Reporting Radiologist
                                        </label>
                                        <input
                                            type="text"
                                            value={reportedBy}
                                            onChange={(e) => setReportedBy(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Report Document URL (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={reportUrl}
                                            onChange={(e) => setReportUrl(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAction('report_ready', {
                                            impression,
                                            reportUrl: reportUrl || undefined,
                                            reportedBy,
                                        })}
                                        disabled={Boolean(actionLoading) || !impression.trim()}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'report_ready' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Submit Report Ready</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowReportForm(false)}
                                        className="px-3.5 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-2">
                        {canManageRadiology && !isApproved ? (
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                {isOrdered && !showScheduleForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleForm(true)}
                                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Schedule Scan</span>
                                    </button>
                                )}

                                {(isOrdered || isScheduled) && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('in_progress')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                        <span>Start Scan</span>
                                    </button>
                                )}

                                {isInProgress && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('completed')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Complete Scan</span>
                                    </button>
                                )}

                                {(isCompleted || isInProgress) && !showReportForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowReportForm(true)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Enter Findings & Ready Report</span>
                                    </button>
                                )}

                                {isReportReady && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('report_approved', { approvedBy: 'Authorized Reviewer' })}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>Approve & Release Report</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-semibold">
                                {isApproved ? '✓ Radiology study approved and released.' : ''}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
