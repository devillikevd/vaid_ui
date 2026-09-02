'use client';

import React, { useState } from 'react';
import {
    X,
    Clock,
    User,
    AlertTriangle,
    CheckCircle2,
    HeartPulse,
    ShieldAlert,
    Building2,
    FileText,
    Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ShiftHandoverModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: any[];
    admissions: any[];
    kpis: any;
}

export function ShiftHandoverModal({
    isOpen,
    onClose,
    tasks,
    admissions,
    kpis,
}: ShiftHandoverModalProps) {
    const toast = useToast();
    const [outgoingNotes, setOutgoingNotes] = useState('');
    const [shiftName, setShiftName] = useState('Morning to Evening (02:00 PM Handover)');

    if (!isOpen) return null;

    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const urgentTasks = tasks.filter(t => ['urgent', 'stat', 'high'].includes(t.priority) && t.status !== 'completed');

    const handleConfirmHandover = () => {
        toast.success('Shift Handover Recorded', 'Nursing shift notes and open tasks summarized for incoming team.');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Nursing Shift Handover Summary
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Transfer patient care responsibilities & open tasks to next nursing shift.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                        
                        {/* Current Shift Summary Cards */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-3 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/60 dark:border-gray-700 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">Patients Admitted</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                                    {admissions.length}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/60 dark:border-gray-700 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">Open Tasks</span>
                                <span className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">
                                    {pendingTasks.length}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/60 dark:border-gray-700 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">STAT / Critical</span>
                                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                                    {urgentTasks.length}
                                </span>
                            </div>
                        </div>

                        {/* Critical / High Priority Highlights */}
                        {urgentTasks.length > 0 && (
                            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl space-y-2">
                                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span>High Priority / STAT Orders Pending Handover ({urgentTasks.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {urgentTasks.slice(0, 3).map((task) => (
                                        <div key={task.id} className="text-[11px] text-rose-800 dark:text-rose-300 flex items-center justify-between">
                                            <span>
                                                • <strong>{task.admission?.patient?.name || 'Patient'}</strong> (Bed {task.admission?.bed?.bed_number || '—'}): {task.task_description}
                                            </span>
                                            <span className="font-mono text-[10px] uppercase font-bold px-1.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800">
                                                {task.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shift Handover Notes */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Outgoing Charge Nurse Notes & Observations
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Key observations, newly admitted patients, critical vitals, pending lab results, physician rounds..."
                                value={outgoingNotes}
                                onChange={(e) => setOutgoingNotes(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmHandover}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                Sign & Complete Handover
                            </button>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}
