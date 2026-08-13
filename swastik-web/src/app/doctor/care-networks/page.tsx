/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
    Building2, Clock3, CheckCircle2, XCircle, RefreshCw, MailOpen, UserCheck, 
    ShieldAlert, HeartPulse, Building, FileText, CheckCircle, MailX, Check, MapPin, 
    ChevronRight, Info, Search, Stethoscope, Briefcase, ExternalLink, CalendarDays, Share2, HelpCircle,
    Calendar, Star, Clock, BadgeCheck, Phone, Mail, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDoctorStore } from '@/stores/doctorStore';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'active';
type InviteKind = 'hospital' | 'clinic';

interface ProviderInvite {
    id: string;
    kind: InviteKind;
    providerId: string;
    providerLabel: string;
    department?: string | null;
    role?: string | null;
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
}

function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const sizeClass = size === 'sm' ? 'h-10 w-10 text-sm' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base';
    return (
        <div className={`${sizeClass} rounded-2xl bg-gradient-to-br from-emerald-500/30 to-blue-500/30 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 shrink-0`}>
            {initials}
        </div>
    );
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    accepted:  { label: 'Active',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
    active:    { label: 'Active',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
    pending:   { label: 'Pending',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       dot: 'bg-amber-500'  },
    rejected:  { label: 'Declined',  color: 'text-red-400 bg-red-500/10 border-red-500/20',             dot: 'bg-red-500'    },
    expired:   { label: 'Expired',   color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',          dot: 'bg-gray-500'   },
    cancelled: { label: 'Cancelled', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',          dot: 'bg-gray-500'   },
};

export default function MyCareNetworksPage() {
    const toast = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [invites, setInvites] = useState<ProviderInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    
    type TabType = 'all' | 'hospitals' | 'clinics' | 'invitations' | 'history';
    const initialTab = (searchParams?.get('tab') as TabType) || 'all';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInvite, setSelectedInvite] = useState<ProviderInvite | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const { todaysAppointments, doctorProfile } = useDoctorStore();
    const hasLoadedRef = useRef(false);

    const fetchInvites = useCallback(async () => {
        setLoading(true);
        try {
            const [hospitalResponse, clinicResponse] = await Promise.all([
                doctorApi.getHospitalInvites(),
                doctorApi.getClinicInvites(),
            ]);

            if (!hospitalResponse.success || !clinicResponse.success) {
                toast.error(
                    'Unable to load networks',
                    hospitalResponse.error || clinicResponse.error || 'Please try again.'
                );
                setInvites([]);
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
                    provider: invite.clinic,
                    invitedBy: invite.invitedBy,
                  }))
                : [];

            setInvites([...hospitalInvites, ...clinicInvites].sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }));
        } catch {
            toast.error('Unable to load networks', 'Network error. Please try again.');
            setInvites([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        void fetchInvites();
    }, [fetchInvites]);

    // Update tab if URL param changes
    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab && ['all', 'hospitals', 'clinics', 'invitations', 'history'].includes(tab)) {
            setActiveTab(tab as TabType);
        }
    }, [searchParams]);

    const filteredInvites = useMemo(() => {
        return invites.filter(i => {
            const searchLower = searchQuery.toLowerCase();
            return (i.provider?.name?.toLowerCase().includes(searchLower) || i.provider?.city?.toLowerCase().includes(searchLower));
        });
    }, [invites, searchQuery]);

    const activeAffiliations = useMemo(() => filteredInvites.filter(i => ['accepted', 'active'].includes(i.status)), [filteredInvites]);
    
    const hospitalsOnly = useMemo(() => activeAffiliations.filter(i => i.kind === 'hospital'), [activeAffiliations]);
    const clinicsOnly = useMemo(() => activeAffiliations.filter(i => i.kind === 'clinic'), [activeAffiliations]);
    
    const pendingInvites = useMemo(() => filteredInvites.filter(i => i.status === 'pending'), [filteredInvites]);
    const historyInvites = useMemo(() => filteredInvites.filter(i => ['rejected', 'expired', 'cancelled'].includes(i.status)), [filteredInvites]);

    const handleRespond = async (invite: ProviderInvite, decision: 'accept' | 'reject') => {
        const inviteId = invite.id;
        setActionId(inviteId);
        try {
            const response = invite.kind === 'hospital'
                ? await doctorApi.respondHospitalInvite(inviteId, decision)
                : await doctorApi.respondClinicInvite(inviteId, decision);
            if (!response.success) {
                toast.error(
                    decision === 'accept' ? 'Unable to accept invite' : 'Unable to reject invite',
                    response.error || 'Please try again.'
                );
                return;
            }

            if (decision === 'accept') {
                setShowSuccess(true);
                setSelectedInvite(null);
            } else {
                toast.success('Invite rejected', 'Successfully declined affiliation.');
                setActiveTab('history');
                setSelectedInvite(null);
            }
            await fetchInvites();
        } catch {
            toast.error('Action failed', 'Network error. Please try again.');
        } finally {
            setActionId(null);
        }
    };

    const handleSuccessContinue = () => {
        setShowSuccess(false);
        setActiveTab('all');
    };

    const getDisplayedItems = () => {
        switch (activeTab) {
            case 'all': return activeAffiliations;
            case 'hospitals': return hospitalsOnly;
            case 'clinics': return clinicsOnly;
            case 'invitations': return pendingInvites;
            case 'history': return historyInvites;
            default: return [];
        }
    };

    const displayedItems = getDisplayedItems();

    if (showSuccess) {
        return (
            <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500">
                <div className="w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full animate-ping [animation-duration:3s]"></div>
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 drop-shadow-md" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight text-center">
                    Affiliation Accepted
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg text-center mb-10 font-medium">
                    You are now affiliated with this provider network. You can begin accepting in-person appointments immediately.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button 
                        onClick={handleSuccessContinue}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
                    >
                        View Care Networks
                    </Button>
                    <Link href="/doctor">
                        <Button 
                            variant="outline"
                            className="w-full sm:w-auto border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold h-12 px-8 rounded-xl transition-all"
                        >
                            Go to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24 relative">
            
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 py-2">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 mb-3 text-xs font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 shadow-sm">
                        <Briefcase className="h-3.5 w-3.5" />
                        Workspace
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                        My Care Networks
                    </h1>
                    <p className="mt-2 text-base font-medium text-gray-500 dark:text-gray-400 max-w-xl">
                        Manage your affiliations, pending invitations, and in-person consultation networks.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group flex-1 sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors z-10">
                            <Search className="h-4 w-4" />
                        </div>
                        <input 
                            type="text"
                            placeholder="Search network..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-11 pr-4 bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>
                    <Button 
                        onClick={fetchInvites} 
                        disabled={loading}
                        className="h-12 px-5 bg-white dark:bg-[#0f1929] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a2332] transition-all shadow-sm rounded-xl font-bold"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* In-Person Consultation Status */}
            {!loading && activeAffiliations.length === 0 && doctorProfile && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">In-person consultations are unavailable</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                You must join a verified hospital or clinic network before accepting in-person bookings.
                            </p>
                        </div>
                    </div>
                    {pendingInvites.length > 0 && (
                        <Button 
                            onClick={() => setActiveTab('invitations')}
                            className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                        >
                            View Invitations <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            )}

            {/* Premium Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { id: 'all', label: 'Total Affiliations', value: activeAffiliations.length, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { id: 'hospitals', label: 'Hospitals', value: hospitalsOnly.length, icon: HeartPulse, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                    { id: 'clinics', label: 'Clinics', value: clinicsOnly.length, icon: Stethoscope, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                    { id: 'invitations', label: 'Pending Invites', value: pendingInvites.length, icon: MailOpen, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                ].map((stat) => (
                    <div 
                        key={stat.id}
                        onClick={() => setActiveTab(stat.id as TabType)}
                        className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
                            activeTab === stat.id 
                                ? `bg-white dark:bg-[#0f1929] border-emerald-500 ring-1 ring-emerald-500 shadow-md` 
                                : 'bg-white dark:bg-[#0f1929] border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            {activeTab === stat.id && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                        </div>
                        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">{stat.value}</h3>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                {[
                    { id: 'all', label: 'All Networks' },
                    { id: 'hospitals', label: 'Hospitals' },
                    { id: 'clinics', label: 'Clinics' },
                    { id: 'invitations', label: 'Invitations' },
                    { id: 'history', label: 'History' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-5 py-3 rounded-t-xl font-bold text-sm whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Syncing Care Networks...</p>
                </div>
            ) : displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0f1929] border border-gray-100 dark:border-gray-800 rounded-3xl text-center px-4">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                        <Briefcase className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No items found</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        {activeTab === 'invitations' 
                            ? "You don't have any pending invitations from hospitals or clinics."
                            : "You don't have any active affiliations in this category yet."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {displayedItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="h-full"
                            >
                                <NetworkCard 
                                    item={item} 
                                    todaysCount={todaysAppointments?.filter(a => (a as any).hospital_id === item.providerId || (a as any).clinic_id === item.providerId).length || 0}
                                    onRespond={handleRespond}
                                    actionId={actionId}
                                    onClick={() => setSelectedInvite(item)}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Details Modal */}
            <AnimatePresence>
                {selectedInvite && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setSelectedInvite(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl bg-white dark:bg-[#0f1929] rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 shrink-0">
                                <div className="flex items-center gap-4">
                                    {selectedInvite.provider?.profile_image_url ? (
                                        <img src={selectedInvite.provider.profile_image_url} alt={selectedInvite.provider.name} className="h-16 w-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                                    ) : (
                                        <InitialsAvatar name={selectedInvite.provider?.name || 'Network'} size="lg" />
                                    )}
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                            {selectedInvite.provider?.name || 'Care Network'}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
                                                {selectedInvite.kind}
                                            </span>
                                            {selectedInvite.provider?.city && (
                                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {selectedInvite.provider.city}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedInvite(null)}
                                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-6">
                                    {/* Status Box */}
                                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${statusConfig[selectedInvite.status]?.color || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        <Info className="h-5 w-5 shrink-0" />
                                        <div>
                                            <div className="font-bold">Status: {statusConfig[selectedInvite.status]?.label || selectedInvite.status}</div>
                                            <div className="text-sm opacity-80 mt-0.5">
                                                {selectedInvite.status === 'pending' ? 'This invitation requires your response.' :
                                                 selectedInvite.status === 'accepted' ? 'You are actively affiliated with this network.' :
                                                 `Updated on ${new Date(selectedInvite.responded_at || selectedInvite.created_at).toLocaleDateString()}`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <DetailItem icon={<Building />} label="Department" value={selectedInvite.department || 'General'} />
                                        <DetailItem icon={<UserCheck />} label="Role" value={selectedInvite.role || 'Consultant'} />
                                        <DetailItem icon={<CalendarDays />} label="Invited On" value={new Date(selectedInvite.created_at).toLocaleDateString()} />
                                        <DetailItem icon={<Mail />} label="Contact Email" value={selectedInvite.provider?.email || selectedInvite.invitedBy?.email || 'N/A'} />
                                        <DetailItem icon={<Phone />} label="Phone" value={selectedInvite.provider?.phone || 'N/A'} />
                                        <DetailItem icon={<Star />} label="Rating" value={selectedInvite.provider?.rating ? `${selectedInvite.provider.rating} / 5` : 'New'} />
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Location Address</h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-[#1a2332] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                            {selectedInvite.provider?.address || 'Address not provided'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="p-6 md:p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2332] shrink-0">
                                {selectedInvite.status === 'pending' ? (
                                    <div className="flex gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleRespond(selectedInvite, 'reject')}
                                            disabled={actionId === selectedInvite.id}
                                            className="flex-1 h-12 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900/30 dark:hover:bg-red-900/20 font-bold"
                                        >
                                            {actionId === selectedInvite.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Decline'}
                                        </Button>
                                        <Button 
                                            onClick={() => handleRespond(selectedInvite, 'accept')}
                                            disabled={actionId === selectedInvite.id}
                                            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                        >
                                            {actionId === selectedInvite.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accept Invitation'}
                                        </Button>
                                    </div>
                                ) : ['accepted', 'active'].includes(selectedInvite.status) ? (
                                    <div className="flex gap-3">
                                        <Link href="/doctor/schedule" className="flex-1">
                                            <Button className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                                <Calendar className="w-4 h-4 mr-2" /> View Schedule
                                            </Button>
                                        </Link>
                                        <Link href="/doctor/appointments" className="flex-1">
                                            <Button variant="outline" className="w-full h-12 rounded-xl border-gray-300 dark:border-gray-600 font-bold">
                                                <Clock className="w-4 h-4 mr-2" /> Appointments
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 font-medium">
                                        No further actions available for this {selectedInvite.status} invitation.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a2332] border border-gray-100 dark:border-gray-800">
            <div className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0 shadow-sm">
                {icon}
            </div>
            <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-0.5">{label}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1" title={value}>{value}</div>
            </div>
        </div>
    );
}

function NetworkCard({ item, todaysCount, onRespond, actionId, onClick }: { item: ProviderInvite, todaysCount: number, onRespond: (i: ProviderInvite, d: 'accept'|'reject')=>void, actionId: string | null, onClick: () => void }) {
    const isHospital = item.kind === 'hospital';
    const name = item.provider?.name || (isHospital ? 'Hospital' : 'Clinic');
    const location = item.provider?.city || item.provider?.address || '';
    const rating = item.provider?.rating;
    const cfg = statusConfig[item.status] || statusConfig.pending;

    return (
        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all duration-200 group flex flex-col h-full hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-black/20">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4 cursor-pointer" onClick={onClick}>
                {item.provider?.profile_image_url ? (
                    <img src={item.provider.profile_image_url} alt={name} className="h-12 w-12 rounded-2xl object-cover shrink-0 border border-gray-200 dark:border-gray-800"/>
                ) : (
                    <InitialsAvatar name={name}/>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] truncate">{name}</h3>
                            {item.department && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 truncate">{item.department}</p>}
                            {location && (
                                <div className="flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-600 shrink-0"/>
                                    <span className="text-xs text-gray-500 truncate">{location}</span>
                                </div>
                            )}
                        </div>
                        <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${item.status === 'accepted' ? 'animate-pulse' : ''}`}/>
                            {cfg.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2.5 text-center border border-gray-200 dark:border-gray-800/30">
                    <Calendar className="h-3.5 w-3.5 text-blue-400 mx-auto mb-1"/>
                    <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{todaysCount}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">Today's Appts</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2.5 text-center border border-gray-200 dark:border-gray-800/30">
                    <Star className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1"/>
                    <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{rating ? rating.toFixed(1) : '—'}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">Rating</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2.5 text-center border border-gray-200 dark:border-gray-800/30">
                    <Clock className="h-3.5 w-3.5 text-purple-400 mx-auto mb-1"/>
                    <div className="text-[11px] font-bold text-gray-900 dark:text-white leading-none">{new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">Added</div>
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4 flex-1 content-start">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{isHospital ? 'Hospital' : 'Clinic'}</span>
                {item.role && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{item.role}</span>}
                {['accepted', 'active'].includes(item.status) && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">In-Person Authorized</span>}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800/50 mt-auto">
                {item.status === 'pending' ? (
                    <div className="flex gap-2">
                        <Button 
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); onRespond(item, 'reject'); }}
                            disabled={actionId === item.id}
                            className="flex-1 h-9 rounded-xl text-red-600 border-red-200 hover:bg-red-50 text-xs"
                        >
                            Decline
                        </Button>
                        <Button 
                            onClick={(e) => { e.stopPropagation(); onRespond(item, 'accept'); }}
                            disabled={actionId === item.id}
                            className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                            Accept
                        </Button>
                    </div>
                ) : ['accepted', 'active'].includes(item.status) ? (
                    <div className="flex gap-2">
                        <Link href="/doctor/schedule" className="flex-1">
                            <Button variant="outline" className="w-full h-9 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-xs font-semibold">
                                <Calendar className="h-3.5 w-3.5 mr-1"/> Schedule
                            </Button>
                        </Link>
                        <Button onClick={onClick} className="flex-1 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 text-xs font-semibold">
                            Details
                        </Button>
                    </div>
                ) : (
                    <Button onClick={onClick} variant="outline" className="w-full h-9 rounded-xl text-xs">
                        View Details
                    </Button>
                )}
            </div>
        </div>
    );
}
