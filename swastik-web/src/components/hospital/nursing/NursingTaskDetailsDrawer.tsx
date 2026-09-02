'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    HeartPulse,
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
    Pill,
    Activity,
    FileText,
    ShieldAlert,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface NursingTaskDetailsDrawerProps {
    task: any | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (taskId: string, status: string, extraData?: Record<string, any>) => Promise<void>;
    canManageTasks?: boolean;
}

export function NursingTaskDetailsDrawer({
    task,
    isOpen,
    onClose,
    onUpdateStatus,
    canManageTasks = true,
}: NursingTaskDetailsDrawerProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [escalationReason, setEscalationReason] = useState('');
    const [showEscalateInput, setShowEscalateInput] = useState(false);

    if (!isOpen || !task) return null;

    const patient = task.admission?.patient;
    const admission = task.admission;
    const bed = task.admission?.bed;
    const ward = task.ward;
    const doctor = task.admission?.attendingDoctor;

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

    const handleAction = async (newStatus: string, extra?: Record<string, any>) => {
        setActionLoading(newStatus);
        try {
            await onUpdateStatus(task.id, newStatus, extra);
            if (newStatus === 'completed' || newStatus === 'escalated') {
                onClose();
            }
        } finally {
            setActionLoading(null);
        }
    };

    const isPending = task.status === 'pending' || task.status === 'scheduled';
    const isInProgress = task.status === 'in_progress';
    const isCompleted = task.status === 'completed';

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    TASK-{task.id ? task.id.slice(0, 8).toUpperCase() : ''}
                                </span>
                                <StatusBadge status={task.status || 'pending'} size="sm" />
                                {task.priority && task.priority !== 'routine' && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        task.priority === 'stat'
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                                    }`}>
                                        {task.priority}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                Bedside Nursing Care Workspace
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">

                        {/* 1. Patient & Ward Location Card */}
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
                                            {patient?.date_of_birth ? `DOB: ${patient.date_of_birth}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block">Location</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                        {ward?.name || 'Ward'} / Bed {bed?.bed_number || '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Admission No</span>
                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                        {admission?.admission_number || 'IPD-RECORD'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Attending Physician</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                        {doctor?.name ? `Dr. ${doctor.name}` : 'Duty Medical Officer'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Task Details & Scheduled Timing */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Task Details & Instructions</span>
                            </h4>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Care Type:</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 capitalize px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[11px]">
                                        {(task.task_type || 'vitals').replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500 block mb-0.5">Description / Clinical Order:</span>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-gray-800">
                                        {task.task_description || 'Routine nursing care.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Scheduled Time</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {formatDateTime(task.scheduled_at)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Assigned Nurse</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {task.assignedNurse?.name || 'On-Duty Nursing Staff'}
                                        </span>
                                    </div>
                                </div>

                                {task.notes && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                        <span className="text-slate-500 block text-[10px]">Staff Handover Notes</span>
                                        <p className="text-slate-700 dark:text-slate-300 italic">{task.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Clinical Execution Notes (For completing or updating) */}
                        {canManageTasks && !isCompleted && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span>Nursing Execution & Notes</span>
                                </h4>
                                <div className="space-y-2">
                                    <textarea
                                        rows={2}
                                        placeholder="Add bedside observations, administered dose confirmation, or vitals readings..."
                                        value={completionNotes}
                                        onChange={(e) => setCompletionNotes(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />

                                    {showEscalateInput && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl space-y-2">
                                            <span className="text-rose-700 dark:text-rose-300 font-bold block text-xs">
                                                Reason for Clinical Escalation:
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="e.g. Patient unstable, refusal of meds, doctor review required..."
                                                value={escalationReason}
                                                onChange={(e) => setEscalationReason(e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-xl border border-rose-200 bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAction('escalated', { escalationReason, notes: completionNotes })}
                                                    disabled={actionLoading === 'escalated'}
                                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                                                >
                                                    {actionLoading === 'escalated' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Escalation'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEscalateInput(false)}
                                                    className="px-3 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. Link to Full Inpatient IPD Record */}
                        {admission?.id && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Inpatient Admission Workspace
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        View full admission chart, medication history, and discharge planning.
                                    </p>
                                </div>
                                <Link
                                    href={`/hospital/ipd`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                                >
                                    <span>IPD Hub</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-2">
                        {canManageTasks && !isCompleted ? (
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                {isPending && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('in_progress', { notes: completionNotes })}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'in_progress' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                        <span>Start Task</span>
                                    </button>
                                )}
                                {(isPending || isInProgress) && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('completed', { notes: completionNotes })}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'completed' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Mark Completed</span>
                                    </button>
                                )}
                                {!showEscalateInput && task.status !== 'escalated' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowEscalateInput(true)}
                                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-800/60"
                                    >
                                        Escalate
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-semibold">
                                {isCompleted ? '✓ Task is completed and verified.' : ''}
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
