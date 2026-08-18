'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Activity, AlertTriangle, ShieldAlert, CheckCircle2,
    RefreshCw, Search, ArrowRight,
    Building2, Stethoscope, Pill, Microscope, Building,
    Globe, TrendingUp, Calendar,
    FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// ----- Types -----

type AlertCategory = 'all' | 'clinic' | 'hospital' | 'pharmacy' | 'diagnostics' | 'public_health';
type AlertSeverity = 'all' | 'critical' | 'warning' | 'info' | 'resolved';

interface HealthAlertItem {
    id: string;
    category: 'clinic' | 'hospital' | 'pharmacy' | 'diagnostics' | 'public_health';
    severity: 'critical' | 'warning' | 'info' | 'resolved';
    title: string;
    description: string;
    sourceName: string;
    timestamp: string;
    status: string;
    actionUrl?: string;
    actionLabel?: string;
}

interface HealthAlertsResponse {
    alerts: HealthAlertItem[];
    kpi: {
        critical: number;
        warnings: number;
        needsAttention: number;
        events30d: number;
    };
    countsByCategory: {
        all: number;
        clinic: number;
        hospital: number;
        pharmacy: number;
        diagnostics: number;
        public_health: number;
    };
    countsBySeverity: {
        all: number;
        critical: number;
        warning: number;
        info: number;
        resolved: number;
    };
    clinicTrends: {
        totalAppointments: number;
        cancellationRate: number;
        activeLeavesCount: number;
        partnerHandoffsCount: number;
    };
}

function ClinicHealthAlertsContent() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<HealthAlertsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramCategory = searchParams.get('category') as AlertCategory | null;
    const paramSeverity = searchParams.get('severity') as AlertSeverity | null;

    const validCategories: AlertCategory[] = ['all', 'clinic', 'hospital', 'pharmacy', 'diagnostics', 'public_health'];
    const validSeverities: AlertSeverity[] = ['all', 'critical', 'warning', 'info', 'resolved'];

    const initialCategory: AlertCategory = paramCategory && validCategories.includes(paramCategory) ? paramCategory : 'all';
    const initialSeverity: AlertSeverity = paramSeverity && validSeverities.includes(paramSeverity) ? paramSeverity : 'all';

    const [categoryFilter, setCategoryFilter] = useState<AlertCategory>(initialCategory);
    const [severityFilter, setSeverityFilter] = useState<AlertSeverity>(initialSeverity);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (paramCategory && validCategories.includes(paramCategory)) {
            setCategoryFilter(paramCategory);
        }
        if (paramSeverity && validSeverities.includes(paramSeverity)) {
            setSeverityFilter(paramSeverity);
        }
    }, [paramCategory, paramSeverity]);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await clinicApi.getHealthAlerts();
            if (response.success && response.data) {
                setData(response.data as unknown as HealthAlertsResponse);
            } else {
                setError(response.error || 'Failed to load clinic health intelligence alerts');
            }
        } catch (err: unknown) {
            console.error('Failed to fetch clinic health alerts:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch health alerts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Filter alerts based on active category, severity, and search
    const filteredAlerts = useMemo(() => {
        if (!data?.alerts) return [];
        return data.alerts.filter((alert) => {
            // Category Filter
            if (categoryFilter !== 'all' && alert.category !== categoryFilter) {
                return false;
            }

            // Severity Filter
            if (severityFilter !== 'all' && alert.severity !== severityFilter) {
                return false;
            }

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = alert.title.toLowerCase().includes(q);
                const matchDesc = alert.description.toLowerCase().includes(q);
                const matchSource = alert.sourceName.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchSource) return false;
            }

            return true;
        });
    }, [data, categoryFilter, severityFilter, searchQuery]);

    const categoryTabs: { id: AlertCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'all', label: 'All Alerts', icon: Activity },
        { id: 'clinic', label: 'Clinic', icon: Stethoscope },
        { id: 'hospital', label: 'Hospitals', icon: Building },
        { id: 'pharmacy', label: 'Pharmacies', icon: Pill },
        { id: 'diagnostics', label: 'Diagnostics', icon: Microscope },
        { id: 'public_health', label: 'Public Health', icon: Globe },
    ];

    const getSeverityBadge = (sev: string) => {
        switch (sev) {
            case 'critical':
                return {
                    icon: ShieldAlert,
                    text: 'Critical',
                    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-900/40',
                };
            case 'warning':
                return {
                    icon: AlertTriangle,
                    text: 'Warning',
                    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
                };
            case 'resolved':
                return {
                    icon: CheckCircle2,
                    text: 'Resolved',
                    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40',
                };
            default:
                return {
                    icon: Activity,
                    text: 'Informational',
                    bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/40',
                };
        }
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'clinic':
                return { label: 'Clinic Ops', color: 'bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300' };
            case 'hospital':
                return { label: 'Hospital Partner', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300' };
            case 'pharmacy':
                return { label: 'Pharmacy Partner', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' };
            case 'diagnostics':
                return { label: 'Diagnostic Partner', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300' };
            case 'public_health':
                return { label: 'Public Health Advisory', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' };
            default:
                return { label: 'General', color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#0B1020] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800/60 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Activity className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                        Clinic Health Intelligence
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Monitor clinic risks, connected-care alerts, and relevant health advisories.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAlerts}
                        disabled={loading}
                        className="text-xs h-9"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>Unable to load health alerts: {error}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={fetchAlerts} className="h-8 text-xs">
                        Retry
                    </Button>
                </div>
            )}

            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Critical</p>
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            <ShieldAlert className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                        {data?.kpi ? data.kpi.critical : loading ? '—' : '0'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">High priority operational events</p>
                </Card>

                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Warnings</p>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                        {data?.kpi ? data.kpi.warnings : loading ? '—' : '0'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Schedules, delays, cancellations</p>
                </Card>

                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Needs Attention</p>
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            <Activity className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                        {data?.kpi ? data.kpi.needsAttention : loading ? '—' : '0'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active items requiring follow-up</p>
                </Card>

                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Events (30D)</p>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        {data?.kpi ? data.kpi.events30d : loading ? '—' : '0'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total recorded clinic alerts</p>
                </Card>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-3 bg-white dark:bg-[#0B1020] p-4 rounded-2xl border border-gray-200 dark:border-gray-800/60 shadow-sm">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search health alerts, hospitals, pharmacies, diagnostics, referrals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                </div>

                {/* Primary Category Filters */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {categoryTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = categoryFilter === tab.id;
                        const count = data?.countsByCategory ? data.countsByCategory[tab.id] : 0;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setCategoryFilter(tab.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                                    isActive
                                        ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50 shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{tab.label}</span>
                                {count !== undefined && (
                                    <span className={cn(
                                        'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                                        isActive ? 'bg-pink-200/60 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Secondary Severity Filters */}
                <div className="flex items-center gap-1 pt-1 text-xs text-gray-500 overflow-x-auto no-scrollbar">
                    <span className="font-semibold text-gray-400 dark:text-gray-500 mr-1">Severity:</span>
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'critical', label: 'Critical' },
                        { id: 'warning', label: 'Warning' },
                        { id: 'info', label: 'Informational' },
                        { id: 'resolved', label: 'Resolved' },
                    ].map((sev) => (
                        <button
                            key={sev.id}
                            onClick={() => setSeverityFilter(sev.id as AlertSeverity)}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-medium transition-colors text-[11px]',
                                severityFilter === sev.id
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                        >
                            {sev.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Layout (Alert Feed + Side Trends) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Alert Cards */}
                <div className="lg:col-span-2 space-y-3">
                    {loading && !data && (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800" />
                            ))}
                        </div>
                    )}

                    {!loading && filteredAlerts.length === 0 && (
                        <Card padding="lg" className="text-center py-12">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                {categoryFilter === 'all'
                                    ? 'No Active Alerts'
                                    : categoryFilter === 'hospital'
                                    ? 'No Hospital Alerts'
                                    : categoryFilter === 'pharmacy'
                                    ? 'No Pharmacy Alerts'
                                    : categoryFilter === 'diagnostics'
                                    ? 'No Diagnostic Alerts'
                                    : categoryFilter === 'public_health'
                                    ? 'No Public Health Advisories'
                                    : 'No Clinic Alerts'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                                {categoryFilter === 'public_health'
                                    ? 'No external public-health or disease advisories are currently flagged for this region.'
                                    : 'All partner workflows and clinic operations are currently functioning normally.'}
                            </p>
                        </Card>
                    )}

                    {filteredAlerts.map((alert) => {
                        const sevBadge = getSeverityBadge(alert.severity);
                        const catBadge = getCategoryBadge(alert.category);
                        const SevIcon = sevBadge.icon;

                        return (
                            <div
                                key={alert.id}
                                className="p-4 rounded-2xl bg-white dark:bg-[#0B1020] border border-gray-200 dark:border-gray-800/60 shadow-sm hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                            >
                                <div className="space-y-1.5 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Severity Badge */}
                                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border', sevBadge.bg)}>
                                            <SevIcon className="h-3 w-3" />
                                            {sevBadge.text}
                                        </span>

                                        {/* Category Badge */}
                                        <span className={cn('inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold', catBadge.color)}>
                                            {catBadge.label}
                                        </span>

                                        {/* Source Organization */}
                                        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                            • {alert.sourceName}
                                        </span>

                                        {/* Timestamp */}
                                        <span className="text-[10px] text-gray-400 ml-auto sm:ml-0">
                                            {new Date(alert.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                        {alert.title}
                                    </h4>

                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {alert.description}
                                    </p>
                                </div>

                                {alert.actionUrl && alert.actionLabel && (
                                    <div className="shrink-0 pt-2 sm:pt-0">
                                        <Link href={alert.actionUrl}>
                                            <Button size="sm" variant="outline" className="text-xs h-8 whitespace-nowrap gap-1">
                                                {alert.actionLabel}
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Recent Clinic Trends & Partner Operations Summary */}
                <div className="space-y-6">
                    {/* Recent Clinic Trends */}
                    <Card padding="lg">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-pink-600" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Clinic Trends</h3>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Appointments (30D)</span>
                                <span className="font-bold text-gray-900 dark:text-white">{data?.clinicTrends.totalAppointments ?? 0}</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Cancellation Rate</span>
                                <span className={cn('font-bold', (data?.clinicTrends.cancellationRate ?? 0) >= 20 ? 'text-rose-600' : 'text-emerald-600')}>
                                    {data?.clinicTrends.cancellationRate ?? 0}%
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Active Doctor Leaves</span>
                                <span className="font-bold text-gray-900 dark:text-white">{data?.clinicTrends.activeLeavesCount ?? 0}</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Connected Care Handoffs</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{data?.clinicTrends.partnerHandoffsCount ?? 0}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Partner Operations Links */}
                    <Card padding="lg">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Partner Workflows</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Direct links to operational hubs</p>

                        <div className="space-y-2 text-xs font-semibold">
                            <Link
                                href="/clinic/pharmacies"
                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-pink-50/50 dark:hover:bg-pink-950/20 text-gray-700 dark:text-gray-300 hover:text-pink-600 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Pill className="h-4 w-4 text-pink-600" />
                                    Pharmacy Orders
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                            </Link>

                            <Link
                                href="/clinic/diagnostic-centers"
                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 text-gray-700 dark:text-gray-300 hover:text-teal-600 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Microscope className="h-4 w-4 text-teal-600" />
                                    Diagnostic Orders
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                            </Link>

                            <Link
                                href="/clinic/referrals"
                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-purple-600" />
                                    Hospital Referrals
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                            </Link>

                            <Link
                                href="/clinic/partnerships"
                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                    Manage Partnerships
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function ClinicHealthAlertsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading health & operational alerts...</div>}>
            <ClinicHealthAlertsContent />
        </Suspense>
    );
}

