'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Calendar, Clock, Loader2, RefreshCw, Search, Download, AlertCircle, Phone, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useHospitalStore } from '@/stores/hospitalStore';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { downloadCSV } from '@/utils/export';

const PAGE_SIZE = 10;

export default function HospitalAppointmentsPage() {
    const {
        appointments,
        loadingAppointments,
        appointmentsPagination,
        error,
        fetchAppointments,
        clearError,
    } = useHospitalStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const loadAppointments = useCallback(() => fetchAppointments({
        page,
        limit: PAGE_SIZE,
        search: deferredSearchQuery,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
    }), [dateFilter, deferredSearchQuery, fetchAppointments, page, statusFilter]);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, dateFilter]);

    useAppointmentUpdates(() => {
        loadAppointments();
    });

    if (loadingAppointments && appointments.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
    }

    if (error && appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button onClick={() => { clearError(); loadAppointments(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Search, filter, and monitor hospital appointments in real time</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV(appointments, [
                            { key: 'patientName', label: 'Patient' },
                            { key: 'patientPhone', label: 'Patient Phone' },
                            { key: 'doctorName', label: 'Doctor' },
                            { key: 'doctorSpecialization', label: 'Specialization' },
                            { key: 'date', label: 'Date' },
                            { key: 'time', label: 'Time' },
                            { key: 'status', label: 'Status' },
                            { key: 'type', label: 'Type' },
                        ], 'hospital-appointments-current-view')}
                        leftIcon={<Download className="h-4 w-4" />}
                        disabled={appointments.length === 0}
                    >
                        Export View
                    </Button>
                    <Button onClick={loadAppointments} leftIcon={<RefreshCw className={`h-4 w-4 ${loadingAppointments ? 'animate-spin' : ''}`} />}>Refresh</Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            ) : null}

            <Card padding="sm">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
                    <Input
                        placeholder="Search by patient, doctor, phone, date, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                        <option value="">All statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No show</option>
                    </select>
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">{appointmentsPagination.total || 0} appointments</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Page {appointmentsPagination.page || page} of {appointmentsPagination.totalPages || 1}</span>
                    </div>
                </div>
            </Card>

            <Card padding="none">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {appointments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No appointments found for the current filters</div>
                    ) : appointments.map((apt) => (
                        <div key={apt.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{apt.patientName || 'Patient'}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                                {apt.patientPhone ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{apt.patientPhone}</span> : null}
                                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{apt.date ? new Date(apt.date).toLocaleDateString('en-IN') : '—'}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{apt.time || '—'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                                <Stethoscope className="h-3.5 w-3.5" />
                                                Dr. {apt.doctorName || 'Doctor'}
                                            </span>
                                            {apt.doctorSpecialization ? <span>{apt.doctorSpecialization}</span> : null}
                                            <span className="capitalize">{apt.type || 'hospital'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                                    <StatusBadge status={apt.status || 'scheduled'} size="sm" />
                                    {apt.reason ? <p className="max-w-sm text-right text-sm text-gray-500 dark:text-gray-400">{apt.reason}</p> : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Pagination
                currentPage={page}
                totalPages={appointmentsPagination.totalPages || 1}
                onPageChange={setPage}
                totalItems={appointmentsPagination.total || appointments.length}
                itemsPerPage={PAGE_SIZE}
            />
        </div>
    );
}
