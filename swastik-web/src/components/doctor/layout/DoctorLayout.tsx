'use client';

import React, { useState } from 'react';
import { DoctorSidebar } from './DoctorSidebar';
import { DoctorNavbar } from './DoctorNavbar';
import { cn } from '@/lib/utils';
import { IncomingAppointmentAlert } from '@/components/shared/IncomingAppointmentAlert';
import GlobalSocketToasts from '@/components/shared/GlobalSocketToasts';

export function DoctorLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="flex h-[100dvh] w-full bg-[#09090B] font-sans overflow-hidden text-white relative">
            
            {/* Global Noise Texture Overlay for Premium Feel */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-0"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />

            {/* Sidebar */}
            <DoctorSidebar 
                isCollapsed={isCollapsed} 
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden">
                <DoctorNavbar setIsMobileOpen={setIsMobileOpen} />
                
                <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <div className="mx-auto max-w-7xl w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Global Modals & Toasts */}
            <IncomingAppointmentAlert />
            <GlobalSocketToasts />
        </div>
    );
}
