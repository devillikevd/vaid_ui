'use client';

import React, { useState, useId, useEffect } from 'react';
import {
    UserPlus, X, Send, CalendarDays,
    AlertCircle, CheckCircle2, Clock, Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { formatDoctorDisplayName } from '@/components/clinic/EndAffiliationModal';
import { useClinicStore, ClinicDoctor } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';

interface ReinviteDoctorModalProps {
    open: boolean;
    onClose: () => void;
    doctor: ClinicDoctor | null;
    onSuccess?: () => void;
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr?: string | null): string {
    if (!dateStr) return 'Recently';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return dateStr;
    }
}

export function ReinviteDoctorModal({
    open,
    onClose,
    doctor,
    onSuccess,
}: ReinviteDoctorModalProps) {
    const { departments, reinviteDoctor } = useClinicStore();
    const toast = useToast();

    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [customMessage, setCustomMessage] = useState<string>("We'd be happy to have you back at our clinic.");
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [justSent, setJustSent] = useState<boolean>(false);
    const [activePendingInvite, setActivePendingInvite] = useState<any>(null);

    const deptSelectId = useId();
    const messageId = useId();

    useEffect(() => {
        if (open && doctor) {
            setJustSent(false);
            setSubmitting(false);
            setActivePendingInvite(doctor.pending_invite || null);
            setSelectedDeptId('');
            setCustomMessage("We'd be happy to have you back at our clinic.");
        }
    }, [open, doctor]);

    if (!open || !doctor) return null;

    const doctorId = doctor.id || doctor.doctorId;
    const doctorName = formatDoctorDisplayName(doctor.name);
    const specialization = doctor.specialization || 'Specialization not provided';

    const isPending = Boolean(activePendingInvite || justSent || doctor.pending_invite);
    const inviteSentAt = activePendingInvite?.created_at || doctor.pending_invite?.created_at || (justSent ? new Date().toISOString() : null);

    const previousInterval = doctor.joined_at
        ? `${formatDate(doctor.joined_at)} → ${formatDate(doctor.ended_at)}`
        : 'Previous Affiliation Period';

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!doctorId || submitting || isPending) return;

        setSubmitting(true);
        const result = await reinviteDoctor(doctorId, {
            departmentId: selectedDeptId || undefined,
            message: customMessage.trim() || undefined,
        });
        setSubmitting(false);

        if (result.success) {
            setJustSent(true);
            setActivePendingInvite(result.data || { created_at: new Date().toISOString() });
            toast.success(
                'Rejoin Invitation Sent',
                `Invitation sent to ${doctorName}. They must accept before becoming active.`
            );
            onSuccess?.();
        } else if (result.code === 'REJOIN_INVITATION_ALREADY_PENDING' || result.status === 409) {
            setActivePendingInvite(result.details?.pending_invite || { created_at: new Date().toISOString() });
            toast.error(
                'Invitation Already Pending',
                'An invitation has already been sent to this doctor.'
            );
            onSuccess?.();
        } else {
            toast.error('Invitation Failed', result.message || 'Failed to send rejoin invitation.');
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
                className="w-full max-w-lg flex flex-col bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl shrink-0 border ${
                            isPending
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                        }`}>
                            {isPending ? <Clock className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                                {isPending ? 'Rejoin Invitation' : `Invite ${doctorName}`}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {isPending
                                    ? 'An invitation has already been sent to this former doctor.'
                                    : 'Send a rejoin invitation to a former doctor'
                                }
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

                {/* Body */}
                <form onSubmit={handleSubmit} className="space-y-4 py-4 text-sm">
                    {/* Previous Affiliation Notice */}
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
                        <div className="flex items-center gap-3">
                            <DoctorAvatar
                                src={doctor.profile_image_url}
                                name={doctor.name}
                                className="w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                fallbackClassName="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-sm flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                        {doctorName}
                                    </p>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        Former Doctor
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                    {specialization}
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Previous affiliation:</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200 flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                                {previousInterval}
                            </span>
                        </div>
                    </div>

                    {/* Pending Invitation Banner if already sent */}
                    {isPending && (
                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-1.5 text-blue-900 dark:text-blue-200">
                            <div className="flex items-center gap-2 font-extrabold text-xs">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>✓ Invitation Already Sent</span>
                            </div>
                            <p className="text-xs text-blue-800/90 dark:text-blue-300/90 font-medium">
                                A rejoin invitation is already pending for {doctorName}.
                            </p>
                            <div className="pt-1.5 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-400 border-t border-blue-200/60 dark:border-blue-900/60">
                                <span>Sent: <strong>{formatDateTime(inviteSentAt)}</strong></span>
                                <span className="font-semibold text-blue-600 dark:text-blue-300">Waiting for doctor to accept</span>
                            </div>
                        </div>
                    )}

                    {/* Department (Optional) */}
                    <div className="space-y-1.5">
                        <label htmlFor={deptSelectId} className="block text-xs font-extrabold text-gray-900 dark:text-gray-200">
                            New Department (optional)
                        </label>
                        <select
                            id={deptSelectId}
                            value={selectedDeptId}
                            disabled={isPending || submitting}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <option value="">-- No Department (Unassigned) --</option>
                            {departments.filter(d => d.is_active !== false).map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.doctor_count || 0} doctors)
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            The doctor will be assigned to this department after they accept your invitation.
                        </p>
                    </div>

                    {/* Message (Optional) */}
                    <div className="space-y-1.5">
                        <label htmlFor={messageId} className="block text-xs font-extrabold text-gray-900 dark:text-gray-200">
                            Message (optional)
                        </label>
                        <textarea
                            id={messageId}
                            value={customMessage}
                            disabled={isPending || submitting}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Add a personalized note for the doctor..."
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 mt-2">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            {isPending ? 'Close' : 'Cancel'}
                        </Button>
                        {isPending ? (
                            <Button
                                type="button"
                                disabled
                                className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-85"
                                leftIcon={<Clock className="w-4 h-4 text-gray-400" />}
                            >
                                {justSent ? '✓ Invitation Sent' : 'Invitation Pending'}
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                isLoading={submitting}
                                disabled={submitting}
                                leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {submitting ? 'Sending Invitation...' : 'Send Invitation'}
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );
}
