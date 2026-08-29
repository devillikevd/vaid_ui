'use client';

import { useState, useId } from 'react';
import {
    AlertTriangle, X, ShieldAlert, CalendarClock,
    FileText, UserX
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { useClinicStore } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';
import type { ClinicDoctor } from '@/stores/clinicStore';

/**
 * Normalizes doctor name to avoid duplicate prefixes like "Dr. Dr. Divyanshu"
 */
export function formatDoctorDisplayName(name?: string | null): string {
    if (!name || typeof name !== 'string') return 'Doctor';
    const trimmed = name.trim();
    if (/^dr\.?/i.test(trimmed)) {
        return trimmed;
    }
    return `Dr. ${trimmed}`;
}

const TERMINATION_REASONS = [
    'Doctor left the clinic',
    'Contract / engagement ended',
    'Doctor requested removal',
    'Performance / operational reasons',
    'Clinic restructuring',
    'Doctor moved to another practice',
    'Other',
];

interface EndAffiliationModalProps {
    open: boolean;
    onClose: () => void;
    doctor: ClinicDoctor | null;
    onSuccess?: () => void;
}

export function EndAffiliationModal({
    open,
    onClose,
    doctor,
    onSuccess,
}: EndAffiliationModalProps) {
    const { removeDoctor } = useClinicStore();
    const toast = useToast();

    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [additionalNote, setAdditionalNote] = useState<string>('');
    const [hasConfirmed, setHasConfirmed] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const customReasonId = useId();
    const noteId = useId();
    const reasonSelectId = useId();
    const confirmCheckboxId = useId();

    if (!open || !doctor) return null;

    const doctorId = doctor.id || doctor.doctorId;
    const doctorName = formatDoctorDisplayName(doctor.name);
    const specialization = doctor.specialization?.trim() || 'Specialization not provided';
    const upcomingCount = typeof doctor.upcomingAppointments === 'number'
        ? doctor.upcomingAppointments
        : 0;

    const effectiveReason = selectedReason === 'Other' ? customReason.trim() : selectedReason.trim();
    const isValid = Boolean(selectedReason && (selectedReason !== 'Other' || customReason.trim()) && hasConfirmed);

    const handleConfirm = async () => {
        if (!isValid || !doctorId) return;

        setSubmitting(true);
        const result = await removeDoctor(doctorId, {
            reason: effectiveReason,
            note: additionalNote.trim() || undefined,
        });
        setSubmitting(false);

        if (result.success) {
            if (result.notified) {
                toast.success(
                    'Doctor Affiliation Ended',
                    `Doctor affiliation ended successfully. ${doctorName} has been notified.`
                );
            } else {
                toast.warning(
                    'Doctor Affiliation Ended',
                    `Affiliation ended successfully, but the doctor notification could not be delivered.`
                );
            }
            onSuccess?.();
            onClose();
        } else {
            toast.error('Termination Failed', result.message || 'Failed to end doctor affiliation.');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <Card
                padding="lg"
                className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 shrink-0">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                                End Doctor Affiliation
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                with {doctorName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto space-y-4 py-3.5 pr-1 text-sm">
                    {/* Doctor Info Box */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex items-center gap-3">
                        <DoctorAvatar
                            src={doctor.profile_image_url}
                            name={doctor.name}
                            className="w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                            fallbackClassName="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-sm flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                {doctorName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {specialization}
                            </p>
                        </div>
                    </div>

                    {/* Impact Statement */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            You are about to end this doctor&apos;s affiliation with your clinic.
                        </p>
                        <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 pl-5 list-disc leading-relaxed">
                            <li>The doctor will no longer appear in your active clinic roster.</li>
                            <li>The doctor will no longer receive new clinic bookings.</li>
                            <li>The doctor will no longer be assignable to clinic departments.</li>
                            <li>Existing completed consultation records will remain intact.</li>
                            <li>Existing medical and appointment records remain preserved according to data-retention rules.</li>
                        </ul>
                    </div>

                    {/* Upcoming Appointments Warning (if any) */}
                    {upcomingCount > 0 && (
                        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
                            <CalendarClock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">
                                    This doctor has {upcomingCount} upcoming clinic appointment{upcomingCount === 1 ? '' : 's'}.
                                </p>
                                <p className="mt-0.5 text-red-700 dark:text-red-400/90">
                                    Ending the affiliation will affect future clinic bookings. Please review or reassign these appointments before ending the affiliation.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Form: Reason for Ending Affiliation */}
                    <div className="space-y-1.5">
                        <label htmlFor={reasonSelectId} className="block text-xs font-extrabold text-gray-900 dark:text-gray-200">
                            Reason for ending affiliation <span className="text-red-500">*</span>
                        </label>
                        <select
                            id={reasonSelectId}
                            value={selectedReason}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        >
                            <option value="">-- Select a reason --</option>
                            {TERMINATION_REASONS.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Reason Field if "Other" is chosen */}
                    {selectedReason === 'Other' && (
                        <div className="space-y-1.5 animate-in fade-in duration-150">
                            <label htmlFor={customReasonId} className="block text-xs font-extrabold text-gray-900 dark:text-gray-200">
                                Please specify the reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id={customReasonId}
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Explain why the affiliation is being ended..."
                                rows={2}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                            />
                        </div>
                    )}

                    {/* Optional Note to Doctor */}
                    <div className="space-y-1.5">
                        <label htmlFor={noteId} className="block text-xs font-extrabold text-gray-900 dark:text-gray-200 flex items-center justify-between">
                            <span>Additional note (optional)</span>
                            <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Included in notification
                            </span>
                        </label>
                        <textarea
                            id={noteId}
                            value={additionalNote}
                            onChange={(e) => setAdditionalNote(e.target.value)}
                            placeholder="Add any additional context for the doctor..."
                            rows={2}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        />
                    </div>

                    {/* Confirmation Checkbox */}
                    <div className="pt-2">
                        <label
                            htmlFor={confirmCheckboxId}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/80 cursor-pointer select-none"
                        >
                            <input
                                type="checkbox"
                                id={confirmCheckboxId}
                                checked={hasConfirmed}
                                onChange={(e) => setHasConfirmed(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 shrink-0"
                            />
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">
                                I understand that ending this affiliation will remove this doctor from the clinic&apos;s active roster and clinic booking flow.
                            </span>
                        </label>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 mt-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        isLoading={submitting}
                        disabled={!isValid || submitting}
                        leftIcon={<UserX className="w-4 h-4" />}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm disabled:opacity-50"
                    >
                        {submitting ? 'Ending Affiliation...' : 'End Affiliation'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
