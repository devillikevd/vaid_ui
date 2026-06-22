'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Loader2, MapPin, CheckCircle, Navigation, AlertTriangle } from 'lucide-react';

export default function TrackAgentPage() {
    const params = useParams();
    const token = params.token as string;
    
    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);
    const [orderType, setOrderType] = useState<'pharmacy' | 'diagnostic'>('pharmacy');
    const [error, setError] = useState<string | null>(null);
    const [locationShared, setLocationShared] = useState(false);
    const [completing, setCompleting] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    // 1. Fetch Order Data
    useEffect(() => {
        if (!token) return;
        
        fetch(`${API_BASE_URL}/delivery-agents/track/${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setOrderData(data.order);
                    setOrderType(data.type);
                } else {
                    setError(data.message || 'Failed to load tracking details');
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [token]);

    // 2. Start Location Tracking
    const startTracking = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocationShared(true);
                updateLocationOnServer(position.coords.latitude, position.coords.longitude);
                
                // Start watching position
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (pos) => updateLocationOnServer(pos.coords.latitude, pos.coords.longitude),
                    (err) => console.error('Error watching position:', err),
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            },
            (err) => {
                setError('Failed to get location. Please enable GPS permissions.');
            },
            { enableHighAccuracy: true }
        );
    };

    const updateLocationOnServer = (latitude: number, longitude: number) => {
        if (!orderData?.agent_id) return;
        
        fetch(`${API_BASE_URL}/delivery-agents/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent_id: orderData.agent_id,
                latitude,
                longitude,
                token,
            })
        }).catch(err => console.error('Failed to update location:', err));
    };

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // 3. Complete Task
    const handleComplete = async () => {
        setCompleting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/delivery-agents/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, type: orderType })
            });
            const data = await res.json();
            
            if (data.success) {
                // Update local state to reflect completion
                setOrderData((prev: any) => ({ ...prev, status: orderType === 'pharmacy' ? 'delivered' : 'sample_collected' }));
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }
            } else {
                alert(data.message || 'Failed to mark as complete');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;
    }

    if (error || !orderData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-6 text-center border border-red-100">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600">{error || 'Order not found'}</p>
                </div>
            </div>
        );
    }

    const isCompleted = orderData.status === 'delivered' || orderData.status === 'sample_collected';
    const address = orderType === 'pharmacy' ? orderData.delivery_address : orderData.collection_address;
    const phone = orderType === 'pharmacy' ? orderData.patient_phone : orderData.patient_phone; // Assuming patient_phone exists
    const patientName = orderType === 'pharmacy' ? (orderData.patient?.name || orderData.patientName) : orderData.patient_name;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-purple-600" />
                    SWASTIK Agent
                </h1>
            </header>

            <main className="flex-1 p-4 max-w-md w-full mx-auto space-y-4">
                {isCompleted ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-green-700 mb-2">Task Completed!</h2>
                        <p className="text-green-600">Great job. You can close this window now.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
                            <div>
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    {orderType === 'pharmacy' ? 'Delivery Details' : 'Collection Details'}
                                </h2>
                                <p className="font-semibold text-lg text-gray-900">{patientName || 'Patient'}</p>
                                {phone && <p className="text-gray-600 mt-1">📞 {phone}</p>}
                            </div>

                            <div className="pt-3 border-t">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Destination Address</h3>
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-gray-700 leading-snug">{address}</p>
                                </div>
                            </div>
                        </div>

                        {!locationShared ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                                <Navigation className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                                <h3 className="font-bold text-blue-900 mb-2">Share Your Live Location</h3>
                                <p className="text-sm text-blue-700 mb-4">
                                    You must share your GPS location so the patient can track your arrival. Please click the button below and &quot;Allow&quot; when prompted.
                                </p>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={startTracking} size="lg">
                                    Start Sharing Location
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 text-center">
                                <div className="relative w-12 h-12 mx-auto mb-3">
                                    <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-20"></div>
                                    <div className="absolute inset-2 bg-purple-600 rounded-full flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-purple-900 mb-2">Location Sharing Active</h3>
                                <p className="text-sm text-purple-700 mb-4">
                                    Your live location is being shared with the patient. Please proceed to the destination.
                                </p>
                                
                                <Button 
                                    className="w-full mt-4" 
                                    size="lg" 
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank')}
                                >
                                    Open in Google Maps
                                </Button>
                            </div>
                        )}

                        {locationShared && (
                            <Button 
                                className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg mt-8"
                                onClick={handleComplete}
                                disabled={completing}
                            >
                                {completing ? <Loader2 className="h-6 w-6 animate-spin" /> : (orderType === 'pharmacy' ? 'Mark as Delivered' : 'Mark as Collected')}
                            </Button>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
