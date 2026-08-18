'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { FileText, ShoppingCart, AlertTriangle, TrendingUp, Activity, CheckCircle, Truck, Clock, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePharmacyStore, type Prescription, type InventoryItem } from '@/stores/pharmacyStore';
import { useOrderUpdates, usePrescriptionUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';

export default function PharmacyDashboard() {
    const { 
        stats, pendingPrescriptions, lowStockItems, 
        loadingDashboard, dashboardError, fetchDashboardData, 
        fetchReviews, reviews, loadingReviews,
        fetchOrders, loadingOrders, ordersError, orderSummary 
    } = usePharmacyStore();
    const router = useRouter();

    const shortcuts = useMemo(() => [
        { key: 'o', description: 'Go to Orders', action: () => router.push('/pharmacy/orders') },
        { key: 'i', description: 'Go to Inventory', action: () => router.push('/pharmacy/inventory') },
        { key: 'p', description: 'Go to Prescriptions', action: () => router.push('/pharmacy/prescriptions') },
        { key: 'r', description: 'Refresh dashboard', action: () => { fetchDashboardData(); fetchOrders(); } },
    ], [router, fetchDashboardData, fetchOrders]);
    usePageShortcuts(shortcuts);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { 
            fetchDashboardData(); 
            fetchOrders(); 
        }, 500);
    }, [fetchDashboardData, fetchOrders]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    useOrderUpdates(
        useCallback(() => { debouncedFetch(); }, [debouncedFetch]),
        useCallback(() => { debouncedFetch(); }, [debouncedFetch])
    );
    usePrescriptionUpdates(useCallback(() => { debouncedFetch(); }, [debouncedFetch]));

    useEffect(() => {
        fetchDashboardData();
        fetchOrders(); // Required for pipeline and accurate pending/active counts
        fetchReviews();
    }, [fetchDashboardData, fetchOrders, fetchReviews]);

    const currentTime = new Date();

    // Find oldest pending order for "Needs Attention"
    const oldestPendingOrder = useMemo(() => {
        if (!pendingPrescriptions || pendingPrescriptions.length === 0) return null;
        const pendingOnly = pendingPrescriptions.filter(o => o.status === 'pending');
        if (pendingOnly.length === 0) return null;
        return pendingOnly.reduce((oldest, current) => {
            return new Date(current.time) < new Date(oldest.time) ? current : oldest;
        });
    }, [pendingPrescriptions]);

    const oldestWaitMinutes = oldestPendingOrder 
        ? Math.floor((currentTime.getTime() - new Date(oldestPendingOrder.time).getTime()) / 60000) 
        : 0;

    const STATS = [
        { label: 'Pending Orders', value: orderSummary?.pending ?? 0, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Processing Orders', value: orderSummary?.active ?? 0, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Low Stock Items', value: stats?.lowStockItems ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
        { label: "Today's Revenue", value: `₹${(stats?.todaysRevenue ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    if (loadingDashboard && !stats) {
        return <DashboardSkeleton />;
    }

    if (dashboardError && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertTriangle className="h-12 w-12 text-red-400" />
                <p className="text-red-600 text-center max-w-md">Unable to load dashboard data.</p>
                <button onClick={() => { fetchDashboardData(); fetchOrders(); }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Pharmacy Fulfillment Console</h1>
                        <p className="text-orange-100 mt-1">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Needs Attention Row */}
            {(lowStockItems.length > 0 || oldestPendingOrder) && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Needs Attention</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {oldestPendingOrder && (
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <Clock className="w-8 h-8 text-orange-500 bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-full" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Oldest pending order: {oldestWaitMinutes} minutes</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Order {oldestPendingOrder.id.split('-')[0]}</p>
                                </div>
                            </div>
                        )}
                        {lowStockItems.length > 0 && (
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <Package className="w-8 h-8 text-red-500 bg-red-100 dark:bg-red-900/30 p-1.5 rounded-full" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{lowStockItems.length} items running low</p>
                                    <Link href="/pharmacy/inventory" className="text-xs text-orange-600 hover:underline">Manage Inventory</Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Orders */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Pending Orders</CardTitle>
                        <Link href="/pharmacy/orders" className="text-sm text-orange-600 hover:underline">
                            View all
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pendingPrescriptions.map((rx: Prescription) => (
                                <div key={rx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{rx.patientName}</p>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-mono uppercase">
                                                {rx.id.split('-')[0]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{rx.items} items</p>
                                    </div>
                                    <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                                        <StatusBadge status={rx.status} size="sm" />
                                        <p className="text-xs text-gray-400 mt-1">{new Date(rx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                            {pendingPrescriptions.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 text-center">
                                    No pending pharmacy orders right now.
                                </div>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Fulfillment Pipeline */}
                    <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle>Fulfillment Pipeline</CardTitle>
                            {loadingOrders && <span className="text-xs text-orange-600 animate-pulse">Updating...</span>}
                        </CardHeader>
                        <CardContent>
                            {ordersError ? (
                                <div className="text-center py-4">
                                    <p className="text-sm text-red-500 mb-2">Unable to load this section.</p>
                                    <button onClick={() => fetchOrders()} className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded">Retry</button>
                                </div>
                            ) : (
                                <div className="flex flex-row justify-between items-center py-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2 font-bold">{orderSummary?.pending ?? 0}</div>
                                        <span className="text-xs text-gray-500 font-medium">Pending</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 font-bold">{orderSummary?.active ?? 0}</div>
                                        <span className="text-xs text-gray-500 font-medium">Processing</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2 font-bold">{orderSummary?.completed ?? 0}</div>
                                        <span className="text-xs text-gray-500 font-medium">Completed</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mb-2 font-bold">{orderSummary?.delivered ?? 0}</div>
                                        <span className="text-xs text-gray-500 font-medium">Delivered</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Low Stock Alerts */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                Low Stock Alerts
                            </CardTitle>
                            <Link href="/pharmacy/inventory" className="text-sm text-orange-600 hover:underline">
                                Manage
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {lowStockItems.slice(0, 4).map((item: InventoryItem) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate pr-4">{item.name}</span>
                                        <span className="text-sm text-red-600 font-medium shrink-0">{item.quantity} left</span>
                                    </div>
                                ))}
                                {lowStockItems.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 text-center">
                                        Inventory levels look healthy right now.
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Reviews */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Reviews</CardTitle>
                            <Link href="/pharmacy/reviews" className="text-sm text-orange-600 hover:underline">
                                View all
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(() => {
                                    if (loadingReviews && reviews.length === 0) {
                                        return <div className="text-center py-4"><span className="text-orange-600 animate-pulse">Loading reviews...</span></div>;
                                    }
                                    
                                    if (reviews.length === 0) {
                                        return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No reviews yet.</p>;
                                    }
                                    
                                    return reviews.slice(0, 3).map((review) => (
                                        <div key={review.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {review.is_anonymous ? 'Anonymous' : (review.patient?.name || 'Patient')}
                                                </span>
                                                <div className="flex">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <span key={i} className={`text-xs ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">&quot;{review.comment}&quot;</p>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
