'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Activity,
    BarChart3,
    CalendarCheck,
    Dumbbell,
    Flame,
    Footprints,
    Loader2,
    Moon,
    RefreshCw,
    Search,
    Trophy,
    Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface CoachPatient {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    source?: string;
    totalSessions?: number;
    activePlans?: number;
    lastSessionAt?: string | null;
}

interface PatientAnalytics {
    patient: {
        id: string;
        name: string;
        medical_conditions?: string[];
        chronic_conditions?: string[];
    };
    metrics: {
        workoutsCompleted: number;
        activeDays: number;
        totalMinutes: number;
        totalCalories: number;
        avgDailySteps: number;
        currentStreak: number;
        longestStreak: number;
        avgSleepMinutes?: number;
    };
    recentWorkouts: unknown[];
    activePlans: unknown[];
    badges: unknown[];
    trend?: Array<{ date: string; steps?: number | null; activeCalories?: number | null; sleepMinutes?: number | null }>;
}

const formatDT = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';
const formatMinutes = (m: number) => m > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : '0m';

export default function WellnessClientsPage() {
    const toast = useToast();
    const [clients, setClients] = useState<CoachPatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<PatientAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getCoachPatients();
            if (!res.success) throw new Error(res.error || 'Failed to load');
            setClients(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load clients');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const viewAnalytics = async (patientId: string) => {
        if (selectedId === patientId && analytics) {
            setSelectedId(null);
            setAnalytics(null);
            return;
        }
        setSelectedId(patientId);
        setAnalyticsLoading(true);
        setAnalytics(null);
        try {
            const res = await wellnessApi.getPatientAnalytics(patientId);
            if (!res.success) throw new Error(res.error || 'Failed to load');
            setAnalytics(res.data as PatientAnalytics);
        } catch (err) {
            toast.error('Analytics failed', err instanceof Error ? err.message : 'Unable to load analytics');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const filtered = clients.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (c.name || '').toLowerCase().includes(s) || (c.city || '').toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s);
    });

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading clients...</span></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">View your client roster, sessions, and 30-day wellness analytics.</p>
                </div>
                <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or city..."
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Client list */}
                <div className="xl:col-span-1 space-y-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-lime-600" /> {filtered.length} Client{filtered.length !== 1 ? 's' : ''}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="h-10 w-10 text-gray-300 mx-auto" />
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No clients yet. They&apos;ll appear after booking sessions.</p>
                                </div>
                            ) : filtered.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => viewAnalytics(client.id)}
                                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                                        selectedId === client.id
                                            ? 'border-lime-500 bg-lime-50 shadow-sm dark:bg-lime-950 dark:border-lime-700'
                                            : 'border-gray-100 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name || 'Client'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {[client.city, client.totalSessions ? `${client.totalSessions} sessions` : null, client.activePlans ? `${client.activePlans} plans` : null].filter(Boolean).join(' • ') || 'No activity'}
                                            </p>
                                            {client.lastSessionAt && <p className="text-xs text-gray-400 mt-0.5">Last: {formatDT(client.lastSessionAt)}</p>}
                                        </div>
                                        <Activity className={`h-5 w-5 flex-shrink-0 ${selectedId === client.id ? 'text-lime-600' : 'text-gray-300'}`} />
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Analytics panel */}
                <div className="xl:col-span-2">
                    {analyticsLoading ? (
                        <Card><div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div></Card>
                    ) : !analytics ? (
                        <Card>
                            <div className="flex flex-col items-center gap-3 p-12">
                                <BarChart3 className="h-12 w-12 text-gray-300" />
                                <p className="text-gray-500 dark:text-gray-400">Select a client to view their 30-day wellness analytics.</p>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {/* Patient header */}
                            <Card>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{analytics.patient.name}</h2>
                                            {(analytics.patient.medical_conditions || []).length > 0 && (
                                                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                                    ⚠ Medical conditions: {(analytics.patient.medical_conditions || []).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-lime-600">
                                            <Trophy className="h-5 w-5" />
                                            <span className="font-bold">{analytics.metrics.currentStreak} day streak</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Metrics grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Workouts', value: analytics.metrics.workoutsCompleted, icon: Dumbbell, color: 'text-lime-600', bg: 'bg-lime-100' },
                                    { label: 'Active Days', value: analytics.metrics.activeDays, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
                                    { label: 'Minutes', value: formatMinutes(analytics.metrics.totalMinutes), icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
                                    { label: 'Calories', value: analytics.metrics.totalCalories.toLocaleString('en-IN'), icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
                                    { label: 'Avg Steps', value: analytics.metrics.avgDailySteps.toLocaleString('en-IN'), icon: Footprints, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                                    { label: 'Avg Sleep', value: formatMinutes(analytics.metrics.avgSleepMinutes || 0), icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                                ].map(metric => {
                                    const Icon = metric.icon;
                                    return (
                                        <Card key={metric.label}>
                                            <div className="flex items-center gap-3">
                                                <div className={`rounded-xl p-2.5 ${metric.bg}`}><Icon className={`h-5 w-5 ${metric.color}`} /></div>
                                                <div>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metric.value}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Step trend chart */}
                            {analytics.trend && analytics.trend.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-lime-600" /> Daily Step Trend (14 days)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-end gap-1 h-24">
                                            {analytics.trend.slice(-14).map(day => (
                                                <div
                                                    key={day.date}
                                                    title={`${day.date}: ${day.steps ?? 'n/a'} steps`}
                                                    className="flex-1 rounded-t bg-lime-300 dark:bg-lime-700 transition-all hover:bg-lime-400"
                                                    style={{ height: `${Math.min(100, Math.max(4, Math.round(((day.steps ?? 0) / 12000) * 100)))}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                                            <span>{analytics.trend[Math.max(0, analytics.trend.length - 14)]?.date}</span>
                                            <span>{analytics.trend[analytics.trend.length - 1]?.date}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
