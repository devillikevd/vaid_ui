'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, CalendarClock, Clock, User, Video, Search, RefreshCw, Loader2, AlertCircle, Play, XCircle as XCircleIcon, CheckCircle, Bell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { useDoctorStore } from '@/stores/doctorStore';
import { useRouter } from 'next/navigation';
import { useAppointmentUpdates, type AppointmentUpdate } from '@/hooks/useSocket';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function DoctorAppointmentsPage() {
    const router = useRouter();
    const { appointments, isLoading, error, fetchAppointments, startConsultation, completeAppointment, confirmAppointment, cancelAppointment, rescheduleAppointment, clearError } = useDoctorStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const status = params.get('status');
            if (status) {
                setStatusFilter(status);
            }
        }
    }, []);

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [newApptAlert, setNewApptAlert] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reschedulePrompt, setReschedulePrompt] = useState<any>(null);
    const [newScheduleAppt, setNewScheduleAppt] = useState<any>(null);
    const [newScheduleDate, setNewScheduleDate] = useState('');
    const [newScheduleTime, setNewScheduleTime] = useState('');
    const [otpModal, setOtpModal] = useState<{ appointmentId: string } | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedStatus = statusFilter === 'all' ? undefined : statusFilter;
    const isActiveAppointment = useCallback((status?: string) => ['scheduled', 'confirmed', 'pending', 'in_progress'].includes((status || '').toLowerCase()), []);

    // Real-time Socket.IO — auto-refresh when patient books/cancels
    useAppointmentUpdates(
        useCallback((update: AppointmentUpdate) => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => {
                fetchAppointments(selectedStatus, undefined, 1);
            }, 900);
            const msg = update.status === 'scheduled' ? 'New appointment booked by a patient!' :
                update.status === 'cancelled' ? 'An appointment was cancelled' :
                `Appointment status changed to ${update.status}`;
            setNewApptAlert(msg);
            setTimeout(() => setNewApptAlert(null), 5000);
        }, [fetchAppointments, selectedStatus])
    );

    useEffect(() => () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    }, []);

    useEffect(() => {
        fetchAppointments(selectedStatus, undefined, 1);
    }, [fetchAppointments, selectedStatus]);

    // Auto-refresh polling fallback so the list stays fresh even if a socket
    // event is missed (tab visible → refetch every 30s).
    useAutoRefresh(() => fetchAppointments(selectedStatus, undefined, 1));

    const filtered = (appointments || []).filter(apt => {
        const matchesSearch = (apt.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all'
            || (statusFilter === 'active' ? isActiveAppointment(apt.status) : 
               (statusFilter === 'pending' ? apt.status === 'scheduled' : apt.status === statusFilter));
        return matchesSearch && matchesStatus;
    });

    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filtered, 10);
    const paginatedItems = paginate(page);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);

    const handleStartConsultation = async (appointmentId: string) => {
        setActionLoading(appointmentId);
        const result = await startConsultation(appointmentId);
        if (result && typeof result === 'string') {
            router.push(`/consultation/${result}`);
        }
        setActionLoading(null);
    };

    const handleComplete = (appointmentId: string) => {
        setOtpInput('');
        setOtpError('');
        setOtpModal({ appointmentId });
    };

    const submitOtp = async () => {
        if (otpInput.length !== 6) {
            setOtpError('Please enter the 6-digit OTP from the patient.');
            return;
        }
        if (!otpModal) return;
        setActionLoading(otpModal.appointmentId);
        const success = await completeAppointment(otpModal.appointmentId, otpInput);
        setActionLoading(null);
        if (success) {
            setOtpModal(null);
        } else {
            setOtpError('Invalid OTP. Please check with the patient.');
        }
    };

    const handleConfirm = async (appointmentId: string) => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (apt) {
            const aptDateStr = apt.date || apt.appointment_date;
            const aptTimeStr = apt.time || apt.timeSlot || apt.time_slot;
            if (aptDateStr && aptTimeStr) {
                try {
                    const aptDate = new Date(aptDateStr);
                    const now = new Date();
                    const [hours, minutes] = aptTimeStr.split(':').map(Number);
                    if (!isNaN(hours) && !isNaN(minutes)) {
                        const aptDateTime = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate(), hours, minutes);
                        if (aptDateTime < now) {
                            setReschedulePrompt(apt);
                            return;
                        }
                    } else if (aptDateStr < now.toISOString().split('T')[0]) {
                        setReschedulePrompt(apt);
                        return;
                    }
                } catch(e) {}
            }
        }
        
        setActionLoading(appointmentId);
        await confirmAppointment(appointmentId);
        setActionLoading(null);
    };

    const confirmReschedule = async () => {
        if (!reschedulePrompt) return;
        setActionLoading(reschedulePrompt.id);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const newDate = now.toISOString().split('T')[0];
        const newTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        await rescheduleAppointment(reschedulePrompt.id, newDate, newTime);
        setActionLoading(null);
        setReschedulePrompt(null);
    };

    const openNewSchedule = (apt: any) => {
        setNewScheduleAppt(apt);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const fallbackDate = now.toISOString().split('T')[0];
        const fallbackTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setNewScheduleDate(apt.date || apt.appointment_date || fallbackDate);
        setNewScheduleTime((apt.time || apt.timeSlot || fallbackTime).substring(0, 5));
    };

    const submitNewSchedule = async () => {
        if (!newScheduleAppt) return;
        if (!newScheduleDate || !newScheduleTime) {
            alert('Please choose a date and time for the new schedule.');
            return;
        }
        setActionLoading(newScheduleAppt.id);
        await rescheduleAppointment(newScheduleAppt.id, newScheduleDate, newScheduleTime);
        setActionLoading(null);
        setNewScheduleAppt(null);
        setNewScheduleDate('');
        setNewScheduleTime('');
    };

    const handleCancel = async (appointmentId: string) => {
        setCancelAppointmentId(appointmentId);
        setCancelReason('');
    };

    const confirmCancel = async () => {
        if (!cancelAppointmentId) return;
        const appointmentId = cancelAppointmentId;
        setActionLoading(appointmentId);
        await cancelAppointment(appointmentId, cancelReason.trim() || undefined);
        setActionLoading(null);
        setCancelAppointmentId(null);
        setCancelReason('');
    };

    if (isLoading && appointments.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading appointments...</span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); fetchAppointments(selectedStatus, undefined, 1); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Real-time Alert */}
            {newApptAlert && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
                    <Bell className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium">🔔 {newApptAlert}</span>
                    <button onClick={() => setNewApptAlert(null)} className="ml-auto text-emerald-800 underline text-sm">Dismiss</button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Manage your patient appointments</p></div>
                <Button onClick={() => fetchAppointments(selectedStatus, undefined, 1)} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <Card padding="sm">
                <div className="flex items-center gap-4">
                    <div className="flex-1"><Input placeholder="Search patients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="h-5 w-5" />} /></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="scheduled">Scheduled Only</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </Card>

            <Card padding="none">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No appointments found</div>
                    ) : paginatedItems.map((apt) => {
                        const isActive = isActiveAppointment(apt.status);
                        const isActing = actionLoading === apt.id;
                        const consultationId = apt.consultation_id || apt.consultation_room_id;
                        return (
                            <div key={apt.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700"><User className="h-5 w-5" /></div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{apt.patientName || 'Patient'}</p>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{apt.date ? new Date(apt.date).toLocaleDateString('en-IN') : '—'}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time || apt.timeSlot || '—'}</span>
                                                {(apt.type === 'video' || apt.type === 'Video') && <span className="flex items-center gap-1"><Video className="h-3 w-3" />Video</span>}
                                            </div>
                                            {(apt.reason || (apt.symptoms && apt.symptoms.length > 0) || apt.patient_notes) && (
                                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                                                    {apt.reason && <p><span className="font-semibold text-gray-700 dark:text-gray-200">Reason:</span> {apt.reason}</p>}
                                                    {apt.symptoms && apt.symptoms.length > 0 && <p><span className="font-semibold text-gray-700 dark:text-gray-200">Symptoms:</span> {apt.symptoms.join(', ')}</p>}
                                                    {apt.patient_notes && <p><span className="font-semibold text-gray-700 dark:text-gray-200">History:</span> {apt.patient_notes}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={apt.status || 'scheduled'} size="sm" />
                                        {isActive && (
                                            <div className="flex gap-1">
                                                {apt.status === 'scheduled' && (
                                                    <Button size="sm" variant="primary" onClick={() => handleConfirm(apt.id)} disabled={isActing} leftIcon={isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}>
                                                        Approve
                                                    </Button>
                                                )}
                                                {(apt.type === 'video' || apt.type === 'Video') && apt.status !== 'scheduled' && (
                                                    <Button size="sm" variant="primary" onClick={() => handleStartConsultation(apt.id)} disabled={isActing} leftIcon={isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}>
                                                        {apt.status === 'in_progress' || consultationId ? 'Rejoin' : 'Start'}
                                                    </Button>
                                                )}
                                                {apt.status !== 'scheduled' && apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleComplete(apt.id)} disabled={isActing || apt.status !== 'in_progress'} leftIcon={<CheckCircle className="h-3 w-3" />}>
                                                        Complete
                                                    </Button>
                                                )}
                                                {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                                                    <Button size="sm" variant="outline" onClick={() => openNewSchedule(apt)} disabled={isActing} leftIcon={<CalendarClock className="h-3 w-3 text-emerald-600" />}>
                                                        New Schedule
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => handleCancel(apt.id)} disabled={isActing}>
                                                    <XCircleIcon className="h-3 w-3 text-red-500" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                />
            </Card>
        </div>
        {/* OTP Verification Modal */}
        {otpModal && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(e) => { if (e.target === e.currentTarget && !actionLoading) { setOtpModal(null); } }}
            >
                <Card className="w-full max-w-sm">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enter Completion OTP</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Ask the patient for the 6-digit OTP shown on their screen and enter it below to complete the consultation.
                            </p>
                        </div>
                        <div className="flex justify-center gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-10 h-12 flex items-center justify-center rounded-lg border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-xl font-bold text-emerald-700 dark:text-emerald-300"
                                >
                                    {otpInput[i] || ''}
                                </div>
                            ))}
                        </div>
                        <input
                            type="number"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={otpInput}
                            onChange={(e) => { setOtpError(''); setOtpInput(e.target.value.slice(0, 6)); }}
                            className="w-full text-center text-2xl font-bold tracking-widest border rounded-lg p-3 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            autoFocus
                        />
                        {otpError && <p className="text-sm text-red-500 text-center">{otpError}</p>}
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setOtpModal(null)}
                                disabled={!!actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                onClick={submitOtp}
                                disabled={!!actionLoading || otpInput.length !== 6}
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Complete
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        {cancelAppointmentId && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && actionLoading !== cancelAppointmentId) {
                        setCancelAppointmentId(null);
                        setCancelReason('');
                    }
                }}
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cancel Appointment</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Add an optional reason so the patient has more context in their appointment updates.
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cancellation Reason</label>
                            <textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                rows={4}
                                placeholder="Optional reason for cancellation"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => {
                                setCancelAppointmentId(null);
                                setCancelReason('');
                            }} disabled={actionLoading === cancelAppointmentId}>
                                Keep Appointment
                            </Button>
                            <Button variant="danger" onClick={confirmCancel} disabled={actionLoading === cancelAppointmentId}>
                                {actionLoading === cancelAppointmentId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Appointment'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        
        {reschedulePrompt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && actionLoading !== reschedulePrompt.id) {
                        setReschedulePrompt(null);
                    }
                }}
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reschedule Past Appointment</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                This appointment&apos;s requested time has already passed. Would you like to reschedule it to 15 minutes from now and approve?
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setReschedulePrompt(null)} disabled={actionLoading === reschedulePrompt.id}>
                                Cancel
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={async () => {
                                    setActionLoading(reschedulePrompt.id);
                                    await confirmAppointment(reschedulePrompt.id);
                                    setActionLoading(null);
                                    setReschedulePrompt(null);
                                }} 
                                disabled={actionLoading === reschedulePrompt.id}
                            >
                                Approve with Past Time
                            </Button>
                            <Button variant="primary" onClick={confirmReschedule} disabled={actionLoading === reschedulePrompt.id}>
                                {actionLoading === reschedulePrompt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reschedule & Approve'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        
        {newScheduleAppt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && actionLoading !== newScheduleAppt.id) {
                        setNewScheduleAppt(null);
                    }
                }}
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Give New Schedule</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {newScheduleAppt.patientName} could not join at {newScheduleAppt.time || newScheduleAppt.timeSlot || 'the scheduled time'}. Choose a new date and time below — the patient will be notified instantly.
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New Date</label>
                            <Input
                                type="date"
                                value={newScheduleDate}
                                onChange={(e) => setNewScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New Time</label>
                            <Input
                                type="time"
                                value={newScheduleTime}
                                onChange={(e) => setNewScheduleTime(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setNewScheduleAppt(null)} disabled={actionLoading === newScheduleAppt.id}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={submitNewSchedule} disabled={actionLoading === newScheduleAppt.id}>
                                {actionLoading === newScheduleAppt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save New Schedule'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        </>
    );
}
