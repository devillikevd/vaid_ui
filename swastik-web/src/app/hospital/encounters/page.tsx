'use client';

import React, { useState, useEffect, useCallback, useDeferredValue } from 'react';
import {
    ClipboardList,
    RefreshCw,
    Search,
    User,
    Stethoscope,
    Building2,
    Calendar,
    Clock,
    Eye,
    ChevronRight,
    X,
    Activity,
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    CreditCard,
    Filter,
    Loader2,
    Radio
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EncounterDetailsDrawer } from '@/components/hospital/encounters/EncounterDetailsDrawer';

const PAGE_SIZE = 15;

export default function ClinicalEncountersPage() {
    // ── DATA STATES ──
    const [encounters, setEncounters] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [stats, setStats] = useState<any>(null);
    const [doctors, setDoctors] = useState<{ id: string; name: string; specialization?: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingEncounters, setLoadingEncounters] = useState(true);
    const [encountersError, setEncountersError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<boolean>(false);

    // ── FILTERS ──
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'opd' | 'ipd' | 'emergency' | 'active' | 'completed' | 'cancelled'>('all');
    const [page, setPage] = useState(1);

    // ── DRAWER STATE ──
    const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH ENCOUNTERS LIST ──
    const fetchEncountersList = useCallback(async () => {
        setLoadingEncounters(true);
        setEncountersError(null);
        try {
            let effectiveType = typeFilter;
            let effectiveStatus = statusFilter;

            if (activeTab === 'opd') effectiveType = 'opd';
            else if (activeTab === 'ipd') effectiveType = 'ipd';
            else if (activeTab === 'emergency') effectiveType = 'emergency';
            else if (activeTab === 'active') effectiveStatus = 'in_progress';
            else if (activeTab === 'completed') effectiveStatus = 'completed';
            else if (activeTab === 'cancelled') effectiveStatus = 'cancelled';

            const params: Record<string, any> = {
                page,
                limit: PAGE_SIZE,
                search: deferredSearch || undefined,
                encounterType: effectiveType || undefined,
                status: effectiveStatus || undefined,
                doctorId: doctorFilter || undefined,
                departmentId: departmentFilter || undefined,
                date: dateFilter || undefined,
            };

            const res = await hospitalApi.getEncounters(params);
            if (res && res.success) {
                const d = (res.data ?? res) as any;
                setEncounters(Array.isArray(d.data) ? d.data : []);
                setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load clinical encounters';
                const isPerm = res?.status === 401 || res?.status === 403 || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied');
                setEncountersError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load clinical encounters';
            const isPerm = err.status === 401 || err.status === 403 || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied');
            setEncountersError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingEncounters(false);
        }
    }, [page, deferredSearch, typeFilter, statusFilter, doctorFilter, departmentFilter, dateFilter, activeTab]);

    // ── FETCH ENCOUNTER STATS ──
    const fetchEncounterStats = useCallback(async () => {
        setLoadingStats(true);
        setStatsError(false);
        try {
            const res = await hospitalApi.getEncounterStats();
            if (res && res.success) {
                setStats((res.data ?? res) as any);
            } else {
                setStatsError(true);
            }
        } catch (err) {
            setStatsError(true);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    // ── FETCH AUXILIARY DATA (Doctors, Departments, Staff Role) ──
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
                        setDoctors(rawDocs.map((d: any) => ({
                            id: d.id || d.doctor_id || '',
                            name: d.name || d.doctor?.name || 'Doctor',
                            specialization: d.specialization || d.doctor?.specialization || 'Specialist',
                        })));
                    }
                }
                if (deptsRes.status === 'fulfilled' && (deptsRes.value as any)?.success) {
                    const rawDepts = (deptsRes.value as any).data || (deptsRes.value as any).departments || [];
                    if (Array.isArray(rawDepts)) {
                        setDepartments(rawDepts.map((dp: any) => ({
                            id: dp.id,
                            name: dp.name,
                        })));
                    }
                }
            } catch (err) {
                console.error('Failed to load auxiliary encounter metadata:', err);
            }
        };
        fetchAux();
    }, []);

    // Refresh all independent streams
    const refreshAll = useCallback(() => {
        fetchEncountersList();
        fetchEncounterStats();
    }, [fetchEncountersList, fetchEncounterStats]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Polling fallback
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAll();
        }, 20000);
        return () => clearInterval(interval);
    }, [refreshAll]);

    // Socket real-time updates
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            refreshAll();
        };

        socket.on('encounter:created', handleUpdate);
        socket.on('encounter:updated', handleUpdate);

        return () => {
            socket.off('encounter:created', handleUpdate);
            socket.off('encounter:updated', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Reset pagination on filter changes
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, typeFilter, statusFilter, doctorFilter, departmentFilter, dateFilter, activeTab]);

    const hasActiveFilters = Boolean(
        searchQuery ||
        typeFilter ||
        doctorFilter ||
        departmentFilter ||
        statusFilter ||
        dateFilter ||
        activeTab !== 'all'
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setTypeFilter('');
        setDoctorFilter('');
        setDepartmentFilter('');
        setStatusFilter('');
        setDateFilter('');
        setActiveTab('all');
        setPage(1);
    };

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

    const formatDateTime = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return d;
        }
    };

    const isGlobalRefreshing = loadingEncounters || loadingStats;

    return (
        <div className="space-y-4">
            
            {/* 1. Header with Light HIS Design */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <ClipboardList className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Clinical Encounters
                                </h1>
                                {isSocketConnected ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        <span>● Live</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                        <span>● Updates Paused</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Manage and review patient visits across OPD, IPD and Emergency care.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={refreshAll}
                        disabled={isGlobalRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGlobalRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* 2. Top Database-Backed KPI Row (Isolated States) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* KPI 1: Today's Encounters */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('all'); setTypeFilter(''); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'all' && !typeFilter && !statusFilter
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Today's Encounters</span>
                        <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.today ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 2: OPD Encounters */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('opd'); setTypeFilter('opd'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'opd'
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">OPD Encounters</span>
                        <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.opd ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 3: IPD Encounters */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('ipd'); setTypeFilter('ipd'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'ipd'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">IPD Encounters</span>
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.ipd ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 4: Emergency Encounters */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('emergency'); setTypeFilter('emergency'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'emergency'
                            ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Emergency Visits</span>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.emergency ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 5: Active Encounters */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('active'); setStatusFilter('in_progress'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'active'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Active Visits</span>
                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.active ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 6: Completed Today */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('completed'); setStatusFilter('completed'); }}
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
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.completed_today ?? 0
                        )}
                    </div>
                </button>
            </div>

            {/* 3. Clinical Workflow Pipeline */}
            <div className="p-3.5 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-teal-600" />
                        Clinical Visit Flow
                    </span>
                    <span className="text-[10px] text-slate-400">
                        Patient episode-of-care progression stages
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                    
                    {/* Stage 1: Registration */}
                    <div className="flex items-center gap-2 flex-1 w-full p-2 rounded-2xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-700/60 text-left">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
                            1
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block leading-tight">Patient Arrival</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Registration</span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 2: Clinical Encounter */}
                    <div className="flex items-center gap-2 flex-1 w-full p-2 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-left">
                        <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center">
                            2
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block leading-tight">Physician Consult</span>
                            <span className="font-semibold text-amber-800 dark:text-amber-200 text-xs">Clinical Encounter</span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 3: Assessment & Orders */}
                    <div className="flex items-center gap-2 flex-1 w-full p-2 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-left">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
                            3
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 block leading-tight">Lab & Treatment</span>
                            <span className="font-semibold text-blue-800 dark:text-blue-200 text-xs">Assessment & Orders</span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 4: Completed */}
                    <div className="flex items-center gap-2 flex-1 w-full p-2 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-left">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                            ✓
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block leading-tight">Episode Closed</span>
                            <span className="font-semibold text-emerald-800 dark:text-emerald-200 text-xs">Discharge / Completed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Encounter Type & Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'all', label: 'All Encounters' },
                    { id: 'opd', label: 'OPD Visits' },
                    { id: 'ipd', label: 'IPD Admissions' },
                    { id: 'emergency', label: 'Emergency Encounters' },
                    { id: 'active', label: 'Active In-Progress' },
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
                                if (tab.id === 'all') {
                                    setTypeFilter('');
                                    setStatusFilter('');
                                }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                isActive
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 5. Search & Advanced Filter Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                    
                    {/* Search */}
                    <div className="lg:col-span-4 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search patient, UHID, encounter ID, complaint..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
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

                    {/* Encounter Type */}
                    <div className="lg:col-span-2">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Care Types</option>
                            <option value="opd">OPD</option>
                            <option value="ipd">IPD</option>
                            <option value="emergency">Emergency</option>
                            <option value="day_care">Day Care</option>
                            <option value="procedure">Procedure</option>
                        </select>
                    </div>

                    {/* Doctor */}
                    <div className="lg:col-span-2">
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Attending Doctors</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    Dr. {doc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Department */}
                    <div className="lg:col-span-2">
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="lg:col-span-2">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                    </div>

                </div>

                {hasActiveFilters && (
                    <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Clear Filters</span>
                        </button>
                    </div>
                )}
            </div>

            {/* 6. Enterprise Clinical Encounter Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                
                {/* LOADING STATE */}
                {loadingEncounters ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                        <span className="text-xs text-slate-500 font-medium">Loading clinical encounters...</span>
                    </div>
                ) : encountersError && encounters.length === 0 ? (
                    /* ERROR STATE WITH RETRY */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {encountersError.isPermission ? "Access Denied" : "Unable to load clinical encounters"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                            {encountersError.isPermission
                                ? "You don't have permission to access clinical encounters."
                                : "We couldn't retrieve the latest encounter records. Please check your connection and try again."}
                        </p>
                        {!encountersError.isPermission && (
                            <button
                                type="button"
                                onClick={fetchEncountersList}
                                disabled={loadingEncounters}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry</span>
                            </button>
                        )}
                    </div>
                ) : encounters.length === 0 ? (
                    /* CLEAN EMPTY STATE */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                            <ClipboardList className="w-7 h-7 text-teal-500" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {hasActiveFilters ? 'No encounters match the current filters' : 'No clinical encounters found'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {hasActiveFilters
                                ? 'Adjust or clear your search terms and filters to view clinical visits.'
                                : 'There are no patient encounter records recorded for this hospital yet.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    /* ENTERPRISE ENCOUNTER RECORDS TABLE */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Patient</th>
                                    <th className="py-3 px-4">UHID / Demographics</th>
                                    <th className="py-3 px-4">Doctor</th>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4">Encounter / Type</th>
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Reason / Complaint</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                {encounters.map((enc) => (
                                    <tr
                                        key={enc.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Patient */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {enc.patient?.name || 'Patient'}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                                                {[
                                                    enc.patient?.gender,
                                                    enc.patient?.date_of_birth ? `${new Date().getFullYear() - new Date(enc.patient.date_of_birth).getFullYear()}y` : null,
                                                    enc.blood_group || enc.patient?.blood_group
                                                ].filter(Boolean).join(' • ')}
                                            </div>
                                        </td>

                                        {/* UHID / Demographics */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                                                {enc.patient?.uhid || `UHID-${(enc.patient_id || enc.id).slice(0, 8).toUpperCase()}`}
                                            </span>
                                        </td>

                                        {/* Doctor */}
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                Dr. {enc.doctor?.name || 'Physician'}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                                {enc.doctor?.specialization || 'Consultant'}
                                            </p>
                                        </td>

                                        {/* Department */}
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {enc.department?.name || 'General OPD'}
                                            </span>
                                        </td>

                                        {/* Encounter Number & Type */}
                                        <td className="py-3 px-4">
                                            <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {enc.encounter_number || enc.id.slice(0, 8).toUpperCase()}
                                            </p>
                                            <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                                                enc.encounter_type === 'emergency'
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                    : enc.encounter_type === 'ipd'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                    : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                            }`}>
                                                {enc.encounter_type || 'OPD'}
                                            </span>
                                        </td>

                                        {/* Date & Time */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {formatDateTime(enc.created_at)}
                                            </span>
                                        </td>

                                        {/* Reason / Complaint */}
                                        <td className="py-3 px-4 max-w-[160px]">
                                            <p className="truncate text-slate-700 dark:text-slate-300">
                                                {enc.chief_complaint || '—'}
                                            </p>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <StatusBadge status={enc.status} size="sm" />
                                        </td>

                                        {/* Net Amount */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                                ₹{parseFloat(enc.net_amount || 0).toLocaleString('en-IN')}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedEncounter(enc);
                                                    setIsDrawerOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                title="Open Encounter Workspace"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loadingEncounters && encounters.length > 0 && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total encounters)
                        </span>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                )}
            </div>

            {/* 7. Workspace Drawer */}
            <EncounterDetailsDrawer
                encounter={selectedEncounter}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                staffRole={staffRole}
            />

        </div>
    );
}
