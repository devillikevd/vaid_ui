'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    Scissors,
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
    Syringe,
    HeartPulse,
    ClipboardCheck,
    AlertCircle
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface OtDetailsDrawerProps {
    surgery: any | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (surgeryId: string, status: string, notes?: Record<string, any>) => Promise<void>;
    onOpenReschedule: (surgery: any) => void;
    canManageOt?: boolean;
}

export function OtDetailsDrawer({
    surgery,
    isOpen,
    onClose,
    onUpdateStatus,
    onOpenReschedule,
    canManageOt = true,
}: OtDetailsDrawerProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'pre_op' | 'clinical'>('details');

    // Clinical update state for completion
    const [operativeNotes, setOperativeNotes] = useState('');
    const [postOpDiagnosis, setPostOpDiagnosis] = useState('');
    const [bloodLoss, setBloodLoss] = useState('');
    const [complications, setComplications] = useState('');
    const [showCompleteForm, setShowCompleteForm] = useState(false);

    if (!isOpen || !surgery) return null;

    const patient = surgery.patient;
    const admission = surgery.admission;
    const room = surgery.otRoom;
    const surgeon = surgery.primarySurgeon;
    const anesthetist = surgery.anesthetist;

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

    const handleStatusTransition = async (newStatus: string, notes?: Record<string, any>) => {
        setActionLoading(newStatus);
        try {
            await onUpdateStatus(surgery.id, newStatus, notes);
            if (newStatus === 'completed' || newStatus === 'cancelled') {
                setShowCompleteForm(false);
                onClose();
            }
        } finally {
            setActionLoading(null);
        }
    };

    const isScheduled = surgery.status === 'scheduled';
    const isPreOp = surgery.status === 'pre_op' || surgery.status === 'ready';
    const isInSurgery = surgery.status === 'in_progress';
    const isRecovery = surgery.status === 'post_op';
    const isCompleted = surgery.status === 'completed';
    const isCancelled = surgery.status === 'cancelled' || surgery.status === 'postponed';

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
                                    OT-{surgery.id ? surgery.id.slice(0, 8).toUpperCase() : ''}
                                </span>
                                <StatusBadge status={surgery.status || 'scheduled'} size="sm" />
                                {surgery.priority && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        surgery.priority === 'emergency'
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                                            : surgery.priority === 'urgent' || surgery.priority === 'stat'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                                            : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300'
                                    }`}>
                                        {surgery.priority}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                {surgery.surgery_name || 'Surgical Case Workspace'}
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
                            { id: 'details', label: 'Surgery Overview' },
                            { id: 'pre_op', label: 'Pre-Op Readiness' },
                            { id: 'clinical', label: 'Clinical Documentation' },
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
                                {/* 1. Patient & Location Card */}
                                <div className="p-4 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                                                {patient?.name ? patient.name[0].toUpperCase() : 'P'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                    {patient?.name || 'Inpatient'}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {patient?.gender ? `${patient.gender} • ` : ''}
                                                    {patient?.date_of_birth ? `DOB: ${patient.date_of_birth} ` : ''}
                                                    {patient?.blood_group ? `• Blood: ${patient.blood_group}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-400 block">Theatre Location</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                {room?.name || 'OT Room'} {room?.floor ? `(Floor ${room.floor})` : ''}
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
                                                <span className="text-slate-400 block text-[10px]">Ward / Inpatient Bed</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {admission.ward?.name || 'General'} / Bed {admission.bed?.bed_number || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Surgical Team */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <span>Surgical & Anesthetic Team</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Primary Surgeon</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block mt-0.5">
                                                {surgeon?.name ? `Dr. ${surgeon.name}` : 'Assigned Surgeon'}
                                            </span>
                                            <span className="text-[11px] text-teal-600 dark:text-teal-400">
                                                {surgeon?.specialization || 'General Surgery'}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Anaesthetist</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block mt-0.5">
                                                {anesthetist?.name ? `Dr. ${anesthetist.name}` : 'On-Duty Anaesthetist'}
                                            </span>
                                            <span className="text-[11px] text-purple-600 dark:text-purple-400">
                                                {surgery.anesthesia_type ? `Type: ${surgery.anesthesia_type}` : 'Anesthesia Care'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Timing & Duration Schedule */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <span>Timing & Theatre Allocation</span>
                                    </h4>
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Scheduled Start</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                    {formatDateTime(surgery.scheduled_start)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Expected End</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                    {formatDateTime(surgery.scheduled_end)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Estimated Duration</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {surgery.estimated_duration_minutes || 60} minutes
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Surgery Category</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                                    {surgery.surgery_type || 'Major'}
                                                </span>
                                            </div>
                                        </div>

                                        {surgery.special_instructions && (
                                            <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                                <span className="text-slate-400 block text-[10px]">Special Instructions / Equipment</span>
                                                <p className="text-slate-700 dark:text-slate-300 font-medium">{surgery.special_instructions}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'pre_op' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800 rounded-2xl">
                                    <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                                        <ClipboardCheck className="w-4 h-4 text-teal-600" />
                                        <span>WHO Surgical Safety & Pre-Op Checklist</span>
                                    </h4>
                                    <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-1">
                                        Confirm all clinical clearances prior to rolling patient into the theatre.
                                    </p>
                                </div>

                                <div className="space-y-2.5">
                                    {[
                                        { key: 'consent', label: 'Informed Surgical Consent Obtained & Signed', status: surgery.consent_obtained },
                                        { key: 'pre_op_diag', label: 'Pre-Operative Diagnosis Verified', status: Boolean(surgery.pre_op_diagnosis) },
                                        { key: 'anesthesia', label: 'Anaesthesia Pre-Assessment Cleared', status: Boolean(surgery.anesthesia_type) },
                                        { key: 'site', label: 'Surgical Site Marked & Verified (Laterality)', status: Boolean(surgery.laterality) },
                                    ].map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-2xl border border-slate-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.status ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                                )}
                                                <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                item.status
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                            }`}>
                                                {item.status ? 'Verified' : 'Pending'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'clinical' && (
                            <div className="space-y-3">
                                <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-2.5">
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">Pre-Operative Diagnosis</span>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs mt-0.5">
                                            {surgery.pre_op_diagnosis || 'Not specified'}
                                        </p>
                                    </div>

                                    {surgery.post_op_diagnosis && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                            <span className="text-slate-400 block text-[10px]">Post-Operative Diagnosis</span>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs mt-0.5">
                                                {surgery.post_op_diagnosis}
                                            </p>
                                        </div>
                                    )}

                                    {surgery.operative_notes && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                            <span className="text-slate-400 block text-[10px]">Operative Surgeon Notes</span>
                                            <p className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap mt-0.5">
                                                {surgery.operative_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Completion / Operative Notes Form */}
                        {showCompleteForm && (
                            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                                    Complete Surgery & Document Operative Summary
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Post-Operative Diagnosis
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Acute appendicitis with localized peritonitis"
                                        value={postOpDiagnosis}
                                        onChange={(e) => setPostOpDiagnosis(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Operative Notes & Procedure Details
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Procedure summary, findings, suture details, drains placed..."
                                        value={operativeNotes}
                                        onChange={(e) => setOperativeNotes(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStatusTransition('completed', {
                                            postOpDiagnosis,
                                            operativeNotes,
                                            bloodLoss,
                                            complications,
                                        })}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'completed' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Confirm Completion</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCompleteForm(false)}
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
                        {canManageOt && !isCompleted && !isCancelled ? (
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                {isScheduled && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleStatusTransition('pre_op')}
                                            disabled={Boolean(actionLoading)}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            Mark Pre-Op
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onOpenReschedule(surgery)}
                                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                        >
                                            Reschedule
                                        </button>
                                    </>
                                )}

                                {isPreOp && (
                                    <button
                                        type="button"
                                        onClick={() => handleStatusTransition('in_progress')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'in_progress' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                        <span>Start Surgery</span>
                                    </button>
                                )}

                                {isInSurgery && (
                                    <button
                                        type="button"
                                        onClick={() => handleStatusTransition('post_op')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        Send to Recovery
                                    </button>
                                )}

                                {isRecovery && !showCompleteForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowCompleteForm(true)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Complete Surgery</span>
                                    </button>
                                )}

                                {!showCompleteForm && (
                                    <button
                                        type="button"
                                        onClick={() => handleStatusTransition('cancelled')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        Cancel Surgery
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-semibold">
                                {isCompleted ? '✓ Surgery successfully completed and documented.' : isCancelled ? '⚠ Surgery cancelled.' : ''}
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
