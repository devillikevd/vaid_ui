'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Calendar, Video, Users, Clock, Settings,
    Stethoscope, ClipboardList, Activity, MailCheck, Radar,
    MessageCircleQuestion, Star, IndianRupee, ChevronLeft, ChevronRight,
    type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VaidideaLogo from '@/components/shared/VaidideaLogo';

export type SidebarItem = {
    name: string;
    href: string;
    icon: LucideIcon;
    section?: string;
    badge?: number;
};

const DOCTOR_NAV_ITEMS: SidebarItem[] = [
    { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
    { name: 'Appointments', href: '/doctor/appointments', icon: Calendar, section: 'Clinical Work', badge: 3 },
    { name: 'Prescriptions', href: '/doctor/prescriptions', icon: ClipboardList, section: 'Clinical Work' },
    { name: 'Patients', href: '/doctor/patients', icon: Users, section: 'Clinical Work' },
    { name: 'Vitals', href: '/doctor/vitals', icon: Activity, section: 'Health & Monitoring' },
    { name: 'Health Alerts', href: '/doctor/health-alerts', icon: Radar, section: 'Health & Monitoring', badge: 1 },
    { name: 'Schedule', href: '/doctor/schedule', icon: Clock, section: 'Management' },
    { name: 'Invites', href: '/doctor/invites', icon: MailCheck, section: 'Management' },
    { name: 'Community', href: '/doctor/community', icon: MessageCircleQuestion, section: 'Management' },
    { name: 'Reviews', href: '/doctor/reviews', icon: Star, section: 'Management' },
    { name: 'Earnings', href: '/doctor/earnings', icon: IndianRupee, section: 'Management' },
    { name: 'Settings', href: '/doctor/settings', icon: Settings, section: 'Management' },
];

interface DoctorSidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (v: boolean) => void;
}

export function DoctorSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: DoctorSidebarProps) {
    const pathname = usePathname();

    // Group items by section
    const groupedItems = DOCTOR_NAV_ITEMS.reduce((acc, item) => {
        const section = item.section || 'General';
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {} as Record<string, SidebarItem[]>);

    const renderNavItems = () => {
        return Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="mb-6">
                {!isCollapsed && (
                    <h3 className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]/50 mb-2">
                        {section}
                    </h3>
                )}
                {isCollapsed && (
                    <div className="w-full flex justify-center mb-2">
                        <div className="w-4 h-[1px] bg-[rgba(255,255,255,0.1)]" />
                    </div>
                )}
                <div className="space-y-1">
                    {items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden",
                                    isActive ? "text-white" : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.02)]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebarActive"
                                        className="absolute inset-0 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                                <div className="relative z-10 flex items-center justify-center shrink-0">
                                    <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-[#22C55E]" : "group-hover:text-[#22C55E]/70")} />
                                </div>
                                {!isCollapsed && (
                                    <span className="relative z-10 truncate flex-1">{item.name}</span>
                                )}
                                {!isCollapsed && item.badge && (
                                    <div className="relative z-10 shrink-0 bg-[#22C55E] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                                        {item.badge}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        ));
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed lg:sticky top-0 left-0 h-[100dvh] bg-[#09090B] border-r border-[rgba(255,255,255,0.05)] z-50 flex flex-col transition-all duration-300 shadow-2xl lg:shadow-none",
                isCollapsed ? "w-[80px]" : "w-[260px]",
                isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Brand Header */}
                <div className="h-16 flex items-center px-4 shrink-0 border-b border-[rgba(255,255,255,0.05)] relative">
                    <Link href="/" aria-label="Vaididea Home" className={cn("flex items-center gap-3 transition-all group cursor-pointer", isCollapsed ? "justify-center w-full" : "")}>
                        <VaidideaLogo className="w-9 h-9 shrink-0 transition-transform group-hover:scale-105" />
                        {!isCollapsed && (
                            <div className="whitespace-nowrap min-w-0">
                                <span className="font-bold text-white text-[15px] tracking-tight leading-tight block group-hover:text-emerald-400 transition-colors">Doctor Portal</span>
                                <span className="text-[11px] text-gray-400 font-medium block">Clinical Operating System</span>
                            </div>
                        )}
                    </Link>

                    {/* Desktop Collapse Toggle */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-full items-center justify-center text-[#A1A1AA] hover:text-white hover:border-[#22C55E] transition-all shadow-md z-10"
                    >
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                    </button>
                </div>

                {/* Nav Links */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                    {renderNavItems()}
                </div>

                {/* Footer Logo / Support */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.02)] shrink-0">
                    <div className={cn("bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.05)] overflow-hidden transition-all", isCollapsed ? "p-2 flex justify-center" : "p-4")}>
                        {isCollapsed ? (
                            <MessageCircleQuestion className="w-5 h-5 text-[#A1A1AA]" />
                        ) : (
                            <div>
                                <h4 className="text-xs font-bold text-white mb-1">Need Help?</h4>
                                <p className="text-[10px] text-[#A1A1AA] mb-3">Contact Vaididea support team.</p>
                                <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors">
                                    Support Center
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
