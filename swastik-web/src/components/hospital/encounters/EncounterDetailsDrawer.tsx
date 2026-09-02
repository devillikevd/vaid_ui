'use client';

import React from 'react';
import Link from 'next/link';
import {
    X,
    User,
    Phone,
    Calendar,
    Clock,
    ClipboardList,
    Building2,
    Stethoscope,
    FileText,
    Activity,
    CreditCard,
    ExternalLink,
    Shield,
    CheckCircle2,
    AlertCircle,
    Receipt
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EncounterDetailsDrawerProps {
    encounter: any | null;
    isOpen: boolean;
    onClose: () => void;
    staffRole?: string;
}

export function EncounterDetailsDrawer({
    encounter,
    isOpen,
    onClose,
    staffRole = 'hospital_owner',
}: EncounterDetailsDrawerProps) {
    if (!isOpen || !encounter) return null;

    const isAuthorizedStaff = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'doctor', 'nurse'].includes(staffRole);

    const formatDate = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return d;
        }
    };

    const formatDateTime = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return d;
        }
    };

    const patientAge = encounter.patient?.date_of_birth
        ? `${new Date().getFullYear() - new Date(encounter.patient.date_of_birth).getFullYear()} yrs`
        : null;

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
                                    {encounter.encounter_number || encounter.id}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    encounter.encounter_type === 'emergency'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : encounter.encounter_type === 'ipd'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-teal-50 text-teal-700 border border-teal-200'
                                }`}>
                                    {encounter.encounter_type || 'OPD'}
                                </span>
                                <StatusBadge status={encounter.status} size="sm" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                Clinical Encounter Workspace
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

                        {/* 1. Patient Demographics Snapshot */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Patient Demographics</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {encounter.patient?.name || 'Patient'}
                                        </p>
                                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md font-mono text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
                                            {encounter.patient?.uhid || `UHID-${(encounter.patient_id || encounter.id).slice(0, 8).toUpperCase()}`}
                                        </span>
                                    </div>
                                    {encounter.patient?.blood_group && (
                                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                            {encounter.patient.blood_group}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block">Contact</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {encounter.patient?.phone || 'Not provided'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Age & Gender</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                            {[encounter.patient?.gender, patientAge].filter(Boolean).join(' • ') || '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Attending Doctor & Department */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Attending Physician</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 border border-teal-200">
                                        {encounter.doctor?.name ? encounter.doctor.name[0].toUpperCase() : 'D'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">
                                            Dr. {encounter.doctor?.name || 'Physician'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {encounter.doctor?.specialization || 'Clinical Specialist'} • {encounter.department?.name || 'General Clinical OPD'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Clinical Findings & Assessment */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Clinical Record & Findings</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2.5">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Chief Complaint / Reason for Visit</span>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                        {encounter.chief_complaint || 'Routine clinical visit'}
                                    </p>
                                </div>

                                {encounter.history_of_present_illness && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-[10px] text-slate-400 font-medium block">History of Present Illness (HPI)</span>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                            {encounter.history_of_present_illness}
                                        </p>
                                    </div>
                                )}

                                {encounter.examination_findings && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-[10px] text-slate-400 font-medium block">Examination Findings</span>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                            {encounter.examination_findings}
                                        </p>
                                    </div>
                                )}

                                {Array.isArray(encounter.diagnosis) && encounter.diagnosis.length > 0 && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-[10px] text-slate-400 font-medium block">Diagnosis</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {encounter.diagnosis.map((d: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-teal-50 text-teal-700 border border-teal-200">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {encounter.advice && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-[10px] text-slate-400 font-medium block">Doctor Advice & Treatment Plan</span>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                            {encounter.advice}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Encounter Timeline */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Visit Progression Timeline</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Registration / Creation:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                        {formatDateTime(encounter.created_at)}
                                    </span>
                                </div>
                                {encounter.started_at && (
                                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-slate-500">Encounter Started:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                            {formatDateTime(encounter.started_at)}
                                        </span>
                                    </div>
                                )}
                                {encounter.completed_at && (
                                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-slate-500">Completed / Discharged:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                            {formatDateTime(encounter.completed_at)}
                                        </span>
                                    </div>
                                )}
                                {encounter.follow_up_date && (
                                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-slate-500">Recommended Follow-up:</span>
                                        <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">
                                            {formatDate(encounter.follow_up_date)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. Billing Snapshot */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Financial & Billing Summary</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Total Charges:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                        ₹{parseFloat(encounter.total_charges || 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Discount:</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                        - ₹{parseFloat(encounter.total_discount || 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60 dark:border-gray-700">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">Net Payable:</span>
                                    <span className="text-sm font-extrabold text-teal-700 dark:text-teal-400 font-mono">
                                        ₹{parseFloat(encounter.net_amount || 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1">
                                    <span className="text-slate-500">Payment Status:</span>
                                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200">
                                        {encounter.payment_status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 6. Linked Longitudinal Record */}
                        {encounter.patient_id && isAuthorizedStaff && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Longitudinal Encounters History
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        View full patient visit history across all departments.
                                    </p>
                                </div>
                                <Link
                                    href={`/hospital/encounters?patientId=${encodeURIComponent(encounter.patient_id)}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                                >
                                    <span>Filter Patient</span>
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
