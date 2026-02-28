'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Calendar, Clock, Settings, LogOut, Building, Bell, ChevronDown, Menu, X, Stethoscope } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn, getInitials } from '@/lib/utils';
import { ApprovalBanner } from '@/components/shared/ApprovalBanner';
import { NotificationBell, NotificationPanel } from '@/components/ui/Toast';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useNotifications } from '@/hooks/useSocket';

const CLINIC_NAV = [
    { name: 'Dashboard', href: '/clinic', icon: LayoutDashboard },
    { name: 'Staff', href: '/clinic/staff', icon: Users },
    { name: 'Appointments', href: '/clinic/appointments', icon: Calendar },
    { name: 'Consultations', href: '/clinic/consultations', icon: Stethoscope },
    { name: 'Schedule', href: '/clinic/schedule', icon: Clock },
    { name: 'Settings', href: '/clinic/settings', icon: Settings },
];

export default function ClinicLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const { notifications, unreadCount, clearNotifications } = useNotifications();

    useEffect(() => { if (_hasHydrated && (!isAuthenticated || user?.role !== 'clinic_owner')) router.push('/login/clinic'); }, [isAuthenticated, _hasHydrated, user, router]);

    if (!_hasHydrated || !isAuthenticated || user?.role !== 'clinic_owner') {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><div className="animate-spin h-8 w-8 border-4 border-pink-600 border-t-transparent rounded-full"></div></div>;
    }

    const handleLogout = () => { logout(); router.push('/login/clinic'); };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950" data-theme="clinic">
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <aside className={cn('fixed top-0 left-0 z-50 h-full w-64 bg-pink-900 text-white transition-transform lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-pink-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-700 rounded-lg"><Building className="h-5 w-5" /></div>
                        <div><h1 className="font-bold text-lg">Clinic Portal</h1><p className="text-xs text-pink-300">Scheduling Center</p></div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-pink-800 rounded"><X className="h-5 w-5" /></button>
                </div>
                <nav className="p-4 space-y-1">
                    {CLINIC_NAV.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/clinic' && pathname.startsWith(item.href)); const Icon = item.icon;
                        return <Link key={item.name} href={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-pink-700 text-white' : 'text-pink-100 hover:bg-pink-800')}><Icon className="h-5 w-5" />{item.name}</Link>;
                    })}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-pink-800"><button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-pink-100 hover:bg-pink-800 transition-colors"><LogOut className="h-5 w-5" />Sign Out</button></div>
            </aside>
            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Menu className="h-5 w-5" /></button>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{CLINIC_NAV.find(item => pathname === item.href || (item.href !== '/clinic' && pathname.startsWith(item.href)))?.name || 'Dashboard'}</h2>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <ConnectionIndicator />
                        <div className="relative">
                            <NotificationBell count={unreadCount} onClick={() => setNotifOpen(!notifOpen)} />
                            <NotificationPanel
                                notifications={notifications.map(n => ({ ...n, type: (n as any).type || 'info', title: (n as any).title || 'Notification', timestamp: (n as any).timestamp || new Date().toISOString() }))}
                                isOpen={notifOpen}
                                onClose={() => setNotifOpen(false)}
                                onClear={clearNotifications}
                            />
                        </div>
                        <div className="relative"><button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><div className="h-8 w-8 bg-pink-600 rounded-full flex items-center justify-center text-white text-sm font-medium">{getInitials(user?.name || 'Clinic')}</div><ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" /></button>
                            {dropdownOpen && (<><div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} /><div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"><button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700">Sign Out</button></div></>)}
                        </div>
                    </div>
                </header>
                <main className="p-4 lg:p-6">{user?.approval_status && user.approval_status !== 'approved' && <ApprovalBanner status={user.approval_status} reason={user.approval_notes} className="mb-6" />}{children}</main>
            </div>
        </div>
    );
}
