'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, RefreshCw, Plus, Building2, Network, UserPlus, Search, SearchX, CheckCircle2, Building, ArrowLeft, Pill, Microscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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

// Discovery logic handled dynamically via api.publicDiscovery

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
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filters
    const [activeTab, setActiveTab] = useState<'all' | 'hospital' | 'pharmacy' | 'diagnostic_center'>('all');
    const [statusFilter, setStatusFilter] = useState<'active' | 'invitations' | 'requests' | 'history'>('active');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteStep, setInviteStep] = useState<1|2|3|4>(1);
    const [inviteType, setInviteType] = useState<OrgType | ''>('');
    const [inviteSearch, setInviteSearch] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<any>(null);
    const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
    const [inviteMessage, setInviteMessage] = useState('');

    const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryError, setDiscoveryError] = useState('');

    const [requestChangesModal, setRequestChangesModal] = useState<{ id: string, show: boolean }>({ id: '', show: false });
    const [changesMessage, setChangesMessage] = useState('');
    
    const [detailsModal, setDetailsModal] = useState<{ show: boolean, partnership: Partnership | null }>({ show: false, partnership: null });

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const loadPartnerships = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchPartnerships();
            if (!response.success) {
                toastRef.current.error('Unable to load partnerships', response.error || 'Please try again.');
                setPartnerships([]);
                return;
            }
            setPartnerships(Array.isArray(response.data) ? response.data : []);
        } catch {
            toastRef.current.error('Unable to load partnerships', 'Network error. Please try again.');
            setPartnerships([]);
        } finally {
            setLoading(false);
        }
    }, [fetchPartnerships]);

    useEffect(() => {
        void loadPartnerships();
    }, [loadPartnerships]);

    const resetModalState = useCallback(() => {
        setInviteStep(1);
        setInviteType('');
        setInviteSearch('');
        setSelectedTarget(null);
        setSelectedCaps([]);
        setInviteMessage('');
        setDiscoveryResults([]);
        setDiscoveryError('');
        setIsDiscovering(false);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowInviteModal(false);
        resetModalState();
    }, [resetModalState]);

    useEffect(() => {
        if (!showInviteModal) return;
        if (inviteStep !== 2 || !inviteType) return;
        
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
    }, [inviteStep, inviteType, inviteSearch, showInviteModal]);

    const handleInvite = async () => {
        if (!inviteType || !selectedTarget) return;
        setActionLoading('invite');
        try {
            const metadata = { capabilities: selectedCaps, message: inviteMessage };
            const response = await sendInvite({ targetType: inviteType, targetId: selectedTarget.id || selectedTarget._id, metadata });
            if (!response.success) {
                toastRef.current.error('Unable to invite partner', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Invite sent', response.message || 'Request sent successfully.');
            handleCloseModal();
            await loadPartnerships();
        } catch {
            toastRef.current.error('Unable to invite partner', 'Network error. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRespond = async (id: string, action: 'accept' | 'reject') => {
        setActionLoading(id);
        try {
            const response = await respondRequest(id, action);
            if (!response.success) {
                toastRef.current.error(`Unable to ${action} request`, response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', response.message || `Request ${action}ed.`);
            await loadPartnerships();
        } catch {
            toastRef.current.error(`Unable to ${action} request`, 'Network error.');
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
                toastRef.current.error('Failed to request changes', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', response.message || 'Changes requested.');
            setRequestChangesModal({ id: '', show: false });
            setChangesMessage('');
            await loadPartnerships();
        } catch {
            toastRef.current.error('Failed to request changes', 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptChanges = async (id: string) => {
        setActionLoading(id);
        try {
            const response = await acceptChanges(id);
            if (!response.success) {
                toastRef.current.error('Failed to accept changes', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', response.message || 'Changes accepted.');
            await loadPartnerships();
        } catch {
            toastRef.current.error('Failed to accept changes', 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTerminate = async (id: string) => {
        const confirmed = await confirm({
            title: `Terminate Partnership`,
            message: `Are you sure you want to terminate this partnership?`,
            confirmLabel: 'Terminate',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(id);
        try {
            const response = await terminatePartnership(id);
            if (!response.success) {
                toastRef.current.error('Failed to terminate', response.error || 'Please try again.');
                return;
            }
            toastRef.current.success('Success', response.message || 'Partnership terminated.');
            await loadPartnerships();
        } catch {
            toastRef.current.error('Failed to terminate', 'Network error.');
        } finally {
            setActionLoading(null);
        }
    };

    // Filter Logic
    const filteredPartnerships = useMemo(() => {
        return partnerships.filter(p => {
            // 1. Top Tab Filter
            if (activeTab !== 'all' && p.partner.type !== activeTab) return false;

            // 2. Status Filter
            if (statusFilter === 'active') {
                if (p.status !== 'active') return false;
            } else if (statusFilter === 'invitations') {
                if (!p.is_initiator || (p.status !== 'pending' && p.status !== 'changes_requested')) return false;
            } else if (statusFilter === 'requests') {
                if (p.is_initiator || (p.status !== 'pending' && p.status !== 'changes_requested')) return false;
            } else if (statusFilter === 'history') {
                if (p.status !== 'rejected' && p.status !== 'terminated' && p.status !== 'cancelled') return false;
            }

            // 3. Search Query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const nameMatch = p.partner.name?.toLowerCase().includes(q);
                const cityMatch = p.partner.city?.toLowerCase().includes(q);
                const stateMatch = p.partner.state?.toLowerCase().includes(q);
                const capsMatch = p.metadata?.capabilities?.some((c: string) => c.toLowerCase().includes(q));
                if (!nameMatch && !cityMatch && !stateMatch && !capsMatch) return false;
            }

            return true;
        });
    }, [partnerships, activeTab, statusFilter, searchQuery]);

    // Derived counts
    const counts = useMemo(() => {
        const c = { active: 0, invitations: 0, requests: 0, history: 0 };
        partnerships.forEach(p => {
            if (activeTab !== 'all' && p.partner.type !== activeTab) return;
            if (p.status === 'active') c.active++;
            else if (p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested')) c.invitations++;
            else if (!p.is_initiator && (p.status === 'pending' || p.status === 'changes_requested')) c.requests++;
            else if (p.status === 'rejected' || p.status === 'terminated' || p.status === 'cancelled') c.history++;
        });
        return c;
    }, [partnerships, activeTab]);

    return (
        <div className="space-y-6">
            <ConfirmDialog {...dialogProps} />
            
            <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Clinic Network Partnerships
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm md:text-base">
                        Manage and coordinate your connected hospitals, pharmacies, and diagnostic centers.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadPartnerships} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setShowInviteModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Partnership
                    </Button>
                </div>
            </div>

            {/* Top Tabs (Primary Organization Types) */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-px overflow-x-auto">
                {['all', 'hospital', 'pharmacy', 'diagnostic_center'].map((tab) => {
                    let label = 'All';
                    if (tab === 'hospital') label = 'Hospitals';
                    if (tab === 'pharmacy') label = 'Pharmacies';
                    if (tab === 'diagnostic_center') label = 'Diagnostics';
                    
                    // Simple count for primary tabs
                    let tabCount = 0;
                    if (tab === 'all') tabCount = partnerships.length;
                    else tabCount = partnerships.filter(p => p.partner.type === tab).length;

                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                                activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {label}
                            {tabCount > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    activeTab === tab ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                    {tabCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sub Filters & Search */}
            <div className="flex flex-col gap-4">
                {/* Secondary Status Filters */}
                <div className="flex gap-2 overflow-x-auto">
                    {[
                        { id: 'active', label: 'Active', count: counts.active },
                        { id: 'invitations', label: 'Invitations', count: counts.invitations },
                        { id: 'requests', label: 'Requests', count: counts.requests },
                        { id: 'history', label: 'History', count: counts.history }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setStatusFilter(f.id as any)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-2 border ${
                                statusFilter === f.id
                                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-gray-900 shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            {f.label}
                            {f.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    statusFilter === f.id ? 'bg-gray-700 text-gray-100 dark:bg-gray-200 dark:text-gray-800' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                }`}>{f.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Full-width Search Bar */}
                <div className="relative w-full lg:w-8/12 xl:w-7/12 mt-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input 
                        placeholder="Search hospitals, pharmacies, diagnostics by name, city, state, or capability..."
                        className="pl-11 py-5 rounded-xl shadow-sm border-gray-200 dark:border-gray-700 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-base"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-gray-100 dark:bg-gray-800 h-40 rounded-xl"></div>
                    ))}
                </div>
            ) : filteredPartnerships.length === 0 ? (
                <div className="py-12 md:py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800 max-w-2xl mx-auto mt-4 md:mt-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/80 rounded-2xl flex items-center justify-center mb-5">
                        <Network className="w-8 h-8 text-indigo-500/70 dark:text-indigo-400/70" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">No active partnerships</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm text-sm">
                        {searchQuery 
                            ? "We couldn't find anything matching your search." 
                            : `You don't have any ${statusFilter} partnerships in this category yet.`}
                    </p>
                    {!searchQuery && statusFilter !== 'history' && (
                        <Button 
                            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6" 
                            onClick={() => {
                                setInviteStep(1);
                                setInviteType('');
                                setSelectedTarget(null);
                                setShowInviteModal(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Find {activeTab === 'all' ? 'Partners' : activeTab === 'hospital' ? 'Hospitals' : activeTab === 'pharmacy' ? 'Pharmacies' : 'Diagnostics'}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPartnerships.map(p => (
                        <PartnershipCard 
                            key={p.id} 
                            partnership={p}
                            onViewDetails={() => setDetailsModal({ show: true, partnership: p })}
                            onAccept={handleRespond ? (id) => handleRespond(id, 'accept') : undefined}
                            onReject={handleRespond ? (id) => handleRespond(id, 'reject') : undefined}
                            onRequestChanges={(id) => setRequestChangesModal({ id, show: true })}
                            onAcceptChanges={handleAcceptChanges}
                            onCancel={handleTerminate}
                            onTerminate={handleTerminate}
                        />
                    ))}
                </div>
            )}

            {/* Invite Modal (Multi-Step) */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                        {/* Header */}
                        {/* Action Header */}
                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                New Partnership
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                                <SearchX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {inviteStep === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select Organization Type</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'hospital', title: 'Hospital', icon: Building2, desc: 'Referral and shared-care partnerships' },
                                            { id: 'pharmacy', title: 'Pharmacy', icon: Pill, desc: 'Prescription fulfillment partnerships' },
                                            { id: 'diagnostic_center', title: 'Diagnostics', icon: Microscope, desc: 'Testing and report coordination' },
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setInviteType(type.id as OrgType)}
                                                className={`flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all ${
                                                    inviteType === type.id 
                                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm' 
                                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                                                }`}
                                            >
                                                <type.icon className={`w-8 h-8 mb-3 ${inviteType === type.id ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`} />
                                                <div className={`font-semibold ${inviteType === type.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-white'}`}>{type.title}</div>
                                                <div className={`text-xs mt-2 ${inviteType === type.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500'}`}>{type.desc}</div>
                                                {inviteType === type.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 absolute top-4 right-4 hidden" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {inviteStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex justify-between items-center">
                                        <span>Select Organization</span>
                                        <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full capitalize">
                                            {inviteType === 'hospital' ? 'Hospital' : inviteType === 'pharmacy' ? 'Pharmacy' : 'Diagnostic Center'}
                                        </span>
                                    </h3>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input 
                                            placeholder={`Search ${inviteType === 'hospital' ? 'hospitals' : inviteType === 'pharmacy' ? 'pharmacies' : 'diagnostic centers'}...`}
                                            value={inviteSearch}
                                            onChange={e => setInviteSearch(e.target.value)}
                                            className="pl-11 py-5 rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-800/50"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl max-h-[300px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
                                        {isDiscovering && discoveryResults.length === 0 ? (
                                            <div className="p-8 flex flex-col items-center justify-center text-sm text-gray-500">
                                                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-2" />
                                                Searching organizations...
                                            </div>
                                        ) : discoveryError ? (
                                            <div className="p-8 text-sm text-red-500 text-center flex flex-col items-center">
                                                <span className="mb-2">{discoveryError}</span>
                                                <Button variant="outline" size="sm" onClick={() => setInviteSearch(inviteSearch + ' ')}>Retry</Button>
                                            </div>
                                        ) : discoveryResults.length > 0 ? (
                                            discoveryResults.map(org => (
                                                <button 
                                                    key={org.id || org._id} 
                                                    onClick={() => setSelectedTarget(org)}
                                                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex justify-between items-center ${
                                                        (selectedTarget?.id === org.id || selectedTarget?._id === org._id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                            {org.name}
                                                            {org.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                                            <Building className="w-3.5 h-3.5" />
                                                            {org.city || 'Unknown'}, {org.state || ''}
                                                        </div>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                        (selectedTarget?.id === org.id || selectedTarget?._id === org._id) ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                        {(selectedTarget?.id === org.id || selectedTarget?._id === org._id) && <div className="w-2 h-2 rounded-full bg-white" />}
                                                    </div>
                                                </button>
                                            ))
                                        ) : inviteSearch.trim() === '' ? (
                                            <div className="p-8 text-sm text-gray-500 text-center">
                                                Search {inviteType === 'hospital' ? 'hospitals' : inviteType === 'pharmacy' ? 'pharmacies' : 'diagnostic centers'} to find a partner
                                            </div>
                                        ) : (
                                            <div className="p-8 text-sm text-gray-500 text-center">No {inviteType === 'hospital' ? 'hospitals' : inviteType === 'pharmacy' ? 'pharmacies' : 'diagnostic centers'} found</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {inviteStep === 3 && selectedTarget && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Selected Partner</h3>
                                        <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {selectedTarget.name}
                                                    {selectedTarget.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-0.5">{selectedTarget.city}, {selectedTarget.state}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configure Capabilities</h3>
                                        <p className="text-sm text-gray-500 mt-1 mb-4">Select the operational workflows this partnership will support.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {CAPABILITIES[inviteType as keyof typeof CAPABILITIES]?.map(cap => (
                                                <label 
                                                    key={cap} 
                                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                        selectedCaps.includes(cap) 
                                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    }`}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedCaps.includes(cap)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedCaps([...selectedCaps, cap]);
                                                            else setSelectedCaps(selectedCaps.filter(c => c !== cap));
                                                        }}
                                                    />
                                                    <span className={`text-sm font-medium ${selectedCaps.includes(cap) ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {cap}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {inviteStep === 4 && selectedTarget && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Review & Send</h3>
                                        <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Organization</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTarget.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Capabilities</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedCaps.length > 0 ? selectedCaps.join(', ') : 'None specified'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Message (Optional)</label>
                                        <textarea 
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[100px] resize-none"
                                            placeholder="Add a personalized message with your request..."
                                            value={inviteMessage}
                                            onChange={(e) => setInviteMessage(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between shrink-0 rounded-b-2xl">
                            <Button 
                                variant="outline" 
                                onClick={handleCloseModal}
                                className="border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                            >
                                Cancel
                            </Button>
                            
                            <div className="flex gap-3">
                                {inviteStep > 1 && (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setInviteStep(s => (s - 1) as any)}
                                        className="border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                )}
                                
                                {inviteStep < 4 ? (
                                    <Button 
                                        onClick={() => setInviteStep(s => (s + 1) as any)}
                                        disabled={(inviteStep === 1 && !inviteType) || (inviteStep === 2 && !selectedTarget)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                    >
                                        Continue
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={handleInvite} 
                                        disabled={actionLoading === 'invite' || !selectedTarget}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                    >
                                        {actionLoading === 'invite' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Send Request
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Changes Modal */}
            {requestChangesModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl relative">
                        <button onClick={() => setRequestChangesModal({ id: '', show: false })} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">×</button>
                        <h2 className="text-xl font-bold mb-4">Request Changes</h2>
                        <p className="text-sm text-gray-500 mb-4">Propose changes to the partnership terms or capabilities. The original request will be preserved until both parties agree.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Your Counter-Proposal</label>
                                <textarea 
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-sm focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
                                    placeholder="Please describe the changes you require..."
                                    value={changesMessage}
                                    onChange={(e) => setChangesMessage(e.target.value)}
                                />
                            </div>
                            <Button 
                                className="w-full mt-2" 
                                disabled={!changesMessage.trim() || actionLoading === requestChangesModal.id} 
                                onClick={submitRequestChanges}
                            >
                                {actionLoading === requestChangesModal.id ? 'Submitting...' : 'Submit Counter-Proposal'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {detailsModal.show && detailsModal.partnership && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setDetailsModal({ show: false, partnership: null })} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">×</button>
                        <h2 className="text-xl font-bold mb-6">Partnership Details</h2>
                        
                        <div className="space-y-6">
                            {/* Org Info */}
                            <div className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                                    <Building2 size={32} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {detailsModal.partnership.partner.name}
                                        {detailsModal.partnership.partner.is_verified && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">VERIFIED</span>}
                                    </h3>
                                    <p className="text-sm text-gray-500 capitalize">{detailsModal.partnership.partner.type.replace('_', ' ')}</p>
                                    <p className="text-sm text-gray-500">{detailsModal.partnership.partner.city || 'Unknown City'}, {detailsModal.partnership.partner.state || 'Unknown State'}</p>
                                </div>
                            </div>

                            {/* Status & Config */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                                    <p className="text-sm font-semibold capitalize text-gray-900 dark:text-white">
                                        {detailsModal.partnership.status.replace('_', ' ')}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Initiator</p>
                                    <p className="text-sm font-semibold capitalize text-gray-900 dark:text-white">
                                        {detailsModal.partnership.is_initiator ? 'You' : detailsModal.partnership.partner.name}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {new Date(detailsModal.partnership.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Last Updated</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {new Date(detailsModal.partnership.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Capabilities */}
                            {detailsModal.partnership.metadata?.capabilities && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Agreed Capabilities (Configuration)</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {detailsModal.partnership.metadata.capabilities.map((cap: string) => (
                                            <span key={cap} className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 italic">* These capabilities are for metadata configuration in Phase 1 and do not enable automatic workflow processing yet.</p>
                                </div>
                            )}

                            {/* Messages */}
                            {detailsModal.partnership.metadata?.message && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Original Request Note</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">{detailsModal.partnership.metadata.message}</p>
                                </div>
                            )}

                            {detailsModal.partnership.metadata?.last_changes_message && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Latest Counter-Proposal</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 p-3 rounded-lg">{detailsModal.partnership.metadata.last_changes_message}</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
