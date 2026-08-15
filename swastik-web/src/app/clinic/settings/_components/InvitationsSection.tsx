'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Mail, RefreshCw, UserRound } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clinicApi } from '@/lib/api';
import { SettingsSection, SectionLoader, StatusMessage, type SectionStatus } from './SettingsSection';

interface Invite {
    id: string;
    status: string;
    createdAt: string | null;
    expiresAt: string | null;
    doctor: {
        name: string;
        specialization: string;
        email: string;
        is_approved: boolean;
    };
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Declined',
    expired: 'Expired',
    cancelled: 'Cancelled',
};

export function InvitationsSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [status, setStatus] = useState<SectionStatus | null>(null);

    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    const fetchInvites = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setStatus(null);
        try {
            const res = await clinicApi.getInvites({ page: 1, limit: 50 });
            if (res.success) {
                setInvites((res as any).data || []);
            } else {
                setLoadError(res.error || 'Failed to load invitations');
            }
        } catch {
            setLoadError('Failed to connect to server.');
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        void fetchInvites();
    }, [fetchInvites]);

    const handleInvite = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setStatus({ type: 'error', message: 'Enter a valid doctor email address.' });
            return;
        }
        setIsSending(true);
        setStatus(null);
        try {
            const res = await clinicApi.addDoctor({ email: email.trim() });
            if (res.success) {
                setStatus({ type: 'success', message: 'Invitation sent. The doctor must accept before appearing in your roster.' });
                setEmail('');
                void fetchInvites();
            } else {
                setStatus({ type: 'error', message: res.error || 'Failed to send invitation.' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setIsSending(false);
    };

    const handleCancel = async (invite: Invite) => {
        setCancellingId(invite.id);
        setStatus(null);
        try {
            const res = await clinicApi.cancelInvite(invite.id);
            setStatus({
                type: res.success ? 'success' : 'error',
                message: res.success ? 'Invitation withdrawn.' : res.error || 'Failed to withdraw invitation.',
            });
            if (res.success) void fetchInvites();
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setCancellingId(null);
    };

    const pending = invites.filter((invite) => invite.status === 'pending');

    return (
        <SettingsSection
            id="invitations"
            title="Staff Invitations"
            description="Invite doctors to join your clinic. Only existing doctor accounts can be invited."
            icon={<Mail className="h-5 w-5" />}
            actions={
                <Link
                    href="/clinic/doctors?tab=invites"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    All Invitations <ArrowRight className="h-4 w-4" />
                </Link>
            }
        >
            {isLoading ? (
                <SectionLoader />
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-10">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchInvites()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <StatusMessage status={status} />
                    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Input
                                label="Doctor email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="doctor@example.com"
                            />
                        </div>
                        <Button onClick={() => void handleInvite()} isLoading={isSending} leftIcon={<Mail className="h-4 w-4" />}>
                            Send Invitation
                        </Button>
                    </div>
                    {pending.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Pending invitations ({pending.length})
                            </h4>
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700">
                                {pending.map((invite) => (
                                    <li key={invite.id} className="flex items-center justify-between gap-4 p-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
                                                <UserRound className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                                                    {invite.doctor.name}
                                                </p>
                                                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                                    {invite.doctor.specialization || 'Doctor'} · {invite.doctor.email || 'Email pending'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleCancel(invite)}
                                            disabled={cancellingId === invite.id}
                                            className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            {cancellingId === invite.id ? 'Withdrawing...' : 'Withdraw'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {invites.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No invitations yet.</p>
                        </div>
                    )}
                    {invites.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">History</h4>
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700">
                                {invites.filter((invite) => invite.status !== 'pending').slice(0, 6).map((invite) => (
                                    <li key={invite.id} className="flex items-center justify-between gap-4 p-4">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-gray-900 dark:text-gray-100">{invite.doctor.name}</p>
                                            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{invite.doctor.email || 'Doctor'}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {STATUS_LABEL[invite.status] || invite.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </SettingsSection>
    );
}
