'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Activity, AlertCircle, Loader2, RefreshCw, CheckCircle, Package
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { pharmacyApi } from '@/lib/api';
import { useCatalogRequestUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';

const PAGE_SIZE = 10;

interface CatalogRequest {
    id: string;
    medicine_id: string;
    medicine_name: string;
    status: string;
    latitude: number;
    longitude: number;
    created_at: string;
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
                limit: PAGE_SIZE,
                status: 'pending' // Only show pending requests that need fulfillment
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

    const handleAcceptRequest = async (requestId: string) => {
        const confirmed = await confirmAction({
            title: 'Accept Request',
            message: 'Are you sure you want to accept this request? You must have the item in your inventory.',
            confirmLabel: 'Accept',
            variant: 'info',
        });
        if (!confirmed) return;

        setActionLoading(requestId);
        try {
            const priceStr = prompt("Enter your price for this medicine:");
            if (!priceStr) {
                setActionLoading(null);
                return;
            }
            const price = parseFloat(priceStr);
            if (isNaN(price) || price < 0) {
                alert("Invalid price");
                setActionLoading(null);
                return;
            }
            
            const res = await pharmacyApi.acceptCatalogRequest(requestId, { price });
            if (res.success) {
                loadRequests(); // refresh list
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

            <div className="space-y-3">
                {requests.length === 0 ? (
                    <Card padding="lg">
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Activity className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                            No pending medicine requests nearby
                        </div>
                    </Card>
                ) : requests.map((request) => (
                    <Card key={request.id} padding="md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{request.medicine_name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Requested on: {new Date(request.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => handleAcceptRequest(request.id)}
                                disabled={actionLoading === request.id}
                                leftIcon={actionLoading === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            >
                                Accept Request
                            </Button>
                        </div>
                    </Card>
                ))}
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
