'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Activity, AlertCircle, Loader2, RefreshCw, CheckCircle, Package, MapPin, Phone, Clock, DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { pharmacyApi } from '@/lib/api';
import { useCatalogRequestUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';

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
    // Legacy single-medicine fields (backwards compat)
    medicine_id?: string;
    medicine_name?: string;
}

function extractMedicineItems(items: CatalogRequestItem[] | undefined): CatalogRequestItem[] {
    return (items || []).filter(i => i._type !== 'delivery_info' && i.medicine_id);
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

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await pharmacyApi.getCatalogRequests({
                page,
                limit: PAGE_SIZE
            });
            if (res.success) {
                setRequests(res.data as any);
                setTotalPages(res.pagination?.totalPages || 1);
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
        useCallback(() => {
            loadRequests();
        }, [loadRequests]),
        useCallback(() => {
            loadRequests();
        }, [loadRequests])
    );

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

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

        setActionLoading(request.id);
        try {
            const priceStr = prompt(`Enter your total price for this bundle (MRP: ₹${totalMrp.toFixed(0)}):`);
            if (!priceStr) {
                setActionLoading(null);
                return;
            }
            const price = parseFloat(priceStr);
            if (isNaN(price) || price < 0) {
                alert("Invalid price — please enter a valid number");
                setActionLoading(null);
                return;
            }
            if (price > totalMrp && totalMrp > 0) {
                alert(`Price cannot exceed MRP (₹${totalMrp.toFixed(0)})`);
                setActionLoading(null);
                return;
            }
            
            const res = await pharmacyApi.acceptCatalogRequest(request.id, { price });
            if (res.success) {
                // Show delivery info if available
                const deliveryInfo = (res.data as any)?.delivery_info;
                if (deliveryInfo?.mapsLink) {
                    const openMaps = confirm(
                        `✅ Request accepted!\n\nPatient Phone: ${deliveryInfo.patientPhone || 'N/A'}\nDelivery: ${deliveryInfo.deliveryAddress || 'N/A'}\n\nOpen Google Maps for delivery location?`
                    );
                    if (openMaps) {
                        window.open(deliveryInfo.mapsLink, '_blank');
                    }
                }
                loadRequests();
            } else {
                alert(res.error || 'Failed to accept request');
            }
        } catch (err: any) {
            alert(err.message || 'Error accepting request');
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medicine Requests</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Broadcasted medicine requests from nearby patients</p>
                </div>
                <Button onClick={loadRequests} variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <div className="space-y-4">
                {requests.length === 0 ? (
                    <Card padding="lg">
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Activity className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                            No pending medicine requests nearby
                        </div>
                    </Card>
                ) : requests.map((request) => {
                    const medicineItems = extractMedicineItems(request.items);
                    const deliveryInfo = extractDeliveryInfo(request.items);
                    const totalMrp = calculateTotalMrp(medicineItems);
                    const timeAgo = getTimeAgo(request.created_at);
                    const expiresAt = request.expires_at ? new Date(request.expires_at) : null;
                    const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 10 * 60 * 1000;

                    return (
                        <Card key={request.id} padding="md">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                                {medicineItems.length === 1
                                                    ? medicineItems[0].name || request.medicine_name || 'Medicine Request'
                                                    : `Bundle of ${medicineItems.length} medicines`}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{timeAgo}</span>
                                                {isExpiringSoon && (
                                                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        Expiring soon
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Est. MRP</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{totalMrp.toFixed(0)}</p>
                                    </div>
                                </div>

                                {/* Medicine Items */}
                                {medicineItems.length > 0 && (
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                                        <div className="space-y-1.5">
                                            {medicineItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        {item.quantity || 1}x {item.name}
                                                        {item.generic_name && (
                                                            <span className="ml-1 text-gray-400">({item.generic_name})</span>
                                                        )}
                                                    </span>
                                                    <span className="text-gray-500">₹{((item.mrp || 0) * (item.quantity || 1)).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Info */}
                                {deliveryInfo && (deliveryInfo.delivery_address || deliveryInfo.patient_phone) && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Delivery Details</p>
                                        <div className="space-y-1">
                                            {deliveryInfo.delivery_address && (
                                                <div className="flex items-start gap-2 text-sm">
                                                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                                                    <span className="text-gray-700 dark:text-gray-300">{deliveryInfo.delivery_address}</span>
                                                </div>
                                            )}
                                            {deliveryInfo.patient_phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-4 w-4 text-blue-500" />
                                                    <span className="text-gray-700 dark:text-gray-300">{deliveryInfo.patient_phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action */}
                                <div className="flex justify-end">
                                    {request.status === 'accepted' ? (
                                        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            <CheckCircle className="h-5 w-5" />
                                            <span className="font-semibold">Accepted for ₹{request.accepted_total_price?.toFixed(0) || '0'}</span>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleAcceptRequest(request)}
                                            disabled={actionLoading === request.id}
                                            leftIcon={actionLoading === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                        >
                                            Accept & Price
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            )}
            
            <ConfirmDialog {...dialogProps} />
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
