/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Users,
    Calendar,
    Clock,
    UserCheck,
    AlertTriangle,
    RefreshCw,
    CheckCircle2,
    Pill,
    Microscope,
    Building2,
    Star,
    Activity,
    IndianRupee,
    HeartPulse,
    ChevronRight,
    TrendingUp,
    ExternalLink,
    AlertCircle,
    UserPlus,
    Network,
    Sliders,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore, type ClinicAppointment } from '@/stores/clinicStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppointmentUpdates, useClinicInviteUpdates } from '@/hooks/useSocket';
import { usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';
import { useToast } from '@/components/ui/Toast';
import { AppointmentDetailModal } from '@/components/clinic/AppointmentDetailModal';
import {
    CustomizeQuickOperationsModal,
    QUICK_ACTION_REGISTRY,
    DEFAULT_QUICK_ACTIONS,
} from '@/components/clinic/CustomizeQuickOperationsModal';
import { InviteDoctorModal } from '@/components/clinic/InviteDoctorModal';
import { ClinicProfileCompletionCard } from '@/components/clinic/ClinicProfileCompletionCard';
import { ClinicOnboardingModal } from '@/components/clinic/ClinicOnboardingModal';
import { cn } from '@/lib/utils';

export default function ClinicDashboard() {
    const {
        stats,
        todaysAppointments,
        needsAttention,
        connectedCare,
        teamSnapshot,
        reviewsSnapshot,
        trends,
        recentActivity,
        isLoading,
        error,
        profileCompletion,
        dashboardPreferences,
        fetchDashboardData,
        updateAppointmentStatus,
        checkInAppointment,
    } = useClinicStore();

    const { user } = useAuthStore();
    const router = useRouter();
    const toast = useToast();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [queueFilter, setQueueFilter] = useState<'all' | 'unconfirmed' | 'checked_in' | 'in_progress'>('all');
    const [selectedAppointment, setSelectedAppointment] = useState<ClinicAppointment | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [isInviteDoctorModalOpen, setIsInviteDoctorModalOpen] = useState(false);
    const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);

    // Scoped localStorage persistence for quick operations
    const storageKey = useMemo(() => {
        const clinicId = user?.id || 'default_clinic';
        const userId = user?.id || 'default_user';
        return `swastik_clinic_quick_ops_${clinicId}_${userId}`;
    }, [user?.id]);

    const [quickActionIds, setQuickActionIds] = useState<string[]>(DEFAULT_QUICK_ACTIONS);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length >= 4 && parsed.length <= 6) {
                    const validIds = parsed.filter((id) => Boolean(QUICK_ACTION_REGISTRY[id]));
                    if (validIds.length >= 4) {
                        setQuickActionIds(validIds);
                    }
                }
            }
        } catch {
            // Use defaults on parse error
        }
    }, [storageKey]);

    const handleSaveQuickOperations = (newActionIds: string[]) => {
        setQuickActionIds(newActionIds);
        try {
            localStorage.setItem(storageKey, JSON.stringify(newActionIds));
            toast.success('Quick Operations Updated', 'Your customized dashboard shortcuts have been saved.');
        } catch {
            toast.error('Save Failed', 'Could not save quick operations preferences.');
        }
    };

    // Keyboard shortcuts
    const shortcuts = useMemo(
        () => [
            { key: 'a', description: 'Go to Appointments', action: () => router.push('/clinic/appointments') },
            { key: 'd', description: 'Go to Doctors', action: () => router.push('/clinic/doctors') },
            { key: 'r', description: 'Refresh Command Center', action: () => fetchDashboardData() },
        ],
        [router, fetchDashboardData]
    );
    usePageShortcuts(shortcuts);

    // Socket-driven refetches debounced
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            fetchDashboardData();
        }, 500);
    }, [fetchDashboardData]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    useAppointmentUpdates(useCallback(() => { debouncedFetch(); }, [debouncedFetch]));
    useClinicInviteUpdates(useCallback(() => { debouncedFetch(); }, [debouncedFetch]));

    useEffect(() => {
        void fetchDashboardData();
    }, [fetchDashboardData]);

    const currentTime = new Date();

    const handleCheckIn = async (appointment: ClinicAppointment) => {
        setActionLoading(`checkin:${appointment.id}`);
        try {
            const success = await checkInAppointment(appointment.id);
            if (success) {
                toast.success('Patient Checked In', `${appointment.patientName} has arrived at the clinic.`);
                void fetchDashboardData();
            } else {
                toast.error('Check-in Failed', useClinicStore.getState().error || 'Please try again.');
            }
        } catch {
            toast.error('Network Error', 'Failed to connect to server.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleConfirm = async (appointment: ClinicAppointment) => {
        setActionLoading(`confirm:${appointment.id}`);
        try {
            const success = await updateAppointmentStatus(appointment.id, 'confirmed');
            if (success) {
                toast.success('Appointment Confirmed', `${appointment.patientName} confirmed.`);
                void fetchDashboardData();
            } else {
                toast.error('Action Failed', useClinicStore.getState().error || 'Please try again.');
            }
        } catch {
            toast.error('Network Error', 'Failed to connect to server.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenDetailModal = (appointment: ClinicAppointment) => {
        setSelectedAppointment(appointment);
        setIsDetailModalOpen(true);
    };

    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B1020] p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Unable to load clinic dashboard</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
                <Button onClick={() => void fetchDashboardData()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                    Retry Connection
                </Button>
            </div>
        );
    }

    // Filtered today's queue
    const filteredTodayAppointments = todaysAppointments.filter((a) => {
        if (queueFilter === 'unconfirmed') return a.status === 'scheduled';
        if (queueFilter === 'checked_in') return Boolean(a.checkedInAt) && a.status !== 'completed';
        if (queueFilter === 'in_progress') return a.status === 'in_progress' || a.status === 'in-progress';
        return true;
    });

    const activeAlerts = needsAttention || [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* ── 1. COMMAND CENTER HEADER BAR ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0B1020] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Clinic Command Center
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Operational
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void fetchDashboardData()}
                        disabled={isLoading}
                        className="text-xs h-8"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* ── 1.5 CLINIC SETUP & PROFILE COMPLETION WIDGET ── */}
            {dashboardPreferences?.show_profile_completion !== false && profileCompletion && (
                <ClinicProfileCompletionCard variant="dashboard" className="mb-2" />
            )}

            {/* ── 2. TOP 6 COMPACT & CLICKABLE KPI CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Active Doctors */}
                <Link
                    href="/clinic/doctors?tab=roster"
                    className="group cursor-pointer block rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/40"
                    title="View active roster in Doctors Directory"
                >
                    <Card padding="sm" className="h-full hover:border-pink-300 dark:hover:border-pink-800 hover:shadow-xs hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Active Doctors</span>
                            <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/60 transition-colors">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                            {stats?.activeDoctors ?? stats?.totalStaff ?? 0}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <span>Rostered staff</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-pink-600 dark:text-pink-400" />
                        </div>
                    </Card>
                </Link>

                {/* 2. Today's Appointments */}
                <Link
                    href="/clinic/appointments?dateRange=today"
                    className="group cursor-pointer block rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                    title="View Today's Appointments queue"
                >
                    <Card padding="sm" className="h-full hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xs hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Today&apos;s Visits</span>
                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
                                <Calendar className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {stats?.todaysAppointments ?? 0}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <span>{stats?.walkInsToday ? `${stats.walkInsToday} in-person` : 'Active queue'}</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-blue-600 dark:text-blue-400" />
                        </div>
                    </Card>
                </Link>

                {/* 3. Checked In Today */}
                <Link
                    href="/clinic/appointments?dateRange=today&status=checked_in"
                    className="group cursor-pointer block rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    title="Filter Checked In Waiting Room queue"
                >
                    <Card padding="sm" className="h-full hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-xs hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Checked In</span>
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                                <UserCheck className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {stats?.checkedInToday ?? 0}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            <span>In waiting room</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </Card>
                </Link>

                {/* 4. Today's Revenue */}
                <Link
                    href="/clinic/reports?tab=finance&period=30d"
                    className="group cursor-pointer block rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-yellow-500/40"
                    title="View financial breakdown in Reports"
                >
                    <Card padding="sm" className="h-full hover:border-yellow-300 dark:hover:border-yellow-800 hover:shadow-xs hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">Today&apos;s Revenue</span>
                            <div className="p-1.5 rounded-lg bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/60 transition-colors">
                                <IndianRupee className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                            {stats?.todaysRevenue != null
                                ? `₹${stats.todaysRevenue.toLocaleString('en-IN')}`
                                : '₹0'}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <span>Finance report</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </Card>
                </Link>

                {/* 5. Today's Patients */}
                <Link
                    href="/clinic/appointments?dateRange=today"
                    className="group cursor-pointer block rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/40"
                    title="View today's patient visits"
                >
                    <Card padding="sm" className="h-full hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-xs hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Patients Today</span>
                            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60 transition-colors">
                                <HeartPulse className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {stats?.todaysPatients ?? (stats?.todaysAppointments ? stats.todaysAppointments : 0)}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                            <span>{stats?.repeatPatients ? `${stats.repeatPatients} repeat` : 'Patient volume'}</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-purple-600 dark:text-purple-400" />
                        </div>
                    </Card>
                </Link>

                {/* 6. Pending Actions */}
                <Link
                    href="/clinic/health-alerts?severity=warning"
                    className="group cursor-pointer block rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                    title="Review actionable alerts in Health & Operational Alerts"
                >
                    <Card padding="sm" className="h-full hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-xs hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Pending Actions</span>
                            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition-colors">
                                <AlertCircle className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                            {stats?.pendingActions ?? activeAlerts.length}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <span>Requires review</span>
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-amber-600 dark:text-amber-400" />
                        </div>
                    </Card>
                </Link>
            </div>

            {/* ── 3. MAIN COMMAND CENTER GRID (2 COLUMNS) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ──── LEFT COLUMN (WIDTH: 7 / 12) ──── */}
                <div className="lg:col-span-7 space-y-6">
                    {/* A. NEEDS ATTENTION (ACTIONABLE ALERTS) */}
                    <Card padding="none" className="overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Needs Attention</h2>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                {activeAlerts.length} Active
                            </span>
                        </div>

                        <div className="p-4 space-y-2.5">
                            {activeAlerts.length > 0 ? (
                                activeAlerts.map((alert) => {
                                    const isCrit = alert.severity === 'critical';
                                    const isWarn = alert.severity === 'warning';
                                    return (
                                        <Link
                                            key={alert.id}
                                            href={alert.actionUrl}
                                            className={cn(
                                                'group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-all hover:shadow-xs hover:-translate-y-0.5',
                                                isCrit
                                                    ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/60 hover:border-red-400 dark:hover:border-red-700'
                                                    : isWarn
                                                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-700'
                                                    : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 hover:border-blue-400 dark:hover:border-blue-700'
                                            )}
                                        >
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span
                                                        className={cn(
                                                            'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider',
                                                            isCrit
                                                                ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : isWarn
                                                                ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                                                : 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        )}
                                                    >
                                                        {alert.source}
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-white truncate group-hover:underline">
                                                        {alert.title}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-300 text-[11px]">
                                                    {alert.description}
                                                </p>
                                            </div>

                                            <div
                                                className={cn(
                                                    'self-start sm:self-auto px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 shrink-0',
                                                    isCrit
                                                        ? 'bg-red-600 text-white group-hover:bg-red-700'
                                                        : isWarn
                                                        ? 'bg-amber-600 text-white group-hover:bg-amber-700'
                                                        : 'bg-blue-600 text-white group-hover:bg-blue-700'
                                                )}
                                            >
                                                {alert.actionLabel || 'Review'}
                                                <ChevronRight className="h-3 w-3" />
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <div className="py-6 text-center text-xs text-gray-400 dark:text-gray-500 space-y-1">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                                    <p className="font-medium text-gray-600 dark:text-gray-300">All systems clear</p>
                                    <p>No critical pending alerts or unanswered inquiries.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* B. CARE COORDINATION (PRIMARY REFERRAL & PARTNER CHANNELS) */}
                    <Card padding="none" className="overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30 gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
                                    <Network className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Care Coordination</h2>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Track referrals, diagnostics, pharmacy orders and partner care from one place.
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/clinic/referrals"
                                className="text-xs font-semibold text-pink-600 hover:text-pink-700 dark:text-pink-400 hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0"
                            >
                                View All Referrals <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {/* Visual Care Journey Flow Indicator */}
                        <div className="px-4 py-2.5 bg-gradient-to-r from-pink-50/50 via-purple-50/30 to-blue-50/50 dark:from-[#0B1020] dark:via-[#0f172a] dark:to-[#0B1020] border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between overflow-x-auto text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">Patient Care</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600 shrink-0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">Referral Routed</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600 shrink-0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">Care Partner Fulfillment</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600 shrink-0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">Outcome &amp; Closure</span>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Hospital Referrals Pipeline */}
                            <Link
                                href="/clinic/referrals?channel=hospital"
                                className="group cursor-pointer block p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B1020] hover:border-purple-300 dark:hover:border-purple-800 hover:-translate-y-0.5 hover:shadow-xs transition-all space-y-3"
                                title="Track Hospital Referrals & Admissions"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        <Building2 className="h-4 w-4 text-purple-600" />
                                        Hospital Referrals
                                    </div>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                        {connectedCare?.hospitals.totalReferrals ?? 0}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                                        <span>Pending Review</span>
                                        <span className="font-bold">{connectedCare?.hospitals.pending ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                                        <span>Accepted / Admitted</span>
                                        <span className="font-bold">
                                            {(connectedCare?.hospitals.accepted ?? 0) + (connectedCare?.hospitals.admitted ?? 0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Discharged</span>
                                        <span className="font-bold">{connectedCare?.hospitals.discharged ?? 0}</span>
                                    </div>
                                </div>

                                <div className="py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 group-hover:bg-purple-50 group-hover:text-purple-600 dark:group-hover:bg-purple-950/30 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                                    Track Referrals →
                                </div>
                            </Link>

                            {/* 2. Diagnostics Pipeline */}
                            <Link
                                href="/clinic/referrals?channel=diagnostic"
                                className="group cursor-pointer block p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B1020] hover:border-teal-300 dark:hover:border-teal-800 hover:-translate-y-0.5 hover:shadow-xs transition-all space-y-3"
                                title="Open Diagnostic Lab Bookings"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        <Microscope className="h-4 w-4 text-teal-600" />
                                        Diagnostics
                                    </div>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                                        {connectedCare?.diagnostics.totalBookings ?? 0}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                                        <span>Pending Sample</span>
                                        <span className="font-bold">{connectedCare?.diagnostics.pending ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                                        <span>In Lab Processing</span>
                                        <span className="font-bold">
                                            {(connectedCare?.diagnostics.sampleCollected ?? 0) + (connectedCare?.diagnostics.processing ?? 0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Reports Ready</span>
                                        <span className="font-bold">{connectedCare?.diagnostics.reportsReady ?? 0}</span>
                                    </div>
                                </div>

                                <div className="py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 group-hover:bg-teal-50 group-hover:text-teal-600 dark:group-hover:bg-teal-950/30 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                                    View Diagnostics →
                                </div>
                            </Link>

                            {/* 3. Pharmacy Orders Pipeline */}
                            <Link
                                href="/clinic/referrals?channel=pharmacy"
                                className="group cursor-pointer block p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B1020] hover:border-pink-300 dark:hover:border-pink-800 hover:-translate-y-0.5 hover:shadow-xs transition-all space-y-3"
                                title="Open Pharmacy Orders operations"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                        <Pill className="h-4 w-4 text-pink-600" />
                                        Pharmacy Orders
                                    </div>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60">
                                        {connectedCare?.pharmacy.totalOrders ?? 0}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                                        <span>Pending Accept</span>
                                        <span className="font-bold">{connectedCare?.pharmacy.pending ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                                        <span>Processing / Dispatched</span>
                                        <span className="font-bold">{connectedCare?.pharmacy.processing ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Ready / Completed</span>
                                        <span className="font-bold">
                                            {(connectedCare?.pharmacy.ready ?? 0) + (connectedCare?.pharmacy.completed ?? 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 group-hover:bg-pink-50 group-hover:text-pink-600 dark:group-hover:bg-pink-950/30 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                                    Manage Pharmacy →
                                </div>
                            </Link>
                        </div>
                    </Card>

                    {/* C. 7-DAY APPOINTMENT & PATIENT TRENDS */}
                    {trends && (
                        <Card padding="none" className="overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">7-Day Operational Activity</h2>
                                </div>
                                <Link href="/clinic/reports?tab=overview" className="text-xs text-pink-600 hover:underline flex items-center gap-0.5">
                                    Full Reports <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>

                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link
                                    href="/clinic/reports?tab=clinical"
                                    className="group cursor-pointer block p-2 rounded-xl hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors"
                                    title="View Clinical Appointment analytics in Reports"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                            Appointments Volume
                                        </span>
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            View Report →
                                        </span>
                                    </div>
                                    <div className="flex items-end gap-2 h-20 pt-2">
                                        {trends.appointmentsLast7Days.map((d) => {
                                            const max = Math.max(...trends.appointmentsLast7Days.map((x) => x.count), 1);
                                            const heightPct = Math.max(15, Math.round((d.count / max) * 100));
                                            return (
                                                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group/bar">
                                                    <div
                                                        style={{ height: `${heightPct}%` }}
                                                        className="w-full rounded-t-md bg-blue-500/80 group-hover/bar:bg-blue-600 transition-all relative"
                                                    >
                                                        <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-gray-900 text-white px-1 rounded transition-opacity pointer-events-none">
                                                            {d.count}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 truncate w-full text-center">
                                                        {d.label.slice(0, 3)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Link>

                                <Link
                                    href="/clinic/reports?tab=patients"
                                    className="group cursor-pointer block p-2 rounded-xl hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors"
                                    title="View Patient traffic analytics in Reports"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                            Unique Patients
                                        </span>
                                        <span className="text-[10px] text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            View Report →
                                        </span>
                                    </div>
                                    <div className="flex items-end gap-2 h-20 pt-2">
                                        {trends.patientsLast7Days.map((d) => {
                                            const max = Math.max(...trends.patientsLast7Days.map((x) => x.count), 1);
                                            const heightPct = Math.max(15, Math.round((d.count / max) * 100));
                                            return (
                                                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group/bar">
                                                    <div
                                                        style={{ height: `${heightPct}%` }}
                                                        className="w-full rounded-t-md bg-purple-500/80 group-hover/bar:bg-purple-600 transition-all relative"
                                                    >
                                                        <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-gray-900 text-white px-1 rounded transition-opacity pointer-events-none">
                                                            {d.count}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 truncate w-full text-center">
                                                        {d.label.slice(0, 3)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Link>
                            </div>
                        </Card>
                    )}
                </div>

                {/* ──── RIGHT COLUMN (WIDTH: 5 / 12) ──── */}
                <div className="lg:col-span-5 space-y-6">
                    {/* A. TODAY'S QUEUE (COMPACT & CLICKABLE APPOINTMENTS) */}
                    <Card padding="none" className="overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Today&apos;s Queue</h2>
                                </div>
                                <Link href="/clinic/appointments?dateRange=today" className="text-xs text-pink-600 hover:underline">
                                    View all
                                </Link>
                            </div>

                            {/* Queue Filter Pills */}
                            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5">
                                <button
                                    onClick={() => setQueueFilter('all')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer',
                                        queueFilter === 'all'
                                            ? 'bg-pink-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:text-gray-900'
                                    )}
                                >
                                    All ({todaysAppointments.length})
                                </button>
                                <button
                                    onClick={() => setQueueFilter('unconfirmed')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer',
                                        queueFilter === 'unconfirmed'
                                            ? 'bg-pink-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:text-gray-900'
                                    )}
                                >
                                    Scheduled
                                </button>
                                <button
                                    onClick={() => setQueueFilter('checked_in')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer',
                                        queueFilter === 'checked_in'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:text-gray-900'
                                    )}
                                >
                                    Checked In
                                </button>
                            </div>
                        </div>

                        <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
                            {filteredTodayAppointments.length > 0 ? (
                                filteredTodayAppointments.map((appt) => (
                                    <div
                                        key={appt.id}
                                        onClick={() => handleOpenDetailModal(appt)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleOpenDetailModal(appt);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        className={cn(
                                            'p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer group hover:shadow-xs hover:-translate-y-0.5',
                                            appt.checkedInAt
                                                ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 hover:border-emerald-400'
                                                : 'bg-white dark:bg-[#0B1020] border-gray-200 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-800'
                                        )}
                                        title="Click to view appointment details"
                                    >
                                        <div className="min-w-0 flex items-center gap-2.5">
                                            <div className="text-center font-mono text-[10px] font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 px-1.5 py-1 rounded-md shrink-0">
                                                {appt.time || '—'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                                    {appt.patientName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                                    with Dr. {appt.doctorName}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <StatusBadge status={appt.status} size="sm" />
                                            {!appt.checkedInAt && (appt.status === 'scheduled' || appt.status === 'confirmed') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleCheckIn(appt);
                                                    }}
                                                    disabled={actionLoading === `checkin:${appt.id}`}
                                                    className="h-7 px-2 text-[10px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                                                >
                                                    Check in
                                                </Button>
                                            )}
                                            {appt.status === 'scheduled' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleConfirm(appt);
                                                    }}
                                                    disabled={actionLoading === `confirm:${appt.id}`}
                                                    className="h-7 px-2 text-[10px]"
                                                >
                                                    Confirm
                                                </Button>
                                            )}
                                            <div
                                                className="p-1 rounded-md text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors"
                                                title="View appointment details"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                                    <p>No appointments match current filter.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* B. CUSTOMIZABLE QUICK OPERATIONS */}
                    <Card padding="none" className="overflow-hidden">
                        <div className="flex items-center justify-between p-3.5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Quick Operations</h2>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Customizable shortcuts for clinic management
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCustomizeModalOpen(true)}
                                className="h-7 px-2.5 text-xs text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950/30 font-semibold"
                            >
                                <Sliders className="h-3 w-3 mr-1" />
                                Edit ✎
                            </Button>
                        </div>

                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {quickActionIds.map((id) => {
                                const action = QUICK_ACTION_REGISTRY[id];
                                if (!action) return null;
                                const Icon = action.icon;

                                if (action.isModal && action.id === 'invite_doctor') {
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setIsInviteDoctorModalOpen(true)}
                                            className="text-left p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-pink-300 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-all group hover:-translate-y-0.5 hover:shadow-2xs cursor-pointer block w-full"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div
                                                    className={cn(
                                                        'p-1.5 rounded-lg border group-hover:scale-105 transition-transform',
                                                        action.colorTheme.bg,
                                                        action.colorTheme.text,
                                                        action.colorTheme.border
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Open ↗
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 dark:text-white block group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors truncate">
                                                {action.title}
                                            </span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 block line-clamp-1 mt-0.5">
                                                {action.description}
                                            </span>
                                        </button>
                                    );
                                }

                                return (
                                    <Link
                                        key={id}
                                        href={action.href || '/clinic'}
                                        className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-pink-300 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-all group hover:-translate-y-0.5 hover:shadow-2xs cursor-pointer block"
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div
                                                className={cn(
                                                    'p-1.5 rounded-lg border group-hover:scale-105 transition-transform',
                                                    action.colorTheme.bg,
                                                    action.colorTheme.text,
                                                    action.colorTheme.border
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Go →
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white block group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors truncate">
                                            {action.title}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block line-clamp-1 mt-0.5">
                                            {action.description}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </Card>

                    {/* C. TEAM SNAPSHOT */}
                    {teamSnapshot && teamSnapshot.length > 0 && (
                        <Card padding="none" className="overflow-hidden">
                            <div className="flex items-center justify-between p-3.5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-pink-600" />
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Active Doctors</h2>
                                </div>
                                <Link href="/clinic/doctors?tab=roster" className="text-xs text-pink-600 hover:underline">
                                    Roster
                                </Link>
                            </div>

                            <div className="p-3 space-y-2">
                                {teamSnapshot.slice(0, 4).map((doc) => (
                                    <Link
                                        key={doc.id}
                                        href="/clinic/doctors?tab=roster"
                                        className="group cursor-pointer block p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-pink-200 dark:hover:border-pink-900/60 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-all"
                                        title={`View Dr. ${doc.name} profile in Doctors Roster`}
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                                        Dr. {doc.name}
                                                    </span>
                                                    {doc.onLeaveToday && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                            On Leave
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 block truncate">
                                                    {doc.specialization}
                                                </span>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-gray-800 dark:text-gray-200 block text-[11px]">
                                                    {doc.todaysAppointments} appts
                                                </span>
                                                <span className="text-[10px] text-yellow-500 font-bold">
                                                    ★ {doc.rating}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* D. REVIEWS SNAPSHOT */}
                    {reviewsSnapshot && (
                        <Link
                            href="/clinic/reviews?tab=clinic"
                            className="group cursor-pointer block focus:outline-hidden focus:ring-2 focus:ring-pink-500/40 rounded-2xl"
                            title="View patient reviews and provider responses"
                        >
                            <Card padding="none" className="overflow-hidden hover:border-pink-300 dark:hover:border-pink-800 hover:-translate-y-0.5 hover:shadow-xs transition-all">
                                <div className="flex items-center justify-between p-3.5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30">
                                    <div className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <h2 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Clinic Rating & Reviews</h2>
                                    </div>
                                    <span className="text-xs text-pink-600 group-hover:underline flex items-center gap-0.5">
                                        All Reviews <ChevronRight className="h-3 w-3" />
                                    </span>
                                </div>

                                <div className="p-3.5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {reviewsSnapshot.averageRating}
                                            </span>
                                            <div>
                                                <div className="flex text-yellow-500 text-xs">
                                                    {'★'.repeat(Math.round(reviewsSnapshot.averageRating))}
                                                    {'☆'.repeat(5 - Math.round(reviewsSnapshot.averageRating))}
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                    {reviewsSnapshot.totalReviews} total reviews
                                                </span>
                                            </div>
                                        </div>

                                        {reviewsSnapshot.unrespondedCount > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200">
                                                {reviewsSnapshot.unrespondedCount} needs reply
                                            </span>
                                        )}
                                    </div>

                                    {reviewsSnapshot.recentReviews.length > 0 && (
                                        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                                <span>{reviewsSnapshot.recentReviews[0].patientName}</span>
                                                <span className="text-yellow-500">★ {reviewsSnapshot.recentReviews[0].rating}</span>
                                            </div>
                                            {reviewsSnapshot.recentReviews[0].comment && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic line-clamp-2">
                                                    &quot;{reviewsSnapshot.recentReviews[0].comment}&quot;
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Link>
                    )}

                    {/* E. RECENT ACTIVITY FEED */}
                    {recentActivity && recentActivity.length > 0 && (
                        <Card padding="none" className="overflow-hidden">
                            <div className="p-3.5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity Log</h2>
                                </div>
                            </div>

                            <div className="p-3 space-y-2 max-h-[220px] overflow-y-auto">
                                {recentActivity.slice(0, 5).map((act) => (
                                    <Link
                                        key={act.id}
                                        href={act.actionUrl}
                                        className="p-2 rounded-xl border border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors flex items-center justify-between text-xs block group"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate text-[11px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {act.title}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                {act.description}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 ml-2 transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* ── DETAIL MODAL ── */}
            {selectedAppointment && (
                <AppointmentDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    appointment={selectedAppointment}
                    onStatusChange={() => {
                        void fetchDashboardData();
                    }}
                />
            )}

            {/* ── CUSTOMIZE QUICK OPERATIONS MODAL ── */}
            <CustomizeQuickOperationsModal
                isOpen={isCustomizeModalOpen}
                onClose={() => setIsCustomizeModalOpen(false)}
                currentActionIds={quickActionIds}
                onSave={handleSaveQuickOperations}
            />

            {/* ── INVITE DOCTOR MODAL ── */}
            <InviteDoctorModal
                isOpen={isInviteDoctorModalOpen}
                onClose={() => {
                    setIsInviteDoctorModalOpen(false);
                    void fetchDashboardData();
                }}
            />
        </div>
    );
}
