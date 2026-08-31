'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Stethoscope,
    FileText,
    Pill,
    Microscope,
    HeartPulse,
    Bot,
    Plus,
    Clock,
    Video,
    Building2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ArrowRight,
    Loader2,
    Activity,
    Shield,
    PhoneCall,
    Sparkles,
    RefreshCw,
    QrCode,
    MessageSquare,
    Users,
    Check,
    Lock,
    X,
    BookOpen
} from 'lucide-react';
import { patientApi, chatbotApi, communityApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';
import RecommendedDoctorCarousel from '@/components/patient/RecommendedDoctorCarousel';

const QUICK_ACTIONS = [
    {
        id: 'hospital',
        title: 'Find Hospital',
        sub: 'Nearby facilities',
        image: '/images/patient/find_hospital.webp',
        alt: 'Find nearby hospitals',
        href: '/patient/doctors',
    },
    {
        id: 'clinic',
        title: 'Find Clinic',
        sub: 'In-clinic visits',
        image: '/images/patient/clinic_visit.webp',
        alt: 'Find clinic consultation',
        href: '/patient/doctors?mode=in_person',
    },
    {
        id: 'pharmacy',
        title: 'Order Medicine',
        sub: 'Doorstep delivery',
        image: '/images/patient/order_medicine.webp',
        alt: 'Order medicines online',
        href: '/patient/pharmacy',
    },
    {
        id: 'diagnostics',
        title: 'Book Lab Test',
        sub: 'Home sample collection',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badge: 'Popular',
    },
    {
        title: 'Book Diagnostics',
        description: 'Schedule home collection or diagnostic center lab tests',
        icon: Microscope,
        href: '/patient/diagnostics',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
        title: 'Order Pharmacy',
        description: 'Get doorstep delivery from licensed local medical stores',
        icon: Pill,
        href: '/patient/pharmacy',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
        title: 'Health Library',
        description: 'Evidence-based clinical guides and wellness education',
        icon: BookOpen,
        href: '/patient/health-library',
        color: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
        title: 'Digital Health Card',
        description: 'Encrypted clinical QR card for instant doctor scanning',
        icon: QrCode,
        href: '/patient/digital-health-card',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        requiresAuth: true,
    },
    {
        title: 'Health Records',
        description: 'Store prescriptions, lab reports, and vitals history',
        icon: FileText,
        href: '/patient/records',
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        requiresAuth: true,
    },
    {
        title: 'AI Health Assistant',
        description: 'AI symptom guidance and triage advice',
        icon: Bot,
        href: '/patient/assistant',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badge: 'AI Smart',
        requiresAuth: true,
    },
    {
        title: 'Community Q&A',
        description: 'Ask questions and read doctor answers anonymously',
        icon: MessageSquare,
        href: '/patient/community',
        color: 'text-stone-700 bg-stone-100 border-stone-200',
    },
];

export default function PatientDashboard() {
    const { user, isAuthenticated } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const { requireAuth } = useAuthGate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [healthAlerts, setHealthAlerts] = useState<any[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [totalCommunityQuestions, setTotalCommunityQuestions] = useState<number | null>(null);

    // SOS Modal State
    const [sosModalOpen, setSosModalOpen] = useState(false);
    const [sosLoading, setSosLoading] = useState(false);
    const [sosSuccess, setSosSuccess] = useState<any>(null);
    const [sosError, setSosError] = useState<string | null>(null);

    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (isPatient) {
                const [profRes, dashRes, apptsRes, rxRes, ordersRes] = await Promise.allSettled([
                    patientApi.getProfile(),
                    patientApi.getDashboard(),
                    patientApi.getAppointments({ status: 'upcoming', limit: 3 }),
                    patientApi.getPrescriptions({ limit: 3 }),
                    patientApi.getOrders({ limit: 3 }),
                ]);

                if (profRes.status === 'fulfilled' && profRes.value.success) {
                    setProfile(profRes.value.data as any);
                }
                if (dashRes.status === 'fulfilled' && dashRes.value.success) {
                    setDashboardData(dashRes.value.data as any);
                }
                if (apptsRes.status === 'fulfilled' && apptsRes.value.success) {
                    setUpcomingAppointments((apptsRes.value.data as any[]) || []);
                }
                if (rxRes.status === 'fulfilled' && rxRes.value.success) {
                    setPrescriptions((rxRes.value.data as any[]) || []);
                }
                if (ordersRes.status === 'fulfilled' && ordersRes.value.success) {
                    setOrders((ordersRes.value.data as any[]) || []);
                }

                try {
                    const alertsRes = await patientApi.getHealthAlerts();
                    if (alertsRes.success && Array.isArray(alertsRes.data)) {
                        setHealthAlerts(alertsRes.data as any[]);
                    }
                } catch {
                    // Non-fatal
                }
            }

            // Load community questions count (matches Android fetchTotalQuestions)
            try {
                const commRes = await communityApi.getQuestions({ page: 1, limit: 1 });
                if (commRes.success && commRes.data) {
                    setTotalCommunityQuestions(commRes.data.total ?? commRes.data.questions?.length ?? null);
                }
            } catch {
                // Non-fatal
            }
        } catch (err: any) {
            if (isPatient) {
                setError(err.message || 'Failed to load patient dashboard. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [isPatient]);

    const handleTriggerSOS = async () => {
        setSosLoading(true);
        setSosError(null);
        setSosSuccess(null);

        if (!navigator.geolocation) {
            setSosError('Geolocation is not supported by your browser');
            setSosLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const res = await patientApi.requestSOS({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        emergencyType: 'medical',
                    });

                    if (res.success) {
                        setSosSuccess(res.data || { status: 'dispatched' });
                    } else {
                        setSosError(res.message || res.error || 'Failed to dispatch SOS alert');
                    }
                } catch (err: any) {
                    setSosError(err.message || 'Error contacting emergency services');
                } finally {
                    setSosLoading(false);
                }
            },
            (err) => {
                setSosError(`Location permission required: ${err.message}`);
                setSosLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-14 bg-white rounded-2xl border border-stone-200/80" />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-28 bg-white rounded-2xl border border-stone-200/80" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-44 bg-white rounded-3xl border border-stone-200/80" />
                    <div className="h-44 bg-white rounded-3xl border border-stone-200/80" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-stone-900">Unable to Load Dashboard</h3>
                <p className="text-stone-600 text-sm max-w-md mx-auto">{error}</p>
                <button
                    onClick={loadDashboardData}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-vd-forest text-white rounded-xl font-semibold text-sm hover:bg-vd-forest-deep transition-all shadow-xs cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. Compact Page Heading & Quick Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
                        How can we help you today?
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 font-normal mt-0.5">
                        Access care, services and wellness from one connected healthcare platform.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    <Link
                        href="/patient/health-library"
                        className="px-3.5 py-2 bg-white border border-stone-300 hover:border-vd-forest/50 text-vd-forest hover:bg-emerald-50/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Health Library</span>
                    </Link>
                    <button
                        onClick={() => setSosModalOpen(true)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Emergency SOS</span>
                    </button>
                </div>
            </div>

            {/* 2. App-Style Quick Action Cards (5 Compact Healthcare Shortcut Tiles) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {/* 01 — Find Hospital */}
                <Link
                    href="/patient/hospitals"
                    className="bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/20 hover:from-emerald-100/70 hover:to-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/70 hover:border-emerald-400/80 shadow-2xs hover:shadow-md hover:shadow-emerald-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer min-h-[125px] sm:min-h-[135px] motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs group-hover:scale-108 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 group-hover:shadow-sm group-hover:shadow-emerald-600/30 transition-all duration-200">
                            <Building2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-500/60 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    <div className="pt-2">
                        <h3 className="font-heading font-bold text-stone-900 text-xs sm:text-sm group-hover:text-emerald-950 transition-colors leading-tight">
                            Find Hospital
                        </h3>
                        <p className="text-[11px] text-emerald-800/70 group-hover:text-emerald-800 font-medium mt-0.5 transition-colors">
                            Explore nearby
                        </p>
                    </div>
                </Link>

                {/* 02 — Find Clinic */}
                <Link
                    href="/patient/clinics"
                    className="bg-gradient-to-b from-teal-50/60 via-white to-teal-50/20 hover:from-teal-100/70 hover:to-white p-3.5 sm:p-4 rounded-2xl border border-teal-200/70 hover:border-teal-400/80 shadow-2xs hover:shadow-md hover:shadow-teal-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer min-h-[125px] sm:min-h-[135px] motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 border border-teal-200 text-teal-700 flex items-center justify-center shadow-2xs group-hover:scale-108 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 group-hover:shadow-sm group-hover:shadow-teal-600/30 transition-all duration-200">
                            <Stethoscope className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-teal-500/60 group-hover:text-teal-700 group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    <div className="pt-2">
                        <h3 className="font-heading font-bold text-stone-900 text-xs sm:text-sm group-hover:text-teal-950 transition-colors leading-tight">
                            Find Clinic
                        </h3>
                        <p className="text-[11px] text-teal-800/70 group-hover:text-teal-800 font-medium mt-0.5 transition-colors">
                            Verified centers
                        </p>
                    </div>
                </Link>

                {/* 03 — Order Medicine */}
                <Link
                    href="/patient/pharmacy"
                    className="bg-gradient-to-b from-amber-50/60 via-white to-amber-50/20 hover:from-amber-100/70 hover:to-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-md hover:shadow-amber-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer min-h-[125px] sm:min-h-[135px] motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 border border-amber-200 text-amber-700 flex items-center justify-center shadow-2xs group-hover:scale-108 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 group-hover:shadow-sm group-hover:shadow-amber-600/30 transition-all duration-200">
                            <Pill className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500/60 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    <div className="pt-2">
                        <h3 className="font-heading font-bold text-stone-900 text-xs sm:text-sm group-hover:text-amber-950 transition-colors leading-tight">
                            Order Medicine
                        </h3>
                        <p className="text-[11px] text-amber-800/70 group-hover:text-amber-800 font-medium mt-0.5 transition-colors">
                            Doorstep delivery
                        </p>
                    </div>
                </Link>

                {/* 04 — Book Lab Test */}
                <Link
                    href="/patient/diagnostics"
                    className="bg-gradient-to-b from-indigo-50/60 via-white to-indigo-50/20 hover:from-indigo-100/70 hover:to-white p-3.5 sm:p-4 rounded-2xl border border-indigo-200/70 hover:border-indigo-400/80 shadow-2xs hover:shadow-md hover:shadow-indigo-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer min-h-[125px] sm:min-h-[135px] motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-2xs group-hover:scale-108 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 group-hover:shadow-sm group-hover:shadow-indigo-600/30 transition-all duration-200">
                            <Microscope className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-500/60 group-hover:text-indigo-700 group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    <div className="pt-2">
                        <h3 className="font-heading font-bold text-stone-900 text-xs sm:text-sm group-hover:text-indigo-950 transition-colors leading-tight">
                            Book Lab Test
                        </h3>
                        <p className="text-[11px] text-indigo-800/70 group-hover:text-indigo-800 font-medium mt-0.5 transition-colors">
                            Home collection
                        </p>
                    </div>
                </Link>

                {/* 05 — Gym & Coaches */}
                <Link
                    href="/fitness-center"
                    className="bg-gradient-to-b from-purple-50/60 via-white to-purple-50/20 hover:from-purple-100/70 hover:to-white p-3.5 sm:p-4 rounded-2xl border border-purple-200/70 hover:border-purple-400/80 shadow-2xs hover:shadow-md hover:shadow-purple-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer min-h-[125px] sm:min-h-[135px] motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/95 border border-purple-200 text-purple-700 flex items-center justify-center shadow-2xs group-hover:scale-108 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 group-hover:shadow-sm group-hover:shadow-purple-600/30 transition-all duration-200">
                            <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-500/60 group-hover:text-purple-700 group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    <div className="pt-2">
                        <h3 className="font-heading font-bold text-stone-900 text-xs sm:text-sm group-hover:text-purple-950 transition-colors leading-tight">
                            Gym & Coaches
                        </h3>
                        <p className="text-[11px] text-purple-800/70 group-hover:text-purple-800 font-medium mt-0.5 transition-colors">
                            Fitness & plans
                        </p>
                    </div>
                </Link>
            </div>

            {/* Section Divider: Consultation Header */}
            <div className="flex items-center gap-3 pt-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-vd-forest/80">
                    Your Consultation Options
                </span>
                <div className="h-px flex-1 bg-stone-200/80" />
            </div>

            {/* 3. Primary Consultation Cards (In-Person & Video Consultation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Card 1: In-Person Consultation */}
                <Link
                    href="/patient/doctors?mode=in_person"
                    className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 hover:from-emerald-100/90 hover:via-white hover:to-teal-50/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-200/80 hover:border-emerald-400 shadow-2xs hover:shadow-md hover:shadow-emerald-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                >
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 group-hover:bg-emerald-200/90 text-vd-forest text-[10px] font-bold uppercase tracking-wider border border-emerald-200 transition-colors">
                                <span>🏥</span>
                                <span>IN-PERSON CONSULTATION</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-white/90 group-hover:bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200/70 transition-colors">
                                120 km Radius
                            </span>
                        </div>

                        <div>
                            <h2 className="font-heading text-base sm:text-lg font-bold text-stone-900 group-hover:text-vd-forest transition-colors leading-snug">
                                Visit a doctor in person
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-700 font-medium">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/70 border border-emerald-100/70 group-hover:bg-white transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Verified doctors</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/70 border border-emerald-100/70 group-hover:bg-white transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Clinic appointments</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 mt-2 border-t border-emerald-100/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-vd-forest group-hover:text-vd-forest-deep flex items-center gap-1.5 transition-colors">
                            <span>Explore Consultation</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <span className="text-[11px] text-emerald-800/80 font-medium">Hospital & Clinic</span>
                    </div>
                </Link>

                {/* Card 2: Video Consultation */}
                <Link
                    href="/patient/doctors?mode=video"
                    className="bg-gradient-to-br from-teal-50/80 via-white to-blue-50/40 hover:from-teal-100/90 hover:via-white hover:to-blue-50/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-teal-200/80 hover:border-teal-400 shadow-2xs hover:shadow-md hover:shadow-teal-950/5 hover:-translate-y-1 transition-all duration-200 ease-out group flex flex-col justify-between cursor-pointer motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                >
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-100/80 group-hover:bg-teal-200/90 text-teal-800 text-[10px] font-bold uppercase tracking-wider border border-teal-200 transition-colors">
                                <span>📹</span>
                                <span>VIDEO CONSULTATION</span>
                            </div>
                            <span className="text-[10px] font-bold text-teal-800 bg-white/90 group-hover:bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-200/70 transition-colors">
                                Remote Online
                            </span>
                        </div>

                        <div>
                            <h2 className="font-heading text-base sm:text-lg font-bold text-stone-900 group-hover:text-teal-900 transition-colors leading-snug">
                                Consult from anywhere
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-700 font-medium">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/70 border border-teal-100/70 group-hover:bg-white transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>Instant video</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/70 border border-teal-100/70 group-hover:bg-white transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>Digital Rx</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/70 border border-teal-100/70 group-hover:bg-white transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>Secure HD call</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 mt-2 border-t border-teal-100/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-800 group-hover:text-teal-950 flex items-center gap-1.5 transition-colors">
                            <span>Explore Consultation</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <span className="text-[11px] text-teal-800/80 font-medium">Pan-India Access</span>
                    </div>
                </Link>
            </div>

            {/* Health Outbreak Warnings (if any active alerts) */}
            {healthAlerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-4 sm:p-5 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                            Regional Health Advisory
                        </h4>
                        <p className="text-xs text-amber-900 leading-relaxed font-light">
                            {healthAlerts[0]?.message || 'Health advisory active for your area. Practice preventive care.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Dashboard Main Grid: Left & Right Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Section: Appointments & Health Records */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Upcoming Consultations */}
                    <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-vd-forest" />
                                <h2 className="font-heading text-lg font-bold text-stone-900">
                                    Upcoming Consultations
                                </h2>
                            </div>
                            <Link
                                href="/patient/appointments"
                                className="text-xs font-semibold text-vd-forest hover:text-vd-sage flex items-center gap-1"
                            >
                                <span>View all</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {!isPatient ? (
                            <div className="p-8 text-center bg-stone-50/60 rounded-2xl border border-stone-100 space-y-2">
                                <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
                                <h4 className="text-xs font-bold text-stone-800">Sign in to view your appointments</h4>
                                <p className="text-[11px] text-stone-500 font-light max-w-xs mx-auto">
                                     Track upcoming video consultations and in-clinic appointments with certified doctors.
                                </p>
                                <div className="pt-2 flex items-center justify-center gap-2">
                                    <Link
                                        href="/login/patient?redirect=/patient"
                                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold shadow-xs hover:bg-vd-forest-deep transition-all"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/patient/doctors"
                                        className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-all"
                                    >
                                        Find Doctors
                                    </Link>
                                </div>
                            </div>
                        ) : upcomingAppointments.length === 0 ? (
                            <div className="p-8 text-center bg-stone-50/60 rounded-2xl border border-stone-100">
                                <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                                <p className="text-xs font-medium text-stone-600 mb-1">
                                    No upcoming appointments scheduled
                                </p>
                                <p className="text-[11px] text-stone-400 font-light mb-4">
                                    Connect with certified doctors via video or book an in-clinic consultation.
                                </p>
                                <Link
                                    href="/patient/doctors"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Find a Doctor</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingAppointments.map((appt) => (
                                    <div
                                        key={appt.id}
                                        className="p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-vd-forest/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-vd-forest flex items-center justify-center font-bold text-xs shrink-0">
                                                {appt.doctor?.name ? appt.doctor.name.charAt(0) : 'Dr'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-stone-900 text-sm">
                                                    {appt.doctor?.name || 'Doctor Appointment'}
                                                </h4>
                                                <p className="text-[11px] text-stone-500 font-light">
                                                    {appt.doctor?.specialization || 'General Physician'}
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] text-stone-600 mt-1">
                                                    <span className="flex items-center gap-1 font-mono">
                                                        <Clock className="w-3 h-3 text-stone-400" />
                                                        {appt.appointment_date || appt.date} • {appt.time_slot || appt.timeSlot}
                                                    </span>
                                                    <span className="flex items-center gap-1 capitalize font-medium text-vd-forest">
                                                        {appt.type === 'video' ? (
                                                            <>
                                                                <Video className="w-3 h-3" /> Video Call
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Building2 className="w-3 h-3" /> Clinic Visit
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            {appt.type === 'video' && (
                                                <Link
                                                    href={`/consultation/${appt.id}`}
                                                    className="px-3.5 py-1.5 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all shadow-xs"
                                                >
                                                    Join Call
                                                </Link>
                                            )}
                                            <Link
                                                href="/patient/appointments"
                                                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-medium hover:bg-stone-50"
                                            >
                                                Details
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Prescriptions & Pharmacy Activity */}
                    <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4 text-orange-600" />
                                <h2 className="font-heading text-lg font-bold text-stone-900">
                                    Prescriptions & Medicine
                                </h2>
                            </div>
                            <Link
                                href="/patient/records"
                                className="text-xs font-semibold text-vd-forest hover:text-vd-sage flex items-center gap-1"
                            >
                                <span>All Prescriptions</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {!isPatient ? (
                            <div className="p-8 text-center bg-stone-50/60 rounded-2xl border border-stone-100 space-y-2">
                                <Pill className="w-8 h-8 text-stone-300 mx-auto" />
                                <h4 className="text-xs font-bold text-stone-800">Sign in to view prescriptions & medicine</h4>
                                <p className="text-[11px] text-stone-500 font-light max-w-xs mx-auto">
                                    Access verified electronic prescriptions, medication schedules, and order doorstep pharmacy delivery.
                                </p>
                                <div className="pt-2 flex items-center justify-center gap-2">
                                    <Link
                                        href="/login/patient?redirect=/patient"
                                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold shadow-xs hover:bg-vd-forest-deep transition-all"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/patient/pharmacy"
                                        className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-all"
                                    >
                                        Explore Pharmacy
                                    </Link>
                                </div>
                            </div>

                        ) : prescriptions.length === 0 ? (
                            <div className="p-6 text-center bg-stone-50/60 rounded-2xl border border-stone-100">
                                <FileText className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
                                <p className="text-xs text-stone-500 font-light">No prescriptions on file yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {prescriptions.map((rx) => (
                                    <div
                                        key={rx.id}
                                        className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-white rounded border border-stone-200 text-stone-700">
                                                    {rx.prescription_number || 'RX'}
                                                </span>
                                                <span className="text-xs font-semibold text-stone-900">
                                                    {rx.diagnosis || 'Clinical Prescription'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-stone-500 font-light">
                                                Prescribed by {rx.doctor?.name || 'Practitioner'} •{' '}
                                                {new Date(rx.created_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/patient/records?tab=prescriptions`}
                                            className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium shrink-0"
                                        >
                                            View RX
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Section: Vitals & Health Insights */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Digital Health Card Widget (Matches Android Smart Health Card - Light/Clean Design) */}
                    <Link
                        href="/patient/digital-health-card"
                        className="block relative overflow-hidden bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 hover:from-emerald-100/80 hover:via-white hover:to-teal-50/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-200/80 hover:border-emerald-400/80 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 ease-out group cursor-pointer motion-reduce:hover:transform-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100/80 border border-emerald-200/80 text-vd-forest flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-200">
                                    <QrCode className="w-5 h-5 sm:w-6 sm:h-6 transition-colors" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-heading font-bold text-sm sm:text-base text-stone-900 group-hover:text-vd-forest transition-colors truncate">
                                            Digital Health Card
                                        </h3>
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-vd-forest border border-emerald-200/90 uppercase tracking-wider shrink-0">
                                            QR ENABLED
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500 font-normal mt-0.5 truncate sm:whitespace-normal">
                                        Tap to view 24h QR code & emergency vitals
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-emerald-600/70 group-hover:text-vd-forest group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                        </div>
                    </Link>

                    {/* Recommended Doctors Carousel */}
                    <RecommendedDoctorCarousel />

                    {/* Community Health Q&A Card (Replaces AI Symptom Assistant card, matches Android CommunityQABanner) */}
                    <div className="bg-white rounded-3xl p-6 border border-emerald-100/90 shadow-xs space-y-4 relative overflow-hidden bg-gradient-to-br from-emerald-50/40 via-white to-stone-50/50">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 text-vd-forest flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
                                    <MessageSquare className="w-5 h-5 text-vd-forest" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-heading text-base font-bold text-stone-900">
                                            Community Health Q&A
                                        </h3>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[9px] font-bold tracking-wider uppercase border border-emerald-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>LIVE</span>
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-vd-forest font-semibold mt-0.5">
                                        {totalCommunityQuestions ? `${totalCommunityQuestions}+ active discussions` : 'Verified doctor answers & patient discussions'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed font-light">
                            Ask health questions, learn from verified answers, and explore conversations from the Vaididea community.
                        </p>

                        <div className="pt-1 flex flex-wrap items-center gap-2.5">
                            <Link
                                href="/patient/community?action=ask"
                                className="px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Ask a Question</span>
                            </Link>

                            <Link
                                href="/patient/community"
                                className="px-4 py-2.5 bg-stone-100 hover:bg-emerald-50 text-stone-800 hover:text-vd-forest border border-stone-200 hover:border-emerald-200 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>Explore Q&A</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>



            {/* Emergency SOS Modal */}
            {sosModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setSosModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-rose-200 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSosModalOpen(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <PhoneCall className="w-8 h-8" />
                        </div>

                        <h3 className="font-heading font-bold text-xl text-stone-900 mb-2">
                            Emergency SOS Dispatch
                        </h3>

                        <p className="text-xs text-stone-600 leading-relaxed font-light mb-6 max-w-sm mx-auto">
                            Pressing confirm will capture your current GPS location and send an immediate emergency
                            broadcast to registered ambulances, nearby hospitals, and your emergency contacts.
                        </p>

                        {sosError && (
                            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                                {sosError}
                            </div>
                        )}

                        {sosSuccess && (
                            <div className="p-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 text-left space-y-1">
                                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Emergency Broadcast Activated</span>
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                    Status: {sosSuccess.status || 'Broadcasting'} • Round: {sosSuccess.broadcast_round || 1}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            {!sosSuccess ? (
                                <button
                                    onClick={handleTriggerSOS}
                                    disabled={sosLoading}
                                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {sosLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>Confirm & Send SOS Now</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => setSosModalOpen(false)}
                                    className="w-full py-3 bg-vd-forest text-white rounded-xl font-bold text-xs"
                                >
                                    Done
                                </button>
                            )}

                            <button
                                onClick={() => setSosModalOpen(false)}
                                className="w-full py-2.5 text-stone-500 hover:text-stone-800 text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
