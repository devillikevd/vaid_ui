'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Calendar,
    Clock,
    Scissors,
    AlertCircle,
    Check,
    Loader2,
    ShieldAlert
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface RescheduleSurgeryModalProps {
    surgery: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (surgeryId: string, data: Record<string, any>) => Promise<boolean>;
    rooms: any[];
    doctors: any[];
}

export function RescheduleSurgeryModal({
    surgery,
    isOpen,
    onClose,
    onSubmit,
    rooms,
    doctors,
}: RescheduleSurgeryModalProps) {
    const [otRoomId, setOtRoomId] = useState('');
    const [primarySurgeonId, setPrimarySurgeonId] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [estimatedDuration, setEstimatedDuration] = useState('90');
    const [priority, setPriority] = useState('elective');
    const [specialInstructions, setSpecialInstructions] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    useEffect(() => {
        if (surgery) {
            setOtRoomId(surgery.ot_room_id || surgery.otRoom?.id || '');
            setPrimarySurgeonId(surgery.primary_surgeon_id || surgery.primarySurgeon?.id || '');
            if (surgery.scheduled_start) {
                const local = new Date(surgery.scheduled_start).toISOString().slice(0, 16);
                setScheduledStart(local);
            }
            setEstimatedDuration(String(surgery.estimated_duration_minutes || 90));
            setPriority(surgery.priority || 'elective');
            setSpecialInstructions(surgery.special_instructions || '');
        }
    }, [surgery]);

    // Live conflict check on change
    useEffect(() => {
        if (!otRoomId || !scheduledStart || !surgery?.id) {
            setConflictWarning(null);
            return;
        }

        let isCancelled = false;
        const durationMins = parseInt(estimatedDuration, 10) || 60;
        const start = new Date(scheduledStart);
        const end = new Date(start.getTime() + durationMins * 60000);

        const runConflictCheck = async () => {
            try {
                const res = await hospitalApi.checkOtConflict({
                    otRoomId,
                    scheduledStart: start.toISOString(),
                    scheduledEnd: end.toISOString(),
                    surgeonId: primarySurgeonId || undefined,
                    excludeId: surgery.id,
                });
                if (!isCancelled) {
                    if (res && res.hasConflict) {
                        setConflictWarning(res.message || 'Scheduling conflict detected.');
                    } else {
                        setConflictWarning(null);
                    }
                }
            } catch {
                // Ignore silent preview check errors
            }
        };

        const timer = setTimeout(runConflictCheck, 400);
        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [otRoomId, primarySurgeonId, scheduledStart, estimatedDuration, surgery?.id]);

    if (!isOpen || !surgery) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otRoomId || !scheduledStart) {
            setError('OT Room and Scheduled Start time are required');
            return;
        }

        const durationMins = parseInt(estimatedDuration, 10) || 60;
        const startIso = new Date(scheduledStart).toISOString();
        const endIso = new Date(new Date(scheduledStart).getTime() + durationMins * 60000).toISOString();

        setLoading(true);
        setError(null);
        try {
            const success = await onSubmit(surgery.id, {
                otRoomId,
                primarySurgeonId: primarySurgeonId || undefined,
                scheduledStart: startIso,
                scheduledEnd: endIso,
                estimatedDuration: durationMins,
                priority,
                specialInstructions: specialInstructions.trim() || undefined,
            });

            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to reschedule surgery');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Reschedule Surgery
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {surgery.surgery_name} • {surgery.patient?.name}
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

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {conflictWarning && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs">
                            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-semibold">{conflictWarning}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                        
                        {/* OT Room */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Operation Theatre Room <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={otRoomId}
                                onChange={(e) => setOtRoomId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                required
                            >
                                <option value="">Select OT Room...</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} ({r.room_type || 'Major'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Scheduled Start & Duration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    New Scheduled Start <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduledStart}
                                    onChange={(e) => setScheduledStart(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Duration (Minutes)
                                </label>
                                <input
                                    type="number"
                                    min="15"
                                    step="15"
                                    value={estimatedDuration}
                                    onChange={(e) => setEstimatedDuration(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Surgeon & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Primary Surgeon
                                </label>
                                <select
                                    value={primarySurgeonId}
                                    onChange={(e) => setPrimarySurgeonId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">Keep Assigned Surgeon</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            Dr. {d.name} ({d.specialization || 'Surgery'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Priority Level
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="elective">Elective / Routine</option>
                                    <option value="urgent">Urgent (Within 24h)</option>
                                    <option value="emergency">Emergency / STAT</option>
                                </select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Reason / Special Instructions
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Rescheduled due to emergency case override"
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || Boolean(conflictWarning)}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Confirm Reschedule</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
