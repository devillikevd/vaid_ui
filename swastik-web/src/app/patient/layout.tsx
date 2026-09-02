'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Stethoscope,
    Calendar,
    FileText,
    Microscope,
    Pill,
    CreditCard,
    QrCode,
    Bot,
    LogOut,
    Menu,
    X,
    User as UserIcon,
    ArrowLeft,
    Sparkles,
    MessageSquare,
    LogIn,
    UserPlus,
    Lock,
    BookOpen
} from 'lucide-react';

import VaidideaLogo from '@/components/shared/VaidideaLogo';
import PatientProfileMenu from '@/components/patient/PatientProfileMenu';
import PatientNotificationDropdown from '@/components/patient/PatientNotificationDropdown';
import AuthGateModal from '@/components/auth/AuthGateModal';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';
import { patientApi } from '@/lib/api';
import { ThemeProvider, useTheme } from '@/components/shared/ThemeProvider';

const NAV_ITEMS = [
    { href: '/patient', label: 'Dashboard', icon: LayoutDashboard, exact: true, requiresAuth: false },
    { href: '/patient/doctors', label: 'Find Doctors', icon: Stethoscope, requiresAuth: false },
    { href: '/patient/health-library', label: 'Health Library', icon: BookOpen, requiresAuth: false },
    { href: '/patient/appointments', label: 'Appointments', icon: Calendar, requiresAuth: true },
    { href: '/patient/records', label: 'Health Records', icon: FileText, requiresAuth: true },
    { href: '/patient/diagnostics', label: 'Diagnostics', icon: Microscope, requiresAuth: false },
    { href: '/patient/pharmacy', label: 'Pharmacy', icon: Pill, requiresAuth: false },
    { href: '/patient/community', label: 'Community Q&A', icon: MessageSquare, requiresAuth: false },
    { href: '/patient/digital-health-card', label: 'Digital Health Card', icon: QrCode, requiresAuth: true },
    { href: '/patient/health-id', label: 'Health ID (ABHA)', icon: CreditCard, requiresAuth: true },
    { href: '/patient/assistant', label: 'AI Health Assistant', icon: Bot, badge: 'AI', requiresAuth: true },
];

function PatientLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const { isOpen, title, description, actionType, returnUrl, closeAuthGate } = useAuthGate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [patientProfile, setPatientProfile] = useState<any>(null);
    const { resolvedTheme } = useTheme();

    // Fetch patient profile ONLY if authenticated as a patient
    useEffect(() => {
        if (isPatient) {
            patientApi
                .getProfile()
                .then((res) => {
                    if (res.success && res.data) {
                        setPatientProfile(res.data);
                    }
                })
                .catch(() => {});
        } else {
            setPatientProfile(null);
        }
    }, [isPatient]);

    // Close mobile drawer on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        logout();
        setPatientProfile(null);
        router.push('/');
    };

    const bloodGroup = patientProfile?.blood_group || patientProfile?.bloodGroup || null;
    const loginUrl = `/login/patient?redirect=${encodeURIComponent(pathname || '/patient')}`;
    const registerUrl = `/register/patient?redirect=${encodeURIComponent(pathname || '/patient')}`;

    return (
        <div className={`min-h-screen bg-[#FAF8F4] dark:bg-[#080e1a] text-gray-900 dark:text-gray-100 flex flex-col selection:bg-vd-forest selection:text-white font-sans ${resolvedTheme === 'dark' ? 'dark' : ''}`} data-theme="patient">
            {/* Global Auth Gate Modal */}
            <AuthGateModal
                isOpen={isOpen}
                onClose={closeAuthGate}
                title={title}
                description={description}
                actionType={actionType}
                returnUrl={returnUrl || pathname}
            />

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-stone-200/80 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    {/* Brand & Mobile Menu Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 hover:text-stone-900 dark:hover:text-white transition-colors"
                            aria-label="Toggle Navigation"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <Link href="/" className="flex items-center gap-2.5 group">
                            <VaidideaLogo className="w-7 h-7 text-vd-forest transition-transform group-hover:scale-105" />
                            <span className="font-heading font-bold text-lg sm:text-xl tracking-tight text-vd-forest uppercase">
                                VAIDIDEA
                            </span>
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/40 text-vd-forest dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Patient Portal
                            </span>
                        </Link>
                    </div>

                    {/* Right Header Status & User Controls */}
                    <div className="flex items-center gap-3">
                        {isPatient ? (
                            <>
                                {bloodGroup && (
                                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span>Blood Group: {bloodGroup}</span>
                                    </div>
                                )}

                                <PatientNotificationDropdown />

                                <Link
                                    href="/patient/assistant"
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 text-vd-forest dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-all shadow-xs"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-vd-forest dark:text-emerald-300" />
                                    <span>AI Assistant</span>
                                </Link>

                                {/* Interactive Patient Profile Menu */}
                                <PatientProfileMenu
                                    user={user}
                                    patientProfile={patientProfile}
                                    onLogout={handleLogout}
                                />
                            </>
                        ) : (
                            /* Guest / Visitor Controls */
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/patient/doctors"
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white text-xs font-semibold hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Stethoscope className="w-3.5 h-3.5 text-vd-forest dark:text-emerald-400" />
                                    <span>Find Doctors</span>
                                </Link>

                                <Link
                                    href="/patient/health-library"
                                    className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white text-xs font-semibold hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <BookOpen className="w-3.5 h-3.5 text-vd-forest dark:text-emerald-400" />
                                    <span>Health Library</span>
                                </Link>

                                <Link
                                    href={loginUrl}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 dark:bg-gray-800 hover:bg-stone-200 dark:hover:bg-gray-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-all"
                                >
                                    <LogIn className="w-3.5 h-3.5" />
                                    <span>Sign In</span>
                                </Link>

                                <Link
                                    href={registerUrl}
                                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-vd-forest hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Register</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Portal Viewport with Desktop Left Drawer */}
            <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-8">
                {/* Desktop Sticky Sidebar */}
                <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-6">
                    <div className="space-y-6">
                        {/* Portal Welcome / Auth Status Badge */}
                        <div className="bg-white dark:bg-gray-900 border border-stone-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-vd-forest dark:text-emerald-300 font-bold text-sm">
                                    {isPatient ? (user?.name ? user.name[0].toUpperCase() : 'P') : <UserIcon className="w-5 h-5 text-stone-400" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                                        {isPatient ? (patientProfile?.name || user?.name || 'Patient Account') : 'Guest Explorer'}
                                    </p>
                                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium tracking-wide">
                                        {isPatient ? 'Personal Health Record' : 'Sign in to access records'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="space-y-1">
                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                                            isActive
                                                ? 'bg-vd-forest text-white shadow-md shadow-emerald-950/10 font-bold'
                                                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 hover:text-stone-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400 dark:text-stone-500'}`} />
                                            <span>{item.label}</span>
                                        </div>
                                        {item.badge ? (
                                            <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                                    isActive
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-vd-forest dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                }`}
                                            >
                                                {item.badge}
                                            </span>
                                        ) : !isPatient && item.requiresAuth ? (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold text-stone-400 bg-stone-100 dark:bg-gray-800 flex items-center gap-0.5">
                                                <Lock className="w-2.5 h-2.5" />
                                            </span>
                                        ) : null}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>


                {/* Mobile Drawer */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-50 lg:hidden bg-black/40 backdrop-blur-xs flex"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <div
                            className="w-72 bg-white dark:bg-gray-900 h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-gray-800">
                                    <Link
                                        href="/"
                                        onClick={() => setSidebarOpen(false)}
                                        aria-label="Vaididea Home"
                                        className="flex items-center gap-2 group cursor-pointer"
                                    >
                                        <VaidideaLogo className="w-6 h-6 text-vd-forest transition-transform group-hover:scale-105" />
                                        <span className="font-heading font-bold text-stone-900 dark:text-stone-100 text-base">
                                             VAIDIDEA
                                        </span>
                                    </Link>
                                    <button
                                        onClick={() => setSidebarOpen(false)}
                                        className="p-1 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <nav className="space-y-1">
                                    {NAV_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = item.exact
                                            ? pathname === item.href
                                            : pathname.startsWith(item.href);

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                                                    isActive
                                                        ? 'bg-vd-forest text-white font-bold'
                                                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className="w-4 h-4" />
                                                    <span>{item.label}</span>
                                                </div>
                                                {item.badge ? (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white font-bold uppercase">
                                                        {item.badge}
                                                    </span>
                                                ) : !isPatient && item.requiresAuth ? (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold text-stone-400 bg-stone-100 dark:bg-gray-800 flex items-center gap-0.5">
                                                        <Lock className="w-2.5 h-2.5" />
                                                    </span>
                                                ) : null}
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="pt-4 border-t border-stone-100 dark:border-gray-800 space-y-2">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2 text-stone-600 dark:text-stone-400 text-xs font-medium p-2 hover:bg-stone-50 dark:hover:bg-gray-800 rounded-xl"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Return to Main Website</span>
                                </Link>

                                {isPatient ? (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs transition-colors cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Sign Out</span>
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href={loginUrl}
                                            className="w-full text-center py-2.5 rounded-xl bg-vd-forest text-white font-bold text-xs shadow-xs"
                                        >
                                            Sign In
                                        </Link>
                                        <Link
                                            href={registerUrl}
                                            className="w-full text-center py-2.5 rounded-xl bg-stone-100 dark:bg-gray-800 text-stone-800 dark:text-stone-200 font-semibold text-xs"
                                        >
                                            Create Account
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* Page View Container */}
                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </div>
    );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider storageKey="vaididea-theme-patient">
            <PatientLayoutContent>{children}</PatientLayoutContent>
        </ThemeProvider>
    );
}
