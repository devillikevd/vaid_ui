'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Microscope,
    Calendar,
    Clock,
    MapPin,
    Building2,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Download,
    Plus,
    X,
    Home,
    Phone,
    Navigation,
    Compass,
    RefreshCw,
    Building,
    CalendarCheck
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { usePatientLocation } from '@/hooks/usePatientLocation';
import { useAuthStore } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';

export default function PatientDiagnosticsPage() {
    const { isAuthenticated } = useAuthStore();
    const { requireAuth } = useAuthGate();
    const { coords, loading: locationLoading, permissionDenied, requestLocation } = usePatientLocation();

    const [activeTab, setActiveTab] = useState<'nearby' | 'bookings'>('nearby');

    // Nearby Discovery State
    const [centers, setCenters] = useState<any[]>([]);
    const [centerLoading, setCenterLoading] = useState(true);
    const [centerError, setCenterError] = useState<string | null>(null);
    const [centerSearch, setCenterSearch] = useState('');

    // Booking Modal State
    const [selectedCenter, setSelectedCenter] = useState<any | null>(null);
    const [collectionType, setCollectionType] = useState<'home_collection' | 'center_visit'>('center_visit');
    const [testName, setTestName] = useState('Comprehensive Health Checkup');
    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('09:00 AM');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [submittingBooking, setSubmittingBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
    const [bookingError, setBookingError] = useState<string | null>(null);

    // Bookings History State
    const [bookings, setBookings] = useState<any[]>([]);
    const [bookingLoading, setBookingLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cancel modal state
    const [cancelBooking, setCancelBooking] = useState<any | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const fetchCenters = useCallback(async () => {
        setCenterLoading(true);
        setCenterError(null);
        try {
            const params: any = {};
            if (coords) {
                params.latitude = coords.latitude;
                params.longitude = coords.longitude;
                params.radius = 25;
            }
            if (centerSearch.trim()) params.search = centerSearch.trim();

            const res = await patientApi.getDiagnosticCenters(params);
            if (res.success) {
                setCenters((res.data as any[]) || []);
            } else {
                setCenterError(res.message || res.error || 'Failed to load diagnostic centers');
            }
        } catch (err: any) {
            setCenterError(err.message || 'Error fetching diagnostic centers');
        } finally {
            setCenterLoading(false);
        }
    }, [coords, centerSearch]);

    const fetchBookings = async () => {
        setBookingLoading(true);
        setError(null);
        try {
            const res = await patientApi.getDiagnosticBookings();
            if (res.success) {
                setBookings((res.data as any[]) || []);
            } else {
                setError(res.message || res.error || 'Failed to load diagnostic bookings');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching diagnostic bookings');
        } finally {
            setBookingLoading(false);
        }
    };

    useEffect(() => {
        if (!locationLoading) {
            fetchCenters();
        }
    }, [locationLoading, fetchCenters]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchBookings();
        }
    }, [isAuthenticated]);

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCenter) return;
        if (!appointmentDate) {
            setBookingError('Please choose a date for your test appointment.');
            return;
        }

        setSubmittingBooking(true);
        setBookingError(null);
        setBookingSuccess(null);

        try {
            const res = await patientApi.bookDiagnosticTest({
                centerId: selectedCenter.id,
                testName,
                appointmentDate,
                appointmentTime,
                collectionType,
                address: collectionType === 'home_collection' ? deliveryAddress : undefined,
                notes,
            });

            if (res.success) {
                setBookingSuccess('Diagnostic appointment booked successfully!');
                setTimeout(() => {
                    setSelectedCenter(null);
                    setBookingSuccess(null);
                    setActiveTab('bookings');
                    fetchBookings();
                }, 1500);
            } else {
                setBookingError(res.message || res.error || 'Failed to book diagnostic test');
            }
        } catch (err: any) {
            setBookingError(err.message || 'Error submitting test booking');
        } finally {
            setSubmittingBooking(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!cancelBooking) return;
        setCancelling(true);
        setCancelError(null);
        try {
            const res = await patientApi.cancelDiagnosticBooking(cancelBooking.id);
            if (res.success) {
                setCancelBooking(null);
                fetchBookings();
            } else {
                setCancelError(res.message || res.error || 'Failed to cancel diagnostic test booking');
            }
        } catch (err: any) {
            setCancelError(err.message || 'Error cancelling booking');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold mb-2">
                        <Microscope className="w-3.5 h-3.5" />
                        <span>Laboratory & Pathology Diagnostics</span>
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                        Diagnostic Centers & Lab Tests
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                        Find certified pathology centers within 25 km. Choose Home Sample Collection or Center Visit.
                    </p>
                </div>
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
                        Nearby Labs & Centers (25 km)
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'bookings'
                                ? 'bg-white text-stone-900 shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <span>My Diagnostic Bookings</span>
                        {bookings.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-full text-[10px]">
                                {bookings.length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* TAB 1: NEARBY LABS DISCOVERY */}
            {activeTab === 'nearby' && (
                <div className="space-y-5">
                    {/* GPS Status */}
                    {coords ? (
                        <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs text-purple-950">
                            <div className="flex items-center gap-2">
                                <Navigation className="w-3.5 h-3.5 text-purple-700 shrink-0 fill-purple-700/20" />
                                <span className="font-semibold">
                                    Local Discovery Active · Showing diagnostic centers within 25 km
                                </span>
                            </div>
                            <button
                                onClick={requestLocation}
                                className="text-[11px] font-bold text-purple-800 hover:underline flex items-center gap-1 cursor-pointer"
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
                                        Allow location access to find certified diagnostic laboratories in your local vicinity.
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

                    {/* Search Bar */}
                    <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-2xs">
                        <div className="relative">
                            <Microscope className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by lab name, test type, or area..."
                                value={centerSearch}
                                onChange={(e) => setCenterSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                            />
                        </div>
                    </div>

                    {/* Centers List */}
                    {centerLoading || locationLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-36" />
                            ))}
                        </div>
                    ) : centerError ? (
                        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                            <p className="text-sm font-semibold text-stone-800">{centerError}</p>
                            <button
                                onClick={fetchCenters}
                                className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : centers.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
                            <Building className="w-12 h-12 text-stone-300 mx-auto" />
                            <h3 className="font-heading font-bold text-stone-900 text-base">
                                No diagnostic centers found within 25 km
                            </h3>
                            <p className="text-xs text-stone-500 max-w-sm mx-auto">
                                We could not find any verified diagnostic centers within 25 km of your location. Try adjusting your search query.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {centers.map((center) => (
                                <div
                                    key={center.id}
                                    className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-purple-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-heading text-lg font-bold text-stone-900">
                                                {center.name}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>VERIFIED LAB</span>
                                            </span>
                                            {center.home_collection_available !== false && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                                    <Home className="w-3 h-3" />
                                                    <span>Home Sample Collection</span>
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold">
                                                <Building2 className="w-3 h-3" />
                                                <span>Center Visit Available</span>
                                            </span>
                                            {(center.distanceText || center.distance !== undefined) && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px]">
                                                    <Compass className="w-3 h-3 text-stone-400" />
                                                    <span>
                                                        {center.distanceText ||
                                                            (center.distance < 1
                                                                ? `${Math.round(center.distance * 1000)} m away`
                                                                : `${Number(center.distance).toFixed(1)} km away`)}
                                                    </span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                <span>
                                                    {[center.address, center.city, center.pincode]
                                                        .filter(Boolean)
                                                        .join(', ') || 'Address available on inquiry'}
                                                </span>
                                            </div>
                                            {center.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span>{center.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                        <button
                                            onClick={() => {
                                                requireAuth({
                                                    actionType: 'diagnostic_booking',
                                                    title: 'Sign In to Book Diagnostic Test',
                                                    description: `Sign in or register to schedule diagnostic lab tests and home sample collections at ${center.name}.`,
                                                    returnUrl: '/patient/diagnostics',
                                                    onAuthenticated: () => {
                                                        setSelectedCenter(center);
                                                        setBookingError(null);
                                                        setBookingSuccess(null);
                                                    },
                                                });
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                        >
                                            <CalendarCheck className="w-3.5 h-3.5" />
                                            <span>Book Diagnostic Test</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MY BOOKINGS */}
            {activeTab === 'bookings' && (
                <div>
                    {bookingLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-36" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                            <p className="text-sm font-semibold text-stone-800">{error}</p>
                            <button
                                onClick={fetchBookings}
                                className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                            <Microscope className="w-10 h-10 text-stone-300 mx-auto" />
                            <h3 className="font-heading font-bold text-lg text-stone-800">
                                No Diagnostic Bookings Found
                            </h3>
                            <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                                You have not scheduled any diagnostic or pathology tests yet. Discover nearby diagnostic labs to book home collections or center appointments.
                            </p>
                            <button
                                onClick={() => setActiveTab('nearby')}
                                className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-semibold hover:bg-purple-800 transition-colors mt-2 cursor-pointer"
                            >
                                Find Diagnostic Labs
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => {
                                const testName = booking.test?.name || booking.test_name || 'Diagnostic Test';
                                const centerName = booking.center?.name || booking.center_name || 'Diagnostic Center';
                                const price = booking.test?.price || booking.price || 0;
                                const status = (booking.status || 'pending').toLowerCase();
                                const isHomeCollection = booking.collection_type === 'home_collection' || booking.collection_type === 'home' || booking.is_home_collection;

                                return (
                                    <div
                                        key={booking.id}
                                        className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-vd-forest/30 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 font-bold text-base flex items-center justify-center shrink-0">
                                                <Microscope className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-heading font-bold text-base text-stone-900">
                                                        {testName}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                                                        status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        status === 'cancelled' ? 'bg-stone-100 text-stone-600 border border-stone-200' :
                                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                                    <span className="font-medium text-stone-700">{centerName}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                                        {booking.appointment_date || booking.scheduled_date || 'Date Pending'}
                                                    </span>
                                                    {booking.appointment_time && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                                                            {booking.appointment_time}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 pt-1 text-xs">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                                        isHomeCollection ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'
                                                    }`}>
                                                        {isHomeCollection ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                                        <span>{isHomeCollection ? 'Home Sample Collection' : 'Visit Diagnostic Center'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                            {price > 0 && (
                                                <span className="font-bold text-stone-900 text-sm">
                                                    ₹{price}
                                                </span>
                                            )}
                                            {['pending', 'scheduled', 'confirmed'].includes(status) && (
                                                <button
                                                    onClick={() => setCancelBooking(booking)}
                                                    className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                                                >
                                                    Cancel Booking
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

            {/* Book Diagnostic Test Modal */}
            {selectedCenter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                            <div>
                                <h3 className="font-heading font-bold text-base text-stone-900">
                                    Book Lab Test
                                </h3>
                                <p className="text-xs text-stone-500 font-medium">{selectedCenter.name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedCenter(null)}
                                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBooking} className="space-y-4">
                            {/* Collection Mode Selection: Home vs Center Visit */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-stone-700">Sample Collection Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCollectionType('center_visit')}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                            collectionType === 'center_visit'
                                                ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs font-bold'
                                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <Building2 className="w-4 h-4" />
                                            <span>Visit Lab Centre</span>
                                        </div>
                                        <p className="text-[10px] text-stone-500 font-normal mt-1">
                                            Walk-in visit at certified facility
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCollectionType('home_collection')}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                            collectionType === 'home_collection'
                                                ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-2xs font-bold'
                                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <Home className="w-4 h-4" />
                                            <span>Home Collection</span>
                                        </div>
                                        <p className="text-[10px] text-stone-500 font-normal mt-1">
                                            Phlebotomist visits home address
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Test Name Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-700">Test / Package Name</label>
                                <input
                                    type="text"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="e.g. Complete Blood Count, Lipid Profile"
                                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                                    required
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-700">Appointment Date</label>
                                    <input
                                        type="date"
                                        value={appointmentDate}
                                        onChange={(e) => setAppointmentDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-700">Preferred Slot</label>
                                    <select
                                        value={appointmentTime}
                                        onChange={(e) => setAppointmentTime(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                                    >
                                        <option value="07:00 AM">07:00 AM – 08:00 AM (Fasting)</option>
                                        <option value="08:00 AM">08:00 AM – 09:00 AM (Fasting)</option>
                                        <option value="09:00 AM">09:00 AM – 10:00 AM</option>
                                        <option value="11:00 AM">11:00 AM – 12:00 PM</option>
                                        <option value="02:00 PM">02:00 PM – 03:00 PM</option>
                                        <option value="05:00 PM">05:00 PM – 06:00 PM</option>
                                    </select>
                                </div>
                            </div>

                            {/* Address (If Home Collection) */}
                            {collectionType === 'home_collection' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-stone-700">Home Collection Address</label>
                                    <input
                                        type="text"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Full residential address for sample collection"
                                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                                        required={collectionType === 'home_collection'}
                                    />
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-700">Special Instructions / Fasting Notes (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. 12-hour fasting observed, patient is diabetic"
                                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                                />
                            </div>

                            {bookingError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600">
                                    {bookingError}
                                </div>
                            )}

                            {bookingSuccess && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{bookingSuccess}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCenter(null)}
                                    className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingBooking}
                                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingBooking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Booking</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {cancelBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-heading font-bold text-base text-stone-900">
                                Cancel Diagnostic Booking
                            </h3>
                            <button
                                onClick={() => setCancelBooking(null)}
                                className="text-stone-400 hover:text-stone-600 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-stone-600">
                            Are you sure you want to cancel booking for <strong>{cancelBooking.test_name || 'this test'}</strong>? This will release your appointment slot with the laboratory.
                        </p>

                        {cancelError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600">
                                {cancelError}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setCancelBooking(null)}
                                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={handleCancelBooking}
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
