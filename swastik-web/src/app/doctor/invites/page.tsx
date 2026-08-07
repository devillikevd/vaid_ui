'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Clock3, CheckCircle2, XCircle, RefreshCw, MailOpen, UserCheck, ShieldAlert, HeartPulse, Building, FileText, CheckCircle, MailX, Check, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';

type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
type InviteKind = 'hospital' | 'clinic';

interface ProviderInvite {
    id: string;
    kind: InviteKind;
    providerId: string;
    providerLabel: string;
    department?: string | null;
    status: InviteStatus;
    created_at: string;
    expires_at?: string | null;
    responded_at?: string | null;
    provider?: {
        id: string;
        name: string;
        city?: string | null;
        address?: string | null;
    };
    invitedBy?: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
}

export default function DoctorInvitesPage() {
    const toast = useToast();
    const [invites, setInvites] = useState<ProviderInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'history'>('pending');
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
                    'Unable to load invites',
                    hospitalResponse.error || clinicResponse.error || 'Please try again.'
                );
                setInvites([]);
                return;
            }

            const hospitalInvites = Array.isArray(hospitalResponse.data)
                ? hospitalResponse.data.map((invite: any) => ({
                    id: invite.id,
                    kind: 'hospital' as const,
                    providerId: invite.hospital_id,
                    providerLabel: 'Hospital',
                    department: invite.department,
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
                    providerId: invite.clinic_id,
                    providerLabel: 'Clinic',
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
            toast.error('Unable to load invites', 'Network error. Please try again.');
            setInvites([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (hasLoadedRef.current) {
            return;
        }
        hasLoadedRef.current = true;
        void fetchInvites();
    }, [fetchInvites]);

    const pendingInvites = useMemo(() => invites.filter(i => i.status === 'pending'), [invites]);
    const acceptedInvites = useMemo(() => invites.filter(i => i.status === 'accepted'), [invites]);
    const historyInvites = useMemo(() => invites.filter(i => ['rejected', 'expired', 'cancelled'].includes(i.status)), [invites]);

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

            toast.success(
                decision === 'accept' ? 'Invite accepted' : 'Invite rejected',
                typeof response.message === 'string' ? response.message : 'Updated successfully.'
            );
            await fetchInvites();
            if (decision === 'accept') {
                setActiveTab('accepted');
            } else {
                setActiveTab('history');
            }
        } catch {
            toast.error('Action failed', 'Network error. Please try again.');
        } finally {
            setActionId(null);
        }
    };

    const getDisplayedInvites = () => {
        switch (activeTab) {
            case 'pending': return pendingInvites;
            case 'accepted': return acceptedInvites;
            case 'history': return historyInvites;
            default: return [];
        }
    };

    const displayedInvites = getDisplayedInvites();

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <MailOpen className="w-8 h-8 text-teal-600 dark:text-teal-500" />
                        Provider Invites
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage invitations from hospitals and clinics to join their rosters.
                    </p>
                </div>
                <Button 
                    onClick={fetchInvites} 
                    disabled={loading}
                    className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                    onClick={() => setActiveTab('pending')}
                    className={`rounded-2xl border p-5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${
                        activeTab === 'pending' 
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50 ring-1 ring-amber-500' 
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl flex-shrink-0 ${activeTab === 'pending' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400'}`}>
                            <MailOpen className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Actions</p>
                            <h3 className={`text-2xl font-bold ${activeTab === 'pending' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                {pendingInvites.length}
                            </h3>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab('accepted')}
                    className={`rounded-2xl border p-5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${
                        activeTab === 'accepted' 
                            ? 'bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800/50 ring-1 ring-teal-500' 
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl flex-shrink-0 ${activeTab === 'accepted' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-500 dark:text-teal-400'}`}>
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Joined Providers</p>
                            <h3 className={`text-2xl font-bold ${activeTab === 'accepted' ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                {acceptedInvites.length}
                            </h3>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab('history')}
                    className={`rounded-2xl border p-5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${
                        activeTab === 'history' 
                            ? 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 border-gray-300 dark:border-gray-700 ring-1 ring-gray-400' 
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl flex-shrink-0 ${activeTab === 'history' ? 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'}`}>
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Past Invites</p>
                            <h3 className={`text-2xl font-bold ${activeTab === 'history' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-900 dark:text-gray-100'}`}>
                                {historyInvites.length}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                
                {/* Tabs Header inside Card */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-2 pt-2">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative rounded-t-lg ${
                            activeTab === 'pending' 
                                ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-500 border-t border-l border-r border-gray-200 dark:border-gray-800' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-t border-l border-r border-transparent'
                        }`}
                    >
                        Pending ({pendingInvites.length})
                        {activeTab === 'pending' && <div className="absolute -bottom-px left-0 right-0 h-px bg-white dark:bg-gray-900" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('accepted')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative rounded-t-lg ${
                            activeTab === 'accepted' 
                                ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-500 border-t border-l border-r border-gray-200 dark:border-gray-800' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-t border-l border-r border-transparent'
                        }`}
                    >
                        Accepted
                        {activeTab === 'accepted' && <div className="absolute -bottom-px left-0 right-0 h-px bg-white dark:bg-gray-900" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative rounded-t-lg ${
                            activeTab === 'history' 
                                ? 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-t border-l border-r border-gray-200 dark:border-gray-800' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-t border-l border-r border-transparent'
                        }`}
                    >
                        History
                        {activeTab === 'history' && <div className="absolute -bottom-px left-0 right-0 h-px bg-white dark:bg-gray-900" />}
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4"></div>
                            <p className="font-medium text-gray-600 dark:text-gray-400">Loading your invites...</p>
                        </div>
                    ) : displayedInvites.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 px-4"
                        >
                            <div className="mx-auto w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                {activeTab === 'pending' && <MailOpen className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                {activeTab === 'accepted' && <UserCheck className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                {activeTab === 'history' && <MailX className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {activeTab === 'pending' && 'No pending invites'}
                                {activeTab === 'accepted' && 'No accepted invites'}
                                {activeTab === 'history' && 'No past invites'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                {activeTab === 'pending' && 'You have caught up with all your provider invitations. When a hospital or clinic invites you, it will appear here.'}
                                {activeTab === 'accepted' && "You haven't accepted any provider invitations yet. Accept pending invites to join their rosters."}
                                {activeTab === 'history' && 'Your history of rejected or expired invitations will be shown here.'}
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-4">
                            {displayedInvites.map((invite) => {
                                const providerName = invite.provider?.name || invite.providerLabel;
                                const location = [invite.provider?.city, invite.provider?.address].filter(Boolean).join(' • ');
                                const invitedBy = invite.invitedBy?.name || invite.invitedBy?.email || 'Admin';
                                
                                const isHospital = invite.kind === 'hospital';
                                const themeColor = isHospital ? 'teal' : 'indigo';
                                const bgIconColor = isHospital ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
                                
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={invite.id}
                                        className={`rounded-2xl border ${activeTab === 'history' ? 'border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} p-5 transition-shadow hover:shadow-sm`}
                                    >
                                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgIconColor}`}>
                                                    {isHospital ? <Building2 className="w-6 h-6" /> : <Building className="w-6 h-6" />}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-lg font-bold ${activeTab === 'history' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                                                            {providerName}
                                                        </h3>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                                                            isHospital 
                                                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300' 
                                                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                                                        }`}>
                                                            {invite.providerLabel}
                                                        </span>
                                                        {activeTab !== 'pending' && (
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                                                                invite.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                                                invite.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400' :
                                                                'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                            }`}>
                                                                {invite.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {location && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5" /> {location}
                                                        </p>
                                                    )}
                                                    
                                                    {invite.kind === 'hospital' && invite.department && (
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                            <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Dept: {invite.department}
                                                        </p>
                                                    )}
                                                    
                                                    <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <UserCheck className="w-3.5 h-3.5" /> Invited by {invitedBy}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock3 className="w-3.5 h-3.5" /> {new Date(invite.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                        {activeTab === 'pending' && invite.expires_at && (
                                                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                                                <ShieldAlert className="w-3.5 h-3.5" /> Expires {new Date(invite.expires_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        )}
                                                        {activeTab !== 'pending' && invite.responded_at && (
                                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                                <CheckCircle className="w-3.5 h-3.5" /> Responded {new Date(invite.responded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {activeTab === 'pending' && (
                                                <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 sm:flex-none border-gray-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:border-gray-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                                        isLoading={actionId === invite.id}
                                                        disabled={actionId === invite.id}
                                                        onClick={() => handleRespond(invite, 'reject')}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-2" />
                                                        Decline
                                                    </Button>
                                                    <Button
                                                        className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                                                        isLoading={actionId === invite.id}
                                                        disabled={actionId === invite.id}
                                                        onClick={() => handleRespond(invite, 'accept')}
                                                    >
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Accept Invite
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
