'use client';

import React, { useState } from 'react';
import {
    X,
    HeartPulse,
    User,
    Calendar,
    Clock,
    AlertCircle,
    Check,
    Loader2,
    Building2
} from 'lucide-react';

interface NewNursingTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, any>) => Promise<boolean>;
    admissions: any[];
    staffMembers?: any[];
}

export function NewNursingTaskModal({
    isOpen,
    onClose,
    onSubmit,
    admissions,
    staffMembers = [],
}: NewNursingTaskModalProps) {
    const [admissionId, setAdmissionId] = useState('');
    const [taskType, setTaskType] = useState('vitals');
    const [taskDescription, setTaskDescription] = useState('');
    const [priority, setPriority] = useState('routine');
    const [scheduledAt, setScheduledAt] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        return now.toISOString().slice(0, 16);
    });
    const [notes, setNotes] = useState('');
    const [assignedNurseId, setAssignedNurseId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const selectedAdmission = admissions.find((a) => a.id === admissionId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admissionId) {
            setError('Please select an admitted patient');
            return;
        }
        if (!taskDescription.trim()) {
            setError('Task description / clinical order is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onSubmit({
                admissionId,
                wardId: selectedAdmission?.ward_id || selectedAdmission?.ward?.id || null,
                bedId: selectedAdmission?.bed_id || selectedAdmission?.bed?.id || null,
                taskType,
                taskDescription: taskDescription.trim(),
                priority,
                scheduledAt: new Date(scheduledAt).toISOString(),
                notes: notes.trim() || null,
                assignedNurseId: assignedNurseId || null,
            });
            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create nursing task');
        } finally {
            setLoading(false);
        }
    };

    const taskTypes = [
        { id: 'vitals', label: 'Vitals Monitoring (BP/Pulse/SpO2/Temp)' },
        { id: 'medication', label: 'Oral / Topical Medication' },
        { id: 'injection', label: 'IM / SC / IV Injection' },
        { id: 'iv_fluids', label: 'IV Infusion / Fluid Management' },
        { id: 'wound_care', label: 'Dressing & Wound Care' },
        { id: 'catheter_care', label: 'Catheter / Drain Care' },
        { id: 'nebulization', label: 'Nebulization / Respiratory Care' },
        { id: 'blood_sugar', label: 'Blood Glucose (CBG / GRBS)' },
        { id: 'assessment', label: 'Nursing Clinical Assessment' },
        { id: 'discharge_prep', label: 'Discharge Summary & Patient Education' },
        { id: 'other', label: 'Other Bedside Care' },
    ];

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
                                <HeartPulse className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Schedule Nursing Task
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Assign bedside care order for an inpatient.
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

                    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                        
                        {/* Inpatient Admission Selection */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Inpatient Patient <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={admissionId}
                                onChange={(e) => setAdmissionId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                required
                            >
                                <option value="">Select Admitted Patient...</option>
                                {admissions.map((adm) => (
                                    <option key={adm.id} value={adm.id}>
                                        {adm.patient?.name || 'Inpatient'} — Ward: {adm.ward?.name || 'General'}, Bed: {adm.bed?.bed_number || '—'} ({adm.admission_number})
                                    </option>
                                ))}
                            </select>

                            {selectedAdmission && (
                                <div className="mt-2 p-2 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/60 text-[11px] text-teal-800 dark:text-teal-300 flex items-center justify-between">
                                    <span>
                                        Location: <strong>{selectedAdmission.ward?.name || 'Ward'} / Bed {selectedAdmission.bed?.bed_number || '—'}</strong>
                                    </span>
                                    <span>
                                        Doctor: <strong>Dr. {selectedAdmission.attendingDoctor?.name || 'Assigned'}</strong>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Task Type & Priority in 2 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Care Type <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    {taskTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.label}
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
                                    <option value="routine">Routine Care</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT / Emergency</option>
                                </select>
                            </div>
                        </div>

                        {/* Task Description / Clinical Order */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Clinical Order / Instructions <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g. Check BP & SpO2 every 2 hours, record fluid balance, administer paracetamol 500mg IV..."
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                required
                            />
                        </div>

                        {/* Scheduled At & Nurse */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Scheduled Time <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Assigned Staff / Nurse
                                </label>
                                <input
                                    type="text"
                                    placeholder="Duty Staff / Nurse on duty"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
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
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Schedule Task</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
