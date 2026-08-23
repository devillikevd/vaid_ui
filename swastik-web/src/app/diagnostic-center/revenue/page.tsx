'use client';

import { useEffect, useState } from 'react';
import { 
    DollarSign, 
    TrendingUp, 
    TrendingDown,
    Loader2, 
    FileSpreadsheet,
    FlaskConical,
    RefreshCw,
    CheckCircle2,
    Clock,
    Ban,
    BarChart3,
    Download,
    Lightbulb
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DashboardCard, CardHeader } from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/Button';
import { diagnosticCenterApi } from '@/lib/api';

interface AnalyticsData {
    summary: {
        totalBookings: number;
        completed: number;
        revenue: number;
        pendingValue: number;
        averageRevenuePerBooking: number;
        revenueGrowth: number | null;
    };
    previousPeriod: {
        revenue: number;
    };
    trends: { date: string; bookings: number; completed: number; revenue: number; averageRevenue: number }[];
    revenueByTest: { id: string; name: string; revenue: number; count: number; average: number; percentage: number }[];
    sampleCollection: {
        home: { total: number; completed: number; revenue: number };
        walkIn: { total: number; completed: number; revenue: number };
    };
    revenueByStatus: Record<string, number>;
}

const PERIODS = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1, exact: true },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', days: -1, isThisMonth: true },
    { label: 'Last 3 Months', days: 90 },
    { label: 'This Year', days: 365 },
];

export default function RevenuePage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Period state
    const [selectedPeriod, setSelectedPeriod] = useState(30);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const loadAnalytics = async (days: number, fromDate?: string, toDate?: string) => {
        setIsLoading(true);
        setError(null);
        
        try {
            let from: string | undefined = fromDate;
            const to: string | undefined = toDate || new Date().toISOString();
            
            if (days >= 0 && !fromDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (days === 0) {
                    from = today.toISOString();
                } else if (days === 1) { // yesterday exact
                    const yest = new Date(today);
                    yest.setDate(yest.getDate() - 1);
                    from = yest.toISOString();
                    const yestEnd = new Date(today);
                    yestEnd.setTime(yestEnd.getTime() - 1);
                    // Override 'to' to be yesterday end
                    // But we don't have override logic in API easily, we'll just pass 'to'
                } else {
                    const past = new Date();
                    past.setDate(past.getDate() - days);
                    from = past.toISOString();
                }
            } else if (days === -1 && !fromDate) {
                // This Month
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                from = firstDay.toISOString();
            }

            const res = await diagnosticCenterApi.getAnalytics(days);
            
            if (res.success) {
                setAnalytics(res.data as AnalyticsData);
            } else {
                setError(res.error || 'Failed to load analytics');
            }
        } catch {
            setError('Failed to connect to server.');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (selectedPeriod >= -1) {
            void loadAnalytics(selectedPeriod);
        }
    }, [selectedPeriod]);

    const handleCustomFilter = () => {
        if (customFrom && customTo) {
            setSelectedPeriod(-2);
            void loadAnalytics(-2, new Date(customFrom).toISOString(), new Date(customTo).toISOString());
        }
    };

    const renderTrendIcon = (pct: number | null) => {
        if (pct === null) return null;
        if (pct > 0) return <span className="text-emerald-600 flex items-center text-xs ml-2 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp className="h-3 w-3 mr-0.5" /> {pct}%</span>;
        if (pct < 0) return <span className="text-rose-600 flex items-center text-xs ml-2 font-medium bg-rose-50 px-1.5 py-0.5 rounded-full"><TrendingDown className="h-3 w-3 mr-0.5" /> {Math.abs(pct)}%</span>;
        return <span className="text-slate-500 flex items-center text-xs ml-2 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">0%</span>;
    };

    const handleExport = () => {
        if (!analytics || !analytics.trends || analytics.trends.length === 0) return;
        
        let csv = 'Date,Bookings,Completed,Revenue,Average Revenue\n';
        analytics.trends.forEach(t => {
            csv += `${t.date},${t.bookings},${t.completed},${t.revenue},${t.averageRevenue}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnostic_revenue_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <BarChart3 className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => void loadAnalytics(selectedPeriod, customFrom, customTo)} variant="outline">
                    Retry
                </Button>
            </div>
        );
    }

    const maxTrendRevenue = analytics?.trends?.reduce((max, t) => Math.max(max, t.revenue), 0) || 1;
    const maxRevenueByTest = analytics?.revenueByTest?.reduce((max, t) => Math.max(max, t.revenue), 0) || 1;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <PageHeader
                title="Revenue & Earnings"
                subtitle="Track your diagnostic center's financial performance and revenue trends."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />} onClick={() => void loadAnalytics(selectedPeriod, customFrom, customTo)}>
                            Refresh
                        </Button>
                        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={!analytics?.trends?.length}>
                            Export CSV
                        </Button>
                    </div>
                }
            />

            {/* Date Range Selector */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
                <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                    {PERIODS.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setCustomFrom('');
                                setCustomTo('');
                                setSelectedPeriod(p.days);
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedPeriod === p.days ? 'bg-purple-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                    <span className="text-slate-400">to</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
                    <Button size="sm" onClick={handleCustomFilter} disabled={!customFrom || !customTo} className="whitespace-nowrap">
                        Apply
                    </Button>
                </div>
            </div>

            {/* TIER 1: KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DashboardCard className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                            <DollarSign className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-24 rounded block"></span> : `₹${(analytics?.summary?.revenue || 0).toLocaleString('en-IN')}`}
                            </p>
                            {!isLoading && analytics && renderTrendIcon(analytics.summary.revenueGrowth)}
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Revenue</p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-20 rounded block"></span> : `₹${(analytics?.summary?.revenue || 0).toLocaleString('en-IN')}`}
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Realized from completed tests</p>
                    </div>
                </DashboardCard>

                <DashboardCard>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Value</p>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-20 rounded block"></span> : `₹${(analytics?.summary?.pendingValue || 0).toLocaleString('en-IN')}`}
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Value of incomplete bookings</p>
                    </div>
                </DashboardCard>
                
                <DashboardCard>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg / Booking</p>
                            <BarChart3 className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded block"></span> : `₹${(analytics?.summary?.averageRevenuePerBooking || 0).toLocaleString('en-IN')}`}
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Based on completed tests</p>
                    </div>
                </DashboardCard>
            </div>

            {/* TIER 2: TREND */}
            <DashboardCard noPadding>
                <CardHeader title="Revenue Trend" icon={TrendingUp} />
                <div className="p-6 pt-4 h-[350px] flex items-end gap-1.5 relative">
                    {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : analytics?.trends?.length ? (
                        <div className="w-full h-full flex items-end gap-2 overflow-x-auto pb-8 scrollbar-hide pt-10">
                            {analytics.trends.map((t, idx) => {
                                const hRev = Math.max((t.revenue / maxTrendRevenue) * 100, 1);
                                const dateObj = new Date(t.date);
                                const label = selectedPeriod === 0 ? 'Today' : selectedPeriod <= 7 && selectedPeriod >= 0 ? dateObj.toLocaleDateString('en-US', { weekday: 'short' }) : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                
                                return (
                                    <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative min-w-[30px] h-full shrink-0">
                                        <div className="w-full flex items-end justify-center gap-[2px] h-full pb-0 relative z-0">
                                            <div 
                                                className="w-full max-w-[40px] bg-indigo-500 rounded-t-sm transition-all hover:bg-indigo-600 cursor-pointer"
                                                style={{ height: `${hRev}%` }}
                                            />
                                        </div>
                                        
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-slate-900 text-white text-xs rounded py-1.5 px-2.5 pointer-events-none whitespace-nowrap z-10 transition-opacity flex flex-col gap-1 shadow-lg">
                                            <span className="font-semibold text-slate-300">{label}</span>
                                            <span className="text-white text-sm font-bold">₹{t.revenue.toLocaleString()}</span>
                                            <span className="text-slate-400">{t.bookings} bookings</span>
                                        </div>
                                        
                                        {/* Label */}
                                        <span className="text-[10px] text-slate-400 absolute top-full mt-2 rotate-45 origin-left whitespace-nowrap">
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <DollarSign className="h-10 w-10 mb-2 opacity-20" />
                            <p>No revenue recorded for this period.</p>
                        </div>
                    )}
                </div>
            </DashboardCard>

            {/* TIER 3: BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard noPadding>
                    <CardHeader title="Revenue by Diagnostic Test" icon={FlaskConical} />
                    <div className="p-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-8 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                            </div>
                        ) : analytics?.revenueByTest?.length ? (
                            <div className="space-y-4">
                                {analytics.revenueByTest.slice(0, 7).map((test, idx) => {
                                    const w = Math.max((test.revenue / maxRevenueByTest) * 100, 2);
                                    return (
                                        <div key={test.id} className="relative group">
                                            <div className="flex justify-between text-sm mb-1 relative z-10">
                                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-4">
                                                    <span className="text-slate-400 mr-2">{idx + 1}.</span>{test.name}
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white shrink-0">₹{test.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex items-center relative">
                                                <div className="h-full bg-indigo-200 dark:bg-indigo-900/40 rounded transition-all" style={{ width: `${w}%` }}></div>
                                                <span className="absolute right-2 text-[10px] text-slate-500 hidden group-hover:block">Avg ₹{test.average}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-slate-400">No revenue data available</div>
                        )}
                    </div>
                </DashboardCard>

                <div className="flex flex-col gap-6">
                    <DashboardCard noPadding>
                        <CardHeader title="Revenue by Booking Status" icon={BarChart3} />
                        <div className="p-6">
                            {isLoading ? (
                                <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded"></div>
                            ) : analytics?.revenueByStatus ? (
                                <div className="space-y-3">
                                    {Object.entries(analytics.revenueByStatus || {}).sort((a,b) => b[1] - a[1]).map(([status, amount]) => {
                                        let textColor = 'text-slate-700 dark:text-slate-300';
                                        const label = status.replace(/_/g, ' ');
                                        if (status === 'completed') textColor = 'text-emerald-700 dark:text-emerald-400';
                                        if (status === 'pending') textColor = 'text-amber-700 dark:text-amber-400';
                                        if (status === 'cancelled') textColor = 'text-rose-700 dark:text-rose-400';
                                        
                                        return (
                                            <div key={status} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50/50 dark:bg-slate-900">
                                                <span className={`text-sm font-medium capitalize ${textColor}`}>{label}</span>
                                                <span className="font-bold">₹{(amount || 0).toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-slate-400">No data</div>
                            )}
                        </div>
                    </DashboardCard>

                    <DashboardCard noPadding className="flex-1">
                        <CardHeader title="Revenue Insights" icon={Lightbulb} />
                        <div className="p-6">
                            {isLoading ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                </div>
                            ) : analytics ? (
                                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-3 list-disc list-inside">
                                    {analytics.summary.revenueGrowth !== null && analytics.summary.revenueGrowth !== 0 && (
                                        <li>Revenue {analytics.summary.revenueGrowth > 0 ? 'increased' : 'decreased'} by <strong>{Math.abs(analytics.summary.revenueGrowth)}%</strong> compared with the previous period.</li>
                                    )}
                                    {analytics.revenueByTest?.length > 0 && (
                                        <li><strong>{analytics.revenueByTest[0].name}</strong> generated the highest revenue (<strong>{analytics.revenueByTest[0].percentage}%</strong> of total).</li>
                                    )}
                                    {(analytics.sampleCollection?.home?.revenue || 0) > 0 && analytics.summary.revenue > 0 && (
                                        <li>Home collection generated <strong>{Math.round(((analytics.sampleCollection?.home?.revenue || 0) / (analytics.summary.revenue || 1))*100)}%</strong> of total revenue.</li>
                                    )}
                                    {analytics.summary.pendingValue > 0 && (
                                        <li>You have <strong>₹{analytics.summary.pendingValue.toLocaleString()}</strong> in unrealized pending value.</li>
                                    )}
                                </ul>
                            ) : null}
                        </div>
                    </DashboardCard>
                </div>
            </div>

            {/* TIER 4: PERFORMANCE TABLE */}
            <DashboardCard className="overflow-hidden" noPadding>
                <CardHeader title="Revenue Performance Details" icon={FileSpreadsheet} />
                <div className="p-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-10 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                        </div>
                    ) : analytics?.trends?.length ? (
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Period Date</th>
                                    <th className="px-6 py-4 font-semibold text-center">Bookings</th>
                                    <th className="px-6 py-4 font-semibold text-center">Completed</th>
                                    <th className="px-6 py-4 font-semibold text-right">Revenue</th>
                                    <th className="px-6 py-4 font-semibold text-right">Avg / Booking</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {analytics.trends.map((t, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{t.date}</td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-bold">{t.bookings}</td>
                                        <td className="px-6 py-4 text-center text-emerald-600 font-medium">{t.completed}</td>
                                        <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">₹{t.revenue.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">₹{t.averageRevenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-16 text-center text-slate-400">No performance data available.</div>
                    )}
                </div>
            </DashboardCard>
        </div>
    );
}
