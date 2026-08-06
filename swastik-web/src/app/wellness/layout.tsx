'use client';

import { ReactNode } from 'react';
import {
    CalendarCheck,
    ClipboardList,
    Dumbbell,
    Film,
    LayoutDashboard,
    MessageCircle,
    Settings,
    Star,
    Store,
    Users,
    Video,
    Clock,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig } from '@/components/shared/DashboardLayout';

const WELLNESS_CONFIG: DashboardConfig = {
    role: 'wellness_coach',
    loginPath: '/login/wellness',
    portalTitle: 'Wellness Portal',
    portalSubtitle: 'Coaching Console',
    portalIcon: Dumbbell,
    theme: { color: 'lime', dataTheme: 'wellness' },
    showApprovalBanner: true,
    showFullDropdown: true,
    settingsHref: '/wellness/settings',
    userDisplayName: 'Coach',
    navItems: [
        { name: 'Dashboard', href: '/wellness', icon: LayoutDashboard },
        { name: 'Schedule', href: '/wellness/schedule', icon: Clock },
        { name: 'Sessions', href: '/wellness/sessions', icon: CalendarCheck },
        { name: 'Consultations', href: '/wellness/consultations', icon: Video },
        { name: 'Clients', href: '/wellness/clients', icon: Users },
        { name: 'Plans', href: '/wellness/plans', icon: ClipboardList },
        { name: 'Marketplace', href: '/wellness/marketplace', icon: Store },
        { name: 'Reels', href: '/wellness/reels', icon: Film },
        { name: 'Community', href: '/wellness/community', icon: MessageCircle },
        { name: 'Reviews', href: '/wellness/reviews', icon: Star },
        { name: 'Settings', href: '/wellness/settings', icon: Settings },
    ],
};

export default function WellnessLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout config={WELLNESS_CONFIG}>{children}</DashboardLayout>;
}
