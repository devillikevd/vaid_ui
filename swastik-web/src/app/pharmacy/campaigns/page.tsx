'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
    BadgePercent, Loader2, RefreshCw, AlertCircle, CalendarClock, Users, 
    Search, CheckCircle, XCircle, X, Check, Activity, Info
} from 'lucide-react';
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
        case 'medicine': return `Selected Medicine`; // Hide UUIDs
        default: return c.scope_type;
    }
}

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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming'>('all');
    
    // UI Modals & Drawers
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [optInConfirm, setOptInConfirm] = useState<Campaign | null>(null);
    const [optOutConfirm, setOptOutConfirm] = useState<Campaign | null>(null);

    const toast = useToast();

    useEffect(() => {
        void fetchAvailable('active');
        void fetchMine();
    }, [fetchAvailable, fetchMine]);

    const handleRefresh = useCallback(() => {
        clearError();
        void fetchAvailable('active');
        void fetchMine();
    }, [clearError, fetchAvailable, fetchMine]);

    const handleOptIn = async () => {
        if (!optInConfirm) return;
        const success = await optIn(optInConfirm.id);
        if (success) {
            toast.success('Opted In Successfully', `You are now part of "${optInConfirm.name}".`);
            setOptInConfirm(null);
            if (selectedCampaign?.id === optInConfirm.id) {
                setSelectedCampaign(null); // Close drawer to reflect state change cleanly
            }
        } else {
            toast.error('Opt-in Failed', 'Unable to join campaign. Please try again.');
        }
    };

    const handleOptOut = async () => {
        if (!optOutConfirm) return;
        const success = await optOut(optOutConfirm.id);
        if (success) {
            toast.success('Opted Out', `You left "${optOutConfirm.name}". Discounts will no longer apply.`);
            setOptOutConfirm(null);
            if (selectedCampaign?.id === optOutConfirm.id) {
                setSelectedCampaign(null);
            }
        } else {
            toast.error('Opt-out Failed', 'Unable to leave campaign.');
        }
    };

    // Derived states
    const activeList = tab === 'available' ? available : mine;

    const filteredCampaigns = useMemo(() => {
        return activeList.filter(c => {
            const st = campaignStatus(c);
            if (filterStatus !== 'all' && st !== filterStatus) return false;
            
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [activeList, filterStatus, searchQuery]);

    if (loading && available.length === 0 && mine.length === 0) {
        return (
            <div className="space-y-6">
                <div className="h-20 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campaigns & Promotions</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Discover pharmacy campaigns and promotions available to you.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                    <Button onClick={handleRefresh} variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Refresh
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                    <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {error}</span>
                    <Button size="sm" variant="outline" onClick={handleRefresh}>Retry</Button>
                </div>
            ) : null}

            {/* Controls (Tabs + Search/Filter) */}
            <Card padding="sm" className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    {/* Tabs */}
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800/50 w-fit">
                        <button
                            onClick={() => { setTab('available'); setFilterStatus('all'); }}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                tab === 'available'
                                    ? 'bg-white text-orange-700 shadow dark:bg-gray-700 dark:text-orange-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Available Campaigns
                        </button>
                        <button
                            onClick={() => { setTab('mine'); setFilterStatus('all'); }}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                                tab === 'mine'
                                    ? 'bg-white text-orange-700 shadow dark:bg-gray-700 dark:text-orange-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            My Campaigns
                            {mine.length > 0 && (
                                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                                    {mine.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search campaigns..."
                            className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Sub-filters */}
                <div className="flex gap-2 p-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                    {['all', 'active', 'upcoming'].map((status) => (
                        <button 
                            key={status}
                            onClick={() => setFilterStatus(status as any)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize ${filterStatus === status ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Campaign Grid */}
            {filteredCampaigns.length === 0 ? (
                <Card padding="lg" className="border-dashed border-gray-300 dark:border-gray-700">
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <BadgePercent className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                            {tab === 'available' ? 'No campaigns available' : 'You haven\'t joined any campaigns yet.'}
                        </h3>
                        <p className="mt-1 text-sm">
                            {tab === 'available' 
                                ? 'New pharmacy campaigns will appear here when eligible.'
                                : 'Explore Available Campaigns to discover active promotions.'}
                        </p>
                        {tab === 'mine' && (
                            <Button className="mt-4" onClick={() => setTab('available')} variant="outline">Explore Campaigns</Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredCampaigns.map((c) => {
                        const st = campaignStatus(c);
                        const isActive = st === 'active';
                        const isMineTab = tab === 'mine';
                        
                        return (
                            <Card 
                                key={c.id} 
                                className="p-5 flex flex-col gap-4 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors relative overflow-hidden"
                                onClick={() => setSelectedCampaign(c)}
                            >
                                {/* Left Accent Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isMineTab ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                
                                <div className="pl-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex gap-2 items-center mb-1.5">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span> : null}
                                                    {st}
                                                </span>
                                                {isMineTab && (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                                        <CheckCircle className="h-3 w-3" /> Opted In
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{c.name}</h3>
                                        </div>
                                        <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 flex flex-col items-center justify-center text-center shadow-sm dark:bg-orange-900/20 dark:border-orange-800">
                                            <span className="text-lg font-black text-orange-700 dark:text-orange-400 whitespace-nowrap">
                                                {discountLabel(c)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {c.description && (
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{c.description}</p>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                                        <span className="flex items-center gap-1">
                                            <Activity className="h-3.5 w-3.5" /> {scopeLabel(c)}
                                        </span>
                                        {c.min_order_value ? (
                                            <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                                                Min order: ₹{c.min_order_value}
                                            </span>
                                        ) : null}
                                        <span className="flex items-center gap-1 w-full mt-1">
                                            <CalendarClock className="h-3.5 w-3.5" /> 
                                            {formatDate(c.start_at)} → {formatDate(c.end_at)}
                                        </span>
                                    </div>

                                    <div className="mt-4 pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                                        {isMineTab ? (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={(e) => { e.stopPropagation(); setOptOutConfirm(c); }}
                                                disabled={st === 'expired' || actionLoading === c.id}
                                            >
                                                Leave Campaign
                                            </Button>
                                        ) : (
                                            <Button 
                                                size="sm" 
                                                onClick={(e) => { e.stopPropagation(); setOptInConfirm(c); }}
                                                disabled={c.opted_in || st === 'expired' || actionLoading === c.id}
                                                leftIcon={c.opted_in ? <Check className="h-4 w-4" /> : undefined}
                                                className={c.opted_in ? 'bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400' : ''}
                                            >
                                                {c.opted_in ? 'Opted In' : 'Opt In to Campaign'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Campaign Details Drawer */}
            {selectedCampaign && (
                <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setSelectedCampaign(null)}>
                    <div 
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900 animate-in slide-in-from-right duration-200" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <BadgePercent className="h-5 w-5 text-orange-500" /> Campaign Details
                            </h2>
                            <button onClick={() => setSelectedCampaign(null)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Header */}
                            <div>
                                <div className="flex gap-2 items-center mb-2">
                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {campaignStatus(selectedCampaign)}
                                    </span>
                                    {selectedCampaign.opted_in || tab === 'mine' ? (
                                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" /> Opted In
                                        </span>
                                    ) : (
                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            Available to Join
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{selectedCampaign.name}</h3>
                                {selectedCampaign.description && (
                                    <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{selectedCampaign.description}</p>
                                )}
                            </div>

                            <hr className="border-gray-200 dark:border-gray-800" />

                            {/* Offer Block */}
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:bg-orange-900/10 dark:border-orange-800/50">
                                <div className="text-xs font-semibold uppercase tracking-wider text-orange-800 dark:text-orange-400 mb-1">Discount Offer</div>
                                <div className="text-3xl font-black text-orange-700 dark:text-orange-500">
                                    {discountLabel(selectedCampaign)}
                                </div>
                            </div>

                            {/* Eligibility */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Eligibility</div>
                                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700 space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Scope</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{scopeLabel(selectedCampaign)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-2">
                                        <span className="text-gray-500">Minimum Order</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{selectedCampaign.min_order_value ? `₹${selectedCampaign.min_order_value}` : 'No minimum'}</span>
                                    </div>
                                    {selectedCampaign.max_discount_per_order ? (
                                        <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-2">
                                            <span className="text-gray-500">Max Discount</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">₹{selectedCampaign.max_discount_per_order} cap per order</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Schedule */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Schedule</div>
                                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700 space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Start Date</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(selectedCampaign.start_at)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-2">
                                        <span className="text-gray-500">End Date</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(selectedCampaign.end_at)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Helper */}
                            <div className="rounded-lg bg-blue-50 p-3 flex gap-3 items-start dark:bg-blue-900/20">
                                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-800 dark:text-blue-300">
                                    <strong className="block mb-1 text-sm font-semibold text-blue-900 dark:text-blue-200">How pricing works</strong>
                                    Campaign discounts are applied automatically to eligible orders in your POS and online catalog. The system evaluates all opted-in campaigns and strictly selects the <strong>single best discount</strong> per item. Campaigns do not stack on the same item.
                                </div>
                            </div>
                        </div>

                        {/* Actions Drawer Footer */}
                        <div className="border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setSelectedCampaign(null)}>Close</Button>
                            {tab === 'mine' ? (
                                <Button 
                                    variant="outline" 
                                    onClick={() => setOptOutConfirm(selectedCampaign)}
                                    disabled={campaignStatus(selectedCampaign) === 'expired' || actionLoading === selectedCampaign.id}
                                >
                                    Leave Campaign
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => setOptInConfirm(selectedCampaign)}
                                    disabled={selectedCampaign.opted_in || campaignStatus(selectedCampaign) === 'expired' || actionLoading === selectedCampaign.id}
                                    leftIcon={selectedCampaign.opted_in ? <Check className="h-4 w-4" /> : undefined}
                                >
                                    {selectedCampaign.opted_in ? 'Opted In' : 'Opt In'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Opt-In Confirmation Modal */}
            {optInConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <Card className="w-full max-w-sm animate-in zoom-in-95 duration-200" padding="lg">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Join Campaign</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            You are about to opt into <strong>{optInConfirm.name}</strong>.
                        </p>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg mb-6 text-sm border border-orange-100 dark:border-orange-900">
                            <div className="font-semibold text-orange-800 dark:text-orange-400 mb-1">Offer Summary:</div>
                            <ul className="list-disc pl-5 text-orange-700 dark:text-orange-300 space-y-1">
                                <li>{discountLabel(optInConfirm)}</li>
                                <li>Min order: {optInConfirm.min_order_value ? `₹${optInConfirm.min_order_value}` : 'None'}</li>
                                <li>Ends: {formatDate(optInConfirm.end_at)}</li>
                            </ul>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setOptInConfirm(null)} disabled={!!actionLoading}>Cancel</Button>
                            <Button onClick={handleOptIn} isLoading={actionLoading === optInConfirm.id}>Opt In</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Opt-Out Confirmation Modal */}
            {optOutConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <Card className="w-full max-w-sm animate-in zoom-in-95 duration-200" padding="lg">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" /> Leave Campaign
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to leave <strong>{optOutConfirm.name}</strong>? 
                            This will immediately stop discounts for this campaign on your orders.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setOptOutConfirm(null)} disabled={!!actionLoading}>Cancel</Button>
                            <Button onClick={handleOptOut} isLoading={actionLoading === optOutConfirm.id} className="bg-red-600 hover:bg-red-700 text-white">Leave</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
