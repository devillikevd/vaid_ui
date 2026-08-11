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
    Loader2,
    Mail,
    MapPin,
    Phone,
    Pill,
    RefreshCw,
    Ruler,
    Scale,
    User,
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PatientMedicalHistory } from '@/components/doctor/PatientMedicalHistory';

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

function getReportTitle(report: ReportRecord) {
    return report.name || report.title || report.report_name || report.type || 'Medical report';
}

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
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading patient record...</span>
            </div>
        );
    }

    if (error || !record) {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-red-200 bg-red-50/70 p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div>
                    <p className="text-lg font-semibold text-red-700">Unable to load patient record</p>
                    <p className="mt-1 text-sm text-red-600">{error || 'This patient record is unavailable right now.'}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/doctor/patients')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                        Back to patients
                    </Button>
                    <Button onClick={() => void loadRecord(true)} leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isRefreshing}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={() => router.push('/doctor/patients')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to patients
                </button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void loadRecord(true)} leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />} disabled={isRefreshing}>
                        Refresh Profile
                    </Button>
                </div>
            </div>

            {/* Premium Sticky Profile Header */}
            <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-5 justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/20 dark:text-emerald-400 text-2xl font-bold shadow-inner ring-1 ring-emerald-500/20">
                            {patientLabel.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patientLabel}</h1>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                {[record.age ? `${record.age} yrs` : null, record.gender, record.blood_group].filter(Boolean).map((item) => (
                                    <span key={item} className="rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 font-medium border border-gray-200 dark:border-gray-700">{item}</span>
                                ))}
                                {record.phone && <span className="flex items-center gap-1.5 ml-2"><Phone className="h-3.5 w-3.5"/> {record.phone}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div className="px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Total Visits</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{record.totalVisits || 0}</p>
                        </div>
                        <div className="px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hidden sm:block">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Last Visit</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2">{formatDate(record.lastVisit) || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex overflow-x-auto border-t border-gray-100 dark:border-gray-800 px-4 scrollbar-hide">
                    {[
                        { id: 'overview', label: 'Overview & Vitals', icon: Activity },
                        { id: 'history', label: 'Medical History', icon: User },
                        { id: 'timeline', label: 'Consultations', icon: Clock3 },
                        { id: 'vault', label: 'Shared Vault', icon: Lock },
                        { id: 'reports', label: 'Lab Reports', icon: FileText }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6 animate-in fade-in duration-300">
                {activeTab === 'overview' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Vitals Snapshot */}
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                <CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-emerald-500"/> Latest Vitals Snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {vitals.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-900 border border-red-100 dark:border-red-900/30">
                                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Heart Rate</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{vitals[0].heartRate || '--'} <span className="text-sm font-medium text-gray-500">bpm</span></p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900 border border-blue-100 dark:border-blue-900/30">
                                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Blood Pressure</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{vitals[0].bloodPressure || '--'}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-gray-900 border border-cyan-100 dark:border-cyan-900/30">
                                            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">SpO2</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{vitals[0].oxygenLevel || '--'} <span className="text-sm font-medium text-gray-500">%</span></p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-900 border border-orange-100 dark:border-orange-900/30">
                                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Temperature</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{vitals[0].temperature || '--'} <span className="text-sm font-medium text-gray-500">°F</span></p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-gray-500">
                                        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                        <p>No vitals recorded yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Profile Info */}
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                <CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-blue-500"/> Personal Information</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-5">
                                <div className="grid grid-cols-2 gap-5 text-sm">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Email</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 truncate">{record.email || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Date of Birth</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{formatDate(record.date_of_birth)}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Weight</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{record.weight ? `${record.weight} kg` : 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Height</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{record.height ? `${record.height} cm` : 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Address</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{record.address || 'N/A'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Medical History</h2>
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
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600"/> Consultations & Prescriptions</span>
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                        {consultations.length} records
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {consultations.length === 0 ? (
                                    <p className="py-8 text-center text-gray-500">No consultation history.</p>
                                ) : (
                                    <div className="relative border-l border-gray-200 dark:border-gray-700 ml-4 space-y-8 pb-4">
                                        {consultations.map((consultation, i) => (
                                            <div key={consultation.id} className="relative pl-6">
                                                <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[6.5px] top-2 ring-4 ring-white dark:ring-gray-900" />
                                                <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-gray-100">{formatDate(consultation.created_at, true)}</p>
                                                        </div>
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(consultation.status)}`}>
                                                            {formatStatus(consultation.status)}
                                                        </span>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                                            <span className="font-semibold mr-2 text-gray-900 dark:text-gray-100">Diagnosis/Notes:</span>
                                                            {consultation.diagnosis || consultation.notes || 'No details recorded.'}
                                                        </p>
                                                    </div>
                                                    {(consultation.prescriptions && consultation.prescriptions.length > 0) && (
                                                        <div className="mt-4 flex items-center gap-2">
                                                            <Pill className="h-4 w-4 text-blue-500" />
                                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Prescribed {consultation.prescriptions.length} items</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600"/> Appointments History</span>
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {recentAppointments.length} records
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {recentAppointments.length === 0 ? (
                                    <p className="py-8 text-center text-gray-500">No appointments found.</p>
                                ) : (
                                    <div className="grid gap-3">
                                        {recentAppointments.map(app => (
                                            <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                                                        <Calendar className="h-4 w-4 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(app.appointment_date || app.created_at)} at {app.time_slot}</p>
                                                        <p className="text-sm text-gray-500 mt-0.5">{app.reason || 'General Visit'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 sm:mt-0 flex items-center gap-3">
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(app.status)}`}>
                                                        {formatStatus(app.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'vault' && (
                    <div className="space-y-6">
                        <div className={`p-5 rounded-2xl border ${recordAccess?.hasFullHistoryAccess ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50' : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'} flex items-start gap-4`}>
                            {recordAccess?.hasFullHistoryAccess ? (
                                <Lock className="w-6 h-6 text-emerald-600 mt-1 shrink-0" />
                            ) : (
                                <Lock className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
                            )}
                            <div>
                                <h3 className={`font-semibold text-lg ${recordAccess?.hasFullHistoryAccess ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                                    {recordAccess?.hasFullHistoryAccess ? 'Vault Unlocked' : 'Vault Locked'}
                                </h3>
                                <p className={`text-sm mt-1 ${recordAccess?.hasFullHistoryAccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                    {recordAccess?.hasFullHistoryAccess 
                                        ? `Patient-approved access is active${recordAccess.expiresAt ? ` until ${formatDate(recordAccess.expiresAt, true)}` : ''}. You can view historical records from other doctors.`
                                        : 'Patient approval is required for past medical history from other clinics. Ask the patient to grant access during consultation.'}
                                </p>
                            </div>
                        </div>

                        {recordAccess?.hasFullHistoryAccess && (
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                        <CardTitle className="text-lg">Other Consultations</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {sharedConsultations.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">No prior consultations found.</p>
                                        ) : sharedConsultations.map(c => (
                                            <div key={c.id} className="mb-4 last:mb-0 p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">Dr. {c.doctor?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{formatDate(c.created_at)}</p>
                                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{c.diagnosis || c.notes}</p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                        <CardTitle className="text-lg">Other Prescriptions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {sharedPrescriptions.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">No prior prescriptions found.</p>
                                        ) : sharedPrescriptions.map(p => (
                                            <div key={p.id} className="mb-4 last:mb-0 p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">Dr. {p.doctor?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{formatDate(p.created_at)}</p>
                                                {p.prescription_medicines && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {p.prescription_medicines.map((m, i) => (
                                                            <span key={i} className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-[10px] font-medium">{m.medicine_name}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                        <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-violet-600"/> Lab Reports & Documents</span>
                                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                                    {reports.length} files
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {reports.length === 0 ? (
                                <p className="py-12 text-center text-gray-500">No reports found.</p>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {reports.map(report => (
                                        <div key={report.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 transition-colors group">
                                            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{getReportTitle(report)}</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(report.date || report.created_at)} • {formatStatus(report.type)}</p>
                                                {report.file_url && (
                                                    <a href={report.file_url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400 transition-colors">
                                                        View Document &rarr;
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
