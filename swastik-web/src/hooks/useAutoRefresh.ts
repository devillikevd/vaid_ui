import { useEffect, useRef } from 'react';

/**
 * Periodically calls `refresh` while the page is visible.
 * Works as a polling fallback on top of any socket-driven refresh so the
 * dashboard never goes stale even if a real-time event is missed or dropped.
 * Also refreshes immediately when the tab becomes visible again.
 */
export function useAutoRefresh(refresh: () => void, intervalMs = 30000): void {
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useEffect(() => {
        const refreshIfVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshRef.current();
            }
        };

        const id = setInterval(refreshIfVisible, intervalMs);
        document.addEventListener('visibilitychange', refreshIfVisible);

        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', refreshIfVisible);
        };
    }, [intervalMs]);
}
