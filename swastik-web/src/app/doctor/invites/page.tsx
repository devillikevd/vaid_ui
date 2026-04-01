'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Clock3, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

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
        fetchInvites();
    }, [fetchInvites]);

    const pendingInvites = useMemo(
        () => invites.filter((invite) => invite.status === 'pending'),
        [invites]
    );

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
        } catch {
            toast.error('Action failed', 'Network error. Please try again.');
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Provider Invites</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Accept hospital or clinic invites to get assigned to those rosters.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchInvites} leftIcon={<RefreshCw className="h-4 w-4" />}>
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Invites ({pendingInvites.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading invites...</div>
                    ) : pendingInvites.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                            No pending invites.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingInvites.map((invite) => {
                                const providerName = invite.provider?.name || invite.providerLabel;
                                const location = [invite.provider?.city, invite.provider?.address]
                                    .filter(Boolean)
                                    .join(' • ');
                                const invitedBy = invite.invitedBy?.name || invite.invitedBy?.email || 'Hospital Admin';

                                return (
                                    <div
                                        key={invite.id}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
                                                    <Building2 className="h-4 w-4 text-teal-600" />
                                                    <span>{providerName}</span>
                                                </div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                                                    {invite.providerLabel} Invite
                                                </p>
                                                {location && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{location}</p>
                                                )}
                                                {invite.kind === 'hospital' ? (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Department: {invite.department || 'General'}
                                                    </p>
                                                ) : null}
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Invited by {invitedBy}
                                                </p>
                                                {invite.expires_at && (
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        Expires {new Date(invite.expires_at).toLocaleString('en-IN')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    leftIcon={<XCircle className="h-4 w-4" />}
                                                    isLoading={actionId === invite.id}
                                                    disabled={actionId === invite.id}
                                                    onClick={() => handleRespond(invite, 'reject')}
                                                >
                                                    Reject
                                                </Button>
                                                <Button
                                                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                                                    isLoading={actionId === invite.id}
                                                    disabled={actionId === invite.id}
                                                    onClick={() => handleRespond(invite, 'accept')}
                                                >
                                                    Accept
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
