'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Calendar,
    Clock3,
    FileText,
    Lock,
    Mail,
    MapPin,
    Phone,
    Pill,
    RefreshCw,
    Ruler,
    Scale,
    User,
    Download
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PatientMedicalHistory } from '@/components/doctor/PatientMedicalHistory';

// --- Interfaces (Kept identical) ---

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

interface SharedPrescriptionRecord {
    id: string;
    diagnosis?: string;
    notes?: string;
    status?: string;
    created_at?: string;
    doctor?: {
        id?: string;
        name?: string;
        specialization?: string;
    };
    prescription_medicines?: Array<{
        id?: string;
        medicine_name?: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
    }>;
}

interface ReportRecord {
    id: string;
    name?: string;
    title?: string;
    report_name?: string;
    type?: string;
    status?: string;
    date?: string;
    created_at?: string;
    doctor_notes?: string;
    notes?: string;
    file_url?: string;
    lab_name?: string;
}

interface VitalRecord {
    id: string;
    recordedAt?: string;
    created_at?: string;
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenLevel?: number;
    respiratoryRate?: number;
    bloodSugar?: number;
    weight?: number;
    notes?: string;
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
    date_of_birth?: string;
    weight?: number;
    height?: number;
    address?: string;
    profile_image_url?: string;
    email?: string;
    phone?: string;
    totalVisits?: number;
    lastVisit?: string;
    appointments?: AppointmentRecord[];
    consultations?: ConsultationRecord[];
    sharedConsultations?: SharedConsultationRecord[];
    sharedPrescriptions?: SharedPrescriptionRecord[];
    reports?: ReportRecord[];
    recordAccess?: RecordAccessMeta;
    allergies?: string[];
    chronic_conditions?: string[];
    current_medications?: any[];
    internalNotes?: string;
}

// --- Helpers ---

function formatDate(value?: string, includeTime = false) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return includeTime ? date.toLocaleString('en-IN') : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatStatus(value?: string) {
    if (!value) return 'Unknown';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClasses(status?: string) {
    const normalized = (status || '').toLowerCase();
    if (['completed', 'approved', 'active', 'confirmed', 'normal'].includes(normalized)) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50';
    }
    if (['scheduled', 'pending', 'in_progress', 'under_review', 'draft'].includes(normalized)) {
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
    }
    if (['cancelled', 'rejected', 'critical', 'expired'].includes(normalized)) {
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700';
}

function getReportTitle(report: ReportRecord) {
    return report.name || report.title || report.report_name || report.type || 'Medical report';
}

function getSafeValue(value: string | number | null | undefined, suffix = '') {
    if (value === null || value === undefined || value === '') return '—';
    return `${value}${suffix}`;
}

// --- Skeleton Component ---

const DetailsSkeleton = () => (
    <div className="space-y-8 animate-pulse w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 h-48 flex justify-between">
            <div className="flex gap-6 items-center">
                <div className="h-20 w-20 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                <div className="space-y-3">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="flex gap-2">
                        <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800/50 rounded-full"></div>
                        <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800/50 rounded-full"></div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="h-24 w-28 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                <div className="h-24 w-28 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            </div>
        </div>
        <div className="flex gap-6 border-b border-gray-100 dark:border-gray-800">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-t-lg"></div>
            <div className="h-8 w-32 bg-gray-100 dark:bg-gray-800/50 rounded-t-lg"></div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
            <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
        </div>
    </div>
);


// --- Main Component ---

export default function DoctorPatientRecordPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
    const [record, setRecord] = useState<PatientRecord | null>(null);
    const [vitals, setVitals] = useState<VitalRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'timeline' | 'vault' | 'reports'>('overview');

    const loadRecord = useCallback(async (refresh = false) => {
        if (!patientId) return;

        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const [historyResponse, vitalsResponse] = await Promise.all([
                doctorApi.getPatientHistory(patientId),
                doctorApi.getPatientVitals(1, patientId),
            ]);

            if (!historyResponse.success) {
                throw new Error(historyResponse.error || 'Failed to load patient history');
            }
            if (!vitalsResponse.success) {
                throw new Error(vitalsResponse.error || 'Failed to load patient vitals');
            }

            setRecord((historyResponse.data as PatientRecord) || null);
            setVitals(Array.isArray(vitalsResponse.data) ? (vitalsResponse.data as VitalRecord[]) : []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load patient record';
            setError(message);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [patientId]);

    useEffect(() => {
        void loadRecord();
    }, [loadRecord]);

    const recentAppointments = useMemo(() => record?.appointments || [], [record]);
    const consultations = useMemo(() => record?.consultations || [], [record]);
    const sharedConsultations = useMemo(() => record?.sharedConsultations || [], [record]);
    const sharedPrescriptions = useMemo(() => record?.sharedPrescriptions || [], [record]);
    const reports = useMemo(() => record?.reports || [], [record]);
    const recordAccess = record?.recordAccess;
    const patientLabel = record?.name || 'Patient';

    if (isLoading) {
        return <div className="p-4 sm:p-6"><DetailsSkeleton /></div>;
    }

    if (error || !record) {
        return (
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-8 text-center max-w-3xl mx-auto mt-10">
                <div className="p-5 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
                <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Unable to load patient record</p>
                    <p className="mt-2 text-base text-gray-500 dark:text-gray-400">{error || 'This patient record is unavailable right now.'}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                    <Button variant="outline" onClick={() => router.push('/doctor/patients')} leftIcon={<ArrowLeft className="h-4 w-4" />} className="rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold">
                        Back to Patients
                    </Button>
                    <Button onClick={() => void loadRecord(true)} leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isRefreshing} className="rounded-xl font-semibold">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <button
                    type="button"
                    onClick={() => router.push('/doctor/patients')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400 w-fit"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to patients
                </button>
                <Button 
                    variant="outline" 
                    onClick={() => void loadRecord(true)} 
                    leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />} 
                    disabled={isRefreshing}
                    className="rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold shadow-sm w-full sm:w-auto"
                >
                    Refresh Profile
                </Button>
            </div>

            {/* Premium Profile Header */}
            <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden z-10">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
                <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6 justify-between mt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/20 dark:text-emerald-400 text-3xl font-bold shadow-sm ring-1 ring-emerald-500/20">
                            {patientLabel.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{patientLabel}</h1>
                            <div className="flex flex-wrap items-center gap-2.5">
                                {[
                                    record.age ? `${record.age} YRS` : null, 
                                    record.gender ? (record.gender.length > 1 ? record.gender : record.gender === 'M' ? 'MALE' : record.gender === 'F' ? 'FEMALE' : record.gender).toUpperCase() : null, 
                                    record.blood_group
                                ].filter(Boolean).map((item) => (
                                    <span key={item} className="rounded-full bg-gray-100 dark:bg-gray-800/60 px-3 py-1 text-[11px] font-bold tracking-wider text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700">
                                        {item}
                                    </span>
                                ))}
                                {record.phone && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 ml-1">
                                        <Phone className="h-3 w-3"/> {record.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center lg:items-start transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60">
                            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest">Total Visits</p>
                            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">{getSafeValue(record.totalVisits)}</p>
                        </div>
                        <div className="flex-1 lg:flex-none px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center lg:items-start transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60">
                            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest">Last Visit</p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2 whitespace-nowrap">{formatDate(record.lastVisit)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Animated Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 scrollbar-hide">
                <div className="flex gap-2 px-1">
                    {[
                        { id: 'overview', label: 'Overview & Vitals', icon: Activity },
                        { id: 'history', label: 'Medical History', icon: User },
                        { id: 'timeline', label: 'Consultations', icon: Clock3 },
                        { id: 'vault', label: 'Shared Vault', icon: Lock },
                        { id: 'reports', label: 'Lab Reports', icon: FileText }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`relative flex items-center gap-2.5 px-5 py-4 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl group ${
                                    isActive 
                                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                <tab.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-500">
                {activeTab === 'overview' && (
                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Vitals Snapshot */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <Activity className="w-5 h-5 text-emerald-500"/> Latest Vitals Snapshot
                                </h2>
                            </div>
                            <div className="p-6 flex-1 bg-white dark:bg-gray-900">
                                {vitals.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4 h-full">
                                        <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex flex-col justify-center transition-transform hover:scale-[1.02]">
                                            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-2">Heart Rate</p>
                                            <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                {getSafeValue(vitals[0].heartRate)} <span className="text-sm font-semibold text-gray-500">bpm</span>
                                            </p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center transition-transform hover:scale-[1.02]">
                                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Blood Pressure</p>
                                            <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                {getSafeValue(vitals[0].bloodPressure)}
                                            </p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30 flex flex-col justify-center transition-transform hover:scale-[1.02]">
                                            <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-2">SpO2</p>
                                            <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                {getSafeValue(vitals[0].oxygenLevel)} <span className="text-sm font-semibold text-gray-500">%</span>
                                            </p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 flex flex-col justify-center transition-transform hover:scale-[1.02]">
                                            <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Temperature</p>
                                            <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                {getSafeValue(vitals[0].temperature)} <span className="text-sm font-semibold text-gray-500">°F</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                                            <Activity className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">No vitals recorded</p>
                                        <p className="text-sm text-gray-500 mt-1">This patient does not have recent vital signs.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Profile Info */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <User className="w-5 h-5 text-blue-500"/> Personal Information
                                </h2>
                            </div>
                            <div className="p-6 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50/80 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{getSafeValue(record.email)}</p>
                                    </div>
                                    <div className="bg-gray-50/80 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date of Birth</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(record.date_of_birth)}</p>
                                    </div>
                                    <div className="bg-gray-50/80 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Weight</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getSafeValue(record.weight, ' kg')}</p>
                                    </div>
                                    <div className="bg-gray-50/80 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Height</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getSafeValue(record.height, ' cm')}</p>
                                    </div>
                                    <div className="col-span-2 bg-gray-50/80 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Address</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">{getSafeValue(record.address)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden p-8">
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-8">Medical History</h2>
                        <PatientMedicalHistory 
                            patientId={patientId as string}
                            allergies={record.allergies || []}
                            chronicConditions={record.chronic_conditions || []}
                            currentMedications={record.current_medications || []}
                            internalNotes={record.internalNotes || ''}
                            onUpdate={loadRecord}
                        />
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Consultations */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <FileText className="w-5 h-5 text-emerald-600"/> Consultations
                                </h2>
                                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                    {consultations.length} total
                                </span>
                            </div>
                            <div className="p-6">
                                {consultations.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 font-medium">No consultation history.</p>
                                    </div>
                                ) : (
                                    <div className="relative border-l-2 border-emerald-100 dark:border-emerald-900/30 ml-4 space-y-6 pb-2">
                                        {consultations.map((consultation) => (
                                            <div key={consultation.id} className="relative pl-6 group">
                                                <div className="absolute w-3.5 h-3.5 bg-emerald-500 rounded-full -left-[9px] top-1.5 ring-4 ring-white dark:ring-gray-900 group-hover:scale-125 transition-transform" />
                                                <div className="bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{formatDate(consultation.created_at, true)}</p>
                                                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase border shadow-sm ${statusClasses(consultation.status)}`}>
                                                            {formatStatus(consultation.status)}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                                                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Diagnosis / Notes</span>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                                            {consultation.diagnosis || consultation.notes || <span className="text-gray-400 italic font-normal">No details recorded.</span>}
                                                        </p>
                                                    </div>
                                                    {(consultation.prescriptions && consultation.prescriptions.length > 0) && (
                                                        <div className="mt-4 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 w-fit px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                                            <Pill className="h-4 w-4 text-blue-600" />
                                                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Prescribed {consultation.prescriptions.length} items</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Appointments */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <Calendar className="w-5 h-5 text-blue-600"/> Appointments
                                </h2>
                                <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-bold text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                                    {recentAppointments.length} total
                                </span>
                            </div>
                            <div className="p-6">
                                {recentAppointments.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 font-medium">No appointments found.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {recentAppointments.map(app => (
                                            <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-800/80 transition-colors hover:shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400">
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{formatDate(app.appointment_date || app.created_at)}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">{app.time_slot}</span>
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">• {app.reason || 'General Visit'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 sm:mt-0 flex items-center justify-end">
                                                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase border shadow-sm ${statusClasses(app.status)}`}>
                                                        {formatStatus(app.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vault' && (
                    <div className="space-y-8">
                        <div className={`p-6 rounded-3xl border ${recordAccess?.hasFullHistoryAccess ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50' : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'} flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm`}>
                            <div className={`p-4 rounded-full ${recordAccess?.hasFullHistoryAccess ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'}`}>
                                <Lock className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className={`font-extrabold text-xl ${recordAccess?.hasFullHistoryAccess ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                                    {recordAccess?.hasFullHistoryAccess ? 'Patient Vault Unlocked' : 'Patient Vault Locked'}
                                </h3>
                                <p className={`text-base font-medium mt-1 ${recordAccess?.hasFullHistoryAccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                    {recordAccess?.hasFullHistoryAccess 
                                        ? `Patient-approved access is active${recordAccess.expiresAt ? ` until ${formatDate(recordAccess.expiresAt, true)}` : ''}. You can view historical records from other doctors.`
                                        : 'Patient approval is required to view past medical history from other clinics. Ask the patient to grant access.'}
                                </p>
                            </div>
                        </div>

                        {recordAccess?.hasFullHistoryAccess && (
                            <div className="grid gap-8 md:grid-cols-2">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Other Consultations</h2>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {sharedConsultations.length === 0 ? (
                                            <p className="text-sm font-medium text-gray-500 text-center py-6">No prior consultations found.</p>
                                        ) : sharedConsultations.map(c => (
                                            <div key={c.id} className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800/80 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-base">Dr. {c.doctor?.name || 'Unknown'}</p>
                                                    <p className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">{formatDate(c.created_at)}</p>
                                                </div>
                                                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                    {c.diagnosis || c.notes || 'No notes provided.'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Other Prescriptions</h2>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {sharedPrescriptions.length === 0 ? (
                                            <p className="text-sm font-medium text-gray-500 text-center py-6">No prior prescriptions found.</p>
                                        ) : sharedPrescriptions.map(p => (
                                            <div key={p.id} className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800/80 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-base">Dr. {p.doctor?.name || 'Unknown'}</p>
                                                    <p className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">{formatDate(p.created_at)}</p>
                                                </div>
                                                {p.prescription_medicines && p.prescription_medicines.length > 0 ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {p.prescription_medicines.map((m, i) => (
                                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 shadow-sm">
                                                                {m.medicine_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">No medicines listed.</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                <FileText className="w-5 h-5 text-violet-600"/> Lab Reports & Documents
                            </h2>
                            <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-bold text-violet-800 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
                                {reports.length} files
                            </span>
                        </div>
                        <div className="p-6">
                            {reports.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">No reports found</p>
                                    <p className="text-gray-500 font-medium mt-1">There are no lab reports or documents uploaded.</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-5">
                                    {reports.map(report => (
                                        <div key={report.id} className="flex items-start gap-5 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-white dark:hover:bg-gray-900 transition-all shadow-sm hover:shadow group">
                                            <div className="p-4 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 shrink-0">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-extrabold text-gray-900 dark:text-gray-100 truncate text-base">{getReportTitle(report)}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    <p className="text-xs font-bold text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-700">{formatDate(report.date || report.created_at)}</p>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-violet-600 dark:text-violet-400">{formatStatus(report.type)}</span>
                                                </div>
                                                {report.file_url && (
                                                    <a href={report.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors px-4 py-2 rounded-xl shadow-sm focus:ring-4 focus:ring-violet-500/20 w-full sm:w-auto justify-center">
                                                        <Download className="w-4 h-4" /> Download Report
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
