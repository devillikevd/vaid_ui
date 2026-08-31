'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Stethoscope,
    Search,
    MapPin,
    Phone,
    Clock,
    AlertCircle,
    CheckCircle2,
    Building2,
    ArrowRight,
    Navigation,
    Compass,
    RefreshCw,
    X,
    Info
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { usePatientLocation } from '@/hooks/usePatientLocation';

const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const normalizeDayName = (day: string) => {
    const d = day.trim().toLowerCase();
    if (d.startsWith('mon')) return 'Mon';
    if (d.startsWith('tue')) return 'Tue';
    if (d.startsWith('wed')) return 'Wed';
    if (d.startsWith('thu')) return 'Thu';
    if (d.startsWith('fri')) return 'Fri';
    if (d.startsWith('sat')) return 'Sat';
    if (d.startsWith('sun')) return 'Sun';
    return day;
};

const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) {
        return timeStr;
    }
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
};

const parseClinicHours = (openingHours: any): { isWeekly: boolean; schedule?: { day: string; time: string; isClosed: boolean }[]; text?: string } => {
    if (!openingHours) return { isWeekly: false, text: 'Hours not specified' };

    let parsed = openingHours;
    if (typeof openingHours === 'string') {
        const trimmed = openingHours.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                return { isWeekly: false, text: trimmed };
            }
        } else {
            return { isWeekly: false, text: trimmed };
        }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
        const dayMap = new Map<string, { time: string; isClosed: boolean }>();
        parsed.forEach((item: any) => {
            if (!item) return;
            const dayKey = item.day || item.day_name || item.name;
            if (!dayKey) return;
            const normDay = normalizeDayName(String(dayKey));
            const isClosed = item.is_closed === true || item.isOpen === false || item.closed === true || item.time === 'Closed';
            let timeStr = 'Closed';
            if (!isClosed) {
                if (item.hours) {
                    timeStr = item.hours;
                } else if (item.open && item.close) {
                    timeStr = `${formatTime12h(item.open)} – ${formatTime12h(item.close)}`;
                } else if (item.open) {
                    timeStr = `Opens ${formatTime12h(item.open)}`;
                } else {
                    timeStr = 'Open';
                }
            }
            dayMap.set(normDay, { time: timeStr, isClosed });
        });

        const weeklySchedule = DAYS_ORDER.map((day) => {
            const existing = dayMap.get(day);
            return {
                day,
                time: existing ? existing.time : 'Closed',
                isClosed: existing ? existing.isClosed : true,
            };
        });

        return { isWeekly: true, schedule: weeklySchedule };
    }

    if (typeof parsed === 'object' && parsed !== null) {
        const weeklySchedule = DAYS_ORDER.map((day) => {
            const dayKey = Object.keys(parsed).find((k) => normalizeDayName(k) === day);
            const item = dayKey ? parsed[dayKey] : null;
            if (!item) return { day, time: 'Closed', isClosed: true };
            const isClosed = item.is_closed === true || item.isOpen === false || item.closed === true || item === 'Closed';
            let timeStr = 'Closed';
            if (!isClosed) {
                if (typeof item === 'string') {
                    timeStr = item;
                } else if (item.hours) {
                    timeStr = item.hours;
                } else if (item.open && item.close) {
                    timeStr = `${formatTime12h(item.open)} – ${formatTime12h(item.close)}`;
                } else {
                    timeStr = 'Open';
                }
            }
            return { day, time: timeStr, isClosed };
        });
        return { isWeekly: true, schedule: weeklySchedule };
    }

    return { isWeekly: false, text: String(openingHours) };
};

const getTodayClinicAvailability = (openingHours: any): { isOpenToday: boolean; text: string } => {
    const todayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ...
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayShort = daysMap[todayIndex];

    const parsed = parseClinicHours(openingHours);
    if (parsed.isWeekly && parsed.schedule) {
        const todaySchedule = parsed.schedule.find((s) => s.day === todayShort);
        if (todaySchedule) {
            if (todaySchedule.isClosed || todaySchedule.time.toLowerCase() === 'closed') {
                return { isOpenToday: false, text: 'Closed today' };
            }
            return { isOpenToday: true, text: `Open today · ${todaySchedule.time}` };
        }
    }
    if (parsed.text && parsed.text !== 'Hours not specified') {
        return { isOpenToday: true, text: parsed.text };
    }
    return { isOpenToday: true, text: 'Open for Outpatient Visits' };
};

export default function PatientClinicsPage() {
    const { coords, loading: locationLoading, permissionDenied, requestLocation } = usePatientLocation();

    const [clinics, setClinics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [city, setCity] = useState('');

    // Selected Clinic for Info Modal
    const [selectedClinicInfo, setSelectedClinicInfo] = useState<any | null>(null);

    const fetchClinics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {};
            if (coords) {
                params.latitude = coords.latitude;
                params.longitude = coords.longitude;
                params.radius = 25;
            }
            if (search.trim()) params.search = search.trim();
            if (city.trim()) params.city = city.trim();

            const res = await patientApi.getClinics(params);
            if (res.success) {
                setClinics((res.data as any[]) || []);
            } else {
                setError(res.message || res.error || 'Failed to load clinics');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching clinics directory');
        } finally {
            setLoading(false);
        }
    }, [coords, search, city]);

    useEffect(() => {
        if (!locationLoading) {
            const timeout = setTimeout(() => {
                fetchClinics();
            }, 250);
            return () => clearTimeout(timeout);
        }
    }, [locationLoading, fetchClinics]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold mb-2">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>25 KM Local Clinic Network</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                    Find Healthcare Clinics
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                    Locate verified outpatient clinics, specialty practices, family medicine centers, and walk-in consultation facilities within 25 km.
                </p>
            </div>

            {/* GPS Location Status Banner */}
            {coords ? (
                <div className="flex items-center justify-between px-4 py-2.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-xs text-teal-900">
                    <div className="flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-teal-700 shrink-0 fill-teal-700/20" />
                        <span className="font-semibold">
                            Local Discovery Active · Showing clinics within 25 km
                        </span>
                    </div>
                    <button
                        onClick={requestLocation}
                        className="text-[11px] font-bold text-teal-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                        <RefreshCw className="w-3 h-3" /> Refresh GPS
                    </button>
                </div>
            ) : permissionDenied ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Location Permission Required for 25 KM Local Discovery</p>
                            <p className="text-amber-800/80 text-[11px] mt-0.5">
                                Enable browser location permissions to find nearby clinics within your local healthcare network.
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

            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search Input */}
                    <div className="md:col-span-8 relative">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by clinic name or specialty..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all"
                        />
                    </div>

                    {/* City Input */}
                    <div className="md:col-span-4 relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="City (e.g. Gorakhpur)..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Clinic Results — Compact Horizontal List View */}
            {loading || locationLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl p-5 border border-stone-200/80 animate-pulse h-28"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <h3 className="font-heading font-bold text-stone-900 text-base">
                        Failed to load clinics
                    </h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {error}
                    </p>
                    <button
                        onClick={fetchClinics}
                        className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-semibold hover:bg-teal-900 transition-colors cursor-pointer"
                    >
                        Retry Search
                    </button>
                </div>
            ) : clinics.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center space-y-3">
                    <Building2 className="w-12 h-12 text-stone-300 mx-auto" />
                    <h3 className="font-heading font-bold text-stone-900 text-base">
                        No clinics found within 25 km
                    </h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        We could not find any verified clinics matching your 25 km radius or search filters. Try adjusting your search query.
                    </p>
                    {(search || city) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setCity('');
                            }}
                            className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5">
                    {clinics.map((clinic) => {
                        const availability = getTodayClinicAvailability(clinic.opening_hours);
                        const distanceDisplay = clinic.distanceText ||
                            (clinic.distance !== undefined
                                ? (clinic.distance < 1
                                    ? `${Math.round(clinic.distance * 1000)} m away`
                                    : `${Number(clinic.distance).toFixed(1)} km away`)
                                : null);

                        const formattedAddress = [clinic.address, clinic.city, clinic.state, clinic.pincode]
                            .filter(Boolean)
                            .join(', ') || 'Address available on inquiry';

                        return (
                            <div
                                key={clinic.id}
                                className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 hover:border-teal-700/40 hover:shadow-xs transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                {/* Left Section: Clinic Name, Badges & Address */}
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => setSelectedClinicInfo(clinic)}
                                            className="text-left font-heading text-base sm:text-lg font-bold text-stone-900 hover:text-teal-800 transition-colors cursor-pointer"
                                        >
                                            {clinic.name}
                                        </button>
                                        {(clinic.approval_status === 'approved' || clinic.is_approved) && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>VERIFIED CLINIC</span>
                                            </span>
                                        )}
                                        {distanceDisplay && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px] shrink-0">
                                                <Compass className="w-3 h-3 text-stone-400" />
                                                <span>{distanceDisplay}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Middle/Secondary Info: Concise Address & Today Availability */}
                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3.5 text-xs text-stone-500">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                            <span className="truncate max-w-xs sm:max-w-md">
                                                {formattedAddress}
                                            </span>
                                        </div>

                                        <span className="text-stone-300 hidden sm:inline">·</span>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                            <span className={availability.isOpenToday ? 'text-emerald-700 font-medium' : 'text-stone-500'}>
                                                {availability.text}
                                            </span>
                                        </div>

                                        {clinic.phone && (
                                            <>
                                                <span className="text-stone-300 hidden sm:inline">·</span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span>{clinic.phone}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Right Section: Primary CTA & Info Link */}
                                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 justify-between md:justify-end">
                                    <button
                                        onClick={() => setSelectedClinicInfo(clinic)}
                                        className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                        title="View Clinic Details & Schedule"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Hours</span>
                                    </button>

                                    <Link
                                        href={`/patient/doctors?clinicId=${clinic.id}&mode=in_person`}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                    >
                                        <span>Find Clinic Doctors</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Clinic Info Modal (Detail View on demand) */}
            {selectedClinicInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden relative p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-heading text-xl font-bold text-stone-900">
                                        {selectedClinicInfo.name}
                                    </h3>
                                    {(selectedClinicInfo.approval_status === 'approved' || selectedClinicInfo.is_approved) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>VERIFIED</span>
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-stone-500 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    <span>
                                        {[selectedClinicInfo.address, selectedClinicInfo.city, selectedClinicInfo.state, selectedClinicInfo.pincode]
                                            .filter(Boolean)
                                            .join(', ') || 'Address available on inquiry'}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedClinicInfo(null)}
                                className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {selectedClinicInfo.phone && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 bg-stone-50 p-2.5 rounded-xl">
                                <Phone className="w-4 h-4 text-teal-700 shrink-0" />
                                <span>Phone: {selectedClinicInfo.phone}</span>
                            </div>
                        )}

                        {selectedClinicInfo.description && (
                            <p className="text-xs text-stone-600 font-light leading-relaxed">
                                {selectedClinicInfo.description}
                            </p>
                        )}

                        {/* Complete 7-Day Schedule */}
                        <div className="bg-stone-50/90 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5 text-teal-700" />
                                <span>Clinic Weekly Schedule</span>
                            </div>

                            {(() => {
                                const parsedHours = parseClinicHours(selectedClinicInfo.opening_hours);
                                if (parsedHours.isWeekly && parsedHours.schedule) {
                                    return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-xs">
                                            {parsedHours.schedule.map((item) => (
                                                <div
                                                    key={item.day}
                                                    className="flex items-center justify-between py-0.5 text-xs"
                                                >
                                                    <span className="font-bold text-stone-700 w-10">{item.day}</span>
                                                    <span className={item.isClosed ? 'text-stone-400 font-normal' : 'text-stone-800 font-medium'}>
                                                        {item.time}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return (
                                    <p className="text-xs text-stone-600">
                                        {parsedHours.text || 'Standard outpatient hours'}
                                    </p>
                                );
                            })()}
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                            <button
                                onClick={() => setSelectedClinicInfo(null)}
                                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Close
                            </button>
                            <Link
                                href={`/patient/doctors?clinicId=${selectedClinicInfo.id}&mode=in_person`}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                                <span>Find Clinic Doctors</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
