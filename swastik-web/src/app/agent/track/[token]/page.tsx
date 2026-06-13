'use client';

import { useEffect, useState, use } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader2, MapPin, CheckCircle2, Navigation, Package, FlaskConical, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PUBLIC_API_URL } from '@/lib/env';

export default function AgentTrackingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [order, setOrder] = useState<any>(null);
    const [type, setType] = useState<'pharmacy' | 'diagnostic' | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [completing, setCompleting] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [watchId, setWatchId] = useState<number | null>(null);
    const [lastLoc, setLastLoc] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`${PUBLIC_API_URL}/delivery-agents/track/${token}`);
                const data = await res.json();
                if (data.success) {
                    setOrder(data.order);
                    setType(data.type);
                } else {
                    setError(data.message || 'Invalid tracking link');
                }
            } catch (err) {
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [token]);

    const startTracking = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsTracking(true);
        const id = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLastLoc({ lat: latitude, lng: longitude });
                // Push to backend
                if (order?.agent_id) {
                    await fetch(`${PUBLIC_API_URL}/delivery-agents/location`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agent_id: order.agent_id, latitude, longitude })
                    });
                }
            },
            (error) => {
                setError('Failed to get location. Please enable GPS permissions.');
                setIsTracking(false);
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );
        setWatchId(id);
    };

    const stopTracking = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
        setIsTracking(false);
    };

    const handleComplete = async () => {
        setCompleting(true);
        try {
            const res = await fetch(`${PUBLIC_API_URL}/delivery-agents/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, type })
            });
            const data = await res.json();
            if (data.success) {
                stopTracking();
                setOrder(data.order);
            }
        } catch (err) {
            setError('Failed to mark as completed');
        } finally {
            setCompleting(false);
        }
    };

    const openGoogleMaps = () => {
        if (!order) return;
        const address = type === 'pharmacy' ? order.delivery_address?.address : order.collection_address?.address;
        if (address) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
                <Card className="max-w-md w-full p-6 text-center space-y-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <h1 className="text-xl font-bold text-red-700">Tracking Error</h1>
                    <p className="text-red-600">{error || 'Order not found'}</p>
                </Card>
            </div>
        );
    }

    const isCompleted = type === 'pharmacy' ? order.status === 'delivered' : order.status === 'sample_collected';
    const address = type === 'pharmacy' ? order.delivery_address : order.collection_address;
    const isCancelled = order.status === 'cancelled';

    if (isCompleted || isCancelled) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
                <Card className="max-w-md w-full p-8 text-center space-y-6">
                    <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${isCompleted ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isCompleted ? <CheckCircle2 className="h-10 w-10 text-green-600" /> : <AlertCircle className="h-10 w-10 text-red-600" />}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {isCompleted ? 'Job Completed' : 'Job Cancelled'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {isCompleted ? 'You have successfully completed this assignment. You can now close this tab.' : 'This assignment has been cancelled.'}
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm dark:bg-gray-800 sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {type === 'pharmacy' ? <Package className="h-5 w-5 text-purple-600" /> : <FlaskConical className="h-5 w-5 text-purple-600" />}
                    {type === 'pharmacy' ? 'Medicine Delivery' : 'Sample Collection'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Order ID: {order.id.slice(0, 8)}...</p>
            </div>

            <div className="p-4 space-y-4 max-w-md mx-auto">
                <Card className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Patient Address</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{address?.address}</p>
                            {address?.phone && <p className="text-sm font-medium text-purple-600 mt-2">📞 {address.phone}</p>}
                        </div>
                    </div>

                    <Button 
                        onClick={openGoogleMaps}
                        variant="outline"
                        className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                        <Navigation className="h-4 w-4" />
                        Open in Google Maps
                    </Button>
                </Card>

                <Card className="p-4 text-center space-y-4">
                    <div className="space-y-2">
                        <h2 className="font-medium text-gray-900 dark:text-gray-100">Live GPS Tracking</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            You must keep tracking active while traveling to the patient's location.
                        </p>
                    </div>

                    {!isTracking ? (
                        <Button 
                            onClick={startTracking}
                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <MapPin className="h-4 w-4" />
                            Start Live Tracking
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center justify-center gap-2 border border-green-200">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Broadcasting Location Live...
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="max-w-md mx-auto">
                    <Button 
                        onClick={handleComplete}
                        disabled={completing}
                        className="w-full gap-2 py-6 text-lg bg-gray-900 hover:bg-gray-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white shadow-lg"
                    >
                        {completing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                        {type === 'pharmacy' ? 'Mark as Delivered' : 'Mark Sample Collected'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
