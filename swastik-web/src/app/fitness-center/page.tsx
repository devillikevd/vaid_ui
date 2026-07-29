'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CalendarCheck,
    CheckCircle,
    Clipboard,
    Copy,
    MapPin,
    RefreshCw,
    Store,
    TicketCheck,
    UserPlus,
    Users,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { wellnessApi } from '@/lib/api';

interface FitnessCenter {
    id: string;
    name: string;
    center_type?: string | null;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    email?: string | null;
    facilities?: string[];
    equipment?: string[];
    amenities?: string[];
    approval_status?: string;
    is_active?: boolean;
    is_verified?: boolean;
    rating?: number | string | null;
    total_reviews?: number | null;
    day_pass_price?: number | string | null;
    trial_class_price?: number | string | null;
}

interface WellnessCoachSummary {
    id?: string;
    name?: string | null;
    email?: string | null;
    profile_image_url?: string | null;
    coach_types?: string[];
    specialties?: string[];
    approval_status?: string | null;
    rating?: number | string | null;
    total_reviews?: number | null;
}

interface CenterTrainer {
    id: string;
    role?: string | null;
    joined_at?: string | null;
    coach?: WellnessCoachSummary | null;
}

interface TrainerInvite {
    id: string;
    invited_email?: string | null;
    invited_name?: string | null;
    role?: string | null;
    status: string;
    expires_at?: string | null;
    created_at?: string | null;
    invite_url?: string | null;
    accept_url?: string | null;
    coach?: WellnessCoachSummary | null;
}

interface FitnessClass {
    id: string;
    title: string;
    class_type?: string | null;
    level?: string | null;
    starts_at?: string | null;
    capacity?: number | null;
    booked_count?: number | null;
    price?: number | string | null;
}

interface OwnerDashboardData {
    center?: FitnessCenter | null;
    trainers?: CenterTrainer[];
    trainerInvites?: TrainerInvite[];
    upcomingClasses?: FitnessClass[];
    metrics?: {
        trainers?: number;
        pendingInvites?: number;
        totalBookings?: number;
        checkinsToday?: number;
    };
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Not scheduled';
    return new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const money = (value?: number | string | null) => {
    if (value === undefined || value === null || value === '') return 'Not set';
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return 'Not set';
    return `₹${amount.toLocaleString('en-IN')}`;
};

const humanize = (value?: string | null) => (value || '').replace(/_/g, ' ') || 'Not set';

export default function FitnessCenterDashboard() {
    const toast = useToast();
    const [data, setData] = useState<OwnerDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        name: '',
        role: 'trainer',
        specialties: '',
    });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null);
    const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

    const loadDashboard = useCallback(async (silent = false) => {
        if (silent) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);
        try {
            const response = await wellnessApi.getOwnerCenter();
            if (!response.success) throw new Error(response.error || 'Unable to load gym/studio dashboard.');
            setData((response.data || null) as OwnerDashboardData | null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load gym/studio dashboard.');
            setData(null);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const center = data?.center || null;
    const trainers = asArray<CenterTrainer>(data?.trainers);
    const invites = asArray<TrainerInvite>(data?.trainerInvites);
    const classes = asArray<FitnessClass>(data?.upcomingClasses);
    const metrics = data?.metrics || {};

    const visibleTags = useMemo(() => Array.from(new Set([
        ...asArray<string>(center?.facilities),
        ...asArray<string>(center?.equipment),
        ...asArray<string>(center?.amenities),
    ])).slice(0, 16), [center]);

    const pendingInvites = invites.filter((invite) => invite.status === 'pending');

    const createInvite = async (event: FormEvent) => {
        event.preventDefault();
        const email = inviteForm.email.trim();
        if (!email) {
            toast.error('Email required', 'Enter the trainer email to generate an invite link.');
            return;
        }

        setInviteLoading(true);
        setLatestInviteLink(null);
        try {
            const response = await wellnessApi.createTrainerInvite({
                email,
                invited_name: inviteForm.name.trim() || undefined,
                role: inviteForm.role.trim() || 'trainer',
                specialties: inviteForm.specialties.split(',').map((item) => item.trim()).filter(Boolean),
            });
            if (!response.success) throw new Error(response.error || 'Unable to create trainer invite.');
            const invite = response.data as TrainerInvite;
            const link = invite.invite_url || invite.accept_url || null;
            setLatestInviteLink(link);
            setInviteForm({ email: '', name: '', role: 'trainer', specialties: '' });
            toast.success('Trainer invite created', link ? 'Invite link is ready to share.' : 'Invite has been created.');
            await loadDashboard(true);
        } catch (err) {
            toast.error('Invite failed', err instanceof Error ? err.message : 'Unable to create trainer invite.');
        } finally {
            setInviteLoading(false);
        }
    };

    const copyInviteLink = async (link?: string | null) => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Copied', 'Trainer invite link copied.');
        } catch {
            toast.error('Copy failed', 'Browser clipboard permission was not available.');
        }
    };

    const cancelInvite = async (inviteId: string) => {
        setCancellingInviteId(inviteId);
        try {
            const response = await wellnessApi.cancelTrainerInvite(inviteId);
            if (!response.success) throw new Error(response.error || 'Unable to cancel invite.');
            toast.success('Invite cancelled', 'The pending trainer invite is no longer active.');
            await loadDashboard(true);
        } catch (err) {
            toast.error('Cancel failed', err instanceof Error ? err.message : 'Unable to cancel invite.');
        } finally {
            setCancellingInviteId(null);
        }
    };

    if (isLoading && !data) return <DashboardSkeleton />;

    if (error && !data) {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <p className="max-w-md text-center text-gray-600 dark:text-gray-400">{error}</p>
                <Button onClick={() => loadDashboard()} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-cyan-700 to-teal-800 p-6 text-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-cyan-100">Gym, Studio & Class Marketplace</p>
                        <h1 className="mt-1 text-2xl font-bold">{center?.name || 'Your Fitness Center'}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-cyan-50">
                            Invite trainers, manage marketplace readiness, track bookings, and keep your facility discovery data real.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                        <Store className="h-5 w-5 text-cyan-100" />
                        <div>
                            <p className="text-xs text-cyan-100">Approval</p>
                            <p className="text-sm font-semibold capitalize">{humanize(center?.approval_status || 'pending')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Attached Trainers" value={metrics.trainers ?? trainers.length} icon={Users} color="text-cyan-700" bg="bg-cyan-100" />
                <MetricCard label="Pending Invites" value={metrics.pendingInvites ?? pendingInvites.length} icon={UserPlus} color="text-amber-700" bg="bg-amber-100" />
                <MetricCard label="Total Bookings" value={metrics.totalBookings ?? 0} icon={TicketCheck} color="text-emerald-700" bg="bg-emerald-100" />
                <MetricCard label="Check-ins Today" value={metrics.checkinsToday ?? 0} icon={Clipboard} color="text-violet-700" bg="bg-violet-100" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card id="settings" className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Center Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{center?.name || 'Not loaded'}</p>
                            <p className="text-sm capitalize text-gray-500 dark:text-gray-400">{humanize(center?.center_type)}</p>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            {center?.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                    <span>{[center.address, center.city, center.state].filter(Boolean).join(', ')}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <ProfileStat label="Day Pass" value={money(center?.day_pass_price)} />
                                <ProfileStat label="Trial Class" value={money(center?.trial_class_price)} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {visibleTags.length > 0 ? visibleTags.map((tag) => (
                                <span key={tag} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                                    {tag}
                                </span>
                            )) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Facilities, equipment and amenities will appear after profile completion.</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {center?.is_verified ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm text-gray-600 dark:text-gray-400">{center?.is_verified ? 'Verified marketplace profile' : 'Verification pending'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card id="invites" className="xl:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Invite Trainer</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadDashboard(true)}
                            isLoading={isRefreshing}
                            leftIcon={<RefreshCw className="h-4 w-4" />}
                        >
                            Refresh
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={createInvite} className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                            <Input
                                label="Trainer Email"
                                type="email"
                                value={inviteForm.email}
                                onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                                placeholder="trainer@example.com"
                                required
                            />
                            <Input
                                label="Name"
                                value={inviteForm.name}
                                onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Optional"
                            />
                            <Input
                                label="Role"
                                value={inviteForm.role}
                                onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}
                                placeholder="trainer"
                            />
                            <Input
                                label="Specialties"
                                value={inviteForm.specialties}
                                onChange={(event) => setInviteForm((current) => ({ ...current, specialties: event.target.value }))}
                                placeholder="Yoga, Strength"
                            />
                            <div className="lg:col-span-4">
                                <Button type="submit" isLoading={inviteLoading} leftIcon={<UserPlus className="h-4 w-4" />}>
                                    Generate Invite Link
                                </Button>
                            </div>
                        </form>
                        {latestInviteLink && (
                            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/30 sm:flex-row sm:items-center">
                                <code className="min-w-0 flex-1 truncate text-xs text-cyan-900 dark:text-cyan-100">{latestInviteLink}</code>
                                <Button size="sm" variant="outline" onClick={() => copyInviteLink(latestInviteLink)} leftIcon={<Copy className="h-4 w-4" />}>
                                    Copy
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card id="trainers">
                    <CardHeader>
                        <CardTitle>Attached Trainers & Experts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {trainers.length === 0 ? (
                            <EmptyLine icon={Users} text="No trainers are attached yet. Send an invite link to onboard a gym trainer, yoga instructor or wellness expert." />
                        ) : trainers.map((trainer) => {
                            const coach = trainer.coach || {};
                            const tags = Array.from(new Set([
                                ...asArray<string>(coach.coach_types),
                                ...asArray<string>(coach.specialties),
                            ])).slice(0, 4);
                            return (
                                <div key={trainer.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{coach.name || 'Trainer'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{humanize(trainer.role)} • Joined {formatDateTime(trainer.joined_at)}</p>
                                        </div>
                                        <StatusBadge status={(coach.approval_status || 'pending') as any} size="sm" />
                                    </div>
                                    {tags.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {tags.map((tag) => (
                                                <span key={tag} className="rounded-full bg-lime-50 px-2 py-1 text-xs font-medium text-lime-700">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Trainer Invites</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {invites.length === 0 ? (
                            <EmptyLine icon={UserPlus} text="Trainer invites will appear here after you generate them." />
                        ) : invites.slice(0, 8).map((invite) => {
                            const link = invite.invite_url || invite.accept_url;
                            return (
                                <div key={invite.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{invite.invited_name || invite.coach?.name || invite.invited_email || 'Trainer invite'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{invite.invited_email || 'Coach selected from marketplace'} • {humanize(invite.role)}</p>
                                            <p className="mt-1 text-xs text-gray-400">Expires {formatDateTime(invite.expires_at)}</p>
                                        </div>
                                        <StatusBadge status={invite.status as any} size="sm" />
                                    </div>
                                    {invite.status === 'pending' && link && (
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                            <Button size="sm" variant="outline" onClick={() => copyInviteLink(link)} leftIcon={<Copy className="h-4 w-4" />}>
                                                Copy Link
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => cancelInvite(invite.id)}
                                                isLoading={cancellingInviteId === invite.id}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card id="classes">
                    <CardHeader>
                        <CardTitle>Upcoming Classes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {classes.length === 0 ? (
                            <EmptyLine icon={CalendarCheck} text="Upcoming class timetable will appear after classes are added." />
                        ) : classes.map((item) => (
                            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {[humanize(item.class_type), humanize(item.level), formatDateTime(item.starts_at)].filter(Boolean).join(' • ')}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-cyan-700">
                                    {(item.booked_count ?? 0)}/{item.capacity ?? 0} booked
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card id="analytics">
                    <CardHeader>
                        <CardTitle>Marketplace Readiness</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ReadinessItem done={!!center?.address && !!center?.city} label="Address and city" />
                        <ReadinessItem done={visibleTags.length > 0} label="Facilities and equipment" />
                        <ReadinessItem done={trainers.length > 0} label="Trainer roster" />
                        <ReadinessItem done={(metrics.totalBookings ?? 0) > 0} label="Booking activity" />
                        <ReadinessItem done={!!center?.is_verified} label="Verified profile" />
                        <ReadinessItem done={(classes.length > 0)} label="Class timetable" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
    color,
    bg,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bg: string;
}) {
    return (
        <Card>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
                <div className={`rounded-xl p-3 ${bg}`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                </div>
            </div>
        </Card>
    );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    );
}

function EmptyLine({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <Icon className="h-5 w-5 text-gray-400" />
            {text}
        </div>
    );
}

function ReadinessItem({ done, label }: { done: boolean; label: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            {done ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </div>
    );
}
