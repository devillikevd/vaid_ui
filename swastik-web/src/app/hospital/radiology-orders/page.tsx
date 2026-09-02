'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    ScanLine,
    RefreshCw,
    Search,
    User,
    Building2,
    Calendar,
    Clock,
    Eye,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    Users,
    Activity,
    Stethoscope,
    FileText,
    ArrowRight,
    Play,
    Check,
    AlertTriangle,
    ShieldCheck,
    Loader2,
    ExternalLink,
    QrCode,
    CheckCheck,
    Radio,
    Zap,
    Film
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { RadiologyDetailsDrawer } from '@/components/hospital/radiology/RadiologyDetailsDrawer';
import { NewRadiologyOrderModal } from '@/components/hospital/radiology/NewRadiologyOrderModal';

const PAGE_SIZE = 15;

export default function RadiologyOrdersPage() {
    const toast = useToast();

    // ── DATA STATES ──
    const [orders, setOrders] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [doctors, setDoctors] = useState<any[]>([]);
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [ordersError, setOrdersError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingKpis, setLoadingKpis] = useState(true);
    const [kpisError, setKpisError] = useState<boolean>(false);

    // ── TABS & FILTERS ──
    const [activeTab, setActiveTab] = useState<'roster' | 'scheduled' | 'inprogress' | 'reporting' | 'priority'>('roster');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalityFilter, setModalityFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [page, setPage] = useState(1);

    // ── MODALS & DRAWER ──
    const [selectedStudy, setSelectedStudy] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH RADIOLOGY STUDIES ──
    const fetchOrdersList = useCallback(async () => {
        setLoadingOrders(true);
        setOrdersError(null);
        try {
            const queryParams: Record<string, any> = {
                page,
                limit: PAGE_SIZE,
            };
            if (statusFilter) queryParams.status = statusFilter;
            if (modalityFilter) queryParams.modality = modalityFilter;
            if (priorityFilter) queryParams.priority = priorityFilter;
            if (doctorFilter) queryParams.doctorId = doctorFilter;
            if (dateFilter) queryParams.date = dateFilter;

            const res = await hospitalApi.getRadiologyOrders(queryParams);

            if (res && res.success) {
                const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                setOrders(raw);
                setPagination(
                    res.pagination ||
                    (res.data as any)?.pagination ||
                    { page: 1, totalPages: 1, total: raw.length }
                );
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load radiology data';
                const isPerm = res?.status === 401 || res?.status === 403;
                setOrdersError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load radiology data';
            const isPerm = err.status === 401 || err.status === 403;
            setOrdersError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingOrders(false);
        }
    }, [page, statusFilter, modalityFilter, priorityFilter, doctorFilter, dateFilter]);

    // ── FETCH KPIS ──
    const fetchKpis = useCallback(async () => {
        setLoadingKpis(true);
        setKpisError(false);
        try {
            const res = await hospitalApi.getRadiologyKpis(dateFilter || undefined);
            if (res && res.success) {
                setKpis(res.data ?? res);
            } else {
                setKpisError(true);
            }
        } catch {
            setKpisError(true);
        } finally {
            setLoadingKpis(false);
        }
    }, [dateFilter]);

    // ── FETCH METADATA (DOCTORS & ADMISSIONS) ──
    const fetchMetadata = useCallback(async () => {
        try {
            const [dRes, admRes, roleRes] = await Promise.allSettled([
                hospitalApi.getDoctors(1, '', 100),
                hospitalApi.getAdmissions({ status: 'admitted', limit: 100 }),
                hospitalApi.getMyStaffRole(),
            ]);

            if (dRes.status === 'fulfilled' && (dRes.value as any)?.success) {
                const rawDocs = (dRes.value as any).doctors || (dRes.value as any).data?.doctors || (dRes.value as any).data || [];
                setDoctors(Array.isArray(rawDocs) ? rawDocs : []);
            }
            if (admRes.status === 'fulfilled' && (admRes.value as any)?.success) {
                const rawAdms = (admRes.value as any).data?.data || (admRes.value as any).data || [];
                setAdmissions(Array.isArray(rawAdms) ? rawAdms : []);
            }
            if (roleRes.status === 'fulfilled' && (roleRes.value as any)?.success && (roleRes.value as any)?.staffRole) {
                setStaffRole((roleRes.value as any).staffRole);
            }
        } catch (err) {
            console.error('Failed to load radiology metadata:', err);
        }
    }, []);

    // Refresh all data
    const refreshAll = useCallback(() => {
        fetchOrdersList();
        fetchKpis();
        fetchMetadata();
    }, [fetchOrdersList, fetchKpis, fetchMetadata]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Polling fallback
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAll();
        }, 25000);
        return () => clearInterval(interval);
    }, [refreshAll]);

    // Realtime Socket Updates
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            refreshAll();
        };

        socket.on('radiology:created', handleUpdate);
        socket.on('radiology:updated', handleUpdate);
        socket.on('radiology:scheduled', handleUpdate);
        socket.on('radiology:completed', handleUpdate);

        return () => {
            socket.off('radiology:created', handleUpdate);
            socket.off('radiology:updated', handleUpdate);
            socket.off('radiology:scheduled', handleUpdate);
            socket.off('radiology:completed', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Client search filter
    const displayedOrders = useMemo(() => {
        if (!deferredSearch) return orders;
        return orders.filter((o) => {
            const pName = (o.patient?.name || '').toLowerCase();
            const mod = (o.modality || '').toLowerCase();
            const part = (o.body_part || '').toLowerCase();
            const desc = (o.study_description || '').toLowerCase();
            const doc = (o.orderingDoctor?.name || '').toLowerCase();
            const oNum = (o.order_number || o.id || '').toLowerCase();
            return pName.includes(deferredSearch) ||
                mod.includes(deferredSearch) ||
                part.includes(deferredSearch) ||
                desc.includes(deferredSearch) ||
                doc.includes(deferredSearch) ||
                oNum.includes(deferredSearch);
        });
    }, [orders, deferredSearch]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, statusFilter, modalityFilter, priorityFilter, doctorFilter, dateFilter]);

    const hasActiveFilters = Boolean(searchQuery || statusFilter || modalityFilter || priorityFilter || doctorFilter || dateFilter);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setModalityFilter('');
        setPriorityFilter('');
        setDoctorFilter('');
        setDateFilter('');
        setPage(1);
    };

    // Update Status Action
    const handleUpdateStatus = async (studyId: string, status: string, statusData?: Record<string, any>) => {
        try {
            const res = await hospitalApi.updateRadiologyOrderStatus(studyId, status, statusData);
            if (res && res.success) {
                toast.success('Radiology Study Updated', `Status changed to ${status}.`);
                refreshAll();
            } else {
                toast.error('Update Failed', res?.message || 'Could not update study status.');
            }
        } catch (err: any) {
            toast.error('Update Failed', err.message || 'Could not update study status.');
        }
    };

    // Create Radiology Order
    const handleCreateOrder = async (formData: Record<string, any>) => {
        try {
            const res = await hospitalApi.createRadiologyOrder(formData);
            if (res && res.success) {
                toast.success('Imaging Order Placed', 'Diagnostic radiology study has been scheduled.');
                refreshAll();
                return true;
            }
            toast.error('Order Failed', res?.message || 'Could not place imaging order.');
            return false;
        } catch (err: any) {
            toast.error('Order Failed', err.message || 'Could not place imaging order.');
            return false;
        }
    };

    const isGlobalRefreshing = loadingOrders || loadingKpis;
    const canManageRadiology = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'doctor', 'nurse'].includes(staffRole);

    const getModalityBadge = (m?: string) => {
        const mod = (m || 'xray').toLowerCase();
        if (mod.includes('mri')) return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300';
        if (mod.includes('ct')) return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300';
        if (mod.includes('ultra') || mod.includes('usg')) return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300';
        if (mod.includes('mammo')) return 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300';
        if (mod.includes('pet')) return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300';
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-gray-800 dark:text-slate-200';
    };

    return (
        <div className="space-y-4">
            
            {/* 1. Page Header with Enterprise Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <ScanLine className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Radiology
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
                                Diagnostic imaging, scan scheduling, study tracking and radiology reporting.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={refreshAll}
                        disabled={isGlobalRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGlobalRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    {canManageRadiology && (
                        <button
                            type="button"
                            onClick={() => setIsNewOrderModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ New Imaging Order</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Top Real Database-Backed KPI Row (8 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                
                {/* 1: Today's Studies */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter(''); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && !statusFilter
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Today's Studies</span>
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.total_studies_today ?? 0
                        )}
                    </span>
                </button>

                {/* 2: Pending Scheduling */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('ordered'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'ordered'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Pending Schedule</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.pending_scheduling ?? 0
                        )}
                    </span>
                </button>

                {/* 3: Scheduled Today */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('scheduled'); setStatusFilter('scheduled'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'scheduled'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Scheduled Today</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.scheduled_today ?? 0
                        )}
                    </span>
                </button>

                {/* 4: In Progress / Imaging */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('inprogress'); setStatusFilter('in_progress'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'inprogress'
                            ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-indigo-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">In Progress</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.in_progress ?? 0
                        )}
                    </span>
                </button>

                {/* 5: Reporting Queue */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('reporting'); setStatusFilter('completed'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'reporting'
                            ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-purple-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Reporting Queue</span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.reporting_queue ?? 0
                        )}
                    </span>
                </button>

                {/* 6: Reports Ready */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('report_ready'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'report_ready'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Reports Ready</span>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.reports_ready ?? 0
                        )}
                    </span>
                </button>

                {/* 7: Released Today */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('report_approved'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'report_approved'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Released Today</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.released_today ?? 0
                        )}
                    </span>
                </button>

                {/* 8: STAT / Critical */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('priority'); setPriorityFilter('stat'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'priority'
                            ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block truncate">STAT / Critical</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.stat_critical ?? 0
                        )}
                    </span>
                </button>

            </div>

            {/* 3. Horizontal Modality Overview Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                    { id: 'xray', label: 'X-Ray (DR)', icon: Film, count: kpis?.modality_breakdown?.xray ?? 0, color: 'text-slate-700 dark:text-slate-200' },
                    { id: 'ct', label: 'CT Scan', icon: ScanLine, count: kpis?.modality_breakdown?.ct ?? 0, color: 'text-blue-700 dark:text-blue-300' },
                    { id: 'mri', label: 'MRI', icon: Radio, count: kpis?.modality_breakdown?.mri ?? 0, color: 'text-purple-700 dark:text-purple-300' },
                    { id: 'ultrasound', label: 'Ultrasound', icon: Activity, count: kpis?.modality_breakdown?.ultrasound ?? 0, color: 'text-teal-700 dark:text-teal-300' },
                    { id: 'other', label: 'Specialized', icon: Zap, count: kpis?.modality_breakdown?.other ?? 0, color: 'text-amber-700 dark:text-amber-300' },
                ].map((mod) => (
                    <button
                        key={mod.id}
                        type="button"
                        onClick={() => {
                            setModalityFilter(modalityFilter === mod.id ? '' : mod.id);
                            setPage(1);
                        }}
                        className={`p-2 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            modalityFilter === mod.id
                                ? 'bg-teal-50/90 border-teal-400 dark:bg-teal-950/60 dark:border-teal-700 shadow-2xs'
                                : 'bg-white dark:bg-gray-900 border-slate-200/70 dark:border-gray-800 hover:border-teal-300'
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <mod.icon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {mod.label}
                            </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-gray-800">
                            {loadingKpis ? '—' : kpisError || kpis === null ? '—' : mod.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* 4. Interactive 5-Stage Visual Workflow Pipeline */}
            <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto text-xs font-semibold">
                    
                    <button
                        type="button"
                        onClick={() => { setActiveTab('roster'); setStatusFilter('ordered'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusFilter === 'ordered'
                                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>1. Ordered</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
                            {loadingKpis ? '—' : kpisError || kpis === null ? '—' : kpis.pending_scheduling ?? 0}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('scheduled'); setStatusFilter('scheduled'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusFilter === 'scheduled'
                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>2. Scheduled</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200 text-blue-900 font-bold">
                            {loadingKpis ? '—' : kpisError || kpis === null ? '—' : kpis.scheduled_today ?? 0}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('inprogress'); setStatusFilter('in_progress'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusFilter === 'in_progress'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>3. Imaging</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200 text-indigo-900 font-bold">
                            {loadingKpis ? '—' : kpisError || kpis === null ? '—' : kpis.in_progress ?? 0}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('reporting'); setStatusFilter('completed'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusFilter === 'completed'
                                ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>4. Reporting</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 text-purple-900 font-bold">
                            {loadingKpis ? '—' : kpisError || kpis === null ? '—' : kpis.reporting_queue ?? 0}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('roster'); setStatusFilter('report_approved'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusFilter === 'report_approved'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>5. Released</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-bold">
                            {loadingKpis ? '—' : kpisError || kpis === null ? '—' : kpis.released_today ?? 0}
                        </span>
                    </button>

                </div>
            </div>

            {/* 5. Directory Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'roster', label: 'All Studies Worklist', count: pagination.total },
                    { id: 'scheduled', label: 'Scheduled Queue', count: kpis?.scheduled_today ?? 0 },
                    { id: 'inprogress', label: 'Active Scans & Imaging', count: kpis?.in_progress ?? 0 },
                    { id: 'reporting', label: 'Reporting & Radiologist Queue', count: kpis?.reporting_queue ?? 0 },
                    { id: 'priority', label: 'Priority & STAT Alerts', count: kpis?.stat_critical ?? 0 },
                ].map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(item.id as any);
                                if (item.id === 'scheduled') setStatusFilter('scheduled');
                                else if (item.id === 'inprogress') setStatusFilter('in_progress');
                                else if (item.id === 'reporting') setStatusFilter('completed');
                                else if (item.id === 'priority') setPriorityFilter('stat');
                                else { setStatusFilter(''); setPriorityFilter(''); }
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isActive
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span>{item.label}</span>
                            {item.count !== undefined && item.count > 0 && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    isActive
                                        ? 'bg-teal-800 text-teal-100'
                                        : 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 6. Search & Advanced Filter Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                    
                    {/* Search */}
                    <div className="lg:col-span-4 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search patient, UHID, study, modality, doctor..."
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

                    {/* Modality Filter */}
                    <div className="lg:col-span-2">
                        <select
                            value={modalityFilter}
                            onChange={(e) => setModalityFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Modalities</option>
                            <option value="xray">X-Ray (DR)</option>
                            <option value="ct">CT Scan</option>
                            <option value="mri">MRI</option>
                            <option value="ultrasound">Ultrasound (USG)</option>
                            <option value="mammography">Mammography</option>
                            <option value="pet_ct">PET-CT</option>
                            <option value="dexa">DEXA</option>
                        </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="lg:col-span-2">
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Priorities</option>
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="stat">STAT / Emergency</option>
                        </select>
                    </div>

                    {/* Doctor Filter */}
                    <div className="lg:col-span-2">
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Doctors</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    Dr. {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="lg:col-span-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="ordered">Ordered</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="report_ready">Report Ready</option>
                            <option value="report_approved">Released</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
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

            {/* 7. Main Radiology Worklist Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                {loadingOrders ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                        <span className="text-xs text-slate-500 font-medium">Loading radiology studies...</span>
                    </div>
                ) : ordersError && orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {ordersError.isPermission ? "Access Denied" : "Unable to load radiology data"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                            {ordersError.isPermission
                                ? "You don't have permission to access radiology operations."
                                : "We couldn't retrieve the imaging records. Please check your connection and try again."}
                        </p>
                        {!ordersError.isPermission && (
                            <button
                                type="button"
                                onClick={fetchOrdersList}
                                disabled={loadingOrders}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry</span>
                            </button>
                        )}
                    </div>
                ) : displayedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                            <ScanLine className="w-7 h-7 text-teal-500" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {hasActiveFilters ? 'No imaging studies match your current filters' : 'No radiology orders found'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {hasActiveFilters
                                ? 'Try adjusting or clearing your search criteria.'
                                : 'Order X-Ray, CT, MRI, and Ultrasound imaging studies for hospital patients.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Clear Filters
                            </button>
                        ) : canManageRadiology && (
                            <button
                                type="button"
                                onClick={() => setIsNewOrderModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Place First Imaging Order</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Patient & UHID</th>
                                    <th className="py-3 px-4">Study / Modality</th>
                                    <th className="py-3 px-4">Ordering Doctor</th>
                                    <th className="py-3 px-4">Body Part & Contrast</th>
                                    <th className="py-3 px-4">Priority</th>
                                    <th className="py-3 px-4">Scheduled / Completed</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                {displayedOrders.map((study) => (
                                    <tr
                                        key={study.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Patient */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                {study.patient?.name || 'Patient'}
                                            </div>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                {study.patient?.gender ? `${study.patient.gender} • ` : ''}
                                                {study.admission?.admission_number || 'OPD/IPD'}
                                            </span>
                                        </td>

                                        {/* Study & Modality */}
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[220px]">
                                                {study.study_description || `${study.modality?.toUpperCase()} ${study.body_part || 'Study'}`}
                                            </div>
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${getModalityBadge(study.modality)}`}>
                                                {study.modality || 'X-Ray'}
                                            </span>
                                        </td>

                                        {/* Ordering Doctor */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                                Dr. {study.orderingDoctor?.name || 'Physician'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block">
                                                {study.orderingDoctor?.specialization || 'Clinical Staff'}
                                            </span>
                                        </td>

                                        {/* Body Part & Contrast */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {study.body_part || 'General'}
                                            </span>
                                            {study.contrast_required && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 block w-fit mt-0.5">
                                                    + Contrast
                                                </span>
                                            )}
                                        </td>

                                        {/* Priority */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                study.priority === 'stat' || study.priority === 'emergency'
                                                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                                    : study.priority === 'urgent'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {study.priority || 'routine'}
                                            </span>
                                        </td>

                                        {/* Scheduled / Completed */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                                {study.scheduled_at
                                                    ? new Date(study.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : study.created_at
                                                    ? new Date(study.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <StatusBadge status={study.status || 'ordered'} size="sm" />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedStudy(study);
                                                    setIsDrawerOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                title="Open Radiology Workspace"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Open</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loadingOrders && orders.length > 0 && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total studies)
                        </span>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                )}
            </div>

            {/* 8. Details Workspace Drawer */}
            <RadiologyDetailsDrawer
                study={selectedStudy}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUpdateStatus={handleUpdateStatus}
                canManageRadiology={canManageRadiology}
            />

            {/* 9. New Radiology Order Modal */}
            <NewRadiologyOrderModal
                isOpen={isNewOrderModalOpen}
                onClose={() => setIsNewOrderModalOpen(false)}
                onSubmit={handleCreateOrder}
                admissions={admissions}
                doctors={doctors}
            />

        </div>
    );
}
