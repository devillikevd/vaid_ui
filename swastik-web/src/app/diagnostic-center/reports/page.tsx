'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    BarChart3, 
    TrendingUp, 
    TrendingDown,
    CalendarCheck, 
    CheckCircle2, 
    Loader2, 
    Clock3,
    Ban,
    DollarSign,
    Lightbulb,
    FileSpreadsheet,
    FlaskConical,
    RefreshCw,
    Users,
    Home,
    Building2,
    Activity,
    ChevronRight
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DashboardCard, CardHeader } from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/Button';
import { diagnosticCenterApi } from '@/lib/api';

interface TrendPoint {
    date: string;
    bookings: number;
    revenue: number;
}

interface TestPerformance {
    id: string;
    name: string;
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    completionRate: number;
}

interface AnalyticsData {
    summary: {
        totalBookings: number;
        completed: number;
        pending: number;
        cancelled: number;
        completionRate: number;
        cancellationRate: number;
        revenue: number;
    };
    previousPeriod: {
        totalBookings: number;
        completed: number;
        revenue: number;
        cancellationRate: number;
    };
    patientAnalytics: {
        totalUnique: number;
        newPatients: number;
        returningPatients: number;
    };
    sampleCollection: {
        home: { total: number; completed: number; revenue: number };
        walkIn: { total: number; completed: number; revenue: number };
    };
    cancellationAnalytics: {
        total: number;
        rate: number;
        previousRate: number;
    };
    peakAnalytics: {
        peakHours: number[];
        peakDays: number[];
    };
    trends: TrendPoint[];
    statusBreakdown: Record<string, number>;
    popularTests: { id: string; name: string; count: number; percentage: number }[];
    testPerformance: TestPerformance[];
    revenueByTest: { id: string; name: string; revenue: number; count: number; average: number }[];
}

const PERIODS = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'This Month', days: 30 },
    { label: 'Last 3 Months', days: 90 },
    { label: 'Last 6 Months', days: 180 },
    { label: 'This Year', days: 365 },
];

export default function ReportsPage() {
    const router = useRouter();
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
                if (days === 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    from = today.toISOString();
                } else {
                    const past = new Date();
                    past.setDate(past.getDate() - days);
                    from = past.toISOString();
                }
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
        if (selectedPeriod >= 0) {
            void loadAnalytics(selectedPeriod);
        }
    }, [selectedPeriod]);

    const handleCustomFilter = () => {
        if (customFrom && customTo) {
            setSelectedPeriod(-1); // -1 means custom
            void loadAnalytics(-1, new Date(customFrom).toISOString(), new Date(customTo).toISOString());
        }
    };

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return null;
        const diff = current - previous;
        const pct = Math.round((diff / previous) * 100);
        return pct;
    };

    const renderTrendIcon = (pct: number | null) => {
        if (pct === null) return null;
        if (pct > 0) return <span className="text-emerald-600 flex items-center text-xs ml-2 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full"><TrendingUp className="h-3 w-3 mr-0.5" /> {pct}%</span>;
        if (pct < 0) return <span className="text-rose-600 flex items-center text-xs ml-2 font-medium bg-rose-50 px-1.5 py-0.5 rounded-full"><TrendingDown className="h-3 w-3 mr-0.5" /> {Math.abs(pct)}%</span>;
        return <span className="text-slate-500 flex items-center text-xs ml-2 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">0%</span>;
    };

    const handleExport = () => {
        alert('Export infrastructure is not currently available. Coming soon!');
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

    const maxTrendBooking = analytics?.trends?.reduce((max, t) => Math.max(max, t.bookings), 0) || 1;
    const maxTrendRevenue = analytics?.trends?.reduce((max, t) => Math.max(max, t.revenue), 0) || 1;
    const maxRevenueByTest = analytics?.revenueByTest?.reduce((max, t) => Math.max(max, t.revenue), 0) || 1;
    const peakDaysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxPeakDay = analytics?.peakAnalytics?.peakDays?.reduce((m, d) => Math.max(m, d), 0) || 1;
    const peakHoursLabels = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
    const maxPeakHour = analytics?.peakAnalytics?.peakHours?.reduce((m, d) => Math.max(m, d), 0) || 1;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <PageHeader
                title="Reports & Analytics"
                subtitle="Track bookings, test performance, completion rates, revenue, and operational trends."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />} onClick={() => void loadAnalytics(selectedPeriod, customFrom, customTo)}>
                            Refresh
                        </Button>
                        <Button variant="outline" leftIcon={<FileSpreadsheet className="h-4 w-4" />} onClick={handleExport}>
                            Export Report
                        </Button>
                    </div>
                }
            />

            {/* Date Range Selector */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
                <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                    {PERIODS.map(p => (
                        <button
                            key={p.days}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <DashboardCard hoverable onClick={() => router.push('/diagnostic-center/bookings')}>
                    <div className="flex flex-col gap-2 group">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 group-hover:text-purple-600 transition-colors">Bookings <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                            <CalendarCheck className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded block"></span> : (analytics?.summary?.totalBookings || 0)}
                            </p>
                            {!isLoading && analytics && renderTrendIcon(calculateChange(analytics.summary.totalBookings, analytics.previousPeriod.totalBookings))}
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard hoverable onClick={() => router.push('/diagnostic-center/results')}>
                    <div className="flex flex-col gap-2 group">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 group-hover:text-emerald-600 transition-colors">Completed <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded block"></span> : (analytics?.summary?.completed || 0)}
                            </p>
                            {!isLoading && analytics && renderTrendIcon(calculateChange(analytics.summary.completed, analytics.previousPeriod.completed))}
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard hoverable onClick={() => router.push('/diagnostic-center/bookings')}>
                    <div className="flex flex-col gap-2 group">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 group-hover:text-amber-600 transition-colors">Pending <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                            <Clock3 className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded block"></span> : (analytics?.summary?.pending || 0)}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
                
                <DashboardCard hoverable onClick={() => router.push('/diagnostic-center/bookings')}>
                    <div className="flex flex-col gap-2 group">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 group-hover:text-rose-600 transition-colors">Cancelled <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                            <Ban className="h-4 w-4 text-rose-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded block"></span> : (analytics?.summary?.cancelled || 0)}
                            </p>
                            {!isLoading && analytics && renderTrendIcon(calculateChange(analytics.summary.cancellationRate, analytics.previousPeriod.cancellationRate))}
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard hoverable onClick={() => router.push('/diagnostic-center/revenue')} className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 cursor-pointer">
                    <div className="flex flex-col gap-2 group">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 group-hover:text-indigo-600 transition-colors">Revenue <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                            <DollarSign className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-24 rounded block"></span> : `₹${(analytics?.summary?.revenue || 0).toLocaleString('en-IN')}`}
                            </p>
                            {!isLoading && analytics && renderTrendIcon(calculateChange(analytics.summary.revenue, analytics.previousPeriod.revenue))}
                        </div>
                    </div>
                </DashboardCard>
            </div>

            {/* TIER 2: PRIMARY VISUALIZATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bookings vs Revenue Trend */}
                <DashboardCard className="lg:col-span-2" noPadding>
                    <CardHeader title="Bookings & Revenue Trends" icon={TrendingUp} />
                    <div className="p-6 pt-4 h-[350px] flex items-end gap-1.5 relative">
                        {isLoading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                            </div>
                        ) : analytics?.trends?.length ? (
                            <div className="w-full h-full flex items-end gap-2 overflow-x-auto pb-8 scrollbar-hide pt-10">
                                {analytics.trends.map((t, idx) => {
                                    const hBook = Math.max((t.bookings / maxTrendBooking) * 100, 1);
                                    const hRev = Math.max((t.revenue / maxTrendRevenue) * 100, 1);
                                    const dateObj = new Date(t.date);
                                    const label = selectedPeriod === 0 ? 'Today' : selectedPeriod <= 7 ? dateObj.toLocaleDateString('en-US', { weekday: 'short' }) : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                    
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative min-w-[40px] h-full shrink-0">
                                            {/* Bar container */}
                                            <div className="w-full flex items-end justify-center gap-[2px] h-full pb-0 relative z-0">
                                                {/* Booking bar */}
                                                <div 
                                                    className="w-1/2 bg-purple-500 rounded-t-sm transition-all hover:bg-purple-600 cursor-pointer"
                                                    style={{ height: `${hBook}%` }}
                                                />
                                                {/* Revenue bar */}
                                                <div 
                                                    className="w-1/2 bg-emerald-400 rounded-t-sm transition-all hover:bg-emerald-500 cursor-pointer"
                                                    style={{ height: `${hRev}%` }}
                                                />
                                            </div>
                                            
                                            {/* Tooltip */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-slate-900 text-white text-xs rounded py-1.5 px-2.5 pointer-events-none whitespace-nowrap z-10 transition-opacity flex flex-col gap-1 shadow-lg">
                                                <span className="font-semibold">{label}</span>
                                                <span className="text-purple-300">{t.bookings} bookings</span>
                                                <span className="text-emerald-300">₹{t.revenue.toLocaleString()}</span>
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
                                <Activity className="h-10 w-10 mb-2 opacity-20" />
                                <p>No trend data for this period.</p>
                                <p className="text-xs mt-1">Try selecting a longer date range.</p>
                            </div>
                        )}
                        {/* Legend */}
                        <div className="absolute top-4 right-6 flex gap-4 text-xs font-medium text-slate-500 bg-white dark:bg-slate-900/80 dark:bg-slate-900/80 px-2 py-1 rounded-full">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-purple-500 rounded-sm"></div>Bookings</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-400 rounded-sm"></div>Revenue</div>
                        </div>
                    </div>
                </DashboardCard>

                {/* Status Breakdown */}
                <DashboardCard noPadding>
                    <CardHeader title="Status Breakdown" icon={BarChart3} />
                    <div className="p-6 pt-4">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="animate-pulse h-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
                                ))}
                            </div>
                        ) : analytics?.summary?.totalBookings ? (
                            <div className="space-y-4 mt-2">
                                {Object.entries(analytics.statusBreakdown || {}).sort((a,b) => b[1] - a[1]).map(([status, count]) => {
                                    const pct = Math.round((count / analytics.summary.totalBookings) * 100);
                                    let color = 'bg-slate-500';
                                    let textColor = 'text-slate-700 dark:text-slate-300';
                                    if (status === 'completed') { color = 'bg-emerald-500'; textColor = 'text-emerald-700 dark:text-emerald-400'; }
                                    if (status === 'pending') { color = 'bg-amber-500'; textColor = 'text-amber-700 dark:text-amber-400'; }
                                    if (status === 'cancelled') { color = 'bg-rose-500'; textColor = 'text-rose-700 dark:text-rose-400'; }
                                    if (status === 'processing') { color = 'bg-blue-500'; textColor = 'text-blue-700 dark:text-blue-400'; }
                                    if (status === 'sample_collected') { color = 'bg-indigo-500'; textColor = 'text-indigo-700 dark:text-indigo-400'; }
                                    
                                    return (
                                        <div key={status}>
                                            <div className="flex items-center justify-between text-sm mb-1.5">
                                                <span className={`font-medium capitalize ${textColor}`}>{status.replace(/_/g, ' ')}</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-bold">{count} <span className="text-xs text-slate-400 ml-1 font-normal">({pct}%)</span></span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Completion Rate</p>
                                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{analytics.summary.completionRate}%</p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-rose-50 dark:bg-rose-900/10">
                                        <p className="text-xs text-rose-600 dark:text-rose-400 mb-1">Cancellation Rate</p>
                                        <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{analytics.summary.cancellationRate}%</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-slate-400">
                                <p>No status data</p>
                            </div>
                        )}
                    </div>
                </DashboardCard>
            </div>

            {/* TIER 3: OPERATIONAL VISUALIZATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard noPadding>
                    <CardHeader title="Most Popular Tests" icon={FlaskConical} />
                    <div className="p-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-8 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                            </div>
                        ) : analytics?.popularTests?.length ? (
                            <div className="space-y-4">
                                {analytics.popularTests.slice(0, 5).map((test, idx) => {
                                    const maxCount = analytics.popularTests[0].count;
                                    const w = Math.max((test.count / maxCount) * 100, 2);
                                    return (
                                        <div key={test.id} className="relative group">
                                            <div className="flex justify-between text-sm mb-1 relative z-10">
                                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-4">
                                                    <span className="text-slate-400 mr-2">{idx + 1}.</span>{test.name}
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white shrink-0">{test.count} <span className="text-xs text-slate-400 font-normal">({test.percentage}%)</span></span>
                                            </div>
                                            <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                                                <div className="h-full bg-purple-200 dark:bg-purple-900/40 rounded transition-all" style={{ width: `${w}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-slate-400">No test data available</div>
                        )}
                    </div>
                </DashboardCard>

                <DashboardCard noPadding>
                    <CardHeader title="Revenue by Test" icon={DollarSign} />
                    <div className="p-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-8 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                            </div>
                        ) : analytics?.revenueByTest?.length ? (
                            <div className="space-y-4">
                                {analytics.revenueByTest.slice(0, 5).map((test, idx) => {
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
                                                <div className="h-full bg-emerald-200 dark:bg-emerald-900/40 rounded transition-all" style={{ width: `${w}%` }}></div>
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
            </div>

            {/* TIER 4: PATIENTS, COLLECTION, PEAK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Unique Patients */}
                <DashboardCard noPadding>
                    <CardHeader title="Patient Analytics" icon={Users} />
                    <div className="p-6">
                        {isLoading ? (
                            <div className="h-32 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                        ) : analytics?.patientAnalytics ? (
                            <div className="flex flex-col gap-4">
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.patientAnalytics.totalUnique}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Unique Patients</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
                                        <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{analytics.patientAnalytics.newPatients}</p>
                                        <p className="text-[10px] uppercase text-indigo-600/70">New</p>
                                    </div>
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                        <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{analytics.patientAnalytics.returningPatients}</p>
                                        <p className="text-[10px] uppercase text-purple-600/70">Returning</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-center py-10">No data</div>
                        )}
                    </div>
                </DashboardCard>

                {/* Sample Collection */}
                <DashboardCard noPadding>
                    <CardHeader title="Sample Collection" icon={Building2} />
                    <div className="p-6">
                        {isLoading ? (
                            <div className="h-32 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                        ) : analytics?.sampleCollection ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><Home className="h-4 w-4" /></div>
                                        <div>
                                            <p className="text-sm font-semibold">Home</p>
                                            <p className="text-xs text-slate-500">₹{analytics.sampleCollection.home.revenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold">{analytics.sampleCollection.home.total}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-md"><Building2 className="h-4 w-4" /></div>
                                        <div>
                                            <p className="text-sm font-semibold">Walk-in</p>
                                            <p className="text-xs text-slate-500">₹{analytics.sampleCollection.walkIn.revenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold">{analytics.sampleCollection.walkIn.total}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-center py-10">No data</div>
                        )}
                    </div>
                </DashboardCard>

                {/* Peak Hours */}
                <DashboardCard noPadding>
                    <CardHeader title="Peak Bookings" icon={Clock3} />
                    <div className="p-6">
                        {isLoading ? (
                            <div className="h-32 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                        ) : analytics?.peakAnalytics ? (
                            <div className="flex flex-col gap-2 h-[160px] overflow-hidden">
                                <p className="text-xs text-slate-500 mb-2">Bookings by Time of Day</p>
                                <div className="flex items-end h-[60px] gap-1">
                                    {analytics.peakAnalytics.peakHours.map((count, i) => {
                                        const h = Math.max((count / maxPeakHour) * 100, 5);
                                        return (
                                            <div key={i} className="flex-1 flex flex-col justify-end group relative items-center h-full">
                                                <div className="w-full bg-purple-300 dark:bg-purple-800 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                                <span className="text-[9px] text-slate-400 mt-1">{peakHoursLabels[i].split('-')[0]}h</span>
                                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-slate-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">{count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-slate-500 mt-2 mb-2">Bookings by Day of Week</p>
                                <div className="flex gap-1 h-3">
                                    {analytics.peakAnalytics.peakDays.map((count, i) => {
                                        const intensity = count === 0 ? 'bg-slate-100 dark:bg-slate-800' : count > (maxPeakDay * 0.7) ? 'bg-purple-600' : count > (maxPeakDay * 0.3) ? 'bg-purple-400' : 'bg-purple-200';
                                        return (
                                            <div key={i} title={`${peakDaysLabels[i]}: ${count}`} className={`flex-1 rounded-sm ${intensity} cursor-help`}></div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 px-1 mt-1">
                                    <span>Sun</span><span>Sat</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-center py-10">No data</div>
                        )}
                    </div>
                </DashboardCard>
            </div>

            {/* TIER 5: TEST PERFORMANCE TABLE */}
            <DashboardCard className="overflow-hidden" noPadding>
                <CardHeader title="Test Performance Details" icon={CheckCircle2} />
                <div className="p-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-10 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                        </div>
                    ) : analytics?.testPerformance?.length ? (
                        <table className="w-full text-sm text-left whitespace-nowrap min-w-[600px]">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Test Name</th>
                                    <th className="px-6 py-4 font-semibold text-center">Total</th>
                                    <th className="px-6 py-4 font-semibold text-center">Completed</th>
                                    <th className="px-6 py-4 font-semibold text-center">Pending</th>
                                    <th className="px-6 py-4 font-semibold text-center">Cancelled</th>
                                    <th className="px-6 py-4 font-semibold text-right">Completion %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {analytics.testPerformance.map((test) => (
                                    <tr key={test.id} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{test.name}</td>
                                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-bold">{test.total}</td>
                                        <td className="px-6 py-4 text-center text-emerald-600 font-medium">{test.completed}</td>
                                        <td className="px-6 py-4 text-center text-amber-600">{test.pending}</td>
                                        <td className="px-6 py-4 text-center text-rose-600">{test.cancelled}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${test.completionRate > 80 ? 'bg-emerald-100 text-emerald-800' : test.completionRate > 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                {test.completionRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-16 text-center text-slate-400">No test data available for this period.</div>
                    )}
                </div>
            </DashboardCard>

            {/* TIER 6: OPERATIONAL INSIGHTS */}
            {!isLoading && (analytics?.summary?.totalBookings || 0) > 0 && (
                <DashboardCard noPadding>
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-[18px]">
                        <div className="flex gap-4 items-start">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0">
                                <Lightbulb className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Operational Insights</h4>
                                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                                    {(analytics?.summary?.totalBookings || 0) > (analytics?.previousPeriod?.totalBookings || 0) && analytics?.previousPeriod?.totalBookings !== 0 && analytics && (
                                        <li>Bookings increased by <strong>{calculateChange(analytics.summary.totalBookings, analytics.previousPeriod.totalBookings)}%</strong> compared with the previous period.</li>
                                    )}
                                    {(analytics?.summary?.pending || 0) > ((analytics?.summary?.totalBookings || 0) * 0.3) && (
                                        <li><strong>{Math.round(((analytics?.summary?.pending || 0) / (analytics?.summary?.totalBookings || 1))*100)}%</strong> of your bookings are currently pending processing.</li>
                                    )}
                                    {(analytics?.popularTests?.length || 0) > 0 && analytics?.popularTests && (
                                        <li><strong>{analytics.popularTests[0].name}</strong> is your highest-volume test ({analytics.popularTests[0].percentage}% of total bookings).</li>
                                    )}
                                    {(analytics?.summary?.cancellationRate || 0) > (analytics?.previousPeriod?.cancellationRate || 0) && (
                                        <li>Cancellation rate increased to <strong>{analytics?.summary?.cancellationRate}%</strong> (was {analytics?.previousPeriod?.cancellationRate}%).</li>
                                    )}
                                    {(analytics?.sampleCollection?.home?.total || 0) > 0 && (
                                        <li>Home collection represents <strong>{Math.round(((analytics?.sampleCollection?.home?.total || 0) / (analytics?.summary?.totalBookings || 1))*100)}%</strong> of bookings.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </DashboardCard>
            )}
        </div>
    );
}
