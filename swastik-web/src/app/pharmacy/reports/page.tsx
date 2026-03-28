'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Package, ShoppingCart, TrendingUp, Loader2, RefreshCw, AlertCircle, IndianRupee } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';

export default function PharmacyReportsPage() {
    const { analytics, loadingAnalytics, error, fetchAnalytics, clearError } = usePharmacyStore();
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        void fetchAnalytics(period);
    }, [fetchAnalytics, period]);

    if (loadingAnalytics && !analytics) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
    }

    if (error && !analytics) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); void fetchAnalytics(period); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Live inventory and order analytics for your pharmacy operations</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <Button variant="outline" onClick={() => void fetchAnalytics(period)} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                </div>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[
                    { label: 'Total Orders', value: analytics?.totalOrders ?? 0, icon: ShoppingCart, color: 'bg-orange-100 text-orange-600' },
                    { label: 'Pending Orders', value: analytics?.pendingOrders ?? 0, icon: Package, color: 'bg-blue-100 text-blue-600' },
                    { label: 'Inventory Items', value: analytics?.totalInventoryItems ?? 0, icon: BarChart3, color: 'bg-emerald-100 text-emerald-600' },
                    { label: 'Low Stock Items', value: analytics?.lowStockItems ?? 0, icon: TrendingUp, color: 'bg-red-100 text-red-600' },
                    { label: 'Inventory Value', value: `₹${(analytics?.totalInventoryValue ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'bg-yellow-100 text-yellow-700' },
                ].map((stat) => (
                    <Card key={stat.label} padding="md">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-xl p-2.5 ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card padding="lg">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Operational Summary</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        For the selected period, your pharmacy handled <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.totalOrders ?? 0}</span> orders,
                        with <span className="font-semibold text-gray-900 dark:text-gray-100"> {analytics?.pendingOrders ?? 0}</span> still pending and
                        <span className="font-semibold text-gray-900 dark:text-gray-100"> {analytics?.lowStockItems ?? 0}</span> items needing replenishment.
                    </p>
                </div>
            </Card>
        </div>
    );
}
