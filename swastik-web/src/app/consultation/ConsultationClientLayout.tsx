'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Client layout for consultation video call pages with auth guard.
 */
export default function ConsultationClientLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    useEffect(() => {
        if (_hasHydrated && (!isAuthenticated || !user?.role || !['doctor', 'patient', 'wellness_coach'].includes(user.role))) {
            router.push('/');
        }
    }, [isAuthenticated, _hasHydrated, user, router]);

    if (!_hasHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin h-8 w-8 border-4 border-gray-600 border-t-blue-400 rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {children}
        </div>
    );
}
