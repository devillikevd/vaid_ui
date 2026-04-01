'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Loader2,
    RefreshCw,
    UserPlus,
    X,
    Mail,
    Phone,
    MapPin,
    Link2,
    Building2,
    Unlink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';

interface AssociationRecord {
    associationId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    associatedAt?: string | null;
    providerId?: string;
}

interface ActionResponse {
    success?: boolean;
    error?: string;
    message?: string;
    data?: unknown;
}

interface FacilityAssociationManagerProps {
    title: string;
    subtitle: string;
    providerLabel: string;
    accentClass?: string;
    emptyStateTitle: string;
    emptyStateDescription: string;
    inviteHint: string;
    fetchAssociations: () => Promise<ActionResponse>;
    sendInvite: (email: string) => Promise<ActionResponse>;
    unlinkAssociation: (providerId: string) => Promise<ActionResponse>;
}

export default function FacilityAssociationManager({
    title,
    subtitle,
    providerLabel,
    accentClass = 'text-teal-600',
    emptyStateTitle,
    emptyStateDescription,
    inviteHint,
    fetchAssociations,
    sendInvite,
    unlinkAssociation,
}: FacilityAssociationManagerProps) {
    const toast = useToast();
    const toastRef = useRef(toast);
    const { dialogProps, confirm } = useConfirmDialog();
    const [associations, setAssociations] = useState<AssociationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const loadAssociations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchAssociations();
            if (!response.success) {
                toastRef.current.error(`Unable to load ${providerLabel.toLowerCase()} associations`, response.error || 'Please try again.');
                setAssociations([]);
                return;
            }

            setAssociations(Array.isArray(response.data) ? response.data as AssociationRecord[] : []);
        } catch {
            toastRef.current.error(`Unable to load ${providerLabel.toLowerCase()} associations`, 'Network error. Please try again.');
            setAssociations([]);
        } finally {
            setLoading(false);
        }
    }, [fetchAssociations, providerLabel]);

    useEffect(() => {
        void loadAssociations();
    }, [loadAssociations]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        setActionLoading('invite');
        try {
            const response = await sendInvite(inviteEmail.trim());
            if (!response.success) {
                toastRef.current.error(`Unable to invite ${providerLabel.toLowerCase()}`, response.error || 'Please try again.');
                return;
            }

            toastRef.current.success('Invite sent', typeof response.message === 'string' ? response.message : `${providerLabel} must accept before it appears here.`);
            setInviteEmail('');
            setShowInviteModal(false);
            await loadAssociations();
        } catch {
            toastRef.current.error(`Unable to invite ${providerLabel.toLowerCase()}`, 'Network error. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnlink = async (record: AssociationRecord) => {
        if (!record.providerId) return;

        const confirmed = await confirm({
            title: `Unlink ${providerLabel}`,
            message: `Remove ${record.name} from this associated ${providerLabel.toLowerCase()} list? This only removes the association. ${providerLabel} workflows and patient-facing availability stay managed in the ${providerLabel.toLowerCase()} portal.`,
            confirmLabel: 'Unlink',
            variant: 'danger',
        });

        if (!confirmed) return;

        setActionLoading(record.providerId);
        try {
            const response = await unlinkAssociation(record.providerId);
            if (!response.success) {
                toastRef.current.error(`Unable to unlink ${providerLabel.toLowerCase()}`, response.error || 'Please try again.');
                return;
            }

            toastRef.current.success('Association removed', `${record.name} is no longer linked here.`);
            await loadAssociations();
        } catch {
            toastRef.current.error(`Unable to unlink ${providerLabel.toLowerCase()}`, 'Network error. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const renderAddress = (record: AssociationRecord) => {
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
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => void loadAssociations()}
                        leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                    >
                        Refresh
                    </Button>
                    <Button onClick={() => setShowInviteModal(true)} leftIcon={<UserPlus className="h-4 w-4" />}>
                        Invite {providerLabel}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <div className="font-medium">Association only</div>
                        <p className="mt-1">
                            Hospital and clinic portals only keep lightweight association details here. Inventory, orders, test catalog, bookings, and all patient-serving workflows stay managed inside the {providerLabel.toLowerCase()} portal itself.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Associated {providerLabel === 'Pharmacy' ? 'Pharmacies' : 'Diagnostic Centers'}</CardTitle>
                    <span className={`text-sm font-medium ${accentClass}`}>{associations.length} linked</span>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex min-h-[220px] items-center justify-center">
                            <Loader2 className={`h-8 w-8 animate-spin ${accentClass}`} />
                        </div>
                    ) : associations.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
                            <Link2 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="mt-3 text-base font-medium text-gray-900 dark:text-gray-100">{emptyStateTitle}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{emptyStateDescription}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {associations.map((record) => (
                                <div
                                    key={record.associationId}
                                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className={`h-4 w-4 ${accentClass}`} />
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">{record.name}</p>
                                            </div>
                                            {record.associatedAt ? (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Linked on {new Date(record.associatedAt).toLocaleString('en-IN')}
                                                </p>
                                            ) : null}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => void handleUnlink(record)}
                                            disabled={actionLoading === record.providerId}
                                            leftIcon={actionLoading === record.providerId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                                        >
                                            Unlink
                                        </Button>
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span className="truncate">{record.email || 'Email not available'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{record.phone || 'Phone not available'}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                            <span>{renderAddress(record)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {showInviteModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b p-4 dark:border-gray-800">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Invite {providerLabel}</h3>
                            <button onClick={() => setShowInviteModal(false)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-4">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {inviteHint}
                            </div>
                            <Input
                                label={`${providerLabel} Owner Email *`}
                                type="email"
                                placeholder="owner@example.com"
                                value={inviteEmail}
                                onChange={(event) => setInviteEmail(event.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t p-4 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => void handleInvite()} isLoading={actionLoading === 'invite'} disabled={!inviteEmail.trim()}>
                                Send Invite
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
