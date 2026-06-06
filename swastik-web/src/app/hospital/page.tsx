'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { Users, Building2, Calendar, Bed, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useHospitalStore, type Department } from '@/stores/hospitalStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useAppointmentUpdates } from '@/hooks/useSocket';
import { KeyboardShortcutHelp, usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';

export default function HospitalDashboard() {
    const { stats, departments, isLoading, error, fetchDashboardData, fetchReviews, reviews, loadingReviews } = useHospitalStore();
    const { user } = useAuthStore();
    const router = useRouter();

    // BUG-01 Fix: Debounce socket-driven refetches (500ms) to prevent thundering herd
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { fetchDashboardData(); }, 500);
    }, [fetchDashboardData]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    // Real-time: refresh dashboard when appointments change (debounced)
    useAppointmentUpdates(useCallback(() => { debouncedFetch(); }, [debouncedFetch]));

    const shortcuts = useMemo(() => [
        { key: 'd', description: 'Go to Departments', action: () => router.push('/hospital/departments') },
        { key: 'o', description: 'Go to Doctors', action: () => router.push('/hospital/doctors') },
        { key: 'a', description: 'Go to Appointments', action: () => router.push('/hospital/appointments') },
        { key: 'r', description: 'Refresh dashboard', action: () => fetchDashboardData() },
    ], [router, fetchDashboardData]);

    const { showHelp, setShowHelp, allShortcuts } = usePageShortcuts(shortcuts);

    useEffect(() => {
        fetchDashboardData();
        fetchReviews();
    }, [fetchDashboardData, fetchReviews]);

    const currentTime = new Date();

    // Stats configuration using real data
    const STATS = [
        { label: 'Total Doctors', value: stats?.totalDoctors ?? 0, icon: Users, color: 'text-teal-600', bg: 'bg-teal-100' },
        { label: 'Departments', value: stats?.departments ?? 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: Calendar, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Bed Capacity', value: stats?.bedCapacity ?? '0%', icon: Bed, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    ];

    // UI-05 Fix: Skeleton loading state
    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Building2 className="h-12 w-12 text-red-400" />
                <p className="text-red-600 text-center max-w-md">{error}</p>
                <button onClick={() => fetchDashboardData()} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Hospital Management Console</h1>
                        <p className="text-teal-100 mt-1">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <Button className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white border-0" onClick={() => router.push('/hospital/doctors')}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Doctor
                        </Button>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Departments */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Department Overview</CardTitle>
                        <Link href="/hospital/departments" className="text-sm text-teal-600 hover:underline">
                            Manage
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {departments.map((dept: Department) => (
                                <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-200 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{dept.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{dept.doctors} doctors</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-semibold text-teal-600">{dept.appointments}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">appointments</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/hospital/doctors"
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-300 hover:bg-teal-50 transition-colors text-center"
                            >
                                <Users className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Manage Doctors</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats?.totalDoctors ?? 0} active</p>
                            </Link>
                            <Link
                                href="/hospital/departments"
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                            >
                                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Departments</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats?.departments ?? 0} total</p>
                            </Link>
                            <Link
                                href="/hospital/appointments"
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
                            >
                                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Appointments</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats?.todaysAppointments ?? 0} today</p>
                            </Link>
                            <Link
                                href="/hospital/reports"
                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-yellow-300 hover:bg-yellow-50 transition-colors text-center"
                            >
                                <Bed className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Reports</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View analytics</p>
                            </Link>
                        </div>
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
                                    return <div className="text-center py-4"><span className="text-teal-600">Loading reviews...</span></div>;
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
        </div>
        <KeyboardShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} shortcuts={allShortcuts} />
        </>
    );
}
