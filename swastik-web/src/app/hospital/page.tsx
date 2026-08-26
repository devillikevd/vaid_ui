'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { hospitalApi } from '@/lib/api';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import Link from 'next/link';
import {
    BedDouble, Users, Calendar, Activity, TestTube, ScanLine,
    Scissors, IndianRupee, AlertTriangle, TrendingUp, TrendingDown,
    Clock, HeartPulse, ListOrdered, ShieldCheck, RefreshCw,
    ArrowRight, Gauge,
} from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── KPI Tile ──
function KpiTile({ label, value, sub, icon: Icon, color, href, trend }: {
    label: string; value: string | number; sub?: string;
    icon: any; color: string; href?: string; trend?: 'up' | 'down' | null;
}) {
    const content = (
        <div className={`rounded-xl border p-4 flex items-start gap-3 transition hover:shadow-md cursor-pointer ${color}`}>
            <div className="p-2.5 rounded-lg bg-white/80 shadow-sm">
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                <div className="flex items-center gap-1.5">
                    <p className="text-xl font-bold">{value}</p>
                    {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                    {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                </div>
                {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
    return href ? <Link href={href}>{content}</Link> : content;
}

// ── Occupancy Bar ──
function OccupancyBar({ occupied, total, label }: { occupied: number; total: number; label: string }) {
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="w-24 text-gray-600 truncate text-xs">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-right text-xs font-semibold">{pct}%</span>
        </div>
    );
}

export default function ControlTowerPage() {
    const [data, setData] = useState<any>(null);
    const [occupancy, setOccupancy] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(prev => !data ? true : prev);
            const [ctRes, occRes] = await Promise.all([
                hospitalApi.getControlTower(),
                hospitalApi.getOccupancyDrilldown(),
            ]);
            if (ctRes.success) setData(ctRes.data ?? ctRes);
            if (occRes.success) setOccupancy((occRes.data as any)?.wards ?? (occRes as any)?.wards ?? []);
            setError(null);
        } catch (e: any) {
            setError(e?.message || 'Failed to load control tower');
        } finally {
            setLoading(false);
        }
    }, [data]);

    useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-refresh every 60s
    useEffect(() => {
        const iv = setInterval(fetchAll, 60_000);
        return () => clearInterval(iv);
    }, [fetchAll]);

    // Socket-driven refresh (debounced)
    useAppointmentUpdates(useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchAll, 1000);
    }, [fetchAll]));

    if (loading && !data) return <DashboardSkeleton />;

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Gauge className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchAll}>Retry</Button>
            </div>
        );
    }

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

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Gauge className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Control Tower</h1>
                    </div>
                    <p className="text-teal-100 mt-1 text-sm">
                        Real-time hospital operations • Auto-refreshes every 60s
                    </p>
                </div>
                <Button variant="outline" className="text-white border-white/30 hover:bg-white/10" onClick={fetchAll}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                <KpiTile label="Bed Occupancy" value={`${beds.occupancy_percent || 0}%`}
                    sub={`${beds.occupied || 0}/${beds.total || 0} beds`} icon={BedDouble}
                    color="border-blue-200 bg-blue-50/50" href="/hospital/beds" />
                <KpiTile label="Available Beds" value={beds.available || 0}
                    sub={`${beds.maintenance || 0} under maintenance`} icon={Activity}
                    color="border-emerald-200 bg-emerald-50/50" href="/hospital/beds" />
                <KpiTile label="IPD Census" value={ipd.current_census || 0}
                    sub={`+${ipd.admissions_today || 0} today / -${ipd.discharges_today || 0} discharged`}
                    icon={HeartPulse} color="border-violet-200 bg-violet-50/50" href="/hospital/ipd" />
                <KpiTile label="OPD Tokens" value={opd.total_tokens_today || 0}
                    sub={`${opd.waiting || 0} waiting • avg ${opd.avg_wait_minutes || 0}m`}
                    icon={ListOrdered} color="border-amber-200 bg-amber-50/50" href="/hospital/queue" />
                <KpiTile label="Appointments" value={opd.appointments_today || 0}
                    icon={Calendar} color="border-teal-200 bg-teal-50/50" href="/hospital/appointments" />
                <KpiTile label="Encounters" value={enc.total_today || 0}
                    sub={`OPD ${enc.opd || 0} • IPD ${enc.ipd || 0} • ER ${enc.emergency || 0}`}
                    icon={Users} color="border-cyan-200 bg-cyan-50/50" href="/hospital/encounters" />
                <KpiTile label="Lab Orders" value={lab.ordered_today || 0}
                    sub={`${lab.pending || 0} pending • ${lab.stat_urgent || 0} urgent`}
                    icon={TestTube} color="border-orange-200 bg-orange-50/50" href="/hospital/lab-orders" />
                <KpiTile label="Radiology" value={rad.ordered_today || 0}
                    sub={`${rad.pending || 0} pending`}
                    icon={ScanLine} color="border-pink-200 bg-pink-50/50" href="/hospital/radiology-orders" />
                <KpiTile label="OT Surgeries" value={ot.scheduled_today || 0}
                    sub={`${ot.completed || 0} done • ${ot.in_progress || 0} running`}
                    icon={Scissors} color="border-red-200 bg-red-50/50" href="/hospital/ot" />
                <KpiTile label="Today Revenue" value={`₹${(fin.today_revenue || 0).toLocaleString('en-IN')}`}
                    sub={`Collections ₹${(fin.today_collections || 0).toLocaleString('en-IN')}`}
                    icon={IndianRupee} color="border-green-200 bg-green-50/50" href="/hospital/billing" />
            </div>

            {/* ── Row 2: Occupancy + Quality + Financial ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Occupancy Drilldown */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <BedDouble className="h-4 w-4 text-blue-500" />
                            Ward Occupancy
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                        {occupancy.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">No wards configured yet.
                                <Link href="/hospital/beds" className="text-teal-600 ml-1 hover:underline">Set up wards →</Link>
                            </p>
                        )}
                        {occupancy.map((w: any) => (
                            <OccupancyBar key={w.id} label={w.name} occupied={w.occupied_beds || 0} total={w.total_beds || 0} />
                        ))}
                    </CardContent>
                </Card>

                {/* Quality Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-amber-500" />
                            Quality & Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Incidents (month)</span>
                            <span className="font-semibold">{quality.incidents_this_month || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Open incidents</span>
                            <span className={`font-semibold ${(quality.open_incidents || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {quality.open_incidents || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Sentinel events</span>
                            <span className={`font-semibold ${(quality.sentinel_events || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {quality.sentinel_events || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Pending pre-auth</span>
                            <span className="font-semibold text-amber-600">{fin.pending_preauth || 0}</span>
                        </div>
                        <div className="pt-2 border-t">
                            <Link href="/hospital/quality" className="text-sm text-teal-600 hover:underline flex items-center gap-1">
                                View Quality Dashboard <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Quick Actions ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'New Admission', href: '/hospital/ipd', icon: BedDouble, color: 'bg-violet-600 hover:bg-violet-700' },
                    { label: 'Generate Token', href: '/hospital/queue', icon: ListOrdered, color: 'bg-amber-600 hover:bg-amber-700' },
                    { label: 'Order Lab Test', href: '/hospital/lab-orders', icon: TestTube, color: 'bg-orange-600 hover:bg-orange-700' },
                    { label: 'Schedule Surgery', href: '/hospital/ot', icon: Scissors, color: 'bg-red-600 hover:bg-red-700' },
                ].map(action => (
                    <Link key={action.label} href={action.href}>
                        <div className={`${action.color} text-white rounded-xl p-4 flex items-center gap-3 transition-transform hover:scale-[1.02]`}>
                            <action.icon className="h-5 w-5" />
                            <span className="text-sm font-medium">{action.label}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
