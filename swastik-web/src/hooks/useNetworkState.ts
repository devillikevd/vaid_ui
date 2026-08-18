'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to track genuine browser network connectivity.
 * This is completely decoupled from the backend/socket connection status.
 */
export function useNetworkState() {
    const [isOnline, setIsOnline] = useState<boolean>(true);

    useEffect(() => {
        // Initialize state securely for SSR compatibility
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline };
}
