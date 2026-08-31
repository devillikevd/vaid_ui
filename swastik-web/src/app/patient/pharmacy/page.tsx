'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Pill,
    PackageCheck,
    Truck,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Building2,
    FileText,
    ChevronRight,
    MapPin,
    Plus,
    X,
    Phone,
    Navigation,
    Compass,
    RefreshCw,
    ShoppingBag
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { usePatientLocation } from '@/hooks/usePatientLocation';
import { useAuthStore } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';

export default function PatientPharmacyPage() {
    const { isAuthenticated } = useAuthStore();
    const { requireAuth } = useAuthGate();
    const { coords, loading: locationLoading, permissionDenied, requestLocation } = usePatientLocation();

    const [activeTab, setActiveTab] = useState<'nearby' | 'orders'>('nearby');

    // Nearby Pharmacies Discovery State
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [pharmacyLoading, setPharmacyLoading] = useState(true);
    const [pharmacyError, setPharmacyError] = useState<string | null>(null);
    const [pharmacySearch, setPharmacySearch] = useState('');

    // My Orders State
    const [orders, setOrders] = useState<any[]>([]);
    const [orderLoading, setOrderLoading] = useState(true);
    const [orderError, setOrderError] = useState<string | null>(null);

    // Cancel modal state
    const [cancelOrder, setCancelOrder] = useState<any | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const fetchPharmacies = useCallback(async () => {
        setPharmacyLoading(true);
        setPharmacyError(null);
        try {
            const params: any = {};
            if (coords) {
                params.latitude = coords.latitude;
                params.longitude = coords.longitude;
                params.radius = 25;
            }
            if (pharmacySearch.trim()) params.search = pharmacySearch.trim();

            const res = await patientApi.getPharmacies(params);
            if (res.success) {
                setPharmacies((res.data as any[]) || []);
            } else {
                setPharmacyError(res.message || res.error || 'Failed to load pharmacies');
            }
        } catch (err: any) {
            setPharmacyError(err.message || 'Error fetching nearby pharmacies');
        } finally {
            setPharmacyLoading(false);
        }
    }, [coords, pharmacySearch]);

    const fetchOrders = async () => {
        setOrderLoading(true);
        setOrderError(null);
        try {
            const res = await patientApi.getOrders();
            if (res.success) {
                setOrders((res.data as any[]) || []);
            } else {
                setOrderError(res.message || res.error || 'Failed to load pharmacy orders');
            }
        } catch (err: any) {
            setOrderError(err.message || 'Error fetching pharmacy orders');
        } finally {
            setOrderLoading(false);
        }
    };

    useEffect(() => {
        if (!locationLoading) {
            fetchPharmacies();
        }
    }, [locationLoading, fetchPharmacies]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated]);

    const handleCancelOrder = async () => {
        if (!cancelOrder) return;
        setCancelling(true);
        setCancelError(null);
        try {
            const res = await patientApi.cancelOrder(cancelOrder.id);
            if (res.success) {
                setCancelOrder(null);
                fetchOrders();
            } else {
                setCancelError(res.message || res.error || 'Failed to cancel order');
            }
        } catch (err: any) {
            setCancelError(err.message || 'Error processing order cancellation');
        } finally {
            setCancelling(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered':
                return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'dispatched':
            case 'out_for_delivery':
                return 'bg-blue-50 text-blue-800 border-blue-200';
            case 'processing':
            case 'confirmed':
                return 'bg-teal-50 text-teal-800 border-teal-200';
            case 'cancelled':
                return 'bg-stone-100 text-stone-600 border-stone-200';
            default:
                return 'bg-amber-50 text-amber-800 border-amber-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-xs font-semibold mb-2">
                        <Pill className="w-3.5 h-3.5" />
                        <span>Pharmacy & Prescription Logistics</span>
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                        Pharmacy & Medicine Services
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                        Discover verified pharmacies within 25 km and track orders dispatched by partner pharmacies.
                    </p>
                </div>

                <Link
                    href="/patient/records?tab=prescriptions"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Order from Prescription</span>
                </Link>
            </div>

            {/* Navigation Tabs (Only visible when authenticated; guests explore nearby discovery) */}
            {isAuthenticated && (
                <div className="flex items-center gap-2 p-1.5 bg-stone-100/80 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('nearby')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'nearby'
                                ? 'bg-white text-stone-900 shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        Nearby Pharmacies (25 km)
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'orders'
                                ? 'bg-white text-stone-900 shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <span>My Medicine Orders</span>
                        {orders.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-full text-[10px]">
                                {orders.length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* TAB 1: NEARBY PHARMACIES DISCOVERY */}
            {activeTab === 'nearby' && (
                <div className="space-y-5">
                    {/* GPS Status */}
                    {coords ? (
                        <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl text-xs text-orange-950">
                            <div className="flex items-center gap-2">
                                <Navigation className="w-3.5 h-3.5 text-orange-700 shrink-0 fill-orange-700/20" />
                                <span className="font-semibold">
                                    Local Discovery Active · Showing pharmacies within 25 km
                                </span>
                            </div>
                            <button
                                onClick={requestLocation}
                                className="text-[11px] font-bold text-orange-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw className="w-3 h-3" /> Refresh GPS
                            </button>
                        </div>
                    ) : permissionDenied ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl gap-3">
                            <div className="flex items-start gap-2.5 text-xs text-amber-900">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Location Permission Required for 25 KM Discovery</p>
                                    <p className="text-amber-800/80 text-[11px] mt-0.5">
                                        Allow location access to find licensed pharmacies deliverable to your area.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={requestLocation}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                            >
                                Enable Location Access
                            </button>
                        </div>
                    ) : null}

                    {/* Pharmacy Search Input */}
                    <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-2xs">
                        <div className="relative">
                            <Pill className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by pharmacy name or locality..."
                                value={pharmacySearch}
                                onChange={(e) => setPharmacySearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
                            />
                        </div>
                    </div>

                    {/* Pharmacy Results */}
                    {pharmacyLoading || locationLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-36" />
                            ))}
                        </div>
                    ) : pharmacyError ? (
                        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                            <p className="text-sm font-semibold text-stone-800">{pharmacyError}</p>
                            <button
                                onClick={fetchPharmacies}
                                className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : pharmacies.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
                            <Building2 className="w-12 h-12 text-stone-300 mx-auto" />
                            <h3 className="font-heading font-bold text-stone-900 text-base">
                                No pharmacies found within 25 km
                            </h3>
                            <p className="text-xs text-stone-500 max-w-sm mx-auto">
                                We could not find any verified connected pharmacies within 25 km of your position.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {pharmacies.map((pharmacy) => (
                                <div
                                    key={pharmacy.id}
                                    className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-orange-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-heading text-lg font-bold text-stone-900">
                                                {pharmacy.name}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>VERIFIED PHARMACY</span>
                                            </span>
                                            {pharmacy.delivery_available !== false && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                                    <Truck className="w-3 h-3" />
                                                    <span>Home Delivery</span>
                                                </span>
                                            )}
                                            {(pharmacy.distanceText || pharmacy.distance !== undefined) && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px]">
                                                    <Compass className="w-3 h-3 text-stone-400" />
                                                    <span>
                                                        {pharmacy.distanceText ||
                                                            (pharmacy.distance < 1
                                                                ? `${Math.round(pharmacy.distance * 1000)} m away`
                                                                : `${Number(pharmacy.distance).toFixed(1)} km away`)}
                                                    </span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                <span>
                                                    {[pharmacy.address, pharmacy.city, pharmacy.pincode]
                                                        .filter(Boolean)
                                                        .join(', ') || 'Address available on inquiry'}
                                                </span>
                                            </div>
                                            {pharmacy.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span>{pharmacy.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                        <Link
                                            href="/patient/records?tab=prescriptions"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                        >
                                            <ShoppingBag className="w-3.5 h-3.5" />
                                            <span>Order via Prescription</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MY ORDERS */}
            {activeTab === 'orders' && (
                <div>
                    {orderLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-40" />
                            ))}
                        </div>
                    ) : orderError ? (
                        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                            <p className="text-sm font-semibold text-stone-800">{orderError}</p>
                            <button
                                onClick={fetchOrders}
                                className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                            <PackageCheck className="w-10 h-10 text-stone-300 mx-auto" />
                            <h3 className="font-heading font-bold text-lg text-stone-800">
                                No Active Medicine Orders
                            </h3>
                            <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
                                You have not placed any medicine orders yet. You can order prescribed medicines directly from your verified medical records.
                            </p>
                            <Link
                                href="/patient/records?tab=prescriptions"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-semibold hover:bg-vd-forest-deep transition-colors mt-2"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Browse Prescriptions</span>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {orders.map((order) => {
                                const isCancellable = ['pending', 'processing', 'confirmed'].includes(order.status?.toLowerCase());
                                const items = order.items || [];

                                return (
                                    <div
                                        key={order.id}
                                        className="bg-white rounded-3xl p-6 border border-stone-200 hover:border-stone-300 transition-all space-y-4"
                                    >
                                        {/* Order Card Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                                                    <Truck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-heading font-bold text-sm text-stone-900">
                                                            Order #{order.id.slice(0, 8)}
                                                        </span>
                                                        <span
                                                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusColor(
                                                                order.status
                                                            )}`}
                                                        >
                                                            {order.status?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-stone-400">
                                                        Placed on {new Date(order.created_at || order.createdAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            {order.total_amount && (
                                                <div className="text-right">
                                                    <span className="text-xs text-stone-400 block">Total Amount</span>
                                                    <span className="font-bold text-sm text-stone-900">
                                                        ₹{order.total_amount}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pharmacy & Delivery Info */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            {order.pharmacy && (
                                                <div className="flex items-start gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                                                    <Building2 className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-semibold text-stone-700 block">
                                                            {order.pharmacy.name || 'Fulfilling Pharmacy'}
                                                        </span>
                                                        <span className="text-[11px] text-stone-500">
                                                            {order.pharmacy.address || order.pharmacy.city || 'Verified Network Partner'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {order.delivery_address && (
                                                <div className="flex items-start gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                                                    <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-semibold text-stone-700 block">
                                                            Delivery Destination
                                                        </span>
                                                        <span className="text-[11px] text-stone-500">
                                                            {order.delivery_address}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Order Items Preview */}
                                        {items.length > 0 && (
                                            <div className="space-y-1.5 pt-1">
                                                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                                                    Items ({items.length})
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {items.map((item: any, idx: number) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700"
                                                        >
                                                            <Pill className="w-3 h-3 text-orange-500" />
                                                            <span>
                                                                {item.medicine_name || item.name || 'Prescription Item'}
                                                            </span>
                                                            <span className="text-stone-400 font-normal">
                                                                ×{item.quantity || 1}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Card Footer Actions */}
                                        <div className="flex items-center justify-between pt-2">
                                            {order.tracking_number ? (
                                                <span className="text-xs font-mono text-stone-500">
                                                    Tracking: {order.tracking_number}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-stone-400">
                                                    Standard Prescription Dispatch
                                                </span>
                                            )}

                                            {isCancellable && (
                                                <button
                                                    onClick={() => setCancelOrder(order)}
                                                    className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Cancel Modal */}
            {cancelOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-heading font-bold text-base text-stone-900">
                                Cancel Medicine Order
                            </h3>
                            <button
                                onClick={() => setCancelOrder(null)}
                                className="text-stone-400 hover:text-stone-600 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-stone-600">
                            Are you sure you want to cancel order <strong>#{cancelOrder.id.slice(0, 8)}</strong>? This will notify the fulfilling pharmacy and cancel dispatch.
                        </p>

                        {cancelError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600">
                                {cancelError}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setCancelOrder(null)}
                                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors"
                            >
                                Keep Order
                            </button>
                            <button
                                onClick={handleCancelOrder}
                                disabled={cancelling}
                                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Confirm Cancellation</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
