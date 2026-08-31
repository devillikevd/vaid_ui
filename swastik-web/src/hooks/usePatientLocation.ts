'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LocationCoords {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

export interface PatientLocationState {
    coords: LocationCoords | null;
    loading: boolean;
    permissionDenied: boolean;
    error: string | null;
    requestLocation: () => void;
}

const STORAGE_LAT_KEY = 'vaididea_patient_lat';
const STORAGE_LNG_KEY = 'vaididea_patient_lng';

export function usePatientLocation(autoRequest: boolean = true): PatientLocationState {
    const [coords, setCoords] = useState<LocationCoords | null>(null);
    const [loading, setLoading] = useState<boolean>(autoRequest);
    const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const requestLocation = useCallback(() => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setPermissionDenied(false);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newCoords: LocationCoords = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                };
                setCoords(newCoords);
                setLoading(false);
                setPermissionDenied(false);
                setError(null);

                try {
                    sessionStorage.setItem(STORAGE_LAT_KEY, String(newCoords.latitude));
                    sessionStorage.setItem(STORAGE_LNG_KEY, String(newCoords.longitude));
                } catch {}
            },
            (err) => {
                setLoading(false);
                if (err.code === err.PERMISSION_DENIED) {
                    setPermissionDenied(true);
                    setError('Location permission was denied. Please allow location access to discover healthcare providers within 25 km of your position.');
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setError('GPS location information is currently unavailable.');
                } else if (err.code === err.TIMEOUT) {
                    setError('Location request timed out. Please try again.');
                } else {
                    setError(err.message || 'Unable to retrieve location.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
            }
        );
    }, []);

    useEffect(() => {
        let hasCoords = false;
        try {
            const savedLat = sessionStorage.getItem(STORAGE_LAT_KEY);
            const savedLng = sessionStorage.getItem(STORAGE_LNG_KEY);
            if (savedLat && savedLng) {
                const lat = parseFloat(savedLat);
                const lng = parseFloat(savedLng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setCoords({ latitude: lat, longitude: lng });
                    setLoading(false);
                    hasCoords = true;
                }
            }
        } catch {}

        if (!hasCoords && autoRequest) {
            requestLocation();
        }
    }, [autoRequest, requestLocation]);

    return {
        coords,
        loading,
        permissionDenied,
        error,
        requestLocation,
    };
}
