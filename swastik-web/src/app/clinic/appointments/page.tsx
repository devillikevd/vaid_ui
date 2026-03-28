'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Calendar, Search, Loader2, RefreshCw, AlertCircle, Filter, Phone, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 10;

export default function ClinicAppointmentsPage() {
    const {
        appointments,
        appointmentsPagination,
        loadingAppointments,
        error,
        fetchAppointments,
        clearError,
    } = useClinicStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const loadAppointments = useCallback(async () => {
        await fetchAppointments({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            status: statusFilter || undefined,
            date: dateFilter || undefined,
        });
    }, [dateFilter, deferredSearchQuery, fetchAppointments, page, statusFilter]);

    useEffect(() => {
        void loadAppointments();
    }, [loadAppointments]);

    useEffect(() => {
        setPage(1);
    }, [dateFilter, deferredSearchQuery, statusFilter]);

    useEffect(() => {
        if (page > appointmentsPagination.totalPages) {
            setPage(appointmentsPagination.totalPages);
        }
    }, [appointmentsPagination.totalPages, page]);

    // Real-time: auto-refresh when new/updated appointments arrive via Socket.IO
    useAppointmentUpdates(loadAppointments);

    if (loadingAppointments && appointments.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>;
    }

    if (error && appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); void loadAppointments(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Clinic appointment management</p></div>
                <Button variant="outline" onClick={() => void loadAppointments()} disabled={loadingAppointments} leftIcon={<RefreshCw className={`h-4 w-4 ${loadingAppointments ? 'animate-spin' : ''}`} />}>Refresh</Button>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <Card padding="sm">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
                    <Input
                        placeholder="Search by patient, phone, doctor, specialization, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-transparent focus:outline-none"
                        >
                            <option value="">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="waiting">Waiting</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">{appointmentsPagination.total} appointments</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Page {appointmentsPagination.page} of {appointmentsPagination.totalPages}</span>
                    </div>
                </div>
            </Card>

            <Card padding="none">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {appointments.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 dark:text-gray-400">No appointments found for the current filters.</div>
                    ) : appointments.map((appointment) => (
                        <div key={appointment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                                    <div className="flex items-center gap-4 min-w-[230px]">
                                        <div className="p-2.5 rounded-xl bg-pink-100 text-pink-700"><Calendar className="h-5 w-5" /></div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.patientName || 'Patient'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {appointment.date ? new Date(appointment.date).toLocaleDateString('en-IN') : '—'} · {appointment.time || '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 min-w-[220px]">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.doctorName || 'Doctor'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.doctorSpecialization || 'Specialization not set'}</p>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{appointment.patientPhone || 'Phone not available'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4 text-gray-400" />
                                            <span className="capitalize">{appointment.type || 'clinic'}</span>
                                        </div>
                                    </div>
                                </div>
                                <StatusBadge status={appointment.status || 'scheduled'} size="sm" />
                            </div>
                            {appointment.reason ? (
                                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Reason</p>
                                    <p className="mt-1">{appointment.reason}</p>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </Card>
            <Pagination
                currentPage={page}
                totalPages={appointmentsPagination.totalPages}
                onPageChange={setPage}
                totalItems={appointmentsPagination.total}
                itemsPerPage={PAGE_SIZE}
            />
        </div>
    );
}
