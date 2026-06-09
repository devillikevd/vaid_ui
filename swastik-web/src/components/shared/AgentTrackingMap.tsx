'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAgentTracking } from '@/hooks/useAgentTracking';
import { MapMarker, MapRoute } from './OsmMap';
import { Loader2 } from 'lucide-react';

// Use dynamic import for Leaflet map component
const OsmMapDynamic = dynamic(() => import('./OsmMapDynamic'), {
    ssr: false,
    loading: () => (
        <div className="flex h-64 w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
    ),
});

interface AgentTrackingMapProps {
    trackingToken: string;
    height?: string;
    facilityLocation?: { lat: number; lng: number; name?: string } | null;
    patientLocation?: { lat: number; lng: number; address?: string } | null;
}

export function AgentTrackingMap({ trackingToken, height = '300px', facilityLocation, patientLocation }: AgentTrackingMapProps) {
    const { location, startTracking, stopTracking } = useAgentTracking();

    useEffect(() => {
        if (trackingToken) {
            startTracking(trackingToken);
        }
        return () => {
            stopTracking();
        };
    }, [trackingToken, startTracking, stopTracking]);

    if (!location && (!facilityLocation && !patientLocation)) {
        return (
            <div className="flex w-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800" style={{ height }}>
                <Loader2 className="mb-2 h-6 w-6 animate-spin text-orange-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for agent's live location...</p>
            </div>
        );
    }

    // Build markers: facility, patient, and agent
    const markers: MapMarker[] = [];

    // Add facility marker (pharmacy/diagnostic center location)
    if (facilityLocation && facilityLocation.lat && facilityLocation.lng) {
        markers.push({
            id: 'facility',
            lat: facilityLocation.lat,
            lng: facilityLocation.lng,
            title: facilityLocation.name || 'Facility',
            color: '#3B82F6', // Blue
            popup: facilityLocation.name || 'Pharmacy/Diagnostic Center',
        });
    }

    // Add patient marker (delivery/collection location)
    if (patientLocation && patientLocation.lat && patientLocation.lng) {
        markers.push({
            id: 'patient',
            lat: patientLocation.lat,
            lng: patientLocation.lng,
            title: 'Patient',
            color: '#10B981', // Green
            popup: patientLocation.address || 'Delivery Address',
        });
    }

    // Add agent marker (live location)
    if (location) {
        markers.push({
            id: 'agent',
            lat: location.latitude,
            lng: location.longitude,
            title: 'Delivery Agent',
            color: '#F97316', // Orange
            pulse: true,
        });
    }

    // Calculate center for map view (use agent location if available, otherwise facility)
    const centerLat = location?.latitude ?? facilityLocation?.lat ?? 20.5937;
    const centerLng = location?.longitude ?? facilityLocation?.lng ?? 78.9629;

    // Build route if we have both facility and agent/patient location
    const routes: MapRoute[] = [];
    if (facilityLocation && location && facilityLocation.lat && facilityLocation.lng) {
        // Route from facility to agent (for tracking)
        routes.push({
            id: 'tracking-route',
            coordinates: [[facilityLocation.lat, facilityLocation.lng], [location.latitude, location.longitude]] as [number, number][],
            color: '#F97316',
        });
    } else if (facilityLocation && patientLocation && facilityLocation.lat && patientLocation.lat) {
        // Route from facility to patient (for pending assignment)
        routes.push({
            id: 'destination-route',
            coordinates: [[facilityLocation.lat, facilityLocation.lng], [patientLocation.lat, patientLocation.lng]] as [number, number][],
            color: '#3B82F6',
        });
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
            <OsmMapDynamic
                lat={centerLat}
                lng={centerLng}
                zoom={15}
                markers={markers}
                routes={routes}
                height={height}
                fitBounds={true}
            />
            {location && (
                <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-gray-800 shadow backdrop-blur-sm dark:bg-gray-900/90 dark:text-gray-200">
                    🔴 Live Tracking Active
                </div>
            )}
        </div>
    );
}
