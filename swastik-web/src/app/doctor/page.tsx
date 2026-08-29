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
    PenLine,
    ArrowUpRight,
    Send,
    Inbox,
    Building2,
    Pill,
    Microscope,
    Sparkles,
    ShieldCheck,
    Activity,
    ArrowRight,
    ChevronRight,
    AlertCircle,
    Users,
    Check,
    Share2,
    ExternalLink,
    UserPlus,
    Plus,
    PhoneCall,
    Home,
    DollarSign,
    Wallet,
    CreditCard,
    Briefcase,
    Receipt,
    Phone,
    Shield,
    Tag,
    X
} from 'lucide-react';
import { formatDoctorName, formatDoctorFirstName, getAppointmentStartTimingInfo, isAppointmentTimePast } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { MetricCard } from '@/components/doctor/MetricCard';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { StatusBadge } from '@/components/doctor/StatusBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useDoctorStore, type Appointment } from '@/stores/doctorStore';
import { VerificationProgressCard } from '@/components/doctor/VerificationProgressCard';
import { RejectionBanner } from '@/components/doctor/RejectionBanner';
import { OnboardingChecklist } from '@/components/doctor/OnboardingChecklist';
import { CustomizableQuickActions } from '@/components/doctor/CustomizableQuickActions';
import { WelcomeTour } from '@/components/doctor/WelcomeTour';
import OnboardingPopup from '@/components/doctor/OnboardingPopup';
import { useAppointmentUpdates, type AppointmentUpdate } from '@/hooks/useSocket';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { KeyboardShortcutHelp, usePageShortcuts } from '@/components/shared/KeyboardShortcutHelp';
import { api, doctorApi } from '@/lib/api';
import { UniversalReferral } from '@/types/referrals';

interface AnalyticsData {
    period: string;
    startDate?: string;
    endDate?: string;
    summary: {
        totalAppointments: number;
        completedAppointments: number;
        cancelledAppointments: number;
        totalRevenue: number;
        avgRevenuePerConsultation: number;
        cancellationRate: number;
        completionRate: number;
        videoConsultations: number;
        inPersonConsultations: number;
        uniquePatients: number;
        vaidideaRevenue?: number;
        directRevenue?: number;
    };
    vaidideaImpact?: {
        vaidideaPatients: number;
        onlineConsults: number;
        inPersonVisits: number;
        networkReferrals: number;
        vaidideaRevenue: number;
    };
    overallPractice?: {
        totalPatients: number;
        totalConsultations: number;
        directPatients: number;
        directConsultations: number;
        vaidideaPatients: number;
        vaidideaConsultations: number;
        directRevenue: number;
        vaidideaRevenue: number;
        totalRevenue: number;
        completedConsultations: number;
        cancelledConsultations: number;
        pendingPaymentsRevenue: number;
        pendingPaymentsCount: number;
        sources: {
            vaidideaOnline: number;
            vaidideaInPerson: number;
            directWalkIn: number;
            directAppointment: number;
            homeVisit: number;
            otherDirect: number;
        };
    };
    charts?: {
        daily?: Array<{ date: string; appointments: number; revenue: number; video: number; inPerson: number; cancelled: number; completed: number; direct?: number; vaididea?: number }>;
        consultationType?: Array<{ name: string; value: number; color: string }>;
        sourceBreakdown?: Array<{ name: string; value: number; color: string }>;
        peakHours?: Array<{ hour: number; label: string; count: number }>;
    };
}

interface AIInsight {
    id: string;
    category: string;
    type: 'positive' | 'info' | 'warning' | 'tip';
    icon: string;
    title: string;
    description: string;
    action?: string;
    actionHref?: string;
}

export default function DoctorDashboard() {
    const { 
        stats, 
        doctorProfile, 
        todaysAppointments, 
        upcomingAppointments, 
        isLoading, 
        fetchDashboardData, 
        startConsultation, 
        endConsultation, 
        fetchReviews, 
        reviews, 
        loadingReviews, 
        confirmAppointment, 
        rescheduleAppointment 
    } = useDoctorStore();
    
    const { user } = useAuthStore();
    const router = useRouter();
    
    const [newApptAlert, setNewApptAlert] = useState<string | null>(null);
    const [launchingAppointmentId, setLaunchingAppointmentId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reschedulePrompt, setReschedulePrompt] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [newScheduleAppt, setNewScheduleAppt] = useState<any>(null);
    const [newScheduleDate, setNewScheduleDate] = useState('');
    const [newScheduleTime, setNewScheduleTime] = useState('');
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    
    // Period Context Filter for Performance & Analytics
    const [performancePeriod, setPerformancePeriod] = useState<'today' | '7d' | '30d' | '1y'>('30d');
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    
    // Direct Visit Modal State
    const [showDirectVisitModal, setShowDirectVisitModal] = useState(false);
    const [directPhone, setDirectPhone] = useState('');
    const [isSearchingPhone, setIsSearchingPhone] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [foundPatient, setFoundPatient] = useState<any | null>(null);
    const [directPatientName, setDirectPatientName] = useState('');
    const [directGender, setDirectGender] = useState<'male' | 'female' | 'other' | ''>('');
    const [directAge, setDirectAge] = useState('');
    const [directDob, setDirectDob] = useState('');
    const [directVisitType, setDirectVisitType] = useState<'walk_in' | 'direct_appointment' | 'home_visit'>('walk_in');
    const [directFee, setDirectFee] = useState<number | string>(500);
    const [directPaymentStatus, setDirectPaymentStatus] = useState<'paid' | 'pending' | 'waived'>('paid');
    const [directPaymentMethod, setDirectPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');
    const [directPaymentRef, setDirectPaymentRef] = useState('');
    const [directReason, setDirectReason] = useState('');
    const [directNotes, setDirectNotes] = useState('');
    const [directDiagnosis, setDirectDiagnosis] = useState('');
    const [isSubmittingDirectVisit, setIsSubmittingDirectVisit] = useState(false);
    const [directVisitSuccess, setDirectVisitSuccess] = useState<string | null>(null);
    const [directVisitError, setDirectVisitError] = useState<string | null>(null);
    
    // AI Insights State
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(false);

    // Universal Referrals State
    const [sentReferrals, setSentReferrals] = useState<UniversalReferral[]>([]);
    const [inboxReferrals, setInboxReferrals] = useState<UniversalReferral[]>([]);
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    // Community Q&A State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);

    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);

    useEffect(() => {
        if (!doctorProfile) {
            setShowOnboardingPopup(false);
            return;
        }

        const hasAffiliations = (doctorProfile.clinic_affiliations && doctorProfile.clinic_affiliations.some((c: any) => c.is_active)) ||
                                (doctorProfile.hospital_affiliations && doctorProfile.hospital_affiliations.some((h: any) => h.is_active)) ||
                                (doctorProfile.affiliations && doctorProfile.affiliations.length > 0) ||
                                Boolean(doctorProfile.hospital_id);

        const isSetup = Boolean(doctorProfile.practice_setup_type) ||
                        Boolean(doctorProfile.onboarding_completed) ||
                        Boolean(doctorProfile.onboarding_completed_at) ||
                        hasAffiliations;

        setShowOnboardingPopup(!isSetup);
    }, [doctorProfile]);

    const [isSavingAndPrescribing, setIsSavingAndPrescribing] = useState(false);

    const phoneSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlePhoneChange = (val: string) => {
        setDirectPhone(val);
        setDirectVisitError(null);
        const clean = val.replace(/\D/g, '').slice(-10);
        if (phoneSearchDebounce.current) clearTimeout(phoneSearchDebounce.current);
        if (clean.length === 10) {
            setIsSearchingPhone(true);
            phoneSearchDebounce.current = setTimeout(async () => {
                try {
                    const res = await doctorApi.searchPatientByPhone(clean);
                    if (res.success && res.data?.found && res.data?.patient) {
                        const p = res.data.patient;
                        setFoundPatient(p);
                        if (p.name) setDirectPatientName(p.name);
                        if (p.gender) setDirectGender(p.gender as any);
                        if (p.age) setDirectAge(String(p.age));
                        if (p.dateOfBirth) setDirectDob(p.dateOfBirth.split('T')[0]);
                    } else {
                        setFoundPatient(null);
                    }
                } catch (err) {
                    console.error('Failed to search patient by phone:', err);
                    setFoundPatient(null);
                } finally {
                    setIsSearchingPhone(false);
                }
            }, 400);
        } else {
            setFoundPatient(null);
            setIsSearchingPhone(false);
        }
    };

    const openDirectVisitModal = () => {
        setDirectPhone('');
        setFoundPatient(null);
        setDirectPatientName('');
        setDirectGender('');
        setDirectAge('');
        setDirectDob('');
        setDirectVisitType('walk_in');
        setDirectFee(doctorProfile?.consultation_fee || 500);
        setDirectPaymentStatus('paid');
        setDirectPaymentMethod('cash');
        setDirectPaymentRef('');
        setDirectReason('');
        setDirectNotes('');
        setDirectDiagnosis('');
        setDirectVisitSuccess(null);
        setDirectVisitError(null);
        setShowDirectVisitModal(true);
    };

    const handleRecordDirectVisitSubmit = async (e?: React.FormEvent, createPrescription = false) => {
        if (e) e.preventDefault();
        const cleanPhone = directPhone.replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length < 10) {
            setDirectVisitError('Please enter a valid 10-digit mobile number.');
            return;
        }
        if (!foundPatient && !directPatientName.trim()) {
            setDirectVisitError('Please enter the patient name.');
            return;
        }
        if (createPrescription) {
            setIsSavingAndPrescribing(true);
        } else {
            setIsSubmittingDirectVisit(true);
        }
        setDirectVisitError(null);
        try {
            const payload: Record<string, unknown> = {
                patientId: foundPatient?.id || undefined,
                patientName: (directPatientName.trim() || foundPatient?.name || ''),
                phone: cleanPhone,
                gender: directGender || undefined,
                age: directAge ? Number(directAge) : undefined,
                dateOfBirth: directDob || undefined,
                visitType: directVisitType,
                fee: Number(directFee) || 0,
                paymentStatus: directPaymentStatus,
                paymentReference: directPaymentRef.trim() || undefined,
                paymentMethod: directPaymentMethod,
                reasonForVisit: directReason.trim() || 'Direct Walk-in Consultation',
                reason: directReason.trim() || 'Direct Walk-in Consultation',
                notes: directNotes.trim() || undefined,
                diagnosis: directDiagnosis.trim() || undefined,
            };
            const res = await doctorApi.recordDirectVisit(payload);
            if (res.success) {
                setDirectVisitSuccess('Direct visit recorded successfully!');
                await Promise.all([
                    fetchDashboardData(),
                    loadAnalytics(performancePeriod),
                ]);
                const savedAppointmentId = res.data?.appointment?.id || (res.data as any)?.id;
                if (createPrescription && savedAppointmentId) {
                    setShowDirectVisitModal(false);
                    setDirectVisitSuccess(null);
                    router.push(`/doctor/prescriptions/new?appointmentId=${savedAppointmentId}`);
                    return;
                }
                setTimeout(() => {
                    setShowDirectVisitModal(false);
                    setDirectVisitSuccess(null);
                }, 1200);
            } else {
                const errorMsg = (res as any).error || res.message || 'Unable to record direct visit. Please check details and try again.';
                setDirectVisitError(errorMsg);
            }
        } catch (err: any) {
            console.error('Error recording direct visit:', err);
            setDirectVisitError(err.message || 'Unable to record direct visit. Please check network/server status.');
        } finally {
            setIsSubmittingDirectVisit(false);
            setIsSavingAndPrescribing(false);
        }
    };

    const shortcuts = useMemo(() => [
        { key: 'a', description: 'Go to Appointments', action: () => router.push('/doctor/appointments') },
        { key: 'p', description: 'Go to Patients', action: () => router.push('/doctor/patients') },
        { key: 'r', description: 'Refresh dashboard', action: () => fetchDashboardData() },
        { key: 's', description: 'Go to Settings', action: () => router.push('/doctor/settings') },
        { key: 'v', description: 'Go to Vitals', action: () => router.push('/doctor/vitals') },
    ], [router, fetchDashboardData]);

    const { showHelp, setShowHelp, allShortcuts } = usePageShortcuts(shortcuts);

    // Debounce socket-driven refetches
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedFetch = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => { fetchDashboardData(); }, 500);
    }, [fetchDashboardData]);
    useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

    // Real-time Socket.IO updates
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

    // Load Analytics for current period with race-condition protection
    const latestAnalyticsReqId = useRef(0);
    const loadAnalytics = useCallback(async (period: string) => {
        const reqId = ++latestAnalyticsReqId.current;
        setLoadingAnalytics(true);
        try {
            const res = await doctorApi.getAnalytics(period);
            if (reqId === latestAnalyticsReqId.current && res.success && res.data) {
                setAnalytics(res.data as AnalyticsData);
            }
        } catch (err) {
            console.error('Failed to load doctor analytics:', err);
        } finally {
            if (reqId === latestAnalyticsReqId.current) {
                setLoadingAnalytics(false);
            }
        }
    }, []);

    // Load AI Insights
    const loadInsights = useCallback(async () => {
        setLoadingInsights(true);
        try {
            const res = await doctorApi.getInsights();
            if (res.success && Array.isArray(res.data)) {
                setInsights(res.data as AIInsight[]);
            }
        } catch (err) {
            console.error('Failed to load insights:', err);
        } finally {
            setLoadingInsights(false);
        }
    }, []);

    // Load Universal Referrals
    const loadReferrals = useCallback(async () => {
        setLoadingReferrals(true);
        try {
            const [sentRes, inboxRes] = await Promise.all([
                api.universalReferrals.getSentReferrals(),
                api.universalReferrals.getReferralInbox()
            ]);
            if (sentRes.success && Array.isArray(sentRes.data)) {
                setSentReferrals(sentRes.data as UniversalReferral[]);
            }
            if (inboxRes.success && Array.isArray(inboxRes.data)) {
                setInboxReferrals(inboxRes.data as UniversalReferral[]);
            }
        } catch (err) {
            console.error('Failed to load referrals:', err);
        } finally {
            setLoadingReferrals(false);
        }
    }, []);

    // Load Community Q&A
    const fetchQuestions = useCallback(async () => {
        setLoadingQuestions(true);
        try {
            const response = await api.community.getQuestions(1, 5);
            if (response.success) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = response.data as any;
                const allQs = data.questions || data.data || [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const unanswered = allQs.filter((q: any) => !q.answers || q.answers.length === 0);
                setRecentQuestions(unanswered.slice(0, 3));
            }
        } catch (err) {
            console.error('Failed to load community questions:', err);
        } finally {
            setLoadingQuestions(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        fetchReviews();
        loadAnalytics(performancePeriod);
        loadInsights();
        loadReferrals();
        fetchQuestions();
    }, [fetchDashboardData, fetchReviews, loadAnalytics, performancePeriod, loadInsights, loadReferrals, fetchQuestions]);

    const [nowMs, setNowMs] = useState(() => Date.now());

    // Heartbeat timer (every 30s) to continuously update start countdowns and gating
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const currentTime = new Date(nowMs);
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
        const aptTimeStr = appointment.time || appointment.timeSlot || appointment.time_slot;
        if (aptDateStr && aptTimeStr) {
            if (isAppointmentTimePast(aptDateStr, aptTimeStr, nowMs)) {
                setReschedulePrompt(appointment);
                return;
            }
        }
        setApprovingId(appointment.id);
        await confirmAppointment(appointment.id);
        setApprovingId(null);
        setSelectedAppointment(appointment);
    }, [confirmAppointment, nowMs]);

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
        if (!confirm('Are you sure you want to end this consultation?')) return;
        try {
            await endConsultation(appointment.id, appointment.consultation_id);
        } catch (error) {
            console.error('Failed to end consultation', error);
            alert('Failed to end consultation. Please try again.');
        }
    }, [endConsultation]);

    // Referral Metrics Computation (from actual real data)
    const referralMetrics = useMemo(() => {
        const sent = sentReferrals;
        const awaitingConsent = sent.filter(r => r.status === 'awaiting_consent').length;
        const pending = sent.filter(r => r.status === 'pending').length;
        const accepted = sent.filter(r => r.status === 'accepted').length;
        const inProgress = sent.filter(r => r.status === 'in_progress').length;
        const completed = sent.filter(r => r.status === 'completed').length;
        const declined = sent.filter(r => r.status === 'consent_declined' || r.status === 'rejected' || r.status === 'cancelled').length;
        
        // Destination Breakdown
        const destinationCounts: Record<string, number> = {
            hospital: 0,
            clinic: 0,
            pharmacy: 0,
            diagnostic_center: 0,
        };
        sent.forEach(r => {
            const dest = (r.receiver_type || '').toLowerCase();
            if (destinationCounts[dest] !== undefined) {
                destinationCounts[dest]++;
            }
        });

        // Inbound metrics
        const received = inboxReferrals.length;
        const awaitingAction = inboxReferrals.filter(r => r.status === 'pending' || r.status === 'awaiting_consent').length;

        return {
            totalSent: sent.length,
            awaitingConsent,
            pending,
            accepted,
            inProgress,
            completed,
            declined,
            destinationCounts,
            received,
            awaitingAction
        };
    }, [sentReferrals, inboxReferrals]);

    // Consultation Performance Calculations
    const videoCount = analytics?.summary?.videoConsultations ?? 0;
    const inPersonCount = analytics?.summary?.inPersonConsultations ?? 0;
    const totalConsultsInPeriod = analytics?.summary?.totalAppointments ?? 0;
    const completionRate = analytics?.summary?.completionRate ?? 0;
    const cancellationRate = analytics?.summary?.cancellationRate ?? 0;
    const periodRevenue = analytics?.summary?.totalRevenue ?? 0;
    
    // Canonical Total Patients & Average Rating
    const totalPatients = stats?.totalPatients ?? doctorProfile?.stats?.totalPatients ?? 0;
    const rawRating = stats?.averageRating ?? doctorProfile?.rating ?? doctorProfile?.stats?.averageRating;
    const totalReviewCount = stats?.totalReviews ?? doctorProfile?.total_reviews ?? doctorProfile?.stats?.totalReviews ?? 0;
    const hasValidRating = typeof rawRating === 'number' && rawRating > 0 && totalReviewCount > 0;
    const formattedRating = hasValidRating ? `${rawRating.toFixed(1)} ★` : 'No ratings yet';
    const ratingSubtext = totalReviewCount > 0 
        ? `${totalReviewCount} verified review${totalReviewCount === 1 ? '' : 's'}`
        : '0 verified reviews';

    // Dynamic Top Overview Metrics (6 cards)
    const TOP_METRICS = [
        {
            label: "Today's Appointments",
            value: stats?.todaysAppointments ?? todaysAppointments.length,
            icon: Calendar,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40',
            href: '/doctor/appointments',
            sub: `${stats?.completed ?? 0} completed`
        },
        {
            label: "Completed Today",
            value: stats?.completed ?? 0,
            icon: CheckCircle,
            color: 'text-teal-600',
            bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-800/40',
            href: '/doctor/appointments?status=completed',
            sub: `${stats?.todaysAppointments ? Math.round(((stats.completed || 0) / (stats.todaysAppointments || 1)) * 100) : 0}% of today`
        },
        {
            label: 'Pending Actions',
            value: (stats?.pending ?? 0) + referralMetrics.awaitingAction,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800/40',
            href: '/doctor/appointments?status=pending',
            sub: `${referralMetrics.awaitingAction} referral alerts`
        },
        {
            label: "Today's Earnings",
            value: `₹${(stats?.todaysEarnings ?? 0).toLocaleString('en-IN')}`,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-800/40',
            href: '/doctor/earnings',
            sub: `Consultation fee: ₹${doctorProfile?.consultation_fee || 0}`
        },
        {
            label: 'Total Patients',
            value: totalPatients,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800/40',
            href: '/doctor/patients',
            sub: 'Unique patients served'
        },
        {
            label: 'Average Rating',
            value: formattedRating,
            icon: Star,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-100 dark:border-yellow-800/40',
            href: '/doctor/reviews',
            sub: ratingSubtext
        },
    ];

    if (isLoading && !stats) {
        return <DashboardSkeleton />;
    }

    return (
        <>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <WelcomeTour />
            <OnboardingPopup 
                isOpen={showOnboardingPopup} 
                onClose={() => setShowOnboardingPopup(false)} 
                onComplete={() => fetchDashboardData()} 
            />

            {/* Real-time Appointment Alert */}
            {newApptAlert && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse shadow-sm">
                    <Bell className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-sm">🔔 {newApptAlert}</span>
                    <button onClick={() => setNewApptAlert(null)} className="ml-auto text-emerald-700 dark:text-emerald-400 hover:underline text-xs font-bold">Dismiss</button>
                </div>
            )}

            {/* 1. Header Greeting & Status Overview */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-full max-w-sm h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                                <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse" /> Practice Active
                            </span>
                            {doctorProfile?.specialization && (
                                <span className="text-xs text-emerald-200 font-medium hidden sm:inline">
                                    • {doctorProfile.specialization}
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            {getGreeting()}, {formatDoctorFirstName(user?.name) || 'Doctor'}!
                        </h1>
                        <p className="text-emerald-100/90 text-sm mt-1 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 opacity-75" />
                            {currentTime.toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <Link href="/doctor/journey">
                            <Button variant="secondary" className="bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/40 border border-emerald-400/30 gap-2 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 font-bold text-xs h-10 px-4">
                                <Star className="h-4 w-4 text-emerald-200 fill-emerald-200" /> My Journey
                            </Button>
                        </Link>
                        
                        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5 min-w-[160px] text-right">
                            <p className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">Next Appointment</p>
                            {(() => {
                                if (!nextAppointment) return <p className="font-bold text-emerald-100 text-sm mt-0.5">No upcoming</p>;
                                const timeStr = nextAppointment.time || nextAppointment.timeSlot || '';
                                const isExpired = Boolean(
                                    nextAppointment &&
                                    isAppointmentTimePast(
                                        nextAppointment.date || nextAppointment.appointment_date,
                                        nextAppointment.time || nextAppointment.timeSlot || nextAppointment.time_slot,
                                        nowMs
                                    )
                                );
                                return isExpired ? (
                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        <p className="font-bold text-red-300 text-xs">⚠️ Overdue ({timeStr})</p>
                                    </div>
                                ) : (
                                    <p className="font-bold text-white text-sm mt-0.5 flex items-center justify-end gap-1">
                                        {nextAppointment.type === 'Video' ? <Video className="w-3.5 h-3.5 text-blue-300" /> : <User className="w-3.5 h-3.5 text-emerald-300" />}
                                        {timeStr}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval & Verification Notices */}
            {doctorProfile && doctorProfile.approval_status === 'rejected' && (
                <RejectionBanner profile={doctorProfile} onReupload={fetchDashboardData} />
            )}

            {doctorProfile && doctorProfile.approval_status !== 'approved' && (
                <VerificationProgressCard profile={doctorProfile} />
            )}

            {doctorProfile && doctorProfile.approval_status === 'approved' && (
                <OnboardingChecklist profile={doctorProfile} variant="reminder" className="mb-6" />
            )}

            {/* 1. TOP KPI / PRACTICE OVERVIEW GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {TOP_METRICS.map((metric) => (
                    <Link href={metric.href} key={metric.label} className="block group">
                        <div className={`p-4 rounded-3xl border ${metric.bg} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between h-full bg-white dark:bg-[#111c2e]`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate pr-1">
                                    {metric.label}
                                </span>
                                <div className={`p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50 shrink-0`}>
                                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                </div>
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {metric.value}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium truncate">
                                    {metric.sub}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Main Content Layout (Two Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN (Schedule & Primary Operations - 8 cols on LG) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* 2. TODAY'S SCHEDULE SECTION */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Today&apos;s Schedule</h3>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Live consultation queue and patient attendance</p>
                                </div>
                            </div>
                            <Link href="/doctor/appointments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl transition-colors">
                                View all ({todaysAppointments.length}) <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {todaysAppointments.length === 0 ? (
                                <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">No appointments scheduled for today</p>
                                    <p className="text-xs text-gray-400 mt-1">When patients book online or walk-in, their appointments will appear here instantly.</p>
                                    <Link href="/doctor/schedule" className="inline-block mt-4">
                                        <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 rounded-xl">
                                            <Clock className="w-3.5 h-3.5 text-emerald-600" /> Manage Available Slots
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                todaysAppointments.map((appointment: Appointment) => {
                                    const consultationReady = canOpenConsultation(appointment);
                                    const consultationLive = ['in_progress', 'active'].includes(appointment.status);
                                    const isLaunching = launchingAppointmentId === appointment.id;
                                    const startTimingInfo = getAppointmentStartTimingInfo(
                                        appointment.date || appointment.appointment_date,
                                        appointment.time || appointment.timeSlot,
                                        nowMs
                                    );

                                    const isOverdue = ['scheduled', 'confirmed'].includes(appointment.status) &&
                                        isAppointmentTimePast(
                                            appointment.date || appointment.appointment_date,
                                            appointment.time || appointment.timeSlot || appointment.time_slot,
                                            nowMs
                                        );

                                    return (
                                        <div
                                            key={appointment.id}
                                            className={`flex flex-col rounded-2xl border transition-all ${
                                                isOverdue
                                                    ? 'border-red-300 dark:border-red-700/60 bg-red-50/30 dark:bg-red-950/20'
                                                    : consultationLive
                                                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20'
                                                    : 'border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 hover:border-gray-200 dark:hover:border-gray-700'
                                            }`}
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                                                setSelectedAppointment(appointment);
                                            }}
                                        >
                                            {isOverdue && (
                                                <div className="flex items-center justify-between gap-2 bg-red-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-t-2xl">
                                                    <span className="flex items-center gap-1">⚠️ Scheduled time passed</span>
                                                    <button 
                                                        onClick={() => openNewSchedule(appointment)}
                                                        className="underline text-[11px] hover:text-red-100 font-extrabold"
                                                    >
                                                        Reschedule Now ➔
                                                    </button>
                                                </div>
                                            )}

                                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/70 shadow-xs min-w-[70px] shrink-0 text-center">
                                                        <span className={`text-xs font-black ${isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                                                            {appointment.time || appointment.timeSlot || '—'}
                                                        </span>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                                                            {appointment.type === 'Video' ? 'Video' : 'In-Person'}
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Link
                                                                href={`/doctor/patients/${appointment.patientId || appointment.patient?.id || ''}`}
                                                                className="font-extrabold text-sm text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {appointment.patientName}
                                                            </Link>
                                                            <StatusBadge status={appointment.status} size="sm" />
                                                            {typeof appointment.reason === 'string' && Boolean(
                                                                appointment.reason.toLowerCase().includes('wellness') ||
                                                                appointment.reason.toLowerCase().includes('guardrail') ||
                                                                appointment.reason.toLowerCase().includes('coach')
                                                            ) && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                                                                    🚨 Guardrail
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                                            {appointment.reason || 'General Consultation'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                                    {consultationReady && (
                                                        <Button
                                                            size="sm"
                                                            className={`text-xs font-bold rounded-xl ${
                                                                isOverdue
                                                                    ? 'bg-gray-400 cursor-not-allowed opacity-60 text-white'
                                                                    : !startTimingInfo.canStart && !consultationLive
                                                                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed font-medium'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                            }`}
                                                            disabled={isLaunching || isOverdue || (!startTimingInfo.canStart && !consultationLive)}
                                                            onClick={() => handleOpenConsultation(appointment)}
                                                            title={
                                                                !startTimingInfo.canStart && !consultationLive
                                                                    ? 'Consultation can be started 10 minutes before the scheduled time'
                                                                    : 'Click to start consultation'
                                                            }
                                                        >
                                                            {isLaunching ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : consultationLive ? (
                                                                'Join Live Call'
                                                            ) : isOverdue ? (
                                                                'Reschedule First'
                                                            ) : (
                                                                startTimingInfo.label
                                                            )}
                                                        </Button>
                                                    )}

                                                    {consultationLive && (
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            className="text-xs font-bold rounded-xl"
                                                            onClick={() => handleEndConsultation(appointment)}
                                                        >
                                                            End
                                                        </Button>
                                                    )}

                                                    {!consultationReady && appointment.status === 'scheduled' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                                                            disabled={approvingId === appointment.id}
                                                            onClick={() => handleApprove(appointment)}
                                                        >
                                                            {approvingId === appointment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve'}
                                                        </Button>
                                                    )}

                                                    {['scheduled', 'confirmed'].includes(appointment.status) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs font-bold rounded-xl"
                                                            onClick={() => openNewSchedule(appointment)}
                                                            disabled={approvingId === appointment.id}
                                                        >
                                                            Reschedule
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs font-bold rounded-xl"
                                                        onClick={() => setSelectedAppointment(appointment)}
                                                    >
                                                        Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* 4. OVERALL PRACTICE & CONSULTATION PERFORMANCE */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Overall Practice Performance</h3>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Unified view of all direct clinic visits and Vaididea consultations</p>
                                </div>
                            </div>

                            {/* Period Filter Tabs */}
                            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl self-start sm:self-auto">
                                {(['today', '7d', '30d', '1y'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            setPerformancePeriod(p);
                                            loadAnalytics(p);
                                        }}
                                        className={`px-3 py-1 text-xs font-extrabold rounded-xl transition-all ${
                                            performancePeriod === p
                                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                                        }`}
                                    >
                                        {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'This Year'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingAnalytics ? (
                            <div className="py-8 text-center text-xs text-emerald-600 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading practice performance metrics...
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Overall Practice Key Metrics Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Patients</p>
                                            <Users className="w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                                            {analytics?.overallPractice?.totalPatients ?? totalPatients}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                                            <span className="text-blue-600 font-bold">{analytics?.overallPractice?.directPatients ?? 0} Direct</span>
                                            <span>•</span>
                                            <span className="text-emerald-600 font-bold">{analytics?.vaidideaImpact?.vaidideaPatients ?? 0} Vaididea</span>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Consults</p>
                                            <Activity className="w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                                            {analytics?.overallPractice?.totalConsultations ?? totalConsultsInPeriod}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                                            <span className="text-blue-600 font-bold">{analytics?.overallPractice?.directConsultations ?? 0} Direct</span>
                                            <span>•</span>
                                            <span className="text-emerald-600 font-bold">{analytics?.overallPractice?.vaidideaConsultations ?? 0} Vaididea</span>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Revenue</p>
                                            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                            ₹{(analytics?.overallPractice?.totalRevenue ?? periodRevenue).toLocaleString('en-IN')}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                                            <span className="text-blue-600 font-bold">₹{(analytics?.overallPractice?.directRevenue ?? 0).toLocaleString('en-IN')} Direct</span>
                                            <span>•</span>
                                            <span className="text-emerald-600 font-bold">₹{(analytics?.overallPractice?.vaidideaRevenue ?? 0).toLocaleString('en-IN')} Vaididea</span>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Completion Rate</p>
                                            <CheckCircle className="w-3.5 h-3.5 text-teal-500" />
                                        </div>
                                        <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">{completionRate}%</p>
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            {analytics?.overallPractice?.completedConsultations ?? (analytics?.summary?.completedAppointments || 0)} completed
                                        </p>
                                    </div>
                                </div>

                                {/* Source & Mode Breakdown Visualization */}
                                <div>
                                    <div className="flex justify-between items-center text-xs font-extrabold mb-2 text-gray-700 dark:text-gray-300">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                            Online Consults ({videoCount})
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                                            In-Person / Walk-in ({inPersonCount})
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                                        <div
                                            style={{ width: `${totalConsultsInPeriod > 0 ? (videoCount / totalConsultsInPeriod) * 100 : 50}%` }}
                                            className="bg-emerald-500 transition-all duration-500"
                                            title={`Video: ${videoCount}`}
                                        />
                                        <div
                                            style={{ width: `${totalConsultsInPeriod > 0 ? (inPersonCount / totalConsultsInPeriod) * 100 : 50}%` }}
                                            className="bg-blue-500 transition-all duration-500"
                                            title={`In-Person: ${inPersonCount}`}
                                        />
                                    </div>
                                </div>

                                {/* Source Channel Pills */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                    <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                                        <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-500 truncate">Walk-in Visits</p>
                                            <p className="text-xs font-black text-gray-900 dark:text-white">
                                                {analytics?.overallPractice?.sources?.directWalkIn || 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                                        <PhoneCall className="w-4 h-4 text-blue-600 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-500 truncate">Direct Phone Bookings</p>
                                            <p className="text-xs font-black text-gray-900 dark:text-white">
                                                {analytics?.overallPractice?.sources?.directAppointment || 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                                        <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-500 truncate">Vaididea Video</p>
                                            <p className="text-xs font-black text-gray-900 dark:text-white">
                                                {analytics?.overallPractice?.sources?.vaidideaOnline || videoCount}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-500 truncate">Vaididea Clinic</p>
                                            <p className="text-xs font-black text-gray-900 dark:text-white">
                                                {analytics?.overallPractice?.sources?.vaidideaInPerson || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 5 & 6. UNIVERSAL REFERRAL OVERVIEW & DESTINATIONS */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                                    <Share2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Universal Referral Network</h3>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Cross-facility patient referral exchange</p>
                                </div>
                            </div>
                            <Link href="/doctor/referrals" className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl transition-colors">
                                View All Referrals <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {loadingReferrals ? (
                            <div className="py-6 text-center text-xs text-purple-600 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading referral network...
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Sent Referral Pipeline */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Total Sent</p>
                                        <p className="text-lg font-black text-purple-700 dark:text-purple-300">{referralMetrics.totalSent}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Awaiting Consent</p>
                                        <p className="text-lg font-black text-amber-700 dark:text-amber-300">{referralMetrics.awaitingConsent}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Progress</p>
                                        <p className="text-lg font-black text-blue-700 dark:text-blue-300">{referralMetrics.inProgress + referralMetrics.accepted}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</p>
                                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{referralMetrics.completed}</p>
                                    </div>
                                </div>

                                {/* Destination Breakdown */}
                                <div>
                                    <p className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-2">Referrals Destination Breakdown</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 truncate">Hospitals</p>
                                                <p className="text-xs font-black text-gray-900 dark:text-white">{referralMetrics.destinationCounts.hospital || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <Pill className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 truncate">Pharmacies</p>
                                                <p className="text-xs font-black text-gray-900 dark:text-white">{referralMetrics.destinationCounts.pharmacy || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <Microscope className="w-4 h-4 text-purple-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 truncate">Diagnostics</p>
                                                <p className="text-xs font-black text-gray-900 dark:text-white">{referralMetrics.destinationCounts.diagnostic_center || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <Building2 className="w-4 h-4 text-teal-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 truncate">Clinics</p>
                                                <p className="text-xs font-black text-gray-900 dark:text-white">{referralMetrics.destinationCounts.clinic || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 7. YOUR VAIDIDEA IMPACT SECTION */}
                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-[#111c2e] rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-2xl bg-emerald-600 text-white">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Your Vaididea Impact</h3>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-300">Activity and practice growth generated exclusively through the Vaididea ecosystem</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100/70 dark:border-emerald-800/40 shadow-xs">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vaididea Patients</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                                    {analytics?.vaidideaImpact?.vaidideaPatients ?? analytics?.summary?.uniquePatients ?? totalPatients}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100/70 dark:border-emerald-800/40 shadow-xs">
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online Consults</p>
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {analytics?.vaidideaImpact?.onlineConsults ?? videoCount}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100/70 dark:border-emerald-800/40 shadow-xs">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In-Person Visits</p>
                                <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                                    {analytics?.vaidideaImpact?.inPersonVisits ?? (analytics?.overallPractice?.sources?.vaidideaInPerson || 0)}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100/70 dark:border-emerald-800/40 shadow-xs">
                                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Network Referrals</p>
                                <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                                    {analytics?.vaidideaImpact?.networkReferrals ?? (referralMetrics.totalSent + referralMetrics.received)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Actions, AI Insights, Reviews, Q&A - 4 cols on LG) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* 3. QUICK ACTIONS */}
                    <CustomizableQuickActions
                        userId={user?.id}
                        onRecordDirectVisit={openDirectVisitModal}
                    />

                    {/* 10. AI PRACTICE INSIGHTS */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                AI Practice Insights
                            </h3>
                            <Link href="/doctor/insights" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                                View All
                            </Link>
                        </div>

                        {loadingInsights ? (
                            <div className="py-4 text-center text-xs text-gray-400">Analyzing practice patterns...</div>
                        ) : insights.length === 0 ? (
                            <div className="py-4 text-center text-xs text-gray-400">
                                Practice trends are stable. Continue taking appointments to unlock more insights.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {insights.slice(0, 2).map((insight) => (
                                    <div key={insight.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                {insight.category}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{insight.title}</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{insight.description}</p>
                                        {insight.actionHref && (
                                            <Link href={insight.actionHref} className="inline-block mt-2 text-[10px] font-bold text-emerald-600 hover:underline">
                                                {insight.action || 'Take Action'} ➔
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 13. UPCOMING APPOINTMENTS */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Upcoming Appointments</h3>
                            <Link href="/doctor/appointments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                                View
                            </Link>
                        </div>
                        <div className="space-y-2.5">
                            {(!upcomingAppointments || upcomingAppointments.length === 0) ? (
                                <p className="text-xs text-gray-400 text-center py-4">No upcoming appointments scheduled.</p>
                            ) : (
                                upcomingAppointments.slice(0, 3).map((appointment: Appointment) => (
                                    <div 
                                        key={appointment.id} 
                                        className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                                        onClick={() => setSelectedAppointment(appointment)}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate">{appointment.patientName}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{appointment.appointment_date} • {appointment.time}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                                            appointment.type === 'Video' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {appointment.type}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 11. RECENT REVIEWS (STRICTLY ANONYMOUS) */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Recent Reviews</h3>
                            <Link href="/doctor/reviews" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-2.5">
                            {loadingReviews && reviews.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Loading verified reviews...</p>
                            ) : reviews.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">No reviews yet.</p>
                            ) : (
                                reviews.slice(0, 3).map((review) => (
                                    <div key={review.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                Anonymous Patient
                                                {review.is_verified && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50">
                                                        Verified
                                                    </span>
                                                )}
                                            </span>
                                            <div className="flex text-xs text-amber-400">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span key={i} className={i < review.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}>★</span>
                                                ))}
                                            </div>
                                        </div>
                                        {review.comment && (
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 italic line-clamp-2">&quot;{review.comment}&quot;</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 12. COMMUNITY Q&A */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                                <MessageCircleQuestion className="w-4 h-4 text-indigo-600" />
                                Community Q&A
                            </h3>
                            <Link href="/doctor/community" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-2.5">
                            {loadingQuestions ? (
                                <p className="text-xs text-gray-400 text-center py-4">Checking community questions...</p>
                            ) : recentQuestions.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">All caught up! No open community questions.</p>
                            ) : (
                                recentQuestions.map((q) => (
                                    <div key={q.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{q.title}</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{q.content}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-gray-400">Open for doctor response</span>
                                            <Link href="/doctor/community">
                                                <Button size="sm" className="h-6 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 rounded-lg">
                                                    Reply
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal: Keyboard Shortcut Help */}
        <KeyboardShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} shortcuts={allShortcuts} />

        {/* Modal: Reschedule Prompt */}
        {reschedulePrompt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
                onClick={(event) => {
                    if (event.target === event.currentTarget && approvingId !== reschedulePrompt.id) {
                        setReschedulePrompt(null);
                    }
                }}
            >
                <Card className="w-full max-w-md rounded-3xl p-6 shadow-xl border-0">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reschedule Past Appointment</h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                This appointment&apos;s requested time has passed. Would you like to reschedule it to 15 minutes from now and approve?
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" size="sm" onClick={() => setReschedulePrompt(null)} disabled={approvingId === reschedulePrompt.id} className="w-full sm:w-auto rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    setApprovingId(reschedulePrompt.id);
                                    await confirmAppointment(reschedulePrompt.id);
                                    setApprovingId(null);
                                    setReschedulePrompt(null);
                                }}
                                disabled={approvingId === reschedulePrompt.id}
                                className="w-full sm:w-auto rounded-xl"
                            >
                                Approve Past Time
                            </Button>
                            <Button variant="primary" size="sm" onClick={confirmReschedule} disabled={approvingId === reschedulePrompt.id} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold">
                                {approvingId === reschedulePrompt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reschedule & Approve'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}

        {/* Modal: New Schedule */}
        {newScheduleAppt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
                onClick={(event) => {
                    if (event.target === event.currentTarget && approvingId !== newScheduleAppt.id) {
                        setNewScheduleAppt(null);
                    }
                }}
            >
                <Card className="w-full max-w-md rounded-3xl p-6 shadow-xl border-0">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Give New Schedule</h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Set a new date and time for {newScheduleAppt.patientName}. The patient will be notified automatically.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">New Date</label>
                            <Input
                                type="date"
                                value={newScheduleDate}
                                onChange={(e) => setNewScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">New Time</label>
                            <Input
                                type="time"
                                value={newScheduleTime}
                                onChange={(e) => setNewScheduleTime(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" size="sm" onClick={() => setNewScheduleAppt(null)} disabled={approvingId === newScheduleAppt.id} className="w-full sm:w-auto rounded-xl">
                                Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={submitNewSchedule} disabled={approvingId === newScheduleAppt.id} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl">
                                {approvingId === newScheduleAppt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save New Schedule'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}

        {/* Modal: Patient & Appointment Details */}
        {selectedAppointment && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
                onClick={(e) => { if (e.target === e.currentTarget) setSelectedAppointment(null); }}
            >
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white dark:bg-[#0f1929]/20 rounded-2xl p-2.5">
                                    <User className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <Link
                                        href={`/doctor/patients/${selectedAppointment.patientId || selectedAppointment.patient?.id || ''}`}
                                        className="text-lg font-black text-white hover:underline flex items-center gap-1.5"
                                    >
                                        <span>{selectedAppointment.patientName}</span>
                                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                                    </Link>
                                    <p className="text-emerald-100 text-xs mt-0.5">
                                        {selectedAppointment.appointment_date} • {selectedAppointment.time || selectedAppointment.timeSlot}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAppointment(null)}
                                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white dark:bg-[#0f1929]/10 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Vitals Summary */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Age</p>
                                <p className="text-base font-black text-gray-900 dark:text-white">
                                    {selectedAppointment.patient?.date_of_birth
                                        ? `${Math.floor((new Date().getTime() - new Date(selectedAppointment.patient.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs`
                                        : '—'}
                                </p>
                            </div>
                            <div className="bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/30">
                                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Gender</p>
                                <p className="text-base font-black text-gray-900 dark:text-white capitalize">
                                    {selectedAppointment.patient?.gender || '—'}
                                </p>
                            </div>
                            <div className="bg-red-50/60 dark:bg-red-950/20 rounded-2xl p-3 border border-red-100 dark:border-red-900/30">
                                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Blood Group</p>
                                <p className="text-base font-black text-gray-900 dark:text-white">
                                    {selectedAppointment.patient?.blood_group || '—'}
                                </p>
                            </div>
                            <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Weight / Height</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">
                                    {selectedAppointment.patient?.weight ? `${selectedAppointment.patient.weight}kg` : '—'}
                                    {' / '}
                                    {selectedAppointment.patient?.height ? `${selectedAppointment.patient.height}cm` : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Consultation Reason */}
                        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reason for Consultation</p>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {Array.isArray(selectedAppointment.reason) ? selectedAppointment.reason.join(', ') : (typeof selectedAppointment.reason === 'object' && selectedAppointment.reason !== null ? JSON.stringify(selectedAppointment.reason) : selectedAppointment.reason)
                                    || selectedAppointment.patient_notes
                                    || (!Array.isArray(selectedAppointment.symptoms) || selectedAppointment.symptoms.length === 0 ? <span className="text-gray-400 italic">Not specified</span> : null)}
                            </p>
                            
                            {Array.isArray(selectedAppointment.symptoms) && selectedAppointment.symptoms.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Symptoms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedAppointment.symptoms.map((sym: string) => (
                                            <span key={sym} className="text-[11px] font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                                {sym}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Voice Note if present */}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(selectedAppointment as any).voice_note_url && (
                                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center gap-1">
                                        🎙️ Patient Audio Note Attached
                                    </p>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <audio src={(selectedAppointment as any).voice_note_url} controls className="w-full h-8" />
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between pt-2">
                            <span className={`text-xs px-3 py-1 rounded-xl font-bold ${
                                selectedAppointment.type === 'Video' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                                {selectedAppointment.type === 'Video' ? '📹 Video Call' : '🏥 In-Person'}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAppointment(null)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Record Direct / Walk-in Visit Modal */}
        {showDirectVisitModal && (
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="direct-visit-modal-title"
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
                onClick={() => setShowDirectVisitModal(false)}
            >
                <div
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden my-8"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f1929]/20 backdrop-blur flex items-center justify-center text-white">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 id="direct-visit-modal-title" className="text-lg font-bold">Record Direct / Walk-in Visit</h2>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-bold uppercase tracking-wider">
                                        Direct Practice
                                    </span>
                                </div>
                                <p className="text-xs text-emerald-100 font-medium mt-0.5">Capture offline clinic consultations & practice history (Not Vaididea)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDirectVisitModal(false)}
                            className="w-8 h-8 rounded-full bg-white dark:bg-[#0f1929]/10 hover:bg-white dark:bg-[#0f1929]/20 text-white flex items-center justify-center transition"
                            aria-label="Close modal"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={(e) => handleRecordDirectVisitSubmit(e, false)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                        {directVisitSuccess && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span>{directVisitSuccess}</span>
                            </div>
                        )}

                        {directVisitError && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                <span>{directVisitError}</span>
                            </div>
                        )}

                        {/* Patient Lookup Section */}
                        <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-700/60 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Patient Phone Number <span className="text-rose-500">*</span>
                                </label>
                                {isSearchingPhone && (
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Checking patient records...
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    type="tel"
                                    placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                                    value={directPhone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    maxLength={14}
                                    className="pl-3 rounded-xl border-slate-300 dark:border-gray-700 font-medium text-sm"
                                    required
                                />
                            </div>

                            {foundPatient ? (
                                <div className="p-3 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Existing patient found: <strong>{foundPatient.name}</strong> ({foundPatient.gender || 'Unknown'}, {foundPatient.age ? `${foundPatient.age} yrs` : 'Age N/A'})</span>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded-full font-bold">Auto-Linked</span>
                                </div>
                            ) : directPhone.replace(/\D/g, '').length === 10 && !isSearchingPhone ? (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs flex items-center gap-2 text-blue-800 dark:text-blue-200">
                                    <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span>New patient record will be securely created for this practice visit.</span>
                                </div>
                            ) : null}
                        </div>

                        {/* Patient Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Patient Full Name <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Rajesh Sharma"
                                    value={directPatientName}
                                    onChange={(e) => setDirectPatientName(e.target.value)}
                                    className="rounded-xl border-slate-300 dark:border-gray-700 text-sm font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Gender
                                </label>
                                <select
                                    value={directGender}
                                    onChange={(e) => setDirectGender(e.target.value as any)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Age (Years)
                                </label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 35"
                                    min="0"
                                    max="125"
                                    value={directAge}
                                    onChange={(e) => setDirectAge(e.target.value)}
                                    className="rounded-xl border-slate-300 dark:border-gray-700 text-sm font-medium"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Visit Type
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDirectVisitType('walk_in')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                            directVisitType === 'walk_in'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-300 shadow-sm'
                                                : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <Building2 className="w-3.5 h-3.5" /> Walk-in Clinic
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDirectVisitType('direct_appointment')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                            directVisitType === 'direct_appointment'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-300 shadow-sm'
                                                : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <PhoneCall className="w-3.5 h-3.5" /> Direct Phone
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDirectVisitType('home_visit')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                            directVisitType === 'home_visit'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-300 shadow-sm'
                                                : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <Home className="w-3.5 h-3.5" /> Home Visit
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Financial / Billing Info */}
                        <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-700/60 space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Billing & Payment Details
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Consultation Fee (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={directFee}
                                        onChange={(e) => setDirectFee(Number(e.target.value))}
                                        className="rounded-xl border-slate-300 dark:border-gray-700 text-sm font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Payment Status
                                    </label>
                                    <select
                                        value={directPaymentStatus}
                                        onChange={(e) => setDirectPaymentStatus(e.target.value as any)}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending / Due</option>
                                        <option value="waived">Waived / Complimentary</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Payment Method
                                    </label>
                                    <select
                                        value={directPaymentMethod}
                                        onChange={(e) => setDirectPaymentMethod(e.target.value as any)}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI (GPay/PhonePe/Paytm)</option>
                                        <option value="card">Card / POS</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Clinical Consultation Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Reason for Visit / Chief Complaint
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Acute viral fever, chronic headache, routine check-up"
                                    value={directReason}
                                    onChange={(e) => setDirectReason(e.target.value)}
                                    className="rounded-xl border-slate-300 dark:border-gray-700 text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Clinical Diagnosis / Assessment
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Upper Respiratory Tract Infection (URTI)"
                                    value={directDiagnosis}
                                    onChange={(e) => setDirectDiagnosis(e.target.value)}
                                    className="rounded-xl border-slate-300 dark:border-gray-700 text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Doctor's Consultation Notes
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Add clinical observations, prescribed regimen summary, or follow-up instructions..."
                                    value={directNotes}
                                    onChange={(e) => setDirectNotes(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDirectVisitModal(false)}
                                disabled={isSubmittingDirectVisit || isSavingAndPrescribing}
                                className="rounded-xl px-4 font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleRecordDirectVisitSubmit(undefined, false)}
                                disabled={isSubmittingDirectVisit || isSavingAndPrescribing}
                                className="rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2"
                            >
                                {isSubmittingDirectVisit ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Saving Visit...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" /> Save Visit
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleRecordDirectVisitSubmit(undefined, true)}
                                disabled={isSubmittingDirectVisit || isSavingAndPrescribing}
                                className="rounded-xl px-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 flex items-center gap-2"
                            >
                                {isSavingAndPrescribing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Preparing Prescription...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4" /> Save & Create Prescription
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
}
