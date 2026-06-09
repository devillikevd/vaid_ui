import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export interface AgentPosition {
    latitude: number;
    longitude: number;
    timestamp?: string;
}

interface UseAgentTrackingResult {
    location: AgentPosition | null;
    isTracking: boolean;
    startTracking: (trackingToken: string) => void;
    stopTracking: () => void;
}

export function useAgentTracking(initialTrackingToken?: string | null): UseAgentTrackingResult {
    const { emit, on, isConnected } = useSocket();
    const [location, setLocation] = useState<AgentPosition | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [trackingToken, setTrackingToken] = useState<string | null>(initialTrackingToken || null);

    const startTracking = useCallback((token: string) => {
        setTrackingToken(token);
        setIsTracking(true);
    }, []);

    const stopTracking = useCallback(() => {
        if (trackingToken) {
            emit('agent:untrack', { trackingToken });
        }
        setTrackingToken(null);
        setIsTracking(false);
        setLocation(null);
    }, [trackingToken, emit]);

    useEffect(() => {
        if (!trackingToken || !isConnected) return;

        // Subscribe to agent tracking room
        emit('agent:track', { trackingToken });

        // Listen for location updates
        const unsubLocation = on('agent:location-update', (data: { latitude: number; longitude: number; timestamp?: string }) => {
            setLocation({
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: data.timestamp || new Date().toISOString(),
            });
        });

        return () => {
            unsubLocation();
            emit('agent:untrack', { trackingToken });
        };
    }, [trackingToken, isConnected, emit, on]);

    // Re-subscribe on reconnect
    useEffect(() => {
        if (isConnected && trackingToken && isTracking) {
            emit('agent:track', { trackingToken });
        }
    }, [isConnected, trackingToken, isTracking, emit]);

    return { location, isTracking, startTracking, stopTracking };
}
