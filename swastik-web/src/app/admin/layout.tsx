'use client';

import { ReactNode } from 'react';
import {
    LayoutDashboard,
    ClipboardCheck,
    Users,
    AlertTriangle,
    BarChart3,
    Radar,
    FileCheck,
    History,
    Settings,
    Shield,
    Package,
    BadgePercent,
    MessageSquare,
    Star,
} from 'lucide-react';
import { BaseDashboardLayout, type DashboardConfig } from '@/components/shared/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ADMIN_CONFIG: DashboardConfig = {
    role: 'admin',
    loginPath: '/admin/login',
    portalTitle: 'Admin Portal',
    portalSubtitle: 'Control Center',
    portalIcon: Shield,
    theme: { color: 'blue', dataTheme: 'admin' },
    showApprovalBanner: false,
    showFullDropdown: true,
    settingsHref: '/admin/settings',
    userDisplayName: 'Admin',
    navItems: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Pending Approvals', href: '/admin/approvals', icon: ClipboardCheck },
        { name: 'All Providers', href: '/admin/providers', icon: Users },
        { name: 'Medicine Catalog', href: '/admin/medicines', icon: Package },
        { name: 'Campaigns', href: '/admin/campaigns', icon: BadgePercent },
        { name: 'Emergencies', href: '/admin/emergencies', icon: AlertTriangle },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Outbreak Monitor', href: '/admin/outbreaks', icon: Radar },
        { name: 'Public Reviews', href: '/admin/reviews', icon: Star },
        { name: 'Platform Feedback', href: '/admin/feedback', icon: MessageSquare },
        { name: 'Compliance', href: '/admin/compliance', icon: FileCheck },
        { name: 'Audit Trail', href: '/admin/audit', icon: History },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
};

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    useEffect(() => {
        if (isMounted && _hasHydrated && (!isAuthenticated || !isAdmin)) {
            router.push(ADMIN_CONFIG.loginPath);
        }
    }, [isMounted, _hasHydrated, isAuthenticated, isAdmin, router]);

    if (!isMounted || !_hasHydrated) {
        return null;
    }

    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    return <BaseDashboardLayout config={ADMIN_CONFIG}>{children}</BaseDashboardLayout>;
}
