'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Search,
    Stethoscope,
    Video,
    Building2,
    Star,
    Calendar,
    Filter,
    Loader2,
    AlertCircle,
    Clock,
    Sparkles,
    CheckCircle2,
    X,
    Navigation,
    Compass,
    Building,
    RefreshCw,
    ArrowLeft,
    ChevronRight,
    MapPin,
    CalendarCheck
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { usePatientLocation } from '@/hooks/usePatientLocation';
import { PatientBookingWidget } from '@/components/patient/PatientBookingWidget';
import { DoctorCategoriesDiscovery } from '@/components/patient/DoctorCategoriesDiscovery';
import { DoctorCard } from '@/components/patient/DoctorCard';

const ALL_SPECIALTIES_LIST = [
    'All Specialties',
    'General Physician',
    'Dermatology',
    'Gynecology',
    'Pediatrics',
    'Orthopedics',
    'ENT',
    'Cardiology',
    'Neurology',
    'Psychiatry',
    'Gastroenterology',
    'Ophthalmology',
    'General Surgery',
    'Nutrition & Dietetics',
    'Ayurveda',
    'Homeopathy',
    'Urology',
    'Pulmonology',
    'Sports Medicine',
];

function DoctorsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const hospitalIdParam = searchParams.get('hospitalId') || '';
    const clinicIdParam = searchParams.get('clinicId') || '';
    const modeParam = searchParams.get('mode') || searchParams.get('consultationType') || searchParams.get('type') || '';
    const specParam = searchParams.get('specialization') || searchParams.get('specialty') || '';
    const viewParam = searchParams.get('view') || '';

    // Mode: 'in_person' or 'video'
    const [mode, setMode] = useState<'in_person' | 'video'>(
        modeParam === 'video' ? 'video' : 'in_person'
    );

    // View: 'categories' or 'results'
    const [view, setView] = useState<'categories' | 'results'>(() => {
        if (viewParam === 'results' || hospitalIdParam || clinicIdParam || specParam) {
            return 'results';
        }
        return 'categories';
    });

    useEffect(() => {
        if (modeParam === 'video') {
            setMode('video');
        } else if (modeParam === 'in_person') {
            setMode('in_person');
        }
    }, [modeParam]);

    useEffect(() => {
        if (viewParam === 'results' || hospitalIdParam || clinicIdParam || specParam) {
            setView('results');
            if (specParam) setSelectedSpecialty(specParam);
        } else {
            setView('categories');
        }
    }, [viewParam, hospitalIdParam, clinicIdParam, specParam]);

    const { coords, loading: locationLoading, permissionDenied, requestLocation } = usePatientLocation(mode === 'in_person');

    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states for results view
    const [search, setSearch] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState(specParam || 'All Specialties');
    const [sortBy, setSortBy] = useState('rating');

    // Selected Doctor for Booking Modal
    const [bookingDoctor, setBookingDoctor] = useState<any | null>(null);

    const fetchDoctors = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {};
            if (search.trim()) params.search = search.trim();
            if (selectedSpecialty && selectedSpecialty !== 'All Specialties') {
                params.specialization = selectedSpecialty;
            }
            params.consultationType = mode;
            params.sortBy = sortBy;

            if (hospitalIdParam) {
                params.hospitalId = hospitalIdParam;
            }
            if (clinicIdParam) {
                params.clinicId = clinicIdParam;
            }

            if (mode === 'in_person') {
                // In-person requires 120 KM GPS proximity
                if (coords) {
                    params.latitude = coords.latitude;
                    params.longitude = coords.longitude;
                    params.global = false;
                }
            } else {
                // Video consultation does NOT have 120 KM proximity filter
                params.global = true;
            }

            const res = await patientApi.getDoctors(params);
            if (res.success) {
                setDoctors((res.data as any[]) || []);
            } else {
                setError(res.message || res.error || 'Failed to load doctors');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching doctors list');
        } finally {
            setLoading(false);
        }
    }, [search, selectedSpecialty, mode, sortBy, hospitalIdParam, clinicIdParam, coords]);

    useEffect(() => {
        if (view === 'results') {
            const timeout = setTimeout(() => {
                fetchDoctors();
            }, 250);
            return () => clearTimeout(timeout);
        }
    }, [view, fetchDoctors]);

    const handleModeSwitch = (newMode: 'in_person' | 'video') => {
        setMode(newMode);
        if (view === 'results') {
            router.push(`/patient/doctors?mode=${newMode}&view=results${selectedSpecialty !== 'All Specialties' ? `&specialization=${encodeURIComponent(selectedSpecialty)}` : ''}`);
        } else {
            router.push(`/patient/doctors?mode=${newMode}`);
        }
        if (newMode === 'in_person' && !coords) {
            requestLocation();
        }
    };

    const handleBackToCategories = () => {
        router.push(`/patient/doctors?mode=${mode}`);
    };

    const clearAffiliationFilter = () => {
        router.push(`/patient/doctors?mode=${mode}&view=results`);
    };

    return (
        <div className="space-y-6">
            {/* 1. CATEGORIES VIEW (FIRST DISCOVERY PAGE — 4 ORDERED SECTIONS) */}
            {view === 'categories' && (
                <DoctorCategoriesDiscovery
                    mode={mode}
                    onSelectMode={handleModeSwitch}
                />
            )}

            {/* 2. DOCTOR RESULTS LIST VIEW (ONLY AFTER EXPLORING CATEGORY OR SEARCHING) */}
            {view === 'results' && (
                <div className="space-y-6">
                    {/* Top Navigation & Breadcrumb */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                        <button
                            onClick={handleBackToCategories}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors w-fit cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Category Discovery</span>
                        </button>

                        {/* Mode Switcher Pill */}
                        <div className="flex bg-stone-100 p-1 rounded-2xl shrink-0 text-xs font-semibold self-start sm:self-auto">
                            <button
                                onClick={() => handleModeSwitch('in_person')}
                                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                    mode === 'in_person'
                                        ? 'bg-white text-vd-forest shadow-xs font-bold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>In-Person (120 KM)</span>
                            </button>
                            <button
                                onClick={() => handleModeSwitch('video')}
                                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                    mode === 'video'
                                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Video className="w-3.5 h-3.5" />
                                <span>Video Consultation</span>
                            </button>
                        </div>
                    </div>

                    {/* Mode Banner */}
                    <div className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                        mode === 'in_person'
                            ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                            : 'bg-blue-50/70 border-blue-200/80 text-blue-950'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                                mode === 'in_person' ? 'bg-emerald-100 text-vd-forest' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {mode === 'in_person' ? <Building2 className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                            </div>
                            <div>
                                <h3 className="font-heading font-bold text-sm">
                                    {mode === 'in_person'
                                        ? 'In-Person Consultation (120 KM Local Radius)'
                                        : 'Online Video Consultation (All Certified Specialists)'}
                                </h3>
                                <p className="text-[11px] text-stone-600">
                                    {mode === 'in_person'
                                        ? 'Showing doctors affiliated with verified clinics and hospitals within 120 km of your location.'
                                        : 'Showing doctors available for immediate and scheduled video consultations anywhere.'}
                                </p>
                            </div>
                        </div>

                        {mode === 'in_person' && coords && (
                            <button
                                onClick={requestLocation}
                                className="text-[11px] font-bold text-vd-forest hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                                <RefreshCw className="w-3 h-3" /> Refresh GPS
                            </button>
                        )}
                    </div>

                    {/* Location Permission Alert (for In-Person Mode) */}
                    {mode === 'in_person' && !coords && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-3xl gap-3">
                            <div className="flex items-start gap-2.5 text-xs text-amber-900">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Location Permission Required for 120 KM Discovery</p>
                                    <p className="text-amber-800/80 text-[11px] mt-0.5">
                                        Please enable browser location access to discover doctors practicing in your local 120 km radius.
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
                    )}

                    {/* Hospital / Clinic Affiliation Filter Notice */}
                    {hospitalIdParam && (
                        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-vd-forest">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-vd-forest shrink-0" />
                                <span>
                                    Showing doctors affiliated with Hospital <strong>#{hospitalIdParam.slice(0, 8)}</strong>
                                </span>
                            </div>
                            <button
                                onClick={clearAffiliationFilter}
                                className="text-xs font-bold text-vd-forest hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" /> Clear Hospital Filter
                            </button>
                        </div>
                    )}

                    {clinicIdParam && (
                        <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900">
                            <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-teal-700 shrink-0" />
                                <span>
                                    Showing doctors affiliated with Clinic <strong>#{clinicIdParam.slice(0, 8)}</strong>
                                </span>
                            </div>
                            <button
                                onClick={clearAffiliationFilter}
                                className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" /> Clear Clinic Filter
                            </button>
                        </div>
                    )}

                    {/* Search and Filters Bar */}
                    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search by doctor name or condition..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none placeholder:text-stone-400"
                                />
                            </div>

                            {/* Sort Selector */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3.5 py-2 rounded-2xl border border-stone-200 text-xs font-semibold text-stone-700 bg-white focus:outline-none cursor-pointer"
                            >
                                <option value="rating">Sort: Highest Rated</option>
                                <option value="experience">Sort: Experience</option>
                                <option value="fee_low">Sort: Fee (Low to High)</option>
                            </select>
                        </div>

                        {/* Specialty Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                            {ALL_SPECIALTIES_LIST.map((spec) => (
                                <button
                                    key={spec}
                                    onClick={() => setSelectedSpecialty(spec)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                                        selectedSpecialty === spec
                                            ? 'bg-vd-forest text-white shadow-xs'
                                            : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/60'
                                    }`}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Doctors Results */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-52"
                                />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                            <h3 className="font-heading font-bold text-base text-stone-900">
                                Unable to Load Doctors
                            </h3>
                            <p className="text-xs text-stone-500 max-w-md mx-auto">{error}</p>
                            <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                    onClick={fetchDoctors}
                                    className="px-4 py-2 bg-vd-forest hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    Retry
                                </button>
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedSpecialty('All Specialties');
                                        setSortBy('rating');
                                        setError(null);
                                    }}
                                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    ) : doctors.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
                            <Stethoscope className="w-10 h-10 text-stone-300 mx-auto" />
                            <h3 className="font-heading font-bold text-lg text-stone-900">
                                No doctors available
                            </h3>
                            <p className="text-xs text-stone-500 font-light max-w-md mx-auto">
                                {selectedSpecialty && selectedSpecialty !== 'All Specialties'
                                    ? `No doctors are currently available for ${selectedSpecialty}. Try another specialty or search term.`
                                    : mode === 'in_person'
                                    ? 'No doctors registered for in-person consultation with active clinic/hospital affiliations match within 120 km.'
                                    : 'No doctors registered for video consultation currently match your search criteria.'}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedSpecialty('All Specialties');
                                        setSortBy('rating');
                                        if (hospitalIdParam || clinicIdParam) clearAffiliationFilter();
                                    }}
                                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    View All Doctors
                                </button>
                                {mode === 'in_person' && (
                                    <button
                                        onClick={() => handleModeSwitch('video')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        <span>Try Video Consultation</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {doctors.map((doc) => (
                                <DoctorCard
                                    key={doc.id}
                                    doctor={doc}
                                    mode={mode}
                                    onBook={(d) => setBookingDoctor(d)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Booking Modal Widget */}
            {bookingDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden relative max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 right-0 z-10 flex justify-end p-4 bg-white/80 backdrop-blur-xs">
                            <button
                                onClick={() => setBookingDoctor(null)}
                                className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-6 pb-6 pt-0">
                            <PatientBookingWidget doctor={bookingDoctor} mode={mode} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PatientDoctorsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-stone-400">Loading doctor discovery...</div>}>
            <DoctorsContent />
        </Suspense>
    );
}
