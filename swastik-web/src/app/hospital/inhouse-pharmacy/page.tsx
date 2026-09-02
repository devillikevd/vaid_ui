'use client';

import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import Link from 'next/link';
import {
    Pill,
    Package,
    Plus,
    Search,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    TrendingUp,
    Filter,
    Loader2,
    Calendar,
    ArrowUpRight,
    Tag,
    Boxes,
    ShoppingCart,
    Send,
    X,
    Building2,
    Check,
    RefreshCw,
    ShieldAlert,
    AlertCircle,
    Eye,
    Edit3,
    DollarSign,
    QrCode,
    History,
    Activity,
    ArrowRight,
    ShieldCheck,
    CheckCheck,
    Stethoscope,
    Radio
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { DispenseMedicineModal } from '@/components/hospital/pharmacy/DispenseMedicineModal';
import { AddStockModal } from '@/components/hospital/pharmacy/AddStockModal';
import { PrescriptionDetailsDrawer } from '@/components/hospital/pharmacy/PrescriptionDetailsDrawer';

const PAGE_SIZE = 15;

export default function InhousePharmacyPage() {
    const toast = useToast();

    // ── DATA STATES ──
    const [inventory, setInventory] = useState<any[]>([]);
    const [invPagination, setInvPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [queue, setQueue] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [histPagination, setHistPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [doctors, setDoctors] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [staffRole, setStaffRole] = useState('hospital_owner');

    // ── INDEPENDENT LOADING & ERROR STATES ──
    const [loadingQueue, setLoadingQueue] = useState(true);
    const [queueError, setQueueError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingInventory, setLoadingInventory] = useState(true);
    const [inventoryError, setInventoryError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState<{ message: string; isPermission: boolean } | null>(null);

    const [loadingKpis, setLoadingKpis] = useState(true);
    const [kpisError, setKpisError] = useState<boolean>(false);

    // ── TABS & FILTERS ──
    const [activeTab, setActiveTab] = useState<'queue' | 'inventory' | 'alerts' | 'history'>('queue');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [page, setPage] = useState(1);

    // ── MODALS & DRAWER ──
    const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [editingStockItem, setEditingStockItem] = useState<any | null>(null);

    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    // ── SOCKET STATUS ──
    const socket = useSocket();
    const isSocketConnected = Boolean(socket?.isConnected);

    // ── FETCH PRESCRIPTION QUEUE ──
    const fetchQueue = useCallback(async () => {
        setLoadingQueue(true);
        setQueueError(null);
        try {
            const res = await hospitalApi.getPendingDispensations();
            if (res && res.success) {
                const encs = Array.isArray(res.recentEncounters) ? res.recentEncounters : [];
                const adms = Array.isArray(res.admissions) ? res.admissions : [];
                setQueue([...encs, ...adms]);
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load prescription queue';
                const isPerm = res?.status === 401 || res?.status === 403;
                setQueueError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load prescription queue';
            const isPerm = err.status === 401 || err.status === 403;
            setQueueError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingQueue(false);
        }
    }, []);

    // ── FETCH INVENTORY ──
    const fetchInventory = useCallback(async () => {
        setLoadingInventory(true);
        setInventoryError(null);
        try {
            const params: Record<string, any> = {
                page,
                limit: PAGE_SIZE,
            };
            if (deferredSearch) params.search = deferredSearch;
            if (selectedCategory) params.category = selectedCategory;
            if (showLowStockOnly) params.lowStock = true;
            if (showOutOfStockOnly) params.outOfStock = true;

            const res = await hospitalApi.getInhouseInventory(params);
            if (res && res.success) {
                const raw = Array.isArray(res.inventory) ? res.inventory : (res.data as any)?.inventory || [];
                setInventory(raw);
                setInvPagination(
                    res.pagination ||
                    (res.data as any)?.pagination ||
                    { page: 1, totalPages: 1, total: raw.length }
                );
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load medicine inventory';
                const isPerm = res?.status === 401 || res?.status === 403;
                setInventoryError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load medicine inventory';
            const isPerm = err.status === 401 || err.status === 403;
            setInventoryError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingInventory(false);
        }
    }, [page, deferredSearch, selectedCategory, showLowStockOnly, showOutOfStockOnly]);

    // ── FETCH HISTORY ──
    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        setHistoryError(null);
        try {
            const params: Record<string, any> = { page, limit: PAGE_SIZE };
            const res = await hospitalApi.getDispensationsHistory(params);
            if (res && res.success) {
                const raw = Array.isArray(res.dispensations) ? res.dispensations : [];
                setHistory(raw);
                setHistPagination(
                    res.pagination ||
                    { page: 1, totalPages: 1, total: raw.length }
                );
            } else {
                const errMsg = res?.message || res?.error || 'Unable to load dispensation history';
                const isPerm = res?.status === 401 || res?.status === 403;
                setHistoryError({ message: errMsg, isPermission: isPerm });
            }
        } catch (err: any) {
            const errMsg = err.message || 'Unable to load dispensation history';
            const isPerm = err.status === 401 || err.status === 403;
            setHistoryError({ message: errMsg, isPermission: isPerm });
        } finally {
            setLoadingHistory(false);
        }
    }, [page]);

    // ── FETCH KPIS ──
    const fetchKpis = useCallback(async () => {
        setLoadingKpis(true);
        setKpisError(false);
        try {
            const res = await hospitalApi.getInhousePharmacyKpis(dateFilter || undefined);
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

    // ── FETCH METADATA (ROLE & DOCTORS) ──
    const fetchMetadata = useCallback(async () => {
        try {
            const [roleRes, docsRes] = await Promise.allSettled([
                hospitalApi.getMyStaffRole(),
                hospitalApi.getDoctors(1, '', 100),
            ]);

            if (roleRes.status === 'fulfilled' && (roleRes.value as any)?.success && (roleRes.value as any)?.staffRole) {
                setStaffRole(String((roleRes.value as any).staffRole));
            }
            if (docsRes.status === 'fulfilled' && (docsRes.value as any)?.success) {
                const rawDocs = (docsRes.value as any).doctors || (docsRes.value as any).data?.doctors || (docsRes.value as any).data || [];
                setDoctors(Array.isArray(rawDocs) ? rawDocs : []);
            }
        } catch (err) {
            console.error('Failed to load pharmacy metadata:', err);
        }
    }, []);

    // Refresh all data
    const refreshAll = useCallback(() => {
        fetchQueue();
        fetchInventory();
        fetchKpis();
        fetchMetadata();
        if (activeTab === 'history') fetchHistory();
    }, [fetchQueue, fetchInventory, fetchKpis, fetchMetadata, fetchHistory, activeTab]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Tab switch trigger
    useEffect(() => {
        if (activeTab === 'queue') fetchQueue();
        if (activeTab === 'inventory') fetchInventory();
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'alerts') fetchInventory();
    }, [activeTab, fetchQueue, fetchInventory, fetchHistory]);

    // Polling fallback
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAll();
        }, 25000);
        return () => clearInterval(interval);
    }, [refreshAll]);

    // Socket real-time events
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            refreshAll();
        };

        socket.on('pharmacy:dispensed', handleUpdate);
        socket.on('pharmacy:stock_updated', handleUpdate);
        socket.on('prescription:created', handleUpdate);

        return () => {
            socket.off('pharmacy:dispensed', handleUpdate);
            socket.off('pharmacy:stock_updated', handleUpdate);
            socket.off('prescription:created', handleUpdate);
        };
    }, [socket, refreshAll]);

    // Filter queue client search & dropdown filters
    const displayedQueue = useMemo(() => {
        let list = queue;

        if (sourceFilter) {
            list = list.filter((item) => {
                if (sourceFilter === 'ipd') return Boolean(item.admission_number || item.ward);
                if (sourceFilter === 'opd') return !item.admission_number && !item.ward;
                return true;
            });
        }

        if (doctorFilter) {
            list = list.filter((item) => {
                const dId = item.doctor_id || item.attending_doctor_id || item.doctor?.id || item.attendingDoctor?.id;
                return dId === doctorFilter;
            });
        }

        if (!deferredSearch) return list;
        return list.filter((item) => {
            const pName = (item.patient?.name || '').toLowerCase();
            const dName = (item.doctor?.name || item.attendingDoctor?.name || '').toLowerCase();
            const comp = (item.chief_complaint || item.provisional_diagnosis || '').toLowerCase();
            const admNum = (item.admission_number || item.encounter_number || '').toLowerCase();
            return pName.includes(deferredSearch) ||
                dName.includes(deferredSearch) ||
                comp.includes(deferredSearch) ||
                admNum.includes(deferredSearch);
        });
    }, [queue, deferredSearch, sourceFilter, doctorFilter]);

    // Filter alerts
    const lowStockItems = useMemo(() => {
        return inventory.filter((i) => i.stock_quantity > 0 && i.stock_quantity <= (i.min_alert_quantity || 10));
    }, [inventory]);

    const expiringSoonItems = useMemo(() => {
        const now = new Date();
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        return inventory.filter((i) => {
            if (!i.expiry_date) return false;
            const exp = new Date(i.expiry_date);
            return exp <= thirtyDays;
        });
    }, [inventory]);

    const hasActiveFilters = Boolean(searchQuery || selectedCategory || sourceFilter || priorityFilter || doctorFilter || showLowStockOnly || showOutOfStockOnly || dateFilter);

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setSourceFilter('');
        setPriorityFilter('');
        setDoctorFilter('');
        setShowLowStockOnly(false);
        setShowOutOfStockOnly(false);
        setDateFilter('');
        setPage(1);
    };

    // Dispense action
    const handleDispenseSubmit = async (formData: Record<string, any>) => {
        try {
            const res = await hospitalApi.dispensePrescription(formData);
            if (res && res.success) {
                toast.success('Medication Dispensed', 'Prescription has been fulfilled and encounter charges updated.');
                refreshAll();
                return true;
            }
            toast.error('Dispensing Failed', res?.message || 'Could not dispense medication.');
            return false;
        } catch (err: any) {
            toast.error('Dispensing Failed', err.message || 'Could not dispense medication.');
            return false;
        }
    };

    // Add or Edit Stock Item
    const handleAddOrEditStock = async (itemData: Record<string, any>) => {
        try {
            let res;
            if (itemData.id) {
                res = await hospitalApi.updateInhouseInventory(itemData.id, itemData);
            } else {
                res = await hospitalApi.addInhouseInventory(itemData);
            }

            if (res && res.success) {
                toast.success('Inventory Updated', `${itemData.medicineName} stock record saved.`);
                refreshAll();
                return true;
            }
            toast.error('Stock Update Failed', res?.message || 'Could not save inventory item.');
            return false;
        } catch (err: any) {
            toast.error('Stock Update Failed', err.message || 'Could not save inventory item.');
            return false;
        }
    };

    const isGlobalRefreshing = loadingQueue || loadingInventory || loadingKpis;
    const canManagePharmacy = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'pharmacist', 'pharmacy_manager', 'doctor'].includes(staffRole);

    return (
        <div className="space-y-4 pt-1 pb-8">
            
            {/* 1. Page Header with Enterprise Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <Pill className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    In-House Pharmacy
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
                                Hospital medication dispensing, inventory and pharmacy operations.
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
                    {canManagePharmacy && (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingStockItem(null);
                                    setIsAddStockModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                <Boxes className="w-3.5 h-3.5 text-teal-600" />
                                <span>+ Add Stock</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (queue.length > 0) {
                                        setSelectedPrescription(queue[0]);
                                        setIsDispenseModalOpen(true);
                                    } else {
                                        toast.info('No Prescriptions', 'Select an inpatient or add medication to dispense.');
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>+ New Dispensing</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 2. Top Real Database-Backed KPI Row (8 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                
                {/* 1: Today's Prescriptions */}
                <button
                    type="button"
                    onClick={() => setActiveTab('queue')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'queue'
                            ? 'bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-teal-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Today's Prescriptions</span>
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.total_prescriptions_today ?? 0
                        )}
                    </span>
                </button>

                {/* 2: Ready to Dispense */}
                <button
                    type="button"
                    onClick={() => setActiveTab('queue')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'queue'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Ready to Dispense</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.waiting_dispensing ?? queue.length
                        )}
                    </span>
                </button>

                {/* 3: Dispensed Today */}
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'history'
                            ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-emerald-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Dispensed Today</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.dispensed_today ?? 0
                        )}
                    </span>
                </button>

                {/* 4: Total Stock SKUs */}
                <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'inventory'
                            ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-blue-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Stock Medicines</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                        {loadingInventory ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : inventoryError ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            invPagination.total ?? inventory.length
                        )}
                    </span>
                </button>

                {/* 5: Low Stock Items */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('alerts'); setShowLowStockOnly(true); }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'alerts'
                            ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-amber-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block truncate">Low Stock Items</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.low_stock_count ?? 0
                        )}
                    </span>
                </button>

                {/* 6: Expiring Soon */}
                <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeTab === 'alerts'
                            ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-2xs'
                            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 hover:border-rose-300'
                    }`}
                >
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block truncate">Expiring Soon</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.expiring_soon_count ?? 0
                        )}
                    </span>
                </button>

                {/* 7: Out of Stock */}
                <button
                    type="button"
                    onClick={() => { setActiveTab('inventory'); setShowOutOfStockOnly(true); }}
                    className="p-2.5 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 text-left transition-all cursor-pointer hover:border-rose-300"
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Out of Stock</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.out_of_stock_count ?? 0
                        )}
                    </span>
                </button>

                {/* 8: Returns Today */}
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="p-2.5 rounded-2xl border bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 text-left transition-all cursor-pointer hover:border-purple-300"
                >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Returns Today</span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
                        {loadingKpis ? (
                            <span className="inline-block w-8 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                        ) : kpisError || kpis === null ? (
                            <span className="text-slate-400 font-normal text-sm" title="Data unavailable">—</span>
                        ) : (
                            kpis.returns_today ?? 0
                        )}
                    </span>
                </button>

            </div>

            {/* 3. Interactive 5-Stage Visual Pharmacy Workflow Pipeline */}
            <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto text-xs font-semibold">
                    
                    <button
                        type="button"
                        onClick={() => { setActiveTab('queue'); setSourceFilter(''); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            activeTab === 'queue' && !sourceFilter
                                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>1. Prescribed</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
                            {queue.length}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('queue'); setSourceFilter('opd'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            activeTab === 'queue' && sourceFilter === 'opd'
                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>2. Verification (OPD)</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200 text-blue-900 font-bold">
                            {queue.filter(q => !q.admission_number).length}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => { setActiveTab('queue'); setSourceFilter('ipd'); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            activeTab === 'queue' && sourceFilter === 'ipd'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold'
                                : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>3. Ward Indents (IPD)</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200 text-indigo-900 font-bold">
                            {queue.filter(q => Boolean(q.admission_number)).length}
                        </span>
                    </button>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="flex-1 py-1.5 px-2 rounded-xl border border-slate-200/60 bg-slate-50 dark:bg-gray-800 text-slate-600 text-center flex items-center justify-center gap-1.5"
                    >
                        <span>4. Dispensed</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-bold">
                            {kpis?.dispensed_today ?? history.length}
                        </span>
                    </button>

                </div>
            </div>

            {/* 4. Directory Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-gray-800 text-xs">
                {[
                    { id: 'queue', label: 'Prescription Dispensing Queue', count: queue.length },
                    { id: 'inventory', label: 'Medicine Stock Inventory', count: invPagination.total },
                    { id: 'alerts', label: 'Low Stock & Expiry Alerts', count: lowStockItems.length + expiringSoonItems.length },
                    { id: 'history', label: 'Dispensation History & Charges', count: histPagination.total },
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

            {/* 5. Search & Advanced Filter Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 text-xs">
                    
                    {/* Search */}
                    <div className="lg:col-span-4 relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search patient, medicine, doctor, batch, prescription..."
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

                    {/* Source Filter (OPD / IPD) */}
                    <div className="lg:col-span-2">
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Sources</option>
                            <option value="opd">OPD Encounters</option>
                            <option value="ipd">IPD Inpatients</option>
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

                    {/* Category Filter */}
                    <div className="lg:col-span-2">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All Categories</option>
                            <option value="Tablet">Tablets</option>
                            <option value="Capsule">Capsules</option>
                            <option value="Syrup">Syrups</option>
                            <option value="Injection">Injections</option>
                            <option value="IV Fluid">IV Fluids</option>
                            <option value="Ointment">Ointments</option>
                            <option value="Medical Supply">Medical Supplies</option>
                        </select>
                    </div>

                    {/* Low Stock Toggle */}
                    <div className="lg:col-span-2 flex items-center justify-end">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={showLowStockOnly}
                                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                                className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Low Stock Only</span>
                        </label>
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

            {/* 6. Primary Workspace Views based on Active Tab */}

            {/* TAB 1: PRESCRIPTION DISPENSING QUEUE */}
            {activeTab === 'queue' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                    {loadingQueue ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                            <span className="text-xs text-slate-500 font-medium">Loading hospital prescription queue...</span>
                        </div>
                    ) : queueError && queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                                <ShieldAlert className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {queueError.isPermission ? "Access Denied" : "Unable to load pharmacy queue"}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                                {queueError.isPermission
                                    ? "You don't have permission to access pharmacy operations."
                                    : "We couldn't retrieve the latest prescription queue. Please check your connection and retry."}
                            </p>
                            {!queueError.isPermission && (
                                <button
                                    type="button"
                                    onClick={fetchQueue}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Retry</span>
                                </button>
                            )}
                        </div>
                    ) : displayedQueue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                <CheckCircle2 className="w-7 h-7 text-teal-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                No Prescriptions Waiting for Dispensing
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                Active OPD encounters and admitted IPD patients with medication orders will appear in this dispensing queue.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Patient & UHID</th>
                                        <th className="py-3 px-4">Source & Location</th>
                                        <th className="py-3 px-4">Prescribing Doctor</th>
                                        <th className="py-3 px-4">Chief Indication / Diagnosis</th>
                                        <th className="py-3 px-4">Prescribed At</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                    {displayedQueue.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                        >
                                            {/* Patient */}
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                    {item.patient?.name || 'Patient'}
                                                </div>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                    {item.patient?.gender ? `${item.patient.gender} • ` : ''}
                                                    {item.patient?.date_of_birth ? `DOB: ${item.patient.date_of_birth}` : ''}
                                                    {item.patient?.blood_group ? ` • ${item.patient.blood_group}` : ''}
                                                </span>
                                            </td>

                                            {/* Source */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    item.admission_number
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                }`}>
                                                    {item.admission_number ? `IPD: ${item.ward?.name || 'Ward'}` : 'OPD Encounter'}
                                                </span>
                                                {item.bed?.bed_number && (
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        Bed {item.bed.bed_number}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Doctor */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    Dr. {item.doctor?.name || item.attendingDoctor?.name || 'Physician'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    {item.doctor?.specialization || item.attendingDoctor?.specialization || 'Clinical Staff'}
                                                </span>
                                            </td>

                                            {/* Indication */}
                                            <td className="py-3 px-4 max-w-[240px]">
                                                <p className="text-slate-700 dark:text-slate-300 truncate">
                                                    {item.chief_complaint || item.provisional_diagnosis || (Array.isArray(item.diagnosis) ? item.diagnosis.join(', ') : 'Medical Management')}
                                                </p>
                                            </td>

                                            {/* Prescribed At */}
                                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                {item.created_at || item.admitted_at
                                                    ? new Date(item.created_at || item.admitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedPrescription(item);
                                                            setIsDrawerOpen(true);
                                                        }}
                                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View</span>
                                                    </button>
                                                    {canManagePharmacy && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedPrescription(item);
                                                                setIsDispenseModalOpen(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                                        >
                                                            <ShoppingCart className="w-3.5 h-3.5" />
                                                            <span>Dispense</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MEDICINE STOCK INVENTORY */}
            {activeTab === 'inventory' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                    {loadingInventory ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                            <span className="text-xs text-slate-500 font-medium">Loading hospital inventory...</span>
                        </div>
                    ) : inventoryError && inventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                                <ShieldAlert className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Unable to load medicine inventory
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                                Could not load inventory items. Please check connection and try again.
                            </p>
                            <button
                                type="button"
                                onClick={fetchInventory}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry</span>
                            </button>
                        </div>
                    ) : inventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                <Boxes className="w-7 h-7 text-teal-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                No Inventory Records Found
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                Add hospital medicines, batches, and reorder levels to track in-house stock.
                            </p>
                            {canManagePharmacy && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingStockItem(null);
                                        setIsAddStockModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add First Medicine</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Medicine & Generic</th>
                                        <th className="py-3 px-4">Form / Category</th>
                                        <th className="py-3 px-4">Batch & Expiry</th>
                                        <th className="py-3 px-4">Selling Price / MRP</th>
                                        <th className="py-3 px-4">Stock Quantity</th>
                                        <th className="py-3 px-4">Rack Location</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                    {inventory.map((item) => {
                                        const isLow = item.stock_quantity > 0 && item.stock_quantity <= (item.min_alert_quantity || 10);
                                        const isOut = item.stock_quantity === 0;

                                        return (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                            >
                                                {/* Medicine */}
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                                        {item.medicine_name}
                                                    </div>
                                                    {item.generic_name && (
                                                        <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                                            {item.generic_name}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Category */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300">
                                                        {item.category || 'Tablet'}
                                                    </span>
                                                </td>

                                                {/* Batch & Expiry */}
                                                <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                                                    <span className="text-slate-700 dark:text-slate-300 block">
                                                        {item.batch_number || '—'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        Exp: {item.expiry_date || 'N/A'}
                                                    </span>
                                                </td>

                                                {/* Pricing */}
                                                <td className="py-3 px-4 whitespace-nowrap font-mono">
                                                    <span className="font-bold text-teal-700 dark:text-teal-300 block">
                                                        ₹{item.selling_price}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        MRP: ₹{item.mrp || item.selling_price}
                                                    </span>
                                                </td>

                                                {/* Stock */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className={`font-bold font-mono text-xs ${
                                                        isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'
                                                    }`}>
                                                        {item.stock_quantity} {item.unit || 'units'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        Min: {item.min_alert_quantity || 10}
                                                    </span>
                                                </td>

                                                {/* Rack */}
                                                <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                    {item.rack_location || '—'}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                        isOut
                                                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                                            : isLow
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                    }`}>
                                                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    {canManagePharmacy && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingStockItem(item);
                                                                setIsAddStockModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-teal-600 cursor-pointer"
                                                            title="Edit Stock"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loadingInventory && inventory.length > 0 && invPagination.totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Showing page <span className="font-semibold">{invPagination.page}</span> of <span className="font-semibold">{invPagination.totalPages}</span> ({invPagination.total} medicines)
                            </span>
                            <Pagination
                                currentPage={page}
                                totalPages={invPagination.totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: LOW STOCK & EXPIRY ALERTS */}
            {activeTab === 'alerts' && (
                <div className="space-y-4">
                    {/* Low Stock Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Low Stock Reorder Alerts ({lowStockItems.length})</span>
                        </div>

                        {lowStockItems.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs italic">
                                No medicines are currently below minimum alert reorder levels.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {lowStockItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <h4 className="font-bold text-amber-950 dark:text-amber-200">
                                                {item.medicine_name}
                                            </h4>
                                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                                Stock: {item.stock_quantity} / Reorder: {item.min_alert_quantity} {item.unit}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingStockItem(item);
                                                setIsAddStockModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                                        >
                                            Restock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Expiry Alerts Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                            <Clock className="w-4 h-4 text-rose-600" />
                            <span>Expiring Soon / Expired Medicines ({expiringSoonItems.length})</span>
                        </div>

                        {expiringSoonItems.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs italic">
                                No medicines in stock are expiring within 30 days.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {expiringSoonItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <h4 className="font-bold text-rose-950 dark:text-rose-200">
                                                {item.medicine_name}
                                            </h4>
                                            <p className="text-[10px] text-rose-700 dark:text-rose-400 font-mono">
                                                Batch: {item.batch_number || 'N/A'} • Exp: {item.expiry_date}
                                            </p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                                            Expiring
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: DISPENSATION HISTORY */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
                    {loadingHistory ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                            <span className="text-xs text-slate-500 font-medium">Loading dispensation history...</span>
                        </div>
                    ) : historyError && history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 mb-3">
                                <ShieldAlert className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Unable to load dispensation history
                            </h3>
                            <button
                                type="button"
                                onClick={fetchHistory}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer mt-3"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry</span>
                            </button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="p-3.5 bg-slate-100 dark:bg-gray-800 rounded-2xl text-slate-400 mb-3">
                                <History className="w-7 h-7 text-teal-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                No Dispensation Transactions Found
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                                Completed dispensations, patient bills, and inventory logs will be archived here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Dispensation #</th>
                                        <th className="py-3 px-4">Patient</th>
                                        <th className="py-3 px-4">Type</th>
                                        <th className="py-3 px-4">Medicines Dispensed</th>
                                        <th className="py-3 px-4">Total Billed</th>
                                        <th className="py-3 px-4">Dispensed By</th>
                                        <th className="py-3 px-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                    {history.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                        >
                                            {/* Number */}
                                            <td className="py-3 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                                                {record.dispensation_number}
                                            </td>

                                            {/* Patient */}
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                                                    {record.patient?.name || 'Patient'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block font-mono">
                                                    {record.patient?.gender ? `${record.patient.gender} • ` : ''}
                                                    {record.patient?.blood_group || 'Inpatient'}
                                                </span>
                                            </td>

                                            {/* Type */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 uppercase">
                                                    {record.dispense_type?.replace(/_/g, ' ') || 'OPD'}
                                                </span>
                                            </td>

                                            {/* Items */}
                                            <td className="py-3 px-4 max-w-[260px]">
                                                {Array.isArray(record.items) ? (
                                                    <div className="space-y-0.5">
                                                        {record.items.slice(0, 2).map((it: any, idx: number) => (
                                                            <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                                                                • {it.medicine_name} (x{it.quantity})
                                                            </div>
                                                        ))}
                                                        {record.items.length > 2 && (
                                                            <span className="text-[10px] text-teal-600 font-semibold">
                                                                +{record.items.length - 2} more items
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>

                                            {/* Total */}
                                            <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-slate-100">
                                                ₹{record.total_amount}
                                            </td>

                                            {/* Dispenser */}
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                {record.dispenser?.name || 'Pharmacist'}
                                            </td>

                                            {/* Date */}
                                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                                {new Date(record.created_at).toLocaleString([], {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* 7. Workspace Drawer */}
            <PrescriptionDetailsDrawer
                prescription={selectedPrescription}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onOpenDispense={(pres) => {
                    setSelectedPrescription(pres);
                    setIsDispenseModalOpen(true);
                }}
                canManagePharmacy={canManagePharmacy}
            />

            {/* 8. Dispense Modal */}
            <DispenseMedicineModal
                isOpen={isDispenseModalOpen}
                onClose={() => setIsDispenseModalOpen(false)}
                onDispense={handleDispenseSubmit}
                prescription={selectedPrescription}
                inventory={inventory}
            />

            {/* 9. Add / Edit Stock Modal */}
            <AddStockModal
                isOpen={isAddStockModalOpen}
                onClose={() => {
                    setIsAddStockModalOpen(false);
                    setEditingStockItem(null);
                }}
                onAddStock={handleAddOrEditStock}
                editItem={editingStockItem}
            />

        </div>
    );
}
