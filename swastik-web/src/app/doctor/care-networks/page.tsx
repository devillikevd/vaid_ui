/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
    Building2, Clock3, CheckCircle2, XCircle, RefreshCw, MailOpen, UserCheck, 
    ShieldAlert, HeartPulse, Building, FileText, CheckCircle, MailX, Check, MapPin, IndianRupee, 
    ChevronRight, Info, Search, Stethoscope, Briefcase, ExternalLink, CalendarDays, Share2, HelpCircle,
    Calendar, Star, Clock, BadgeCheck, Phone, Mail, Loader2, Video, Send, MessageSquare, AlertCircle, BedDouble
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDoctorStore } from '@/stores/doctorStore';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'active' | 'changes_requested';
type InviteKind = 'hospital' | 'clinic';

interface ProviderInvite {
    id: string;
    kind: InviteKind;
    providerId: string;
    providerLabel: string;
    department?: string | null;
    role?: string | null;
    specialization?: string | null;
    practice_type?: string | null;
    consultation_modes?: string[] | null;
    preferred_days?: string[] | null;
    preferred_start_time?: string | null;
    preferred_end_time?: string | null;
    start_date?: string | null;
    fee_amount?: number | null;
    payout_terms?: string | null;
    schedule?: any | null;
    response_message?: string | null;
    counter_proposal?: string | null;
    status: InviteStatus;
    created_at: string;
    expires_at?: string | null;
    responded_at?: string | null;
    provider?: {
        id: string;
        name: string;
        city?: string | null;
        address?: string | null;
        profile_image_url?: string | null;
        rating?: number | null;
        phone?: string | null;
        email?: string | null;
    };
    invitedBy?: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    is_sent_request?: boolean;
}

function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CN';
    const sizeClass = size === 'sm' ? 'h-10 w-10 text-xs' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-sm';
    return (
        <div className={`${sizeClass} rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0 shadow-sm`}>
            {initials}
        </div>
    );
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    accepted:  { label: 'Active',    color: 'text-emerald-800 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
    active:    { label: 'Active',    color: 'text-emerald-800 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
    pending:   { label: 'Pending Review', color: 'text-amber-900 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
    rejected:  { label: 'Declined',  color: 'text-red-800 bg-red-100 dark:text-red-300 dark:bg-red-950/60 border-red-300 dark:border-red-800', dot: 'bg-red-500' },
    expired:   { label: 'Expired',   color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700', dot: 'bg-gray-500' },
    cancelled: { label: 'Cancelled', color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700', dot: 'bg-gray-500' },
    changes_requested: { label: 'Changes Proposed', color: 'text-purple-900 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800', dot: 'bg-purple-500' },
};

export default function MyCareNetworksPage() {
    const toast = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [invites, setInvites] = useState<ProviderInvite[]>([]);
    const [sentRequests, setSentRequests] = useState<ProviderInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    
    type TabType = 'all' | 'hospitals' | 'clinics' | 'invitations' | 'requests' | 'history';
    const initialTab = (searchParams?.get('tab') as TabType) || 'all';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInvite, setSelectedInvite] = useState<ProviderInvite | null>(null);
    const [showCounterProposal, setShowCounterProposal] = useState(false);
    
    // Counter-proposal form states
    const [counterPracticeType, setCounterPracticeType] = useState('visiting');
    const [counterModes, setCounterModes] = useState<string[]>(['in_clinic', 'video']);
    const [counterDays, setCounterDays] = useState<string[]>(['Monday', 'Wednesday']);
    const [counterStartTime, setCounterStartTime] = useState('10:00');
    const [counterEndTime, setCounterEndTime] = useState('14:00');
    const [counterStartDate, setCounterStartDate] = useState('');
    const [counterFeeAmount, setCounterFeeAmount] = useState('');
    const [counterMessage, setCounterMessage] = useState('');

    const { todaysAppointments, fetchOrganizations } = useDoctorStore();
    const hasLoadedRef = useRef(false);

    const fetchInvites = useCallback(async () => {
        setLoading(true);
        try {
            const [hospitalResponse, clinicResponse, myRequestsResponse] = await Promise.all([
                doctorApi.getHospitalInvites(),
                doctorApi.getClinicInvites(),
                doctorApi.getMyJoinRequests(),
            ]);

            if (!hospitalResponse.success || !clinicResponse.success) {
                toast.error(
                    'Unable to load networks',
                    hospitalResponse.error || clinicResponse.error || 'Please try again.'
                );
                setInvites([]);
                setSentRequests([]);
                return;
            }

            const hospitalInvites = Array.isArray(hospitalResponse.data)
                ? hospitalResponse.data.map((invite: any) => ({
                    id: invite.id,
                    kind: 'hospital' as const,
                    providerId: invite.hospital_id || invite.hospital?.id,
                    providerLabel: 'Hospital',
                    department: invite.department,
                    role: invite.role,
                    status: invite.status,
                    created_at: invite.created_at,
                    expires_at: invite.expires_at,
                    responded_at: invite.responded_at,
                    practice_type: invite.practice_type,
                    consultation_modes: invite.consultation_modes,
                    schedule: invite.schedule,
                    fee_amount: invite.fee_amount,
                    payout_terms: invite.payout_terms,
                    start_date: invite.start_date,
                    counter_proposal: invite.counter_proposal,
                    provider: invite.hospital,
                    invitedBy: invite.invitedBy,
                  }))
                : [];

            const clinicInvites = Array.isArray(clinicResponse.data)
                ? clinicResponse.data.map((invite: any) => ({
                    id: invite.id,
                    kind: 'clinic' as const,
                    providerId: invite.clinic_id || invite.clinic?.id,
                    providerLabel: 'Clinic',
                    department: invite.department,
                    role: invite.role,
                    status: invite.status,
                    created_at: invite.created_at,
                    expires_at: invite.expires_at,
                    responded_at: invite.responded_at,
                    practice_type: invite.practice_type,
                    consultation_modes: invite.consultation_modes,
                    schedule: invite.schedule,
                    fee_amount: invite.fee_amount,
                    payout_terms: invite.payout_terms,
                    start_date: invite.start_date,
                    counter_proposal: invite.counter_proposal,
                    provider: invite.clinic,
                    invitedBy: invite.invitedBy,
                  }))
                : [];

            setInvites([...hospitalInvites, ...clinicInvites].sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }));

            if (myRequestsResponse.success && Array.isArray(myRequestsResponse.data)) {
                const requests = myRequestsResponse.data.map((req: any) => ({
                    id: req.id,
                    kind: req.organization_type as 'clinic' | 'hospital',
                    providerId: req.organization_type === 'clinic' ? req.clinic_id : req.hospital_id,
                    providerLabel: req.organization_type === 'clinic' ? 'Clinic' : 'Hospital',
                    status: req.status,
                    created_at: req.created_at,
                    is_sent_request: true,
                    specialization: req.specialization,
                    department: req.department,
                    practice_type: req.practice_type,
                    consultation_modes: req.consultation_modes,
                    preferred_days: req.preferred_days,
                    preferred_start_time: req.preferred_start_time,
                    preferred_end_time: req.preferred_end_time,
                    start_date: req.start_date,
                    response_message: req.response_message,
                    provider: req.organization ? {
                        id: req.organization.id,
                        name: req.organization.name,
                        city: req.organization.city,
                        address: req.organization.address,
                        profile_image_url: req.organization.profile_image_url || req.organization.image_url
                    } : undefined
                }));
                setSentRequests(requests);
            }

        } catch {
            toast.error('Unable to load networks', 'Network error. Please try again.');
            setInvites([]);
            setSentRequests([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        // Fetch invites and organizations every time the page is visited
        // Removed hasLoadedRef to ensure fresh data on back navigation
        void fetchInvites();
        void fetchOrganizations();
    }, [fetchInvites, fetchOrganizations]);

    // Update tab if URL param changes
    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab && ['all', 'hospitals', 'clinics', 'invitations', 'requests', 'history'].includes(tab)) {
            setActiveTab(tab as TabType);
        }
    }, [searchParams]);

    const filteredInvites = useMemo(() => {
        return invites.filter(i => {
            const searchLower = searchQuery.toLowerCase();
            return (i.provider?.name?.toLowerCase().includes(searchLower) || i.provider?.city?.toLowerCase().includes(searchLower));
        });
    }, [invites, searchQuery]);

    const activeAffiliations = useMemo(() => {
        const rawActives = filteredInvites.filter(i => ['accepted', 'active'].includes(i.status));
        const seenProviders = new Set<string>();
        const uniqueActives: ProviderInvite[] = [];
        for (const item of rawActives) {
            const key = `${item.kind}:${item.providerId}`;
            if (!seenProviders.has(key)) {
                seenProviders.add(key);
                uniqueActives.push(item);
            }
        }
        return uniqueActives;
    }, [filteredInvites]);
    const hospitalsOnly = useMemo(() => activeAffiliations.filter(i => i.kind === 'hospital'), [activeAffiliations]);
    const clinicsOnly = useMemo(() => activeAffiliations.filter(i => i.kind === 'clinic'), [activeAffiliations]);
    const pendingInvites = useMemo(() => filteredInvites.filter(i => ['pending', 'changes_requested'].includes(i.status)), [filteredInvites]);
    const pendingJoinRequests = useMemo(() => sentRequests.filter(i => ['pending', 'changes_requested'].includes(i.status)), [sentRequests]);
    const historyInvites = useMemo(() => filteredInvites.filter(i => ['rejected', 'expired', 'cancelled'].includes(i.status)), [filteredInvites]);

    const handleRespond = async (
        invite: ProviderInvite, 
        decision: 'accept' | 'reject' | 'cancel' | 'changes_requested' | 'decline', 
        payload?: Record<string, any>
    ) => {
        const inviteId = invite.id;
        setActionId(inviteId);
        try {
            let response;
            if (decision === 'cancel' && invite.is_sent_request) {
                response = await doctorApi.cancelJoinRequest(inviteId, invite.kind);
            } else if (decision !== 'cancel') {
                const callPayload = decision === 'changes_requested' ? payload : undefined;
                if (invite.is_sent_request) {
                    // It's a join request counter-proposal response
                    // map 'reject' to 'decline' if needed, or keep 'reject'
                    const apiDecision = decision === 'reject' ? 'decline' : decision;
                    response = await doctorApi.respondToJoinRequest(inviteId, invite.kind, apiDecision as any, callPayload);
                } else {
                    // It's an organization invitation
                    response = invite.kind === 'hospital'
                        ? await doctorApi.respondHospitalInvite(inviteId, decision as any, callPayload)
                        : await doctorApi.respondClinicInvite(inviteId, decision as any, callPayload);
                }
            } else {
                return;
            }
            if (!response.success) {
                toast.error(
                    decision === 'cancel' ? 'Unable to cancel request' : decision === 'accept' ? 'Unable to accept invite' : decision === 'changes_requested' ? 'Unable to submit changes' : 'Unable to reject invite',
                    response.error || 'Please try again.'
                );
                return;
            }

            toast.success(
                decision === 'accept' ? 'Invitation Accepted!' : decision === 'cancel' ? 'Request Cancelled' : decision === 'changes_requested' ? 'Counter-Proposal Sent' : 'Invitation Declined',
                decision === 'accept' 
                    ? `You are now affiliated with ${invite.provider?.name}. In-person and video consultations enabled.`
                    : decision === 'changes_requested'
                    ? `Your proposed changes have been sent to ${invite.provider?.name}.`
                    : 'The update was processed successfully.'
            );
            
            setSelectedInvite(null);
            setShowCounterProposal(false);
            void fetchInvites();
        } catch {
            toast.error('Operation Failed', 'Please try again later.');
        } finally {
            setActionId(null);
        }
    };

    const handleOpenModal = (invite: ProviderInvite) => {
        setSelectedInvite(invite);
        setShowCounterProposal(false);
        // Pre-populate counter-proposal with initial invite values
        setCounterPracticeType(invite.practice_type || 'visiting');
        setCounterModes(invite.consultation_modes || ['in_clinic', 'video']);
        setCounterFeeAmount(invite.fee_amount ? String(invite.fee_amount) : '');
        setCounterStartDate(invite.start_date || '');
        setCounterMessage('');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 sm:px-6">
            
            {/* Top Workspace Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 px-3 py-1 rounded-full border border-brand-200 dark:border-brand-800/80 inline-block mb-1.5 shadow-sm">
                        Clinical Workspace
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        My Care Networks
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Manage your clinic & hospital affiliations, review invitations, and negotiate practice schedules.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="outline" 
                        onClick={() => void fetchInvites()} 
                        disabled={loading}
                        className="rounded-2xl border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Link href="/doctor/care-networks/find">
                        <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md shadow-emerald-600/20">
                            <Search className="h-4 w-4 mr-2" /> Find Organizations
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                    { id: 'all', label: 'Active Networks', value: activeAffiliations.length, icon: Building2, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50/90 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/60' },
                    { id: 'hospitals', label: 'Hospitals', value: hospitalsOnly.length, icon: HeartPulse, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50/90 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800/60' },
                    { id: 'clinics', label: 'Clinics', value: clinicsOnly.length, icon: Stethoscope, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50/90 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800/60' },
                    { id: 'invitations', label: 'Invitations', value: pendingInvites.length, icon: MailOpen, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50/90 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/60' },
                    { id: 'requests', label: 'Join Requests', value: pendingJoinRequests.length, icon: FileText, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50/90 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800/60' },
                ].map(stat => {
                    const Icon = stat.icon;
                    const isActive = activeTab === stat.id;
                    return (
                        <button
                            key={stat.id}
                            type="button"
                            onClick={() => setActiveTab(stat.id as TabType)}
                            className={`p-4 rounded-3xl border text-left transition-all ${stat.bg} ${stat.border} ${
                                isActive ? 'ring-2 ring-brand-500 shadow-md scale-[1.02]' : 'hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Icon className={`w-5 h-5 ${stat.color}`} />
                                <span className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">{stat.value}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">{stat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Navigation Tabs & Search */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-3 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                    {[
                        { id: 'all', label: 'All Active' },
                        { id: 'hospitals', label: 'Hospitals' },
                        { id: 'clinics', label: 'Clinics' },
                        { id: 'invitations', label: `Invitations (${pendingInvites.length})` },
                        { id: 'requests', label: `Join Requests (${pendingJoinRequests.length})` },
                        { id: 'history', label: 'History' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-full max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search networks by name or city..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 text-xs rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            {/* Content List Section */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Loading your network affiliations...</p>
                </div>
            ) : (
                <div>
                    {(() => {
                        let displayItems: ProviderInvite[] = [];
                        if (activeTab === 'all') displayItems = activeAffiliations;
                        else if (activeTab === 'hospitals') displayItems = hospitalsOnly;
                        else if (activeTab === 'clinics') displayItems = clinicsOnly;
                        else if (activeTab === 'invitations') displayItems = pendingInvites;
                        else if (activeTab === 'requests') displayItems = pendingJoinRequests;
                        else if (activeTab === 'history') displayItems = historyInvites;

                        if (displayItems.length === 0) {
                            return (
                                <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto text-gray-500 dark:text-gray-400">
                                        <Building2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        {activeTab === 'invitations' ? 'No pending invitations' : activeTab === 'requests' ? 'No active join requests' : 'No networks found'}
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                                        {activeTab === 'invitations' 
                                            ? 'Invitations from clinics and hospitals will appear here. You can review explicit terms and accept or propose changes.'
                                            : 'Search the organization directory to discover and request to join partner clinics and hospitals.'}
                                    </p>
                                    <Link href="/doctor/care-networks/find">
                                        <Button className="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
                                            <Search className="w-3.5 h-3.5 mr-1.5" /> Find Organizations
                                        </Button>
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {displayItems.map(item => (
                                    <NetworkCard
                                        key={item.id}
                                        item={item}
                                        todaysCount={todaysAppointments.length}
                                        actionId={actionId}
                                        onRespond={handleRespond}
                                        onClick={() => handleOpenModal(item)}
                                    />
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Detailed Invitation & Network Modal */}
            <AnimatePresence>
                {selectedInvite && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 15 }}
                            className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-gray-200 dark:border-gray-700"
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-[#0c1422] shrink-0">
                                <div className="flex items-center gap-4 min-w-0">
                                    {selectedInvite.provider?.profile_image_url ? (
                                        <img src={selectedInvite.provider.profile_image_url} alt={selectedInvite.provider.name} className="h-14 w-14 rounded-2xl object-cover border border-gray-300 dark:border-gray-700 shadow-sm shrink-0" />
                                    ) : (
                                        <InitialsAvatar name={selectedInvite.provider?.name || 'Network'} size="lg" />
                                    )}
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">
                                            {selectedInvite.provider?.name || 'Healthcare Network'}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 capitalize border border-blue-300 dark:border-blue-800">
                                                {selectedInvite.kind}
                                            </span>
                                            {selectedInvite.provider?.city && (
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-gray-500" /> {selectedInvite.provider.city}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setSelectedInvite(null); setShowCounterProposal(false); }}
                                    className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                                
                                {/* Status Banner */}
                                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${statusConfig[selectedInvite.status]?.color || 'bg-gray-100 border-gray-300 text-gray-800'}`}>
                                    <Info className="h-5 w-5 shrink-0" />
                                    <div className="min-w-0 text-xs">
                                        <div className="font-extrabold text-sm">Status: {statusConfig[selectedInvite.status]?.label || selectedInvite.status}</div>
                                        <div className="font-medium opacity-95 mt-0.5">
                                            {selectedInvite.status === 'pending' && !selectedInvite.is_sent_request ? 'This invitation requires your review and acceptance.' :
                                             selectedInvite.status === 'pending' && selectedInvite.is_sent_request ? 'Join request sent. Awaiting organization response.' :
                                             selectedInvite.status === 'changes_requested' ? 'Counter-proposal has been submitted. Awaiting organization approval.' :
                                             selectedInvite.status === 'accepted' ? 'You are actively affiliated with this healthcare network.' :
                                             `Updated on ${new Date(selectedInvite.responded_at || selectedInvite.created_at).toLocaleDateString()}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Proposed Practice Terms Breakdown */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                                        <Briefcase className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                        {selectedInvite.is_sent_request ? 'Requested Practice Terms' : 'Proposed Terms from Organization'}
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <DetailItem icon={<Building />} label="Department" value={selectedInvite.department || 'General Practice'} />
                                        <DetailItem icon={<UserCheck />} label="Role" value={selectedInvite.role || 'Consultant Doctor'} />
                                        <DetailItem 
                                            icon={<Briefcase />} 
                                            label="Practice Type" 
                                            value={selectedInvite.practice_type ? selectedInvite.practice_type.replace('_', ' ').toUpperCase() : 'Visiting / Flexible'} 
                                        />
                                        <DetailItem 
                                            icon={<Video />} 
                                            label="Consultation Modes" 
                                            value={selectedInvite.consultation_modes?.length ? selectedInvite.consultation_modes.map(m => m === 'in_clinic' ? 'In-Person' : 'Video').join(' & ') : 'In-Person OPD & Video'} 
                                        />
                                        {selectedInvite.fee_amount ? (
                                            <DetailItem icon={<IndianRupee />} label="Consultation Fee / Share" value={`₹${selectedInvite.fee_amount}`} />
                                        ) : null}
                                        {selectedInvite.payout_terms ? (
                                            <DetailItem icon={<IndianRupee />} label="Payout Terms" value={selectedInvite.payout_terms} />
                                        ) : null}
                                        {selectedInvite.start_date ? (
                                            <DetailItem icon={<CalendarDays />} label="Proposed Start Date" value={new Date(selectedInvite.start_date).toLocaleDateString()} />
                                        ) : null}
                                        {selectedInvite.schedule?.description ? (
                                            <DetailItem icon={<Clock />} label="Proposed Schedule" value={selectedInvite.schedule.description} />
                                        ) : null}
                                        {selectedInvite.preferred_days?.length ? (
                                            <DetailItem icon={<CalendarDays />} label="Preferred Days" value={selectedInvite.preferred_days.join(', ')} />
                                        ) : null}
                                        {selectedInvite.preferred_start_time && selectedInvite.preferred_end_time ? (
                                            <DetailItem icon={<Clock />} label="Preferred Timings" value={`${selectedInvite.preferred_start_time} - ${selectedInvite.preferred_end_time}`} />
                                        ) : null}
                                    </div>
                                </div>

                                {/* Previous Counter-Proposal Note if any */}
                                {selectedInvite.counter_proposal && (
                                    <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-1.5 shadow-sm">
                                        <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5" /> Doctor Counter-Proposal Note:
                                        </span>
                                        <p className="text-xs text-purple-900 dark:text-purple-200 italic leading-relaxed">
                                            "{selectedInvite.counter_proposal}"
                                        </p>
                                    </div>
                                )}

                                {/* Location Details */}
                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-gray-200 uppercase tracking-wider">Facility Address</h4>
                                    <p className="text-xs text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-[#0c1422] p-3 rounded-2xl border border-gray-200 dark:border-gray-800 leading-relaxed font-medium">
                                        {selectedInvite.provider?.address || 'Address registered on facility profile'}
                                    </p>
                                </div>

                                {/* Counter-Proposal Form if Doctor clicked "Suggest Changes" */}
                                {showCounterProposal && selectedInvite.status === 'pending' && !selectedInvite.is_sent_request && (
                                    <div className="bg-purple-50/80 dark:bg-purple-950/30 p-5 rounded-3xl border border-purple-300 dark:border-purple-800/80 space-y-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <Send className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" /> Propose Alternative Terms
                                            </h4>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowCounterProposal(false)}
                                                className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-1">
                                                    Counter Practice Type
                                                </label>
                                                <select
                                                    value={counterPracticeType}
                                                    onChange={e => setCounterPracticeType(e.target.value)}
                                                    className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white font-semibold"
                                                >
                                                    <option value="visiting">Visiting Consultant</option>
                                                    <option value="part_time">Part-Time</option>
                                                    <option value="full_time">Full-Time</option>
                                                    <option value="contract">Contract</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-1">
                                                    Proposed Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={counterStartDate}
                                                    onChange={e => setCounterStartDate(e.target.value)}
                                                    className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white font-semibold"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-1">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={counterStartTime}
                                                    onChange={e => setCounterStartTime(e.target.value)}
                                                    className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white font-semibold"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-1">
                                                    End Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={counterEndTime}
                                                    onChange={e => setCounterEndTime(e.target.value)}
                                                    className="w-full p-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white font-semibold"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-1">
                                                Doctor Explanation / Specific Rationale
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={counterMessage}
                                                onChange={e => setCounterMessage(e.target.value)}
                                                placeholder="e.g. Wednesday is unavailable after 8:30 PM. Prefer Mon/Wed morning OPD shifts..."
                                                className="w-full p-3 text-xs rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-purple-500 font-medium"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button
                                                onClick={() => {
                                                    const fullProposalText = `Practice: ${counterPracticeType}, Timings: ${counterStartTime}-${counterEndTime}, Start: ${counterStartDate || 'Immediate'}. Note: ${counterMessage}`;
                                                    handleRespond(selectedInvite, 'changes_requested', {
                                                        counterProposal: fullProposalText,
                                                        practiceType: counterPracticeType,
                                                        preferredStartTime: counterStartTime,
                                                        preferredEndTime: counterEndTime,
                                                        startDate: counterStartDate || null,
                                                    });
                                                }}
                                                disabled={actionId === selectedInvite.id}
                                                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-5 py-2.5 shadow-sm"
                                            >
                                                {actionId === selectedInvite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Counter-Proposal'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0c1422] shrink-0">
                                {selectedInvite.is_sent_request && selectedInvite.status === 'pending' ? (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Awaiting organization review</p>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleRespond(selectedInvite, 'cancel')}
                                            disabled={actionId === selectedInvite.id}
                                            className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs rounded-xl"
                                        >
                                            {actionId === selectedInvite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Join Request'}
                                        </Button>
                                    </div>
                                ) : !selectedInvite.is_sent_request && selectedInvite.status === 'changes_requested' ? (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Awaiting organization review of your counter-proposal</p>
                                    </div>
                                ) : (selectedInvite.status === 'pending' || (selectedInvite.is_sent_request && selectedInvite.status === 'changes_requested')) && !showCounterProposal ? (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleRespond(selectedInvite, 'reject')}
                                            disabled={actionId === selectedInvite.id}
                                            className="w-full sm:w-auto text-red-700 dark:text-red-300 border-red-300 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs rounded-xl"
                                        >
                                            Decline
                                        </Button>
                                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                            <Button 
                                                variant="outline"
                                                onClick={() => setShowCounterProposal(true)}
                                                disabled={actionId === selectedInvite.id}
                                                className="flex-1 sm:flex-none border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-950/50 font-bold text-xs rounded-xl"
                                            >
                                                Suggest Changes
                                            </Button>
                                            <Button 
                                                onClick={() => handleRespond(selectedInvite, 'accept')}
                                                disabled={actionId === selectedInvite.id}
                                                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                                            >
                                                {actionId === selectedInvite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedInvite.status === 'changes_requested' ? 'Accept Changes' : 'Accept Terms')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : ['accepted', 'active'].includes(selectedInvite.status) ? (
                                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                                        <Link href="/doctor/appointments">
                                            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm">
                                                <Stethoscope className="w-3.5 h-3.5 mr-1.5" /> OPD Consultations
                                            </Button>
                                        </Link>
                                        {selectedInvite.kind === 'hospital' && (
                                            <Link href={`/doctor/ipd?hospitalId=${selectedInvite.providerId}`}>
                                                <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm">
                                                    <BedDouble className="w-3.5 h-3.5 mr-1.5" /> IPD Ward Rounds
                                                </Button>
                                            </Link>
                                        )}
                                        <Link href="/doctor/schedule">
                                            <Button variant="outline" className="rounded-xl border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex justify-end">
                                        <Button 
                                            variant="outline"
                                            onClick={() => setSelectedInvite(null)}
                                            className="rounded-xl text-xs font-bold border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800">
            <div className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shrink-0 shadow-sm">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[11px] text-gray-600 dark:text-gray-400 font-bold mb-0.5 uppercase tracking-wider">{label}</div>
                <div className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white line-clamp-1" title={value}>{value}</div>
            </div>
        </div>
    );
}

function NetworkCard({ 
    item, 
    todaysCount, 
    onRespond, 
    actionId, 
    onClick 
}: { 
    item: ProviderInvite, 
    todaysCount: number, 
    onRespond: (i: ProviderInvite, d: 'accept'|'reject'|'cancel'|'changes_requested') => void, 
    actionId: string | null, 
    onClick: () => void 
}) {
    const isHospital = item.kind === 'hospital';
    const name = item.provider?.name || (isHospital ? 'Hospital Facility' : 'Clinic Facility');
    const location = [item.provider?.city, item.provider?.address].filter(Boolean).join(', ') || '';
    const rating = item.provider?.rating;
    const cfg = statusConfig[item.status] || statusConfig.pending;

    return (
        <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-200 group flex flex-col h-full hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/30">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4 cursor-pointer" onClick={onClick}>
                {item.provider?.profile_image_url ? (
                    <img src={item.provider.profile_image_url} alt={name} className="h-12 w-12 rounded-2xl object-cover shrink-0 border border-gray-200 dark:border-gray-700 shadow-sm"/>
                ) : (
                    <InitialsAvatar name={name}/>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{name}</h3>
                            {item.department && <p className="text-xs text-teal-700 dark:text-teal-400 font-bold mt-0.5 truncate">{item.department}</p>}
                            {location && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1 mt-1 truncate">
                                    <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0"/>
                                    <span className="truncate">{location}</span>
                                </p>
                            )}
                        </div>
                        <span className={`flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${item.status === 'accepted' ? 'animate-pulse' : ''}`}/>
                            {cfg.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap gap-1.5 mb-4 flex-1 content-start text-xs">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 uppercase tracking-wider">
                    {isHospital ? 'Hospital' : 'Clinic'}
                </span>
                
                {item.is_sent_request ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 tracking-wider uppercase">
                        Request Sent
                    </span>
                ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 tracking-wider uppercase">
                        Facility Invite
                    </span>
                )}

                {item.practice_type && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 capitalize">
                        {item.practice_type.replace('_', ' ')}
                    </span>
                )}

                {['accepted', 'active'].includes(item.status) && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        In-Person OPD Active
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="pt-3.5 border-t border-gray-200 dark:border-gray-800 mt-auto flex flex-wrap items-center gap-2">
                {['accepted', 'active'].includes(item.status) ? (
                    <>
                        <Link href="/doctor/appointments" className="flex-1 min-w-[90px]">
                            <Button className="w-full h-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm">
                                <Stethoscope className="w-3 h-3 mr-1" /> OPD
                            </Button>
                        </Link>
                        {isHospital && (
                            <Link href={`/doctor/ipd?hospitalId=${item.providerId}`} className="flex-1 min-w-[90px]">
                                <Button className="w-full h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm">
                                    <BedDouble className="w-3 h-3 mr-1" /> IPD Care
                                </Button>
                            </Link>
                        )}
                        <Button 
                            onClick={onClick} 
                            variant="outline" 
                            className="h-8 px-2.5 rounded-xl border-gray-300 dark:border-gray-700 text-[11px] font-bold text-gray-700 dark:text-gray-300"
                        >
                            Details
                        </Button>
                    </>
                ) : (
                    <>
                        <Button 
                            onClick={onClick} 
                            variant="outline" 
                            className="flex-1 h-9 rounded-xl border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-900 dark:text-gray-100"
                        >
                            View Details
                        </Button>

                        {item.status === 'pending' && !item.is_sent_request && (
                            <Button 
                                onClick={onClick} 
                                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm shadow-emerald-600/20"
                            >
                                Review & Respond
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
