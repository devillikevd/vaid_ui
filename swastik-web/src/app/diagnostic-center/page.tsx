'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { FlaskConical, CalendarCheck, Clock, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDiagnosticCenterStore, type DiagnosticBooking } from '@/stores/diagnosticCenterStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDiagnosticUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';

export default function DiagnosticCenterDashboard() {
    const { stats, todaysBookings, isLoading, error, fetchDashboardData, fetchReviews, reviews, loadingReviews } = useDiagnosticCenterStore();
    const router = useRouter();

    // UI-03 Fix: Keyboard shortcuts
    const shortcuts = useMemo(() => [
        { key: 'b', description: 'Go to Bookings', action: () => router.push('/diagnostic-center/bookings') },
        { key: 't', description: 'Go to Tests', action: () => router.push('/diagnostic-center/tests') },
        { key: 'r', description: 'Refresh dashboard', action: () => fetchDashboardData() },
    ], [router, fetchDashboardData]);
    usePageShortcuts(shortcuts);

    // BUG-01/BUG-11 Fix: Debounce socket-driven refetches (500ms)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { fetchDashboardData(); }, 500);
    }, [fetchDashboardData]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    // Real-time: refresh dashboard when bookings or results change (debounced)
    useDiagnosticUpdates(
        useCallback(() => { debouncedFetch(); }, [debouncedFetch]),
        useCallback(() => { debouncedFetch(); }, [debouncedFetch]),
        useCallback(() => { debouncedFetch(); }, [debouncedFetch])
    );

    useEffect(() => {
        fetchDashboardData();
        fetchReviews();
    }, [fetchDashboardData, fetchReviews]);

    const currentTime = new Date();

    const STATS = [
        { label: 'Total Tests', value: stats?.totalTests ?? 0, icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: "Today's Bookings", value: stats?.todaysBookings ?? 0, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Pending Results', value: stats?.pendingResults ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Total Patients', value: stats?.totalPatients ?? 0, icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    // UI-05 Fix: Skeleton loading state
    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <FlaskConical className="h-12 w-12 text-red-400" />
                <p className="text-red-600 text-center max-w-md">{error}</p>
                <button onClick={() => fetchDashboardData()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Diagnostic Center Dashboard</h1>
                        <p className="text-purple-100 mt-1">
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

            {/* Today's Bookings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Today&apos;s Bookings</CardTitle>
                    <Link href="/diagnostic-center/bookings" className="text-sm text-purple-600 hover:underline">
                        View all
                    </Link>
                </CardHeader>
                <CardContent>
                    {todaysBookings.length > 0 ? (
                        <div className="space-y-3">
                            {todaysBookings.map((booking: DiagnosticBooking) => (
                                <div
                                    key={booking.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border ${
                                        booking.status === 'processing'
                                            ? 'border-purple-300 bg-purple-50'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-medium min-w-[70px]">
                                            <span className="text-gray-900 dark:text-gray-100">{booking.booking_time || '--:--'}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{booking.patient_name || 'Patient'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {booking.test_name || 'Test'} • {booking.collection_type === 'home_collection' ? 'Home Collection' : 'Walk-in'}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={booking.status} size="sm" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                            <p>No bookings scheduled for today</p>
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
                                return <div className="text-center py-4"><span className="text-purple-600">Loading reviews...</span></div>;
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
