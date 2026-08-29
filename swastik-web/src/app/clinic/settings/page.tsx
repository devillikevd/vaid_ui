/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Bell,
    Building,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    EyeOff,
    FolderKanban,
    Grid,
    Lock,
    MapPin,
    Palette,
    RefreshCw,
    Search,
    ShieldCheck,
    Stethoscope,
    ChevronRight,
    ArrowLeft,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useClinicStore } from '@/stores/clinicStore';
import { clinicApi } from '@/lib/api';
import { getResubmissionSuccessMessage, refreshAuthenticatedUser } from '@/lib/authSession';
import { ClinicProfileCompletionCard } from '@/components/clinic/ClinicProfileCompletionCard';
import { ProfileSection } from './_components/ProfileSection';
import { OrganizationSection } from './_components/OrganizationSection';
import { LocationSection } from './_components/LocationSection';
import { DepartmentsSection } from './_components/DepartmentsSection';
import { ScheduleSection } from './_components/ScheduleSection';
import { StaffSection } from './_components/StaffSection';
import { InvitationsSection } from './_components/InvitationsSection';
import { NotificationsSection } from './_components/NotificationsSection';
import { VerificationSection } from './_components/VerificationSection';
import { SecuritySection } from './_components/SecuritySection';
import { AppearanceSection } from './_components/AppearanceSection';
import {
    BillingSection,
    ConnectedServicesSection,
    ConsultationServicesSection,
    PrivacySection,
} from './_components/ComingSoonSections';
import { normalizeClinicProfile, type ClinicProfile } from './_components/types';
import { cn } from '@/lib/utils';

type SaveProfile = (fields: Record<string, unknown>, successMessage: string) => Promise<{
    ok: boolean;
    message: string;
    next: ClinicProfile | null;
}>;

type SettingsCategory =
    | 'overview'
    | 'general'
    | 'clinical'
    | 'schedule'
    | 'notifications'
    | 'security'
    | 'appearance'
    | 'privacy'
    | 'billing';

interface CategoryConfig {
    id: SettingsCategory;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    keywords: string[];
    sectionsCount: number;
}

const CATEGORIES: CategoryConfig[] = [
    {
        id: 'overview',
        label: 'Overview',
        description: 'Summary of all clinic settings and operational configurations',
        icon: Grid,
        keywords: ['overview', 'dashboard', 'summary', 'home'],
        sectionsCount: 8,
    },
    {
        id: 'general',
        label: 'General',
        description: 'Clinic profile, contact details, organization, and location',
        icon: Building2,
        keywords: ['profile', 'about', 'organization', 'location', 'address', 'contact'],
        sectionsCount: 3,
    },
    {
        id: 'clinical',
        label: 'Clinical & Services',
        description: 'Departments, consultation services, staff directory and invites',
        icon: Stethoscope,
        keywords: ['departments', 'services', 'staff', 'doctors', 'invitations', 'consultations'],
        sectionsCount: 4,
    },
    {
        id: 'schedule',
        label: 'Working Hours',
        description: 'Weekly operating hours and timeslots for patient bookings',
        icon: Clock,
        keywords: ['hours', 'schedule', 'timing', 'opening', 'closed', 'slots'],
        sectionsCount: 1,
    },
    {
        id: 'notifications',
        label: 'Notifications',
        description: 'Alert delivery channels and operational event preferences',
        icon: Bell,
        keywords: ['notifications', 'alerts', 'email', 'push', 'channels'],
        sectionsCount: 1,
    },
    {
        id: 'security',
        label: 'Security & Verification',
        description: 'Password, sessions, account security and regulatory licenses',
        icon: Lock,
        keywords: ['security', 'password', 'sessions', 'verification', 'license', 'approval'],
        sectionsCount: 2,
    },
    {
        id: 'appearance',
        label: 'Appearance',
        description: 'Interface display preferences and dark/light theme options',
        icon: Palette,
        keywords: ['appearance', 'theme', 'dark', 'light', 'display'],
        sectionsCount: 1,
    },
    {
        id: 'privacy',
        label: 'Privacy & Data',
        description: 'Patient data protection, consent guidelines, and audit logs',
        icon: EyeOff,
        keywords: ['privacy', 'data', 'consent', 'retention', 'ehr'],
        sectionsCount: 1,
    },
    {
        id: 'billing',
        label: 'Billing & Plans',
        description: 'Subscription tier, payout configuration and invoices',
        icon: CreditCard,
        keywords: ['billing', 'plans', 'subscription', 'invoice', 'payout'],
        sectionsCount: 1,
    },
];

export default function ClinicSettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [clinic, setClinic] = useState<ClinicProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<SettingsCategory>('overview');
    const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});
    const [pendingSwitchCategory, setPendingSwitchCategory] = useState<SettingsCategory | null>(null);
    const { fetchProfileCompletion } = useClinicStore();

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            void fetchProfileCompletion();
            const res = await clinicApi.getProfile();
            if (!res.success) {
                setLoadError(res.error || 'Failed to load clinic profile');
                return;
            }
            const data = res.data as Record<string, unknown> | undefined;
            const raw = data?.clinic || data?.profile || data;
            setClinic(normalizeClinicProfile(raw as Record<string, unknown> | null));
        } catch {
            setLoadError('Failed to connect to server.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchProfileCompletion]);

    useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    const saveProfile: SaveProfile = useCallback(
        async (fields, successMessage) => {
            try {
                const res = await clinicApi.updateProfile(fields);
                if (!res.success) {
                    return { ok: false, message: res.error || 'Failed to update clinic.', next: null };
                }
                const previousApprovalStatus = user?.approval_status;
                const refreshedUser = await refreshAuthenticatedUser();
                const profileRes = await clinicApi.getProfile();
                const profileData = profileRes.success ? (profileRes.data as Record<string, unknown> | undefined) : undefined;
                const fallbackData = res.data as Record<string, unknown> | undefined;
                const raw = profileRes.success
                    ? profileData?.clinic || profileData?.profile || profileData
                    : fallbackData?.clinic || fallbackData?.profile || fallbackData;
                const next = normalizeClinicProfile(raw as Record<string, unknown> | null);
                if (next) setClinic(next);
                void fetchProfileCompletion();
                return {
                    ok: true,
                    message: getResubmissionSuccessMessage(
                        previousApprovalStatus,
                        refreshedUser?.approval_status,
                        successMessage
                    ),
                    next,
                };
            } catch {
                return { ok: false, message: 'Network error. Please try again.', next: null };
            }
        },
        [user?.approval_status]
    );

    const handleDirtyChange = useCallback((id: string) => (dirty: boolean) => {
        setDirtySections((prev) => (prev[id] === dirty ? prev : { ...prev, [id]: dirty }));
    }, []);

    const hasUnsaved = useMemo(() => Object.values(dirtySections).some(Boolean), [dirtySections]);

    useEffect(() => {
        if (!hasUnsaved) return;
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsaved]);

    const handleCategoryClick = (catId: SettingsCategory) => {
        if (hasUnsaved && activeCategory !== catId) {
            setPendingSwitchCategory(catId);
            return;
        }
        setActiveCategory(catId);
    };

    const confirmCategorySwitch = () => {
        if (pendingSwitchCategory) {
            setDirtySections({});
            setActiveCategory(pendingSwitchCategory);
            setPendingSwitchCategory(null);
        }
    };

    const filteredCategories = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return CATEGORIES;
        return CATEGORIES.filter(
            (c) =>
                c.label.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.keywords.some((k) => k.toLowerCase().includes(q))
        );
    }, [query]);

    const sectionProps = (id: string) => ({ onDirtyChange: handleDirtyChange(id) });

    if (user?.role && user.role !== 'clinic_owner') {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center bg-white dark:bg-[#0B1020]">
                <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
                <h1 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Access Denied</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Only clinic owners can manage clinic administration and system configuration.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#0B1020] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800/60 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                        Clinic Settings Hub
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Manage your clinic profile, clinical operations, security, and preferences.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {activeCategory !== 'overview' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCategoryClick('overview')}
                            className="text-xs h-9"
                        >
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                            All Settings
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void fetchProfile()}
                        disabled={isLoading}
                        className="text-xs h-9"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Unsaved Changes Banner */}
            {hasUnsaved && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 text-xs sm:text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>You have unsaved changes in your active edit form. Remember to save before switching.</span>
                    </div>
                </div>
            )}

            {/* Discard Confirmation Modal */}
            {pendingSwitchCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1020] border border-gray-200 dark:border-gray-800 p-6 shadow-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Unsaved Changes</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    You have changes that haven&apos;t been saved yet. Switching sections will discard them.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPendingSwitchCategory(null)}
                                className="text-xs"
                            >
                                Stay & Edit
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={confirmCategorySwitch}
                                className="text-xs"
                            >
                                Discard & Switch
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex h-72 items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-pink-600" />
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 py-12 bg-white dark:bg-[#0B1020]">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchProfile()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Sidebar Category Navigation */}
                    <aside className="lg:w-64 lg:shrink-0">
                        <nav className="bg-white dark:bg-[#0B1020] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/60 shadow-sm space-y-3 lg:sticky lg:top-20">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search settings..."
                                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-1.5 pl-8 pr-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>

                            {/* Category List */}
                            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                                {filteredCategories.map((category) => {
                                    const Icon = category.icon;
                                    const isActive = activeCategory === category.id;
                                    return (
                                        <li key={category.id} className="shrink-0 lg:shrink">
                                            <button
                                                type="button"
                                                onClick={() => handleCategoryClick(category.id)}
                                                className={cn(
                                                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all',
                                                    isActive
                                                        ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50 shadow-sm'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                                                )}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <span className="whitespace-nowrap flex-1">{category.label}</span>
                                                {category.id !== 'overview' && (
                                                    <span className="hidden lg:inline-block text-[10px] text-gray-400 dark:text-gray-500">
                                                        {category.sectionsCount}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1">
                        {/* ── OVERVIEW HUB ── */}
                        {activeCategory === 'overview' && (
                            <div className="space-y-6">
                                <ClinicProfileCompletionCard
                                    variant="settings"
                                    clinicName={clinic?.name}
                                    onSectionClick={(sectionId) => {
                                        if (sectionId === 'general_profile') handleCategoryClick('general');
                                        else if (sectionId === 'clinical_setup') handleCategoryClick('clinical');
                                        else if (sectionId === 'working_hours') handleCategoryClick('schedule');
                                        else if (sectionId === 'verification_legal') handleCategoryClick('security');
                                    }}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* General Overview Card */}
                                    <Card padding="md" className="hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2.5 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Configured
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">General Profile</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Clinic name, contact, registration number, and address location.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCategoryClick('general')}
                                            className="w-full mt-4 text-xs justify-between"
                                        >
                                            Manage Profile
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </Card>

                                    {/* Clinical Services Card */}
                                    <Card padding="md" className="hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
                                                    <Stethoscope className="h-5 w-5" />
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                                                    Active
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Clinical & Staff</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Departments, consultation modes, affiliated doctors, and invites.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCategoryClick('clinical')}
                                            className="w-full mt-4 text-xs justify-between"
                                        >
                                            Manage Clinical
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </Card>

                                    {/* Working Hours Card */}
                                    <Card padding="md" className="hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
                                                    <Clock className="h-5 w-5" />
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">
                                                    Scheduled
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Working Hours</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Weekly consultation hours, appointment booking windows, and closed days.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCategoryClick('schedule')}
                                            className="w-full mt-4 text-xs justify-between"
                                        >
                                            Manage Schedule
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </Card>

                                    {/* Notifications Card */}
                                    <Card padding="md" className="hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                                                    <Bell className="h-5 w-5" />
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                                    In-App Live
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Notification Center delivery, email fallback, and push preferences.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCategoryClick('notifications')}
                                            className="w-full mt-4 text-xs justify-between"
                                        >
                                            Manage Alerts
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </Card>

                                    {/* Security & Verification Card */}
                                    <Card padding="md" className="hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                                                    <Lock className="h-5 w-5" />
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                                    Protected
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Security & Verification</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Password updates, active sessions, and medical license status.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCategoryClick('security')}
                                            className="w-full mt-4 text-xs justify-between"
                                        >
                                            Manage Security
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </Card>

                                    {/* Appearance Card */}
                                    <Card padding="md" className="hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                                                    <Palette className="h-5 w-5" />
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                                                    Customizable
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appearance</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Interface theme, light & dark mode preferences for your portal.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleCategoryClick('appearance')}
                                            className="w-full mt-4 text-xs justify-between"
                                        >
                                            Manage Theme
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* ── GENERAL SETTINGS CATEGORY ── */}
                        {activeCategory === 'general' && (
                            <div className="space-y-6">
                                <ProfileSection clinic={clinic} onSave={saveProfile} {...sectionProps('profile')} />
                                <OrganizationSection clinic={clinic} onSave={saveProfile} {...sectionProps('organization')} />
                                <LocationSection clinic={clinic} onSave={saveProfile} {...sectionProps('location')} />
                            </div>
                        )}

                        {/* ── CLINICAL & SERVICES CATEGORY ── */}
                        {activeCategory === 'clinical' && (
                            <div className="space-y-6">
                                <DepartmentsSection {...sectionProps('departments')} />
                                <ConsultationServicesSection {...sectionProps('services')} />
                                <StaffSection {...sectionProps('staff')} />
                                <InvitationsSection {...sectionProps('invitations')} />
                            </div>
                        )}

                        {/* ── WORKING HOURS SCHEDULE CATEGORY ── */}
                        {activeCategory === 'schedule' && (
                            <div className="space-y-6">
                                <ScheduleSection {...sectionProps('schedule')} />
                            </div>
                        )}

                        {/* ── NOTIFICATIONS CATEGORY ── */}
                        {activeCategory === 'notifications' && (
                            <div className="space-y-6">
                                <NotificationsSection {...sectionProps('notifications')} />
                            </div>
                        )}

                        {/* ── SECURITY & VERIFICATION CATEGORY ── */}
                        {activeCategory === 'security' && (
                            <div className="space-y-6">
                                <SecuritySection {...sectionProps('security')} />
                                <VerificationSection clinic={clinic} onSave={saveProfile} {...sectionProps('verification')} />
                            </div>
                        )}

                        {/* ── APPEARANCE CATEGORY ── */}
                        {activeCategory === 'appearance' && (
                            <div className="space-y-6">
                                <AppearanceSection {...sectionProps('appearance')} />
                            </div>
                        )}

                        {/* ── PRIVACY CATEGORY ── */}
                        {activeCategory === 'privacy' && (
                            <div className="space-y-6">
                                <PrivacySection {...sectionProps('privacy')} />
                            </div>
                        )}

                        {/* ── BILLING CATEGORY ── */}
                        {activeCategory === 'billing' && (
                            <div className="space-y-6">
                                <BillingSection {...sectionProps('billing')} />
                                <ConnectedServicesSection {...sectionProps('connected-services')} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
