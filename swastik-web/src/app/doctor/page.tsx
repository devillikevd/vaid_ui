'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Calendar,
    Clock,
    CheckCircle,
    TrendingUp,
    Video,
    User,
    FileText,
    Settings,
    Bell,
    RefreshCw,
    QrCode
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDoctorStore, type Appointment } from '@/stores/doctorStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppointmentUpdates, type AppointmentUpdate } from '@/hooks/useSocket';
import { KeyboardShortcutHelp, usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';

export default function DoctorDashboard() {
    const { stats, todaysAppointments, upcomingAppointments, isLoading, fetchDashboardData, startConsultation } = useDoctorStore();
    const { user } = useAuthStore();
    const router = useRouter();
    const [newApptAlert, setNewApptAlert] = useState<string | null>(null);
    const [launchingAppointmentId, setLaunchingAppointmentId] = useState<string | null>(null);

    const shortcuts = useMemo(() => [
        { key: 'a', description: 'Go to Appointments', action: () => router.push('/doctor/appointments') },
        { key: 'p', description: 'Go to Patients', action: () => router.push('/doctor/patients') },
        { key: 'r', description: 'Refresh dashboard', action: () => fetchDashboardData() },
        { key: 's', description: 'Go to Settings', action: () => router.push('/doctor/settings') },
        { key: 'v', description: 'Go to Vitals', action: () => router.push('/doctor/vitals') },
    ], [router, fetchDashboardData]);

    const { showHelp, setShowHelp, allShortcuts } = usePageShortcuts(shortcuts);

    // BUG-01 Fix: Debounce socket-driven refetches (500ms)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { fetchDashboardData(); }, 500);
    }, [fetchDashboardData]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    // Real-time Socket.IO — auto-refresh when patient books/cancels/updates (debounced)
    useAppointmentUpdates(
        useCallback((update: AppointmentUpdate) => {
            debouncedFetch();
            const eventType = update.status === 'scheduled' ? 'New appointment booked!' :
                update.status === 'cancelled' ? 'An appointment was cancelled' :
                `Appointment status: ${update.status}`;
            setNewApptAlert(eventType);
            setTimeout(() => setNewApptAlert(null), 5000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [debouncedFetch])
    );

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const currentTime = new Date();
    const nextAppointment = todaysAppointments.find((appointment: Appointment) =>
        ['scheduled', 'confirmed', 'in_progress', 'active'].includes(appointment.status)
    );

    const isVideoAppointment = useCallback((appointment: Appointment) =>
        ['video', 'Video'].includes(appointment.type),
    []);

    const canOpenConsultation = useCallback((appointment: Appointment) =>
        isVideoAppointment(appointment) && ['scheduled', 'confirmed', 'in_progress', 'active'].includes(appointment.status),
    [isVideoAppointment]);

    const handleOpenConsultation = useCallback(async (appointment: Appointment) => {
        setLaunchingAppointmentId(appointment.id);
        try {
            const consultationId = await startConsultation(appointment.id);
            if (consultationId) {
                router.push(`/consultation/${consultationId}`);
            }
        } finally {
            setLaunchingAppointmentId(null);
        }
    }, [router, startConsultation]);

    // Stats configuration using real data
    const STATS = [
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: Calendar, change: '', color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Completed', value: stats?.completed ?? 0, icon: CheckCircle, change: '', color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, change: '', color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: "Today's Earnings", value: `₹${(stats?.todaysEarnings ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp, change: '', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    ];

    // UI-05 Fix: Skeleton loading state
    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    return (
        <>
        <div className="space-y-6">
            {/* Real-time Appointment Alert */}
            {newApptAlert && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
                    <Bell className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium">🔔 {newApptAlert}</span>
                    <button onClick={() => setNewApptAlert(null)} className="ml-auto text-emerald-800 underline text-sm">Dismiss</button>
                </div>
            )}

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Doctor'}!</h1>
                        <p className="text-emerald-100 mt-1">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm text-emerald-200">Next Appointment</p>
                            <p className="font-medium">
                                {nextAppointment?.time || 'No upcoming'}
                            </p>
                        </div>
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
                                    {stat.change && (
                                        <p className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                            {stat.change} from yesterday
                                        </p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Appointments */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Today&apos;s Schedule</CardTitle>
                        <Link href="/doctor/appointments" className="text-sm text-emerald-600 hover:underline">
                            View all
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {todaysAppointments.map((appointment: Appointment) => (
                                (() => {
                                    const consultationReady = canOpenConsultation(appointment);
                                    const consultationLive = ['in_progress', 'active'].includes(appointment.status);
                                    const isLaunching = launchingAppointmentId === appointment.id;

                                    return (
                                <div
                                    key={appointment.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border ${consultationLive
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center text-sm font-medium min-w-[70px]">
                                            <span className="text-gray-900 dark:text-gray-100">{appointment.time}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-2">
                                                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {appointment.type === 'Video' ? (
                                                        <Video className="h-3 w-3 text-blue-600" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                    )}
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{appointment.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={appointment.status} size="sm" />
                                        {consultationReady && (
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                disabled={isLaunching}
                                                onClick={() => handleOpenConsultation(appointment)}
                                            >
                                                {isLaunching ? 'Opening...' : consultationLive ? 'Join Call' : 'Start Call'}
                                            </Button>
                                        )}
                                        {!consultationReady && ['scheduled', 'confirmed'].includes(appointment.status) && (
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/doctor/appointments`)}>
                                                Manage
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                    );
                                })()
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions & Upcoming */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/doctor/consultations"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-center"
                                >
                                    <FileText className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Consultations</p>
                                </Link>
                                <Link
                                    href="/doctor/patients"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                                >
                                    <User className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Patient Records</p>
                                </Link>
                                <Link
                                    href="/doctor/schedule"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-yellow-300 hover:bg-yellow-50 transition-colors text-center"
                                >
                                    <Calendar className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Edit Schedule</p>
                                </Link>
                                <Link
                                    href="/doctor/settings"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center"
                                >
                                    <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Settings</p>
                                </Link>
                                <Link
                                    href="/doctor/scan-patient"
                                    className="col-span-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
                                >
                                    <QrCode className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Scan Patient QR</p>
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
                                    // Local state for reviews since fetching relies on user ID
                                    const { user } = useAuthStore();
                                    const { fetchReviews, reviews, loadingReviews } = useDoctorStore();
                                    useEffect(() => {
                                        if (user?.id) {
                                            fetchReviews(user.id);
                                        }
                                    }, [user?.id, fetchReviews]);
                                    
                                    if (loadingReviews && reviews.length === 0) {
                                        return <div className="text-center py-4"><span className="text-emerald-600">Loading reviews...</span></div>;
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
                                                <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">"{review.comment}"</p>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Appointments */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {upcomingAppointments.slice(0, 3).map((appointment: Appointment) => (
                                    <div key={appointment.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.appointment_date} • {appointment.time}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${appointment.type === 'Video' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}>
                                            {appointment.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        <KeyboardShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} shortcuts={allShortcuts} />
        </>
    );
}
