'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Radar, AlertTriangle, Shield, Activity,
    RefreshCw, Loader2, MapPin, TrendingUp,
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
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-600', dot: 'bg-red-500', ring: 'ring-red-500/20' },
    warning:  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-500', dot: 'bg-amber-500', ring: 'ring-amber-500/20' },
    watch:    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-500', dot: 'bg-blue-500', ring: 'ring-blue-500/20' },
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
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading health alerts...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    const STAT_CARDS = [
        { label: 'Critical', value: summary.critical ?? 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
        { label: 'Warnings', value: summary.warning ?? 0, icon: Radar, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
        { label: 'Watch', value: summary.watch ?? 0, icon: Shield, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
        { label: 'Events (30d)', value: stats?.totalEvents ?? 0, icon: Activity, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2`}>
                        <Radar className={`h-7 w-7 ${accentColor}`} />
                        {title}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
                </div>
                <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_CARDS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label} padding="md">
                            <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-xl ${stat.color}`}><Icon className="h-5 w-5" /></div>
                            </div>
                            <div className="mt-3">
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Heatmap Tiles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-red-500" />Active Outbreak Zones</CardTitle>
                </CardHeader>
                <CardContent>
                    {heatmap.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {heatmap.map((point) => {
                                const s = SEVERITY_STYLES[point.severity];
                                return (
                                    <div key={point.id} className={`p-4 rounded-xl border ${s.bg} ${s.ring} ring-1`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full text-white ${s.badge}`}>{point.severity}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">z={point.zScore}</span>
                                        </div>
                                        <h4 className={`font-semibold capitalize ${s.text}`}>{point.disease.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1"><MapPin className="h-3 w-3 inline mr-1" />{point.city}, {point.state}</p>
                                        <div className="flex items-center justify-between mt-3 text-sm">
                                            <span className={`font-bold ${s.text}`}>{point.cases} cases</span>
                                            <span className="text-gray-500 dark:text-gray-400">baseline: {point.baseline}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                            <Shield className="h-10 w-10 mb-2 text-green-400" />
                            <p className="font-medium text-green-600 dark:text-green-400">No active outbreaks detected</p>
                            <p className="text-sm mt-1">All areas are within normal baselines</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Diseases */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Top Conditions (30d)</CardTitle></CardHeader>
                    <CardContent>
                        {stats?.topDiseases && stats.topDiseases.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topDiseases.slice(0, 8).map((d, i) => {
                                    const maxCount = stats.topDiseases[0]?.count || 1;
                                    return (
                                        <div key={d.name}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="capitalize text-gray-700 dark:text-gray-300">{d.name.replace(/_/g, ' ')}</span>
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">{d.count}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : i < 3 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${(d.count / maxCount) * 100}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400">No data yet</div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Cities */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Most Affected Areas (30d)</CardTitle></CardHeader>
                    <CardContent>
                        {stats?.topCities && stats.topCities.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topCities.slice(0, 8).map((c, i) => {
                                    const maxCount = stats.topCities[0]?.count || 1;
                                    return (
                                        <div key={c.name}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">{c.count}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : i < 3 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${(c.count / maxCount) * 100}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400">No data yet</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Alert List */}
            {alerts.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Active Alerts</CardTitle></CardHeader>
                    <CardContent>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {alerts.map((alert) => {
                                const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.watch;
                                return (
                                    <div key={alert.id} className="py-3 flex items-start gap-3">
                                        <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${s.dot} animate-pulse`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{alert.disease_or_symptom.replace(/_/g, ' ')}</span>
                                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full text-white ${s.badge}`}>{alert.severity}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                <MapPin className="h-3 w-3 inline mr-1" />{alert.city}{alert.state ? `, ${alert.state}` : ''} — {alert.event_count} cases
                                            </p>
                                            {alert.recommendations && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{alert.recommendations}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
