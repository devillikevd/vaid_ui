'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAgentTracking } from '@/hooks/useAgentTracking';
import { MapMarker, MapRoute } from './OsmMap';
import { Loader2 } from 'lucide-react';
import { PUBLIC_API_URL } from '@/lib/env';

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
    const [trackingDetails, setTrackingDetails] = useState<{
        facility?: { latitude?: number; longitude?: number; name?: string } | null;
        destination?: { latitude?: number; longitude?: number; text?: string | null } | null;
        agent?: { latitude?: number; longitude?: number } | null;
    } | null>(null);

    useEffect(() => {
        if (trackingToken) {
            startTracking(trackingToken);
        }
        return () => {
            stopTracking();
        };
    }, [trackingToken, startTracking, stopTracking]);

    useEffect(() => {
        if (!trackingToken) return;
        let isMounted = true;

        fetch(`${PUBLIC_API_URL}/delivery-agents/track/${trackingToken}`)
            .then((res) => res.json())
            .then((data) => {
                if (isMounted && data?.success) {
                    setTrackingDetails(data.order || null);
                }
            })
            .catch(() => {
                if (isMounted) setTrackingDetails(null);
            });

        return () => {
            isMounted = false;
        };
    }, [trackingToken]);

    const resolvedFacility = useMemo(() => {
        if (facilityLocation) return facilityLocation;
        const facility = trackingDetails?.facility;
        if (!facility?.latitude || !facility?.longitude) return null;
        return { lat: facility.latitude, lng: facility.longitude, name: facility.name };
    }, [facilityLocation, trackingDetails]);

    const resolvedPatient = useMemo(() => {
        if (patientLocation) return patientLocation;
        const destination = trackingDetails?.destination;
        if (!destination?.latitude || !destination?.longitude) return null;
        return { lat: destination.latitude, lng: destination.longitude, address: destination.text || undefined };
    }, [patientLocation, trackingDetails]);

    const liveLocation = location || (trackingDetails?.agent?.latitude && trackingDetails?.agent?.longitude
        ? { latitude: trackingDetails.agent.latitude, longitude: trackingDetails.agent.longitude }
        : null);

    if (!liveLocation && (!resolvedFacility && !resolvedPatient)) {
        return (
            <div className="flex w-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800" style={{ height }}>
                <Loader2 className="mb-2 h-6 w-6 animate-spin text-orange-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for agent&apos;s live location...</p>
            </div>
        );
    }

    // Build markers: facility, patient, and agent
    const markers: MapMarker[] = [];

    // Add facility marker (pharmacy/diagnostic center location)
    if (resolvedFacility && resolvedFacility.lat && resolvedFacility.lng) {
        markers.push({
            id: 'facility',
            lat: resolvedFacility.lat,
            lng: resolvedFacility.lng,
            title: resolvedFacility.name || 'Facility',
            color: '#3B82F6', // Blue
            popup: resolvedFacility.name || 'Pharmacy/Diagnostic Center',
        });
    }

    // Add patient marker (delivery/collection location)
    if (resolvedPatient && resolvedPatient.lat && resolvedPatient.lng) {
        markers.push({
            id: 'patient',
            lat: resolvedPatient.lat,
            lng: resolvedPatient.lng,
            title: 'Patient',
            color: '#10B981', // Green
            popup: resolvedPatient.address || 'Delivery Address',
        });
    }

    // Add agent marker (live location)
    if (liveLocation) {
        markers.push({
            id: 'agent',
            lat: liveLocation.latitude,
            lng: liveLocation.longitude,
            title: 'Delivery Agent',
            color: '#F97316', // Orange
            pulse: true,
        });
    }

    // Calculate center for map view (use agent location if available, otherwise facility)
    const centerLat = liveLocation?.latitude ?? resolvedFacility?.lat ?? resolvedPatient?.lat ?? 20.5937;
    const centerLng = liveLocation?.longitude ?? resolvedFacility?.lng ?? resolvedPatient?.lng ?? 78.9629;

    // Build route if we have both facility and agent/patient location
    const routes: MapRoute[] = [];
    if (resolvedFacility && liveLocation && resolvedFacility.lat && resolvedFacility.lng) {
        const coordinates: [number, number][] = [[resolvedFacility.lat, resolvedFacility.lng], [liveLocation.latitude, liveLocation.longitude]];
        if (resolvedPatient?.lat && resolvedPatient?.lng) {
            coordinates.push([resolvedPatient.lat, resolvedPatient.lng]);
        }
        routes.push({
            id: 'tracking-route',
            coordinates,
            color: '#F97316',
        });
    } else if (resolvedFacility && resolvedPatient && resolvedFacility.lat && resolvedPatient.lat) {
        // Route from facility to patient (for pending assignment)
        routes.push({
            id: 'destination-route',
            coordinates: [[resolvedFacility.lat, resolvedFacility.lng], [resolvedPatient.lat, resolvedPatient.lng]] as [number, number][],
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
            {liveLocation && (
                <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-gray-800 shadow backdrop-blur-sm dark:bg-gray-900/90 dark:text-gray-200">
                    Live Tracking Active
                </div>
            )}
        </div>
    );
}
