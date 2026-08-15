'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Calendar, Search, Loader2, RefreshCw, AlertCircle, Filter, Phone, Stethoscope, UserCheck, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 10;

const CLINIC_ACTIONS: Record<string, string[]> = {
    scheduled: ['confirm', 'checkin', 'noshow', 'reschedule', 'cancel'],
    confirmed: ['checkin', 'noshow', 'reschedule', 'cancel'],
};

export default function ClinicAppointmentsPage() {
    const {
        appointments,
        appointmentsPagination,
        loadingAppointments,
        error,
        fetchAppointments,
        updateAppointmentStatus,
        checkInAppointment,
        rescheduleAppointment,
        clearError,
    } = useClinicStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
    const [rescheduleForm, setRescheduleForm] = useState({ date: '', timeSlot: '' });
    const { dialogProps, confirm } = useConfirmDialog();
    const toast = useToast();
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

    const handleConfirm = async (appointmentId: string, patientName: string) => {
        setActionLoading(`confirm:${appointmentId}`);
        const success = await updateAppointmentStatus(appointmentId, 'confirmed');
        if (success) toast.success('Confirmed', `${patientName}'s appointment confirmed.`);
        else toast.error('Action Failed', useClinicStore.getState().error || 'Please try again.');
        setActionLoading(null);
    };

    const handleCheckIn = async (appointmentId: string, patientName: string) => {
        setActionLoading(`checkin:${appointmentId}`);
        const success = await checkInAppointment(appointmentId);
        if (success) toast.success('Checked In', `${patientName} checked in.`);
        else toast.error('Check-in Failed', useClinicStore.getState().error || 'Please try again.');
        setActionLoading(null);
    };

    const handleNoShow = async (appointmentId: string, patientName: string) => {
        const confirmed = await confirm({
            title: 'Mark as No Show',
            message: `Mark ${patientName}'s appointment as a no-show? The patient and doctor will be notified.`,
            confirmLabel: 'Mark No-show',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(`noshow:${appointmentId}`);
        const success = await updateAppointmentStatus(appointmentId, 'no_show');
        if (success) toast.success('No Show', `${patientName} marked as no-show.`);
        else toast.error('Action Failed', useClinicStore.getState().error || 'Please try again.');
        setActionLoading(null);
    };

    const handleCancel = async (appointmentId: string, patientName: string) => {
        const confirmed = await confirm({
            title: 'Cancel Appointment',
            message: `Cancel ${patientName}'s appointment? The patient and doctor will be notified.`,
            confirmLabel: 'Cancel Appointment',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(`cancel:${appointmentId}`);
        const success = await updateAppointmentStatus(appointmentId, 'cancelled');
        if (success) toast.success('Cancelled', `${patientName}'s appointment cancelled.`);
        else toast.error('Action Failed', useClinicStore.getState().error || 'Please try again.');
        setActionLoading(null);
    };

    const handleRescheduleSubmit = async () => {
        if (!rescheduleTarget || !rescheduleForm.date || !rescheduleForm.timeSlot) return;
        const appointment = appointments.find((a) => a.id === rescheduleTarget);
        setActionLoading(`reschedule:${rescheduleTarget}`);
        const success = await rescheduleAppointment(rescheduleTarget, rescheduleForm.date, rescheduleForm.timeSlot);
        if (success) toast.success('Rescheduled', `${appointment?.patientName || 'Patient'}'s appointment moved to ${rescheduleForm.date} at ${rescheduleForm.timeSlot}.`);
        else toast.error('Reschedule Failed', useClinicStore.getState().error || 'Slot may already be taken.');
        setRescheduleTarget(null);
        setRescheduleForm({ date: '', timeSlot: '' });
        setActionLoading(null);
    };

    const availableActions = (status: string) => CLINIC_ACTIONS[status] || [];

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
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Clinic front desk — confirm, check in, reschedule, and manage appointments</p></div>
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
                    ) : appointments.map((appointment) => {
                        const actions = availableActions(appointment.status);
                        return (
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
                                    <div className="flex flex-col items-start lg:items-end gap-2">
                                        <StatusBadge status={appointment.status || 'scheduled'} size="sm" />
                                        {appointment.checkedInAt && (
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <UserCheck className="h-3.5 w-3.5" />
                                                Checked in {new Date(appointment.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                        {actions.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                                {actions.includes('confirm') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={actionLoading === `confirm:${appointment.id}`}
                                                        onClick={() => void handleConfirm(appointment.id, appointment.patientName)}
                                                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                                        className="!px-2.5"
                                                    >
                                                        Confirm
                                                    </Button>
                                                )}
                                                {actions.includes('checkin') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={actionLoading === `checkin:${appointment.id}`}
                                                        onClick={() => void handleCheckIn(appointment.id, appointment.patientName)}
                                                        leftIcon={<UserCheck className="h-3.5 w-3.5 text-emerald-600" />}
                                                        className="!px-2.5"
                                                    >
                                                        Check in
                                                    </Button>
                                                )}
                                                {actions.includes('noshow') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={actionLoading === `noshow:${appointment.id}`}
                                                        onClick={() => void handleNoShow(appointment.id, appointment.patientName)}
                                                        leftIcon={<Ban className="h-3.5 w-3.5 text-orange-500" />}
                                                        className="!px-2.5"
                                                    >
                                                        No-show
                                                    </Button>
                                                )}
                                                {actions.includes('reschedule') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={actionLoading === `reschedule:${appointment.id}`}
                                                        onClick={() => { setRescheduleTarget(appointment.id); setRescheduleForm({ date: appointment.date || '', timeSlot: appointment.time }); }}
                                                        leftIcon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
                                                        className="!px-2.5"
                                                    >
                                                        Reschedule
                                                    </Button>
                                                )}
                                                {actions.includes('cancel') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={actionLoading === `cancel:${appointment.id}`}
                                                        onClick={() => void handleCancel(appointment.id, appointment.patientName)}
                                                        leftIcon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                                                        className="!px-2.5"
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {appointment.reason ? (
                                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Reason</p>
                                        <p className="mt-1">{appointment.reason}</p>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </Card>
            <Pagination
                currentPage={page}
                totalPages={appointmentsPagination.totalPages}
                onPageChange={setPage}
                totalItems={appointmentsPagination.total}
                itemsPerPage={PAGE_SIZE}
            />

            {/* Reschedule Modal */}
            {rescheduleTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <Card padding="lg" className="w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Reschedule Appointment</h2>
                            <button onClick={() => { setRescheduleTarget(null); setRescheduleForm({ date: '', timeSlot: '' }); }} className="text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <Input label="New Date *" type="date" value={rescheduleForm.date} onChange={(e) => setRescheduleForm((f) => ({ ...f, date: e.target.value }))} />
                            <Input label="New Time Slot *" type="time" value={rescheduleForm.timeSlot} onChange={(e) => setRescheduleForm((f) => ({ ...f, timeSlot: e.target.value }))} />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Patient and doctor will be notified automatically. The slot must be free.</p>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => { setRescheduleTarget(null); setRescheduleForm({ date: '', timeSlot: '' }); }}>Cancel</Button>
                            <Button onClick={() => void handleRescheduleSubmit()} isLoading={actionLoading === `reschedule:${rescheduleTarget}`} disabled={!rescheduleForm.date || !rescheduleForm.timeSlot}>Reschedule</Button>
                        </div>
                    </Card>
                </div>
            )}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
