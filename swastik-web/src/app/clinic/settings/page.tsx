/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Bell,
    Building,
    Building2,
    Clock,
    CreditCard,
    EyeOff,
    FolderKanban,
    Lock,
    Mail,
    MapPin,
    Palette,
    Plug,
    RefreshCw,
    Search,
    ShieldCheck,
    Stethoscope,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { clinicApi } from '@/lib/api';
import { getResubmissionSuccessMessage, refreshAuthenticatedUser } from '@/lib/authSession';
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

type SaveProfile = (fields: Record<string, unknown>, successMessage: string) => Promise<{
    ok: boolean;
    message: string;
    next: ClinicProfile | null;
}>;

const NAV_SECTIONS = [
    { id: 'profile', label: 'Clinic Profile', keywords: ['profile', 'about', 'description', 'gallery', 'logo'], icon: Building2 },
    { id: 'organization', label: 'Organization Details', keywords: ['registration', 'license', 'specializations', 'insurance'], icon: Building },
    { id: 'location', label: 'Location', keywords: ['address', 'map', 'coordinates', 'pincode'], icon: MapPin },
    { id: 'departments', label: 'Departments', keywords: ['department', 'head doctor'], icon: FolderKanban },
    { id: 'services', label: 'Consultation & Services', keywords: ['consultation', 'consent', 'services'], icon: Stethoscope },
    { id: 'schedule', label: 'Working Hours', keywords: ['hours', 'timing', 'open', 'schedule'], icon: Clock },
    { id: 'staff', label: 'Doctors & Staff', keywords: ['doctors', 'staff', 'roster'], icon: Users },
    { id: 'invitations', label: 'Staff Invitations', keywords: ['invite', 'invitation', 'email'], icon: Mail },
    { id: 'notifications', label: 'Notifications', keywords: ['alerts', 'channels', 'preferences'], icon: Bell },
    { id: 'verification', label: 'Documents & Verification', keywords: ['license document', 'approval', 'verification'], icon: ShieldCheck },
    { id: 'security', label: 'Security', keywords: ['password', 'sessions', 'login', 'devices'], icon: Lock },
    { id: 'appearance', label: 'Appearance', keywords: ['theme', 'dark', 'light', 'mode'], icon: Palette },
    { id: 'privacy', label: 'Privacy', keywords: ['privacy', 'data'], icon: EyeOff },
    { id: 'billing', label: 'Billing & Plans', keywords: ['billing', 'subscription', 'invoice'], icon: CreditCard },
    { id: 'connected-services', label: 'Connected Services', keywords: ['integration', 'third party', 'connected'], icon: Plug },
];

export default function ClinicSettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [clinic, setClinic] = useState<ClinicProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [activeId, setActiveId] = useState('profile');
    const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
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
    }, []);

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

    const scrollToSection = (id: string) => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        const onScroll = () => {
            let current = NAV_SECTIONS[0].id;
            for (const section of NAV_SECTIONS) {
                const el = sectionRefs.current[section.id];
                if (el && el.getBoundingClientRect().top <= 160) current = section.id;
            }
            setActiveId(current);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const filteredNav = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return NAV_SECTIONS;
        return NAV_SECTIONS.filter(
            (section) =>
                section.label.toLowerCase().includes(q) ||
                section.keywords.some((keyword) => keyword.toLowerCase().includes(q))
        );
    }, [query]);

    const sectionProps = (id: string) => ({ onDirtyChange: handleDirtyChange(id) });

    if (user?.role && user.role !== 'clinic_owner') {
        return (
            <div className="mx-auto max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
                <h1 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">Access denied</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Only clinic owners can manage clinic settings.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clinic Administration & Settings Center</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Everything about your clinic — profile, operations, staff, security and compliance.
                </p>
            </div>

            {hasUnsaved && (
                <div className="sticky top-16 z-20 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    You have unsaved changes. Save each section before leaving — refreshing or navigating away will discard them.
                </div>
            )}

            {isLoading ? (
                <div className="flex h-72 items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 py-12">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchProfile()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-6 lg:flex-row">
                    <aside className="lg:w-64 lg:shrink-0">
                        <nav className="lg:sticky lg:top-20">
                            <div className="relative mb-3 lg:mb-4">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search sections…"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                                {filteredNav.map((section) => {
                                    const Icon = section.icon;
                                    const isActive = activeId === section.id;
                                    return (
                                        <li key={section.id} className="shrink-0 lg:shrink">
                                            <button
                                                type="button"
                                                onClick={() => scrollToSection(section.id)}
                                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                    isActive
                                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200'
                                                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <span className="whitespace-nowrap">{section.label}</span>
                                                {dirtySections[section.id] && (
                                                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                                {filteredNav.length === 0 && (
                                    <li className="px-3 py-2 text-sm text-gray-400">No sections match your search.</li>
                                )}
                            </ul>
                        </nav>
                    </aside>

                    <div className="min-w-0 flex-1 space-y-6">
                        <div ref={(el) => { sectionRefs.current['profile'] = el; }} className="scroll-mt-24">
                            <ProfileSection clinic={clinic} onSave={saveProfile} {...sectionProps('profile')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['organization'] = el; }} className="scroll-mt-24">
                            <OrganizationSection clinic={clinic} onSave={saveProfile} {...sectionProps('organization')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['location'] = el; }} className="scroll-mt-24">
                            <LocationSection clinic={clinic} onSave={saveProfile} {...sectionProps('location')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['departments'] = el; }} className="scroll-mt-24">
                            <DepartmentsSection {...sectionProps('departments')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['services'] = el; }} className="scroll-mt-24">
                            <ConsultationServicesSection {...sectionProps('services')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['schedule'] = el; }} className="scroll-mt-24">
                            <ScheduleSection {...sectionProps('schedule')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['staff'] = el; }} className="scroll-mt-24">
                            <StaffSection {...sectionProps('staff')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['invitations'] = el; }} className="scroll-mt-24">
                            <InvitationsSection {...sectionProps('invitations')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['notifications'] = el; }} className="scroll-mt-24">
                            <NotificationsSection {...sectionProps('notifications')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['verification'] = el; }} className="scroll-mt-24">
                            <VerificationSection clinic={clinic} onSave={saveProfile} {...sectionProps('verification')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['security'] = el; }} className="scroll-mt-24">
                            <SecuritySection {...sectionProps('security')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['appearance'] = el; }} className="scroll-mt-24">
                            <AppearanceSection {...sectionProps('appearance')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['privacy'] = el; }} className="scroll-mt-24">
                            <PrivacySection {...sectionProps('privacy')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['billing'] = el; }} className="scroll-mt-24">
                            <BillingSection {...sectionProps('billing')} />
                        </div>
                        <div ref={(el) => { sectionRefs.current['connected-services'] = el; }} className="scroll-mt-24">
                            <ConnectedServicesSection {...sectionProps('connected-services')} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
