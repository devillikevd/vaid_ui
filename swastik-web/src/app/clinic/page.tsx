'use client';

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { Users, Calendar, Clock, TrendingUp, UserCheck, BellRing, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClinicStore, type ClinicAppointment } from '@/stores/clinicStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAppointmentUpdates, useClinicInviteUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';
import { useToast } from '@/components/ui/Toast';

export default function ClinicDashboard() {
    const {
        stats,
        todaysAppointments,
        isLoading,
        error,
        fetchDashboardData,
        fetchReviews,
        reviews,
        loadingReviews,
        updateAppointmentStatus,
        checkInAppointment,
    } = useClinicStore();
    const router = useRouter();
    const toast = useToast();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // UI-03 Fix: Keyboard shortcuts
    const shortcuts = useMemo(() => [
        { key: 'a', description: 'Go to Appointments', action: () => router.push('/clinic/appointments') },
        { key: 'd', description: 'Go to Doctors', action: () => router.push('/clinic/doctors') },
        { key: 'r', description: 'Refresh dashboard', action: () => fetchDashboardData() },
    ], [router, fetchDashboardData]);
    usePageShortcuts(shortcuts);

    // BUG-01/BUG-12 Fix: Debounce socket-driven refetches (500ms)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { fetchDashboardData(); }, 500);
    }, [fetchDashboardData]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    // Real-time: refresh dashboard when appointments change (debounced)
    useAppointmentUpdates(useCallback(() => { debouncedFetch(); }, [debouncedFetch]));

    // Real-time: refresh when a doctor accepts/rejects an invite
    useClinicInviteUpdates(useCallback(() => { debouncedFetch(); }, [debouncedFetch]));

    useEffect(() => {
        fetchDashboardData();
        fetchReviews();
    }, [fetchDashboardData, fetchReviews]);

    const currentTime = new Date();

    const pendingInvites = Number(stats?.pendingInvites || 0);
    const needsAttentionCount = pendingInvites + Number(stats?.pendingAppointmentsToday || 0);

    const STATS = [
        { label: 'Active Doctors', value: stats?.activeDoctors ?? stats?.totalStaff ?? 0, icon: Users, color: 'text-pink-600', bg: 'bg-pink-100' },
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Checked-in Today', value: stats?.checkedInToday ?? 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Repeat Patients', value: stats?.repeatPatients ?? '0%', icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    ];

    const handleCheckIn = async (appointment: ClinicAppointment) => {
        setActionLoading(`checkin:${appointment.id}`);
        const success = await checkInAppointment(appointment.id);
        if (success) {
            toast.success('Checked In', `${appointment.patientName} has been checked in.`);
        } else {
            toast.error('Check-in Failed', useClinicStore.getState().error || 'Please try again.');
        }
        setActionLoading(null);
    };

    const handleConfirm = async (appointment: ClinicAppointment) => {
        setActionLoading(`confirm:${appointment.id}`);
        const success = await updateAppointmentStatus(appointment.id, 'confirmed');
        if (success) {
            toast.success('Appointment Confirmed', `${appointment.patientName} confirmed.`);
        } else {
            toast.error('Action Failed', useClinicStore.getState().error || 'Please try again.');
        }
        setActionLoading(null);
    };

    const handleNoShow = async (appointment: ClinicAppointment) => {
        setActionLoading(`noshow:${appointment.id}`);
        const success = await updateAppointmentStatus(appointment.id, 'no_show');
        if (success) {
            toast.success('Marked as No Show', `${appointment.patientName} marked as no-show.`);
        } else {
            toast.error('Action Failed', useClinicStore.getState().error || 'Please try again.');
        }
        setActionLoading(null);
    };

    // UI-05 Fix: Skeleton loading state
    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Calendar className="h-12 w-12 text-red-400" />
                <p className="text-red-600 text-center max-w-md">{error}</p>
                <button onClick={() => fetchDashboardData()} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    const pendingAppointments = todaysAppointments.filter(
        (a) => a.status === 'scheduled'
    );
    const checkedInAppointments = todaysAppointments.filter(
        (a) => a.checkedInAt || a.status === 'in_progress' || a.status === 'in-progress'
    );

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-pink-600 to-pink-800 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Clinic Operating System</h1>
                        <p className="text-pink-100 mt-1">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => fetchDashboardData()}
                        leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
                        className="!bg-white/15 !text-white hover:!bg-white/25"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Needs Attention + Today's Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Needs Attention */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="h-4 w-4 text-pink-600" />
                            Needs Attention
                        </CardTitle>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${needsAttentionCount > 0 ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-500'}`}>
                            {needsAttentionCount}
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingInvites > 0 && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 p-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                    <span className="text-gray-700 dark:text-gray-200">
                                        {pendingInvites} pending doctor invite{pendingInvites > 1 ? 's' : ''} waiting on response
                                    </span>
                                </div>
                                <Link href="/clinic/doctors?tab=invites" className="text-xs font-medium text-pink-600 hover:underline whitespace-nowrap">
                                    Review
                                </Link>
                            </div>
                        )}
                        {pendingAppointments.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Unconfirmed today ({pendingAppointments.length})
                                </p>
                                {pendingAppointments.slice(0, 4).map((appointment) => (
                                    <div key={appointment.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-2.5">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{appointment.patientName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.time} · {appointment.doctorName}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleConfirm(appointment)}
                                                disabled={actionLoading === `confirm:${appointment.id}`}
                                                leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                                className="!px-2.5"
                                            >
                                                Confirm
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleNoShow(appointment)}
                                                disabled={actionLoading === `noshow:${appointment.id}`}
                                                leftIcon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                                                className="!px-2.5"
                                            >
                                                No-show
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : pendingInvites === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">All caught up. No action required.</p>
                        ) : null}
                    </CardContent>
                </Card>

                {/* Today's Queue */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Today&apos;s Queue</CardTitle>
                        <Link href="/clinic/appointments" className="text-sm text-pink-600 hover:underline">
                            View all
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {checkedInAppointments.length > 0 && (
                            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">
                                    Checked In ({checkedInAppointments.length})
                                </p>
                                <div className="space-y-1.5">
                                    {checkedInAppointments.map((appointment) => (
                                        <div key={appointment.id} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="text-gray-800 dark:text-gray-100 font-medium">{appointment.time} · {appointment.patientName}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">with {appointment.doctorName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {todaysAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {todaysAppointments.map((appointment: ClinicAppointment) => (
                                    <div
                                        key={appointment.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border ${appointment.checkedInAt
                                            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                                            : ['in-progress', 'in_progress'].includes(appointment.status)
                                                ? 'border-pink-300 bg-pink-50'
                                                : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm font-medium min-w-[70px]">
                                                <span className="text-gray-900 dark:text-gray-100">{appointment.time}</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.doctorName} • {appointment.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={appointment.status} size="sm" />
                                            {!appointment.checkedInAt && (appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => void handleCheckIn(appointment)}
                                                    disabled={actionLoading === `checkin:${appointment.id}`}
                                                    leftIcon={<UserCheck className="h-3.5 w-3.5 text-emerald-600" />}
                                                    className="!px-2.5"
                                                >
                                                    Check in
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <p>No appointments scheduled for today</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Reviews */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {(() => {
                            if (loadingReviews && reviews.length === 0) {
                                return <div className="text-center py-4"><span className="text-pink-600">Loading reviews...</span></div>;
                            }

                            if (reviews.length === 0) {
                                return <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>;
                            }

                            return reviews.slice(0, 3).map((review) => (
                                <div key={review.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {review.is_anonymous ? 'Anonymous' : (review.patient?.name || 'Patient')}
                                        </span>
                                        <div className="flex">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span key={i} className={`text-xs ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                                            ))}
                                        </div>
                                    </div>
                                    {review.comment && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">&quot;{review.comment}&quot;</p>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
