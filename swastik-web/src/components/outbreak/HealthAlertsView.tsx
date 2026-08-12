'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Radar, AlertTriangle, Shield, Activity,
    RefreshCw, MapPin, TrendingUp, ShieldCheck, Map as MapIcon, LineChart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/* ─── Types ─── */

interface OutbreakAlert {
    id: string;
    disease_or_symptom: string;
    severity: 'watch' | 'warning' | 'critical';
    city: string;
    state: string;
    event_count: number;
    baseline_count: number;
    deviation_score: number;
    recommendations: string;
    detected_at: string;
}

interface HeatmapPoint {
    id: string;
    disease: string;
    severity: 'watch' | 'warning' | 'critical';
    city: string;
    state: string;
    cases: number;
    baseline: number;
    zScore: number;
}

interface OutbreakStats {
    totalEvents: number;
    topDiseases: { name: string; count: number }[];
    topCities: { name: string; count: number }[];
}

const SEVERITY_STYLES = {
    critical: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-600', dot: 'bg-rose-500', ring: 'ring-rose-500/20', hover: 'hover:border-rose-300 hover:shadow-rose-900/10' },
    warning:  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-500', dot: 'bg-amber-500', ring: 'ring-amber-500/20', hover: 'hover:border-amber-300 hover:shadow-amber-900/10' },
    watch:    { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-600', dot: 'bg-teal-500', ring: 'ring-teal-500/20', hover: 'hover:border-teal-300 hover:shadow-teal-900/10' }, // Teal for monitoring
};

/* ─── Props ─── */

interface HealthAlertsViewProps {
    title: string;
    subtitle: string;
    accentColor: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchAlerts: (city?: string) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchHeatmap: () => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchStats: (days: number) => Promise<any>;
}

const AlertsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            ))}
        </div>
        {/* Heatmap Skeleton */}
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        {/* Analytics Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        </div>
        {/* Alerts Skeleton */}
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
    </div>
);

export default function HealthAlertsView({ title, subtitle, accentColor, fetchAlerts, fetchHeatmap, fetchStats }: HealthAlertsViewProps) {
    const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
    const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
    const [stats, setStats] = useState<OutbreakStats | null>(null);
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [alertRes, heatRes, statsRes] = await Promise.all([
                fetchAlerts(),
                fetchHeatmap(),
                fetchStats(30),
            ]) as any[];
            if (alertRes.success) { setAlerts(alertRes.alerts ?? []); setSummary(alertRes.summary ?? {}); }
            if (heatRes.success) setHeatmap(heatRes.data ?? []);
            if (statsRes.success) setStats(statsRes.data ?? null);
        } catch (_err) {
            setError('Failed to load health alert data');
        } finally {
            setIsLoading(false);
        }
    }, [fetchAlerts, fetchHeatmap, fetchStats]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (isLoading) {
        return <AlertsSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4 bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/50">
                <AlertTriangle className="h-10 w-10 text-red-500" />
                <p className="text-red-600 font-bold">{error}</p>
                <Button onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} className="rounded-xl font-bold bg-red-600 hover:bg-red-700">Retry</Button>
            </div>
        );
    }

    const STAT_CARDS = [
        { label: 'Critical Outbreaks', value: summary.critical ?? 0, icon: AlertTriangle, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', hover: 'hover:shadow-rose-900/5 hover:border-rose-300' },
        { label: 'Active Warnings', value: summary.warning ?? 0, icon: Radar, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', hover: 'hover:shadow-amber-900/5 hover:border-amber-300' },
        { label: 'Monitoring', value: summary.watch ?? 0, icon: Shield, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800', hover: 'hover:shadow-teal-900/5 hover:border-teal-300' },
        { label: 'Total Events (30d)', value: stats?.totalEvents ?? 0, icon: Activity, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', hover: 'hover:shadow-blue-900/5 hover:border-blue-300' },
    ];

    return (
        <div className="space-y-6">
            {/* Header (Rendered conditionally based on props, typically empty when wrapped by Dashboard) */}
            {(title || subtitle) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2`}>
                            <Radar className={`h-7 w-7 ${accentColor}`} />
                            {title}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
                    </div>
                    <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} className="rounded-xl font-bold">Refresh</Button>
                </div>
            )}

            {/* Premium Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {STAT_CARDS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className={`bg-white dark:bg-gray-900 rounded-3xl p-6 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${stat.color.split(' ').filter(c => c.startsWith('border-')).join(' ')} ${stat.hover}`}>
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-2xl ${stat.color.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('dark:')).join(' ')}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{stat.value}</p>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Outbreak Zones Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-rose-500" />
                        Active Outbreak Zones
                    </h2>
                </div>
                <div className="p-6">
                    {heatmap.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {heatmap.map((point) => {
                                const s = SEVERITY_STYLES[point.severity];
                                return (
                                    <div key={point.id} className={`p-5 rounded-2xl border transition-all duration-250 ${s.bg} ${s.ring} ring-1 ${s.hover} hover:shadow-md`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg text-white shadow-sm ${s.badge}`}>{point.severity}</span>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">z={point.zScore}</span>
                                        </div>
                                        <h4 className={`font-extrabold text-lg capitalize tracking-tight ${s.text}`}>{point.disease.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{point.city}, {point.state}</p>
                                        <div className="flex items-center justify-between mt-4 text-sm pt-3 border-t border-black/5 dark:border-white/5">
                                            <span className={`font-extrabold ${s.text}`}>{point.cases} cases</span>
                                            <span className="text-gray-500 dark:text-gray-400 font-semibold">baseline: {point.baseline}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-full mb-5 ring-8 ring-emerald-50/50 dark:ring-emerald-900/10">
                                <ShieldCheck className="h-12 w-12 text-emerald-500" strokeWidth={1.5} />
                            </div>
                            <p className="font-extrabold text-xl text-gray-900 dark:text-white tracking-tight mb-2">No outbreak detected.</p>
                            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm">All monitored areas are currently within normal baseline thresholds.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Conditions */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            Top Conditions (30d)
                        </h2>
                    </div>
                    <div className="p-6">
                        {stats?.topDiseases && stats.topDiseases.length > 0 ? (
                            <div className="space-y-4">
                                {stats.topDiseases.slice(0, 8).map((d, i) => {
                                    const maxCount = stats.topDiseases[0]?.count || 1;
                                    return (
                                        <div key={d.name} className="group">
                                            <div className="flex items-center justify-between text-sm mb-1.5">
                                                <span className="capitalize font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{d.name.replace(/_/g, ' ')}</span>
                                                <span className="text-gray-900 dark:text-white font-extrabold">{d.count}</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-rose-500' : i < 3 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${(d.count / maxCount) * 100}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-10 flex flex-col items-center justify-center text-center">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
                                    <LineChart className="h-10 w-10 text-blue-400" strokeWidth={1.5} />
                                </div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">No clinical trends available.</p>
                                <p className="text-sm text-gray-500 mt-1">Insufficient data to calculate trends.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Most Affected Areas */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            Most Affected Areas (30d)
                        </h2>
                    </div>
                    <div className="p-6">
                        {stats?.topCities && stats.topCities.length > 0 ? (
                            <div className="space-y-4">
                                {stats.topCities.slice(0, 8).map((c, i) => {
                                    const maxCount = stats.topCities[0]?.count || 1;
                                    return (
                                        <div key={c.name} className="group">
                                            <div className="flex items-center justify-between text-sm mb-1.5">
                                                <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{c.name}</span>
                                                <span className="text-gray-900 dark:text-white font-extrabold">{c.count}</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-rose-500' : i < 3 ? 'bg-orange-500' : 'bg-indigo-500'}`} style={{ width: `${(c.count / maxCount) * 100}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-10 flex flex-col items-center justify-center text-center">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-full mb-4">
                                    <MapIcon className="h-10 w-10 text-indigo-400" strokeWidth={1.5} />
                                </div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">No regional trends available.</p>
                                <p className="text-sm text-gray-500 mt-1">Geographic distribution is normal.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alert List */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Community Advisories
                    </h2>
                </div>
                <div className="p-0">
                    {alerts.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {alerts.map((alert) => {
                                const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.watch;
                                return (
                                    <div key={alert.id} className={`p-6 flex items-start gap-4 transition-colors duration-250 hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                                        <div className={`mt-1.5 h-3 w-3 rounded-full flex-shrink-0 ${s.dot} ring-4 ${s.ring} animate-pulse`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                                <span className="font-extrabold text-lg text-gray-900 dark:text-gray-100 capitalize tracking-tight">{alert.disease_or_symptom.replace(/_/g, ' ')}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg text-white shadow-sm ${s.badge}`}>{alert.severity}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold mt-1.5 flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-gray-400" />{alert.city}{alert.state ? `, ${alert.state}` : ''} — {alert.event_count} documented cases
                                            </p>
                                            {alert.recommendations && (
                                                <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{alert.recommendations}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-full mb-6 ring-8 ring-blue-50/50 dark:ring-blue-900/10">
                                <Radar className="h-14 w-14 text-blue-500" strokeWidth={1.5} />
                            </div>
                            <p className="font-extrabold text-xl text-gray-900 dark:text-white tracking-tight mb-2">No active community advisories.</p>
                            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm">Everything is operating normally. Community health metrics are stable.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
