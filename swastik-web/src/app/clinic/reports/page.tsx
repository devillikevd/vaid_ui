'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    BarChart3, Users, Calendar, RefreshCw,
    CheckCircle2, DollarSign, Download,
    Stethoscope, Pill, Microscope, Building, Star, AlertTriangle,
    Activity, UserCheck, HeartPulse, ExternalLink,
    Video, Building2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// ----- TypeScript Interfaces -----

interface OverviewMetrics {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
    totalRevenue: number;
    totalPatients: number;
    newPatients: number;
    returningPatients: number;
}

interface AppointmentTrendPoint {
    date: string;
    total: number;
    completed: number;
    cancelled: number;
    revenue: number;
    inPerson: number;
    video: number;
}

interface DoctorPerformanceMetric {
    id: string;
    name: string;
    specialization: string;
    profileImageUrl?: string | null;
    rating: number;
    totalReviews: number;
    appointments: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
}

interface ClinicalAnalytics {
    appointmentTrend: AppointmentTrendPoint[];
    modeSplit: {
        inPerson: { count: number; revenue: number; rate: number };
        video: { count: number; revenue: number; rate: number };
    };
    statusBreakdown: {
        completed: number;
        cancelled: number;
        no_show: number;
        confirmed: number;
        pending: number;
        in_progress: number;
    };
    peakHours: { hour: string; count: number }[];
    doctorPerformance: DoctorPerformanceMetric[];
}

interface PatientAnalytics {
    totalPatients: number;
    newPatients: number;
    returningPatients: number;
    visitFrequency: {
        once: number;
        repeat2to3: number;
        frequent4Plus: number;
    };
    genderDistribution: {
        male: number;
        female: number;
        other: number;
        unknown: number;
    };
}

interface PharmacyPartner {
    id: string;
    name: string;
    totalOrders: number;
    completedOrders: number;
}

interface DiagnosticPartner {
    id: string;
    name: string;
    totalBookings: number;
    completedBookings: number;
    reportsReady: number;
}

interface HospitalPartner {
    id: string;
    name: string;
    totalReferrals: number;
    admitted: number;
    discharged: number;
}

interface ConnectedCareAnalytics {
    pharmacy: {
        totalOrders: number;
        statusCounts: Record<string, number>;
        partners: PharmacyPartner[];
    };
    diagnostics: {
        totalBookings: number;
        statusCounts: Record<string, number>;
        partners: DiagnosticPartner[];
    };
    hospitalReferrals: {
        totalReferrals: number;
        statusCounts: Record<string, number>;
        hospitals: HospitalPartner[];
    };
}

interface ReviewAnalytics {
    clinic: {
        averageRating: number;
        totalReviews: number;
        verifiedReviews: number;
        starDistribution: Record<number, number>;
        responseRate: number;
    };
    doctors: {
        id: string;
        name: string;
        specialization: string;
        averageRating: number;
        totalReviews: number;
    }[];
}

interface FinanceAnalytics {
    totalRevenue: number;
    inPersonRevenue: number;
    videoRevenue: number;
    cancelledLoss: number;
    revenueTrend: { date: string; amount: number }[];
    doctorContributions: { doctorId: string; name: string; revenue: number }[];
}

interface UpcomingLeave {
    id: string;
    doctorId: string;
    doctorName: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
}

interface CapacityAnalytics {
    activeDoctorsCount: number;
    upcomingLeaves: UpcomingLeave[];
}

interface ActionCenterAlerts {
    pendingPharmacyOrders: number;
    pendingDiagnosticBookings: number;
    pendingHospitalReferrals: number;
    unrespondedReviews: number;
    highCancellationAlert: boolean;
}

interface ComprehensiveClinicAnalytics {
    period: string;
    overview: OverviewMetrics;
    clinical: ClinicalAnalytics;
    patients: PatientAnalytics;
    doctors: {
        totalDoctors: number;
        performance: DoctorPerformanceMetric[];
    };
    connectedCare: ConnectedCareAnalytics;
    reviews: ReviewAnalytics;
    finance: FinanceAnalytics;
    capacity: CapacityAnalytics;
    actionCenter: ActionCenterAlerts;
}

type TabType = 'overview' | 'clinical' | 'patients' | 'doctors' | 'connected' | 'reviews' | 'finance' | 'capacity';

function ClinicReportsContent() {
    const searchParams = useSearchParams();
    const [analytics, setAnalytics] = useState<ComprehensiveClinicAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramTab = (searchParams.get('tab') || searchParams.get('section')) as TabType | null;
    const paramPeriod = searchParams.get('period');

    const validTabs: TabType[] = ['overview', 'clinical', 'patients', 'doctors', 'connected', 'reviews', 'finance', 'capacity'];
    const initialTab: TabType = paramTab && validTabs.includes(paramTab) ? paramTab : 'overview';

    const [period, setPeriod] = useState(paramPeriod || '30d');
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    useEffect(() => {
        if (paramTab && validTabs.includes(paramTab)) {
            setActiveTab(paramTab);
        }
        if (paramPeriod) {
            setPeriod(paramPeriod);
        }
    }, [paramTab, paramPeriod]);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await clinicApi.getAnalytics(period);
            if (response.success && response.data) {
                setAnalytics(response.data as unknown as ComprehensiveClinicAnalytics);
            } else {
                setError(response.error || 'Failed to load clinic analytics');
            }
        } catch (err: unknown) {
            console.error('Failed to fetch analytics:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // CSV Export Handler
    const handleExportCSV = () => {
        if (!analytics) return;
        const ov = analytics.overview;
        const rows = [
            ['CLINIC ANALYTICS & PERFORMANCE REPORT'],
            ['Generated At', new Date().toLocaleString()],
            ['Reporting Period', analytics.period],
            [],
            ['OVERVIEW METRICS'],
            ['Metric', 'Value'],
            ['Total Appointments', String(ov.totalAppointments)],
            ['Completed Appointments', String(ov.completedAppointments)],
            ['Completion Rate (%)', `${ov.completionRate}%`],
            ['Cancelled Appointments', String(ov.cancelledAppointments)],
            ['Cancellation Rate (%)', `${ov.cancellationRate}%`],
            ['No-Show Appointments', String(ov.noShowAppointments)],
            ['Total Unique Patients', String(ov.totalPatients)],
            ['New Patients', String(ov.newPatients)],
            ['Returning Patients', String(ov.returningPatients)],
            ['Total Revenue (INR)', String(ov.totalRevenue)],
            [],
            ['DOCTOR PERFORMANCE SUMMARY'],
            ['Doctor Name', 'Specialization', 'Appointments', 'Completed', 'Cancelled', 'Revenue (INR)', 'Rating', 'Reviews'],
            ...(analytics.doctors.performance || []).map((doc) => [
                doc.name,
                doc.specialization,
                String(doc.appointments),
                String(doc.completed),
                String(doc.cancelled),
                String(doc.revenue),
                String(doc.rating),
                String(doc.totalReviews)
            ]),
            [],
            ['CONNECTED CARE SUMMARY'],
            ['Service', 'Total Routed', 'Completed / Discharged'],
            ['Pharmacy Orders', String(analytics.connectedCare.pharmacy.totalOrders), String(analytics.connectedCare.pharmacy.statusCounts.completed || 0)],
            ['Diagnostic Tests', String(analytics.connectedCare.diagnostics.totalBookings), String(analytics.connectedCare.diagnostics.statusCounts.completed || 0)],
            ['Hospital Referrals', String(analytics.connectedCare.hospitalReferrals.totalReferrals), String(analytics.connectedCare.hospitalReferrals.statusCounts.discharged || 0)],
        ];

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `clinic_analytics_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'clinical', label: 'Clinical', icon: Stethoscope },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'doctors', label: 'Doctors', icon: UserCheck },
        { id: 'connected', label: 'Connected Care', icon: HeartPulse },
        { id: 'reviews', label: 'Reviews & Quality', icon: Star },
        { id: 'finance', label: 'Finance', icon: DollarSign },
        { id: 'capacity', label: 'Capacity', icon: Calendar },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header with Global Date Range Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#0B1020] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800/60 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Activity className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                        Reports & Analytics
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Comprehensive clinical performance, revenue, capacity, and connected care hub.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Period Buttons */}
                    <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        {[
                            { value: '7d', label: '7D' },
                            { value: '30d', label: '30D' },
                            { value: '90d', label: '90D' },
                            { value: '365d', label: '1 Year' },
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                    period === p.value
                                        ? 'bg-white dark:bg-gray-900 text-pink-700 dark:text-pink-300 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        disabled={loading || !analytics}
                        className="text-xs h-9"
                    >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Export CSV
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="text-xs h-9"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>Unable to load report: {error}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={fetchAnalytics} className="h-8 text-xs">
                        Retry
                    </Button>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
                                isActive
                                    ? 'bg-white dark:bg-gray-900 text-pink-700 dark:text-pink-300 shadow-sm font-semibold'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                            )}
                        >
                            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400')} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Loading Skeleton */}
            {loading && !analytics && (
                <div className="space-y-4 animate-pulse">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800" />
                        ))}
                    </div>
                    <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800" />
                </div>
            )}

            {/* Main Content Sections */}
            {analytics && (
                <div className="space-y-6">
                    {/* ==================== TAB 1: OVERVIEW ==================== */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Action Center / Needs Attention Section */}
                            {(analytics.actionCenter.pendingPharmacyOrders > 0 ||
                                analytics.actionCenter.pendingDiagnosticBookings > 0 ||
                                analytics.actionCenter.pendingHospitalReferrals > 0 ||
                                analytics.actionCenter.unrespondedReviews > 0 ||
                                analytics.actionCenter.highCancellationAlert) && (
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                            Needs Attention — Action Center
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {analytics.actionCenter.pendingPharmacyOrders > 0 && (
                                            <Link
                                                href="/clinic/pharmacies"
                                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-900/30 hover:border-amber-400 transition-all group"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Pill className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Pharmacy Orders</p>
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{analytics.actionCenter.pendingPharmacyOrders} pending routing</p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-amber-600" />
                                            </Link>
                                        )}

                                        {analytics.actionCenter.pendingDiagnosticBookings > 0 && (
                                            <Link
                                                href="/clinic/diagnostic-centers"
                                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-900/30 hover:border-amber-400 transition-all group"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Microscope className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Diagnostic Bookings</p>
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{analytics.actionCenter.pendingDiagnosticBookings} pending routing</p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-amber-600" />
                                            </Link>
                                        )}

                                        {analytics.actionCenter.pendingHospitalReferrals > 0 && (
                                            <Link
                                                href="/clinic/referrals"
                                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-900/30 hover:border-amber-400 transition-all group"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Hospital Referrals</p>
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{analytics.actionCenter.pendingHospitalReferrals} pending admission</p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-amber-600" />
                                            </Link>
                                        )}

                                        {analytics.actionCenter.unrespondedReviews > 0 && (
                                            <Link
                                                href="/clinic/reviews"
                                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-900/30 hover:border-amber-400 transition-all group"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Patient Reviews</p>
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{analytics.actionCenter.unrespondedReviews} awaiting response</p>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-amber-600" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Top 4 KPI Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Appointments</p>
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                        {analytics.overview.totalAppointments.toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{analytics.overview.completedAppointments} completed</span>
                                        <span>•</span>
                                        <span className="text-rose-500 font-medium">{analytics.overview.cancelledAppointments} cancelled</span>
                                    </div>
                                </Card>

                                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Completion Rate</p>
                                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                        {analytics.overview.completionRate}%
                                    </p>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-3">
                                        <div
                                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, analytics.overview.completionRate)}%` }}
                                        />
                                    </div>
                                </Card>

                                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Patients</p>
                                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                            <Users className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                        {analytics.overview.totalPatients.toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        <span className="text-purple-600 dark:text-purple-400 font-medium">{analytics.overview.newPatients} new</span>
                                        <span>•</span>
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">{analytics.overview.returningPatients} repeat</span>
                                    </div>
                                </Card>

                                <Card padding="md" className="hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Consultation Revenue</p>
                                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                            <DollarSign className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                        ₹{analytics.overview.totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        In-Person: ₹{analytics.finance.inPersonRevenue.toLocaleString()} • Video: ₹{analytics.finance.videoRevenue.toLocaleString()}
                                    </p>
                                </Card>
                            </div>

                            {/* Overview Trend & Mode Distribution Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Appointment Trend Preview */}
                                <Card padding="lg" className="lg:col-span-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appointment Volume</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Trend over the last {analytics.period}</p>
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            {analytics.clinical.appointmentTrend.length} data points
                                        </span>
                                    </div>

                                    {analytics.clinical.appointmentTrend.length === 0 ? (
                                        <div className="py-12 text-center text-xs text-gray-500 dark:text-gray-400">
                                            No appointment trend recorded in this date range.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="h-40 flex items-end gap-1 pt-4">
                                                {analytics.clinical.appointmentTrend.slice(-14).map((pt) => {
                                                    const maxVal = Math.max(...analytics.clinical.appointmentTrend.map((p) => p.total), 1);
                                                    const heightPercent = Math.max(8, Math.round((pt.total / maxVal) * 100));
                                                    return (
                                                        <div key={pt.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                            <div
                                                                className="w-full bg-pink-500/80 dark:bg-pink-500/60 group-hover:bg-pink-600 rounded-t transition-all"
                                                                style={{ height: `${heightPercent}%` }}
                                                            />
                                                            <span className="text-[9px] text-gray-400 truncate w-full text-center">
                                                                {pt.date.slice(5)}
                                                            </span>
                                                            <div className="absolute -top-8 bg-gray-900 text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                                {pt.date}: {pt.total} apts (₹{pt.revenue})
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                {/* Consultation Mode Split */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Consultation Mode</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">In-Person vs Teleconsultation</p>

                                    <div className="space-y-4">
                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                                                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                                    <Building2 className="h-3.5 w-3.5 text-pink-600" />
                                                    In-Person Visits
                                                </span>
                                                <span className="text-gray-900 dark:text-white">{analytics.clinical.modeSplit.inPerson.count} ({analytics.clinical.modeSplit.inPerson.rate}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-pink-500 h-1.5 rounded-full"
                                                    style={{ width: `${analytics.clinical.modeSplit.inPerson.rate}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                                                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                                    <Video className="h-3.5 w-3.5 text-blue-600" />
                                                    Video Consultations
                                                </span>
                                                <span className="text-gray-900 dark:text-white">{analytics.clinical.modeSplit.video.count} ({analytics.clinical.modeSplit.video.rate}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-500 h-1.5 rounded-full"
                                                    style={{ width: `${analytics.clinical.modeSplit.video.rate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ==================== TAB 2: CLINICAL ==================== */}
                    {activeTab === 'clinical' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Appointment Status Breakdown */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Appointment Status Breakdown</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Total booked encounters during {analytics.period}</p>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Completed</p>
                                            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                                                {analytics.clinical.statusBreakdown.completed}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                            <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">Confirmed</p>
                                            <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                                                {analytics.clinical.statusBreakdown.confirmed}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Pending</p>
                                            <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                                                {analytics.clinical.statusBreakdown.pending}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                            <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Cancelled</p>
                                            <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                                                {analytics.clinical.statusBreakdown.cancelled}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                                            <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300">No-Show</p>
                                            <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">
                                                {analytics.clinical.statusBreakdown.no_show}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Peak Consultation Hours */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Peak Consultation Hours</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Patient flow distribution (08:00 – 20:00)</p>

                                    <div className="h-36 flex items-end gap-1.5 pt-2">
                                        {analytics.clinical.peakHours.map((h) => {
                                            const maxH = Math.max(...analytics.clinical.peakHours.map((x) => x.count), 1);
                                            const pct = Math.max(10, Math.round((h.count / maxH) * 100));
                                            return (
                                                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                    <div
                                                        className={cn(
                                                            'w-full rounded-t transition-all',
                                                            h.count > 0 ? 'bg-indigo-500 group-hover:bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                                                        )}
                                                        style={{ height: `${pct}%` }}
                                                    />
                                                    <span className="text-[8px] text-gray-400 truncate w-full text-center">
                                                        {h.hour.slice(0, 2)}
                                                    </span>
                                                    <div className="absolute -top-7 bg-gray-900 text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                        {h.hour}: {h.count}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ==================== TAB 3: PATIENTS ==================== */}
                    {activeTab === 'patients' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card padding="md">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Unique Patients</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{analytics.patients.totalPatients}</p>
                                </Card>
                                <Card padding="md">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">New First-Time Visits</p>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{analytics.patients.newPatients}</p>
                                </Card>
                                <Card padding="md">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Returning Patients</p>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1.5">{analytics.patients.returningPatients}</p>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Visit Frequency Distribution */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Visit Frequency Distribution</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Patient retention in {analytics.period}</p>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                <span>Single Visit (1 Encounter)</span>
                                                <span>{analytics.patients.visitFrequency.once} patients</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{ width: `${analytics.patients.totalPatients > 0 ? (analytics.patients.visitFrequency.once / analytics.patients.totalPatients) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                <span>Occasional Visits (2–3 Encounters)</span>
                                                <span>{analytics.patients.visitFrequency.repeat2to3} patients</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full"
                                                    style={{ width: `${analytics.patients.totalPatients > 0 ? (analytics.patients.visitFrequency.repeat2to3 / analytics.patients.totalPatients) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                <span>Frequent Follow-ups (4+ Encounters)</span>
                                                <span>{analytics.patients.visitFrequency.frequent4Plus} patients</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                <div
                                                    className="bg-pink-500 h-2 rounded-full"
                                                    style={{ width: `${analytics.patients.totalPatients > 0 ? (analytics.patients.visitFrequency.frequent4Plus / analytics.patients.totalPatients) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Gender Demographics */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Patient Demographics</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Self-reported gender breakdown</p>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-center border border-blue-100 dark:border-blue-900/30">
                                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Male</p>
                                            <p className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-1">{analytics.patients.genderDistribution.male}</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-pink-50 dark:bg-pink-950/20 text-center border border-pink-100 dark:border-pink-900/30">
                                            <p className="text-xs text-pink-700 dark:text-pink-300 font-medium">Female</p>
                                            <p className="text-xl font-bold text-pink-800 dark:text-pink-200 mt-1">{analytics.patients.genderDistribution.female}</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center border border-gray-100 dark:border-gray-800">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Other / N/A</p>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-1">
                                                {analytics.patients.genderDistribution.other + analytics.patients.genderDistribution.unknown}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ==================== TAB 4: DOCTORS ==================== */}
                    {activeTab === 'doctors' && (
                        <div className="space-y-6">
                            <Card padding="none" className="overflow-hidden">
                                <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Doctor Operational Performance</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Doctor ratings remain separate and independent from clinic ratings.
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">
                                        {analytics.doctors.totalDoctors} affiliated doctors
                                    </span>
                                </div>

                                {analytics.doctors.performance.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
                                        No doctor activity recorded for this period.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-850 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-800">
                                                <tr>
                                                    <th className="px-4 py-3">Doctor</th>
                                                    <th className="px-4 py-3">Specialization</th>
                                                    <th className="px-4 py-3 text-center">Appointments</th>
                                                    <th className="px-4 py-3 text-center">Completed</th>
                                                    <th className="px-4 py-3 text-center">Cancelled</th>
                                                    <th className="px-4 py-3 text-right">Revenue (₹)</th>
                                                    <th className="px-4 py-3 text-center">Doctor Rating</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {analytics.doctors.performance.map((doc) => (
                                                    <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{doc.name}</td>
                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{doc.specialization}</td>
                                                        <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">{doc.appointments}</td>
                                                        <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{doc.completed}</td>
                                                        <td className="px-4 py-3 text-center text-rose-500 font-semibold">{doc.cancelled}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">₹{doc.revenue.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                                                {doc.rating > 0 ? doc.rating.toFixed(1) : 'New'}
                                                                <span className="text-[10px] text-gray-400">({doc.totalReviews})</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* ==================== TAB 5: CONNECTED CARE ==================== */}
                    {activeTab === 'connected' && (
                        <div className="space-y-6">
                            {/* Pharmacy Section */}
                            <Card padding="lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
                                            <Pill className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pharmacy Orders</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Prescriptions routed to partner pharmacies</p>
                                        </div>
                                    </div>
                                    <Link href="/clinic/pharmacies" className="text-xs font-semibold text-pink-600 hover:underline flex items-center gap-1">
                                        Manage Orders <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                                        <p className="text-[11px] text-gray-500 font-medium">Total Orders</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{analytics.connectedCare.pharmacy.totalOrders}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-center">
                                        <p className="text-[11px] text-amber-700 font-medium">Pending</p>
                                        <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">{analytics.connectedCare.pharmacy.statusCounts.pending || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-center">
                                        <p className="text-[11px] text-blue-700 font-medium">Processing / Ready</p>
                                        <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mt-1">
                                            {(analytics.connectedCare.pharmacy.statusCounts.processing || 0) + (analytics.connectedCare.pharmacy.statusCounts.ready || 0)}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center">
                                        <p className="text-[11px] text-emerald-700 font-medium">Completed</p>
                                        <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1">{analytics.connectedCare.pharmacy.statusCounts.completed || 0}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Diagnostics Section */}
                            <Card padding="lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                                            <Microscope className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Diagnostic Orders</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Lab tests routed to diagnostic center partners</p>
                                        </div>
                                    </div>
                                    <Link href="/clinic/diagnostic-centers" className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1">
                                        Manage Orders <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                                        <p className="text-[11px] text-gray-500 font-medium">Total Bookings</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{analytics.connectedCare.diagnostics.totalBookings}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-center">
                                        <p className="text-[11px] text-amber-700 font-medium">Sample Collected</p>
                                        <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">{analytics.connectedCare.diagnostics.statusCounts.sample_collected || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-center">
                                        <p className="text-[11px] text-indigo-700 font-medium">Report Ready</p>
                                        <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mt-1">{analytics.connectedCare.diagnostics.statusCounts.report_ready || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center">
                                        <p className="text-[11px] text-emerald-700 font-medium">Completed</p>
                                        <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1">{analytics.connectedCare.diagnostics.statusCounts.completed || 0}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Hospital Referrals Section */}
                            <Card padding="lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                                            <Building className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Hospital Referrals</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Secondary and tertiary care patient handoffs</p>
                                        </div>
                                    </div>
                                    <Link href="/clinic/referrals" className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
                                        Manage Referrals <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                                        <p className="text-[11px] text-gray-500 font-medium">Total Referrals</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{analytics.connectedCare.hospitalReferrals.totalReferrals}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-center">
                                        <p className="text-[11px] text-amber-700 font-medium">Pending Admission</p>
                                        <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">{analytics.connectedCare.hospitalReferrals.statusCounts.pending || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-center">
                                        <p className="text-[11px] text-blue-700 font-medium">Admitted</p>
                                        <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mt-1">{analytics.connectedCare.hospitalReferrals.statusCounts.admitted || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center">
                                        <p className="text-[11px] text-emerald-700 font-medium">Discharged</p>
                                        <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1">{analytics.connectedCare.hospitalReferrals.statusCounts.discharged || 0}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ==================== TAB 6: REVIEWS & QUALITY ==================== */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Clinic Quality & Reviews */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Clinic Overall Rating</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Patient feedback for clinic operations</p>

                                    <div className="flex items-center gap-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-4">
                                        <div className="text-center">
                                            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                                {analytics.reviews.clinic.averageRating > 0 ? analytics.reviews.clinic.averageRating.toFixed(1) : '—'}
                                            </p>
                                            <div className="flex items-center gap-0.5 justify-center mt-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            'h-3.5 w-3.5',
                                                            star <= Math.round(analytics.reviews.clinic.averageRating)
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-gray-300 dark:text-gray-700'
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">{analytics.reviews.clinic.totalReviews} total reviews</p>
                                        </div>

                                        <div className="flex-1 space-y-1.5">
                                            {[5, 4, 3, 2, 1].map((s) => {
                                                const count = analytics.reviews.clinic.starDistribution[s] || 0;
                                                const pct = analytics.reviews.clinic.totalReviews > 0 ? Math.round((count / analytics.reviews.clinic.totalReviews) * 100) : 0;
                                                return (
                                                    <div key={s} className="flex items-center gap-2 text-[11px]">
                                                        <span className="w-3 text-gray-500 font-medium">{s}★</span>
                                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="w-6 text-right text-gray-400">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs px-2 text-gray-600 dark:text-gray-400 font-medium">
                                        <span>Verified Encounters: {analytics.reviews.clinic.verifiedReviews}</span>
                                        <span>Response Rate: {analytics.reviews.clinic.responseRate}%</span>
                                    </div>
                                </Card>

                                {/* Separate Doctor Reviews */}
                                <Card padding="lg">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Doctor Reviews Breakdown</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                        Doctor ratings are distinct from clinic ratings
                                    </p>

                                    <div className="space-y-3">
                                        {analytics.reviews.doctors.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{doc.name}</p>
                                                    <p className="text-[11px] text-gray-500">{doc.specialization}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                        {doc.averageRating > 0 ? doc.averageRating.toFixed(1) : 'New'}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">({doc.totalReviews})</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ==================== TAB 7: FINANCE ==================== */}
                    {activeTab === 'finance' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card padding="md">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Consultation Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">
                                        ₹{analytics.finance.totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">From completed consultations</p>
                                </Card>

                                <Card padding="md">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">In-Person Revenue</p>
                                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-1.5">
                                        ₹{analytics.finance.inPersonRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Walk-ins & scheduled in-clinic visits</p>
                                </Card>

                                <Card padding="md">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cancellation Revenue Loss</p>
                                    <p className="text-2xl font-bold text-rose-500 mt-1.5">
                                        ₹{analytics.finance.cancelledLoss.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Potential revenue lost to cancellations</p>
                                </Card>
                            </div>

                            <Card padding="lg">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Doctor Revenue Contribution</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Revenue collected by physician</p>

                                <div className="space-y-3">
                                    {analytics.finance.doctorContributions.map((doc) => {
                                        const total = analytics.finance.totalRevenue;
                                        const pct = total > 0 ? Math.round((doc.revenue / total) * 100) : 0;
                                        return (
                                            <div key={doc.doctorId} className="space-y-1">
                                                <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    <span>{doc.name}</span>
                                                    <span>₹{doc.revenue.toLocaleString()} ({pct}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ==================== TAB 8: CAPACITY ==================== */}
                    {activeTab === 'capacity' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card padding="md">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            <UserCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.capacity.activeDoctorsCount}</p>
                                            <p className="text-xs text-gray-500">Active Doctors on Duty</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card padding="md">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.capacity.upcomingLeaves.length}</p>
                                            <p className="text-xs text-gray-500">Upcoming Leave Schedules</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <Card padding="lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Upcoming Doctor Leaves</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Schedule adjustments and operational coverage</p>
                                    </div>
                                    <Link href="/clinic/schedule" className="text-xs font-semibold text-pink-600 hover:underline flex items-center gap-1">
                                        View Schedule <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>

                                {analytics.capacity.upcomingLeaves.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                                        No upcoming leaves scheduled. Full clinic capacity available.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {analytics.capacity.upcomingLeaves.map((l) => (
                                            <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{l.doctorName}</p>
                                                    <p className="text-gray-500">{l.reason}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-gray-700 dark:text-gray-300">{l.startDate} → {l.endDate}</p>
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                        {l.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ClinicReportsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading reports & analytics...</div>}>
            <ClinicReportsContent />
        </Suspense>
    );
}
