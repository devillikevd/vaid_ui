'use client';

import { ReactNode } from 'react';
import {
    LayoutDashboard,
    FlaskConical,
    CalendarCheck,
    BarChart3,
    Settings,
    Microscope,
    FileCheck,
    Users,
    Star,
    Network,
    MessageCircle,
    ClipboardList,
    DollarSign,
    Share2,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig } from '@/components/shared/DashboardLayout';

const DC_CONFIG: DashboardConfig = {
    role: ['diagnostic_center_owner', 'diagnostic_manager', 'lab_technician'],
    loginPath: '/login/diagnostic-center',
    portalTitle: 'Diagnostics',
    portalSubtitle: 'Center Portal',
    portalIcon: Microscope,
    theme: { color: 'purple', dataTheme: 'diagnostic-center' },
    showApprovalBanner: true,
    showFullDropdown: true,
    profileHref: '/diagnosis/profile',
    settingsHref: '/diagnosis/settings',
    userDisplayName: 'DC',
    navItems: [
        { name: 'Dashboard', href: '/diagnostic-center', icon: LayoutDashboard, section: 'OPERATIONS', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Bookings', href: '/diagnostic-center/bookings', icon: CalendarCheck, section: 'OPERATIONS', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Patients', href: '/diagnostic-center/patients', icon: Users, section: 'OPERATIONS', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager', 'lab_technician'] },
        { name: 'Test Catalog', href: '/diagnostic-center/tests', icon: FlaskConical, section: 'OPERATIONS', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Results', href: '/diagnostic-center/results', icon: FileCheck, section: 'OPERATIONS', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Work Queue', href: '/diagnostic-center/work-queue', icon: ClipboardList, allowedRoles: ['lab_technician'] },
        { name: 'Collection Agents', href: '/diagnostic-center/agents', icon: Users, section: 'COLLECTION & TEAM', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Staff', href: '/diagnostic-center/staff', icon: Users, section: 'COLLECTION & TEAM', allowedRoles: ['diagnostic_center_owner'] },
        { name: 'My Network', href: '/diagnostic-center/partnerships', icon: Network, section: 'NETWORK', allowedRoles: ['diagnostic_center_owner'] },
        { name: 'Referrals', href: '/diagnostic-center/referrals', icon: Share2, section: 'NETWORK', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager', 'lab_technician'] },
        { name: 'Reports', href: '/diagnostic-center/reports', icon: BarChart3, section: 'INSIGHTS & REPUTATION', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Revenue', href: '/diagnostic-center/revenue', icon: DollarSign, section: 'INSIGHTS & REPUTATION', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Reviews', href: '/diagnostic-center/reviews', icon: Star, section: 'INSIGHTS & REPUTATION', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Community Q&A', href: '/diagnostic-center/community', icon: MessageCircle, section: 'COMMUNITY', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Reels', href: '/diagnostic-center/reels', icon: FileCheck, section: 'COMMUNITY', allowedRoles: ['diagnostic_center_owner', 'diagnostic_manager'] },
        { name: 'Settings', href: '/diagnostic-center/settings', icon: Settings, section: 'MANAGEMENT', allowedRoles: ['diagnostic_center_owner'] },
    ],
};

export default function DiagnosticCenterLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout config={DC_CONFIG}>{children}</DashboardLayout>;
}
