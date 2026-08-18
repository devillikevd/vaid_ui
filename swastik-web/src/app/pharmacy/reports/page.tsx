'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ShoppingCart,
    Package,
    TrendingUp,
    BarChart3,
    Loader2,
    RefreshCw,
    AlertCircle,
    IndianRupee,
    ArrowRight,
    Download,
    Calendar,
    Stethoscope,
    Building2,
    Store,
    Globe,
    Clock,
    Truck,
    Tag,
    Info,
    CheckCircle2,
    XCircle,
    Flame,
    FileSpreadsheet,
    FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { pharmacyApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function PharmacyReportsPage() {
    const { analytics, loadingAnalytics, error, fetchAnalytics, clearError } = usePharmacyStore();
    const toast = useToast();
    const [period, setPeriod] = useState<string>('30d');
    const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

    const loadData = useCallback(() => {
        void fetchAnalytics(period);
    }, [fetchAnalytics, period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleExport = async (format: 'csv' | 'pdf') => {
        setExporting(format);
        try {
            await pharmacyApi.exportAnalytics(period, format);
            toast.success('Export Successful', `Analytics report (${format.toUpperCase()}) downloaded successfully.`);
        } catch (err: any) {
            toast.error('Export Failed', err.message || 'Could not generate report.');
        } finally {
            setExporting(null);
        }
    };

    const overview = analytics?.overview;
    const inventory = analytics?.inventory;
    const trends = analytics?.trends || [];
    const sources = analytics?.sources || [];
    const topMedicines = analytics?.topMedicines || [];
    const slowMedicines = analytics?.slowMedicines || [];
    const partners = analytics?.partners;
    const campaigns = analytics?.campaigns;
    const delivery = analytics?.delivery;

    // Calculate maximum daily revenue for bar chart scaling
    const maxDailyRev = trends.reduce((max, t) => Math.max(max, t.revenue), 0) || 1;
    const totalSourceRev = sources.reduce((sum, s) => sum + s.revenue, 0) || 1;

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-gray-200 dark:border-gray-800 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <BarChart3 className="h-6 w-6" />
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Business & Operations Intelligence
                        </h1>
                    </div>
                    <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                        Executive analytics, revenue telemetry, inventory risks, and delivery performance.
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Info className="h-3.5 w-3.5 text-orange-500" />
                        Order & sales metrics follow the selected period ({period}). Inventory intelligence reflects real-time catalog state.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Period Selector */}
                    <div className="flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
                        {(['7d', '30d', '90d'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                disabled={loadingAnalytics}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    period === p
                                        ? 'bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loadingAnalytics}
                        leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />}
                    >
                        Refresh
                    </Button>

                    {/* Export Dropdown / Actions */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleExport('csv')}
                            disabled={exporting !== null || loadingAnalytics}
                            leftIcon={exporting === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                        >
                            Export CSV
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleExport('pdf')}
                            disabled={exporting !== null || loadingAnalytics}
                            leftIcon={exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600" />}
                        >
                            Export PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { clearError(); loadData(); }}>Retry</Button>
                </div>
            )}

            {/* Loading Skeleton Indicator */}
            {loadingAnalytics && !analytics && (
                <div className="flex flex-col items-center justify-center h-80 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                    <p className="text-sm font-medium text-gray-500">Aggregating telemetry from database...</p>
                </div>
            )}

            {analytics && (
                <div className="space-y-8">
                    {/* SECTION 1: BUSINESS OVERVIEW (R1) */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span>1. Business Overview</span>
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                    ({period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'})
                                </span>
                            </h2>
                            <Link href="/pharmacy/orders" className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1">
                                View all orders <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Gross Sales */}
                            <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Gross Sales</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                                            ₹{(overview?.grossSales ?? 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Net: <span className="font-semibold text-emerald-600">₹{(overview?.netSales ?? 0).toLocaleString('en-IN')}</span>
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                                        <IndianRupee className="h-5 w-5" />
                                    </div>
                                </div>
                            </Card>

                            {/* Total Orders */}
                            <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Volume</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                                            {(overview?.totalOrders ?? analytics?.totalOrders ?? 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Paid: <span className="font-semibold text-gray-700 dark:text-gray-300">{overview?.paidOrders ?? 0}</span> orders
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                        <ShoppingCart className="h-5 w-5" />
                                    </div>
                                </div>
                            </Card>

                            {/* Average Order Value */}
                            <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Average Order Value</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                                            ₹{(overview?.averageOrderValue ?? 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Refunds: <span className="font-semibold text-red-500">₹{(overview?.refundedAmount ?? 0).toLocaleString('en-IN')}</span>
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                </div>
                            </Card>

                            {/* Inventory Valuation */}
                            <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Live Inventory Value</p>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                            ₹{(inventory?.inventory_value ?? analytics?.totalInventoryValue ?? 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Units: <span className="font-semibold text-gray-700 dark:text-gray-300">{(inventory?.total_units ?? 0).toLocaleString('en-IN')}</span> in stock
                                        </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <Package className="h-5 w-5" />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </section>

                    {/* SECTION 2: REVENUE & ORDER TRENDS (R1) */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card padding="lg" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-orange-600" />
                                            2. Revenue & Order Trends
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Daily time-series telemetry computed directly in Postgres</p>
                                    </div>
                                </div>

                                {trends.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-gray-400">
                                        <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-2" />
                                        <p className="text-sm font-medium">No sales recorded for this period</p>
                                        <p className="text-xs text-gray-400 mt-1">Orders placed during this time frame will chart automatically</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-1 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
                                            {trends.map((pt, i) => {
                                                const heightPct = Math.max(8, Math.round((pt.revenue / maxDailyRev) * 100));
                                                return (
                                                    <div key={i} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                                                        {/* Tooltip */}
                                                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 shadow-lg whitespace-nowrap">
                                                            <span>{pt.date}</span>
                                                            <span className="font-bold text-orange-400">₹{pt.revenue.toLocaleString('en-IN')} ({pt.orders} orders)</span>
                                                        </div>
                                                        <div
                                                            style={{ height: `${heightPct}%` }}
                                                            className="w-full rounded-t-md bg-gradient-to-t from-orange-600 to-orange-400 dark:from-orange-700 dark:to-orange-500 group-hover:brightness-110 transition-all cursor-pointer"
                                                        />
                                                        <span className="text-[9px] text-gray-400 truncate w-full text-center">
                                                            {pt.date.slice(5)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
                                            <span>Period start: <strong>{trends[0]?.date}</strong></span>
                                            <span>Total Period Revenue: <strong className="text-orange-600 dark:text-orange-400">₹{trends.reduce((s, t) => s + t.revenue, 0).toLocaleString('en-IN')}</strong></span>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* SECTION 3: SALES SOURCE BREAKDOWN (R2) */}
                        <div>
                            <Card padding="lg" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
                                    <Globe className="h-4 w-4 text-orange-600" />
                                    3. Sales Sources
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">Channel origin derived with partner precedence</p>

                                {sources.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                        <Store className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-2" />
                                        <p className="text-xs font-medium">No sales channel data recorded</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {sources.map((src, i) => {
                                            const pct = Math.round((src.revenue / totalSourceRev) * 100) || 0;
                                            return (
                                                <div key={i} className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                            {src.source === 'clinic' && <Stethoscope className="h-3.5 w-3.5 text-blue-500" />}
                                                            {src.source === 'hospital' && <Building2 className="h-3.5 w-3.5 text-purple-500" />}
                                                            {src.source === 'pos' && <Store className="h-3.5 w-3.5 text-amber-500" />}
                                                            {src.source === 'online' && <Globe className="h-3.5 w-3.5 text-emerald-500" />}
                                                            {src.source_label}
                                                        </span>
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">
                                                            ₹{src.revenue.toLocaleString('en-IN')} <span className="text-gray-400 font-normal">({src.order_count} orders)</span>
                                                        </span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                        <div
                                                            style={{ width: `${pct}%` }}
                                                            className={`h-full rounded-full ${
                                                                src.source === 'clinic' ? 'bg-blue-500' :
                                                                src.source === 'hospital' ? 'bg-purple-500' :
                                                                src.source === 'pos' ? 'bg-amber-500' : 'bg-emerald-500'
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </section>

                    {/* SECTION 4: INVENTORY INTELLIGENCE (R3) */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <span>4. Inventory Intelligence</span>
                                </h2>
                                <p className="text-xs text-gray-500">Database-aggregated physical catalog metrics, buffer reservations, and expiry risk</p>
                            </div>
                            <Link href="/pharmacy/inventory" className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1">
                                Manage inventory <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <p className="text-[11px] font-medium text-gray-500">Catalog SKUs</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{inventory?.total_items ?? analytics?.totalInventoryItems ?? 0}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Active catalog items</p>
                            </Card>

                            <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Available Units</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{(inventory?.available_units ?? 0).toLocaleString('en-IN')}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Free for new orders</p>
                            </Card>

                            <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Reserved Units</p>
                                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{(inventory?.reserved_units ?? 0).toLocaleString('en-IN')}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Committed in queue</p>
                            </Card>

                            <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <p className="text-[11px] font-medium text-red-600 dark:text-red-400">Low Stock SKUs</p>
                                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{inventory?.low_stock ?? analytics?.lowStockItems ?? 0}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Below reorder level</p>
                            </Card>

                            <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <p className="text-[11px] font-medium text-red-600 dark:text-red-400">Expired Batches</p>
                                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{inventory?.expired ?? 0}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Past expiration date</p>
                            </Card>

                            <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">Expiring &lt;30d</p>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{inventory?.expiring_30 ?? 0}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">&lt;60d: {inventory?.expiring_60 ?? 0} | &lt;90d: {inventory?.expiring_90 ?? 0}</p>
                            </Card>
                        </div>
                    </section>

                    {/* SECTION 5 & 6: TOP & SLOW-MOVING MEDICINES (R4 & R5) */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Medicines (R4) */}
                        <Card padding="lg" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Flame className="h-4 w-4 text-orange-600" />
                                        5. Top Medicines by Volume & Revenue
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Ranked from order item lines in selected period</p>
                                </div>
                            </div>

                            {topMedicines.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                                    <Package className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-2" />
                                    <p className="text-xs font-medium">No sales data for this period</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400">
                                                <th className="pb-2 font-medium">Rank</th>
                                                <th className="pb-2 font-medium">Medicine Name</th>
                                                <th className="pb-2 font-medium text-right">Units Sold</th>
                                                <th className="pb-2 font-medium text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {topMedicines.map((m, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="py-2.5 font-bold text-orange-600">{idx + 1}</td>
                                                    <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                                                        {m.name}
                                                    </td>
                                                    <td className="py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                                                        {m.units_sold}
                                                    </td>
                                                    <td className="py-2.5 text-right font-bold text-emerald-600">
                                                        ₹{m.revenue.toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>

                        {/* Slow Moving Medicines (R5) */}
                        <Card padding="lg" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                        6. Slow-Moving Stock & Velocity
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Formula: units_sold / {period} days (Lowest velocity first)</p>
                                </div>
                            </div>

                            {slowMedicines.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                                    <Package className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-2" />
                                    <p className="text-xs font-medium">No inventory stock available to analyze</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400">
                                                <th className="pb-2 font-medium">Medicine</th>
                                                <th className="pb-2 font-medium text-center">Stock</th>
                                                <th className="pb-2 font-medium text-center">Sold ({period})</th>
                                                <th className="pb-2 font-medium text-right">Daily Velocity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {slowMedicines.map((m, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                                                        {m.name}
                                                    </td>
                                                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-400">
                                                        {m.current_stock}
                                                    </td>
                                                    <td className="py-2.5 text-center font-semibold text-amber-600">
                                                        {m.units_sold}
                                                    </td>
                                                    <td className="py-2.5 text-right font-mono text-[11px] text-gray-500">
                                                        {m.velocity} u/d
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </section>

                    {/* SECTION 7, 8, 9: PARTNER, CAMPAIGN & DELIVERY ANALYTICS */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Partner Analytics (R6) */}
                        <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1 text-sm">
                                <Stethoscope className="h-4 w-4 text-blue-600" />
                                7. Partner Facilities
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">Clinic & Hospital routed traffic</p>

                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-gray-600 dark:text-gray-400">Partner Clinics</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">
                                        {partners?.clinic_orders ?? 0} orders (₹{(partners?.clinic_revenue ?? 0).toLocaleString('en-IN')})
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-gray-600 dark:text-gray-400">Partner Hospitals</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">
                                        {partners?.hospital_orders ?? 0} orders (₹{(partners?.hospital_revenue ?? 0).toLocaleString('en-IN')})
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Campaign Analytics (R7) */}
                        <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1 text-sm">
                                <Tag className="h-4 w-4 text-emerald-600" />
                                8. Discount Campaigns
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">Validated promotion redemptions</p>

                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-gray-600 dark:text-gray-400">Total Redemptions</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{campaigns?.total_redemptions ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-gray-600 dark:text-gray-400">Discounts Funded</span>
                                    <span className="font-bold text-emerald-600">₹{(campaigns?.total_discount_given ?? 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Delivery Analytics (R8) */}
                        <Card padding="md" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1 text-sm">
                                <Truck className="h-4 w-4 text-orange-600" />
                                9. Delivery Intelligence
                            </h3>
                            <p className="text-xs text-gray-500 mb-3">Fulfillment & dispatch tracking</p>

                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-gray-600 dark:text-gray-400">Delivered Orders</span>
                                    <span className="font-bold text-emerald-600">{delivery?.delivered_orders ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <span className="text-gray-600 dark:text-gray-400">In Transit / Pending</span>
                                    <span className="font-bold text-amber-600">{delivery?.pending_delivery ?? 0}</span>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            )}
        </div>
    );
}
