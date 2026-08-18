/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useCallback, useDeferredValue, useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Calendar, Clock, User, Stethoscope, Search, RefreshCw, AlertCircle, 
    CheckCircle2, Building2, Video, Filter, ChevronRight, X, Phone, 
    CreditCard, ArrowRight, Sparkles, Ban
} from 'lucide-react';
import { useClinicStore, type ClinicAppointment } from '@/stores/clinicStore';
import { Pagination } from '@/components/ui/Pagination';
import { AppointmentDetailModal } from '@/components/clinic/AppointmentDetailModal';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 12;

function ClinicAppointmentsContent() {
    const searchParams = useSearchParams();
    const {
        appointments,
        appointmentsPagination,
        appointmentMetrics,
        loadingAppointments,
        error,
        fetchAppointments,
        doctors,
        fetchDoctors,
        checkInAppointment,
        updateAppointmentStatus,
        clearError,
    } = useClinicStore();
    const toast = useToast();

    // Parse incoming query parameters
    const paramDateRange = searchParams.get('dateRange') || (searchParams.get('date') === 'today' ? 'today' : null);
    const paramCustomDate = searchParams.get('date') && searchParams.get('date') !== 'today' ? searchParams.get('date')! : '';
    const paramStatus = searchParams.get('status') || 'all';
    const paramDoctor = searchParams.get('doctorId') || 'all';
    const paramType = searchParams.get('type') || 'all';

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState(paramStatus);
    const [dateRangeFilter, setDateRangeFilter] = useState(paramDateRange || 'all');
    const [customDate, setCustomDate] = useState(paramCustomDate);
    const [doctorFilter, setDoctorFilter] = useState(paramDoctor);
    const [typeFilter, setTypeFilter] = useState(paramType);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    // Synchronize if searchParams change dynamically
    useEffect(() => {
        if (paramStatus !== 'all') setStatusFilter(paramStatus);
        if (paramDateRange) setDateRangeFilter(paramDateRange);
        if (paramCustomDate) setCustomDate(paramCustomDate);
        if (paramDoctor !== 'all') setDoctorFilter(paramDoctor);
        if (paramType !== 'all') setTypeFilter(paramType);
    }, [paramStatus, paramDateRange, paramCustomDate, paramDoctor, paramType]);

    const [selectedAppointment, setSelectedAppointment] = useState<ClinicAppointment | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Initial load doctors for the dropdown
    useEffect(() => {
        if (doctors.length === 0) {
            void fetchDoctors({ limit: 100 });
        }
    }, [doctors.length, fetchDoctors]);

    // Fetch appointments from real backend
    const loadAppointments = useCallback(async () => {
        await fetchAppointments({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            date: customDate || undefined,
            dateRange: !customDate && dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
            doctorId: doctorFilter !== 'all' ? doctorFilter : undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
        });
    }, [customDate, dateRangeFilter, deferredSearchQuery, doctorFilter, fetchAppointments, page, statusFilter, typeFilter]);

    useEffect(() => {
        void loadAppointments();
    }, [loadAppointments]);

    const handleClearFilters = () => {
        setStatusFilter('all');
        setDateRangeFilter('all');
        setCustomDate('');
        setDoctorFilter('all');
        setTypeFilter('all');
        setSearchQuery('');
        setPage(1);
    };

    const hasActiveFilters = statusFilter !== 'all' || dateRangeFilter !== 'all' || customDate !== '' || doctorFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '';

    // Fast inline Check In
    const handleQuickCheckIn = async (appointment: ClinicAppointment) => {
        setActionLoadingId(appointment.id);
        try {
            const success = await checkInAppointment(appointment.id);
            if (success) {
                toast.success('Checked In', `Patient ${appointment.patientName} has been checked in.`);
                void loadAppointments();
            } else {
                toast.error('Check In Failed', 'Unable to check in patient.');
            }
        } catch {
            toast.error('Network Error', 'Failed to connect to server.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleOpenDetails = (appointment: ClinicAppointment) => {
        setSelectedAppointment(appointment);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <Calendar className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        Clinic Appointments
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        Real-time front desk schedule, patient arrivals, and check-in management.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={() => {
                            clearError();
                            void loadAppointments();
                        }}
                        disabled={loadingAppointments}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAppointments ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Top Real Operational Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                
                {/* Today's Appointments */}
                <div 
                    onClick={() => {
                        setDateRangeFilter('today');
                        setCustomDate('');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                        dateRangeFilter === 'today' && !customDate
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Today&apos;s Visits</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {appointmentMetrics.todayAppointments}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Scheduled for today</p>
                </div>

                {/* Pending Confirmation */}
                <div 
                    onClick={() => {
                        setStatusFilter('scheduled');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === 'scheduled'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Confirm</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {appointmentMetrics.pendingConfirmation}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Needs front-desk review</p>
                </div>

                {/* Checked In */}
                <div 
                    onClick={() => {
                        setStatusFilter('checked_in');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === 'checked_in'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Checked In</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {appointmentMetrics.checkedIn}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">In waiting room</p>
                </div>

                {/* Completed */}
                <div 
                    onClick={() => {
                        setStatusFilter('completed');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === 'completed'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {appointmentMetrics.completed}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Consultations finished</p>
                </div>

                {/* Cancelled / No Show */}
                <div 
                    onClick={() => {
                        setStatusFilter('cancelled');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm col-span-2 sm:col-span-1 ${
                        statusFilter === 'cancelled'
                            ? 'bg-red-50/80 border-red-300 dark:bg-red-950/40 dark:border-red-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider">Cancelled / No-Show</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {appointmentMetrics.cancelledNoShow}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Cancelled visits</p>
                </div>
            </div>

            {/* Error State Banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => {
                            clearError();
                            void loadAppointments();
                        }}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-900 dark:text-red-100 font-bold rounded-lg text-xs"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Search & Comprehensive Filters Toolbar */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm space-y-3.5">
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by patient name, phone, doctor name, specialization, or reason..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setPage(1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Filter Controls Row */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
                    
                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>

                    {/* Date Quick Filter */}
                    <div>
                        <select
                            value={customDate ? 'custom' : dateRangeFilter}
                            onChange={(e) => {
                                if (e.target.value === 'custom') {
                                    // Keep current custom or do nothing
                                } else {
                                    setCustomDate('');
                                    setDateRangeFilter(e.target.value);
                                }
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="this_week">This Week</option>
                        </select>
                    </div>

                    {/* Custom Date Input */}
                    <div>
                        <input
                            type="date"
                            value={customDate}
                            onChange={(e) => {
                                setCustomDate(e.target.value);
                                setDateRangeFilter('all');
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Doctor Filter */}
                    <div>
                        <select
                            value={doctorFilter}
                            onChange={(e) => {
                                setDoctorFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="all">All Doctors</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.doctorId || doc.id}>
                                    Dr. {doc.name.replace(/^Dr\.\s*/i, '')} ({doc.specialization || 'Doctor'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="all">All Modes</option>
                            <option value="clinic">In-Person OPD</option>
                            <option value="video">Video Consultation</option>
                        </select>
                    </div>
                </div>

                {/* Active Filter summary and Reset button */}
                {hasActiveFilters && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[11px]">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                            Showing filtered results ({appointmentsPagination.total} total)
                        </span>
                        <button
                            onClick={handleClearFilters}
                            className="text-emerald-700 dark:text-emerald-400 font-extrabold hover:underline flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Main Appointment Table / Card Content */}
            {loadingAppointments && appointments.length === 0 ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 rounded-3xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 animate-pulse p-4" />
                    ))}
                </div>
            ) : appointments.length === 0 ? (
                /* Empty State */
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 mx-auto flex items-center justify-center">
                        <Calendar className="w-8 h-8" />
                    </div>

                    <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {hasActiveFilters ? 'No matching appointments found' : 'No appointments scheduled'}
                        </h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {hasActiveFilters
                                ? 'Try adjusting your status, date range, or doctor filters.'
                                : 'When patients book consultations with your clinic or affiliated doctors, appointments will appear here.'}
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <div className="pt-2">
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition-colors"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    
                    {/* Desktop View Table */}
                    <div className="hidden lg:block bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#0f172a]/50">
                                    <th className="py-4 px-6">Date &amp; Time</th>
                                    <th className="py-4 px-4">Patient</th>
                                    <th className="py-4 px-4">Doctor</th>
                                    <th className="py-4 px-4">Mode</th>
                                    <th className="py-4 px-4">Status</th>
                                    <th className="py-4 px-4">Payment</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
                                {appointments.map((appt) => {
                                    const isUpcoming = ['scheduled', 'confirmed'].includes(appt.status);
                                    const isCheckedIn = !!appt.checkedInAt || appt.status === 'checked_in';
                                    const isCompleted = appt.status === 'completed';
                                    const isCancelled = appt.status === 'cancelled';
                                    const isInPerson = (appt.type || 'clinic') === 'clinic';
                                    const isActionLoading = actionLoadingId === appt.id;

                                    return (
                                        <tr 
                                            key={appt.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-[#162238]/60 transition-colors group"
                                        >
                                            {/* Date & Time */}
                                            <td className="py-4 px-6">
                                                <div className="space-y-0.5">
                                                    <p className="font-extrabold text-gray-900 dark:text-white text-xs">
                                                        {appt.date || 'Unscheduled'}
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{appt.time || 'Flexible'}</span>
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Patient */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    {appt.patientProfileImage ? (
                                                        <img
                                                            src={appt.patientProfileImage}
                                                            alt={appt.patientName}
                                                            className="w-9 h-9 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                                                            {appt.patientName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-extrabold text-gray-900 dark:text-white truncate">
                                                            {appt.patientName}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 capitalize">
                                                            {appt.patientGender || 'Patient'}
                                                            {appt.patientAge != null ? ` • ${appt.patientAge}y` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Doctor */}
                                            <td className="py-4 px-4">
                                                <div className="min-w-0 space-y-0.5">
                                                    <p className="font-extrabold text-gray-900 dark:text-white truncate">
                                                        Dr. {appt.doctorName.replace(/^Dr\.\s*/i, '')}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                        {appt.doctorSpecialization || 'Physician'}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Mode */}
                                            <td className="py-4 px-4">
                                                {isInPerson ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                        <Building2 className="w-3 h-3 text-emerald-600" /> Clinic
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                                                        <Video className="w-3 h-3 text-purple-600" /> Video
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize border ${
                                                    isUpcoming ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
                                                    isCheckedIn ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                                                    isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                                    isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                                    'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300'
                                                }`}>
                                                    {isCheckedIn && appt.status !== 'checked_in' ? 'Checked In' : appt.status.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Payment */}
                                            <td className="py-4 px-4">
                                                <span className={`text-[11px] font-extrabold capitalize ${
                                                    appt.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                                                }`}>
                                                    {appt.paymentStatus || 'Pending'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Front-Desk Check In Action */}
                                                    {isInPerson && isUpcoming && !isCheckedIn && (
                                                        <button
                                                            onClick={() => handleQuickCheckIn(appt)}
                                                            disabled={isActionLoading}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>Check In</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleOpenDetails(appt)}
                                                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors shadow-sm"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile & Tablet Card Layout */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {appointments.map((appt) => {
                            const isUpcoming = ['scheduled', 'confirmed'].includes(appt.status);
                            const isCheckedIn = !!appt.checkedInAt || appt.status === 'checked_in';
                            const isCompleted = appt.status === 'completed';
                            const isCancelled = appt.status === 'cancelled';
                            const isInPerson = (appt.type || 'clinic') === 'clinic';
                            const isActionLoading = actionLoadingId === appt.id;

                            return (
                                <div
                                    key={appt.id}
                                    className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        {/* Date / Time & Status Row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <p className="font-extrabold text-gray-900 dark:text-white text-sm">
                                                    {appt.date || 'Unscheduled'}
                                                </p>
                                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{appt.time || 'Flexible Slot'}</span>
                                                </p>
                                            </div>

                                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize border ${
                                                isUpcoming ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
                                                isCheckedIn ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                                                isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                                isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                                'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                                {isCheckedIn && appt.status !== 'checked_in' ? 'Checked In' : appt.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        {/* Patient Info */}
                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                                                {appt.patientName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-gray-900 dark:text-white text-xs truncate">
                                                    {appt.patientName}
                                                </p>
                                                <p className="text-[11px] text-gray-500 capitalize">
                                                    {appt.patientGender || 'Patient'}
                                                    {appt.patientAge != null ? ` • ${appt.patientAge}y` : ''}
                                                    {appt.patientPhone ? ` • ${appt.patientPhone}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Doctor & Mode Summary */}
                                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-1">
                                            <div className="truncate">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    Dr. {appt.doctorName.replace(/^Dr\.\s*/i, '')}
                                                </span>
                                                <span className="text-[11px] text-gray-500 ml-1">
                                                    ({appt.doctorSpecialization})
                                                </span>
                                            </div>

                                            {isInPerson ? (
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md shrink-0">
                                                    Clinic OPD
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md shrink-0">
                                                    Video
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Action Row */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                                        {isInPerson && isUpcoming && !isCheckedIn && (
                                            <button
                                                onClick={() => handleQuickCheckIn(appt)}
                                                disabled={isActionLoading}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Check In</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleOpenDetails(appt)}
                                            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors shadow-sm"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {appointmentsPagination.totalPages > 1 && (
                        <div className="pt-4 flex justify-center">
                            <Pagination
                                currentPage={page}
                                totalPages={appointmentsPagination.totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Appointment Detail & Actions Modal */}
            <AppointmentDetailModal
                appointment={selectedAppointment}
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                onStatusChange={() => void loadAppointments()}
            />
        </div>
    );
}

export default function ClinicAppointmentsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading appointments...</div>}>
            <ClinicAppointmentsContent />
        </Suspense>
    );
}
