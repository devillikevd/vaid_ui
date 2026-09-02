'use client';

import React, { useState } from 'react';
import {
    X,
    Pill,
    User,
    Building2,
    Calendar,
    Clock,
    CheckCircle2,
    Stethoscope,
    ShieldCheck,
    AlertCircle,
    FileText,
    Boxes,
    ShoppingCart,
    ExternalLink,
    AlertTriangle,
    Check,
    ShieldAlert,
    PauseCircle,
    XCircle,
    CheckCheck
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface PrescriptionDetailsDrawerProps {
    prescription: any | null;
    isOpen: boolean;
    onClose: () => void;
    onOpenDispense: (prescription: any) => void;
    canManagePharmacy?: boolean;
}

export function PrescriptionDetailsDrawer({
    prescription,
    isOpen,
    onClose,
    onOpenDispense,
    canManagePharmacy = true,
}: PrescriptionDetailsDrawerProps) {
    const [verificationStatus, setVerificationStatus] = useState<'verified' | 'on_hold' | 'rejected' | null>(null);

    if (!isOpen || !prescription) return null;

    const patient = prescription.patient;
    const doctor = prescription.doctor || prescription.attendingDoctor;

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

    // Parse medicines from JSONB or array
    let medicines: any[] = [];
    if (Array.isArray(prescription.prescriptions)) {
        medicines = prescription.prescriptions;
    } else if (Array.isArray(prescription.medicines)) {
        medicines = prescription.medicines;
    } else if (typeof prescription.prescriptions === 'object' && prescription.prescriptions !== null) {
        medicines = Array.isArray(prescription.prescriptions.medicines) ? prescription.prescriptions.medicines : [];
    }

    const isVerified = verificationStatus === 'verified' || prescription.status === 'verified';
    const isHold = verificationStatus === 'on_hold';
    const isRejected = verificationStatus === 'rejected';

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-2xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    {prescription.admission_number ? `IPD-${prescription.admission_number}` : `RX-${prescription.id ? prescription.id.slice(0, 8).toUpperCase() : ''}`}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
                                    {prescription.admission_number ? 'Inpatient (IPD)' : 'Outpatient (OPD)'}
                                </span>
                                {isVerified && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                        <CheckCheck className="w-3 h-3" />
                                        <span>Pharmacist Verified</span>
                                    </span>
                                )}
                                {isHold && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                        On Clinical Hold
                                    </span>
                                )}
                                {isRejected && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                        Prescription Rejected
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                {patient?.name || 'Patient Prescription'}
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

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                        
                        {/* 1. Patient Safety & Demographic Verification Card */}
                        <div className="p-4 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                                        {patient?.name ? patient.name[0].toUpperCase() : 'P'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                            {patient?.name || 'Patient'}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {patient?.gender ? `${patient.gender} • ` : ''}
                                            {patient?.date_of_birth ? `DOB: ${patient.date_of_birth} ` : ''}
                                            {patient?.blood_group ? `• Blood: ${patient.blood_group}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block">Prescribed Date</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                        {formatDateTime(prescription.created_at || prescription.admitted_at)}
                                    </span>
                                </div>
                            </div>

                            {prescription.ward && (
                                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">Ward / Room</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {prescription.ward?.name || 'General Ward'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">Bed Number</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            Bed {prescription.bed?.bed_number || '—'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Ordering Physician & Clinical Indication */}
                        <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Prescribing Physician</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Doctor</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        Dr. {doctor?.name || 'Consultant Physician'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Specialization</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {doctor?.specialization || 'Clinical Staff'}
                                    </span>
                                </div>
                            </div>

                            {(prescription.chief_complaint || prescription.provisional_diagnosis) && (
                                <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-400 block text-[10px]">Chief Complaint / Diagnosis</span>
                                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                                        {prescription.chief_complaint || prescription.provisional_diagnosis}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 3. Pharmacist Verification Checklist */}
                        {canManagePharmacy && (
                            <div className="p-4 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                                        <span>Pharmacist Clinical Verification</span>
                                    </h4>
                                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                                        Mandatory safety check
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-3.5 h-3.5 text-teal-600" />
                                        <span>Patient identity and age appropriateness verified</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-3.5 h-3.5 text-teal-600" />
                                        <span>Dosage strength, frequency, and drug interaction screened</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-3.5 h-3.5 text-teal-600" />
                                        <span>In-house stock availability validated</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-teal-200/60 dark:border-teal-800">
                                    <button
                                        type="button"
                                        onClick={() => setVerificationStatus('verified')}
                                        className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                                            isVerified
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-gray-800 border border-teal-300 text-teal-800 dark:text-teal-200 hover:bg-teal-100'
                                        }`}
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Verify Prescription</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setVerificationStatus('on_hold')}
                                        className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                                            isHold
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-gray-800 border border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100'
                                        }`}
                                    >
                                        <PauseCircle className="w-3.5 h-3.5" />
                                        <span>Hold</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setVerificationStatus('rejected')}
                                        className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                                            isRejected
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-gray-800 border border-rose-300 text-rose-800 dark:text-rose-200 hover:bg-rose-100'
                                        }`}
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 4. Prescribed Medications */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Medications Ordered ({medicines.length})</span>
                            </h4>

                            {medicines.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-gray-800 border border-slate-200/70 dark:border-gray-800 rounded-2xl overflow-hidden">
                                    {medicines.map((med: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-white dark:bg-gray-900 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                    {med.medicine_name || med.name}
                                                </h5>
                                                <p className="text-[11px] text-slate-500">
                                                    {med.dosage ? `Dosage: ${med.dosage}` : ''}
                                                    {med.frequency ? ` • ${med.frequency}` : ''}
                                                    {med.duration ? ` • Duration: ${med.duration}` : ''}
                                                </p>
                                                {med.instructions && (
                                                    <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                                                        Note: {med.instructions}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] text-slate-400 block">Qty</span>
                                                <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs">
                                                    {med.quantity || 1}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-gray-800 rounded-2xl">
                                    No discrete medicine items parsed. Click "Dispense Medicines" to select medicines directly from stock.
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-2">
                        {canManagePharmacy && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenDispense(prescription);
                                }}
                                disabled={isRejected}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Dispense Medicines</span>
                            </button>
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
