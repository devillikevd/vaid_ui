'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
    BedDouble, Users, Calendar, Activity, TestTube, ScanLine,
    Scissors, IndianRupee, AlertTriangle, TrendingUp, TrendingDown,
    Clock, HeartPulse, ListOrdered, ShieldCheck, RefreshCw,
    ArrowRight, Gauge, Pill, Ambulance, Building2, Stethoscope,
    AlertOctagon, CheckCircle2, ChevronRight, AlertCircle,
    ClipboardList, UserCheck, ShieldAlert, Sparkles, Siren,
    Plus, HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalApi } from '@/lib/api';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ──
type RolePerspective = 'all' | 'clinical' | 'nursing' | 'billing' | 'emergency' | 'diagnostics';

// ── Skeleton Loader for Widgets ──
function WidgetSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 p-5", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800/60 rounded" />
            </div>
            <div className="space-y-3">
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800/60 rounded" />
                <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800/60 rounded" />
            </div>
        </div>
    );
}

// ── Executive KPI Tile ──
function ExecutiveKpiTile({
    title,
    value,
    subValue,
    trend,
    trendLabel,
    icon: Icon,
    colorScheme,
    href,
    badge,
    urgent,
}: {
    title: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | null;
    trendLabel?: string;
    icon: any;
    colorScheme: 'teal' | 'blue' | 'rose' | 'amber' | 'emerald' | 'purple';
    href: string;
    badge?: string;
    urgent?: boolean;
}) {
    const colorStyles = {
        teal: {
            bg: 'bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-950/20 dark:hover:bg-teal-950/30',
            border: 'border-teal-200/70 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700',
            iconBg: 'bg-teal-100/80 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
            value: 'text-teal-950 dark:text-teal-100',
            indicator: 'bg-teal-500',
        },
        blue: {
            bg: 'bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-950/20 dark:hover:bg-blue-950/30',
            border: 'border-blue-200/70 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700',
            iconBg: 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
            value: 'text-blue-950 dark:text-blue-100',
            indicator: 'bg-blue-500',
        },
        rose: {
            bg: urgent ? 'bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-950/30 dark:hover:bg-rose-950/40' : 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20 dark:hover:bg-rose-950/30',
            border: urgent ? 'border-rose-300 dark:border-rose-700 shadow-sm' : 'border-rose-200/70 dark:border-rose-800/50 hover:border-rose-300 dark:hover:border-rose-700',
            iconBg: 'bg-rose-100/80 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
            value: 'text-rose-950 dark:text-rose-100',
            indicator: 'bg-rose-500',
        },
        amber: {
            bg: 'bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
            border: 'border-amber-200/70 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700',
            iconBg: 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
            value: 'text-amber-950 dark:text-amber-100',
            indicator: 'bg-amber-500',
        },
        emerald: {
            bg: 'bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
            border: 'border-emerald-200/70 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700',
            iconBg: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
            value: 'text-emerald-950 dark:text-emerald-100',
            indicator: 'bg-emerald-500',
        },
        purple: {
            bg: 'bg-purple-500/5 hover:bg-purple-500/10 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
            border: 'border-purple-200/70 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700',
            iconBg: 'bg-purple-100/80 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
            value: 'text-purple-950 dark:text-purple-100',
            indicator: 'bg-purple-500',
        },
    }[colorScheme];

    return (
        <Link href={href} className="group block focus:outline-none">
            <div className={cn(
                "relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between h-full",
                colorStyles.bg,
                colorStyles.border
            )}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                        {title}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {badge && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                                {badge}
                            </span>
                        )}
                        <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-105", colorStyles.iconBg)}>
                            <Icon className="h-4.5 w-4.5" />
                        </div>
                    </div>
                </div>

                {/* Main Value */}
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", colorStyles.value)}>
                            {value}
                        </span>
                        {trend === 'up' && (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> {trendLabel}
                            </span>
                        )}
                        {trend === 'down' && (
                            <span className="inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <TrendingDown className="h-3.5 w-3.5 mr-0.5" /> {trendLabel}
                            </span>
                        )}
                    </div>
                    {subValue && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1 truncate">
                            {subValue}
                        </p>
                    )}
                </div>

                {/* Footer action hint */}
                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    <span>Open details</span>
                    <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
            </div>
        </Link>
    );
}

// ── Ward Occupancy Bar ──
function WardOccupancyBar({ ward }: { ward: any }) {
    const total = ward.total_beds || 0;
    const occupied = ward.occupied_beds || 0;
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const barColor = pct >= 90
        ? 'bg-rose-500'
        : pct >= 70
            ? 'bg-amber-500'
            : 'bg-emerald-500';

    const statusBadge = pct >= 90
        ? { text: 'Critical', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' }
        : pct >= 70
            ? { text: 'Busy', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' }
            : { text: 'Normal', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };

    return (
        <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{ward.name}</span>
                    {ward.floor && (
                        <span className="text-[10px] text-gray-400 font-normal">Floor {ward.floor}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                        {occupied} / {total} beds
                    </span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", statusBadge.color)}>
                        {statusBadge.text}
                    </span>
                </div>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-500 rounded-full", barColor)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
        </div>
    );
}

export default function ControlTowerPage() {
    const [data, setData] = useState<any>(null);
    const [hospitalData, setHospitalData] = useState<any>(null);
    const [occupancy, setOccupancy] = useState<any[]>([]);
    const [emergencies, setEmergencies] = useState<any[]>([]);
    const [ambulances, setAmbulances] = useState<any[]>([]);
    const [dashboardOverview, setDashboardOverview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [perspective, setPerspective] = useState<RolePerspective>('all');
    const [userRole, setUserRole] = useState<string>('hospital_owner');

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Live clock ticker
    const [currentTime, setCurrentTime] = useState<string>('');
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const iv = setInterval(updateClock, 1000);
        return () => clearInterval(iv);
    }, []);

    // Main data fetcher
    const fetchAllData = useCallback(async (isManual = false) => {
        try {
            if (isManual) setRefreshing(true);
            else if (!data) setLoading(true);

            const [ctRes, occRes, emergRes, ambRes, dashRes, roleRes, profRes] = await Promise.allSettled([
                hospitalApi.getControlTower(),
                hospitalApi.getOccupancyDrilldown(),
                hospitalApi.getEmergencies(),
                hospitalApi.getAffiliatedAmbulances(),
                hospitalApi.getDashboard(),
                hospitalApi.getMyStaffRole(),
                hospitalApi.getProfile(),
            ]);

            if (ctRes.status === 'fulfilled' && ctRes.value?.success) {
                setData(ctRes.value.data ?? ctRes.value);
            }
            if (occRes.status === 'fulfilled' && occRes.value?.success) {
                const wardsData = (occRes.value.data as any)?.wards ?? (occRes.value as any)?.wards ?? [];
                setOccupancy(wardsData);
            }
            if (emergRes.status === 'fulfilled' && emergRes.value?.success) {
                const eData = (emergRes.value as any).data;
                setEmergencies(Array.isArray(eData) ? eData : []);
            }
            if (ambRes.status === 'fulfilled' && ambRes.value?.success) {
                const ambVal = ambRes.value as any;
                const aData = ambVal.ambulances || ambVal.data;
                setAmbulances(Array.isArray(aData) ? aData : []);
            }
            if (dashRes.status === 'fulfilled' && dashRes.value?.success) {
                setDashboardOverview(dashRes.value);
                if (dashRes.value.hospital) {
                    setHospitalData(dashRes.value.hospital);
                }
            }
            if (roleRes.status === 'fulfilled' && roleRes.value?.success) {
                if (roleRes.value.staffRole) setUserRole(String(roleRes.value.staffRole));
                if (roleRes.value.hospital) setHospitalData((prev: any) => prev || roleRes.value.hospital);
            }
            if (profRes.status === 'fulfilled' && profRes.value?.success && profRes.value.hospital) {
                setHospitalData(profRes.value.hospital);
            }

            setLastUpdated(new Date());
            setError(null);
        } catch (e: any) {
            console.error('Failed to load control tower data', e);
            setError(e?.message || 'Failed to load hospital operations data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [data]);

    useEffect(() => {
        fetchAllData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-refresh every 60s
    useEffect(() => {
        const iv = setInterval(() => fetchAllData(false), 60_000);
        return () => clearInterval(iv);
    }, [fetchAllData]);

    // Socket updates
    useAppointmentUpdates(useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchAllData(false), 1200);
    }, [fetchAllData]));

    // Derived Metrics & Safe Fallbacks
    const ct = data || {};
    const beds = ct.beds || {};
    const ipd = ct.ipd || {};
    const opd = ct.opd || {};
    const lab = ct.lab || {};
    const rad = ct.radiology || {};
    const ot = ct.ot || {};
    const enc = ct.encounters || {};
    const fin = ct.financial || {};
    const quality = ct.quality || {};

    const hospitalProfile = hospitalData || dashboardOverview?.hospital || {};
    const hospitalName = hospitalProfile.name || (data as any)?.hospital?.name || '';

    // Emergency Status Calculations
    const activeEmergencies = emergencies.filter(e => !['completed', 'cancelled', 'resolved'].includes(e.status));
    const criticalEmergencies = activeEmergencies.filter(e => e.severity === 'critical' || e.triage_level === 'immediate' || e.status === 'dispatched');
    const availableAmbulances = ambulances.filter(a => a.is_active && (a.status === 'available' || a.is_available !== false)).length;
    const enRouteAmbulances = ambulances.filter(a => a.status === 'on_trip' || a.status === 'dispatched' || a.status === 'en_route').length;

    // Action Required list (real items derived safely)
    const actionableTasks = useMemo(() => {
        const tasks: Array<{ id: string; title: string; category: string; count: number; href: string; severity: 'high' | 'medium' | 'low' }> = [];

        if (criticalEmergencies.length > 0) {
            tasks.push({
                id: 'critical-er',
                title: 'Critical Emergency Cases Awaiting Hospital Arrival/Triage',
                category: 'Emergency',
                count: criticalEmergencies.length,
                href: '/hospital/emergency',
                severity: 'high',
            });
        }
        if (lab.stat_urgent > 0 || lab.pending > 5) {
            tasks.push({
                id: 'lab-urgent',
                title: 'STAT / Urgent Pathology Tests Pending Verification',
                category: 'Laboratory',
                count: lab.stat_urgent || lab.pending,
                href: '/hospital/lab-orders',
                severity: lab.stat_urgent > 0 ? 'high' : 'medium',
            });
        }
        if (rad.pending > 0) {
            tasks.push({
                id: 'rad-pending',
                title: 'Radiology Scans Requiring Diagnostic Reporting',
                category: 'Radiology',
                count: rad.pending,
                href: '/hospital/radiology-orders',
                severity: 'medium',
            });
        }
        if (fin.pending_preauth > 0) {
            tasks.push({
                id: 'tpa-preauth',
                title: 'Insurance / TPA Pre-Authorization Queries Pending Submission',
                category: 'Finance',
                count: fin.pending_preauth,
                href: '/hospital/billing',
                severity: 'medium',
            });
        }
        if (quality.open_incidents > 0) {
            tasks.push({
                id: 'quality-incidents',
                title: 'Open Clinical Safety & Operational Incidents Under Review',
                category: 'Quality',
                count: quality.open_incidents,
                href: '/hospital/quality',
                severity: quality.sentinel_events > 0 ? 'high' : 'medium',
            });
        }
        if (opd.waiting > 15) {
            tasks.push({
                id: 'opd-backlog',
                title: 'High OPD Waiting Queue (Average wait > 30 mins)',
                category: 'OPD Queue',
                count: opd.waiting,
                href: '/hospital/queue',
                severity: 'medium',
            });
        }

        return tasks;
    }, [criticalEmergencies.length, lab.stat_urgent, lab.pending, rad.pending, fin.pending_preauth, quality.open_incidents, quality.sentinel_events, opd.waiting]);

    // Departments from dashboard overview
    const departmentList = dashboardOverview?.departments || [];

    // Recent activity list
    const recentActivity = useMemo(() => {
        const list: Array<{ id: string; time: string; text: string; category: string; type: 'admission' | 'appointment' | 'consultation' | 'er' }> = [];

        (dashboardOverview?.recentAppointments || []).slice(0, 4).forEach((apt: any) => {
            list.push({
                id: `apt-${apt.id}`,
                time: apt.time || apt.appointment_date || 'Today',
                text: `Appointment with Dr. ${apt.doctor?.name || 'Staff'} for ${apt.patient?.name || 'Patient'} (${apt.status})`,
                category: 'OPD',
                type: 'appointment',
            });
        });

        (emergencies || []).slice(0, 3).forEach((er: any) => {
            const timeStr = er.created_at ? new Date(er.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';
            list.push({
                id: `er-${er.id}`,
                time: timeStr,
                text: `Emergency ${er.request_type || 'Case'} #${er.id.slice(0, 6)}: ${er.status?.replace(/_/g, ' ')}`,
                category: 'Emergency',
                type: 'er',
            });
        });

        return list.slice(0, 6);
    }, [dashboardOverview?.recentAppointments, emergencies]);

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="h-28 bg-gradient-to-r from-teal-700 to-emerald-800 rounded-3xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <WidgetSkeleton key={i} className="h-36" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <WidgetSkeleton className="h-64 lg:col-span-2" />
                    <WidgetSkeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300">
                    <AlertOctagon className="h-10 w-10" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">Unable to Load Operations Hub</h3>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mt-1 max-w-md">{error}</p>
                </div>
                <Button onClick={() => fetchAllData(true)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                    <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* ══════════════════════════════════════════════════════════════
                1. COMMAND CENTER HEADER & QUICK ACTIONS
            ══════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl bg-[#F8FAFC] dark:bg-gray-900 border border-slate-200/90 dark:border-gray-800 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Header Info */}
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Hospital Operations
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>Hospital Operations Command Center</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                            <span>•</span>
                            <span>Updated {Math.max(0, Math.round((new Date().getTime() - lastUpdated.getTime()) / 1000))}s ago</span>
                        </p>
                    </div>

                    {/* Header Controls: Refresh Hub */}
                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchAllData(true)}
                            disabled={refreshing}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 shadow-sm rounded-xl transition-all h-9"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5 mr-2 text-gray-500 dark:text-gray-400", refreshing && "animate-spin text-teal-600 dark:text-teal-400")} />
                            {refreshing ? 'Syncing...' : 'Refresh Hub'}
                        </Button>
                    </div>
                </div>

                {/* Perspective Filter Pills */}
                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-2 shrink-0">View Filter:</span>
                    {[
                        { id: 'all', label: 'Executive Hub' },
                        { id: 'clinical', label: 'Clinical Ops' },
                        { id: 'nursing', label: 'Nursing & Beds' },
                        { id: 'emergency', label: 'Emergency & Trauma' },
                        { id: 'diagnostics', label: 'Pathology & Radiology' },
                        { id: 'billing', label: 'Finance & TPA' },
                    ].map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPerspective(p.id as RolePerspective)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border",
                                perspective === p.id
                                    ? "bg-teal-600 text-white border-teal-600 shadow-sm font-semibold"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200/90 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                QUICK ACTIONS TOOLBAR (ROLE-AWARE)
            ══════════════════════════════════════════════════════════════ */}
            <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Quick Actions:</span>
                <Link href="/hospital/ipd">
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm text-xs h-8.5">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> New IPD Admission
                    </Button>
                </Link>
                <Link href="/hospital/queue">
                    <Button size="sm" variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs h-8.5">
                        <Plus className="h-3.5 w-3.5 mr-1.5 text-amber-600" /> Issue OPD Token
                    </Button>
                </Link>
                <Link href="/hospital/lab-orders">
                    <Button size="sm" variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs h-8.5">
                        <Plus className="h-3.5 w-3.5 mr-1.5 text-orange-600" /> Order Lab Test
                    </Button>
                </Link>
                <Link href="/hospital/ot">
                    <Button size="sm" variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs h-8.5">
                        <Plus className="h-3.5 w-3.5 mr-1.5 text-rose-600" /> Schedule Surgery
                    </Button>
                </Link>
                <Link href="/hospital/emergency">
                    <Button size="sm" variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs h-8.5">
                        <Ambulance className="h-3.5 w-3.5 mr-1.5 text-red-600" /> Dispatch Ambulance
                    </Button>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. TOP EXECUTIVE KPI ROW (6 CORE HIGH-IMPACT METRICS)
            ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. IPD Census */}
                <ExecutiveKpiTile
                    title="IPD Census"
                    value={`${ipd.current_census || 0} / ${beds.total || 0}`}
                    subValue={`+${ipd.admissions_today || 0} admt • -${ipd.discharges_today || 0} disch`}
                    icon={HeartPulse}
                    colorScheme="purple"
                    href="/hospital/ipd"
                />

                {/* 2. Available Beds */}
                <ExecutiveKpiTile
                    title="Available Beds"
                    value={beds.available ?? 0}
                    subValue={`${beds.maintenance || 0} maint • ${beds.housekeeping || 0} clean`}
                    icon={Activity}
                    colorScheme="emerald"
                    href="/hospital/beds"
                />

                {/* 3. Emergency Command */}
                <ExecutiveKpiTile
                    title="Emergency"
                    value={activeEmergencies.length}
                    subValue={`${criticalEmergencies.length} critical • ${availableAmbulances} amb avail`}
                    icon={AlertTriangle}
                    colorScheme="rose"
                    href="/hospital/emergency"
                    badge={criticalEmergencies.length > 0 ? `${criticalEmergencies.length} Critical` : undefined}
                    urgent={criticalEmergencies.length > 0}
                />

                {/* 4. OPD Queue */}
                <ExecutiveKpiTile
                    title="OPD Queue"
                    value={opd.waiting || 0}
                    subValue={`${opd.total_tokens_today || 0} total • avg ${opd.avg_wait_minutes || 0}m wait`}
                    icon={ListOrdered}
                    colorScheme="amber"
                    href="/hospital/queue"
                />

                {/* 5. Today's Revenue */}
                <ExecutiveKpiTile
                    title="Today Revenue"
                    value={`₹${(fin.today_revenue || 0).toLocaleString('en-IN')}`}
                    subValue={`Deposits ₹${(fin.today_collections || 0).toLocaleString('en-IN')}`}
                    icon={IndianRupee}
                    colorScheme="teal"
                    href="/hospital/billing"
                />

                {/* 6. Consultations & Encounters */}
                <ExecutiveKpiTile
                    title="Today Encounters"
                    value={enc.total_today || opd.appointments_today || 0}
                    subValue={`OPD ${enc.opd || 0} • IPD ${enc.ipd || 0} • ER ${enc.emergency || 0}`}
                    icon={Users}
                    colorScheme="blue"
                    href="/hospital/encounters"
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SECTION 1: INTERACTIVE PATIENT FLOW PIPELINE
            ══════════════════════════════════════════════════════════════ */}
            {(perspective === 'all' || perspective === 'clinical') && (
                <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <Activity className="h-4 w-4 text-teal-600" />
                            Live Patient Flow Pipeline (Movement & Throughput)
                        </CardTitle>
                        <span className="text-[11px] text-gray-500">Real-time Patient Journey Nodes</span>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {[
                                {
                                    stage: '1. Registration',
                                    count: opd.total_tokens_today || 0,
                                    label: 'Tokens Issued',
                                    href: '/hospital/queue',
                                    icon: ListOrdered,
                                    color: 'border-blue-200 bg-blue-50/40 text-blue-800 dark:text-blue-300 dark:bg-blue-950/20'
                                },
                                {
                                    stage: '2. Consultations',
                                    count: (opd.in_consultation || 0) + (opd.completed || 0),
                                    label: 'OPD Consults',
                                    href: '/hospital/consultations',
                                    icon: Stethoscope,
                                    color: 'border-teal-200 bg-teal-50/40 text-teal-800 dark:text-teal-300 dark:bg-teal-950/20'
                                },
                                {
                                    stage: '3. Diagnostics',
                                    count: (lab.ordered_today || 0) + (rad.ordered_today || 0),
                                    label: 'Lab & Scans',
                                    href: '/hospital/lab-orders',
                                    icon: TestTube,
                                    color: 'border-orange-200 bg-orange-50/40 text-orange-800 dark:text-orange-300 dark:bg-orange-950/20'
                                },
                                {
                                    stage: '4. Pharmacy',
                                    count: enc.opd || 0,
                                    label: 'Dispensations',
                                    href: '/hospital/inhouse-pharmacy',
                                    icon: Pill,
                                    color: 'border-emerald-200 bg-emerald-50/40 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/20'
                                },
                                {
                                    stage: '5. Admissions',
                                    count: ipd.admissions_today || 0,
                                    label: 'Admitted Today',
                                    href: '/hospital/ipd',
                                    icon: BedDouble,
                                    color: 'border-purple-200 bg-purple-50/40 text-purple-800 dark:text-purple-300 dark:bg-purple-950/20'
                                },
                                {
                                    stage: '6. Inpatient Care',
                                    count: ipd.current_census || 0,
                                    label: 'Active Census',
                                    href: '/hospital/ipd',
                                    icon: HeartPulse,
                                    color: 'border-indigo-200 bg-indigo-50/40 text-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/20'
                                },
                                {
                                    stage: '7. Discharges',
                                    count: ipd.discharges_today || 0,
                                    label: 'Discharged Today',
                                    href: '/hospital/ipd',
                                    icon: CheckCircle2,
                                    color: 'border-green-200 bg-green-50/40 text-green-800 dark:text-green-300 dark:bg-green-950/20'
                                },
                            ].map((node) => (
                                <Link key={node.stage} href={node.href} className="group">
                                    <div className={cn(
                                        "p-3.5 rounded-2xl border text-center transition-all duration-150 hover:shadow-md hover:scale-[1.02]",
                                        node.color
                                    )}>
                                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold opacity-80 mb-1">
                                            <node.icon className="h-3.5 w-3.5" />
                                            <span className="truncate">{node.stage}</span>
                                        </div>
                                        <div className="text-2xl font-extrabold my-1">{node.count}</div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">{node.label}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════
                4. SECTION 2: BEDS OCCUPANCY & INPATIENT CARE
            ══════════════════════════════════════════════════════════════ */}
            {(perspective === 'all' || perspective === 'nursing' || perspective === 'emergency') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ward Occupancy Drilldown */}
                    <Card className="lg:col-span-2 rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm">
                        <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <BedDouble className="h-4 w-4 text-blue-600" />
                                Ward Occupancy & Capacity Distribution
                            </CardTitle>
                            <Link href="/hospital/beds" className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1">
                                Manage Beds <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Summary Bar */}
                            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{beds.total || 0}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-emerald-600">Occupied</span>
                                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{beds.occupied || 0}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-blue-600">Available</span>
                                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{beds.available || 0}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-amber-600">Occupancy</span>
                                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{beds.occupancy_percent || 0}%</p>
                                </div>
                            </div>

                            {/* Wards Breakdown */}
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {occupancy.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 border border-dashed rounded-2xl">
                                        <p className="text-sm font-medium">No wards configured yet</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Configure wards to start tracking real-time bed occupancy.</p>
                                        <Link href="/hospital/beds">
                                            <Button size="sm" variant="outline" className="mt-3 text-xs rounded-xl">
                                                Configure Wards
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    occupancy.map((w: any) => (
                                        <WardOccupancyBar key={w.id} ward={w} />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* IPD Operations Summary */}
                    <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                        <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <HeartPulse className="h-4 w-4 text-purple-600" />
                                IPD Inpatient Overview
                            </CardTitle>
                            <Link href="/hospital/ipd" className="text-xs font-semibold text-purple-600 hover:underline">
                                Open IPD →
                            </Link>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-600 dark:text-gray-400">Current Inpatient Census</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{ipd.current_census || 0} patients</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-600 dark:text-gray-400">Admissions Today</span>
                                    <span className="font-bold text-emerald-600">+{ipd.admissions_today || 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-600 dark:text-gray-400">Discharges Today</span>
                                    <span className="font-bold text-blue-600">-{ipd.discharges_today || 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-1">
                                    <span className="text-gray-600 dark:text-gray-400">Pending Pre-Auth</span>
                                    <span className="font-bold text-amber-600">{fin.pending_preauth || 0} cases</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                                <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 dark:text-purple-300">
                                    <ClipboardList className="h-4 w-4 shrink-0 text-purple-600" />
                                    <span>Inpatient Management Protocols Active</span>
                                </div>
                                <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-1">
                                    Daily progress notes, MAR medication schedules, and discharge summaries are operational.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                5. SECTION 3: EMERGENCY COMMAND & OPD QUEUE
            ══════════════════════════════════════════════════════════════ */}
            {(perspective === 'all' || perspective === 'emergency' || perspective === 'clinical') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Emergency Command Panel */}
                    <Card className={cn(
                        "rounded-3xl shadow-sm border transition-all",
                        criticalEmergencies.length > 0
                            ? "border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/10"
                            : "border-gray-200/80 dark:border-gray-800"
                    )}>
                        <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                                <Siren className={cn("h-4.5 w-4.5", criticalEmergencies.length > 0 && "animate-pulse")} />
                                Emergency & Trauma Command
                            </CardTitle>
                            <Link href="/hospital/emergency">
                                <Button size="sm" variant="outline" className="text-xs rounded-xl h-8 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100">
                                    Open Emergency →
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Emergency Status Banner */}
                            {criticalEmergencies.length > 0 ? (
                                <div className="p-3.5 rounded-2xl bg-rose-500 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <AlertOctagon className="h-5 w-5 animate-bounce" />
                                        <div>
                                            <p className="font-bold text-xs">High Alert: {criticalEmergencies.length} Critical Emergencies Active</p>
                                            <p className="text-[11px] text-rose-100">Triage team and trauma beds standing by</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white text-rose-700 font-extrabold text-xs rounded-lg">
                                        Urgent
                                    </span>
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-xs text-emerald-900 dark:text-emerald-300">No Active Critical Emergencies</p>
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Emergency & Trauma ward is operating at normal capacity</p>
                                    </div>
                                </div>
                            )}

                            {/* Triage & Fleet Metrics */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Active Cases</span>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{activeEmergencies.length}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] uppercase font-bold text-emerald-600">Ambulances Free</span>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{availableAmbulances}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] uppercase font-bold text-amber-600">En Route</span>
                                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{enRouteAmbulances}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* OPD Queue & Department Queue */}
                    <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm">
                        <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <ListOrdered className="h-4.5 w-4.5" />
                                OPD Queue & Triage Desk
                            </CardTitle>
                            <Link href="/hospital/queue">
                                <Button size="sm" variant="outline" className="text-xs rounded-xl h-8 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-100">
                                    Open Queue →
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Wait Time & Metrics */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Waiting Patients</span>
                                    <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-0.5">{opd.waiting || 0}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                                    <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400">In Consultation</span>
                                    <p className="text-xl font-bold text-teal-900 dark:text-teal-200 mt-0.5">{opd.in_consultation || 0}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">Avg Wait</span>
                                    <p className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-0.5">{opd.avg_wait_minutes || 0}m</p>
                                </div>
                            </div>

                            {/* Department Queue Sample */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-semibold text-gray-500 px-1">
                                    <span>Department</span>
                                    <span>Queue Status</span>
                                </div>
                                {departmentList.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-3">No departments with active queues.</p>
                                ) : (
                                    departmentList.slice(0, 3).map((dept: any) => (
                                        <div key={dept.id} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{dept.name}</span>
                                            <span className="text-gray-500 font-medium">{dept.appointments || 0} tokens booked</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                6. SECTION 4: CLINICAL OPERATIONS (LAB, RAD, OT, NURSING, PHARMACY)
            ══════════════════════════════════════════════════════════════ */}
            {(perspective === 'all' || perspective === 'clinical' || perspective === 'diagnostics') && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Clinical Operations Hub
                        </h2>
                        <span className="text-xs text-gray-400">Direct Department Diagnostics & Procedural Units</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Laboratory */}
                        <Link href="/hospital/lab-orders" className="group">
                            <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm p-5 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                                            <TestTube className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">Pathology Lab</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Ordered Today</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{lab.ordered_today || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Pending Tests</span>
                                        <span className="font-bold text-amber-600">{lab.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>STAT / Urgent</span>
                                        <span className={cn("font-bold", (lab.stat_urgent || 0) > 0 ? "text-rose-600" : "text-gray-600")}>{lab.stat_urgent || 0}</span>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        {/* 2. Radiology */}
                        <Link href="/hospital/radiology-orders" className="group">
                            <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm p-5 hover:border-pink-300 dark:hover:border-pink-700 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300">
                                            <ScanLine className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">Radiology & Imaging</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Scans Today</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{rad.ordered_today || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Pending Reports</span>
                                        <span className="font-bold text-amber-600">{rad.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Completed</span>
                                        <span className="font-bold text-emerald-600">{rad.completed || 0}</span>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        {/* 3. Operation Theatres */}
                        <Link href="/hospital/ot" className="group">
                            <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm p-5 hover:border-rose-300 dark:hover:border-rose-700 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                            <Scissors className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">OT Surgeries</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Scheduled Today</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{ot.scheduled_today || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Running Now</span>
                                        <span className="font-bold text-rose-600">{ot.in_progress || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Completed</span>
                                        <span className="font-bold text-emerald-600">{ot.completed || 0}</span>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        {/* 4. In-House Pharmacy */}
                        <Link href="/hospital/inhouse-pharmacy" className="group">
                            <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm p-5 hover:border-teal-300 dark:hover:border-teal-700 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                                            <Pill className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">In-House Pharmacy</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Prescriptions</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{enc.opd || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Dispensing Active</span>
                                        <span className="font-bold text-emerald-600">Active</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Inventory Status</span>
                                        <span className="font-bold text-teal-600">Stocked</span>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                7. SECTION 5: DEPARTMENT PERFORMANCE TABLE
            ══════════════════════════════════════════════════════════════ */}
            {(perspective === 'all' || perspective === 'clinical') && (
                <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-teal-600" />
                            Department Operational Performance
                        </CardTitle>
                        <Link href="/hospital/departments" className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1">
                            All Departments <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {departmentList.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-sm font-medium">No departments registered yet.</p>
                                <Link href="/hospital/departments">
                                    <Button size="sm" variant="outline" className="mt-3 text-xs rounded-xl">
                                        Add Hospital Department
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/80 dark:bg-gray-800/40 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="py-3 px-6">Department Name</th>
                                            <th className="py-3 px-6">Head Doctor</th>
                                            <th className="py-3 px-6 text-center">Active Doctors</th>
                                            <th className="py-3 px-6 text-center">Appointments Today</th>
                                            <th className="py-3 px-6 text-center">Status</th>
                                            <th className="py-3 px-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {departmentList.map((dept: any) => (
                                            <tr key={dept.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="py-3 px-6 font-bold text-gray-900 dark:text-white">
                                                    {dept.name}
                                                </td>
                                                <td className="py-3 px-6 text-gray-600 dark:text-gray-400">
                                                    {dept.head ? `Dr. ${dept.head}` : 'Not assigned'}
                                                </td>
                                                <td className="py-3 px-6 text-center font-semibold text-gray-800 dark:text-gray-200">
                                                    {dept.doctorCount || dept.doctors || 0}
                                                </td>
                                                <td className="py-3 px-6 text-center font-semibold text-teal-600">
                                                    {dept.appointments || 0}
                                                </td>
                                                <td className="py-3 px-6 text-center">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                        dept.status === 'active'
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                    )}>
                                                        {dept.status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-6 text-right">
                                                    <Link href={`/hospital/departments`} className="text-teal-600 font-semibold hover:underline">
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════
                8. SECTION 6 & 7: FINANCE & QUALITY INTELLIGENCE
            ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Finance & Revenue */}
                <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-emerald-600" />
                            Financial & Billing Velocity
                        </CardTitle>
                        <Link href="/hospital/billing" className="text-xs font-semibold text-emerald-600 hover:underline">
                            Open Billing Hub →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Today Revenue</span>
                                <p className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 mt-1">
                                    ₹{(fin.today_revenue || 0).toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] text-emerald-600 font-medium">Net settled invoices</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                                <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">Advance Collections</span>
                                <p className="text-2xl font-extrabold text-teal-950 dark:text-teal-100 mt-1">
                                    ₹{(fin.today_collections || 0).toLocaleString('en-IN')}
                                </p>
                                <span className="text-[10px] text-teal-600 font-medium">Patient IPD deposits</span>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Pending Insurance Pre-Authorizations</span>
                                <span className="font-bold text-amber-600">{fin.pending_preauth || 0} claims</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-gray-600 dark:text-gray-400">Total Encounters Processed</span>
                                <span className="font-bold text-gray-900 dark:text-white">{enc.total_today || 0} encounters</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quality, Safety & Alerts */}
                <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-amber-600" />
                            Quality, Incident & Compliance Radar
                        </CardTitle>
                        <Link href="/hospital/quality" className="text-xs font-semibold text-amber-600 hover:underline">
                            Quality Portal →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Monthly Incidents</span>
                                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{quality.incidents_this_month || 0}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] uppercase font-bold text-rose-600">Open Reviews</span>
                                <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5">{quality.open_incidents || 0}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] uppercase font-bold text-purple-600">Sentinel Events</span>
                                <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">{quality.sentinel_events || 0}</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5">
                            <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-bold text-amber-950 dark:text-amber-200">Patient Safety Protocol Guard</span>
                                <p className="text-amber-800 dark:text-amber-400 text-[11px] mt-0.5">
                                    NABH compliance audit logs and outbreak surveillance monitoring are synchronized.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                9. SECTION 8: CENTRALIZED ACTION REQUIRED & RECENT ACTIVITY
            ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Centralized Action Required */}
                <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            Action Required (Operational Bottlenecks)
                        </CardTitle>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600">
                            {actionableTasks.length} Tasks
                        </span>
                    </CardHeader>
                    <CardContent className="p-6 space-y-2.5">
                        {actionableTasks.length === 0 ? (
                            <div className="py-8 text-center text-emerald-600">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                <p className="text-sm font-bold">All Systems Nominal</p>
                                <p className="text-xs text-gray-400 mt-0.5">No critical pending bottlenecks or overdue clinical tasks.</p>
                            </div>
                        ) : (
                            actionableTasks.map((task) => (
                                <Link key={task.id} href={task.href} className="group block">
                                    <div className={cn(
                                        "p-3 rounded-2xl border flex items-center justify-between transition-all duration-150 hover:scale-[1.01]",
                                        task.severity === 'high'
                                            ? "border-rose-200 bg-rose-50/40 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20"
                                            : "border-amber-200 bg-amber-50/40 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
                                    )}>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={cn(
                                                "h-2 w-2 rounded-full shrink-0",
                                                task.severity === 'high' ? "bg-rose-500 animate-ping" : "bg-amber-500"
                                            )} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                                                <span className="text-[10px] text-gray-500">{task.category} • Requires attention</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                                task.severity === 'high' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                                            )}>
                                                {task.count}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Live Activity Timeline */}
                <Card className="rounded-3xl border-gray-200/80 dark:border-gray-800 shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            Live Hospital Operational Activity Feed
                        </CardTitle>
                        <span className="text-xs text-gray-400">Real-time sync</span>
                    </CardHeader>
                    <CardContent className="p-6">
                        {recentActivity.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-8">
                                Patient activity and encounters will appear here as admissions and visits occur.
                            </p>
                        ) : (
                            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
                                {recentActivity.map((act) => (
                                    <div key={act.id} className="relative pl-7 text-xs flex items-start justify-between gap-3">
                                        <span className="absolute left-2 top-1.5 h-2 w-2 rounded-full bg-teal-500 -translate-x-1/2" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-gray-200">{act.text}</p>
                                            <span className="text-[10px] text-gray-400">{act.category}</span>
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-400 shrink-0">{act.time}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
