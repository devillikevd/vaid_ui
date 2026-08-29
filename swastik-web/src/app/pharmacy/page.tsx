'use client';

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { ShoppingCart, AlertTriangle, TrendingUp, Activity, Clock, Package, CheckCircle2, ArrowRight, Store } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePharmacyStore, type Prescription, type InventoryItem } from '@/stores/pharmacyStore';
import { useOrderUpdates, usePrescriptionUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';
import { PharmacyProfileCompletionCard } from '@/components/pharmacy/PharmacyProfileCompletionCard';
import { PharmacyQuickActions } from '@/components/pharmacy/PharmacyQuickActions';
import { PharmacyOnboardingModal } from '@/components/pharmacy/PharmacyOnboardingModal';

export default function PharmacyDashboard() {
    const { 
        stats, pendingPrescriptions, lowStockItems, inventory,
        loadingDashboard, dashboardError, fetchDashboardData, 
        fetchReviews, reviews, loadingReviews,
        fetchOrders, loadingOrders, ordersError, orderSummary,
        profileCompletion, dashboardPreferences,
        fetchDashboardPreferences,
    } = usePharmacyStore();
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [localDismissed, setLocalDismissed] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const isDismissed = localStorage.getItem('swastik_pharmacy_onboarding_dismissed') === 'true';
            setLocalDismissed(isDismissed);
        }
    }, []);

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
        fetchOrders();
        fetchReviews();
        fetchDashboardPreferences();
    }, [fetchDashboardData, fetchOrders, fetchReviews, fetchDashboardPreferences]);

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
        { label: 'Pending Orders', value: orderSummary?.pending ?? 0, icon: ShoppingCart, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950/40', route: '/pharmacy/orders' },
        { label: 'Processing Orders', value: orderSummary?.active ?? 0, icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/40', route: '/pharmacy/orders' },
        { label: 'Low Stock Items', value: stats?.lowStockItems ?? lowStockItems?.length ?? 0, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/40', route: '/pharmacy/inventory' },
        { label: "Today's Revenue", value: `₹${(stats?.todaysRevenue ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40', route: '/pharmacy/pos' },
    ];

    // Single source of truth for onboarding & profile completion visibility
    const isProfileSetupDismissed = Boolean(
        localDismissed ||
        dashboardPreferences?.show_profile_completion === false ||
        dashboardPreferences?.onboarding_completed === true
    );

    const showOnboardingModal = Boolean(
        mounted &&
        !isProfileSetupDismissed &&
        profileCompletion &&
        profileCompletion.percentage < 100
    );

    const showProfileCompletionCard = Boolean(
        !isProfileSetupDismissed &&
        profileCompletion &&
        profileCompletion.percentage < 100
    );

    if (loadingDashboard && !stats) {
        return <DashboardSkeleton />;
    }

    if (dashboardError && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <AlertTriangle className="h-10 w-10 text-red-400" />
                <p className="text-red-600 dark:text-red-400 text-center max-w-md text-sm font-medium">Unable to load dashboard data.</p>
                <button onClick={() => { fetchDashboardData(); fetchOrders(); }} className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-bold text-xs">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* 1. Header / Pharmacy Fulfillment Console */}
            <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-orange-800 rounded-2xl px-4 sm:px-5 py-3.5 text-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                    <div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight">Pharmacy Fulfillment Console</h1>
                        <p className="text-orange-100 text-xs font-medium">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Main KPI Cards (Full Width Top Row: 4 Equal Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={stat.label} href={stat.route} className="block group">
                            <Card className="p-3.5 rounded-2xl border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] hover:border-orange-300 dark:hover:border-orange-900/60 hover:shadow-xs transition-all duration-150">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{stat.label}</p>
                                        <p className="text-xl font-black text-gray-900 dark:text-gray-100 mt-0.5">{stat.value}</p>
                                    </div>
                                    <div className={`p-2 rounded-xl ${stat.bg} group-hover:scale-105 transition-transform`}>
                                        <Icon className={`h-4 w-4 ${stat.color}`} />
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Profile Completion (Only if NOT dismissed, single instance) */}
            {showProfileCompletionCard && profileCompletion && (
                <PharmacyProfileCompletionCard variant="dashboard" className="w-full" />
            )}

            {/* 3. Pharmacy Storefront Status (Compact Banner) */}
            <Card className="p-3 sm:p-3.5 rounded-2xl border-gray-200/80 dark:border-gray-800 bg-gradient-to-r from-orange-50/40 via-white to-amber-50/30 dark:from-[#111c2e] dark:via-[#131722] dark:to-[#0f172a] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 shrink-0">
                            <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                    Pharmacy Storefront Active
                                </h2>
                                <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    ● Online & Active
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                Ready to fulfill in-store counter orders and digital prescriptions.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                            Inventory: <strong className="text-gray-900 dark:text-gray-100 font-extrabold">{inventory?.length || (lowStockItems?.length ?? 0)} {inventory?.length === 1 ? 'item' : 'items'}</strong>
                        </span>
                        <Link href="/pharmacy/inventory" className="font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                            View Catalog →
                        </Link>
                    </div>
                </div>
            </Card>

            {/* 4. Main Operational Area (2 Columns: LEFT: Needs Attention + Low Stock Alerts | RIGHT: 2x2 Quick Actions) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Main Column (~68%): Vertically Stacked Needs Attention & Low Stock Alerts */}
                <div className="lg:col-span-8 space-y-3.5">
                    {/* Needs Attention Card */}
                    <Card className="p-3.5 rounded-2xl border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800/80">
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                    Needs Attention
                                </h3>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                Priority
                            </span>
                        </div>

                        {(lowStockItems.length > 0 || oldestPendingOrder) ? (
                            <div className="space-y-2">
                                {oldestPendingOrder && (
                                    <Link href="/pharmacy/orders" className="flex items-center justify-between p-2 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30 hover:border-orange-300 transition-colors group">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                                                    Oldest pending order: {oldestWaitMinutes} mins
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Order #{oldestPendingOrder.id.split('-')[0]}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-orange-600 transition-all shrink-0 ml-2" />
                                    </Link>
                                )}
                                {lowStockItems.length > 0 && (
                                    <div className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Package className="w-4 h-4 text-red-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                    {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} running low
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Reorder required soon</p>
                                            </div>
                                        </div>
                                        <Link href="/pharmacy/inventory" className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline shrink-0 ml-2">
                                            Manage Inventory →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-2 bg-gray-50 dark:bg-gray-800/30 rounded-xl flex items-center gap-2 border border-gray-100 dark:border-gray-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">All caught up — No urgent alerts.</span>
                            </div>
                        )}
                    </Card>

                    {/* Low Stock Alerts Card (Directly Below Needs Attention) */}
                    <Card className="p-3.5 rounded-2xl border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800/80">
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                    Low Stock Alerts
                                </h3>
                            </div>
                            <Link href="/pharmacy/inventory" className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold">
                                Manage →
                            </Link>
                        </div>

                        <div className="space-y-1.5">
                            {lowStockItems.slice(0, 3).map((item: InventoryItem) => (
                                <Link key={item.id} href="/pharmacy/inventory" className="flex items-center justify-between p-2 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 hover:border-red-200 transition-colors">
                                    <div>
                                        <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">{item.name}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-red-600 dark:text-red-400">{item.quantity} left</p>
                                        <p className="text-[10px] text-gray-400">Min: {item.minQuantity}</p>
                                    </div>
                                </Link>
                            ))}
                            {lowStockItems.length === 0 && (
                                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-2.5 text-xs text-gray-400 text-center">
                                    All inventory levels are healthy.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Sidebar (~32%): Quick Actions (4 Cards, 2x2 Grid) */}
                <div className="lg:col-span-4">
                    <PharmacyQuickActions />
                </div>
            </div>

            {/* 5. Lower Operational Area (2 Columns: LEFT: Fulfillment Pipeline + Pending Orders | RIGHT: Recent Reviews) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column (~68%): Fulfillment Pipeline + Pending Orders */}
                <div className="lg:col-span-8 space-y-3.5">
                    {/* Fulfillment Pipeline Card */}
                    <Card className="rounded-2xl border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                    Fulfillment Pipeline
                                </CardTitle>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    Live operational order stages
                                </p>
                            </div>
                            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-900/60">
                                Live Tracking
                            </span>
                        </CardHeader>
                        <CardContent>
                            {loadingOrders ? (
                                <div className="flex justify-center py-5">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                                </div>
                            ) : ordersError ? (
                                <div className="text-center py-3 text-xs text-red-500">
                                    Failed to load pipeline stats
                                </div>
                            ) : (
                                <div className="flex flex-row justify-between items-center py-1 sm:py-2">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 flex items-center justify-center mb-1 font-black text-xs border border-orange-200 dark:border-orange-800">
                                            {orderSummary?.pending ?? 0}
                                        </div>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">Pending</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
                                    <div className="flex flex-col items-center flex-1">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center mb-1 font-black text-xs border border-blue-200 dark:border-blue-800">
                                            {orderSummary?.active ?? 0}
                                        </div>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">Processing</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
                                    <div className="flex flex-col items-center flex-1">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mb-1 font-black text-xs border border-emerald-200 dark:border-emerald-800">
                                            {orderSummary?.completed ?? 0}
                                        </div>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">Completed</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 mx-1"></div>
                                    <div className="flex flex-col items-center flex-1">
                                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center mb-1 font-black text-xs border border-teal-200 dark:border-teal-800">
                                            {orderSummary?.delivered ?? 0}
                                        </div>
                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">Delivered</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Orders Card */}
                    <Card className="rounded-2xl border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                Pending Orders
                            </CardTitle>
                            <Link href="/pharmacy/orders" className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold">
                                View all
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {pendingPrescriptions.slice(0, 5).map((rx: Prescription) => (
                                    <div key={rx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 border border-gray-100 dark:border-gray-800 rounded-xl gap-2 bg-gray-50/40 dark:bg-gray-800/20">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100">{rx.patientName}</p>
                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.2 rounded font-mono uppercase">
                                                    #{rx.id.split('-')[0]}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{rx.items} items</p>
                                        </div>
                                        <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                                            <StatusBadge status={rx.status} size="sm" />
                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(rx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                ))}
                                {pendingPrescriptions.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-3 text-xs text-gray-400 text-center">
                                        No pending pharmacy orders right now.
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (~32%): Recent Reviews */}
                <div className="lg:col-span-4">
                    <Card className="rounded-2xl border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                Recent Reviews
                            </CardTitle>
                            <Link href="/pharmacy/reviews" className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold">
                                View all
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2.5">
                                {(() => {
                                    if (loadingReviews && reviews.length === 0) {
                                        return <div className="text-center py-3"><span className="text-orange-600 animate-pulse text-xs">Loading reviews...</span></div>;
                                    }
                                    
                                    if (reviews.length === 0) {
                                        return <p className="text-xs text-gray-400 text-center py-2">No reviews yet.</p>;
                                    }
                                    
                                    return reviews.slice(0, 3).map((review) => (
                                        <div key={review.id} className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                                                    {review.is_anonymous ? 'Anonymous' : (review.patient?.name || 'Patient')}
                                                </span>
                                                <div className="flex">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <span key={i} className={`text-xs ${i < review.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-700'}`}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2">&quot;{review.comment}&quot;</p>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* First-Time Onboarding Modal (Only if not dismissed) */}
            <PharmacyOnboardingModal
                isOpen={showOnboardingModal}
                onClose={() => setLocalDismissed(true)}
            />
        </div>
    );
}
