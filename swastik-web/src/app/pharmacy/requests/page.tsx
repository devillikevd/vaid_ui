'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    Activity, AlertCircle, Loader2, RefreshCw, CheckCircle, Package, MapPin, Phone, Clock,
    DollarSign, X, Search, ChevronRight, Pill, Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { pharmacyApi } from '@/lib/api';
import { useCatalogRequestUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Input } from '@/components/ui/Input';

const PAGE_SIZE = 15;

type FilterTab = 'all' | 'pending' | 'accepted';

interface CatalogRequestItem {
    _type?: string;
    medicine_id?: string;
    name?: string;
    generic_name?: string;
    quantity?: number;
    mrp?: number;
    delivery_address?: string;
    patient_phone?: string;
    latitude?: number;
    longitude?: number;
}

interface CatalogRequest {
    id: string;
    patient_id: string;
    items: CatalogRequestItem[];
    status: string;
    accepted_pharmacy_id?: string;
    accepted_total_price?: number;
    created_at: string;
    expires_at: string;
    medicine_id?: string;
    medicine_name?: string;
}

interface InventoryItem {
    id: string;
    name: string;
    genericName?: string;
    medicine_id?: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: string;
    reserved_quantity?: number; // Depending on backend
    medicine?: {
      dosage_form?: string;
      pack_size?: string;
      image_url?: string;
      description?: string;
    }
}

function extractMedicineItems(items: CatalogRequestItem[] | undefined): CatalogRequestItem[] {
    return (items || []).filter(i => i._type !== 'delivery_info' && (i.medicine_id || i.name));
}

function extractDeliveryInfo(items: CatalogRequestItem[] | undefined): CatalogRequestItem | undefined {
    return (items || []).find(i => i._type === 'delivery_info');
}

function calculateTotalMrp(items: CatalogRequestItem[]): number {
    return items.reduce((sum, item) => sum + ((item.mrp || 0) * (item.quantity || 1)), 0);
}

function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getRequestTitle(medicineItems: CatalogRequestItem[], medicine_name?: string): string {
    if (medicineItems.length === 0) return 'Medicine Request';
    if (medicineItems.length === 1) {
        const name = medicineItems[0].name || medicine_name || 'Medicine Request';
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    return `Medicine Request · ${medicineItems.length} Items`;
}

function getRequestId(id: string): string {
    return `#${id.split('-')[0].toUpperCase()}`;
}

// ─── Status Badge ───────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}

function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const s = status.toLowerCase();
    const config: Record<string, { label: string; classes: string; dotColor: string }> = {
        pending: {
            label: 'New',
            classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50',
            dotColor: 'bg-orange-500',
        },
        accepted: {
            label: 'Accepted',
            classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50',
            dotColor: 'bg-green-500',
        },
        rejected: {
            label: 'Rejected',
            classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50',
            dotColor: 'bg-red-500',
        },
        processing: {
            label: 'Processing',
            classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
            dotColor: 'bg-blue-500',
        },
        completed: {
            label: 'Completed',
            classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
            dotColor: 'bg-emerald-500',
        },
        cancelled: {
            label: 'Cancelled',
            classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
            dotColor: 'bg-gray-400',
        },
    };
    const cfg = config[s] ?? {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        dotColor: 'bg-gray-400',
    };
    const padding = size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5';
    const text = size === 'md' ? 'text-sm' : 'text-xs';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${padding} ${text} ${cfg.classes}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
            {cfg.label}
        </span>
    );
}

// ─── Medicine Preview ───────────────────────────────────────────────────────────────────────────────

interface MedicinePreviewProps {
    items: CatalogRequestItem[];
    maxShown?: number;
}

function MedicinePreview({ items, maxShown = 3 }: MedicinePreviewProps) {
    const shown = items.slice(0, maxShown);
    const remaining = items.length - shown.length;
    return (
        <div className="space-y-0.5">
            {shown.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="truncate max-w-[180px]">
                        {item.name}{item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </span>
                </div>
            ))}
            {remaining > 0 && (
                <div className="text-xs text-orange-500 dark:text-orange-400 font-medium pl-3">+{remaining} more</div>
            )}
        </div>
    );
}

// ─── Request Row (Desktop) ──────────────────────────────────────────────────────────────────────────────

interface RequestRowProps {
    request: CatalogRequest;
    onClick: () => void;
    actionLoading: string | null;
}

function RequestRow({ request, onClick }: RequestRowProps) {
    const medicineItems = extractMedicineItems(request.items);
    const totalMrp = calculateTotalMrp(medicineItems);
    const title = getRequestTitle(medicineItems, request.medicine_name);
    const reqId = getRequestId(request.id);
    const timeAgo = getTimeAgo(request.created_at);
    const isSingle = medicineItems.length === 1;

    return (
        <div
            onClick={onClick}
            className="group grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5 cursor-pointer
                       border-b border-gray-100 dark:border-white/5 last:border-0
                       hover:bg-orange-50/60 dark:hover:bg-orange-900/10
                       transition-colors duration-150"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            aria-label={`View details for ${title}`}
        >
            {/* Request ID */}
            <div className="hidden sm:flex items-center">
                <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 rounded px-2 py-0.5 whitespace-nowrap">
                    {reqId}
                </span>
            </div>

            {/* Medicine / Items */}
            <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-snug">{title}</div>
                {isSingle ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Qty: {medicineItems[0].quantity || 1}</div>
                ) : (
                    <div className="mt-1 hidden sm:block"><MedicinePreview items={medicineItems} maxShown={2} /></div>
                )}
                {!isSingle && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:hidden">{medicineItems.length} medicines</div>
                )}
            </div>

            {/* Requested time */}
            <div className="hidden md:flex flex-col items-center gap-0.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{timeAgo}</span>
            </div>

            {/* Location */}
            <div className="hidden lg:flex flex-col items-center gap-0.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Local</span>
            </div>

            {/* Est. Value */}
            <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">₹{totalMrp.toFixed(0)}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">est.</span>
            </div>

            {/* Status */}
            <div><StatusBadge status={request.status} /></div>

            {/* Action Arrow */}
            <div className="flex items-center">
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    View <ChevronRight className="h-3.5 w-3.5" />
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 sm:hidden group-hover:text-orange-400 transition-colors" />
            </div>
        </div>
    );
}

// ─── Mobile Request Card ──────────────────────────────────────────────────────────────────────────────

interface MobileRequestCardProps {
    request: CatalogRequest;
    onClick: () => void;
}

function MobileRequestCard({ request, onClick }: MobileRequestCardProps) {
    const medicineItems = extractMedicineItems(request.items);
    const totalMrp = calculateTotalMrp(medicineItems);
    const title = getRequestTitle(medicineItems, request.medicine_name);
    const reqId = getRequestId(request.id);
    const timeAgo = getTimeAgo(request.created_at);
    return (
        <div
            onClick={onClick}
            className="flex items-start justify-between px-4 py-3.5 gap-3 cursor-pointer
                       border-b border-gray-100 dark:border-white/5 last:border-0
                       hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-colors"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 rounded-lg p-2 bg-orange-100 dark:bg-orange-900/30 shrink-0">
                    <Pill className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{reqId}</span>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
                    </div>
                    {medicineItems.length > 1 && (
                        <div className="mt-1.5"><MedicinePreview items={medicineItems} maxShown={2} /></div>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <StatusBadge status={request.status} />
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3 w-3" /> Local Area
                        </span>
                    </div>
                </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">₹{totalMrp.toFixed(0)}</span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            </div>
        </div>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────────────────────────────────

function EmptyState({ hasSearchOrFilter, onRefresh, onClear }: { hasSearchOrFilter: boolean; onRefresh: () => void; onClear: () => void }) {
    if (hasSearchOrFilter) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="rounded-2xl bg-gray-100 dark:bg-gray-800/60 p-5 mb-4">
                    <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No medicine requests found</h3>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 max-w-xs">Try another medicine name, request ID, or change your filter.</p>
                <button onClick={onClear} className="mt-4 text-sm font-medium text-orange-500 dark:text-orange-400 hover:underline">
                    Clear search &amp; filters
                </button>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/20 p-5 mb-4">
                <Inbox className="h-10 w-10 text-orange-300 dark:text-orange-700" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No medicine requests yet</h3>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 max-w-xs">Medicine requests from nearby patients will appear here automatically.</p>
            <Button onClick={onRefresh} variant="outline" size="sm" className="mt-4" leftIcon={<RefreshCw className="h-4 w-4" />}>
                Refresh
            </Button>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────────────────────

export default function PharmacyRequestsPage() {
    const [requests, setRequests] = useState<CatalogRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    // Filters
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Detail Drawer state
    const [selectedRequest, setSelectedRequest] = useState<CatalogRequest | null>(null);
    const [drawerInventoryLoading, setDrawerInventoryLoading] = useState(false);
    const [drawerInventory, setDrawerInventory] = useState<Record<string, InventoryItem>>({});

    // Price input modal state
    const [priceModal, setPriceModal] = useState<{
        open: boolean;
        requestId: string | null;
        totalMrp: number;
        price: string;
        error: string;
    }>({ open: false, requestId: null, totalMrp: 0, price: '', error: '' });

    // Delivery info modal state
    const [deliveryModal, setDeliveryModal] = useState<{
        open: boolean;
        phone: string;
        address: string;
        mapsLink: string;
    }>({ open: false, phone: '', address: '', mapsLink: '' });

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await pharmacyApi.getCatalogRequests({
                page: 1,
                limit: 50,
            });
            if (res.success) {
                setRequests(res.data as any);
            } else {
                setError(res.error || 'Failed to load medicine requests');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useCatalogRequestUpdates(
        useCallback(() => { loadRequests(); }, [loadRequests]),
        useCallback(() => { loadRequests(); }, [loadRequests])
    );

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // Status counts
    const statusCounts = useMemo(() => ({
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        accepted: requests.filter(r => r.status === 'accepted').length,
    }), [requests]);

    // Client-side filtering and search
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (filterTab !== 'all' && req.status !== filterTab) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const idMatch = req.id.toLowerCase().includes(q);
                const itemsMatch = extractMedicineItems(req.items).some(item =>
                    (item.name || '').toLowerCase().includes(q) ||
                    (item.generic_name || '').toLowerCase().includes(q)
                );
                return idMatch || itemsMatch;
            }
            return true;
        });
    }, [requests, filterTab, searchQuery]);

    const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const calculatedTotalPages = Math.ceil(filteredRequests.length / PAGE_SIZE) || 1;

    const fetchDrawerInventory = async (request: CatalogRequest) => {
        setDrawerInventoryLoading(true);
        const medItems = extractMedicineItems(request.items);
        const newInvData: Record<string, InventoryItem> = {};
        
        try {
            for (const item of medItems) {
                const query = item.medicine_id || item.name;
                if (!query) continue;
                
                // Use existing inventory endpoint for lookup
                const res = await pharmacyApi.getInventory({ search: query, limit: 5 });
                const inventoryData = res.data as any[];
                if (res.success && inventoryData && inventoryData.length > 0) {
                    // Try exact match on medicine_id first, then name
                    let match = inventoryData.find(inv => item.medicine_id && inv.medicine_id === item.medicine_id);
                    if (!match) {
                        match = inventoryData.find(inv => inv.name.toLowerCase() === item.name?.toLowerCase());
                    }
                    if (match) {
                        newInvData[item.medicine_id || item.name || ''] = match;
                    }
                }
            }
            setDrawerInventory(newInvData);
        } catch (e) {
            console.error('Failed to fetch inventory for drawer', e);
        } finally {
            setDrawerInventoryLoading(false);
        }
    };

    const openRequestDrawer = (request: CatalogRequest) => {
        setSelectedRequest(request);
        fetchDrawerInventory(request);
    };

    const handleAcceptRequest = async (request: CatalogRequest) => {
        const medicineItems = extractMedicineItems(request.items);
        const totalMrp = calculateTotalMrp(medicineItems);
        const itemsSummary = medicineItems.map(i => `${i.quantity || 1}x ${i.name}`).join(', ');

        const confirmed = await confirmAction({
            title: 'Accept Medicine Request',
            message: `Items: ${itemsSummary}\nEstimated MRP: ₹${totalMrp.toFixed(0)}\n\nAccept and offer a price for this bundle?`,
            confirmLabel: 'Accept & Price',
            variant: 'info',
        });
        if (!confirmed) return;

        setPriceModal({ open: true, requestId: request.id, totalMrp, price: '', error: '' });
    };

    const handlePriceSubmit = async () => {
        const { requestId, totalMrp, price: priceStr } = priceModal;
        if (!requestId) return;

        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) {
            setPriceModal(p => ({ ...p, error: 'Please enter a valid number' }));
            return;
        }
        if (price > totalMrp && totalMrp > 0) {
            setPriceModal(p => ({ ...p, error: `Price cannot exceed MRP (₹${totalMrp.toFixed(0)})` }));
            return;
        }

        setActionLoading(requestId);
        setPriceModal(p => ({ ...p, open: false }));
        try {
            const res = await pharmacyApi.acceptCatalogRequest(requestId, { price });
            if (res.success) {
                const deliveryInfo = (res.data as any)?.delivery_info;
                if (deliveryInfo?.mapsLink) {
                    setDeliveryModal({
                        open: true,
                        phone: deliveryInfo.patientPhone || 'N/A',
                        address: deliveryInfo.deliveryAddress || 'N/A',
                        mapsLink: deliveryInfo.mapsLink,
                    });
                }
                loadRequests();
                if (selectedRequest?.id === requestId) {
                    setSelectedRequest(res.data as any);
                }
            } else {
                setDeliveryModal({
                    open: true,
                    phone: '',
                    address: res.error || 'Failed to accept request',
                    mapsLink: '',
                });
            }
        } catch (err: any) {
            setDeliveryModal({
                open: true,
                phone: '',
                address: err.message || 'Error accepting request',
                mapsLink: '',
            });
        } finally {
            setActionLoading(null);
        }
    };

    if (loading && requests.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading medicine requests...</span>
            </div>
        );
    }

    if (error && requests.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Failed to load requests</p>
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                </div>
                <Button onClick={loadRequests} leftIcon={<RefreshCw className="h-4 w-4" />} variant="outline">Retry</Button>
            </div>
        );
    }

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: statusCounts.all },
        { key: 'pending', label: 'New', count: statusCounts.pending },
        { key: 'accepted', label: 'Accepted', count: statusCounts.accepted },
    ];

    return (
        <div className="space-y-5 pb-20">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medicine Requests</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review, manage, and fulfill medicine requests from patients.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {statusCounts.pending > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-900/50 dark:bg-orange-900/20">
                            <span className="text-sm font-medium text-orange-800 dark:text-orange-400">New</span>
                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{statusCounts.pending}</span>
                        </div>
                    )}
                    <Button
                        onClick={loadRequests}
                        variant="outline"
                        size="sm"
                        aria-label="Refresh medicine requests"
                        leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex gap-1 flex-wrap">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setFilterTab(tab.key); setPage(1); }}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150
                                ${ filterTab === tab.key
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab.label}
                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none
                                ${ filterTab === tab.key
                                    ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-300'
                                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        id="medicine-request-search"
                        type="text"
                        placeholder="Search medicine, request ID, or patient..."
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/80 py-2 pl-9 pr-3 text-sm
                                   text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                                   focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 transition"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* List View */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-sm overflow-hidden">
                {/* Table Header (desktop) */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2.5
                                border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-800/40">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Req ID</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Medicine / Items</div>
                    <div className="hidden md:block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center">Requested</div>
                    <div className="hidden lg:block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center">Location</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-right">Est. Value</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</div>
                    <div />
                </div>

                {/* Rows */}
                {paginatedRequests.length === 0 ? (
                    <EmptyState
                        hasSearchOrFilter={searchQuery.trim().length > 0 || filterTab !== 'all'}
                        onRefresh={loadRequests}
                        onClear={() => { setSearchQuery(''); setFilterTab('all'); }}
                    />
                ) : (
                    <>
                        {/* Desktop rows */}
                        <div className="hidden sm:block">
                            {paginatedRequests.map((request) => (
                                <RequestRow
                                    key={request.id}
                                    request={request}
                                    onClick={() => openRequestDrawer(request)}
                                    actionLoading={actionLoading}
                                />
                            ))}
                        </div>
                        {/* Mobile cards */}
                        <div className="sm:hidden">
                            {paginatedRequests.map((request) => (
                                <MobileRequestCard
                                    key={request.id}
                                    request={request}
                                    onClick={() => openRequestDrawer(request)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {calculatedTotalPages > 1 && (
                <div className="flex justify-center pt-2">
                    <Pagination
                        currentPage={page}
                        totalPages={calculatedTotalPages}
                        onPageChange={setPage}
                    />
                </div>
            )}

            {/* Detail Drawer */}
            {selectedRequest && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setSelectedRequest(null)}
                >
                    <div
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-900 animate-in slide-in-from-right duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Medicine Request Details</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{getRequestId(selectedRequest.id)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Close details"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {/* Status Overview */}
                            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 px-4 py-3">
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Status</div>
                                    <StatusBadge status={selectedRequest.status} size="md" />
                                </div>
                                <div className="space-y-1 text-right">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Requested</div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {new Date(selectedRequest.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>
                            </div>

                            {/* Medicines */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Requested Medicines</div>
                                <div className="space-y-3">
                                    {extractMedicineItems(selectedRequest.items).map((item, idx) => {
                                        const invKey = item.medicine_id || item.name || '';
                                        const invMatch = drawerInventory[invKey];
                                        const isExpired = invMatch?.expiryDate && new Date(invMatch.expiryDate) < new Date();
                                        return (
                                            <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800/50">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="mt-0.5 rounded-lg p-1.5 bg-orange-100 dark:bg-orange-900/30">
                                                            <Pill className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.name}</h4>
                                                            {item.generic_name && <p className="text-xs text-gray-400 mt-0.5">{item.generic_name}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">Qty: {item.quantity}</div>
                                                        <div className="text-xs text-gray-400">₹{item.mrp || 0}/ea</div>
                                                    </div>
                                                </div>
                                                <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/30 px-3 py-2">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
                                                        <Activity className="h-3 w-3" /> Local Inventory Check
                                                    </div>
                                                    {drawerInventoryLoading ? (
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                                                            <Loader2 className="h-3 w-3 animate-spin" /> Checking stock...
                                                        </div>
                                                    ) : invMatch ? (
                                                        <div className="space-y-1 text-xs">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500 dark:text-gray-400">Available:</span>
                                                                <span className={`font-semibold ${invMatch.quantity >= (item.quantity || 1) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                                    {invMatch.quantity}
                                                                </span>
                                                            </div>
                                                            {invMatch.batchNumber && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500 dark:text-gray-400">Batch:</span>
                                                                    <span className="text-gray-700 dark:text-gray-300">{invMatch.batchNumber}</span>
                                                                </div>
                                                            )}
                                                            {invMatch.expiryDate && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500 dark:text-gray-400">Expiry:</span>
                                                                    <span className={isExpired ? 'text-red-500 font-bold' : 'text-gray-700 dark:text-gray-300'}>
                                                                        {new Date(invMatch.expiryDate).toLocaleDateString('en-IN')}
                                                                        {isExpired && ' (Expired)'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-orange-500 dark:text-orange-400">
                                                            No local stock found matching this item.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Accepted Price */}
                            {selectedRequest.status === 'accepted' && selectedRequest.accepted_total_price != null && (
                                <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">Your Accepted Price</span>
                                    <span className="text-lg font-bold text-green-700 dark:text-green-400">₹{selectedRequest.accepted_total_price.toFixed(0)}</span>
                                </div>
                            )}

                            {/* Patient Details */}
                            {selectedRequest.status === 'accepted' && extractDeliveryInfo(selectedRequest.items) && (
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Patient Delivery Details</div>
                                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 p-4 space-y-2.5">
                                        {(() => {
                                            const dInfo = extractDeliveryInfo(selectedRequest.items);
                                            return (
                                                <>
                                                    {dInfo?.patient_phone && (
                                                        <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                                                            <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                                                            <span>{dInfo.patient_phone}</span>
                                                        </div>
                                                    )}
                                                    {dInfo?.delivery_address && (
                                                        <div className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                                                            <MapPin className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                                                            <span>{dInfo.delivery_address}</span>
                                                        </div>
                                                    )}
                                                    {dInfo?.latitude && dInfo?.longitude && (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${dInfo.latitude},${dInfo.longitude}`}
                                                            target="_blank" rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            <MapPin className="h-3 w-3" /> Open in Google Maps
                                                        </a>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Privacy notice */}
                            {selectedRequest.status === 'pending' && (
                                <div className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                    <Package className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                                    Patient contact and delivery details are revealed only after you accept the request.
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer / Actions */}
                        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2">
                            {selectedRequest.status === 'pending' && (
                                <Button
                                    onClick={() => handleAcceptRequest(selectedRequest)}
                                    disabled={actionLoading === selectedRequest.id}
                                    className="w-full"
                                    leftIcon={actionLoading === selectedRequest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                >
                                    Accept Request &amp; Propose Price
                                </Button>
                            )}
                            {selectedRequest.status === 'accepted' && (
                                <div className="text-center py-2 text-sm text-green-700 dark:text-green-400 font-medium">
                                    ✓ Accepted · Awaiting patient order creation
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <ConfirmDialog {...dialogProps} />

            {/* Price Input Modal */}
            {priceModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card padding="lg" className="w-full max-w-md shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Enter Your Offer Price</h2>
                            <button
                                onClick={() => setPriceModal(p => ({ ...p, open: false }))}
                                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="mb-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40 px-4 py-2.5 flex justify-between items-center">
                            <span className="text-sm text-orange-700 dark:text-orange-400">Estimated MRP</span>
                            <span className="font-bold text-orange-800 dark:text-orange-300">₹{priceModal.totalMrp.toFixed(0)}</span>
                        </div>
                        <Input
                            label="Your Offer Price (₹)"
                            type="number"
                            value={priceModal.price}
                            onChange={(e) => setPriceModal(p => ({ ...p, price: e.target.value, error: '' }))}
                            placeholder="Enter total price for this request"
                            autoFocus
                        />
                        {priceModal.error && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{priceModal.error}</p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setPriceModal(p => ({ ...p, open: false }))}>Cancel</Button>
                            <Button
                                onClick={handlePriceSubmit}
                                disabled={!priceModal.price}
                                leftIcon={<DollarSign className="h-4 w-4" />}
                            >
                                Submit Offer
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delivery Info Modal */}
            {deliveryModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card padding="lg" className="w-full max-w-md shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {deliveryModal.mapsLink ? '🎉 Offer Sent!' : 'Notice'}
                            </h2>
                            <button
                                onClick={() => setDeliveryModal(p => ({ ...p, open: false }))}
                                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        {deliveryModal.mapsLink ? (
                            <div className="space-y-4">
                                <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/40">
                                    The patient has been notified of your offer.
                                </p>
                                {deliveryModal.phone && (
                                    <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                                        <Phone className="h-4 w-4 text-blue-500" />
                                        <span>Phone: <strong>{deliveryModal.phone}</strong></span>
                                    </div>
                                )}
                                {deliveryModal.address && (
                                    <div className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                                        <span>Delivery: <strong>{deliveryModal.address}</strong></span>
                                    </div>
                                )}
                                <Button
                                    onClick={() => { window.open(deliveryModal.mapsLink, '_blank'); setDeliveryModal(p => ({ ...p, open: false })); }}
                                    leftIcon={<MapPin className="h-4 w-4" />}
                                    className="w-full"
                                >
                                    Open in Google Maps
                                </Button>
                            </div>
                        ) : (
                            <p className="text-sm text-red-600 dark:text-red-400">{deliveryModal.address}</p>
                        )}
                        <div className="mt-5 flex justify-end">
                            <Button variant="outline" onClick={() => setDeliveryModal(p => ({ ...p, open: false }))}>Close</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

