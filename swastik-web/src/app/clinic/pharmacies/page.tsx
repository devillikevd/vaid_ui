'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Pill, Search, Filter, Clock, User, Stethoscope, 
    AlertCircle, CheckCircle2, XCircle, ArrowRight, ShieldCheck, 
    FileText, Eye, RefreshCw, ChevronRight, Truck, Package,
    Building, AlertTriangle, Activity, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export interface PharmacyOrder {
    id: string;
    patient_id?: string;
    pharmacy_id: string;
    prescription_id?: string;
    status: 'pending' | 'accepted' | 'processing' | 'ready' | 'out_for_delivery' | 'dispatched' | 'completed' | 'delivered' | 'cancelled' | 'rejected';
    delivery_type?: 'delivery' | 'pickup';
    delivery_address?: string;
    items?: Array<{
        name?: string;
        medicine_name?: string;
        quantity: number;
        dosage?: string;
        price?: number;
    }>;
    total_amount?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    patient?: {
        id?: string;
        name: string;
        gender?: string;
        user?: {
            phone?: string;
        };
    };
    pharmacy?: {
        id: string;
        name: string;
        phone?: string;
        address?: string;
    };
    prescription?: {
        id: string;
        diagnosis?: string;
        file_url?: string;
        doctor?: {
            id: string;
            users?: {
                name: string;
            };
        };
    };
}

export default function ClinicPharmacyOrdersPage() {
    const toast = useToast();
    const router = useRouter();

    const [orders, setOrders] = useState<PharmacyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loadingPartnerships, setLoadingPartnerships] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string>('all');

    // Modals
    const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);

    // Load active pharmacy partnerships
    const loadPartnerships = useCallback(async () => {
        setLoadingPartnerships(true);
        try {
            const res = await clinicApi.getPartnerships('active');
            if (res.success) {
                const pharmacyPartners = ((res.data as any[]) || []).filter(
                    (p: any) => p.target_type === 'pharmacy' || p.targetType === 'pharmacy'
                );
                setPartnerships(pharmacyPartners);
            }
        } catch (err) {
            console.error('Failed to load pharmacy partnerships:', err);
        } finally {
            setLoadingPartnerships(false);
        }
    }, []);

    // Load routed pharmacy orders
    const loadOrders = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const res = await clinicApi.getRoutedPharmacyOrders();
            if (res.success) {
                setOrders((res.data as PharmacyOrder[]) || []);
            } else {
                setFetchError(true);
                toast.error('Unable to load pharmacy orders', res.error || 'Please try again.');
            }
        } catch {
            setFetchError(true);
            toast.error('Unable to load pharmacy orders');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadPartnerships();
    }, [loadPartnerships]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Compute real KPI counts
    const kpiSummary = useMemo(() => {
        const counts = {
            total: orders.length,
            pending: 0,
            accepted: 0,
            processing: 0,
            ready: 0,
            out_for_delivery: 0,
            completed: 0,
        };

        orders.forEach(o => {
            const st = o.status;
            if (st === 'pending') counts.pending++;
            else if (st === 'accepted') counts.accepted++;
            else if (st === 'processing') counts.processing++;
            else if (st === 'ready') counts.ready++;
            else if (st === 'out_for_delivery' || st === 'dispatched') counts.out_for_delivery++;
            else if (st === 'completed' || st === 'delivered') counts.completed++;
        });

        return counts;
    }, [orders]);

    // Search and status filter
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const normStatus = (order.status === 'dispatched' ? 'out_for_delivery' : order.status === 'delivered' ? 'completed' : order.status);
            const matchesStatus = statusFilter === 'all' || normStatus === statusFilter || order.status === statusFilter;
            const matchesDelivery = deliveryTypeFilter === 'all' || order.delivery_type === deliveryTypeFilter;

            const q = searchQuery.toLowerCase().trim();
            const patientName = order.patient?.name?.toLowerCase() || '';
            const pharmacyName = order.pharmacy?.name?.toLowerCase() || '';
            const doctorName = order.prescription?.doctor?.users?.name?.toLowerCase() || '';
            const orderId = order.id.toLowerCase();
            const diagnosis = order.prescription?.diagnosis?.toLowerCase() || '';

            const matchesSearch = !q ||
                patientName.includes(q) ||
                pharmacyName.includes(q) ||
                doctorName.includes(q) ||
                orderId.includes(q) ||
                diagnosis.includes(q);

            return matchesStatus && matchesDelivery && matchesSearch;
        });
    }, [orders, statusFilter, deliveryTypeFilter, searchQuery]);

    const getStatusBadge = (status: PharmacyOrder['status']) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending Review',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
                    dot: 'bg-amber-500'
                };
            case 'accepted':
                return {
                    label: 'Accepted by Pharmacy',
                    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
                    dot: 'bg-blue-500'
                };
            case 'processing':
                return {
                    label: 'Dispensing / Packing',
                    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40',
                    dot: 'bg-purple-500 animate-pulse'
                };
            case 'ready':
                return {
                    label: 'Ready for Pickup',
                    bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/40',
                    dot: 'bg-teal-500'
                };
            case 'out_for_delivery':
            case 'dispatched':
                return {
                    label: 'Out for Delivery',
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40',
                    dot: 'bg-indigo-500 animate-pulse'
                };
            case 'completed':
            case 'delivered':
                return {
                    label: 'Delivered / Fulfilled',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
                    dot: 'bg-emerald-500'
                };
            case 'rejected':
                return {
                    label: 'Declined by Pharmacy',
                    bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40',
                    dot: 'bg-red-500'
                };
            case 'cancelled':
                return {
                    label: 'Cancelled',
                    bg: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                    dot: 'bg-gray-400'
                };
            default:
                return {
                    label: status,
                    bg: 'bg-gray-100 text-gray-700 border-gray-200',
                    dot: 'bg-gray-400'
                };
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/40">
                            Operations
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Pill className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        Pharmacy Orders
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                        Track prescriptions routed to your active pharmacy partners.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadOrders} 
                        className="rounded-xl font-bold"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Summary Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Pending', count: kpiSummary.pending, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                    { label: 'Accepted', count: kpiSummary.accepted, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                    { label: 'Processing', count: kpiSummary.processing, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                    { label: 'Ready', count: kpiSummary.ready, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
                    { label: 'Out for Delivery', count: kpiSummary.out_for_delivery, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
                    { label: 'Completed', count: kpiSummary.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                ].map((chip, idx) => (
                    <div key={idx} className={`p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 ${chip.bg} flex flex-col justify-between`}>
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{chip.label}</span>
                        <span className={`text-xl font-black ${chip.color} mt-1`}>{chip.count}</span>
                    </div>
                ))}
            </div>

            {/* Partnership Banner if No Active Pharmacy Partners */}
            {!loadingPartnerships && partnerships.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                                No active pharmacy partners
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                Establish an active pharmacy partnership in the Partnerships Hub before automatically routing clinic prescriptions.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/clinic/partnerships')}
                        className="bg-white dark:bg-gray-900 border-amber-300 text-amber-800 dark:text-amber-300 font-bold rounded-xl text-xs shrink-0"
                    >
                        Manage Partnerships <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                    <div className="flex items-center gap-1.5 mr-2 text-xs font-bold text-gray-500">
                        <Filter className="w-3.5 h-3.5" /> Status:
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="all">All Orders ({orders.length})</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="processing">Processing</option>
                        <option value="ready">Ready</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        value={deliveryTypeFilter}
                        onChange={(e) => setDeliveryTypeFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="all">All Fulfillment</option>
                        <option value="delivery">Home Delivery</option>
                        <option value="pickup">Pharmacy Pickup</option>
                    </select>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search patient, prescription, pharmacy, doctor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm font-bold">Loading pharmacy orders...</p>
                </div>
            ) : fetchError ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Unable to load pharmacy orders</h3>
                    <Button onClick={loadOrders} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold">
                        <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
                    </Button>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
                        <Pill className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            No pharmacy orders yet
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Prescriptions routed to your active pharmacy partners will appear here.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push('/clinic/consultations')}
                            className="rounded-xl text-xs font-bold"
                        >
                            View Prescriptions
                        </Button>
                        <Button 
                            size="sm"
                            onClick={() => router.push('/clinic/partnerships')}
                            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold"
                        >
                            Manage Partnerships
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.map((order) => {
                        const statusBadge = getStatusBadge(order.status);
                        const patientName = order.patient?.name || 'Patient';
                        const pharmacyName = order.pharmacy?.name || 'Partner Pharmacy';
                        const doctorName = order.prescription?.doctor?.users?.name || 'Prescribing Doctor';
                        const itemCount = (order.items || []).length;

                        return (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                            >
                                <div className="space-y-4">
                                    {/* Top Row */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="font-mono text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg">
                                            ORD-{order.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                                {order.delivery_type === 'delivery' ? <Truck className="w-3 h-3 text-orange-600" /> : <ShoppingBag className="w-3 h-3 text-teal-600" />}
                                                {order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1.5 ${statusBadge.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                                {statusBadge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Patient & Pharmacy Info */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white truncate">
                                                {patientName}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
                                            <Pill className="w-3.5 h-3.5" />
                                            <span className="truncate">{pharmacyName}</span>
                                        </div>
                                    </div>

                                    {/* Prescription Summary */}
                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <span>Prescription</span>
                                            <span>{itemCount > 0 ? `${itemCount} Items` : 'Medicines'}</span>
                                        </div>
                                        <p className="font-medium truncate">
                                            {order.prescription?.diagnosis ? `Diagnosis: ${order.prescription.diagnosis}` : 'Prescription Order'}
                                        </p>
                                    </div>

                                    {/* Doctor & Timestamps */}
                                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <p className="flex items-center gap-1.5">
                                            <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                                            <span>Doctor: <strong className="text-gray-700 dark:text-gray-200">Dr. {doctorName}</strong></span>
                                        </p>
                                        <p className="flex items-center gap-1.5 text-[11px]">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            Ordered: {new Date(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedOrder(order)}
                                        className="text-xs font-bold rounded-xl w-full"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View Details
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Order Details Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-pink-50/50 dark:from-orange-950/20 dark:to-pink-950/20">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-bold text-gray-500">
                                            ORD-{selectedOrder.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(selectedOrder.status).bg}`}>
                                            {getStatusBadge(selectedOrder.status).label}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-xl text-gray-900 dark:text-white">
                                        Pharmacy Order Details
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                {/* Care Partner Badges */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patient</p>
                                        <p className="text-base font-extrabold text-gray-900 dark:text-white">
                                            {selectedOrder.patient?.name || 'Patient'}
                                        </p>
                                        {selectedOrder.patient?.user?.phone && (
                                            <p className="text-xs text-gray-500">Phone: {selectedOrder.patient.user.phone}</p>
                                        )}
                                    </div>

                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Partner Pharmacy</p>
                                        <p className="text-base font-extrabold text-orange-600 dark:text-orange-400">
                                            {selectedOrder.pharmacy?.name || 'Pharmacy Partner'}
                                        </p>
                                        {selectedOrder.pharmacy?.address && (
                                            <p className="text-xs text-gray-500 truncate">{selectedOrder.pharmacy.address}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Order & Fulfillment Mode */}
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-gray-400 block text-[10px] uppercase">Fulfillment Mode</span>
                                        <span className="font-extrabold text-gray-800 dark:text-gray-200 capitalize">
                                            {selectedOrder.delivery_type === 'delivery' ? 'Home Delivery' : 'Pharmacy Pickup'}
                                        </span>
                                    </div>
                                    {selectedOrder.delivery_address && (
                                        <div className="text-right max-w-xs truncate">
                                            <span className="font-bold text-gray-400 block text-[10px] uppercase">Delivery Destination</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedOrder.delivery_address}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Items List */}
                                {selectedOrder.items && selectedOrder.items.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                            Medicines in Order ({selectedOrder.items.length})
                                        </label>
                                        <div className="space-y-2">
                                            {selectedOrder.items.map((item, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">
                                                            {item.name || item.medicine_name || `Medicine #${idx + 1}`}
                                                        </p>
                                                        {item.dosage && <p className="text-gray-400">{item.dosage}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-extrabold text-gray-700 dark:text-gray-300">Qty: {item.quantity}</span>
                                                        {item.price && <p className="text-gray-400 font-mono">₹{item.price}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Order Timeline */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Order Progression
                                    </label>
                                    <div className="space-y-2 border-l-2 border-orange-200 dark:border-orange-900/40 ml-3 pl-4 text-xs space-y-3">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Order Placed from Clinic</p>
                                            <p className="text-gray-400">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-orange-600 dark:text-orange-400">Current Status</p>
                                            <p className="text-gray-600 dark:text-gray-300 font-medium">
                                                {getStatusBadge(selectedOrder.status).label}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50 dark:bg-gray-800/40">
                                <Button onClick={() => setSelectedOrder(null)} className="rounded-xl text-xs font-bold">
                                    Close
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
