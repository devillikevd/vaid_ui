'use client';

import React from 'react';
import { IS_PRESENTATION_MODE } from '@/lib/presentationMode';
import { useAuthStore } from '@/stores/authStore';

export function PresentationModeBadge() {
    const { user, isAuthenticated } = useAuthStore();

    if (!IS_PRESENTATION_MODE) return null;

    return (
        <aside
            aria-label="Presentation Mode Active"
            className="fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-medium shadow-lg border border-amber-500/50 backdrop-blur-xs pointer-events-auto select-none"
            title="Presentation Demo Mode: Tab-isolated session storage active. Multiple accounts can be logged into different Chrome tabs simultaneously without cross-logout."
        >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 font-semibold tracking-wide">Demo Mode</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-mono text-[10px] truncate max-w-[130px]">
                {isAuthenticated ? (user?.name || user?.role) : 'Guest'}
            </span>
        </aside>
    );
}
