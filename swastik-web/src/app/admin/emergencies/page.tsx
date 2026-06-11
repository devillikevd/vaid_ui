'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Siren, MapPin, Clock, Phone, AlertTriangle,
    CheckCircle, Ambulance, RefreshCw, Loader2,
    Radio
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { adminApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import OsmMap from '@/components/shared/OsmMapDynamic';
import type { MapMarker } from '@/components/shared/OsmMapDynamic';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
    pending: { color: 'bg-red-100 text-red-700 border-red-200', label: 'PENDING', icon: '🔴' },
    broadcasting: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'BROADCASTING', icon: '📡' },
    assigned: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'ASSIGNED', icon: '📋' },
    en_route: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'EN ROUTE', icon: '🚑' },
    arrived: { color: 'bg-green-100 text-green-700 border-green-200', label: 'ARRIVED', icon: '📍' },
    picked_up: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'PICKED UP', icon: '🏥' },
    en_route_hospital: { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'TO HOSPITAL', icon: '🏥' },
    arrived_hospital: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'AT HOSPITAL', icon: '✅' },
    resolved: { color: 'bg-green-100 text-green-700 border-green-200', label: 'RESOLVED', icon: '✔️' },
    completed: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700', label: 'COMPLETED', icon: '✔️' },
    cancelled: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700', label: 'CANCELLED', icon: '❌' },
    timeout: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'TIMEOUT', icon: '⏰' },
    no_ambulance: { color: 'bg-red-100 text-red-800 border-red-300', label: 'NO AMBULANCE', icon: '⚠️' },
};

const CANONICAL_STATUS_MAP: Record<string, string> = {
    active: 'pending',
    accepted: 'assigned',
    dispatched: 'assigned',
    en_route_pickup: 'en_route',
    arrived_pickup: 'arrived',
    patient_onboard: 'picked_up',
};

const toCanonicalStatus = (status: string) => CANONICAL_STATUS_MAP[status] || status;

interface Emergency {
    id: string;
    patientName: string;
    phone: string;
    location: string;
    type: string;
    status: string;
    priority?: string;
    dispatchMode?: string;
    requestedAt: string;
    ambulance?: string;
    ambulanceId?: string;
    ambulanceVehicle?: string;
    ambulanceDriver?: string;
    latitude?: number;
    longitude?: number;
}

interface FleetAmbulance {
    id: string;
    vehicle_number: string;
    driver_name: string;
    driver_phone: string;
    vehicle_type: string;
    status: string;
    current_latitude: number;
    current_longitude: number;
}

const STATUS_FILTERS = [
    { id: 'active', label: 'Active' },
    { id: 'all', label: 'All' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'cancelled', label: 'Cancelled' },
];

const EMERGENCY_STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ['broadcasting', 'assigned', 'cancelled', 'no_ambulance'],
    broadcasting: ['assigned', 'timeout', 'cancelled', 'no_ambulance'],
    assigned: ['en_route', 'cancelled'],
    en_route: ['arrived', 'cancelled'],
    arrived: ['picked_up', 'completed', 'cancelled'],
    picked_up: ['en_route_hospital', 'completed', 'cancelled'],
    en_route_hospital: ['arrived_hospital', 'completed', 'cancelled'],
    arrived_hospital: ['completed'],
    timeout: ['broadcasting', 'cancelled'],
    no_ambulance: ['broadcasting', 'cancelled'],
};

export default function EmergenciesPage() {
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [fleet, setFleet] = useState<FleetAmbulance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('active');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [summary, setSummary] = useState({ pending: 0, active: 0, resolved: 0, cancelled: 0 });
    const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
    const [updatingEmergencyId, setUpdatingEmergencyId] = useState<string | null>(null);
    const { on, emit } = useSocket();
    const toast = useToast();

    const fetchEmergencies = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await adminApi.getEmergencies(page, 20, statusFilter);
            if (!result.success) throw new Error('Failed');
            const apiData = Array.isArray(result.data) ? result.data : [];
            const normalized: Emergency[] = (Array.isArray(apiData) ? apiData : []).map((item: any) => ({
                id: item.id,
                patientName: item.requester_name || item.patient?.name || item.patientName || 'Unknown patient',
                phone: item.requester_phone || item.patient?.user?.phone || item.phone || '',
                location: item.pickup_address || item.location || '',
                type: item.emergency_type || item.type || 'medical',
                status: item.status || 'pending',
                priority: item.priority,
                dispatchMode: item.dispatch_mode || item.dispatchMode,
                requestedAt: item.requested_at || item.created_at || item.requestedAt || '',
                ambulance: item.vehicle?.vehicle_number || item.ambulance?.name || item.ambulance_name || item.ambulance || '',
                ambulanceId: item.vehicle?.id || item.vehicle_id || undefined,
                ambulanceVehicle: item.vehicle?.vehicle_number || item.ambulance?.vehicle_number || item.vehicle_number || item.ambulanceVehicle || item.vehicle_id || '',
                ambulanceDriver: item.vehicle?.driver_name || item.ambulance?.driver_name || item.ambulanceDriver || '',
                latitude: item.pickup_latitude ?? item.latitude,
                longitude: item.pickup_longitude ?? item.longitude,
            }));
            setEmergencies(normalized);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalItems(result.pagination?.total || normalized.length);
            const summary = (result.summary as {
                pending?: number;
                active?: number;
                resolved?: number;
                cancelled?: number;
            } | undefined) || {};
            setSummary({
                pending: summary.pending || 0,
                active: summary.active || 0,
                resolved: summary.resolved || 0,
                cancelled: summary.cancelled || 0,
            });
        } catch {
            setError('Failed to load emergency data');
        }
        setIsLoading(false);
    }, [page, statusFilter]);

    const fetchFleet = useCallback(async () => {
        try {
            const result = await adminApi.getFleet();
            if (result.success && Array.isArray(result.data)) {
                setFleet(result.data);
            }
        } catch {
            // silent
        }
    }, []);

    useEffect(() => { fetchEmergencies(); fetchFleet(); }, [fetchEmergencies, fetchFleet]);
    useEffect(() => { setPage(1); }, [statusFilter]);

    // Join dispatch room for live updates
    useEffect(() => {
        emit('ambulance:join-dispatch', {});
        const unsub1 = on('emergency:new', () => fetchEmergencies());
        const unsub2 = on('emergency:updated', () => fetchEmergencies());
        const unsub3 = on('ambulance:status-update', () => fetchEmergencies());
        const unsub4 = on('ambulance:location-update', (data: any) => {
            if (data.latitude && data.longitude) {
                setEmergencies((prev: Emergency[]) => prev.map(e => {
                    if (e.id === data.requestId) {
                        return { ...e, latitude: data.latitude, longitude: data.longitude };
                    }
                    return e;
                }));
                setFleet((prev: FleetAmbulance[]) => prev.map(a => {
                    if (a.id === data.ambulanceId) {
                        return { ...a, current_latitude: data.latitude, current_longitude: data.longitude };
                    }
                    return a;
                }));
            }
        });
        return () => { unsub1(); unsub2(); unsub3(); unsub4(); emit('ambulance:leave-dispatch', {}); };
    }, [on, emit, fetchEmergencies]);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchEmergencies();
            fetchFleet();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchEmergencies, fetchFleet]);

    const pendingCount = summary.pending;
    const activeCount = summary.active;
    const resolvedCount = summary.resolved;

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        if (!dateStr || Number.isNaN(d.getTime())) return '—';
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const humanizeStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    const handleStatusUpdate = async (emergencyId: string) => {
        const nextStatus = statusDrafts[emergencyId];
        if (!nextStatus) return;

        setUpdatingEmergencyId(emergencyId);
        try {
            const result = await adminApi.updateEmergencyStatus(emergencyId, nextStatus);
            if (!result.success) {
                throw new Error(result.error || 'Failed to update status');
            }
            toast.success('Emergency updated', `Status changed to ${humanizeStatus(nextStatus)}.`);
            setStatusDrafts((prev) => {
                const next = { ...prev };
                delete next[emergencyId];
                return next;
            });
            await fetchEmergencies();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update emergency status';
            toast.error('Update failed', message);
        } finally {
            setUpdatingEmergencyId(null);
        }
    };

    // Map markers for all geo-located emergencies
    const geoEmergencies = emergencies.filter((e) =>
        typeof e.latitude === 'number'
        && typeof e.longitude === 'number'
        && !['completed', 'cancelled', 'resolved'].includes(e.status)
    );
    const mapMarkers: MapMarker[] = geoEmergencies.map(e => {
        const canonicalStatus = toCanonicalStatus(e.status);
        return ({
        id: e.id,
        lat: e.latitude!,
        lng: e.longitude!,
        title: e.patientName,
        popup: `${e.type} • ${STATUS_CONFIG[canonicalStatus]?.label || canonicalStatus}<br/>${e.location || ''}`,
        color: ['pending', 'broadcasting'].includes(canonicalStatus) ? '#DC2626' :
            ['assigned', 'en_route'].includes(canonicalStatus) ? '#F59E0B' : '#059669',
        pulse: ['pending', 'broadcasting'].includes(canonicalStatus),
    });
    });

    const fleetMarkers: MapMarker[] = fleet.map(a => {
        const isAvailable = a.status === 'available';
        const isOffline = a.status === 'offline';
        const color = isAvailable ? '#059669' : isOffline ? '#9CA3AF' : '#3B82F6';
        return {
            id: `fleet-${a.id}`,
            lat: a.current_latitude,
            lng: a.current_longitude,
            title: `🚑 ${a.vehicle_number}`,
            popup: `Driver: ${a.driver_name}<br/>Status: <strong class="capitalize">${a.status}</strong>`,
            color: color, 
            pulse: !isAvailable && !isOffline, // Pulse only if busy
        };
    });

    const allMarkers = [...mapMarkers, ...fleetMarkers];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🏥 Emergency Monitor</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time monitoring of all emergency requests (hospitals manage dispatch independently)</p>
                </div>
                <Button onClick={fetchEmergencies} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setStatusFilter(filter.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            statusFilter === filter.id
                                ? 'bg-red-600 text-white'
                                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                        <div><p className="text-sm text-gray-600 dark:text-gray-400">Pending / SOS</p><p className="text-2xl font-bold text-red-600">{pendingCount}</p></div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-xl"><Ambulance className="h-6 w-6 text-yellow-600" /></div>
                        <div><p className="text-sm text-gray-600 dark:text-gray-400">Confirmed / Transport</p><p className="text-2xl font-bold text-yellow-600">{activeCount}</p></div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-xl"><CheckCircle className="h-6 w-6 text-green-600" /></div>
                        <div><p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p><p className="text-2xl font-bold text-green-600">{resolvedCount}</p></div>
                    </div>
                </Card>
            </div>

            {allMarkers.length > 0 && (
                <Card padding="none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                            Live Fleet & Emergency Map
                        </CardTitle>
                    </CardHeader>
                    <div className="px-4 pb-4">
                        <OsmMap lat={allMarkers[0].lat} lng={allMarkers[0].lng} zoom={12} markers={allMarkers} height="350px" fitBounds />
                        
                        {/* Map Legend */}
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full bg-[#DC2626]"></span>
                                <span>Pending / SOS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full bg-[#F59E0B]"></span>
                                <span>Assigned / En Route</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full bg-[#059669]"></span>
                                <span>Available / Arrived</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full bg-[#3B82F6]"></span>
                                <span>Ambulance Busy</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full bg-[#9CA3AF]"></span>
                                <span>Ambulance Offline</span>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Emergency List */}
            <Card padding="none">
                <CardHeader><CardTitle>All Emergencies</CardTitle></CardHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-red-600" /><span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span></div>
                ) : error ? (
                    <div className="p-8 text-center"><p className="text-red-600">{error}</p><Button className="mt-4" onClick={fetchEmergencies} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button></div>
                ) : emergencies.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No emergency requests found</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {emergencies.map((emergency) => {
                            const canonicalStatus = toCanonicalStatus(emergency.status);
                            const statusCfg = STATUS_CONFIG[canonicalStatus] || STATUS_CONFIG.pending;
                            const transitionKey = EMERGENCY_STATUS_TRANSITIONS[canonicalStatus] ? canonicalStatus : emergency.status;
                            return (
                                <div key={emergency.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2.5 rounded-xl ${statusCfg.color}`}><Siren className="h-5 w-5" /></div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{emergency.patientName}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                        {statusCfg.icon} {statusCfg.label}
                                                    </span>
                                                    {emergency.priority && (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            emergency.priority === 'critical' ? 'bg-red-50 text-red-700' :
                                                            emergency.priority === 'high' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                                                        }`}>{emergency.priority.toUpperCase()}</span>
                                                    )}
                                                    {emergency.dispatchMode === 'sos_broadcast' && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">SOS Broadcast</span>
                                                    )}
                                                    {emergency.dispatchMode === 'hospital_controlled' && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Hospital Dispatch</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-red-600 font-medium mt-1">{emergency.type}</p>
                                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    {emergency.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{emergency.location}</span>}
                                                    {emergency.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{emergency.phone}</span>}
                                                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatTime(emergency.requestedAt)}</span>
                                                </div>
                                                {(emergency.ambulance || emergency.ambulanceVehicle) && (
                                                    <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                                                        <Ambulance className="h-4 w-4" />
                                                        {emergency.ambulanceVehicle || emergency.ambulance}
                                                        {emergency.ambulanceDriver && ` • ${emergency.ambulanceDriver}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {EMERGENCY_STATUS_TRANSITIONS[transitionKey]?.length ? (
                                                <>
                                                    <select
                                                        value={statusDrafts[emergency.id] || ''}
                                                        onChange={(e) => setStatusDrafts((prev) => ({ ...prev, [emergency.id]: e.target.value }))}
                                                        className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                                                    >
                                                        <option value="">Next status</option>
                                                        {EMERGENCY_STATUS_TRANSITIONS[transitionKey].map((status) => (
                                                            <option key={status} value={status}>{humanizeStatus(status)}</option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStatusUpdate(emergency.id)}
                                                        disabled={!statusDrafts[emergency.id] || updatingEmergencyId === emergency.id}
                                                        isLoading={updatingEmergencyId === emergency.id}
                                                    >
                                                        Update
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    Final state
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalItems}
                    itemsPerPage={20}
                />
            </Card>
        </div>
    );
}
