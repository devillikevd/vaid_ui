/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React from 'react';
import { 
    X, Stethoscope, User, Calendar, Clock, Video, Building2, 
    FileText, Pill, CheckCircle2, AlertCircle, Phone, Mail, 
    Activity, Shield, ArrowRight, Timer
} from 'lucide-react';
import { type Consultation } from '@/stores/clinicStore';

interface ConsultationDetailModalProps {
    consultation: Consultation | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ConsultationDetailModal({
    consultation,
    isOpen,
    onClose,
}: ConsultationDetailModalProps) {
    if (!isOpen || !consultation) return null;

    const isInPerson = consultation.type === 'clinic' || consultation.type === 'in_person';
    const isCompleted = consultation.status === 'completed' || consultation.status === 'ended';
    const isInProgress = ['in_progress', 'started', 'active'].includes(consultation.status);
    const isCancelled = consultation.status === 'cancelled';

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between text-gray-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#111c2e]/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shrink-0">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                                Consultation Details
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Session ID: <span className="font-mono">{consultation.id.slice(0, 8)}...</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 space-y-6 text-xs">
                    
                    {/* Status & Session Summary Banner */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold capitalize border ${
                                    isInProgress ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                    isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                    isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                    'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                }`}>
                                    {consultation.status.replace('_', ' ')}
                                </span>
                                {consultation.durationMinutes != null && consultation.durationMinutes > 0 && (
                                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                        <Timer className="w-3.5 h-3.5" />
                                        <span>{consultation.durationMinutes} minutes session</span>
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium pt-0.5">
                                {isInPerson ? (
                                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                        <Building2 className="w-3.5 h-3.5" /> In-Person OPD Visit
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold">
                                        <Video className="w-3.5 h-3.5" /> Video Teleconsultation
                                    </span>
                                )}
                            </div>
                        </div>

                        {consultation.fee != null && (
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 uppercase font-bold block">Consultation Fee</span>
                                <span className="text-base font-extrabold text-gray-900 dark:text-white">
                                    ₹{consultation.fee}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Patient & Doctor 2-Column Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Patient Card */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-emerald-600" /> Patient
                            </span>
                            
                            <div className="flex items-center gap-3">
                                {consultation.patient.profile_image_url ? (
                                    <img
                                        src={consultation.patient.profile_image_url}
                                        alt={consultation.patient.name}
                                        className="w-10 h-10 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                                        {consultation.patient.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">
                                        {consultation.patient.name}
                                    </h3>
                                    <p className="text-[11px] text-gray-500 capitalize">
                                        {consultation.patient.gender || 'Patient'}
                                        {consultation.patient.age != null ? ` • ${consultation.patient.age} yrs` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                                {consultation.patient.phone && (
                                    <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                        <Phone className="w-3 h-3 text-gray-400" />
                                        <span>{consultation.patient.phone}</span>
                                    </p>
                                )}
                                {consultation.patient.email && (
                                    <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 truncate">
                                        <Mail className="w-3 h-3 text-gray-400" />
                                        <span className="truncate">{consultation.patient.email}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Doctor Card */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" /> Consulting Physician
                            </span>

                            <div className="flex items-center gap-3">
                                {consultation.doctor.profile_image_url ? (
                                    <img
                                        src={consultation.doctor.profile_image_url}
                                        alt={consultation.doctor.name}
                                        className="w-10 h-10 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-sm flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                                        {consultation.doctor.name.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">
                                        Dr. {consultation.doctor.name.replace(/^Dr\.\s*/i, '')}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        {consultation.doctor.specialization || 'Medical Specialist'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                                    <span className="text-gray-400">Affiliation:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        Active Clinic Doctor
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline & Timestamps */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 space-y-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-500" /> Session Timestamps
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                            <div>
                                <span className="text-gray-400 block text-[10px]">Session Created:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {formatDateTime(consultation.created_at)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">Started At:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {formatDateTime(consultation.started_at)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">Ended At:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {formatDateTime(consultation.ended_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Diagnosis & Notes */}
                    {(consultation.diagnosis || consultation.notes) && (
                        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> Clinical Outcome
                            </span>
                            {consultation.diagnosis && (
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold block">Diagnosis:</span>
                                    <p className="text-gray-900 dark:text-white font-medium">{consultation.diagnosis}</p>
                                </div>
                            )}
                            {consultation.notes && (
                                <div className="pt-1">
                                    <span className="text-[10px] text-gray-400 font-bold block">Physician Notes:</span>
                                    <p className="text-gray-700 dark:text-gray-300 font-medium">{consultation.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Prescription Section */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-emerald-600" /> Digital Prescription
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                consultation.hasPrescription 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                                {consultation.hasPrescription ? 'Issued' : 'None Issued'}
                            </span>
                        </div>

                        {consultation.hasPrescription && consultation.prescriptions && consultation.prescriptions.length > 0 ? (
                            <div className="space-y-2 pt-1">
                                {consultation.prescriptions.map((rx: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 text-[11px] space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-900 dark:text-white">Rx #{rx.id ? rx.id.slice(0, 8) : idx + 1}</span>
                                            <span className="text-gray-400 text-[10px]">{formatDateTime(rx.created_at)}</span>
                                        </div>
                                        {rx.notes && <p className="text-gray-600 dark:text-gray-400 text-[10px]">{rx.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-[11px] pt-1">
                                No prescription medications recorded for this session.
                            </p>
                        )}
                    </div>

                    {/* Associated Appointment Card */}
                    {consultation.appointment && (
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 space-y-1.5 text-[11px]">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-500" /> Booking Context
                            </span>
                            <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                                <span>Appointment Date &amp; Slot:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {consultation.appointment.date || '—'} ({consultation.appointment.time || 'Flexible'})
                                </span>
                            </div>
                            {consultation.appointment.reason && (
                                <div className="text-gray-600 dark:text-gray-400">
                                    Reason: <span className="font-medium text-gray-800 dark:text-gray-200">{consultation.appointment.reason}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2 bg-gray-50/50 dark:bg-[#0f172a]/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-extrabold text-xs text-gray-800 dark:text-gray-200 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
