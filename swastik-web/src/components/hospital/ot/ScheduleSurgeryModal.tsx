'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Scissors,
    Calendar,
    Clock,
    User,
    Building2,
    Stethoscope,
    AlertCircle,
    Check,
    Loader2,
    AlertTriangle,
    ShieldAlert
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface ScheduleSurgeryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, any>) => Promise<boolean>;
    rooms: any[];
    doctors: any[];
    admissions: any[];
}

export function ScheduleSurgeryModal({
    isOpen,
    onClose,
    onSubmit,
    rooms,
    doctors,
    admissions,
}: ScheduleSurgeryModalProps) {
    const [patientId, setPatientId] = useState('');
    const [admissionId, setAdmissionId] = useState('');
    const [otRoomId, setOtRoomId] = useState('');
    const [primarySurgeonId, setPrimarySurgeonId] = useState('');
    const [anesthetistId, setAnesthetistId] = useState('');
    const [surgeryName, setSurgeryName] = useState('');
    const [surgeryType, setSurgeryType] = useState('major');
    const [scheduledStart, setScheduledStart] = useState(() => {
        const now = new Date();
        now.setHours(now.getHours() + 1, 0, 0, 0);
        return now.toISOString().slice(0, 16);
    });
    const [estimatedDuration, setEstimatedDuration] = useState('90');
    const [priority, setPriority] = useState('elective');
    const [anesthesiaType, setAnesthesiaType] = useState('general');
    const [preOpDiagnosis, setPreOpDiagnosis] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [checkingConflict, setCheckingConflict] = useState(false);

    // Auto-fill admission and patient
    const handleAdmissionSelect = (admId: string) => {
        setAdmissionId(admId);
        const adm = admissions.find((a) => a.id === admId);
        if (adm?.patient_id) {
            setPatientId(adm.patient_id);
        } else if (adm?.patient?.id) {
            setPatientId(adm.patient.id);
        }
    };

    // Auto-check conflict whenever room, surgeon, or time changes
    useEffect(() => {
        if (!otRoomId || !scheduledStart) {
            setConflictWarning(null);
            return;
        }

        let isCancelled = false;
        const durationMins = parseInt(estimatedDuration, 10) || 60;
        const start = new Date(scheduledStart);
        const end = new Date(start.getTime() + durationMins * 60000);

        const runConflictCheck = async () => {
            setCheckingConflict(true);
            try {
                const res = await hospitalApi.checkOtConflict({
                    otRoomId,
                    scheduledStart: start.toISOString(),
                    scheduledEnd: end.toISOString(),
                    surgeonId: primarySurgeonId || undefined,
                });
                if (!isCancelled) {
                    if (res && res.hasConflict) {
                        setConflictWarning(res.message || 'Scheduling conflict detected for this room or surgeon.');
                    } else {
                        setConflictWarning(null);
                    }
                }
            } catch {
                // Ignore silent preview errors
            } finally {
                if (!isCancelled) setCheckingConflict(false);
            }
        };

        const timer = setTimeout(runConflictCheck, 400);
        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [otRoomId, primarySurgeonId, scheduledStart, estimatedDuration]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId && !admissionId) {
            setError('Please select an admitted patient');
            return;
        }
        if (!otRoomId) {
            setError('Please select an Operation Theatre (OT) Room');
            return;
        }
        if (!primarySurgeonId) {
            setError('Please select the Primary Surgeon');
            return;
        }
        if (!surgeryName.trim()) {
            setError('Surgery / Procedure Name is required');
            return;
        }

        const durationMins = parseInt(estimatedDuration, 10) || 60;
        const startIso = new Date(scheduledStart).toISOString();
        const endIso = new Date(new Date(scheduledStart).getTime() + durationMins * 60000).toISOString();

        setLoading(true);
        setError(null);
        try {
            const success = await onSubmit({
                patientId: patientId || undefined,
                admissionId: admissionId || undefined,
                otRoomId,
                primarySurgeonId,
                anesthetistId: anesthetistId || undefined,
                surgeryName: surgeryName.trim(),
                surgeryType,
                scheduledStart: startIso,
                scheduledEnd: endIso,
                estimatedDuration: durationMins,
                priority,
                anesthesiaType,
                preOpDiagnosis: preOpDiagnosis.trim() || undefined,
                specialInstructions: specialInstructions.trim() || undefined,
            });

            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to schedule surgery');
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

                <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <Scissors className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Schedule Operation Theatre (OT)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Book surgery room, surgeon, and surgical team with conflict checking.
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
                        
                        {/* 1. Patient & Inpatient Admission */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Inpatient Patient <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={admissionId}
                                onChange={(e) => handleAdmissionSelect(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                required
                            >
                                <option value="">Select Inpatient Admission...</option>
                                {admissions.map((adm) => (
                                    <option key={adm.id} value={adm.id}>
                                        {adm.patient?.name || 'Inpatient'} — Ward: {adm.ward?.name || 'General'}, Bed: {adm.bed?.bed_number || '—'} ({adm.admission_number})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Surgery Name & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Procedure / Surgery Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Laparoscopic Cholecystectomy, Total Knee Replacement"
                                    value={surgeryName}
                                    onChange={(e) => setSurgeryName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Surgery Category
                                </label>
                                <select
                                    value={surgeryType}
                                    onChange={(e) => setSurgeryType(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="major">Major Surgery</option>
                                    <option value="minor">Minor Surgery</option>
                                    <option value="day_care">Day Care / Outpatient</option>
                                    <option value="emergency">Emergency STAT</option>
                                </select>
                            </div>
                        </div>

                        {/* 3. OT Room & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                            {r.name} ({r.room_type || 'Major'}) {r.floor ? `- Floor ${r.floor}` : ''}
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
                                    <option value="emergency">Emergency / STAT (Immediate)</option>
                                </select>
                            </div>
                        </div>

                        {/* 4. Surgical Team: Surgeon & Anaesthetist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Primary Surgeon <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={primarySurgeonId}
                                    onChange={(e) => setPrimarySurgeonId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                >
                                    <option value="">Select Surgeon...</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            Dr. {d.name} ({d.specialization || 'Surgery'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Anaesthetist
                                </label>
                                <select
                                    value={anesthetistId}
                                    onChange={(e) => setAnesthetistId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">Select Anaesthetist (Optional)...</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            Dr. {d.name} ({d.specialization || 'Anaesthesia'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 5. Timing & Anesthesia Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Scheduled Start <span className="text-rose-500">*</span>
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

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Anaesthesia Type
                                </label>
                                <select
                                    value={anesthesiaType}
                                    onChange={(e) => setAnesthesiaType(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="general">General (GA)</option>
                                    <option value="spinal">Spinal (SA)</option>
                                    <option value="epidural">Epidural</option>
                                    <option value="local">Local Anesthesia (LA)</option>
                                    <option value="sedation">Sedation / MAC</option>
                                </select>
                            </div>
                        </div>

                        {/* 6. Pre-Op Diagnosis & Instructions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Pre-Operative Diagnosis
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Symptomatic Cholelithiasis"
                                    value={preOpDiagnosis}
                                    onChange={(e) => setPreOpDiagnosis(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Special Instructions / Equipment
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. C-Arm required, 2 units PRBC on stand-by"
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
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
                                disabled={loading || Boolean(conflictWarning)}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Schedule Surgery</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
