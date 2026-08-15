'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Calendar,
    CalendarClock,
    Clock,
    CheckCircle,
    TrendingUp,
    Video,
    User,
    FileText,
    Settings,
    Bell,
    RefreshCw,
    QrCode,
    Loader2,
    Star,
    MessageCircleQuestion,
    MessageSquare,
    PenLine
} from 'lucide-react';
import { formatDoctorName } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useDoctorStore, type Appointment } from '@/stores/doctorStore';
import { VerificationProgressCard } from '@/components/doctor/VerificationProgressCard';
import { RejectionBanner } from '@/components/doctor/RejectionBanner';
import { OnboardingChecklist } from '@/components/doctor/OnboardingChecklist';
import { WelcomeTour } from '@/components/doctor/WelcomeTour';
import OnboardingPopup from '@/components/doctor/OnboardingPopup';
import { useAppointmentUpdates, type AppointmentUpdate } from '@/hooks/useSocket';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { KeyboardShortcutHelp, usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';
import { api } from '@/lib/api';

export default function DoctorDashboard() {
    const { stats, doctorProfile, todaysAppointments, upcomingAppointments, isLoading, fetchDashboardData, startConsultation, endConsultation, fetchReviews, reviews, loadingReviews, confirmAppointment, rescheduleAppointment } = useDoctorStore();
    const { user } = useAuthStore();
    const router = useRouter();
    const [newApptAlert, setNewApptAlert] = useState<string | null>(null);
    const [launchingAppointmentId, setLaunchingAppointmentId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reschedulePrompt, setReschedulePrompt] = useState<any>(null);
    const [newScheduleAppt, setNewScheduleAppt] = useState<any>(null);
    const [newScheduleDate, setNewScheduleDate] = useState('');
    const [newScheduleTime, setNewScheduleTime] = useState('');
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);

    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);

    useEffect(() => {
        if (doctorProfile && !doctorProfile.practice_setup_type && !doctorProfile.onboarding_completed_at) {
            setShowOnboardingPopup(true);
        } else {
            setShowOnboardingPopup(false);
        }
    }, [doctorProfile]);

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
        const fetchQuestions = async () => {
            setLoadingQuestions(true);
            try {
                const response = await api.community.getQuestions(1, 5);
                if (response.success) {
                    const data = response.data as any;
                    const allQs = data.questions || data.data || [];
                    const unanswered = allQs.filter((q: any) => !q.answers || q.answers.length === 0);
                    setRecentQuestions(unanswered.slice(0, 3));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingQuestions(false);
            }
        };
        fetchQuestions();
    }, [fetchDashboardData]);

    // Auto-refresh polling fallback so the dashboard stays fresh even if a
    // socket event is missed (tab visible → refetch every 30s).
    useAutoRefresh(fetchDashboardData);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const currentTime = new Date();
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 21) return 'Good Evening';
        return 'Good Night';
    };
    const nextAppointment = todaysAppointments.find((appointment: Appointment) =>
        ['scheduled', 'confirmed', 'in_progress', 'active'].includes(appointment.status)
    );

    const isVideoAppointment = useCallback((appointment: Appointment) =>
        ['video', 'Video'].includes(appointment.type),
    []);

    const canOpenConsultation = useCallback((appointment: Appointment) =>
        isVideoAppointment(appointment) && ['confirmed', 'in_progress', 'active'].includes(appointment.status),
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

    const handleApprove = useCallback(async (appointment: Appointment) => {
        const aptDateStr = appointment.date || appointment.appointment_date;
        const aptTimeStr = appointment.time || appointment.timeSlot;
        if (aptDateStr && aptTimeStr) {
            try {
                const aptDate = new Date(aptDateStr);
                const now = new Date();
                const [hours, minutes] = aptTimeStr.split(':').map(Number);
                if (!isNaN(hours) && !isNaN(minutes)) {
                    const aptDateTime = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate(), hours, minutes);
                    if (aptDateTime < now) {
                        setReschedulePrompt(appointment);
                        return;
                    }
                }
            } catch(e) {}
        }
        setApprovingId(appointment.id);
        await confirmAppointment(appointment.id);
        setApprovingId(null);
        // Auto-open patient details after approval
        setSelectedAppointment(appointment);
    }, [confirmAppointment]);

    const confirmReschedule = useCallback(async () => {
        if (!reschedulePrompt) return;
        setApprovingId(reschedulePrompt.id);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const newDate = now.toISOString().split('T')[0];
        const newTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        await rescheduleAppointment(reschedulePrompt.id, newDate, newTime);
        setApprovingId(null);
        setReschedulePrompt(null);
    }, [reschedulePrompt, rescheduleAppointment]);

    const openNewSchedule = useCallback((appointment: Appointment) => {
        setNewScheduleAppt(appointment);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const fallbackDate = now.toISOString().split('T')[0];
        const fallbackTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setNewScheduleDate(appointment.appointment_date || appointment.date || fallbackDate);
        setNewScheduleTime((appointment.time || appointment.timeSlot || fallbackTime).substring(0, 5));
    }, []);

    const submitNewSchedule = useCallback(async () => {
        if (!newScheduleAppt) return;
        if (!newScheduleDate || !newScheduleTime) {
            alert('Please choose a date and time for the new schedule.');
            return;
        }
        setApprovingId(newScheduleAppt.id);
        await rescheduleAppointment(newScheduleAppt.id, newScheduleDate, newScheduleTime);
        setApprovingId(null);
        setNewScheduleAppt(null);
        setNewScheduleDate('');
        setNewScheduleTime('');
        fetchDashboardData();
    }, [newScheduleAppt, newScheduleDate, newScheduleTime, rescheduleAppointment, fetchDashboardData]);

    const handleEndConsultation = useCallback(async (appointment: Appointment) => {
        if (!confirm('Are you sure you want to forcefully end this consultation? This will clear it from your active session.')) return;
        try {
            await endConsultation(appointment.id, appointment.consultation_id);
        } catch (error) {
            console.error('Failed to end consultation', error);
            alert('Failed to end consultation. Please try again.');
        }
    }, [endConsultation]);

    // Stats configuration using real data
    const STATS = [
        { label: "Today's Appointments", value: stats?.todaysAppointments ?? 0, icon: Calendar, change: '', color: 'text-blue-600', bg: 'bg-blue-100', href: '/doctor/appointments' },
        { label: "Today's Completed Consultations", value: stats?.completed ?? 0, icon: CheckCircle, change: '', color: 'text-green-600', bg: 'bg-green-100', href: '/doctor/appointments?status=completed' },
        { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, change: '', color: 'text-yellow-600', bg: 'bg-yellow-100', href: '/doctor/appointments?status=pending' },
        { label: "Today's Earnings", value: `₹${(stats?.todaysEarnings ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp, change: '', color: 'text-emerald-600', bg: 'bg-emerald-100', href: '/doctor/earnings' },
    ];

    // UI-05 Fix: Skeleton loading state
    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    return (
        <>
        <div className="space-y-6">
            <WelcomeTour />
            <OnboardingPopup 
                isOpen={showOnboardingPopup} 
                onClose={() => setShowOnboardingPopup(false)} 
                onComplete={() => fetchDashboardData()} 
            />

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
                        <h1 className="text-2xl font-bold">{getGreeting()}, {formatDoctorName(user?.name) || 'Doctor'}!</h1>
                        <p className="text-emerald-100 mt-1">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/doctor/journey">
                            <Button variant="secondary" className="bg-emerald-500/30 text-emerald-50 hover:bg-emerald-500/50 border border-emerald-400/40 gap-2 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:scale-105">
                                <Star className="h-4 w-4 text-emerald-200 fill-emerald-200" /> My Journey
                            </Button>
                        </Link>
                        <div className="text-right border-l border-emerald-500/50 pl-6">
                            <p className="text-sm text-emerald-200">Next Appointment</p>
                            {(() => {
                                if (!nextAppointment) return <p className="font-medium text-emerald-100">No upcoming</p>;
                                const timeStr = nextAppointment.time || nextAppointment.timeSlot || '';
                                const isExpired = (() => {
                                    if (!timeStr) return false;
                                    const [h, m] = timeStr.split(':');
                                    const t = new Date();
                                    t.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                    return currentTime > t;
                                })();
                                return isExpired ? (
                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        <p className="font-bold text-red-300 text-sm">⚠ Expired</p>
                                    </div>
                                ) : (
                                    <p className="font-medium text-white">{timeStr}</p>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {doctorProfile && doctorProfile.approval_status === 'rejected' && (
                <RejectionBanner profile={doctorProfile} onReupload={fetchDashboardData} />
            )}

            {doctorProfile && doctorProfile.approval_status !== 'approved' && (
                <VerificationProgressCard profile={doctorProfile} />
            )}

            {doctorProfile && doctorProfile.approval_status === 'approved' && (
                <OnboardingChecklist profile={doctorProfile} />
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link href={stat.href} key={stat.label} className="block transition-transform hover:-translate-y-1">
                            <Card className="h-full cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors shadow-sm hover:shadow-md">
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
                        </Link>
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
                            {todaysAppointments.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p>No appointments yet</p>
                                </div>
                            ) : (
                                todaysAppointments.map((appointment: Appointment) => (
                                    (() => {
                                    const consultationReady = canOpenConsultation(appointment);
                                    const consultationLive = ['in_progress', 'active'].includes(appointment.status);
                                    const isLaunching = launchingAppointmentId === appointment.id;

                                    // Overdue: appointment time has passed and it's still pending/confirmed
                                    const isOverdue = (() => {
                                        if (!['scheduled', 'confirmed'].includes(appointment.status)) return false;
                                        const timeStr = appointment.time || appointment.timeSlot || '';
                                        if (!timeStr) return false;
                                        const [hStr, mStr] = timeStr.split(':');
                                        const apptDate = new Date();
                                        apptDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
                                        return currentTime > apptDate;
                                    })();

                                    return (
                                <div
                                    key={appointment.id}
                                    className={`flex flex-col rounded-xl border cursor-pointer overflow-hidden transition-colors ${
                                        isOverdue
                                        ? 'border-red-400 dark:border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                        : consultationLive
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                                    }`}
                                    onClick={(e) => {
                                        // Only open modal if not clicking a button
                                        if ((e.target as HTMLElement).closest('button')) return;
                                        setSelectedAppointment(appointment);
                                    }}
                                >
                                    {/* Overdue Alert Banner */}
                                    {isOverdue && (
                                        <div className="flex items-center gap-2 bg-red-500 text-white text-xs font-semibold px-4 py-2 animate-pulse">
                                            <span>⚠️</span>
                                            <span>Appointment time has passed! Please reschedule or take action immediately.</span>
                                        </div>
                                    )}
                                    <div className={`flex items-center justify-between p-4 ${
                                        isOverdue ? 'bg-red-50 dark:bg-red-950/30' : consultationLive ? 'bg-emerald-50' : ''
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center text-sm font-medium min-w-[70px]">
                                            <span className={`font-bold ${ isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-gray-100' }`}>{appointment.time}</span>
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
                                            <>
                                                <Button
                                                    size="sm"
                                                    className={isOverdue
                                                        ? 'bg-gray-400 cursor-not-allowed opacity-60 text-white'
                                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                                    }
                                                    disabled={isLaunching || isOverdue}
                                                    onClick={() => handleOpenConsultation(appointment)}
                                                    title={isOverdue ? 'Please reschedule first before starting' : ''}
                                                >
                                                    {isLaunching ? 'Opening...' : isOverdue ? 'Reschedule First!' : consultationLive ? 'Join Call' : 'Start Call'}
                                                </Button>
                                                {consultationLive && (
                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={() => handleEndConsultation(appointment)}
                                                    >
                                                        End Call
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        {!consultationReady && appointment.status === 'scheduled' && (
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                disabled={approvingId === appointment.id}
                                                onClick={() => handleApprove(appointment)}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {approvingId === appointment.id ? 'Approving...' : 'Approve'}
                                            </Button>
                                        )}
                                        {!consultationReady && appointment.status === 'confirmed' && (
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/doctor/appointments`)}>
                                                Manage
                                            </Button>
                                        )}
                                        {['scheduled', 'confirmed'].includes(appointment.status) && (
                                            <Button
                                                size="sm"
                                                variant={isOverdue ? 'danger' : 'outline'}
                                                onClick={() => openNewSchedule(appointment)}
                                                disabled={approvingId === appointment.id}
                                                leftIcon={<CalendarClock className={`h-3 w-3 ${ isOverdue ? 'text-white' : 'text-emerald-600' }`} />}
                                                className={isOverdue ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 animate-bounce' : ''}
                                            >
                                                {isOverdue ? 'Reschedule Now!' : 'New Schedule'}
                                            </Button>
                                        )}
                                    </div>
                                    </div>
                                </div>
                                    );
                                })()
                            )))}
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
                                    href="/doctor/prescriptions/new"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-center"
                                >
                                    <PenLine className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">New Prescription</p>
                                </Link>
                                <Link
                                    href="/doctor/patients"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
                                >
                                    <User className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Patient Records</p>
                                </Link>
                                <Link
                                    href="/doctor/schedule"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors text-center"
                                >
                                    <Calendar className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Edit Schedule</p>
                                </Link>
                                <Link
                                    href="/doctor/appointments?status=completed"
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center"
                                >
                                    <CheckCircle className="h-6 w-6 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Past Appts</p>
                                </Link>
                                <Link
                                    href="/doctor/scan-patient"
                                    className="col-span-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-center"
                                >
                                    <QrCode className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Scan Patient QR</p>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Reviews */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Recent Reviews</CardTitle>
                            <Link href="/doctor/reviews">
                                <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700">View All</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(() => {
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
                                                    {review.is_anonymous ? 'Anonymous Patient' : 'Verified Patient'}
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


                    {/* Recent Community Questions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircleQuestion className="w-5 h-5 text-indigo-600" />
                                Community Q&A
                            </CardTitle>
                            <Link href="/doctor/community">
                                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">View All</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 mt-2">
                                {(() => {
                                    if (loadingQuestions) {
                                        return <div className="text-center py-4"><span className="text-indigo-600">Loading questions...</span></div>;
                                    }
                                    
                                    if (recentQuestions.length === 0) {
                                        return (
                                            <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">All caught up!</p>
                                                <p className="text-xs text-gray-500 mt-1">No unanswered questions in the community.</p>
                                            </div>
                                        );
                                    }
                                    
                                    return recentQuestions.map((q) => (
                                        <div key={q.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 group">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                                                    {q.title}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{q.content}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <User className="w-3 h-3" /> {q.patient?.name || 'Anonymous'}
                                                </span>
                                                <Link href="/doctor/community">
                                                    <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3">
                                                        Reply
                                                    </Button>
                                                </Link>
                                            </div>
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
                                {(!upcomingAppointments || upcomingAppointments.length === 0) ? (
                                    <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                                        <p className="text-sm font-medium">No upcoming appointments</p>
                                    </div>
                                ) : (
                                    upcomingAppointments.slice(0, 3).map((appointment: Appointment) => (
                                        <div key={appointment.id} 
                                            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-lg px-2 -mx-2 transition-colors"
                                            onClick={() => setSelectedAppointment(appointment)}
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.patientName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.appointment_date} • {appointment.time}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${appointment.type === 'Video' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {appointment.type}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        <KeyboardShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} shortcuts={allShortcuts} />

        {reschedulePrompt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && approvingId !== reschedulePrompt.id) {
                        setReschedulePrompt(null);
                    }
                }}
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reschedule Past Appointment</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                This appointment&apos;s requested time has already passed. Would you like to reschedule it to 15 minutes from now and approve?
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setReschedulePrompt(null)} disabled={approvingId === reschedulePrompt.id}>
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    setApprovingId(reschedulePrompt.id);
                                    await confirmAppointment(reschedulePrompt.id);
                                    setApprovingId(null);
                                    setReschedulePrompt(null);
                                }}
                                disabled={approvingId === reschedulePrompt.id}
                            >
                                Approve with Past Time
                            </Button>
                            <Button variant="primary" onClick={confirmReschedule} disabled={approvingId === reschedulePrompt.id} className="bg-emerald-600 hover:bg-emerald-700">
                                {approvingId === reschedulePrompt.id ? 'Processing...' : 'Reschedule & Approve'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}

        {newScheduleAppt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && approvingId !== newScheduleAppt.id) {
                        setNewScheduleAppt(null);
                    }
                }}
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Give New Schedule</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {newScheduleAppt.patientName} could not join at {newScheduleAppt.time || newScheduleAppt.timeSlot || 'the scheduled time'}. Choose a new date and time below — the patient will be notified instantly.
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New Date</label>
                            <Input
                                type="date"
                                value={newScheduleDate}
                                onChange={(e) => setNewScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New Time</label>
                            <Input
                                type="time"
                                value={newScheduleTime}
                                onChange={(e) => setNewScheduleTime(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setNewScheduleAppt(null)} disabled={approvingId === newScheduleAppt.id}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={submitNewSchedule} disabled={approvingId === newScheduleAppt.id}>
                                {approvingId === newScheduleAppt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save New Schedule'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        {/* Patient Details Modal */}
        {selectedAppointment && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onClick={(e) => { if (e.target === e.currentTarget) setSelectedAppointment(null); }}
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-t-2xl p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 rounded-full p-2">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">{selectedAppointment.patientName}</h2>
                                    <p className="text-emerald-100 text-xs">
                                        {selectedAppointment.appointment_date} • {selectedAppointment.time}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAppointment(null)}
                                className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Age */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                                <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-1">Age</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {selectedAppointment.patient?.date_of_birth
                                        ? `${Math.floor((new Date().getTime() - new Date(selectedAppointment.patient.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs`
                                        : '—'}
                                </p>
                            </div>
                            {/* Gender */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
                                <p className="text-[10px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider mb-1">Sex</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">
                                    {selectedAppointment.patient?.gender || '—'}
                                </p>
                            </div>
                            {/* Blood Group */}
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-800">
                                <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">Blood Group</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {selectedAppointment.patient?.blood_group || '—'}
                                </p>
                            </div>
                            {/* Weight / Height */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                                <p className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-1">Weight / Height</p>
                                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                                    {selectedAppointment.patient?.weight ? `${selectedAppointment.patient.weight} kg` : '—'}
                                    {' / '}
                                    {selectedAppointment.patient?.height ? `${selectedAppointment.patient.height} cm` : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Reason / Symptoms */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Reason for Consultation</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                {Array.isArray(selectedAppointment.symptoms) && selectedAppointment.symptoms.length > 0
                                    ? selectedAppointment.symptoms.join(', ')
                                    : selectedAppointment.reason
                                    || selectedAppointment.patient_notes
                                    || <span className="text-gray-400 italic">Not specified</span>}
                            </p>
                        </div>

                        {/* Consultation Type Badge */}
                        <div className="flex items-center justify-between">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                selectedAppointment.type === 'Video' || selectedAppointment.type === 'video'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                                {selectedAppointment.type === 'Video' || selectedAppointment.type === 'video' ? '📹 Video Call' : '🏥 In-Person'}
                            </span>
                            <button
                                onClick={() => setSelectedAppointment(null)}
                                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
