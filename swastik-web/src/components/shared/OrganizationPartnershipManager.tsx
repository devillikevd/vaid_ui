'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Loader2,
    RefreshCw,
    Plus,
    Building2,
    Network,
    Search,
    CheckCircle2,
    Building,
    Clock,
    X,
    FileText,
    ChevronRight,
    AlertCircle,
    Calendar,
    Trash2,
    MapPin,
    Check,
    ShieldCheck,
    UserCheck,
    Send,
    ExternalLink,
    Ban
} from 'lucide-react';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Partnership, OrgType, PartnershipStatus } from '@/components/ui/PartnershipCard';
import { api } from '@/lib/api';

interface ActionResponse {
    success?: boolean;
    error?: string;
    message?: string;
    data?: any;
}

interface OrganizationPartnershipManagerProps {
    title: string;
    subtitle: string;
    currentOrgType?: OrgType;
    availableTargetTypes: { value: OrgType; label: string }[];
    fetchPartnerships: (status?: string) => Promise<ActionResponse>;
    sendInvite: (data: { targetType: string; targetId: string; partnershipType?: string; metadata?: any }) => Promise<ActionResponse>;
    respondRequest: (id: string, action: 'accept' | 'reject') => Promise<ActionResponse>;
    requestChanges?: (id: string, message: string, metadataUpdates?: any) => Promise<ActionResponse>;
    acceptChanges?: (id: string) => Promise<ActionResponse>;
    terminatePartnership: (id: string) => Promise<ActionResponse>;
}

type StatusFilter = 'all' | 'active' | 'requests' | 'invitations' | 'history';

export default function OrganizationPartnershipManager({
    title,
    subtitle,
    availableTargetTypes,
    fetchPartnerships,
    sendInvite,
    respondRequest,
    terminatePartnership,
}: OrganizationPartnershipManagerProps) {
    const toast = useToast();
    const toastRef = useRef(toast);
    const { dialogProps, confirm } = useConfirmDialog();

    // Core State
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filters
    const [activeTab, setActiveTab] = useState<'all' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic'>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Drawers & Modals
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

    // Add Partner State
    const [inviteStep, setInviteStep] = useState<1 | 2 | 3>(1);
    const [inviteType, setInviteType] = useState<OrgType | ''>('');
    const [inviteSearch, setInviteSearch] = useState('');
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const [selectedPartner, setSelectedPartner] = useState<any>(null);
    const [inviteMessage, setInviteMessage] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryError, setDiscoveryError] = useState('');

    // Active Selection State
    const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const loadPartnerships = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchPartnerships();
            if (!response.success) {
                setError(response.error || 'Failed to load partnerships.');
                setPartnerships([]);
                return;
            }
            setPartnerships(Array.isArray(response.data) ? response.data : []);
        } catch {
            setError('Unable to communicate with the server.');
            setPartnerships([]);
        } finally {
            setLoading(false);
        }
    }, [fetchPartnerships]);

    useEffect(() => {
        void loadPartnerships();
    }, [loadPartnerships]);

    const handleCloseAddDrawer = useCallback(() => {
        setIsAddDrawerOpen(false);
        setTimeout(() => {
            setInviteStep(1);
            setInviteType('');
            setInviteSearch('');
            setSelectedPartnerId('');
            setSelectedPartner(null);
            setInviteMessage('');
            setInviteSuccess(false);
            setDiscoveryResults([]);
            setDiscoveryError('');
            setIsDiscovering(false);
        }, 300);
    }, []);

    // Discovery search when Step 2 opens or search text changes
    useEffect(() => {
        if (!isAddDrawerOpen || inviteStep !== 2 || !inviteType) return;

        let active = true;
        setDiscoveryError('');
        setIsDiscovering(true);

        const trimmedSearch = inviteSearch.trim();

        const timer = setTimeout(async () => {
            try {
                let response: any;
                if (inviteType === 'hospital') response = await api.publicDiscovery.searchHospitals(trimmedSearch);
                else if (inviteType === 'pharmacy') response = await api.publicDiscovery.searchPharmacies(trimmedSearch);
                else if (inviteType === 'diagnostic_center') response = await api.publicDiscovery.searchDiagnosticCenters(trimmedSearch);
                else if (inviteType === 'clinic') response = await api.publicDiscovery.searchClinics(trimmedSearch);

                if (active) {
                    if (response?.success) {
                        const orgs = Array.isArray(response.data)
                            ? response.data
                            : ((response.data as any)?.clinics || (response.data as any)?.hospitals || (response.data as any)?.pharmacies || (response.data as any)?.diagnosticCenters || (response.data as any)?.data || []);
                        setDiscoveryResults(Array.isArray(orgs) ? orgs : []);
                    } else {
                        setDiscoveryError(response?.error || 'Unable to load organizations');
                        setDiscoveryResults([]);
                    }
                }
            } catch {
                if (active) {
                    setDiscoveryError('Unable to load organizations');
                    setDiscoveryResults([]);
                }
            } finally {
                if (active) setIsDiscovering(false);
            }
        }, trimmedSearch ? 350 : 0);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [inviteStep, inviteType, inviteSearch, isAddDrawerOpen]);

    const handleInvite = async () => {
        if (!inviteType || !selectedPartnerId) return;
        setActionLoading('invite');
        try {
            const metadata = { message: inviteMessage };
            const response = await sendInvite({ targetType: inviteType, targetId: selectedPartnerId, metadata });
            if (!response.success) {
                const errorMsg = response.error || response.message || 'Unable to send partnership request. Please try again.';
                toastRef.current.error('Invite Failed', errorMsg);
                return;
            }
            toastRef.current.success('Invite Sent', 'Partnership request sent successfully.');
            setInviteSuccess(true);
            await loadPartnerships();
        } catch (err: any) {
            const errorMsg = err?.message || 'Network error. Please try again.';
            toastRef.current.error('Invite Failed', errorMsg);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRespond = async (id: string, action: 'accept' | 'reject') => {
        setActionLoading(id);
        try {
            const response = await respondRequest(id, action);
            if (!response.success) {
                toastRef.current.error(`Action Failed`, response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', `Partnership request ${action === 'accept' ? 'accepted' : 'rejected'}.`);
            if (isDetailsDrawerOpen && selectedPartnership?.id === id) setIsDetailsDrawerOpen(false);
            await loadPartnerships();
        } catch {
            toastRef.current.error(`Action Failed`, 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTerminate = async (id: string) => {
        const confirmed = await confirm({
            title: `Terminate Partnership`,
            message: `Are you sure you want to terminate this partnership? This action will disable shared clinical workflows.`,
            confirmLabel: 'Terminate Partnership',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(id);
        try {
            const response = await terminatePartnership(id);
            if (!response.success) {
                toastRef.current.error('Termination Failed', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', 'Partnership terminated.');
            if (isDetailsDrawerOpen && selectedPartnership?.id === id) setIsDetailsDrawerOpen(false);
            await loadPartnerships();
        } catch {
            toastRef.current.error('Termination Failed', 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    // Derived counts
    const counts = useMemo(() => {
        const c = { active: 0, invitations: 0, requests: 0, history: 0, total: 0 };
        partnerships.forEach(p => {
            if (activeTab !== 'all' && p.partner.type !== activeTab) return;
            c.total++;
            if (p.status === 'active') c.active++;
            else if (p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested')) c.invitations++;
            else if (!p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested')) c.requests++;
            else if (p.status === 'rejected' || p.status === 'terminated' || p.status === 'cancelled') c.history++;
        });
        return c;
    }, [partnerships, activeTab]);

    // Action Required Items (Incoming partnership requests awaiting response)
    const actionRequiredList = useMemo(() => {
        return partnerships.filter(p => !p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested'));
    }, [partnerships]);

    // Filtering
    const filteredPartnerships = useMemo(() => {
        return partnerships.filter(p => {
            if (activeTab !== 'all' && p.partner.type !== activeTab) return false;

            if (statusFilter === 'active' && p.status !== 'active') return false;
            if (statusFilter === 'invitations' && (!p.is_initiator || (p.status !== 'pending' && p.status !== 'changes_requested'))) return false;
            if (statusFilter === 'requests' && (p.is_initiator || (p.status !== 'pending' && p.status !== 'changes_requested'))) return false;
            if (statusFilter === 'history' && (p.status !== 'rejected' && p.status !== 'terminated' && p.status !== 'cancelled')) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!p.partner.name?.toLowerCase().includes(q) &&
                    !p.partner.city?.toLowerCase().includes(q) &&
                    !p.partner.state?.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [partnerships, activeTab, statusFilter, searchQuery]);

    const activeDiscoveryResults = useMemo(() => {
        const results = [...discoveryResults];
        if (selectedPartner) {
            const exists = results.some(r => (r.id || r._id) === selectedPartnerId);
            if (!exists) {
                results.unshift(selectedPartner);
            }
        }
        return results;
    }, [discoveryResults, selectedPartner, selectedPartnerId]);

    // Check if the currently selected partner in Step 2 is eligible
    const selectedPartnerEligibility = useMemo(() => {
        if (!selectedPartnerId) return { eligible: false, reason: '' };
        const existing = partnerships.find(p => p.partner.id === selectedPartnerId);
        if (!existing) return { eligible: true, reason: '' };
        if (existing.status === 'active') return { eligible: false, reason: 'Already an active partner in your network.' };
        if (existing.status === 'pending' || existing.status === 'changes_requested') {
            return {
                eligible: false,
                reason: existing.is_initiator
                    ? 'A partnership invitation was already sent to this organization.'
                    : 'This organization has already sent you an incoming partnership request.'
            };
        }
        return { eligible: true, reason: '' };
    }, [selectedPartnerId, partnerships]);

    const getStatusBadge = (status: PartnershipStatus, isInitiator: boolean) => {
        if (status === 'active') {
            return {
                label: 'Active Partner',
                classes: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                icon: UserCheck
            };
        }
        if (status === 'pending' && isInitiator) {
            return {
                label: 'Invitation Sent',
                classes: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                icon: Send
            };
        }
        if (status === 'pending' && !isInitiator) {
            return {
                label: 'Incoming Request',
                classes: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                icon: AlertCircle
            };
        }
        if (status === 'changes_requested') {
            return {
                label: 'Changes Proposed',
                classes: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                icon: Clock
            };
        }
        if (status === 'terminated') {
            return {
                label: 'Terminated',
                classes: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                icon: Trash2
            };
        }
        return {
            label: 'Declined',
            classes: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
            icon: X
        };
    };

    const openDetails = (p: Partnership) => {
        setSelectedPartnership(p);
        setIsDetailsDrawerOpen(true);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <ConfirmDialog {...dialogProps} />

            {/* 1. Header with Clear Role/Context */}
            <PageHeader
                title={title}
                subtitle={subtitle}
                actions={
                    <>
                        <button
                            onClick={loadPartnerships}
                            disabled={loading}
                            className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={() => setIsAddDrawerOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] transition-all font-medium text-sm shadow-xs hover:shadow"
                        >
                            <Plus className="h-4 w-4" />
                            Add Partnership
                        </button>
                    </>
                }
            />

            {/* Referral Separation Notice */}
            <div className="flex items-center justify-between gap-4 p-3.5 px-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200">
                <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                    <span className="truncate">
                        <strong>Organization Partnerships:</strong> Establish connections with clinics & hospitals. Active partnerships enable bidirectional patient test referrals.
                    </span>
                </div>
                <Link
                    href="/diagnostic-center/referrals"
                    className="shrink-0 font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white flex items-center gap-1 transition"
                >
                    Manage Patient Referrals <ExternalLink className="h-3 w-3" />
                </Link>
            </div>

            {/* 2. Interactive KPI / Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Network Card */}
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusFilter('all')}
                    className={`cursor-pointer transition-all duration-200 rounded-2xl border p-5 flex items-center justify-between gap-4 select-none ${
                        statusFilter === 'all'
                            ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-md ring-2 ring-purple-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs'
                    }`}
                >
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Total Network
                            </p>
                            {statusFilter === 'all' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                            )}
                        </div>
                        <p className="text-[28px] lg:text-3xl font-bold text-slate-900 dark:text-white mt-1 leading-none tracking-tight">
                            {loading ? '...' : (counts.total ?? 0)}
                        </p>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                            {statusFilter === 'all' ? '● All Records' : 'All network connections'}
                        </span>
                    </div>
                    <div className={`p-3 rounded-xl shrink-0 transition-colors ${
                        statusFilter === 'all'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                    }`}>
                        <Network className="h-5 w-5" />
                    </div>
                </div>

                {/* Active Partners Card */}
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={statusFilter === 'active'}
                    onClick={() => setStatusFilter('active')}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusFilter('active')}
                    className={`cursor-pointer transition-all duration-200 rounded-2xl border p-5 flex items-center justify-between gap-4 select-none ${
                        statusFilter === 'active'
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs'
                    }`}
                >
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Active Partners
                            </p>
                            {statusFilter === 'active' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            )}
                        </div>
                        <p className="text-[28px] lg:text-3xl font-bold text-slate-900 dark:text-white mt-1 leading-none tracking-tight">
                            {loading ? '...' : (counts.active ?? 0)}
                        </p>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            {statusFilter === 'active' ? '● Active Partners' : 'Collaborating now'}
                        </span>
                    </div>
                    <div className={`p-3 rounded-xl shrink-0 transition-colors ${
                        statusFilter === 'active'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}>
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                </div>

                {/* Sent Invitations Card */}
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={statusFilter === 'invitations'}
                    onClick={() => setStatusFilter('invitations')}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusFilter('invitations')}
                    className={`cursor-pointer transition-all duration-200 rounded-2xl border p-5 flex items-center justify-between gap-4 select-none ${
                        statusFilter === 'invitations'
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xs'
                    }`}
                >
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Sent Invitations
                            </p>
                            {statusFilter === 'invitations' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            )}
                        </div>
                        <p className="text-[28px] lg:text-3xl font-bold text-slate-900 dark:text-white mt-1 leading-none tracking-tight">
                            {loading ? '...' : (counts.invitations ?? 0)}
                        </p>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                            {statusFilter === 'invitations' ? '● Outgoing' : 'Awaiting response'}
                        </span>
                    </div>
                    <div className={`p-3 rounded-xl shrink-0 transition-colors ${
                        statusFilter === 'invitations'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    }`}>
                        <Send className="h-5 w-5" />
                    </div>
                </div>

                {/* Action Required (Incoming Partnership Requests) */}
                <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={statusFilter === 'requests'}
                    onClick={() => setStatusFilter('requests')}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatusFilter('requests')}
                    className={`cursor-pointer transition-all duration-200 rounded-2xl border p-5 flex items-center justify-between gap-4 select-none relative ${
                        statusFilter === 'requests'
                            ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-md ring-2 ring-rose-500/20'
                            : counts.requests > 0
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs'
                    }`}
                >
                    {counts.requests > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-white text-[9px] font-bold items-center justify-center">
                                {counts.requests}
                            </span>
                        </span>
                    )}
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider truncate">
                                Action Required
                            </p>
                            {statusFilter === 'requests' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            )}
                        </div>
                        <p className="text-[28px] lg:text-3xl font-bold text-rose-700 dark:text-rose-300 mt-1 leading-none tracking-tight">
                            {loading ? '...' : (counts.requests ?? 0)}
                        </p>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                            {statusFilter === 'requests' ? '● Incoming Requests' : 'Requests awaiting review'}
                        </span>
                    </div>
                    <div className={`p-3 rounded-xl shrink-0 transition-colors ${
                        statusFilter === 'requests'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}>
                        <AlertCircle className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* 3. Dedicated Incoming Partnership Requests Section (when pending requests exist) */}
            {actionRequiredList.length > 0 && (
                <div className="p-5 rounded-2xl bg-linear-to-r from-rose-50/90 to-amber-50/80 dark:from-rose-950/30 dark:to-amber-950/20 border border-rose-200 dark:border-rose-800/60 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Incoming Partnership Requests
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                                        {actionRequiredList.length} Action Required
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                    The following organizations have requested to partner with your diagnostic center for shared patient test coordination.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {actionRequiredList.map((req) => (
                            <div
                                key={req.id}
                                className="p-4 bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/50 rounded-xl shadow-xs flex flex-col justify-between gap-3.5"
                            >
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                                {req.partner.name}
                                                {req.partner.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                                                Partnership Request
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="font-semibold uppercase text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                                {req.partner.typeLabel || req.partner.type}
                                            </span>
                                            <span>•</span>
                                            <span className="truncate">{req.partner.address ? `${req.partner.address}, ` : ''}{req.partner.city || 'Gorakhpur'}, {req.partner.state || 'UP'}</span>
                                        </div>

                                        {req.partnership_type && (
                                            <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 mt-1.5">
                                                Type: {req.partnership_type}
                                            </div>
                                        )}

                                        {req.metadata?.message && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                "{req.metadata.message}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => openDetails(req)}
                                        className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                                    >
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => handleRespond(req.id, 'reject')}
                                        disabled={actionLoading === req.id}
                                        className="px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleRespond(req.id, 'accept')}
                                        disabled={actionLoading === req.id}
                                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        Accept Partnership
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Filter & Search Controls */}
            <DashboardCard noPadding className="border-slate-200 dark:border-slate-800">
                <div className="p-3.5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search partners by name, city, state..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as any)}
                                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium text-slate-700 dark:text-slate-200"
                            >
                                <option value="all">All Organization Types</option>
                                {availableTargetTypes.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium text-slate-700 dark:text-slate-200"
                            >
                                <option value="all">All Statuses ({counts.total})</option>
                                <option value="active">Active Partners ({counts.active})</option>
                                <option value="requests">Incoming Requests ({counts.requests})</option>
                                <option value="invitations">Sent Invitations ({counts.invitations})</option>
                                <option value="history">History ({counts.history})</option>
                            </select>
                        </div>
                    </div>
                </div>
            </DashboardCard>

            {/* 5. Main Content: Partnerships Table */}
            {error ? (
                <DashboardCard noPadding className="border-slate-200 dark:border-slate-800">
                    <div className="py-16 text-center flex flex-col items-center">
                        <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{error}</h3>
                        <button
                            onClick={loadPartnerships}
                            className="mt-4 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </DashboardCard>
            ) : loading ? (
                <DashboardCard noPadding className="border-slate-200 dark:border-slate-800">
                    <div className="p-0 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-5 flex flex-col sm:flex-row gap-4">
                                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse shrink-0" />
                                <div className="space-y-3 flex-1 w-full">
                                    <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/3" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/4" />
                                    <div className="flex gap-2">
                                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse w-16" />
                                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            ) : filteredPartnerships.length === 0 ? (
                <DashboardCard noPadding className="border-slate-200 dark:border-slate-800">
                    <div className="py-16 text-center flex flex-col items-center px-4">
                        <Building className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            {searchQuery
                                ? 'No partners match your search.'
                                : statusFilter === 'active'
                                ? 'No active partners yet.'
                                : statusFilter === 'requests'
                                ? 'No incoming partnership requests pending.'
                                : statusFilter === 'invitations'
                                ? 'No outgoing invitations pending.'
                                : statusFilter === 'history'
                                ? 'No past partnership history.'
                                : 'No organization partnerships yet.'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                            {searchQuery
                                ? 'Try searching with a different partner name, city, or state.'
                                : statusFilter === 'active' && counts.requests > 0
                                ? `You have ${counts.requests} incoming partnership request${counts.requests > 1 ? 's' : ''} awaiting your response above.`
                                : 'Connect with verified clinics and hospitals to establish care network partnerships.'}
                        </p>
                        <div className="mt-5 flex items-center gap-3">
                            {searchQuery ? (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                                >
                                    Clear Search
                                </button>
                            ) : statusFilter === 'active' && counts.requests > 0 ? (
                                <button
                                    onClick={() => setStatusFilter('requests')}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
                                >
                                    Review Incoming Requests ({counts.requests})
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsAddDrawerOpen(true)}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition inline-flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Find Partners
                                </button>
                            )}
                        </div>
                    </div>
                </DashboardCard>
            ) : (
                <DashboardCard noPadding className="border-slate-200 dark:border-slate-800">
                    <div className="p-0 overflow-hidden">
                        {/* Section Subhead */}
                        <div className="px-5 py-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {statusFilter === 'active'
                                    ? `Active Partners (${filteredPartnerships.length})`
                                    : statusFilter === 'requests'
                                    ? `Incoming Partnership Requests (${filteredPartnerships.length})`
                                    : statusFilter === 'invitations'
                                    ? `Sent Partnership Invitations (${filteredPartnerships.length})`
                                    : statusFilter === 'history'
                                    ? `Past Partnership Records (${filteredPartnerships.length})`
                                    : `All Network Relationships (${filteredPartnerships.length})`}
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Click any row to view organization profile & details
                            </span>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-[#1a202c] dark:text-slate-200">
                                <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3.5 font-medium">Organization</th>
                                        <th className="px-5 py-3.5 font-medium">Organization Type</th>
                                        <th className="px-5 py-3.5 font-medium">Partnership Status</th>
                                        <th className="px-5 py-3.5 font-medium">Date</th>
                                        <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredPartnerships.map((p) => {
                                        const { label, classes, icon: StatusIcon } = getStatusBadge(p.status, p.is_initiator);
                                        const isActionRequired = !p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested');

                                        return (
                                            <tr
                                                key={p.id}
                                                className={`transition-colors cursor-pointer group ${
                                                    isActionRequired
                                                        ? 'bg-rose-50/25 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <td className="px-5 py-4" onClick={() => openDetails(p)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                            <Building2 className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                                {p.partner.name}
                                                                {p.partner.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                                                            </div>
                                                            <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {p.partner.address ? `${p.partner.address}, ` : ''}{p.partner.city || 'Gorakhpur'}, {p.partner.state || 'UP'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4" onClick={() => openDetails(p)}>
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                                                        {p.partner.typeLabel || p.partner.type}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4" onClick={() => openDetails(p)}>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${classes}`}>
                                                        <StatusIcon className="h-3.5 w-3.5" />
                                                        {label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs" onClick={() => openDetails(p)}>
                                                    {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {isActionRequired ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleRespond(p.id, 'reject')}
                                                                    disabled={actionLoading === p.id}
                                                                    className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRespond(p.id, 'accept')}
                                                                    disabled={actionLoading === p.id}
                                                                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                                                                >
                                                                    {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                                    Accept
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => openDetails(p)}
                                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                                                            >
                                                                View Details
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredPartnerships.map((p) => {
                                const { label, classes, icon: StatusIcon } = getStatusBadge(p.status, p.is_initiator);
                                const isActionRequired = !p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested');

                                return (
                                    <div
                                        key={p.id}
                                        className={`p-4 space-y-3 transition-colors ${
                                            isActionRequired
                                                ? 'bg-rose-50/25 dark:bg-rose-950/10'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3" onClick={() => openDetails(p)}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        {p.partner.name}
                                                        {p.partner.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                            {p.partner.typeLabel || p.partner.type}
                                                        </span>
                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-2" />
                                        </div>

                                        {isActionRequired && (
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    onClick={() => openDetails(p)}
                                                    className="flex-1 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                                >
                                                    Details
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(p.id, 'reject')}
                                                    disabled={actionLoading === p.id}
                                                    className="flex-1 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 dark:border-rose-800 rounded-lg"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(p.id, 'accept')}
                                                    disabled={actionLoading === p.id}
                                                    className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                                >
                                                    Accept
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DashboardCard>
            )}

            {/* 6. Add Partnership Drawer */}
            {isAddDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end" onKeyDown={(e) => e.key === 'Escape' && handleCloseAddDrawer()}>
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity" onClick={handleCloseAddDrawer} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 focus:outline-none border-l border-slate-200 dark:border-slate-800" tabIndex={-1}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Organization Partnership</h2>
                            <button onClick={handleCloseAddDrawer} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" aria-label="Close drawer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {inviteSuccess ? (
                            <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 flex flex-col items-center justify-center text-center">
                                <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Partnership Request Sent</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
                                    Your partnership invitation has been dispatched. The organization administrator will receive an alert to review and accept.
                                </p>
                                <button onClick={handleCloseAddDrawer} className="mt-6 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all shadow-xs">
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Progress Indicator */}
                                <div className="px-6 pt-5 pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between relative">
                                        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-200 dark:bg-slate-700 -z-10" />
                                        {[1, 2, 3].map((step) => (
                                            <div key={step} className="flex flex-col items-center gap-1.5 bg-slate-50 dark:bg-slate-900 shadow-[0_0_0_4px_rgb(248,250,252)] dark:shadow-[0_0_0_4px_#0f172a] rounded-full px-1">
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                                                    inviteStep === step ? 'bg-purple-600 text-white shadow-xs' :
                                                    inviteStep > step ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                                }`}>
                                                    {inviteStep > step ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
                                                </div>
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                                    inviteStep >= step ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'
                                                }`}>
                                                    {step === 1 ? 'Type' : step === 2 ? 'Find' : 'Review'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 space-y-6">
                                    {inviteStep === 1 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Partner Organization Type</h3>
                                            <div className="space-y-3">
                                                {availableTargetTypes.map((type) => (
                                                    <label
                                                        key={type.value}
                                                        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                                            inviteType === type.value
                                                                ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 ring-1 ring-purple-600/20'
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="orgType"
                                                            checked={inviteType === type.value}
                                                            onChange={() => {
                                                                setInviteType(type.value as OrgType);
                                                                setSelectedPartnerId('');
                                                                setSelectedPartner(null);
                                                            }}
                                                            className="mt-1 h-4 w-4 accent-purple-600 border-slate-300 text-purple-600 focus:ring-purple-600"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{type.label}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connect with a verified {type.label.toLowerCase()} in your network.</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {inviteStep === 2 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between items-center">
                                                Find Partner Organization
                                                <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
                                                    {availableTargetTypes.find((t) => t.value === inviteType)?.label}
                                                </span>
                                            </h3>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name, city, state..."
                                                    value={inviteSearch}
                                                    onChange={(e) => setInviteSearch(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 shadow-xs transition-all"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl max-h-[400px] overflow-y-auto shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
                                                {isDiscovering && discoveryResults.length === 0 ? (
                                                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center">
                                                        <Loader2 className="h-5 w-5 animate-spin text-purple-600 mb-3" />
                                                        Searching verified organizations...
                                                    </div>
                                                ) : discoveryError ? (
                                                    <div className="p-8 text-center text-sm text-red-500 dark:text-red-400 flex flex-col items-center">
                                                        <AlertCircle className="h-5 w-5 mb-2 text-red-400" />
                                                        {discoveryError}
                                                    </div>
                                                ) : activeDiscoveryResults.length > 0 ? (
                                                    activeDiscoveryResults.map((org, index) => {
                                                        const orgId = org.id || org._id;
                                                        // Relationship eligibility check
                                                        const existingRel = partnerships.find(p => p.partner.id === orgId);

                                                        let isSelectable = true;
                                                        let badgeLabel = '';
                                                        let badgeClass = '';
                                                        let isIncoming = false;

                                                        if (existingRel) {
                                                            if (existingRel.status === 'active') {
                                                                isSelectable = false;
                                                                badgeLabel = 'Already a Partner';
                                                                badgeClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                                                            } else if (existingRel.status === 'pending' || existingRel.status === 'changes_requested') {
                                                                isSelectable = false;
                                                                if (!existingRel.is_initiator) {
                                                                    isIncoming = true;
                                                                    badgeLabel = 'Incoming Request Pending';
                                                                    badgeClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                                                                } else {
                                                                    badgeLabel = 'Partnership Request Pending';
                                                                    badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                                                                }
                                                            }
                                                        }

                                                        const isSelected = selectedPartnerId === orgId && isSelectable;

                                                        return (
                                                            <div
                                                                key={orgId || index}
                                                                className={`p-4 transition-colors ${
                                                                    !isSelectable
                                                                        ? 'bg-slate-50/60 dark:bg-slate-900/40 opacity-75'
                                                                        : isSelected
                                                                        ? 'bg-purple-50/60 dark:bg-purple-950/40 cursor-pointer'
                                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                                                                }`}
                                                                onClick={() => {
                                                                    if (isSelectable) {
                                                                        setSelectedPartnerId(orgId);
                                                                        setSelectedPartner(org);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                        <input
                                                                            type="radio"
                                                                            name="partnerSelect"
                                                                            checked={isSelected}
                                                                            disabled={!isSelectable}
                                                                            onChange={() => {
                                                                                if (isSelectable) {
                                                                                    setSelectedPartnerId(orgId);
                                                                                    setSelectedPartner(org);
                                                                                }
                                                                            }}
                                                                            className="mt-1 h-4 w-4 accent-purple-600 border-slate-300 text-purple-600 focus:ring-purple-600 disabled:opacity-40"
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className={`font-semibold text-sm ${isSelectable ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                                    {org.name}
                                                                                </span>
                                                                                {org.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                                                                {badgeLabel && (
                                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                                                                        {badgeLabel}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {(org.city || org.state || org.address) && (
                                                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                                                    <span className="truncate">{org.city || org.address}{org.city && org.state ? ', ' : ''}{org.state}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {isIncoming && existingRel && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCloseAddDrawer();
                                                                                openDetails(existingRel);
                                                                            }}
                                                                            className="shrink-0 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition"
                                                                        >
                                                                            View Request
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : inviteSearch.trim() === '' ? (
                                                    <div className="p-10 flex flex-col items-center text-center">
                                                        <Search className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-3" />
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">Available Organizations</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select an organization or type to search.</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-10 flex flex-col items-center text-center">
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">No organizations found</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">We couldn't find anything matching '{inviteSearch}'</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {inviteStep === 3 && selectedPartner && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs">
                                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Selected Organization</div>
                                                <div className="flex items-start gap-3">
                                                    <div className="h-10 w-10 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            {selectedPartner.name}
                                                            {selectedPartner.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                                                        </div>
                                                        {(selectedPartner.city || selectedPartner.state || selectedPartner.address) && (
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {selectedPartner.city || selectedPartner.address}{selectedPartner.city && selectedPartner.state ? ', ' : ''}{selectedPartner.state}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message (Optional)</label>
                                                <textarea
                                                    value={inviteMessage}
                                                    onChange={(e) => setInviteMessage(e.target.value)}
                                                    placeholder="Include a message with your partnership request..."
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 shadow-xs min-h-[100px] resize-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between gap-3 shrink-0">
                                    {inviteStep > 1 ? (
                                        <button onClick={() => setInviteStep((s) => (s - 1) as any)} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
                                            Back
                                        </button>
                                    ) : (
                                        <button onClick={handleCloseAddDrawer} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
                                            Cancel
                                        </button>
                                    )}

                                    {inviteStep < 3 ? (
                                        <button
                                            onClick={() => setInviteStep((s) => (s + 1) as any)}
                                            disabled={
                                                (inviteStep === 1 && !inviteType) ||
                                                (inviteStep === 2 && (!selectedPartnerId || !selectedPartnerEligibility.eligible))
                                            }
                                            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:shadow-none"
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleInvite}
                                            disabled={actionLoading === 'invite'}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {actionLoading === 'invite' ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                            ) : (
                                                'Send Partnership Request'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 7. Organization & Partnership Details Drawer */}
            {isDetailsDrawerOpen && selectedPartnership && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsDetailsDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {!selectedPartnership.is_initiator && selectedPartnership.status === 'pending'
                                    ? 'Incoming Partnership Request'
                                    : 'Partnership Details'}
                            </h2>
                            <button onClick={() => setIsDetailsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 space-y-6">

                            {/* Organization Profile Card */}
                            <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs">
                                <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                                    <Building2 className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                                    {selectedPartnership.partner.name}
                                    {selectedPartnership.partner.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {selectedPartnership.partner.address ? `${selectedPartnership.partner.address}, ` : ''}
                                    {selectedPartnership.partner.city || 'Gorakhpur'}, {selectedPartnership.partner.state || 'UP'}
                                </p>
                                <div className="flex items-center gap-2 mt-4">
                                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider">
                                        {selectedPartnership.partner.typeLabel || selectedPartnership.partner.type}
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(selectedPartnership.status, selectedPartnership.is_initiator).classes}`}>
                                        {getStatusBadge(selectedPartnership.status, selectedPartnership.is_initiator).label}
                                    </span>
                                </div>
                            </div>

                            {/* Partnership Overview */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Partnership Overview</h4>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Workflow Direction</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {selectedPartnership.is_initiator
                                                ? 'Partnership invitation sent by you'
                                                : `Incoming partnership request from ${selectedPartnership.partner.name}`}
                                        </p>
                                    </div>

                                    {selectedPartnership.partnership_type && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Partnership Type</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {selectedPartnership.partnership_type}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date Requested</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {new Date(selectedPartnership.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>

                                    {selectedPartnership.accepted_at && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date Activated</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-emerald-500" />
                                                {new Date(selectedPartnership.accepted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    )}

                                    {selectedPartnership.metadata?.message && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Request Note</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                                "{selectedPartnership.metadata.message}"
                                            </p>
                                        </div>
                                    )}

                                    <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs text-purple-800 dark:text-purple-300">
                                        <p className="font-semibold mb-0.5">Clinical Collaboration:</p>
                                        <p>
                                            Active partnerships enable this organization to send digital diagnostic test referrals directly to your center, with real-time status and report delivery.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid gap-2">
                            {selectedPartnership.status === 'pending' && !selectedPartnership.is_initiator && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRespond(selectedPartnership.id, 'reject')}
                                        disabled={!!actionLoading}
                                        className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleRespond(selectedPartnership.id, 'accept')}
                                        disabled={!!actionLoading}
                                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        {actionLoading === selectedPartnership.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Accept Partnership
                                    </button>
                                </div>
                            )}

                            {selectedPartnership.status === 'active' && (
                                <button
                                    onClick={() => handleTerminate(selectedPartnership.id)}
                                    disabled={!!actionLoading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" /> Terminate Partnership
                                </button>
                            )}

                            {(selectedPartnership.status === 'rejected' || selectedPartnership.status === 'terminated' || selectedPartnership.status === 'cancelled') && (
                                <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-2">
                                    This partnership is no longer active.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
