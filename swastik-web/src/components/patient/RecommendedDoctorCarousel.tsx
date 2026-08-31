'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Stethoscope,
    Star,
    Sparkles,
    CheckCircle2,
    Calendar,
    Video,
    Building2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    ArrowRight,
    Loader2,
    AlertCircle,
    UserCheck,
    Languages
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';

export interface RecommendedDoctor {
    id: string;
    name: string;
    specialization: string;
    qualifications?: string[] | string;
    languages?: string[];
    bio?: string;
    rating?: number | string;
    total_reviews?: number;
    experience_years?: number;
    profile_image_url?: string;
    consultation_fee?: number | null;
    video_consultation_fee?: number | null;
    is_available?: boolean;
    is_approved?: boolean;
    recommendation_reason?: string;
    hospital_id?: string;
    clinic_id?: string;
    hospital?: { city?: string; name?: string };
    clinic_doctors?: Array<{ clinic_id?: string; clinic?: { city?: string; name?: string } }>;
}

export default function RecommendedDoctorCarousel() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { requireAuth } = useAuthGate();

    const [doctors, setDoctors] = useState<RecommendedDoctor[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Detect prefers-reduced-motion
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const fetchRecommendations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isAuthenticated) {
                // Authenticated: Smart AI & clinical recommendation engine
                const res = await patientApi.getRecommendedDoctors(5);
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    setDoctors(res.data as RecommendedDoctor[]);
                    setCurrentIndex(0);
                    return;
                }
            }

            // Fallback for guests or if recommendation returns empty: top-rated available doctors
            const fallbackRes = await patientApi.getDoctors({
                limit: 5,
                sortBy: 'rating',
            });

            if (fallbackRes.success && Array.isArray(fallbackRes.data)) {
                setDoctors(fallbackRes.data as RecommendedDoctor[]);
                setCurrentIndex(0);
            } else {
                setDoctors([]);
            }
        } catch (err: any) {
            setError(err.message || 'Unable to load recommended doctors.');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    // Auto-advance timer (4.5 seconds)
    useEffect(() => {
        if (doctors.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % doctors.length);
        }, 4500);

        return () => clearInterval(timer);
    }, [doctors.length, isPaused]);

    const handlePrev = () => {
        if (doctors.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + doctors.length) % doctors.length);
    };

    const handleNext = () => {
        if (doctors.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % doctors.length);
    };

    const handleBookAppointment = (doctor: RecommendedDoctor, mode?: 'in_person' | 'video') => {
        const targetMode = mode || (doctor.consultation_fee ? 'in_person' : 'video');
        const targetUrl = `/doctors/${doctor.id}?mode=${targetMode}`;

        requireAuth({
            actionType: 'book_appointment',
            title: 'Sign In to Book Appointment',
            description: `Sign in or register to select a consultation slot with ${doctor.name}.`,
            returnUrl: targetMode ? `/doctors/${doctor.id}?mode=${targetMode}` : `/doctors/${doctor.id}`,
            onAuthenticated: () => {
                router.push(targetUrl);
            },
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-vd-forest" />
                        <div className="h-5 w-44 bg-stone-200 rounded-md animate-pulse" />
                    </div>
                </div>
                <div className="h-56 bg-stone-100/80 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <h3 className="font-heading font-bold text-sm text-stone-900">
                    Unable to load recommended doctors
                </h3>
                <p className="text-xs text-stone-500 font-light max-w-xs mx-auto">
                    {error}
                </p>
                <button
                    onClick={fetchRecommendations}
                    className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (doctors.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs text-center space-y-3">
                <Stethoscope className="w-8 h-8 text-stone-300 mx-auto" />
                <h3 className="font-heading font-bold text-sm text-stone-800">
                    No recommended doctors available right now
                </h3>
                <p className="text-xs text-stone-500 font-light max-w-xs mx-auto">
                    Explore all verified physicians across specialties and book video or clinic consultations.
                </p>
                <Link
                    href="/patient/doctors"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all mt-1"
                >
                    <span>Browse All Doctors</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        );
    }

    const currentDoc = doctors[currentIndex];
    const ratingVal = currentDoc.rating ? Number(currentDoc.rating).toFixed(1) : '5.0';
    const reviewsCount = currentDoc.total_reviews ?? 10;
    const expYears = currentDoc.experience_years ? `${currentDoc.experience_years} yrs exp` : null;
    const reason = currentDoc.recommendation_reason || (isAuthenticated ? 'Recommended for you' : 'Top Rated Specialist');
    const cityName = currentDoc.hospital?.city || currentDoc.clinic_doctors?.[0]?.clinic?.city || null;
    const hasClinicFee = currentDoc.consultation_fee !== null && currentDoc.consultation_fee !== undefined && !isNaN(Number(currentDoc.consultation_fee));
    const clinicFeeVal = hasClinicFee ? Number(currentDoc.consultation_fee) : null;

    return (
        <div
            className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-4 relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            {/* Header / Title Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100/80 text-vd-forest flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h2 className="font-heading text-base font-bold text-stone-900 leading-tight">
                            Recommended Doctors
                        </h2>
                        <p className="text-[11px] text-stone-500 font-light">
                            Top specialists matched to your care profile
                        </p>
                    </div>
                </div>

                <Link
                    href="/patient/doctors"
                    className="text-xs font-semibold text-vd-forest hover:text-vd-sage flex items-center gap-1 shrink-0"
                >
                    <span>View all</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Doctor Card Stage */}
            <div
                className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-50/90 via-emerald-50/20 to-stone-50/80 border border-stone-100/90 flex flex-col justify-between space-y-4 transition-opacity duration-300 ${
                    prefersReducedMotion ? '' : 'transition-all'
                }`}
            >
                {/* Doctor Bio & Info */}
                <div className="space-y-3">
                    {/* Recommendation Reason Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-vd-forest text-[10px] font-bold tracking-wider uppercase border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>{reason}</span>
                        </span>

                        {cityName && (
                            <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400" />
                                <span>{cityName}</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        {currentDoc.profile_image_url ? (
                            <img
                                src={currentDoc.profile_image_url}
                                alt={currentDoc.name}
                                className="w-14 h-14 rounded-2xl object-cover border border-stone-200/80 shrink-0 shadow-2xs"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-vd-forest font-heading font-bold text-lg flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                                {currentDoc.name ? currentDoc.name.charAt(0) : 'Dr'}
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-heading font-bold text-base text-stone-900 truncate">
                                    {currentDoc.name}
                                </h3>
                                {currentDoc.is_approved && (
                                    <span title="Verified Specialist" className="inline-flex">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    </span>
                                )}
                            </div>

                            <p className="text-xs font-medium text-vd-forest truncate mt-0.5">
                                {currentDoc.specialization}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-stone-600 mt-1 flex-wrap font-medium">
                                <span className="flex items-center gap-1 text-amber-800 font-bold">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    <span>{ratingVal}</span>
                                    <span className="text-stone-400 font-light font-sans">({reviewsCount})</span>
                                </span>
                                {expYears && (
                                    <span>• {expYears}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Pricing & Consultation Modes */}
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                            {clinicFeeVal !== null && (
                                <div className="flex items-center gap-1 text-stone-800 font-semibold">
                                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                                    <span>In-Clinic: <strong className="text-vd-forest">₹{clinicFeeVal}</strong></span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200/80 text-[11px]">
                                <Video className="w-3 h-3 text-teal-600" />
                                <span>Video Available</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions & Navigation */}
                <div className="pt-1 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleBookAppointment(currentDoc)}
                        className="flex-1 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Appointment</span>
                    </button>

                    <Link
                        href={`/doctors/${currentDoc.id}?mode=${currentDoc.consultation_fee ? 'in_person' : 'video'}`}
                        className="px-3.5 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer"
                    >
                        View Profile
                    </Link>
                </div>
            </div>

            {/* Carousel Controls & Pagination Dots */}
            {doctors.length > 1 && (
                <div className="flex items-center justify-between pt-1">
                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Previous recommended doctor"
                        className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Pagination Indicator Dots */}
                    <div className="flex items-center gap-1.5">
                        {doctors.map((doc, idx) => (
                            <button
                                key={doc.id}
                                type="button"
                                onClick={() => setCurrentIndex(idx)}
                                aria-label={`Go to doctor ${idx + 1}`}
                                className={`transition-all rounded-full cursor-pointer ${
                                    currentIndex === idx
                                        ? 'w-6 h-2 bg-vd-forest'
                                        : 'w-2 h-2 bg-stone-300 hover:bg-stone-400'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Next Button */}
                    <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Next recommended doctor"
                        className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
