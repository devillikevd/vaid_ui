'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    CalendarCheck,
    CheckCircle,
    ClipboardList,
    Clock,
    Dumbbell,
    Film,
    IndianRupee,
    Loader2,
    MessageSquare,
    RefreshCw,
    Send,
    ShieldCheck,
    Star,
    Store,
    UserPlus,
    Users,
    Utensils,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useWellnessChat } from '@/hooks/useSocket';

interface CoachProfile {
    id: string;
    name: string;
    headline?: string | null;
    sub_role?: string | null;
    approval_status?: string;
    coach_types?: string[];
    specialties?: string[];
    expertise_tags?: string[];
    languages?: string[];
    session_modes?: string[];
    session_fee?: number | string;
    monthly_plan_fee?: number | string;
    rating?: number;
    total_reviews?: number;
    bio?: string | null;
    city?: string | null;
    is_available?: boolean;
    is_accepting_clients?: boolean;
}

interface CoachPatient {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    source?: string;
    totalSessions?: number;
    activePlans?: number;
    lastSessionAt?: string | null;
}

interface PatientAnalytics {
    patient: {
        id: string;
        name: string;
        medical_conditions?: string[];
        chronic_conditions?: string[];
    };
    metrics: {
        workoutsCompleted: number;
        activeDays: number;
        totalMinutes: number;
        totalCalories: number;
        avgDailySteps: number;
        currentStreak: number;
        longestStreak: number;
        painReports?: number;
    };
    recentWorkouts: unknown[];
    activePlans: unknown[];
    badges: unknown[];
    trend?: Array<{ date: string; steps?: number | null; activeCalories?: number | null; sleepMinutes?: number | null }>;
}

interface DietPlan {
    id: string;
    title: string;
    diet_type?: string;
    daily_calories?: number | null;
    status: string;
    patient?: { id?: string; name?: string | null } | null;
    assigned_at?: string | null;
}

interface CoachReel {
    id: string;
    title: string;
    video_url?: string | null;
    thumbnail_url?: string | null;
    category?: string;
    likes_count?: number;
    views_count?: number;
    status?: string;
}

interface WellnessSession {
    id: string;
    scheduled_at: string;
    status: string;
    session_type?: string;
    fee?: number | string;
    patient?: { id: string; name?: string | null };
    safety_flags?: string[];
}

interface WorkoutPlan {
    id: string;
    title: string;
    goal?: string;
    level?: string;
    plan_type?: string;
    minutes_per_session?: number;
    duration_weeks?: number;
}

interface ExerciseAsset {
    id: string;
    name: string;
    slug?: string;
    workout_type?: string;
    primary_muscle_group?: string;
    secondary_muscle_groups?: string[];
    level?: string;
    equipment?: string[];
    instructions?: string[];
    body_part?: string;
    target_muscle?: string;
    category?: string;
    animation_url?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
    asset_license?: string | null;
    asset_credit?: string | null;
}

interface FitnessCenter {
    id: string;
    name: string;
    center_type?: string;
    city?: string;
    rating?: number;
}

interface WellnessGroup {
    id: string;
    name: string;
    goal_tag?: string;
    city?: string | null;
    member_count?: number;
}

interface Supplement {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    is_verified?: boolean;
}

interface CenterInvite {
    id: string;
    invited_email?: string | null;
    invited_name?: string | null;
    role?: string | null;
    status: string;
    expires_at?: string | null;
    center?: {
        id?: string;
        name?: string | null;
        city?: string | null;
        address?: string | null;
        center_type?: string | null;
    } | null;
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const money = (value: number | string | undefined) => {
    if (value === undefined || value === null || value === '') return 'Not set';
    const amount = Number(value || 0);
    return `₹${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '0'}`;
};

const formatDateTime = (value: string) => {
    if (!value) return 'Not scheduled';
    return new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function WellnessDashboard() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();
    const toast = useToast();
    const inviteToken = searchParams.get('invite');
    const [profile, setProfile] = useState<CoachProfile | null>(null);
    const [sessions, setSessions] = useState<WellnessSession[]>([]);
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [chatDraft, setChatDraft] = useState('');
    const {
        messages: chatMessages,
        typingUsers: chatTypingUsers,
        historyLoading: chatHistoryLoading,
        loadHistory: reloadChatHistory,
        sendMessage: sendChatMessage,
        setTyping: setChatTyping,
    } = useWellnessChat(selectedSessionId);
    const [exercises, setExercises] = useState<ExerciseAsset[]>([]);
    const [centers, setCenters] = useState<FitnessCenter[]>([]);
    const [groups, setGroups] = useState<WellnessGroup[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [centerInvites, setCenterInvites] = useState<CenterInvite[]>([]);
    const [invitePreview, setInvitePreview] = useState<CenterInvite | null>(null);
    const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
    const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clients, setClients] = useState<CoachPatient[]>([]);
    const [coachPlans, setCoachPlans] = useState<WorkoutPlan[]>([]);
    const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
    const [reels, setReels] = useState<CoachReel[]>([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [analytics, setAnalytics] = useState<PatientAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const isNutritionist = profile?.sub_role === 'nutritionist';

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [profileResult, sessionResult, planResult, exerciseResult, centerResult, groupResult, supplementResult, inviteResult, clientResult, coachPlanResult, reelResult] = await Promise.all([
                wellnessApi.getCoachProfile(),
                wellnessApi.getSessions(),
                wellnessApi.getWorkoutPlans(undefined, 1, 6),
                wellnessApi.getExercises(undefined, 1, 12),
                wellnessApi.getFacilities(undefined, 1, 6),
                wellnessApi.getGroups(),
                wellnessApi.getSupplements(undefined, 1, 6),
                wellnessApi.getCoachCenterInvites('pending'),
                wellnessApi.getCoachPatients(),
                wellnessApi.getCoachWorkoutPlans(),
                wellnessApi.getCoachReels(),
            ]);

            if (!profileResult.success) {
                throw new Error(profileResult.error || 'Unable to load wellness coach profile.');
            }

            setProfile((profileResult.data || null) as CoachProfile | null);
            setSessions(asArray<WellnessSession>(sessionResult.data));
            setPlans(asArray<WorkoutPlan>(planResult.data));
            setExercises(asArray<ExerciseAsset>(exerciseResult.data));
            setCenters(asArray<FitnessCenter>(centerResult.data));
            setGroups(asArray<WellnessGroup>(groupResult.data));
            setSupplements(asArray<Supplement>(supplementResult.data));
            setCenterInvites(inviteResult.success ? asArray<CenterInvite>(inviteResult.data) : []);
            setClients(asArray<CoachPatient>(clientResult.success ? clientResult.data : []));
            setCoachPlans(asArray<WorkoutPlan>(coachPlanResult.success ? coachPlanResult.data : []));
            setReels(asArray<CoachReel>(reelResult.success ? reelResult.data : []));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load wellness dashboard.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!profile?.sub_role) return;
        if (profile.sub_role !== 'nutritionist') {
            setDietPlans([]);
            return;
        }
        let cancelled = false;
        wellnessApi.getCoachDietPlans().then((response) => {
            if (!cancelled) setDietPlans(response.success ? asArray<DietPlan>(response.data) : []);
        });
        return () => {
            cancelled = true;
        };
    }, [profile?.sub_role]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (!inviteToken) {
            setInvitePreview(null);
            setInvitePreviewError(null);
            return;
        }

        let cancelled = false;
        setInvitePreviewError(null);
        wellnessApi.getTrainerInvite(inviteToken).then((response) => {
            if (cancelled) return;
            if (response.success) {
                setInvitePreview((response.data || null) as CenterInvite | null);
            } else {
                setInvitePreview(null);
                setInvitePreviewError(response.error || 'Unable to load trainer invite.');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [inviteToken]);

    const respondToInvite = async (inviteIdOrToken: string, decision: 'accept' | 'reject', byToken = false) => {
        setInviteActionLoading(`${inviteIdOrToken}:${decision}`);
        try {
            const response = byToken
                ? await wellnessApi.respondTrainerInviteToken(inviteIdOrToken, decision)
                : await wellnessApi.respondCoachCenterInvite(inviteIdOrToken, decision);
            if (!response.success) throw new Error(response.error || 'Unable to respond to invite.');
            toast.success(decision === 'accept' ? 'Invite accepted' : 'Invite rejected', 'Your gym/studio invite has been updated.');
            if (byToken && inviteToken) {
                const preview = await wellnessApi.getTrainerInvite(inviteToken);
                setInvitePreview(preview.success ? (preview.data as CenterInvite) : null);
            }
            await loadDashboard();
        } catch (err) {
            toast.error('Invite update failed', err instanceof Error ? err.message : 'Unable to respond to invite.');
        } finally {
            setInviteActionLoading(null);
        }
    };

    const toggleAvailability = async (next: boolean) => {
        setAvailabilityLoading(true);
        try {
            const response = await wellnessApi.updateCoachAvailability({ is_accepting_clients: next });
            if (!response.success) throw new Error(response.error || 'Unable to update availability.');
            setProfile((current) => (current ? { ...current, is_accepting_clients: next } : current));
            toast.success(next ? 'Accepting new clients' : 'Paused new clients', 'Your availability preference was updated.');
        } catch (err) {
            toast.error('Availability update failed', err instanceof Error ? err.message : 'Unable to update availability.');
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const viewAnalytics = async (patientId: string) => {
        setAnalyticsLoading(true);
        setAnalytics(null);
        try {
            const response = await wellnessApi.getPatientAnalytics(patientId);
            if (!response.success) throw new Error(response.error || 'Unable to load client analytics.');
            setAnalytics(response.data as PatientAnalytics);
        } catch (err) {
            toast.error('Analytics load failed', err instanceof Error ? err.message : 'Unable to load client analytics.');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const createPlan = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const title = String(formData.get('planTitle') || '').trim();
        if (!title) return;
        try {
            const response = await wellnessApi.createCoachWorkoutPlan({
                title,
                goal: String(formData.get('planGoal') || 'general_fitness'),
                level: String(formData.get('planLevel') || 'beginner'),
                patient_id: String(formData.get('planPatient') || '') || undefined,
                assign: formData.get('planAssign') === 'on' || formData.get('planAssign') === 'true',
                is_public: true,
            });
            if (!response.success) throw new Error(response.error || 'Unable to create workout plan.');
            toast.success('Plan created', `"${title}" was added to your plan library.`);
            form.reset();
            const plansResponse = await wellnessApi.getCoachWorkoutPlans();
            setCoachPlans(plansResponse.success ? asArray<WorkoutPlan>(plansResponse.data) : []);
            await loadDashboard();
        } catch (err) {
            toast.error('Plan creation failed', err instanceof Error ? err.message : 'Unable to create workout plan.');
        }
    };

    const createDiet = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const title = String(formData.get('dietTitle') || '').trim();
        if (!title) return;
        try {
            const response = await wellnessApi.createDietPlan({
                title,
                diet_type: String(formData.get('dietType') || 'balanced'),
                daily_calories: Number(formData.get('dietCalories')) || undefined,
                patient_id: String(formData.get('dietPatient') || '') || undefined,
            });
            if (!response.success) throw new Error(response.error || 'Unable to create diet plan.');
            toast.success('Diet plan created', `"${title}" was saved.`);
            form.reset();
            const dietResponse = await wellnessApi.getCoachDietPlans();
            setDietPlans(dietResponse.success ? asArray<DietPlan>(dietResponse.data) : []);
        } catch (err) {
            toast.error('Diet plan creation failed', err instanceof Error ? err.message : 'Unable to create diet plan.');
        }
    };

    const archiveDiet = async (planId: string, title: string) => {
        try {
            const response = await wellnessApi.archiveDietPlan(planId);
            if (!response.success) throw new Error(response.error || 'Unable to archive diet plan.');
            toast.success('Diet plan archived', `"${title}" was archived.`);
            const dietResponse = await wellnessApi.getCoachDietPlans();
            setDietPlans(dietResponse.success ? asArray<DietPlan>(dietResponse.data) : []);
        } catch (err) {
            toast.error('Archive failed', err instanceof Error ? err.message : 'Unable to archive diet plan.');
        }
    };

    const createReel = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const videoUrl = String(formData.get('reelUrl') || '').trim();
        if (!videoUrl) return;
        try {
            const response = await wellnessApi.createReel({
                video_url: videoUrl,
                title: String(formData.get('reelTitle') || 'Fitness tip').trim(),
                category: String(formData.get('reelCategory') || 'fitness'),
            });
            if (!response.success) throw new Error(response.error || 'Unable to publish reel.');
            toast.success('Reel published', 'Your reel is live on the marketplace.');
            form.reset();
            const reelResponse = await wellnessApi.getCoachReels();
            setReels(reelResponse.success ? asArray<CoachReel>(reelResponse.data) : []);
        } catch (err) {
            toast.error('Reel publish failed', err instanceof Error ? err.message : 'Unable to publish reel.');
        }
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const thisMonth = new Date().toISOString().slice(0, 7);
        const uniqueClients = new Set(sessions.map((session) => session.patient?.id).filter(Boolean));
        const todaySessions = sessions.filter((session) => session.scheduled_at?.slice(0, 10) === today);
        const monthRevenue = sessions
            .filter((session) => session.scheduled_at?.slice(0, 7) === thisMonth && !['cancelled', 'refunded'].includes(session.status))
            .reduce((sum, session) => sum + Number(session.fee || 0), 0);
        return {
            activeClients: uniqueClients.size,
            todaySessions: todaySessions.length,
            monthRevenue,
            plansAvailable: plans.length,
        };
    }, [plans.length, sessions]);

    const upcomingSessions = sessions
        .filter((session) => new Date(session.scheduled_at).getTime() >= Date.now())
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 5);

    const coachTags = Array.from(new Set([
        ...asArray<string>(profile?.coach_types),
        ...asArray<string>(profile?.specialties),
        ...asArray<string>(profile?.expertise_tags),
    ])).slice(0, 8);

    if (isLoading && !profile) return <DashboardSkeleton />;

    if (error && !profile) {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <p className="max-w-md text-center text-gray-600 dark:text-gray-400">{error}</p>
                <Button onClick={loadDashboard} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-lime-700 to-emerald-800 p-6 text-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-lime-100">Wellness Coaching Console</p>
                        <h1 className="mt-1 text-2xl font-bold">Welcome back, {profile?.name || user?.name || 'Coach'}.</h1>
                        <p className="mt-2 max-w-2xl text-sm text-lime-50">
                            {profile?.headline || 'Manage training, yoga, nutrition support, client sessions, and marketplace visibility from one place.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                        <ShieldCheck className="h-5 w-5 text-lime-100" />
                        <div>
                            <p className="text-xs text-lime-100">Approval</p>
                            <p className="text-sm font-semibold capitalize">{(profile?.approval_status || 'pending').replace(/_/g, ' ')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {(invitePreview || invitePreviewError || centerInvites.length > 0) && (
                <Card id="center-invites">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-lime-600" /> Gym & Studio Invites</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {invitePreviewError && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                {invitePreviewError}
                            </div>
                        )}
                        {invitePreview && (
                            <CenterInviteRow
                                invite={invitePreview}
                                actionLoading={inviteActionLoading}
                                actionKey={inviteToken || invitePreview.id}
                                onAccept={() => respondToInvite(inviteToken || invitePreview.id, 'accept', !!inviteToken)}
                                onReject={() => respondToInvite(inviteToken || invitePreview.id, 'reject', !!inviteToken)}
                            />
                        )}
                        {centerInvites
                            .filter((invite) => invite.id !== invitePreview?.id)
                            .map((invite) => (
                                <CenterInviteRow
                                    key={invite.id}
                                    invite={invite}
                                    actionLoading={inviteActionLoading}
                                    actionKey={invite.id}
                                    onAccept={() => respondToInvite(invite.id, 'accept')}
                                    onReject={() => respondToInvite(invite.id, 'reject')}
                                />
                            ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Active Clients', value: stats.activeClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: "Today's Sessions", value: stats.todaySessions, icon: CalendarCheck, color: 'text-lime-700', bg: 'bg-lime-100' },
                    { label: 'Month Revenue', value: money(stats.monthRevenue), icon: IndianRupee, color: 'text-emerald-700', bg: 'bg-emerald-100' },
                    { label: 'Plans Available', value: stats.plansAvailable, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-100' },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                                </div>
                                <div className={`rounded-xl p-3 ${stat.bg}`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card id="profile" className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Profile Readiness</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{profile?.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.city || 'Location not set'}</p>
                            </div>
                            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                {profile?.rating != null ? Number(profile.rating).toFixed(1) : 'No rating'}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {coachTags.length > 0 ? coachTags.map((tag) => (
                                <span key={tag} className="rounded-full bg-lime-50 px-3 py-1 text-xs font-medium text-lime-700">
                                    {tag}
                                </span>
                            )) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">Add specialties during profile review.</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <p className="text-gray-500 dark:text-gray-400">Session</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{money(profile?.session_fee)}</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <p className="text-gray-500 dark:text-gray-400">Monthly</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{money(profile?.monthly_plan_fee)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card id="sessions" className="xl:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Upcoming Sessions</CardTitle>
                        <Button size="sm" variant="outline" onClick={loadDashboard} leftIcon={<RefreshCw className="h-4 w-4" />}>
                            Refresh
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {upcomingSessions.length === 0 ? (
                                <EmptyLine icon={CalendarCheck} text="No upcoming coaching sessions yet." />
                            ) : upcomingSessions.map((session) => (
                                <div key={session.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-lime-50 p-2 text-lime-700">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{session.patient?.name || 'Client'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(session.scheduled_at)} • {session.session_type || 'video'}</p>
                                        </div>
                                        <StatusBadge status={session.status as any} size="sm" />
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={selectedSessionId === session.id ? 'primary' : 'outline'}
                                        onClick={() => setSelectedSessionId((current) => (current === session.id ? null : session.id))}
                                        leftIcon={<MessageSquare className="h-4 w-4" />}
                                    >
                                        Chat
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card id="coach-chat" className="xl:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Session Chat</CardTitle>
                        {selectedSessionId && (
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={reloadChatHistory} leftIcon={<RefreshCw className="h-4 w-4" />}>
                                    Reload
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedSessionId(null)} leftIcon={<XCircle className="h-4 w-4" />}>
                                    Close
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex h-[480px] flex-col">
                        {!selectedSessionId ? (
                            <EmptyLine icon={MessageSquare} text="Select a session to start chatting with your client." />
                        ) : (
                            <>
                                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                    {chatHistoryLoading && chatMessages.length === 0 && (
                                        <p className="flex items-center gap-2 text-sm text-gray-400">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
                                        </p>
                                    )}
                                    {chatMessages.length === 0 && !chatHistoryLoading && (
                                        <EmptyLine icon={MessageSquare} text="No messages yet. Say hello and share your session plan." />
                                    )}
                                    {chatMessages.map((message, index) => {
                                        const isMine = message.userId === user?.id;
                                        return (
                                            <div key={`${message.userId}-${message.timestamp}-${index}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                                    isMine
                                                        ? 'rounded-br-sm bg-lime-600 text-white'
                                                        : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'
                                                }`}>
                                                    <p className="whitespace-pre-wrap break-words">{message.message}</p>
                                                    <p className={`mt-1 text-[10px] ${isMine ? 'text-lime-100' : 'text-gray-400'}`}>
                                                        {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {chatTypingUsers.filter((id) => id !== user?.id).length > 0 && (
                                        <p className="text-xs text-gray-400">Client is typing…</p>
                                    )}
                                </div>
                                <form
                                    className="mt-3 flex items-center gap-2"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        if (!chatDraft.trim()) return;
                                        sendChatMessage(chatDraft);
                                        setChatDraft('');
                                        setChatTyping(false);
                                    }}
                                >
                                    <input
                                        value={chatDraft}
                                        onChange={(event) => {
                                            setChatDraft(event.target.value);
                                            setChatTyping(event.target.value.length > 0);
                                        }}
                                        onBlur={() => setChatTyping(false)}
                                        placeholder="Type a message…"
                                        className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                                        maxLength={2000}
                                    />
                                    <Button type="submit" size="sm" disabled={!chatDraft.trim()} leftIcon={<Send className="h-4 w-4" />}>
                                        Send
                                    </Button>
                                </form>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card id="clients">
                    <CardHeader>
                        <CardTitle>Client Safety Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sessions.length === 0 ? (
                            <EmptyLine icon={Users} text="Client list will populate from booked wellness sessions." />
                        ) : Array.from(new Map(sessions.map((session) => [session.patient?.id || session.id, session])).values()).slice(0, 5).map((session) => (
                            <div key={session.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{session.patient?.name || 'Client'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {asArray<string>(session.safety_flags).length > 0 ? `Safety flags: ${asArray<string>(session.safety_flags).join(', ')}` : 'No safety flags shared'}
                                    </p>
                                </div>
                                <Activity className="h-5 w-5 text-lime-600" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card id="plans">
                    <CardHeader>
                        <CardTitle>Workout Plan Library</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {plans.length === 0 ? (
                            <EmptyLine icon={Dumbbell} text="No active workout plans are published yet." />
                        ) : plans.slice(0, 5).map((plan) => (
                            <div key={plan.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{plan.title}</p>
                                    {plan.level && <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">{plan.level}</span>}
                                </div>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {[plan.goal, plan.minutes_per_session ? `${plan.minutes_per_session} min` : null, plan.duration_weeks ? `${plan.duration_weeks} weeks` : null].filter(Boolean).join(' • ') || 'Plan details not set'}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card id="exercise-assets" className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-lime-600" /> Exercise Animation Library</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {exercises.length === 0 ? (
                            <EmptyLine icon={Film} text="Licensed exercise assets will appear after exercise_library is populated." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {exercises.slice(0, 9).map((exercise) => (
                                    <ExerciseCard key={exercise.id} exercise={exercise} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card id="marketplace">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-lime-600" /> Marketplace</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {centers.length === 0 ? <EmptyLine icon={Store} text="Approved gyms and studios will appear here." /> : centers.slice(0, 4).map((center) => (
                            <div key={center.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{center.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{[center.center_type, center.city, center.rating != null ? `${Number(center.rating).toFixed(1)} rating` : null].filter(Boolean).join(' • ') || 'Center details not set'}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card id="community">
                    <CardHeader>
                        <CardTitle>Communities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {groups.length === 0 ? <EmptyLine icon={Users} text="Goal-based communities will appear after seeding or user creation." /> : groups.slice(0, 4).map((group) => (
                            <div key={group.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{[group.goal_tag, group.member_count != null ? `${group.member_count} members` : null].filter(Boolean).join(' • ') || 'Community details not set'}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card id="supplements">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-orange-600" /> Nutrition Commerce</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {supplements.length === 0 ? <EmptyLine icon={Utensils} text="Trusted supplements will appear after catalogue approval." /> : supplements.slice(0, 4).map((item) => (
                            <div key={item.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                    {item.is_verified && <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Verified</span>}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{[item.brand, item.category].filter(Boolean).join(' • ') || 'Product details not set'}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card id="reviews">
                <CardHeader>
                    <CardTitle>Trust Signals</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <TrustTile label="Rating" value={profile?.rating != null ? Number(profile.rating).toFixed(1) : 'No rating'} />
                        <TrustTile label="Reviews" value={profile?.total_reviews != null ? String(profile.total_reviews) : 'No reviews'} />
                        <TrustTile label="Languages" value={asArray<string>(profile?.languages).slice(0, 3).join(', ') || 'Not set'} />
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Coach Production Tools</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profile?.sub_role ? `Primary role: ${profile.sub_role.replace(/_/g, ' ')}` : 'Select a primary role from profile settings.'}
                    </p>
                </div>
                {profile && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {profile.is_accepting_clients ? 'Accepting new clients' : 'Paused'}
                        </span>
                        <Button
                            size="sm"
                            variant={profile.is_accepting_clients ? 'primary' : 'outline'}
                            onClick={() => toggleAvailability(!profile.is_accepting_clients)}
                            isLoading={availabilityLoading}
                        >
                            {profile.is_accepting_clients ? 'Pause intake' : 'Resume intake'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card id="clients-list">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-lime-600" /> Client Roster</CardTitle>
                        <Button size="sm" variant="outline" onClick={loadDashboard} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {clients.length === 0 ? (
                            <EmptyLine icon={Users} text="Clients appear here once sessions are booked or you assign plans." />
                        ) : clients.map((client) => (
                            <div key={client.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{client.name || 'Client'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {[client.city, client.totalSessions ? `${client.totalSessions} sessions` : null, client.activePlans ? `${client.activePlans} active plan${client.activePlans > 1 ? 's' : ''}` : null].filter(Boolean).join(' • ') || 'No activity yet'}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => viewAnalytics(client.id)} isLoading={analyticsLoading && analytics?.patient?.id === client.id}>
                                        Analytics
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card id="coach-analytics">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-lime-600" /> Client Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!analytics ? (
                            <EmptyLine icon={Activity} text="Select a client to view a 30-day wellness snapshot." />
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{analytics.patient.name}</p>
                                    {asArray<string>(analytics.patient.medical_conditions).length > 0 && (
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                            Medical flags: {asArray<string>(analytics.patient.medical_conditions).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {[
                                        { label: 'Workouts', value: analytics.metrics.workoutsCompleted },
                                        { label: 'Active days', value: analytics.metrics.activeDays },
                                        { label: 'Minutes', value: analytics.metrics.totalMinutes },
                                        { label: 'Kcal burned', value: analytics.metrics.totalCalories },
                                        { label: 'Avg steps', value: analytics.metrics.avgDailySteps },
                                        { label: 'Streak', value: analytics.metrics.currentStreak },
                                    ].map((metric) => (
                                        <div key={metric.label} className="rounded-xl border border-gray-100 p-3 text-center dark:border-gray-800">
                                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metric.value}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
                                        </div>
                                    ))}
                                </div>
                                {analytics.trend && analytics.trend.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Daily step trend</p>
                                        <div className="flex h-20 items-end gap-1">
                                            {analytics.trend.slice(-14).map((day) => (
                                                <div
                                                    key={day.date}
                                                    title={`${day.date}: ${day.steps ?? 'n/a'} steps`}
                                                    className="flex-1 rounded-t bg-lime-200 dark:bg-lime-800"
                                                    style={{ height: `${Math.min(100, Math.max(4, Math.round(((day.steps ?? 0) / 12000) * 100)))}%` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card id="plan-builder">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-lime-600" /> Workout Plan Builder</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={createPlan} className="space-y-3">
                            <input name="planTitle" placeholder="Plan title (e.g. 4-week home strength)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900" required />
                            <div className="grid grid-cols-2 gap-3">
                                <select name="planLevel" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                                <select name="planGoal" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="general_fitness">General fitness</option>
                                    <option value="weight_loss">Weight loss</option>
                                    <option value="strength">Strength</option>
                                    <option value="stress_reduction">Stress reduction</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <select name="planPatient" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="">No client yet</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>{client.name || 'Client'}</option>
                                    ))}
                                </select>
                                <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700">
                                    <input name="planAssign" type="checkbox" className="h-4 w-4" />
                                    Assign now
                                </label>
                            </div>
                            <Button type="submit" className="w-full" leftIcon={<ClipboardList className="h-4 w-4" />}>Create plan</Button>
                        </form>
                        {coachPlans.length > 0 && (
                            <div className="space-y-2">
                                {coachPlans.slice(0, 4).map((plan) => (
                                    <div key={plan.id} className="rounded-xl border border-gray-100 p-2.5 text-sm dark:border-gray-800">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{plan.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{[plan.level, plan.goal].filter(Boolean).join(' • ') || 'Draft'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {isNutritionist && (
                    <Card id="diet-plans">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-orange-600" /> Diet Plans</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={createDiet} className="space-y-3">
                                <input name="dietTitle" placeholder="Diet plan title" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900" required />
                                <div className="grid grid-cols-2 gap-3">
                                    <select name="dietType" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                        <option value="balanced">Balanced</option>
                                        <option value="weight_loss">Weight loss</option>
                                        <option value="vegetarian">Vegetarian</option>
                                        <option value="vegan">Vegan</option>
                                        <option value="keto">Keto</option>
                                    </select>
                                    <input name="dietCalories" type="number" placeholder="Daily kcal" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
                                </div>
                                <select name="dietPatient" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="">General plan (no client)</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>{client.name || 'Client'}</option>
                                    ))}
                                </select>
                                <Button type="submit" className="w-full" leftIcon={<Utensils className="h-4 w-4" />}>Create diet plan</Button>
                            </form>
                            {dietPlans.length > 0 && (
                                <div className="space-y-2">
                                    {dietPlans.slice(0, 4).map((plan) => (
                                        <div key={plan.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-2.5 text-sm dark:border-gray-800">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{plan.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {[plan.diet_type, plan.daily_calories ? `${plan.daily_calories} kcal` : null, plan.patient?.name].filter(Boolean).join(' • ') || 'General plan'}
                                                </p>
                                            </div>
                                            {plan.status === 'active' && (
                                                <Button size="sm" variant="outline" onClick={() => archiveDiet(plan.id, plan.title)}>Archive</Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card id="reels-manager">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-lime-600" /> Reels</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={createReel} className="space-y-3">
                            <input name="reelUrl" placeholder="Video URL (e.g. https://…/short.mp4)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900" required />
                            <div className="grid grid-cols-2 gap-3">
                                <input name="reelTitle" placeholder="Short title" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
                                <select name="reelCategory" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="fitness">Fitness</option>
                                    <option value="yoga">Yoga</option>
                                    <option value="nutrition">Nutrition</option>
                                    <option value="mobility">Mobility</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full" leftIcon={<Film className="h-4 w-4" />}>Publish reel</Button>
                        </form>
                        {reels.length > 0 && (
                            <div className="space-y-2">
                                {reels.slice(0, 4).map((reel) => (
                                    <div key={reel.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-2.5 text-sm dark:border-gray-800">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{reel.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {[reel.category, reel.views_count != null ? `${reel.views_count} views` : null, reel.likes_count != null ? `${reel.likes_count} likes` : null].filter(Boolean).join(' • ') || 'Published'}
                                            </p>
                                        </div>
                                        <StatusBadge status={reel.status as any} size="sm" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {isLoading && (
                <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-lg dark:bg-gray-900">
                    <Loader2 className="h-4 w-4 animate-spin text-lime-600" />
                    Updating
                </div>
            )}
        </div>
    );
}

function ExerciseCard({ exercise }: { exercise: ExerciseAsset }) {
    const [isHovered, setIsHovered] = useState(false);
    const hasMedia = exercise.thumbnail_url || exercise.animation_url;
    const displayUrl = isHovered && exercise.animation_url ? exercise.animation_url : exercise.thumbnail_url;
    const equipmentLabel = asArray<string>(exercise.equipment).slice(0, 2).map((e) => e.replace(/_/g, ' ')).join(', ');

    return (
        <div
            className="group overflow-hidden rounded-xl border border-gray-100 transition-all hover:border-lime-200 hover:shadow-md dark:border-gray-800 dark:hover:border-lime-900"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {hasMedia ? (
                <div className="relative aspect-square w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={displayUrl || ''}
                        alt={exercise.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                    {exercise.animation_url && (
                        <div className="absolute right-2 top-2 rounded-full bg-lime-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                            {isHovered ? '▶ GIF' : 'Hover to animate'}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <Dumbbell className="h-10 w-10 text-gray-300 dark:text-gray-700" />
                    <p className="mt-2 text-xs text-gray-400">No media</p>
                </div>
            )}
            <div className="p-3">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {exercise.target_muscle && (
                        <span className="rounded-full bg-lime-50 px-2 py-0.5 text-[10px] font-medium text-lime-700 dark:bg-lime-950 dark:text-lime-400">
                            {exercise.target_muscle}
                        </span>
                    )}
                    {exercise.body_part && exercise.body_part !== exercise.target_muscle && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                            {exercise.body_part}
                        </span>
                    )}
                    {exercise.level && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                            {exercise.level}
                        </span>
                    )}
                </div>
                {equipmentLabel && (
                    <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{equipmentLabel}</p>
                )}
            </div>
        </div>
    );
}

function EmptyLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <Icon className="h-5 w-5 text-gray-400" />
            {text}
        </div>
    );
}

function CenterInviteRow({
    invite,
    actionKey,
    actionLoading,
    onAccept,
    onReject,
}: {
    invite: CenterInvite;
    actionKey: string;
    actionLoading: string | null;
    onAccept: () => void;
    onReject: () => void;
}) {
    const canRespond = invite.status === 'pending';
    return (
        <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{invite.center?.name || 'Fitness center invite'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {[invite.center?.center_type?.replace(/_/g, ' '), invite.center?.city, invite.role].filter(Boolean).join(' • ') || 'Trainer invitation'}
                    </p>
                    {invite.expires_at && <p className="mt-1 text-xs text-gray-400">Expires {formatDateTime(invite.expires_at)}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={invite.status as any} size="sm" />
                    {canRespond && (
                        <>
                            <Button
                                size="sm"
                                onClick={onAccept}
                                isLoading={actionLoading === `${actionKey}:accept`}
                                leftIcon={<CheckCircle className="h-4 w-4" />}
                            >
                                Accept
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onReject}
                                isLoading={actionLoading === `${actionKey}:reject`}
                                leftIcon={<XCircle className="h-4 w-4" />}
                            >
                                Reject
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function TrustTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    );
}
