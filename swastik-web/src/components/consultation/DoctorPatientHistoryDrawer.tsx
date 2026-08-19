'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { X, Lock, FileText, Loader2, Pill, Activity, User, ShieldAlert, ArrowRight } from 'lucide-react';
import { doctorApi } from '@/lib/api';

// Reusing types from patient record page
interface AppointmentRecord {
    id: string;
    appointment_date?: string;
    time_slot?: string;
    type?: string;
    status?: string;
    reason?: string;
    symptoms?: string[];
    patient_notes?: string;
    fee?: number;
    notes?: string;
    severity_current?: number;
    severity_worst?: number;
    onset_type?: string;
    symptom_duration?: string;
    symptom_pattern?: string;
    known_allergies?: string[];
    current_medications?: string;
    medical_history?: string;
    voice_note_url?: string;
    voice_note_duration?: string;
    created_at?: string;
}

interface ConsultationRecord {
    id: string;
    status?: string;
    created_at?: string;
    diagnosis?: string;
    notes?: string;
    appointment?: {
        appointment_date?: string;
        time_slot?: string;
        type?: string;
        reason?: string;
        symptoms?: string[];
        patient_notes?: string;
        severity_current?: number;
        severity_worst?: number;
        onset_type?: string;
        symptom_duration?: string;
        symptom_pattern?: string;
        known_allergies?: string[];
        current_medications?: string;
        medical_history?: string;
        voice_note_url?: string;
        voice_note_duration?: string;
    };
    prescriptions?: Array<Record<string, unknown>>;
}

interface SharedConsultationRecord {
    id: string;
    created_at?: string;
    status?: string;
    diagnosis?: string;
    notes?: string;
    doctor?: {
        id?: string;
        name?: string;
        specialization?: string;
    };
    appointment?: {
        appointment_date?: string;
        time_slot?: string;
        type?: string;
        reason?: string;
        symptoms?: string[];
        patient_notes?: string;
        severity_current?: number;
        severity_worst?: number;
        onset_type?: string;
        symptom_duration?: string;
        symptom_pattern?: string;
        known_allergies?: string[];
        current_medications?: string;
        medical_history?: string;
        voice_note_url?: string;
        voice_note_duration?: string;
    };
}

interface RecordAccessMeta {
    hasFullHistoryAccess?: boolean;
    grantedAt?: string | null;
    expiresAt?: string | null;
    reportVisibility?: 'all' | 'shared_only' | 'none' | string;
}

interface PatientRecord {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    consultations?: ConsultationRecord[];
    sharedConsultations?: SharedConsultationRecord[];
    recordAccess?: RecordAccessMeta;
}

function formatDate(value?: string, includeTime = false) {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return includeTime ? date.toLocaleString('en-IN') : date.toLocaleDateString('en-IN');
}

function formatStatus(value?: string) {
    if (!value) return 'Unknown';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClasses(status?: string) {
    const normalized = (status || '').toLowerCase();
    if (['completed', 'approved', 'active', 'confirmed', 'normal'].includes(normalized)) {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    }
    if (['scheduled', 'pending', 'in_progress', 'under_review'].includes(normalized)) {
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
    }
    if (['cancelled', 'rejected', 'critical'].includes(normalized)) {
        return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300';
}

interface DoctorPatientHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
}

export default function DoctorPatientHistoryDrawer({
    isOpen,
    onClose,
    patientId,
}: DoctorPatientHistoryDrawerProps) {
    const [record, setRecord] = useState<PatientRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!patientId || !isOpen) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await doctorApi.getPatientHistory(patientId) as any;
            setRecord(res?.data || null);
        } catch (err: any) {
            setError(err.message || 'Failed to load patient history');
        } finally {
            setIsLoading(false);
        }
    }, [patientId, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    // Handle ESC to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const hasAccess = record?.recordAccess?.hasFullHistoryAccess === true;
    const ownConsultations = record?.consultations || [];
    const sharedConsultations = record?.sharedConsultations || [];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm transition-all duration-300">
            {/* Drawer Container */}
            <div
                className="w-full max-w-md md:max-w-xl h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300"
                style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Patient History</h2>
                            <p className="text-xs text-slate-400">
                                {record?.name || 'Loading...'} • {record?.gender ? `${record.gender}, ` : ''}{record?.age ? `${record.age}y` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent space-y-6">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                            <p className="text-sm">Retrieving medical records...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldAlert className="w-4 h-4" />
                                <span className="font-semibold">Error Loading History</span>
                            </div>
                            <p className="opacity-80">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Access Status Banner */}
                            {!hasAccess ? (
                                <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/40 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 bg-amber-900/30 rounded-full flex items-center justify-center mb-3">
                                        <Lock className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <h3 className="text-base font-medium text-amber-500 mb-1">Restricted Access</h3>
                                    <p className="text-sm text-slate-400 max-w-sm">
                                        The patient has not granted 24-hour record access for this consultation. You can only view your own past consultations with this patient.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-900/40 rounded-lg text-emerald-400">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-emerald-400">Full Access Granted</p>
                                        <p className="text-xs text-emerald-500/70">
                                            Valid until {formatDate(record?.recordAccess?.expiresAt || '', true)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Link to Full Patient Profile */}
                            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Full Medical Profile</p>
                                    <p className="text-sm text-slate-200 mt-0.5">Vitals, lab reports & past prescriptions</p>
                                </div>
                                <Link
                                    href={`/doctor/patients/${patientId}`}
                                    target="_blank"
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                >
                                    <span>Open Profile</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {/* Own Consultations */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Your Consultations</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                        {ownConsultations.length} records
                                    </span>
                                </div>
                                {ownConsultations.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic p-4 rounded-xl border border-dashed border-slate-700/50 text-center">
                                        No prior consultations with you.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {ownConsultations.map(consultation => (
                                            <div key={consultation.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-white">
                                                        {formatDate(consultation.created_at, true)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${statusClasses(consultation.status)}`}>
                                                        {formatStatus(consultation.status)}
                                                    </span>
                                                </div>
                                                
                                                {/* Reason for consultation */}
                                                {(consultation.appointment?.reason || (consultation.appointment?.symptoms && consultation.appointment.symptoms.length > 0) || consultation.appointment?.patient_notes) && (
                                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-750 text-xs">
                                                        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">Reason for Visit:</span>
                                                        <span className="text-slate-200 font-medium">
                                                            {consultation.appointment?.reason || consultation.appointment?.patient_notes || 'Consultation'}
                                                        </span>
                                                        {Array.isArray(consultation.appointment?.symptoms) && consultation.appointment.symptoms.length > 0 && (
                                                            <div className="flex flex-col gap-1.5 mt-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-slate-500 font-semibold">Symptoms</span>
                                                                    {consultation.appointment.symptom_duration && <span className="text-[10px] text-slate-400">{consultation.appointment.symptom_duration}</span>}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {consultation.appointment.symptoms.map(s => (
                                                                        <span key={s} className="bg-red-950/70 text-red-300 text-[10px] px-1.5 py-0.5 rounded border border-red-900/50">
                                                                            {s}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {consultation.appointment?.severity_current !== undefined && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-500 font-semibold">Severity:</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${consultation.appointment.severity_current <= 3 ? 'bg-emerald-950/70 text-emerald-400' : consultation.appointment.severity_current <= 6 ? 'bg-amber-950/70 text-amber-400' : 'bg-red-950/70 text-red-400'}`}>
                                                                    {consultation.appointment.severity_current}/10
                                                                </span>
                                                            </div>
                                                        )}
                                                        
                                                        {consultation.appointment?.voice_note_url && (
                                                            <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-emerald-950/30 border border-emerald-900/30">
                                                                <audio src={consultation.appointment.voice_note_url} controls className="h-6 w-full max-w-[200px]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Clinical Diagnosis / Notes */}
                                                <div className="text-xs text-slate-300">
                                                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-0.5">Clinical Notes:</span>
                                                    <p className="text-slate-200">
                                                        {consultation.diagnosis || consultation.notes || 'No notes recorded.'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Shared Consultations */}
                            {hasAccess && (
                                <div className="space-y-3 pt-4 border-t border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Other Doctors&apos; Consultations</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                            {sharedConsultations.length} records
                                        </span>
                                    </div>
                                    {sharedConsultations.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic p-4 rounded-xl border border-dashed border-slate-700/50 text-center">
                                            No shared history available.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {sharedConsultations.map(consultation => (
                                                <div key={consultation.id} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-slate-200">
                                                            {formatDate(consultation.created_at, true)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${statusClasses(consultation.status)}`}>
                                                            {formatStatus(consultation.status)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <User className="w-3.5 h-3.5" />
                                                        <span>Dr. {consultation.doctor?.name || 'Unknown'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                        <span>{consultation.doctor?.specialization || 'General'}</span>
                                                    </div>

                                                    {(consultation.appointment?.reason || consultation.appointment?.patient_notes) && (
                                                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50 text-xs">
                                                            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">Reason:</span>
                                                            <span className="text-slate-300">
                                                                {consultation.appointment?.reason || consultation.appointment?.patient_notes}
                                                            </span>
                                                            {consultation.appointment?.severity_current !== undefined && (
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-500 font-semibold">Severity:</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${consultation.appointment.severity_current <= 3 ? 'bg-emerald-950/70 text-emerald-400' : consultation.appointment.severity_current <= 6 ? 'bg-amber-950/70 text-amber-400' : 'bg-red-950/70 text-red-400'}`}>
                                                                        {consultation.appointment.severity_current}/10
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {consultation.appointment?.voice_note_url && (
                                                                <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-emerald-950/30 border border-emerald-900/30">
                                                                    <audio src={consultation.appointment.voice_note_url} controls className="h-6 w-full max-w-[200px]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-300">
                                                        {consultation.diagnosis || consultation.notes || 'No notes available.'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
