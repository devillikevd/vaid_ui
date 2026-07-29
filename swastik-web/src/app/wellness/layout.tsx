'use client';

import { ReactNode } from 'react';
import {
    LayoutDashboard,
    CalendarCheck,
    Users,
    ClipboardList,
    Dumbbell,
    Store,
    MessageCircle,
    Star,
    Settings,
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
    settingsHref: '/wellness#profile',
    userDisplayName: 'Coach',
    navItems: [
        { name: 'Dashboard', href: '/wellness', icon: LayoutDashboard },
        { name: 'Sessions', href: '/wellness#sessions', icon: CalendarCheck },
        { name: 'Clients', href: '/wellness#clients', icon: Users },
        { name: 'Plans', href: '/wellness#plans', icon: ClipboardList },
        { name: 'Marketplace', href: '/wellness#marketplace', icon: Store },
        { name: 'Community', href: '/wellness#community', icon: MessageCircle },
        { name: 'Reviews', href: '/wellness#reviews', icon: Star },
        { name: 'Settings', href: '/wellness#profile', icon: Settings },
    ],
};

export default function WellnessLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout config={WELLNESS_CONFIG}>{children}</DashboardLayout>;
}
