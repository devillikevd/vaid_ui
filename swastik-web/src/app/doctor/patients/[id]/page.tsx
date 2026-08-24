'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
    Download,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    RotateCcw,
    Search,
    Compass,
    Stethoscope
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PatientMedicalHistory } from '@/components/doctor/PatientMedicalHistory';
import { 
    getSourceDisplay, 
    getVisitTypeDisplay, 
    resolveCanonicalSource, 
    resolveCanonicalVisitType,
    SOURCE_FILTER_OPTIONS,
    VISIT_TYPE_FILTER_OPTIONS
} from '@/lib/clinicalDimensions';

// --- Interfaces (Kept identical) ---

interface AppointmentRecord {
    id: string;
    appointment_date?: string;
    time_slot?: string;
    type?: string;
    source?: string;
    sourceLabel?: string;
    visitType?: string;
    visitTypeLabel?: string;
    status?: string;
    reason?: string;
    reason_for_visit?: string;
    symptoms?: string[];
    patient_notes?: string;
    doctor_notes?: string;
    diagnosis?: string;
    fee?: number;
    consultation_fee?: number;
    payment_status?: string;
    payment_reference?: string;
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

interface PrescriptionItem {
    id: string;
    appointment_id?: string;
    consultation_id?: string;
    diagnosis?: string;
    notes?: string;
    status?: string;
    created_at?: string;
    prescription_medicines?: Array<{
        id?: string;
        name?: string;
        medicine_name?: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
    }>;
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
    source?: string;
    sourceLabel?: string;
    appointments?: AppointmentRecord[];
    consultations?: ConsultationRecord[];
    prescriptions?: PrescriptionItem[];
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

    // History Filter States
    const [historyPeriodFilter, setHistoryPeriodFilter] = useState<string>('all');
    const [customFromDate, setCustomFromDate] = useState<string>('');
    const [customToDate, setCustomToDate] = useState<string>('');
    const [appliedCustomRange, setAppliedCustomRange] = useState<{ from: string; to: string } | null>(null);
    const [historySourceFilter, setHistorySourceFilter] = useState<string>('all');
    const [historyVisitTypeFilter, setHistoryVisitTypeFilter] = useState<string>('all');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
    const [historySearch, setHistorySearch] = useState<string>('');
    const [historyPage, setHistoryPage] = useState<number>(1);
    const historyPageSize = 10;

    const isDateInRange = useCallback((
        dateStr: string | undefined, 
        period: string, 
        customFrom?: string, 
        customTo?: string
    ): boolean => {
        if (!dateStr) return false;
        if (period === 'all') return true;

        const eventDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (period === 'today') {
            return eventDateStr === todayStr;
        }
        if (period === 'yesterday') {
            const y = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yStr = y.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return eventDateStr === yStr;
        }
        if (period === 'last_7_days') {
            const d7 = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
            const d7Str = d7.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return eventDateStr >= d7Str && eventDateStr <= todayStr;
        }
        if (period === 'last_30_days') {
            const d30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
            const d30Str = d30.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return eventDateStr >= d30Str && eventDateStr <= todayStr;
        }
        if (period === 'this_year') {
            const startOfYear = `${todayStr.split('-')[0]}-01-01`;
            return eventDateStr >= startOfYear && eventDateStr <= todayStr;
        }
        if (period === 'custom') {
            if (customFrom && eventDateStr < customFrom) return false;
            if (customTo && eventDateStr > customTo) return false;
            return true;
        }
        return true;
    }, []);

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

    const filteredEncounters = useMemo(() => {
        const items = record?.appointments || [];
        return items.filter(app => {
            // 1. Source filter
            const src = app.source || resolveCanonicalSource(app);
            if (historySourceFilter !== 'all' && src !== historySourceFilter) {
                return false;
            }

            // 2. Visit type filter
            const vt = app.visitType || resolveCanonicalVisitType(app);
            if (historyVisitTypeFilter !== 'all' && vt !== historyVisitTypeFilter) {
                return false;
            }

            // 3. Status filter
            const status = String(app.status || 'scheduled').toLowerCase();
            if (historyStatusFilter !== 'all' && status !== historyStatusFilter) {
                return false;
            }

            // 4. Date period filter
            const appDate = app.appointment_date || app.created_at;
            if (!isDateInRange(appDate, historyPeriodFilter, appliedCustomRange?.from, appliedCustomRange?.to)) {
                return false;
            }

            // 5. History Search
            if (historySearch.trim()) {
                const term = historySearch.trim().toLowerCase();
                const reason = String(app.reason || app.reason_for_visit || app.patient_notes || '').toLowerCase();
                const diagnosis = String(app.diagnosis || '').toLowerCase();
                const doctorNotes = String(app.doctor_notes || app.notes || '').toLowerCase();
                const srcLabel = String(app.sourceLabel || (src === 'direct' ? 'Direct Practice' : 'Vaididea')).toLowerCase();
                const vtLabel = String(app.visitTypeLabel || vt).toLowerCase();
                const dateStr = String(appDate || '').toLowerCase();

                // Also check matching prescription
                const matchingRx = (record?.prescriptions || []).find((p: any) => 
                    p.appointment_id === app.id || p.consultation_id === app.id
                );
                const rxMeds = (matchingRx?.prescription_medicines || []).map((m: any) => String(m.name || m.medicine_name || '')).join(' ').toLowerCase();
                const rxDiagnosis = String(matchingRx?.diagnosis || '').toLowerCase();

                const matches = reason.includes(term) ||
                    diagnosis.includes(term) ||
                    doctorNotes.includes(term) ||
                    srcLabel.includes(term) ||
                    vtLabel.includes(term) ||
                    dateStr.includes(term) ||
                    rxMeds.includes(term) ||
                    rxDiagnosis.includes(term);

                if (!matches) return false;
            }

            return true;
        });
    }, [
        record, 
        historySourceFilter, 
        historyVisitTypeFilter, 
        historyStatusFilter, 
        historyPeriodFilter, 
        appliedCustomRange, 
        historySearch,
        isDateInRange
    ]);

    const isAnyFilterActive = 
        historyPeriodFilter !== 'all' || 
        historySourceFilter !== 'all' || 
        historyVisitTypeFilter !== 'all' || 
        historyStatusFilter !== 'all' || 
        historySearch.trim() !== '' || 
        appliedCustomRange !== null;

    const handleClearFilters = () => {
        setHistoryPeriodFilter('all');
        setHistorySourceFilter('all');
        setHistoryVisitTypeFilter('all');
        setHistoryStatusFilter('all');
        setHistorySearch('');
        setCustomFromDate('');
        setCustomToDate('');
        setAppliedCustomRange(null);
        setHistoryPage(1);
    };

    const totalPages = Math.ceil(filteredEncounters.length / historyPageSize) || 1;
    const paginatedEncounters = useMemo(() => {
        const start = (historyPage - 1) * historyPageSize;
        return filteredEncounters.slice(start, start + historyPageSize);
    }, [filteredEncounters, historyPage, historyPageSize]);

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
                                {(() => {
                                    const srcDisplay = getSourceDisplay(record.source);
                                    return (
                                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${srcDisplay.badgeClass}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${srcDisplay.dotClass}`}></span>
                                            {srcDisplay.label.toUpperCase()}
                                        </span>
                                    );
                                })()}
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
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <Activity className="w-5 h-5 text-emerald-500"/> Latest Vitals Snapshot
                                </h2>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    ⌚ Synced via Google Health Connect
                                </span>
                            </div>
                            <div className="p-6 flex-1 bg-white dark:bg-gray-900">
                                {vitals.length > 0 ? (
                                    <div className="flex flex-col h-full justify-between">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex flex-col justify-center transition-transform hover:-translate-y-0.5">
                                                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-2">Heart Rate</p>
                                                <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                    {getSafeValue(vitals[0].heartRate)} <span className="text-sm font-semibold text-gray-500">bpm</span>
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center transition-transform hover:-translate-y-0.5">
                                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Blood Pressure</p>
                                                <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                    {getSafeValue(vitals[0].bloodPressure)}
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30 flex flex-col justify-center transition-transform hover:-translate-y-0.5">
                                                <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-2">SpO2</p>
                                                <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                    {getSafeValue(vitals[0].oxygenLevel)} <span className="text-sm font-semibold text-gray-500">%</span>
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 flex flex-col justify-center transition-transform hover:-translate-y-0.5">
                                                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Temperature</p>
                                                <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                                                    {getSafeValue(vitals[0].temperature)} <span className="text-sm font-semibold text-gray-500">°F</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>Source: Verified Android Wearable Sensor / Health Connect</span>
                                            <span>{vitals[0].recordedAt ? formatDate(vitals[0].recordedAt, true) : 'Recently Synced'}</span>
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
                    <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 min-w-0 w-full">
                        {/* Left Column: Consultations */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col min-w-0 w-full">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <FileText className="w-5 h-5 text-emerald-600"/> Consultations
                                </h2>
                                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                    {consultations.length} total
                                </span>
                            </div>
                            <div className="p-6 min-w-0">
                                {consultations.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 font-medium">No consultation history.</p>
                                    </div>
                                ) : (
                                    <div className="relative border-l-2 border-emerald-100 dark:border-emerald-900/30 ml-4 space-y-6 pb-2 min-w-0">
                                        {consultations.map((consultation) => (
                                            <div key={consultation.id} className="relative pl-6 group min-w-0">
                                                <div className="absolute w-3.5 h-3.5 bg-emerald-500 rounded-full -left-[9px] top-1.5 ring-4 ring-white dark:ring-gray-900 transition-transform" />
                                                <div className="bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors min-w-0">
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{formatDate(consultation.created_at, true)}</p>
                                                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase border shadow-sm ${statusClasses(consultation.status)}`}>
                                                            {formatStatus(consultation.status)}
                                                        </span>
                                                    </div>
                                                    {((consultation as any).appointment?.reason || (consultation as any).appointment?.symptoms || (consultation as any).appointment?.patient_notes) && (
                                                        <div className="mb-3 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 min-w-0">
                                                            <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Reason for Consultation</span>
                                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-words">
                                                                {(consultation as any).appointment?.reason || (consultation as any).appointment?.patient_notes}
                                                            </p>
                                                            {(consultation as any).appointment?.symptoms && (consultation as any).appointment?.symptoms.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                    {(consultation as any).appointment.symptoms.map((s: string) => (
                                                                        <span key={s} className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[10px] px-1.5 py-0.5 rounded border border-red-100 dark:border-red-800/30">
                                                                            {s}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {(consultation as any).appointment?.severity_current !== undefined && (
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <span className="text-[10px] text-gray-500 font-semibold">Severity:</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(consultation as any).appointment.severity_current <= 3 ? 'bg-emerald-100 text-emerald-700' : (consultation as any).appointment.severity_current <= 6 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {(consultation as any).appointment.severity_current}/10
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {(consultation as any).appointment?.voice_note_url && (
                                                                <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50">
                                                                    <audio src={(consultation as any).appointment.voice_note_url} controls className="h-6 w-full max-w-[200px]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
                                                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Diagnosis / Notes</span>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium break-words">
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
                        
                        {/* Right Column: History Filter Bar + Practice Visits */}
                        <div className="min-w-0 w-full space-y-6 flex flex-col">
                            {/* History Filter Bar */}
                            <div className="w-full min-w-0 max-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-4 sm:p-5 space-y-3.5 box-border">
                                {/* Search History (Full width of filter card) */}
                                <div className="relative w-full min-w-0">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Search className="h-4 w-4 shrink-0" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search history (complaint, diagnosis, notes, rx)..."
                                        value={historySearch}
                                        onChange={(e) => {
                                            setHistorySearch(e.target.value);
                                            setHistoryPage(1);
                                        }}
                                        className="block w-full min-w-0 max-w-full h-10 pl-9 pr-3 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm truncate"
                                    />
                                </div>

                                {/* 4 Filter Dropdowns in a 2-Column Grid (2x2 on sm+) */}
                                <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* 1. Period Filter */}
                                    <div className="relative w-full min-w-0">
                                        <select
                                            value={historyPeriodFilter}
                                            onChange={(e) => {
                                                setHistoryPeriodFilter(e.target.value);
                                                setHistoryPage(1);
                                            }}
                                            className="block w-full min-w-0 max-w-full h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                                        >
                                            <option value="all">All Time</option>
                                            <option value="today">Today</option>
                                            <option value="yesterday">Yesterday</option>
                                            <option value="last_7_days">Last 7 Days</option>
                                            <option value="last_30_days">Last 30 Days</option>
                                            <option value="this_year">This Year</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                        </div>
                                    </div>

                                    {/* 2. Source Filter */}
                                    <div className="relative w-full min-w-0">
                                        <select
                                            value={historySourceFilter}
                                            onChange={(e) => {
                                                setHistorySourceFilter(e.target.value);
                                                setHistoryPage(1);
                                            }}
                                            className="block w-full min-w-0 max-w-full h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                                        >
                                            <option value="all">All Sources</option>
                                            <option value="vaididea">Vaididea</option>
                                            <option value="direct">Direct Practice</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                        </div>
                                    </div>

                                    {/* 3. Visit Type Filter */}
                                    <div className="relative w-full min-w-0">
                                        <select
                                            value={historyVisitTypeFilter}
                                            onChange={(e) => {
                                                setHistoryVisitTypeFilter(e.target.value);
                                                setHistoryPage(1);
                                            }}
                                            className="block w-full min-w-0 max-w-full h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                                        >
                                            <option value="all">All Visit Types</option>
                                            <option value="video_consultation">Video Consultation</option>
                                            <option value="in_person_clinic">In-Person Clinic</option>
                                            <option value="walk_in_clinic">Walk-in Clinic</option>
                                            <option value="phone_consultation">Phone Consultation</option>
                                            <option value="home_visit">Home Visit</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                        </div>
                                    </div>

                                    {/* 4. Status Filter */}
                                    <div className="relative w-full min-w-0">
                                        <select
                                            value={historyStatusFilter}
                                            onChange={(e) => {
                                                setHistoryStatusFilter(e.target.value);
                                                setHistoryPage(1);
                                            }}
                                            className="block w-full min-w-0 max-w-full h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="in_progress">In Progress</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Date Range Picker Bar (if custom selected) */}
                                {historyPeriodFilter === 'custom' && (
                                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs w-full min-w-0">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Custom Range:</span>
                                        <div className="flex items-center gap-1.5 flex-1 min-w-[110px]">
                                            <span className="text-slate-500 font-medium text-[11px]">From:</span>
                                            <input 
                                                type="date"
                                                value={customFromDate}
                                                onChange={(e) => setCustomFromDate(e.target.value)}
                                                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200 text-xs w-full min-w-0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-1 min-w-[110px]">
                                            <span className="text-slate-500 font-medium text-[11px]">To:</span>
                                            <input 
                                                type="date"
                                                value={customToDate}
                                                onChange={(e) => setCustomToDate(e.target.value)}
                                                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200 text-xs w-full min-w-0"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAppliedCustomRange({ from: customFromDate, to: customToDate });
                                                setHistoryPage(1);
                                            }}
                                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm shrink-0"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                )}

                                {/* Match Count & Clear Filters Row */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/80 text-xs w-full min-w-0">
                                    <span className="text-gray-500 font-semibold text-xs truncate">
                                        Showing <strong className="text-gray-900 dark:text-gray-100">{filteredEncounters.length}</strong> of <strong className="text-gray-900 dark:text-gray-100">{recentAppointments.length}</strong> visits
                                    </span>
                                    {isAnyFilterActive && (
                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 ml-2"
                                        >
                                            <RotateCcw className="h-3 w-3 shrink-0" /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Consultations & Practice Visits Card */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col w-full min-w-0">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                        <Calendar className="w-5 h-5 text-blue-600"/> Consultations & Practice Visits
                                    </h2>
                                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-bold text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                                        {filteredEncounters.length} {filteredEncounters.length === 1 ? 'visit' : 'visits'}
                                    </span>
                                </div>
                                <div className="p-6 min-w-0">
                                    {paginatedEncounters.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                            <p className="text-gray-700 dark:text-gray-300 font-bold text-base">No visits found matching active filters.</p>
                                            <p className="text-gray-400 text-xs mt-1">Try selecting a broader date range or clearing filters.</p>
                                            {isAnyFilterActive && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearFilters}
                                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 transition"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" /> Reset All Filters
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 min-w-0">
                                            {paginatedEncounters.map(app => {
                                                const isDirect = app.source === 'direct_walk_in' || app.source === 'direct_phone' || app.source === 'direct' || app.type === 'home_visit' || (app as any).source === 'walk_in';
                                                const feeVal = app.fee ?? (app as any).consultation_fee ?? 0;
                                                const payStatus = (app as any).payment_status || 'paid';
                                                const matchingRx = (record?.prescriptions || []).find((p: any) => p.appointment_id === app.id || p.consultation_id === app.id || (isDirect && p.created_at && app.created_at && Math.abs(new Date(p.created_at).getTime() - new Date(app.created_at).getTime()) < 60000));

                                                return (
                                                    <div key={app.id} className="flex flex-col p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-800/80 transition-colors hover:shadow-sm gap-4 min-w-0">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 flex">
                                                                    <Calendar className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                                        <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{formatDate(app.appointment_date || app.created_at)}</p>
                                                                        {(() => {
                                                                            const src = app.source || resolveCanonicalSource(app);
                                                                            const vt = app.visitType || resolveCanonicalVisitType(app);
                                                                            const srcDisplay = getSourceDisplay(src);
                                                                            const vtDisplay = getVisitTypeDisplay(vt);
                                                                            return (
                                                                                <>
                                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${srcDisplay.badgeClass}`}>
                                                                                        <span className={`w-1 h-1 rounded-full ${srcDisplay.dotClass}`}></span>
                                                                                        {srcDisplay.label}
                                                                                    </span>
                                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${vtDisplay.badgeClass}`}>
                                                                                        {vtDisplay.label}
                                                                                    </span>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                        {feeVal > 0 && (
                                                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                                                            ₹{feeVal} · {payStatus.toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                                    Time: {app.time_slot || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase border shadow-sm ${statusClasses(app.status)}`}>
                                                                {formatStatus(app.status)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {(app.reason || (app as any).reason_for_visit || app.patient_notes || (app as any).doctor_notes || (app as any).diagnosis || matchingRx?.diagnosis) && (
                                                        <div className="bg-white dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs space-y-2 min-w-0">
                                                            {(app.reason || (app as any).reason_for_visit || app.patient_notes) && (
                                                                <div>
                                                                    <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider block mb-0.5">Reason / Complaint</span>
                                                                    <p className="text-gray-800 dark:text-gray-200 font-medium break-words">{app.reason || (app as any).reason_for_visit || app.patient_notes}</p>
                                                                </div>
                                                            )}
                                                            {((app as any).diagnosis || matchingRx?.diagnosis) && (
                                                                <div>
                                                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider block mb-0.5">Diagnosis</span>
                                                                    <p className="text-gray-800 dark:text-gray-200 font-medium break-words">{(app as any).diagnosis || matchingRx?.diagnosis}</p>
                                                                </div>
                                                            )}
                                                            {(app.doctor_notes || (app as any).notes) && (
                                                                <div>
                                                                    <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider block mb-0.5">Doctor's Clinical Notes</span>
                                                                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium break-words">{app.doctor_notes || (app as any).notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 min-w-0">
                                                        <div className="min-w-0">
                                                            {matchingRx?.prescription_medicines && matchingRx.prescription_medicines.length > 0 && (
                                                                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate">
                                                                    <Pill className="h-3 w-3 shrink-0" /> {matchingRx.prescription_medicines.length} items prescribed
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {matchingRx ? (
                                                                <Link
                                                                    href={`/doctor/prescriptions/${matchingRx.id}`}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-bold transition shadow-sm"
                                                                >
                                                                    <Pill className="w-3.5 h-3.5" /> View Prescription
                                                                </Link>
                                                            ) : (
                                                                <Link
                                                                    href={`/doctor/prescriptions/new?appointmentId=${app.id}`}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition shadow-sm"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" /> Create Prescription
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-100 dark:border-gray-800 min-w-0">
                                        <p className="text-xs font-medium text-gray-500">
                                            Page {historyPage} of {totalPages}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                disabled={historyPage === 1}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5" /> Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                                disabled={historyPage === totalPages}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                            >
                                                Next <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                                {((c as any).appointment?.reason || (c as any).appointment?.patient_notes) && (
                                                    <div className="mb-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                        <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Reason:</span>
                                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                            {(c as any).appointment?.reason || (c as any).appointment?.patient_notes}
                                                        </p>
                                                        {(c as any).appointment?.severity_current !== undefined && (
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-500 font-semibold">Severity:</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(c as any).appointment.severity_current <= 3 ? 'bg-emerald-100 text-emerald-700' : (c as any).appointment.severity_current <= 6 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {(c as any).appointment.severity_current}/10
                                                                </span>
                                                            </div>
                                                        )}
                                                        {(c as any).appointment?.voice_note_url && (
                                                            <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50">
                                                                <audio src={(c as any).appointment.voice_note_url} controls className="h-6 w-full max-w-[200px]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
