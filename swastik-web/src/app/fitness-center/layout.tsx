'use client';

import { ReactNode } from 'react';
import {
    BarChart3,
    CalendarCheck,
    ClipboardList,
    LayoutDashboard,
    Settings,
    Store,
    TicketCheck,
    UserPlus,
    Users,
    Video,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig } from '@/components/shared/DashboardLayout';

const FITNESS_CENTER_CONFIG: DashboardConfig = {
    role: 'fitness_center_owner',
    loginPath: '/login/fitness-center',
    portalTitle: 'Gym & Studio',
    portalSubtitle: 'Owner Portal',
    portalIcon: Store,
    theme: { color: 'teal', dataTheme: 'fitness-center' },
    showApprovalBanner: true,
    showFullDropdown: true,
    settingsHref: '/fitness-center#settings',
    userDisplayName: 'Owner',
    navItems: [
        { name: 'Dashboard', href: '/fitness-center', icon: LayoutDashboard },
        { name: 'Trainers', href: '/fitness-center#trainers', icon: Users },
        { name: 'Invites', href: '/fitness-center#invites', icon: UserPlus },
        { name: 'Classes', href: '/fitness-center#classes', icon: CalendarCheck },
        { name: 'Bookings', href: '/fitness-center#bookings', icon: TicketCheck },
        { name: 'Check-ins', href: '/fitness-center#checkins', icon: ClipboardList },
        { name: 'Reels', href: '/fitness-center/reels', icon: Video },
        { name: 'Analytics', href: '/fitness-center#analytics', icon: BarChart3 },
        { name: 'Settings', href: '/fitness-center#settings', icon: Settings },
    ],
};

export default function FitnessCenterLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout config={FITNESS_CENTER_CONFIG}>{children}</DashboardLayout>;
}
