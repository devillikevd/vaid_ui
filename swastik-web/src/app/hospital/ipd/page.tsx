'use client';

import React, { useState, useEffect, useCallback, useDeferredValue } from 'react';
import Link from 'next/link';
import {
    BedDouble,
    Plus,
    Search,
    RefreshCw,
    Clock,
    User,
    CheckCircle2,
    ArrowLeftRight,
    LogOut,
    AlertCircle,
    Building2,
    Stethoscope,
    Eye,
    ChevronRight,
    X,
    Radio,
    Timer,
    Users,
    Activity,
    Layers,
    Loader2,
    Calendar,
    Phone,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NewAdmissionModal } from '@/components/hospital/ipd/NewAdmissionModal';
import { TransferBedModal } from '@/components/hospital/ipd/TransferBedModal';
import { DischargePatientModal } from '@/components/hospital/ipd/DischargePatientModal';
import { AdmissionDetailsDrawer } from '@/components/hospital/ipd/AdmissionDetailsDrawer';

const PAGE_SIZE = 15;

export default function IPDManagementPage() {
    // ── DATA STATES ──
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [census, setCensus] = useState<any>(null);
    const [occupancy, setOccupancy] = useState<any>(null);
    const [wards, setWards] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; name: string; specialization?: string; departmentId?: string; departmentName?: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingAdmissions, setLoadingAdmissions] = useState(true);
    const [admissionsError, setAdmissionsError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingCensus, setLoadingCensus] = useState(true);
    const [censusError, setCensusError] = useState<boolean>(false);

    const [loadingOccupancy, setLoadingOccupancy] = useState(true);
    const [occupancyError, setOccupancyError] = useState<boolean>(false);

    const [loadingWards, setLoadingWards] = useState(true);
    const [wardsError, setWardsError] = useState<boolean>(false);

    // ── FILTERS ──
    const [searchQuery, setSearchQuery] = useState('');
    const [wardFilter, setWardFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [admissionTypeFilter, setAdmissionTypeFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'admitted' | 'discharge_pending' | 'discharged' | 'transferred'>('all');
    const [page, setPage] = useState(1);

    // ── MODALS & DRAWER ──
    const [isNewAdmissionOpen, setIsNewAdmissionOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── INDEPENDENT FETCH FUNCTIONS ──

    // 1. Fetch Admissions (Main Table)
    const fetchAdmissions = useCallback(async () => {
        setLoadingAdmissions(true);
        setAdmissionsError(null);
        try {
            let effectiveStatus = statusFilter;
            if (activeTab === 'pending') effectiveStatus = 'pre_admission';
            else if (activeTab === 'admitted') effectiveStatus = 'admitted';
            else if (activeTab === 'discharge_pending') effectiveStatus = 'discharge_pending';
            else if (activeTab === 'discharged') effectiveStatus = 'discharged';
            else if (activeTab === 'transferred') effectiveStatus = 'transferred';

            const params: Record<string, any> = {
                page,
                limit: PAGE_SIZE,
                search: deferredSearch || undefined,
                status: effectiveStatus || undefined,
                wardId: wardFilter || undefined,
                doctorId: doctorFilter || undefined,
                departmentId: departmentFilter || undefined,
                admissionType: admissionTypeFilter || undefined,
            };

            const res = await hospitalApi.getAdmissions(params);
            if (res && res.success) {
                const d = (res.data ?? res) as any;
                setAdmissions(Array.isArray(d.data) ? d.data : []);
                setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load inpatient admissions';
                const isPerm = res?.status === 401 || res?.status === 403 || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied');
                setAdmissionsError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load inpatient admissions';
            const isPerm = err.status === 401 || err.status === 403 || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied');
            setAdmissionsError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingAdmissions(false);
        }
    }, [page, deferredSearch, statusFilter, wardFilter, doctorFilter, departmentFilter, admissionTypeFilter, activeTab]);

    // 2. Fetch IPD Census (Inpatients, Pending, Discharges)
    const fetchCensus = useCallback(async () => {
        setLoadingCensus(true);
        setCensusError(false);
        try {
            const res = await hospitalApi.getIPDCensus();
            if (res && res.success) {
                setCensus((res.data ?? res) as any);
            } else {
                setCensusError(true);
            }
        } catch (err) {
            setCensusError(true);
        } finally {
            setLoadingCensus(false);
        }
    }, []);

    // 3. Fetch Bed Occupancy (Capacity, Occupied, Available, Housekeeping)
    const fetchOccupancy = useCallback(async () => {
        setLoadingOccupancy(true);
        setOccupancyError(false);
        try {
            const res = await hospitalApi.getBedOccupancy();
            if (res && res.success) {
                setOccupancy((res.data ?? res) as any);
            } else {
                setOccupancyError(true);
            }
        } catch (err) {
            setOccupancyError(true);
        } finally {
            setLoadingOccupancy(false);
        }
    }, []);

    // 4. Fetch Wards & Beds Breakdown
    const fetchWardsAndBeds = useCallback(async () => {
        setLoadingWards(true);
        setWardsError(false);
        try {
            const [wardRes, bedRes] = await Promise.allSettled([
                hospitalApi.getWards(),
                hospitalApi.getBeds({ limit: 300 }),
            ]);

            if (wardRes.status === 'fulfilled' && (wardRes.value as any)?.success) {
                const rawWards = (wardRes.value as any).data?.wards || (wardRes.value as any).wards || (wardRes.value as any).data || [];
                setWards(Array.isArray(rawWards) ? rawWards : []);
            } else {
                setWardsError(true);
            }

            if (bedRes.status === 'fulfilled' && (bedRes.value as any)?.success) {
                const rawBeds = (bedRes.value as any).data?.data || (bedRes.value as any).data || [];
                setBeds(Array.isArray(rawBeds) ? rawBeds : []);
            }
        } catch (err) {
            setWardsError(true);
        } finally {
            setLoadingWards(false);
        }
    }, []);

    // 5. Fetch Doctors, Departments, and Staff Role (Once)
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
                console.error('Failed to load auxiliary metadata:', err);
            }
        };
        fetchAux();
    }, []);

    // Refresh all independent data sources
    const refreshAll = useCallback(() => {
        fetchAdmissions();
        fetchCensus();
        fetchOccupancy();
        fetchWardsAndBeds();
    }, [fetchAdmissions, fetchCensus, fetchOccupancy, fetchWardsAndBeds]);

    // Initial load
    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Polling fallback every 20 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAll();
        }, 20000);
        return () => clearInterval(interval);
    }, [refreshAll]);

    // Socket real-time event updates
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            refreshAll();
        };

        socket.on('admission:created', handleUpdate);
        socket.on('admission:updated', handleUpdate);
        socket.on('bed:updated', handleUpdate);

        return () => {
            socket.off('admission:created', handleUpdate);
            socket.off('admission:updated', handleUpdate);
            socket.off('bed:updated', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Reset pagination on filter changes
    useEffect(() => {
        setPage(1);
    }, [deferredSearch, statusFilter, wardFilter, doctorFilter, departmentFilter, admissionTypeFilter, activeTab]);

    // Calculate Occupancy Metrics
    const totalBedsCount = occupancy?.total_beds ?? (beds.length > 0 ? beds.length : null);
    const occupiedBedsCount = occupancy?.occupied_beds ?? (beds.length > 0 ? beds.filter((b) => b.status === 'occupied').length : null);
    const availableBedsCount = occupancy?.available_beds ?? (beds.length > 0 ? beds.filter((b) => b.status === 'available').length : null);
    const maintenanceBedsCount = occupancy?.maintenance_beds ?? (beds.length > 0 ? beds.filter((b) => b.status === 'maintenance' || b.status === 'housekeeping').length : null);
    const occupancyPercentage = (totalBedsCount && totalBedsCount > 0 && occupiedBedsCount !== null)
        ? Math.round((occupiedBedsCount / totalBedsCount) * 100)
        : null;

    const hasActiveFilters = Boolean(
        searchQuery ||
        wardFilter ||
        doctorFilter ||
        departmentFilter ||
        statusFilter ||
        admissionTypeFilter ||
        activeTab !== 'all'
    );

    const handleClearFilters = () => {
        setSearchQuery('');
        setWardFilter('');
        setDoctorFilter('');
        setDepartmentFilter('');
        setStatusFilter('');
        setAdmissionTypeFilter('');
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

    const calculateLos = (admittedAt?: string | null, dischargedAt?: string | null) => {
        if (!admittedAt) return '—';
        const start = new Date(admittedAt).getTime();
        const end = dischargedAt ? new Date(dischargedAt).getTime() : Date.now();
        const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    };

    const isGlobalRefreshing = loadingAdmissions || loadingCensus || loadingOccupancy || loadingWards;

    return (
        <div className="space-y-4">
            
            {/* 1. Header with Light HIS Style & Accurate Live Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <BedDouble className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    IPD Management
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
                                Manage inpatient admissions, wards, beds, transfers and discharge operations.
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
                    <button
                        type="button"
                        onClick={() => setIsNewAdmissionOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Admission</span>
                    </button>
                </div>
            </div>

            {/* 2. Compact Database-Backed KPI Row (Isolated States) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                
                {/* KPI 1: Current Inpatients (from Census) */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('admitted'); setStatusFilter('admitted'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'admitted'
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Current Inpatients</span>
                        <BedDouble className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                        {loadingCensus ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : censusError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            census?.total_admitted ?? (occupiedBedsCount !== null ? occupiedBedsCount : 0)
                        )}
                    </div>
                </button>

                {/* KPI 2: Total Bed Capacity (from Occupancy) */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Total Beds</span>
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {loadingOccupancy ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : occupancyError && totalBedsCount === null ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            totalBedsCount ?? 0
                        )}
                    </div>
                </div>

                {/* KPI 3: Available Beds (from Occupancy) */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Available Beds</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {loadingOccupancy ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : occupancyError && availableBedsCount === null ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            availableBedsCount ?? 0
                        )}
                    </div>
                </div>

                {/* KPI 4: Bed Occupancy (from Occupancy) */}
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Bed Occupancy</span>
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingOccupancy ? (
                            <span className="inline-block w-10 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : occupancyError && occupancyPercentage === null ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            `${occupancyPercentage ?? 0}%`
                        )}
                    </div>
                </div>

                {/* KPI 5: Pending Requests (from Census) */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('pending'); setStatusFilter('pre_admission'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'pending'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Pending Admissions</span>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {loadingCensus ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : censusError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            census?.pending_admissions ?? 0
                        )}
                    </div>
                </button>

                {/* KPI 6: Discharges Today (from Census) */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('discharged'); setStatusFilter('discharged'); }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'discharged'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">Pending / Discharges</span>
                        <LogOut className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {loadingCensus ? (
                            <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : censusError ? (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                        ) : (
                            census?.discharges_today ?? census?.pending_discharge ?? 0
                        )}
                    </div>
                </button>
            </div>

            {/* 3. Bed & Ward Occupancy Overview Card */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-teal-600" />
                            IPD Occupancy
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Real-time hospital bed allocation across departments and wards.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                            <span>Occupied: <strong>{occupiedBedsCount !== null ? occupiedBedsCount : '—'}</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Available: <strong>{availableBedsCount !== null ? availableBedsCount : '—'}</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span>Maintenance: <strong>{maintenanceBedsCount !== null ? maintenanceBedsCount : '—'}</strong></span>
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden flex">
                    <div
                        className="bg-teal-600 h-full transition-all duration-500"
                        style={{ width: `${occupancyPercentage || 0}%` }}
                        title={`Occupied: ${occupancyPercentage || 0}%`}
                    />
                    <div
                        className="bg-amber-400 h-full transition-all duration-500"
                        style={{ width: `${totalBedsCount && totalBedsCount > 0 ? ((maintenanceBedsCount || 0) / totalBedsCount) * 100 : 0}%` }}
                        title="Maintenance"
                    />
                </div>

                {/* Ward Breakdown Cards */}
                {loadingWards ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                        {[1, 2, 3, 4, 5].map((idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 animate-pulse h-16" />
                        ))}
                    </div>
                ) : wardsError ? (
                    <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700/60 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Unable to load ward breakdown.</span>
                        <button
                            type="button"
                            onClick={fetchWardsAndBeds}
                            className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                        >
                            Retry
                        </button>
                    </div>
                ) : wards.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                No wards configured yet
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Set up wards and beds to start managing IPD.
                            </p>
                        </div>
                        <Link
                            href="/hospital/beds"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                        >
                            <span>Set Up Wards</span>
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                        {wards.map((ward) => {
                            const wardBeds = beds.filter((b) => b.ward_id === ward.id);
                            const total = ward.total_beds || wardBeds.length || 0;
                            const occupied = ward.occupied_beds || wardBeds.filter((b) => b.status === 'occupied').length || 0;
                            const isSelected = wardFilter === ward.id;

                            return (
                                <button
                                    key={ward.id}
                                    type="button"
                                    onClick={() => setWardFilter(isSelected ? '' : ward.id)}
                                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-teal-50 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                                            : 'bg-slate-50/70 dark:bg-gray-800/40 border-slate-200/70 dark:border-gray-800 hover:border-teal-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                                            {ward.name}
                                        </p>
                                        <span className="text-[10px] text-slate-400 capitalize">
                                            {ward.floor || ward.ward_type || 'Ward'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-xs">
                                        <span className="font-bold text-teal-700 dark:text-teal-300 font-mono">
                                            {occupied} / {total} beds
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                            {total > 0 ? `${Math.round((occupied / total) * 100)}%` : '0%'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4. Inpatient Progression Pipeline */}
            <div className="p-3.5 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-teal-600" />
                        Inpatient Progression Pipeline
                    </span>
                    <span className="text-[10px] text-slate-400">
                        Click any workflow stage to filter records
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                    
                    {/* Stage 1: Pre-Admission */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('pending'); setStatusFilter('pre_admission'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 hover:border-amber-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
                            1
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block leading-tight">Admission Request</span>
                            <span className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                                {loadingCensus ? '—' : censusError ? '—' : (census?.pending_admissions ?? 0)}
                            </span>
                        </div>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 2: Admitted & Bed Assigned */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('admitted'); setStatusFilter('admitted'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 hover:border-teal-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center">
                            2
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 block leading-tight">Admitted & In Care</span>
                            <span className="font-bold text-teal-800 dark:text-teal-200 text-sm">
                                {loadingCensus ? '—' : censusError ? '—' : (census?.total_admitted ?? (occupiedBedsCount !== null ? occupiedBedsCount : 0))}
                            </span>
                        </div>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 3: Discharge Pending */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('discharge_pending'); setStatusFilter('discharge_pending'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                            3
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 block leading-tight">Discharge Pending</span>
                            <span className="font-bold text-blue-800 dark:text-blue-200 text-sm">
                                {loadingCensus ? '—' : censusError ? '—' : (census?.pending_discharge ?? 0)}
                            </span>
                        </div>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />

                    {/* Stage 4: Discharged */}
                    <button
                        type="button"
                        onClick={() => { setActiveTab('discharged'); setStatusFilter('discharged'); }}
                        className="flex items-center gap-2 flex-1 w-full p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-400 transition-colors cursor-pointer text-left"
                    >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                            ✓
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block leading-tight">Discharged</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                                {loadingCensus ? '—' : censusError ? '—' : (census?.discharges_today ?? 0)}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* 5. Admission Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'all', label: 'All Inpatients' },
                    { id: 'pending', label: 'Pending Admission' },
                    { id: 'admitted', label: 'Admitted' },
                    { id: 'discharge_pending', label: 'Discharge Pending' },
                    { id: 'discharged', label: 'Discharged' },
                    { id: 'transferred', label: 'Transferred' },
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

            {/* 6. Search & Advanced Filter Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                    
                    {/* Search */}
                    <div className="lg:col-span-4 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search patient, UHID, admission ID, doctor..."
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

                    {/* Ward */}
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

                    {/* Admission Type */}
                    <div className="lg:col-span-2">
                        <select
                            value={admissionTypeFilter}
                            onChange={(e) => setAdmissionTypeFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Admission Types</option>
                            <option value="elective">Elective</option>
                            <option value="emergency">Emergency</option>
                            <option value="transfer_in">Transfer In</option>
                            <option value="day_care">Day Care</option>
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

            {/* 7. Enterprise IPD Table with Strict State Separation */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                
                {/* LOADING STATE */}
                {loadingAdmissions ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                        <span className="text-xs text-slate-500 font-medium">Loading inpatient admissions...</span>
                    </div>
                ) : admissionsError && admissions.length === 0 ? (
                    /* ERROR STATE WITH DEDICATED RETRY */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {admissionsError.isPermission ? "Access Denied" : "Unable to load inpatient admissions"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                            {admissionsError.isPermission
                                ? "You don't have permission to access IPD management."
                                : "We couldn't retrieve the latest admission records. Please check your connection and try again."}
                        </p>
                        {!admissionsError.isPermission && (
                            <button
                                type="button"
                                onClick={fetchAdmissions}
                                disabled={loadingAdmissions}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry</span>
                            </button>
                        )}
                    </div>
                ) : admissions.length === 0 ? (
                    /* CLEAN EMPTY STATE */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                            <BedDouble className="w-7 h-7 text-teal-500" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {hasActiveFilters ? 'No patients match the current filters' : 'No patients are currently admitted'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                            {hasActiveFilters
                                ? 'Adjust or clear your search terms and filters to view admissions.'
                                : 'No patients are currently admitted to this hospital. Click "New Admission" to admit a patient.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsNewAdmissionOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>+ New Admission</span>
                            </button>
                        )}
                    </div>
                ) : (
                    /* ENTERPRISE INPATIENT RECORDS TABLE */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 px-4">Patient</th>
                                    <th className="py-3 px-4">UHID</th>
                                    <th className="py-3 px-4">Admission</th>
                                    <th className="py-3 px-4">Doctor / Department</th>
                                    <th className="py-3 px-4">Ward / Bed</th>
                                    <th className="py-3 px-4">Admitted</th>
                                    <th className="py-3 px-4">LOS</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                {admissions.map((adm) => (
                                    <tr
                                        key={adm.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* Patient */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {adm.patient?.name || 'Patient'}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                                                {[
                                                    adm.patient?.gender,
                                                    adm.patient?.date_of_birth ? `${new Date().getFullYear() - new Date(adm.patient.date_of_birth).getFullYear()}y` : null,
                                                    adm.blood_group || adm.patient?.blood_group
                                                ].filter(Boolean).join(' • ')}
                                            </div>
                                        </td>

                                        {/* UHID */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                                                {adm.patient?.uhid || `UHID-${(adm.patient_id || adm.id).slice(0, 8).toUpperCase()}`}
                                            </span>
                                        </td>

                                        {/* Admission Number & Type */}
                                        <td className="py-3 px-4">
                                            <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {adm.admission_number || adm.id.slice(0, 8).toUpperCase()}
                                            </p>
                                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 capitalize">
                                                {adm.admission_type?.replace('_', ' ') || 'Elective'}
                                            </span>
                                        </td>

                                        {/* Doctor & Department */}
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                Dr. {adm.admittingDoctor?.name || adm.attendingDoctor?.name || 'Physician'}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                                {adm.department?.name || adm.admittingDoctor?.specialization || 'IPD'}
                                            </p>
                                        </td>

                                        {/* Ward / Bed */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                {adm.ward?.name || 'General Ward'}
                                            </p>
                                            <p className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold">
                                                {adm.bed?.bed_number ? `Bed ${adm.bed.bed_number}` : 'Unallocated'}
                                            </p>
                                        </td>

                                        {/* Admitted Timestamp */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {formatDate(adm.admitted_at)}
                                            </span>
                                        </td>

                                        {/* LOS */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {calculateLos(adm.admitted_at, adm.discharged_at)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <StatusBadge status={adm.status} size="sm" />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                {adm.status === 'admitted' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAdmission(adm);
                                                                setIsTransferModalOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                                                            title="Transfer Bed"
                                                        >
                                                            <ArrowLeftRight className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAdmission(adm);
                                                                setIsDischargeModalOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                                                            title="Discharge Patient"
                                                        >
                                                            <LogOut className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAdmission(adm);
                                                        setIsDrawerOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                    title="Open Inpatient Workspace"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>View</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loadingAdmissions && admissions.length > 0 && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total inpatients)
                        </span>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                )}
            </div>

            {/* 8. Modals & Drawers */}
            <NewAdmissionModal
                isOpen={isNewAdmissionOpen}
                onClose={() => setIsNewAdmissionOpen(false)}
                onAdmissionCreated={refreshAll}
                doctors={doctors}
                departments={departments}
                wards={wards}
                beds={beds}
            />

            <TransferBedModal
                admission={selectedAdmission}
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onTransferred={refreshAll}
                wards={wards}
                beds={beds}
            />

            <DischargePatientModal
                admission={selectedAdmission}
                isOpen={isDischargeModalOpen}
                onClose={() => setIsDischargeModalOpen(false)}
                onDischarged={refreshAll}
            />

            <AdmissionDetailsDrawer
                admission={selectedAdmission}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onTransferClick={() => {
                    setIsDrawerOpen(false);
                    setIsTransferModalOpen(true);
                }}
                onDischargeClick={() => {
                    setIsDrawerOpen(false);
                    setIsDischargeModalOpen(true);
                }}
                onRefresh={refreshAll}
                staffRole={staffRole}
            />

        </div>
    );
}
