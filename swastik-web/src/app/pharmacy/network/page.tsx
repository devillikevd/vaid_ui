'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    Network, Search, Plus, X, RefreshCw, AlertCircle, Loader2,
    Building2, TestTube2, Activity, MapPin, Phone, Mail,
    Calendar, CheckCircle, Clock, ChevronRight, XCircle, History,
    Send, Users, ShieldCheck, Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { pharmacyApi, discoveryApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'hospital' | 'diagnostic_center' | 'clinic' | 'invitations' | 'history';
type DiscoveryType = 'hospital' | 'diagnostic_center' | 'clinic';

interface NetworkConnection {
    /** Unique record ID (partnership id or association id) */
    id: string;
    /** 'partnership' or 'association' — affects which backend actions are available */
    source: 'partnership' | 'association';
    status: string; // active | pending | terminated | rejected | cancelled | accepted
    partnerType: string;
    partnerId: string;
    partnerName: string;
    partnerCity?: string;
    partnerState?: string;
    partnerAddress?: string;
    partnerPhone?: string;
    partnerEmail?: string;
    connectedAt?: string;
    isInitiator?: boolean;
}

interface PendingInvitation {
    id: string;
    source: 'partnership' | 'association';
    facilityType?: string;
    facilitName?: string;
    partnerName: string;
    partnerType: string;
    partnerCity?: string;
    partnerState?: string;
    createdAt: string;
    expiresAt?: string;
    status: string;
}

interface DiscoveredOrg {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    city?: string;
    state?: string;
    address?: string;
    phone?: string;
    email?: string;
    rating?: number;
    is_verified?: boolean;
    relationship_status: string; // not_connected | connected | invitation_sent | invitation_received | former
    partnership_id?: string;
    can_request_partnership?: boolean;
    can_reconnect?: boolean;
    is_connected?: boolean;
    is_pending?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getOrgIcon(type: string) {
    if (type === 'hospital') return <Building2 className="h-5 w-5" />;
    if (type === 'diagnostic_center') return <TestTube2 className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
}

function getOrgTypeLabel(type: string) {
    if (type === 'hospital') return 'Hospital';
    if (type === 'diagnostic_center') return 'Diagnostic Lab';
    if (type === 'clinic') return 'Clinic';
    return type;
}

function StatusBadge({ status, source }: { status: string; source: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        active: { label: 'Active', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
        accepted: { label: 'Active', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
        pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
        terminated: { label: 'Former', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
        rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
        cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    };
    const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
            {(status === 'active' || status === 'accepted') && (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
            {label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery Drawer
// ─────────────────────────────────────────────────────────────────────────────

function DiscoveryDrawer({
    isOpen,
    onClose,
    onConnected,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConnected: () => void;
}) {
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [orgType, setOrgType] = useState<DiscoveryType>('hospital');
    const [results, setResults] = useState<DiscoveredOrg[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    const runSearch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await discoveryApi.discoverOrganizations({ type: orgType, query: debouncedQuery, limit: 30 });
            if (res.success) {
                setResults((res.data as DiscoveredOrg[]) || []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [orgType, debouncedQuery]);

    useEffect(() => {
        if (isOpen) runSearch();
    }, [isOpen, orgType, debouncedQuery, runSearch]);

    const handleConnect = async (org: DiscoveredOrg) => {
        setActionLoading(org.id);
        try {
            const res = await pharmacyApi.invitePartnership({ targetType: org.type, targetId: org.id });
            if (res.success) {
                toast.success(`Connection request sent to ${org.name}`);
                runSearch();
                onConnected();
            } else {
                toast.error((res.error as string) || 'Failed to send connection request');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to send connection request');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReconnect = async (org: DiscoveredOrg) => {
        setActionLoading(org.id);
        try {
            const res = await pharmacyApi.invitePartnership({ targetType: org.type, targetId: org.id });
            if (res.success) {
                toast.success(`Reconnection request sent to ${org.name}`);
                runSearch();
                onConnected();
            } else {
                toast.error((res.error as string) || 'Failed to send reconnection request');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to reconnect');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    const typeFilters: { value: DiscoveryType; label: string; icon: React.ReactNode }[] = [
        { value: 'hospital', label: 'Hospitals', icon: <Building2 className="h-3.5 w-3.5" /> },
        { value: 'diagnostic_center', label: 'Diagnostic Labs', icon: <TestTube2 className="h-3.5 w-3.5" /> },
        { value: 'clinic', label: 'Clinics', icon: <Activity className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-[var(--surface-card,#fff)] shadow-2xl dark:bg-gray-900"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border,#e5e7eb)] p-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-[var(--text-primary,#111)]">Find Organization</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Type filters */}
                <div className="flex gap-2 border-b border-[var(--border,#e5e7eb)] px-4 py-3 dark:border-gray-800">
                    {typeFilters.map(tf => (
                        <button
                            key={tf.value}
                            onClick={() => setOrgType(tf.value)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                orgType === tf.value
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                        >
                            {tf.icon} {tf.label}
                        </button>
                    ))}
                </div>

                {/* Search input */}
                <div className="relative px-4 py-3 border-b border-[var(--border,#e5e7eb)] dark:border-gray-800">
                    <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${getOrgTypeLabel(orgType)}s by name or city…`}
                        className="w-full rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--text-primary,#111)] placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:text-gray-100"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            <span className="ml-2 text-sm text-gray-500">Searching…</span>
                        </div>
                    )}
                    {!loading && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Search className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm font-medium text-[var(--text-primary,#111)]">No organizations found</p>
                            <p className="mt-1 text-xs text-gray-500">Try a different search term or type.</p>
                        </div>
                    )}
                    {!loading && results.map(org => {
                        const isActLoading = actionLoading === org.id;
                        return (
                            <div
                                key={org.id}
                                className="rounded-xl border border-[var(--border,#e5e7eb)] p-4 dark:border-gray-800 bg-[var(--surface-card,#fff)] dark:bg-gray-900/50 hover:border-orange-200 dark:hover:border-orange-900/40 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="mt-0.5 rounded-lg bg-orange-50 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 shrink-0">
                                            {getOrgIcon(org.type)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[var(--text-primary,#111)] truncate">{org.name}</p>
                                            <p className="text-xs text-gray-500">{org.typeLabel}</p>
                                            {(org.city || org.state) && (
                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                                                    <MapPin className="h-3 w-3" />
                                                    {[org.city, org.state].filter(Boolean).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {org.relationship_status === 'connected' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle className="h-3 w-3" /> Connected
                                            </span>
                                        )}
                                        {org.relationship_status === 'invitation_sent' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                <Clock className="h-3 w-3" /> Request Sent
                                            </span>
                                        )}
                                        {org.relationship_status === 'invitation_received' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                <Clock className="h-3 w-3" /> Incoming Invite
                                            </span>
                                        )}
                                        {(org.relationship_status === 'former' || org.can_reconnect) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReconnect(org)}
                                                disabled={isActLoading}
                                                leftIcon={isActLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                            >
                                                Reconnect
                                            </Button>
                                        )}
                                        {(!org.relationship_status || org.relationship_status === 'not_connected' || org.can_request_partnership) && org.relationship_status !== 'connected' && org.relationship_status !== 'invitation_sent' && org.relationship_status !== 'invitation_received' && org.relationship_status !== 'former' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleConnect(org)}
                                                disabled={isActLoading}
                                                leftIcon={isActLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                            >
                                                Connect
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────

function ConnectionDetailDrawer({
    connection,
    onClose,
    onTerminate,
    onAccept,
    onDecline,
    actionLoading,
}: {
    connection: NetworkConnection | PendingInvitation | null;
    onClose: () => void;
    onTerminate?: (id: string, source: string) => void;
    onAccept?: (id: string, source: string) => void;
    onDecline?: (id: string, source: string) => void;
    actionLoading: string | null;
}) {
    if (!connection) return null;

    const isPartnership = connection.source === 'partnership';
    const conn = connection as NetworkConnection;
    const inv = connection as PendingInvitation;
    const isPending = connection.status === 'pending';
    const isActive = connection.status === 'active' || connection.status === 'accepted';
    const isHistory = ['terminated', 'rejected', 'cancelled'].includes(connection.status);
    const isLoading = actionLoading === connection.id;

    const name = conn.partnerName || inv.partnerName || 'Organization';
    const type = conn.partnerType || inv.partnerType || '';
    const city = conn.partnerCity || (inv as any).partnerCity;
    const state = conn.partnerState || (inv as any).partnerState;

    return (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[var(--surface-card,#fff)] shadow-2xl dark:bg-gray-900"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border,#e5e7eb)] p-4 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-[var(--text-primary,#111)]">Connection Details</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Org profile */}
                    <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-orange-50 p-4 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                            {getOrgIcon(type)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-primary,#111)]">{name}</h3>
                            <div className="mt-1 flex flex-wrap gap-2">
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    {getOrgTypeLabel(type)}
                                </span>
                                <StatusBadge status={connection.status} source={connection.source} />
                                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                    via {isPartnership ? 'Partnership' : 'Association'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <hr className="border-[var(--border,#e5e7eb)] dark:border-gray-800" />

                    {/* Relationship info */}
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Relationship</p>
                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50 space-y-2 text-sm">
                            {isActive && conn.connectedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Connected Since</span>
                                    <span className="font-medium text-[var(--text-primary,#111)]">{formatDate(conn.connectedAt)}</span>
                                </div>
                            )}
                            {isPending && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Requested On</span>
                                    <span className="font-medium text-[var(--text-primary,#111)]">{formatDate(inv.createdAt)}</span>
                                </div>
                            )}
                            {isHistory && (conn as any).connectedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Last Active</span>
                                    <span className="font-medium text-[var(--text-primary,#111)]">{formatDate((conn as any).connectedAt)}</span>
                                </div>
                            )}
                            {isPartnership && isPending && conn.isInitiator === false && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    This organization has sent you a connection request.
                                </p>
                            )}
                            {isPartnership && isPending && conn.isInitiator === true && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    You sent a connection request to this organization.
                                </p>
                            )}
                            {!isPartnership && (
                                <p className="text-xs text-gray-500">
                                    This organization invited your pharmacy to their network.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    {(city || state || conn.partnerAddress) && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Location</p>
                            <div className="rounded-xl border border-[var(--border,#e5e7eb)] p-4 dark:border-gray-800 space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div className="text-[var(--text-primary,#111)]">
                                        {conn.partnerAddress && <p>{conn.partnerAddress}</p>}
                                        <p>{[city, state].filter(Boolean).join(', ')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contact */}
                    {(conn.partnerPhone || conn.partnerEmail) && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</p>
                            <div className="rounded-xl border border-[var(--border,#e5e7eb)] p-4 dark:border-gray-800 space-y-3 text-sm">
                                {conn.partnerPhone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-[var(--text-primary,#111)]">{conn.partnerPhone}</span>
                                    </div>
                                )}
                                {conn.partnerEmail && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-[var(--text-primary,#111)]">{conn.partnerEmail}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions footer */}
                <div className="border-t border-[var(--border,#e5e7eb)] p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
                    {/* Active partnership — can terminate */}
                    {isActive && isPartnership && (
                        <div className="flex justify-between gap-2">
                            <Button variant="outline" onClick={onClose}>Close</Button>
                            <Button
                                variant="outline"
                                onClick={() => onTerminate?.(connection.id, connection.source)}
                                disabled={isLoading}
                                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            >
                                End Connection
                            </Button>
                        </div>
                    )}

                    {/* Active association — view only, no terminate */}
                    {isActive && !isPartnership && (
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={onClose}>Close</Button>
                        </div>
                    )}

                    {/* Pending invite received (partnership, not initiator) */}
                    {isPending && isPartnership && conn.isInitiator === false && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                                onClick={() => onDecline?.(connection.id, connection.source)}
                                disabled={isLoading}
                                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            >
                                Decline
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => onAccept?.(connection.id, connection.source)}
                                disabled={isLoading}
                                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            >
                                Accept
                            </Button>
                        </div>
                    )}

                    {/* Pending facility invite (association) */}
                    {isPending && !isPartnership && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                                onClick={() => onDecline?.(connection.id, connection.source)}
                                disabled={isLoading}
                                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            >
                                Decline
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => onAccept?.(connection.id, connection.source)}
                                disabled={isLoading}
                                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            >
                                Accept
                            </Button>
                        </div>
                    )}

                    {/* Sent pending (initiator) — can only cancel */}
                    {isPending && isPartnership && conn.isInitiator === true && (
                        <div className="flex justify-between gap-2">
                            <Button variant="outline" onClick={onClose}>Close</Button>
                            <Button
                                variant="outline"
                                onClick={() => onDecline?.(connection.id, connection.source)}
                                disabled={isLoading}
                                className="border-gray-300 text-gray-600"
                                leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            >
                                Cancel Request
                            </Button>
                        </div>
                    )}

                    {/* History — close only */}
                    {isHistory && (
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={onClose}>Close</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
            <div className="rounded-lg p-2 bg-white/60 dark:bg-black/20">
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MyNetworkPage() {
    const toast = useToast();

    // ── State ──
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [assocInvites, setAssocInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [selectedItem, setSelectedItem] = useState<NetworkConnection | PendingInvitation | null>(null);

    // ── Data Loading ──
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [partRes, assocRes, invRes] = await Promise.all([
                pharmacyApi.getPartnerships(),
                pharmacyApi.getAssociations(),
                pharmacyApi.getAssociationInvites(),
            ]);
            setPartnerships((partRes.data as any[]) || []);
            setAssociations((assocRes.data as any[]) || []);
            setAssocInvites((invRes.data as any[]) || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load network data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Normalize data into unified NetworkConnection format ──
    const allConnections: NetworkConnection[] = useMemo(() => {
        const connections: NetworkConnection[] = [];

        // From organization_partnerships
        for (const p of partnerships) {
            const partner = p.partner || {};
            connections.push({
                id: p.id,
                source: 'partnership',
                status: p.status,
                partnerType: partner.type || '',
                partnerId: partner.id || '',
                partnerName: partner.name || 'Unknown Organization',
                partnerCity: partner.city,
                partnerState: partner.state,
                partnerAddress: partner.address,
                partnerPhone: partner.phone,
                partnerEmail: partner.email,
                connectedAt: p.accepted_at || p.created_at,
                isInitiator: p.is_initiator,
            });
        }

        // From facility_provider_associations (active only)
        for (const a of associations) {
            connections.push({
                id: a.associationId,
                source: 'association',
                status: 'active',
                partnerType: a.facilityType || a.type || '',
                partnerId: a.facilityId || a.id || '',
                partnerName: a.name || 'Unknown Organization',
                partnerCity: a.city,
                partnerState: a.state,
                partnerAddress: a.address,
                partnerPhone: a.phone,
                partnerEmail: a.email,
                connectedAt: a.associatedAt,
                isInitiator: false,
            });
        }

        return connections;
    }, [partnerships, associations]);

    // Pending invitations: partnership invites received + association invites
    const allInvitations: NetworkConnection[] = useMemo(() => {
        const invitations: NetworkConnection[] = [];

        // Pending org_partnerships (received by pharmacy — not initiator)
        for (const p of partnerships) {
            if (p.status === 'pending') {
                const partner = p.partner || {};
                invitations.push({
                    id: p.id,
                    source: 'partnership',
                    status: 'pending',
                    partnerType: partner.type || '',
                    partnerId: partner.id || '',
                    partnerName: partner.name || 'Unknown Organization',
                    partnerCity: partner.city,
                    partnerState: partner.state,
                    connectedAt: p.created_at,
                    isInitiator: p.is_initiator,
                });
            }
        }

        // Pending facility invites (from hospitals/clinics)
        for (const inv of assocInvites) {
            if (inv.status === 'pending') {
                const facility = inv.facility || {};
                invitations.push({
                    id: inv.id,
                    source: 'association',
                    status: 'pending',
                    partnerType: inv.facility_type || '',
                    partnerId: inv.facility_id || '',
                    partnerName: facility.name || 'Unknown Organization',
                    partnerCity: facility.city,
                    partnerState: facility.state,
                    connectedAt: inv.created_at,
                    isInitiator: false,
                });
            }
        }

        return invitations;
    }, [partnerships, assocInvites]);

    // History: terminated/rejected/cancelled partnerships
    const historyConnections: NetworkConnection[] = useMemo(() => {
        return partnerships
            .filter(p => ['terminated', 'rejected', 'cancelled'].includes(p.status))
            .map(p => {
                const partner = p.partner || {};
                return {
                    id: p.id,
                    source: 'partnership' as const,
                    status: p.status,
                    partnerType: partner.type || '',
                    partnerId: partner.id || '',
                    partnerName: partner.name || 'Unknown Organization',
                    partnerCity: partner.city,
                    partnerState: partner.state,
                    connectedAt: p.accepted_at || p.created_at,
                    isInitiator: p.is_initiator,
                };
            });
    }, [partnerships]);

    // Active connections only
    const activeConnections = useMemo(() =>
        allConnections.filter(c => c.status === 'active' || c.status === 'accepted'),
        [allConnections]
    );

    // ── Stats ──
    const stats = useMemo(() => ({
        active: activeConnections.length,
        pending: allInvitations.length,
        hospitals: activeConnections.filter(c => c.partnerType === 'hospital').length,
        diagnosticLabs: activeConnections.filter(c => c.partnerType === 'diagnostic_center').length,
        clinics: activeConnections.filter(c => c.partnerType === 'clinic').length,
    }), [activeConnections, allInvitations]);

    // ── Filtered list for current tab ──
    const displayedItems = useMemo(() => {
        let items: NetworkConnection[] = [];
        if (activeTab === 'all') items = activeConnections;
        else if (activeTab === 'invitations') items = allInvitations;
        else if (activeTab === 'history') items = historyConnections;
        else items = activeConnections.filter(c => c.partnerType === activeTab);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(c =>
                c.partnerName.toLowerCase().includes(q) ||
                (c.partnerCity || '').toLowerCase().includes(q) ||
                (c.partnerState || '').toLowerCase().includes(q)
            );
        }
        return items;
    }, [activeTab, activeConnections, allInvitations, historyConnections, searchQuery]);

    // ── Actions ──
    const handleAccept = async (id: string, source: string) => {
        setActionLoading(id);
        try {
            let res;
            if (source === 'partnership') {
                res = await pharmacyApi.respondPartnership(id, 'accept');
            } else {
                res = await pharmacyApi.respondToAssociationInvite(id, 'accept');
            }
            if (res.success) {
                toast.success('Connection accepted successfully');
                setSelectedItem(null);
                loadData();
            } else {
                toast.error((res.error as string) || 'Failed to accept');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to accept');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (id: string, source: string) => {
        setActionLoading(id);
        try {
            let res;
            if (source === 'partnership') {
                const item = allConnections.find(c => c.id === id) || allInvitations.find(c => c.id === id);
                const action = item?.isInitiator ? 'cancel' : 'reject';
                // Use respondPartnership for decline (reject) and cancelRequest (cancel) — both map to same endpoint
                res = await pharmacyApi.respondPartnership(id, 'reject');
            } else {
                res = await pharmacyApi.respondToAssociationInvite(id, 'reject');
            }
            if (res.success) {
                toast.success('Invitation declined');
                setSelectedItem(null);
                loadData();
            } else {
                toast.error((res.error as string) || 'Failed to decline');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to decline');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTerminate = async (id: string, source: string) => {
        if (source !== 'partnership') return; // associations can't be terminated from pharmacy side
        setActionLoading(id);
        try {
            const res = await pharmacyApi.terminatePartnership(id);
            if (res.success) {
                toast.success('Connection ended');
                setSelectedItem(null);
                loadData();
            } else {
                toast.error((res.error as string) || 'Failed to end connection');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to end connection');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Tabs config ──
    const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
        { key: 'all', label: 'All', count: activeConnections.length, icon: <Network className="h-3.5 w-3.5" /> },
        { key: 'hospital', label: 'Hospitals', count: stats.hospitals, icon: <Building2 className="h-3.5 w-3.5" /> },
        { key: 'diagnostic_center', label: 'Diagnostic Labs', count: stats.diagnosticLabs, icon: <TestTube2 className="h-3.5 w-3.5" /> },
        { key: 'clinic', label: 'Clinics', count: stats.clinics, icon: <Activity className="h-3.5 w-3.5" /> },
        { key: 'invitations', label: 'Invitations', count: allInvitations.length, icon: <Inbox className="h-3.5 w-3.5" /> },
        { key: 'history', label: 'History', count: historyConnections.length, icon: <History className="h-3.5 w-3.5" /> },
    ];

    // ── Render ──
    if (loading && partnerships.length === 0) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-20 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
                </div>
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
                </div>
            </div>
        );
    }

    if (error && partnerships.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <h3 className="text-lg font-semibold text-[var(--text-primary,#111)]">Unable to load your network.</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                <Button onClick={loadData} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary,#111)] flex items-center gap-2">
                        <Network className="h-6 w-6 text-orange-500" />
                        My Network
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage your connected healthcare organizations, invitations, and network relationships.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        aria-label="Refresh network"
                        leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowDiscovery(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                    >
                        Find Organization
                    </Button>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                    label="Active Connections"
                    value={stats.active}
                    icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                    color="border border-green-100 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                />
                <StatCard
                    label="Pending Invitations"
                    value={stats.pending}
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    color="border border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                />
                <StatCard
                    label="Hospitals"
                    value={stats.hospitals}
                    icon={<Building2 className="h-5 w-5 text-blue-600" />}
                    color="border border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300"
                />
                <StatCard
                    label="Diagnostic Labs"
                    value={stats.diagnosticLabs}
                    icon={<TestTube2 className="h-5 w-5 text-purple-600" />}
                    color="border border-purple-100 bg-purple-50 text-purple-800 dark:border-purple-900/40 dark:bg-purple-900/20 dark:text-purple-300"
                />
                <StatCard
                    label="Clinics"
                    value={stats.clinics}
                    icon={<Activity className="h-5 w-5 text-orange-600" />}
                    color="border border-orange-100 bg-orange-50 text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300"
                />
            </div>

            {/* ── Tabs + Search ── */}
            <Card padding="sm" className="space-y-3">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1 p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                                    activeTab === tab.key
                                        ? 'bg-orange-200 text-orange-800 dark:bg-orange-800/60 dark:text-orange-300'
                                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by organization name, city, or state…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--text-primary,#111)] placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                </div>
            </Card>

            {/* ── Connection List ── */}
            {displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
                    {activeTab === 'invitations' ? (
                        <>
                            <Inbox className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-base font-semibold text-[var(--text-primary,#111)]">No pending invitations</h3>
                            <p className="mt-1 text-sm text-gray-500">Hospital or clinic invitations will appear here.</p>
                        </>
                    ) : activeTab === 'history' ? (
                        <>
                            <History className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-base font-semibold text-[var(--text-primary,#111)]">No past connections</h3>
                            <p className="mt-1 text-sm text-gray-500">Former relationships will appear here once ended.</p>
                        </>
                    ) : searchQuery ? (
                        <>
                            <Search className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-base font-semibold text-[var(--text-primary,#111)]">No results for "{searchQuery}"</h3>
                            <p className="mt-1 text-sm text-gray-500">Try a different search term.</p>
                        </>
                    ) : (
                        <>
                            <Network className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-base font-semibold text-[var(--text-primary,#111)]">Your network is empty</h3>
                            <p className="mt-1 text-sm text-gray-500 max-w-xs">
                                Connect with hospitals, diagnostic labs, and clinics to get started.
                            </p>
                            <Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowDiscovery(true)}>
                                Find Organization
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Desktop: Table-like header */}
                    <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <span>Organization</span>
                        <span>Type</span>
                        <span>Location</span>
                        <span>Connected</span>
                        <span className="text-right">Status</span>
                    </div>

                    {displayedItems.map(item => {
                        const isPending = item.status === 'pending';
                        return (
                            <div
                                key={`${item.source}-${item.id}`}
                                onClick={() => setSelectedItem(item)}
                                className={`group cursor-pointer rounded-xl border bg-[var(--surface-card,#fff)] p-4 transition-all hover:shadow-md dark:bg-gray-900/50 ${
                                    isPending
                                        ? 'border-amber-200 dark:border-amber-900/40'
                                        : 'border-[var(--border,#e5e7eb)] hover:border-orange-200 dark:border-gray-800 dark:hover:border-orange-900/40'
                                }`}
                            >
                                {/* Mobile layout */}
                                <div className="md:hidden flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="rounded-lg bg-orange-50 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 shrink-0">
                                            {getOrgIcon(item.partnerType)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[var(--text-primary,#111)] truncate">{item.partnerName}</p>
                                            <p className="text-xs text-gray-500">{getOrgTypeLabel(item.partnerType)}</p>
                                            {(item.partnerCity || item.partnerState) && (
                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                                                    <MapPin className="h-3 w-3" />
                                                    {[item.partnerCity, item.partnerState].filter(Boolean).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <StatusBadge status={item.status} source={item.source} />
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>

                                {/* Desktop layout */}
                                <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 items-center">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="rounded-lg bg-orange-50 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 shrink-0">
                                            {getOrgIcon(item.partnerType)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[var(--text-primary,#111)] truncate">{item.partnerName}</p>
                                            <p className="text-xs text-gray-500">
                                                via {item.source === 'partnership' ? 'Partnership' : 'Association'}
                                                {isPending && item.isInitiator && ' · Sent'}
                                                {isPending && !item.isInitiator && ' · Received'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm text-[var(--text-primary,#111)]">{getOrgTypeLabel(item.partnerType)}</span>
                                    <span className="text-sm text-gray-500 truncate">
                                        {[item.partnerCity, item.partnerState].filter(Boolean).join(', ') || '—'}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {item.connectedAt ? formatDate(item.connectedAt) : '—'}
                                    </span>
                                    <div className="flex items-center justify-end gap-2">
                                        <StatusBadge status={item.status} source={item.source} />
                                        <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Drawers ── */}
            <DiscoveryDrawer
                isOpen={showDiscovery}
                onClose={() => setShowDiscovery(false)}
                onConnected={loadData}
            />
            <ConnectionDetailDrawer
                connection={selectedItem}
                onClose={() => setSelectedItem(null)}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onTerminate={handleTerminate}
                actionLoading={actionLoading}
            />
        </div>
    );
}
