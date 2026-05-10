'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Radar, AlertTriangle, Eye, Shield, Activity,
    RefreshCw, Loader2, MapPin, TrendingUp,
    ChevronRight, X, Play,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/lib/api';

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
    status: string;
    detected_at: string;
    age_groups: Record<string, number>;
    gender_distribution: Record<string, number>;
}

interface HeatmapPoint {
    id: string;
    disease: string;
    severity: 'watch' | 'warning' | 'critical';
    city: string;
    state: string;
    lat: number;
    lng: number;
    cases: number;
    baseline: number;
    zScore: number;
    recommendations: string;
    detectedAt: string;
}

interface OutbreakStats {
    totalEvents: number;
    bySource: Record<string, number>;
    topDiseases: { name: string; count: number }[];
    topCities: { name: string; count: number }[];
    dailyTrend: { date: string; count: number }[];
}

interface DashboardData {
    alerts: OutbreakAlert[];
    summary: {
        totalActive: number;
        totalMonitoring: number;
        critical: number;
        warning: number;
        watch: number;
    };
    pagination: { page: number; total: number; pages: number };
}

/* ─── Severity styling ─── */

const SEVERITY_STYLES = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-600', dot: 'bg-red-500', ring: 'ring-red-500/20' },
    warning:  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-500', dot: 'bg-amber-500', ring: 'ring-amber-500/20' },
    watch:    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-500', dot: 'bg-blue-500', ring: 'ring-blue-500/20' },
};

/* ─── Component ─── */

export default function OutbreakMonitorPage() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
    const [stats, setStats] = useState<OutbreakStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<OutbreakAlert | null>(null);
    const [filter, setFilter] = useState<{ status?: string; severity?: string }>({});

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [dashRes, heatRes, statsRes] = await Promise.all([
                adminApi.getOutbreaks({ ...filter }),
                adminApi.getOutbreakHeatmap(),
                adminApi.getOutbreakStats(30),
            ]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dr = dashRes as any;
            const hr = heatRes as any;
            const sr = statsRes as any;
            if (dr.success) setDashboard({ alerts: dr.alerts ?? [], summary: dr.summary ?? { totalActive: 0, totalMonitoring: 0, critical: 0, warning: 0, watch: 0 }, pagination: dr.pagination ?? { page: 1, total: 0, pages: 0 } });
            if (hr.success) setHeatmapData((hr.data ?? []) as HeatmapPoint[]);
            if (sr.success) setStats((sr.data ?? null) as OutbreakStats | null);
        } catch (err) {
            console.error('Outbreak fetch error:', err);
            setError('Failed to load outbreak data');
        } finally {
            setIsLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            await adminApi.triggerOutbreakAnalysis();
            await fetchData();
        } catch (_err) { /* ignore */ } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDismiss = async (alertId: string) => {
        await adminApi.updateOutbreakStatus(alertId, 'dismissed', 'Dismissed by admin');
        fetchData();
    };

    const summary = dashboard?.summary;

    /* ─── Loading ─── */
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading outbreak data...</span>
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

    /* ─── Stats Cards ─── */
    const STAT_CARDS = [
        { label: 'Critical Alerts', value: summary?.critical ?? 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
        { label: 'Warnings', value: summary?.warning ?? 0, icon: Eye, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
        { label: 'Watch', value: summary?.watch ?? 0, icon: Radar, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
        { label: 'Health Events (30d)', value: stats?.totalEvents ?? 0, icon: Activity, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Radar className="h-7 w-7 text-blue-600" />
                        Disease Outbreak Monitor
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Area-wise disease prediction and anomaly detection
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={filter.severity || ''}
                        onChange={(e) => setFilter(f => ({ ...f, severity: e.target.value || undefined }))}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200"
                    >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="watch">Watch</option>
                    </select>
                    <Button
                        variant="outline"
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        leftIcon={isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                    </Button>
                    <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_CARDS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label} padding="md">
                            <div className="flex items-start justify-between">
                                <div className={`p-2.5 rounded-xl ${stat.color}`}><Icon className="h-5 w-5" /></div>
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value.toLocaleString()}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Heat Map Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-500" />
                        Outbreak Heat Map
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {heatmapData.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {heatmapData.map((point) => {
                                const s = SEVERITY_STYLES[point.severity];
                                return (
                                    <div key={point.id} className={`p-4 rounded-xl border ${s.bg} ${s.ring} ring-1`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full text-white ${s.badge}`}>
                                                {point.severity}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                z={point.zScore}
                                            </span>
                                        </div>
                                        <h4 className={`font-semibold capitalize ${s.text}`}>{point.disease.replace(/_/g, ' ')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                            <MapPin className="h-3 w-3 inline mr-1" />{point.city}, {point.state}
                                        </p>
                                        <div className="flex items-center justify-between mt-3 text-sm">
                                            <span className={`font-bold ${s.text}`}>{point.cases} cases</span>
                                            <span className="text-gray-500 dark:text-gray-400">baseline: {point.baseline}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                            <Shield className="h-12 w-12 mb-3 text-green-400" />
                            <p className="font-medium text-green-600 dark:text-green-400">No active outbreaks detected</p>
                            <p className="text-sm mt-1">All areas are within normal health event baselines</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Diseases */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Top Reported Conditions (30d)</CardTitle></CardHeader>
                    <CardContent>
                        {stats?.topDiseases && stats.topDiseases.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topDiseases.map((d, i) => {
                                    const maxCount = stats.topDiseases[0]?.count || 1;
                                    return (
                                        <div key={d.name}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="capitalize text-gray-700 dark:text-gray-300">{d.name.replace(/_/g, ' ')}</span>
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">{d.count} events</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : i < 3 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${(d.count / maxCount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">No data yet</div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Cities */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Top Affected Areas (30d)</CardTitle></CardHeader>
                    <CardContent>
                        {stats?.topCities && stats.topCities.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topCities.map((c, i) => {
                                    const maxCount = stats.topCities[0]?.count || 1;
                                    return (
                                        <div key={c.name}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">{c.count} events</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : i < 3 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${(c.count / maxCount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">No data yet</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Alert List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Active Alerts ({dashboard?.alerts?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {dashboard?.alerts && dashboard.alerts.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {dashboard.alerts.map((alert) => {
                                const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.watch;
                                return (
                                    <div key={alert.id} className="py-4 flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${s.dot} animate-pulse`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                                        {alert.disease_or_symptom.replace(/_/g, ' ')}
                                                    </h4>
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full text-white ${s.badge}`}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {alert.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    <MapPin className="h-3 w-3 inline mr-1" />
                                                    {alert.city}{alert.state ? `, ${alert.state}` : ''} — {alert.event_count} cases (baseline: {alert.baseline_count}) — z-score: {alert.deviation_score}
                                                </p>
                                                {alert.recommendations && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                        {alert.recommendations}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Detected: {new Date(alert.detected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedAlert(alert)}
                                                leftIcon={<ChevronRight className="h-4 w-4" />}
                                            >
                                                Details
                                            </Button>
                                            {alert.status === 'active' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDismiss(alert.id)}
                                                    leftIcon={<X className="h-4 w-4" />}
                                                >
                                                    Dismiss
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400">
                            <Shield className="h-6 w-6 mr-2 text-green-500" /> No alerts — all regions are healthy
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Daily Trend */}
            {stats?.dailyTrend && stats.dailyTrend.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Health Events — Daily Trend (30 days)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-48 flex items-end justify-between gap-px px-2">
                            {stats.dailyTrend.map((d) => {
                                const maxCount = Math.max(...stats.dailyTrend.map(x => x.count), 1);
                                const pct = (d.count / maxCount) * 100;
                                return (
                                    <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.count} events`}>
                                        <div
                                            className="w-full bg-blue-500 dark:bg-blue-400 rounded-t transition-all group-hover:bg-blue-600"
                                            style={{ height: `${Math.max(pct, 2)}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span>{stats.dailyTrend[0]?.date}</span>
                            <span>{stats.dailyTrend[stats.dailyTrend.length - 1]?.date}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detail Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAlert(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                                {selectedAlert.disease_or_symptom.replace(/_/g, ' ')}
                            </h2>
                            <button onClick={() => setSelectedAlert(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">Current Cases</p>
                                    <p className="text-2xl font-bold text-red-600">{selectedAlert.event_count}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400">Baseline</p>
                                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{selectedAlert.baseline_count}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Location</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{selectedAlert.city}, {selectedAlert.state}</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Deviation Score (Z-Score)</p>
                                <p className="font-bold text-lg">{selectedAlert.deviation_score}</p>
                            </div>
                            {Object.keys(selectedAlert.age_groups || {}).length > 0 && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400 mb-2">Age Distribution</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedAlert.age_groups).map(([group, count]) => (
                                            <span key={group} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                                {group}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedAlert.recommendations && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-amber-800 dark:text-amber-300 text-sm">{selectedAlert.recommendations}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
