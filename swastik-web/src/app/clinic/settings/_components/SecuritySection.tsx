'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle,
    Check,
    KeyRound,
    Laptop,
    Lock,
    MonitorSmartphone,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SettingsSection, SectionLoader, StatusMessage, type SectionStatus } from './SettingsSection';

interface Session {
    id: string;
    device_info: string | null;
    ip_address: string | null;
    last_active: string | null;
    created_at: string | null;
    expires_at: string | null;
    is_current: boolean;
}

interface LoginEntry {
    id: string;
    email: string | null;
    ip_address: string | null;
    device_info: string | null;
    status: string;
    reason: string | null;
    created_at: string | null;
}

const formatDate = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const shortDevice = (device: string | null) => {
    if (!device) return 'Unknown device';
    const match = device.match(/\(([^;]+);/);
    if (match) return match[1].trim();
    if (device.length > 40) return `${device.slice(0, 40)}…`;
    return device;
};

const DEVICE_ICON = {
    laptop: Laptop,
    phone: Smartphone,
    default: MonitorSmartphone,
};

function deviceIcon(device: string | null) {
    const value = (device || '').toLowerCase();
    if (/mobile|android|iphone|ios/.test(value)) return DEVICE_ICON.phone;
    if (/macintosh|windows|linux|chrome os|ipad/.test(value)) return DEVICE_ICON.laptop;
    return DEVICE_ICON.default;
}

export function SecuritySection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [history, setHistory] = useState<LoginEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [busySessionId, setBusySessionId] = useState<string | null>(null);
    const [isSigningOutAll, setIsSigningOutAll] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);
    const { dialogProps, confirm } = useConfirmDialog();

    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setStatus(null);
        try {
            const [sessionsRes, historyRes] = await Promise.all([authApi.getSessions(), authApi.getLoginHistory()]);
            if (!sessionsRes.success) throw new Error(sessionsRes.error || 'Failed to load sessions');
            if (!historyRes.success) throw new Error(historyRes.error || 'Failed to load login history');
            setSessions((sessionsRes.data as Session[]) || []);
            setHistory((historyRes.data as LoginEntry[]) || []);
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load security data.');
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            setStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
            return;
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            setStatus({ type: 'error', message: 'New password must include an uppercase letter, a lowercase letter and a number.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'New password and confirmation do not match.' });
            return;
        }
        setIsChangingPassword(true);
        setStatus(null);
        try {
            const res = await authApi.changePassword(currentPassword, newPassword);
            if (res.success) {
                setStatus({ type: 'success', message: 'Password changed. All devices, including this one, were signed out.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                void fetchData();
            } else {
                setStatus({ type: 'error', message: res.error || 'Failed to change password.' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setIsChangingPassword(false);
    };

    const handleSignOutDevice = async (session: Session) => {
        if (session.is_current) return;
        const ok = await confirm({
            title: 'Sign out this device?',
            message: `"${shortDevice(session.device_info)}" will be signed out and lose access to your clinic.`,
            confirmLabel: 'Sign Out',
            variant: 'danger',
        });
        if (!ok) return;
        setBusySessionId(session.id);
        setStatus(null);
        try {
            const res = await authApi.logoutDevice(session.id);
            setStatus({
                type: res.success ? 'success' : 'error',
                message: res.success ? 'Device signed out.' : res.error || 'Failed to sign out device.',
            });
            if (res.success) void fetchData();
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setBusySessionId(null);
    };

    const handleSignOutAllOthers = async () => {
        const current = sessions.find((session) => session.is_current);
        const ok = await confirm({
            title: 'Sign out all other devices?',
            message: 'Every other signed-in device will lose access to your clinic account.',
            confirmLabel: 'Sign Out All',
            variant: 'danger',
        });
        if (!ok) return;
        setIsSigningOutAll(true);
        setStatus(null);
        try {
            const res = await authApi.logoutAllDevices(current?.id);
            setStatus({
                type: res.success ? 'success' : 'error',
                message: res.success ? 'All other devices signed out.' : res.error || 'Failed to sign out devices.',
            });
            if (res.success) void fetchData();
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setIsSigningOutAll(false);
    };

    const currentSessionId = sessions.find((session) => session.is_current)?.id;

    return (
        <SettingsSection
            id="security"
            title="Security"
            description="Password, active sessions and recent sign-in activity."
            icon={<ShieldCheck className="h-5 w-5" />}
            actions={
                !isLoading && sessions.length > 1 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSignOutAllOthers()}
                        isLoading={isSigningOutAll}
                        leftIcon={<X className="h-4 w-4" />}
                    >
                        Sign Out All Other Devices
                    </Button>
                )
            }
        >
            {isLoading ? (
                <SectionLoader />
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-10">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchData()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <StatusMessage status={status} />

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Change password</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Input
                                label="Current password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <Input
                                label="New password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Input
                                label="Confirm new password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <Button
                            className="mt-3"
                            size="sm"
                            onClick={() => void handleChangePassword()}
                            isLoading={isChangingPassword}
                            leftIcon={<Lock className="h-4 w-4" />}
                        >
                            Update Password
                        </Button>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <MonitorSmartphone className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active sessions ({sessions.length})</h4>
                        </div>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No active sessions found.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700">
                                {sessions.map((session) => {
                                    const Icon = deviceIcon(session.device_info);
                                    return (
                                        <li key={session.id} className="flex items-center justify-between gap-4 p-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-2 truncate font-medium text-gray-900 dark:text-gray-100">
                                                        {shortDevice(session.device_info)}
                                                        {session.is_current && (
                                                            <span className="rounded-full bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 text-xs font-medium text-primary-600 dark:text-primary-300">
                                                                This device
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                                        {session.ip_address ? `IP ${session.ip_address} · ` : ''}
                                                        Last active {formatDate(session.last_active)}
                                                    </p>
                                                </div>
                                            </div>
                                            {!session.is_current && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void handleSignOutDevice(session)}
                                                    isLoading={busySessionId === session.id}
                                                >
                                                    Sign Out
                                                </Button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent sign-in activity</h4>
                        </div>
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No recent sign-in activity recorded.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700">
                                {history.slice(0, 10).map((entry) => (
                                    <li key={entry.id} className="flex items-center justify-between gap-4 p-4">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                                                {entry.email || 'Sign-in attempt'}
                                            </p>
                                            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                                {shortDevice(entry.device_info)}
                                                {entry.ip_address ? ` · ${entry.ip_address}` : ''} · {formatDate(entry.created_at)}
                                                {entry.status === 'failed' && entry.reason ? ` · ${entry.reason}` : ''}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                entry.status === 'success'
                                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                            }`}
                                        >
                                            {entry.status === 'success' ? 'Success' : 'Failed'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Two-factor authentication</h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Two-factor authentication is not available yet. Admin-approved security audit logs can be requested
                            through the admin console.
                        </p>
                    </div>
                    <ConfirmDialog {...dialogProps} />
                </div>
            )}
        </SettingsSection>
    );
}
