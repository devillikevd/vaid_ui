'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { 
    FlaskConical, CalendarCheck, Clock, Users, Globe, UserPlus, 
    Building, Building2, MapPin, Truck, CheckCircle2, AlertCircle,
    PlusCircle, Activity, FileText, ClipboardList, Shield, ChevronRight,
    ArrowRight, Star
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDiagnosticCenterStore, type DiagnosticBooking } from '@/stores/diagnosticCenterStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDiagnosticUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';
import { useAuthStore } from '@/stores/authStore';

// Unified Premium Card
function DashboardCard({ children, className = '', noPadding = false, hoverable = false }: { children: React.ReactNode, className?: string, noPadding?: boolean, hoverable?: boolean }) {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-sm ${hoverable ? 'transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-md' : ''} ${className}`}>
            <div className={noPadding ? '' : 'p-5'}>
                {children}
            </div>
        </div>
    );
}

function CardHeader({ title, icon: Icon, action, iconColor = "text-purple-600" }: { title: string, icon?: React.ElementType, action?: React.ReactNode, iconColor?: string }) {
    return (
        <div className="flex items-center justify-between mb-4 px-5 pt-5 pb-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
                {title}
            </h3>
            {action && <div>{action}</div>}
        </div>
    );
}

export default function DiagnosticCenterDashboard() {
    const { 
        stats, collectionModes, workflow, homeCollection, attention, 
        todaysBookings, isLoading, error, fetchDashboardData, 
        fetchReviews, reviews, loadingReviews 
    } = useDiagnosticCenterStore();
    
    const router = useRouter();
    const { user } = useAuthStore();
    
    useEffect(() => {
        if (user?.role === 'lab_technician') {
            router.replace('/diagnostic-center/work-queue');
        }
    }, [user?.role, router]);

    const shortcuts = useMemo(() => [
        { key: 'b', description: 'Go to Bookings', action: () => router.push('/diagnostic-center/bookings') },
        { key: 't', description: 'Go to Tests', action: () => router.push('/diagnostic-center/tests') },
        { key: 'r', description: 'Refresh dashboard', action: () => fetchDashboardData() },
    ], [router, fetchDashboardData]);
    usePageShortcuts(shortcuts);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { fetchDashboardData(); }, 200);
    }, [fetchDashboardData]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    useDiagnosticUpdates(
        useCallback(() => { debouncedFetch(); }, [debouncedFetch]),
        useCallback(() => { debouncedFetch(); }, [debouncedFetch]),
        useCallback(() => { debouncedFetch(); }, [debouncedFetch])
    );

    useEffect(() => {
        fetchDashboardData();
        fetchReviews();
    }, [fetchDashboardData, fetchReviews]);

    const STATS = [
        { label: 'Total Tests', value: stats?.totalTests ?? 0, icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: "Today's Bookings", value: stats?.todaysBookings ?? 0, icon: CalendarCheck, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Pending Results', value: stats?.pendingResults ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Total Patients', value: stats?.totalPatients ?? 0, icon: Users, color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    ];

    if (isLoading && !stats) return <DashboardSkeleton />;

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <FlaskConical className="h-12 w-12 text-red-400" />
                <p className="text-red-600 text-center max-w-md">{error}</p>
                <button onClick={() => fetchDashboardData()} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium">
                    Retry Connection
                </button>
            </div>
        );
    }

    const WORKFLOW_STAGES = [
        { label: 'Pending', count: workflow?.pending ?? 0, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
        { label: 'Confirmed', count: workflow?.confirmed ?? 0, colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
        { label: 'Dispatched', count: workflow?.dispatched ?? 0, colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
        { label: 'Arrived', count: workflow?.arrived ?? 0, colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
        { label: 'Collected', count: workflow?.sampleCollected ?? 0, colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
        { label: 'Processing', count: workflow?.processing ?? 0, colorClass: 'bg-purple-600 text-white border-purple-600 shadow-sm' },
        { label: 'Completed', count: workflow?.completed ?? 0, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    ];

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* 2. Hero */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-[18px] px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between shadow-sm">
                <div>
                    <h1 className="text-[20px] font-semibold tracking-tight text-white">Diagnostic Center Dashboard</h1>
                    <p className="text-purple-100/90 text-[13px] mt-0.5">Manage your testing, bookings, home collection and reporting operations.</p>
                </div>
            </div>

            {/* 3. KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <DashboardCard key={stat.label} hoverable className="group border-slate-200 dark:border-slate-700 hover:border-purple-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl transition-all duration-200 ${stat.bg} group-hover:bg-opacity-80`}>
                                    <Icon className={`h-[22px] w-[22px] ${stat.color}`} strokeWidth={2} />
                                </div>
                            </div>
                        </DashboardCard>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 4. Needs Attention */}
                <DashboardCard hoverable noPadding>
                    <CardHeader title="Needs Attention" icon={AlertCircle} iconColor="text-purple-600" />
                    <div className="px-5 pb-5">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Pending Confirmations', count: attention?.pendingConfirmations ?? 0, icon: AlertCircle },
                                { label: 'Samples to Collect', count: attention?.pendingSampleCollection ?? 0, icon: FlaskConical },
                                { label: 'Processing', count: attention?.processing ?? 0, icon: Activity },
                                { label: 'Pending Results', count: attention?.pendingResults ?? 0, icon: FileText }
                            ].map(item => {
                                const count = item.count;
                                const isCritical = count > 10;
                                const isNonZero = count > 0;
                                
                                const styles = isCritical 
                                    ? 'bg-red-50 text-red-900 border-red-200' 
                                    : isNonZero 
                                    ? 'bg-purple-50/50 text-purple-700 border-purple-200'
                                    : 'bg-purple-50/30 text-slate-500 border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:border-slate-800';

                                const Icon = item.icon;

                                return (
                                    <div key={item.label} className={`group p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200 hover:-translate-y-px hover:border-purple-300 ${styles}`}>
                                        <Icon className={`h-4 w-4 mb-2 ${isCritical ? 'text-red-500' : isNonZero ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'}`} />
                                        <span className="text-3xl font-bold tracking-tight leading-none">{count}</span>
                                        <span className="text-[11px] font-medium mt-1.5 leading-tight">{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DashboardCard>

                {/* 5. Collection Modes */}
                <DashboardCard hoverable noPadding>
                    <CardHeader title="Collection Modes" icon={Activity} iconColor="text-purple-600" />
                    <div className="px-5 pb-5">
                        <div className="grid grid-cols-2 gap-3 h-full">
                            {[
                                { label: 'Walk-in', count: collectionModes?.walk_in ?? 0, icon: UserPlus },
                                { label: 'Home Collection', count: collectionModes?.home_collection ?? 0, icon: Truck },
                            ].map(item => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="group p-4 bg-purple-50/30 dark:bg-purple-900/10 rounded-xl border border-slate-100 dark:border-purple-900/20 flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:border-purple-200 hover:bg-purple-50 hover:-translate-y-px">
                                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm text-purple-600 group-hover:text-purple-700 transition-colors">
                                            <Icon className="h-6 w-6" strokeWidth={1.5} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-[#1a202c] dark:text-slate-100">{item.count}</p>
                                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DashboardCard>
            </div>

            {/* 5. Live Workflow */}
            <DashboardCard noPadding hoverable>
                <CardHeader title="Live Workflow" icon={Activity} />
                <div className="px-5 pb-8 pt-2">
                    <div className="relative flex items-center justify-between max-w-full overflow-x-auto hide-scrollbar">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0 hidden sm:block"></div>
                        
                        {WORKFLOW_STAGES.map((stage, idx) => {
                            const isZero = stage.count === 0;
                            const isProcessing = stage.label === 'Processing' && !isZero;
                            return (
                                <div key={stage.label} className="relative z-10 flex flex-col items-center group cursor-default shrink-0 sm:flex-1 min-w-[80px]">
                                    <div className={`
                                        h-10 px-4 rounded-full flex items-center justify-center border transition-all duration-200
                                        ${isZero ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400' : stage.colorClass}
                                        group-hover:-translate-y-0.5 group-hover:shadow-sm
                                    `}>
                                        <span className="text-[15px] font-bold">{stage.count}</span>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold mt-2 tracking-wide transition-colors ${
                                        isProcessing ? 'text-purple-700' : isZero ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DashboardCard>

            {/* 6. Home Collection Logistics */}
            <DashboardCard noPadding hoverable>
                <CardHeader 
                    title="Home Collection Logistics" 
                    icon={Truck}
                    action={
                        <Link href="/diagnostic-center/agents" className="text-[13px] font-medium text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 group">
                            Manage <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    }
                />
                <div className="px-5 pb-5">
                    <div className="flex flex-nowrap overflow-x-auto hide-scrollbar divide-x divide-slate-200 dark:divide-slate-700 bg-purple-50/50 dark:bg-purple-900/10 rounded-[14px] border border-slate-200 dark:border-slate-800">
                        {[
                            { label: 'Scheduled', count: homeCollection?.scheduled ?? 0, icon: CalendarCheck },
                            { label: 'Pending Dispatch', count: homeCollection?.pendingDispatch ?? 0, icon: Clock },
                            { label: 'Dispatched', count: homeCollection?.dispatched ?? 0, icon: Truck },
                            { label: 'Arrived', count: homeCollection?.arrived ?? 0, icon: MapPin },
                            { label: 'Collected', count: homeCollection?.sampleCollected ?? 0, icon: CheckCircle2 },
                        ].map((item) => (
                            <div key={item.label} className="flex-1 min-w-[120px] py-4 px-2 text-center flex flex-col items-center justify-center transition-colors hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 group">
                                <item.icon className="h-4 w-4 text-purple-600/70 mb-1.5 group-hover:text-purple-600 transition-colors" />
                                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-none">{item.count}</span>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </DashboardCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 9. Today's Bookings */}
                <div className="lg:col-span-2">
                    <DashboardCard noPadding className="h-full">
                        <CardHeader 
                            title="Today's Bookings"
                            icon={ClipboardList}
                            action={
                                <Link href="/diagnostic-center/bookings" className="text-[13px] font-medium text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 group">
                                    View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            }
                        />
                        <div className="px-5 pb-5">
                            {todaysBookings.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {todaysBookings.slice(0, 8).map((booking: DiagnosticBooking) => (
                                        <Link href={`/diagnostic-center/bookings/${booking.id}`} key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-3 -mx-3 rounded-xl gap-4 transition-colors hover:bg-purple-50/50 dark:hover:bg-purple-900/10 group">
                                            <div className="flex items-center gap-4">
                                                <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100 w-12 shrink-0">
                                                    {booking.booking_time?.substring(0,5) || '--:--'}
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 transition-colors">{booking.patient_name || 'Patient'}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={booking.test_name}>
                                                            {booking.test_name || 'Test'}
                                                        </span>
                                                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                            {booking.collection_type === 'home_collection' ? 'Home' : 'Walk-in'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <StatusBadge status={booking.status} size="sm" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center">
                                    <ClipboardList className="h-10 w-10 text-slate-300 mb-3" strokeWidth={1.5} />
                                    <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">No bookings scheduled for today.</p>
                                    <p className="text-[12px] mt-1 text-slate-500">New appointments and walk-in bookings will appear here.</p>
                                </div>
                            )}
                        </div>
                    </DashboardCard>
                </div>
                
                <div className="space-y-6">
                    {/* 7. Quick Actions */}
                    <DashboardCard noPadding hoverable>
                        <CardHeader title="Quick Actions" />
                        <div className="px-5 pb-5">
                            <div className="grid grid-cols-2 gap-3">
                                <Link href="/diagnostic-center/bookings/new" className="col-span-2 px-4 py-3.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md text-[14px] font-semibold flex items-center justify-center gap-2">
                                    <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2.5} /> New Booking
                                </Link>
                                {[
                                    { label: 'Add Test', icon: FlaskConical, href: '/diagnostic-center/tests' },
                                    { label: 'Results', icon: FileText, href: '/diagnostic-center/results' },
                                    { label: 'Logistics', icon: Truck, href: '/diagnostic-center/agents' },
                                    { label: 'Partners', icon: Shield, href: '/diagnostic-center/partnerships' },
                                ].map(action => {
                                    const Icon = action.icon;
                                    return (
                                        <Link key={action.label} href={action.href} className="group px-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 hover:-translate-y-px hover:border-purple-300 hover:shadow-sm text-[12px] font-semibold flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
                                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-slate-700 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                <Icon className="h-4 w-4" strokeWidth={2} /> 
                                            </div>
                                            <span className="group-hover:text-purple-700 transition-colors">{action.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </DashboardCard>

                    {/* 10. Reviews */}
                    <DashboardCard noPadding hoverable>
                        <CardHeader 
                            title="Reviews" 
                            icon={Star}
                            action={
                                <Link href="/diagnostic-center/reviews" className="text-[13px] font-medium text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 group">
                                    See all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            }
                        />
                        <div className="px-5 pb-5">
                            <div className="space-y-3">
                                {(() => {
                                    if (loadingReviews && reviews.length === 0) return <div className="text-center py-4 text-xs"><span className="text-purple-600 font-medium">Loading...</span></div>;
                                    if (reviews.length === 0) return (
                                        <div className="py-6 flex flex-col items-center justify-center text-center">
                                            <Star className="h-6 w-6 text-slate-200 mb-2" strokeWidth={1.5} />
                                            <p className="text-[12px] text-slate-500 font-medium">No reviews yet.</p>
                                        </div>
                                    );
                                    return reviews.slice(0, 2).map((review) => (
                                        <div key={review.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                                    {review.is_anonymous ? 'Anonymous' : (review.patient?.name || 'Patient')}
                                                </span>
                                                <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
                                                    ★ {review.rating}
                                                </span>
                                            </div>
                                            {review.comment && <p className="text-[11px] leading-relaxed italic line-clamp-2 text-slate-500">&quot;{review.comment}&quot;</p>}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </DashboardCard>
                </div>
            </div>
        </div>
    );
}
