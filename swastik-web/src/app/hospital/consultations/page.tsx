'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    Stethoscope,
    Search,
    Calendar,
    Clock,
    User,
    Video,
    Phone,
    MessageCircle,
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    Download,
    Eye,
    ChevronRight,
    ExternalLink,
    X,
    Activity,
    CalendarClock,
    Shield,
    Users,
    Timer,
    Radio,
    ShieldAlert
} from 'lucide-react';
import { useHospitalStore, HospitalConsultation } from '@/stores/hospitalStore';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { downloadCSV } from '@/utils/export';
import { hospitalApi } from '@/lib/api';
import { ConsultationDetailsDrawer } from '@/components/hospital/consultations/ConsultationDetailsDrawer';

const PAGE_SIZE = 15;

export default function HospitalConsultationsPage() {
    const {
        consultations,
        consultationsPagination,
        loadingConsultations,
        consultationKpis,
        loadingConsultationKpis,
        consultationKpisError,
        fetchConsultations,
        fetchConsultationKpis,
        error,
        clearError,
    } = useHospitalStore();

    // Local filters & view state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [doctorFilter, setDoctorFilter] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [modeFilter, setModeFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'all' | 'today' | 'in_progress' | 'waiting' | 'completed' | 'cancelled'>('all');
    const [page, setPage] = useState(1);

    // Aux states
    const [doctorsList, setDoctorsList] = useState<{ id: string; name: string; specialization: string }[]>([]);
    const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // Drawer state
    const [selectedConsultation, setSelectedConsultation] = useState<HospitalConsultation | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim());

    // Socket connection
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // Load initial aux data
    useEffect(() => {
        const fetchAux = async () => {
            try {
                const [roleRes, docsRes, deptsRes] = await Promise.allSettled([
                    hospitalApi.getMyStaffRole(),
                    hospitalApi.getDoctors(1, '', 100),
                    hospitalApi.getDepartments(),
                ]);

                if (roleRes.status === 'fulfilled' && (roleRes.value as any)?.success && (roleRes.value as any)?.staffRole) {
                    setStaffRole((roleRes.value as any).staffRole);
                }
                if (docsRes.status === 'fulfilled' && (docsRes.value as any)?.success) {
                    const rawDocs = (docsRes.value as any).data || (docsRes.value as any).doctors || [];
                    if (Array.isArray(rawDocs)) {
                        setDoctorsList(rawDocs.map((d: any) => ({
                            id: d.id || d.doctor_id || '',
                            name: d.name || d.doctor?.name || 'Doctor',
                            specialization: d.specialization || d.doctor?.specialization || 'Specialist',
                        })));
                    }
                }
                if (deptsRes.status === 'fulfilled' && (deptsRes.value as any)?.success) {
                    const rawDepts = (deptsRes.value as any).data || (deptsRes.value as any).departments || [];
                    if (Array.isArray(rawDepts)) {
                        setDepartmentsList(rawDepts.map((dp: any) => ({
                            id: dp.id,
                            name: dp.name,
                        })));
                    }
                }
            } catch (err) {
                console.error('Error fetching aux hospital data:', err);
            }
        };

        fetchAux();
    }, []);

    // Main fetch
    const loadConsultations = useCallback(() => {
        let effectiveStatus = statusFilter;
        let effectiveDate = dateFilter;

        if (activeTab === 'today') {
            effectiveDate = new Date().toISOString().split('T')[0];
        } else if (activeTab === 'in_progress') {
            effectiveStatus = 'in_progress';
        } else if (activeTab === 'waiting') {
            effectiveStatus = 'waiting';
        } else if (activeTab === 'completed') {
            effectiveStatus = 'completed';
        } else if (activeTab === 'cancelled') {
            effectiveStatus = 'cancelled';
        }

        fetchConsultations({
            page,
            limit: PAGE_SIZE,
            search: deferredSearch,
            status: effectiveStatus || undefined,
            doctorId: doctorFilter || undefined,
            department: departmentFilter || undefined,
            date: effectiveDate || undefined,
            type: modeFilter || undefined,
        });
    }, [
        page,
        deferredSearch,
        statusFilter,
        doctorFilter,
        departmentFilter,
        dateFilter,
        modeFilter,
        activeTab,
        fetchConsultations,
    ]);

    useEffect(() => {
        loadConsultations();
    }, [loadConsultations]);

    useEffect(() => {
        fetchConsultationKpis();
    }, [fetchConsultationKpis]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, statusFilter, doctorFilter, departmentFilter, dateFilter, modeFilter, activeTab]);

    // Real-time socket event listener
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            loadConsultations();
            fetchConsultationKpis();
        };

        socket.on('consultation:updated', handleUpdate);
        socket.on('consultation:started', handleUpdate);
        socket.on('consultation:ended', handleUpdate);
        socket.on('appointment:updated', handleUpdate);

        return () => {
            socket.off('consultation:updated', handleUpdate);
            socket.off('consultation:started', handleUpdate);
            socket.off('consultation:ended', handleUpdate);
            socket.off('appointment:updated', handleUpdate);
        };
    }, [socket, loadConsultations, fetchConsultationKpis]);

    // Formatters
    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '—';
        if (timeStr.includes('T')) {
            try {
                return new Date(timeStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            } catch {
                return timeStr;
            }
        }
        return timeStr;
    };

    const renderModeBadge = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'audio':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                        <Phone className="w-3 h-3" />
                        <span>Audio Call</span>
                    </span>
                );
            case 'chat':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
                        <MessageCircle className="w-3 h-3" />
                        <span>Live Chat</span>
                    </span>
                );
            case 'in_person':
            case 'hospital':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        <Building2 className="w-3 h-3" />
                        <span>In-Clinic Encounter</span>
                    </span>
                );
            case 'video':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40">
                        <Video className="w-3 h-3" />
                        <span>Telemedicine Video</span>
                    </span>
                );
        }
    };

    // Client-side mode filter fallback
    const displayedConsultations = useMemo(() => {
        let list = consultations;
        if (modeFilter) {
            list = list.filter((c) => c.type?.toLowerCase() === modeFilter.toLowerCase());
        }
        return list;
    }, [consultations, modeFilter]);

    // Active consultations list for Live Activity Area
    const liveConsultations = useMemo(() => {
        return consultations.filter(
            (c) => c.status === 'in_progress' || c.status === 'in_consultation'
        );
    }, [consultations]);

    // Active filters flag
    const hasActiveFilters = Boolean(
        searchQuery ||
        statusFilter ||
        doctorFilter ||
        departmentFilter ||
        dateFilter ||
        modeFilter ||
        activeTab !== 'all'
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setDoctorFilter('');
        setDepartmentFilter('');
        setDateFilter('');
        setModeFilter('');
        setActiveTab('all');
        setPage(1);
    };

    // Export CSV
    const handleExport = () => {
        if (displayedConsultations.length === 0) return;
        const columns = [
            { key: 'id', label: 'Consultation ID' },
            { key: 'appointmentId', label: 'Linked Appointment ID' },
            { key: 'doctorName', label: 'Attending Doctor' },
            { key: 'doctorDepartment', label: 'Department' },
            { key: 'patientName', label: 'Patient Name' },
            { key: 'patientUhid', label: 'Patient UHID' },
            { key: 'date', label: 'Session Date' },
            { key: 'scheduledTime', label: 'Scheduled Time' },
            { key: 'type', label: 'Modality' },
            { key: 'durationMinutes', label: 'Duration (Minutes)' },
            { key: 'status', label: 'Session Status' },
        ];
        downloadCSV(displayedConsultations, columns, `Hospital_Consultations_Audit_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="space-y-4">
            
            {/* 1. Header with Clinical Operations Identity & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Clinical Consultations
                                </h1>
                                {isSocketConnected ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        <span>LIVE</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                        <span>Auto-sync active</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Live encounter monitoring, attending physician sessions, and consultation lifecycle oversight.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={displayedConsultations.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export Logs</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            clearError();
                            loadConsultations();
                            fetchConsultationKpis();
                        }}
                        disabled={loadingConsultations || loadingConsultationKpis}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${(loadingConsultations || loadingConsultationKpis) ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>Sync Live</span>
                    </button>
                </div>
            </div>

            {/* 2. Clinical Operations KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* KPI 1: Today's Consultations */}
                <button
                    type="button"
                    onClick={() => { if (!loadingConsultationKpis && !consultationKpisError) { setActiveTab('today'); setStatusFilter(''); } }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'today' && !statusFilter
                            ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Today's Sessions</span>
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingConsultationKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : consultationKpisError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            consultationKpis?.todayTotal ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 2: Live In-Progress Consultations */}
                <button
                    type="button"
                    onClick={() => { if (!loadingConsultationKpis && !consultationKpisError) { setActiveTab('in_progress'); setStatusFilter('in_progress'); } }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'in_progress'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold flex items-center gap-1">
                            <span>Active In-Session</span>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        </span>
                        <Radio className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingConsultationKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : consultationKpisError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            consultationKpis?.inConsultation ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 3: In Waiting Lobby */}
                <button
                    type="button"
                    onClick={() => { if (!loadingConsultationKpis && !consultationKpisError) { setActiveTab('waiting'); setStatusFilter('waiting'); } }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'waiting'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Waiting in Lobby</span>
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingConsultationKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : consultationKpisError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            consultationKpis?.waiting ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 4: Completed Encounters */}
                <button
                    type="button"
                    onClick={() => { if (!loadingConsultationKpis && !consultationKpisError) { setActiveTab('completed'); setStatusFilter('completed'); } }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'completed'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Completed Today</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {loadingConsultationKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : consultationKpisError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            consultationKpis?.completed ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 5: Avg Consultation Duration */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Avg Session Length</span>
                        <Timer className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                        {loadingConsultationKpis ? (
                            <span className="inline-block w-12 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : consultationKpisError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : consultationKpis?.avgDurationMinutes ? (
                            `${consultationKpis.avgDurationMinutes} mins`
                        ) : (
                            '—'
                        )}
                    </div>
                </div>

                {/* KPI 6: Doctors Currently Consulting */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Doctors In-Session</span>
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingConsultationKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : consultationKpisError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            consultationKpis?.doctorsConsulting ?? 0
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Live Activity Area: Currently Active Clinical Sessions (Clean Light HIS Card) */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Live Clinical Encounters Monitor
                        </h2>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                        {loadingConsultations ? '—' : `${liveConsultations.length} ${liveConsultations.length === 1 ? 'Session Active' : 'Sessions Active'}`}
                    </span>
                </div>

                {loadingConsultations ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        <span className="text-xs text-slate-400">Loading active clinical sessions...</span>
                    </div>
                ) : liveConsultations.length === 0 ? (
                    <div className="py-4 px-3 bg-slate-50/70 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700/60 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            No clinical consultations are currently in progress.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {liveConsultations.map((consultation) => (
                            <div
                                key={consultation.id}
                                className="p-3 bg-slate-50/80 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 flex flex-col justify-between space-y-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                            Dr. {consultation.doctorName}
                                        </p>
                                        <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium truncate">
                                            {consultation.doctorSpecialization} • {consultation.doctorDepartment}
                                        </p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        LIVE
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                            {consultation.patientName}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400">
                                            {consultation.patientUhid || 'UHID-N/A'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedConsultation(consultation);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                                    >
                                        <Eye className="w-3 h-3" />
                                        <span>Workspace</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Clinical Session Progression Pipeline */}
            <div className="p-3.5 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        Today's Consultation Session Flow
                    </span>
                    <span className="text-[10px] text-slate-400">
                        Click any lifecycle state to filter session logs
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                    
                    {/* Stage 1: Scheduled */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('all'); setStatusFilter('scheduled'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700 hover:border-indigo-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                            1
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">Scheduled Sessions</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                {loadingConsultationKpis ? '—' : consultationKpis?.flow?.scheduled ?? 0}
                            </span>
                        </div>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 2: Waiting in Lobby */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('waiting'); setStatusFilter('waiting'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                            2
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 block leading-tight">Waiting in Lobby</span>
                            <span className="font-bold text-blue-800 dark:text-blue-200 text-sm">
                                {loadingConsultationKpis ? '—' : consultationKpis?.flow?.waiting ?? 0}
                            </span>
                        </div>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 3: Live In-Session */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('in_progress'); setStatusFilter('in_progress'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 hover:border-amber-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
                            3
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block leading-tight">Live In-Session</span>
                            <span className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                                {loadingConsultationKpis ? '—' : consultationKpis?.flow?.consulting ?? 0}
                            </span>
                        </div>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 4: Completed */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('completed'); setStatusFilter('completed'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                            ✓
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block leading-tight">Completed</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                                {loadingConsultationKpis ? '—' : consultationKpis?.flow?.completed ?? 0}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* 5. Consultation Lifecycle Segmented Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'all', label: 'All Sessions' },
                    { id: 'today', label: 'Today' },
                    { id: 'in_progress', label: 'Active In-Session' },
                    { id: 'waiting', label: 'Waiting Lobby' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                if (tab.id === 'all' || tab.id === 'today') setStatusFilter('');
                            }}
                            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 6. Integrated Consultation Filters Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                    
                    {/* Search */}
                    <div className="lg:col-span-4 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search doctor, patient, UHID, consultation ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Department */}
                    <div className="lg:col-span-2">
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">All Departments</option>
                            {departmentsList.map((d) => (
                                <option key={d.id} value={d.name}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Doctor */}
                    <div className="lg:col-span-2">
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">All Attending Doctors</option>
                            {doctorsList.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    Dr. {doc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">All Session Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="waiting">Waiting in Lobby</option>
                            <option value="in_progress">In Progress (Active)</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Date */}
                    <div className="lg:col-span-2">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Modality Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-gray-800 text-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">Encounter Modality:</span>
                        {[
                            { value: '', label: 'All Modes' },
                            { value: 'video', label: 'Telemedicine Video' },
                            { value: 'audio', label: 'Audio Consultation' },
                            { value: 'chat', label: 'Live Chat' },
                            { value: 'hospital', label: 'In-Clinic Encounter' },
                        ].map((m) => (
                            <button
                                key={m.value || 'all'}
                                type="button"
                                onClick={() => setModeFilter(m.value)}
                                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                    modeFilter === m.value
                                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-bold'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
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
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Clear Filters</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 7. Dedicated Clinical Consultation Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                
                {/* Loading */}
                {loadingConsultations ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <span className="text-xs text-slate-500 font-medium">Loading clinical consultations...</span>
                    </div>
                ) : error && consultations.length === 0 ? (
                    /* Error State with real Retry Button */
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Unable to load consultations
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                            {error.includes('permission') || error.includes('denied')
                                ? 'You do not have authorization to view clinical consultations for this hospital.'
                                : 'A server or network error occurred while fetching consultations. Please try again.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => { clearError(); loadConsultations(); }}
                            disabled={loadingConsultations}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                        </button>
                    </div>
                ) : displayedConsultations.length === 0 ? (
                    /* Differentiated Empty States */
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                            <Stethoscope className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {hasActiveFilters ? 'No consultations match your filters' : 'No consultations recorded'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {hasActiveFilters
                                ? 'No clinical consultation records match the specified search or filter criteria.'
                                : activeTab === 'today'
                                ? 'No clinical consultations have been scheduled or started for today.'
                                : 'No clinical consultations have been recorded for your hospital roster yet.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Reset All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    /* Clinical Session Records Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Attending Doctor & Specialty</th>
                                    <th className="py-3 px-4">Patient & UHID</th>
                                    <th className="py-3 px-4">Session Timings</th>
                                    <th className="py-3 px-4">Duration</th>
                                    <th className="py-3 px-4">Modality</th>
                                    <th className="py-3 px-4">Session Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                {displayedConsultations.map((consultation) => (
                                    <tr
                                        key={consultation.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Doctor & Specialty */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                                                    {consultation.doctorName ? consultation.doctorName.charAt(0).toUpperCase() : 'D'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                        Dr. {consultation.doctorName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        {consultation.doctorSpecialization} • {consultation.doctorDepartment}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Patient & UHID */}
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                                                {consultation.patientName}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
                                                    {consultation.patientUhid || 'UHID-N/A'}
                                                </span>
                                                {consultation.patientPhone && (
                                                    <span className="text-[11px] text-slate-400">
                                                        • {consultation.patientPhone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Timings */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {formatDate(consultation.date)}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {consultation.scheduledTime ? `Slot: ${consultation.scheduledTime}` : formatTime(consultation.startedAt)}
                                            </p>
                                        </td>

                                        {/* Duration */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {consultation.status === 'in_progress' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 animate-pulse">
                                                    <Radio className="w-3 h-3" />
                                                    <span>Live Session</span>
                                                </span>
                                            ) : consultation.durationMinutes ? (
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {consultation.durationMinutes} mins
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-mono">—</span>
                                            )}
                                        </td>

                                        {/* Modality */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {renderModeBadge(consultation.type)}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <StatusBadge status={consultation.status} size="sm" />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedConsultation(consultation);
                                                    setIsDrawerOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                title="Open Consultation Workspace"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Workspace</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loadingConsultations && displayedConsultations.length > 0 && consultationsPagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page <span className="font-semibold">{consultationsPagination.page}</span> of <span className="font-semibold">{consultationsPagination.totalPages}</span> ({consultationsPagination.total} total sessions)
                        </span>
                        <Pagination
                            currentPage={page}
                            totalPages={consultationsPagination.totalPages}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                )}
            </div>

            {/* 8. Consultation Details Workspace Drawer */}
            <ConsultationDetailsDrawer
                consultation={selectedConsultation}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                staffRole={staffRole}
            />

        </div>
    );
}
