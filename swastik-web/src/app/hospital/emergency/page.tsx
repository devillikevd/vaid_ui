'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    AlertTriangle, Siren, Clock, MapPin, Loader2, RefreshCw, AlertCircle,
    Ambulance, CheckCircle, Phone, Navigation, Send, XCircle, User, Radio
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import OsmMap from '@/components/shared/OsmMapDynamic';
import type { MapMarker, MapRoute } from '@/components/shared/OsmMapDynamic';

interface DispatchEmergency {
    id: string;
    requestNumber?: string;
    patientName: string;
    patientPhone?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    type: string;
    priority: string;
    status: string;
    dispatchMode?: string;
    createdAt: string;
    assignedAt?: string;
    ambulance?: {
        id: string;
        vehicleNumber: string;
        driverName: string;
        driverPhone?: string;
        type?: string;
        latitude?: number;
        longitude?: number;
    } | null;
    notes?: string;
}

interface AvailableAmbulance {
    id: string;
    vehicle_number: string;
    driver_name: string;
    driver_phone?: string;
    vehicle_type: string;
    current_latitude: number;
    current_longitude: number;
    distance: number;
    distanceText: string;
    eta: string;
}

const PENDING_STATUSES = ['pending', 'broadcasting'];
const ASSIGNED_STATUSES = ['assigned'];
const ACTIVE_STATUSES = ['en_route', 'arrived', 'picked_up', 'en_route_hospital', 'arrived_hospital'];

const CANONICAL_STATUS_MAP: Record<string, string> = {
    accepted: 'assigned',
    dispatched: 'assigned',
    en_route_pickup: 'en_route',
    arrived_pickup: 'arrived',
    patient_onboard: 'picked_up',
};

const toCanonicalStatus = (status: string) => CANONICAL_STATUS_MAP[status] || status;

const canAssignEmergency = (emergency: DispatchEmergency) =>
    PENDING_STATUSES.includes(toCanonicalStatus(emergency.status)) && !emergency.ambulance;

const formatEmergencyLocation = (emergency: DispatchEmergency) => {
    const rawLocation = emergency.location?.trim();
    if (rawLocation && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(rawLocation)) {
        return rawLocation;
    }
    if (Number.isFinite(emergency.latitude) && Number.isFinite(emergency.longitude)) {
        return `Live GPS • ${emergency.latitude?.toFixed(5)}, ${emergency.longitude?.toFixed(5)}`;
    }
    return rawLocation || 'Live GPS location';
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
    pending: { color: 'bg-red-100 text-red-700', label: 'PENDING', icon: '🔴' },
    broadcasting: { color: 'bg-orange-100 text-orange-700', label: 'BROADCASTING', icon: '📡' },
    assigned: { color: 'bg-blue-100 text-blue-700', label: 'ASSIGNED', icon: '📋' },
    dispatched: { color: 'bg-sky-100 text-sky-700', label: 'DISPATCHED', icon: '🚨' },
    accepted: { color: 'bg-indigo-100 text-indigo-700', label: 'ACCEPTED', icon: '✅' },
    en_route: { color: 'bg-yellow-100 text-yellow-700', label: 'EN ROUTE', icon: '🚑' },
    en_route_pickup: { color: 'bg-amber-100 text-amber-700', label: 'TO PICKUP', icon: '🧭' },
    arrived: { color: 'bg-green-100 text-green-700', label: 'ARRIVED', icon: '📍' },
    arrived_pickup: { color: 'bg-lime-100 text-lime-700', label: 'AT PICKUP', icon: '📍' },
    picked_up: { color: 'bg-purple-100 text-purple-700', label: 'PICKED UP', icon: '🏥' },
    patient_onboard: { color: 'bg-fuchsia-100 text-fuchsia-700', label: 'PATIENT ONBOARD', icon: '🛏️' },
    en_route_hospital: { color: 'bg-teal-100 text-teal-700', label: 'TO HOSPITAL', icon: '🏥' },
    arrived_hospital: { color: 'bg-emerald-100 text-emerald-700', label: 'AT HOSPITAL', icon: '✅' },
    completed: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: 'COMPLETED', icon: '✔️' },
    cancelled: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400', label: 'CANCELLED', icon: '❌' },
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    normal: 'text-blue-600 bg-blue-50 border-blue-200',
};

// Web Audio API Native Siren
const playNativeSiren = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.5; // Loud
        osc.start();
        
        let up = true;
        const interval = setInterval(() => {
            osc.frequency.setValueAtTime(up ? 800 : 400, ctx.currentTime);
            up = !up;
        }, 500);

        (window as any)._sosAlarm = {
            pause: () => {
                clearInterval(interval);
                try { osc.stop(); } catch(e) {}
                osc.disconnect();
                gain.disconnect();
                ctx.close();
            }
        };
    } catch (e) {
        console.error("Native Siren failed", e);
    }
};

export default function HospitalEmergencyPage() {
    const [emergencies, setEmergencies] = useState<DispatchEmergency[]>([]);
    const [availableAmbulances, setAvailableAmbulances] = useState<AvailableAmbulance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [affiliatedAmbulances, setAffiliatedAmbulances] = useState<any[]>([]);
    const [incomingSos, setIncomingSos] = useState<any | null>(null);
    const [routes, setRoutes] = useState<Record<string, [number, number][]>>({});
    const [hospitalLocation, setHospitalLocation] = useState<{lat: number, lng: number} | null>(null);
    const { on, emit } = useSocket();

    const fetchEmergencies = useCallback(async () => {
        setError(null);
        try {
            const result = await hospitalApi.getDispatchEmergencies();
            if (result.success) {
                setEmergencies(Array.isArray(result.data) ? result.data : []);
            } else {
                setError(result.error || 'Failed to load emergencies');
            }
        } catch {
            setError('Failed to connect to server.');
        }
        setIsLoading(false);
    }, []);

    const fetchAvailableAmbulances = useCallback(async (lat: number, lng: number) => {
        try {
            const [availableRes, affiliatedRes] = await Promise.all([
                hospitalApi.getAvailableAmbulances(lat, lng),
                hospitalApi.getAffiliatedAmbulances()
            ]);

            if (availableRes.success) {
                setAvailableAmbulances(Array.isArray(availableRes.data) ? availableRes.data : []);
            }
            if (affiliatedRes.success) {
                setAffiliatedAmbulances(Array.isArray(affiliatedRes.data) ? affiliatedRes.data : []);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => { 
        fetchEmergencies(); 
        
        // Fetch hospital profile to get location for return routing
        hospitalApi.getProfile().then(res => {
            const data = res.data as any;
            if (res.success && data?.hospital) {
                const hLat = data.hospital.latitude || data.hospital.location?.coordinates?.[1];
                const hLng = data.hospital.longitude || data.hospital.location?.coordinates?.[0];
                if (hLat && hLng) {
                    setHospitalLocation({ lat: hLat, lng: hLng });
                }
            }
        }).catch(() => {});
    }, [fetchEmergencies]);

    // Join dispatch room for real-time updates
    useEffect(() => {
        emit('ambulance:join-dispatch', {});
        const unsub1 = on('emergency:new', () => fetchEmergencies());
        const unsub2 = on('emergency:updated', () => fetchEmergencies());
        const unsub3 = on('ambulance:status-update', () => fetchEmergencies());
        // M3: Listen for ambulance location updates to move map markers in real-time
        const unsub4 = on('ambulance:location-update', (data: any) => {
            const hasLat = Number.isFinite(data?.latitude);
            const hasLng = Number.isFinite(data?.longitude);
            if (hasLat && hasLng) {
                setEmergencies(prev => prev.map(e => {
                    if (e.ambulance && (e.id === data.requestId || e.ambulance.id === data.ambulanceId)) {
                        return {
                            ...e,
                            ambulance: {
                                ...e.ambulance,
                                latitude: data.latitude,
                                longitude: data.longitude,
                            }
                        };
                    }
                    return e;
                }));
            }
        });
        
        // M4: Listen for Direct Digital SOS from Patient App
        const unsub5 = on('emergency:new-direct-sos', (data: any) => {
            setIncomingSos(data);
            fetchEmergencies();
            // Play loud native alarm
            try {
                playNativeSiren();
            } catch (e) {
                console.error("Audio play failed", e);
            }
        });

        return () => { 
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); 
            emit('ambulance:leave-dispatch', {}); 
            if ((window as any)._sosAlarm) {
                (window as any)._sosAlarm.pause();
            }
        };
    }, [on, emit, fetchEmergencies]);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        const interval = setInterval(fetchEmergencies, 15000);
        return () => clearInterval(interval);
    }, [fetchEmergencies]);

    // Fetch routes for active emergencies
    useEffect(() => {
        const activeDispatches = emergencies.filter(e => 
            ACTIVE_STATUSES.includes(toCanonicalStatus(e.status)) &&
            Number.isFinite(e.latitude) && Number.isFinite(e.longitude) &&
            Number.isFinite(e.ambulance?.latitude) && Number.isFinite(e.ambulance?.longitude)
        );

        activeDispatches.forEach(async (e) => {
            const routeId = `route-${e.id}-${toCanonicalStatus(e.status)}`;
            // If we don't have the route yet, fetch it
            if (!routes[routeId]) {
                try {
                    const isReturningToHospital = toCanonicalStatus(e.status) === 'en_route_hospital' || toCanonicalStatus(e.status) === 'arrived_hospital';
                    let destLat = e.latitude;
                    let destLng = e.longitude;
                    
                    if (isReturningToHospital && hospitalLocation) {
                        destLat = hospitalLocation.lat;
                        destLng = hospitalLocation.lng;
                    }
                    
                    if (destLat && destLng) {
                        const token = localStorage.getItem('token');
                        const res = await fetch(
                            `/api/maps/route?originLat=${e.ambulance!.latitude}&originLng=${e.ambulance!.longitude}&destLat=${destLat}&destLng=${destLng}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        const data = await res.json();
                        if (data.success && data.data?.coordinates) {
                            setRoutes(prev => ({ ...prev, [routeId]: data.data.coordinates }));
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch route:', error);
                }
            }
        });
    }, [emergencies, routes, hospitalLocation]);

    // When selecting an emergency for assignment, load available ambulances
    const handleSelectForAssign = async (emergency: DispatchEmergency) => {
        setSelectedEmergency(emergency.id);
        const { latitude, longitude } = emergency;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            await fetchAvailableAmbulances(latitude as number, longitude as number);
        }
    };

    const handleAssignAmbulance = async (requestId: string, ambulanceId: string) => {
        setActionLoading(requestId);
        try {
            const result = await hospitalApi.assignAmbulance(requestId, ambulanceId);
            if (result.success) {
                setSelectedEmergency(null);
                setAvailableAmbulances([]);
                await fetchEmergencies();
            }
        } catch (err) {
            console.error('Assignment failed:', err);
        }
        setActionLoading(null);
    };

    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const formatTimeAgo = (dateStr: string) => {
        const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
        return mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    };

    const pendingCount = emergencies.filter(e => PENDING_STATUSES.includes(toCanonicalStatus(e.status))).length;
    const activeCount = emergencies.filter(e => ACTIVE_STATUSES.includes(toCanonicalStatus(e.status))).length;
    const assignedCount = emergencies.filter(e => ASSIGNED_STATUSES.includes(toCanonicalStatus(e.status))).length;

    // Map markers
    const mapMarkers: MapMarker[] = [];
    emergencies.forEach(e => {
        const patientLat = e.latitude;
        const patientLng = e.longitude;
        if (Number.isFinite(patientLat) && Number.isFinite(patientLng)) {
                mapMarkers.push({
                    id: `patient-${e.id}`,
                    lat: patientLat as number,
                    lng: patientLng as number,
                    title: e.patientName,
                    popup: `${e.type || 'Emergency'} • ${STATUS_CONFIG[toCanonicalStatus(e.status)]?.label || toCanonicalStatus(e.status)}`,
                    color: e.priority === 'critical' ? '#DC2626' : e.priority === 'high' ? '#F59E0B' : '#3B82F6',
                    pulse: PENDING_STATUSES.includes(toCanonicalStatus(e.status)),
                });
            }
        const ambulanceLat = e.ambulance?.latitude;
        const ambulanceLng = e.ambulance?.longitude;
        if (Number.isFinite(ambulanceLat) && Number.isFinite(ambulanceLng)) {
            const ambulance = e.ambulance;
            mapMarkers.push({
                id: `amb-${e.id}`,
                lat: ambulanceLat as number,
                lng: ambulanceLng as number,
                title: `🚑 ${ambulance?.vehicleNumber || 'Ambulance'}`,
                popup: `${ambulance?.driverName || 'Driver'} → ${e.patientName}`,
                color: '#059669',
            });
        }
    });

    const mapRoutes: MapRoute[] = Object.entries(routes).map(([id, coordinates]) => ({
        id,
        coordinates,
        color: '#4F46E5', // Indigo route line
    }));

    if (isLoading && emergencies.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🚑 Emergency Dispatch Center</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Hospital-controlled ambulance dispatch • Real-time tracking</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchEmergencies} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                </div>
            </div>

            {/* Direct SOS Incoming Alarm Banner */}
            {incomingSos && (
                <div className="bg-red-600 rounded-2xl p-6 shadow-2xl border-4 border-red-500 animate-pulse text-white flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-4 rounded-full">
                            <Siren className="h-10 w-10 text-red-600 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-wider">🚨 Incoming Digital SOS 🚨</h2>
                            <p className="text-red-100 mt-1 text-lg">
                                {incomingSos.patientName} • {incomingSos.patientPhone}
                            </p>
                            <p className="font-mono bg-red-800/50 px-2 py-1 rounded inline-block mt-2">
                                GPS: {incomingSos.latitude?.toFixed(5)}, {incomingSos.longitude?.toFixed(5)}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="bg-red-700 text-white border-red-400 hover:bg-red-800"
                            onClick={() => {
                                if ((window as any)._sosAlarm) (window as any)._sosAlarm.pause();
                                setIncomingSos(null);
                            }}
                        >
                            Silence Alarm
                        </Button>
                        <Button 
                            className="bg-white text-red-600 hover:bg-red-50 text-lg font-bold px-8 py-6 h-auto"
                            onClick={() => {
                                if ((window as any)._sosAlarm) (window as any)._sosAlarm.pause();
                                setIncomingSos(null);
                                // The fetchEmergencies already ran, so it's in the list.
                                // We can auto-select it for assignment.
                                const e = emergencies.find(em => em.id === incomingSos.requestId);
                                if (e) handleSelectForAssign(e);
                            }}
                        >
                            Assign Ambulance Now
                        </Button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Pending / Broadcasting</p>
                            <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl"><Ambulance className="h-6 w-6 text-blue-600" /></div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Confirmed</p>
                            <p className="text-2xl font-bold text-blue-600">{assignedCount}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-xl"><Navigation className="h-6 w-6 text-green-600" /></div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Active Transport</p>
                            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Live Map */}
            {mapMarkers.length > 0 && (
                <Card padding="none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                            Live Dispatch Map
                        </CardTitle>
                    </CardHeader>
                    <div className="px-4 pb-4">
                        <OsmMap
                            lat={mapMarkers[0]?.lat || 20.5937}
                            lng={mapMarkers[0]?.lng || 78.9629}
                            zoom={12}
                            markers={mapMarkers}
                            routes={mapRoutes}
                            height="350px"
                            fitBounds
                        />
                    </div>
                </Card>
            )}

            {error && (
                <Card padding="md">
                    <div className="text-center py-4 text-red-600">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                        {error}
                        <Button className="mt-2" onClick={fetchEmergencies}>Retry</Button>
                    </div>
                </Card>
            )}

            {/* Ambulance Selection Panel */}
            {selectedEmergency && (
                <Card padding="md" className="border-2 border-blue-400 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-blue-900">🚑 Select Ambulance to Assign</h3>
                        <button onClick={() => { setSelectedEmergency(null); setAvailableAmbulances([]); setAffiliatedAmbulances([]); }}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-400"><XCircle className="h-5 w-5" /></button>
                    </div>

                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Hospital Affiliated Ambulances</h4>
                        {affiliatedAmbulances.length === 0 ? (
                            <p className="text-gray-500 text-sm">No affiliated ambulances available.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                {affiliatedAmbulances.map((amb) => (
                                    <div key={amb.id} className="bg-white border-2 border-indigo-200 rounded-xl p-3 hover:border-indigo-400 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900">{amb.vehicle_number}</span>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3"/> Affiliated
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{amb.driver_name}</p>
                                        <p className="text-xs text-gray-500">{amb.vehicle_type} • {amb.status}</p>
                                        <button
                                            onClick={() => handleAssignAmbulance(selectedEmergency, amb.id)}
                                            disabled={actionLoading === selectedEmergency || amb.status !== 'available'}
                                            className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === selectedEmergency ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            Dispatch Affiliated
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Nearest Available Ambulances</h4>
                        {availableAmbulances.length === 0 ? (
                            <p className="text-gray-500 text-sm">No other ambulances found nearby.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {availableAmbulances.map((amb) => (
                                    <div key={amb.id} className="bg-white dark:bg-gray-900 border rounded-xl p-3 hover:border-blue-400 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{amb.vehicle_number}</span>
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{amb.driver_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{amb.vehicle_type} • {amb.distanceText} • ETA {amb.eta}</p>
                                        <button
                                            onClick={() => handleAssignAmbulance(selectedEmergency, amb.id)}
                                            disabled={actionLoading === selectedEmergency}
                                            className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === selectedEmergency ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            Dispatch Nearest
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Emergency List */}
            {emergencies.length === 0 ? (
                <Card padding="md"><div className="text-center py-8 text-gray-500 dark:text-gray-400">No active emergencies</div></Card>
            ) : (
                <Card padding="none">
                    <CardHeader><CardTitle>Active Emergencies ({emergencies.length})</CardTitle></CardHeader>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {emergencies.map((e) => {
                            const statusCfg = STATUS_CONFIG[toCanonicalStatus(e.status)] || STATUS_CONFIG.pending;
                            const priorityCfg = PRIORITY_COLORS[e.priority] || PRIORITY_COLORS.normal;
                            return (
                                <div key={e.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`p-2.5 rounded-xl ${statusCfg.color}`}>
                                                <Siren className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{e.patientName}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                        {statusCfg.icon} {statusCfg.label}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityCfg}`}>
                                                        {e.priority?.toUpperCase()}
                                                    </span>
                                                    {e.dispatchMode === 'sos_broadcast' && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">SOS</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-red-600 font-medium mt-1">{e.type}</p>
                                                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{formatEmergencyLocation(e)}</span>
                                                    {e.patientPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{e.patientPhone}</span>}
                                                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTimeAgo(e.createdAt)}</span>
                                                </div>
                                                {e.ambulance && (
                                                    <div className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                                                        <Ambulance className="h-4 w-4" />
                                                        {e.ambulance.vehicleNumber} • {e.ambulance.driverName}
                                                        {e.ambulance.driverPhone && (
                                                            <a href={`tel:${e.ambulance.driverPhone}`} className="text-blue-600 underline ml-1">{e.ambulance.driverPhone}</a>
                                                        )}
                                                    </div>
                                                )}
                                                {e.notes && <p className="text-xs text-gray-400 mt-1 italic">{e.notes}</p>}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {canAssignEmergency(e) && (
                                                <button
                                                    onClick={() => handleSelectForAssign(e)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    <Ambulance className="h-3.5 w-3.5" />
                                                    <span>{toCanonicalStatus(e.status) === 'broadcasting' ? 'Assign Manually' : 'Assign Ambulance'}</span>
                                                </button>
                                            )}
                                            {e.patientPhone && (
                                                <a href={`tel:${e.patientPhone}`}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Call Patient">
                                                    <Phone className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
