'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, Plus, Building2, Network, Search, CheckCircle2, Building, ArrowLeft, Pill, Microscope, Clock, X, FileText, ChevronRight, Activity, AlertCircle, Shield, Calendar, Trash2 } from 'lucide-react';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PartnershipCard, Partnership, OrgType, PartnershipStatus } from '@/components/ui/PartnershipCard';
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
    currentOrgType: OrgType;
    availableTargetTypes: { value: OrgType; label: string }[];
    fetchPartnerships: (status?: string) => Promise<ActionResponse>;
    sendInvite: (data: { targetType: string; targetId: string; partnershipType?: string; metadata?: any }) => Promise<ActionResponse>;
    respondRequest: (id: string, action: 'accept' | 'reject') => Promise<ActionResponse>;
    requestChanges: (id: string, message: string, metadataUpdates?: any) => Promise<ActionResponse>;
    acceptChanges: (id: string) => Promise<ActionResponse>;
    terminatePartnership: (id: string) => Promise<ActionResponse>;
}

const CAPABILITIES = {
    hospital: ['Emergency Referral', 'Specialist Referral', 'Inpatient Referral', 'Shared Care', 'Diagnostic Collaboration'],
    pharmacy: ['Prescription Fulfillment', 'Pickup', 'Delivery'],
    diagnostic_center: ['Testing', 'Pathology', 'Imaging', 'Sample Collection', 'Home Collection']
};

export default function OrganizationPartnershipManager({
    title,
    subtitle,
    currentOrgType,
    availableTargetTypes,
    fetchPartnerships,
    sendInvite,
    respondRequest,
    requestChanges,
    acceptChanges,
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
    const [activeTab, setActiveTab] = useState<'all' | 'hospital' | 'pharmacy' | 'diagnostic_center'>('all');
    const [statusFilter, setStatusFilter] = useState<'active' | 'invitations' | 'requests' | 'history'>('active');
    const [searchQuery, setSearchQuery] = useState('');

    // Drawers & Modals
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
    
    // Add Partner State
    const [inviteStep, setInviteStep] = useState<1|2|3>(1);
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
    const [requestChangesModal, setRequestChangesModal] = useState<{ id: string, show: boolean }>({ id: '', show: false });
    const [changesMessage, setChangesMessage] = useState('');

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

    useEffect(() => {
        if (!isAddDrawerOpen || inviteStep !== 2 || !inviteType) return;
        
        let active = true;
        setDiscoveryError('');
        
        const trimmedSearch = inviteSearch.trim();
        if (!trimmedSearch) {
            setIsDiscovering(false);
            setDiscoveryResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsDiscovering(true);
            try {
                let response;
                if (inviteType === 'hospital') response = await api.publicDiscovery.searchHospitals(trimmedSearch);
                else if (inviteType === 'pharmacy') response = await api.publicDiscovery.searchPharmacies(trimmedSearch);
                else if (inviteType === 'diagnostic_center') response = await api.publicDiscovery.searchDiagnosticCenters(trimmedSearch);
                else if (inviteType === 'clinic') response = await api.publicDiscovery.searchClinics(trimmedSearch);
                
                if (active) {
                    if (response?.success) {
                        const orgs = Array.isArray(response.data) ? response.data : ((response.data as any)?.data || []);
                        setDiscoveryResults(Array.isArray(orgs) ? orgs : []);
                    } else {
                        setDiscoveryError(response?.error || 'Unable to load organizations');
                        setDiscoveryResults([]);
                    }
                }
            } catch (err) {
                if (active) {
                    setDiscoveryError('Unable to load organizations');
                    setDiscoveryResults([]);
                }
            } finally {
                if (active) setIsDiscovering(false);
            }
        }, 400);

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
                toastRef.current.error('Invite Failed', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Invite Sent', 'Partnership request sent successfully.');
            setInviteSuccess(true);
            await loadPartnerships();
        } catch {
            toastRef.current.error('Invite Failed', 'Network error. Please try again.');
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
            toastRef.current.success('Success', `Partnership ${action}ed.`);
            if (isDetailsDrawerOpen && selectedPartnership?.id === id) setIsDetailsDrawerOpen(false);
            await loadPartnerships();
        } catch {
            toastRef.current.error(`Action Failed`, 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    const submitRequestChanges = async () => {
        if (!changesMessage.trim() || !requestChangesModal.id) return;
        setActionLoading(requestChangesModal.id);
        try {
            const response = await requestChanges(requestChangesModal.id, changesMessage);
            if (!response.success) {
                toastRef.current.error('Failed', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', 'Changes requested successfully.');
            setRequestChangesModal({ id: '', show: false });
            setChangesMessage('');
            if (isDetailsDrawerOpen && selectedPartnership?.id === requestChangesModal.id) setIsDetailsDrawerOpen(false);
            await loadPartnerships();
        } catch {
            toastRef.current.error('Failed', 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptChanges = async (id: string) => {
        setActionLoading(id);
        try {
            const response = await acceptChanges(id);
            if (!response.success) {
                toastRef.current.error('Failed', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', 'Changes accepted.');
            if (isDetailsDrawerOpen && selectedPartnership?.id === id) setIsDetailsDrawerOpen(false);
            await loadPartnerships();
        } catch {
            toastRef.current.error('Failed', 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTerminate = async (id: string) => {
        const confirmed = await confirm({
            title: `Terminate Partnership`,
            message: `Are you sure you want to terminate this partnership? This action will disable shared workflows.`,
            confirmLabel: 'Terminate',
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

    const getStatusInfo = (status: PartnershipStatus, isInitiator: boolean) => {
        if (status === 'active') return { label: 'Active', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
        if (status === 'pending' && isInitiator) return { label: 'Sent', classes: 'bg-amber-100 text-amber-800 border-amber-200' };
        if (status === 'pending' && !isInitiator) return { label: 'Received', classes: 'bg-amber-100 text-amber-800 border-amber-200' };
        if (status === 'changes_requested') return { label: 'Negotiating', classes: 'bg-blue-100 text-blue-800 border-blue-200' };
        return { label: status, classes: 'bg-red-100 text-red-800 border-red-200' };
    };

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

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <ConfirmDialog {...dialogProps} />
            
            {/* 1. Header */}
            <PageHeader
                title={title}
                subtitle={subtitle}
                actions={
                    <>
                        <button 
                            onClick={loadPartnerships}
                            disabled={loading}
                            className="px-4 py-2 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-[10px] border border-slate-200 transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button 
                            onClick={() => setIsAddDrawerOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] transition-all font-medium text-sm shadow-sm hover:shadow"
                        >
                            <Plus className="h-4 w-4" />
                            Add Partnership
                        </button>
                    </>
                }
            />

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <Network className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Partners</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : counts.total}</p>
                    </div>
                </div></DashboardCard>
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : counts.active}</p>
                    </div>
                </div></DashboardCard>
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invitations</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : counts.invitations}</p>
                    </div>
                </div></DashboardCard>
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-xl text-red-600">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action Required</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : counts.requests}</p>
                    </div>
                </div></DashboardCard>
            </div>

            {/* 3. Filters */}
            <DashboardCard noPadding><div className="p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by partner name, city, state..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-transparent focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as any)}
                            className="px-3 py-2 text-sm bg-slate-50 border-transparent focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium text-slate-700"
                        >
                            <option value="all">All Types</option>
                            {availableTargetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-3 py-2 text-sm bg-slate-50 border-transparent focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium text-slate-700"
                        >
                            <option value="active">Active</option>
                            <option value="requests">Action Required</option>
                            <option value="invitations">Sent Invitations</option>
                            <option value="history">History</option>
                        </select>
                    </div>
                </div>
            </div></DashboardCard>

            {/* 4. Main Content */}
            {error ? (
                <DashboardCard noPadding><div className="py-16 text-center flex flex-col items-center">
                    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                    <h3 className="text-sm font-medium text-slate-900">{error}</h3>
                    <button onClick={loadPartnerships} className="mt-4 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        Try Again
                    </button>
                </div></DashboardCard>
            ) : loading ? (
                <DashboardCard noPadding><div className="p-0 overflow-hidden divide-y divide-slate-100">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-5 flex flex-col sm:flex-row gap-4">
                            <div className="h-16 w-16 bg-slate-100 rounded-xl animate-pulse shrink-0" />
                            <div className="space-y-3 flex-1 w-full">
                                <div className="h-5 bg-slate-100 rounded animate-pulse w-1/3" />
                                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/4" />
                                <div className="flex gap-2">
                                    <div className="h-6 bg-slate-100 rounded-full animate-pulse w-16" />
                                    <div className="h-6 bg-slate-100 rounded-full animate-pulse w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div></DashboardCard>
            ) : filteredPartnerships.length === 0 ? (
                <DashboardCard noPadding><div className="py-16 text-center flex flex-col items-center">
                    <Building className="h-10 w-10 text-slate-300 mb-3" />
                    <h3 className="text-sm font-medium text-slate-900">No partnerships found.</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {searchQuery ? "No partners match your search." : "Build your network to streamline patient referrals and care coordination."}
                    </p>
                    {!searchQuery && (
                        <button 
                            onClick={() => setIsAddDrawerOpen(true)}
                            className="mt-5 px-5 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Find Partners
                        </button>
                    )}
                </div></DashboardCard>
            ) : (
                <DashboardCard noPadding><div className="p-0 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-[#1a202c]">
                            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-4 font-medium">Partner</th>
                                    <th className="px-5 py-4 font-medium">Type</th>
                                    <th className="px-5 py-4 font-medium">Status</th>
                                    <th className="px-5 py-4 font-medium">Since</th>
                                    <th className="px-5 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPartnerships.map((p) => {
                                    const { label, classes } = getStatusInfo(p.status, p.is_initiator);
                                    return (
                                        <tr key={p.id} onClick={() => { setSelectedPartnership(p); setIsDetailsDrawerOpen(true); }} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                            {p.partner.name}
                                                            {p.partner.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-500" />}
                                                        </div>
                                                        <div className="text-[12px] text-slate-500 mt-0.5">{p.partner.city || 'Unknown'}, {p.partner.state || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                                    {p.partner.typeLabel || p.partner.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${classes}`}>
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedPartnership(p); setIsDetailsDrawerOpen(true); }} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filteredPartnerships.map((p) => {
                            const { label, classes } = getStatusInfo(p.status, p.is_initiator);
                            return (
                                <div key={p.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedPartnership(p); setIsDetailsDrawerOpen(true); }}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                                    {p.partner.name}
                                                    {p.partner.is_verified && <CheckCircle2 className="h-3 w-3 text-blue-500" />}
                                                </div>
                                                <div className="text-[11px] text-slate-500">{p.partner.city || 'Unknown'}, {p.partner.state || ''}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pl-13">
                                        <div className="flex gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                                                {p.partner.typeLabel || p.partner.type}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${classes}`}>
                                                {label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div></DashboardCard>
            )}

            {/* 5. Add Partnership Drawer */}
            {isAddDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end" onKeyDown={(e) => e.key === 'Escape' && handleCloseAddDrawer()}>
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={handleCloseAddDrawer} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 focus:outline-none" tabIndex={-1}>
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                            <h2 className="text-lg font-semibold text-slate-900">Add Partnership</h2>
                            <button onClick={handleCloseAddDrawer} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors" aria-label="Close drawer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {inviteSuccess ? (
                            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center">
                                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">Request Sent Successfully</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-xs">Your partnership request has been dispatched. The organization will be notified immediately.</p>
                                <button onClick={handleCloseAddDrawer} className="mt-6 px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all shadow-sm">
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Progress Indicator */}
                                <div className="px-6 pt-5 pb-3 bg-slate-50/50 border-b border-slate-100">
                                    <div className="flex items-center justify-between relative">
                                        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-200 -z-10" />
                                        {[1, 2, 3].map(step => (
                                            <div key={step} className="flex flex-col items-center gap-1.5 bg-slate-50">
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors shadow-[0_0_0_4px_rgb(248,250,252)] ${
                                                    inviteStep === step ? 'bg-purple-600 text-white' :
                                                    inviteStep > step ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {inviteStep > step ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
                                                </div>
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                                    inviteStep >= step ? 'text-purple-600' : 'text-slate-400'
                                                }`}>
                                                    {step === 1 ? 'Type' : step === 2 ? 'Find' : 'Review'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
                                    {inviteStep === 1 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h3 className="text-sm font-medium text-slate-700">Select Organization Type</h3>
                                            <div className="space-y-3">
                                                {availableTargetTypes.map(type => (
                                                    <label 
                                                        key={type.value}
                                                        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                                            inviteType === type.value ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600/20' : 'border-slate-200 bg-white hover:border-purple-300'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="radio" 
                                                            name="orgType" 
                                                            checked={inviteType === type.value} 
                                                            onChange={() => setInviteType(type.value as OrgType)} 
                                                            className="mt-1 h-4 w-4 accent-purple-600 border-slate-300 text-purple-600 focus:ring-purple-600" 
                                                        />
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">{type.label}</div>
                                                            <div className="text-xs text-slate-500 mt-1">Connect with a verified {type.label.toLowerCase()} in your network.</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {inviteStep === 2 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h3 className="text-sm font-medium text-slate-700 flex justify-between items-center">
                                                Find Partner
                                                <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {availableTargetTypes.find(t => t.value === inviteType)?.label}
                                                </span>
                                            </h3>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search by name, city, state..."
                                                    value={inviteSearch}
                                                    onChange={(e) => setInviteSearch(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 shadow-sm transition-all"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="bg-white border border-slate-100 rounded-xl max-h-[400px] overflow-y-auto shadow-sm divide-y divide-slate-100">
                                                {isDiscovering && discoveryResults.length === 0 ? (
                                                    <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center">
                                                        <Loader2 className="h-5 w-5 animate-spin text-purple-600 mb-3" />
                                                        Searching organizations...
                                                    </div>
                                                ) : discoveryError ? (
                                                    <div className="p-8 text-center text-sm text-red-500 flex flex-col items-center">
                                                        <AlertCircle className="h-5 w-5 mb-2 text-red-400" />
                                                        {discoveryError}
                                                    </div>
                                                ) : activeDiscoveryResults.length > 0 ? (
                                                    activeDiscoveryResults.map((org, index) => (
                                                        <label 
                                                            key={org.id || org._id || index}
                                                            className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                                                                (selectedPartnerId === (org.id || org._id)) ? 'bg-purple-50/50' : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                name="partnerSelect"
                                                                checked={selectedPartnerId === (org.id || org._id)} 
                                                                onChange={() => { setSelectedPartnerId(org.id || org._id); setSelectedPartner(org); }}
                                                                className="mt-1 h-4 w-4 accent-purple-600 border-slate-300 text-purple-600 focus:ring-purple-600"
                                                            />
                                                            <div>
                                                                <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                                                                    {org.name}
                                                                    {org.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                                                                </div>
                                                                {(org.city || org.state) && (
                                                                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                                        <Building className="h-3 w-3" />
                                                                        {org.city}{org.city && org.state ? ', ' : ''}{org.state}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </label>
                                                    ))
                                                ) : inviteSearch.trim() === '' ? (
                                                    <div className="p-10 flex flex-col items-center text-center">
                                                        <Search className="h-8 w-8 text-slate-200 mb-3" />
                                                        <span className="text-sm font-medium text-slate-900">Type to search</span>
                                                        <span className="text-xs text-slate-500 mt-1">Search for verified organizations</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-10 flex flex-col items-center text-center">
                                                        <span className="text-sm font-medium text-slate-900">No organizations found</span>
                                                        <span className="text-xs text-slate-500 mt-1">We couldn't find anything matching '{inviteSearch}'</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {inviteStep === 3 && selectedPartner && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selected Partner</div>
                                                <div className="flex items-start gap-3">
                                                    <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                            {selectedPartner.name}
                                                            {selectedPartner.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                                                        </div>
                                                        {(selectedPartner.city || selectedPartner.state) && (
                                                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                                <Building className="h-3 w-3" />
                                                                {selectedPartner.city}{selectedPartner.city && selectedPartner.state ? ', ' : ''}{selectedPartner.state}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Message (Optional)</label>
                                                <textarea 
                                                    value={inviteMessage}
                                                    onChange={(e) => setInviteMessage(e.target.value)}
                                                    placeholder="Include a message with your partnership request..."
                                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 shadow-sm min-h-[100px] resize-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 border-t border-slate-100 bg-white flex justify-between gap-3 shrink-0">
                                    {inviteStep > 1 ? (
                                        <button onClick={() => setInviteStep(s => (s - 1) as any)} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center">
                                            Back
                                        </button>
                                    ) : (
                                        <button onClick={handleCloseAddDrawer} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center">
                                            Cancel
                                        </button>
                                    )}
                                    
                                    {inviteStep < 3 ? (
                                        <button 
                                            onClick={() => setInviteStep(s => (s + 1) as any)}
                                            disabled={(inviteStep === 1 && !inviteType) || (inviteStep === 2 && !selectedPartnerId)}
                                            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:shadow-none"
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleInvite}
                                            disabled={actionLoading === 'invite'}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {actionLoading === 'invite' ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                            ) : (
                                                'Send Request'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 6. Details Drawer */}
            {isDetailsDrawerOpen && selectedPartnership && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailsDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                            <h2 className="text-lg font-semibold text-slate-900">Partnership Details</h2>
                            <button onClick={() => setIsDetailsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
                            
                            <div className="flex flex-col items-center text-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <div className="h-16 w-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                                    <Building2 className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                                    {selectedPartnership.partner.name}
                                    {selectedPartnership.partner.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">{selectedPartnership.partner.city || 'Unknown'}, {selectedPartnership.partner.state || ''}</p>
                                <div className="flex items-center gap-2 mt-4">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider">
                                        {selectedPartnership.partner.typeLabel || selectedPartnership.partner.type}
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusInfo(selectedPartnership.status, selectedPartnership.is_initiator).classes}`}>
                                        {getStatusInfo(selectedPartnership.status, selectedPartnership.is_initiator).label}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-sm font-semibold text-slate-900">Partnership Agreement</h4>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Capabilities Supported</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedPartnership.metadata?.capabilities?.length ? (
                                                selectedPartnership.metadata.capabilities.map((c: string) => (
                                                    <span key={c} className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">
                                                        {c}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-slate-500">None specified</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initiated</p>
                                        <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {new Date(selectedPartnership.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    {selectedPartnership.metadata?.message && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Original Message</p>
                                            <p className="text-sm text-slate-700 italic bg-slate-50 p-3 rounded-lg">"{selectedPartnership.metadata.message}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-5 border-t border-slate-100 bg-white grid gap-2">
                            {selectedPartnership.status === 'pending' && !selectedPartnership.is_initiator && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleRespond(selectedPartnership.id, 'accept')} disabled={!!actionLoading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
                                        Accept Request
                                    </button>
                                    <button onClick={() => handleRespond(selectedPartnership.id, 'reject')} disabled={!!actionLoading} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-all shadow-sm">
                                        Reject
                                    </button>
                                </div>
                            )}

                            {selectedPartnership.status === 'active' && (
                                <button onClick={() => handleTerminate(selectedPartnership.id)} disabled={!!actionLoading} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium transition-all shadow-sm">
                                    <Trash2 className="h-4 w-4" /> Terminate Partnership
                                </button>
                            )}

                            {(selectedPartnership.status === 'rejected' || selectedPartnership.status === 'terminated' || selectedPartnership.status === 'cancelled') && (
                                <div className="text-center text-sm text-slate-500 py-2">
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
