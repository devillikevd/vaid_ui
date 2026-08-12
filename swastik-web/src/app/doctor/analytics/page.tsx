'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3, Calendar, IndianRupee, Video, Activity, Clock,
    RefreshCw, Loader2, AlertCircle, CheckCircle2, XCircle, Target,
    Info, Users, TrendingUp, TrendingDown, Minus, ArrowRight
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import Link from 'next/link';

interface AnalyticsSummary {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    avgRevenuePerConsultation: number;
    cancellationRate: number;
    completionRate: number;
    videoConsultations: number;
    inPersonConsultations: number;
    uniquePatients?: number;
}
interface PreviousSummary {
    totalAppointments: number;
    totalRevenue: number;
    cancellationRate: number;
    completionRate: number;
}
interface DailyData {
    date: string; appointments: number; revenue: number;
    video: number; inPerson: number; cancelled: number; completed: number;
}
interface AnalyticsData {
    period: string;
    summary: AnalyticsSummary;
    previousSummary?: PreviousSummary;
    charts: {
        daily: DailyData[];
        consultationType: { name: string; value: number; color: string }[];
        peakHours: { hour: number; label: string; count: number }[];
    };
}
type Period = '7d' | '30d' | '90d';

export default function DoctorAnalyticsPage() {
    const [period, setPeriod] = useState<Period>('30d');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async (p: Period) => {
        setLoading(true); setError(null);
        try {
            const res = await doctorApi.getAnalytics(p);
            if (res.success && res.data) setData(res.data as AnalyticsData);
            else setError((res.message as string) || 'Failed to load analytics');
        } catch { setError('Could not connect to server.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAnalytics(period); }, [period, fetchAnalytics]);

    const pLabel: Record<Period, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };

    // Derived Insights & Highlights
    const practiceHighlights = useMemo(() => {
        if (!data) return [];
        const h = [];
        
        // Peak Hour
        const peak = [...data.charts.peakHours].sort((a, b) => b.count - a.count)[0];
        if (peak && peak.count > 0) {
            h.push(`Your busiest booking period is around ${peak.label}.`);
        }

        // Revenue Trend
        if (data.previousSummary && data.summary.totalRevenue !== data.previousSummary.totalRevenue) {
            if (data.summary.totalRevenue > data.previousSummary.totalRevenue) h.push(`Revenue increased compared to the previous period.`);
            else h.push(`Revenue decreased compared to the previous period.`);
        }

        // Consult Type
        if (data.summary.totalAppointments > 0) {
            const vidPct = Math.round((data.summary.videoConsultations / data.summary.totalAppointments) * 100);
            if (vidPct > 50) h.push(`Video consultations account for ${vidPct}% of appointments.`);
            else if (vidPct > 0) h.push(`In-person consultations are your most popular booking type.`);
        }
        
        return h;
    }, [data]);

    const renderTrend = (current: number, previous: number | undefined, inverseGood = false, isCurrency = false) => {
        if (previous === undefined || previous === null || current === undefined) return null;
        if (previous === 0 && current === 0) return null;
        
        const diff = current - previous;
        const pct = previous === 0 ? 100 : Math.round((Math.abs(diff) / previous) * 100);
        
        if (diff === 0) return (
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium mt-1">
                <Minus className="w-3.5 h-3.5" /> No change vs previous {period}
            </div>
        );

        const isPositiveDiff = diff > 0;
        const isGood = inverseGood ? !isPositiveDiff : isPositiveDiff;

        return (
            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositiveDiff ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {pct}% vs previous {period}
            </div>
        );
    };

    const maxRevenueItem = data?.charts.daily.reduce((max, item) => item.revenue > max.revenue ? item : max, { revenue: 0, date: '' });
    const avgDailyRevenue = data?.charts.daily.length ? Math.round(data.summary.totalRevenue / data.charts.daily.length) : 0;

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20">
                            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    </div>
                    <p className="text-gray-500 text-sm ml-14">{pLabel[period]} · Practice Performance Dashboard</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800 rounded-xl p-1">
                        {(['7d', '30d', '90d'] as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                disabled={loading}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} disabled:opacity-50`}
                            >
                                {p === '7d' ? '7D' : p === '30d' ? '30D' : '90D'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => fetchAnalytics(period)}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all text-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {loading && !data && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                    </div>
                    <p className="text-gray-500 text-sm">Loading analytics...</p>
                </div>
            )}

            {!loading && error && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">Unable to load analytics.</p>
                        <p className="text-gray-500 text-sm mb-3">{error}</p>
                        <button onClick={() => fetchAnalytics(period)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors">Retry</button>
                    </div>
                </div>
            )}

            {!loading && !error && data && data.summary.totalAppointments === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-[#0f1929] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                        <BarChart3 className="h-6 w-6 text-gray-400"/>
                    </div>
                    <div className="text-center max-w-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1.5">Not enough data yet</h3>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">Analytics will become more detailed as your practice activity grows.</p>
                    </div>
                </div>
            )}

            {/* Main Content Render */}
            <div className={`space-y-6 ${loading && data ? 'opacity-50 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
                {/* KPI Cards */}
                {data && data.summary.totalAppointments > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="inline-flex p-2.5 rounded-xl bg-blue-500/15 text-blue-500"><Calendar className="h-5 w-5" /></div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{data.summary.totalAppointments}</div>
                            <div className="text-sm font-medium text-gray-500">Total Appointments</div>
                            {renderTrend(data.summary.totalAppointments, data.previousSummary?.totalAppointments)}
                        </div>

                        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500"><IndianRupee className="h-5 w-5" /></div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{formatCurrency(data.summary.totalRevenue)}</div>
                            <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                            {renderTrend(data.summary.totalRevenue, data.previousSummary?.totalRevenue)}
                        </div>

                        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="inline-flex p-2.5 rounded-xl bg-green-500/15 text-green-500"><CheckCircle2 className="h-5 w-5" /></div>
                                <TooltipIcon content="Completed appointments ÷ total appointments in the selected period." />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{data.summary.completionRate}%</div>
                            <div className="text-sm font-medium text-gray-500">Completion Rate</div>
                            {renderTrend(data.summary.completionRate, data.previousSummary?.completionRate)}
                        </div>

                        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="inline-flex p-2.5 rounded-xl bg-amber-500/15 text-amber-500"><XCircle className="h-5 w-5" /></div>
                                <TooltipIcon content="Cancelled appointments ÷ total appointments in the selected period." />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{data.summary.cancellationRate}%</div>
                            <div className="text-sm font-medium text-gray-500">Cancellation Rate</div>
                            {renderTrend(data.summary.cancellationRate, data.previousSummary?.cancellationRate, true)}
                        </div>
                    </div>
                )}

                {/* Main Charts */}
                {data && data.summary.totalAppointments > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Appointment Trends */}
                        <div className="lg:col-span-2 bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Appointment Trends</h3>
                                    <p className="text-xs text-gray-500 mt-1">Daily appointment volume</p>
                                </div>
                                <Activity className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                                        <XAxis dataKey="date" tickFormatter={(val) => {
                                            const d = new Date(val); return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                                        }} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <RechartsTooltip content={<CustomTooltip type="appointments" />} cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }} />
                                        <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="cancelled" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Revenue Trends */}
                        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Revenue Trend</h3>
                                    <p className="text-xs text-gray-500 mt-1">Daily earnings</p>
                                </div>
                                <IndianRupee className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="h-[200px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.charts.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                                        <XAxis dataKey="date" tickFormatter={(val) => {
                                            const d = new Date(val); return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                                        }} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                                        <RechartsTooltip content={<CustomTooltip type="revenue" />} />
                                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Avg Daily</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(avgDailyRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Highest Day</p>
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(maxRevenueItem?.revenue || 0)}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {data && data.summary.totalAppointments > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Peak Hours Breakdown */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Peak Booking Hours</h3>
                                    <p className="text-xs text-gray-500 mt-1">Based on exact slot times</p>
                                </div>
                                <Clock className="h-5 w-5 text-gray-400" />
                            </div>
                            
                            {data.charts.peakHours.length > 0 ? (
                                <div className="space-y-3.5">
                                    {data.charts.peakHours.map((item, idx) => {
                                        const max = Math.max(...data.charts.peakHours.map(d => d.count), 1);
                                        const isPeak = item.count === max;
                                        return (
                                            <div key={item.hour} className="flex items-center gap-3">
                                                <span className={`text-xs w-10 shrink-0 font-medium ${isPeak ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {item.label}
                                                </span>
                                                <div className="flex-1 h-6 bg-gray-50 dark:bg-gray-800/50 rounded-full overflow-hidden relative group">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isPeak ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-300 dark:group-hover:bg-gray-500'}`}
                                                        style={{ width: Math.max((item.count / max) * 100, 4) + '%' }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold w-6 text-right shrink-0 ${isPeak ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {item.count}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic py-4">No slot data available yet.</p>
                            )}
                        </div>

                        {/* Consultation Type */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Consultation Type</h3>
                                    <p className="text-xs text-gray-500 mt-1">Video vs In-Person</p>
                                </div>
                                <Video className="h-5 w-5 text-gray-400" />
                            </div>
                            
                            <div className="flex flex-col items-center">
                                <div className="h-[160px] w-[160px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={data.charts.consultationType} 
                                                innerRadius={55} 
                                                outerRadius={75} 
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {data.charts.consultationType.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip type="pie" />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalAppointments}</span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total</span>
                                    </div>
                                </div>
                                
                                <div className="w-full mt-6 space-y-3">
                                    {data.charts.consultationType.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
                                                {item.value}{' '}
                                                <span className="text-gray-400 dark:text-gray-500 font-medium text-xs ml-1">({Math.round((item.value / (data.summary.totalAppointments || 1)) * 100)}%)</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Performance Details & Highlights */}
                        <div className="lg:col-span-1 space-y-6">
                            
                            <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-5 sm:p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Doctor Performance</h3>
                                    <Target className="h-5 w-5 text-gray-400" />
                                </div>
                                
                                <div className="space-y-4">
                                    {data.summary.uniquePatients !== undefined && (
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-3">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Users className="w-4 h-4"/> Unique Patients</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{data.summary.uniquePatients}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-3">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <IndianRupee className="w-4 h-4"/> Avg Revenue / Consult 
                                            <TooltipIcon content="Gross consultation fees ÷ completed consultations." />
                                        </span>
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.summary.avgRevenuePerConsultation)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Video className="w-4 h-4"/> Video Comp. Rate</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {data.summary.videoConsultations > 0 ? Math.round((data.charts.daily.reduce((acc, curr) => acc + (curr.video > 0 && curr.completed > 0 ? curr.video : 0), 0) / data.summary.videoConsultations) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-2xl p-5 sm:p-6">
                                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Practice Highlights
                                </h3>
                                {practiceHighlights.length > 0 ? (
                                    <ul className="space-y-3">
                                        {practiceHighlights.map((h, i) => (
                                            <li key={i} className="text-sm font-medium text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed flex items-start gap-2">
                                                <span className="text-indigo-400 mt-1">•</span> {h}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Not enough data to generate highlights.</p>
                                )}
                            </div>

                        </div>
                    </div>
                )}
                
                {/* Next Actions (Deterministic) */}
                {data && data.summary.totalAppointments > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.summary.cancellationRate > 15 && (
                            <Link href="/doctor/appointments" className="group flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1">High Cancellations</p>
                                    <p className="text-sm font-semibold text-red-900 dark:text-red-300">View Appointments</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        )}
                        {data.summary.totalAppointments < 10 && (
                            <Link href="/doctor/settings" className="group flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-1">Low Volume</p>
                                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">Complete Profile</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        )}
                        {data.summary.cancellationRate <= 15 && data.summary.totalAppointments >= 10 && (
                             <Link href="/doctor/schedule" className="group flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                             <div>
                                 <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Schedule Ready</p>
                                 <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Manage Schedule</p>
                             </div>
                             <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                         </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Custom Recharts Tooltips
function CustomTooltip({ active, payload, label, type }: any) {
    if (!active || !payload || !payload.length) return null;

    if (type === 'appointments') {
        const d = payload[0].payload;
        const total = d.appointments;
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl shadow-xl">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{formatDate(label)}</p>
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 flex justify-between gap-4">Appointments: <span className="text-gray-900 dark:text-white">{total}</span></p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex justify-between gap-4">Completed: <span className="text-gray-900 dark:text-white">{d.completed}</span></p>
                    <p className="text-xs font-semibold text-red-500 flex justify-between gap-4">Cancelled: <span className="text-gray-900 dark:text-white">{d.cancelled}</span></p>
                </div>
            </div>
        );
    }
    
    if (type === 'revenue') {
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl shadow-xl">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{formatDate(label)}</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Revenue: {formatCurrency(payload[0].value)}</p>
            </div>
        );
    }

    if (type === 'pie') {
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl shadow-xl flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                <p className="text-sm font-bold text-gray-900 dark:text-white">{payload[0].name}: {payload[0].value}</p>
            </div>
        );
    }

    return null;
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TooltipIcon({ content }: { content: string }) {
    return (
        <div className="group relative inline-block">
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-help" />
            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg shadow-xl z-50 text-center">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
            </div>
        </div>
    );
}
