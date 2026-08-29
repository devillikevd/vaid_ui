'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Share2, Plus, Search, RefreshCw, AlertCircle, Loader2,
    ChevronRight, CheckCircle, XCircle, ArrowRight, ArrowLeft,
    Activity, Zap, Microscope, Building2, Clock
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { UniversalReferral, ReferralUrgency } from '@/types/referrals';
import { ReferralDetailsDrawer } from '@/components/referrals/ReferralDetailsDrawer';
import { CreateReferralModal } from '@/components/referrals/CreateReferralModal';
import { useToast } from '@/components/ui/Toast';
import { useSearchParams } from 'next/navigation';

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

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={`rounded-xl border p-3 text-center ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs font-medium opacity-75">{label}</p>
        </div>
    );
}

function DiagnosticCenterReferralsContent() {
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

    useEffect(() => {
        if (initialSelectedId) {
            setSelectedId(initialSelectedId);
        }
    }, [initialSelectedId]);

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

    const stats = useMemo(() => ({
        incoming: inbox.length,
        outgoing: sent.length,
        pending: allReferrals.filter(r => r.status === 'pending').length,
        accepted: allReferrals.filter(r => r.status === 'accepted').length,
        inProgress: allReferrals.filter(r => r.status === 'in_progress').length,
        completed: allReferrals.filter(r => r.status === 'completed').length,
    }), [allReferrals, inbox, sent]);

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
                (r.sender_snapshot_name || r.sender_snapshot?.name || '')?.toLowerCase().includes(q) ||
                (r.receiver_snapshot_name || r.receiver_snapshot?.name || '')?.toLowerCase().includes(q) ||
                r.id?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allReferrals, activeTab, searchQuery]);

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

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <Microscope className="h-7 w-7 text-purple-600" />
                        Diagnostic Referrals
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage pathology and radiology referrals, specimen testing requests, and lab reports.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                    >
                        Create Referral
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCard label="Incoming" value={stats.incoming} color="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300" />
                <MetricCard label="Outgoing" value={stats.outgoing} color="border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300" />
                <MetricCard label="Pending" value={stats.pending} color="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300" />
                <MetricCard label="Accepted" value={stats.accepted} color="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300" />
                <MetricCard label="In Progress" value={stats.inProgress} color="border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300" />
                <MetricCard label="Completed" value={stats.completed} color="border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300" />
            </div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                {/* Tabs & Search */}
                <div className="border-b border-gray-200 p-4 dark:border-gray-800 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-1.5">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                        activeTab === tab.key
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {typeof tab.count === 'number' && (
                                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                            activeTab === tab.key ? 'bg-purple-700 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search referrals..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Body */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
                        <p className="text-sm font-medium">Loading diagnostic referrals...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-12 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-8 w-8 mb-3" />
                        <p className="text-sm font-medium">{error}</p>
                        <Button variant="outline" size="sm" onClick={loadData} className="mt-3">Try Again</Button>
                    </div>
                ) : displayedReferrals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 dark:text-gray-400">
                        <Microscope className="h-10 w-10 text-gray-400 mb-3 opacity-60" />
                        <p className="text-base font-semibold text-gray-900 dark:text-white">No referrals found</p>
                        <p className="mt-1 text-xs text-gray-500 max-w-sm">
                            {searchQuery ? `No referrals matched "${searchQuery}".` : 'No referrals currently match this view.'}
                        </p>
                        {!searchQuery && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setShowCreateModal(true)}
                                leftIcon={<Plus className="h-3.5 w-3.5" />}
                                className="mt-4"
                            >
                                Create First Referral
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {displayedReferrals.map(ref => {
                            const isIncoming = ref._direction === 'incoming';
                            const counterpart = isIncoming 
                                ? (ref.sender_snapshot_name || ref.sender_snapshot?.name || ref.sender_type)
                                : (ref.receiver_snapshot_name || ref.receiver_snapshot?.name || ref.receiver_type);

                            return (
                                <div
                                    key={ref.id}
                                    onClick={() => openDetail(ref)}
                                    className="flex flex-col gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer sm:flex-row sm:items-center sm:justify-between transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                            isIncoming ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                        }`}>
                                            {isIncoming ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                                    {ref.patient?.full_name || (ref.patient as any)?.name || 'Unknown Patient'}
                                                </span>
                                                <span className="font-mono text-xs text-gray-400">
                                                    #{shortId(ref.id)}
                                                </span>
                                                <UrgencyBadge urgency={ref.urgency} />
                                                <StatusBadge status={ref.status} />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3 w-3 text-gray-400" />
                                                    {isIncoming ? 'From:' : 'To:'} <strong className="text-gray-700 dark:text-gray-300">{counterpart}</strong>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                    {formatDate(ref.created_at)}
                                                </span>
                                            </div>
                                            {ref.reason && (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5">
                                                    Reason: {ref.reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDetail(ref);
                                            }}
                                            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                                            className="text-xs"
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Details Drawer */}
            <ReferralDetailsDrawer
                id={selectedId}
                isOpen={!!selectedId}
                onClose={() => setSelectedId(null)}
                isSent={selectedIsSent}
                onStatusUpdated={() => {
                    loadData();
                    toast.success('Referral updated successfully');
                }}
            />

            {/* Create Referral Modal */}
            <CreateReferralModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                    loadData();
                    toast.success('Referral created successfully');
                }}
            />
        </div>
    );
}

export default function DiagnosticCenterReferralsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        }>
            <DiagnosticCenterReferralsContent />
        </Suspense>
    );
}
