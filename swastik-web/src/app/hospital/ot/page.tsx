'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    Scissors,
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
    ChevronLeft,
    ChevronRight,
    Settings,
    ClipboardCheck
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { OtDetailsDrawer } from '@/components/hospital/ot/OtDetailsDrawer';
import { ScheduleSurgeryModal } from '@/components/hospital/ot/ScheduleSurgeryModal';
import { RescheduleSurgeryModal } from '@/components/hospital/ot/RescheduleSurgeryModal';
import { ManageOtRoomsModal } from '@/components/hospital/ot/ManageOtRoomsModal';
import { OtTimelineView } from '@/components/hospital/ot/OtTimelineView';

const PAGE_SIZE = 15;

export default function OTSchedulingPage() {
    const toast = useToast();

    // ── DATA STATES ──
    const [schedules, setSchedules] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [rooms, setRooms] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── DATE STATE ──
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingSchedules, setLoadingSchedules] = useState(true);
    const [schedulesError, setSchedulesError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingKpis, setLoadingKpis] = useState(true);
    const [kpisError, setKpisError] = useState<boolean>(false);

    // ── TABS & FILTERS ──
    const [activeTab, setActiveTab] = useState<'timeline' | 'roster' | 'rooms' | 'readiness'>('timeline');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [otRoomFilter, setOtRoomFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);

    // ── MODALS & DRAWER ──
    const [selectedSurgery, setSelectedSurgery] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isManageRoomsModalOpen, setIsManageRoomsModalOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH SCHEDULES ──
    const fetchSchedulesList = useCallback(async () => {
        setLoadingSchedules(true);
        setSchedulesError(null);
        try {
            const queryParams: Record<string, any> = {
                page,
                limit: PAGE_SIZE,
                date: selectedDate,
            };
            if (statusFilter) queryParams.status = statusFilter;
            if (otRoomFilter) queryParams.otRoomId = otRoomFilter;
            if (priorityFilter) queryParams.priority = priorityFilter;
            if (categoryFilter) queryParams.surgeryType = categoryFilter;

            const res = await hospitalApi.getOtSchedules(queryParams);

            if (res && res.success) {
                const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                setSchedules(raw);
                setPagination(
                    res.pagination ||
                    (res.data as any)?.pagination ||
                    { page: 1, totalPages: 1, total: raw.length }
                );
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load OT schedules';
                const isPerm = res?.status === 401 || res?.status === 403;
                setSchedulesError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load OT schedules';
            const isPerm = err.status === 401 || err.status === 403;
            setSchedulesError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingSchedules(false);
        }
    }, [page, selectedDate, statusFilter, otRoomFilter, priorityFilter, categoryFilter]);

    // ── FETCH KPIS ──
    const fetchKpis = useCallback(async () => {
        setLoadingKpis(true);
        setKpisError(false);
        try {
            const res = await hospitalApi.getOtKpis(selectedDate);
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
    }, [selectedDate]);

    // ── FETCH ROOMS, DOCTORS & ADMISSIONS ──
    const fetchMetadata = useCallback(async () => {
        try {
            const [rRes, dRes, admRes, roleRes] = await Promise.allSettled([
                hospitalApi.getOtRooms(),
                hospitalApi.getDoctors(1, '', 100),
                hospitalApi.getAdmissions({ status: 'admitted', limit: 100 }),
                hospitalApi.getMyStaffRole(),
            ]);

            if (rRes.status === 'fulfilled' && (rRes.value as any)?.success) {
                const rawRooms = (rRes.value as any).rooms || (rRes.value as any).data || [];
                setRooms(Array.isArray(rawRooms) ? rawRooms : []);
            }
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
            console.error('Failed to load OT metadata:', err);
        }
    }, []);

    // Refresh all data
    const refreshAll = useCallback(() => {
        fetchSchedulesList();
        fetchKpis();
        fetchMetadata();
    }, [fetchSchedulesList, fetchKpis, fetchMetadata]);

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

        socket.on('ot:scheduled', handleUpdate);
        socket.on('ot:rescheduled', handleUpdate);
        socket.on('ot:status_updated', handleUpdate);
        socket.on('ot:room_updated', handleUpdate);

        return () => {
            socket.off('ot:scheduled', handleUpdate);
            socket.off('ot:rescheduled', handleUpdate);
            socket.off('ot:status_updated', handleUpdate);
            socket.off('ot:room_updated', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Client search filter
    const displayedSchedules = useMemo(() => {
        if (!deferredSearch) return schedules;
        return schedules.filter((s) => {
            const pName = (s.patient?.name || '').toLowerCase();
            const sName = (s.surgery_name || '').toLowerCase();
            const rName = (s.otRoom?.name || '').toLowerCase();
            const doc = (s.primarySurgeon?.name || '').toLowerCase();
            const anes = (s.anesthetist?.name || '').toLowerCase();
            return pName.includes(deferredSearch) ||
                sName.includes(deferredSearch) ||
                rName.includes(deferredSearch) ||
                doc.includes(deferredSearch) ||
                anes.includes(deferredSearch);
        });
    }, [schedules, deferredSearch]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, statusFilter, otRoomFilter, priorityFilter, categoryFilter, selectedDate]);

    const hasActiveFilters = Boolean(searchQuery || statusFilter || otRoomFilter || priorityFilter || categoryFilter);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setOtRoomFilter('');
        setPriorityFilter('');
        setCategoryFilter('');
        setPage(1);
    };

    // Date Navigation helpers
    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    // Status transition action
    const handleUpdateStatus = async (surgeryId: string, status: string, notes?: Record<string, any>) => {
        try {
            const res = await hospitalApi.updateOtStatus(surgeryId, status, notes);
            if (res && res.success) {
                toast.success('Status Updated', `Surgical case set to ${status}.`);
                refreshAll();
            } else {
                toast.error('Update Failed', res?.message || 'Could not update surgery status.');
            }
        } catch (err: any) {
            toast.error('Update Failed', err.message || 'Could not update surgery status.');
        }
    };

    // Schedule Surgery
    const handleCreateSurgery = async (formData: Record<string, any>) => {
        try {
            const res = await hospitalApi.scheduleOt(formData);
            if (res && res.success) {
                toast.success('Surgery Scheduled', 'Operation Theatre booking confirmed.');
                refreshAll();
                return true;
            }
            toast.error('Scheduling Failed', res?.message || 'Could not schedule OT booking.');
            return false;
        } catch (err: any) {
            toast.error('Scheduling Failed', err.message || 'Could not schedule OT booking.');
            return false;
        }
    };

    // Reschedule Surgery
    const handleRescheduleSurgery = async (surgeryId: string, formData: Record<string, any>) => {
        try {
            const res = await hospitalApi.rescheduleOt(surgeryId, formData);
            if (res && res.success) {
                toast.success('Surgery Rescheduled', 'Operation Theatre booking updated.');
                refreshAll();
                return true;
            }
            toast.error('Reschedule Failed', res?.message || 'Could not reschedule surgery.');
            return false;
        } catch (err: any) {
            toast.error('Reschedule Failed', err.message || 'Could not reschedule surgery.');
            return false;
        }
    };

    const isGlobalRefreshing = loadingSchedules || loadingKpis;
    const canManageOt = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'doctor'].includes(staffRole);

    return (
        <div className="space-y-4">
            
            {/* 1. Page Header with Enterprise Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    OT Scheduling
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
                                Operation theatre scheduling and surgical workflow management.
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
                    {canManageOt && (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsManageRoomsModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                <Settings className="w-3.5 h-3.5 text-teal-600" />
                                <span>Manage OT Rooms</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Schedule Surgery</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 2. Top Real Database-Backed KPI Row (8 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                
                {/* 1: Today's Surgeries */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter(''); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && !statusFilter
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Today's Total</span>
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.total_surgeries_today ?? schedules.length}
                    </span>
                </button>

                {/* 2: Scheduled */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('scheduled'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'scheduled'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Scheduled</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.scheduled ?? schedules.filter(s => s.status === 'scheduled').length}
                    </span>
                </button>

                {/* 3: In Preparation */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('pre_op'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'pre_op'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Pre-Op / Ready</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.in_preparation ?? schedules.filter(s => s.status === 'pre_op' || s.status === 'ready').length}
                    </span>
                </button>

                {/* 4: In Surgery */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('in_progress'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'in_progress'
                            ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-indigo-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">In Surgery</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.in_surgery ?? schedules.filter(s => s.status === 'in_progress').length}
                    </span>
                </button>

                {/* 5: Recovery */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('post_op'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'post_op'
                            ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-purple-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Recovery</span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.recovery ?? schedules.filter(s => s.status === 'post_op').length}
                    </span>
                </button>

                {/* 6: Completed */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('completed'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'completed'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Completed</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.completed ?? schedules.filter(s => s.status === 'completed').length}
                    </span>
                </button>

                {/* 7: Cancelled */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setStatusFilter('cancelled'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && statusFilter === 'cancelled'
                            ? 'bg-slate-100 border-slate-300 dark:bg-gray-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-slate-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Cancelled</span>
                    <span className="text-lg font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.cancelled ?? 0}
                    </span>
                </button>

                {/* 8: Emergency / STAT */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('roster'); setPriorityFilter('emergency'); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'roster' && priorityFilter === 'emergency'
                            ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block truncate">Emergency STAT</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                        {loadingKpis ? <span className="inline-block w-6 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" /> : kpisError ? '—' : kpis?.emergency ?? schedules.filter(s => s.priority === 'emergency').length}
                    </span>
                </button>

            </div>

            {/* 3. Date Navigation Control Bar */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handlePrevDay}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Previous Day"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleToday}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={handleNextDay}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Next Day"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="font-bold text-slate-900 dark:text-slate-100 ml-2">
                        OT Schedule — {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Jump to Date:</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* 4. Directory Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'timeline', label: 'OT Control Timeline' },
                    { id: 'roster', label: 'Surgery Schedule Roster', count: pagination.total },
                    { id: 'rooms', label: 'OT Rooms Operational Status', count: rooms.length },
                    { id: 'readiness', label: 'Pre-Op Safety Readiness' },
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

            {/* 5. TAB 1: OT TIMELINE VIEW */}
            {activeTab === 'timeline' && (
                <OtTimelineView
                    rooms={rooms}
                    schedules={schedules}
                    selectedDate={selectedDate}
                    onSelectSurgery={(s) => {
                        setSelectedSurgery(s);
                        setIsDrawerOpen(true);
                    }}
                />
            )}

            {/* 6. TAB 2: SURGERY SCHEDULE ROSTER TABLE */}
            {activeTab === 'roster' && (
                <div className="space-y-3">
                    
                    {/* Search & Filter Toolbar */}
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                            
                            {/* Search */}
                            <div className="lg:col-span-4 relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search patient, UHID, procedure, surgeon, OT..."
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

                            {/* OT Room Filter */}
                            <div className="lg:col-span-2">
                                <select
                                    value={otRoomFilter}
                                    onChange={(e) => setOtRoomFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All OT Rooms</option>
                                    {rooms.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
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
                                    <option value="elective">Elective</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="emergency">Emergency STAT</option>
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div className="lg:col-span-2">
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Categories</option>
                                    <option value="major">Major</option>
                                    <option value="minor">Minor</option>
                                    <option value="day_care">Day Care</option>
                                    <option value="emergency">Emergency</option>
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
                                    <option value="scheduled">Scheduled</option>
                                    <option value="pre_op">Pre-Op</option>
                                    <option value="ready">Ready</option>
                                    <option value="in_progress">In Surgery</option>
                                    <option value="post_op">Recovery</option>
                                    <option value="completed">Completed</option>
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

                    {/* High Density Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                        {loadingSchedules ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                                <span className="text-xs text-slate-500 font-medium">Loading surgical schedules...</span>
                            </div>
                        ) : schedulesError && schedules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                                    <ShieldAlert className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {schedulesError.isPermission ? "Access Denied" : "Unable to load OT scheduling data"}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                                    {schedulesError.isPermission
                                        ? "You don't have permission to access operation theatre schedules."
                                        : "We couldn't retrieve the surgery records. Please check your connection and try again."}
                                </p>
                                {!schedulesError.isPermission && (
                                    <button
                                        type="button"
                                        onClick={fetchSchedulesList}
                                        disabled={loadingSchedules}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Retry</span>
                                    </button>
                                )}
                            </div>
                        ) : displayedSchedules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                    <Scissors className="w-7 h-7 text-teal-500" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {hasActiveFilters ? 'No surgeries match your current filters' : 'No surgeries scheduled for this date'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                    {hasActiveFilters
                                        ? 'Try adjusting or clearing your search criteria.'
                                        : 'Schedule new elective or emergency surgical cases for the selected date.'}
                                </p>
                                {hasActiveFilters ? (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        Clear Filters
                                    </button>
                                ) : canManageOt && (
                                    <button
                                        type="button"
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Schedule First Surgery</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-4">Time</th>
                                            <th className="py-3 px-4">Patient</th>
                                            <th className="py-3 px-4">Procedure</th>
                                            <th className="py-3 px-4">OT Room</th>
                                            <th className="py-3 px-4">Surgeon</th>
                                            <th className="py-3 px-4">Anaesthetist</th>
                                            <th className="py-3 px-4">Priority</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                        {displayedSchedules.map((s) => (
                                            <tr
                                                key={s.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                            >
                                                {/* Time */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                        {s.scheduled_start ? new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {s.estimated_duration_minutes || 60}m
                                                    </span>
                                                </td>

                                                {/* Patient */}
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                        {s.patient?.name || 'Inpatient'}
                                                    </div>
                                                    <span className="font-mono text-[10px] text-slate-400">
                                                        {s.patient?.gender ? `${s.patient.gender} • ` : ''}
                                                        {s.admission?.admission_number || 'IPD'}
                                                    </span>
                                                </td>

                                                {/* Procedure */}
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[200px]">
                                                        {s.surgery_name}
                                                    </div>
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                        {s.surgery_type || 'Major'}
                                                    </span>
                                                </td>

                                                {/* OT Room */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {s.otRoom?.name || 'OT Room'}
                                                    </span>
                                                </td>

                                                {/* Surgeon */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                                        Dr. {s.primarySurgeon?.name || 'Assigned'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        {s.primarySurgeon?.specialization || 'Surgery'}
                                                    </span>
                                                </td>

                                                {/* Anaesthetist */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {s.anesthetist?.name ? `Dr. ${s.anesthetist.name}` : '—'}
                                                    </span>
                                                </td>

                                                {/* Priority */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                        s.priority === 'emergency'
                                                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                                            : s.priority === 'urgent' || s.priority === 'stat'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {s.priority || 'elective'}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <StatusBadge status={s.status || 'scheduled'} size="sm" />
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSurgery(s);
                                                            setIsDrawerOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                        title="Open Surgery Workspace"
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
                        {!loadingSchedules && schedules.length > 0 && pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Showing page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total cases)
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

            {/* 7. TAB 3: OT ROOMS OPERATIONAL STATUS */}
            {activeTab === 'rooms' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {rooms.length === 0 ? (
                        <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-12 text-center shadow-2xs">
                            <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                No OT rooms configured yet
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 mb-4">
                                Configure your hospital surgical suites and operational status.
                            </p>
                            {canManageOt && (
                                <button
                                    type="button"
                                    onClick={() => setIsManageRoomsModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Configure OT Rooms</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        rooms.map((r) => {
                            const activeSurgery = schedules.find(
                                (s) => (s.ot_room_id === r.id || s.otRoom?.id === r.id) && s.status === 'in_progress'
                            );
                            const nextSurgery = schedules.find(
                                (s) => (s.ot_room_id === r.id || s.otRoom?.id === r.id) && s.status === 'scheduled'
                            );

                            return (
                                <div
                                    key={r.id}
                                    className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                {r.name}
                                            </h3>
                                            <p className="text-[11px] text-slate-500">
                                                {r.room_type || 'Major OT'} {r.floor ? `• Floor ${r.floor}` : ''}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            !r.is_active
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                : activeSurgery
                                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        }`}>
                                            {!r.is_active ? 'Maintenance' : activeSurgery ? 'In Surgery' : 'Available'}
                                        </span>
                                    </div>

                                    {activeSurgery ? (
                                        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 rounded-2xl text-xs space-y-1">
                                            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold block uppercase">
                                                Active Surgery In Progress
                                            </span>
                                            <p className="font-bold text-slate-900 dark:text-slate-100">
                                                {activeSurgery.surgery_name}
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                                Patient: {activeSurgery.patient?.name} • Dr. {activeSurgery.primarySurgeon?.name}
                                            </p>
                                        </div>
                                    ) : nextSurgery ? (
                                        <div className="p-3 bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-700 rounded-2xl text-xs space-y-1">
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                                Next Scheduled Procedure
                                            </span>
                                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                                {nextSurgery.surgery_name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-mono">
                                                {new Date(nextSurgery.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 italic">
                                            No active surgeries. Ready for upcoming bookings.
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtRoomFilter(r.id);
                                                setActiveTab('roster');
                                            }}
                                            className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                                        >
                                            View Room Roster
                                        </button>
                                        {canManageOt && (
                                            <button
                                                type="button"
                                                onClick={() => setIsScheduleModalOpen(true)}
                                                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                                            >
                                                Book This OT
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* 8. TAB 4: PRE-OP SAFETY READINESS */}
            {activeTab === 'readiness' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-6 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-teal-600" />
                                <span>WHO Surgical Safety & Pre-Operative Readiness</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Surgical consent, anaesthesia clearance, and pre-op verification for today's scheduled cases.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {schedules.filter(s => s.status === 'scheduled' || s.status === 'pre_op').length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-gray-800/40 rounded-2xl">
                                All scheduled cases for this date have been verified or completed.
                            </div>
                        ) : (
                            schedules.filter(s => s.status === 'scheduled' || s.status === 'pre_op').map((s) => (
                                <div
                                    key={s.id}
                                    className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3 flex-wrap"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                {s.surgery_name}
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                • Patient: <strong>{s.patient?.name}</strong> (Room: {s.otRoom?.name})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                            <span>Consent: {s.consent_obtained ? '✓ Obtained' : '⚠ Pending'}</span>
                                            <span>Diagnosis: {s.pre_op_diagnosis ? '✓ Documented' : '⚠ Not specified'}</span>
                                            <span>Surgeon: Dr. {s.primarySurgeon?.name}</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSurgery(s);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 border border-slate-200 dark:border-gray-700 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shadow-2xs"
                                    >
                                        Open Readiness Checklist
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* 9. Surgery Details Workspace Drawer */}
            <OtDetailsDrawer
                surgery={selectedSurgery}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUpdateStatus={handleUpdateStatus}
                onOpenReschedule={(s) => {
                    setIsDrawerOpen(false);
                    setSelectedSurgery(s);
                    setIsRescheduleModalOpen(true);
                }}
                canManageOt={canManageOt}
            />

            {/* 10. Schedule Surgery Modal */}
            <ScheduleSurgeryModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSubmit={handleCreateSurgery}
                rooms={rooms}
                doctors={doctors}
                admissions={admissions}
            />

            {/* 11. Reschedule Surgery Modal */}
            <RescheduleSurgeryModal
                surgery={selectedSurgery}
                isOpen={isRescheduleModalOpen}
                onClose={() => setIsRescheduleModalOpen(false)}
                onSubmit={handleRescheduleSurgery}
                rooms={rooms}
                doctors={doctors}
            />

            {/* 12. Manage OT Rooms Modal */}
            <ManageOtRoomsModal
                isOpen={isManageRoomsModalOpen}
                onClose={() => setIsManageRoomsModalOpen(false)}
                rooms={rooms}
                onRefresh={refreshAll}
            />

        </div>
    );
}
