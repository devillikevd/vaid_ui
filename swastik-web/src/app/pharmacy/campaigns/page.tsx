'use client';

import { useEffect, useState } from 'react';
import { BadgePercent, Loader2, RefreshCw, AlertCircle, CheckCircle, XCircle, CalendarClock, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { usePharmacyCampaignsStore, campaignStatus, type Campaign } from '@/stores/campaignsStore';

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function discountLabel(c: Campaign): string {
    return c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
}

function scopeLabel(c: Campaign): string {
    switch (c.scope_type) {
        case 'global': return 'All Medicines';
        case 'category': return `Category: ${c.scope_ref || '—'}`;
        case 'brand': return `Brand: ${c.scope_ref || '—'}`;
        case 'medicine': return `Medicine: ${c.scope_ref || '—'}`;
        default: return c.scope_type;
    }
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    upcoming: { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
    inactive: { label: 'Inactive', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function PharmacyCampaignsPage() {
    const {
        available,
        mine,
        loading,
        actionLoading,
        error,
        fetchAvailable,
        fetchMine,
        optIn,
        optOut,
        clearError,
    } = usePharmacyCampaignsStore();

    const [tab, setTab] = useState<'available' | 'mine'>('available');
    const toast = useToast();

    useEffect(() => {
        void fetchAvailable('active');
    }, [fetchAvailable]);

    useEffect(() => {
        if (tab === 'mine') void fetchMine();
    }, [tab, fetchMine]);

    const handleOptIn = async (c: Campaign) => {
        const success = await optIn(c.id);
        if (success) {
            toast.success('Opted In', `You are now part of "${c.name}". Campaign pricing is now active for your pharmacy.`);
        }
    };

    const handleOptOut = async (c: Campaign) => {
        const success = await optOut(c.id);
        if (success) {
            toast.success('Opted Out', `You left "${c.name}". Its discounts will no longer apply to your pharmacy.`);
        }
    };

    if (loading && available.length === 0 && tab === 'available') {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discount Campaigns</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Opt into admin-run campaigns to automatically apply discounts to your orders.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                    <Button
                        variant="outline"
                        onClick={() => {
                            clearError();
                            void fetchAvailable('active');
                            if (tab === 'mine') void fetchMine();
                        }}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700 w-fit">
                <button
                    onClick={() => setTab('available')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                        tab === 'available'
                            ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    Available ({available.length})
                </button>
                <button
                    onClick={() => setTab('mine')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                        tab === 'mine'
                            ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    My Campaigns ({mine.length})
                </button>
            </div>

            {tab === 'available' ? (
                <>
                    {available.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <BadgePercent className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="text-gray-500 dark:text-gray-400">No active campaigns available right now.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {available.map((c) => {
                                const st = campaignStatus(c);
                                const stStyle = STATUS_STYLES[st];
                                return (
                                    <Card key={c.id} className="p-5 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                                                    <BadgePercent className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</h3>
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${stStyle.cls}`}>
                                                        {st === 'active' ? <CheckCircle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                                                        {stStyle.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {discountLabel(c)}
                                            </span>
                                        </div>
                                        {c.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{c.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{scopeLabel(c)}</span>
                                            {c.min_order_value ? <span>Min order ₹{c.min_order_value}</span> : null}
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {c.opted_in_pharmacies ?? '—'} pharmacies
                                            </span>
                                            <span>{formatDate(c.start_at)} → {formatDate(c.end_at)}</span>
                                        </div>
                                        <div className="mt-auto">
                                            <Button onClick={() => void handleOptIn(c)} isLoading={actionLoading === c.id} disabled={c.opted_in}>
                                                {c.opted_in ? 'Already Opted In' : 'Opt In'}
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {loading && mine.length === 0 ? (
                        <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
                    ) : mine.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <AlertCircle className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="text-gray-500 dark:text-gray-400">You haven&apos;t opted into any campaigns yet.</p>
                            <Button variant="outline" onClick={() => setTab('available')}>Browse Campaigns</Button>
                        </div>
                    ) : (
                        <Card padding="none">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Campaign</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Discount</th>
                                            <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 sm:table-cell">Scope</th>
                                            <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 md:table-cell">Ends On</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {mine.map((c) => {
                                            const st = campaignStatus(c);
                                            const stStyle = STATUS_STYLES[st];
                                            return (
                                                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                                                                <BadgePercent className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                                                <div className="text-xs text-gray-400">
                                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${stStyle.cls}`}>
                                                                        {stStyle.label}
                                                                    </span>
                                                                    {c.opted_in_at ? <span className="ml-2">Opted in {formatDate(c.opted_in_at)}</span> : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                            {discountLabel(c)}
                                                        </span>
                                                    </td>
                                                    <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 sm:table-cell">{scopeLabel(c)}</td>
                                                    <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 md:table-cell">{formatDate(c.end_at)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => void handleOptOut(c)}
                                                            isLoading={actionLoading === c.id}
                                                            disabled={st === 'expired'}
                                                        >
                                                            {st === 'expired' ? 'Expired' : 'Opt Out'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
