'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { Users, Calendar, Clock, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClinicStore, type ClinicAppointment } from '@/stores/clinicStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';

export default function ClinicDashboard() {
    const { stats, todaysAppointments, isLoading, error, fetchDashboardData, fetchReviews, reviews, loadingReviews } = useClinicStore();
    const router = useRouter();

    // UI-03 Fix: Keyboard shortcuts
    const shortcuts = useMemo(() => [
        { key: 'a', description: 'Go to Appointments', action: () => router.push('/clinic/appointments') },
        { key: 'd', description: 'Go to Staff', action: () => router.push('/clinic/staff') },
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

    useEffect(() => {
        fetchDashboardData();
        fetchReviews();
    }, [fetchDashboardData, fetchReviews]);

    const currentTime = new Date();

    // Stats configuration using real data
    const STATS = [
        { label: 'Total Staff', value: stats?.totalStaff ?? 0, icon: Users, color: 'text-pink-600', bg: 'bg-pink-100' },
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Walk-ins Today', value: stats?.walkInsToday ?? 0, icon: Clock, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Repeat Patients', value: stats?.repeatPatients ?? '0%', icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    ];

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

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-pink-600 to-pink-800 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Clinic Scheduling Center</h1>
                        <p className="text-pink-100 mt-1">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
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

            {/* Today's Appointments */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Today&apos;s Appointment Calendar</CardTitle>
                    <Link href="/clinic/appointments" className="text-sm text-pink-600 hover:underline">
                        View all
                    </Link>
                </CardHeader>
                <CardContent>
                    {todaysAppointments.length > 0 ? (
                        <div className="space-y-3">
                            {todaysAppointments.map((appointment: ClinicAppointment) => (
                                <div
                                    key={appointment.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border ${['in-progress', 'in_progress'].includes(appointment.status)
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
                                    <StatusBadge status={appointment.status} size="sm" />
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
