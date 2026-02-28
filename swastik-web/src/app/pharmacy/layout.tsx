'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Package, ShoppingCart, BarChart3, Settings, LogOut, Pill, Bell, ChevronDown, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn, getInitials } from '@/lib/utils';
import { ApprovalBanner } from '@/components/shared/ApprovalBanner';
import { NotificationBell, NotificationPanel } from '@/components/ui/Toast';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useNotifications, useOrderUpdates } from '@/hooks/useSocket';

const PHARMACY_NAV = [
    { name: 'Dashboard', href: '/pharmacy', icon: LayoutDashboard },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: FileText },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: Package },
    { name: 'Orders', href: '/pharmacy/orders', icon: ShoppingCart },
    { name: 'Reports', href: '/pharmacy/reports', icon: BarChart3 },
    { name: 'Settings', href: '/pharmacy/settings', icon: Settings },
];

export default function PharmacyLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const { notifications, unreadCount, clearNotifications } = useNotifications();
    const [newOrderCount, setNewOrderCount] = useState(0);
    const { newOrders } = useOrderUpdates(undefined, () => {
        setNewOrderCount((prev) => prev + 1);
    });

    useEffect(() => { if (_hasHydrated && (!isAuthenticated || user?.role !== 'pharmacy_owner')) router.push('/login/pharmacy'); }, [isAuthenticated, _hasHydrated, user, router]);

    if (!_hasHydrated || !isAuthenticated || user?.role !== 'pharmacy_owner') {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><div className="animate-spin h-8 w-8 border-4 border-orange-600 border-t-transparent rounded-full"></div></div>;
    }

    const handleLogout = () => { logout(); router.push('/login/pharmacy'); };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950" data-theme="pharmacy">
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <aside className={cn('fixed top-0 left-0 z-50 h-full w-64 bg-orange-900 text-white transition-transform lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-orange-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-700 rounded-lg"><Pill className="h-5 w-5" /></div>
                        <div><h1 className="font-bold text-lg">Pharmacy Portal</h1><p className="text-xs text-orange-300">Fulfillment Console</p></div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-orange-800 rounded"><X className="h-5 w-5" /></button>
                </div>
                <nav className="p-4 space-y-1">
                    {PHARMACY_NAV.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/pharmacy' && pathname.startsWith(item.href)); const Icon = item.icon;
                        const badge = item.name === 'Orders' && newOrderCount > 0 ? newOrderCount : null;
                        return <Link key={item.name} href={item.href} onClick={() => { if (item.name === 'Orders') setNewOrderCount(0); }} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative', isActive ? 'bg-orange-700 text-white' : 'text-orange-100 hover:bg-orange-800')}><Icon className="h-5 w-5" />{item.name}{badge && <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">{badge > 99 ? '99+' : badge}</span>}</Link>;
                    })}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-orange-800"><button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-orange-100 hover:bg-orange-800 transition-colors"><LogOut className="h-5 w-5" />Sign Out</button></div>
            </aside>
            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Menu className="h-5 w-5" /></button>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{PHARMACY_NAV.find(item => pathname === item.href || (item.href !== '/pharmacy' && pathname.startsWith(item.href)))?.name || 'Dashboard'}</h2>
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
                        <div className="relative"><button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">{getInitials(user?.name || 'Pharmacy')}</div><ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" /></button>
                            {dropdownOpen && (<><div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} /><div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"><button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700">Sign Out</button></div></>)}
                        </div>
                    </div>
                </header>
                <main className="p-4 lg:p-6">{user?.approval_status && user.approval_status !== 'approved' && <ApprovalBanner status={user.approval_status} reason={user.approval_notes} className="mb-6" />}{children}</main>
            </div>
        </div>
    );
}
