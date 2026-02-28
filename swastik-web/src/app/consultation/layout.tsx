'use client';

import { ReactNode } from 'react';

/**
 * Layout for consultation video call pages.
 * Provides a minimal fullscreen wrapper — the video consultation page
 * manages its own back-navigation and controls.
 */
export default function ConsultationLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-900">
            {children}
        </div>
    );
}
