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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
    accentClass = 'text-orange-600',
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

    const formatAddress = (record: { address?: string; city?: string; state?: string }) => {
        const location = [record.city, record.state].filter(Boolean).join(', ');
        if (record.address && location) return `${record.address} • ${location}`;
        return record.address || location || 'Address not available';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
                </div>
                <Button variant="outline" onClick={() => void loadData()} leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
                    Refresh
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <div className="font-medium">Operational ownership stays here</div>
                        <p className="mt-1">
                            These links only let hospitals and clinics reference your {providerLabel.toLowerCase()} as an associated provider. Inventory, orders, tests, bookings, and patient-facing workflows remain fully managed from the {providerLabel.toLowerCase()} portal.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Pending Invites</CardTitle>
                    <span className={`text-sm font-medium ${accentClass}`}>{pendingInvites.length} pending</span>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex min-h-[160px] items-center justify-center">
                            <Loader2 className={`h-8 w-8 animate-spin ${accentClass}`} />
                        </div>
                    ) : pendingInvites.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
                            <Clock3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="mt-3 text-base font-medium text-gray-900 dark:text-gray-100">No pending invites</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">New hospital or clinic invites will appear here for acceptance.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingInvites.map((invite) => (
                                <div key={invite.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className={`h-4 w-4 ${accentClass}`} />
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">{invite.facility?.name || 'Facility'}</p>
                                            </div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                {(invite.facility?.label || invite.facility_type || 'Facility')} invite
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{formatAddress(invite.facility || {})}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Invited by {invite.invitedBy?.name || invite.invitedBy?.email || 'Provider Admin'}
                                            </p>
                                            {invite.expires_at ? (
                                                <p className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    Expires {new Date(invite.expires_at).toLocaleString('en-IN')}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                disabled={actionId === invite.id}
                                                isLoading={actionId === invite.id}
                                                leftIcon={<XCircle className="h-4 w-4" />}
                                                onClick={() => void handleRespond(invite.id, 'reject')}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                disabled={actionId === invite.id}
                                                isLoading={actionId === invite.id}
                                                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                                                onClick={() => void handleRespond(invite.id, 'accept')}
                                            >
                                                Accept
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Current Associations</CardTitle>
                    <span className={`text-sm font-medium ${accentClass}`}>{associations.length} linked</span>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex min-h-[160px] items-center justify-center">
                            <Loader2 className={`h-8 w-8 animate-spin ${accentClass}`} />
                        </div>
                    ) : associations.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
                            <Link2 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="mt-3 text-base font-medium text-gray-900 dark:text-gray-100">No active associations</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Accepted hospital and clinic links will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {associations.map((association) => (
                                <div key={association.associationId} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Building2 className={`h-4 w-4 ${accentClass}`} />
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{association.name}</p>
                                        </div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            {association.label}
                                        </p>
                                        {association.associatedAt ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Linked on {new Date(association.associatedAt).toLocaleString('en-IN')}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span className="truncate">{association.email || 'Email not available'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{association.phone || 'Phone not available'}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                            <span>{formatAddress(association)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
