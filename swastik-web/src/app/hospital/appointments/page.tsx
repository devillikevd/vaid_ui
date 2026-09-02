'use client';

import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Clock,
    Loader2,
    RefreshCw,
    Search,
    Download,
    AlertCircle,
    Phone,
    Stethoscope,
    Building2,
    Filter,
    ChevronRight,
    ArrowRight,
    Users,
    Activity,
    CheckCircle2,
    XCircle,
    UserCheck,
    CalendarClock,
    Plus,
    X,
    Video,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import { useHospitalStore, HospitalAppointment } from '@/stores/hospitalStore';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { downloadCSV } from '@/utils/export';
import { hospitalApi } from '@/lib/api';
import { AppointmentDetailsDrawer } from '@/components/hospital/appointments/AppointmentDetailsDrawer';
import { RescheduleAppointmentModal } from '@/components/hospital/appointments/RescheduleAppointmentModal';
import { CancelAppointmentModal } from '@/components/hospital/appointments/CancelAppointmentModal';
import { NewAppointmentModal } from '@/components/hospital/appointments/NewAppointmentModal';

const PAGE_SIZE = 15;

export default function HospitalAppointmentsPage() {
    const {
        appointments,
        loadingAppointments,
        appointmentsPagination,
        appointmentKpis,
        loadingAppointmentKpis,
        error,
        fetchAppointments,
        fetchAppointmentKpis,
        updateAppointmentStatus,
        rescheduleAppointment,
        checkInAppointment,
        clearError,
    } = useHospitalStore();

    // Staff context
    const [staffRole, setStaffRole] = useState<string>('hospital_owner');

    // Filters state
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [modeFilter, setModeFilter] = useState('');

    // Auxiliary options
    const [doctorsList, setDoctorsList] = useState<any[]>([]);
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);

    // Modals and Drawer state
    const [selectedAppointment, setSelectedAppointment] = useState<HospitalAppointment | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [rescheduleTarget, setRescheduleTarget] = useState<HospitalAppointment | null>(null);
    const [cancelTarget, setCancelTarget] = useState<HospitalAppointment | null>(null);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim());

    // Load initial staff role, doctors, and departments
    useEffect(() => {
        const fetchAuxData = async () => {
            try {
                const [roleRes, docsRes, deptsRes] = await Promise.allSettled([
                    hospitalApi.getMyStaffRole(),
                    hospitalApi.getDoctors(1, '', 100),
                    hospitalApi.getDepartments(),
                ]);

                if (roleRes.status === 'fulfilled' && roleRes.value.success && roleRes.value.staffRole) {
                    setStaffRole(String(roleRes.value.staffRole));
                }

                if (docsRes.status === 'fulfilled' && docsRes.value.success) {
                    const d = (docsRes.value.data as any)?.doctors || (docsRes.value.data as any)?.data || docsRes.value.data || [];
                    setDoctorsList(Array.isArray(d) ? d : []);
                }

                if (deptsRes.status === 'fulfilled' && deptsRes.value.success) {
                    const d = (deptsRes.value.data as any)?.departments || (deptsRes.value.data as any)?.data || deptsRes.value.data || [];
                    setDepartmentsList(Array.isArray(d) ? d : []);
                }
            } catch (e) {
                console.error('Failed to load auxiliary data', e);
            }
        };

        fetchAuxData();
        fetchAppointmentKpis();
    }, [fetchAppointmentKpis]);

    // Format query params based on tab and filters
    const loadAppointments = useCallback(() => {
        const todayStr = new Date().toISOString().split('T')[0];

        let effectiveStatus = statusFilter || undefined;
        let effectiveDate = dateFilter || undefined;
        let effectiveFromDate: string | undefined = undefined;

        if (activeTab === 'today') {
            effectiveDate = todayStr;
        } else if (activeTab === 'upcoming') {
            effectiveFromDate = todayStr;
            if (!effectiveStatus) effectiveStatus = undefined;
        } else if (activeTab === 'waiting') {
            effectiveStatus = 'waiting';
        } else if (activeTab === 'in_consultation') {
            effectiveStatus = 'in_consultation';
        } else if (activeTab === 'completed') {
            effectiveStatus = 'completed';
        } else if (activeTab === 'cancelled') {
            effectiveStatus = 'cancelled';
        }

        return fetchAppointments({
            page,
            limit: PAGE_SIZE,
            search: deferredSearch,
            status: effectiveStatus,
            date: effectiveDate,
            fromDate: effectiveFromDate,
            doctorId: doctorFilter || undefined,
            department: departmentFilter || undefined,
        });
    }, [activeTab, dateFilter, deferredSearch, departmentFilter, doctorFilter, fetchAppointments, page, statusFilter]);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    // Reset pagination to 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, dateFilter, doctorFilter, departmentFilter, modeFilter, activeTab]);

    // Real-time socket updates
    useAppointmentUpdates(() => {
        loadAppointments();
        fetchAppointmentKpis();
    });

    // Refresh handler
    const handleRefresh = async () => {
        await Promise.all([loadAppointments(), fetchAppointmentKpis()]);
    };

    // Filter appointments client-side for mode if specified (e.g. video vs hospital)
    const displayedAppointments = React.useMemo(() => {
        if (!modeFilter) return appointments;
        return appointments.filter(a => (a.type || 'hospital') === modeFilter);
    }, [appointments, modeFilter]);

    // Active filters count for Clear Filters button
    const hasActiveFilters = Boolean(
        searchQuery || statusFilter || dateFilter || doctorFilter || departmentFilter || modeFilter || activeTab !== 'all'
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setDateFilter('');
        setDoctorFilter('');
        setDepartmentFilter('');
        setModeFilter('');
        setActiveTab('all');
        setPage(1);
    };

    // Date formatting helper
    const formatDate = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return d;
        }
    };

    const formatTime = (t?: string | null) => {
        if (!t) return '—';
        if (t.includes(':')) {
            const parts = t.split(':');
            const hour = parseInt(parts[0], 10);
            const minute = parts[1]?.slice(0, 2) || '00';
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour.toString().padStart(2, '0')}:${minute} ${ampm}`;
        }
        return t;
    };

    // Open detail drawer
    const handleRowClick = (apt: HospitalAppointment) => {
        setSelectedAppointment(apt);
        setIsDrawerOpen(true);
    };

    const handleDrawerStatusUpdate = async (id: string, status: string, reason?: string) => {
        const success = await updateAppointmentStatus(id, status, reason);
        if (success) {
            await loadAppointments();
            if (selectedAppointment && selectedAppointment.id === id) {
                setSelectedAppointment({ ...selectedAppointment, status });
            }
        }
        return success;
    };

    const handleDrawerCheckIn = async (id: string) => {
        const success = await checkInAppointment(id);
        if (success) {
            await loadAppointments();
            if (selectedAppointment && selectedAppointment.id === id) {
                setSelectedAppointment({ ...selectedAppointment, status: 'waiting', checkedInAt: new Date().toISOString() });
            }
        }
        return success;
    };

    const handleRescheduleSubmit = async (id: string, date: string, timeSlot: string) => {
        const success = await rescheduleAppointment(id, date, timeSlot);
        if (success) {
            await loadAppointments();
            if (selectedAppointment && selectedAppointment.id === id) {
                setSelectedAppointment({ ...selectedAppointment, date, time: timeSlot });
            }
        }
        return success;
    };

    const handleCancelSubmit = async (id: string, status: string, reason?: string) => {
        const success = await updateAppointmentStatus(id, status, reason);
        if (success) {
            await loadAppointments();
            if (selectedAppointment && selectedAppointment.id === id) {
                setSelectedAppointment({ ...selectedAppointment, status: 'cancelled' });
            }
        }
        return success;
    };

    // Export handler
    const handleExport = () => {
        const exportData = displayedAppointments.map(a => ({
            'Appointment ID': `APT-${a.id.slice(0, 8).toUpperCase()}`,
            'Patient Name': a.patientName,
            'UHID': a.patientUhid || `UHID-${a.id.slice(0, 8).toUpperCase()}`,
            'Phone': a.patientPhone || '',
            'Doctor': a.doctorName,
            'Department': a.doctorDepartment || 'General',
            'Date': a.date || '',
            'Time': a.time || '',
            'Type / Mode': a.type === 'video' ? 'Video' : 'In-Person (OPD)',
            'Status': a.status,
            'Fee (INR)': a.fee ?? '',
            'Reason': a.reason || '',
        }));
        downloadCSV(exportData, [
            { key: 'Appointment ID', label: 'Appointment ID' },
            { key: 'Patient Name', label: 'Patient Name' },
            { key: 'UHID', label: 'UHID' },
            { key: 'Phone', label: 'Phone' },
            { key: 'Doctor', label: 'Doctor' },
            { key: 'Department', label: 'Department' },
            { key: 'Date', label: 'Date' },
            { key: 'Time', label: 'Time' },
            { key: 'Type / Mode', label: 'Mode' },
            { key: 'Status', label: 'Status' },
            { key: 'Fee (INR)', label: 'Fee' },
            { key: 'Reason', label: 'Reason' },
        ], 'hospital-appointments.csv');
    };

    const canCreateAppointment = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'receptionist'].includes(staffRole);

    return (
        <div className="space-y-4">
            
            {/* 1. Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-gray-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Appointments
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage OPD appointments, consultations, patient flow and appointment status.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={displayedAppointments.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loadingAppointments}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        title="Refresh Appointments"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAppointments ? 'animate-spin text-teal-600' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    {canCreateAppointment && (
                        <button
                            type="button"
                            onClick={() => setIsNewModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ New Appointment</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Compact KPI Summary Row & OPD Patient Flow */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                
                {/* KPI: Today's Total */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('today'); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'today' && !statusFilter
                            ? 'bg-teal-50/80 dark:bg-teal-950/30 border-teal-500/80 ring-1 ring-teal-500/40'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300 dark:hover:border-teal-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Today&apos;s Total
                        </span>
                        <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            {appointmentKpis?.todayTotal ?? (loadingAppointmentKpis ? '—' : 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">scheduled</span>
                    </div>
                </button>

                {/* KPI: Waiting / Checked In */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('waiting'); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'waiting'
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Waiting (OPD)
                        </span>
                        <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-black tracking-tight text-amber-700 dark:text-amber-300">
                            {appointmentKpis?.waiting ?? (loadingAppointmentKpis ? '—' : 0)}
                        </span>
                        <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-medium">checked-in</span>
                    </div>
                </button>

                {/* KPI: In Consultation */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('in_consultation'); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'in_consultation'
                            ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/40'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                            In Consultation
                        </span>
                        <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-black tracking-tight text-purple-700 dark:text-purple-300">
                            {appointmentKpis?.inConsultation ?? (loadingAppointmentKpis ? '—' : 0)}
                        </span>
                        <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 font-medium">with doctor</span>
                    </div>
                </button>

                {/* KPI: Completed */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('completed'); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'completed'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Completed
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                            {appointmentKpis?.completed ?? (loadingAppointmentKpis ? '—' : 0)}
                        </span>
                        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">today</span>
                    </div>
                </button>

                {/* KPI: Cancelled / No Show */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('cancelled'); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 cursor-pointer ${
                        activeTab === 'cancelled'
                            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500/80 ring-1 ring-rose-500/40'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                            Cancelled / No-Show
                        </span>
                        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-black tracking-tight text-rose-700 dark:text-rose-300">
                            {(appointmentKpis?.cancelled ?? 0) + (appointmentKpis?.noShow ?? 0)}
                        </span>
                        <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 font-medium">today</span>
                    </div>
                </button>

            </div>

            {/* 3. OPD Flow Progress Bar (Compact & Connected) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-slate-200 dark:border-gray-800">
                    <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        OPD Flow
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-[420px] text-xs">
                    {/* Step 1: Booked */}
                    <div className="flex items-center gap-1.5 flex-1 p-1.5 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/60 dark:border-gray-700">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-700 text-[10px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                            1
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block leading-tight">Booked</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {appointmentKpis?.flow?.booked ?? 0}
                            </span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />

                    {/* Step 2: Waiting */}
                    <div className="flex items-center gap-1.5 flex-1 p-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                        <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center">
                            2
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block leading-tight">Waiting</span>
                            <span className="font-bold text-amber-800 dark:text-amber-200">
                                {appointmentKpis?.flow?.waiting ?? 0}
                            </span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />

                    {/* Step 3: In Consultation */}
                    <div className="flex items-center gap-1.5 flex-1 p-1.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
                        <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center">
                            3
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 block leading-tight">Consulting</span>
                            <span className="font-bold text-purple-800 dark:text-purple-200">
                                {appointmentKpis?.flow?.consulting ?? 0}
                            </span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />

                    {/* Step 4: Completed */}
                    <div className="flex items-center gap-1.5 flex-1 p-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                            ✓
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block leading-tight">Completed</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-200">
                                {appointmentKpis?.flow?.completed ?? 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Segmented View Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'all', label: 'All Appointments' },
                    { id: 'today', label: 'Today' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'waiting', label: 'Waiting' },
                    { id: 'in_consultation', label: 'In Consultation' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab.id);
                                setStatusFilter('');
                            }}
                            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 5. Professional Filter & Search Toolbar */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 p-3 shadow-2xs space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    
                    {/* Search Input */}
                    <div className="lg:col-span-2 relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search patient, UHID, doctor, phone, ID..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Date Picker */}
                    <div>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => {
                                setDateFilter(e.target.value);
                                if (activeTab === 'today') setActiveTab('all');
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                        />
                    </div>

                    {/* Department Dropdown */}
                    <div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                        >
                            <option value="">All Departments</option>
                            {departmentsList.map((d: any) => (
                                <option key={d.id || d.name} value={d.name}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Doctor Dropdown */}
                    <div>
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                        >
                            <option value="">All Doctors</option>
                            {doctorsList.map((doc: any) => (
                                <option key={doc.id} value={doc.id}>
                                    Dr. {doc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Dropdown */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                if (activeTab !== 'all') setActiveTab('all');
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                        >
                            <option value="">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="waiting">Waiting (Checked-In)</option>
                            <option value="in_consultation">In Consultation</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>

                </div>

                {/* Second row: Mode filter + Clear Filters */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-gray-800/60 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Mode:</span>
                        {[
                            { id: '', label: 'All Modes' },
                            { id: 'hospital', label: 'In-Person (OPD)' },
                            { id: 'video', label: 'Video Call' },
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setModeFilter(m.id)}
                                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                    modeFilter === m.id
                                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Clear Filters</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 6. Primary Focus: Enterprise HIS Table / List */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                
                {/* Table Loading State */}
                {loadingAppointments ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                        <span className="text-xs text-slate-500 font-medium">Loading hospital appointments...</span>
                    </div>
                ) : error && appointments.length === 0 ? (
                    /* Error State */
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Unable to load appointments
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                            {error.includes('permission') || error.includes('denied')
                                ? 'You do not have authorization to view appointments for this hospital.'
                                : 'A server or network error occurred while fetching appointments. Please try again.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => { clearError(); loadAppointments(); }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                        </button>
                    </div>
                ) : displayedAppointments.length === 0 ? (
                    /* Empty States */
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {hasActiveFilters ? 'No appointments found' : 'No appointments scheduled'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {hasActiveFilters
                                ? 'No appointment records match your active search or filter criteria. Try adjusting or clearing your filters.'
                                : activeTab === 'today'
                                ? 'There are no OPD appointments scheduled for today.'
                                : 'No appointment records are registered in the hospital database yet.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    /* Table View (Desktop & Tablet) */
                    <div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/75 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="py-3 px-4">Patient & UHID</th>
                                        <th className="py-3 px-3 hidden sm:table-cell">Contact</th>
                                        <th className="py-3 px-3">Doctor & Department</th>
                                        <th className="py-3 px-3">Date & Time</th>
                                        <th className="py-3 px-3 hidden md:table-cell">Mode</th>
                                        <th className="py-3 px-3">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                    {displayedAppointments.map((apt) => (
                                        <tr
                                            key={apt.id}
                                            onClick={() => handleRowClick(apt)}
                                            className="hover:bg-slate-50/90 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                        >
                                            {/* Patient & UHID */}
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                                                    {apt.patientName}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.2 rounded-md border border-teal-200/60 dark:border-teal-800">
                                                        {apt.patientUhid || `UHID-${apt.id.slice(0, 8).toUpperCase()}`}
                                                    </span>
                                                    {apt.patientGender && (
                                                        <span className="text-[10px] text-slate-400 font-medium capitalize">
                                                            • {apt.patientGender}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="py-3 px-3 hidden sm:table-cell text-slate-600 dark:text-slate-400">
                                                {apt.patientPhone ? (
                                                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        {apt.patientPhone}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </td>

                                            {/* Doctor & Department */}
                                            <td className="py-3 px-3">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                    Dr. {apt.doctorName}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                    {apt.doctorDepartment || apt.doctorSpecialization || 'General'}
                                                </div>
                                            </td>

                                            {/* Date & Time */}
                                            <td className="py-3 px-3">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    {formatDate(apt.date)}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                                    {formatTime(apt.time)}
                                                </div>
                                            </td>

                                            {/* Mode */}
                                            <td className="py-3 px-3 hidden md:table-cell">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 capitalize">
                                                    {apt.type === 'video' ? (
                                                        <>
                                                            <Video className="w-3 h-3 text-blue-500" />
                                                            <span>Video</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Building2 className="w-3 h-3 text-teal-600" />
                                                            <span>In-Person</span>
                                                        </>
                                                    )}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3 px-3">
                                                <StatusBadge status={apt.status} size="sm" />
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="inline-flex items-center gap-1">
                                                    {apt.status === 'scheduled' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDrawerCheckIn(apt.id)}
                                                            className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer hidden lg:inline-block"
                                                            title="Mark patient arrived"
                                                        >
                                                            Check In
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRowClick(apt)}
                                                        className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                                        title="Open Details Workspace"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="px-4 py-3 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                            <div className="text-slate-500 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{displayedAppointments.length}</span> of{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{appointmentsPagination.total}</span> appointments
                            </div>

                            {appointmentsPagination.totalPages > 1 && (
                                <Pagination
                                    currentPage={page}
                                    totalPages={appointmentsPagination.totalPages}
                                    onPageChange={(newPage) => setPage(newPage)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 7. Appointment Details Workspace Drawer */}
            <AppointmentDetailsDrawer
                appointment={selectedAppointment}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onStatusUpdate={handleDrawerStatusUpdate}
                onCheckIn={handleDrawerCheckIn}
                onOpenReschedule={(apt) => setRescheduleTarget(apt)}
                onOpenCancel={(apt) => setCancelTarget(apt)}
                staffRole={staffRole}
            />

            {/* 8. Reschedule Modal */}
            <RescheduleAppointmentModal
                appointment={rescheduleTarget}
                isOpen={Boolean(rescheduleTarget)}
                onClose={() => setRescheduleTarget(null)}
                onReschedule={handleRescheduleSubmit}
            />

            {/* 9. Cancel Modal */}
            <CancelAppointmentModal
                appointment={cancelTarget}
                isOpen={Boolean(cancelTarget)}
                onClose={() => setCancelTarget(null)}
                onCancel={handleCancelSubmit}
            />

            {/* 10. New Walk-In Appointment Modal */}
            <NewAppointmentModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onSuccess={async () => {
                    await Promise.all([loadAppointments(), fetchAppointmentKpis()]);
                }}
                doctors={doctorsList}
                departments={departmentsList}
            />

        </div>
    );
}
