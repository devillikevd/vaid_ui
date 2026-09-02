'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    ListOrdered,
    Plus,
    Search,
    RefreshCw,
    Clock,
    User,
    CheckCircle2,
    Play,
    SkipForward,
    AlertCircle,
    Building2,
    Stethoscope,
    Ticket,
    Eye,
    X,
    Radio,
    Timer,
    Users,
    Activity,
    Layers,
    Loader2,
    Calendar,
    Phone,
    ShieldAlert
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GenerateTokenModal } from '@/components/hospital/queue/GenerateTokenModal';
import { QueuePatientDrawer } from '@/components/hospital/queue/QueuePatientDrawer';

export default function OPDQueuePage() {
    const [queueData, setQueueData] = useState<any>(null);
    const [statsData, setStatsData] = useState<any>(null);
    const [loadingQueue, setLoadingQueue] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [queueError, setQueueError] = useState<string | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'in_consultation' | 'completed' | 'skipped'>('all');

    // Aux lists
    const [doctors, setDoctors] = useState<{ id: string; name: string; specialization?: string; departmentId?: string; departmentName?: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // Modals & Drawers
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedQueueEntry, setSelectedQueueEntry] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [callingDoctorId, setCallingDoctorId] = useState<string | null>(null);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // Socket connection status
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // Initial aux data
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
                            specialization: d.specialization || d.doctor?.specialization || 'Physician',
                            departmentId: d.department_id || d.department?.id || '',
                            departmentName: d.department_name || d.department?.name || '',
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
                console.error('Failed to load queue aux data:', err);
            }
        };

        fetchAux();
    }, []);

    // Main queue fetch
    const fetchQueueList = useCallback(async () => {
        setLoadingQueue(true);
        setQueueError(null);
        try {
            const params: Record<string, string> = {};
            if (doctorFilter) params.doctorId = doctorFilter;
            if (departmentFilter) params.departmentId = departmentFilter;
            if (statusFilter) params.status = statusFilter;
            if (dateFilter) params.date = dateFilter;

            const res = await hospitalApi.getQueue(params);
            if (res && res.success) {
                setQueueData(res.data ?? res);
                setLastUpdated(new Date());
            } else {
                setQueueError(res?.message || 'Unable to load OPD queue data.');
            }
        } catch (err: any) {
            setQueueError(err.message || 'Unable to load OPD queue. Network or server error occurred.');
        } finally {
            setLoadingQueue(false);
        }
    }, [doctorFilter, departmentFilter, statusFilter, dateFilter]);

    // Stats fetch
    const fetchQueueStatsData = useCallback(async () => {
        setLoadingStats(true);
        setStatsError(null);
        try {
            const res = await hospitalApi.getQueueStats();
            if (res && res.success) {
                setStatsData(res.data ?? res);
            } else {
                setStatsError(res?.message || 'Unable to calculate queue metrics.');
            }
        } catch (err: any) {
            setStatsError(err.message || 'Unable to load queue metrics.');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const fetchAllData = useCallback(() => {
        fetchQueueList();
        fetchQueueStatsData();
    }, [fetchQueueList, fetchQueueStatsData]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Polling fallback every 15s
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAllData();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchAllData]);

    // Socket updates
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            fetchAllData();
        };

        socket.on('queue:updated', handleUpdate);
        socket.on('appointment:updated', handleUpdate);
        socket.on('consultation:updated', handleUpdate);

        return () => {
            socket.off('queue:updated', handleUpdate);
            socket.off('appointment:updated', handleUpdate);
            socket.off('consultation:updated', handleUpdate);
        };
    }, [socket, fetchAllData]);

    // Operational Actions
    const handleCallNext = async (doctorId: string) => {
        if (!doctorId) return;
        setCallingDoctorId(doctorId);
        try {
            await hospitalApi.callNextPatient(doctorId);
            fetchAllData();
        } catch (err: any) {
            console.error('Failed to call next patient:', err);
        } finally {
            setCallingDoctorId(null);
        }
    };

    const handleStatusUpdate = async (id: string, status: string, notes?: string) => {
        try {
            await hospitalApi.updateQueueStatus(id, status, notes);
            fetchAllData();
            if (selectedQueueEntry?.id === id) {
                setSelectedQueueEntry((prev: any) => prev ? { ...prev, status } : null);
            }
        } catch (err: any) {
            console.error('Failed to update status:', err);
        }
    };

    const q = queueData || {};
    const rawQueue: any[] = q.queue || [];
    const qStats = q.stats || {};
    const stats = statsData || {};

    // Filter queue client-side for search / priority / tabs
    const filteredQueue = useMemo(() => {
        return rawQueue.filter((item: any) => {
            if (activeTab === 'waiting' && item.status !== 'waiting') return false;
            if (activeTab === 'in_consultation' && item.status !== 'in_consultation') return false;
            if (activeTab === 'completed' && item.status !== 'completed') return false;
            if (activeTab === 'skipped' && !['skipped', 'no_show', 'cancelled'].includes(item.status)) return false;

            if (priorityFilter && String(item.priority) !== priorityFilter) return false;

            if (deferredSearch) {
                const tokenStr = (item.display_token || `${item.token_prefix}-${item.token_number}`).toLowerCase();
                const patientStr = (item.patient?.name || item.patient_name || '').toLowerCase();
                const uhidStr = (item.patient?.uhid || (item.patient_id ? `uhid-${item.patient_id.slice(0, 8)}` : '')).toLowerCase();
                const docStr = (item.doctor?.name || '').toLowerCase();
                const phoneStr = (item.patient_phone || '').toLowerCase();

                if (
                    !tokenStr.includes(deferredSearch) &&
                    !patientStr.includes(deferredSearch) &&
                    !uhidStr.includes(deferredSearch) &&
                    !docStr.includes(deferredSearch) &&
                    !phoneStr.includes(deferredSearch)
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [rawQueue, activeTab, priorityFilter, deferredSearch]);

    // Active Now Serving list
    const nowServingList = useMemo(() => {
        return rawQueue.filter((item: any) => item.status === 'in_consultation');
    }, [rawQueue]);

    // Up Next list (waiting, sorted by priority desc, token_number asc)
    const upNextList = useMemo(() => {
        return rawQueue
            .filter((item: any) => item.status === 'waiting')
            .slice(0, 3);
    }, [rawQueue]);

    const hasActiveFilters = Boolean(
        searchQuery ||
        doctorFilter ||
        departmentFilter ||
        statusFilter ||
        priorityFilter ||
        activeTab !== 'all'
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setDoctorFilter('');
        setDepartmentFilter('');
        setStatusFilter('');
        setPriorityFilter('');
        setActiveTab('all');
    };

    const formatTimeOnly = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return d;
        }
    };

    const formatLastUpdatedTime = () => {
        if (!lastUpdated) return '—';
        return lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const priorityBadge = (p?: number) => {
        switch (p) {
            case 3:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200">Emergency</span>;
            case 2:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200">VIP</span>;
            case 1:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200">Urgent</span>;
            case 0:
            default:
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400">Normal</span>;
        }
    };

    return (
        <div className="space-y-4">
            
            {/* 1. Header with OPD Queue Control Center Identity */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <ListOrdered className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    OPD Queue
                                </h1>
                                {isSocketConnected ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        <span>LIVE</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                        <span>Auto-sync (15s)</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Manage live OPD tokens, waiting patients and doctor queues in real time.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchAllData}
                        disabled={loadingQueue || loadingStats}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${(loadingQueue || loadingStats) ? 'animate-spin text-teal-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Issue Token</span>
                    </button>
                </div>
            </div>

            {/* 2. KPI Row with strict error and loading handling */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* KPI 1: Waiting */}
                <button
                    type="button"
                    onClick={() => { if (!loadingStats && !statsError) { setActiveTab('waiting'); setStatusFilter('waiting'); } }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'waiting'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Waiting</span>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            qStats.waiting ?? stats.waiting ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 2: In Consultation */}
                <button
                    type="button"
                    onClick={() => { if (!loadingStats && !statsError) { setActiveTab('in_consultation'); setStatusFilter('in_consultation'); } }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'in_consultation'
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">In Consultation</span>
                        <Radio className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            qStats.in_consultation ?? stats.in_consultation ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 3: Next to Serve */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Next to Serve</span>
                        <Ticket className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {loadingQueue ? (
                            <span className="inline-block w-12 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : queueError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            q.next_token || 'None'
                        )}
                    </div>
                </div>

                {/* KPI 4: Completed */}
                <button
                    type="button"
                    onClick={() => { if (!loadingStats && !statsError) { setActiveTab('completed'); setStatusFilter('completed'); } }}
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
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            qStats.completed ?? stats.completed ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 5: Total Tokens */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Total Tokens</span>
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : (
                            qStats.total ?? stats.total_tokens ?? 0
                        )}
                    </div>
                </div>

                {/* KPI 6: Average Wait */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Average Wait</span>
                        <Timer className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingStats ? (
                            <span className="inline-block w-12 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-xs text-rose-500 font-medium">Unavailable</span>
                        ) : qStats.avg_wait_minutes ? (
                            `${qStats.avg_wait_minutes} mins`
                        ) : (
                            '—'
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Live Token Control Center: NOW SERVING & UP NEXT (Clean White/Light Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* NOW SERVING CARD — Clean Light Theme with Teal Accent */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                                NOW SERVING IN OPD
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                                {loadingQueue ? '—' : `${nowServingList.length} In Session`}
                            </span>
                        </div>

                        {loadingQueue ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                                <span className="text-xs text-slate-400">Loading current session...</span>
                            </div>
                        ) : queueError ? (
                            <div className="py-6 text-center text-rose-500 text-xs font-medium">
                                Queue data unavailable
                            </div>
                        ) : nowServingList.length === 0 ? (
                            <div className="py-6 text-center">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    No patient is currently in consultation.
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Call the next waiting token to begin session.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-2.5">
                                {nowServingList.slice(0, 2).map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/70 dark:border-teal-800/50 flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-mono font-extrabold flex items-center justify-center text-sm border border-teal-300 dark:border-teal-700">
                                                {item.display_token || `${item.token_prefix}-${item.token_number}`}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                    {item.patient?.name || item.patient_name || 'Patient'}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    Dr. {item.doctor?.name} • {item.department?.name || 'General OPD'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusUpdate(item.id, 'completed')}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                                            >
                                                Complete
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedQueueEntry(item);
                                                    setIsDrawerOpen(true);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                                title="Open Workspace"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Queue Status: Active</span>
                        <span>Last updated: {formatLastUpdatedTime()}</span>
                    </div>
                </div>

                {/* UP NEXT CARD — Clean Light Theme */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                UP NEXT IN QUEUE
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                                {loadingQueue ? '—' : `${qStats.waiting || 0} Waiting`}
                            </span>
                        </div>

                        {loadingQueue ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                <span className="text-xs text-slate-400">Loading next patient...</span>
                            </div>
                        ) : queueError ? (
                            <div className="py-6 text-center text-rose-500 text-xs font-medium">
                                Queue data unavailable
                            </div>
                        ) : upNextList.length === 0 ? (
                            <div className="py-6 text-center">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    No patients are currently waiting in the OPD queue.
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Click "Issue Token" to register walk-in patients.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-2.5">
                                {upNextList.slice(0, 2).map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="p-3 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700 flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-extrabold flex items-center justify-center text-sm border border-amber-200 dark:border-amber-800">
                                                {item.display_token || `${item.token_prefix}-${item.token_number}`}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                    {item.patient?.name || item.patient_name || 'Patient'}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    Dr. {item.doctor?.name} • {item.department?.name || 'OPD'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleCallNext(item.doctor_id)}
                                                disabled={callingDoctorId === item.doctor_id}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                                            >
                                                {callingDoctorId === item.doctor_id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Play className="w-3 h-3" />
                                                )}
                                                <span>Call Next</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Turn Estimate: ~{upNextList[0]?.estimated_wait_minutes || 10} mins</span>
                        <span>FIFO with Emergency Priority</span>
                    </div>
                </div>

            </div>

            {/* 4. Department Queue Control Overview */}
            {!loadingStats && stats.by_department && stats.by_department.length > 0 && (
                <div className="p-3.5 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-teal-600" />
                            DEPARTMENT QUEUES
                        </span>
                        <span className="text-[10px] text-slate-400">Click any department to filter queue</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {stats.by_department.map((dept: any) => (
                            <button
                                key={dept.name}
                                type="button"
                                onClick={() => {
                                    const matched = departments.find((d) => d.name.toLowerCase() === dept.name.toLowerCase());
                                    setDepartmentFilter(matched ? matched.id : '');
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    departments.find((d) => d.id === departmentFilter)?.name === dept.name
                                        ? 'bg-teal-50 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                                        : 'bg-slate-50/70 dark:bg-gray-800/40 border-slate-200/70 dark:border-gray-800 hover:border-teal-300'
                                }`}
                            >
                                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                    {dept.name}
                                </p>
                                <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] font-medium">
                                    <div>
                                        <span className="text-slate-400 block">Wait</span>
                                        <span className="font-bold text-amber-600">{dept.waiting || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Active</span>
                                        <span className="font-bold text-teal-600">{dept.in_consultation || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Done</span>
                                        <span className="font-bold text-emerald-600">{dept.completed || 0}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Doctor Roster Queue Overview */}
            {!loadingStats && stats.by_doctor && stats.by_doctor.length > 0 && (
                <div className="p-3.5 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                            DOCTOR QUEUE ROSTER
                        </span>
                        <span className="text-[10px] text-slate-400">Doctor-wise queue tracking</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {stats.by_doctor.map((docItem: any, idx: number) => {
                            const docId = docItem.doctor?.id || doctors[idx]?.id;
                            const isConsulting = docItem.in_consultation > 0;
                            return (
                                <div
                                    key={idx}
                                    className="p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-800/40 border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                            Dr. {docItem.doctor?.name || 'Physician'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {docItem.department?.name || 'General OPD'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                                            <span className="font-semibold text-amber-600">
                                                {docItem.waiting || 0} Waiting
                                            </span>
                                            <span>•</span>
                                            <span className="font-semibold text-emerald-600">
                                                {docItem.completed || 0} Done
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            isConsulting
                                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                                                : 'bg-slate-200 text-slate-700 dark:bg-gray-700 dark:text-slate-300'
                                        }`}>
                                            {isConsulting ? 'Consulting' : 'Available'}
                                        </span>

                                        {docId && docItem.waiting > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleCallNext(docId)}
                                                disabled={callingDoctorId === docId}
                                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                            >
                                                Call Next
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 6. Filter Toolbar & Segmented Tabs */}
            <div className="space-y-2">
                
                {/* Segmented Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                    {[
                        { id: 'all', label: 'All Tokens' },
                        { id: 'waiting', label: `Waiting (${loadingStats || statsError ? '—' : qStats.waiting || 0})` },
                        { id: 'in_consultation', label: `In Consultation (${loadingStats || statsError ? '—' : qStats.in_consultation || 0})` },
                        { id: 'completed', label: `Completed (${loadingStats || statsError ? '—' : qStats.completed || 0})` },
                        { id: 'skipped', label: `Skipped / No Show (${loadingStats || statsError ? '—' : (qStats.skipped || 0) + (qStats.no_show || 0)})` },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    if (tab.id === 'all') setStatusFilter('');
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

                {/* Filter Controls */}
                <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                        
                        {/* Search */}
                        <div className="lg:col-span-4 relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search token, patient name, UHID, phone, doctor..."
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

                        {/* Doctor */}
                        <div className="lg:col-span-2">
                            <select
                                value={doctorFilter}
                                onChange={(e) => setDoctorFilter(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="">All Doctors</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        Dr. {doc.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="lg:col-span-2">
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="">All Priorities</option>
                                <option value="0">Normal (0)</option>
                                <option value="1">Urgent (1)</option>
                                <option value="2">VIP (2)</option>
                                <option value="3">Emergency (3)</option>
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

            </div>

            {/* 7. Live Waiting Queue Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                
                {/* Loading State */}
                {loadingQueue ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                        <span className="text-xs text-slate-500 font-medium">Loading live OPD queue...</span>
                    </div>
                ) : queueError ? (
                    /* Error State with real Retry Button */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Unable to load OPD queue
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {queueError.includes('permission') || queueError.includes('denied')
                                ? "You don't have permission to access the OPD queue for this hospital."
                                : "A server or network error occurred while fetching live queue data."}
                        </p>
                        <button
                            type="button"
                            onClick={fetchQueueList}
                            disabled={loadingQueue}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                        </button>
                    </div>
                ) : filteredQueue.length === 0 ? (
                    /* Differentiated Professional Empty States */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                            <Ticket className="w-8 h-8 text-teal-500" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {hasActiveFilters ? 'No queue entries match your filters' : 'Queue is clear'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {hasActiveFilters
                                ? 'No OPD tokens match the specified search or filter criteria.'
                                : 'No patients are currently waiting in the OPD queue. Generate a token for a walk-in patient to add them to the queue.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Reset All Filters
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsGenerateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Issue Token</span>
                            </button>
                        )}
                    </div>
                ) : (
                    /* Live Queue Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Token</th>
                                    <th className="py-3 px-4">Patient & UHID</th>
                                    <th className="py-3 px-4">Attending Doctor</th>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4">Check-in</th>
                                    <th className="py-3 px-4">Wait Time</th>
                                    <th className="py-3 px-4">Priority</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                {filteredQueue.map((item: any) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Token */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-extrabold text-sm font-mono text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800">
                                                {item.display_token || `${item.token_prefix}-${item.token_number}`}
                                            </span>
                                        </td>

                                        {/* Patient */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                                <span>{item.patient?.name || item.patient_name || 'Patient'}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                <span className="font-mono text-[10px]">
                                                    {item.patient?.uhid || (item.patient_id ? `UHID-${item.patient_id.slice(0, 8).toUpperCase()}` : 'Walk-in')}
                                                </span>
                                                {item.patient_phone && (
                                                    <span className="text-slate-400">
                                                        • {item.patient_phone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Doctor */}
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                Dr. {item.doctor?.name || 'Physician'}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                                {item.doctor?.specialization || 'Physician'}
                                            </p>
                                        </td>

                                        {/* Department */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 border border-slate-200/60 dark:border-gray-700">
                                                {item.department?.name || 'General OPD'}
                                            </span>
                                        </td>

                                        {/* Check-in */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {formatTimeOnly(item.check_in_time)}
                                            </span>
                                        </td>

                                        {/* Wait Time */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {item.status === 'in_consultation' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold text-[10px] animate-pulse">
                                                    <Radio className="w-3 h-3" />
                                                    <span>In Session</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                    ~{item.estimated_wait_minutes || 10}m
                                                </span>
                                            )}
                                        </td>

                                        {/* Priority */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {priorityBadge(item.priority)}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <StatusBadge status={item.status} size="sm" />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                {item.status === 'waiting' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusUpdate(item.id, 'in_consultation')}
                                                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                                                    >
                                                        Call
                                                    </button>
                                                )}

                                                {item.status === 'in_consultation' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusUpdate(item.id, 'completed')}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                                                    >
                                                        Complete
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedQueueEntry(item);
                                                        setIsDrawerOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                    title="Open Queue Workspace"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer Count */}
                {!loadingQueue && filteredQueue.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 text-xs text-slate-500 dark:text-slate-400">
                        Displaying <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredQueue.length}</span> tokens in OPD queue
                    </div>
                )}
            </div>

            {/* 8. Generate Token Modal */}
            <GenerateTokenModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onTokenGenerated={fetchAllData}
                doctors={doctors}
                departments={departments}
            />

            {/* 9. Queue Patient Workspace Drawer */}
            <QueuePatientDrawer
                entry={selectedQueueEntry}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onStatusUpdate={handleStatusUpdate}
                staffRole={staffRole}
            />

        </div>
    );
}
