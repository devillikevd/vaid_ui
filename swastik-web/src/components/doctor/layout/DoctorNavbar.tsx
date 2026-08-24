'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Menu, Search, Bell, MessageSquare, Plus, 
    Wifi, CircleDot, User, Settings, LogOut,
    ClipboardList, Clock, QrCode, Building2, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getInitials } from '@/lib/utils';
import { useSocket, useNotifications } from '@/hooks/useSocket';

interface DoctorNavbarProps {
    setIsMobileOpen: (v: boolean) => void;
}

export function DoctorNavbar({ setIsMobileOpen }: DoctorNavbarProps) {
    const { user, logout } = useAuthStore();
    const { isConnected } = useSocket();
    const { unreadCount } = useNotifications();
    const router = useRouter();

    const [showNewMenu, setShowNewMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const newMenuRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
                setShowNewMenu(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };
    
    // Status Values
    const statuses = [
        { label: user ? 'Online' : 'Offline', icon: CircleDot, active: !!user, color: user ? 'text-green-500' : 'text-gray-500' },
        { label: 'Socket', icon: Wifi, active: isConnected, color: isConnected ? 'text-green-500' : 'text-red-500' },
    ];

    return (
        <header className="h-16 shrink-0 bg-[#09090B]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.05)] sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
            
            {/* Left side: Mobile Toggle & Global Search */}
            <div className="flex items-center gap-4 flex-1">
                <button 
                    onClick={() => setIsMobileOpen(true)}
                    className="lg:hidden p-2 -ml-2 text-[#A1A1AA] hover:text-white transition-colors"
                    aria-label="Toggle navigation menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="hidden sm:flex items-center gap-2 max-w-md w-full relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search patients, appointments, records..." 
                        className="w-full bg-[#09090B] border border-[rgba(255,255,255,0.1)] rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E] focus:border-[#22C55E] transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                        <kbd className="hidden md:inline-flex items-center gap-1 rounded bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 text-[10px] font-medium text-[#A1A1AA]">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Middle: Live Status Chips (Desktop only) */}
            <div className="hidden xl:flex items-center justify-center gap-2 flex-1">
                {statuses.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] px-2.5 py-1 rounded-full">
                        {s.icon ? (
                            <s.icon className={`w-3 h-3 ${s.color}`} />
                        ) : (
                            <div className={`w-1.5 h-1.5 rounded-full bg-green-500`} />
                        )}
                        <span className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Right side: Actions & Profile */}
            <div className="flex items-center gap-3 lg:gap-4 flex-1 justify-end">
                
                {/* Quick Create Dropdown */}
                <div className="relative" ref={newMenuRef}>
                    <button 
                        onClick={() => setShowNewMenu(!showNewMenu)}
                        className="hidden sm:flex items-center gap-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New
                        <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
                    </button>

                    {showNewMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <Link 
                                href="/doctor/prescriptions/new" 
                                onClick={() => setShowNewMenu(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                            >
                                <ClipboardList className="w-4 h-4 text-[#22C55E]" />
                                New Prescription
                            </Link>
                            <Link 
                                href="/doctor/schedule" 
                                onClick={() => setShowNewMenu(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                            >
                                <Clock className="w-4 h-4 text-blue-400" />
                                Add Schedule Slot
                            </Link>
                            <Link 
                                href="/doctor/scan-patient" 
                                onClick={() => setShowNewMenu(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                            >
                                <QrCode className="w-4 h-4 text-purple-400" />
                                Scan Patient QR
                            </Link>
                        </div>
                    )}
                </div>

                {/* Notifications & Messages */}
                <div className="flex items-center gap-1">
                    <Link 
                        href="/doctor/community"
                        className="relative p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                        title="Community Q&A"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </Link>
                    <Link 
                        href="/doctor/notifications"
                        className="relative p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#09090B]" />
                        )}
                    </Link>
                </div>

                {/* Profile Divider */}
                <div className="w-[1px] h-6 bg-[rgba(255,255,255,0.1)] hidden sm:block" />

                {/* Profile Avatar & Dropdown */}
                <div className="relative" ref={profileMenuRef}>
                    <button 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2 group p-1 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:ring-2 ring-white/20 transition-all">
                            {getInitials(user?.name || 'Doctor')}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-semibold text-white leading-tight">Dr. {user?.name?.split(' ')[0] || 'Doctor'}</p>
                            <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Available</p>
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-52 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-3.5 py-2 border-b border-[rgba(255,255,255,0.06)]">
                                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Doctor'}</p>
                                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <Link 
                                href="/doctor/profile" 
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                            >
                                <User className="w-4 h-4 text-emerald-400" />
                                View Profile
                            </Link>
                            <Link 
                                href="/doctor/settings" 
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                            >
                                <Settings className="w-4 h-4 text-gray-400" />
                                Settings
                            </Link>
                            <Link 
                                href="/doctor/care-networks" 
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
                            >
                                <Building2 className="w-4 h-4 text-blue-400" />
                                Care Networks
                            </Link>
                            <div className="my-1 border-t border-[rgba(255,255,255,0.06)]" />
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </header>
    );
}
