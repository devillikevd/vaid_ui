'use client';

import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoctorStore } from '@/stores/doctorStore';
import { api } from '@/lib/api';
import { UniversalReferral, ReferralStatus, ReferralUrgency } from '@/types/referrals';
import { CreateReferralModal } from '@/components/referrals/CreateReferralModal';
import { ReferralDetailsDrawer } from '@/components/referrals/ReferralDetailsDrawer';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
    Building2,
    Plus,
    Inbox,
    Send,
    Clock,
    CheckCircle2,
    Search,
    ChevronDown,
    RotateCcw,
    AlertCircle,
    Calendar,
    ArrowRight,
    Loader2,
    Paperclip,
    Stethoscope,
    Phone,
    Mail,
    Filter,
    FileText,
    RefreshCw,
    XCircle,
    Sparkles
} from 'lucide-react';

function DoctorReferralsContent() {
    const toast = useToast();
    const searchParams = useSearchParams();
    const initialSelectedId = searchParams.get('selectedId');

    const { organizations, fetchOrganizations, loadingOrganizations } = useDoctorStore();
    const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedReferralId, setSelectedReferralId] = useState<string | null>(initialSelectedId);

    useEffect(() => {
        if (initialSelectedId) {
            setSelectedReferralId(initialSelectedId);
        }
    }, [initialSelectedId]);

    // Data states
    const [inboxReferrals, setInboxReferrals] = useState<UniversalReferral[]>([]);
    const [sentReferrals, setSentReferrals] = useState<UniversalReferral[]>([]);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [loadingSent, setLoadingSent] = useState(false);
    const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
    const [periodFilter, setPeriodFilter] = useState<string>('all');

    // 1. Initial Organization Loading
    useEffect(() => {
        if (!organizations || organizations.length === 0) {
            fetchOrganizations();
        }
    }, [organizations, fetchOrganizations]);

    useEffect(() => {
        if (organizations && organizations.length > 0 && !activeOrgId) {
            setActiveOrgId(organizations[0].id);
        }
    }, [organizations, activeOrgId]);

    const activeOrg = useMemo(() => {
        return (organizations || []).find(o => o.id === activeOrgId) || organizations?.[0];
    }, [organizations, activeOrgId]);

    // 2. Fetch Referrals for both Inbox and Sent
    const loadInbox = useCallback(async () => {
        setLoadingInbox(true);
        try {
            const res = await api.universalReferrals.getReferralInbox();
            if (res.success) {
                let data = (res.data as unknown as UniversalReferral[]) || [];
                if (activeOrgId) {
                    data = data.filter(r => r.receiver_id === activeOrgId);
                }
                setInboxReferrals(data);
            }
        } catch (err: any) {
            toast.error('Failed to load received referrals');
        } finally {
            setLoadingInbox(false);
        }
    }, [activeOrgId, toast]);

    const loadSent = useCallback(async () => {
        setLoadingSent(true);
        try {
            const res = await api.universalReferrals.getSentReferrals();
            if (res.success) {
                let data = (res.data as unknown as UniversalReferral[]) || [];
                if (activeOrgId) {
                    data = data.filter(r => r.sender_id === activeOrgId);
                }
                setSentReferrals(data);
            }
        } catch (err: any) {
            toast.error('Failed to load sent referrals');
        } finally {
            setLoadingSent(false);
        }
    }, [activeOrgId, toast]);

    const refreshAll = useCallback(() => {
        loadInbox();
        loadSent();
    }, [loadInbox, loadSent]);

    useEffect(() => {
        if (activeOrgId) {
            refreshAll();
        }
    }, [activeOrgId, refreshAll]);

    // 3. Quick Status Update Action
    const handleUpdateStatus = async (refId: string, newStatus: ReferralStatus) => {
        setActionInProgressId(refId);
        try {
            const res = await api.universalReferrals.updateReferralStatus(refId, newStatus);
            if (res.success) {
                toast.success(`Referral updated to ${newStatus.replace('_', ' ')}`);
                refreshAll();
            } else {
                toast.error(res.message || 'Failed to update referral status');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error updating status');
        } finally {
            setActionInProgressId(null);
        }
    };

    // 4. Derived KPI metrics from real referral data
    const kpiMetrics = useMemo(() => {
        const inboxTotal = inboxReferrals.length;
        const sentTotal = sentReferrals.length;

        const inboxPending = inboxReferrals.filter(r => r.status === 'pending' || r.status === 'awaiting_consent').length;
        const sentPending = sentReferrals.filter(r => r.status === 'pending' || r.status === 'awaiting_consent').length;
        const totalPending = inboxPending + sentPending;

        const inboxCompleted = inboxReferrals.filter(r => r.status === 'completed').length;
        const sentCompleted = sentReferrals.filter(r => r.status === 'completed').length;
        const totalCompleted = inboxCompleted + sentCompleted;

        return {
            inboxTotal,
            inboxPending,
            sentTotal,
            sentPending,
            totalPending,
            totalCompleted
        };
    }, [inboxReferrals, sentReferrals]);

    // 5. Date Period Filter Helper
    const isDateInPeriod = (dateStr?: string, period: string = 'all') => {
        if (!dateStr || period === 'all') return true;
        const targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) return true;
        const now = new Date();

        if (period === 'today') {
            return targetDate.toDateString() === now.toDateString();
        }
        if (period === 'last_7_days') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            return targetDate >= sevenDaysAgo && targetDate <= now;
        }
        if (period === 'last_30_days') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            return targetDate >= thirtyDaysAgo && targetDate <= now;
        }
        return true;
    };

    // 6. Active List Filtering
    const currentList = activeTab === 'inbox' ? inboxReferrals : sentReferrals;
    const isLoadingCurrent = activeTab === 'inbox' ? loadingInbox : loadingSent;

    const filteredReferrals = useMemo(() => {
        return currentList.filter(ref => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const patientName = (ref.patient?.full_name || ref.patient?.users?.name || '').toLowerCase();
                const patientPhone = (ref.patient?.users?.phone || '').toLowerCase();
                const senderName = (ref.sender_snapshot?.name || ref.sender_user_name_snapshot || ref.sender_type || '').toLowerCase();
                const receiverName = (ref.receiver_snapshot?.name || ref.receiver_type || '').toLowerCase();
                const reason = (ref.reason || '').toLowerCase();
                const summary = (ref.clinical_summary || '').toLowerCase();

                const matches = patientName.includes(q) ||
                    patientPhone.includes(q) ||
                    senderName.includes(q) ||
                    receiverName.includes(q) ||
                    reason.includes(q) ||
                    summary.includes(q);

                if (!matches) return false;
            }

            // Status filter
            if (statusFilter !== 'all') {
                if (ref.status !== statusFilter) return false;
            }

            // Urgency filter
            if (urgencyFilter !== 'all') {
                if (ref.urgency !== urgencyFilter) return false;
            }

            // Date period filter
            if (periodFilter !== 'all') {
                if (!isDateInPeriod(ref.created_at, periodFilter)) return false;
            }

            return true;
        });
    }, [currentList, searchQuery, statusFilter, urgencyFilter, periodFilter]);

    const isAnyFilterActive = searchQuery.trim() !== '' || statusFilter !== 'all' || urgencyFilter !== 'all' || periodFilter !== 'all';

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setUrgencyFilter('all');
        setPeriodFilter('all');
    };

    // 7. Render Loading Organizations / No Org State
    if (loadingOrganizations) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading referral workspace...</p>
            </div>
        );
    }

    if (!organizations || organizations.length === 0) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center py-24">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/50 shadow-sm">
                    <Building2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Active Facility Affiliation</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                    To send and receive patient referrals across the Vaididea ecosystem, join or activate a Clinic or Hospital network.
                </p>
            </div>
        );
    }

    const getStatusClasses = (status: ReferralStatus) => {
        switch (status) {
            case 'pending':
                return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'accepted':
                return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'in_progress':
                return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'completed':
                return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'rejected':
            case 'cancelled':
                return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            case 'awaiting_consent':
                return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            default:
                return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    const getUrgencyClasses = (urgency: ReferralUrgency) => {
        switch (urgency) {
            case 'emergency':
                return 'bg-rose-500 text-white shadow-sm animate-pulse';
            case 'urgent':
                return 'bg-amber-500 text-white shadow-sm';
            case 'routine':
            default:
                return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <div className="space-y-6 pb-24 max-w-7xl mx-auto min-w-0">
            {/* 1. Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Stethoscope className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">
                            Referrals
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm ml-12 truncate">
                        Manage patient referrals across your Vaididea care network.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Facility / Workspace Selector */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-3 py-1.5 shadow-sm min-w-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
                            Referral Workspace:
                        </span>
                        <select
                            className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-100 outline-none cursor-pointer truncate max-w-[200px]"
                            value={activeOrgId || ''}
                            onChange={(e) => setActiveOrgId(e.target.value)}
                        >
                            {organizations.map(org => (
                                <option key={org.id} value={org.id} className="dark:bg-gray-900">
                                    {org.organization_type === 'hospital' ? '🏥' : '⚕️'} {org.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={refreshAll}
                        disabled={loadingInbox || loadingSent}
                        className="p-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:text-gray-200 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition"
                        title="Refresh referrals"
                    >
                        <RefreshCw className={`w-4 h-4 ${(loadingInbox || loadingSent) ? 'animate-spin' : ''}`} />
                    </button>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-4 py-2.5 shadow-sm text-xs sm:text-sm font-bold shrink-0 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New Referral
                    </Button>
                </div>
            </div>

            {/* 2. Referral Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
                {/* 1. Inbox Received */}
                <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                            <Inbox className="w-5 h-5" />
                        </div>
                        <div className="text-right min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Inbox Referrals</span>
                            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">
                                {kpiMetrics.inboxTotal}
                            </h3>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Incoming care</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {kpiMetrics.inboxPending} pending review
                        </span>
                    </div>
                </div>

                {/* 2. Sent Referrals */}
                <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 shrink-0">
                            <Send className="w-5 h-5" />
                        </div>
                        <div className="text-right min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Sent Referrals</span>
                            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">
                                {kpiMetrics.sentTotal}
                            </h3>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Dispatched</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {kpiMetrics.sentPending} in transit
                        </span>
                    </div>
                </div>

                {/* 3. Pending Action / Consent */}
                <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-right min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Pending Action</span>
                            <h3 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 truncate">
                                {kpiMetrics.totalPending}
                            </h3>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Action required</span>
                        <span className="text-gray-700 dark:text-gray-300 font-bold">Awaiting decision</span>
                    </div>
                </div>

                {/* 4. Completed Care */}
                <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-right min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Completed Care</span>
                            <h3 className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 truncate">
                                {kpiMetrics.totalCompleted}
                            </h3>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Resolved cases</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Care delivered</span>
                    </div>
                </div>
            </div>

            {/* 3. Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 min-w-0">
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all min-w-0 ${
                        activeTab === 'inbox'
                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <Inbox className="w-4 h-4 shrink-0" />
                    <span>Inbox</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        activeTab === 'inbox'
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                        {inboxReferrals.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all min-w-0 ${
                        activeTab === 'sent'
                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Sent</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        activeTab === 'sent'
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                        {sentReferrals.length}
                    </span>
                </button>
            </div>

            {/* 4. Search & Filter Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3.5 min-w-0 w-full">
                {/* Search input on top */}
                <div className="relative w-full min-w-0">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Search className="h-4 w-4 shrink-0" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search patient name, phone, doctor, referring facility, reason..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full min-w-0 h-10 pl-9 pr-3 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm truncate"
                    />
                </div>

                {/* Dropdowns in responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full min-w-0">
                    {/* Status Filter */}
                    <div className="relative w-full min-w-0">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="block w-full min-w-0 h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="awaiting_consent">Awaiting Consent</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        </div>
                    </div>

                    {/* Urgency / Priority Filter */}
                    <div className="relative w-full min-w-0">
                        <select
                            value={urgencyFilter}
                            onChange={(e) => setUrgencyFilter(e.target.value)}
                            className="block w-full min-w-0 h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                        >
                            <option value="all">All Priorities</option>
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="emergency">Emergency</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        </div>
                    </div>

                    {/* Period Filter */}
                    <div className="relative w-full min-w-0">
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            className="block w-full min-w-0 h-9.5 pl-3 pr-8 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none truncate"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="last_7_days">Last 7 Days</option>
                            <option value="last_30_days">Last 30 Days</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        </div>
                    </div>
                </div>

                {/* Match Counter & Clear Action */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/80 text-xs w-full min-w-0">
                    <span className="text-gray-500 font-semibold text-xs truncate">
                        Showing <strong className="text-gray-900 dark:text-gray-100">{filteredReferrals.length}</strong> of <strong className="text-gray-900 dark:text-gray-100">{currentList.length}</strong> {activeTab} referrals
                    </span>
                    {isAnyFilterActive && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 ml-2"
                        >
                            <RotateCcw className="h-3 w-3 shrink-0" /> Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* 5. Referrals List */}
            <div className="space-y-4 min-w-0">
                {isLoadingCurrent ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm animate-pulse space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
                                </div>
                                <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-1/2"></div>
                                <div className="h-10 bg-gray-50 dark:bg-gray-800/20 rounded-xl"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredReferrals.length === 0 ? (
                    /* 6. Polished Compact Empty State */
                    <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 text-center shadow-sm max-w-2xl mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800/50">
                            {activeTab === 'inbox' ? <Inbox className="w-7 h-7" /> : <Send className="w-7 h-7" />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
                            {activeTab === 'inbox' ? 'No incoming referrals yet' : 'No sent referrals yet'}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-5">
                            {activeTab === 'inbox'
                                ? 'Referrals received from doctors, clinics, and hospitals in your network will appear here.'
                                : 'Create a referral when a patient requires specialized care or diagnostics from another facility.'}
                        </p>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            New Referral
                        </Button>
                    </div>
                ) : (
                    /* 7. Clinical Referral Cards */
                    <div className="grid gap-4 min-w-0">
                        {filteredReferrals.map((ref) => {
                            const isActioning = actionInProgressId === ref.id;

                            return (
                                <div
                                    key={ref.id}
                                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800/60 shadow-sm transition-all flex flex-col justify-between gap-5 min-w-0"
                                >
                                    {/* Top Row: Patient Info + Status & Urgency Badges */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
                                                {(ref.patient?.full_name || ref.patient?.users?.name || 'P')[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                        {ref.patient?.full_name || ref.patient?.users?.name || 'Patient Record'}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getUrgencyClasses(ref.urgency)}`}>
                                                        {ref.urgency}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                                    {ref.patient?.users?.phone && (
                                                        <span className="flex items-center gap-1 truncate">
                                                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                                            {ref.patient.users.phone}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 truncate">
                                                        <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                                                        {new Date(ref.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="shrink-0">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusClasses(ref.status)}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {ref.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Section: Route & Clinical Indication */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
                                        {/* Referral Route */}
                                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 flex flex-col justify-center min-w-0">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                {activeTab === 'inbox' ? 'Referring Source' : 'Referred Destination'}
                                            </span>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                {activeTab === 'inbox'
                                                    ? (ref.sender_snapshot?.name || ref.sender_user_name_snapshot || ref.sender_type)
                                                    : (ref.receiver_snapshot?.name || ref.receiver_type)}
                                            </p>
                                            <span className="text-[10px] font-medium text-gray-500 capitalize">
                                                {activeTab === 'inbox' ? ref.sender_type : ref.receiver_type}
                                            </span>
                                        </div>

                                        {/* Reason for Referral */}
                                        <div className="md:col-span-2 p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-center min-w-0">
                                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                                                Reason for Referral
                                            </span>
                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                {ref.reason}
                                            </p>
                                            {ref.clinical_summary && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {ref.clinical_summary}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom Row: Attachments Indicator + Actions */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 min-w-0">
                                        <div>
                                            {ref.attachments && ref.attachments.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800/40">
                                                    <Paperclip className="w-3 h-3 shrink-0" />
                                                    {ref.attachments.length} document{ref.attachments.length === 1 ? '' : 's'} attached
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400 font-medium italic">
                                                    No attached reports
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                                            {/* Inbox Contextual Actions */}
                                            {activeTab === 'inbox' && ref.status === 'pending' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUpdateStatus(ref.id, 'rejected')}
                                                        disabled={isActioning}
                                                        className="h-8 px-3 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition"
                                                    >
                                                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateStatus(ref.id, 'accepted')}
                                                        disabled={isActioning}
                                                        className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                                                    >
                                                        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Accept'}
                                                    </Button>
                                                </>
                                            )}

                                            {activeTab === 'inbox' && ref.status === 'accepted' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus(ref.id, 'in_progress')}
                                                    disabled={isActioning}
                                                    className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm"
                                                >
                                                    {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Start Care'}
                                                </Button>
                                            )}

                                            {activeTab === 'inbox' && ref.status === 'in_progress' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus(ref.id, 'completed')}
                                                    disabled={isActioning}
                                                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                                                >
                                                    {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Complete Care'}
                                                </Button>
                                            )}

                                            {/* Sent Contextual Action */}
                                            {activeTab === 'sent' && ref.status === 'pending' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus(ref.id, 'cancelled')}
                                                    disabled={isActioning}
                                                    className="h-8 px-3 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition"
                                                >
                                                    {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel'}
                                                </Button>
                                            )}

                                            {/* View Details Action */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedReferralId(ref.id)}
                                                className="h-8 px-3 rounded-xl text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition"
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 8. Slide-over Details Drawer */}
            <ReferralDetailsDrawer
                id={selectedReferralId}
                isOpen={!!selectedReferralId}
                onClose={() => setSelectedReferralId(null)}
                onStatusUpdated={refreshAll}
                isSent={activeTab === 'sent'}
            />

            {/* 9. Create Referral Modal */}
            {isCreateModalOpen && (
                <CreateReferralModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        refreshAll();
                    }}
                    contextOrgId={activeOrg?.id}
                    contextOrgType={activeOrg?.organization_type}
                    contextOrgName={activeOrg?.name}
                />
            )}
        </div>
    );
}

export default function DoctorReferralsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        }>
            <DoctorReferralsContent />
        </Suspense>
    );
}
