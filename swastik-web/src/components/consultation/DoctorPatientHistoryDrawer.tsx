'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { X, Lock, FileText, Loader2, Pill, Activity, User, ShieldAlert } from 'lucide-react';
import { doctorApi } from '@/lib/api';

// Reusing types from patient record page
interface AppointmentRecord {
    id: string;
    appointment_date?: string;
    time_slot?: string;
    type?: string;
    status?: string;
    reason?: string;
    fee?: number;
    notes?: string;
    created_at?: string;
}

interface ConsultationRecord {
    id: string;
    status?: string;
    created_at?: string;
    diagnosis?: string;
    notes?: string;
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
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
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
                                            <div key={consultation.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-white">
                                                        {formatDate(consultation.created_at, true)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${statusClasses(consultation.status)}`}>
                                                        {formatStatus(consultation.status)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-300 mt-1">
                                                    {consultation.diagnosis || consultation.notes || 'No notes available.'}
                                                </p>
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
                                                <div key={consultation.id} className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-slate-200">
                                                            {formatDate(consultation.created_at, true)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${statusClasses(consultation.status)}`}>
                                                            {formatStatus(consultation.status)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                                                        <User className="w-3.5 h-3.5" />
                                                        <span>Dr. {consultation.doctor?.name || 'Unknown'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                        <span>{consultation.doctor?.specialization || 'General'}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-300 mt-1">
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
