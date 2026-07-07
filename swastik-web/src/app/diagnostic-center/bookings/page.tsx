'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, Search, Loader2, Upload, Eye, Clock, CheckCircle2, XCircle, Bell, RefreshCw, FlaskConical, Send, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { useDiagnosticCenterStore, type DiagnosticBooking } from '@/stores/diagnosticCenterStore';
import { useDiagnosticUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AssignAgentModal } from '@/components/shared/AssignAgentModal';
import { AgentTrackingMap } from '@/components/shared/AgentTrackingMap';

const STATUS_FILTERS = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'Sample Collected', value: 'sample_collected' },
    { label: 'Processing', value: 'processing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
];

type BookingAction = {
    label: string;
    value: string;
    icon: typeof CheckCircle2;
    variant?: 'primary' | 'outline';
};

function getNextStatusActions(booking: DiagnosticBooking): BookingAction[] {
    switch (booking.status) {
        case 'pending':
            return [
                { label: 'Confirm', value: 'confirmed', icon: CheckCircle2 },
                { label: 'Cancel', value: 'cancelled', icon: XCircle, variant: 'outline' },
            ];
        case 'confirmed':
            return [
                ...(booking.collection_type === 'home_collection'
                    ? [{ label: 'Dispatch Team', value: 'dispatched', icon: Send } as BookingAction, { label: 'Collect Sample', value: 'sample_collected', icon: FlaskConical } as BookingAction]
                    : [{ label: 'Mark Arrived', value: 'arrived', icon: CheckCircle2 } as BookingAction]),
                { label: 'Cancel', value: 'cancelled', icon: XCircle, variant: 'outline' },
            ];
        case 'arrived':
            return [
                { label: 'Collect Sample', value: 'sample_collected', icon: FlaskConical },
                { label: 'Cancel', value: 'cancelled', icon: XCircle, variant: 'outline' },
            ];
        case 'dispatched':
            return [
                { label: 'Collect Sample', value: 'sample_collected', icon: FlaskConical },
                { label: 'Cancel', value: 'cancelled', icon: XCircle, variant: 'outline' },
            ];
        case 'sample_collected':
            return [
                { label: 'Start Processing', value: 'processing', icon: Clock },
            ];
        case 'processing':
            return [
                { label: 'Mark Completed', value: 'completed', icon: CheckCircle2 },
            ];
        default:
            return [];
    }
}

export default function BookingsPage() {
    const {
        bookings,
        bookingsPagination,
        bookingsSummary,
        loadingBookings,
        error,
        fetchBookings,
        updateBookingStatus,
        uploadResult,
        clearError,
    } = useDiagnosticCenterStore();
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
    const [resultForm, setResultForm] = useState<{ file: File | null; result_notes: string }>({ file: null, result_notes: '' });
    const [newBookingAlert, setNewBookingAlert] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Real-time Socket.IO — new bookings trigger refresh
    useDiagnosticUpdates(
        useCallback(() => {
            setNewBookingAlert(true);
            fetchBookings({ status: statusFilter || undefined, search: debouncedSearch || undefined, page, limit: pageSize });
            setTimeout(() => setNewBookingAlert(false), 5000);
        }, [debouncedSearch, fetchBookings, page, statusFilter]),
        useCallback(() => { fetchBookings({ status: statusFilter || undefined, search: debouncedSearch || undefined, page, limit: pageSize }); }, [debouncedSearch, fetchBookings, page, statusFilter]),
        useCallback(() => { fetchBookings({ status: statusFilter || undefined, search: debouncedSearch || undefined, page, limit: pageSize }); }, [debouncedSearch, fetchBookings, page, statusFilter])
    );

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);

    useEffect(() => { setPage(1); }, [search, statusFilter]);

    useEffect(() => {
        fetchBookings({ status: statusFilter || undefined, search: debouncedSearch || undefined, page, limit: pageSize });
    }, [debouncedSearch, fetchBookings, page, statusFilter]);

    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    const handleStatusChange = async (bookingId: string, newStatus: string) => {
        if (newStatus === 'dispatched') {
            setAssigningBookingId(bookingId);
            return;
        }
        if (newStatus === 'cancelled') {
            const confirmed = await confirmAction({ title: 'Cancel Booking', message: 'Cancel this booking?', confirmLabel: 'Cancel Booking', variant: 'danger' });
            if (!confirmed) return;
        }
        await updateBookingStatus(bookingId, newStatus);
    };

    const handleUploadResult = async (bookingId: string) => {
        if (!resultForm.file) return;
        clearError();
        const formData = new FormData();
        formData.append('file', resultForm.file);
        if (resultForm.result_notes) formData.append('result_notes', resultForm.result_notes);
        
        const success = await uploadResult(bookingId, formData);
        if (success) {
            setUploadingId(null);
            setResultForm({ file: null, result_notes: '' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bookings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage test bookings and upload results</p>
                </div>
                <Button
                    onClick={() => fetchBookings({ status: statusFilter || undefined, search: debouncedSearch || undefined, page, limit: pageSize })}
                    variant="outline"
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                    Refresh
                </Button>
            </div>

            {/* New Booking Alert */}
            {newBookingAlert && (
                <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
                    <Bell className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">🔔 New test booking received!</span>
                    <button onClick={() => { setNewBookingAlert(false); setStatusFilter('pending'); }} className="ml-auto text-purple-800 underline text-sm">View New</button>
                </div>
            )}

            {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><CalendarCheck className="h-5 w-5 text-purple-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.status.pending || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400">Pending</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-blue-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.status.confirmed || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400">Confirmed</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-cyan-100 rounded-lg"><Send className="h-5 w-5 text-cyan-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.status.dispatched || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400">Dispatched</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><FlaskConical className="h-5 w-5 text-yellow-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.status.sample_collected || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400">Samples</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Loader2 className="h-5 w-5 text-orange-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.status.processing || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400">Processing</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div><div><p className="text-xl font-bold">{bookingsSummary.status.completed || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400">Completed</p></div></div></Card>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700">{error}</div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text" placeholder="Search by patient, test, or ID..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === f.value
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-600'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Booking List */}
            {loadingBookings ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
            ) : bookings.length > 0 ? (
                <>
                <div className="space-y-4">
                    {bookings.map((booking: DiagnosticBooking) => (
                        <Card key={booking.id}>
                            <div className="space-y-4">
                                {/* Booking Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{booking.patient_name || booking.patient?.name || 'Patient'}</h3>
                                            <StatusBadge status={booking.status} size="sm" />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            {booking.patient?.user?.phone ? `📞 ${booking.patient.user.phone} • ` : ''}
                                            {booking.test_name || 'Test'} • {new Date(booking.booking_date).toLocaleDateString('en-IN')}
                                            {booking.booking_time && ` at ${booking.booking_time}`}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {booking.collection_type === 'home_collection' ? '🏠 Home Collection' : '🏥 Walk-in'}
                                            {booking.collection_address && ` — ${booking.collection_address}`}
                                        </p>
                                        {booking.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">&quot;{booking.notes}&quot;</p>}
                                        {booking.prescription && booking.prescription.file_url && (
                                            <a href={booking.prescription.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50">
                                                <FileText className="h-3 w-3" /> View Prescription
                                            </a>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {booking.amount && <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{booking.amount}</p>}
                                        <p className="text-xs text-gray-400">ID: {booking.id.slice(0, 8)}</p>
                                    </div>
                                </div>

                                {/* Result Status */}
                                {booking.status !== 'cancelled' && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Result:</span>
                                        <StatusBadge status={booking.result_status} size="sm" />
                                        {booking.result_url && (
                                            <a href={booking.result_url} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-purple-600 hover:underline text-sm ml-2">
                                                <Eye className="h-3 w-3" /> View Report
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Live Tracking */}
                                {booking.tracking_token && ['dispatched', 'out_for_delivery'].includes(booking.status) && (
                                    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                                        <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Live Agent Tracking</h4>
                                        <AgentTrackingMap 
                                            trackingToken={booking.tracking_token} 
                                            height="200px"
                                            facilityLocation={booking.facility?.latitude && booking.facility?.longitude ? {
                                                lat: booking.facility.latitude,
                                                lng: booking.facility.longitude,
                                                name: booking.facility.name || 'Diagnostic Center'
                                            } : null}
                                        />
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    {getNextStatusActions(booking).map(action => {
                                        const Icon = action.icon;
                                        return (
                                            <Button
                                                key={action.value}
                                                size="sm"
                                                variant={action.variant || 'primary'}
                                                onClick={() => handleStatusChange(booking.id, action.value)}
                                                leftIcon={<Icon className="h-3 w-3" />}
                                            >
                                                {action.label}
                                            </Button>
                                        );
                                    })}

                                    {/* Upload result button */}
                                    {(booking.status === 'processing' || booking.status === 'completed') && !booking.result_url && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setUploadingId(booking.id); setResultForm({ file: null, result_notes: '' }); }}
                                            leftIcon={<Upload className="h-3 w-3" />}
                                        >
                                            Upload Result
                                        </Button>
                                    )}
                                </div>

                                {/* Upload Result Form */}
                                {uploadingId === booking.id && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Upload Test Result</h4>
                                        <div className="flex flex-col space-y-1.5">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Result Document (PDF/Image) *</label>
                                            <input
                                                type="file"
                                                accept="application/pdf,image/*"
                                                onChange={e => setResultForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-200"
                                            />
                                        </div>
                                        <Input
                                            label="Notes (optional)"
                                            value={resultForm.result_notes}
                                            onChange={e => setResultForm(f => ({ ...f, result_notes: e.target.value }))}
                                            placeholder="Additional notes about the result"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleUploadResult(booking.id)} disabled={!resultForm.file}>
                                                Submit Result
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setUploadingId(null)}>Cancel</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
                <Pagination
                    currentPage={page}
                    totalPages={bookingsPagination.totalPages}
                    onPageChange={setPage}
                    totalItems={bookingsPagination.total}
                    itemsPerPage={bookingsPagination.limit}
                    className="mt-4"
                />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                    <CalendarCheck className="h-12 w-12 text-gray-300 mb-3" />
                    <p>No bookings found{statusFilter && ` with status "${statusFilter}"`}</p>
                </div>
            )}
            <ConfirmDialog {...dialogProps} />
            <AssignAgentModal
                isOpen={!!assigningBookingId}
                onClose={() => setAssigningBookingId(null)}
                orderId={assigningBookingId!}
                orderType="diagnostic"
                facilityId={bookings.find((booking) => booking.id === assigningBookingId)?.center_id || bookings.find((booking) => booking.id === assigningBookingId)?.facility?.id || null}
                facilityType="diagnostic_center"
                onAssigned={() => {
                    fetchBookings({ status: statusFilter || undefined, search: debouncedSearch || undefined, page, limit: pageSize });
                }}
            />
        </div>
    );
}
