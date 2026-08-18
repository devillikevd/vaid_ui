'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Microscope, Search, Filter, Clock, User, Stethoscope, 
    AlertCircle, CheckCircle2, XCircle, ArrowRight, ShieldCheck, 
    FileText, Eye, RefreshCw, ChevronRight, Home, Building2,
    Building, AlertTriangle, Activity, Download, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export interface DiagnosticBooking {
    id: string;
    patient_id?: string;
    center_id: string;
    test_id?: string;
    prescription_id?: string;
    consultation_id?: string;
    doctor_id?: string;
    booking_date: string;
    booking_time?: string;
    collection_type?: 'home' | 'center';
    collection_address?: string;
    status: 'pending' | 'accepted' | 'sample_collected' | 'processing' | 'report_ready' | 'completed' | 'cancelled' | 'rejected';
    result_status?: 'pending' | 'processing' | 'ready' | 'delivered';
    report_url?: string;
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
    center?: {
        id: string;
        name: string;
        phone?: string;
        address?: string;
    };
    test?: {
        id?: string;
        name: string;
        category?: string;
        sample_type?: string;
        price?: number;
    };
    doctor?: {
        id: string;
        users?: {
            name: string;
        };
    };
}

export default function ClinicDiagnosticOrdersPage() {
    const toast = useToast();
    const router = useRouter();

    const [bookings, setBookings] = useState<DiagnosticBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loadingPartnerships, setLoadingPartnerships] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [collectionTypeFilter, setCollectionTypeFilter] = useState<string>('all');

    // Modals
    const [selectedBooking, setSelectedBooking] = useState<DiagnosticBooking | null>(null);
    const [viewingReportUrl, setViewingReportUrl] = useState<string | null>(null);

    // Load active diagnostic partnerships
    const loadPartnerships = useCallback(async () => {
        setLoadingPartnerships(true);
        try {
            const res = await clinicApi.getPartnerships('active');
            if (res.success) {
                const centerPartners = ((res.data as any[]) || []).filter(
                    (p: any) => p.target_type === 'diagnostic_center' || p.targetType === 'diagnostic_center'
                );
                setPartnerships(centerPartners);
            }
        } catch (err) {
            console.error('Failed to load diagnostic partnerships:', err);
        } finally {
            setLoadingPartnerships(false);
        }
    }, []);

    // Load routed diagnostic bookings
    const loadBookings = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const res = await clinicApi.getRoutedDiagnosticBookings();
            if (res.success) {
                setBookings((res.data as DiagnosticBooking[]) || []);
            } else {
                setFetchError(true);
                toast.error('Unable to load diagnostic orders', res.error || 'Please try again.');
            }
        } catch {
            setFetchError(true);
            toast.error('Unable to load diagnostic orders');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadPartnerships();
    }, [loadPartnerships]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    // Compute real KPI counts
    const kpiSummary = useMemo(() => {
        const counts = {
            total: bookings.length,
            pending: 0,
            accepted: 0,
            sample_collected: 0,
            processing: 0,
            report_ready: 0,
            completed: 0,
        };

        bookings.forEach(b => {
            const st = b.status;
            if (st === 'pending') counts.pending++;
            else if (st === 'accepted') counts.accepted++;
            else if (st === 'sample_collected') counts.sample_collected++;
            else if (st === 'processing') counts.processing++;
            else if (st === 'report_ready' || b.result_status === 'ready') counts.report_ready++;
            else if (st === 'completed') counts.completed++;
        });

        return counts;
    }, [bookings]);

    // Search and status filter
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
            const matchesCollection = collectionTypeFilter === 'all' || booking.collection_type === collectionTypeFilter;

            const q = searchQuery.toLowerCase().trim();
            const patientName = booking.patient?.name?.toLowerCase() || '';
            const centerName = booking.center?.name?.toLowerCase() || '';
            const testName = booking.test?.name?.toLowerCase() || '';
            const doctorName = booking.doctor?.users?.name?.toLowerCase() || '';
            const bookingId = booking.id.toLowerCase();

            const matchesSearch = !q ||
                patientName.includes(q) ||
                centerName.includes(q) ||
                testName.includes(q) ||
                doctorName.includes(q) ||
                bookingId.includes(q);

            return matchesStatus && matchesCollection && matchesSearch;
        });
    }, [bookings, statusFilter, collectionTypeFilter, searchQuery]);

    const getStatusBadge = (status: DiagnosticBooking['status'], reportUrl?: string) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending Review',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
                    dot: 'bg-amber-500'
                };
            case 'accepted':
                return {
                    label: 'Accepted by Center',
                    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
                    dot: 'bg-blue-500'
                };
            case 'sample_collected':
                return {
                    label: 'Sample Collected',
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40',
                    dot: 'bg-indigo-500'
                };
            case 'processing':
                return {
                    label: 'Lab Processing',
                    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40',
                    dot: 'bg-purple-500 animate-pulse'
                };
            case 'report_ready':
                return {
                    label: 'Report Ready',
                    bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/40',
                    dot: 'bg-teal-500'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
                    dot: 'bg-emerald-500'
                };
            case 'rejected':
                return {
                    label: 'Declined by Center',
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
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
                            Operations
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Microscope className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                        Diagnostic Orders
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                        Track tests routed to your active diagnostic partners.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadBookings} 
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
                    { label: 'Sample Collected', count: kpiSummary.sample_collected, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
                    { label: 'Processing', count: kpiSummary.processing, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                    { label: 'Report Ready', count: kpiSummary.report_ready, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
                    { label: 'Completed', count: kpiSummary.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                ].map((chip, idx) => (
                    <div key={idx} className={`p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 ${chip.bg} flex flex-col justify-between`}>
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{chip.label}</span>
                        <span className={`text-xl font-black ${chip.color} mt-1`}>{chip.count}</span>
                    </div>
                ))}
            </div>

            {/* Partnership Banner if No Active Diagnostic Partners */}
            {!loadingPartnerships && partnerships.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                                No active diagnostic partners
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                Establish an active diagnostic center partnership in the Partnerships Hub before routing clinic diagnostic lab tests.
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
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">All Tests ({bookings.length})</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="sample_collected">Sample Collected</option>
                        <option value="processing">Processing</option>
                        <option value="report_ready">Report Ready</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        value={collectionTypeFilter}
                        onChange={(e) => setCollectionTypeFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">All Collection Types</option>
                        <option value="home">Home Sample Collection</option>
                        <option value="center">Center Visit</option>
                    </select>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search patient, test, center, doctor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm font-bold">Loading diagnostic orders...</p>
                </div>
            ) : fetchError ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Unable to load diagnostic orders</h3>
                    <Button onClick={loadBookings} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold">
                        <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
                    </Button>
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                        <Microscope className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            No diagnostic orders yet
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Diagnostic test orders routed to your active partners will appear here.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push('/clinic/consultations')}
                            className="rounded-xl text-xs font-bold"
                        >
                            View Consultations
                        </Button>
                        <Button 
                            size="sm"
                            onClick={() => router.push('/clinic/partnerships')}
                            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                        >
                            Manage Partnerships
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBookings.map((booking) => {
                        const statusBadge = getStatusBadge(booking.status, booking.report_url);
                        const patientName = booking.patient?.name || 'Patient';
                        const centerName = booking.center?.name || 'Partner Diagnostic Center';
                        const testName = booking.test?.name || 'Diagnostic Test';
                        const doctorName = booking.doctor?.users?.name || 'Clinic Physician';

                        return (
                            <motion.div
                                key={booking.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                            >
                                <div className="space-y-4">
                                    {/* Top Row */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="font-mono text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg">
                                            DX-{booking.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                                {booking.collection_type === 'home' ? <Home className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-blue-600" />}
                                                {booking.collection_type === 'home' ? 'Home Sample' : 'Center Visit'}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1.5 ${statusBadge.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                                {statusBadge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Patient & Test Info */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white truncate">
                                                {patientName}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400">
                                            <Microscope className="w-3.5 h-3.5" />
                                            <span className="truncate">{testName}</span>
                                        </div>
                                    </div>

                                    {/* Center & Scheduled Date */}
                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <span>Center</span>
                                            <span className="text-teal-600 font-bold">{centerName}</span>
                                        </div>
                                        <p className="font-medium flex items-center gap-1 text-[11px] pt-1">
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            Scheduled: {booking.booking_date} {booking.booking_time ? `@ ${booking.booking_time}` : ''}
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
                                            Booked: {new Date(booking.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedBooking(booking)}
                                        className="text-xs font-bold rounded-xl flex-1"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                                    </Button>

                                    {booking.report_url && (
                                        <Button
                                            size="sm"
                                            onClick={() => window.open(booking.report_url, '_blank')}
                                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1" /> Report
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Booking Details Modal */}
            <AnimatePresence>
                {selectedBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-teal-50/50 to-blue-50/50 dark:from-teal-950/20 dark:to-blue-950/20">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-bold text-gray-500">
                                            DX-{selectedBooking.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(selectedBooking.status).bg}`}>
                                            {getStatusBadge(selectedBooking.status).label}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-xl text-gray-900 dark:text-white">
                                        Diagnostic Test Order Details
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                {/* Care Partner Badges */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patient</p>
                                        <p className="text-base font-extrabold text-gray-900 dark:text-white">
                                            {selectedBooking.patient?.name || 'Patient'}
                                        </p>
                                        {selectedBooking.patient?.user?.phone && (
                                            <p className="text-xs text-gray-500">Phone: {selectedBooking.patient.user.phone}</p>
                                        )}
                                    </div>

                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Partner Diagnostic Center</p>
                                        <p className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                                            {selectedBooking.center?.name || 'Diagnostic Partner'}
                                        </p>
                                        {selectedBooking.center?.address && (
                                            <p className="text-xs text-gray-500 truncate">{selectedBooking.center.address}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Test Details */}
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Test Ordered</p>
                                            <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                                                {selectedBooking.test?.name || 'Lab Test'}
                                            </h4>
                                            {selectedBooking.test?.category && (
                                                <span className="text-xs text-gray-500 capitalize">{selectedBooking.test.category}</span>
                                            )}
                                        </div>
                                        {selectedBooking.test?.price && (
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Price</span>
                                                <p className="text-base font-extrabold text-gray-900 dark:text-white font-mono">₹{selectedBooking.test.price}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex flex-wrap gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Collection Mode</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                                {selectedBooking.collection_type === 'home' ? 'Home Sample Collection' : 'Center Visit'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Scheduled Slot</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                {selectedBooking.booking_date} {selectedBooking.booking_time || ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Report Access if available */}
                                {selectedBooking.report_url && (
                                    <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 text-xs font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                            Diagnostic Lab Report is Ready
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => window.open(selectedBooking.report_url, '_blank')}
                                            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Report
                                        </Button>
                                    </div>
                                )}

                                {/* Booking Timeline */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Diagnostic Progression
                                    </label>
                                    <div className="space-y-2 border-l-2 border-teal-200 dark:border-teal-900/40 ml-3 pl-4 text-xs space-y-3">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Order Booked from Clinic</p>
                                            <p className="text-gray-400">{new Date(selectedBooking.created_at).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-teal-600 dark:text-teal-400">Current Status</p>
                                            <p className="text-gray-600 dark:text-gray-300 font-medium">
                                                {getStatusBadge(selectedBooking.status).label}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50 dark:bg-gray-800/40">
                                <Button onClick={() => setSelectedBooking(null)} className="rounded-xl text-xs font-bold">
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
