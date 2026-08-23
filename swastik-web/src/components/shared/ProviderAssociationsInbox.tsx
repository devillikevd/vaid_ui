'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Building2,
    CheckCircle2,
    Clock3,
    Link2,
    Loader2,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    XCircle,
    Info,
    Network,
    PlusCircle
} from 'lucide-react';
import { DashboardCard, CardHeader } from '@/components/shared/DashboardCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface InviteRecord {
    id: string;
    facility_type: 'hospital' | 'clinic';
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
    created_at: string;
    expires_at?: string | null;
    facility?: {
        id: string;
        label: string;
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
    } | null;
    invitedBy?: {
        id: string;
        name?: string | null;
        email?: string | null;
    } | null;
}

interface AssociationRecord {
    associationId: string;
    facilityType: 'hospital' | 'clinic';
    label: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    associatedAt?: string | null;
}

interface ProviderAssociationsInboxProps {
    title: string;
    subtitle: string;
    providerLabel: string;
    accentClass?: string;
    fetchInvites: () => Promise<{ success?: boolean; error?: string; data?: unknown }>;
    fetchAssociations: () => Promise<{ success?: boolean; error?: string; data?: unknown }>;
    respondToInvite: (inviteId: string, decision: 'accept' | 'reject') => Promise<{ success?: boolean; error?: string; message?: string }>;
}

export default function ProviderAssociationsInbox({
    title,
    subtitle,
    providerLabel,
    accentClass = 'text-purple-600',
    fetchInvites,
    fetchAssociations,
    respondToInvite,
}: ProviderAssociationsInboxProps) {
    const toast = useToast();
    const toastRef = useRef(toast);
    const [invites, setInvites] = useState<InviteRecord[]>([]);
    const [associations, setAssociations] = useState<AssociationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [invitesResponse, associationsResponse] = await Promise.all([
                fetchInvites(),
                fetchAssociations(),
            ]);

            if (!invitesResponse.success || !associationsResponse.success) {
                toastRef.current.error(
                    'Unable to load associations',
                    invitesResponse.error || associationsResponse.error || 'Please try again.'
                );
                setInvites([]);
                setAssociations([]);
                return;
            }

            setInvites(Array.isArray(invitesResponse.data) ? invitesResponse.data as InviteRecord[] : []);
            setAssociations(Array.isArray(associationsResponse.data) ? associationsResponse.data as AssociationRecord[] : []);
        } catch {
            toastRef.current.error('Unable to load associations', 'Network error. Please try again.');
            setInvites([]);
            setAssociations([]);
        } finally {
            setLoading(false);
        }
    }, [fetchAssociations, fetchInvites]);

    useEffect(() => {
        if (hasLoadedRef.current) {
            return;
        }
        hasLoadedRef.current = true;
        void loadData();
    }, [loadData]);

    const handleRespond = async (inviteId: string, decision: 'accept' | 'reject') => {
        setActionId(inviteId);
        try {
            const response = await respondToInvite(inviteId, decision);
            if (!response.success) {
                toast.error(
                    decision === 'accept' ? 'Unable to accept invite' : 'Unable to reject invite',
                    response.error || 'Please try again.'
                );
                return;
            }

            toast.success(
                decision === 'accept' ? 'Invite accepted' : 'Invite rejected',
                response.message || 'Updated successfully.'
            );
            await loadData();
        } catch {
            toast.error('Action failed', 'Network error. Please try again.');
        } finally {
            setActionId(null);
        }
    };

    const pendingInvites = invites.filter((invite) => invite.status === 'pending');
    
    const pendingCount = pendingInvites.length;
    const activeCount = associations.length;
    const hospitalCount = associations.filter(a => a.facilityType === 'hospital').length;
    const clinicCount = associations.filter(a => a.facilityType === 'clinic').length;

    const formatAddress = (record: { address?: string; city?: string; state?: string }) => {
        const location = [record.city, record.state].filter(Boolean).join(', ');
        if (record.address && location) return `${record.address} • ${location}`;
        return record.address || location || 'Address not available';
    };

    const isPurple = accentClass.includes('purple');
    const isBlue = accentClass.includes('blue');
    const colorFamily = isPurple ? 'purple' : isBlue ? 'blue' : 'slate';
    const bgClass = `bg-${colorFamily}-50 dark:bg-${colorFamily}-900/20`;
    const borderClass = `border-${colorFamily}-100 dark:border-${colorFamily}-800`;

    return (
        <div className="space-y-6">
            <PageHeader 
                title={title}
                subtitle={subtitle}
                actions={
                    <Button variant="outline" onClick={() => void loadData()} leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
                        Refresh
                    </Button>
                }
            />

            <div className={`flex items-start gap-3 rounded-lg border ${borderClass} ${bgClass} p-3 text-sm`} >
                <Info className={`mt-0.5 h-4 w-4 ${accentClass}`} />
                <div className="text-slate-700 dark:text-slate-300 font-medium">
                    Hospitals and clinics can reference your {providerLabel.toLowerCase()} through these associations. Operational ownership remains with your {providerLabel.toLowerCase()}.
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardCard>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${bgClass} ${accentClass}`}>
                            <Clock3 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Invites</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {loading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-7 w-12 rounded inline-block"></span> : pendingCount}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
                <DashboardCard>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${bgClass} ${accentClass}`}>
                            <Network className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Associations</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {loading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-7 w-12 rounded inline-block"></span> : activeCount}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
                <DashboardCard>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hospitals</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {loading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-7 w-12 rounded inline-block"></span> : hospitalCount}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
                <DashboardCard>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                            <PlusCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Clinics</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {loading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-7 w-12 rounded inline-block"></span> : clinicCount}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
            </div>

            <DashboardCard noPadding>
                <CardHeader 
                    title="Pending Invites" 
                    icon={Clock3} 
                    iconColor={accentClass}
                    action={<span className={`text-sm font-medium ${accentClass} px-2.5 py-1 rounded-full ${bgClass}`}>{pendingCount} pending</span>}
                />
                <div className="p-5 pt-2">
                    {loading ? (
                        <div className="space-y-3 mt-4">
                            {[1, 2].map(i => (
                                <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                            <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : pendingCount === 0 ? (
                        <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                            <Clock3 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200">No pending invites</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">New hospital or clinic invitations will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {pendingInvites.map((invite) => (
                                <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow gap-4">
                                    <div className="flex items-start sm:items-center gap-4">
                                        <div className={`p-3 rounded-lg shrink-0 ${bgClass} ${accentClass}`}>
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{invite.facility?.name || 'Facility'}</h4>
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${bgClass} ${accentClass}`}>
                                                    {invite.facility?.label || invite.facility_type || 'Facility'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {formatAddress(invite.facility || {})}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                                    Invited by {invite.invitedBy?.name || invite.invitedBy?.email || 'Provider Admin'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                            disabled={actionId === invite.id}
                                            isLoading={actionId === invite.id}
                                            leftIcon={<XCircle className="h-4 w-4" />}
                                            onClick={() => void handleRespond(invite.id, 'reject')}
                                        >
                                            Decline
                                        </Button>
                                        <Button
                                            className="w-full sm:w-auto"
                                            disabled={actionId === invite.id}
                                            isLoading={actionId === invite.id}
                                            leftIcon={<CheckCircle2 className="h-4 w-4" />}
                                            onClick={() => void handleRespond(invite.id, 'accept')}
                                        >
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardCard>

            <DashboardCard noPadding>
                <CardHeader 
                    title="Current Associations" 
                    icon={Link2} 
                    iconColor={accentClass}
                    action={<span className={`text-sm font-medium ${accentClass} px-2.5 py-1 rounded-full ${bgClass}`}>{activeCount} linked</span>}
                />
                <div className="p-5 pt-2">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {[1, 2].map(i => (
                                <div key={i} className="animate-pulse p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeCount === 0 ? (
                        <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                            <Link2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200">No active associations</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Accepted hospital and clinic references will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {associations.map((association) => (
                                <div key={association.associationId} className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-lg shrink-0 ${association.facilityType === 'hospital' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate" title={association.name}>{association.name}</h4>
                                                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${association.facilityType === 'hospital' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'}`}>
                                                    {association.label}
                                                </span>
                                            </div>
                                            {association.associatedAt && (
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Linked on {new Date(association.associatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                            )}
                                            
                                            <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="truncate">{association.phone || 'Phone not available'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="truncate">{association.email || 'Email not available'}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                    <span className="line-clamp-1" title={formatAddress(association)}>{formatAddress(association)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardCard>
        </div>
    );
}
