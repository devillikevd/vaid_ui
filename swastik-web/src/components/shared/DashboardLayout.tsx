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
function ThemeOptionButton({ value, Icon }: { value: 'light' | 'dark' | 'system'; Icon: LucideIcon }) {
    const { theme, setTheme } = useTheme();
    const isActive = theme === value;
    const labels = { light: '☀️ Light', dark: '🌙 Dark', system: '💻 System' };
    return (
        <button
            onClick={() => setTheme(value)}
            className={cn(
                'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                    ? 'bg-emerald-500 text-white shadow-sm'
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
}> = {
    blue: {
        sidebar: 'bg-blue-900',
        border: 'border-blue-800',
        active: 'bg-blue-700 text-white',
        text: 'text-blue-100',
        hover: 'hover:bg-blue-800',
        avatar: 'bg-blue-600',
        spinner: 'border-blue-600',
        logoBg: 'bg-blue-700',
    },
    emerald: {
        sidebar: 'bg-white dark:bg-[#0B1020]',
        border: 'border-gray-200 dark:border-gray-800/60',
        active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
        text: 'text-gray-600 dark:text-gray-400',
        hover: 'hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200',
        avatar: 'bg-emerald-600',
        spinner: 'border-emerald-600',
        logoBg: 'bg-emerald-100 dark:bg-emerald-600/20',
    },
    teal: {
        sidebar: 'bg-teal-900',
        border: 'border-teal-800',
        active: 'bg-teal-700 text-white',
        text: 'text-teal-100',
        hover: 'hover:bg-teal-800',
        avatar: 'bg-teal-600',
        spinner: 'border-teal-600',
        logoBg: 'bg-teal-700',
    },
    orange: {
        sidebar: 'bg-orange-900',
        border: 'border-orange-800',
        active: 'bg-orange-700 text-white',
        text: 'text-orange-100',
        hover: 'hover:bg-orange-800',
        avatar: 'bg-orange-600',
        spinner: 'border-orange-600',
        logoBg: 'bg-orange-700',
    },
    pink: {
        sidebar: 'bg-pink-900',
        border: 'border-pink-800',
        active: 'bg-pink-700 text-white',
        text: 'text-pink-100',
        hover: 'hover:bg-pink-800',
        avatar: 'bg-pink-600',
        spinner: 'border-pink-600',
        logoBg: 'bg-pink-700',
    },
    purple: {
        sidebar: 'bg-purple-900',
        border: 'border-purple-800',
        active: 'bg-purple-700 text-white',
        text: 'text-purple-100',
        hover: 'hover:bg-purple-800',
        avatar: 'bg-purple-600',
        spinner: 'border-purple-600',
        logoBg: 'bg-purple-700',
    },
    lime: {
        sidebar: 'bg-lime-950',
        border: 'border-lime-900',
        active: 'bg-lime-700 text-white',
        text: 'text-lime-100',
        hover: 'hover:bg-lime-900',
        avatar: 'bg-lime-600',
        spinner: 'border-lime-600',
        logoBg: 'bg-lime-700',
    },
};

// Subtitle color classes (needs dynamic shade)
const SUBTITLE_CLASSES: Record<string, string> = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    teal: 'text-teal-300',
    orange: 'text-orange-300',
    pink: 'text-pink-300',
    purple: 'text-purple-300',
    lime: 'text-lime-300',
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
        (allowedRoles.includes('admin') && user.role === 'super_admin')
    );

    // Calculate dynamic stats for doctor dropdown
    const averageRating = doctorStore.reviews.length > 0
        ? (doctorStore.reviews.reduce((acc, r) => acc + r.rating, 0) / doctorStore.reviews.length).toFixed(1)
        : '5.0';
    const totalPatients = doctorStore.patientsPagination.total > 0 ? doctorStore.patientsPagination.total : 0;
    const formattedPatients = totalPatients >= 1000 ? `${(totalPatients / 1000).toFixed(1)}k` : totalPatients.toString();
    const todaysCount = doctorStore.stats?.todaysAppointments ?? doctorStore.stats?.totalPatientsToday ?? doctorStore.todaysAppointments?.length ?? 0;
    const yearsExp = doctorStore.doctorProfile?.experience_years ?? 0;

    const normalizedApprovalStatus = user?.approval_status === 'under_review' ? 'review' : user?.approval_status;

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);



    if (!isMounted || !_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className={cn('animate-spin h-8 w-8 border-4 border-t-transparent rounded-full', colors.spinner)} />
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        router.push(config.loginPath);
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
    const basePath = `/${baseRoleStr?.replace(/_owner|_manager/, '')}`;

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
                    desktopCollapsed ? 'w-64 lg:w-20' : 'w-64',
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
                        <div className="shrink-0 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1">
                            <VaidideaLogo className="w-8 h-8" />
                        </div>
                        <div className="whitespace-nowrap">
                            <h1 className="font-bold text-[15px] text-gray-900 dark:text-white tracking-tight">{config.portalTitle}</h1>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{config.portalSubtitle}</p>
                        </div>
                    </div>
                    {desktopCollapsed && (
                        <div className="shrink-0 hidden lg:flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1">
                            <VaidideaLogo className="w-8 h-8" />
                        </div>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={closeSidebar}
                            className="lg:hidden p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
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
                                        "px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap text-gray-400 dark:text-gray-600",
                                        desktopCollapsed ? "lg:hidden" : ""
                                    )}>
                                        {sectionName}
                                    </div>
                                )}
                                {sectionName && desktopCollapsed && (
                                    <div className="h-px hidden lg:block bg-gray-200 dark:bg-gray-800/50 mx-2 mb-2" />
                                )}
                                {items.map((item) => {
                                    const isActive = pathname === item.href ||
                                        (item.href !== basePath && pathname?.startsWith(item.href));
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={item.onClick}
                                            title={desktopCollapsed ? item.name : undefined}
                                            className={cn(
                                                'relative flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                                                desktopCollapsed ? 'lg:justify-center px-3 lg:px-0 lg:py-3' : 'px-3',
                                                isActive
                                                    ? colors.active
                                                    : cn(colors.text, colors.hover)
                                            )}
                                        >
                                            {/* Active left indicator */}
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                            )}
                                            <Icon className={cn(
                                                'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                                                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
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
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
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
                                className="w-full pl-10 pr-14 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
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
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left"
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
                                    <div className="absolute right-0 mt-2 w-[95vw] sm:w-[500px] bg-white/95 dark:bg-[#0B1020]/95 backdrop-blur-xl rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 flex flex-col max-h-[85vh]">
                                        {user?.role === 'doctor' ? (
                                            <>
                                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                                                    {/* Premium Doctor Header */}
                                                    <div className="p-6 bg-gradient-to-b from-emerald-500/10 to-transparent border-b border-gray-200 dark:border-gray-800">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative shrink-0">
                                                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 p-[2px]">
                                                                    <div className="h-full w-full rounded-full bg-white dark:bg-[#0B1020] flex items-center justify-center">
                                                                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{getInitials(displayName)}</span>
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
                                                        <div className="grid grid-cols-4 gap-3 mt-6">
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
                                                                    <ThemeOptionButton key={t} value={t} Icon={Icon} />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Menu Sections */}
                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Profile</div>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">View Profile</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Edit2 className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Edit Profile</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <FileText className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Professional Details</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Account</div>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Settings2 className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Account Settings</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Notification Preferences</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Sun className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Appearance</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Globe className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Language</span>
                                                        </Link>
                                                        <Link href="/doctor/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Shield className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Privacy & Security</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Workspace</div>
                                                        <Link href="/doctor/invites" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Building2 className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">My Hospitals</span>
                                                        </Link>
                                                        <Link href="/doctor/schedule" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <CalendarDays className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">My Schedule</span>
                                                        </Link>
                                                        <Link href="/doctor/earnings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <CreditCard className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Earnings</span>
                                                        </Link>
                                                        <Link href="/doctor" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <BarChart2 className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Analytics</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Support</div>
                                                        <button className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <HelpCircle className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Help Center</span>
                                                        </button>
                                                        <button className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                                                            <span className="truncate">Contact Support</span>
                                                        </button>
                                                        <button className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
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
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold">MED-2026-892</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Membership Plan</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">Enterprise</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-400 font-medium">Last Login</span>
                                                                <span className="text-gray-700 dark:text-gray-300 font-bold">Just now</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : user?.role === 'clinic_owner' ? (
                                            <>
                                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                                                    {/* Premium Clinic Header */}
                                                    <div className="p-6 bg-gradient-to-b from-pink-500/10 to-transparent border-b border-gray-200 dark:border-gray-800">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative shrink-0">
                                                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 p-[2px]">
                                                                    <div className="h-full w-full rounded-full bg-white dark:bg-[#0B1020] flex items-center justify-center">
                                                                        <span className="text-xl font-bold text-pink-600 dark:text-pink-400">{getInitials(displayName)}</span>
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
                                                                    <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md text-emerald-500 bg-emerald-500/10">
                                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 animate-pulse"></span> Active
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
                                                                    <ThemeOptionButton key={t} value={t} Icon={Icon} />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Menu Sections */}
                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Profile</div>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors shrink-0" />
                                                            <span className="truncate">View Clinic Profile</span>
                                                        </Link>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Edit2 className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors shrink-0" />
                                                            <span className="truncate">Edit Clinic Profile</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Organization</div>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Settings2 className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors shrink-0" />
                                                            <span className="truncate">Clinic Settings</span>
                                                        </Link>
                                                    </div>

                                                    <div className="p-3 space-y-1 border-b border-gray-200 dark:border-gray-800">
                                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Security</div>
                                                        <Link href="/clinic/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 min-h-[56px] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#131A2B] transition-all group active:bg-gray-100 dark:active:bg-gray-800 w-full">
                                                            <Shield className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors shrink-0" />
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
                                                <div className="px-4 py-4 bg-gradient-to-br from-emerald-500/10 to-emerald-700/5 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'h-11 w-11 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0',
                                                            colors.avatar
                                                        )}>
                                                            {getInitials(displayName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{displayName}</p>
                                                            <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 capitalize">
                                                                {user?.role?.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Navigation Links */}
                                                {config.showFullDropdown && (
                                                    <div className="py-1.5">
                                                        <Link
                                                            href={`/${user?.role?.replace(/_owner|_manager/, '')}/settings`}
                                                            onClick={() => setDropdownOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                        >
                                                            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                                                <UserIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                            </span>
                                                            <span>View Profile</span>
                                                        </Link>
                                                        {config.settingsHref && (
                                                            <Link
                                                                href={config.settingsHref}
                                                                onClick={() => setDropdownOpen(false)}
                                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                            >
                                                                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-700">
                                                                    <Settings2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                                </span>
                                                                <span>Account &amp; Settings</span>
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
                                                                <ThemeOptionButton key={t} value={t} Icon={Icon} />
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
                                                        <Repeat className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" /> Switch Account
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
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const allowedRoles = Array.isArray(config.role) ? config.role : [config.role];
    const roleMatches = user?.role != null && (
        allowedRoles.includes(user.role) ||
        (allowedRoles.includes('admin') && user.role === 'super_admin') ||
        (allowedRoles.includes('hospital_owner') && user.role === 'hospital_manager')
    );

    useEffect(() => {
        if (isMounted && _hasHydrated && (!isAuthenticated || !roleMatches)) {
            router.push(config.loginPath);
        }
    }, [isMounted, _hasHydrated, isAuthenticated, roleMatches, router, config.loginPath]);

    if (!isMounted || !_hasHydrated) {
        return null;
    }

    if (!isAuthenticated || !roleMatches) {
        return null;
    }

    return <BaseDashboardLayout config={config}>{children}</BaseDashboardLayout>;
}
