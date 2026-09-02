'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Stethoscope,
    RefreshCw,
    Search,
    User,
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
    UserPlus,
    Mail,
    Phone,
    Star,
    Award,
    ShieldCheck,
    Download,
    Users,
    UserCheck,
    UserX,
    Inbox,
    Filter,
    Loader2,
    Check,
    Trash2,
    ArrowRight
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { DoctorDetailsDrawer } from '@/components/hospital/DoctorDetailsDrawer';
import { InviteDoctorModal } from '@/components/hospital/InviteDoctorModal';

const PAGE_SIZE = 15;

export default function HospitalDoctorsPage() {
    const searchParams = useSearchParams();
    const toast = useToast();

    // ── ACTIVE TAB ──
    const [tab, setTab] = useState<'roster' | 'departments' | 'invites' | 'requests'>(() => {
        const t = searchParams.get('tab');
        if (t === 'invites' || t === 'requests' || t === 'departments') return t;
        return 'roster';
    });

    // ── DATA STATES ──
    const [doctors, setDoctors] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [stats, setStats] = useState<any>(null);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [invitesPagination, setInvitesPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [joinRequests, setJoinRequests] = useState<any[]>([]);
    const [joinRequestsPagination, setJoinRequestsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [doctorsError, setDoctorsError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<boolean>(false);

    const [loadingInvites, setLoadingInvites] = useState(false);
    const [invitesError, setInvitesError] = useState<string | null>(null);

    const [loadingRequests, setLoadingRequests] = useState(false);
    const [requestsError, setRequestsError] = useState<string | null>(null);

    // ── FILTERS ──
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [specializationFilter, setSpecializationFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // ── MODALS & DRAWER ──
    const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH DOCTOR ROSTER ──
    const fetchDoctorsList = useCallback(async () => {
        setLoadingDoctors(true);
        setDoctorsError(null);
        try {
            const isAvail = statusFilter === 'active' ? true : statusFilter === 'on-leave' ? false : undefined;
            const res = await hospitalApi.getDoctors(page, deferredSearch, PAGE_SIZE, {
                specialization: specializationFilter || undefined,
                isAvailable: isAvail,
            });

            if (res && res.success) {
                let rawList: any[] = [];
                if (Array.isArray(res.data)) {
                    rawList = res.data;
                } else if (res.data && Array.isArray((res.data as any).data)) {
                    rawList = (res.data as any).data;
                } else if (Array.isArray((res as any).doctors)) {
                    rawList = (res as any).doctors;
                }

                // Additional client filter for department / employment type
                if (departmentFilter) {
                    rawList = rawList.filter((doc: any) => doc.department === departmentFilter);
                }
                if (employmentTypeFilter) {
                    rawList = rawList.filter((doc: any) =>
                        (doc.employmentType || doc.designation || '').toLowerCase().includes(employmentTypeFilter.toLowerCase())
                    );
                }

                setDoctors(rawList);
                setPagination(
                    res.pagination ||
                    (res.data as any)?.pagination ||
                    { page: 1, totalPages: 1, total: rawList.length }
                );
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load hospital doctors';
                const isPerm = res?.status === 401 || res?.status === 403;
                setDoctorsError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load hospital doctors';
            const isPerm = err.status === 401 || err.status === 403;
            setDoctorsError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingDoctors(false);
        }
    }, [page, deferredSearch, departmentFilter, specializationFilter, statusFilter, employmentTypeFilter]);

    // ── FETCH DOCTOR STATS ──
    const fetchDoctorStats = useCallback(async () => {
        setLoadingStats(true);
        setStatsError(false);
        try {
            const res = await hospitalApi.getDoctorStats();
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

    // ── FETCH PENDING INVITES ──
    const fetchDoctorInvitesList = useCallback(async () => {
        setLoadingInvites(true);
        setInvitesError(null);
        try {
            const res = await hospitalApi.getDoctorInvites({ page: 1, limit: 50, status: 'pending' });
            if (res && res.success) {
                const d = (res.data ?? res) as any;
                setInvites(Array.isArray(d.data) ? d.data : []);
                setInvitesPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            } else {
                setInvitesError(res?.message || 'Unable to load pending invitations');
            }
        } catch (err: any) {
            setInvitesError(err.message || 'Unable to load pending invitations');
        } finally {
            setLoadingInvites(false);
        }
    }, []);

    // ── FETCH JOIN REQUESTS ──
    const fetchJoinRequestsList = useCallback(async () => {
        setLoadingRequests(true);
        setRequestsError(null);
        try {
            const res = await hospitalApi.getJoinRequests({ page: 1, limit: 50, status: 'pending' });
            if (res && res.success) {
                const d = (res.data ?? res) as any;
                setJoinRequests(Array.isArray(d.data) ? d.data : []);
                setJoinRequestsPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            } else {
                setRequestsError(res?.message || 'Unable to load doctor join requests');
            }
        } catch (err: any) {
            setRequestsError(err.message || 'Unable to load doctor join requests');
        } finally {
            setLoadingRequests(false);
        }
    }, []);

    // ── FETCH DEPARTMENTS & STAFF ROLE ──
    useEffect(() => {
        const fetchAux = async () => {
            try {
                const [roleRes, deptsRes] = await Promise.allSettled([
                    hospitalApi.getMyStaffRole(),
                    hospitalApi.getDepartments(),
                ]);

                if (roleRes.status === 'fulfilled' && (roleRes.value as any)?.success && (roleRes.value as any)?.staffRole) {
                    setStaffRole((roleRes.value as any).staffRole);
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
                console.error('Failed to load auxiliary metadata:', err);
            }
        };
        fetchAux();
    }, []);

    // Refresh active tab and stats
    const refreshAll = useCallback(() => {
        fetchDoctorStats();
        if (tab === 'roster' || tab === 'departments') {
            fetchDoctorsList();
        } else if (tab === 'invites') {
            fetchDoctorInvitesList();
        } else if (tab === 'requests') {
            fetchJoinRequestsList();
        }
    }, [tab, fetchDoctorStats, fetchDoctorsList, fetchDoctorInvitesList, fetchJoinRequestsList]);

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

        socket.on('doctor:associated', handleUpdate);
        socket.on('doctor:removed', handleUpdate);
        socket.on('doctor_invite:sent', handleUpdate);
        socket.on('doctor_invite:updated', handleUpdate);
        socket.on('join_request:created', handleUpdate);

        return () => {
            socket.off('doctor:associated', handleUpdate);
            socket.off('doctor:removed', handleUpdate);
            socket.off('doctor_invite:sent', handleUpdate);
            socket.off('doctor_invite:updated', handleUpdate);
            socket.off('join_request:created', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Reset pagination on filter changes
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, departmentFilter, specializationFilter, statusFilter, employmentTypeFilter]);

    // ── DOCTOR ACTIONS ──
    const handleEndAffiliation = async (doctorId: string) => {
        setActionLoading(`end-${doctorId}`);
        try {
            const res = await hospitalApi.removeDoctor(doctorId);
            if (res && res.success) {
                toast.success('Affiliation Ended', 'Doctor has been removed from hospital duty roster.');
                refreshAll();
            } else {
                toast.error('Failed', res?.message || 'Could not end doctor affiliation.');
            }
        } catch (err: any) {
            toast.error('Failed', err.message || 'Could not end doctor affiliation.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        setActionLoading(`cancel-invite-${inviteId}`);
        try {
            const res = await hospitalApi.cancelDoctorInvite(inviteId);
            if (res && res.success) {
                toast.success('Invite Cancelled', 'Doctor invitation has been revoked.');
                fetchDoctorInvitesList();
                fetchDoctorStats();
            } else {
                toast.error('Failed', res?.message || 'Could not cancel invitation.');
            }
        } catch (err: any) {
            toast.error('Failed', err.message || 'Could not cancel invitation.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRespondJoinRequest = async (requestId: string, decision: 'accept' | 'reject') => {
        setActionLoading(`join-req-${requestId}-${decision}`);
        try {
            const res = await hospitalApi.respondToJoinRequest(requestId, decision);
            if (res && res.success) {
                toast.success(
                    decision === 'accept' ? 'Join Request Approved' : 'Join Request Declined',
                    decision === 'accept'
                        ? 'Doctor is now affiliated with the hospital.'
                        : 'The join request was declined.'
                );
                fetchJoinRequestsList();
                fetchDoctorStats();
                if (decision === 'accept') fetchDoctorsList();
            } else {
                toast.error('Failed', res?.message || 'Could not process join request.');
            }
        } catch (err: any) {
            toast.error('Failed', err.message || 'Could not process join request.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── CSV EXPORT ──
    const handleExportDoctors = () => {
        if (doctors.length === 0) {
            toast.error('Export Empty', 'No doctors available to export.');
            return;
        }

        const headers = ['Doctor Name', 'Specialization', 'Department', 'Employment Type', 'Email', 'Phone', 'Status', 'Appointments Today'];
        const rows = doctors.map(d => [
            `"Dr. ${d.name || ''}"`,
            `"${d.specialization || ''}"`,
            `"${d.department || ''}"`,
            `"${d.employmentType || d.designation || 'Full-Time'}"`,
            `"${d.email || ''}"`,
            `"${d.phone || ''}"`,
            `"${d.status || 'Active'}"`,
            `"${d.appointmentsToday || 0}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `hospital_doctors_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Export Successful', 'Doctor staff roster exported to CSV.');
    };

    // Unique specializations for filter dropdown
    const specializations = useMemo(() => {
        const set = new Set<string>();
        doctors.forEach(d => {
            if (d.specialization) set.add(d.specialization);
        });
        return Array.from(set);
    }, [doctors]);

    // Department grouping for "By Department" view
    const departmentGrouped = useMemo(() => {
        const map = new Map<string, any[]>();
        departments.forEach(dept => map.set(dept.name, []));
        map.set('Unassigned', []);

        doctors.forEach(doc => {
            const dName = doc.department || 'Unassigned';
            if (!map.has(dName)) map.set(dName, []);
            map.get(dName)!.push(doc);
        });

        return Array.from(map.entries()).map(([deptName, docs]) => ({
            name: deptName,
            count: docs.length,
            doctors: docs,
        }));
    }, [doctors, departments]);

    const hasActiveFilters = Boolean(
        searchQuery ||
        departmentFilter ||
        specializationFilter ||
        statusFilter ||
        employmentTypeFilter
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setDepartmentFilter('');
        setSpecializationFilter('');
        setStatusFilter('');
        setEmploymentTypeFilter('');
        setPage(1);
    };

    const isGlobalRefreshing = loadingDoctors || loadingStats || loadingInvites || loadingRequests;
    const canManageDoctors = ['hospital_owner', 'hospital_admin', 'hospital_manager'].includes(staffRole);

    return (
        <div className="space-y-4">
            
            {/* 1. Page Header with Enterprise Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Doctors
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
                                Manage doctors, hospital affiliations, departments, schedules and access.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={handleExportDoctors}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Doctors</span>
                    </button>
                    <button
                        type="button"
                        onClick={refreshAll}
                        disabled={isGlobalRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGlobalRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    {canManageDoctors && (
                        <button
                            type="button"
                            onClick={() => setIsInviteModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Invite Doctor</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Top Database-Backed KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* KPI 1: Total Doctors */}
                <button
                    type="button"
                    onClick={() => { setTab('roster'); setStatusFilter(''); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        tab === 'roster' && !statusFilter
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Total Doctors</span>
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.total_doctors ?? doctors.length
                        )}
                    </div>
                </button>

                {/* KPI 2: Active Doctors */}
                <button
                    type="button"
                    onClick={() => { setTab('roster'); setStatusFilter('active'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        tab === 'roster' && statusFilter === 'active'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Active Staff</span>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.active_doctors ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 3: On Leave */}
                <button
                    type="button"
                    onClick={() => { setTab('roster'); setStatusFilter('on-leave'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        tab === 'roster' && statusFilter === 'on-leave'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">On Leave</span>
                        <UserX className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.on_leave ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 4: Pending Invitations */}
                <button
                    type="button"
                    onClick={() => setTab('invites')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        tab === 'invites'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Pending Invites</span>
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.pending_invitations ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 5: Join Requests */}
                <button
                    type="button"
                    onClick={() => setTab('requests')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        tab === 'requests'
                            ? 'bg-violet-50/80 border-violet-300 dark:bg-violet-950/40 dark:border-violet-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-violet-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Join Requests</span>
                        <Inbox className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-400">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.join_requests ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 6: Departments Covered */}
                <button
                    type="button"
                    onClick={() => setTab('departments')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        tab === 'departments'
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Depts Covered</span>
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingStats ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : statsError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            stats?.departments_covered ?? departments.length
                        )}
                    </div>
                </button>
            </div>

            {/* 3. Directory Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'roster', label: 'Active Doctors', count: stats?.total_doctors ?? doctors.length },
                    { id: 'departments', label: 'By Department', count: stats?.departments_covered ?? departments.length },
                    { id: 'invites', label: 'Pending Invitations', count: stats?.pending_invitations ?? invites.length },
                    { id: 'requests', label: 'Join Requests', count: stats?.join_requests ?? joinRequests.length },
                ].map((item) => {
                    const isActive = tab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                setTab(item.id as any);
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

            {/* 4. TAB CONTENT: ROSTER & DEPARTMENTS */}
            {(tab === 'roster' || tab === 'departments') && (
                <div className="space-y-3">
                    
                    {/* Search & Filter Toolbar */}
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                            
                            {/* Search */}
                            <div className="lg:col-span-4 relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search doctor name, email, specialization, phone..."
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
                                        <option key={d.id} value={d.name}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Specialization */}
                            <div className="lg:col-span-2">
                                <select
                                    value={specializationFilter}
                                    onChange={(e) => setSpecializationFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Specialties</option>
                                    {specializations.map((spec) => (
                                        <option key={spec} value={spec}>
                                            {spec}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="lg:col-span-2">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active Staff</option>
                                    <option value="on-leave">On Leave</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Employment Type */}
                            <div className="lg:col-span-2">
                                <select
                                    value={employmentTypeFilter}
                                    onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Employment Types</option>
                                    <option value="full_time">Full-Time</option>
                                    <option value="visiting">Visiting Consultant</option>
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

                    {/* Department Grouped Cards (When "By Department" tab is active) */}
                    {tab === 'departments' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {departmentGrouped.map((dept) => (
                                <div
                                    key={dept.name}
                                    className="p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-teal-600" />
                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                {dept.name}
                                            </h4>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                            {dept.count} {dept.count === 1 ? 'Doctor' : 'Doctors'}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {dept.doctors.slice(0, 3).map((doc) => (
                                            <div
                                                key={doc.id}
                                                onClick={() => {
                                                    setSelectedDoctor(doc);
                                                    setIsDrawerOpen(true);
                                                }}
                                                className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800/60 flex items-center justify-between text-xs cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                        {doc.name ? doc.name[0].toUpperCase() : 'D'}
                                                    </div>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                        Dr. {doc.name}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                    {doc.specialization}
                                                </span>
                                            </div>
                                        ))}
                                        {dept.count > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDepartmentFilter(dept.name);
                                                    setTab('roster');
                                                }}
                                                className="text-[11px] font-bold text-teal-600 hover:underline pt-1 block"
                                            >
                                                + View all {dept.count} doctors in {dept.name}
                                            </button>
                                        )}
                                        {dept.count === 0 && (
                                            <p className="text-[11px] text-slate-400 py-1 italic">
                                                No doctors currently assigned to this department.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Enterprise Doctor Roster Table */}
                    {tab === 'roster' && (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                            
                            {/* LOADING STATE */}
                            {loadingDoctors ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                                    <span className="text-xs text-slate-500 font-medium">Loading medical staff directory...</span>
                                </div>
                            ) : doctorsError && doctors.length === 0 ? (
                                /* ERROR STATE */
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                                        <ShieldAlert className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        {doctorsError.isPermission ? "Access Denied" : "Unable to load hospital doctors"}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                                        {doctorsError.isPermission
                                            ? "You don't have permission to manage hospital medical staff."
                                            : "We couldn't retrieve the latest doctor records. Please check your connection and try again."}
                                    </p>
                                    {!doctorsError.isPermission && (
                                        <button
                                            type="button"
                                            onClick={fetchDoctorsList}
                                            disabled={loadingDoctors}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>Retry</span>
                                        </button>
                                    )}
                                </div>
                            ) : doctors.length === 0 ? (
                                /* EMPTY STATE */
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                        <Stethoscope className="w-7 h-7 text-teal-500" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        {hasActiveFilters ? 'No doctors match your current filters' : 'No doctors are currently affiliated with this hospital'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                        {hasActiveFilters
                                            ? 'Try adjusting or clearing your search criteria.'
                                            : 'Invite doctors to your hospital to begin scheduling OPD and consultations.'}
                                    </p>
                                    {hasActiveFilters ? (
                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                        >
                                            Clear Filters
                                        </button>
                                    ) : canManageDoctors && (
                                        <button
                                            type="button"
                                            onClick={() => setIsInviteModalOpen(true)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>Invite First Doctor</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                /* DATA TABLE */
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                <th className="py-3 px-4">Doctor</th>
                                                <th className="py-3 px-4">Specialization</th>
                                                <th className="py-3 px-4">Department</th>
                                                <th className="py-3 px-4">Employment / Affiliation</th>
                                                <th className="py-3 px-4">Consultation Modes</th>
                                                <th className="py-3 px-4">Today's Schedule</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                            {doctors.map((doc) => (
                                                <tr
                                                    key={doc.id}
                                                    className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                                >
                                                    {/* Doctor Identity */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                                                {doc.profileImageUrl ? (
                                                                    <img
                                                                        src={doc.profileImageUrl}
                                                                        alt={doc.name}
                                                                        className="w-full h-full object-cover rounded-xl"
                                                                    />
                                                                ) : (
                                                                    doc.name ? doc.name[0].toUpperCase() : 'D'
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                                                                    <span>Dr. {doc.name}</span>
                                                                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                                                </div>
                                                                <span className="font-mono text-[10px] text-slate-400">
                                                                    {doc.id ? `DOC-${doc.id.slice(0, 8).toUpperCase()}` : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Specialization */}
                                                    <td className="py-3 px-4">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {doc.specialization || 'General Medicine'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {doc.experience ? `${doc.experience}y experience` : 'Consultant'}
                                                        </p>
                                                    </td>

                                                    {/* Department */}
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {doc.department || 'Unassigned'}
                                                        </span>
                                                    </td>

                                                    {/* Employment / Affiliation */}
                                                    <td className="py-3 px-4">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                                            {doc.employmentType || doc.designation || 'Full-Time'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {doc.joinedAt ? `Affiliated ${new Date(doc.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : 'Active Staff'}
                                                        </span>
                                                    </td>

                                                    {/* Consultation Modes */}
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

                                                    {/* Today's Schedule */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="font-medium">09:00 AM – 05:00 PM</span>
                                                        </div>
                                                        <span className="text-[10px] text-teal-600 font-semibold block mt-0.5">
                                                            {doc.appointmentsToday || 0} visits booked today
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <StatusBadge status={doc.status || 'active'} size="sm" />
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedDoctor(doc);
                                                                setIsDrawerOpen(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                            title="View Doctor Profile & Workspace"
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
                            {!loadingDoctors && doctors.length > 0 && pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Showing page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total doctors)
                                    </span>
                                    <Pagination
                                        currentPage={page}
                                        totalPages={pagination.totalPages}
                                        onPageChange={(p) => setPage(p)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* 5. TAB CONTENT: PENDING INVITATIONS */}
            {tab === 'invites' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                    {loadingInvites ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                            <span className="text-xs text-slate-500 font-medium">Loading pending doctor invitations...</span>
                        </div>
                    ) : invitesError ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <AlertCircle className="w-7 h-7 text-rose-500 mb-2" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Unable to load pending invitations
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{invitesError}</p>
                            <button
                                type="button"
                                onClick={fetchDoctorInvitesList}
                                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : invites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                <Mail className="w-7 h-7 text-teal-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                No pending doctor invitations
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                All sent invitations have been accepted or processed.
                            </p>
                            {canManageDoctors && (
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Invite New Doctor</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Doctor</th>
                                        <th className="py-3 px-4">Specialization</th>
                                        <th className="py-3 px-4">Assigned Department</th>
                                        <th className="py-3 px-4">Invited Date</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                    {invites.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                    Dr. {inv.doctor?.name || 'Invited Doctor'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {inv.doctor?.user?.email || '—'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                                    {inv.doctor?.specialization || 'Specialist'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {inv.department || 'General'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-slate-600 dark:text-slate-400 font-mono">
                                                    {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                                    Pending Response
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {canManageDoctors && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelInvite(inv.id)}
                                                        disabled={actionLoading === `cancel-invite-${inv.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-rose-200"
                                                    >
                                                        {actionLoading === `cancel-invite-${inv.id}` ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Cancel Invite</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* 6. TAB CONTENT: JOIN REQUESTS */}
            {tab === 'requests' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                    {loadingRequests ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                            <span className="text-xs text-slate-500 font-medium">Loading doctor join requests...</span>
                        </div>
                    ) : requestsError ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <AlertCircle className="w-7 h-7 text-rose-500 mb-2" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Unable to load join requests
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{requestsError}</p>
                            <button
                                type="button"
                                onClick={fetchJoinRequestsList}
                                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : joinRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                <Inbox className="w-7 h-7 text-teal-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                No pending doctor join requests
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                When licensed doctors submit requests to affiliate with your hospital, they will appear here for administrative approval.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Doctor</th>
                                        <th className="py-3 px-4">Specialization</th>
                                        <th className="py-3 px-4">Requested Department</th>
                                        <th className="py-3 px-4">Request Date</th>
                                        <th className="py-3 px-4">Experience</th>
                                        <th className="py-3 px-4 text-right">Administrative Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                    {joinRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                    Dr. {req.doctor?.name || 'Doctor'}
                                                </div>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                    DOC-{req.doctor_id?.slice(0, 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                                    {req.doctor?.specialization || 'Specialist'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {req.department || 'General Clinical'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-slate-600 dark:text-slate-400 font-mono">
                                                    {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {req.doctor?.experience_years ? `${req.doctor.experience_years} years` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                {canManageDoctors && (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondJoinRequest(req.id, 'accept')}
                                                            disabled={actionLoading === `join-req-${req.id}-accept`}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                                        >
                                                            {actionLoading === `join-req-${req.id}-accept` ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>Approve</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondJoinRequest(req.id, 'reject')}
                                                            disabled={actionLoading === `join-req-${req.id}-reject`}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                                        >
                                                            {actionLoading === `join-req-${req.id}-reject` ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <X className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>Decline</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* 7. Doctor Details Workspace Drawer */}
            <DoctorDetailsDrawer
                doctor={selectedDoctor}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onEndAffiliation={handleEndAffiliation}
                canManageDoctors={canManageDoctors}
            />

            {/* 8. Invite Doctor Modal */}
            <InviteDoctorModal
                isOpen={isInviteModalOpen}
                onClose={() => {
                    setIsInviteModalOpen(false);
                    refreshAll();
                }}
            />

        </div>
    );
}
