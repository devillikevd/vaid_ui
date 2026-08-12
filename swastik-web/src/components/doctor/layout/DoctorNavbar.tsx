'use client';

import React from 'react';
import { 
    Menu, Search, Bell, MessageSquare, Plus, 
    Wifi, Video, Mic, CircleDot 
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getInitials } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';

interface DoctorNavbarProps {
    setIsMobileOpen: (v: boolean) => void;
}

export function DoctorNavbar({ setIsMobileOpen }: DoctorNavbarProps) {
    const { user } = useAuthStore();
    const { isConnected } = useSocket();
    
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
                
                {/* Quick Create */}
                <button className="hidden sm:flex items-center gap-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    New
                </button>

                {/* Notifications & Messages */}
                <div className="flex items-center gap-1">
                    <button className="relative p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors">
                        <MessageSquare className="w-5 h-5" />
                    </button>
                    <button className="relative p-2 text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#09090B]" />
                    </button>
                </div>

                {/* Profile Divider */}
                <div className="w-[1px] h-6 bg-[rgba(255,255,255,0.1)] hidden sm:block" />

                {/* Profile Avatar */}
                <button className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:ring-2 ring-white/20 transition-all">
                        {getInitials(user?.name || 'Doctor')}
                    </div>
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-semibold text-white leading-tight">Dr. {user?.name?.split(' ')[0] || 'Doctor'}</p>
                        <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Available</p>
                    </div>
                </button>
            </div>

        </header>
    );
}
