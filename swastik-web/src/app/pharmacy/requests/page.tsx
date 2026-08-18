'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    Activity, AlertCircle, Loader2, RefreshCw, CheckCircle, Package, MapPin, Phone, Clock, DollarSign, X, Search, ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { pharmacyApi } from '@/lib/api';
import { useCatalogRequestUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Input } from '@/components/ui/Input';

const PAGE_SIZE = 10;

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

export default function PharmacyRequestsPage() {
    const [requests, setRequests] = useState<CatalogRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    // Filters
    const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'accepted'>('all');
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
                page,
                limit: 50 // Fetch more for client side filtering
            });
            if (res.success) {
                setRequests(res.data as any);
                setTotalPages(res.pagination?.totalPages || 1); // Not exact with client filtering
            } else {
                setError(res.error || 'Failed to load requests');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useCatalogRequestUpdates(
        useCallback(() => { loadRequests(); }, [loadRequests]),
        useCallback(() => { loadRequests(); }, [loadRequests])
    );

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

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
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading medicine requests...</span>
            </div>
        );
    }

    if (error && requests.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={loadRequests} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const acceptedCount = requests.filter(r => r.status === 'accepted').length;

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Summary */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medicine Requests</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Find and fulfill medicine requests from nearby patients.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-900/50 dark:bg-orange-900/20">
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-400">New Requests</span>
                        <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-800 dark:text-orange-300">{pendingCount}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 dark:border-green-900/50 dark:bg-green-900/20">
                        <span className="text-sm font-medium text-green-800 dark:text-green-400">Accepted</span>
                        <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-300">{acceptedCount}</span>
                    </div>
                    <Button onClick={loadRequests} variant="outline" size="sm" aria-label="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <Card padding="sm" className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 p-1">
                    <button 
                        onClick={() => { setFilterTab('all'); setPage(1); }}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterTab === 'all' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => { setFilterTab('pending'); setPage(1); }}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterTab === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                        New
                    </button>
                    <button 
                        onClick={() => { setFilterTab('accepted'); setPage(1); }}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterTab === 'accepted' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                        Accepted
                    </button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search medicines or ID..."
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {paginatedRequests.length === 0 ? (
                    <div className="col-span-full">
                        <Card padding="lg" className="border-dashed border-gray-300 dark:border-gray-700">
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                                <Activity className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No medicine requests nearby</h3>
                                <p className="mt-1">When patients request medicines in your area, they'll appear here.</p>
                            </div>
                        </Card>
                    </div>
                ) : paginatedRequests.map((request) => {
                    const medicineItems = extractMedicineItems(request.items);
                    const totalMrp = calculateTotalMrp(medicineItems);
                    const timeAgo = getTimeAgo(request.created_at);
                    
                    return (
                        <Card key={request.id} padding="md" className="hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors" onClick={() => openRequestDrawer(request)}>
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex justify-between">
                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 rounded-lg p-2 ${request.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                                                {medicineItems.length === 1
                                                    ? medicineItems[0].name || request.medicine_name || 'Medicine Request'
                                                    : `Bundle of ${medicineItems.length} medicines`}
                                            </h3>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                <span>{timeAgo}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>

                                {/* Medicine summary */}
                                <div className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">Items ({medicineItems.length})</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">Est. ₹{totalMrp.toFixed(0)}</span>
                                    </div>
                                    <div className="line-clamp-2 text-xs">
                                        {medicineItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </div>
                                </div>
                                
                                {/* Status badge */}
                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                        <MapPin className="h-3 w-3" /> Local Area
                                    </div>
                                    {request.status === 'accepted' ? (
                                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" /> Accepted
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                            New Request
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {calculatedTotalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={page}
                        totalPages={calculatedTotalPages}
                        onPageChange={setPage}
                    />
                </div>
            )}

            {/* Detail Drawer */}
            {selectedRequest && (
                <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setSelectedRequest(null)}>
                    <div 
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900 animate-in slide-in-from-right duration-200" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request Details</h2>
                            <button onClick={() => setSelectedRequest(null)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Request Info */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Request Info</div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">ID</span>
                                        <span className="font-mono text-gray-900 dark:text-gray-100">{selectedRequest.id.split('-')[0]}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Requested</span>
                                        <span className="text-gray-900 dark:text-gray-100">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedRequest.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {selectedRequest.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Medicines & Inventory */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Requested Medicines</div>
                                <div className="space-y-3">
                                    {extractMedicineItems(selectedRequest.items).map((item, idx) => {
                                        const invMatch = drawerInventory[item.medicine_id || item.name || ''];
                                        const isExpired = invMatch?.expiryDate && new Date(invMatch.expiryDate) < new Date();
                                        
                                        return (
                                            <div key={idx} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</h4>
                                                        {item.generic_name && <p className="text-xs text-gray-500">{item.generic_name}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-bold">Qty: {item.quantity}</span>
                                                        <span className="text-xs text-gray-500">Est ₹{item.mrp || 0}/ea</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Local Inventory Check */}
                                                <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded p-2 text-sm border border-dashed border-gray-300 dark:border-gray-600">
                                                    <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                                        <Activity className="h-3 w-3" /> Local Inventory Check
                                                    </div>
                                                    {drawerInventoryLoading ? (
                                                        <div className="flex items-center gap-2 text-gray-500 p-1">
                                                            <Loader2 className="h-3 w-3 animate-spin" /> Checking stock...
                                                        </div>
                                                    ) : invMatch ? (
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600 dark:text-gray-400">Available:</span>
                                                                <span className={`font-semibold ${invMatch.quantity >= (item.quantity || 1) ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {invMatch.quantity}
                                                                </span>
                                                            </div>
                                                            {invMatch.batchNumber && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500">Batch:</span>
                                                                    <span>{invMatch.batchNumber}</span>
                                                                </div>
                                                            )}
                                                            {invMatch.expiryDate && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500">Expiry:</span>
                                                                    <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                                                                        {new Date(invMatch.expiryDate).toLocaleDateString()} {isExpired && '(Expired)'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-orange-600 dark:text-orange-400 text-xs p-1">
                                                            No local stock found matching this item.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Patient Details (Authorized) */}
                            {selectedRequest.status === 'accepted' && extractDeliveryInfo(selectedRequest.items) && (
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Authorized Patient Details</div>
                                    <div className="rounded-lg bg-blue-50 p-3 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50 space-y-2 text-sm">
                                        {(() => {
                                            const dInfo = extractDeliveryInfo(selectedRequest.items);
                                            return (
                                                <>
                                                    {dInfo?.patient_phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4 text-blue-500" />
                                                            <span className="text-gray-800 dark:text-gray-200">{dInfo.patient_phone}</span>
                                                        </div>
                                                    )}
                                                    {dInfo?.delivery_address && (
                                                        <div className="flex items-start gap-2">
                                                            <MapPin className="h-4 w-4 mt-0.5 text-blue-500" />
                                                            <span className="text-gray-800 dark:text-gray-200">{dInfo.delivery_address}</span>
                                                        </div>
                                                    )}
                                                    {dInfo?.latitude && dInfo?.longitude && (
                                                        <a 
                                                            href={`https://www.google.com/maps?q=${dInfo.latitude},${dInfo.longitude}`} 
                                                            target="_blank" rel="noreferrer"
                                                            className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs mt-1"
                                                        >
                                                            Open in Maps
                                                        </a>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            )}
                            
                            {selectedRequest.status === 'pending' && (
                                <div className="text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded">
                                    Patient contact and delivery details are masked for privacy until you accept the request.
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2">
                            {selectedRequest.status === 'pending' && (
                                <Button
                                    onClick={() => handleAcceptRequest(selectedRequest)}
                                    disabled={actionLoading === selectedRequest.id}
                                    className="w-full"
                                    leftIcon={actionLoading === selectedRequest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                >
                                    Accept Request & Propose Price
                                </Button>
                            )}
                            {selectedRequest.status === 'accepted' && (
                                <div className="text-center p-2 rounded border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-sm">
                                    Request Accepted for ₹{selectedRequest.accepted_total_price?.toFixed(0)}. Awaiting patient order creation.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <ConfirmDialog {...dialogProps} />

            {/* Price Input Modal */}
            {priceModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-md">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enter Your Price</h2>
                            <button onClick={() => setPriceModal(p => ({ ...p, open: false }))}>
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                            Est. MRP: <span className="font-semibold text-gray-900 dark:text-gray-100">₹{priceModal.totalMrp.toFixed(0)}</span>
                        </p>
                        <Input
                            label="Your Offer Price (₹)"
                            type="number"
                            value={priceModal.price}
                            onChange={(e) => setPriceModal(p => ({ ...p, price: e.target.value, error: '' }))}
                            placeholder="Enter total price for bundle"
                            autoFocus
                        />
                        {priceModal.error && (
                            <p className="mt-2 text-sm text-red-600">{priceModal.error}</p>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-md">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {deliveryModal.mapsLink ? 'Offer Sent!' : 'Notice'}
                            </h2>
                            <button onClick={() => setDeliveryModal(p => ({ ...p, open: false }))}>
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        {deliveryModal.mapsLink ? (
                            <div className="space-y-4">
                                <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    Patient has been notified of your offer.
                                </p>
                                {deliveryModal.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <Phone className="h-4 w-4 text-blue-500" />
                                        <span>Phone: <strong>{deliveryModal.phone}</strong></span>
                                    </div>
                                )}
                                {deliveryModal.address && (
                                    <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                                        <span>Delivery: <strong>{deliveryModal.address}</strong></span>
                                    </div>
                                )}
                                <Button
                                    onClick={() => { window.open(deliveryModal.mapsLink, '_blank'); setDeliveryModal(p => ({ ...p, open: false })); }}
                                    leftIcon={<MapPin className="h-4 w-4" />}
                                    className="w-full mt-2"
                                >
                                    Open Google Maps
                                </Button>
                            </div>
                        ) : (
                            <p className="text-sm text-red-600">{deliveryModal.address}</p>
                        )}
                        <div className="mt-6 flex justify-end">
                            <Button variant="outline" onClick={() => setDeliveryModal(p => ({ ...p, open: false }))}>Close</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
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
