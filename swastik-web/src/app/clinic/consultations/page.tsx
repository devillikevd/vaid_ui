/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
    Activity, Video, Building2, Search, RefreshCw, AlertCircle, 
    Clock, User, Stethoscope, Pill, Filter, Calendar, X, Timer,
    ArrowRight, CheckCircle2, ChevronRight, FileText
} from 'lucide-react';
import { useClinicStore, type Consultation } from '@/stores/clinicStore';
import { Pagination } from '@/components/ui/Pagination';
import { ConsultationDetailModal } from '@/components/clinic/ConsultationDetailModal';

const PAGE_SIZE = 12;

export default function ClinicConsultationsPage() {
    const {
        consultations,
        consultationsPagination,
        consultationMetrics,
        loadingConsultations,
        error,
        fetchConsultations,
        doctors,
        fetchDoctors,
        clearError,
    } = useClinicStore();

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState('all');
    const [customDate, setCustomDate] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Initial load doctors for the dropdown
    useEffect(() => {
        if (doctors.length === 0) {
            void fetchDoctors({ limit: 100 });
        }
    }, [doctors.length, fetchDoctors]);

    // Fetch consultations from real backend
    const loadConsultations = useCallback(async () => {
        await fetchConsultations({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            date: customDate || undefined,
            dateRange: !customDate && dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
            doctorId: doctorFilter !== 'all' ? doctorFilter : undefined,
        });
    }, [customDate, dateRangeFilter, deferredSearchQuery, doctorFilter, fetchConsultations, page, statusFilter, typeFilter]);

    useEffect(() => {
        void loadConsultations();
    }, [loadConsultations]);

    // 1. Clinic-scoped consultations (guarantee no hospital/external records)
    const clinicScopedConsultations = useMemo(() => {
        return (consultations as Consultation[]).filter((c: Consultation) => {
            if (c.hospital_id || c.hospitalId || c.appointment?.hospital_id || c.appointment?.hospitalId || c.organization_type === 'hospital') {
                return false;
            }
            return true;
        });
    }, [consultations]);

    // 2. Metrics derived strictly from clinic-scoped consultations
    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const clinicMetrics = useMemo(() => {
        if (consultationMetrics && (
            consultationMetrics.todayConsultations > 0 ||
            consultationMetrics.inProgress > 0 ||
            consultationMetrics.completed > 0 ||
            consultationMetrics.videoConsultations > 0 ||
            consultationMetrics.inPersonConsultations > 0
        )) {
            return consultationMetrics;
        }
        return {
            todayConsultations: clinicScopedConsultations.filter((c: Consultation) => {
                const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
                return d === todayIso;
            }).length,
            inProgress: clinicScopedConsultations.filter((c: Consultation) => ['in_progress', 'started', 'active'].includes(c.status)).length,
            completed: clinicScopedConsultations.filter((c: Consultation) => ['completed', 'ended'].includes(c.status)).length,
            videoConsultations: clinicScopedConsultations.filter((c: Consultation) => c.type === 'video').length,
            inPersonConsultations: clinicScopedConsultations.filter((c: Consultation) => c.type === 'clinic' || c.type === 'in_person').length,
        };
    }, [clinicScopedConsultations, consultationMetrics, todayIso]);

    // 3. Displayed list with in-memory filters applied to clinic-scoped consultations
    const displayedConsultations = useMemo(() => {
        let list: Consultation[] = clinicScopedConsultations;

        if (doctorFilter !== 'all') {
            list = list.filter((c: Consultation) => c.doctor?.id === doctorFilter || (c as any).doctorId === doctorFilter);
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'in_progress') {
                list = list.filter((c: Consultation) => ['in_progress', 'started', 'active'].includes(c.status));
            } else if (statusFilter === 'completed') {
                list = list.filter((c: Consultation) => ['completed', 'ended'].includes(c.status));
            } else {
                list = list.filter((c: Consultation) => c.status === statusFilter);
            }
        }

        if (typeFilter !== 'all') {
            if (typeFilter === 'clinic') {
                list = list.filter((c: Consultation) => c.type === 'clinic' || c.type === 'in_person');
            } else if (typeFilter === 'video') {
                list = list.filter((c: Consultation) => c.type === 'video');
            }
        }

        if (customDate) {
            list = list.filter((c: Consultation) => {
                const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
                return d === customDate;
            });
        } else if (dateRangeFilter !== 'all') {
            if (dateRangeFilter === 'today') {
                list = list.filter((c: Consultation) => {
                    const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
                    return d === todayIso;
                });
            } else if (dateRangeFilter === 'this_week') {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
                list = list.filter((c: Consultation) => {
                    const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
                    return d && d >= startOfWeekStr && d <= todayIso;
                });
            } else if (dateRangeFilter === 'this_month') {
                const startOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                list = list.filter((c: Consultation) => {
                    const d = c.appointment?.date || (c.created_at ? c.created_at.split('T')[0] : null);
                    return d && d >= startOfMonthStr && d <= todayIso;
                });
            }
        }

        if (deferredSearchQuery) {
            const q = deferredSearchQuery.toLowerCase();
            list = list.filter((c: Consultation) =>
                Boolean(
                    (c.patient?.name && c.patient.name.toLowerCase().includes(q)) ||
                    (c.patient?.phone && c.patient.phone.toLowerCase().includes(q)) ||
                    (c.doctor?.name && c.doctor.name.toLowerCase().includes(q)) ||
                    (c.doctor?.specialization && c.doctor.specialization.toLowerCase().includes(q)) ||
                    (c.id && c.id.toLowerCase().includes(q)) ||
                    (c.diagnosis && c.diagnosis.toLowerCase().includes(q)) ||
                    (c.appointment?.reason && c.appointment.reason.toLowerCase().includes(q))
                )
            );
        }

        return list;
    }, [clinicScopedConsultations, doctorFilter, statusFilter, typeFilter, customDate, dateRangeFilter, todayIso, deferredSearchQuery]);

    useEffect(() => {
        console.log("[CLINIC CONSULTATION UI]", {
            rawCount: consultations?.length,
            scopedCount: clinicScopedConsultations?.length,
            displayedCount: displayedConsultations?.length,
            firstRecords: displayedConsultations?.slice(0, 3),
        });
    }, [consultations, clinicScopedConsultations, displayedConsultations]);

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

    const handleOpenDetails = (consultation: Consultation) => {
        setSelectedConsultation(consultation);
        setIsDetailModalOpen(true);
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <Activity className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        Clinic Consultations
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        Track consultations handled by doctors linked to your clinic.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={() => {
                            clearError();
                            void loadConsultations();
                        }}
                        disabled={loadingConsultations}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingConsultations ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Top Real Operational Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                
                {/* Today's Consultations */}
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
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Today&apos;s Sessions</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {clinicMetrics.todayConsultations}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Scheduled / active today</p>
                </div>

                {/* In Progress */}
                <div 
                    onClick={() => {
                        setStatusFilter('in_progress');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === 'in_progress'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Progress</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {clinicMetrics.inProgress}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Active sessions</p>
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
                        {clinicMetrics.completed}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Finished consultations</p>
                </div>

                {/* Video Consultations */}
                <div 
                    onClick={() => {
                        setTypeFilter('video');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm ${
                        typeFilter === 'video'
                            ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/40 dark:border-purple-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Video Calls</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {clinicMetrics.videoConsultations}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Teleconsultations</p>
                </div>

                {/* In-Person Consultations */}
                <div 
                    onClick={() => {
                        setTypeFilter('clinic');
                        setPage(1);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-sm col-span-2 sm:col-span-1 ${
                        typeFilter === 'clinic'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700'
                            : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                >
                    <p className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In-Person OPD</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {clinicMetrics.inPersonConsultations}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Physical clinic visits</p>
                </div>
            </div>

            {/* Error State Banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>Unable to load consultations. {error}</span>
                    </div>
                    <button
                        onClick={() => {
                            clearError();
                            void loadConsultations();
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
                        placeholder="Search by patient name, phone, doctor name, specialization, or session ID..."
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
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="scheduled">Scheduled / Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Date Quick Filter */}
                    <div>
                        <select
                            value={customDate ? 'custom' : dateRangeFilter}
                            onChange={(e) => {
                                if (e.target.value === 'custom') {
                                    // Custom picker handled by date input
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
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
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
                            Showing filtered results ({displayedConsultations.length} total)
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

            {/* Main Consultation Table / Card Content */}
            {loadingConsultations && displayedConsultations.length === 0 ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 rounded-3xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 animate-pulse p-4" />
                    ))}
                </div>
            ) : displayedConsultations.length === 0 ? (
                /* Empty State */
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 mx-auto flex items-center justify-center">
                        <Activity className="w-8 h-8" />
                    </div>

                    <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {hasActiveFilters ? 'No matching consultations found' : 'No consultations found'}
                        </h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {hasActiveFilters
                                ? 'Try adjusting your status, date range, or consulting doctor filters.'
                                : 'Consultations will appear here after one of your clinic’s affiliated doctors starts or completes a patient consultation.'}
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                        {hasActiveFilters ? (
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition-colors"
                            >
                                Reset All Filters
                            </button>
                        ) : (
                            <Link
                                href="/clinic/appointments"
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                            >
                                <span>View Appointments</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    
                    {/* Desktop View Table */}
                    <div className="hidden lg:block bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto w-full max-w-full">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#0f172a]/50">
                                    <th className="py-4 px-6">Date &amp; Time</th>
                                    <th className="py-4 px-4">Patient</th>
                                    <th className="py-4 px-4">Doctor</th>
                                    <th className="py-4 px-4">Mode</th>
                                    <th className="py-4 px-4">Status</th>
                                    <th className="py-4 px-4">Duration</th>
                                    <th className="py-4 px-4">Prescription</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
                                {displayedConsultations.map((consult: Consultation) => {
                                    const isInPerson = consult.type === 'clinic' || consult.type === 'in_person';
                                    const isCompleted = consult.status === 'completed' || consult.status === 'ended';
                                    const isInProgress = ['in_progress', 'started', 'active'].includes(consult.status);
                                    const isCancelled = consult.status === 'cancelled';

                                    return (
                                        <tr 
                                            key={consult.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-[#162238]/60 transition-colors group"
                                        >
                                            {/* Date & Time */}
                                            <td className="py-4 px-6">
                                                <div className="space-y-0.5">
                                                    <p className="font-extrabold text-gray-900 dark:text-white text-xs">
                                                        {formatDateTime(consult.appointment?.date || consult.created_at)}
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{consult.appointment?.time || 'Session'}</span>
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Patient */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    {consult.patient.profile_image_url ? (
                                                        <img
                                                            src={consult.patient.profile_image_url}
                                                            alt={consult.patient.name}
                                                            className="w-9 h-9 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                                                            {consult.patient.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-extrabold text-gray-900 dark:text-white truncate">
                                                            {consult.patient.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 capitalize">
                                                            {consult.patient.gender || 'Patient'}
                                                            {consult.patient.age != null ? ` • ${consult.patient.age}y` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Doctor */}
                                            <td className="py-4 px-4">
                                                <div className="min-w-0 space-y-0.5">
                                                    <p className="font-extrabold text-gray-900 dark:text-white truncate">
                                                        Dr. {consult.doctor.name.replace(/^Dr\.\s*/i, '')}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                        {consult.doctor.specialization || 'Physician'}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Mode */}
                                            <td className="py-4 px-4">
                                                {isInPerson ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                        <Building2 className="w-3 h-3 text-emerald-600" /> In-Person
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
                                                    isInProgress ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                                    isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                                    isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                                    'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                                }`}>
                                                    {consult.status.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Duration */}
                                            <td className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300 text-xs">
                                                {consult.durationMinutes != null && consult.durationMinutes > 0 ? (
                                                    <span className="flex items-center gap-1">
                                                        <Timer className="w-3 h-3 text-gray-400" />
                                                        <span>{consult.durationMinutes} min</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>

                                            {/* Prescription */}
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                                    consult.hasPrescription
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                        : 'text-gray-400 bg-gray-50 dark:bg-gray-800'
                                                }`}>
                                                    <Pill className="w-3 h-3" />
                                                    <span>{consult.hasPrescription ? 'Issued' : 'None'}</span>
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleOpenDetails(consult)}
                                                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors shadow-sm"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    {/* Mobile & Tablet Card Layout */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedConsultations.map((consult: Consultation) => {
                            const isInPerson = consult.type === 'clinic' || consult.type === 'in_person';
                            const isCompleted = consult.status === 'completed' || consult.status === 'ended';
                            const isInProgress = ['in_progress', 'started', 'active'].includes(consult.status);
                            const isCancelled = consult.status === 'cancelled';

                            return (
                                <div
                                    key={consult.id}
                                    className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        {/* Date / Time & Status Row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <p className="font-extrabold text-gray-900 dark:text-white text-sm">
                                                    {formatDateTime(consult.appointment?.date || consult.created_at)}
                                                </p>
                                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{consult.appointment?.time || 'Session'}</span>
                                                </p>
                                            </div>

                                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize border ${
                                                isInProgress ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                                isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                                isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                                'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                            }`}>
                                                {consult.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        {/* Patient Info */}
                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                                                {consult.patient.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-gray-900 dark:text-white text-xs truncate">
                                                    {consult.patient.name}
                                                </p>
                                                <p className="text-[11px] text-gray-500 capitalize">
                                                    {consult.patient.gender || 'Patient'}
                                                    {consult.patient.age != null ? ` • ${consult.patient.age}y` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Doctor & Mode Summary */}
                                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-1">
                                            <div className="truncate">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    Dr. {consult.doctor.name.replace(/^Dr\.\s*/i, '')}
                                                </span>
                                                <span className="text-[11px] text-gray-500 ml-1">
                                                    ({consult.doctor.specialization})
                                                </span>
                                            </div>

                                            {isInPerson ? (
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md shrink-0">
                                                    In-Person
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md shrink-0">
                                                    Video
                                                </span>
                                            )}
                                        </div>

                                        {/* Duration & Prescription row */}
                                        <div className="flex items-center justify-between text-[11px] pt-1">
                                            <span className="text-gray-500 flex items-center gap-1">
                                                <Timer className="w-3 h-3 text-gray-400" />
                                                <span>Duration: {consult.durationMinutes ? `${consult.durationMinutes} min` : '—'}</span>
                                            </span>

                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                                consult.hasPrescription
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : 'text-gray-400 bg-gray-50 dark:bg-gray-800'
                                            }`}>
                                                Rx: {consult.hasPrescription ? 'Issued' : 'None'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Action Row */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                                        <button
                                            onClick={() => handleOpenDetails(consult)}
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
                    {consultationsPagination.totalPages > 1 && (
                        <div className="pt-4 flex justify-center">
                            <Pagination
                                currentPage={page}
                                totalPages={consultationsPagination.totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Consultation Details Modal */}
            <ConsultationDetailModal
                consultation={selectedConsultation}
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
            />
        </div>
    );
}
