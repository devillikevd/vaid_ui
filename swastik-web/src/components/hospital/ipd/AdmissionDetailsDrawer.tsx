'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    User,
    Phone,
    Calendar,
    Clock,
    BedDouble,
    Building2,
    Stethoscope,
    FileText,
    Activity,
    LogOut,
    ArrowLeftRight,
    ExternalLink,
    Shield,
    Plus,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { hospitalApi } from '@/lib/api';

interface AdmissionDetailsDrawerProps {
    admission: any | null;
    isOpen: boolean;
    onClose: () => void;
    onTransferClick: () => void;
    onDischargeClick: () => void;
    onRefresh: () => void;
    staffRole?: string;
}

export function AdmissionDetailsDrawer({
    admission,
    isOpen,
    onClose,
    onTransferClick,
    onDischargeClick,
    onRefresh,
    staffRole = 'hospital_owner',
}: AdmissionDetailsDrawerProps) {
    const [noteText, setNoteText] = useState('');
    const [noteAssessment, setNoteAssessment] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [noteLoading, setNoteLoading] = useState(false);

    if (!isOpen || !admission) return null;

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

    // Calculate Length of Stay (LOS) in days
    const calculateLos = () => {
        if (!admission.admitted_at) return '—';
        const start = new Date(admission.admitted_at).getTime();
        const end = admission.discharged_at ? new Date(admission.discharged_at).getTime() : Date.now();
        const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteAssessment.trim()) return;

        setNoteLoading(true);
        try {
            const res = await hospitalApi.addProgressNote(admission.id, {
                noteType: 'progress',
                assessment: noteAssessment.trim(),
                plan: noteText.trim() || undefined,
            });
            if (res.success) {
                setNoteAssessment('');
                setNoteText('');
                setIsAddingNote(false);
                onRefresh();
            }
        } catch (err) {
            console.error('Failed to add progress note:', err);
        } finally {
            setNoteLoading(false);
        }
    };

    const progressNotes = admission.progressNotes || [];

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
                                    {admission.admission_number || admission.id}
                                </span>
                                <StatusBadge status={admission.status} size="sm" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                Inpatient Care Workspace
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

                        {/* Quick Operations Bar */}
                        {isAuthorizedStaff && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Inpatient Lifecycle Operations
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {admission.status === 'admitted' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onTransferClick}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                            >
                                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                                <span>Transfer Bed</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onDischargeClick}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                <span>Discharge Patient</span>
                                            </button>
                                        </>
                                    )}

                                    {admission.status === 'pre_admission' && (
                                        <button
                                            type="button"
                                            onClick={onTransferClick}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                        >
                                            <BedDouble className="w-3.5 h-3.5" />
                                            <span>Allocate Bed</span>
                                        </button>
                                    )}

                                    {admission.status === 'discharged' && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                                            Patient was discharged on {formatDate(admission.discharged_at)}.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 1. Patient Demographics */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Patient Snapshot</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {admission.patient?.name || 'Patient'}
                                        </p>
                                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md font-mono text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
                                            {admission.patient?.uhid || `UHID-${(admission.patient_id || admission.id).slice(0, 8).toUpperCase()}`}
                                        </span>
                                    </div>
                                    {admission.blood_group && (
                                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                            {admission.blood_group}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block">Contact Phone</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {admission.patient?.phone || admission.attendant_phone || 'Not provided'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Age & Gender</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                            {[admission.patient?.gender, admission.patient?.date_of_birth ? `${new Date().getFullYear() - new Date(admission.patient.date_of_birth).getFullYear()} yrs` : null].filter(Boolean).join(' • ') || '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Ward & Bed Allocation */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <BedDouble className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Ward & Bed Allocation</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Allocated Ward</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {admission.ward?.name || 'Unassigned'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block capitalize">
                                        {admission.ward?.ward_type || 'General'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Bed Number</span>
                                    <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300 font-mono">
                                        {admission.bed?.bed_number ? `Bed ${admission.bed.bed_number}` : 'None Allocated'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block capitalize">
                                        {admission.bed?.bed_type || 'Standard'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Admitted Timestamp</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {formatDateTime(admission.admitted_at)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Length of Stay (LOS)</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {calculateLos()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Admitting Doctor & Clinical Summary */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Attending Physician & Clinical Profile</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 border border-teal-200">
                                        {admission.admittingDoctor?.name ? admission.admittingDoctor.name[0].toUpperCase() : 'D'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">
                                            Dr. {admission.admittingDoctor?.name || admission.attendingDoctor?.name || 'Physician'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {admission.admittingDoctor?.specialization || 'Attending Specialist'} • {admission.department?.name || 'General IPD'}
                                        </p>
                                    </div>
                                </div>

                                {admission.chief_complaint && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-[10px] text-slate-400 font-medium block">Chief Complaint</span>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {admission.chief_complaint}
                                        </p>
                                    </div>
                                )}

                                {admission.provisional_diagnosis && (
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-[10px] text-slate-400 font-medium block">Provisional Diagnosis</span>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {admission.provisional_diagnosis}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Doctor Rounds & Progress Notes */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span>Rounds & Clinical Progress Notes</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingNote(!isAddingNote)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>{isAddingNote ? 'Cancel' : 'Add Note'}</span>
                                </button>
                            </div>

                            {/* Add Note Form */}
                            {isAddingNote && (
                                <form onSubmit={handleAddNote} className="p-3.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200 dark:border-gray-700 space-y-2">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                            Clinical Assessment <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Afebrile, vitals stable, wound clean"
                                            value={noteAssessment}
                                            onChange={(e) => setNoteAssessment(e.target.value)}
                                            required
                                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                            Care Plan / Instructions
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Continue IV antibiotics, step down to oral fluids..."
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="submit"
                                            disabled={noteLoading || !noteAssessment.trim()}
                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                        >
                                            {noteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                            <span>Save Progress Note</span>
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* List Notes */}
                            {progressNotes.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50/50 dark:bg-gray-800/30 rounded-xl">
                                    No progress notes recorded for this admission yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {progressNotes.map((note: any) => (
                                        <div
                                            key={note.id}
                                            className="p-3 bg-slate-50/70 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800 space-y-1"
                                        >
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span className="font-semibold text-teal-700 dark:text-teal-400 uppercase">
                                                    {note.note_type || 'Progress Note'}
                                                </span>
                                                <span>{formatDateTime(note.created_at)}</span>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                {note.assessment}
                                            </p>
                                            {note.plan && (
                                                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                                    Plan: {note.plan}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Controlled Medical Record Access */}
                        {admission.patient_id && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Patient Medical Record
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        Longitudinal encounter history, lab orders, and prescriptions.
                                    </p>
                                </div>
                                <Link
                                    href={`/hospital/encounters?patientId=${encodeURIComponent(admission.patient_id)}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                                >
                                    <span>Open Longitudinal Record</span>
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
