'use client';

import { ReactNode, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LogOut,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Search,
    User as UserIcon,
    Settings2,
    Sun,
    Moon,
    Monitor,
    ArrowLeft,
    CheckCircle2, Star, Users, Calendar, Clock, Edit2, FileText, Bell, Globe, Shield,
    Building2, CalendarDays, CreditCard, BarChart2, HelpCircle, MessageSquare, BookOpen, Repeat
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDoctorStore } from '@/stores/doctorStore';
import { cn, getInitials, formatDoctorName } from '@/lib/utils';
import { ApprovalBanner } from '@/components/shared/ApprovalBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NotificationBell, NotificationPanel } from '@/components/ui/Toast';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useTheme } from '@/components/shared/ThemeProvider';
import GlobalSocketToasts from '@/components/shared/GlobalSocketToasts';
import { type Notification, useNotifications } from '@/hooks/useSocket';
import VaidideaLogo from '@/components/shared/VaidideaLogo';

// ----- Types -----

export interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    /** Optional badge count (e.g. new orders) */
    badge?: number;
    /** Optional roles allowed to see this nav item */
    allowedRoles?: string[];
    /** Callback when this nav item is clicked */
    onClick?: () => void;
    /** Optional section heading to group items */
    section?: string;
}

export interface DashboardTheme {
    /** Tailwind color name: 'blue', 'emerald', 'teal', 'orange', 'pink', 'purple', 'lime' */
    color: string;
    /** data-theme attribute */
    dataTheme: string;
}

export interface DashboardConfig {
    /** Role required to access this dashboard */
    role: string | string[];
    /** Login page path for redirects */
    loginPath: string;
    /** Portal title (e.g. "Admin Portal") */
    portalTitle: string;
    /** Portal subtitle (e.g. "Control Center") */
    portalSubtitle: string;
    /** Icon shown in sidebar header */
    portalIcon: LucideIcon;
    /** Theme colors */
    theme: DashboardTheme;
    /** Navigation items */
    navItems: NavItem[];
    /** Show approval banner if not approved (default: false) */
    showApprovalBanner?: boolean;
    /** Show full user dropdown with name/email/settings (default: false) */
    showFullDropdown?: boolean;
    /** Settings page href (only used if showFullDropdown is true) */
    settingsHref?: string;
    /** Profile page href (only used if showFullDropdown is true) */
    profileHref?: string;
    /** Default user display name fallback */
    userDisplayName?: string;
    /**
     * Paths accessible even when approval_status !== 'approved'.
     * Only relevant when showApprovalBanner is true.
     * The dashboard root (first navItem href) and settings are always allowed.
     */
    allowedPathsWhenPending?: string[];
}

// ----- Color Mapping -----

// Inline theme option button used inside profile dropdown
function ThemeOptionButton({ value, Icon, activeClass }: { value: 'light' | 'dark' | 'system'; Icon: LucideIcon; activeClass?: string }) {
    const { theme, setTheme } = useTheme();
    const isActive = theme === value;
    const labels = { light: '☀️ Light', dark: '🌙 Dark', system: '💻 System' };
    return (
        <button
            onClick={() => setTheme(value)}
            className={cn(
                'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                    ? (activeClass || 'bg-emerald-500 text-white shadow-sm')
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
        >
            <Icon className="h-3 w-3" />
            {labels[value].split(' ')[1]}
        </button>
    );
}


const COLOR_CLASSES: Record<string, {
    sidebar: string;
    border: string;
    active: string;
    text: string;
    hover: string;
    avatar: string;
    spinner: string;
    logoBg: string;
    indicator: string;
    activeIcon: string;
    hoverIcon: string;
    dropdownHeaderBg: string;
    dropdownAvatarBorder: string;
    dropdownAvatarText: string;
    dropdownIconHover: string;
    themeActiveBg: string;
    searchRing: string;
    searchIconFocus: string;
    searchResultHover: string;
}> = {
    emerald: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-emerald-500/[0.08] text-emerald-700 dark:bg-emerald-500/[0.14] dark:text-emerald-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-emerald-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-emerald-600',
        spinner: 'border-emerald-600',
        logoBg: 'bg-emerald-100 dark:bg-emerald-600/20',
        indicator: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
        activeIcon: 'text-emerald-600 dark:text-emerald-400',
        hoverIcon: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
        dropdownHeaderBg: 'from-emerald-500/10 to-transparent',
        dropdownAvatarBorder: 'from-emerald-500 to-emerald-700',
        dropdownAvatarText: 'text-emerald-600 dark:text-emerald-400',
        dropdownIconHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
        themeActiveBg: 'bg-emerald-500 text-white shadow-sm',
        searchRing: '${colors.searchRing}',
        searchIconFocus: '${colors.searchIconFocus}',
        searchResultHover: '${colors.searchResultHover}',
    },
    pink: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-pink-500/[0.08] text-pink-700 dark:bg-pink-500/[0.14] dark:text-pink-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-pink-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-pink-600',
        spinner: 'border-pink-600',
        logoBg: 'bg-pink-100 dark:bg-pink-600/20',
        indicator: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]',
        activeIcon: 'text-pink-600 dark:text-pink-400',
        hoverIcon: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
        dropdownHeaderBg: 'from-pink-500/10 to-transparent',
        dropdownAvatarBorder: 'from-pink-500 to-rose-600',
        dropdownAvatarText: 'text-pink-600 dark:text-pink-400',
        dropdownIconHover: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
        themeActiveBg: 'bg-pink-500 text-white shadow-sm',
        searchRing: 'focus:ring-pink-500 focus:border-pink-400',
        searchIconFocus: 'group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500',
        searchResultHover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-700 dark:hover:text-pink-400',
    },
    blue: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-blue-500/[0.08] text-blue-700 dark:bg-blue-500/[0.14] dark:text-blue-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-blue-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-blue-600',
        spinner: 'border-blue-600',
        logoBg: 'bg-blue-100 dark:bg-blue-600/20',
        indicator: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
        activeIcon: 'text-blue-600 dark:text-blue-400',
        hoverIcon: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        dropdownHeaderBg: 'from-blue-500/10 to-transparent',
        dropdownAvatarBorder: 'from-blue-500 to-blue-700',
        dropdownAvatarText: 'text-blue-600 dark:text-blue-400',
        dropdownIconHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        themeActiveBg: 'bg-blue-500 text-white shadow-sm',
        searchRing: 'focus:ring-blue-500 focus:border-blue-400',
        searchIconFocus: 'group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500',
        searchResultHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400',
    },
    teal: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-teal-500/[0.08] text-teal-700 dark:bg-teal-500/[0.14] dark:text-teal-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-teal-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-teal-600',
        spinner: 'border-teal-600',
        logoBg: 'bg-teal-100 dark:bg-teal-600/20',
        indicator: 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]',
        activeIcon: 'text-teal-600 dark:text-teal-400',
        hoverIcon: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
        dropdownHeaderBg: 'from-teal-500/10 to-transparent',
        dropdownAvatarBorder: 'from-teal-500 to-teal-700',
        dropdownAvatarText: 'text-teal-600 dark:text-teal-400',
        dropdownIconHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
        themeActiveBg: 'bg-teal-500 text-white shadow-sm',
        searchRing: 'focus:ring-teal-500 focus:border-teal-400',
        searchIconFocus: 'group-focus-within:text-teal-600 dark:group-focus-within:text-teal-500',
        searchResultHover: 'hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400',
    },
    orange: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-orange-500/[0.08] text-orange-700 dark:bg-orange-500/[0.14] dark:text-orange-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-orange-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-orange-600',
        spinner: 'border-orange-600',
        logoBg: 'bg-orange-100 dark:bg-orange-600/20',
        indicator: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
        activeIcon: 'text-orange-600 dark:text-orange-400',
        hoverIcon: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
        dropdownHeaderBg: 'from-orange-500/10 to-transparent',
        dropdownAvatarBorder: 'from-orange-500 to-orange-700',
        dropdownAvatarText: 'text-orange-600 dark:text-orange-400',
        dropdownIconHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
        themeActiveBg: 'bg-orange-500 text-white shadow-sm',
        searchRing: 'focus:ring-orange-500 focus:border-orange-400',
        searchIconFocus: 'group-focus-within:text-orange-600 dark:group-focus-within:text-orange-500',
        searchResultHover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-400',
    },
    purple: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-purple-500/[0.08] text-purple-700 dark:bg-purple-500/[0.14] dark:text-purple-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-purple-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-purple-600',
        spinner: 'border-purple-600',
        logoBg: 'bg-purple-100 dark:bg-purple-600/20',
        indicator: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]',
        activeIcon: 'text-purple-600 dark:text-purple-400',
        hoverIcon: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
        dropdownHeaderBg: 'from-purple-500/10 to-transparent',
        dropdownAvatarBorder: 'from-purple-500 to-purple-700',
        dropdownAvatarText: 'text-purple-600 dark:text-purple-400',
        dropdownIconHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
        themeActiveBg: 'bg-purple-500 text-white shadow-sm',
        searchRing: 'focus:ring-purple-500 focus:border-purple-400',
        searchIconFocus: 'group-focus-within:text-purple-600 dark:group-focus-within:text-purple-500',
        searchResultHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-400',
    },
    lime: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-lime-500/[0.08] text-lime-700 dark:bg-lime-500/[0.14] dark:text-lime-300 font-semibold',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-lime-500/[0.04] dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
        avatar: 'bg-lime-600',
        spinner: 'border-lime-600',
        logoBg: 'bg-lime-100 dark:bg-lime-600/20',
        indicator: 'bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.5)]',
        activeIcon: 'text-lime-600 dark:text-lime-400',
        hoverIcon: 'group-hover:text-lime-600 dark:group-hover:text-lime-400',
        dropdownHeaderBg: 'from-lime-500/10 to-transparent',
        dropdownAvatarBorder: 'from-lime-500 to-lime-700',
        dropdownAvatarText: 'text-lime-600 dark:text-lime-400',
        dropdownIconHover: 'group-hover:text-lime-600 dark:group-hover:text-lime-400',
        themeActiveBg: 'bg-lime-500 text-white shadow-sm',
        searchRing: 'focus:ring-lime-500 focus:border-lime-400',
        searchIconFocus: 'group-focus-within:text-lime-600 dark:group-focus-within:text-lime-500',
        searchResultHover: 'hover:bg-lime-50 dark:hover:bg-lime-900/20 hover:text-lime-700 dark:hover:text-lime-400',
    },
}

// Subtitle color classes (needs dynamic shade)
const SUBTITLE_CLASSES: Record<string, string> = {
    blue: 'text-blue-500 dark:text-blue-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
    teal: 'text-teal-500 dark:text-teal-400',
    orange: 'text-orange-500 dark:text-orange-400',
    pink: 'text-pink-500 dark:text-pink-400',
    purple: 'text-purple-500 dark:text-purple-400',
    lime: 'text-lime-500 dark:text-lime-400',
};

function stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveNotificationRoute(notification: Notification, role?: string): string | null {
    const data = notification.data || {};
    const explicitRoute = stringValue(data.route) || stringValue(data.href) || stringValue(data.url) || stringValue(data.actionRoute) || stringValue(data.action_route);
    if (explicitRoute?.startsWith('/')) return explicitRoute;

    const type = notification.type;
    const appointmentId = stringValue(data.appointmentId) || stringValue(data.appointment_id) || stringValue(data.id);
    const consultationId = stringValue(data.consultationId) || stringValue(data.consultation_id) || stringValue(data.roomId) || stringValue(data.room_id);
    const prescriptionId = stringValue(data.prescriptionId) || stringValue(data.prescription_id);
    const orderId = stringValue(data.orderId) || stringValue(data.order_id);
    const bookingId = stringValue(data.bookingId) || stringValue(data.booking_id) || stringValue(data.diagnosticBookingId) || stringValue(data.diagnostic_booking_id);
    const emergencyId = stringValue(data.requestId) || stringValue(data.request_id) || stringValue(data.emergencyId) || stringValue(data.emergency_id);
    const providerType = stringValue(data.providerType) || stringValue(data.provider_type) || stringValue(data.type);
    const providerId = stringValue(data.providerId) || stringValue(data.provider_id) || stringValue(data.reviewableId) || stringValue(data.reviewable_id);

    if (type.includes('consultation') && consultationId) return `/consultation/${consultationId}`;

    switch (role) {
        case 'doctor':
            if (appointmentId) return '/doctor/appointments';
            if (prescriptionId) return '/doctor/prescriptions';
            if (type.includes('review')) return '/doctor/reviews';
            if (type.includes('outbreak') || type.includes('health')) return '/doctor/health-alerts';
            return '/doctor';
        case 'hospital_owner':
        case 'hospital_manager':
            if (emergencyId || type.includes('ambulance') || type.includes('emergency')) return '/hospital/emergency';
            if (appointmentId) return '/hospital/appointments';
            if (type.includes('doctor')) return '/hospital/doctors';
            if (type.includes('pharmacy')) return '/hospital/pharmacies';
            if (type.includes('diagnostic')) return '/hospital/diagnostic-centers';
            if (type.includes('review')) return '/hospital/reviews';
            if (type.includes('outbreak') || type.includes('health')) return '/hospital/health-alerts';
            return '/hospital';
        case 'clinic_owner':
            if (appointmentId) return '/clinic/appointments';
            if (type.includes('consultation')) return '/clinic/consultations';
            if (type.includes('pharmacy')) return '/clinic/pharmacies';
            if (type.includes('diagnostic')) return '/clinic/diagnostic-centers';
            if (type.includes('review')) return '/clinic/reviews';
            if (type.includes('outbreak') || type.includes('health')) return '/clinic/health-alerts';
            return '/clinic';
        case 'pharmacy_owner':
            if (orderId || type.includes('order')) return '/pharmacy/orders';
            if (prescriptionId || type.includes('prescription')) return '/pharmacy/prescriptions';
            if (type.includes('inventory') || type.includes('medicine')) return '/pharmacy/inventory';
            if (type.includes('review')) return '/pharmacy/reviews';
            return '/pharmacy';
        case 'diagnostic_center_owner':
            if (bookingId || type.includes('booking')) return '/diagnostic-center/bookings';
            if (type.includes('result')) return '/diagnostic-center/results';
            if (type.includes('review')) return '/diagnostic-center/reviews';
            return '/diagnostic-center';
        case 'wellness_coach':
            if (type.includes('session') || type.includes('booking')) return '/wellness#sessions';
            if (type.includes('review')) return '/wellness#reviews';
            return '/wellness';
        case 'admin':
        case 'super_admin':
            if ((providerType && providerId) || providerType || type.includes('approval')) return '/admin/approvals';
            if (emergencyId || type.includes('emergency')) return '/admin/emergencies';
            if (type.includes('compliance')) return '/admin/compliance';
            if (type.includes('audit')) return '/admin/audit';
            if (type.includes('outbreak')) return '/admin/outbreaks';
            return '/admin';
        default:
            if (type.includes('consultation') && consultationId) return `/consultation/${consultationId}`;
            return null;
    }
}

// ----- Component -----

export function BaseDashboardLayout({
    config,
    children,
}: {
    config: DashboardConfig;
    children: ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
    const doctorStore = useDoctorStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { notifications, unreadCount, clearNotifications, markRead, markAllRead } = useNotifications();

    // Close search on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Global keyboard shortcut (Cmd/Ctrl + K) to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Build searchable nav pages list from config
    const searchResults = searchQuery.trim().length > 0
        ? config.navItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const sidebarRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    // Close sidebar on Escape — global keyboard listener
    useEffect(() => {
        if (!sidebarOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [sidebarOpen]);

    // BUG-20 Fix: Close user dropdown on Escape — global keyboard listener
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setDropdownOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [dropdownOpen]);

    // Focus trap inside mobile sidebar
    useEffect(() => {
        if (!sidebarOpen || !sidebarRef.current) return;

        const sidebar = sidebarRef.current;
        const focusable = sidebar.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        // Auto-focus first focusable element (close button)
        first.focus();

        const trapFocus = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        sidebar.addEventListener('keydown', trapFocus);
        return () => sidebar.removeEventListener('keydown', trapFocus);
    }, [sidebarOpen]);

    // Return focus to menu button when sidebar closes
    const closeSidebar = useCallback(() => {
        setSidebarOpen(false);
        // Allow transition to complete, then focus menu button
        setTimeout(() => menuButtonRef.current?.focus(), 100);
    }, []);

    const colors = COLOR_CLASSES[config.theme.color] || COLOR_CLASSES.blue;
    const subtitleColor = SUBTITLE_CLASSES[config.theme.color] || 'text-blue-300';

    const roleFilteredNavItems = config.navItems.filter((item) =>
        !item.allowedRoles || (user?.role != null && item.allowedRoles.includes(user.role))
    );
    // The base route for this dashboard (first nav item or derive from role)
    const baseRoute = roleFilteredNavItems[0]?.href || config.navItems[0]?.href || '/';
    const allowedRoles = Array.isArray(config.role) ? config.role : [config.role];
    const roleMatches = user?.role != null && (
        allowedRoles.includes(user.role) ||
        (allowedRoles.includes('admin') && user.role === 'super_admin') ||
        // Pharmacy member roles: match if any pharmacy role is in allowedRoles
        ((allowedRoles.includes('pharmacy_owner') || allowedRoles.includes('pharmacy_manager') || allowedRoles.includes('pharmacy_staff')) &&
            (user.role === 'pharmacy_manager' || user.role === 'pharmacy_staff'))
    );

    // Calculate dynamic stats for doctor dropdown
    const rawRating = doctorStore.doctorProfile?.rating ?? doctorStore.stats?.averageRating ?? 0;
    const averageRating = rawRating > 0 ? rawRating.toFixed(1) : '5.0';
    
    const totalPatients = doctorStore.doctorProfile?.stats?.totalPatients ?? doctorStore.stats?.totalPatients ?? doctorStore.patientsPagination?.total ?? 0;
    const formattedPatients = totalPatients >= 1000 ? `${(totalPatients / 1000).toFixed(1)}k` : totalPatients.toString();
    
    // The backend provides 'todaysAppointments' in the stats object (which is the length of today's appointments).
    const todaysCount = doctorStore.stats?.todaysAppointments ?? doctorStore.todaysAppointments?.length ?? 0;
    
    // The backend provides 'experience_years' in the profile.
    const yearsExp = doctorStore.doctorProfile?.experience_years ?? 0;

    const normalizedApprovalStatus = user?.approval_status === 'under_review' ? 'review' : user?.approval_status;

    const [isMounted, setIsMounted] = useState(false);
    const { isLoggingOut, setLoggingOut } = useAuthStore();

    useEffect(() => {
        setIsMounted(true);
        if (user?.role === 'doctor') {
            if (!doctorStore.stats && !doctorStore.loadingDashboard) {
                doctorStore.fetchDashboardData();
            }
            if (!doctorStore.doctorProfile && !doctorStore.isLoading) {
                doctorStore.fetchDoctorProfile();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role]);



    if (!isMounted || !_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className={cn('animate-spin h-8 w-8 border-4 border-t-transparent rounded-full', colors.spinner)} />
            </div>
        );
    }

    const handleLogout = () => {
        if (isLoggingOut) return;
        setLoggingOut(true);
        // 1. Resolve target login path BEFORE clearing auth state
        const targetPath = config.loginPath;
        // 2. Clear auth/session state
        logout();
        // 3. Redirect using router.replace to purge history
        router.replace(targetPath);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.id) {
            markRead(notification.id);
        }
        setNotifOpen(false);

        const route = resolveNotificationRoute(notification, user?.role);
        if (route) {
            router.push(route);
        }
    };

    const PortalIcon = config.portalIcon;
    const rawName = user?.name || config.userDisplayName || 'User';
    const displayName = user?.role === 'doctor' ? formatDoctorName(rawName) : rawName;

    const baseRoleStr = Array.isArray(config.role) ? config.role[0] : config.role;
    const basePath = `/${baseRoleStr?.replace(/_owner|_manager|_admin|_staff/, '')?.replace(/_/g, '-')}`;

    const activeNavItem = config.navItems.find(item => item.href === pathname);

    // Find parent nav item for nested pages to show correct title
    const parentNavItem = !activeNavItem
        ? config.navItems.find(item =>
            pathname.startsWith(item.href + '/') &&
            item.href !== basePath
        )
        : null;

    const navItemToDisplay = activeNavItem || parentNavItem;

    const isRootPage = pathname === basePath;
    const showBackButton = !activeNavItem && !isRootPage;

    // #40: Pending doctor enforcement — block pages when not approved
    const isNotApproved = config.showApprovalBanner &&
        user?.approval_status != null &&
        user.approval_status !== 'approved';

    // Pages always accessible while waiting for approval: settings + explicit allow list
    const alwaysAllowed = [config.settingsHref].filter(Boolean) as string[];
    const allowedPaths = [...alwaysAllowed, ...(config.allowedPathsWhenPending || [])];
    const isOnAllowedPath = allowedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const isPageBlocked = isNotApproved && !isOnAllowedPath;
    const visibleNavItems = isNotApproved
        ? roleFilteredNavItems.filter((item) => allowedPaths.includes(item.href))
        : roleFilteredNavItems;

    return (
        <div className="min-h-screen bg-[var(--surface-page)]" data-theme={config.theme.dataTheme}>
            {/* Socket listener — only active on dashboard pages (not login/register/etc.) */}
            <GlobalSocketToasts />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar — on mobile it acts as a modal dialog */}
            <div
                ref={sidebarRef}
                className={cn(
                    'fixed top-0 left-0 z-50 h-full transition-all duration-300 lg:translate-x-0 flex flex-col border-r',
                    desktopCollapsed ? 'w-full max-w-sm lg:w-20' : 'w-full max-w-sm lg:w-64',
                    colors.sidebar,
                    colors.border,
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                role={sidebarOpen ? 'dialog' : 'navigation'}
                aria-modal={sidebarOpen ? true : undefined}
                aria-label="Dashboard sidebar"
            >
                {/* Logo */}
                <div className={cn('flex-none flex items-center h-16 px-4 border-b', colors.border, desktopCollapsed ? 'justify-center' : 'justify-between')}>
                    <div className={cn("flex items-center gap-3 overflow-hidden", desktopCollapsed ? "lg:hidden" : "")}>
                        <VaidideaLogo className="w-9 h-9 shrink-0" />
                        <div className="whitespace-nowrap min-w-0">
                            <h1 className="font-bold text-[15px] text-gray-900 dark:text-white tracking-tight leading-tight">{config.portalTitle}</h1>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{config.portalSubtitle}</p>
                        </div>
                    </div>
                    {desktopCollapsed && (
                        <div className="shrink-0 hidden lg:flex items-center justify-center">
                            <VaidideaLogo className="w-9 h-9" />
                        </div>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white dark:bg-[#0f1929]/5 transition-colors"
                            title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={closeSidebar}
                            className="lg:hidden p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white dark:bg-[#0f1929]/5 transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
                    {(() => {
                        const sections: Record<string, typeof visibleNavItems> = {};
                        visibleNavItems.forEach(item => {
                            const section = item.section || '';
                            if (!sections[section]) sections[section] = [];
                            sections[section].push(item);
                        });

                        return Object.entries(sections).map(([sectionName, items]) => (
                            <div key={sectionName || 'default'} className="space-y-0.5">
                                {sectionName && (
                                    <div className={cn(
                                        "px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap text-gray-500 dark:text-gray-400",
                                        desktopCollapsed ? "lg:hidden" : ""
                                    )}>
                                        {sectionName}
                                    </div>
                                )}
                                {sectionName && desktopCollapsed && (
                                    <div className="h-px hidden lg:block bg-gray-200 dark:bg-gray-800/50 mx-2 mb-2" />
                                )}
                                {items.map((item) => {
                                    const isActive = navItemToDisplay?.href === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={item.onClick}
                                            title={desktopCollapsed ? item.name : undefined}
                                            className={cn(
                                                'relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                                                desktopCollapsed ? 'lg:justify-center px-3 lg:px-0 lg:py-3' : 'px-3',
                                                isActive
                                                    ? colors.active
                                                    : cn(colors.text, colors.hover)
                                            )}
                                        >
                                            {/* Active left indicator */}
                                            {isActive && (
                                                <span className={cn(
                                                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full",
                                                    colors.indicator
                                                )} />
                                            )}
                                            <Icon className={cn(
                                                'h-[18px] w-[18px] shrink-0 transition-colors duration-150',
                                                isActive 
                                                    ? (colors.activeIcon) 
                                                    : cn('text-gray-500 dark:text-gray-400', colors.hoverIcon)
                                            )} />
                                            <span className={cn("whitespace-nowrap font-medium", desktopCollapsed ? "lg:hidden" : "")}>{item.name}</span>

                                            {item.badge != null && item.badge > 0 && (
                                                <span className={cn(
                                                    "bg-red-500 text-white text-[10px] font-bold rounded-full h-4.5 min-w-[18px] flex items-center justify-center px-1 ml-auto leading-none py-0.5",
                                                    desktopCollapsed ? "lg:hidden" : ""
                                                )}>
                                                    {item.badge > 99 ? '99+' : item.badge}
                                                </span>
                                            )}
                                            {desktopCollapsed && item.badge != null && item.badge > 0 && (
                                                <span className="hidden lg:flex absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 items-center justify-center">
                                                    {item.badge > 99 ? '!' : item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        ));
                    })()}
                </nav>
            </div>

            {/* Main content */}
            <div
                className={cn("transition-all duration-300 min-h-screen flex flex-col", desktopCollapsed ? "lg:pl-20" : "lg:pl-64")}
                onClick={() => {
                    // Removed auto-collapse since it applies incorrectly to mobile state
                }}
            >
                {/* Header */}
                <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        <button
                            ref={menuButtonRef}
                            onClick={() => setSidebarOpen(true)}
                            className="shrink-0 lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            aria-label="Open sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        {/* Active page icon + name */}
                        <div className="min-w-0 flex items-center gap-2.5">
                            {showBackButton && (
                                <button
                                    onClick={() => router.back()}
                                    className="shrink-0 p-1.5 sm:p-2 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                                    aria-label="Go back"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                            )}
                            {navItemToDisplay && (() => {
                                const Icon = navItemToDisplay.icon; return (
                                    <span className={cn('hidden sm:flex items-center justify-center h-8 w-8 rounded-lg shrink-0', colors.logoBg)}>
                                        <Icon className="h-4 w-4 text-white" />
                                    </span>
                                );
                            })()}
                            <h2 className="truncate text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-base capitalize">
                                {navItemToDisplay?.name || 'Dashboard'}
                                {showBackButton && ' Details'}
                            </h2>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div ref={searchRef} className="relative hidden md:flex flex-1 max-w-sm lg:max-w-md mx-4">
                        <div className="relative w-full group">
                            <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 transition-colors pointer-events-none", colors.searchIconFocus)} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={navItemToDisplay ? `Search ${navItemToDisplay.name.toLowerCase()}...` : 'Search pages...'}
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                                onFocus={() => setSearchOpen(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
                                    if (e.key === 'Enter' && searchResults.length > 0) {
                                        router.push(searchResults[0].href);
                                        setSearchOpen(false);
                                        setSearchQuery('');
                                    }
                                }}
                                className={cn("w-full pl-10 pr-14 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm", colors.searchRing)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchOpen(false); searchInputRef.current?.focus(); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {searchOpen && searchQuery.trim().length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50">
                                {searchResults.length > 0 ? (
                                    <ul className="py-1 max-h-[60vh] overflow-y-auto scrollbar-hide">
                                        {searchResults.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <li key={item.href}>
                                                    <button
                                                        className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 transition-colors text-left", colors.searchResultHover)}
                                                        onClick={() => {
                                                            router.push(item.href);
                                                            setSearchOpen(false);
                                                            setSearchQuery('');
                                                        }}
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-400" />
                                                        <span className="font-medium">{item.name}</span>
                                                        {(item as any).section && (
                                                            <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider">{(item as any).section}</span>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                        <Search className="h-7 w-7 text-gray-300 mb-2" />
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No pages found</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Try a different keyword</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">

                        <div className="hidden sm:block">
                            <ConnectionIndicator />
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <NotificationBell
                                count={unreadCount}
                                onClick={() => setNotifOpen(!notifOpen)}
                                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                            />
                            <NotificationPanel
                                notifications={notifications.map(n => ({
                                    ...n,
                                    type: (n as any).type || 'info',
                                    title: (n as any).title || 'Notification',
                                    timestamp: (n as any).timestamp || new Date().toISOString(),
                                }))}
                                isOpen={notifOpen}
                                onClose={() => setNotifOpen(false)}
                                onClear={clearNotifications}
                                onMarkAllRead={markAllRead}
                                onNotificationClick={handleNotificationClick}
                            />
                        </div>

                        {/* User dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-1 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg sm:gap-2 sm:p-2"
                                aria-label="User menu"
                                aria-expanded={dropdownOpen}
                                aria-haspopup="true"
                            >
                                <div className={cn(
                                    'h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                                    colors.avatar
                                )}>
                                    {getInitials(displayName)}
                                </div>
                                {config.showFullDropdown && (
                                    <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {displayName}
                                    </span>
                                )}
                                <ChevronDown className="hidden h-4 w-4 text-gray-500 dark:text-gray-400 sm:block" />
                            </button>

                            {dropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setDropdownOpen(false)}
                                        role="presentation"
                                    />
                                    <div className={cn(
                                        "absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-[420px] max-w-[420px] bg-white/95 dark:bg-[#0B1020]/95 backdrop-blur-xl rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 flex flex-col max-h-[85vh]",
                                        config.theme?.dataTheme === 'diagnostic-center' ? 'sm:w-[320px]' : ''
                                    )}>
                                        {user?.role === 'doctor' ? (
                                            <>
                                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                                                    {/* Premium Doctor Header */}
                                                    <div className={cn("p-6 bg-gradient-to-b border-b border-gray-200 dark:border-gray-800", colors.dropdownHeaderBg)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative shrink-0">
                                                                <div className={cn("h-16 w-16 rounded-full bg-gradient-to-br p-[2px]", colors.dropdownAvatarBorder)}>
                                                                    <div className="h-full w-full rounded-full bg-white dark:bg-[#0B1020] flex items-center justify-center">
                                                                        <span className={cn("text-xl font-bold", colors.dropdownAvatarText)}>{getInitials(displayName)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-white dark:bg-[#0B1020] rounded-full flex items-center justify-center">
                                                                    <div className="h-3.5 w-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate w-full">{displayName}</h3>
                                                                <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                    <span className="text-xs font-bold text-emerald-500">{doctorStore.doctorProfile?.is_approved ? 'Verified Doctor' : 'Doctor'}</span>
                                                                </div>
                                                                <p className="text-[13px] font-medium text-gray-400 mt-1.5 whitespace-normal break-words leading-tight">
                                                                    {doctorStore.doctorProfile?.specialization || 'General Physician'}
                                                                    {doctorStore.doctorProfile?.hospital_id ? ' • Hospital Affiliated' : ''}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-2 shrink-0">
                                                                    <span className={cn(
                                                                        "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md",
                                                                        doctorStore.doctorProfile?.is_available !== false ? "text-emerald-500 bg-emerald-500/10" : "text-gray-500 bg-gray-500/10"
                                                                    )}>
                                                                        <span className={cn(
                                                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                                                            doctorStore.doctorProfile?.is_available !== false ? "bg-emerald-500 animate-pulse" : "bg-gray-500"
                                                                        )}></span> {doctorStore.doctorProfile?.is_available !== false ? 'Online' : 'Offline'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Quick Stats */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                                                            <div className="bg-gray-50 dark:bg-[#131A2B] rounded-xl p-3 border border-gray-200 dark:border-gray-800/50 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 h-[150px]">
                                                                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                <span className="text-[36px] font-bold text-gray-900 dark:text-white leading-none mt-2">{todaysCount}</span>
                                                                <span className="text-[11px] font-medium text-gray-500 tracking-tight leading-[1.3] text-center mt-auto pb-1 whitespace-normal text-balance">Today's Appointments</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-[#131A2B] rounded-xl p-3 border border-gray-200 dark:border-gray-800/50 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 h-[150px]">
                                                                <Star className="w-4 h-4 text-amber-500 shrink-0" />
                                                                <span className="text-[36px] font-bold text-gray-900 dark:text-white leading-none mt-2">{averageRating}<span className="text-xl text-amber-500/50">★</span></span>
                                                                <span className="text-[11px] font-medium text-gray-500 tracking-tight leading-[1.3] text-center mt-auto pb-1 whitespace-normal text-balance">Average Rating</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-[#131A2B] rounded-xl p-3 border border-gray-200 dark:border-gray-800/50 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 h-[150px]">
                                                                <Users className="w-4 h-4 text-blue-500 shrink-0" />
                                                                <span className="text-[36px] font-bold text-gray-900 dark:text-white leading-none mt-2">{formattedPatients}</span>
                                                                <span className="text-[11px] font-medium text-gray-500 tracking-tight leading-[1.3] text-center mt-auto pb-1 whitespace-normal text-balance">Total Patients</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-[#131A2B] rounded-xl p-3 border border-gray-200 dark:border-gray-800/50 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 h-[150px]">
                                                                <Clock className="w-4 h-4 text-purple-500 shrink-0" />
                                                                <span className="text-[36px] font-bold text-gray-900 dark:text-white leading-none mt-2">{yearsExp}</span>
                                                                <span className="text-[11px] font-medium text-gray-500 tracking-tight leading-[1.3] text-center mt-auto pb-1 whitespace-normal text-balance">Years Experience</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Theme Switcher Segmented Control */}
                                                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="flex w-full bg-gray-100 dark:bg-[#131A2B] p-1.5 gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800">
                                                            {(['light', 'dark', 'system'] as const).map((t) => {
                                                                const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                                                                return (
                                                                    <ThemeOptionButton key={t} value={t} Icon={Icon} activeClass={colors.themeActiveBg} />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Menu Sections */}
                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Profile</div>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <UserIcon className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">View Profile</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Edit2 className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Edit Profile</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <FileText className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Professional Details</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Account</div>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Settings2 className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Account Settings</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Bell className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Notification Preferences</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Sun className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Appearance</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Globe className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Language</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Shield className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Privacy & Security</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Workspace</div>
                                                        <Link href="/doctor/invites" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Building2 className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">My Hospitals</span>
                                                        </Link>
                                                        <Link href="/doctor/schedule" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <CalendarDays className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">My Schedule</span>
                                                        </Link>
                                                        <Link href="/doctor/earnings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <CreditCard className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Earnings</span>
                                                        </Link>
                                                        <Link href="/doctor" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <BarChart2 className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Analytics</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Support</div>
                                                        <button className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <HelpCircle className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Help Center</span>
                                                        </button>
                                                        <button className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <MessageSquare className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Contact Support</span>
                                                        </button>
                                                        <button className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <BookOpen className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Documentation</span>
                                                        </button>
                                                    </div>

                                                    {/* Account Info Section */}
                                                    <div className="p-4 bg-gray-50 dark:bg-[#131A2B]/50">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Email</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold">{user?.email || 'Not provided'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Phone Number</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold">{user?.phone || 'Not provided'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Medical Reg No</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold">{user?.role === 'doctor' ? (doctorStore.doctorProfile?.registration_number || 'Not provided') : 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Account Status</span>
                                                                <span className={cn(
                                                                    "font-bold px-2 py-0.5 rounded-md border",
                                                                    user?.is_verified ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                                                                )}>
                                                                    {user?.is_verified ? 'Verified' : 'Pending'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Member Since</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : user?.role === 'clinic_owner' ? (
                                            <>
                                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                                                    {/* Premium Clinic Header */}
                                                    <div className={cn("p-6 bg-gradient-to-b border-b border-gray-200 dark:border-gray-800", colors.dropdownHeaderBg)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative shrink-0">
                                                                <div className={cn("h-16 w-16 rounded-full bg-gradient-to-br p-[2px]", colors.dropdownAvatarBorder)}>
                                                                    <div className="h-full w-full rounded-full bg-white dark:bg-[#0B1020] flex items-center justify-center">
                                                                        <span className={cn("text-xl font-bold", colors.dropdownAvatarText)}>{getInitials(displayName)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-white dark:bg-[#0B1020] rounded-full flex items-center justify-center">
                                                                    <div className="h-3.5 w-3.5 bg-pink-500 rounded-full flex items-center justify-center text-white">
                                                                        <Building2 className="h-2 w-2" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate w-full">{displayName}</h3>
                                                                <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
                                                                    <Building2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                                                                    <span className="text-xs font-bold text-pink-500">Clinic Owner</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-2 shrink-0">
                                                                    <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md text-pink-500 bg-pink-500/10">
                                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-pink-500 animate-pulse"></span> Active
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Theme Switcher Segmented Control */}
                                                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="flex w-full bg-gray-100 dark:bg-[#131A2B] p-1.5 gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800">
                                                            {(['light', 'dark', 'system'] as const).map((t) => {
                                                                const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                                                                return (
                                                                    <ThemeOptionButton key={t} value={t} Icon={Icon} activeClass={colors.themeActiveBg} />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Menu Sections */}
                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Profile</div>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <UserIcon className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">View Clinic Profile</span>
                                                        </Link>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Edit2 className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Edit Clinic Profile</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Organization</div>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Settings2 className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Clinic Settings</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Security</div>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Shield className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} />
                                                            <span className="truncate">Security & Password</span>
                                                        </Link>
                                                    </div>

                                                    {/* Account Info Section */}
                                                    <div className="p-4 bg-gray-50 dark:bg-[#131A2B]/50">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Email</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold truncate max-w-[200px]" title={user?.email || ''}>{user?.email || 'Not provided'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Phone Number</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold truncate max-w-[200px]">{user?.phone || 'Not provided'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* Standard / Non-Doctor Profile Layout */
                                            <div className="flex flex-col">
                                                {/* Profile Header */}
                                                <div className={cn("px-4 py-4 bg-gradient-to-br border-b border-gray-100 dark:border-gray-700", colors.dropdownHeaderBg)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'h-11 w-11 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0',
                                                            colors.avatar
                                                        )}>
                                                            {getInitials(displayName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{displayName}</p>
                                                            <span className={cn(
                                                                "inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                                                colors.activeIcon,
                                                                config.theme.color === 'purple'
                                                                    ? 'bg-purple-100 dark:bg-purple-900/40'
                                                                    : config.theme.color === 'pink'
                                                                    ? 'bg-pink-100 dark:bg-pink-900/40'
                                                                    : config.theme.color === 'orange'
                                                                    ? 'bg-orange-100 dark:bg-orange-900/40'
                                                                    : 'bg-emerald-100 dark:bg-emerald-900/40'
                                                            )}>
                                                                {user?.role?.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Navigation Links */}
                                                {config.showFullDropdown && (
                                                    <div className="p-3 space-y-1 border-b border-gray-100 dark:border-gray-700">
                                                        <Link
                                                            href={config.profileHref || `/${user?.role?.replace(/_owner|_manager/, '')}/settings`}
                                                            onClick={() => setDropdownOpen(false)}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-150 group w-full",
                                                                "hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-900 dark:hover:text-purple-100"
                                                            )}
                                                        >
                                                            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors shrink-0">
                                                                <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                                                            </span>
                                                            <span className="flex-1">View Profile</span>
                                                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-purple-400 dark:group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                        </Link>
                                                        {config.settingsHref && (
                                                            <Link
                                                                href={config.settingsHref}
                                                                onClick={() => setDropdownOpen(false)}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-150 group w-full",
                                                                    "hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-900 dark:hover:text-purple-100"
                                                                )}
                                                            >
                                                                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors shrink-0">
                                                                    <Settings2 className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                                                                </span>
                                                                <span className="flex-1">Account &amp; Settings</span>
                                                                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-purple-400 dark:group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Theme Toggle Row */}
                                                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Theme</p>
                                                    <div className="flex items-center gap-1.5">
                                                        {(['light', 'dark', 'system'] as const).map((t) => {
                                                            const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                                                            return (
                                                                <ThemeOptionButton key={t} value={t} Icon={Icon} activeClass={colors.themeActiveBg} />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Common Footer */}
                                        <div className="p-4 mt-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B1020] space-y-2">
                                            {user?.role === 'doctor' && (
                                                <button className="flex items-center w-full px-4 min-h-[56px] text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#131A2B] rounded-xl transition-all group active:bg-gray-200 dark:active:bg-gray-800">
                                                    <span className="flex items-center gap-3 shrink-0">
                                                        <Repeat className={cn("w-5 h-5 text-gray-700 dark:text-gray-400 transition-colors shrink-0", colors.dropdownIconHover)} /> Switch Account
                                                    </span>
                                                </button>
                                            )}
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 min-h-[56px] text-sm font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all group active:bg-rose-100 dark:active:bg-rose-500/20"
                                            >
                                                <span className="flex items-center gap-3 shrink-0">
                                                    <LogOut className="w-5 h-5 shrink-0" /> Sign Out
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    {config.showApprovalBanner && user?.approval_status && user.approval_status !== 'approved' && (
                        <ApprovalBanner
                            status={user.approval_status}
                            reason={user.approval_notes}
                            className="mb-6"
                        />
                    )}
                    <ErrorBoundary>
                        {isPageBlocked ? (
                            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-8 text-center">
                                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                    <svg className="h-12 w-12 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {normalizedApprovalStatus === 'pending' && 'Approval Required'}
                                        {normalizedApprovalStatus === 'review' && 'Under Review'}
                                        {normalizedApprovalStatus === 'rejected' && 'Profile Rejected'}
                                        {normalizedApprovalStatus === 'suspended' && 'Account Suspended'}
                                    </h2>
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                        {normalizedApprovalStatus === 'pending' && 'Your profile must be approved by an admin before you can access this portal. You can still use Settings to complete or correct your profile.'}
                                        {normalizedApprovalStatus === 'review' && 'Your profile is currently being reviewed. This usually takes 24-48 hours. You will be notified once approved.'}
                                        {normalizedApprovalStatus === 'rejected' && 'Your profile was rejected. Use Settings to correct the rejection reason and save to resubmit for review.'}
                                        {normalizedApprovalStatus === 'suspended' && 'Your account has been suspended. Please contact support for more information.'}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    {config.settingsHref && (
                                        <a
                                            href={config.settingsHref}
                                            className={cn('px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium', colors.avatar, colors.hover)}
                                        >
                                            Open Settings
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            children
                        )}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}

// ----- Auth Guard Wrapper -----
export default function DashboardLayout({
    config,
    children,
}: {
    config: DashboardConfig;
    children: ReactNode;
}) {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated, isLoggingOut } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const allowedRoles = Array.isArray(config.role) ? config.role : [config.role];
    const roleMatches = user?.role != null && (
        allowedRoles.includes(user.role) ||
        (allowedRoles.includes('admin') && user.role === 'super_admin') ||
        (allowedRoles.includes('hospital_owner') && user.role === 'hospital_manager') ||
        // Pharmacy member roles: match if any pharmacy role is in allowedRoles
        ((allowedRoles.includes('pharmacy_owner') || allowedRoles.includes('pharmacy_manager') || allowedRoles.includes('pharmacy_staff')) &&
            (user.role === 'pharmacy_manager' || user.role === 'pharmacy_staff'))
    );

    useEffect(() => {
        if (isMounted && _hasHydrated && (!isAuthenticated || !roleMatches) && !isLoggingOut) {
            router.replace(config.loginPath);
        }
    }, [isMounted, _hasHydrated, isAuthenticated, roleMatches, router, config.loginPath, isLoggingOut]);

    if (!isMounted || !_hasHydrated) {
        return null;
    }

    if (!isAuthenticated || !roleMatches) {
        return null;
    }

    return <BaseDashboardLayout config={config}>{children}</BaseDashboardLayout>;
}
