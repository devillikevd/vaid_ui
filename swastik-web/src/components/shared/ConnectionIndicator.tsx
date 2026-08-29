'use client';

import { useSocket } from '@/hooks/useSocket';
import { useNetworkState } from '@/hooks/useNetworkState';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * Realtime indicator pill showing WebSocket sync status.
 * Renders Live 🟢 when connected, Connecting 🟡 when establishing,
 * and Offline / Disconnected 🔴 when unavailable.
 */
export function ConnectionIndicator() {
    const { isConnected, isConnecting } = useSocket();
    const { isOnline } = useNetworkState();

    if (!isOnline) {
        return (
            <div className="relative group flex items-center" title="Network offline">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors select-none cursor-default"
                    style={{ background: 'rgba(239,68,68,0.12)' }}>
                    <WifiOff className="h-3 w-3 text-red-500" />
                    <span className="text-red-700 dark:text-red-400 hidden sm:inline">Offline</span>
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                </div>
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="relative group flex items-center" title="Real-time connected">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors select-none cursor-default"
                    style={{ background: 'rgba(34,197,94,0.12)' }}>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-green-700 dark:text-green-400 hidden sm:inline">Live</span>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                </div>
            </div>
        );
    }

    if (isConnecting) {
        return (
            <div className="relative group flex items-center" title="Connecting to real-time server...">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors select-none cursor-default"
                    style={{ background: 'rgba(234,179,8,0.12)' }}>
                    <RefreshCw className="h-3 w-3 text-yellow-600 animate-spin" />
                    <span className="text-yellow-700 dark:text-yellow-500 hidden sm:inline">Connecting</span>
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-ping" />
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group flex items-center" title="Realtime server unreachable">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors select-none cursor-default"
                style={{ background: 'rgba(239,68,68,0.12)' }}>
                <WifiOff className="h-3 w-3 text-red-500" />
                <span className="text-red-700 dark:text-red-400 hidden sm:inline">Disconnected</span>
                <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
            </div>
        </div>
    );
}
