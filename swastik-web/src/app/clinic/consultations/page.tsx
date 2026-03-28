'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { clinicApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Video,
    Phone,
    MessageCircle,
    Filter,
    User,
    Stethoscope,
    Loader2,
    RefreshCw,
    AlertCircle,
    Search,
    Clock,
} from 'lucide-react';

interface Consultation {
    id: string;
    status: string;
    type: string;
    created_at?: string | null;
    started_at: string | null;
    ended_at: string | null;
    diagnosis: string | null;
    notes: string | null;
    doctor: { id: string; name: string; specialization: string; profile_image_url: string | null };
    patient: { id: string; name: string; phone?: string };
    appointment: { id: string; appointment_date: string; time_slot: string; type: string } | null;
}

const PAGE_SIZE = 10;

export default function ClinicConsultationsPage() {
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const loadConsultations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await clinicApi.getConsultations({
                page,
                limit: PAGE_SIZE,
                search: deferredSearchQuery || undefined,
                status: statusFilter || undefined,
            }) as any;
            if (res.success) {
                setConsultations((res.data || []) as Consultation[]);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalItems(res.pagination?.total || 0);
            } else {
                setError(res.error || 'Failed to load consultations');
            }
        } catch (err) {
            console.error('Failed to load consultations:', err);
            setError('Failed to load consultations');
        } finally {
            setLoading(false);
        }
    }, [deferredSearchQuery, page, statusFilter]);

    useEffect(() => {
        void loadConsultations();
    }, [loadConsultations]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery, statusFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const formatDate = (dateStr?: string | null) =>
        dateStr
            ? new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : '—';

    const formatDateTime = (dateStr?: string | null) =>
        dateStr
            ? new Date(dateStr).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : '—';

    const renderTypeIcon = (type?: string) => {
        if (type === 'audio') return <Phone className="w-4 h-4" />;
        if (type === 'chat') return <MessageCircle className="w-4 h-4" />;
        return <Video className="w-4 h-4" />;
    };

    if (loading && consultations.length === 0) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-pink-600" />
            </div>
        );
    }

    if (error && consultations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button onClick={() => void loadConsultations()} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clinic Consultations</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track consultations handled by doctors linked to your clinic</p>
                </div>
                <Button variant="outline" onClick={() => void loadConsultations()} disabled={loading} leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            ) : null}

            <Card padding="sm">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <Input
                        placeholder="Search by patient, doctor, specialization, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-transparent focus:outline-none"
                        >
                            <option value="">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="waiting">Waiting</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">{totalItems} consultations</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Page {page} of {totalPages}</span>
                    </div>
                </div>
            </Card>

            {consultations.length === 0 ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                    <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No consultations found for the current filters</p>
                </div>
            ) : (
                <Card padding="none">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {consultations.map((consultation) => {
                            const consultationType = consultation.type || consultation.appointment?.type || 'video';
                            const visitDate = consultation.appointment?.appointment_date || consultation.started_at || consultation.created_at;
                            return (
                                <div key={consultation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                                            <div className="flex items-center gap-3 min-w-[220px]">
                                                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center dark:bg-pink-900/30">
                                                    <User className="w-5 h-5 text-pink-600 dark:text-pink-300" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{consultation.patient?.name || 'N/A'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{consultation.patient?.phone || 'Phone not available'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1 min-w-[220px]">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">Dr. {consultation.doctor?.name || 'N/A'}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{consultation.doctor?.specialization || 'Specialization not set'}</p>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    {renderTypeIcon(consultationType)}
                                                    <span className="capitalize">{consultationType}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{formatDate(visitDate)}</span>
                                                    {consultation.appointment?.time_slot ? <span>{consultation.appointment.time_slot}</span> : null}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start gap-2 xl:items-end">
                                            <StatusBadge status={consultation.status || 'pending'} size="sm" />
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Started: {formatDateTime(consultation.started_at || consultation.created_at)}
                                            </p>
                                            {consultation.status === 'in_progress' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                    <Video className="w-3.5 h-3.5" />
                                                    Doctor live
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    {(consultation.diagnosis || consultation.notes) ? (
                                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Diagnosis</p>
                                                <p className="mt-1">{consultation.diagnosis || 'Not recorded'}</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Notes</p>
                                                <p className="mt-1">{consultation.notes || 'No notes added'}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                itemsPerPage={PAGE_SIZE}
            />
        </div>
    );
}
