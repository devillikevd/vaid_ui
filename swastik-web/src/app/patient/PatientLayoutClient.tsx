'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Calendar,
    Stethoscope,
    BookOpen,
    User as UserIcon,
    Smartphone,
    LogIn,
    LogOut,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';

import VaidideaLogo from '@/components/shared/VaidideaLogo';
import Footer from '@/components/landing/Footer';
import AppDownloadModal from '@/components/shared/AppDownloadModal';
import AuthGateModal from '@/components/auth/AuthGateModal';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';
import { patientApi } from '@/lib/api';
import { ThemeProvider, useTheme } from '@/components/shared/ThemeProvider';

function PatientLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const { isOpen, title, description, actionType, returnUrl, closeAuthGate } = useAuthGate();
    
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [appModalOpen, setAppModalOpen] = useState(false);
    const [patientProfile, setPatientProfile] = useState<any>(null);
    const { resolvedTheme } = useTheme();

    // Fetch patient profile if authenticated
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
        setMobileMenuOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        logout();
        setPatientProfile(null);
        router.push('/');
    };

    const displayName = patientProfile?.name || user?.name || 'Patient';
    const loginUrl = `/login/patient?redirect=${encodeURIComponent(pathname || '/patient')}`;

    // Minimal Navigation Items as required:
    // Vaididea logo, Find Doctors, Health Library, Appointments, Profile, Get the App
    const navLinks = [
        { href: '/doctors', label: 'Find Doctors', icon: Stethoscope },
        { href: '/health-library', label: 'Health Library', icon: BookOpen },
        { href: '/patient/appointments', label: 'Appointments', icon: Calendar },
        { href: '/patient#profile', label: 'Profile', icon: UserIcon },
    ];

    return (
        <div className={`min-h-screen bg-[#FAF8F4] dark:bg-[#080e1a] text-gray-900 dark:text-gray-100 flex flex-col selection:bg-vd-forest selection:text-white font-sans ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
            {/* Global Auth Gate Modal */}
            <AuthGateModal
                isOpen={isOpen}
                onClose={closeAuthGate}
                title={title}
                description={description}
                actionType={actionType}
                returnUrl={returnUrl || pathname}
            />

            {/* Minimal Top Navigation Header */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-stone-200/80 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Link href="/" className="flex items-center gap-2 group min-w-0">
                            <VaidideaLogo className="w-7 h-7 sm:w-8 sm:h-8 text-vd-forest transition-transform group-hover:scale-105 shrink-0" />
                            <span className="font-heading font-bold text-base sm:text-xl tracking-tight text-vd-forest uppercase truncate">
                                VAIDIDEA
                            </span>
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/40 text-vd-forest dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                Patient Portal
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Minimal Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
                        {navLinks.map((item) => {
                            const isActive =
                                item.href === '/doctors'
                                    ? pathname?.startsWith('/doctors')
                                    : item.href === '/health-library'
                                    ? pathname?.startsWith('/health-library')
                                    : item.href === '/patient/appointments'
                                    ? pathname === '/patient/appointments'
                                    : pathname === '/patient';

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
                                        isActive
                                            ? 'text-vd-forest bg-emerald-50/80 dark:bg-emerald-950/40 font-semibold'
                                            : 'text-stone-700 dark:text-stone-300 hover:text-vd-forest hover:bg-stone-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <item.icon className="w-3.5 h-3.5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Controls: Get the App & Account Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setAppModalOpen(true)}
                            aria-label="Get the App"
                            title="Get the App"
                            className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-[13px] font-bold text-white bg-vd-forest hover:bg-vd-forest-deep transition-all shadow-xs cursor-pointer shrink-0"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span className="hidden min-[400px]:inline">Get the App</span>
                        </button>

                        {isPatient ? (
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <Link
                                    href="/patient#profile"
                                    className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-gray-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-gray-700 text-xs font-semibold hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="w-5 h-5 rounded-full bg-vd-forest text-white flex items-center justify-center font-bold text-[10px]">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="max-w-[100px] truncate">{displayName}</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title="Sign Out"
                                    aria-label="Sign Out"
                                    className="p-2 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <Link
                                href={loginUrl}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-full text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-vd-forest hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Sign In</span>
                            </Link>
                        )}

                        {/* Mobile Hamburger Button */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                            aria-label="Toggle Navigation Menu"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            <div
                className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity md:hidden ${
                    mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setMobileMenuOpen(false)}
            >
                <div
                    className={`fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-gray-900 shadow-xl p-5 flex flex-col justify-between transition-transform duration-200 transform ${
                        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <VaidideaLogo className="w-6 h-6 text-vd-forest" />
                                <span className="font-heading text-lg font-bold text-vd-forest uppercase">
                                    VAIDIDEA
                                </span>
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Minimal Mobile Navigation */}
                        <div className="space-y-1">
                            {navLinks.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-between p-3 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <item.icon className="w-4 h-4 text-vd-forest" />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-stone-400" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-stone-200 dark:border-gray-800 space-y-2">
                        <button
                            type="button"
                            onClick={() => {
                                setMobileMenuOpen(false);
                                setAppModalOpen(true);
                            }}
                            className="w-full py-2.5 rounded-xl bg-vd-forest text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                            <Smartphone className="w-4 h-4" />
                            <span>Get the Patient App</span>
                        </button>

                        {isPatient ? (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full py-2 text-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign Out</span>
                            </button>
                        ) : (
                            <Link
                                href={loginUrl}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block w-full py-2 text-center rounded-xl bg-stone-100 dark:bg-gray-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-semibold"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* App Download Modal */}
            <AppDownloadModal
                isOpen={appModalOpen}
                onClose={() => setAppModalOpen(false)}
            />

            {/* Page View Container without sidebar */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Official Dark Footer */}
            <Footer />
        </div>
    );
}

export default function PatientLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider storageKey="vaididea-theme-patient">
            <PatientLayoutContent>{children}</PatientLayoutContent>
        </ThemeProvider>
    );
}
