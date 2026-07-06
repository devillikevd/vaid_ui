'use client';

import { ReactNode, useState } from 'react';
import {
    LayoutDashboard,
    FileText,
    Package,
    ShoppingCart,
    BarChart3,
    Settings,
    Pill,
    Link2,
    Users,
    Star,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig, type NavItem } from '@/components/shared/DashboardLayout';
import { useOrderUpdates } from '@/hooks/useSocket';

const BASE_NAV: NavItem[] = [
    { name: 'Dashboard', href: '/pharmacy', icon: LayoutDashboard },
    { name: 'Requests', href: '/pharmacy/requests', icon: Package },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: FileText },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: Package },
    { name: 'Orders', href: '/pharmacy/orders', icon: ShoppingCart },
    { name: 'Associations', href: '/pharmacy/associations', icon: Link2 },
    { name: 'Agents', href: '/pharmacy/agents', icon: Users },
    { name: 'Reports', href: '/pharmacy/reports', icon: BarChart3 },
    { name: 'Reviews', href: '/pharmacy/reviews', icon: Star },
    { name: 'Settings', href: '/pharmacy/settings', icon: Settings },
];

export default function PharmacyLayout({ children }: { children: ReactNode }) {
    const [newOrderCount, setNewOrderCount] = useState(0);
    useOrderUpdates(undefined, () => {
        setNewOrderCount((prev) => prev + 1);
    });

    const navItems: NavItem[] = BASE_NAV.map((item) =>
        item.name === 'Orders'
            ? { ...item, badge: newOrderCount, onClick: () => setNewOrderCount(0) }
            : item
    );

    const config: DashboardConfig = {
        role: 'pharmacy_owner',
        loginPath: '/login/pharmacy',
        portalTitle: 'Pharmacy Portal',
        portalSubtitle: 'Fulfillment Console',
        portalIcon: Pill,
        theme: { color: 'orange', dataTheme: 'pharmacy' },
        showApprovalBanner: true,
        showFullDropdown: false,
        settingsHref: '/pharmacy/settings',
        userDisplayName: 'Pharmacy',
        navItems,
    };

    return <DashboardLayout config={config}>{children}</DashboardLayout>;
}
