'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    HeartPulse,
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
    Pill,
    FileText,
    ArrowRight,
    Play,
    Check,
    AlertTriangle,
    ShieldCheck,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { NursingTaskDetailsDrawer } from '@/components/hospital/nursing/NursingTaskDetailsDrawer';
import { NewNursingTaskModal } from '@/components/hospital/nursing/NewNursingTaskModal';
import { ShiftHandoverModal } from '@/components/hospital/nursing/ShiftHandoverModal';

const PAGE_SIZE = 15;

export default function NursingStationPage() {
    const toast = useToast();

    // ── DATA STATES ──
    const [tasks, setTasks] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [wards, setWards] = useState<any[]>([]);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [tasksError, setTasksError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingKpis, setLoadingKpis] = useState(true);
    const [kpisError, setKpisError] = useState<boolean>(false);

    // ── TABS & FILTERS ──
    const [activeTab, setActiveTab] = useState<'tasks' | 'patients' | 'mar'>('tasks');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [wardFilter, setWardFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [taskTypeFilter, setTaskTypeFilter] = useState('');
    const [page, setPage] = useState(1);

    // ── MODALS & DRAWER ──
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH NURSING TASKS ──
    const fetchTasksList = useCallback(async () => {
        setLoadingTasks(true);
        setTasksError(null);
        try {
            const queryParams: Record<string, any> = {
                page,
                limit: PAGE_SIZE,
            };
            if (statusFilter) queryParams.status = statusFilter;
            if (wardFilter) queryParams.wardId = wardFilter;
            if (priorityFilter) queryParams.priority = priorityFilter;
            if (taskTypeFilter) queryParams.taskType = taskTypeFilter;

            const res = await hospitalApi.getNursingTasks(queryParams);

            if (res && res.success) {
                const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                setTasks(raw);
                setPagination(
                    res.pagination ||
                    (res.data as any)?.pagination ||
                    { page: 1, totalPages: 1, total: raw.length }
                );
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load nursing tasks';
                const isPerm = res?.status === 401 || res?.status === 403;
                setTasksError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load nursing tasks';
            const isPerm = err.status === 401 || err.status === 403;
            setTasksError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingTasks(false);
        }
    }, [page, statusFilter, wardFilter, priorityFilter, taskTypeFilter]);

    // ── FETCH NURSING KPIS ──
    const fetchKpis = useCallback(async () => {
        setLoadingKpis(true);
        setKpisError(false);
        try {
            const res = await hospitalApi.getNursingKpis();
            if (res && res.success) {
                setKpis(res.data ?? res);
            } else {
                setKpisError(true);
            }
        } catch (err) {
            setKpisError(true);
        } finally {
            setLoadingKpis(false);
        }
    }, []);

    // ── FETCH ACTIVE ADMISSIONS & WARDS ──
    const fetchAdmissionsAndWards = useCallback(async () => {
        try {
            const [admRes, wardsRes, roleRes] = await Promise.allSettled([
                hospitalApi.getNursingAdmissions(),
                hospitalApi.getWards(),
                hospitalApi.getMyStaffRole(),
            ]);

            if (admRes.status === 'fulfilled' && (admRes.value as any)?.success) {
                const rawAdms = (admRes.value as any).data || [];
                setAdmissions(Array.isArray(rawAdms) ? rawAdms : []);
            }
            if (wardsRes.status === 'fulfilled' && (wardsRes.value as any)?.success) {
                const rawWards = (wardsRes.value as any).data || (wardsRes.value as any).wards || [];
                setWards(Array.isArray(rawWards) ? rawWards : []);
            }
            if (roleRes.status === 'fulfilled' && (roleRes.value as any)?.success && (roleRes.value as any)?.staffRole) {
                setStaffRole((roleRes.value as any).staffRole);
            }
        } catch (err) {
            console.error('Failed to load admissions/wards metadata:', err);
        }
    }, []);

    // Refresh all data
    const refreshAll = useCallback(() => {
        fetchTasksList();
        fetchKpis();
        fetchAdmissionsAndWards();
    }, [fetchTasksList, fetchKpis, fetchAdmissionsAndWards]);

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

    // Socket real-time updates
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            refreshAll();
        };

        socket.on('nursing_task:created', handleUpdate);
        socket.on('nursing_task:updated', handleUpdate);
        socket.on('mar:updated', handleUpdate);
        socket.on('patient:admitted', handleUpdate);

        return () => {
            socket.off('nursing_task:created', handleUpdate);
            socket.off('nursing_task:updated', handleUpdate);
            socket.off('mar:updated', handleUpdate);
            socket.off('patient:admitted', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Client search filter
    const displayedTasks = useMemo(() => {
        if (!deferredSearch) return tasks;
        return tasks.filter((t) => {
            const pName = (t.admission?.patient?.name || '').toLowerCase();
            const desc = (t.task_description || '').toLowerCase();
            const ward = (t.ward?.name || '').toLowerCase();
            const bed = (t.admission?.bed?.bed_number || '').toLowerCase();
            const nurse = (t.assignedNurse?.name || '').toLowerCase();
            return pName.includes(deferredSearch) ||
                desc.includes(deferredSearch) ||
                ward.includes(deferredSearch) ||
                bed.includes(deferredSearch) ||
                nurse.includes(deferredSearch);
        });
    }, [tasks, deferredSearch]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, statusFilter, wardFilter, priorityFilter, taskTypeFilter]);

    const hasActiveFilters = Boolean(searchQuery || statusFilter || wardFilter || priorityFilter || taskTypeFilter);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setWardFilter('');
        setPriorityFilter('');
        setTaskTypeFilter('');
        setPage(1);
    };

    // ── TASK STATUS ACTION ──
    const handleUpdateTaskStatus = async (taskId: string, status: string, extraData?: Record<string, any>) => {
        try {
            const res = await hospitalApi.updateNursingTaskStatus(taskId, status, extraData);
            if (res && res.success) {
                toast.success('Task Updated', `Nursing care status set to ${status}.`);
                refreshAll();
            } else {
                toast.error('Update Failed', res?.message || 'Could not update task status.');
            }
        } catch (err: any) {
            toast.error('Update Failed', err.message || 'Could not update task status.');
        }
    };

    // ── CREATE NEW TASK ──
    const handleCreateTask = async (formData: Record<string, any>) => {
        try {
            const res = await hospitalApi.createNursingTask(formData);
            if (res && res.success) {
                toast.success('Task Scheduled', 'New nursing bedside care task has been created.');
                refreshAll();
                return true;
            }
            toast.error('Creation Failed', res?.message || 'Could not schedule task.');
            return false;
        } catch (err: any) {
            toast.error('Creation Failed', err.message || 'Could not schedule task.');
            return false;
        }
    };

    const isGlobalRefreshing = loadingTasks || loadingKpis;
    const canManageTasks = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'nurse'].includes(staffRole);

    return (
        <div className="space-y-4">
            
            {/* 1. Page Header with Enterprise Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <HeartPulse className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Nursing Station
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
                                Live nursing operations and inpatient care workflow.
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
                    <button
                        type="button"
                        onClick={() => setIsHandoverModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>Shift Handover</span>
                    </button>
                    {canManageTasks && (
                        <button
                            type="button"
                            onClick={() => setIsNewTaskModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ New Nursing Task</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Top Database-Backed KPI Summary Row (6 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* KPI 1: Patients Under Care */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('patients'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'patients'
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Patients In Care</span>
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.patients_under_nursing_care ?? admissions.length
                        )}
                    </div>
                </button>

                {/* KPI 2: Pending Tasks */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('tasks'); setStatusFilter('pending'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'tasks' && statusFilter === 'pending'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Pending Tasks</span>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.pending_tasks ?? tasks.filter(t => t.status === 'pending').length
                        )}
                    </div>
                </button>

                {/* KPI 3: In Progress */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('tasks'); setStatusFilter('in_progress'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'tasks' && statusFilter === 'in_progress'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">In Progress</span>
                        <Play className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.in_progress_tasks ?? tasks.filter(t => t.status === 'in_progress').length
                        )}
                    </div>
                </button>

                {/* KPI 4: Due / Overdue */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('tasks'); setStatusFilter('overdue'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'tasks' && statusFilter === 'overdue'
                            ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Due / Overdue</span>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.due_overdue_tasks ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 5: Medication Due */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('mar'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'mar'
                            ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-purple-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Medication (MAR)</span>
                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.medication_due ?? tasks.filter(t => ['medication', 'injection', 'iv_fluids'].includes(t.task_type)).length
                        )}
                    </div>
                </button>

                {/* KPI 6: Critical / STAT Orders */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('tasks'); setPriorityFilter('stat'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'tasks' && priorityFilter === 'stat'
                            ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Critical / STAT</span>
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.critical_priority ?? tasks.filter(t => ['urgent', 'stat'].includes(t.priority)).length
                        )}
                    </div>
                </button>

            </div>

            {/* 3. Interactive 4-Stage Workflow Progression Banner */}
            <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs font-semibold">
                    
                    <button
                        type="button"
                        onClick={() => { setActiveTab('tasks'); setStatusFilter('pending'); }}
                        className={`flex-1 py-1.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            statusFilter === 'pending'
                                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>1. Scheduled</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
                            {kpis?.pending_tasks ?? 0}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('tasks'); setStatusFilter('in_progress'); }}
                        className={`flex-1 py-1.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            statusFilter === 'in_progress'
                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>2. In Progress</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200 text-blue-900 font-bold">
                            {kpis?.in_progress_tasks ?? 0}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('tasks'); setStatusFilter('completed'); }}
                        className={`flex-1 py-1.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            statusFilter === 'completed'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>3. Completed</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-bold">
                            {kpis?.completed_tasks ?? 0}
                        </span>
                    </button>

                    <span className="text-slate-300 dark:text-slate-700">|</span>

                    <button
                        type="button"
                        onClick={() => { setActiveTab('tasks'); setStatusFilter('escalated'); }}
                        className={`py-1.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center gap-1.5 ${
                            statusFilter === 'escalated'
                                ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-rose-50'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Escalated</span>
                    </button>

                </div>
            </div>

            {/* 4. Directory Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'tasks', label: 'Bedside Nursing Tasks', count: pagination.total },
                    { id: 'patients', label: 'Patients Requiring Attention', count: admissions.length },
                    { id: 'mar', label: 'Medication Administration (MAR)', count: kpis?.medication_due ?? 0 },
                ].map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(item.id as any);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isActive
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span>{item.label}</span>
                            {item.count > 0 && (
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

            {/* 5. TAB 1: BEDSIDE NURSING TASKS */}
            {activeTab === 'tasks' && (
                <div className="space-y-3">
                    
                    {/* Search & Filter Toolbar */}
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                            
                            {/* Search */}
                            <div className="lg:col-span-4 relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search patient, UHID, ward, bed, nurse..."
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

                            {/* Ward Filter */}
                            <div className="lg:col-span-2">
                                <select
                                    value={wardFilter}
                                    onChange={(e) => setWardFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Wards</option>
                                    {wards.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}
                                        </option>
                                    ))}
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

                            {/* Task Type Filter */}
                            <div className="lg:col-span-2">
                                <select
                                    value={taskTypeFilter}
                                    onChange={(e) => setTaskTypeFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Task Types</option>
                                    <option value="vitals">Vitals</option>
                                    <option value="medication">Medication</option>
                                    <option value="injection">Injection</option>
                                    <option value="iv_fluids">IV Fluids</option>
                                    <option value="wound_care">Wound Care</option>
                                    <option value="catheter_care">Catheter Care</option>
                                    <option value="nebulization">Nebulization</option>
                                    <option value="blood_sugar">Blood Sugar</option>
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
                                    <option value="pending">Scheduled / Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="escalated">Escalated</option>
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

                    {/* Table View */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                        {loadingTasks ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                                <span className="text-xs text-slate-500 font-medium">Loading bedside nursing tasks...</span>
                            </div>
                        ) : tasksError && tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                                    <ShieldAlert className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {tasksError.isPermission ? "Access Denied" : "Unable to load nursing tasks"}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                                    {tasksError.isPermission
                                        ? "You don't have permission to access inpatient nursing operations."
                                        : "We couldn't retrieve the nursing records. Please check your connection and try again."}
                                </p>
                                {!tasksError.isPermission && (
                                    <button
                                        type="button"
                                        onClick={fetchTasksList}
                                        disabled={loadingTasks}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Retry</span>
                                    </button>
                                )}
                            </div>
                        ) : displayedTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                    <HeartPulse className="w-7 h-7 text-teal-500" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {hasActiveFilters ? 'No nursing tasks match your current filters' : 'No nursing tasks scheduled'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                    {hasActiveFilters
                                        ? 'Try adjusting or clearing your search criteria.'
                                        : 'Schedule nursing tasks, vitals monitoring, or medication administration for admitted patients.'}
                                </p>
                                {hasActiveFilters ? (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        Clear Filters
                                    </button>
                                ) : canManageTasks && (
                                    <button
                                        type="button"
                                        onClick={() => setIsNewTaskModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Schedule First Task</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-4">Patient</th>
                                            <th className="py-3 px-4">Ward / Bed</th>
                                            <th className="py-3 px-4">Care Type & Order</th>
                                            <th className="py-3 px-4">Priority</th>
                                            <th className="py-3 px-4">Assigned Nurse</th>
                                            <th className="py-3 px-4">Scheduled</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                        {displayedTasks.map((task) => (
                                            <tr
                                                key={task.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                            >
                                                {/* Patient */}
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                        {task.admission?.patient?.name || 'Inpatient'}
                                                    </div>
                                                    <span className="font-mono text-[10px] text-slate-400">
                                                        {task.admission?.admission_number || 'IPD'}
                                                    </span>
                                                </td>

                                                {/* Location */}
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {task.ward?.name || 'Ward'}
                                                    </div>
                                                    <span className="text-[10px] text-slate-500">
                                                        Bed {task.admission?.bed?.bed_number || '—'}
                                                    </span>
                                                </td>

                                                {/* Task & Order */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                                                            {(task.task_type || 'vitals').replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[240px]">
                                                        {task.task_description}
                                                    </p>
                                                </td>

                                                {/* Priority */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                        task.priority === 'stat'
                                                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                                            : task.priority === 'urgent'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {task.priority || 'routine'}
                                                    </span>
                                                </td>

                                                {/* Assigned Nurse */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                        {task.assignedNurse?.name || 'Duty Staff'}
                                                    </span>
                                                </td>

                                                {/* Scheduled */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="text-slate-700 dark:text-slate-300 font-mono">
                                                        {task.scheduled_at
                                                            ? new Date(task.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                                            : '—'}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <StatusBadge status={task.status || 'pending'} size="sm" />
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setIsDrawerOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                        title="Open Bedside Care Workspace"
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
                        {!loadingTasks && tasks.length > 0 && pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Showing page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total tasks)
                                </span>
                                <Pagination
                                    currentPage={page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={(p) => setPage(p)}
                                />
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* 6. TAB 2: PATIENTS REQUIRING ATTENTION */}
            {activeTab === 'patients' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {admissions.length === 0 ? (
                        <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-12 text-center shadow-2xs">
                            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                No patients currently admitted
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Inpatient admissions will appear here once registered through IPD admission desk.
                            </p>
                        </div>
                    ) : (
                        admissions.map((adm) => (
                            <div
                                key={adm.id}
                                className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {adm.patient?.name || 'Patient'}
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            {adm.patient?.gender} • {adm.patient?.date_of_birth}
                                        </p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                        Admitted
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-700 text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Ward & Bed:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {adm.ward?.name || 'General'} / Bed {adm.bed?.bed_number || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Attending Doctor:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            Dr. {adm.attendingDoctor?.name || 'Physician'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Admission No:</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">
                                            {adm.admission_number}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNewTaskModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Assign Task</span>
                                    </button>
                                    <Link
                                        href={`/hospital/ipd`}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                    >
                                        <span>IPD Chart</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 7. TAB 3: MEDICATION ADMINISTRATION (MAR) */}
            {activeTab === 'mar' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-6 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <Pill className="w-4 h-4 text-purple-600" />
                                <span>Medication Administration Record (MAR) Schedule</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Active medication doses, scheduled times, and administration records for admitted patients.
                            </p>
                        </div>
                    </div>

                    <div className="p-8 text-center bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                        <Pill className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            Real-Time MAR Monitoring Active
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Medication doses scheduled as nursing tasks appear directly in your bedside task roster.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setTaskTypeFilter('medication');
                                setActiveTab('tasks');
                            }}
                            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                            <span>Filter Medication Tasks</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* 8. Nursing Task Details Drawer */}
            <NursingTaskDetailsDrawer
                task={selectedTask}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUpdateStatus={handleUpdateTaskStatus}
                canManageTasks={canManageTasks}
            />

            {/* 9. New Nursing Task Modal */}
            <NewNursingTaskModal
                isOpen={isNewTaskModalOpen}
                onClose={() => setIsNewTaskModalOpen(false)}
                onSubmit={handleCreateTask}
                admissions={admissions}
            />

            {/* 10. Shift Handover Modal */}
            <ShiftHandoverModal
                isOpen={isHandoverModalOpen}
                onClose={() => setIsHandoverModalOpen(false)}
                tasks={tasks}
                admissions={admissions}
                kpis={kpis}
            />

        </div>
    );
}
