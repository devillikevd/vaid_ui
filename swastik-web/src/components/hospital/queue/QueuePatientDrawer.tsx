'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    Ticket,
    User,
    Phone,
    Calendar,
    Clock,
    Stethoscope,
    Building2,
    CheckCircle2,
    Play,
    AlertCircle,
    SkipForward,
    ExternalLink,
    Shield,
    FileText,
    Timer,
    UserCheck
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface QueuePatientDrawerProps {
    entry: any | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate: (id: string, status: string, notes?: string) => Promise<void>;
    staffRole?: string;
}

export function QueuePatientDrawer({
    entry,
    isOpen,
    onClose,
    onStatusUpdate,
    staffRole = 'hospital_owner',
}: QueuePatientDrawerProps) {
    const [actionLoading, setActionLoading] = useState(false);

    if (!isOpen || !entry) return null;

    const isAuthorizedStaff = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'receptionist', 'doctor'].includes(staffRole);

    const formatDateTime = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return d;
        }
    };

    const handleAction = async (status: string) => {
        setActionLoading(true);
        try {
            await onStatusUpdate(entry.id, status);
        } finally {
            setActionLoading(false);
        }
    };

    const priorityLabel = (p?: number) => {
        switch (p) {
            case 3:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200">Emergency (3)</span>;
            case 2:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200">VIP Patient (2)</span>;
            case 1:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200">Urgent Care (1)</span>;
            case 0:
            default:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400">Normal (FIFO)</span>;
        }
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
                <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    {entry.display_token || `${entry.token_prefix}-${entry.token_number}`}
                                </span>
                                <StatusBadge status={entry.status} size="sm" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                OPD Queue Workspace
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

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">

                        {/* Operational Actions */}
                        {isAuthorizedStaff && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Queue Flow Operations
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {entry.status === 'waiting' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleAction('in_consultation')}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                                <span>Call / Start Consultation</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAction('skipped')}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <SkipForward className="w-3.5 h-3.5" />
                                                <span>Skip Patient</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAction('no_show')}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span>Mark No Show</span>
                                            </button>
                                        </>
                                    )}

                                    {entry.status === 'in_consultation' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleAction('completed')}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Complete Consultation</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAction('waiting')}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                            >
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span>Return to Waiting Queue</span>
                                            </button>
                                        </>
                                    )}

                                    {['completed', 'skipped', 'no_show', 'cancelled'].includes(entry.status) && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                                            Token is finalized ({entry.status.replace('_', ' ')}).
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 1. Queue Token Status */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Ticket className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Token & Timing Snapshot</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Token Number</span>
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-mono">
                                        {entry.display_token || `${entry.token_prefix}-${entry.token_number}`}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Priority Level</span>
                                    <div className="mt-0.5">{priorityLabel(entry.priority)}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Check-in / Arrival</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {formatDateTime(entry.check_in_time)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Est. Wait Time</span>
                                    <span className="font-bold text-teal-600 dark:text-teal-400">
                                        ~{entry.estimated_wait_minutes || 10} mins
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Registration Source</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                        {entry.source?.replace('_', ' ') || 'Walk-in'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Queue Date</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">
                                        {entry.queue_date || new Date().toISOString().split('T')[0]}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Patient Demographics */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Patient Snapshot</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {entry.patient?.name || entry.patient_name || 'Patient'}
                                        </p>
                                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md font-mono text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
                                            {entry.patient?.uhid || (entry.patient_id ? `UHID-${entry.patient_id.slice(0, 8).toUpperCase()}` : 'Walk-in OPD')}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block">Contact Phone</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {entry.patient_phone || 'Not provided'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Age & Gender</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                            {[entry.patient_gender || entry.patient?.gender, entry.patient_age ? `${entry.patient_age} yrs` : null].filter(Boolean).join(' • ') || '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Doctor & Department */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Doctor & Department Roster</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
                                        {entry.doctor?.name ? entry.doctor.name[0].toUpperCase() : 'D'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">
                                            Dr. {entry.doctor?.name || 'Assigned Physician'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            {entry.doctor?.specialization || 'Physician'}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Department</span>
                                    <span className="font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
                                        {entry.department?.name || 'General OPD'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Reason / Notes */}
                        {entry.reason && (
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 text-xs">
                                <span className="text-[10px] text-slate-400 font-medium block">Visit Reason / Notes</span>
                                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                                    {entry.reason}
                                </p>
                            </div>
                        )}

                        {/* 5. Controlled Clinical Navigation */}
                        {entry.patient_id && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Patient Medical Record
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        Past diagnoses, prescriptions & history reside in Encounters.
                                    </p>
                                </div>
                                <Link
                                    href={`/hospital/encounters?patientId=${encodeURIComponent(entry.patient_id)}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                                >
                                    <span>Open Clinical Record</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close Workspace
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
