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
    Loader2,
    Mail,
    Phone,
    Pill,
    RefreshCw,
    User,
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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

interface PatientRecord {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    date_of_birth?: string;
    profile_image_url?: string;
    email?: string;
    phone?: string;
    totalVisits?: number;
    lastVisit?: string;
    appointments?: AppointmentRecord[];
    consultations?: ConsultationRecord[];
    reports?: ReportRecord[];
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
    const reports = useMemo(() => record?.reports || [], [record]);
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
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => router.push('/doctor/patients')}
                        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to patient list
                    </button>
                    <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">{patientLabel}</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">A complete view of consultations, reports, visits, and vitals for this patient.</p>
                </div>
                <Button variant="outline" onClick={() => void loadRecord(true)} leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isRefreshing}>
                    Refresh record
                </Button>
            </div>

            <Card padding="none" className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl">
                <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-xl font-semibold">
                            {patientLabel.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">Patient Record</p>
                                <h2 className="mt-1 text-3xl font-semibold">{patientLabel}</h2>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-slate-200">
                                {[record.age ? `${record.age} years` : null, record.gender, record.blood_group].filter(Boolean).map((item) => (
                                    <span key={item} className="rounded-full bg-white/10 px-3 py-1">
                                        {item}
                                    </span>
                                ))}
                            </div>
                            <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                                <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-300" />{record.phone || 'Phone not recorded'}</span>
                                <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-300" />{record.email || 'Email not recorded'}</span>
                                <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-cyan-300" />Last visit: {formatDate(record.lastVisit)}</span>
                                <span className="flex items-center gap-2"><User className="h-4 w-4 text-cyan-300" />DOB: {formatDate(record.date_of_birth)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/8 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Visits</p>
                            <p className="mt-2 text-3xl font-semibold">{record.totalVisits || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Vitals</p>
                            <p className="mt-2 text-3xl font-semibold">{vitals.length}</p>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Consultations</p>
                            <p className="mt-2 text-3xl font-semibold">{consultations.length}</p>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Reports</p>
                            <p className="mt-2 text-3xl font-semibold">{reports.length}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Appointments</CardTitle>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent scheduled visits and their status.</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                {recentAppointments.length} total
                            </span>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {recentAppointments.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                    No appointment history is available yet.
                                </p>
                            ) : recentAppointments.map((appointment) => (
                                <div key={appointment.id} className="rounded-2xl border border-gray-200/80 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {formatDate(appointment.appointment_date || appointment.created_at)}
                                                </p>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(appointment.status)}`}>
                                                    {formatStatus(appointment.status)}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{appointment.time_slot || 'Time pending'}</span>
                                                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{formatStatus(appointment.type || 'visit')}</span>
                                                {appointment.fee ? <span>Fee: ₹{appointment.fee.toLocaleString('en-IN')}</span> : null}
                                            </div>
                                        </div>
                                        {appointment.reason && <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">{appointment.reason}</p>}
                                    </div>
                                    {appointment.notes && (
                                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                            {appointment.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Consultations & Prescriptions</CardTitle>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Notes and medicines created during visits with this doctor.</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {consultations.length} records
                            </span>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {consultations.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                    No consultation history has been added yet.
                                </p>
                            ) : consultations.map((consultation) => (
                                <div key={consultation.id} className="rounded-2xl border border-gray-200/80 p-4 dark:border-gray-700">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(consultation.created_at, true)}</p>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(consultation.status)}`}>
                                                    {formatStatus(consultation.status)}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                {consultation.diagnosis || consultation.notes || 'No diagnosis or consultation notes were recorded.'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Pill className="h-4 w-4" />
                                                {(consultation.prescriptions || []).length} prescriptions
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Vitals</CardTitle>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Latest vitals recorded for this patient.</p>
                            </div>
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                                {vitals.length} entries
                            </span>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {vitals.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                    No vitals have been recorded yet.
                                </p>
                            ) : vitals.slice(0, 8).map((vital) => (
                                <div key={vital.id} className="rounded-2xl border border-gray-200/80 p-4 dark:border-gray-700">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(vital.recordedAt || vital.created_at, true)}</p>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{vital.notes || 'Vitals captured from the patient monitoring flow.'}</p>
                                        </div>
                                        <Activity className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Blood Pressure</p>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{vital.bloodPressure || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Heart Rate</p>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{vital.heartRate ? `${vital.heartRate} bpm` : 'N/A'}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">SpO₂</p>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{vital.oxygenLevel ? `${vital.oxygenLevel}%` : 'N/A'}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{vital.temperature ? `${vital.temperature}°F` : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Reports</CardTitle>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent reports and lab documents connected to this patient.</p>
                            </div>
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                {reports.length} files
                            </span>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {reports.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                    No reports are linked to this patient yet.
                                </p>
                            ) : reports.map((report) => (
                                <div key={report.id} className="rounded-2xl border border-gray-200/80 p-4 dark:border-gray-700">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-600" />
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{getReportTitle(report)}</p>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(report.status)}`}>
                                                    {formatStatus(report.status || 'pending')}
                                                </span>
                                                <span>{formatStatus(report.type || 'report')}</span>
                                                <span>{formatDate(report.date || report.created_at)}</span>
                                            </div>
                                            {(report.doctor_notes || report.notes) && (
                                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{report.doctor_notes || report.notes}</p>
                                            )}
                                        </div>
                                        {report.file_url ? (
                                            <a
                                                href={report.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                            >
                                                Open file
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
