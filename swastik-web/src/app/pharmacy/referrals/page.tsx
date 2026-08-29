'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Share2, Plus, Search, RefreshCw, AlertCircle, Loader2,
    ChevronRight, Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft,
    Activity, Zap
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { UniversalReferral, ReferralStatus, ReferralUrgency } from '@/types/referrals';
import { ReferralDetailsDrawer } from '@/components/referrals/ReferralDetailsDrawer';
import { CreateReferralModal } from '@/components/referrals/CreateReferralModal';
import { useToast } from '@/components/ui/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Config
// ─────────────────────────────────────────────────────────────────────────────

type ViewTab = 'all' | 'incoming' | 'outgoing' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';

const URGENCY_CONFIG: Record<ReferralUrgency, { label: string; cls: string }> = {
    routine: { label: 'Routine', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    urgent: { label: 'Urgent', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    emergency: { label: 'Emergency', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    awaiting_consent: { label: 'Awaiting Consent', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
    consent_declined: { label: 'Consent Declined', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    accepted: { label: 'Accepted', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    in_progress: { label: 'In Progress', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
    completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortId(id: string) {
    return id?.slice(0, 8).toUpperCase() || '—';
}

function UrgencyBadge({ urgency }: { urgency?: ReferralUrgency }) {
    if (!urgency) return null;
    const cfg = URGENCY_CONFIG[urgency] ?? { label: urgency, cls: 'bg-gray-100 text-gray-700' };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
            {urgency === 'emergency' && <Zap className="h-3 w-3" />}
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
            {status === 'completed' && <CheckCircle className="h-3 w-3" />}
            {status === 'in_progress' && <Activity className="h-3 w-3" />}
            {status === 'rejected' && <XCircle className="h-3 w-3" />}
            {cfg.label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Card
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={`rounded-xl border p-3 text-center ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs font-medium opacity-75">{label}</p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

function PharmacyReferralsContent() {
    const toast = useToast();
    const searchParams = useSearchParams();
    const initialSelectedId = searchParams.get('selectedId');

    const [inbox, setInbox] = useState<UniversalReferral[]>([]);
    const [sent, setSent] = useState<UniversalReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<ViewTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
    const [selectedIsSent, setSelectedIsSent] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (initialSelectedId) {
            setSelectedId(initialSelectedId);
        }
    }, [initialSelectedId]);

    // ── Load data ──
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [inboxRes, sentRes] = await Promise.all([
                api.universalReferrals.getReferralInbox({}),
                api.universalReferrals.getSentReferrals({}),
            ]);
            setInbox((inboxRes.data as unknown as UniversalReferral[]) || []);
            setSent((sentRes.data as unknown as UniversalReferral[]) || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load referrals');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Merged + deduped "all" list ──
    const allReferrals = useMemo(() => {
        const seenIds = new Set<string>();
        const merged: (UniversalReferral & { _direction: 'incoming' | 'outgoing' })[] = [];
        for (const r of [...inbox.map(r => ({ ...r, _direction: 'incoming' as const })), ...sent.map(r => ({ ...r, _direction: 'outgoing' as const }))]) {
            if (!seenIds.has(r.id)) {
                seenIds.add(r.id);
                merged.push(r);
            }
        }
        return merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }, [inbox, sent]);

    // ── Stats ──
    const stats = useMemo(() => ({
        incoming: inbox.length,
        outgoing: sent.length,
        pending: allReferrals.filter(r => r.status === 'pending').length,
        accepted: allReferrals.filter(r => r.status === 'accepted').length,
        inProgress: allReferrals.filter(r => r.status === 'in_progress').length,
        completed: allReferrals.filter(r => r.status === 'completed').length,
    }), [allReferrals, inbox, sent]);

    // ── Filtered list ──
    const displayedReferrals = useMemo(() => {
        let list = allReferrals;
        if (activeTab === 'incoming') list = allReferrals.filter(r => r._direction === 'incoming');
        else if (activeTab === 'outgoing') list = allReferrals.filter(r => r._direction === 'outgoing');
        else if (activeTab === 'pending') list = allReferrals.filter(r => r.status === 'pending');
        else if (activeTab === 'accepted') list = allReferrals.filter(r => r.status === 'accepted');
        else if (activeTab === 'in_progress') list = allReferrals.filter(r => r.status === 'in_progress');
        else if (activeTab === 'completed') list = allReferrals.filter(r => r.status === 'completed');
        else if (activeTab === 'rejected') list = allReferrals.filter(r => r.status === 'rejected' || r.status === 'cancelled');

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(r =>
                r.patient?.full_name?.toLowerCase().includes(q) ||
                r.sender_snapshot?.name?.toLowerCase().includes(q) ||
                r.receiver_snapshot?.name?.toLowerCase().includes(q) ||
                r.id?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allReferrals, activeTab, searchQuery]);

    // ── Tabs ──
    const tabs: { key: ViewTab; label: string; count?: number }[] = [
        { key: 'all', label: 'All', count: allReferrals.length },
        { key: 'incoming', label: 'Incoming', count: stats.incoming },
        { key: 'outgoing', label: 'Outgoing', count: stats.outgoing },
        { key: 'pending', label: 'Pending', count: stats.pending },
        { key: 'accepted', label: 'Accepted', count: stats.accepted },
        { key: 'in_progress', label: 'In Progress', count: stats.inProgress },
        { key: 'completed', label: 'Completed', count: stats.completed },
        { key: 'rejected', label: 'Rejected', count: allReferrals.filter(r => r.status === 'rejected' || r.status === 'cancelled').length },
    ];

    const openDetail = (ref: UniversalReferral & { _direction: 'incoming' | 'outgoing' }) => {
        setSelectedId(ref.id);
        setSelectedIsSent(ref._direction === 'outgoing');
    };

    // ── Skeleton ──
    if (loading && allReferrals.length === 0) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-20 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
                <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
                </div>
            </div>
        );
    }

    if (error && allReferrals.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <h3 className="text-lg font-semibold text-[var(--text-primary,#111)]">Unable to load referrals.</h3>
                <p className="text-sm text-gray-500">{error}</p>
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
                        <Share2 className="h-6 w-6 text-orange-500" />
                        Referrals
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Create, track, and manage patient care referrals across your connected healthcare network.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        aria-label="Refresh referrals"
                        leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                    >
                        Create Referral
                    </Button>
                </div>
            </div>

            {/* ── Metrics ── */}
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                <MetricCard label="Incoming" value={stats.incoming}
                    color="border border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300" />
                <MetricCard label="Outgoing" value={stats.outgoing}
                    color="border border-indigo-100 bg-indigo-50 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300" />
                <MetricCard label="Pending" value={stats.pending}
                    color="border border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300" />
                <MetricCard label="Accepted" value={stats.accepted}
                    color="border border-sky-100 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300" />
                <MetricCard label="In Progress" value={stats.inProgress}
                    color="border border-violet-100 bg-violet-50 text-violet-800 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300" />
                <MetricCard label="Completed" value={stats.completed}
                    color="border border-green-100 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300" />
            </div>

            {/* ── Tabs + Search ── */}
            <Card padding="sm" className="space-y-3">
                <div className="flex flex-wrap gap-1 p-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                        >
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
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by patient name, organization, or referral ID…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--text-primary,#111)] placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                </div>
            </Card>

            {/* ── Referral List ── */}
            {displayedReferrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
                    {searchQuery ? (
                        <>
                            <Search className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-base font-semibold text-[var(--text-primary,#111)]">No results for "{searchQuery}"</h3>
                            <p className="mt-1 text-sm text-gray-500">Try a different search term.</p>
                        </>
                    ) : (
                        <>
                            <Share2 className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-base font-semibold text-[var(--text-primary,#111)]">No referrals yet</h3>
                            <p className="mt-1 text-sm text-gray-500 max-w-xs">
                                Create a referral to start coordinating patient care across your network.
                            </p>
                            <Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
                                Create Referral
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Desktop table header */}
                    <div className="hidden md:grid md:grid-cols-[80px_1fr_1.5fr_100px_80px_100px_120px_80px] gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <span>Ref ID</span>
                        <span>Patient</span>
                        <span>Route</span>
                        <span>Type</span>
                        <span>Priority</span>
                        <span>Created</span>
                        <span>Status</span>
                        <span className="text-right">Action</span>
                    </div>

                    {displayedReferrals.map(ref => {
                        const isIncoming = ref._direction === 'incoming';
                        return (
                            <div
                                key={ref.id}
                                onClick={() => openDetail(ref)}
                                className="group cursor-pointer rounded-xl border border-[var(--border,#e5e7eb)] bg-[var(--surface-card,#fff)] p-4 transition-all hover:border-orange-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-orange-900/40"
                            >
                                {/* Mobile layout */}
                                <div className="md:hidden space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[var(--text-primary,#111)] truncate">
                                                {ref.patient?.full_name || 'Unknown Patient'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">#{shortId(ref.id)}</p>
                                        </div>
                                        <StatusBadge status={ref.status} />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        {isIncoming ? (
                                            <>
                                                <ArrowLeft className="h-3 w-3 text-blue-500" />
                                                <span className="truncate">{ref.sender_snapshot?.name || ref.sender_type}</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-orange-500" />
                                                <span className="truncate">{ref.receiver_snapshot?.name || ref.receiver_type}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <UrgencyBadge urgency={ref.urgency} />
                                        <span className="text-xs text-gray-400">{formatDate(ref.created_at)}</span>
                                    </div>
                                </div>

                                {/* Desktop row */}
                                <div className="hidden md:grid md:grid-cols-[80px_1fr_1.5fr_100px_80px_100px_120px_80px] gap-3 items-center">
                                    {/* Ref ID */}
                                    <span className="font-mono text-xs text-gray-500">#{shortId(ref.id)}</span>
                                    {/* Patient */}
                                    <span className="text-sm font-medium text-[var(--text-primary,#111)] truncate">
                                        {ref.patient?.full_name || 'Unknown'}
                                    </span>
                                    {/* Route */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                                        {isIncoming ? (
                                            <>
                                                <ArrowLeft className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span className="truncate" title={ref.sender_snapshot?.name}>
                                                    {ref.sender_snapshot?.name || ref.sender_type}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRight className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                                <span className="truncate" title={ref.receiver_snapshot?.name}>
                                                    {ref.receiver_snapshot?.name || ref.receiver_type}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {/* Type */}
                                    <span className="text-xs text-gray-500 capitalize">
                                        {isIncoming ? ref.sender_type?.replace('_', ' ') : ref.receiver_type?.replace('_', ' ')}
                                    </span>
                                    {/* Priority */}
                                    <UrgencyBadge urgency={ref.urgency} />
                                    {/* Created */}
                                    <span className="text-xs text-gray-500">{formatDate(ref.created_at)}</span>
                                    {/* Status */}
                                    <StatusBadge status={ref.status} />
                                    {/* Action */}
                                    <div className="flex justify-end">
                                        <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                            View <ChevronRight className="h-3.5 w-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Detail Drawer ── */}
            <ReferralDetailsDrawer
                id={selectedId}
                isOpen={!!selectedId}
                onClose={() => setSelectedId(null)}
                onStatusUpdated={loadData}
                isSent={selectedIsSent}
            />

            {/* ── Create Modal ── */}
            <CreateReferralModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => { setShowCreateModal(false); loadData(); }}
            />
        </div>
    );
}

export default function PharmacyReferralsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        }>
            <PharmacyReferralsContent />
        </Suspense>
    );
}
