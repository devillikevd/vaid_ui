/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Network, Stethoscope, Building2, Microscope, Pill, Building,
    Search, Plus, RefreshCw, Mail, Phone, MapPin, Star, CalendarDays,
    ChevronRight, CheckCircle2, Clock, AlertCircle, ArrowRight,
    Sparkles, ShieldCheck, UserCheck, UserX, ExternalLink, X, Loader2,
    Send, AlertTriangle, FileText, Activity, HelpCircle, UserPlus, HeartPulse
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { clinicApi, discoveryApi, DiscoveredOrganization, fetchWithAuth } from '@/lib/api';
import { useClinicStore, ClinicDoctor, ClinicInvite } from '@/stores/clinicStore';
import { InviteDoctorModal } from '@/components/clinic/InviteDoctorModal';
import { DoctorDetailModal } from '@/components/clinic/DoctorDetailModal';
import { DoctorAffiliationHistoryModal } from '@/components/clinic/DoctorAffiliationHistoryModal';
import { ReinviteDoctorModal } from '@/components/clinic/ReinviteDoctorModal';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type NetworkTab = 'all' | 'doctors' | 'hospitals' | 'diagnostics' | 'pharmacies' | 'invitations' | 'history';

interface PartnerOrg {
    id: string;
    partnership_id?: string;
    name: string;
    type: 'hospital' | 'pharmacy' | 'diagnostic_center';
    city?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    status: 'active' | 'pending' | 'changes_requested' | 'rejected' | 'terminated';
    partnership_type?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    rating?: number | null;
    capabilities?: string[];
    is_incoming?: boolean;
    raw?: any;
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function InitialsAvatar({ name, type }: { name: string; type: string }) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'NO';
    let gradient = 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-700 dark:text-pink-300';
    if (type === 'hospital') gradient = 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300';
    else if (type === 'pharmacy') gradient = 'from-purple-500/20 to-fuchsia-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300';
    else if (type === 'diagnostic_center') gradient = 'from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-700 dark:text-teal-300';
    else if (type === 'doctor') gradient = 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';

    return (
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br border flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm ${gradient}`}>
            {initials}
        </div>
    );
}

export default function ClinicMyNetworkPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const { dialogProps, confirm } = useConfirmDialog();

    const initialTab = (searchParams.get('tab') as NetworkTab) || 'all';
    const [activeTab, setActiveTab] = useState<NetworkTab>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Doctor data from store
    const {
        doctors,
        formerDoctors,
        invites: doctorInvites,
        joinRequests: doctorJoinRequests,
        fetchDoctors,
        fetchFormerDoctors,
        fetchInvites: fetchDoctorInvites,
        fetchJoinRequests: fetchDoctorJoinRequests,
        cancelInvite: cancelDoctorInvite,
        respondToJoinRequest: respondDoctorJoinRequest
    } = useClinicStore();

    // Organizational Partnerships data
    const [partnerOrgs, setPartnerOrgs] = useState<PartnerOrg[]>([]);
    const [loadingPartners, setLoadingPartners] = useState(true);

    // Modals & Drawers
    const [showInviteDoctorModal, setShowInviteDoctorModal] = useState(false);
    const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
    const [selectedDoctorForModal, setSelectedDoctorForModal] = useState<ClinicDoctor | null>(null);
    const [selectedDoctorForHistory, setSelectedDoctorForHistory] = useState<ClinicDoctor | null>(null);
    const [selectedDoctorForReinvite, setSelectedDoctorForReinvite] = useState<ClinicDoctor | null>(null);
    const [selectedPartnerDetail, setSelectedPartnerDetail] = useState<PartnerOrg | null>(null);

    // Add partner form
    const [partnerTargetType, setPartnerTargetType] = useState<'hospital' | 'pharmacy' | 'diagnostic_center'>('hospital');
    const [partnerSearch, setPartnerSearch] = useState('');
    const [searchingPartners, setSearchingPartners] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [discoveredPartners, setDiscoveredPartners] = useState<DiscoveredOrganization[]>([]);
    const [selectedPartnerToInvite, setSelectedPartnerToInvite] = useState<DiscoveredOrganization | null>(null);
    const [inviteNote, setInviteNote] = useState('');
    const [sendingPartnerInvite, setSendingPartnerInvite] = useState(false);

    // Load all network data
    const loadAllData = useCallback(async () => {
        setLoading(true);
        setLoadingPartners(true);
        try {
            await Promise.allSettled([
                fetchDoctors({ page: 1, limit: 100 }),
                fetchFormerDoctors({ page: 1, limit: 100 }),
                fetchDoctorInvites({ page: 1, limit: 50, status: 'pending' }),
                fetchDoctorJoinRequests({ page: 1, limit: 50, status: 'pending' }),
                (async () => {
                    const res = await clinicApi.getPartnerships();
                    if (res.success && Array.isArray(res.data)) {
                        const orgs: PartnerOrg[] = res.data.map((p: any) => {
                            const isOutgoing = p.is_initiator ?? (p.requester_type === 'clinic' || p.initiator_type === 'clinic');
                            const partner = p.partner || (isOutgoing ? p.target : p.requester) || {};
                            const partnerType = partner.type || (isOutgoing ? p.target_type : p.requester_type) || 'hospital';
                            return {
                                id: partner?.id || p.id,
                                partnership_id: p.id,
                                name: partner?.name || partner?.business_name || 'Healthcare Partner',
                                type: partnerType as any,
                                city: partner?.city || partner?.address?.city || null,
                                address: partner?.address?.street || (typeof partner?.address === 'string' ? partner?.address : null),
                                phone: partner?.phone || partner?.contact_phone || null,
                                email: partner?.email || null,
                                status: p.status,
                                partnership_type: p.partnership_type || 'Standard Care Coordination',
                                created_at: p.created_at,
                                updated_at: p.updated_at,
                                rating: partner?.rating || 4.8,
                                is_incoming: !isOutgoing,
                                raw: p,
                            };
                        });
                        setPartnerOrgs(orgs);
                    }
                })()
            ]);
        } catch (err) {
            console.error('Failed to load clinic network data:', err);
        } finally {
            setLoading(false);
            setLoadingPartners(false);
        }
    }, [fetchDoctorInvites, fetchDoctorJoinRequests, fetchDoctors, fetchFormerDoctors]);

    useEffect(() => {
        void loadAllData();
    }, [loadAllData]);

    // Compute Metrics
    const metrics = useMemo(() => {
        const activeDocs = doctors.filter(d => d.status === 'active' || d.is_active);
        const activeHospitals = partnerOrgs.filter(p => p.type === 'hospital' && p.status === 'active');
        const activeDiagnostics = partnerOrgs.filter(p => p.type === 'diagnostic_center' && p.status === 'active');
        const activePharmacies = partnerOrgs.filter(p => p.type === 'pharmacy' && p.status === 'active');
        const totalActiveOrgs = activeHospitals.length + activeDiagnostics.length + activePharmacies.length;
        const totalPending = doctorInvites.length + doctorJoinRequests.length + partnerOrgs.filter(p => p.status === 'pending').length;

        return {
            totalConnections: activeDocs.length + totalActiveOrgs,
            activeDoctors: activeDocs.length,
            totalOrganizations: totalActiveOrgs,
            pendingRequests: totalPending,
            hospitalsCount: activeHospitals.length,
            diagnosticsCount: activeDiagnostics.length,
            pharmaciesCount: activePharmacies.length,
            formerDoctorsCount: formerDoctors.length,
        };
    }, [doctors, formerDoctors.length, partnerOrgs, doctorInvites.length, doctorJoinRequests.length]);

    // Partner search discovery
    const handleSearchPartners = async (targetType = partnerTargetType, query = partnerSearch) => {
        setSearchingPartners(true);
        setSearchError(false);
        setHasSearched(true);
        try {
            const res = await discoveryApi.discoverOrganizations({
                type: targetType,
                query: query.trim()
            });
            if (res.success && Array.isArray(res.data)) {
                setDiscoveredPartners(res.data);
            } else {
                setDiscoveredPartners([]);
            }
        } catch (err: any) {
            setSearchError(true);
            toast.error('Search failed', err.message || 'Could not find organizations.');
        } finally {
            setSearchingPartners(false);
        }
    };

    // Real-time debounced partner discovery search
    useEffect(() => {
        if (!showAddPartnerModal) return;
        const timer = setTimeout(() => {
            void handleSearchPartners(partnerTargetType, partnerSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [partnerSearch, partnerTargetType, showAddPartnerModal]);

    const openFindPartnerModal = (type: 'hospital' | 'pharmacy' | 'diagnostic_center' = partnerTargetType) => {
        setPartnerTargetType(type);
        setSelectedPartnerToInvite(null);
        setPartnerSearch('');
        setInviteNote('');
        setHasSearched(false);
        setSearchError(false);
        setShowAddPartnerModal(true);
        void handleSearchPartners(type, '');
    };

    const handleSendPartnerInvite = async () => {
        if (!selectedPartnerToInvite) return;
        setSendingPartnerInvite(true);
        try {
            const res = await clinicApi.invitePartnership({
                targetType: selectedPartnerToInvite.type || partnerTargetType,
                targetId: selectedPartnerToInvite.id,
                partnershipType: 'Care Coordination & Referrals',
                metadata: { note: inviteNote }
            });
            if (res.success) {
                const isReconnection = selectedPartnerToInvite.relationship_status === 'former';
                toast.success(
                    isReconnection ? 'Reconnection Requested!' : 'Invitation Sent!',
                    `Partnership request sent to ${selectedPartnerToInvite.name || 'organization'}.`
                );
                setShowAddPartnerModal(false);
                setSelectedPartnerToInvite(null);
                setInviteNote('');
                setPartnerSearch('');
                void loadAllData();
            } else {
                toast.error('Failed to send invitation', res.error || 'Please try again.');
            }
        } catch (err: any) {
            toast.error('Failed to send invitation', err.message || 'Please try again.');
        } finally {
            setSendingPartnerInvite(false);
        }
    };

    const handleCancelDoctorInvite = async (invite: ClinicInvite) => {
        const ok = await confirm({
            title: 'Cancel Doctor Invitation?',
            message: `Are you sure you want to cancel the invitation sent to Dr. ${invite.doctor?.name || 'the doctor'}?`,
            confirmLabel: 'Yes, Cancel Invitation',
            variant: 'danger'
        });
        if (!ok) return;
        try {
            await cancelDoctorInvite(invite.id);
            toast.success('Invitation Cancelled', 'Doctor invitation has been cancelled.');
            void loadAllData();
        } catch (err: any) {
            toast.error('Failed to cancel invite', err.message || 'Please try again.');
        }
    };

    const handleTerminatePartner = async (partner: PartnerOrg) => {
        if (!partner.partnership_id) return;
        const ok = await confirm({
            title: 'Terminate Partnership?',
            message: `Are you sure you want to end the active partnership with ${partner.name}? Patient coordination and direct referrals will be paused.`,
            confirmLabel: 'Yes, Terminate Partnership',
            variant: 'danger'
        });
        if (!ok) return;
        try {
            const res = await clinicApi.terminatePartnership(partner.partnership_id);
            if (res.success) {
                toast.success('Partnership Terminated', `Partnership with ${partner.name} has been concluded.`);
                setSelectedPartnerDetail(null);
                void loadAllData();
            } else {
                toast.error('Failed to terminate', res.error || 'Please try again.');
            }
        } catch (err: any) {
            toast.error('Failed to terminate', err.message || 'Please try again.');
        }
    };

    // Filter items based on activeTab and search query
    const q = searchQuery.toLowerCase().trim();

    const filteredDoctors = useMemo(() => {
        return doctors.filter(d => {
            if (q && !d.name.toLowerCase().includes(q) && !(d.specialization || '').toLowerCase().includes(q)) return false;
            return true;
        });
    }, [doctors, q]);

    const filteredFormerDoctors = useMemo(() => {
        return formerDoctors.filter(d => {
            if (q && !d.name.toLowerCase().includes(q) && !(d.specialization || '').toLowerCase().includes(q)) return false;
            return true;
        });
    }, [formerDoctors, q]);

    const filteredHospitals = useMemo(() => {
        return partnerOrgs.filter(p => p.type === 'hospital' && p.status === 'active' && (!q || p.name.toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q)));
    }, [partnerOrgs, q]);

    const filteredDiagnostics = useMemo(() => {
        return partnerOrgs.filter(p => p.type === 'diagnostic_center' && p.status === 'active' && (!q || p.name.toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q)));
    }, [partnerOrgs, q]);

    const filteredPharmacies = useMemo(() => {
        return partnerOrgs.filter(p => p.type === 'pharmacy' && p.status === 'active' && (!q || p.name.toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q)));
    }, [partnerOrgs, q]);

    const filteredInvitations = useMemo(() => {
        const docInvites = doctorInvites.filter(i => !q || (i.doctor?.name || '').toLowerCase().includes(q));
        const docReqs = doctorJoinRequests.filter(i => !q || (i.doctor?.name || '').toLowerCase().includes(q));
        const orgInvites = partnerOrgs.filter(p => p.status === 'pending' && (!q || p.name.toLowerCase().includes(q)));
        return { docInvites, docReqs, orgInvites };
    }, [doctorInvites, doctorJoinRequests, partnerOrgs, q]);

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 text-xs font-extrabold uppercase tracking-wider mb-2">
                        <Network className="w-3.5 h-3.5" />
                        Connected Care Ecosystem
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        My Network
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-2xl">
                        Manage your clinic's affiliated doctors, connected hospitals, diagnostic labs, pharmacies, and collaborative care partners.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => void loadAllData()}
                        disabled={loading}
                        className="rounded-xl border-gray-200 dark:border-gray-800 font-bold text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => openFindPartnerModal()}
                        variant="outline"
                        className="rounded-xl border-pink-200 dark:border-pink-800/80 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 font-extrabold text-xs"
                    >
                        <Building2 className="w-3.5 h-3.5 mr-1.5" />
                        Find Organizations
                    </Button>
                    <Button
                        onClick={() => setShowInviteDoctorModal(true)}
                        className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs shadow-md shadow-pink-600/20"
                    >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Invite Doctor
                    </Button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Connections</span>
                        <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800/60 flex items-center justify-center text-pink-600 dark:text-pink-400">
                            <Network className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                        {metrics.totalConnections}
                    </p>
                    <p className="text-[11px] font-semibold text-gray-400 mt-1">
                        Across all network types
                    </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Doctors</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                        {metrics.activeDoctors}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        Active clinical practitioners
                    </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Organizations</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                        {metrics.totalOrganizations}
                    </p>
                    <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                        Hospitals, Labs & Pharmacies
                    </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Requests</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                        {metrics.pendingRequests}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                        Awaiting review or response
                    </p>
                </div>
            </div>

            {/* Navigation Tabs and Search */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2 border-b border-gray-200 dark:border-gray-800 pb-3">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                    {[
                        { id: 'all', label: 'All', count: metrics.totalConnections },
                        { id: 'doctors', label: 'Doctors', count: metrics.activeDoctors },
                        { id: 'hospitals', label: 'Hospitals', count: metrics.hospitalsCount },
                        { id: 'diagnostics', label: 'Diagnostics', count: metrics.diagnosticsCount },
                        { id: 'pharmacies', label: 'Pharmacies', count: metrics.pharmaciesCount },
                        { id: 'invitations', label: 'Invitations', count: metrics.pendingRequests },
                        { id: 'history', label: 'History', count: metrics.formerDoctorsCount },
                    ].map(t => {
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as NetworkTab)}
                                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-pink-600 text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label}
                                {t.count !== undefined && (
                                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search network..."
                        className="pl-9 text-xs rounded-xl bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-600 mb-3" />
                    <p className="text-sm font-bold text-gray-500">Loading your clinic's care network...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* TAB: ALL or DOCTORS */}
                    {(activeTab === 'all' || activeTab === 'doctors') && filteredDoctors.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                                    Affiliated Doctors ({filteredDoctors.length})
                                </h3>
                                <Link
                                    href="/clinic/doctors"
                                    className="text-xs font-bold text-pink-600 hover:underline flex items-center gap-1"
                                >
                                    Manage Roster <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDoctors.map(doctor => (
                                    <div
                                        key={doctor.id || doctor.doctorId}
                                        className="p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <InitialsAvatar name={doctor.name} type="doctor" />
                                                    <div>
                                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                                                            {doctor.name}
                                                        </h4>
                                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {doctor.specialization}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                                    Active
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c1422] border border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Department:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                                                        {doctor.department || (doctor.departments?.[0]?.name) || 'General OPD'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Practice Mode:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 capitalize">
                                                        {doctor.practice_type || 'Full Time'}
                                                    </span>
                                                </div>
                                                {doctor.phone && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-400 font-medium">Contact:</span>
                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{doctor.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedDoctorForModal(doctor)}
                                                className="text-xs font-bold rounded-xl flex-1"
                                            >
                                                View Profile
                                            </Button>
                                            <Link href={`/clinic/doctors?search=${encodeURIComponent(doctor.name)}`} className="flex-1">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                                >
                                                    Roster Ops
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: ALL or HOSPITALS */}
                    {(activeTab === 'all' || activeTab === 'hospitals') && filteredHospitals.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Building className="w-4 h-4 text-blue-600" />
                                Connected Hospitals ({filteredHospitals.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredHospitals.map(hospital => (
                                    <div
                                        key={hospital.partnership_id || hospital.id}
                                        className="p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <InitialsAvatar name={hospital.name} type="hospital" />
                                                    <div>
                                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                                                            {hospital.name}
                                                        </h4>
                                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                            Hospital Partner
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                                    Active
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c1422] border border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Location:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                                                        {hospital.city || hospital.address || 'Network Provider'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Coordination:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        IPD & Emergency
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPartnerDetail(hospital)}
                                                className="text-xs font-bold rounded-xl flex-1"
                                            >
                                                Details
                                            </Button>
                                            <Link href={`/clinic/referrals?tab=hospital`} className="flex-1">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                                >
                                                    Referrals
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: ALL or DIAGNOSTICS */}
                    {(activeTab === 'all' || activeTab === 'diagnostics') && filteredDiagnostics.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Microscope className="w-4 h-4 text-teal-600" />
                                Diagnostic & Lab Partners ({filteredDiagnostics.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDiagnostics.map(center => (
                                    <div
                                        key={center.partnership_id || center.id}
                                        className="p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <InitialsAvatar name={center.name} type="diagnostic_center" />
                                                    <div>
                                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                                                            {center.name}
                                                        </h4>
                                                        <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                                                            Pathology & Imaging
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                                                    Active
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c1422] border border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Location:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                                                        {center.city || center.address || 'Local Lab'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Service:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        Test Bookings
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPartnerDetail(center)}
                                                className="text-xs font-bold rounded-xl flex-1"
                                            >
                                                Details
                                            </Button>
                                            <Link href={`/clinic/referrals?tab=diagnostic`} className="flex-1">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                                >
                                                    Bookings
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: ALL or PHARMACIES */}
                    {(activeTab === 'all' || activeTab === 'pharmacies') && filteredPharmacies.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Pill className="w-4 h-4 text-purple-600" />
                                Pharmacy Partners ({filteredPharmacies.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredPharmacies.map(pharmacy => (
                                    <div
                                        key={pharmacy.partnership_id || pharmacy.id}
                                        className="p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <InitialsAvatar name={pharmacy.name} type="pharmacy" />
                                                    <div>
                                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                                                            {pharmacy.name}
                                                        </h4>
                                                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                            Fulfillment Partner
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                                    Active
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c1422] border border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Location:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                                                        {pharmacy.city || pharmacy.address || 'Prescription Routing'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-medium">Delivery:</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        Pickup & Home Delivery
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedPartnerDetail(pharmacy)}
                                                className="text-xs font-bold rounded-xl flex-1"
                                            >
                                                Details
                                            </Button>
                                            <Link href={`/clinic/referrals?tab=pharmacy`} className="flex-1">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                                >
                                                    Orders
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: INVITATIONS */}
                    {activeTab === 'invitations' && (
                        <div className="space-y-6">
                            {filteredInvitations.docInvites.length === 0 && filteredInvitations.docReqs.length === 0 && filteredInvitations.orgInvites.length === 0 ? (
                                <div className="py-16 text-center bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
                                    <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">No Pending Invitations</h3>
                                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                        All invitations and join requests have been processed. You can invite new doctors or find partner organizations anytime.
                                    </p>
                                    <div className="flex items-center justify-center gap-3 mt-5">
                                        <Button
                                            onClick={() => setShowInviteDoctorModal(true)}
                                            size="sm"
                                            className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl"
                                        >
                                            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite Doctor
                                        </Button>
                                        <Button
                                            onClick={() => openFindPartnerModal()}
                                            size="sm"
                                            variant="outline"
                                            className="font-bold text-xs rounded-xl"
                                        >
                                            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Find Organization
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Doctor Invites */}
                                    {filteredInvitations.docInvites.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Doctor Invitations Sent ({filteredInvitations.docInvites.length})</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {filteredInvitations.docInvites.map(invite => (
                                                    <div key={invite.id} className="p-4 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <InitialsAvatar name={invite.doctor?.name || 'Dr.'} type="doctor" />
                                                            <div>
                                                                <h5 className="text-sm font-extrabold text-gray-900 dark:text-white">{invite.doctor?.name}</h5>
                                                                <p className="text-xs text-gray-500 font-semibold">{invite.doctor?.specialization}</p>
                                                                <span className="text-[10px] font-bold text-amber-600">Pending Doctor Review</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCancelDoctorInvite(invite)}
                                                            className="text-xs text-red-600 border-red-200 dark:border-red-900 font-bold rounded-xl"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Organization Invites */}
                                    {filteredInvitations.orgInvites.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Organization Invitations ({filteredInvitations.orgInvites.length})</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {filteredInvitations.orgInvites.map(org => (
                                                    <div key={org.partnership_id || org.id} className="p-4 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <InitialsAvatar name={org.name} type={org.type} />
                                                            <div>
                                                                <h5 className="text-sm font-extrabold text-gray-900 dark:text-white">{org.name}</h5>
                                                                <p className="text-xs text-gray-500 font-semibold capitalize">{org.type.replace(/_/g, ' ')}</p>
                                                                <span className="text-[10px] font-bold text-amber-600">Pending Review</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedPartnerDetail(org)}
                                                            className="text-xs font-bold rounded-xl"
                                                        >
                                                            View Details
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: HISTORY */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Historical & Former Affiliations</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Preserved records of previous doctors and completed organizational partnerships.</p>
                                </div>
                            </div>

                            {filteredFormerDoctors.length === 0 ? (
                                <div className="py-16 text-center bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
                                    <UserX className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">No Former Affiliations</h3>
                                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                        Your clinic has no concluded doctor or organizational affiliations in history.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredFormerDoctors.map(doctor => (
                                        <div
                                            key={doctor.id || doctor.doctorId}
                                            className="p-5 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <InitialsAvatar name={doctor.name} type="doctor" />
                                                        <div>
                                                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                                                                {doctor.name}
                                                            </h4>
                                                            <p className="text-xs font-semibold text-gray-500">
                                                                {doctor.specialization}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700 shrink-0">
                                                        Former Affiliation
                                                    </span>
                                                </div>

                                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c1422] border border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-400 font-medium">Ended On:</span>
                                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                                            {formatDate(doctor.ended_at)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-gray-400 font-medium shrink-0">Reason:</span>
                                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-right truncate">
                                                            {doctor.termination_reason || 'Concluded Affiliation'}
                                                        </span>
                                                    </div>
                                                    {doctor.termination_note && (
                                                        <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-100 dark:border-gray-800">
                                                            "{doctor.termination_note}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedDoctorForHistory(doctor)}
                                                    className="text-xs font-bold rounded-xl flex-1"
                                                >
                                                    Audit Trail
                                                </Button>
                                                {doctor.pending_invite ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setSelectedDoctorForReinvite(doctor)}
                                                        className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-extrabold text-xs rounded-xl border border-gray-200 dark:border-gray-700"
                                                    >
                                                        Invitation Pending
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setSelectedDoctorForReinvite(doctor)}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                                    >
                                                        Invite to Rejoin
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* EMPTY STATE ACROSS ALL IF ZERO CONNECTIONS */}
                    {activeTab === 'all' && metrics.totalConnections === 0 && (
                        <div className="py-20 text-center bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-100 dark:border-gray-800 p-8 max-w-lg mx-auto">
                            <div className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 flex items-center justify-center text-pink-600 mx-auto mb-4">
                                <Network className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Build Your Care Network</h3>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                Connect with qualified doctors, partner hospitals for IPD admissions, diagnostic labs for test referrals, and local pharmacies for prescription fulfillment.
                            </p>
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <Button
                                    onClick={() => setShowInviteDoctorModal(true)}
                                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl"
                                >
                                    <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite Doctor
                                </Button>
                                <Button
                                    onClick={() => openFindPartnerModal()}
                                    variant="outline"
                                    className="font-bold text-xs rounded-xl"
                                >
                                    <Building2 className="w-3.5 h-3.5 mr-1.5" /> Find Partner Orgs
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: INVITE DOCTOR */}
            <InviteDoctorModal
                isOpen={showInviteDoctorModal}
                onClose={() => {
                    setShowInviteDoctorModal(false);
                    void loadAllData();
                }}
            />

            {/* MODAL: DOCTOR DETAIL */}
            <DoctorDetailModal
                isOpen={!!selectedDoctorForModal}
                onClose={() => setSelectedDoctorForModal(null)}
                doctor={selectedDoctorForModal}
            />

            {/* MODAL: DOCTOR AFFILIATION HISTORY */}
            <DoctorAffiliationHistoryModal
                open={!!selectedDoctorForHistory}
                onClose={() => setSelectedDoctorForHistory(null)}
                doctor={selectedDoctorForHistory}
                onInviteAgain={(doc: ClinicDoctor) => {
                    setSelectedDoctorForHistory(null);
                    setSelectedDoctorForReinvite(doc);
                }}
            />

            {/* MODAL: REINVITE FORMER DOCTOR */}
            <ReinviteDoctorModal
                open={!!selectedDoctorForReinvite}
                onClose={() => setSelectedDoctorForReinvite(null)}
                doctor={selectedDoctorForReinvite}
                onSuccess={() => {
                    setSelectedDoctorForReinvite(null);
                    void loadAllData();
                }}
            />

            {/* MODAL: PARTNER ORG DETAIL */}
            <AnimatePresence>
                {selectedPartnerDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white dark:bg-[#111c2e] rounded-3xl max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <InitialsAvatar name={selectedPartnerDetail.name} type={selectedPartnerDetail.type} />
                                    <div>
                                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                                            {selectedPartnerDetail.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">
                                            {selectedPartnerDetail.type.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPartnerDetail(null)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0c1422] border border-gray-100 dark:border-gray-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 font-semibold">Status:</span>
                                        <span className="font-extrabold text-emerald-600 uppercase tracking-wider">{selectedPartnerDetail.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 font-semibold">Partnership:</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{selectedPartnerDetail.partnership_type}</span>
                                    </div>
                                    {selectedPartnerDetail.city && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-semibold">City:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{selectedPartnerDetail.city}</span>
                                        </div>
                                    )}
                                    {selectedPartnerDetail.phone && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-semibold">Phone:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{selectedPartnerDetail.phone}</span>
                                        </div>
                                    )}
                                    {selectedPartnerDetail.created_at && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-semibold">Partner Since:</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatDate(selectedPartnerDetail.created_at)}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-500 leading-relaxed">
                                    This two-way organizational connection enables unified patient referrals, direct digital routing of lab orders and prescriptions, and seamless communication.
                                </p>
                            </div>

                            <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0c1422] flex items-center justify-between gap-3 shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => handleTerminatePartner(selectedPartnerDetail)}
                                    className="text-red-600 border-red-200 dark:border-red-900/60 font-bold text-xs rounded-xl"
                                >
                                    End Partnership
                                </Button>
                                <Button
                                    onClick={() => {
                                        const type = selectedPartnerDetail.type === 'hospital' ? 'hospital' : selectedPartnerDetail.type === 'pharmacy' ? 'pharmacy' : 'diagnostic';
                                        router.push(`/clinic/referrals?tab=${type}`);
                                        setSelectedPartnerDetail(null);
                                    }}
                                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl"
                                >
                                    Manage Referrals <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: FIND / INVITE PARTNER ORG */}
            <AnimatePresence>
                {showAddPartnerModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white dark:bg-[#111c2e] rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-pink-50/20 dark:from-[#0c1422] dark:via-[#111c2e] dark:to-pink-950/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800/60 flex items-center justify-center text-pink-600">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                                            Find & Connect Organizations
                                        </h3>
                                        <p className="text-xs text-gray-500 font-medium">
                                            Discover hospitals, diagnostic labs, or pharmacies to build your referral network.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAddPartnerModal(false);
                                        setSelectedPartnerToInvite(null);
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                                {/* Type Selector */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'hospital', label: 'Hospital', icon: Building },
                                        { id: 'diagnostic_center', label: 'Diagnostic Lab', icon: Microscope },
                                        { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
                                    ].map(t => {
                                        const isSelected = partnerTargetType === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    const newType = t.id as any;
                                                    setPartnerTargetType(newType);
                                                    setSelectedPartnerToInvite(null);
                                                    void handleSearchPartners(newType, partnerSearch);
                                                }}
                                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-700 dark:text-pink-300 font-extrabold shadow-xs'
                                                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-semibold'
                                                }`}
                                            >
                                                <t.icon className="w-4 h-4" />
                                                <span className="text-[11px]">{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Search Bar */}
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            value={partnerSearch}
                                            onChange={(e) => setPartnerSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && void handleSearchPartners(partnerTargetType, partnerSearch)}
                                            placeholder={`Search ${partnerTargetType === 'hospital' ? 'hospitals' : partnerTargetType === 'diagnostic_center' ? 'diagnostic labs' : 'pharmacies'} by name, city, or area...`}
                                            className="pl-9 pr-9 text-xs rounded-xl"
                                        />
                                        {partnerSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPartnerSearch('');
                                                    void handleSearchPartners(partnerTargetType, '');
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <Button
                                        onClick={() => void handleSearchPartners(partnerTargetType, partnerSearch)}
                                        disabled={searchingPartners}
                                        className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shrink-0 cursor-pointer"
                                    >
                                        {searchingPartners ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                Searching...
                                            </>
                                        ) : (
                                            'Search'
                                        )}
                                    </Button>
                                </div>

                                {/* Results Container */}
                                {searchingPartners ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-pink-600 mb-2.5" />
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400">Searching registered organizations...</p>
                                    </div>
                                ) : searchError ? (
                                    <div className="py-8 text-center bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/40 p-5">
                                        <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-red-900 dark:text-red-300">Unable to search organizations right now.</p>
                                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">Please try again.</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => void handleSearchPartners(partnerTargetType, partnerSearch)}
                                            className="mt-3 text-xs font-bold rounded-xl"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                ) : discoveredPartners.length === 0 ? (
                                    <div className="py-10 text-center bg-gray-50 dark:bg-[#0c1422] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                                        <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">No organizations found</p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            {partnerSearch.trim()
                                                ? `No ${partnerTargetType.replace(/_/g, ' ')}s matching "${partnerSearch}". Try another name, city, or organization type.`
                                                : `No registered ${partnerTargetType.replace(/_/g, ' ')}s found in this category.`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pt-1">
                                        {discoveredPartners.map(org => {
                                            const isSelected = selectedPartnerToInvite?.id === org.id;
                                            const relStatus = org.relationship_status;

                                            return (
                                                <div
                                                    key={org.id}
                                                    onClick={() => setSelectedPartnerToInvite(org)}
                                                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                        isSelected
                                                            ? 'bg-pink-50/80 dark:bg-pink-950/40 border-pink-500 shadow-sm ring-1 ring-pink-300 dark:ring-pink-800'
                                                            : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-xs mt-0.5"
                                                            style={{
                                                                backgroundColor:
                                                                    org.type === 'hospital' ? '#2563eb' : org.type === 'diagnostic_center' ? '#0d9488' : '#9333ea'
                                                            }}
                                                        >
                                                            {org.type === 'hospital' && <Building className="w-5 h-5" />}
                                                            {org.type === 'diagnostic_center' && <Microscope className="w-5 h-5" />}
                                                            {org.type === 'pharmacy' && <Pill className="w-5 h-5" />}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h5 className="font-extrabold text-gray-900 dark:text-white text-xs leading-tight">
                                                                    {org.name}
                                                                </h5>
                                                                {org.is_verified && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-md border border-emerald-200 dark:border-emerald-800">
                                                                        <ShieldCheck className="w-3 h-3" /> Verified
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                                                {org.city ? `${org.city} • ` : ''}{org.address || 'Registered Healthcare Provider'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                                        {relStatus === 'connected' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Connected
                                                            </span>
                                                        )}
                                                        {relStatus === 'invitation_sent' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Invitation Pending
                                                            </span>
                                                        )}
                                                        {relStatus === 'invitation_received' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                                                <Mail className="w-3 h-3" /> Invitation Received
                                                            </span>
                                                        )}
                                                        {relStatus === 'former' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex items-center gap-1">
                                                                <RefreshCw className="w-3 h-3" /> Former Partner
                                                            </span>
                                                        )}
                                                        {relStatus === 'not_connected' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                                Not Connected
                                                            </span>
                                                        )}
                                                        {isSelected && (
                                                            <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0 hidden sm:block" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Selected organization card with invitation message */}
                                {selectedPartnerToInvite && (
                                    <div className="p-4 rounded-2xl bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-extrabold text-pink-900 dark:text-pink-300 uppercase tracking-wider">
                                                    Target: {selectedPartnerToInvite.name}
                                                </span>
                                                <span className="text-[10px] text-pink-700/80 font-bold capitalize">
                                                    ({selectedPartnerToInvite.typeLabel || selectedPartnerToInvite.type})
                                                </span>
                                            </div>
                                            {selectedPartnerToInvite.relationship_status === 'former' && (
                                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                                                    Reconnection
                                                </span>
                                            )}
                                        </div>

                                        {selectedPartnerToInvite.relationship_status === 'connected' ? (
                                            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                ✓ This organization is already connected to your clinic network.
                                            </p>
                                        ) : selectedPartnerToInvite.relationship_status === 'invitation_sent' ? (
                                            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                                ⏳ A partnership invitation is already pending acceptance by this organization.
                                            </p>
                                        ) : (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    Invitation Message / Partnership Scope (Optional):
                                                </label>
                                                <Input
                                                    value={inviteNote}
                                                    onChange={(e) => setInviteNote(e.target.value)}
                                                    placeholder="e.g. We would like to coordinate patient care and direct referrals with your team."
                                                    className="text-xs rounded-xl bg-white dark:bg-[#111c2e]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0c1422] flex items-center justify-between gap-3 shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddPartnerModal(false)}
                                    className="font-bold text-xs rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => void handleSendPartnerInvite()}
                                    disabled={
                                        !selectedPartnerToInvite ||
                                        sendingPartnerInvite ||
                                        selectedPartnerToInvite.relationship_status === 'connected' ||
                                        selectedPartnerToInvite.relationship_status === 'invitation_sent'
                                    }
                                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-pink-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendingPartnerInvite ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : selectedPartnerToInvite?.relationship_status === 'former' ? (
                                        'Request Reconnection'
                                    ) : selectedPartnerToInvite?.relationship_status === 'connected' ? (
                                        'Already Connected'
                                    ) : selectedPartnerToInvite?.relationship_status === 'invitation_sent' ? (
                                        'Invitation Pending'
                                    ) : (
                                        'Send Partnership Invitation'
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
