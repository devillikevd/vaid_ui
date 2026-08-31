'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Building2,
    Search,
    MapPin,
    Phone,
    Clock,
    AlertCircle,
    Shield,
    CheckCircle2,
    Stethoscope,
    Loader2,
    ArrowRight,
    Navigation,
    Compass,
    RefreshCw
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { usePatientLocation } from '@/hooks/usePatientLocation';

export default function PatientHospitalsPage() {
    const { coords, loading: locationLoading, permissionDenied, error: locationError, requestLocation } = usePatientLocation();

    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [city, setCity] = useState('');
    const [emergencyOnly, setEmergencyOnly] = useState(false);

    const fetchHospitals = useCallback(async () => {
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
            if (emergencyOnly) params.isEmergencyAvailable = true;

            const res = await patientApi.getHospitals(params);
            if (res.success) {
                setHospitals((res.data as any[]) || []);
            } else {
                setError(res.message || res.error || 'Failed to load hospitals');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching hospital directory');
        } finally {
            setLoading(false);
        }
    }, [coords, search, city, emergencyOnly]);

    useEffect(() => {
        if (!locationLoading) {
            const timeout = setTimeout(() => {
                fetchHospitals();
            }, 250);
            return () => clearTimeout(timeout);
        }
    }, [locationLoading, fetchHospitals]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest border border-emerald-200 text-xs font-semibold mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>25 KM Local Hospital Network</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                    Find Hospitals & Medical Centers
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                    Discover verified hospitals, intensive care units, 24/7 emergency centers, and affiliated medical departments within 25 km of your location.
                </p>
            </div>

            {/* GPS Location Status Banner */}
            {coords ? (
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-vd-forest">
                    <div className="flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-vd-forest shrink-0 fill-vd-forest/20" />
                        <span className="font-semibold">
                            Local Discovery Active · Showing hospitals within 25 km
                        </span>
                    </div>
                    <button
                        onClick={requestLocation}
                        className="text-[11px] font-bold text-vd-forest hover:underline flex items-center gap-1 cursor-pointer"
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
                                Enable browser location permissions to find nearby hospitals within your local healthcare network.
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
                    <div className="md:col-span-6 relative">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by hospital name or department..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-vd-forest/20 focus:border-vd-forest transition-all"
                        />
                    </div>

                    {/* City Input */}
                    <div className="md:col-span-3 relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="City (e.g. Gorakhpur)..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-vd-forest/20 focus:border-vd-forest transition-all"
                        />
                    </div>

                    {/* Emergency Toggle */}
                    <div className="md:col-span-3 flex items-center">
                        <button
                            type="button"
                            onClick={() => setEmergencyOnly(!emergencyOnly)}
                            className={`w-full py-2.5 px-4 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                emergencyOnly
                                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${emergencyOnly ? 'bg-rose-600 animate-pulse' : 'bg-stone-400'}`} />
                            <span>24/7 Emergency Only</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Hospital Results */}
            {loading || locationLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl p-6 border border-stone-200/80 animate-pulse h-40"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <h3 className="font-heading font-bold text-stone-900 text-base">
                        Failed to load hospitals
                    </h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {error}
                    </p>
                    <button
                        onClick={fetchHospitals}
                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-semibold hover:bg-vd-forest-deep transition-colors cursor-pointer"
                    >
                        Retry Search
                    </button>
                </div>
            ) : hospitals.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center space-y-3">
                    <Building2 className="w-12 h-12 text-stone-300 mx-auto" />
                    <h3 className="font-heading font-bold text-stone-900 text-base">
                        No hospitals found within 25 km
                    </h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        We could not find any verified hospitals matching your 25 km radius or search filters. Try adjusting your search.
                    </p>
                    {(search || city || emergencyOnly) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setCity('');
                                setEmergencyOnly(false);
                            }}
                            className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Reset All Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {hospitals.map((hospital) => {
                        const departments = Array.isArray(hospital.departments)
                            ? hospital.departments
                            : typeof hospital.departments === 'string'
                            ? hospital.departments.split(',').map((s: string) => s.trim()).filter(Boolean)
                            : [];

                        return (
                            <div
                                key={hospital.id}
                                className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-vd-forest/40 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5"
                            >
                                <div className="space-y-2.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-heading text-lg sm:text-xl font-bold text-stone-900">
                                            {hospital.name}
                                        </h3>
                                        {(hospital.approval_status === 'approved' || hospital.is_approved) && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Verified Facility</span>
                                            </span>
                                        )}
                                        {hospital.is_emergency_available && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                                                <span>24/7 Emergency</span>
                                            </span>
                                        )}
                                        {(hospital.distanceText || hospital.distance !== undefined) && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px]">
                                                <Compass className="w-3 h-3 text-stone-400" />
                                                <span>
                                                    {hospital.distanceText ||
                                                        (hospital.distance < 1
                                                            ? `${Math.round(hospital.distance * 1000)} m away`
                                                            : `${Number(hospital.distance).toFixed(1)} km away`)}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                            <span>
                                                {[hospital.address, hospital.city, hospital.pincode]
                                                    .filter(Boolean)
                                                    .join(', ') || 'Address available on inquiry'}
                                            </span>
                                        </div>
                                        {hospital.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                <span>{hospital.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {departments.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            {departments.slice(0, 6).map((dept: string, idx: number) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 text-[11px] font-medium"
                                                >
                                                    {dept}
                                                </span>
                                            ))}
                                            {departments.length > 6 && (
                                                <span className="px-2 py-0.5 rounded-lg bg-stone-50 text-stone-400 text-[11px]">
                                                    +{departments.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                    <Link
                                        href={`/patient/doctors?hospitalId=${hospital.id}&mode=in_person`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-vd-forest text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-vd-forest-deep transition-colors w-full sm:w-auto justify-center"
                                    >
                                        <Stethoscope className="w-3.5 h-3.5" />
                                        <span>Find Hospital Doctors</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
