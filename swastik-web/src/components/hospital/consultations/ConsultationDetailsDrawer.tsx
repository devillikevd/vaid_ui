'use client';

import React from 'react';
import Link from 'next/link';
import {
    X,
    User,
    Phone,
    Calendar,
    Clock,
    Stethoscope,
    Building2,
    FileText,
    Activity,
    Video,
    MessageCircle,
    Shield,
    ExternalLink,
    Star,
    CheckCircle2,
    CalendarClock,
    AlertCircle,
    Info
} from 'lucide-react';
import { HospitalConsultation } from '@/stores/hospitalStore';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface ConsultationDetailsDrawerProps {
    consultation: HospitalConsultation | null;
    isOpen: boolean;
    onClose: () => void;
    staffRole?: string;
}

export function ConsultationDetailsDrawer({
    consultation,
    isOpen,
    onClose,
    staffRole = 'hospital_owner',
}: ConsultationDetailsDrawerProps) {
    if (!isOpen || !consultation) return null;

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

    const renderModeIcon = (mode?: string) => {
        switch (mode?.toLowerCase()) {
            case 'audio':
                return <Phone className="w-3.5 h-3.5" />;
            case 'chat':
                return <MessageCircle className="w-3.5 h-3.5" />;
            case 'in_person':
            case 'hospital':
                return <Building2 className="w-3.5 h-3.5" />;
            case 'video':
            default:
                return <Video className="w-3.5 h-3.5" />;
        }
    };

    const symptomsList = Array.isArray(consultation.symptoms)
        ? consultation.symptoms
        : typeof consultation.symptoms === 'string'
        ? consultation.symptoms.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const diagnosisCodesList = Array.isArray(consultation.diagnosisCodes)
        ? consultation.diagnosisCodes
        : typeof consultation.diagnosisCodes === 'string'
        ? consultation.diagnosisCodes.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
                    
                    {/* Drawer Header */}
                    <div className="px-6 py-4 border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Clinical Consultation Workspace
                                </h2>
                                <StatusBadge status={consultation.status} size="sm" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                Consultation ID: {consultation.id}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* 1. Linked Appointment Reference */}
                        {consultation.appointmentId && (
                            <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-200">
                                        <CalendarClock className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>Linked Hospital Appointment</span>
                                    </div>
                                    <p className="text-[11px] text-teal-700/90 dark:text-teal-400/90 mt-0.5 truncate font-mono">
                                        ID: {consultation.appointmentId}
                                    </p>
                                </div>
                                <Link
                                    href={`/hospital/appointments?search=${encodeURIComponent(consultation.appointmentId)}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                                >
                                    <span>View Appointment</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        )}

                        {/* 2. Patient Demographics Record */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-200/70 dark:border-gray-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-teal-600" />
                                    Patient Demographics
                                </span>
                                {consultation.patientUhid && (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">
                                        {consultation.patientUhid}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-slate-400 text-[11px]">Full Name</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{consultation.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[11px]">Phone Contact</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {consultation.patientPhone || 'Not provided'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[11px]">Gender & Age</p>
                                    <p className="text-slate-700 dark:text-slate-300 capitalize">
                                        {consultation.patientGender || '—'}
                                        {consultation.patientDob ? ` • ${new Date().getFullYear() - new Date(consultation.patientDob).getFullYear()} yrs` : ''}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[11px]">Blood Group</p>
                                    <p className="font-semibold text-rose-600 dark:text-rose-400">
                                        {consultation.patientBloodGroup || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Attending Physician & Department */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-200/70 dark:border-gray-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                                    Attending Physician
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                                    {consultation.doctorDepartment}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-sm border border-teal-200 dark:border-teal-800">
                                    {consultation.doctorName ? consultation.doctorName.charAt(0).toUpperCase() : 'D'}
                                </div>
                                <div>
                                    <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                        Dr. {consultation.doctorName}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {consultation.doctorSpecialization}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Timings & Modality */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Scheduled Date</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {formatDate(consultation.date)}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Time Slot</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {consultation.scheduledTime || '—'}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Modality</p>
                                <div className="flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300 mt-0.5 capitalize">
                                    {renderModeIcon(consultation.type)}
                                    <span>{consultation.type}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Duration</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {consultation.durationMinutes ? `${consultation.durationMinutes} mins` : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Started / Ended Timestamps */}
                        {(consultation.startedAt || consultation.endedAt) && (
                            <div className="grid grid-cols-2 gap-2.5 text-xs p-3 rounded-xl bg-slate-50/60 dark:bg-gray-800/30 border border-slate-200/60 dark:border-gray-800">
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Actual Start Time:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {formatDateTime(consultation.startedAt)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Actual End Time:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {formatDateTime(consultation.endedAt)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 5. Clinical Encounter Documentation */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-teal-600" />
                                Clinical Documentation
                            </h3>

                            {/* Chief Complaint */}
                            {consultation.chiefComplaint && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800 text-xs">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Chief Complaint / Reason</p>
                                    <p className="text-slate-800 dark:text-slate-200 mt-1">{consultation.chiefComplaint}</p>
                                </div>
                            )}

                            {/* Symptoms */}
                            {symptomsList.length > 0 && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800 text-xs">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Reported Symptoms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {symptomsList.map((symptom, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 text-[11px] font-medium"
                                            >
                                                {symptom}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Diagnosis & ICD Codes */}
                            {consultation.diagnosis && (
                                <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-xs">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase">
                                            Clinical Diagnosis
                                        </p>
                                        {diagnosisCodesList.length > 0 && (
                                            <div className="flex gap-1">
                                                {diagnosisCodesList.map((c, i) => (
                                                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-purple-950 dark:text-purple-100 font-semibold mt-1">
                                        {consultation.diagnosis}
                                    </p>
                                </div>
                            )}

                            {/* Clinical Notes & Advice */}
                            {(consultation.notes || consultation.advice) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    {consultation.notes && (
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">Doctor Notes</p>
                                            <p className="text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-line">
                                                {consultation.notes}
                                            </p>
                                        </div>
                                    )}
                                    {consultation.advice && (
                                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                                            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Treatment Advice</p>
                                            <p className="text-emerald-950 dark:text-emerald-100 mt-1 whitespace-pre-line">
                                                {consultation.advice}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Follow-up recommendation */}
                            {(consultation.followUpDate || consultation.followUpNotes) && (
                                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-blue-900 dark:text-blue-200">
                                            Follow-Up Recommended: {formatDate(consultation.followUpDate)}
                                        </p>
                                        {consultation.followUpNotes && (
                                            <p className="text-blue-800/90 dark:text-blue-300/90 mt-0.5">
                                                {consultation.followUpNotes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Patient Feedback Review */}
                            {consultation.rating && (
                                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center text-amber-500">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-3.5 h-3.5 ${i < (consultation.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="font-bold text-amber-900 dark:text-amber-200">
                                            {consultation.rating}/5 Patient Rating
                                        </span>
                                    </div>
                                    {consultation.review && (
                                        <p className="text-amber-900/90 dark:text-amber-200/90 mt-1 italic">
                                            "{consultation.review}"
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 6. Medical Records Boundary & Controlled Patient Medical Record Access */}
                        {(['hospital_owner', 'hospital_admin', 'doctor', 'hospital_manager'].includes(staffRole || '')) && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Patient Medical Record
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        Longitudinal history, past prescriptions & lab reports reside in Medical Records.
                                    </p>
                                </div>
                                <Link
                                    href={consultation.patientId ? `/hospital/encounters?patientId=${encodeURIComponent(consultation.patientId)}` : '/hospital/encounters'}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                                >
                                    <span>Open Longitudinal Record</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        )}

                        {/* 7. WebRTC & Clinical Privacy Guard Notice */}
                        <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">
                                    Telemedicine Privacy & WebRTC Security
                                </p>
                                <p className="mt-0.5 leading-relaxed">
                                    Live audio/video consultation rooms are end-to-end encrypted and strictly restricted to the assigned attending physician and patient. Hospital management workspace maintains read-only clinical and administrative audit logs.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Drawer Footer */}
                    <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close Workspace
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
