'use client';

import { ReactNode, useState } from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    Package,
    ShoppingCart,
    Inbox,
    Network,
    Share2,
    BadgePercent,
    Star,
    PlaySquare,
    MessageCircle,
    Users,
    BarChart3,
    Settings,
    Pill,
    CreditCard,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig, type NavItem } from '@/components/shared/DashboardLayout';
import { useOrderUpdates } from '@/hooks/useSocket';

// All three pharmacy roles that can access this portal
const PHARMACY_ROLES = ['pharmacy_owner', 'pharmacy_manager', 'pharmacy_staff'];

const BASE_NAV: NavItem[] = [
    // OPERATIONS — all roles
    { name: 'Dashboard', href: '/pharmacy', icon: LayoutDashboard, section: 'OPERATIONS', allowedRoles: PHARMACY_ROLES },
    { name: 'POS', href: '/pharmacy/pos', icon: CreditCard, section: 'OPERATIONS', allowedRoles: PHARMACY_ROLES },
    { name: 'Orders', href: '/pharmacy/orders', icon: ShoppingCart, section: 'OPERATIONS', allowedRoles: PHARMACY_ROLES },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: ClipboardList, section: 'OPERATIONS', allowedRoles: PHARMACY_ROLES },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: Package, section: 'OPERATIONS', allowedRoles: PHARMACY_ROLES },
    { name: 'Medicine Requests', href: '/pharmacy/requests', icon: Inbox, section: 'OPERATIONS', allowedRoles: PHARMACY_ROLES },
    { name: 'Referrals', href: '/pharmacy/referrals', icon: Share2, section: 'OPERATIONS', allowedRoles: ['pharmacy_owner', 'pharmacy_manager'] },

    // NETWORK — owner only
    { name: 'My Network', href: '/pharmacy/network', icon: Network, section: 'NETWORK', allowedRoles: ['pharmacy_owner'] },

    // GROWTH & REPUTATION — owner + manager
    { name: 'Campaigns', href: '/pharmacy/campaigns', icon: BadgePercent, section: 'GROWTH & REPUTATION', allowedRoles: ['pharmacy_owner', 'pharmacy_manager'] },
    { name: 'Reviews', href: '/pharmacy/reviews', icon: Star, section: 'GROWTH & REPUTATION', allowedRoles: ['pharmacy_owner', 'pharmacy_manager'] },
    { name: 'Reels', href: '/pharmacy/reels', icon: PlaySquare, section: 'GROWTH & REPUTATION', allowedRoles: ['pharmacy_owner', 'pharmacy_manager'] },

    // COMMUNITY — all roles
    { name: 'Pharmacy Community', href: '/pharmacy/community', icon: MessageCircle, section: 'COMMUNITY', allowedRoles: PHARMACY_ROLES },

    // MANAGEMENT — owner + manager; Staff section owner-only
    { name: 'Delivery Fleet', href: '/pharmacy/agents', icon: Users, section: 'MANAGEMENT', allowedRoles: ['pharmacy_owner'] },
    { name: 'Reports', href: '/pharmacy/reports', icon: BarChart3, section: 'MANAGEMENT', allowedRoles: ['pharmacy_owner', 'pharmacy_manager'] },
    { name: 'Staff', href: '/pharmacy/staff', icon: Users, section: 'MANAGEMENT', allowedRoles: ['pharmacy_owner'] },
    { name: 'Settings', href: '/pharmacy/settings', icon: Settings, section: 'MANAGEMENT', allowedRoles: ['pharmacy_owner'] },
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
        // All three roles are valid for this portal. DashboardLayout filters nav items
        // per allowedRoles on each NavItem — no special-case shortcutting.
        role: PHARMACY_ROLES as unknown as string[],
        loginPath: '/login/pharmacy',
        portalTitle: 'Pharmacy Portal',
        portalSubtitle: 'Fulfillment Console',
        portalIcon: Pill,
        theme: { color: 'orange', dataTheme: 'pharmacy' },
        showApprovalBanner: true,
        showFullDropdown: true,
        profileHref: '/pharmacy/profile',
        settingsHref: '/pharmacy/settings',
        userDisplayName: 'Pharmacy',
        navItems,
    };

    return <DashboardLayout config={config}>{children}</DashboardLayout>;
}
