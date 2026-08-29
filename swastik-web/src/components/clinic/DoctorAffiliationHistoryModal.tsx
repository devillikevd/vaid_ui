'use client';

import React, { useEffect, useState } from 'react';
import {
    History as HistoryIcon, X, Calendar, FileText, CheckCircle2,
    Clock, UserPlus, AlertCircle, Loader2, Award, CalendarDays
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { formatDoctorDisplayName } from '@/components/clinic/EndAffiliationModal';
import { useClinicStore, ClinicDoctor } from '@/stores/clinicStore';

interface DoctorAffiliationHistoryModalProps {
    open: boolean;
    onClose: () => void;
    doctor: ClinicDoctor | null;
    onInviteAgain?: (doctor: ClinicDoctor) => void;
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

export function DoctorAffiliationHistoryModal({
    open,
    onClose,
    doctor,
    onInviteAgain,
}: DoctorAffiliationHistoryModalProps) {
    const { fetchDoctorAffiliationHistory } = useClinicStore();
    const [loading, setLoading] = useState<boolean>(true);
    const [historyData, setHistoryData] = useState<any>(null);

    useEffect(() => {
        if (open && doctor) {
            const docId = doctor.id || doctor.doctorId;
            setLoading(true);
            fetchDoctorAffiliationHistory(docId)
                .then((data) => {
                    setHistoryData(data);
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                });
        } else {
            setHistoryData(null);
        }
    }, [open, doctor, fetchDoctorAffiliationHistory]);

    if (!open || !doctor) return null;

    const doctorName = formatDoctorDisplayName(doctor.name);
    const specialization = doctor.specialization || 'Specialization not provided';
    const metrics = historyData?.metrics || {
        totalAppointments: doctor.total_appointments ?? 0,
        completedConsultations: doctor.completed_consultations ?? 0,
        totalPrescriptions: 0,
    };
    const historyList = historyData?.affiliation_history || doctor.affiliation_history || [];

    const hasPendingInvite = Boolean(historyData?.pendingInvite || doctor.pending_invite);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <Card
                padding="lg"
                className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/50 shrink-0">
                            <HistoryIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                                    Affiliation History
                                </h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                                    {doctor.is_active ? 'Active Doctor' : 'Former Doctor'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                Historical record for {doctorName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-sm">
                    {/* Doctor Info Box */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <DoctorAvatar
                                src={doctor.profile_image_url}
                                name={doctor.name}
                                className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                fallbackClassName="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-base flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                            />
                            <div className="min-w-0">
                                <p className="font-extrabold text-base text-gray-900 dark:text-gray-100 truncate">
                                    {doctorName}
                                </p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                    {specialization}
                                    {Boolean(doctor.experience_years && doctor.experience_years > 0) && ` • ${doctor.experience_years} yrs exp`}
                                </p>
                            </div>
                        </div>

                        {doctor.registration_number && (
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700">
                                Reg: {doctor.registration_number}
                            </span>
                        )}
                    </div>

                    {/* Historical Activity Stats */}
                    <div className="space-y-1.5">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Historical Clinic Activity
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center">
                                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Past Appointments</p>
                                <p className="text-xl font-extrabold text-blue-900 dark:text-blue-100 mt-1">
                                    {metrics.totalAppointments}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Completed Consults</p>
                                <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-1">
                                    {metrics.completedConsultations}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-center">
                                <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">Prescriptions</p>
                                <p className="text-xl font-extrabold text-purple-900 dark:text-purple-100 mt-1">
                                    {metrics.totalPrescriptions}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Affiliation Timeline */}
                    <div className="space-y-2 pt-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Affiliation Periods
                        </h3>

                        {loading ? (
                            <div className="py-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-600" /> Loading affiliation history...
                            </div>
                        ) : historyList.length === 0 ? (
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
                                {doctor.joined_at ? (
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-900 dark:text-gray-100">
                                            {formatDate(doctor.joined_at)} → {doctor.ended_at ? formatDate(doctor.ended_at) : 'Present'}
                                        </p>
                                        {doctor.termination_reason && (
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Reason: {doctor.termination_reason}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    'No prior affiliation period recorded.'
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {historyList.map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 font-extrabold text-xs text-gray-900 dark:text-gray-100">
                                                <CalendarDays className="w-4 h-4 text-gray-500" />
                                                <span>{formatDate(item.joined_at)} → {formatDate(item.ended_at)}</span>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                                                Affiliation Ended
                                            </span>
                                        </div>

                                        {item.termination_reason && (
                                            <div className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-200/60 dark:border-gray-800 space-y-1">
                                                <p>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">Reason: </span>
                                                    {item.termination_reason}
                                                </p>
                                                {item.termination_note && (
                                                    <p className="text-gray-500 dark:text-gray-400 text-[11px] italic">
                                                        Note: &ldquo;{item.termination_note}&rdquo;
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2.5 mt-2">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>

                    {!doctor.is_active && (
                        <Button
                            onClick={() => {
                                onClose();
                                onInviteAgain?.(doctor);
                            }}
                            disabled={hasPendingInvite}
                            leftIcon={<UserPlus className="w-4 h-4" />}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                        >
                            {hasPendingInvite ? 'Invitation Pending' : 'Invite Again'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
