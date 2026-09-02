'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    Building2,
    RefreshCw,
    Search,
    User,
    Stethoscope,
    Calendar,
    Activity,
    Eye,
    Edit2,
    Trash2,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    LayoutGrid,
    List,
    Users,
    Video,
    Loader2,
    ExternalLink,
    Clock
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { DepartmentDetailsDrawer } from '@/components/hospital/departments/DepartmentDetailsDrawer';
import { DepartmentFormModal } from '@/components/hospital/departments/DepartmentFormModal';

const PAGE_SIZE = 12;

export default function HospitalDepartmentsPage() {
    const toast = useToast();

    // ── DATA STATES ──
    const [departments, setDepartments] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingDepartments, setLoadingDepartments] = useState(true);
    const [departmentsError, setDepartmentsError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingKpis, setLoadingKpis] = useState(true);
    const [kpisError, setKpisError] = useState<boolean>(false);

    // ── VIEW TOGGLE & FILTERS ──
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [doctorAllocFilter, setDoctorAllocFilter] = useState('');
    const [page, setPage] = useState(1);

    // ── MODALS & DRAWER ──
    const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
    const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH DEPARTMENTS ──
    const fetchDepartmentsList = useCallback(async () => {
        setLoadingDepartments(true);
        setDepartmentsError(null);
        try {
            const res = await hospitalApi.getDepartments();
            if (res && res.success) {
                const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.departments || [];
                setDepartments(raw);
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load departments';
                const isPerm = res?.status === 401 || res?.status === 403;
                setDepartmentsError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load departments';
            const isPerm = err.status === 401 || err.status === 403;
            setDepartmentsError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingDepartments(false);
        }
    }, []);

    // ── FETCH DEPARTMENT KPIS ──
    const fetchDepartmentKpis = useCallback(async () => {
        setLoadingKpis(true);
        setKpisError(false);
        try {
            const res = await hospitalApi.getDepartmentKpis();
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

    // ── FETCH DOCTORS FOR LEAD SELECTION & DEPT ROSTER ──
    const fetchDoctorsList = useCallback(async () => {
        try {
            const res = await hospitalApi.getDoctors(1, '', 200);
            if (res && res.success) {
                const raw = Array.isArray(res.data) ? res.data : (res as any)?.doctors || [];
                setDoctors(raw);
            }
        } catch (err) {
            console.error('Failed to load doctors for departments:', err);
        }
    }, []);

    // ── FETCH STAFF ROLE ──
    useEffect(() => {
        hospitalApi.getMyStaffRole().then((res: any) => {
            if (res && res.success && res.staffRole) {
                setStaffRole(res.staffRole);
            }
        }).catch(() => {});
    }, []);

    // Refresh all independent streams
    const refreshAll = useCallback(() => {
        fetchDepartmentsList();
        fetchDepartmentKpis();
        fetchDoctorsList();
    }, [fetchDepartmentsList, fetchDepartmentKpis, fetchDoctorsList]);

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

        socket.on('department:created', handleUpdate);
        socket.on('department:updated', handleUpdate);
        socket.on('department:deleted', handleUpdate);

        return () => {
            socket.off('department:created', handleUpdate);
            socket.off('department:updated', handleUpdate);
            socket.off('department:deleted', handleUpdate);
        };
    }, [socket, refreshAll]);

    // ── FILTERED DEPARTMENTS ──
    const filteredDepartments = useMemo(() => {
        return departments.filter((dept) => {
            if (deferredSearch) {
                const matchName = (dept.name || '').toLowerCase().includes(deferredSearch);
                const matchHead = (dept.head || '').toLowerCase().includes(deferredSearch);
                const matchDesc = (dept.description || '').toLowerCase().includes(deferredSearch);
                if (!matchName && !matchHead && !matchDesc) return false;
            }

            if (statusFilter && dept.status !== statusFilter) {
                return false;
            }

            if (doctorAllocFilter === 'with_doctors' && (dept.doctors || 0) === 0) {
                return false;
            }

            if (doctorAllocFilter === 'no_doctors' && (dept.doctors || 0) > 0) {
                return false;
            }

            return true;
        });
    }, [departments, deferredSearch, statusFilter, doctorAllocFilter]);

    // Client pagination
    const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
    const paginatedDepartments = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredDepartments.slice(start, start + PAGE_SIZE);
    }, [filteredDepartments, page]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearch, statusFilter, doctorAllocFilter]);

    const hasActiveFilters = Boolean(searchQuery || statusFilter || doctorAllocFilter);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setDoctorAllocFilter('');
        setPage(1);
    };

    // ── FORM ACTIONS ──
    const handleFormSubmit = async (formData: { name: string; headDoctorId?: string; description?: string; status: string }) => {
        if (editingDepartment) {
            const res = await hospitalApi.updateDepartment(editingDepartment.id, formData);
            if (res && res.success) {
                toast.success('Department Updated', `${formData.name} updated successfully.`);
                refreshAll();
                return true;
            }
            toast.error('Update Failed', res?.message || 'Could not update department.');
            return false;
        } else {
            const res = await hospitalApi.addDepartment(formData);
            if (res && res.success) {
                toast.success('Department Created', `${formData.name} added to hospital roster.`);
                refreshAll();
                return true;
            }
            toast.error('Creation Failed', res?.message || 'Could not add department.');
            return false;
        }
    };

    const handleDeleteDepartment = async (deptId: string, deptName: string) => {
        if (!confirm(`Are you sure you want to delete the department "${deptName}"? This will unassign any linked staff.`)) {
            return;
        }

        setDeletingDeptId(deptId);
        try {
            const res = await hospitalApi.deleteDepartment(deptId);
            if (res && res.success) {
                toast.success('Department Deleted', `${deptName} has been removed.`);
                if (selectedDepartment?.id === deptId) {
                    setIsDrawerOpen(false);
                }
                refreshAll();
            } else {
                toast.error('Deletion Failed', res?.message || 'Could not delete department.');
            }
        } catch (err: any) {
            toast.error('Deletion Failed', err.message || 'Could not delete department.');
        } finally {
            setDeletingDeptId(null);
        }
    };

    const isGlobalRefreshing = loadingDepartments || loadingKpis;
    const canManageDepartments = ['hospital_owner', 'hospital_admin', 'hospital_manager'].includes(staffRole);

    // Doctors belonging to the currently selected drawer department
    const selectedDeptDoctors = useMemo(() => {
        if (!selectedDepartment) return [];
        return doctors.filter((doc) => doc.department === selectedDepartment.name);
    }, [selectedDepartment, doctors]);

    return (
        <div className="space-y-4">
            
            {/* 1. Page Header with Enterprise Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Departments
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
                                Manage hospital departments, clinical teams, doctors and operational activity.
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
                    {canManageDepartments && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingDepartment(null);
                                setIsFormModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Department</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Top Database-Backed KPI Summary Row (5 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                
                {/* KPI 1: Total Departments */}
                <button
                    type="button"
                    onClick={() => { setStatusFilter(''); setDoctorAllocFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        !statusFilter && !doctorAllocFilter
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Total Depts</span>
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.total_departments ?? departments.length
                        )}
                    </div>
                </button>

                {/* KPI 2: Active Departments */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'active'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Active Depts</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.active_departments ?? departments.filter(d => d.status === 'active').length
                        )}
                    </div>
                </button>

                {/* KPI 3: Doctors Across Departments */}
                <button
                    type="button"
                    onClick={() => setDoctorAllocFilter('with_doctors')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        doctorAllocFilter === 'with_doctors'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Assigned Doctors</span>
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.doctors_across_departments ?? doctors.length
                        )}
                    </div>
                </button>

                {/* KPI 4: Departments With No Doctors */}
                <button
                    type="button"
                    onClick={() => setDoctorAllocFilter('no_doctors')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        doctorAllocFilter === 'no_doctors'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Depts With No Staff</span>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.departments_with_no_doctors ?? departments.filter(d => (d.doctors || 0) === 0).length
                        )}
                    </div>
                </button>

                {/* KPI 5: Today's Department Appointments */}
                <div className="p-3 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Today's Visits</span>
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            kpis?.today_department_appointments ?? departments.reduce((acc, d) => acc + (d.appointments || 0), 0)
                        )}
                    </div>
                </div>

            </div>

            {/* 3. Search, Filters & View Mode Toggle */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs items-center">
                    
                    {/* Search */}
                    <div className="lg:col-span-5 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search department name, head doctor, description..."
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

                    {/* Status Filter */}
                    <div className="lg:col-span-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Operational Statuses</option>
                            <option value="active">Active (Operational)</option>
                            <option value="inactive">Inactive (Suspended)</option>
                        </select>
                    </div>

                    {/* Staff Allocation Filter */}
                    <div className="lg:col-span-2">
                        <select
                            value={doctorAllocFilter}
                            onChange={(e) => setDoctorAllocFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Staff Allocations</option>
                            <option value="with_doctors">With Doctors Assigned</option>
                            <option value="no_doctors">No Staff Assigned</option>
                        </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="lg:col-span-2 flex items-center justify-end gap-1">
                        <div className="bg-slate-100 dark:bg-gray-800 p-0.5 rounded-xl flex items-center">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                    viewMode === 'list'
                                        ? 'bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                                title="List View"
                            >
                                <List className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">List</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Grid</span>
                            </button>
                        </div>
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

            {/* 4. MAIN CONTENT: LIST VIEW VS GRID VIEW */}

            {/* LOADING STATE */}
            {loadingDepartments ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 flex flex-col items-center justify-center py-20 gap-3 shadow-2xs">
                    <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                    <span className="text-xs text-slate-500 font-medium">Loading hospital departments...</span>
                </div>
            ) : departmentsError && departments.length === 0 ? (
                /* ERROR STATE WITH RETRY */
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 flex flex-col items-center justify-center py-16 px-4 text-center shadow-2xs">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                        <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {departmentsError.isPermission ? "Access Denied" : "Unable to load departments"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                        {departmentsError.isPermission
                            ? "You don't have permission to manage hospital departments."
                            : "We couldn't retrieve the department records. Please check your connection and try again."}
                    </p>
                    {!departmentsError.isPermission && (
                        <button
                            type="button"
                            onClick={fetchDepartmentsList}
                            disabled={loadingDepartments}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                        </button>
                    )}
                </div>
            ) : filteredDepartments.length === 0 ? (
                /* CLEAN EMPTY STATE */
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 flex flex-col items-center justify-center py-16 px-4 text-center shadow-2xs">
                    <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                        <Building2 className="w-7 h-7 text-teal-500" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {hasActiveFilters ? 'No departments match your current filters' : 'No departments configured yet'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                        {hasActiveFilters
                            ? 'Try adjusting or clearing your search keywords and status filters.'
                            : 'Create your first clinical department to organize medical staff, appointments, and wards.'}
                    </p>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Clear Filters
                        </button>
                    ) : canManageDepartments && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingDepartment(null);
                                setIsFormModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add First Department</span>
                        </button>
                    )}
                </div>
            ) : viewMode === 'list' ? (
                /* ── LIST VIEW TABLE ── */
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4">Head of Dept (HOD)</th>
                                    <th className="py-3 px-4">Medical Staff</th>
                                    <th className="py-3 px-4">Today's Visits</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Clinical Services</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                {paginatedDepartments.map((dept) => (
                                    <tr
                                        key={dept.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Department Name & Code */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                        {dept.name}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                                        {dept.description || 'Clinical department'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Head of Department */}
                                        <td className="py-3 px-4">
                                            {dept.head ? (
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                                    <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                                    <span>Dr. {dept.head}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">No Head Assigned</span>
                                            )}
                                        </td>

                                        {/* Doctors Count */}
                                        <td className="py-3 px-4">
                                            <Link
                                                href={`/hospital/doctors?department=${encodeURIComponent(dept.name)}`}
                                                className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-400 hover:underline"
                                            >
                                                <span>{dept.doctors || 0} Doctors</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </td>

                                        {/* Today's Appointments */}
                                        <td className="py-3 px-4">
                                            <Link
                                                href={`/hospital/appointments?department=${encodeURIComponent(dept.name)}`}
                                                className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800 dark:text-slate-200 hover:underline"
                                            >
                                                <span>{dept.appointments || 0} Visits</span>
                                                <ExternalLink className="w-3 h-3 text-slate-400" />
                                            </Link>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <StatusBadge status={dept.status || 'active'} size="sm" />
                                        </td>

                                        {/* Services */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                    OPD
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    Video
                                                </span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDepartment(dept);
                                                        setIsDrawerOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                    title="View Department Workspace"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                {canManageDepartments && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingDepartment(dept);
                                                                setIsFormModalOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                            title="Edit Department"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                                            disabled={deletingDeptId === dept.id}
                                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-gray-800 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                                                            title="Delete Department"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span> ({filteredDepartments.length} total departments)
                            </span>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            ) : (
                /* ── GRID VIEW CARDS (FIXED CARD RESTRUCTURING TO RESOLVE TEXT COLLISION) ── */
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {paginatedDepartments.map((dept) => (
                            <div
                                key={dept.id}
                                className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs hover:border-teal-300 dark:hover:border-teal-800 transition-all flex flex-col justify-between space-y-3.5"
                            >
                                {/* Top: Header + Status */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 border border-teal-200/60">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                {dept.name}
                                            </h3>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                DEPT-{dept.id.slice(0, 8).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <StatusBadge status={dept.status || 'active'} size="sm" />
                                </div>

                                {/* Middle: Department Head */}
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-700/50">
                                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                                        Department Head (HOD)
                                    </span>
                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 flex items-center gap-1 truncate">
                                        <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                        <span>{dept.head ? `Dr. ${dept.head}` : 'No Head Assigned'}</span>
                                    </div>
                                </div>

                                {/* Statistics Row: Doctors & Today's Appointments (Clean separate columns) */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <Link
                                        href={`/hospital/doctors?department=${encodeURIComponent(dept.name)}`}
                                        className="p-2 rounded-xl bg-slate-50/70 dark:bg-gray-800/30 border border-slate-200/50 dark:border-gray-700/40 text-left hover:border-teal-300 transition-colors"
                                    >
                                        <span className="text-[10px] text-slate-400 block">Medical Staff</span>
                                        <span className="text-sm font-extrabold text-teal-700 dark:text-teal-400 font-mono">
                                            {dept.doctors || 0} <span className="text-[10px] font-normal text-slate-500">Doctors</span>
                                        </span>
                                    </Link>

                                    <Link
                                        href={`/hospital/appointments?department=${encodeURIComponent(dept.name)}`}
                                        className="p-2 rounded-xl bg-slate-50/70 dark:bg-gray-800/30 border border-slate-200/50 dark:border-gray-700/40 text-left hover:border-teal-300 transition-colors"
                                    >
                                        <span className="text-[10px] text-slate-400 block">Today's Visits</span>
                                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                                            {dept.appointments || 0} <span className="text-[10px] font-normal text-slate-500">Visits</span>
                                        </span>
                                    </Link>
                                </div>

                                {/* Description */}
                                <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 min-h-[32px]">
                                    {dept.description || 'Clinical department providing specialized outpatient & inpatient medical care.'}
                                </p>

                                {/* Footer Actions */}
                                <div className="pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedDepartment(dept);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View Workspace</span>
                                    </button>

                                    {canManageDepartments && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingDepartment(dept);
                                                    setIsFormModalOpen(true);
                                                }}
                                                className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                                title="Edit Department"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                                disabled={deletingDeptId === dept.id}
                                                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                                                title="Delete Department"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 flex items-center justify-between shadow-2xs">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span> ({filteredDepartments.length} total departments)
                            </span>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 5. Department Details Workspace Drawer */}
            <DepartmentDetailsDrawer
                department={selectedDepartment}
                doctorsInDept={selectedDeptDoctors}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onEdit={(dept) => {
                    setEditingDepartment(dept);
                    setIsDrawerOpen(false);
                    setIsFormModalOpen(true);
                }}
                onDelete={handleDeleteDepartment}
                canManageDepartments={canManageDepartments}
            />

            {/* 6. Department Form Modal (Add / Edit) */}
            <DepartmentFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setEditingDepartment(null);
                }}
                onSubmit={handleFormSubmit}
                editingDepartment={editingDepartment}
                doctors={doctors}
            />

        </div>
    );
}
